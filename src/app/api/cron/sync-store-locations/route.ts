/**
 * Cron: sync-store-locations
 *
 * Fetches all French supermarket locations from OpenStreetMap (Overpass API)
 * and upserts them into the store_locations table.
 *
 * Schedule: weekly (Monday 02:00 UTC) — OSM data doesn't change that fast.
 * Trigger: Vercel Cron OR manual POST with CRON_SECRET header.
 *
 * Table required (run in Supabase SQL editor first):
 *   See /docs/migrations/004_intelligence_tables.sql
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchFrenchStores } from '@/lib/osm-stores'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // dev mode: allow without secret
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const startedAt = Date.now()

  try {
    console.log('[sync-store-locations] fetching from OSM...')
    const stores = await fetchFrenchStores()
    console.log(`[sync-store-locations] got ${stores.length} stores from OSM`)

    if (stores.length === 0) {
      return NextResponse.json({ ok: false, message: 'OSM returned 0 stores' })
    }

    // Batch upsert in chunks of 500
    const CHUNK = 500
    let upserted = 0

    for (let i = 0; i < stores.length; i += CHUNK) {
      const chunk = stores.slice(i, i + CHUNK).map((s) => ({
        osm_id: s.osmId,
        chain: s.chain,
        name: s.name,
        address: s.address,
        postcode: s.postcode,
        city: s.city,
        latitude: s.lat,
        longitude: s.lon,
        source: 'osm',
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('store_locations')
        .upsert(chunk, { onConflict: 'osm_id', ignoreDuplicates: false })

      if (error) {
        console.error('[sync-store-locations] upsert error:', error.message)
      } else {
        upserted += chunk.length
      }
    }

    const elapsed = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[sync-store-locations] done: ${upserted}/${stores.length} upserted in ${elapsed}s`)

    return NextResponse.json({
      ok: true,
      total: stores.length,
      upserted,
      elapsed_s: elapsed,
    })
  } catch (err) {
    console.error('[sync-store-locations] fatal error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// Allow Vercel cron to call with GET as well
export const GET = POST
