import { NextRequest, NextResponse } from 'next/server'
import { requireBetaAccess } from '@/lib/auth'
import {
  calculateLevel, calcScanXP, getNewBadges, getISOWeekString,
  XP_EVENTS, BadgeCheckStats, XPAwardResult, BadgeDef,
} from '@/lib/gamification'
import { getServiceClient } from '@/lib/supabase-service'

// ── Streak computation ────────────────────────────────────────────────────────

function computeStreak(
  lastScanDate: string | null,
  currentStreak: number,
  today: Date,
): { new_streak: number; is_first_of_week: boolean } {
  const thisWeek = getISOWeekString(today)

  if (!lastScanDate) {
    return { new_streak: 1, is_first_of_week: true }
  }

  const lastWeek = getISOWeekString(new Date(lastScanDate))

  if (lastWeek === thisWeek) {
    // Already scanned this week — streak unchanged
    return { new_streak: currentStreak, is_first_of_week: false }
  }

  const prevWeek = getISOWeekString(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))

  if (lastWeek === prevWeek) {
    // Consecutive weeks — extend streak
    return { new_streak: currentStreak + 1, is_first_of_week: true }
  }

  // Gap in weeks — reset
  return { new_streak: 1, is_first_of_week: true }
}

// ─────────────────────────────────────────────────────────────────────────────

