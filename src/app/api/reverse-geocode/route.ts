import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  // Clamp to valid coordinate ranges
  const latNum = Math.max(-90, Math.min(90, Number(lat)))
  const lonNum = Math.max(-180, Math.min(180, Number(lon)))

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latNum}&lon=${lonNum}`,
      {
        headers: {
          'User-Agent': 'Basket-App/1.0 (basket.fr)',
          'Accept-Language': 'fr',
        },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })

    const data = await res.json()
    const postcode = data?.address?.postcode ?? null

    return NextResponse.json({ postcode, display_name: data?.display_name ?? null })
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 })
  }
}
