-- Supabase advisor `rls_disabled_in_public`: PostGIS installed into `public` creates
-- `public.spatial_ref_sys`, which the Data API exposes without RLS (and which we cannot
-- ALTER because the extension owns it). PostGIS is not relocatable via ALTER EXTENSION,
-- so reinstall it into `extensions`, carrying couple locations across as WKT.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension
    WHERE extname = 'postgis' AND extnamespace = 'public'::regnamespace
  ) THEN
    ALTER TABLE public.couples ADD COLUMN location_wkt text;
    EXECUTE 'UPDATE public.couples SET location_wkt = public.ST_AsText(location)';

    DROP FUNCTION IF EXISTS public.discover_couples(uuid, float, float, float, text, text);
    DROP INDEX IF EXISTS public.idx_couples_location;
    ALTER TABLE public.couples DROP COLUMN location;

    DROP EXTENSION postgis;
    CREATE EXTENSION postgis WITH SCHEMA extensions;

    ALTER TABLE public.couples ADD COLUMN location extensions.geography(point, 4326);
    UPDATE public.couples SET location = extensions.ST_GeogFromText(location_wkt);
    ALTER TABLE public.couples ALTER COLUMN location SET NOT NULL;
    ALTER TABLE public.couples DROP COLUMN location_wkt;
  ELSIF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    CREATE EXTENSION postgis WITH SCHEMA extensions;
  END IF;

  -- pg_trgm is relocatable; keep it out of the exposed schema too (advisor `extension_in_public`)
  IF EXISTS (
    SELECT 1 FROM pg_extension
    WHERE extname = 'pg_trgm' AND extnamespace = 'public'::regnamespace
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_couples_location ON public.couples USING gist (location);
