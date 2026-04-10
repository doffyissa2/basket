import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase-service'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  const rlResponse = await checkRateLimit(request, 'leaderboard', userId)
  if (rlResponse) return rlResponse

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') === 'xp' ? 'xp' : 'savings'
  const rawDept = searchParams.get('dept') ?? null
  const dept = rawDept && /^\d{2}$/.test(rawDept) ? rawDept : null

  const supabase = getServiceClient()

  const rankField  = type === 'xp' ? 'xp_rank'      : 'savings_rank'
  const orderField = type === 'xp' ? 'xp'            : 'total_savings'

  // Build query for top 20
  let topQuery = supabase
    .from('leaderboard')
    .select('id, display_name, level, title, avatar_frame, xp, total_savings, scan_streak, total_scans, savings_rank, xp_rank, streak_rank, dept')
    .order(orderField, { ascending: false })
    .limit(20)

  if (dept) topQuery = topQuery.eq('dept', dept)

  const { data: top, error: topErr } = await topQuery

  if (topErr) {
    console.error('[leaderboard] query error:', topErr)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }

  // Current user's rank (even if outside top 20)
  let myRankQuery = supabase
    .from('leaderboard')
    .select('savings_rank, xp_rank, streak_rank, total_savings, xp, scan_streak, total_scans, level, title')
    .eq('id', userId)

  if (dept) myRankQuery = myRankQuery.eq('dept', dept)

  const { data: myRow } = await myRankQuery.single()

  // Anonymise — only show first name or masked email (data is already partial from the view)
  const sanitised = (top ?? []).map((row: Record<string, unknown>) => ({
    id:            row.id,
    display_name:  row.display_name ?? 'Utilisateur',
    level:         row.level,
    title:         row.title,
    avatar_frame:  row.avatar_frame,
    total_savings: row.total_savings,
    xp:            row.xp,
    scan_streak:   row.scan_streak,
    total_scans:   row.total_scans,
    rank:          row[rankField],
    is_me:         row.id === userId,
  }))

  return NextResponse.json({
    type,
    dept: dept ?? 'national',
    top:  sanitised,
    my_rank: myRow ? {
      savings_rank: myRow.savings_rank,
      xp_rank:      myRow.xp_rank,
      streak_rank:  myRow.streak_rank,
      total_savings: myRow.total_savings,
      xp:           myRow.xp,
      scan_streak:  myRow.scan_streak,
      total_scans:  myRow.total_scans,
      level:        myRow.level,
      title:        myRow.title,
    } : null,
  })
}
