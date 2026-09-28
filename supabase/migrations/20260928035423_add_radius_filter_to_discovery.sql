-- Add a radius_miles parameter (default 10) to cap discovery results by distance.
DROP FUNCTION IF EXISTS discover_couples(uuid, float, float);
CREATE FUNCTION discover_couples(
  user_couple_id uuid,
  ref_lat float DEFAULT NULL,
  ref_lng float DEFAULT NULL,
  radius_miles float DEFAULT 10
)
RETURNS TABLE (
  couple_id uuid,
  couple_name text,
  bio text,
  zip_code text,
  hosting_preference hosting_preference,
  distance_miles float,
  partner_1_name text,
  partner_2_name text,
  partner_1_age int,
  partner_2_age int
) AS $$
DECLARE
  ref_location geography;
BEGIN
  IF ref_lat IS NOT NULL AND ref_lng IS NOT NULL THEN
    ref_location := ST_SetSRID(ST_MakePoint(ref_lng, ref_lat), 4326)::geography;
  ELSE
    SELECT c.location INTO ref_location
    FROM couples c
    WHERE c.id = user_couple_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Couple not found';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    c.id AS couple_id,
    c.couple_name,
    c.bio,
    c.zip_code,
    c.hosting_preference,
    ST_Distance(c.location, ref_location) / 1609.344 AS distance_miles,
    p1.full_name AS partner_1_name,
    p2.full_name AS partner_2_name,
    p1.age AS partner_1_age,
    p2.age AS partner_2_age
  FROM couples c
  JOIN profiles p1 ON p1.id = c.partner_1_id
  LEFT JOIN profiles p2 ON p2.id = c.partner_2_id
  WHERE c.id != user_couple_id
    AND ST_DWithin(c.location, ref_location, radius_miles * 1609.344)
  ORDER BY ST_Distance(c.location, ref_location);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
