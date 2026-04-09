import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/shopping-list/suggest?q=lait
 *
 * Returns up to 8 product name suggestions from product_price_stats,
 * each with the best (lowest avg_price) store and price found.
 * Used for autocomplete in the shopping list input.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] })

  const supabase = getServiceClient()
  const { data } = await supabase
    .from('product_price_stats')
    .select('item_name_normalised, avg_price, store_chain, sample_count')
    .ilike('item_name_normalised', `%${q}%`)
    .order('sample_count', { ascending: false })
    .limit(60)

  if (!data || data.length === 0) return NextResponse.json({ suggestions: [] })

  // Deduplicate by name — keep the store with the lowest avg_price per product
  const seen = new Map<string, { best_store: string; best_price: number }>()
  for (const row of data) {
    const key = row.item_name_normalised as string
    const price = row.avg_price as number
    const store = row.store_chain as string
    if (!seen.has(key) || price < seen.get(key)!.best_price) {
      seen.set(key, { best_store: store, best_price: Math.round(price * 100) / 100 })
    }
  }

  const suggestions = [...seen.entries()].slice(0, 8).map(([name, info]) => ({
    name,
    best_store: info.best_store,
    best_price: info.best_price,
  }))

  return NextResponse.json({ suggestions })
}
