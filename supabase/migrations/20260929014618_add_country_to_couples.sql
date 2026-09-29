ALTER TABLE couples ADD COLUMN country text;

CREATE INDEX idx_couples_country ON couples (country);

-- Enable trigram extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Replace browse function to search by city/state/country with fuzzy matching
DROP FUNCTION IF EXISTS browse_couples_public(float, float, float);
CREATE FUNCTION browse_couples_public(
  search_city text DEFAULT NULL,
  search_state text DEFAULT NULL,
  search_country text DEFAULT NULL
)
RETURNS TABLE (
  couple_id uuid,
  couple_name text,
  bio text,
  city text,
  state text,
  country text,
  zip_code text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS couple_id,
    c.couple_name,
    c.bio,
    c.city,
    c.state,
    c.country,
    c.zip_code
  FROM couples c
  WHERE
    (search_city IS NULL OR similarity(lower(c.city), lower(search_city)) > 0.3)
    AND (search_state IS NULL OR similarity(lower(c.state), lower(search_state)) > 0.3)
    AND (search_country IS NULL OR similarity(lower(c.country), lower(search_country)) > 0.3)
  ORDER BY
    CASE WHEN search_city IS NOT NULL THEN similarity(lower(c.city), lower(search_city)) ELSE 1 END DESC,
    c.couple_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION browse_couples_public(text, text, text) TO anon;
