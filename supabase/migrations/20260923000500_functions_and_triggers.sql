-- Prevent age from being modified after profile creation
CREATE OR REPLACE FUNCTION prevent_age_update()
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

-- Auto-create conversation when a join request is accepted, set responded_at on any status change
CREATE OR REPLACE FUNCTION on_join_request_accepted()
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
CREATE OR REPLACE FUNCTION update_conversation_last_message()
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

-- Auto-update meals.updated_at
CREATE OR REPLACE FUNCTION update_meal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_meal_timestamp
  BEFORE UPDATE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_timestamp();

-- SECURITY DEFINER: runs as table owner so the joining partner can insert their
-- own profile and update the couple row in a single atomic call, bypassing RLS
-- restrictions that would otherwise block a user who isn't yet linked to the couple.
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

  INSERT INTO profiles (id, full_name, age, has_kids, num_kids)
  VALUES (auth.uid(), v_pending.full_name, v_pending.age, v_pending.has_kids, v_pending.num_kids);

  UPDATE couples
  SET partner_2_id = auth.uid(), updated_at = now()
  WHERE id = p_couple_id;

  UPDATE pending_partners
  SET claimed_by = auth.uid(), claimed_at = now()
  WHERE id = v_pending.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY DEFINER: needs to read all couples' locations and profiles regardless
-- of the caller's RLS context to compute distances for the discovery feed.
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
  partner_2_age int,
  total_kids int
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
    p2.age AS partner_2_age,
    COALESCE(p1.num_kids, 0) + COALESCE(p2.num_kids, 0) AS total_kids
  FROM couples c
  JOIN profiles p1 ON p1.id = c.partner_1_id
  LEFT JOIN profiles p2 ON p2.id = c.partner_2_id
  WHERE c.id != user_couple_id
  ORDER BY ST_Distance(c.location, user_location);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
