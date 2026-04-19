-- PostGIS Spatial Index Migration
-- Adds GEOGRAPHY columns + GIST indices to store_locations and community_prices
-- for efficient spatial queries (ST_DWithin instead of app-level Haversine).
--
-- Prerequisites: PostGIS extension (available on all Supabase plans).
-- Run in Supabase SQL editor. Safe to run on a live database.

-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. store_locations: add geography column + index
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS geom GEOGRAPHY(Point, 4326);

UPDATE store_locations
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE geom IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS store_locations_geom_gist
  ON store_locations USING GIST (geom);

-- Auto-populate geom on INSERT/UPDATE
CREATE OR REPLACE FUNCTION store_locations_geom_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_locations_geom ON store_locations;
CREATE TRIGGER trg_store_locations_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON store_locations
  FOR EACH ROW
  EXECUTE FUNCTION store_locations_geom_trigger();

-- 3. community_prices: add geography column + index
ALTER TABLE community_prices ADD COLUMN IF NOT EXISTS geom GEOGRAPHY(Point, 4326);

UPDATE community_prices
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE geom IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS community_prices_geom_gist
  ON community_prices USING GIST (geom);

-- Auto-populate geom on INSERT/UPDATE
CREATE OR REPLACE FUNCTION community_prices_geom_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_prices_geom ON community_prices;
CREATE TRIGGER trg_community_prices_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON community_prices
  FOR EACH ROW
  EXECUTE FUNCTION community_prices_geom_trigger();
