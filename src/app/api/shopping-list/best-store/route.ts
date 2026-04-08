import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fuzzyMatch } from '@/lib/fuzzy-match'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

interface StatRow {
  avg_price: number
  store_chain: string
  sample_count: number
  freshness_score: number | null
}

export async function POST(request: NextRequest) {
  const rlResponse = await checkRateLimit(request, 'shoppingListBestStore')
  if (rlResponse) return rlResponse

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { items, postcode } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch unique product names from product_price_stats (aggregated, covers all stores)
    const { data: allProducts } = await supabase
      .from('product_price_stats')
      .select('item_name_normalised')
      .limit(400)

    const uniqueProducts = [
      ...new Set((allProducts ?? []).map((p: { item_name_normalised: string }) => p.item_name_normalised)),
    ] as string[]

    if (uniqueProducts.length === 0) {
      return NextResponse.json({ best_store: null, estimated_savings: 0, items_count: 0, per_item: [], store_comparison: [] })
    }

    const dept = postcode && postcode.length >= 2 ? postcode.slice(0, 2) : null

    // Per-store price tally: store → { total: sum of best prices, items: count, wins: count }
    const storePrices: Record<string, { total: number; items: number; wins: number }> = {}
    const perItem: { name: string; best_store: string | null; best_price: number | null }[] = []

    for (const itemName of items as string[]) {
      const { matched } = fuzzyMatch(itemName, uniqueProducts)
      if (!matched) {
        perItem.push({ name: itemName, best_store: null, best_price: null })
        continue
      }

      let statsData: StatRow[] | null = null

      // Try local dept first
      if (dept) {
        const { data } = await supabase
          .from('product_price_stats')
          .select('avg_price, store_chain, sample_count, freshness_score')
          .eq('item_name_normalised', matched)
          .eq('dept', dept)
          .neq('store_chain', 'Inconnu')
          .order('avg_price', { ascending: true })
          .limit(20)
        if (data && data.length >= 2) statsData = data as StatRow[]
      }

      // Fall back to national stats
      if (!statsData || statsData.length < 2) {
        const { data } = await supabase
          .from('product_price_stats')
          .select('avg_price, store_chain, sample_count, freshness_score')
          .eq('item_name_normalised', matched)
          .neq('store_chain', 'Inconnu')
          .order('avg_price', { ascending: true })
          .limit(20)
        statsData = data as StatRow[] | null
      }

      if (!statsData || statsData.length === 0) {
        perItem.push({ name: itemName, best_store: null, best_price: null })
        continue
      }

      // storeAvgs already sorted by avg_price ascending from the DB query
      const storeAvgs = statsData
        .filter((r) => r.store_chain)
        .map((r) => ({ store: r.store_chain, avg: r.avg_price }))

      if (storeAvgs.length === 0) {
        perItem.push({ name: itemName, best_store: null, best_price: null })
        continue
      }

      const best = storeAvgs[0]

      // Accumulate per-store totals
      for (const { store, avg } of storeAvgs) {
        if (!storePrices[store]) storePrices[store] = { total: 0, items: 0, wins: 0 }
        storePrices[store].total += avg
        storePrices[store].items += 1
      }
      storePrices[best.store].wins += 1

      perItem.push({
        name: itemName,
        best_store: best.store,
        best_price: Math.round(best.avg * 100) / 100,
      })
    }

    // Best overall store = most wins (cheapest on most items)
    const bestEntry = Object.entries(storePrices).sort((a, b) => b[1].wins - a[1].wins)[0]

    // Store comparison: top 5 stores sorted by total cost (ascending)
    const storeComparison = Object.entries(storePrices)
      .map(([store, { total, items }]) => ({
        store,
        total: Math.round(total * 100) / 100,
        items_found: items,
      }))
      .sort((a, b) => a.total - b.total)
      .slice(0, 5)

    const cheapestTotal = storeComparison[0]?.total ?? 0
    const bestStoreTotal = bestEntry ? storePrices[bestEntry[0]]?.total ?? 0 : 0
    const estimatedSavings = bestEntry
      ? Math.max(0, Math.round((bestStoreTotal - cheapestTotal) * 100) / 100)
      : 0

    return NextResponse.json({
      best_store: bestEntry?.[0] ?? null,
      estimated_savings: estimatedSavings,
      items_count: bestEntry?.[1].wins ?? 0,
      per_item: perItem,
      store_comparison: storeComparison,
    })
  } catch (error) {
    console.error('Shopping list best-store error:', error)
    return NextResponse.json({ error: 'Failed to compute best store' }, { status: 500 })
  }
}
