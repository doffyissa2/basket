-- match_store_by_location RPC Migration
-- Creates a PostGIS function to find the closest store within a radius.
--
-- Prerequisites: postgis-spatial-index-migration.sql must be applied first
--                (geom column + GIST index on store_locations).
--
-- Usage from Supabase client:
--   const { data } = await supabase.rpc('match_store_by_location', {
--     p_lat: 48.8566, p_lon: 2.3522, p_radius_m: 400
--   })
--
-- Returns: single closest store row within radius, or empty if none found.
-- Default 400m: French hypermarkets can span 200m+, and OSM centroids vs
-- INSEE registered addresses routinely diverge by 100-300m.

CREATE OR REPLACE FUNCTION match_store_by_location(
  p_lat      DOUBLE PRECISION,
  p_lon      DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 400
)
RETURNS TABLE (
  osm_id    TEXT,
  siret     TEXT,
  name      TEXT,
  chain     TEXT,
  address   TEXT,
  postcode  TEXT,
  city      TEXT,
  latitude  DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    sl.osm_id,
    sl.siret,
    sl.name,
    sl.chain,
    sl.address,
    sl.postcode,
    sl.city,
    sl.latitude,
    sl.longitude
  FROM store_locations sl
  WHERE sl.geom IS NOT NULL
    AND ST_DWithin(
          sl.geom,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
          p_radius_m
        )
  ORDER BY sl.geom <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
  LIMIT 1;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION match_store_by_location(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION)
  TO authenticated, service_role;

COMMENT ON FUNCTION match_store_by_location IS
  'Find the closest store_locations row within p_radius_m metres (default 400m) of a point. '
  'Returns at most 1 row. Uses GIST spatial index for sub-ms performance.';
