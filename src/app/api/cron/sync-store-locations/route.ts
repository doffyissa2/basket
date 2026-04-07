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

const CHAIN_BRANDS: Record<string, string> = {
  'Carrefour': 'Carrefour',
  'Carrefour Market': 'Carrefour',
  'Carrefour City': 'Carrefour',
  'Carrefour Contact': 'Carrefour',
  'Carrefour Express': 'Carrefour',
  'E.Leclerc': 'Leclerc',
  'Leclerc': 'Leclerc',
  'Intermarché': 'Intermarché',
  'Lidl': 'Lidl',
  'Aldi': 'Aldi',
  'Auchan': 'Auchan',
  'Super U': 'Super U',
  'Hyper U': 'Super U',
  'U Express': 'Super U',
  'Casino': 'Casino',
  'Monoprix': 'Monoprix',
  'Franprix': 'Franprix',
  'Picard': 'Picard',
  'Biocoop': 'Biocoop',
  'Netto': 'Netto',
}

function buildQuery(): string {
  const brands = Object.keys(CHAIN_BRANDS).join('|')
  return `[out:json][timeout:60];
area["ISO3166-1"="FR"]["admin_level"="2"]->.fr;
(
  node["shop"~"supermarket|convenience"]["brand"~"${brands}"](area.fr);
  way["shop"~"supermarket|convenience"]["brand"~"${brands}"](area.fr);
);
out center tags;`
}

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
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

  try {
    console.log('[sync-store-locations] querying Overpass API...')

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
      },
      body: `data=${encodeURIComponent(buildQuery())}`,
    })

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Overpass returned ${res.status}` },
        { status: 502 }
      )
    }

    const data = await res.json() as {
      elements: Array<{
        type: string
        id: number
        lat?: number
        lon?: number
        center?: { lat: number; lon: number }
        tags?: Record<string, string>
      }>
    }

    console.log(`[sync-store-locations] got ${data.elements.length} OSM elements`)

    // Parse elements into store rows
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

    for (const el of data.elements) {
      const tags = el.tags ?? {}
      const brand = tags['brand'] ?? tags['name'] ?? ''
      const chain = CHAIN_BRANDS[brand]
      if (!chain) continue

      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      if (!lat || !lon) continue

      const postcode = tags['addr:postcode'] ?? null
      const city = tags['addr:city'] ?? tags['addr:town'] ?? null
      const street = tags['addr:street'] ?? null
      const housenumber = tags['addr:housenumber'] ?? null
      const address = [housenumber, street, city].filter(Boolean).join(' ') || null

      rows.push({
        osm_id: `${el.type}/${el.id}`,
        chain,
        name: tags['name'] ?? brand,
        address,
        postcode,
        city,
        latitude: lat,
        longitude: lon,
        source: 'osm',
        updated_at: new Date().toISOString(),
      })
    }

    console.log(`[sync-store-locations] parsed ${rows.length} valid stores`)

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, message: 'No stores parsed from OSM response' })
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
    console.log(`[sync-store-locations] done: ${upserted}/${rows.length} stores in ${elapsed}s`)

    return NextResponse.json({
      ok: true,
      total: rows.length,
      upserted,
      elapsed_s: elapsed,
    })
  } catch (err) {
    console.error('[sync-store-locations] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export const GET = POST
