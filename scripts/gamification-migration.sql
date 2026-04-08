-- ============================================================
-- Basket Gamification Migration
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- Safe to run multiple times — all statements are idempotent.
-- ============================================================

-- ── 1. Gamification columns on profiles ─────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp               INTEGER        DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level            INTEGER        DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title            TEXT           DEFAULT 'Débutant';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_frame     TEXT           DEFAULT 'default';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scan_streak      INTEGER        DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak   INTEGER        DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_savings    NUMERIC(10,2)  DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_scans      INTEGER        DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_scan_date   DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges           JSONB          DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unlocked_features JSONB         DEFAULT '[]';

-- Additional tracking columns needed for badge logic
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_challenges JSONB      DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stores_scanned       JSONB      DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postcodes_scanned    JSONB      DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shares_count         INTEGER    DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name         TEXT;

-- ── 2. Performance indexes for leaderboard queries ───────────

CREATE INDEX IF NOT EXISTS idx_profiles_xp       ON profiles (xp DESC)            WHERE total_scans > 0;
CREATE INDEX IF NOT EXISTS idx_profiles_savings  ON profiles (total_savings DESC)  WHERE total_scans > 0;
CREATE INDEX IF NOT EXISTS idx_profiles_streak   ON profiles (scan_streak DESC)    WHERE total_scans > 0;

-- ── 3. Leaderboard view ──────────────────────────────────────

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  id,
  COALESCE(display_name, LEFT(email, STRPOS(email, '@') - 1)) AS display_name,
  xp,
  level,
  title,
  avatar_frame,
  total_savings,
  total_scans,
  scan_streak,
  longest_streak,
  RANK() OVER (ORDER BY total_savings DESC) AS savings_rank,
  RANK() OVER (ORDER BY xp DESC)            AS xp_rank,
  RANK() OVER (ORDER BY scan_streak DESC)   AS streak_rank,
  LEFT(postcode, 2)                         AS dept
FROM profiles
WHERE total_scans > 0;

-- ── 4. XP log — audit trail for every XP award ──────────────

CREATE TABLE IF NOT EXISTS xp_log (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount     INTEGER      NOT NULL,
  reason     TEXT         NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_log_user ON xp_log (user_id, created_at DESC);

-- RLS on xp_log: users can read their own log, service role writes
ALTER TABLE xp_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'xp_log' AND policyname = 'users read own xp log'
  ) THEN
    CREATE POLICY "users read own xp log"
      ON xp_log FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;
