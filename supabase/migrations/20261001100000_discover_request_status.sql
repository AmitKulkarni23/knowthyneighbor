-- Update discover_couples to check for pending/accepted requests in both directions
CREATE OR REPLACE FUNCTION discover_couples(
  user_couple_id uuid,
  radius_miles float DEFAULT 25,
  search_city text DEFAULT NULL,
  search_zip text DEFAULT NULL
)
RETURNS TABLE (
  couple_id uuid,
  couple_name text,
  bio text,
  city text,
  state text,
  hosting_preference hosting_preference,
  distance_miles float,
  has_availability boolean,
  has_pending_request boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_ref extensions.geography;
  v_radius_m float := LEAST(GREATEST(COALESCE(radius_miles, 25), 1), 100) * 1609.344;
BEGIN
  SELECT c.location INTO v_ref
  FROM public.couples c
  WHERE c.id = user_couple_id
    AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.couple_name,
    c.bio,
    c.city,
    c.state,
    c.hosting_preference,
    round((extensions.ST_Distance(c.location, v_ref) / 1609.344)::numeric, 1)::float,
    EXISTS (
      SELECT 1 FROM public.availability a
      WHERE a.couple_id = c.id AND a.specific_date >= CURRENT_DATE
    ),
    EXISTS (
      SELECT 1 FROM public.join_requests jr
      WHERE jr.status IN ('pending', 'accepted')
        AND (
          (jr.requester_couple_id = user_couple_id AND jr.host_couple_id = c.id)
          OR (jr.requester_couple_id = c.id AND jr.host_couple_id = user_couple_id)
        )
    )
  FROM public.couples c
  WHERE c.id != user_couple_id
    AND NOT EXISTS (
      SELECT 1 FROM public.couple_blocks b
      WHERE (b.blocker_couple_id = user_couple_id AND b.blocked_couple_id = c.id)
         OR (b.blocker_couple_id = c.id AND b.blocked_couple_id = user_couple_id)
    )
    AND (
      CASE
        WHEN search_city IS NULL AND search_zip IS NULL
          THEN extensions.ST_DWithin(c.location, v_ref, v_radius_m)
        ELSE (search_city IS NULL OR extensions.similarity(lower(c.city), lower(search_city)) > 0.3)
         AND (search_zip IS NULL OR c.zip_code = search_zip)
      END
    )
  ORDER BY
    CASE WHEN search_city IS NOT NULL THEN extensions.similarity(lower(c.city), lower(search_city)) ELSE 0 END DESC,
    extensions.ST_Distance(c.location, v_ref)
  LIMIT 100;
END;
$$;
