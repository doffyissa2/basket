import { NextRequest, NextResponse } from 'next/server'
import { requireBetaAccess } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  calculateLevel, getLevelProgress, getWeeklyChallenges,
  getISOWeekString, getBadge, LEVELS,
} from '@/lib/gamification'
import { getServiceClient } from '@/lib/supabase-service'

export async function GET(request: NextRequest) {
  const authResult = await requireBetaAccess(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  const rlResponse = await checkRateLimit(request, 'gamification', userId)
  if (rlResponse) return rlResponse

  const supabase = getServiceClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      xp, level, title, avatar_frame, scan_streak, longest_streak,
      total_savings, total_scans, badges, completed_challenges, postcode
    `)
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const xp           = (profile.xp as number) ?? 0
  const levelDef     = calculateLevel(xp)
  const progress     = getLevelProgress(xp)
  const nextLevelDef = LEVELS[levelDef.level] // 0-indexed, so LEVELS[n] = level n+1

  // Weekly challenges + completion status
  const challenges  = getWeeklyChallenges()
  const thisWeek    = getISOWeekString()
  const completed   = ((profile.completed_challenges ?? []) as { week: string; challenge_ids: string[] }[])
  const weekDone    = completed.find((c) => c.week === thisWeek)?.challenge_ids ?? []

  // Earned badges with definitions merged in
  const earned = ((profile.badges ?? []) as { id: string; unlocked_at: string }[])
  const badgesWithDefs = earned.map((eb) => ({ ...getBadge(eb.id), ...eb }))

  // Department rank (best-effort)
  let dept_rank: number | null = null
  const dept = typeof profile.postcode === 'string' ? profile.postcode.slice(0, 2) : null
  if (dept) {
    const { data: rankRow } = await supabase
      .from('leaderboard')
      .select('savings_rank')
      .eq('dept', dept)
      .eq('id', userId)
      .single()
    dept_rank = (rankRow?.savings_rank as number) ?? null
  }

  return NextResponse.json({
    xp,
    level:          levelDef.level,
    title:          levelDef.title,
    frame:          levelDef.frame,
    progress,
    scan_streak:    (profile.scan_streak    as number) ?? 0,
    longest_streak: (profile.longest_streak as number) ?? 0,
    total_savings:  (profile.total_savings  as number) ?? 0,
    total_scans:    (profile.total_scans    as number) ?? 0,
    next_level: nextLevelDef ? {
      level:        nextLevelDef.level,
      title:        nextLevelDef.title,
      xp_required:  nextLevelDef.xp,
      unlock:       nextLevelDef.unlock,
    } : null,
    badges: badgesWithDefs,
    weekly_challenges: challenges.map((c) => ({
      ...c,
      completed: weekDone.includes(c.id),
    })),
    dept_rank,
  })
}
