/**
 * GET /api/price-map
 *
 * Returns store pins for the carte.
 *
 * Design:
 *  - ALL store_locations are returned (4k+ pins) — paginated
 *  - community_prices rows with lat/lon are clustered per store location
 *    → gives REAL per-store prices and top items (not chain averages)
 *  - Price tier is assigned by CHAIN RANK (cheapest chain = green, not per-store)
 *    so every Lidl is green and every Monoprix is orange — which is correct
 *  - Stores without any community_prices data within 2 km get the chain avg price
 *    as a fallback and no top_items (popup says "Prix nationaux")
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

export interface StorePin {
  store_chain:    string
  store_name:     string
  lat:            number
  lon:            number
  avg_price:      number
  item_count:     number
  receipt_count:  number
  top_items:      { name: string; avg_price: number }[]
  price_tier:     'cheap' | 'mid' | 'expensive'
  address:        string | null
  city:           string | null
  postcode:       string | null
  has_local_data: boolean   // true = real prices from community_prices nearby
}

// ── Haversine distance in metres ─────────────────────────────────────────────
function distM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'priceMap', authResult.userId)
  if (rlResponse) return rlResponse

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── 1. Community prices with GPS — source of truth for per-store data ──────
  // Fetches all rows that have lat/lon (from OFF API location tags).
  // These represent REAL prices submitted at specific stores.
  const { data: cpRows } = await supabase
    .from('community_prices')
    .select('store_chain, latitude, longitude, item_name_normalised, unit_price')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gt('unit_price', 0)
    .lt('unit_price', 200)
    .limit(30000)

  // ── 2. Chain-level avg prices from market_prices (fallback for no-data stores)
  const { data: mpRows } = await supabase
    .from('market_prices')
    .select('chain, unit_price')
    .gt('unit_price', 0)
    .lt('unit_price', 200)
    .limit(20000)

  // Build chain → avg_price map from market_prices
  const mpByChain = new Map<string, number[]>()
  for (const r of mpRows ?? []) {
    if (!mpByChain.has(r.chain)) mpByChain.set(r.chain, [])
    mpByChain.get(r.chain)!.push(r.unit_price as number)
  }

  // Also build chain fallback from community_prices (for chains not in market_prices)
  const cpByChain = new Map<string, number[]>()
  for (const r of cpRows ?? []) {
    const chain = r.store_chain as string
    if (!chain) continue
    if (!cpByChain.has(chain)) cpByChain.set(chain, [])
    cpByChain.get(chain)!.push(r.unit_price as number)
  }

  // Final chain → { avg, item_count }
  const chainAvg = new Map<string, { avg: number; count: number }>()
  for (const [chain, prices] of mpByChain) {
    chainAvg.set(chain, {
      avg: prices.reduce((s, p) => s + p, 0) / prices.length,
      count: prices.length,
    })
  }
  for (const [chain, prices] of cpByChain) {
    if (chainAvg.has(chain)) continue
    if (prices.length < 2) continue
    chainAvg.set(chain, {
      avg: prices.reduce((s, p) => s + p, 0) / prices.length,
      count: prices.length,
    })
  }

  if (chainAvg.size === 0) {
    return NextResponse.json({ pins: [], message: 'No price data — run sync crons first' })
  }

  // ── 3. Assign price tier by CHAIN RANK (not per-store) ───────────────────
  // Sort chains from cheapest to most expensive, split into thirds.
  const chainRanking = [...chainAvg.entries()]
    .sort(([, a], [, b]) => a.avg - b.avg)

  const n = chainRanking.length
  const chainTier = new Map<string, 'cheap' | 'mid' | 'expensive'>()
  chainRanking.forEach(([chain], i) => {
    const tier: 'cheap' | 'mid' | 'expensive' =
      i < Math.ceil(n / 3) ? 'cheap'
      : i < Math.ceil(2 * n / 3) ? 'mid'
      : 'expensive'
    chainTier.set(chain, tier)
  })

  // ── 4. Build spatial index of community_prices rows by chain ──────────────
  // Key: canonical chain name. Value: array of located price observations.
  type LocatedPrice = { lat: number; lon: number; name: string; price: number }
  const cpSpatial = new Map<string, LocatedPrice[]>()

  for (const r of cpRows ?? []) {
    const chain = r.store_chain as string
    const lat   = r.latitude as number
    const lon   = r.longitude as number
    const name  = r.item_name_normalised as string
    const price = r.unit_price as number
    if (!chain || !lat || !lon || !name) continue

    if (!cpSpatial.has(chain)) cpSpatial.set(chain, [])
    cpSpatial.get(chain)!.push({ lat, lon, name, price })
  }

  // ── 5. Fetch ALL store_locations — paginated ──────────────────────────────
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

  // ── 6. Build one pin per store ────────────────────────────────────────────
  const NEARBY_RADIUS_M = 2000  // 2 km — match community_prices to this store
  const pins: StorePin[] = []

  for (const store of allStores) {
    const fallback = chainAvg.get(store.chain)
    if (!fallback) continue  // chain has zero price data anywhere — skip

    // Find community_prices observations within 2 km of this specific store
    const nearby = cpSpatial.get(store.chain) ?? []
    const local: LocatedPrice[] = []

    for (const obs of nearby) {
      if (distM(store.latitude, store.longitude, obs.lat, obs.lon) <= NEARBY_RADIUS_M) {
        local.push(obs)
      }
    }

    let avgPrice: number
    let itemCount: number
    let topItems: { name: string; avg_price: number }[]
    let hasLocalData: boolean

    if (local.length >= 3) {
      // Real location-specific data — use it
      avgPrice  = Math.round((local.reduce((s, o) => s + o.price, 0) / local.length) * 100) / 100
      itemCount = local.length

      // Group by item name, compute per-item avg at this store
      const itemMap = new Map<string, number[]>()
      for (const obs of local) {
        if (!itemMap.has(obs.name)) itemMap.set(obs.name, [])
        itemMap.get(obs.name)!.push(obs.price)
      }
      topItems = [...itemMap.entries()]
        .map(([name, ps]) => ({
          name,
          avg_price: Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 100) / 100,
        }))
        .sort((a, b) => a.avg_price - b.avg_price)
        .slice(0, 3)

      hasLocalData = true
    } else {
      // No local data — use chain national average, no top items
      avgPrice     = Math.round(fallback.avg * 100) / 100
      itemCount    = fallback.count
      topItems     = []
      hasLocalData = false
    }

    pins.push({
      store_chain:    store.chain,
      store_name:     store.name,
      lat:            store.latitude,
      lon:            store.longitude,
      avg_price:      avgPrice,
      item_count:     itemCount,
      receipt_count:  0,
      top_items:      topItems,
      price_tier:     chainTier.get(store.chain) ?? 'mid',
      address:        store.address,
      city:           store.city,
      postcode:       store.postcode,
      has_local_data: hasLocalData,
    })
  }

  return NextResponse.json({ pins })
}
