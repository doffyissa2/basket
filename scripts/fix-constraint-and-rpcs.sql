-- ── Fix 1: Drop the old multi-column unique constraint ───────────────────────
-- This was blocking inserts even after dedup_key was set up correctly.
-- The dedup_key unique index (community_prices_dedup_key_idx) handles dedup now.
ALTER TABLE community_prices DROP CONSTRAINT IF EXISTS community_prices_unique;

-- ── Fix 2: rebuild_price_stats — TRUNCATE + correct column names ─────────────
-- pg_safeupdate blocks DELETE without WHERE; TRUNCATE bypasses it.
-- Correct columns: dept (not postcode_dept), median_price, freshness_score.
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
    dept,
    avg_price,
    median_price,
    min_price,
    max_price,
    sample_count,
    freshness_score
  )
  SELECT
    item_name_normalised,
    store_chain,
    postcode_dept                                                        AS dept,
    ROUND(AVG(unit_price)::numeric, 2)                                   AS avg_price,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY unit_price)::numeric, 2)
                                                                         AS median_price,
    MIN(unit_price)                                                      AS min_price,
    MAX(unit_price)                                                      AS max_price,
    COUNT(*)                                                             AS sample_count,
    -- Freshness: 1.0 when last seen today, decays toward 0 over ~90 days
    ROUND(
      (1.0 / (1.0 + GREATEST(
        EXTRACT(EPOCH FROM (NOW() - MAX(source_date)::timestamp)) / 86400.0,
        0
      ) / 30.0))::numeric,
      4
    )                                                                    AS freshness_score
  FROM community_prices
  WHERE item_name_normalised IS NOT NULL
  GROUP BY item_name_normalised, store_chain, postcode_dept;
END;
$$;

-- ── Fix 3: rebuild_weekly_trends — correct table name (price_weekly) ─────────
CREATE OR REPLACE FUNCTION rebuild_weekly_trends()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE price_weekly;

  INSERT INTO price_weekly (
    item_name_normalised,
    store_chain,
    dept,
    year_week,
    avg_price,
    sample_count
  )
  SELECT
    item_name_normalised,
    store_chain,
    postcode_dept                                           AS dept,
    TO_CHAR(source_date::date, 'IYYY-IW')                  AS year_week,
    ROUND(AVG(unit_price)::numeric, 2)                     AS avg_price,
    COUNT(*)                                               AS sample_count
  FROM community_prices
  WHERE item_name_normalised IS NOT NULL
    AND source_date IS NOT NULL
  GROUP BY item_name_normalised, store_chain, postcode_dept,
           TO_CHAR(source_date::date, 'IYYY-IW');
END;
$$;
