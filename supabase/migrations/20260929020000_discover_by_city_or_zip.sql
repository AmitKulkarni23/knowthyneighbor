-- Add city/zip search to authenticated discovery (alongside existing geo search).
DROP FUNCTION IF EXISTS discover_couples(uuid, float, float, float);
CREATE FUNCTION discover_couples(
  user_couple_id uuid,
  ref_lat float DEFAULT NULL,
  ref_lng float DEFAULT NULL,
  radius_miles float DEFAULT 25,
  search_city text DEFAULT NULL,
  search_zip text DEFAULT NULL
)
RETURNS TABLE (
  couple_id uuid,
  couple_name text,
  bio text,
  zip_code text,
  city text,
  state text,
  hosting_preference hosting_preference,
  distance_miles float,
  partner_1_name text,
  partner_2_name text,
  partner_1_age int,
  partner_2_age int,
  has_availability boolean,
  has_pending_request boolean
) AS $$
DECLARE
  ref_location geography;
  use_geo boolean;
BEGIN
  use_geo := (search_city IS NULL AND search_zip IS NULL);

  IF use_geo THEN
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
      c.city,
      c.state,
      c.hosting_preference,
      ST_Distance(c.location, ref_location) / 1609.344 AS distance_miles,
      p1.full_name AS partner_1_name,
      p2.full_name AS partner_2_name,
      p1.age AS partner_1_age,
      p2.age AS partner_2_age,
      EXISTS (
        SELECT 1 FROM availability a
        WHERE a.couple_id = c.id
          AND a.specific_date >= CURRENT_DATE
      ) AS has_availability,
      EXISTS (
        SELECT 1 FROM join_requests jr
        WHERE jr.requester_couple_id = user_couple_id
          AND jr.host_couple_id = c.id
          AND jr.status = 'pending'
      ) AS has_pending_request
    FROM couples c
    JOIN profiles p1 ON p1.id = c.partner_1_id
    LEFT JOIN profiles p2 ON p2.id = c.partner_2_id
    WHERE c.id != user_couple_id
      AND ST_DWithin(c.location, ref_location, radius_miles * 1609.344)
    ORDER BY ST_Distance(c.location, ref_location);
  ELSE
    RETURN QUERY
    SELECT
      c.id AS couple_id,
      c.couple_name,
      c.bio,
      c.zip_code,
      c.city,
      c.state,
      c.hosting_preference,
      0::float AS distance_miles,
      p1.full_name AS partner_1_name,
      p2.full_name AS partner_2_name,
      p1.age AS partner_1_age,
      p2.age AS partner_2_age,
      EXISTS (
        SELECT 1 FROM availability a
        WHERE a.couple_id = c.id
          AND a.specific_date >= CURRENT_DATE
      ) AS has_availability,
      EXISTS (
        SELECT 1 FROM join_requests jr
        WHERE jr.requester_couple_id = user_couple_id
          AND jr.host_couple_id = c.id
          AND jr.status = 'pending'
      ) AS has_pending_request
    FROM couples c
    JOIN profiles p1 ON p1.id = c.partner_1_id
    LEFT JOIN profiles p2 ON p2.id = c.partner_2_id
    WHERE c.id != user_couple_id
      AND (search_city IS NULL OR similarity(lower(c.city), lower(search_city)) > 0.3)
      AND (search_zip IS NULL OR c.zip_code = search_zip)
    ORDER BY
      CASE WHEN search_city IS NOT NULL THEN similarity(lower(c.city), lower(search_city)) ELSE 1 END DESC,
      c.couple_name;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
