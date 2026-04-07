import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fuzzyMatch } from '@/lib/fuzzy-match'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

interface PriceRow { unit_price: number; store_name: string }

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

    // Fetch unique product names from DB
    const { data: allProducts } = await supabase
      .from('price_items')
      .select('item_name_normalised')
      .limit(500)

    const uniqueProducts = [
      ...new Set(allProducts?.map((p) => p.item_name_normalised) || []),
    ] as string[]

    if (uniqueProducts.length === 0) {
      return NextResponse.json({ best_store: null, estimated_savings: 0, items_count: 0, per_item: [], store_comparison: [] })
    }

    const dept = postcode && postcode.length >= 2 ? postcode.slice(0, 2) : null

    // Per-store price tally: store → { total: sum of best prices, items: count }
    const storePrices: Record<string, { total: number; items: number; wins: number }> = {}
    const perItem: { name: string; best_store: string | null; best_price: number | null }[] = []

    for (const itemName of items as string[]) {
      const { matched } = fuzzyMatch(itemName, uniqueProducts)
      if (!matched) {
        perItem.push({ name: itemName, best_store: null, best_price: null })
        continue
      }

      let priceData: PriceRow[] | null = null

      // Try local first
      if (dept) {
        const { data } = await supabase
          .from('price_items')
          .select('unit_price, store_name')
          .eq('item_name_normalised', matched)
          .like('postcode', `${dept}%`)
          .limit(50)
        if (data && data.length >= 3) priceData = data
      }

      if (!priceData || priceData.length < 3) {
        const { data } = await supabase
          .from('price_items')
          .select('unit_price, store_name')
          .eq('item_name_normalised', matched)
          .limit(50)
        priceData = data
      }

      if (!priceData || priceData.length === 0) {
        perItem.push({ name: itemName, best_store: null, best_price: null })
        continue
      }

      // Compute avg price per store for this item
      const byStore: Record<string, number[]> = {}
      for (const p of priceData) {
        if (!byStore[p.store_name]) byStore[p.store_name] = []
        byStore[p.store_name].push(p.unit_price)
      }

      const storeAvgs: { store: string; avg: number }[] = Object.entries(byStore).map(
        ([store, prices]) => ({ store, avg: prices.reduce((a, b) => a + b, 0) / prices.length })
      )
      storeAvgs.sort((a, b) => a.avg - b.avg)

      const best = storeAvgs[0]
      if (!best) { perItem.push({ name: itemName, best_store: null, best_price: null }); continue }

      // Accumulate per-store totals (best-case: what would this item cost at each store?)
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

    // Best overall store = most wins
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
