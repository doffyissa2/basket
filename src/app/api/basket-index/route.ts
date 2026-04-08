import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/basket-index
 *
 * Returns weekly basket inflation data from the basket_inflation_weekly
 * materialized view.
 *
 * Query params:
 *   store – filter to a single store chain (optional)
 *   dept  – filter to a 2-char department code, e.g. "75" (optional)
 *   weeks – number of recent weeks to return, default 12, max 52
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'basketIndex', authResult.userId)
  if (rlResponse) return rlResponse

  try {
    const { searchParams } = request.nextUrl
    const store = searchParams.get('store') ?? null
    const dept = searchParams.get('dept') ?? null
    const weeks = Math.min(Number(searchParams.get('weeks') ?? 12), 52)

    const supabase = getServiceClient()

    let query = supabase
      .from('basket_inflation_weekly')
      .select('store_chain, dept, week, avg_unit_price, receipt_count, item_count')
      .order('week', { ascending: false })
      .limit(weeks * 50) // up to `weeks` rows per (store × dept) combination

    if (store) query = query.eq('store_chain', store)
    if (dept) query = query.eq('dept', dept)

    const { data, error } = await query

    if (error) {
      console.error('[basket-index] DB error:', error)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        store: store ?? null,
        dept: dept ?? null,
        weeks,
        entries: [],
        summary: null,
      })
    }

    // Limit to the most recent `weeks` distinct calendar weeks
    const distinctWeeks = [...new Set(data.map((r: { week: string }) => r.week))]
      .sort()
      .reverse()
      .slice(0, weeks)

    const weekSet = new Set(distinctWeeks)
    const filtered = data
      .filter((r: { week: string }) => weekSet.has(r.week))
      .sort((a: { week: string }, b: { week: string }) => a.week.localeCompare(b.week)) // chronological

    // ── Summary: overall cheapest and most expensive chains in the period ──
    const chainTotals: Record<string, { totalPrice: number; count: number }> = {}
    for (const row of filtered) {
      const chain = (row as { store_chain: string }).store_chain
      if (!chainTotals[chain]) chainTotals[chain] = { totalPrice: 0, count: 0 }
      chainTotals[chain].totalPrice += (row as { avg_unit_price: number }).avg_unit_price
      chainTotals[chain].count += 1
    }

    const chainAverages = Object.entries(chainTotals)
      .map(([chain, { totalPrice, count }]) => ({
        store_chain: chain,
        avg_price: Math.round((totalPrice / count) * 100) / 100,
        weeks_of_data: count,
      }))
      .sort((a, b) => a.avg_price - b.avg_price)

    const summary = {
      cheapest_chain: chainAverages[0] ?? null,
      most_expensive_chain: chainAverages[chainAverages.length - 1] ?? null,
      all_chains: chainAverages,
      week_range: {
        from: distinctWeeks[distinctWeeks.length - 1] ?? null,
        to: distinctWeeks[0] ?? null,
      },
    }

    return NextResponse.json({
      store: store ?? null,
      dept: dept ?? null,
      weeks,
      entries: filtered,
      summary,
    })
  } catch (error) {
    console.error('[basket-index] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
