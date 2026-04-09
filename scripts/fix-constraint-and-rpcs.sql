-- ── Fix 1: Drop the old multi-column unique constraint ───────────────────────
-- This was blocking inserts even after dedup_key was set up correctly.
-- The dedup_key unique index (community_prices_dedup_key_idx) handles dedup now.
ALTER TABLE community_prices DROP CONSTRAINT IF EXISTS community_prices_unique;

-- ── Fix 2: Rebuild rebuild_price_stats using TRUNCATE ────────────────────────
-- pg_safeupdate (enabled by Supabase) blocks DELETE without a WHERE clause.
-- TRUNCATE is not subject to pg_safeupdate and is also faster.
CREATE OR REPLACE FUNCTION rebuild_price_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE product_price_stats;

  INSERT INTO product_price_stats (
    item_name_normalised,
    store_chain,
    postcode_dept,
    avg_price,
    min_price,
    max_price,
    sample_count,
    last_seen
  )
  SELECT
    item_name_normalised,
    store_chain,
    postcode_dept,
    ROUND(AVG(unit_price)::numeric, 2)   AS avg_price,
    MIN(unit_price)                       AS min_price,
    MAX(unit_price)                       AS max_price,
    COUNT(*)                              AS sample_count,
    MAX(source_date)                      AS last_seen
  FROM community_prices
  WHERE item_name_normalised IS NOT NULL
  GROUP BY item_name_normalised, store_chain, postcode_dept;
END;
$$;

-- ── Fix 3: Rebuild rebuild_weekly_trends using TRUNCATE ──────────────────────
CREATE OR REPLACE FUNCTION rebuild_weekly_trends()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE price_weekly_trends;

  INSERT INTO price_weekly_trends (
    item_name_normalised,
    week_start,
    avg_price,
    sample_count
  )
  SELECT
    item_name_normalised,
    DATE_TRUNC('week', source_date::date)  AS week_start,
    ROUND(AVG(unit_price)::numeric, 2)     AS avg_price,
    COUNT(*)                               AS sample_count
  FROM community_prices
  WHERE item_name_normalised IS NOT NULL
    AND source_date IS NOT NULL
  GROUP BY item_name_normalised, DATE_TRUNC('week', source_date::date);
END;
$$;