interface AwardBody {
  /** One of: scan_receipt | share_result | weekly_challenge | invite_friend */
  reason: string
  /** Additional context for server-side XP validation */
  context?: {
    savings?:     number    // total savings for a scan
    store?:       string    // store chain for new-store detection
    postcode?:    string    // postcode for geo tracking
    hour?:        number    // hour-of-day (0–23) for badge checks
    challenge_id?: string  // for weekly_challenge reason
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireBetaAccess(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  let body: AwardBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { reason, context = {} } = body
  if (!reason) return NextResponse.json({ error: 'reason required' }, { status: 400 })

  const supabase = getServiceClient()

  // ── Fetch current profile ─────────────────────────────────────────────────
  const { data: profile, error: fetchErr } = await supabase
    .from('profiles')
    .select(`
      xp, level, title, avatar_frame,
      scan_streak, longest_streak, last_scan_date,
      total_savings, total_scans, badges,
      completed_challenges, stores_scanned, postcodes_scanned, shares_count
    `)
    .eq('id', userId)
    .single()

  if (fetchErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const oldXP    = (profile.xp    as number) ?? 0
  const oldLevel = calculateLevel(oldXP).level

  const today        = new Date()
  const todayStr     = today.toISOString().split('T')[0]
  const thisWeek     = getISOWeekString(today)
  const currentStreak = (profile.scan_streak as number) ?? 0

  // ── Mutable update payload ─────────────────────────────────────────────────
  const profileUpdates: Record<string, unknown> = {}
  let xpGained = 0
  let logReason = reason

  // ── Reason: scan_receipt ──────────────────────────────────────────────────
  if (reason === 'scan_receipt') {
    const savings    = Math.max(0, Math.min(context.savings ?? 0, 10000))
    const store      = String(context.store ?? '').slice(0, 100)
    const postcode   = String(context.postcode ?? '').slice(0, 10)

    const { new_streak, is_first_of_week } = computeStreak(
      profile.last_scan_date as string | null,
      currentStreak,
      today,
    )

    // Stores & postcodes tracking (deduplicated arrays)
    const storesArr   = ((profile.stores_scanned    as string[]) ?? [])
    const postcodesArr = ((profile.postcodes_scanned as string[]) ?? [])
    const isNewStore  = store && !storesArr.includes(store)
    const newStores   = store   ? [...new Set([...storesArr,    store])]   : storesArr
    const newPostcodes = postcode ? [...new Set([...postcodesArr, postcode])] : postcodesArr

    // Compute XP server-side
    const { total: scanXP } = calcScanXP({
      savings,
      isFirstScanOfWeek: is_first_of_week,
      streak:            new_streak,
      isNewStore:        !!isNewStore,
    })
    xpGained = scanXP
    logReason = `scan_receipt (${store}, savings=${savings.toFixed(2)})`

    // Stat updates
    profileUpdates.total_scans    = ((profile.total_scans    as number) ?? 0) + 1
    profileUpdates.total_savings  = parseFloat(
      (((profile.total_savings as number) ?? 0) + savings).toFixed(2)
    )
    profileUpdates.last_scan_date  = todayStr
    profileUpdates.scan_streak     = new_streak
    profileUpdates.longest_streak  = Math.max((profile.longest_streak as number) ?? 0, new_streak)
    profileUpdates.stores_scanned  = newStores
    profileUpdates.postcodes_scanned = newPostcodes
  }

  // ── Reason: share_result ──────────────────────────────────────────────────
  else if (reason === 'share_result') {
    xpGained = XP_EVENTS.SHARE_RESULT
    profileUpdates.shares_count = ((profile.shares_count as number) ?? 0) + 1
  }

  // ── Reason: weekly_challenge ──────────────────────────────────────────────
  else if (reason === 'weekly_challenge') {
    const challengeId = context.challenge_id
    if (!challengeId) return NextResponse.json({ error: 'challenge_id required' }, { status: 400 })

    // Guard: don't double-award the same challenge in the same week
    const completedArr = ((profile.completed_challenges ?? []) as { week: string; challenge_ids: string[] }[])
    const weekEntry    = completedArr.find((c) => c.week === thisWeek)
    if (weekEntry?.challenge_ids.includes(challengeId)) {
      return NextResponse.json({ error: 'Challenge already completed this week' }, { status: 409 })
    }

    xpGained = XP_EVENTS.WEEKLY_CHALLENGE
    const updated = completedArr.map((c) =>
      c.week === thisWeek
        ? { ...c, challenge_ids: [...c.challenge_ids, challengeId] }
        : c
    )
    if (!completedArr.some((c) => c.week === thisWeek)) {
      updated.push({ week: thisWeek, challenge_ids: [challengeId] })
    }
    profileUpdates.completed_challenges = updated
    logReason = `weekly_challenge:${challengeId}`
  }

  // ── Reason: invite_friend ─────────────────────────────────────────────────
  else if (reason === 'invite_friend') {
    xpGained = XP_EVENTS.INVITE_FRIEND
  }

  // ── Unknown reason ────────────────────────────────────────────────────────
  else {
    return NextResponse.json({ error: `Unknown reason: ${reason}` }, { status: 400 })
  }

  if (xpGained === 0) {
    return NextResponse.json({ xp_gained: 0, new_xp: oldXP, old_level: oldLevel, new_level: oldLevel, leveled_up: false, new_title: profile.title as string, new_frame: profile.avatar_frame as string, new_badges: [], new_unlocks: [] })
  }

  // ── Apply XP ──────────────────────────────────────────────────────────────
  const newXP       = oldXP + xpGained
  const newLevelDef = calculateLevel(newXP)
  const leveledUp   = newLevelDef.level > oldLevel

  profileUpdates.xp    = newXP
  profileUpdates.level = newLevelDef.level
  profileUpdates.title = newLevelDef.title
  profileUpdates.avatar_frame = newLevelDef.frame

  if (leveledUp) {
    // Add new unlock to unlocked_features
    const existing = (profile as Record<string, unknown>).unlocked_features as string[] ?? []
    profileUpdates.unlocked_features = [...new Set([...existing, newLevelDef.unlock])]
  }

  // ── Badge check ───────────────────────────────────────────────────────────
  const earnedIds = ((profile.badges as { id: string }[]) ?? []).map((b) => b.id)
  const badgeStats: BadgeCheckStats = {
    total_scans:       (profileUpdates.total_scans  as number) ?? (profile.total_scans  as number) ?? 0,
    total_savings:     (profileUpdates.total_savings as number) ?? (profile.total_savings as number) ?? 0,
    scan_streak:       (profileUpdates.scan_streak  as number) ?? (profile.scan_streak  as number) ?? 0,
    stores_scanned:    (profileUpdates.stores_scanned as string[]) ?? (profile.stores_scanned as string[]) ?? [],
    postcodes_scanned: (profileUpdates.postcodes_scanned as string[]) ?? (profile.postcodes_scanned as string[]) ?? [],
    shares_count:      (profileUpdates.shares_count as number) ?? (profile.shares_count as number) ?? 0,
    first_scan_hour:   context.hour,
  }

  const newBadges: BadgeDef[] = getNewBadges(badgeStats, earnedIds)
  if (newBadges.length > 0) {
    const nowISO = new Date().toISOString()
    const existingBadges = (profile.badges as { id: string; unlocked_at: string }[]) ?? []
    profileUpdates.badges = [
      ...existingBadges,
      ...newBadges.map((b) => ({ id: b.id, unlocked_at: nowISO })),
    ]
  }

  // ── Persist profile ───────────────────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', userId)

  if (updateErr) {
    console.error('[gamification/award] update error:', updateErr)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  // ── Log to xp_log ─────────────────────────────────────────────────────────
  const { error: logErr } = await supabase.from('xp_log').insert({
    user_id:  userId,
    amount:   xpGained,
    reason:   logReason,
    metadata: context,
  })
  if (logErr) console.error('[gamification/award] xp_log insert error:', logErr)

  const result: XPAwardResult = {
    xp_gained:   xpGained,
    new_xp:      newXP,
    old_level:   oldLevel,
    new_level:   newLevelDef.level,
    leveled_up:  leveledUp,
    new_title:   newLevelDef.title,
    new_frame:   newLevelDef.frame,
    new_badges:  newBadges,
    new_unlocks: leveledUp ? [newLevelDef.unlock] : [],
  }

  return NextResponse.json(result)
}
