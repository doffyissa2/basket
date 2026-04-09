import { NextRequest, NextResponse } from 'next/server'
import { extractWeight, computeNormalizedPrice } from '@/lib/normalize'
import { checkRateLimit } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'

// ── Types ──────────────────────────────────────────────────────────────────
interface PriceStatRow {
  item_name_normalised: string
  store_chain: string
  dept: string | null
  avg_price: number
  median_price: number | null
  min_price: number | null
  max_price: number | null
  sample_count: number
  freshness_score: number | null
}

interface PriceTrendRow {
  year_week: string
  avg_price: number
  store_chain: string
}

interface ComparisonResult {
  name: string
  your_price: number
  avg_price: number
  savings: number
  cheaper_store: string | null
  normalized_price: string | null
  avg_normalized_price: string | null
  is_local: boolean
  sample_count: number
  no_data: boolean
  trend: PriceTrendRow[]
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const rateLimitResponse = await checkRateLimit(request, 'comparePrices', authResult.userId)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { items, postcode, store_chain } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    if (items.length > 50) {
      return NextResponse.json({ error: 'Too many items (max 50)' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const dept = postcode && postcode.length >= 2 ? postcode.slice(0, 2) : null

    // ── Match cache: item_key → matched_name (avoid duplicate RPC calls) ────
    const matchCache = new Map<string, string | null>()

    // ── Helper: match a single item name to canonical product name ───────────
    // Uses pg_trgm-powered match_product RPC which searches the entire product table.
    async function resolveMatch(rawName: string): Promise<string | null> {
      const key = rawName.toLowerCase().trim()
      if (matchCache.has(key)) return matchCache.get(key)!

      const { data: rpcResult, error: rpcError } = await supabase.rpc('match_product', {
        search_name: key,
      })
      if (!rpcError && rpcResult && rpcResult.length > 0 && rpcResult[0].matched_name) {
        const matched = rpcResult[0].matched_name as string
        matchCache.set(key, matched)
        return matched
      }

      matchCache.set(key, null)
      return null
    }

    // ── Helper: query product_price_stats (all stores — no exclusion) ────────
    // Store exclusion is only applied later when picking "cheaper_store".
    async function fetchStats(
      matchedName: string,
      targetDept: string | null
    ): Promise<{ local: PriceStatRow[]; national: PriceStatRow[] }> {
      const buildQuery = (deptFilter: string | null) => {
        let q = supabase
          .from('product_price_stats')
          .select(
            'item_name_normalised, store_chain, dept, avg_price, median_price, min_price, max_price, sample_count, freshness_score'
          )
          .eq('item_name_normalised', matchedName)
        if (deptFilter) q = q.eq('dept', deptFilter)
        return q.order('avg_price', { ascending: true }).limit(20)
      }

      const localRows: PriceStatRow[] = []
      const nationalRows: PriceStatRow[] = []

      if (targetDept) {
        const { data } = await buildQuery(targetDept)
        if (data) localRows.push(...(data as PriceStatRow[]))
      }

      const { data: natData } = await buildQuery(null)
      if (natData) nationalRows.push(...(natData as PriceStatRow[]))

      return { local: localRows, national: nationalRows }
    }

    // ── Helper: fetch 8-week price trend for a matched item ──────────────────
    async function fetchTrend(
      matchedName: string,
      targetDept: string | null
    ): Promise<PriceTrendRow[]> {
      let q = supabase
        .from('price_weekly')
        .select('year_week, avg_price, store_chain')
        .eq('item_name_normalised', matchedName)
        .order('year_week', { ascending: false })
        .limit(8 * 10)
      if (targetDept) q = q.eq('dept', targetDept)
      const { data } = await q
      return (data ?? []) as PriceTrendRow[]
    }

    // ── Parallel comparison (all items at once) ──────────────────────────────
    const comparisons = await Promise.all(
      (items as { name: string; price: number }[]).map(async (item): Promise<ComparisonResult> => {
        const matchedName = await resolveMatch(item.name)

        if (!matchedName) {
          const weightStr = extractWeight(item.name)
          const normalized = weightStr ? computeNormalizedPrice(item.price, weightStr) : null
          return {
            name: item.name,
            your_price: item.price,
            avg_price: item.price,
            savings: 0,
            cheaper_store: null,
            normalized_price: normalized?.label ?? null,
            avg_normalized_price: null,
            is_local: false,
            sample_count: 0,
            no_data: true,
            trend: [],
          }
        }

        // Fetch stats + trend in parallel
        const [{ local, national }, trend] = await Promise.all([
          fetchStats(matchedName, dept),
          fetchTrend(matchedName, dept),
        ])

        // Use local stats if ≥2 different store chains present, else national
        const localChains = new Set(local.map((r) => r.store_chain))
        const useLocal = localChains.size >= 2
        const allStats = useLocal ? local : national

        if (allStats.length === 0) {
          const weightStr = extractWeight(matchedName)
          const normalized = weightStr ? computeNormalizedPrice(item.price, weightStr) : null
          return {
            name: item.name,
            your_price: item.price,
            avg_price: item.price,
            savings: 0,
            cheaper_store: null,
            normalized_price: normalized?.label ?? null,
            avg_normalized_price: null,
            is_local: false,
            sample_count: 0,
            no_data: true,
            trend,
          }
        }

        // Overall weighted average across ALL stores (for display context)
        const totalWeight = allStats.reduce(
          (s, r) => s + (r.freshness_score ?? 0.5) * r.sample_count,
          0
        )
        const weightedAvg =
          totalWeight > 0
            ? allStats.reduce(
                (s, r) => s + r.avg_price * (r.freshness_score ?? 0.5) * r.sample_count,
                0
              ) / totalWeight
            : allStats.reduce((s, r) => s + r.avg_price, 0) / allStats.length

        // Cheapest OTHER store: exclude current store + 'Inconnu' (not actionable)
        const otherStats = allStats.filter(
          (r) =>
            r.store_chain !== store_chain &&
            r.store_chain !== 'Inconnu' &&
            r.store_chain != null
        )
        const cheapestOther =
          otherStats.length > 0
            ? otherStats.reduce((a, b) => (a.avg_price < b.avg_price ? a : b))
            : null

        const weightStr = extractWeight(matchedName)
        const normalized = weightStr ? computeNormalizedPrice(item.price, weightStr) : null
        const avgNormalized = weightStr ? computeNormalizedPrice(weightedAvg, weightStr) : null
        const totalSampleCount = allStats.reduce((s, r) => s + r.sample_count, 0)

        // Sanity check: reject match if avg < 20% of scanned price (wrong product)
        const isSane = item.price === 0 || weightedAvg >= item.price * 0.20

        // Savings = your price - cheapest other store (actionable: where to go instead)
        const rawSavings = cheapestOther && isSane ? item.price - cheapestOther.avg_price : 0

        return {
          name: item.name,
          your_price: item.price,
          avg_price: Math.round((isSane ? weightedAvg : item.price) * 100) / 100,
          savings: Math.round(rawSavings * 100) / 100,
          cheaper_store: rawSavings > 0 ? cheapestOther!.store_chain : null,
          normalized_price: normalized?.label ?? null,
          avg_normalized_price: isSane ? avgNormalized?.label ?? null : null,
          is_local: useLocal,
          sample_count: totalSampleCount,
          no_data: false,
          trend,
        }
      })
    )

    // ── Total savings ─────────────────────────────────────────────────────────
    const totalSavings = comparisons.reduce(
      (sum, item) => sum + Math.max(0, item.savings),
      0
    )

    // ── Best store recommendation ─────────────────────────────────────────────
    const storeTally: Record<string, { count: number; savings: number }> = {}
    for (const c of comparisons) {
      if (c.cheaper_store && c.savings > 0) {
        if (!storeTally[c.cheaper_store]) storeTally[c.cheaper_store] = { count: 0, savings: 0 }
        storeTally[c.cheaper_store].count += 1
        storeTally[c.cheaper_store].savings += c.savings
      }
    }
    const bestEntry = Object.entries(storeTally).sort((a, b) => b[1].savings - a[1].savings)[0]
    const best_store = bestEntry
      ? {
          name: bestEntry[0],
          items_cheaper: bestEntry[1].count,
          total_savings: Math.round(bestEntry[1].savings * 100) / 100,
        }
      : null

    // ── Price-watch notifications ─────────────────────────────────────────────
    const resolvedNames = [...matchCache.values()].filter(Boolean) as string[]

    if (resolvedNames.length > 0) {
      const { data: watches } = await supabase
        .from('price_watches')
        .select('user_id, item_name, item_name_normalised, last_seen_price')
        .in('item_name_normalised', resolvedNames)

      if (watches && watches.length > 0) {
        const notifications: {
          user_id: string
          type: string
          title: string
          body: string
          metadata: object
          read: boolean
        }[] = []

        for (const watch of watches) {
          const comp = comparisons.find(
            (c) =>
              (matchCache.get(c.name.toLowerCase().trim()) ?? '') === watch.item_name_normalised
          )
          if (comp && watch.last_seen_price && comp.avg_price < watch.last_seen_price * 0.95) {
            notifications.push({
              user_id: watch.user_id,
              type: 'price_drop',
              title: `Prix en baisse sur ${watch.item_name}`,
              body: `Disponible à €${comp.avg_price.toFixed(2)} chez ${comp.cheaper_store || 'une autre enseigne'} (vous payiez €${watch.last_seen_price.toFixed(2)})`,
              metadata: {
                item_name: watch.item_name,
                new_price: comp.avg_price,
                old_price: watch.last_seen_price,
                store: comp.cheaper_store,
              },
              read: false,
            })
          }
        }

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications)
        }
      }
    }

    // ── Price freshness date ─────────────────────────────────────────────────
    // Pick the most recent scraped_at from market_prices so the UI can show
    // "Prix mis à jour le …" — legal requirement to surface data staleness.
    const { data: freshRow } = await supabase
      .from('market_prices')
      .select('scraped_at')
      .order('scraped_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const dataAsOf: string | null = freshRow?.scraped_at
      ? new Date(freshRow.scraped_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : null

    return NextResponse.json({
      comparisons,
      total_savings: Math.round(totalSavings * 100) / 100,
      best_store,
      data_as_of: dataAsOf,
    })
  } catch (error) {
    console.error('Compare prices error:', error)
    return NextResponse.json(
      { error: 'Failed to compare prices' },
      { status: 500 }
    )
  }
}
