-- dept is part of the primary key so cannot be NULL.
-- Instead, rebuild_weekly_trends uses COALESCE(postcode_dept, 'national')
-- so rows without a specific department are stored under dept = 'national'.
--
-- Run the updated rebuild_weekly_trends function from fix-constraint-and-rpcs.sql
-- (already applied — this file documents the decision).

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
    COALESCE(postcode_dept, 'national')        AS dept,
    TO_CHAR(source_date::date, 'IYYY-IW')      AS year_week,
    ROUND(AVG(unit_price)::numeric, 2)         AS avg_price,
    COUNT(*)                                   AS sample_count
  FROM community_prices
  WHERE item_name_normalised IS NOT NULL
    AND source_date IS NOT NULL
  GROUP BY item_name_normalised, store_chain,
           COALESCE(postcode_dept, 'national'),
           TO_CHAR(source_date::date, 'IYYY-IW');
END;
$$;
