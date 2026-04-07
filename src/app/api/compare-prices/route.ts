import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractWeight, computeNormalizedPrice } from '@/lib/normalize'

// ── Supabase service-role client (bypasses RLS) ────────────────────────────
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
  try {
    const { items, postcode, store_name } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const dept = postcode && postcode.length >= 2 ? postcode.slice(0, 2) : null

    // ── Match cache: item_key → matched_name (avoid duplicate RPC calls) ────
    const matchCache = new Map<string, string | null>()

    // ── Helper: match a single item name to canonical product name ───────────
    async function resolveMatch(rawName: string): Promise<string | null> {
      const key = rawName.toLowerCase().trim()

      if (matchCache.has(key)) {
        return matchCache.get(key)!
      }

      // Step 1: Try DB-native RPC fuzzy match (pg_trgm powered)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('match_product', {
        search_name: key,
      })

      if (!rpcError && rpcResult && rpcResult.length > 0 && rpcResult[0].matched_name) {
        const matched = rpcResult[0].matched_name as string
        matchCache.set(key, matched)
        return matched
      }

      // Step 2: Claude API fallback — only reached if RPC returns nothing
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        matchCache.set(key, null)
        return null
      }

      // Fetch candidate names from stats table for Claude to choose from
      const { data: candidates } = await supabase
        .from('product_price_stats')
        .select('item_name_normalised')
        .limit(200)

      const candidateNames = [...new Set(
        (candidates ?? []).map((c: { item_name_normalised: string }) => c.item_name_normalised)
      )] as string[]

      if (candidateNames.length === 0) {
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
                content: `Quel nom de produit dans la liste ci-dessous correspond le mieux à "${rawName}" ?
Le produit correspond s'il s'agit du même type (ex: "CRISTALINE 1.5L" correspond à "eau minerale 1.5l").

Liste :
${candidateNames.slice(0, 100).map((p) => `- ${p}`).join('\n')}

Réponds UNIQUEMENT avec le nom exact de la liste, ou "null" si aucun ne correspond.`,
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

    // ── Helper: query product_price_stats for a matched item name ────────────
    async function fetchStats(
      matchedName: string,
      targetDept: string | null,
      excludeStore: string | null
    ): Promise<{ local: PriceStatRow[]; national: PriceStatRow[] }> {
      const buildQuery = (deptFilter: string | null) => {
        let q = supabase
          .from('product_price_stats')
          .select('item_name_normalised, store_chain, dept, avg_price, median_price, min_price, max_price, sample_count, freshness_score')
          .eq('item_name_normalised', matchedName)

        if (deptFilter) {
          q = q.eq('dept', deptFilter)
        }
        if (excludeStore) {
          q = q.neq('store_chain', excludeStore)
        }
        return q.order('avg_price', { ascending: true }).limit(20)
      }

      const localRows: PriceStatRow[] = []
      const nationalRows: PriceStatRow[] = []

      if (targetDept) {
        const { data } = await buildQuery(targetDept)
        if (data) localRows.push(...(data as PriceStatRow[]))
      }

      // Always fetch national rows too (used as fallback and for breadth)
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
        .limit(8 * 10) // up to 8 weeks × ~10 store chains

      if (targetDept) {
        q = q.eq('dept', targetDept)
      }

      const { data } = await q
      return (data ?? []) as PriceTrendRow[]
    }

    // ── Main comparison loop ─────────────────────────────────────────────────
    const comparisons: ComparisonResult[] = []

    for (const item of items as { name: string; price: number }[]) {
      const matchedName = await resolveMatch(item.name)

      if (!matchedName) {
        // No match found anywhere — return item as-is with no comparison data
        const weightStr = extractWeight(item.name)
        const normalized = weightStr ? computeNormalizedPrice(item.price, weightStr) : null

        comparisons.push({
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
        })
        continue
      }

      // Fetch stats + trend in parallel
      const [{ local: localStats, national: nationalStats }, trend] = await Promise.all([
        fetchStats(matchedName, dept, store_name ?? null),
        fetchTrend(matchedName, dept),
      ])

      // Use local stats if ≥2 different store chains present, else national
      const localChains = new Set(localStats.map((r) => r.store_chain))
      const useLocal = localChains.size >= 2
      const stats = useLocal ? localStats : nationalStats
      const isLocal = useLocal

      const weightStr = extractWeight(matchedName)
      const normalized = weightStr ? computeNormalizedPrice(item.price, weightStr) : null

      if (stats.length === 0) {
        comparisons.push({
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
        })
        continue
      }

      // Weighted average across all matching store chains
      const totalWeight = stats.reduce((s, r) => s + (r.freshness_score ?? 0.5) * r.sample_count, 0)
      const weightedAvg = totalWeight > 0
        ? stats.reduce((s, r) => s + r.avg_price * (r.freshness_score ?? 0.5) * r.sample_count, 0) / totalWeight
        : stats.reduce((s, r) => s + r.avg_price, 0) / stats.length

      // Cheapest store: lowest avg_price row
      const cheapestRow = stats.reduce((a, b) => a.avg_price < b.avg_price ? a : b)

      const avgNormalized = weightStr ? computeNormalizedPrice(weightedAvg, weightStr) : null
      const totalSampleCount = stats.reduce((s, r) => s + r.sample_count, 0)

      // Sanity check: reject if avg is < 20% of scanned price (likely wrong product)
      const isSane = item.price === 0 || weightedAvg >= item.price * 0.20
      const effectiveAvg = isSane ? weightedAvg : item.price
      const effectiveSavings = isSane ? item.price - weightedAvg : 0

      comparisons.push({
        name: item.name,
        your_price: item.price,
        avg_price: Math.round(effectiveAvg * 100) / 100,
        savings: Math.round(effectiveSavings * 100) / 100,
        cheaper_store: isSane ? cheapestRow.store_chain : null,
        normalized_price: normalized?.label ?? null,
        avg_normalized_price: isSane ? avgNormalized?.label ?? null : null,
        is_local: isLocal,
        sample_count: totalSampleCount,
        trend,
      })
    }

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
            (c) => (matchCache.get(c.name.toLowerCase().trim()) ?? '') === watch.item_name_normalised
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
