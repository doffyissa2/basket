-- Image Hash Dedup Migration
-- Adds SHA-256 hash column to receipts for duplicate image detection.
-- Run in Supabase SQL editor BEFORE deploying the code changes.

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS image_hash TEXT;

-- Unique per user: same user can't submit same image twice.
-- Different users CAN submit the same receipt (shared household).
CREATE UNIQUE INDEX IF NOT EXISTS receipts_user_image_hash_idx
  ON receipts (user_id, image_hash) WHERE image_hash IS NOT NULL;

-- Fast lookups by hash alone (for the dedup query)
CREATE INDEX IF NOT EXISTS receipts_image_hash_idx
  ON receipts (image_hash) WHERE image_hash IS NOT NULL;
