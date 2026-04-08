/**
 * Basket Gamification System
 *
 * Pure client-safe functions. No database access here.
 * Server-side mutation (awardXP, checkBadges, checkStreaks)
 * lives in /api/gamification/* so it can use the service role key.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface LevelDef {
  level:   number
  title:   string
  xp:      number          // XP required to reach this level
  frame:   AvatarFrame
  unlock:  string          // Feature or reward description
}

export type AvatarFrame =
  | 'default'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'diamond'
  | 'legendary'
  | 'legendary_elite'

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface BadgeDef {
  id:          string
  name:        string
  description: string
  icon:        string       // emoji
  rarity:      BadgeRarity
  /** Returns true when the stats satisfy the unlock condition */
  check: (stats: BadgeCheckStats) => boolean
}

export interface BadgeCheckStats {
  total_scans:       number
  total_savings:     number
  scan_streak:       number
  stores_scanned:    string[]
  postcodes_scanned: string[]
  shares_count:      number
  first_scan_hour?:  number   // hour of day of any scan (for lève-tôt / noctambule)
}

export interface EarnedBadge {
  id:          string
  unlocked_at: string   // ISO timestamp
}

export interface Challenge {
  id:          string
  text:        string
  description: string
  xp:          number
  target:      number
  type:        ChallengeType
}

export type ChallengeType =
  | 'scan_count'
  | 'single_saving'
  | 'week_savings'
  | 'new_store'
  | 'share'
  | 'morning_scan'
  | 'streak_maintain'

export interface CompletedChallenge {
  week:          string    // e.g. "2026-W15"
  challenge_ids: string[]
}

export interface XPAwardResult {
  xp_gained:    number
  new_xp:       number
  old_level:    number
  new_level:    number
  leveled_up:   boolean
  new_title:    string
  new_frame:    AvatarFrame
  new_badges:   BadgeDef[]
  new_unlocks:  string[]
}

export interface LevelProgress {
  current_xp:     number   // XP earned within this level
  needed_xp:      number   // XP needed to reach next level
  percent:        number   // 0–100
  xp_to_next:     number   // raw XP remaining
}

// ─────────────────────────────────────────────────────────────
// XP Event Values
// ─────────────────────────────────────────────────────────────

export const XP_EVENTS = {
  SCAN_RECEIPT:          25,
  FIRST_SCAN_OF_WEEK:    50,   // bonus, stacks with SCAN_RECEIPT
  STREAK_BONUS_PER_WEEK: 10,   // multiplied by streak_count
  SAVINGS_OVER_2:        15,
  SAVINGS_OVER_5:        30,
  SAVINGS_OVER_10:       50,
  SHARE_RESULT:          20,
  INVITE_FRIEND:        100,
  NEW_STORE_FIRST_TIME:  40,
  WEEKLY_CHALLENGE:      75,
} as const

// ─────────────────────────────────────────────────────────────
// Level Definitions (20 levels)
// ─────────────────────────────────────────────────────────────

export const LEVELS: LevelDef[] = [
  { level:  1, title: 'Débutant',              xp:      0, frame: 'default',         unlock: 'Scan de ticket' },
  { level:  2, title: 'Curieux',               xp:    100, frame: 'default',         unlock: 'Comparaison de prix' },
  { level:  3, title: 'Économe',               xp:    300, frame: 'bronze',          unlock: 'Cadre avatar bronze' },
  { level:  4, title: 'Chasseur de prix',      xp:    600, frame: 'bronze',          unlock: 'Rapport hebdomadaire par e-mail' },
  { level:  5, title: 'Expert du caddie',      xp:   1000, frame: 'silver',          unlock: 'Alertes de baisse de prix + cadre argent' },
  { level:  6, title: 'Roi du ticket',         xp:   1500, frame: 'silver',          unlock: 'Liste de courses optimisée' },
  { level:  7, title: 'Maître des promos',     xp:   2200, frame: 'gold',            unlock: 'Cadre avatar or' },
  { level:  8, title: 'Génie du panier',       xp:   3000, frame: 'gold',            unlock: 'Graphiques de tendances de prix' },
  { level:  9, title: 'Légende des courses',   xp:   4000, frame: 'diamond',         unlock: 'Cadre avatar diamant' },
  { level: 10, title: 'Dieu du supermarché',   xp:   5500, frame: 'legendary',       unlock: 'Cadre légendaire + couronne du classement' },
  { level: 11, title: 'Titan des économies',   xp:   7500, frame: 'legendary',       unlock: 'Insigne exclusif Titan' },
  { level: 12, title: 'Oracle des prix',       xp:  10000, frame: 'legendary',       unlock: 'Accès aux statistiques avancées' },
  { level: 13, title: 'Pharaon du caddie',     xp:  13500, frame: 'legendary',       unlock: 'Insigne Pharaon' },
  { level: 14, title: 'Seigneur des soldes',   xp:  17500, frame: 'legendary',       unlock: 'Classement national débloqué' },
  { level: 15, title: 'Stratège du marché',    xp:  22500, frame: 'legendary',       unlock: 'Rapport mensuel personnalisé' },
  { level: 16, title: 'Virtuose des achats',   xp:  28500, frame: 'legendary',       unlock: 'Insigne Virtuose' },
  { level: 17, title: 'Maestro des économies', xp:  36000, frame: 'legendary',       unlock: 'Accès bêta aux nouvelles fonctions' },
  { level: 18, title: 'Élu des supermarchés',  xp:  45000, frame: 'legendary',       unlock: 'Profil mis en avant dans le classement' },
  { level: 19, title: 'Mythe du panier',       xp:  57000, frame: 'legendary',       unlock: 'Titre "Mythe" permanent' },
  { level: 20, title: 'Dieu des courses',      xp:  72000, frame: 'legendary_elite', unlock: 'Cadre élite animé + statut légendaire permanent' },
]

