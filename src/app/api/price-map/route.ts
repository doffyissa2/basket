/**
 * GET /api/price-map
 *
 * Returns colored store pins for the carte.
 *
 * Data sources (in priority order):
 * 1. market_prices + store_locations — real GPS from OSM, scraped prices
 * 2. price_items + store_locations — user-scanned prices, store matched by chain+postcode
 *
 * The critical fix vs the old version: coordinates come from store_locations
 * (real store GPS from OpenStreetMap), NOT from the user's scan position.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

export interface StorePin {
  store_chain: string
  store_name: string
  lat: number
  lon: number
  avg_price: number
  item_count: number
  receipt_count: number
  top_items: { name: string; avg_price: number }[]
  price_tier: 'cheap' | 'mid' | 'expensive'
  address: string | null
  city: string | null
  postcode: string | null
}

export async function GET(request: NextRequest) {
  const rlResponse = await checkRateLimit(request, 'priceMap')
  if (rlResponse) return rlResponse

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Pull aggregated prices per chain from market_prices (scraped data)
  const { data: marketData } = await supabase
    .from('market_prices')
    .select('chain, product_name_normalised, unit_price, category')
    .limit(5000)

  // 2. Pull store locations (real GPS from OSM)
  const { data: storeData } = await supabase
    .from('store_locations')
    .select('id, chain, name, latitude, longitude, address, city, postcode')
    .limit(2000)

  if (!storeData || storeData.length === 0) {
    return NextResponse.json({ pins: [], message: 'Run sync-store-locations cron first' })
  }

  // 3. Build price aggregates per chain from scraped market data
  const chainPrices = new Map<string, { prices: number[]; items: string[] }>()
  for (const row of marketData ?? []) {
    if (!chainPrices.has(row.chain)) chainPrices.set(row.chain, { prices: [], items: [] })
    chainPrices.get(row.chain)!.prices.push(row.unit_price)
    chainPrices.get(row.chain)!.items.push(row.product_name_normalised)
  }

  // Also pull user-scanned prices for chains not yet in market data
  const { data: userPrices } = await supabase
    .from('price_items')
    .select('store_chain, store_name, unit_price, item_name_normalised')
    .not('store_chain', 'is', null)
    .limit(3000)

  for (const row of userPrices ?? []) {
    const chain = row.store_chain
    if (!chain) continue
    if (!chainPrices.has(chain)) chainPrices.set(chain, { prices: [], items: [] })
    chainPrices.get(chain)!.prices.push(row.unit_price)
    chainPrices.get(chain)!.items.push(row.item_name_normalised ?? '')
  }

  if (chainPrices.size === 0) {
    return NextResponse.json({ pins: [] })
  }

  // 4. Build one pin per unique (chain, city/postcode) store location
  //    A city can have multiple stores of the same chain — show each one.
  const rawPins: Omit<StorePin, 'price_tier'>[] = []

  for (const store of storeData) {
    const priceInfo = chainPrices.get(store.chain)
    if (!priceInfo || priceInfo.prices.length < 3) continue

    const avg = priceInfo.prices.reduce((s, p) => s + p, 0) / priceInfo.prices.length

    // Top 3 cheapest unique items for this chain
    const itemMap = new Map<string, number[]>()
    for (let i = 0; i < priceInfo.items.length; i++) {
      const name = priceInfo.items[i]
      if (!name) continue
      if (!itemMap.has(name)) itemMap.set(name, [])
      itemMap.get(name)!.push(priceInfo.prices[i])
    }
    const top_items = Array.from(itemMap.entries())
      .map(([name, ps]) => ({ name, avg_price: ps.reduce((a, b) => a + b, 0) / ps.length }))
      .sort((a, b) => a.avg_price - b.avg_price)
      .slice(0, 3)

    rawPins.push({
      store_chain: store.chain,
      store_name: store.name,
      lat: store.latitude,
      lon: store.longitude,
      avg_price: Math.round(avg * 100) / 100,
      item_count: priceInfo.prices.length,
      receipt_count: 0, // market data isn't per-receipt
      top_items,
      address: store.address,
      city: store.city,
      postcode: store.postcode,
    })
  }

  if (rawPins.length === 0) {
    return NextResponse.json({ pins: [] })
  }

  // 5. Assign price tier by tertile
  const sorted = [...rawPins].sort((a, b) => a.avg_price - b.avg_price)
  const n = sorted.length
  const pins: StorePin[] = rawPins.map((pin) => {
    const rank = sorted.indexOf(pin)
    const tier: StorePin['price_tier'] = rank < n / 3 ? 'cheap' : rank < (2 * n) / 3 ? 'mid' : 'expensive'
    return { ...pin, price_tier: tier }
  })

  return NextResponse.json({ pins })
}
