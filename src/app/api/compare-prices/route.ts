import { NextRequest, NextResponse } from 'next/server'
import { extractWeight, computeNormalizedPrice, tokenize } from '@/lib/normalize'
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
  trend: PriceTrendRow[]
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const rateLimitResponse = await checkRateLimit(request, 'comparePrices', authResult.userId)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { items, postcode, store_name } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const dept = postcode && postcode.length >= 2 ? postcode.slice(0, 2) : null

    // Fetch candidate names once (shared across all item matches)
    const { data: candidates } = await supabase
      .from('product_price_stats')
      .select('item_name_normalised')
      .limit(400)
    const candidateNames = [
      ...new Set((candidates ?? []).map((c: { item_name_normalised: string }) => c.item_name_normalised)),
    ] as string[]

    // ── Match cache: item_key → matched_name (avoid duplicate RPC calls) ────
    const matchCache = new Map<string, string | null>()

    // ── Helper: match a single item name to canonical product name ───────────
    async function resolveMatch(rawName: string): Promise<string | null> {
      const key = rawName.toLowerCase().trim()
      if (matchCache.has(key)) return matchCache.get(key)!

      // Step 1: Try DB-native RPC fuzzy match (pg_trgm powered)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('match_product', {
        search_name: key,
      })
      if (!rpcError && rpcResult && rpcResult.length > 0 && rpcResult[0].matched_name) {
        const matched = rpcResult[0].matched_name as string
        matchCache.set(key, matched)
        return matched
      }

      // Step 2: Word-overlap fallback (fast, no API call)
      // tokenize() strips stopwords and accents, so "Cristaline 1,5L" → ["cristaline","1","5l"]
      const queryTokens = tokenize(key)
      if (queryTokens.length > 0 && candidateNames.length > 0) {
        let bestKey: string | null = null
        let bestScore = 0
        for (const candidate of candidateNames) {
          const candidateTokens = tokenize(candidate)
          const overlap = queryTokens.filter((t) => candidateTokens.includes(t)).length
          const score = overlap / Math.max(queryTokens.length, candidateTokens.length)
          if (score > bestScore && score >= 0.38) {
            bestScore = score
            bestKey = candidate
          }
        }
        if (bestKey) {
          matchCache.set(key, bestKey)
          return bestKey
        }
      }

      // Step 3: Claude Haiku fallback — only if word-overlap fails
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey || candidateNames.length === 0) {
        matchCache.set(key, null)
        return null
      }

      try {
        const matchResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 256,
            messages: [
              {
                role: 'user',
                content: `Quel nom de produit dans la liste correspond le mieux à "${rawName}" ?
Réponds avec le nom EXACT de la liste, ou "null" si aucun ne correspond vraiment.

Liste :
${candidateNames.slice(0, 80).map((p) => `- ${p}`).join('\n')}`,
              },
            ],
          }),
        })

        if (matchResponse.ok) {
          const matchData = await matchResponse.json()
          const answer = (matchData.content?.[0]?.text ?? '').trim()
          const resolved = answer === 'null' || answer === '' ? null : answer
          matchCache.set(key, resolved)
          return resolved
        }
      } catch (e) {
        console.error('[compare-prices] Claude fallback error:', e)
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
            r.store_chain !== store_name &&
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

    return NextResponse.json({
      comparisons,
      total_savings: Math.round(totalSavings * 100) / 100,
      best_store,
    })
  } catch (error) {
    console.error('Compare prices error:', error)
    return NextResponse.json(
      { error: 'Failed to compare prices' },
      { status: 500 }
    )
  }
}
