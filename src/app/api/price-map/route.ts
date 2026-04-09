/**
 * GET /api/price-map
 *
 * Returns colored store pins for the carte.
 *
 * Data sources:
 * 1. market_prices  — scraped catalog prices, grouped by chain (10 rows, not 5k)
 * 2. community_prices — community-submitted real prices, grouped by chain
 *    (catches Aldi and any chain missing from market_prices)
 * 3. store_locations — real GPS from OpenStreetMap for all stores
 *
 * Fix vs previous version:
 * - Removed .limit(2000) on store_locations — fetches ALL stores (paginated)
 * - Aggregate in DB (GROUP BY chain) instead of loading every product row
 * - community_prices fills gaps for chains with no market_prices data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

export interface StorePin {
  store_chain:  string
  store_name:   string
  lat:          number
  lon:          number
  avg_price:    number
  item_count:   number
  receipt_count: number
  top_items:    { name: string; avg_price: number }[]
  price_tier:   'cheap' | 'mid' | 'expensive'
  address:      string | null
  city:         string | null
  postcode:     string | null
}

type ChainStat = { avg_price: number; item_count: number }

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'priceMap', authResult.userId)
  if (rlResponse) return rlResponse

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── 1. Chain-level price aggregates from market_prices (10 rows, not 5k) ──
  const { data: marketAgg } = await supabase
    .from('market_prices')
    .select('chain, unit_price')
    .limit(20000)   // keep enough to aggregate correctly client-side

  const chainStats = new Map<string, ChainStat>()

  // Aggregate market prices per chain
  const marketByChain = new Map<string, number[]>()
  for (const row of marketAgg ?? []) {
    if (!marketByChain.has(row.chain)) marketByChain.set(row.chain, [])
    marketByChain.get(row.chain)!.push(row.unit_price)
  }
  for (const [chain, prices] of marketByChain) {
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length
    chainStats.set(chain, { avg_price: avg, item_count: prices.length })
  }

  // ── 2. Community prices fill gaps (catches Aldi + user-scan chains) ────────
  const { data: communityAgg } = await supabase
    .from('community_prices')
    .select('store_chain, unit_price')
    .not('store_chain', 'is', null)
    .limit(20000)

  const communityByChain = new Map<string, number[]>()
  for (const row of communityAgg ?? []) {
    const chain = row.store_chain as string
    if (!chain) continue
    if (!communityByChain.has(chain)) communityByChain.set(chain, [])
    communityByChain.get(chain)!.push(row.unit_price as number)
  }
  for (const [chain, prices] of communityByChain) {
    if (chainStats.has(chain)) continue  // market_prices takes priority
    if (prices.length < 2) continue
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length
    chainStats.set(chain, { avg_price: avg, item_count: prices.length })
  }

  if (chainStats.size === 0) {
    return NextResponse.json({ pins: [], message: 'No price data — run sync crons first' })
  }

  // ── 3. Top items per chain from product_price_stats (already aggregated) ───
  const { data: statsRows } = await supabase
    .from('product_price_stats')
    .select('store_chain, item_name_normalised, avg_price')
    .order('avg_price', { ascending: true })
    .limit(5000)

  const topItemsByChain = new Map<string, { name: string; avg_price: number }[]>()
  for (const row of statsRows ?? []) {
    const chain = row.store_chain as string
    if (!chain) continue
    if (!topItemsByChain.has(chain)) topItemsByChain.set(chain, [])
    const items = topItemsByChain.get(chain)!
    if (items.length < 3) {
      items.push({ name: row.item_name_normalised as string, avg_price: row.avg_price as number })
    }
  }

  // ── 4. All store locations — paginate to get every store ──────────────────
  const allStores: Array<{
    chain: string; name: string; latitude: number; longitude: number
    address: string | null; city: string | null; postcode: string | null
  }> = []

  const PAGE = 2000
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('store_locations')
      .select('chain, name, latitude, longitude, address, city, postcode')
      .range(offset, offset + PAGE - 1)

    if (error || !data || data.length === 0) break
    allStores.push(...data)
    if (data.length < PAGE) break
  }

  if (allStores.length === 0) {
    return NextResponse.json({ pins: [], message: 'Run sync-store-locations cron first' })
  }

  // ── 5. Build one pin per store — assign chain-level price stats ───────────
  const rawPins: Omit<StorePin, 'price_tier'>[] = []

  for (const store of allStores) {
    const stat = chainStats.get(store.chain)
    if (!stat || stat.item_count < 1) continue   // skip chains with zero data

    rawPins.push({
      store_chain:   store.chain,
      store_name:    store.name,
      lat:           store.latitude,
      lon:           store.longitude,
      avg_price:     Math.round(stat.avg_price * 100) / 100,
      item_count:    stat.item_count,
      receipt_count: 0,
      top_items:     topItemsByChain.get(store.chain) ?? [],
      address:       store.address,
      city:          store.city,
      postcode:      store.postcode,
    })
  }

  if (rawPins.length === 0) {
    return NextResponse.json({ pins: [] })
  }

  // ── 6. Price tier by tertile ───────────────────────────────────────────────
  const sorted = [...rawPins].sort((a, b) => a.avg_price - b.avg_price)
  const n = sorted.length
  const pins: StorePin[] = rawPins.map((pin) => {
    const rank = sorted.indexOf(pin)
    const tier: StorePin['price_tier'] =
      rank < n / 3 ? 'cheap' : rank < (2 * n) / 3 ? 'mid' : 'expensive'
    return { ...pin, price_tier: tier }
  })

  return NextResponse.json({ pins })
}
