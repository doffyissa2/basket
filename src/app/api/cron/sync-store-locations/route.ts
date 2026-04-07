/**
 * POST /api/cron/sync-store-locations
 *
 * Fetches French supermarket locations from OpenStreetMap (Overpass API)
 * and upserts them into the store_locations table.
 *
 * GET ?mode=test  — runs a trivial single-node query to verify connectivity
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const UA = 'Basket-App/1.0 (basket.fr; open-source grocery price tracker)'

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
]

const CHAINS: Record<string, string[]> = {
  'Carrefour':   ['carrefour'],
  'Leclerc':     ['leclerc'],
  'Intermarché': ['intermarché', 'intermarche', 'itm'],
  'Lidl':        ['lidl'],
  'Aldi':        ['aldi'],
  'Auchan':      ['auchan'],
  'Super U':     ['super u', 'hyper u', 'u express', 'utile'],
  'Casino':      ['casino'],
  'Monoprix':    ['monoprix'],
  'Franprix':    ['franprix'],
  'Picard':      ['picard'],
  'Biocoop':     ['biocoop'],
  'Netto':       ['netto'],
}

type OsmElement = {
  type: string; id: number
  lat?: number; lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements: OsmElement[]
  remark?: string
}

// Try each mirror in sequence. Returns raw response from first mirror that answers.
async function overpassPost(query: string): Promise<{ elements: OsmElement[]; remark?: string; mirror: string; status: number; error?: string }> {
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(55_000),
      })
      const text = await res.text()
      if (!res.ok) {
        console.warn(`[osm] ${mirror} HTTP ${res.status}: ${text.slice(0, 200)}`)
        continue
      }
      let parsed: OverpassResponse = { elements: [] }
      try { parsed = JSON.parse(text) as OverpassResponse } catch { /* not JSON */ }
      console.log(`[osm] ${mirror} → ${parsed.elements.length} elements${parsed.remark ? ' remark: ' + parsed.remark : ''}`)
      return { elements: parsed.elements, remark: parsed.remark, mirror, status: res.status }
    } catch (err) {
      console.warn(`[osm] ${mirror} error:`, String(err))
    }
  }
  return { elements: [], mirror: 'none', status: 0, error: 'all mirrors failed' }
}

function buildQuery(patterns: string[]): string {
  const regex = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  // bbox: south,west,north,east — metropolitan France
  return `[out:json][timeout:50][bbox:41.3,-5.2,51.1,9.6];
(
  node["shop"~"supermarket|hypermarket|convenience"]["brand"~"${regex}",i];
  way["shop"~"supermarket|hypermarket|convenience"]["brand"~"${regex}",i];
  node["shop"~"supermarket|hypermarket|convenience"]["name"~"${regex}",i];
  way["shop"~"supermarket|hypermarket|convenience"]["name"~"${regex}",i];
);
out center tags;`
}

function resolveChain(tag: string): string | null {
  const l = tag.toLowerCase()
  for (const [chain, pats] of Object.entries(CHAINS)) {
    if (pats.some(p => l.includes(p))) return chain
  }
  return null
}

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// ── GET ?mode=test ─────────────────────────────────────────────────────────
// Runs the simplest possible Overpass query to verify network connectivity.
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const mode = new URL(request.url).searchParams.get('mode')

  if (mode === 'test') {
    const result = await overpassPost('[out:json];node(5013364678);out;')
    return NextResponse.json({ connectivity: result.status === 200 ? 'ok' : 'failed', ...result })
  }

  if (mode === 'single') {
    // Run exactly the Lidl query and return raw response for diagnosis
    const query = buildQuery(['lidl'])
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(55_000),
        })
        const text = await res.text()
        return NextResponse.json({
          mirror, status: res.status,
          raw_preview: text.slice(0, 800),
          query_sent: query,
        })
      } catch (err) {
        return NextResponse.json({ mirror, error: String(err), query_sent: query })
      }
    }
  }

  // Default GET = run full sync
  return POST(request)
}

// ── POST — full sync ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const startedAt = Date.now()
  const chainNames = Object.keys(CHAINS)
  const debug: Record<string, { raw: number; parsed: number; remark?: string; mirror?: string; error?: string }> = {}
  const rows: Array<{
    osm_id: string; chain: string; name: string
    address: string | null; postcode: string | null; city: string | null
    latitude: number; longitude: number; source: string; updated_at: string
  }> = []
  const seen = new Set<string>()

  // Sequential with 1.5s gap — avoids rate-limit thundering herd
  for (const chainName of chainNames) {
    const result = await overpassPost(buildQuery(CHAINS[chainName]))
    debug[chainName] = { raw: result.elements.length, parsed: 0, mirror: result.mirror }
    if (result.remark) debug[chainName].remark = result.remark
    if (result.error) debug[chainName].error = result.error

    for (const el of result.elements) {
      const tags = el.tags ?? {}
      const brandTag = tags['brand'] ?? tags['name'] ?? ''
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      if (!lat || !lon) continue
      const osmId = `${el.type}/${el.id}`
      if (seen.has(osmId)) continue
      seen.add(osmId)

      const chain = resolveChain(brandTag) ?? chainName
      const postcode = tags['addr:postcode'] ?? null
      const city = tags['addr:city'] ?? tags['addr:town'] ?? null
      const housenumber = tags['addr:housenumber'] ?? null
      const street = tags['addr:street'] ?? null
      const address = [housenumber, street, city].filter(Boolean).join(' ') || null

      rows.push({
        osm_id: osmId, chain,
        name: tags['name'] ?? (brandTag || chainName),
        address, postcode, city,
        latitude: lat, longitude: lon,
        source: 'osm', updated_at: new Date().toISOString(),
      })
      debug[chainName].parsed++
    }

    if (chainNames.indexOf(chainName) < chainNames.length - 1) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  console.log(`[osm] parsed ${rows.length} stores from ${chainNames.length} chains`)

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, message: 'No stores parsed from OSM response', debug })
  }

  const CHUNK = 500
  let upserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('store_locations') as any)
      .upsert(rows.slice(i, i + CHUNK), { onConflict: 'osm_id', ignoreDuplicates: false })
    if (error) console.error('[osm] upsert error:', error.message)
    else upserted += CHUNK
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    upserted,
    elapsed_s: Math.round((Date.now() - startedAt) / 1000),
  })
}