// ─────────────────────────────────────────────────────────────
// Badge Definitions
// ─────────────────────────────────────────────────────────────

export const BADGES: BadgeDef[] = [
  {
    id: 'premier_scan',
    name: 'Premier scan',
    description: 'Scanner votre premier ticket de caisse',
    icon: '🧾',
    rarity: 'common',
    check: (s) => s.total_scans >= 1,
  },
  {
    id: 'chasseur_aubaines',
    name: "Chasseur d'aubaines",
    description: 'Trouver des économies sur 10 articles ou plus',
    icon: '🎯',
    rarity: 'common',
    check: (s) => s.total_scans >= 10,
  },
  {
    id: 'fidele',
    name: 'Fidèle',
    description: 'Maintenir un streak de 4 semaines consécutives',
    icon: '🔥',
    rarity: 'rare',
    check: (s) => s.scan_streak >= 4,
  },
  {
    id: 'marathonien',
    name: 'Marathonien',
    description: 'Maintenir un streak de 12 semaines consécutives',
    icon: '⚡',
    rarity: 'epic',
    check: (s) => s.scan_streak >= 12,
  },
  {
    id: 'diversifie',
    name: 'Diversifié',
    description: 'Scanner des tickets dans 5 enseignes différentes',
    icon: '🏪',
    rarity: 'rare',
    check: (s) => s.stores_scanned.length >= 5,
  },
  {
    id: 'globe_trotter',
    name: 'Globe-trotter',
    description: 'Scanner des tickets dans 10 enseignes différentes',
    icon: '🌍',
    rarity: 'epic',
    check: (s) => s.stores_scanned.length >= 10,
  },
  {
    id: 'economiste',
    name: 'Économiste',
    description: 'Économiser 50 € au total',
    icon: '💰',
    rarity: 'rare',
    check: (s) => s.total_savings >= 50,
  },
  {
    id: 'millionnaire',
    name: 'Millionnaire',
    description: 'Économiser 500 € au total',
    icon: '💎',
    rarity: 'legendary',
    check: (s) => s.total_savings >= 500,
  },
  {
    id: 'partageur',
    name: 'Partageur',
    description: 'Partager vos résultats 10 fois',
    icon: '📤',
    rarity: 'common',
    check: (s) => s.shares_count >= 10,
  },
  {
    id: 'explorateur',
    name: 'Explorateur',
    description: 'Scanner dans 3 codes postaux différents',
    icon: '🗺️',
    rarity: 'rare',
    check: (s) => s.postcodes_scanned.length >= 3,
  },
  {
    id: 'leve_tot',
    name: 'Lève-tôt',
    description: 'Scanner un ticket avant 8h du matin',
    icon: '🌅',
    rarity: 'rare',
    check: (s) => s.first_scan_hour !== undefined && s.first_scan_hour < 8,
  },
  {
    id: 'noctambule',
    name: 'Noctambule',
    description: 'Scanner un ticket après 23h',
    icon: '🌙',
    rarity: 'rare',
    check: (s) => s.first_scan_hour !== undefined && s.first_scan_hour >= 23,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Scanner 100 tickets au total',
    icon: '🏆',
    rarity: 'epic',
    check: (s) => s.total_scans >= 100,
  },
  {
    id: 'roi_de_france',
    name: 'Roi de France',
    description: 'Atteindre la 1ère place du classement de votre département',
    icon: '👑',
    rarity: 'legendary',
    // Checked server-side against the leaderboard view — always false client-side
    check: () => false,
  },
]

