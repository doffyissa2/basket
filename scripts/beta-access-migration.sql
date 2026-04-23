-- Beta access gating: add approval column to profiles
-- Run this in Supabase SQL editor before deploying the code changes.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS beta_approved boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS beta_approved_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_beta_approved
  ON profiles (beta_approved);

-- Pre-approve the admin account
UPDATE profiles
SET beta_approved = true, beta_approved_at = NOW()
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'angelo.maniraguha@gmail.com'
  LIMIT 1
);
