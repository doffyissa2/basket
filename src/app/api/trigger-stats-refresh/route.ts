import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/trigger-stats-refresh
 *
 * Fire-and-forget endpoint called after each receipt scan.
 * Rebuilds product_price_stats and price_weekly so the pricing engine
 * reflects the latest scanned data immediately.
 *
 * Requires a valid user JWT — does NOT need the rebuild secret key.
 * Returns immediately with 202 while DB work happens (non-blocking).
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'triggerStatsRefresh', authResult.userId)
  if (rlResponse) return rlResponse

  // Respond immediately — DB work runs in the background
  const supabase = getServiceClient()

  // Don't await — fire and forget
  void Promise.allSettled([
    supabase.rpc('rebuild_price_stats'),
    supabase.rpc('rebuild_weekly_trends'),
  ]).then((results) => {
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.error) {
        console.error('[trigger-stats-refresh] RPC error:', r.value.error.message)
      }
    }
  })

  return NextResponse.json({ queued: true }, { status: 202 })
}
