// Shared API response types used by both server routes and client pages.
// Import from here instead of redefining in each file.

import type { AvatarFrame, LevelProgress } from '@/lib/gamification'

// ── Receipt parsing ───────────────────────────────────────────────────────────

export interface ParsedItem {
  name:             string
  price:            number
  quantity:         number
  is_promo:         boolean
  is_private_label: boolean
  confidence?:      number
}

export interface ParsedReceipt {
  store_name: string
  items:      ParsedItem[]
  total:      number
}

// ── Price comparison ──────────────────────────────────────────────────────────

export interface ComparisonItem {
  name:                 string
  your_price:           number
  avg_price:            number
  savings:              number
  cheaper_store:        string | null
  normalized_price:     string | null
  avg_normalized_price: string | null
  is_local:             boolean
}

export interface BestStore {
  name:           string
  items_cheaper:  number
  total_savings:  number
}

// ── Shopping list ─────────────────────────────────────────────────────────────

export interface StoreComparison {
  store:       string
  total:       number
  items_found: number
}

export interface BestStoreResult {
  best_store:        string | null
  estimated_savings: number
  items_count:       number
  per_item:          { name: string; best_store: string | null; best_price: number | null }[]
  store_comparison:  StoreComparison[]
}

// ── Gamification ──────────────────────────────────────────────────────────────

export interface GamificationState {
  xp:                number
  level:             number
  title:             string
  frame:             AvatarFrame
  progress:          LevelProgress
  scan_streak:       number
  longest_streak:    number
  total_savings:     number
  total_scans:       number
  next_level:        { level: number; title: string; xp_required: number; unlock: string } | null
  badges:            { id: string; unlocked_at: string }[]
  weekly_challenges: { id: string; text: string; xp: number; completed: boolean }[]
  dept_rank:         number | null
}

export interface LeaderboardRow {
  id:            string
  display_name:  string
  level:         number
  title:         string
  total_savings: number
  is_me:         boolean
}
