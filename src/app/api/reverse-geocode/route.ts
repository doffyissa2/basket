import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { requireBetaAccess } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const authResult = await requireBetaAccess(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'reverseGeocode', authResult.userId)
  if (rlResponse) return rlResponse

  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  // Clamp to valid coordinate ranges
  const latNum = Math.max(-90, Math.min(90, Number(lat)))
  const lonNum = Math.max(-180, Math.min(180, Number(lon)))

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!MAPBOX_TOKEN) return NextResponse.json({ error: 'Geocoding unavailable' }, { status: 503 })

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lonNum},${latNum}.json`
      + `?access_token=${MAPBOX_TOKEN}&types=postcode&language=fr&country=fr`

    const res = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(10_000) })

    if (!res.ok) return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })

    const data = await res.json()
    const feature = data?.features?.[0] ?? null
    const postcode = feature?.text ?? null
    const display_name = feature?.place_name ?? null

    return NextResponse.json({ postcode, display_name })
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 })
  }
}
