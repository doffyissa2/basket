-- ── community_prices v2 migration ────────────────────────────────────────────
-- Run in the Supabase SQL editor (safe to re-run; all statements use IF NOT EXISTS / IF EXISTS).
--
-- What this adds:
--   community_prices: postcode (full 5-digit), latitude, longitude,
--                     store_address, brand, dedup_key (generated) + unique index
--   receipts:         raw_ocr_text, store_latitude, store_longitude, store_address
-- ---------------------------------------------------------------------------

-- ── 1. community_prices: new location + brand columns ────────────────────────
ALTER TABLE community_prices
  ADD COLUMN IF NOT EXISTS latitude     FLOAT8,
  ADD COLUMN IF NOT EXISTS longitude    FLOAT8,
  ADD COLUMN IF NOT EXISTS store_address TEXT,
  ADD COLUMN IF NOT EXISTS brand        TEXT;

-- postcode column may already exist; safe no-op if so
ALTER TABLE community_prices
  ADD COLUMN IF NOT EXISTS postcode     VARCHAR(10);

-- ── 2. community_prices: dedup_key regular column ────────────────────────────
-- A plain TEXT column computed by the application on every insert.
-- (PostgreSQL GENERATED columns must be IMMUTABLE, but DATE::text depends on
--  DateStyle — so we use a regular column backfilled via UPDATE instead.)
ALTER TABLE community_prices
  ADD COLUMN IF NOT EXISTS dedup_key TEXT;

-- Backfill all existing rows (UPDATE has no immutability restriction)
UPDATE community_prices
SET dedup_key = (
  item_name_normalised
  || '|' || ROUND(unit_price::numeric, 2)::text
  || '|' || source
  || '|' || COALESCE(source_date::text, '')
  || '|' || COALESCE(store_chain, '__none__')
)
WHERE dedup_key IS NULL;

-- ── 3. Remove existing duplicates before creating unique index ────────────────
-- Keep one row per dedup_key (the last physically inserted, by ctid).
-- ctid is a built-in system column that works on any table regardless of id type.
DELETE FROM community_prices
WHERE ctid NOT IN (
  SELECT MAX(ctid)
  FROM   community_prices
  GROUP  BY dedup_key
);

-- ── 4. Drop old ineffective dedup indexes (replaced by dedup_key) ─────────────
DROP INDEX IF EXISTS community_prices_dedup_idx;
DROP INDEX IF EXISTS community_prices_dedup_coalesce_idx;

-- ── 5. Create the new unique index on the generated column ───────────────────
-- onConflict: 'dedup_key' in Supabase JS will now work correctly.
CREATE UNIQUE INDEX IF NOT EXISTS community_prices_dedup_key_idx
  ON community_prices (dedup_key);

-- ── 6. Supporting indexes for map + analytics queries ────────────────────────
CREATE INDEX IF NOT EXISTS community_prices_postcode_idx
  ON community_prices (postcode) WHERE postcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS community_prices_latlon_idx
  ON community_prices (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ── 7. receipts: new columns ──────────────────────────────────────────────────
-- raw_ocr_text: full JSON string returned by Claude (useful for reprocessing)
-- store_latitude / store_longitude: nearest store coords (vs user GPS in latitude/longitude)
-- store_address: human-readable store address from store_locations lookup
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS raw_ocr_text    TEXT,
  ADD COLUMN IF NOT EXISTS store_latitude  FLOAT8,
  ADD COLUMN IF NOT EXISTS store_longitude FLOAT8,
  ADD COLUMN IF NOT EXISTS store_address   TEXT;
