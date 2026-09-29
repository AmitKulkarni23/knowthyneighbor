-- Prevent age from being modified after profile creation
CREATE FUNCTION prevent_age_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.age != OLD.age THEN
    RAISE EXCEPTION 'Age cannot be changed after profile creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_age_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_age_update();

-- Auto-create conversation when a join request is accepted, set responded_at on status change
CREATE FUNCTION on_join_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO conversations (couple_1_id, couple_2_id)
    VALUES (
      LEAST(NEW.requester_couple_id, NEW.host_couple_id),
      GREATEST(NEW.requester_couple_id, NEW.host_couple_id)
    )
    ON CONFLICT (couple_1_id, couple_2_id) DO NOTHING;

    NEW.responded_at := now();
  ELSIF OLD.status = 'pending' AND NEW.status = 'declined' THEN
    NEW.responded_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_join_request_accepted
  BEFORE UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION on_join_request_accepted();

-- Keep conversations.last_message_at in sync
CREATE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Claim partner invite: runs as table owner so joining partner can insert profile
-- and update couple in one atomic call, bypassing RLS
CREATE FUNCTION claim_partner_invite(p_couple_id uuid, p_invite_code text)
RETURNS void AS $$
DECLARE
  v_pending pending_partners%ROWTYPE;
  v_couple couples%ROWTYPE;
BEGIN
  SELECT * INTO v_couple
  FROM couples
  WHERE id = p_couple_id AND invite_code = p_invite_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid couple ID or invite code';
  END IF;

  IF v_couple.partner_2_id IS NOT NULL THEN
    RAISE EXCEPTION 'This couple already has two partners';
  END IF;

  SELECT * INTO v_pending
  FROM pending_partners
  WHERE couple_id = p_couple_id AND claimed_by IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending partner found for this couple';
  END IF;

  INSERT INTO profiles (id, full_name, age)
  VALUES (auth.uid(), v_pending.full_name, v_pending.age);

  UPDATE couples
  SET partner_2_id = auth.uid(), updated_at = now()
  WHERE id = p_couple_id;

  UPDATE pending_partners
  SET claimed_by = auth.uid(), claimed_at = now()
  WHERE id = v_pending.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Authenticated discovery: search by geo or city/zip with authorization check
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
  IF NOT EXISTS (
    SELECT 1 FROM couples
    WHERE id = user_couple_id
      AND (partner_1_id = auth.uid() OR partner_2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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

-- Public browse: unauthenticated fuzzy search by city/state/country/zip (no zip in results)
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
