import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/rebuild-stats
 *
 * Protected endpoint — caller must supply the correct secret via Authorization header:
 *   Authorization: Bearer YOUR_SECRET
 * Intended to be called by a Supabase scheduled Edge Function or external cron.
 *
 * Steps:
 *  1. Rebuild product_price_stats via RPC
 *  2. Rebuild price_weekly trends via RPC
 *  3. Refresh basket_inflation_weekly materialized view via RPC
 */
export async function POST(request: NextRequest) {
  // ── Auth: accept Vercel's automatic cron secret or a manual override ───
  const authHeader = request.headers.get('authorization') ?? ''
  const providedKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  const vercelSecret  = process.env.VERCEL_CRON_SECRET
  const manualSecret  = process.env.REBUILD_STATS_SECRET_KEY

  if (!vercelSecret && !manualSecret) {
    console.error('[rebuild-stats] No auth secret configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const authorized =
    (vercelSecret && providedKey === vercelSecret) ||
    (manualSecret && providedKey === manualSecret)

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const results: Record<string, string> = {}
  const errors: string[] = []

  // ── Step 1: Rebuild product_price_stats ────────────────────────────────
  {
    const { error } = await supabase.rpc('rebuild_price_stats')
    if (error) {
      console.error('[rebuild-stats] rebuild_price_stats error:', error.message)
      errors.push(`rebuild_price_stats: ${error.message}`)
    } else {
      results['rebuild_price_stats'] = 'ok'
      console.log('[rebuild-stats] rebuild_price_stats: success')
    }
  }

  // ── Step 2: Rebuild price_weekly trends ────────────────────────────────
  {
    const { error } = await supabase.rpc('rebuild_weekly_trends')
    if (error) {
      console.error('[rebuild-stats] rebuild_weekly_trends error:', error.message)
      errors.push(`rebuild_weekly_trends: ${error.message}`)
    } else {
      results['rebuild_weekly_trends'] = 'ok'
      console.log('[rebuild-stats] rebuild_weekly_trends: success')
    }
  }

  // ── Step 3: Refresh basket_inflation_weekly materialized view ──────────
  // Supabase doesn't support REFRESH MATERIALIZED VIEW directly via the JS
  // client, so we call a dedicated RPC wrapper function.
  {
    const { error } = await supabase.rpc('refresh_basket_inflation')
    if (error) {
      console.error('[rebuild-stats] refresh_basket_inflation error:', error.message)
      errors.push(`refresh_basket_inflation: ${error.message}`)
    } else {
      results['refresh_basket_inflation'] = 'ok'
      console.log('[rebuild-stats] refresh_basket_inflation: success')
    }
  }

  const allOk = errors.length === 0

  return NextResponse.json(
    {
      success: allOk,
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 207 } // 207 = partial success
  )
}

// Vercel cron jobs trigger GET — delegate to POST
export const GET = POST
