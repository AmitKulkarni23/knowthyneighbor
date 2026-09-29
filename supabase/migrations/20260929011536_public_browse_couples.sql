CREATE FUNCTION browse_couples_public(
  ref_lat float,
  ref_lng float,
  radius_miles float DEFAULT 10
)
RETURNS TABLE (
  couple_id uuid,
  couple_name text,
  bio text,
  city text,
  state text,
  distance_miles float,
  has_availability boolean
) AS $$
DECLARE
  ref_location geography;
BEGIN
  ref_location := ST_SetSRID(ST_MakePoint(ref_lng, ref_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    c.id AS couple_id,
    c.couple_name,
    c.bio,
    c.city,
    c.state,
    ST_Distance(c.location, ref_location) / 1609.344 AS distance_miles,
    EXISTS (
      SELECT 1 FROM availability a
      WHERE a.couple_id = c.id
        AND a.specific_date >= CURRENT_DATE
    ) AS has_availability
  FROM couples c
  WHERE ST_DWithin(c.location, ref_location, radius_miles * 1609.344)
  ORDER BY ST_Distance(c.location, ref_location);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION browse_couples_public(float, float, float) TO anon;
