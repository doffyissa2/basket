/**
 * GET /api/public-map
 *
 * Public endpoint — no auth required (homepage preview map).
 * Returns store locations only (chain, name, lat, lon, city).
 * No prices, no community data, no user-specific info.
 *
 * Cached at the edge for 1 hour.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-service'
import { checkRateLimit } from '@/lib/rate-limit'

export const revalidate = 3600

export interface PublicStorePin {
  store_chain: string
  store_name:  string
  lat:         number
  lon:         number
  city:        string | null
}

export async function GET(request: NextRequest) {
  const rlResponse = await checkRateLimit(request, 'publicStats')
  if (rlResponse) return rlResponse

  const supabase = getServiceClient()

  const allStores: PublicStorePin[] = []
  const PAGE = 1000
  const MAX_PAGES = 10

  for (let offset = 0; offset < MAX_PAGES * PAGE; offset += PAGE) {
    const { data, error } = await supabase
      .from('store_locations')
      .select('chain, name, latitude, longitude, city')
      .range(offset, offset + PAGE - 1)

    if (error || !data || data.length === 0) break
    for (const s of data) {
      allStores.push({
        store_chain: s.chain,
        store_name:  s.name,
        lat:         s.latitude,
        lon:         s.longitude,
        city:        s.city,
      })
    }
    if (data.length < PAGE) break
  }

  return NextResponse.json(
    { pins: allStores },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
