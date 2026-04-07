import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Supabase service-role client (bypasses RLS) ────────────────────────────
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/price-trend
 *
 * Query params:
 *   item  – product name (normalised or raw) — REQUIRED
 *   store – store chain name (optional, filters to single chain)
 *   dept  – 2-char department code, e.g. "75" (optional, filters to local data)
 *   weeks – number of weeks to return, default 12, max 52
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const item = searchParams.get('item')?.toLowerCase().trim()
    const store = searchParams.get('store') ?? null
    const dept = searchParams.get('dept') ?? null
    const weeks = Math.min(Number(searchParams.get('weeks') ?? 12), 52)

    if (!item) {
      return NextResponse.json({ error: 'item param required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    let query = supabase
      .from('price_weekly')
      .select('year_week, avg_price, store_chain, dept, sample_count')
      .order('year_week', { ascending: false })
      .limit(weeks * 20) // up to `weeks` rows per store chain

    // Exact match first; if nothing, fall back to similarity search via RPC
    query = query.eq('item_name_normalised', item)

    if (store) query = query.eq('store_chain', store)
    if (dept) query = query.eq('dept', dept)

    let { data, error } = await query

    // If exact match returns nothing, try RPC fuzzy match then re-query
    if (!error && (!data || data.length === 0)) {
      const { data: rpcResult } = await supabase.rpc('match_product', {
        search_name: item,
      })

      if (rpcResult && rpcResult.length > 0 && rpcResult[0].matched_name) {
        const matchedName = rpcResult[0].matched_name as string

        let retryQuery = supabase
          .from('price_weekly')
          .select('year_week, avg_price, store_chain, dept, sample_count')
          .eq('item_name_normalised', matchedName)
          .order('year_week', { ascending: false })
          .limit(weeks * 20)

        if (store) retryQuery = retryQuery.eq('store_chain', store)
        if (dept) retryQuery = retryQuery.eq('dept', dept)

        const retryResult = await retryQuery
        data = retryResult.data
        error = retryResult.error
      }
    }

    if (error) {
      console.error('[price-trend] DB error:', error)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    // Trim to the requested number of distinct weeks, keep all chains within those weeks
    if (data && data.length > 0) {
      const distinctWeeks = [...new Set(data.map((r: { year_week: string }) => r.year_week))]
        .sort()
        .reverse()
        .slice(0, weeks)

      const weekSet = new Set(distinctWeeks)
      data = data.filter((r: { year_week: string }) => weekSet.has(r.year_week))

      // Re-sort chronologically for charting
      data.sort((a: { year_week: string }, b: { year_week: string }) =>
        a.year_week.localeCompare(b.year_week)
      )
    }

    return NextResponse.json({
      item,
      store: store ?? null,
      dept: dept ?? null,
      weeks,
      trend: data ?? [],
    })
  } catch (error) {
    console.error('[price-trend] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
