-- ─── Helpers ─────────────────────────────────────────────────────────────

CREATE FUNCTION user_couple_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT id FROM public.couples
  WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid();
$$;

CREATE FUNCTION is_blocked_with(p_other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_blocks b
    WHERE (b.blocker_couple_id = p_other AND b.blocked_couple_id IN (SELECT public.user_couple_ids()))
       OR (b.blocked_couple_id = p_other AND b.blocker_couple_id IN (SELECT public.user_couple_ids()))
  );
$$;

-- ─── Triggers ────────────────────────────────────────────────────────────

CREATE FUNCTION prevent_age_update()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.age != OLD.age THEN
    RAISE EXCEPTION 'Age cannot be changed after profile creation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_age_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_age_update();

CREATE FUNCTION enforce_single_couple_membership()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.couples c
    WHERE c.id != NEW.id
      AND (c.partner_1_id IN (NEW.partner_1_id, NEW.partner_2_id)
        OR c.partner_2_id IN (NEW.partner_1_id, NEW.partner_2_id))
  ) THEN
    RAISE EXCEPTION 'This person already belongs to a couple';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_single_couple_membership
  BEFORE INSERT OR UPDATE OF partner_1_id, partner_2_id ON couples
  FOR EACH ROW EXECUTE FUNCTION enforce_single_couple_membership();

CREATE FUNCTION on_join_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.requester_couple_id != OLD.requester_couple_id
     OR NEW.host_couple_id != OLD.host_couple_id THEN
    RAISE EXCEPTION 'Join request couples cannot be changed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status != 'pending' OR NEW.status = 'pending' THEN
      RAISE EXCEPTION 'Invalid join request status transition';
    END IF;

    NEW.responded_at := now();

    IF NEW.status = 'accepted' THEN
      INSERT INTO public.conversations (couple_1_id, couple_2_id)
      VALUES (
        LEAST(NEW.requester_couple_id, NEW.host_couple_id),
        GREATEST(NEW.requester_couple_id, NEW.host_couple_id)
      )
      ON CONFLICT (couple_1_id, couple_2_id) DO NOTHING;
    END IF;
  ELSE
    NEW.responded_at := OLD.responded_at;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_join_request_accepted
  BEFORE UPDATE ON join_requests
  FOR EACH ROW EXECUTE FUNCTION on_join_request_accepted();

CREATE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

