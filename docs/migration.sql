-- ============================================================
-- Basket DB cleanup migration
-- Run in Supabase SQL editor BEFORE deploying the code changes
-- Each section is independently reversible
-- ============================================================

-- ============================================================
-- STEP 3A: Remove redundant store_name column from receipts
-- (store_chain holds the same normalised value)
-- ============================================================

-- Verify columns hold identical values first (should return 0 rows):
-- SELECT id FROM receipts WHERE store_name IS DISTINCT FROM store_chain LIMIT 20;

ALTER TABLE receipts DROP COLUMN IF EXISTS store_name;

-- ROLLBACK:
-- ALTER TABLE receipts ADD COLUMN store_name TEXT;
-- UPDATE receipts SET store_name = store_chain;

-- ============================================================
-- STEP 3B: Remove redundant store_name column from price_items
-- ============================================================

-- Verify columns hold identical values first (should return 0 rows):
-- SELECT id FROM price_items WHERE store_name IS DISTINCT FROM store_chain LIMIT 20;

ALTER TABLE price_items DROP COLUMN IF EXISTS store_name;

-- ROLLBACK:
-- ALTER TABLE price_items ADD COLUMN store_name TEXT;
-- UPDATE price_items SET store_name = store_chain;

-- ============================================================
-- STEP 4: Rename market_prices.chain → store_chain
-- This aligns market_prices with every other table
-- ============================================================

ALTER TABLE market_prices RENAME COLUMN chain TO store_chain;

-- Also update the unique constraint that referenced the old column name:
-- (Run this if the above doesn't automatically rename the constraint)
-- ALTER INDEX IF EXISTS market_prices_chain_product_name_normalised_region_idx
--   RENAME TO market_prices_store_chain_product_name_normalised_region_idx;

-- ROLLBACK:
-- ALTER TABLE market_prices RENAME COLUMN store_chain TO chain;
