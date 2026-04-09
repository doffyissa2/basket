-- ============================================================
-- Fix community_prices deduplication ballooning
-- Run once in Supabase SQL Editor → Dashboard → SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- Drop the old unique constraint if it exists (it doesn't handle NULLs)
DROP INDEX IF EXISTS community_prices_dedup_idx;

-- Create a new unique index using COALESCE so NULL = NULL for dedup purposes.
-- This means two rows with the same name/price/source but both store_chain=NULL
-- will conflict and be treated as duplicates — which is what we want.
CREATE UNIQUE INDEX IF NOT EXISTS community_prices_dedup_coalesce_idx
  ON community_prices (
    item_name_normalised,
    unit_price,
    source,
    COALESCE(source_date,  '1970-01-01'),
    COALESCE(store_chain,  '__none__')
  );

-- Optional: deduplicate existing rows (keeps the oldest row per group)
-- Uncomment and run separately if the table is already large.
-- DELETE FROM community_prices a
-- USING community_prices b
-- WHERE a.id > b.id
--   AND a.item_name_normalised = b.item_name_normalised
--   AND a.unit_price            = b.unit_price
--   AND a.source                = b.source
--   AND COALESCE(a.source_date,  '1970-01-01') = COALESCE(b.source_date,  '1970-01-01')
--   AND COALESCE(a.store_chain,  '__none__')   = COALESCE(b.store_chain,  '__none__');
