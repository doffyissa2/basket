import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/rebuild-stats?key=YOUR_SECRET
 *
 * Protected endpoint — caller must supply the correct secret via ?key=
 * Intended to be called by a Supabase scheduled Edge Function or external cron.
 *
 * Steps:
 *  1. Rebuild product_price_stats via RPC
 *  2. Rebuild price_weekly trends via RPC
 *  3. Refresh basket_inflation_weekly materialized view via RPC
 */
export async function POST(request: NextRequest) {
  // ── Auth: check secret key ─────────────────────────────────────────────
  const { searchParams } = request.nextUrl
  const providedKey = searchParams.get('key') ?? ''
  const expectedKey = process.env.REBUILD_STATS_SECRET_KEY

  if (!expectedKey) {
    console.error('[rebuild-stats] REBUILD_STATS_SECRET_KEY env var not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  if (providedKey !== expectedKey) {
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
