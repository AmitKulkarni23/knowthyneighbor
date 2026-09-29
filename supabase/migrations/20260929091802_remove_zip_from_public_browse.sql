DROP FUNCTION IF EXISTS browse_couples_public(text, text, text, text);
CREATE FUNCTION browse_couples_public(
  search_city text DEFAULT NULL,
  search_state text DEFAULT NULL,
  search_country text DEFAULT NULL,
  search_zip text DEFAULT NULL
)
RETURNS TABLE (
  couple_id uuid,
  couple_name text,
  bio text,
  city text,
  state text,
  country text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS couple_id,
    c.couple_name,
    c.bio,
    c.city,
    c.state,
    c.country
  FROM couples c
  WHERE
    (search_city IS NULL OR similarity(lower(c.city), lower(search_city)) > 0.3)
    AND (search_state IS NULL OR similarity(lower(c.state), lower(search_state)) > 0.3)
    AND (search_country IS NULL OR similarity(lower(c.country), lower(search_country)) > 0.3)
    AND (search_zip IS NULL OR c.zip_code = search_zip)
  ORDER BY
    CASE WHEN search_city IS NOT NULL THEN similarity(lower(c.city), lower(search_city)) ELSE 1 END DESC,
    c.couple_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION browse_couples_public(text, text, text, text) TO anon;
