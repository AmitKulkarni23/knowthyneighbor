-- Remove kids-related columns from profiles and pending_partners

ALTER TABLE profiles DROP COLUMN has_kids;
ALTER TABLE profiles DROP COLUMN num_kids;

ALTER TABLE pending_partners DROP COLUMN has_kids;
ALTER TABLE pending_partners DROP COLUMN num_kids;

-- Recreate claim_partner_invite without kids fields
CREATE OR REPLACE FUNCTION claim_partner_invite(p_couple_id uuid, p_invite_code text)
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

-- Recreate discover_couples without total_kids
CREATE OR REPLACE FUNCTION discover_couples(user_couple_id uuid)
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
  user_location geography;
BEGIN
  SELECT c.location INTO user_location
  FROM couples c
  WHERE c.id = user_couple_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Couple not found';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS couple_id,
    c.couple_name,
    c.bio,
    c.zip_code,
    c.hosting_preference,
    ST_Distance(c.location, user_location) / 1609.344 AS distance_miles,
    p1.full_name AS partner_1_name,
    p2.full_name AS partner_2_name,
    p1.age AS partner_1_age,
    p2.age AS partner_2_age
  FROM couples c
  JOIN profiles p1 ON p1.id = c.partner_1_id
  LEFT JOIN profiles p2 ON p2.id = c.partner_2_id
  WHERE c.id != user_couple_id
  ORDER BY ST_Distance(c.location, user_location);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
