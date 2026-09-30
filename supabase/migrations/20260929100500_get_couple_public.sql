-- Public-safe couple profile for the "View Profile" page.
-- couples_select RLS only allows reading your own couple, so other couples
-- must be read through this SECURITY DEFINER function. It exposes only
-- fields already public via browse_couples_public — never zip_code,
-- invite_code, or location.

CREATE FUNCTION get_couple_public(target_couple_id uuid)
RETURNS TABLE (
  couple_id uuid,
  couple_name text,
  bio text,
  city text,
  state text,
  country text,
  hosting_preference hosting_preference,
  partner_1_name text,
  partner_1_age int,
  partner_1_avatar_url text,
  partner_2_name text,
  partner_2_age int,
  partner_2_avatar_url text
) AS $$
  SELECT
    c.id,
    c.couple_name,
    c.bio,
    c.city,
    c.state,
    c.country,
    c.hosting_preference,
    p1.full_name,
    p1.age,
    p1.avatar_url,
    p2.full_name,
    p2.age,
    p2.avatar_url
  FROM couples c
  JOIN profiles p1 ON p1.id = c.partner_1_id
  LEFT JOIN profiles p2 ON p2.id = c.partner_2_id
  WHERE c.id = target_couple_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_couple_public(uuid) TO authenticated;
