import { NextRequest, NextResponse } from 'next/server'
import { requireBetaAccess } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/log-unknown-store
 *
 * Logs an unrecognized store name.
 * If lat/lon are provided, enriches with Nominatim reverse-geocode + nearby
 * amenity search so the store's real name and address are captured.
 *
 * Body: { raw_name: string, lat?: number, lon?: number }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireBetaAccess(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'logUnknownStore', authResult.userId)
  if (rlResponse) return rlResponse

  try {
    const { raw_name, lat, lon } = await request.json()

    if (!raw_name || typeof raw_name !== 'string' || raw_name.trim().length === 0) {
      return NextResponse.json({ error: 'raw_name required' }, { status: 400 })
    }

    const name = raw_name.trim().slice(0, 200)
    const supabase = getServiceClient()

    // ── Nominatim enrichment ──────────────────────────────────────────────
    let normalizedGuess: string | null = null
    let foundAddress: string | null = null

    if (typeof lat === 'number' && typeof lon === 'number' &&
        lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {

      try {
        // 1. Reverse geocode the user's position to get the area
        const reverseRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'Basket-App/1.0 (basket.fr)', 'Accept-Language': 'fr' } }
        )
        if (reverseRes.ok) {
          const reverseData = await reverseRes.json()
          foundAddress = reverseData?.display_name ?? null
        }

        // 2. Search for nearby supermarkets / shops matching the raw name
        const searchQuery = encodeURIComponent(name)
        const searchRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${searchQuery}&lat=${lat}&lon=${lon}&radius=500&limit=3&featuretype=settlement`,
          { headers: { 'User-Agent': 'Basket-App/1.0 (basket.fr)', 'Accept-Language': 'fr' } }
        )
        if (searchRes.ok) {
          const results = await searchRes.json()
          if (results.length > 0) {
            normalizedGuess = results[0].display_name ?? null
          }
        }
      } catch (geoErr) {
        console.error('[log-unknown-store] Nominatim error:', geoErr)
      }
    }

    // ── Upsert store_feedback (insert or increment count) ─────────────────
    const { error } = await supabase
      .from('store_feedback')
      .upsert(
        {
          raw_name: name,
          occurrence_count: 1,
          normalized_guess: normalizedGuess,
          found_address: foundAddress,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'raw_name', ignoreDuplicates: false }
      )

    if (error) {
      console.error('[log-unknown-store] upsert error:', error.message)
    }

    return NextResponse.json({ logged: true, normalized_guess: normalizedGuess })
  } catch (err) {
    console.error('[log-unknown-store] error:', err)
    return NextResponse.json({ error: 'Failed to log store' }, { status: 500 })
  }
}