CREATE FUNCTION on_couple_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.join_requests
  SET status = 'declined'
  WHERE status = 'pending'
    AND ((requester_couple_id = NEW.blocker_couple_id AND host_couple_id = NEW.blocked_couple_id)
      OR (requester_couple_id = NEW.blocked_couple_id AND host_couple_id = NEW.blocker_couple_id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_couple_blocked
  AFTER INSERT ON couple_blocks
  FOR EACH ROW EXECUTE FUNCTION on_couple_blocked();

-- ─── Rate limits ─────────────────────────────────────────────────────────

CREATE FUNCTION limit_join_request_rate()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    SELECT count(*) FROM public.join_requests
    WHERE requester_couple_id = NEW.requester_couple_id
      AND created_at > now() - interval '1 day'
  ) >= 20 THEN
    RAISE EXCEPTION 'Too many requests today. Please try again tomorrow.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_limit_join_request_rate
  BEFORE INSERT ON join_requests
  FOR EACH ROW EXECUTE FUNCTION limit_join_request_rate();

CREATE FUNCTION limit_message_rate()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF (SELECT count(*) FROM public.messages
      WHERE sender_profile_id = NEW.sender_profile_id AND created_at > now() - interval '1 minute') >= 20
  OR (SELECT count(*) FROM public.messages
      WHERE sender_profile_id = NEW.sender_profile_id AND created_at > now() - interval '1 day') >= 300 THEN
    RAISE EXCEPTION 'You are sending messages too quickly. Please slow down.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_limit_message_rate
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION limit_message_rate();

-- ─── RPCs ────────────────────────────────────────────────────────────────

CREATE FUNCTION claim_partner_invite(p_couple_id uuid, p_invite_code text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_pending public.pending_partners%ROWTYPE;
  v_couple public.couples%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_couple
  FROM public.couples
  WHERE id = p_couple_id AND invite_code = p_invite_code
  FOR UPDATE;

  IF NOT FOUND OR v_couple.partner_2_id IS NOT NULL THEN
    RAISE EXCEPTION 'This invite link is invalid or has already been used';
  END IF;

  SELECT * INTO v_pending
  FROM public.pending_partners
  WHERE couple_id = p_couple_id AND claimed_by IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invite link is invalid or has already been used';
  END IF;

  INSERT INTO public.profiles (id, full_name, age)
  VALUES (auth.uid(), v_pending.full_name, v_pending.age);

  UPDATE public.couples
  SET partner_2_id = auth.uid(),
      invite_code = encode(extensions.gen_random_bytes(16), 'hex'),
      updated_at = now()
  WHERE id = p_couple_id;

  UPDATE public.pending_partners
  SET claimed_by = auth.uid(), claimed_at = now()
  WHERE id = v_pending.id;
END;
$$;

CREATE FUNCTION discover_couples(
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
      WHERE jr.requester_couple_id = user_couple_id
        AND jr.host_couple_id = c.id
        AND jr.status = 'pending'
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

CREATE FUNCTION browse_couples_public(
  search_city text DEFAULT NULL,
  search_state text DEFAULT NULL,
  search_country text DEFAULT NULL,
  search_zip text DEFAULT NULL
)
RETURNS TABLE (
  bio text,
  city text,
  state text,
  country text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF COALESCE(char_length(trim(search_city)), 0) < 2
     AND COALESCE(char_length(trim(search_state)), 0) < 2
     AND COALESCE(char_length(trim(search_country)), 0) < 2
     AND COALESCE(char_length(trim(search_zip)), 0) < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.bio, c.city, c.state, c.country
  FROM public.couples c
  WHERE
    (search_city IS NULL OR extensions.similarity(lower(c.city), lower(search_city)) > 0.3)
    AND (search_state IS NULL OR extensions.similarity(lower(c.state), lower(search_state)) > 0.3)
    AND (search_country IS NULL OR extensions.similarity(lower(c.country), lower(search_country)) > 0.3)
    AND (search_zip IS NULL OR c.zip_code = search_zip)
  ORDER BY
    CASE WHEN search_city IS NOT NULL THEN extensions.similarity(lower(c.city), lower(search_city)) ELSE 1 END DESC,
    c.created_at DESC
  LIMIT 30;
END;
$$;

CREATE FUNCTION get_couple_profile(p_couple_id uuid)
RETURNS TABLE (
  couple_id uuid,
  couple_name text,
  bio text,
  city text,
  state text,
  hosting_preference hosting_preference,
  partner_1_first_name text,
  partner_1_age int,
  partner_1_avatar text,
  partner_2_first_name text,
  partner_2_age int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_couple_ids()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF public.is_blocked_with(p_couple_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.couple_name,
    c.bio,
    c.city,
    c.state,
    c.hosting_preference,
    split_part(p1.full_name, ' ', 1),
    p1.age,
    p1.avatar_url,
    split_part(p2.full_name, ' ', 1),
    p2.age
  FROM public.couples c
  JOIN public.profiles p1 ON p1.id = c.partner_1_id
  LEFT JOIN public.profiles p2 ON p2.id = c.partner_2_id
  WHERE c.id = p_couple_id;
END;
$$;

CREATE FUNCTION get_couple_availability(p_couple_id uuid)
RETURNS TABLE (specific_date date, time_slot meal_slot)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_couple_ids()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF public.is_blocked_with(p_couple_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.specific_date, a.time_slot
  FROM public.availability a
  WHERE a.couple_id = p_couple_id
    AND a.specific_date >= CURRENT_DATE
    AND a.specific_date < CURRENT_DATE + 90
  ORDER BY a.specific_date, a.time_slot
  LIMIT 300;
END;
$$;

CREATE FUNCTION get_conversations_for_user()
RETURNS TABLE (
  conversation_id uuid,
  other_couple_id uuid,
  other_couple_name text,
  created_at timestamptz,
  last_message_at timestamptz
) AS $$
  SELECT
    c.id,
    CASE WHEN c.couple_1_id = my.id THEN c.couple_2_id ELSE c.couple_1_id END,
    oc.couple_name,
    c.created_at,
    c.last_message_at
  FROM conversations c
  JOIN couples my
    ON my.id IN (c.couple_1_id, c.couple_2_id)
   AND (my.partner_1_id = auth.uid() OR my.partner_2_id = auth.uid())
  JOIN couples oc
    ON oc.id = CASE WHEN c.couple_1_id = my.id THEN c.couple_2_id ELSE c.couple_1_id END
  ORDER BY c.last_message_at DESC NULLS LAST;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE FUNCTION get_join_requests_for_user()
RETURNS TABLE (
  request_id uuid,
  direction text,
  other_couple_id uuid,
  other_couple_name text,
  meal_type meal_slot,
  proposed_date date,
  message text,
  status request_status,
  created_at timestamptz
) AS $$
  SELECT
    j.id,
    CASE WHEN j.requester_couple_id = my.id THEN 'sent' ELSE 'received' END,
    CASE WHEN j.requester_couple_id = my.id THEN j.host_couple_id ELSE j.requester_couple_id END,
    oc.couple_name,
    j.meal_type,
    j.proposed_date,
    j.message,
    j.status,
    j.created_at
  FROM join_requests j
  JOIN couples my
    ON my.id IN (j.requester_couple_id, j.host_couple_id)
   AND (my.partner_1_id = auth.uid() OR my.partner_2_id = auth.uid())
  JOIN couples oc
    ON oc.id = CASE
      WHEN j.requester_couple_id = my.id THEN j.host_couple_id
      ELSE j.requester_couple_id
    END
  ORDER BY j.created_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
