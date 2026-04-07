import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fuzzyMatch } from '@/lib/fuzzy-match'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

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
      return NextResponse.json({ best_store: null, estimated_savings: 0, items_count: 0, per_item: [] })
    }

    const dept = postcode && postcode.length >= 2 ? postcode.slice(0, 2) : null
    const storeTally: Record<string, { wins: number; totalSavings: number }> = {}
    const perItem: { name: string; best_store: string | null; best_price: number | null }[] = []

    for (const itemName of items as string[]) {
      const { matched } = fuzzyMatch(itemName, uniqueProducts)
      if (!matched) {
        perItem.push({ name: itemName, best_store: null, best_price: null })
        continue
      }

      let priceData: { unit_price: number; store_name: string }[] | null = null

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

      // Find cheapest store for this item
      const byStore: Record<string, number[]> = {}
      for (const p of priceData) {
        if (!byStore[p.store_name]) byStore[p.store_name] = []
        byStore[p.store_name].push(p.unit_price)
      }

      let bestStore: string | null = null
      let bestAvg = Infinity
      const avgPriceOverall =
        priceData.reduce((s, p) => s + p.unit_price, 0) / priceData.length

      for (const [store, prices] of Object.entries(byStore)) {
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length
        if (avg < bestAvg) {
          bestAvg = avg
          bestStore = store
        }
      }

      if (bestStore) {
        const saving = avgPriceOverall - bestAvg
        if (!storeTally[bestStore]) storeTally[bestStore] = { wins: 0, totalSavings: 0 }
        storeTally[bestStore].wins += 1
        storeTally[bestStore].totalSavings += Math.max(0, saving)
      }

      perItem.push({
        name: itemName,
        best_store: bestStore,
        best_price: bestAvg < Infinity ? Math.round(bestAvg * 100) / 100 : null,
      })
    }

    // Best overall store = most wins
    const bestEntry = Object.entries(storeTally).sort((a, b) => b[1].wins - a[1].wins)[0]

    return NextResponse.json({
      best_store: bestEntry?.[0] ?? null,
      estimated_savings: bestEntry ? Math.round(bestEntry[1].totalSavings * 100) / 100 : 0,
      items_count: bestEntry?.[1].wins ?? 0,
      per_item: perItem,
    })
  } catch (error) {
    console.error('Shopping list best-store error:', error)
    return NextResponse.json({ error: 'Failed to compute best store' }, { status: 500 })
  }
}
