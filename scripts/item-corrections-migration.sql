-- ── item_corrections ──────────────────────────────────────────────────────────
-- Stores user corrections to AI-parsed receipt items.
-- Used to improve future parsing quality.
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS item_corrections (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_id       uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  original_name    text NOT NULL,
  corrected_name   text NOT NULL,
  original_price   numeric(10, 2),
  corrected_price  numeric(10, 2),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by receipt
CREATE INDEX IF NOT EXISTS item_corrections_receipt_id_idx ON item_corrections (receipt_id);

-- Index for analytics queries grouping by original name
CREATE INDEX IF NOT EXISTS item_corrections_original_name_idx ON item_corrections (original_name);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE item_corrections ENABLE ROW LEVEL SECURITY;

-- Users can only read their own corrections
CREATE POLICY "Users can read own corrections"
  ON item_corrections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own corrections
CREATE POLICY "Users can insert own corrections"
  ON item_corrections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS (used by the API with getServiceClient())
-- No additional policy needed — service role always bypasses RLS.
