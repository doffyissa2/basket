-- Enriched product extraction: add brand and volume_weight to price_items
-- Run this in Supabase SQL editor BEFORE deploying code changes.

ALTER TABLE price_items
  ADD COLUMN IF NOT EXISTS brand         TEXT,
  ADD COLUMN IF NOT EXISTS volume_weight TEXT;

-- Partial index for structured matching (only index non-null brands)
CREATE INDEX IF NOT EXISTS price_items_brand_idx
  ON price_items (brand) WHERE brand IS NOT NULL;
