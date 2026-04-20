import { SupabaseClient } from '@supabase/supabase-js'
import { extractWeight, computeNormalizedPrice } from '@/lib/normalize'

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

export interface ComparisonResult {
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

export interface CompareOutput {
  comparisons: ComparisonResult[]
  total_savings: number
  best_store: { name: string; items_cheaper: number; total_savings: number } | null
  data_as_of: string | null
}

export async function comparePrices(
  supabase: SupabaseClient,
  items: Array<{ name: string; price: number; brand?: string | null; volume_weight?: string | null }>,
  storeChain: string,
  dept: string | null,
): Promise<CompareOutput> {
  const matchCache = new Map<string, string | null>()

  async function resolveMatch(
    rawName: string,
    brand?: string | null,
    volumeWeight?: string | null,
  ): Promise<string | null> {
    const key = rawName.toLowerCase().trim()
    if (matchCache.has(key)) return matchCache.get(key)!

    if (brand && volumeWeight) {
      const { data: structMatch } = await supabase
        .from('product_price_stats')
        .select('item_name_normalised')
        .ilike('item_name_normalised', `%${brand.toLowerCase()}%${volumeWeight.toLowerCase()}%`)
        .limit(1)
      if (structMatch && structMatch.length > 0 && structMatch[0].item_name_normalised) {
        const matched = structMatch[0].item_name_normalised as string
        matchCache.set(key, matched)
        return matched
      }
    }

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

  async function fetchStats(
    matchedName: string,
    targetDept: string | null,
  ): Promise<{ local: PriceStatRow[]; national: PriceStatRow[] }> {
    const buildQuery = (deptFilter: string | null) => {
      let q = supabase
        .from('product_price_stats')
        .select(
          'item_name_normalised, store_chain, dept, avg_price, median_price, min_price, max_price, sample_count, freshness_score',
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

  async function fetchTrend(
    matchedName: string,
    targetDept: string | null,
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

  const comparisons = await Promise.all(
    items.map(async (item): Promise<ComparisonResult> => {
      const matchedName = await resolveMatch(item.name, item.brand, item.volume_weight)

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

      const [{ local, national }, trend] = await Promise.all([
        fetchStats(matchedName, dept),
        fetchTrend(matchedName, dept),
      ])

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

      const totalWeight = allStats.reduce(
        (s, r) => s + (r.freshness_score ?? 0.5) * r.sample_count,
        0,
      )
      const weightedAvg =
        totalWeight > 0
          ? allStats.reduce(
              (s, r) => s + r.avg_price * (r.freshness_score ?? 0.5) * r.sample_count,
              0,
            ) / totalWeight
          : allStats.reduce((s, r) => s + r.avg_price, 0) / allStats.length

      const otherStats = allStats.filter(
        (r) =>
          r.store_chain !== storeChain &&
          r.store_chain !== 'Inconnu' &&
          r.store_chain != null,
      )
      const cheapestOther =
        otherStats.length > 0
          ? otherStats.reduce((a, b) => (a.avg_price < b.avg_price ? a : b))
          : null

      const weightStr = extractWeight(matchedName)
      const normalized = weightStr ? computeNormalizedPrice(item.price, weightStr) : null
      const avgNormalized = weightStr ? computeNormalizedPrice(weightedAvg, weightStr) : null
      const totalSampleCount = allStats.reduce((s, r) => s + r.sample_count, 0)

      const isSane = item.price === 0 || weightedAvg >= item.price * 0.2
      const rawSavings = cheapestOther && isSane ? item.price - cheapestOther.avg_price : 0

      return {
        name: item.name,
        your_price: item.price,
        avg_price: Math.round((isSane ? weightedAvg : item.price) * 100) / 100,
        savings: Math.round(rawSavings * 100) / 100,
        cheaper_store: rawSavings > 0 ? cheapestOther!.store_chain : null,
        normalized_price: normalized?.label ?? null,
        avg_normalized_price: isSane ? (avgNormalized?.label ?? null) : null,
        is_local: useLocal,
        sample_count: totalSampleCount,
        no_data: false,
        trend,
      }
    }),
  )

  const totalSavings = comparisons.reduce(
    (sum, item) => sum + Math.max(0, item.savings),
    0,
  )

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

  const { data: freshRow } = await supabase
    .from('market_prices')
    .select('scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const data_as_of: string | null = freshRow?.scraped_at
    ? new Date(freshRow.scraped_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return {
    comparisons,
    total_savings: Math.round(totalSavings * 100) / 100,
    best_store,
    data_as_of,
  }
}
