/**
 * POST /api/cron/sync-store-locations
 *
 * Fetches all French supermarket locations from OpenStreetMap (Overpass API)
 * and upserts them into the store_locations table.
 *
 * Self-contained — no complex local imports so it builds cleanly on Vercel.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const UA = 'Basket-App/1.0 (basket.fr; open-source grocery price tracker)'

// canonical chain name → brand/name patterns to match (case-insensitive substrings)
const CHAINS: Record<string, string[]> = {
  'Carrefour':    ['carrefour'],
  'Leclerc':      ['leclerc'],
  'Intermarché':  ['intermarché', 'intermarche', 'itm'],
  'Lidl':         ['lidl'],
  'Aldi':         ['aldi'],
  'Auchan':       ['auchan'],
  'Super U':      ['super u', 'hyper u', 'u express', 'utile'],
  'Casino':       ['casino supermarché', 'casino supérette', 'géant casino'],
  'Monoprix':     ['monoprix', "monop'"],
  'Franprix':     ['franprix'],
  'Picard':       ['picard'],
  'Biocoop':      ['biocoop'],
  'Netto':        ['netto'],
}

// Multiple Overpass mirrors — tried in order until one succeeds
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
]

type OsmElement = {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function buildQueryForChain(patterns: string[]): string {
  const regex = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  return `[out:json][timeout:50][bbox:41.3,-5.2,51.1,9.6];
(
  node["shop"~"supermarket|hypermarket|convenience"]["brand"~"${regex}",i];
  way["shop"~"supermarket|hypermarket|convenience"]["brand"~"${regex}",i];
  node["shop"~"supermarket|hypermarket|convenience"]["name"~"${regex}",i];
  way["shop"~"supermarket|hypermarket|convenience"]["name"~"${regex}",i];
);
out center tags;`
}

function resolveChain(brandTag: string): string | null {
  const lower = brandTag.toLowerCase()
  for (const [chain, patterns] of Object.entries(CHAINS)) {
    if (patterns.some(p => lower.includes(p))) return chain
  }
  return null
}

async function overpassFetch(query: string): Promise<OsmElement[]> {
  for (const mirror of OVERPASS_MIRRORS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 58_000)
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok) {
        console.warn(`[sync-store-locations] mirror ${mirror} returned ${res.status}`)
        continue
      }
      const data = await res.json() as { elements?: OsmElement[] }
      const elements = data.elements ?? []
      console.log(`[sync-store-locations] mirror ${mirror} returned ${elements.length} elements`)
      return elements
    } catch (err) {
      clearTimeout(timer)
      console.warn(`[sync-store-locations] mirror ${mirror} error:`, String(err))
    }
  }
  return []
}

async function fetchChain(chain: string): Promise<{ chain: string; elements: OsmElement[]; error?: string }> {
  const query = buildQueryForChain(CHAINS[chain])
  try {
    const elements = await overpassFetch(query)
    return { chain, elements }
  } catch (err) {
    const msg = String(err)
    console.error(`[sync-store-locations] fetchChain(${chain}) failed:`, msg)
    return { chain, elements: [], error: msg }
  }
}

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return request.headers.get('authorization') === `Bearer ${secret}`
}

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

  console.log(`[sync-store-locations] querying ${chainNames.length} chains in parallel...`)

  const settled = await Promise.allSettled(chainNames.map(fetchChain))

  const rows: Array<{
    osm_id: string
    chain: string
    name: string
    address: string | null
    postcode: string | null
    city: string | null
    latitude: number
    longitude: number
    source: string
    updated_at: string
  }> = []

  const seen = new Set<string>()
  const debug: Record<string, { raw: number; parsed: number; error?: string }> = {}

  for (const result of settled) {
    if (result.status === 'rejected') continue
    const { chain: canonicalChain, elements, error } = result.value

    debug[canonicalChain] = { raw: elements.length, parsed: 0, ...(error ? { error } : {}) }

    if (elements.length > 0) {
      console.log(`[sync-store-locations] sample ${canonicalChain}:`, JSON.stringify(elements[0]).slice(0, 300))
    }

    for (const el of elements) {
      const tags = el.tags ?? {}
      const brandTag = tags['brand'] ?? tags['name'] ?? ''
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      if (!lat || !lon) continue

      // Use the canonical chain we already know from the query,
      // but double-check via substring match to filter unrelated results.
      const resolvedChain = resolveChain(brandTag) ?? canonicalChain

      const osmId = `${el.type}/${el.id}`
      if (seen.has(osmId)) continue
      seen.add(osmId)

      const postcode = tags['addr:postcode'] ?? null
      const city = tags['addr:city'] ?? tags['addr:town'] ?? null
      const street = tags['addr:street'] ?? null
      const housenumber = tags['addr:housenumber'] ?? null
      const address = [housenumber, street, city].filter(Boolean).join(' ') || null

      rows.push({
        osm_id: osmId,
        chain: resolvedChain,
        name: tags['name'] ?? (brandTag || resolvedChain),
        address,
        postcode,
        city,
        latitude: lat,
        longitude: lon,
        source: 'osm',
        updated_at: new Date().toISOString(),
      })
      debug[canonicalChain].parsed++
    }
  }

  console.log(`[sync-store-locations] parsed ${rows.length} unique stores`)

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, message: 'No stores parsed from OSM response', debug })
  }

  // Upsert in chunks of 500
  const CHUNK = 500
  let upserted = 0

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('store_locations') as any)
      .upsert(chunk, { onConflict: 'osm_id', ignoreDuplicates: false })

    if (error) {
      console.error('[sync-store-locations] upsert error:', error.message)
    } else {
      upserted += chunk.length
    }
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000)
  console.log(`[sync-store-locations] done: ${upserted}/${rows.length} in ${elapsed}s`)

  return NextResponse.json({ ok: true, total: rows.length, upserted, elapsed_s: elapsed })
}

export const GET = POST