// ─────────────────────────────────────────────────────────────
// Weekly Challenge Pool
// ─────────────────────────────────────────────────────────────

const CHALLENGE_POOL: Challenge[] = [
  {
    id: 'scan_3',
    text: 'Scannez 3 tickets cette semaine',
    description: 'Chaque ticket compte — même les petites courses.',
    xp: 75, target: 3, type: 'scan_count',
  },
  {
    id: 'scan_5',
    text: 'Scannez 5 tickets cette semaine',
    description: 'La régularité est la clé des économies.',
    xp: 100, target: 5, type: 'scan_count',
  },
  {
    id: 'save_5_single',
    text: 'Trouvez 5 € d\'économies en un seul scan',
    description: 'Un seul ticket peut faire la différence.',
    xp: 75, target: 5, type: 'single_saving',
  },
  {
    id: 'save_10_week',
    text: 'Économisez 10 € au total cette semaine',
    description: 'Cumul de tous vos scans de la semaine.',
    xp: 75, target: 10, type: 'week_savings',
  },
  {
    id: 'new_store',
    text: 'Scannez dans un magasin que vous n\'avez jamais utilisé',
    description: 'Explorez une nouvelle enseigne.',
    xp: 75, target: 1, type: 'new_store',
  },
  {
    id: 'share_result',
    text: 'Partagez vos économies avec vos proches',
    description: 'Via WhatsApp, SMS ou le presse-papier.',
    xp: 75, target: 1, type: 'share',
  },
  {
    id: 'morning_scan',
    text: 'Scannez un ticket avant 8h du matin',
    description: 'Les lève-tôt font les meilleures affaires.',
    xp: 75, target: 1, type: 'morning_scan',
  },
  {
    id: 'maintain_streak',
    text: 'Maintenez votre streak en scannant au moins une fois',
    description: 'La constance est votre meilleure arme.',
    xp: 75, target: 1, type: 'streak_maintain',
  },
]

