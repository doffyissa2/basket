import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/log-unknown-store
 *
 * Logs an unrecognized store name to the store_feedback table.
 * Called automatically from the scan flow when normalizeStoreChain()
 * returns the raw input (no match in CHAIN_MAP).
 *
 * Body: { raw_name: string }
 *
 * Uses UPSERT with an occurrence_count increment so repeated sightings
 * of the same store name accumulate — high-count entries reveal which
 * stores to add to CHAIN_MAP next.
 */
export async function POST(request: NextRequest) {
  const rlResponse = await checkRateLimit(request, 'logUnknownStore')
  if (rlResponse) return rlResponse

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { raw_name } = await request.json()

    if (!raw_name || typeof raw_name !== 'string' || raw_name.trim().length === 0) {
      return NextResponse.json({ error: 'raw_name required' }, { status: 400 })
    }

    const name = raw_name.trim().slice(0, 200) // cap length
    const supabase = getServiceClient()

    // Upsert: insert or increment occurrence_count
    const { error } = await supabase.rpc('upsert_store_feedback', { p_raw_name: name })

    if (error) {
      // Fallback if RPC doesn't exist yet: plain upsert
      await supabase
        .from('store_feedback')
        .upsert(
          { raw_name: name, occurrence_count: 1, last_seen_at: new Date().toISOString() },
          {
            onConflict: 'raw_name',
            ignoreDuplicates: false,
          }
        )
    }

    return NextResponse.json({ logged: true })
  } catch (err) {
    console.error('[log-unknown-store] error:', err)
    return NextResponse.json({ error: 'Failed to log store' }, { status: 500 })
  }
}
