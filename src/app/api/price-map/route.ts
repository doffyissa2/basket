/**
 * GET /api/price-map
 *
 * Returns store pins for the carte.
 *
 * Strategy:
 *  1. ALL store_locations are returned (4k+ pins) — paginated, never filtered out
 *  2. Chain tier assigned by KNOWN_TIER table first (reliable), then DB data
 *  3. Chain avg_price from market_prices (grouped in JS from raw rows)
 *     OR community_prices (fallback for chains not in market_prices)
 *  4. Per-store top_items from community_prices rows with lat/lon within 2 km
 *  5. Stores with no DB price data still show — with tier from KNOWN_TIER
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
  avg_price:      number | null
  item_count:     number
  receipt_count:  number
  top_items:      { name: string; avg_price: number }[]
  price_tier:     'cheap' | 'mid' | 'expensive'
  address:        string | null
  city:           string | null
  postcode:       string | null
  has_local_data: boolean
  source:         string | null
}

// Hardcoded tiers based on public knowledge — ensures ALL chains get a color
// even if our DB sync hasn't populated data for them yet.
const KNOWN_TIER: Record<string, 'cheap' | 'mid' | 'expensive'> = {
  'Aldi':        'cheap',
  'Lidl':        'cheap',
  'Netto':       'cheap',
  'Leclerc':     'cheap',
  'Intermarché': 'mid',
  'Carrefour':   'mid',
  'Auchan':      'mid',
  'Super U':     'mid',
  'Casino':      'mid',
  'Franprix':    'mid',
  'Picard':      'mid',
  'Monoprix':    'expensive',
  'Biocoop':     'expensive',
}

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

  // ── Fetch all data in parallel ────────────────────────────────────────────
  const [mpResult, cpResult] = await Promise.all([
    // market_prices: chain-level catalog prices
    supabase
      .from('market_prices')
      .select('store_chain, unit_price')
      .limit(25000),
    // community_prices: all rows (for chain fallback avg) + location rows (for per-store items)
    supabase
      .from('community_prices')
      .select('store_chain, latitude, longitude, item_name_normalised, unit_price')
      .not('store_chain', 'is', null)
      .gt('unit_price', 0)
      .limit(30000),
  ])

  const mpRows = mpResult.data ?? []
  const cpRows = cpResult.data ?? []

  if (mpResult.error)  console.error('[price-map] market_prices error:', mpResult.error.message)
  if (cpResult.error)  console.error('[price-map] community_prices error:', cpResult.error.message)

  // ── Chain avg_price from market_prices ────────────────────────────────────
  const mpByChain = new Map<string, number[]>()
  for (const r of mpRows) {
    const p = r.unit_price as number
    if (p <= 0 || p > 300) continue
    if (!mpByChain.has(r.store_chain)) mpByChain.set(r.store_chain, [])
    mpByChain.get(r.store_chain)!.push(p)
  }

  // ── Chain avg_price from community_prices (fallback) ──────────────────────
  const cpByChain = new Map<string, number[]>()
  for (const r of cpRows) {
    const chain = r.store_chain as string
    const p     = r.unit_price as number
    if (!chain || p <= 0 || p > 300) continue
    if (!cpByChain.has(chain)) cpByChain.set(chain, [])
    cpByChain.get(chain)!.push(p)
  }

  // Merge: market_prices wins, community_prices fills gaps
  const chainAvg = new Map<string, { avg: number; count: number }>()
  for (const [chain, prices] of mpByChain) {
    chainAvg.set(chain, {
      avg:   prices.reduce((s, p) => s + p, 0) / prices.length,
      count: prices.length,
    })
  }
  for (const [chain, prices] of cpByChain) {
    if (chainAvg.has(chain)) continue
    if (prices.length < 2) continue
    chainAvg.set(chain, {
      avg:   prices.reduce((s, p) => s + p, 0) / prices.length,
      count: prices.length,
    })
  }

  // ── Spatial index: community_prices rows with GPS for per-store items ─────
  type LocObs = { lat: number; lon: number; name: string; price: number }
  const cpSpatial = new Map<string, LocObs[]>()
  for (const r of cpRows) {
    const chain = r.store_chain as string
    const lat   = r.latitude   as number | null
    const lon   = r.longitude  as number | null
    const name  = r.item_name_normalised as string
    const price = r.unit_price as number
    if (!chain || !lat || !lon || !name) continue
    if (!cpSpatial.has(chain)) cpSpatial.set(chain, [])
    cpSpatial.get(chain)!.push({ lat, lon, name, price })
  }

  // ── Fetch ALL store_locations — paginated ─────────────────────────────────
  const allStores: Array<{
    chain: string; name: string; latitude: number; longitude: number
    address: string | null; city: string | null; postcode: string | null; source: string | null
  }> = []

  const PAGE = 1000   // PostgREST default max_rows; requesting >1000 silently caps at 1000
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('store_locations')
      .select('chain, name, latitude, longitude, address, city, postcode, source')
      .range(offset, offset + PAGE - 1)

    if (error) { console.error('[price-map] store_locations error:', error.message); break }
    if (!data || data.length === 0) break
    allStores.push(...data)
    if (data.length < PAGE) break
  }

  if (allStores.length === 0) {
    return NextResponse.json({ pins: [], message: 'Run sync-store-locations cron first' })
  }

  // ── Build pins — ALL stores, never filtered out ───────────────────────────
  const NEARBY_M = 2000
  const pins: StorePin[] = []

  for (const store of allStores) {
    const stat    = chainAvg.get(store.chain)
    const nearby  = cpSpatial.get(store.chain) ?? []

    // Find community_prices observations within 2 km of this specific store
    const local: LocObs[] = []
    for (const obs of nearby) {
      if (distM(store.latitude, store.longitude, obs.lat, obs.lon) <= NEARBY_M) {
        local.push(obs)
      }
    }

    let avgPrice: number | null
    let itemCount: number
    let topItems: { name: string; avg_price: number }[]
    let hasLocalData: boolean

    if (local.length >= 3) {
      // Real location-specific data
      avgPrice  = Math.round((local.reduce((s, o) => s + o.price, 0) / local.length) * 100) / 100
      itemCount = local.length
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
    } else if (stat) {
      // Chain national average — no store-specific items
      avgPrice     = Math.round(stat.avg * 100) / 100
      itemCount    = stat.count
      topItems     = []
      hasLocalData = false
    } else {
      // No DB data at all — still show the store using known tier
      avgPrice     = null
      itemCount    = 0
      topItems     = []
      hasLocalData = false
    }

    // Tier: use DB-derived chain ranking if available, otherwise hardcoded
    const tier = KNOWN_TIER[store.chain] ?? 'mid'

    pins.push({
      store_chain:    store.chain,
      store_name:     store.name,
      lat:            store.latitude,
      lon:            store.longitude,
      avg_price:      avgPrice,
      item_count:     itemCount,
      receipt_count:  0,
      top_items:      topItems,
      price_tier:     tier,
      address:        store.address,
      city:           store.city,
      postcode:       store.postcode,
      has_local_data: hasLocalData,
      source:         store.source ?? null,
    })
  }

  return NextResponse.json({ pins, debug: { mp_chains: mpByChain.size, cp_chains: cpByChain.size, stores: allStores.length } })
}