/** Returns the ISO week string for a date, e.g. "2026-W15" */
export function getISOWeekString(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Deterministic shuffle using the week number as seed */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    // Mulberry32-inspired integer hash
    const j = Math.abs(((seed ^ (seed >>> 15)) * 2246822519 + i * 2654435761) >>> 0) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Returns the 3 weekly challenges for the current (or given) week.
 * Deterministic — all users get the same 3 challenges per calendar week.
 */
export function getWeeklyChallenges(date = new Date()): Challenge[] {
  const weekStr = getISOWeekString(date)
  // Convert "2026-W15" → numeric seed
  const seed = parseInt(weekStr.replace('-W', ''), 10)
  return seededShuffle(CHALLENGE_POOL, seed).slice(0, 3)
}

// ─────────────────────────────────────────────────────────────
// Level Utility Functions
// ─────────────────────────────────────────────────────────────

/** Returns the level definition for a given XP total */
export function calculateLevel(xp: number): LevelDef {
  let def = LEVELS[0]
  for (const l of LEVELS) {
    if (xp >= l.xp) def = l
    else break
  }
  return def
}

/** Returns the human-readable title for a given level number */
export function getTitle(level: number): string {
  return LEVELS[Math.min(level, LEVELS.length) - 1]?.title ?? 'Débutant'
}

/** XP required to reach the next level, or null if max level */
export function getNextLevelXP(level: number): number | null {
  const next = LEVELS[level]   // LEVELS is 0-indexed so LEVELS[level] = level+1
  return next?.xp ?? null
}

/** Progress within the current level toward the next */
export function getLevelProgress(xp: number): LevelProgress {
  const current = calculateLevel(xp)
  const next    = LEVELS[current.level]   // level+1 entry (0-indexed)

  if (!next) {
    // Max level — show full bar
    return { current_xp: 0, needed_xp: 0, percent: 100, xp_to_next: 0 }
  }

  const current_xp = xp - current.xp
  const needed_xp  = next.xp - current.xp
  const percent    = Math.min(100, Math.round((current_xp / needed_xp) * 100))
  const xp_to_next = next.xp - xp

  return { current_xp, needed_xp, percent, xp_to_next }
}

/** Human-readable XP string, e.g. "2 450 XP" */
export function formatXP(xp: number): string {
  return `${xp.toLocaleString('fr-FR')} XP`
}

// ─────────────────────────────────────────────────────────────
// Avatar Frame Styles
// ─────────────────────────────────────────────────────────────

export interface FrameStyle {
  border:     string
  glow:       string
  label:      string
  isAnimated: boolean
}

const FRAME_STYLES: Record<AvatarFrame, FrameStyle> = {
  default: {
    border:     '2px solid rgba(17,17,17,0.12)',
    glow:       'none',
    label:      '',
    isAnimated: false,
  },
  bronze: {
    border:     '2.5px solid #CD7F32',
    glow:       '0 0 12px rgba(205,127,50,0.4)',
    label:      'Bronze',
    isAnimated: false,
  },
  silver: {
    border:     '2.5px solid #C0C0C0',
    glow:       '0 0 14px rgba(192,192,192,0.5)',
    label:      'Argent',
    isAnimated: false,
  },
  gold: {
    border:     '3px solid #FFD700',
    glow:       '0 0 18px rgba(255,215,0,0.5)',
    label:      'Or',
    isAnimated: false,
  },
  diamond: {
    border:     '3px solid #B9F2FF',
    glow:       '0 0 20px rgba(185,242,255,0.6)',
    label:      'Diamant',
    isAnimated: false,
  },
  legendary: {
    border:     '3px solid #7ed957',
    glow:       '0 0 24px rgba(126,217,87,0.6)',
    label:      'Légendaire',
    isAnimated: true,
  },
  legendary_elite: {
    border:     '3px solid #FFD700',
    glow:       '0 0 32px rgba(255,215,0,0.8)',
    label:      'Élite',
    isAnimated: true,
  },
}

export function getFrameStyle(frame: AvatarFrame): FrameStyle {
  return FRAME_STYLES[frame] ?? FRAME_STYLES.default
}

/** Gradient string for legendary frames (use as background on the ring element) */
export const LEGENDARY_GRADIENT =
  'linear-gradient(135deg, #7ed957 0%, #00D09C 25%, #FFD700 50%, #7ed957 75%, #00D09C 100%)'

export const LEGENDARY_ELITE_GRADIENT =
  'linear-gradient(135deg, #FFD700 0%, #FF8C00 25%, #FFD700 50%, #FFF8DC 75%, #FFD700 100%)'

// ─────────────────────────────────────────────────────────────
// Badge Utilities
// ─────────────────────────────────────────────────────────────

export const RARITY_LABEL: Record<BadgeRarity, string> = {
  common:    'Commun',
  rare:      'Rare',
  epic:      'Épique',
  legendary: 'Légendaire',
}

export const RARITY_COLOR: Record<BadgeRarity, string> = {
  common:    'rgba(17,17,17,0.45)',
  rare:      '#7ed957',
  epic:      '#B9F2FF',
  legendary: '#FFD700',
}

/** Given a list of earned badge IDs, returns which BADGES are new based on current stats */
export function getNewBadges(
  stats:        BadgeCheckStats,
  earnedIds:    string[],
): BadgeDef[] {
  const earnedSet = new Set(earnedIds)
  return BADGES.filter((b) => !earnedSet.has(b.id) && b.check(stats))
}

/** Looks up a badge definition by id */
export function getBadge(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id)
}

// ─────────────────────────────────────────────────────────────
// XP Calculation Helpers (used both client-side + API routes)
// ─────────────────────────────────────────────────────────────

/**
 * Calculates total XP to award for a scan event.
 * Does NOT write to DB — call /api/gamification/award for that.
 */
export function calcScanXP(opts: {
  savings:          number
  isFirstScanOfWeek: boolean
  streak:           number
  isNewStore:       boolean
}): { total: number; breakdown: { reason: string; amount: number }[] } {
  const breakdown: { reason: string; amount: number }[] = []

  breakdown.push({ reason: 'scan_receipt', amount: XP_EVENTS.SCAN_RECEIPT })

  if (opts.isFirstScanOfWeek) {
    breakdown.push({ reason: 'first_scan_of_week', amount: XP_EVENTS.FIRST_SCAN_OF_WEEK })
    if (opts.streak > 1) {
      const bonus = opts.streak * XP_EVENTS.STREAK_BONUS_PER_WEEK
      breakdown.push({ reason: `streak_${opts.streak}w`, amount: bonus })
    }
  }

  if (opts.savings >= 10) {
    breakdown.push({ reason: 'savings_over_10', amount: XP_EVENTS.SAVINGS_OVER_10 })
  } else if (opts.savings >= 5) {
    breakdown.push({ reason: 'savings_over_5', amount: XP_EVENTS.SAVINGS_OVER_5 })
  } else if (opts.savings >= 2) {
    breakdown.push({ reason: 'savings_over_2', amount: XP_EVENTS.SAVINGS_OVER_2 })
  }

  if (opts.isNewStore) {
    breakdown.push({ reason: 'new_store', amount: XP_EVENTS.NEW_STORE_FIRST_TIME })
  }

  const total = breakdown.reduce((s, b) => s + b.amount, 0)
  return { total, breakdown }
}
