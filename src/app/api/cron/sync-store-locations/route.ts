/**
 * POST /api/cron/sync-store-locations
 *
 * Fetches French supermarket locations from OpenStreetMap (Overpass API)
 * and upserts them into the store_locations table.
 *
 * Uses exact brand tag matches (indexed) instead of regex — dramatically
 * faster on Overpass and avoids 504 timeouts.
 *
 * GET ?mode=test  — connectivity check
 * GET ?mode=single&chain=Lidl — test one chain
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const UA = 'Basket-App/1.0 (basket.fr; open-source grocery price tracker)'

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
]

// canonical chain → exact OSM brand tag values (indexed — no regex)
const CHAIN_BRANDS: Record<string, string[]> = {
  'Carrefour':   ['Carrefour', 'Carrefour Market', 'Carrefour City', 'Carrefour Contact', 'Carrefour Express'],
  'Leclerc':     ['E.Leclerc', 'E.Leclerc Drive', 'Leclerc'],
  'Intermarché': ['Intermarché', 'Intermarché Contact', 'Intermarché Express'],
  'Lidl':        ['Lidl'],
  'Aldi':        ['Aldi'],
  'Auchan':      ['Auchan', 'Auchan Drive', 'Auchan Supermarché'],
  'Super U':     ['Super U', 'Hyper U', 'U Express', 'Utile'],
  'Casino':      ['Casino Supermarché', 'Casino', 'Géant Casino', 'Casino Supérette'],
  'Monoprix':    ['Monoprix', "Monop'"],
  'Franprix':    ['Franprix'],
  'Picard':      ['Picard'],
  'Biocoop':     ['Biocoop'],
  'Netto':       ['Netto'],
}

type OsmElement = {
  type: string; id: number
  lat?: number; lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

// Build a query using exact brand values — fast indexed lookups, no regex
function buildExactQuery(brandValues: string[]): string {
  const unions = brandValues
    .map(b => `  nwr["brand"="${b}"][~"^shop$"~"supermarket|hypermarket|convenience|discount"](area.fr);`)
    .join('\n')
  return `[out:json][timeout:30];
area["ISO3166-1:alpha2"="FR"]->.fr;
(
${unions}
);
out center tags;`
}

function resolveChain(brandTag: string): string {
  for (const [chain, brands] of Object.entries(CHAIN_BRANDS)) {
    if (brands.some(b => b.toLowerCase() === brandTag.toLowerCase())) return chain
  }
  // substring fallback
  const lower = brandTag.toLowerCase()
  for (const [chain, brands] of Object.entries(CHAIN_BRANDS)) {
    if (brands.some(b => lower.includes(b.toLowerCase()))) return chain
  }
  return brandTag
}

async function overpassPost(query: string): Promise<{ elements: OsmElement[]; mirror: string; status: number; remark?: string; rawPreview?: string }> {
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(35_000),
      })
      const text = await res.text()
      if (!res.ok) {
        console.warn(`[osm] ${mirror} HTTP ${res.status}`)
        continue
      }
      let parsed: { elements?: OsmElement[]; remark?: string } = {}
      try { parsed = JSON.parse(text) } catch { return { elements: [], mirror, status: res.status, rawPreview: text.slice(0, 400) } }
      if (parsed.remark) console.warn(`[osm] remark: ${parsed.remark}`)
      return { elements: parsed.elements ?? [], mirror, status: res.status, remark: parsed.remark }
    } catch (err) {
      console.warn(`[osm] ${mirror} error:`, String(err))
    }
  }
  return { elements: [], mirror: 'none', status: 0 }
}

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')

  if (mode === 'test') {
    const r = await overpassPost('[out:json];node(5013364678);out;')
    return NextResponse.json({ connectivity: r.elements.length > 0 ? 'ok' : 'empty', ...r })
  }

  if (mode === 'single') {
    const chain = searchParams.get('chain') ?? 'Lidl'
    const brands = CHAIN_BRANDS[chain] ?? ['Lidl']
    const query = buildExactQuery(brands)
    const r = await overpassPost(query)
    return NextResponse.json({ chain, query_sent: query, ...r, elements_count: r.elements.length, sample: r.elements.slice(0, 2) })
  }

  return POST(request)
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const startedAt = Date.now()
  const debug: Record<string, { raw: number; parsed: number; remark?: string }> = {}
  const rows: Array<{
    osm_id: string; chain: string; name: string
    address: string | null; postcode: string | null; city: string | null
    latitude: number; longitude: number; source: string; updated_at: string
  }> = []
  const seen = new Set<string>()

  for (const [chainName, brandValues] of Object.entries(CHAIN_BRANDS)) {
    const result = await overpassPost(buildExactQuery(brandValues))
    debug[chainName] = { raw: result.elements.length, parsed: 0 }
    if (result.remark) debug[chainName].remark = result.remark

    for (const el of result.elements) {
      const tags = el.tags ?? {}
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      if (!lat || !lon) continue
      const osmId = `${el.type}/${el.id}`
      if (seen.has(osmId)) continue
      seen.add(osmId)

      const brandTag = tags['brand'] ?? tags['name'] ?? chainName
      const chain = resolveChain(brandTag)

      rows.push({
        osm_id: osmId,
        chain,
        name: tags['name'] ?? brandTag,
        address: [[tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || null, tags['addr:city'] ?? tags['addr:town'] ?? null].filter(Boolean).join(', ') || null,
        postcode: tags['addr:postcode'] ?? null,
        city: tags['addr:city'] ?? tags['addr:town'] ?? null,
        latitude: lat,
        longitude: lon,
        source: 'osm',
        updated_at: new Date().toISOString(),
      })
      debug[chainName].parsed++
    }

    // polite gap between requests
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`[osm] ${rows.length} stores from ${Object.keys(CHAIN_BRANDS).length} chains`)

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, message: 'No stores parsed', debug })
  }

  let upserted = 0
  for (let i = 0; i < rows.length; i += 500) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('store_locations') as any)
      .upsert(rows.slice(i, i + 500), { onConflict: 'osm_id', ignoreDuplicates: false })
    if (error) console.error('[osm] upsert error:', error.message)
    else upserted += Math.min(500, rows.length - i)
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    upserted,
    elapsed_s: Math.round((Date.now() - startedAt) / 1000),
  })
}
