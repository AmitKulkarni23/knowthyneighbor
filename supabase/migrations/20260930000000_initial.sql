-- ═══════════════════════════════════════════════════════════════════════════
-- Nextdoorish — consolidated initial migration
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensions (in `extensions` schema to keep internal tables out of the Data API) ──

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE hosting_preference AS ENUM ('host', 'visit', 'both');
CREATE TYPE meal_slot AS ENUM ('brunch', 'lunch', 'dinner');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined');

-- ═══════════════════════════════════════════════════════════════════════════
-- Tables
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age int NOT NULL CHECK (age >= 18),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 100),
  CONSTRAINT profiles_age_max CHECK (age <= 120),
  CONSTRAINT profiles_avatar_path CHECK (
    avatar_url IS NULL OR avatar_url ~ ('^' || id::text || '/avatar\.(jpg|jpeg|png|webp)$')
  )
);

CREATE TABLE couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_2_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  couple_name text,
  bio text,
  zip_code text NOT NULL,
  city text,
  state text,
  country text,
  location extensions.geography(point, 4326) NOT NULL,
  hosting_preference hosting_preference NOT NULL DEFAULT 'both',
  invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_invite_code UNIQUE (invite_code),
  CONSTRAINT couples_name_length CHECK (couple_name IS NULL OR char_length(couple_name) <= 100),
  CONSTRAINT couples_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500),
  CONSTRAINT couples_zip_length CHECK (char_length(zip_code) <= 20),
  CONSTRAINT couples_city_length CHECK (city IS NULL OR char_length(city) <= 100),
  CONSTRAINT couples_state_length CHECK (state IS NULL OR char_length(state) <= 100),
  CONSTRAINT couples_country_length CHECK (country IS NULL OR char_length(country) <= 100),
  CONSTRAINT couples_distinct_partners CHECK (partner_2_id IS NULL OR partner_2_id != partner_1_id),
  CONSTRAINT couples_location_not_null_island CHECK (
    NOT (extensions.ST_X(location::extensions.geometry) = 0
     AND extensions.ST_Y(location::extensions.geometry) = 0)
  )
);

CREATE UNIQUE INDEX uniq_couples_partner_1 ON couples (partner_1_id);
CREATE UNIQUE INDEX uniq_couples_partner_2 ON couples (partner_2_id) WHERE partner_2_id IS NOT NULL;

CREATE TABLE pending_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age int NOT NULL CHECK (age >= 18),
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_partners_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 100),
  CONSTRAINT pending_partners_age_max CHECK (age <= 120)
);

CREATE UNIQUE INDEX uniq_pending_partners_open
  ON pending_partners (couple_id) WHERE claimed_by IS NULL;

CREATE TABLE availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date date,
  time_slot meal_slot NOT NULL,
  recurring boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (day_of_week IS NOT NULL OR specific_date IS NOT NULL)
);

CREATE TABLE join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  host_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  meal_type meal_slot NOT NULL,
  proposed_date date,
  message text,
  status request_status NOT NULL DEFAULT 'pending',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT no_self_request CHECK (requester_couple_id != host_couple_id),
  CONSTRAINT join_requests_message_length CHECK (message IS NULL OR char_length(message) <= 500)
);

CREATE UNIQUE INDEX uniq_join_requests_pending_pair
  ON join_requests (requester_couple_id, host_couple_id)
  WHERE status = 'pending';

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_1_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  couple_2_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT unique_couple_pair UNIQUE (couple_1_id, couple_2_id),
  CONSTRAINT no_self_conversation CHECK (couple_1_id != couple_2_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_not_blank CHECK (char_length(btrim(body)) > 0)
);

CREATE TABLE couple_blocks (
  blocker_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  blocked_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_couple_id, blocked_couple_id),
  CONSTRAINT no_self_block CHECK (blocker_couple_id != blocked_couple_id)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_couples_location ON couples USING gist (location);
CREATE INDEX idx_couples_city ON couples (city);
CREATE INDEX idx_couples_state ON couples (state);
CREATE INDEX idx_couples_country ON couples (country);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
CREATE INDEX idx_join_requests_requester_created ON join_requests (requester_couple_id, created_at);
CREATE INDEX idx_messages_sender_created ON messages (sender_profile_id, created_at);

-- ─── Storage ────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- ═══════════════════════════════════════════════════════════════════════════
-- Functions, triggers, RPCs
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Helpers ────────────────────────────────────────────────────────────────

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

-- ─── Triggers ───────────────────────────────────────────────────────────────

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

-- ─── Rate limits ────────────────────────────────────────────────────────────

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

CREATE FUNCTION limit_availability_rows()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.specific_date IS NOT NULL
     AND (NEW.specific_date < CURRENT_DATE - 7 OR NEW.specific_date > CURRENT_DATE + 366) THEN
    RAISE EXCEPTION 'Availability dates must be within the next year';
  END IF;
  IF (
    SELECT count(*) FROM public.availability WHERE couple_id = NEW.couple_id
  ) >= 500 THEN
    RAISE EXCEPTION 'Too many availability slots. Remove some old ones first.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_limit_availability_rows
  BEFORE INSERT ON availability
  FOR EACH ROW EXECUTE FUNCTION limit_availability_rows();

-- ─── RPCs ───────────────────────────────────────────────────────────────────

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
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    c.id,
    CASE WHEN c.couple_1_id = my.id THEN c.couple_2_id ELSE c.couple_1_id END,
    oc.couple_name,
    c.created_at,
    c.last_message_at
  FROM public.conversations c
  JOIN public.couples my
    ON my.id IN (c.couple_1_id, c.couple_2_id)
   AND (my.partner_1_id = auth.uid() OR my.partner_2_id = auth.uid())
  JOIN public.couples oc
    ON oc.id = CASE WHEN c.couple_1_id = my.id THEN c.couple_2_id ELSE c.couple_1_id END
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;

CREATE FUNCTION get_join_requests_for_user()
RETURNS TABLE (
  request_id uuid,
  direction text,
  other_couple_id uuid,
  other_couple_name text,
  meal_type public.meal_slot,
  proposed_date date,
  message text,
  status public.request_status,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
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
  FROM public.join_requests j
  JOIN public.couples my
    ON my.id IN (j.requester_couple_id, j.host_couple_id)
   AND (my.partner_1_id = auth.uid() OR my.partner_2_id = auth.uid())
  JOIN public.couples oc
    ON oc.id = CASE
      WHEN j.requester_couple_id = my.id THEN j.host_couple_id
      ELSE j.requester_couple_id
    END
  ORDER BY j.created_at DESC;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Security: RLS, column grants, function privileges
-- ═══════════════════════════════════════════════════════════════════════════

-- Baseline: anon gets no direct table access; everything public goes through RPCs
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

-- ─── profiles ───────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE ON profiles FROM authenticated;
GRANT INSERT (id, full_name, age, avatar_url) ON profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url) ON profiles TO authenticated;

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_select_partner ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM couples c
      WHERE (c.partner_1_id = auth.uid() AND c.partner_2_id = profiles.id)
         OR (c.partner_2_id = auth.uid() AND c.partner_1_id = profiles.id)
    )
  );
CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─── couples ────────────────────────────────────────────────────────────────

ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE ON couples FROM authenticated;
GRANT INSERT (partner_1_id, couple_name, bio, zip_code, city, state, country, location, hosting_preference)
  ON couples TO authenticated;
GRANT UPDATE (couple_name, bio, hosting_preference) ON couples TO authenticated;

CREATE POLICY couples_select ON couples
  FOR SELECT USING (partner_1_id = auth.uid() OR partner_2_id = auth.uid());
CREATE POLICY couples_insert ON couples
  FOR INSERT WITH CHECK (auth.uid() = partner_1_id AND partner_2_id IS NULL);
CREATE POLICY couples_update ON couples
  FOR UPDATE
  USING (auth.uid() = partner_1_id OR auth.uid() = partner_2_id)
  WITH CHECK (auth.uid() = partner_1_id OR auth.uid() = partner_2_id);

-- ─── pending_partners ───────────────────────────────────────────────────────

ALTER TABLE pending_partners ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE ON pending_partners FROM authenticated;
GRANT INSERT (couple_id, full_name, age) ON pending_partners TO authenticated;

CREATE POLICY pending_partners_insert ON pending_partners
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM couples WHERE id = couple_id AND partner_1_id = auth.uid())
  );
CREATE POLICY pending_partners_select ON pending_partners
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM couples WHERE id = couple_id AND partner_1_id = auth.uid())
  );

-- ─── availability ───────────────────────────────────────────────────────────

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE ON availability FROM authenticated;
GRANT INSERT (couple_id, day_of_week, specific_date, time_slot, recurring) ON availability TO authenticated;
GRANT UPDATE (day_of_week, specific_date, time_slot, recurring) ON availability TO authenticated;

CREATE POLICY availability_select ON availability
  FOR SELECT USING (couple_id IN (SELECT user_couple_ids()));
CREATE POLICY availability_insert ON availability
  FOR INSERT WITH CHECK (couple_id IN (SELECT user_couple_ids()));
CREATE POLICY availability_update ON availability
  FOR UPDATE
  USING (couple_id IN (SELECT user_couple_ids()))
  WITH CHECK (couple_id IN (SELECT user_couple_ids()));
CREATE POLICY availability_delete ON availability
  FOR DELETE USING (couple_id IN (SELECT user_couple_ids()));

-- ─── join_requests ──────────────────────────────────────────────────────────

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE ON join_requests FROM authenticated;
GRANT INSERT (requester_couple_id, host_couple_id, meal_type, proposed_date, message)
  ON join_requests TO authenticated;
GRANT UPDATE (status) ON join_requests TO authenticated;

CREATE POLICY join_requests_select ON join_requests
  FOR SELECT USING (
    requester_couple_id IN (SELECT user_couple_ids())
    OR host_couple_id IN (SELECT user_couple_ids())
  );
CREATE POLICY join_requests_insert ON join_requests
  FOR INSERT WITH CHECK (
    requester_couple_id IN (SELECT user_couple_ids())
    AND status = 'pending'
    AND responded_at IS NULL
    AND notified_at IS NULL
    AND (proposed_date IS NULL OR proposed_date >= CURRENT_DATE)
    AND NOT is_blocked_with(host_couple_id)
  );
CREATE POLICY join_requests_update ON join_requests
  FOR UPDATE
  USING (host_couple_id IN (SELECT user_couple_ids()) AND status = 'pending')
  WITH CHECK (host_couple_id IN (SELECT user_couple_ids()) AND status IN ('accepted', 'declined'));

-- ─── conversations ──────────────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select ON conversations
  FOR SELECT USING (
    couple_1_id IN (SELECT user_couple_ids())
    OR couple_2_id IN (SELECT user_couple_ids())
  );

-- ─── messages ───────────────────────────────────────────────────────────────

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE ON messages FROM authenticated;
GRANT INSERT (conversation_id, sender_profile_id, body) ON messages TO authenticated;

CREATE POLICY messages_select ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (couple_1_id IN (SELECT user_couple_ids())
           OR couple_2_id IN (SELECT user_couple_ids()))
    )
  );
CREATE POLICY messages_insert ON messages
  FOR INSERT WITH CHECK (
    sender_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          (c.couple_1_id IN (SELECT user_couple_ids()) AND NOT is_blocked_with(c.couple_2_id))
          OR (c.couple_2_id IN (SELECT user_couple_ids()) AND NOT is_blocked_with(c.couple_1_id))
        )
    )
  );

-- ─── couple_blocks ──────────────────────────────────────────────────────────

ALTER TABLE couple_blocks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON couple_blocks FROM anon, authenticated;
GRANT SELECT, DELETE ON couple_blocks TO authenticated;
GRANT INSERT (blocker_couple_id, blocked_couple_id) ON couple_blocks TO authenticated;

CREATE POLICY couple_blocks_select ON couple_blocks
  FOR SELECT USING (blocker_couple_id IN (SELECT user_couple_ids()));
CREATE POLICY couple_blocks_insert ON couple_blocks
  FOR INSERT WITH CHECK (blocker_couple_id IN (SELECT user_couple_ids()));
CREATE POLICY couple_blocks_delete ON couple_blocks
  FOR DELETE USING (blocker_couple_id IN (SELECT user_couple_ids()));

-- ─── Function privileges ────────────────────────────────────────────────────

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION browse_couples_public(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION user_couple_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION is_blocked_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_partner_invite(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION discover_couples(uuid, float, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_couple_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_couple_availability(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_join_requests_for_user() TO authenticated;

-- ─── Storage policies ───────────────────────────────────────────────────────

CREATE POLICY avatars_select_own ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY avatars_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND name ~ ('^' || auth.uid()::text || '/avatar\.(jpg|jpeg|png|webp)$')
  );
CREATE POLICY avatars_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (
    bucket_id = 'avatars'
    AND name ~ ('^' || auth.uid()::text || '/avatar\.(jpg|jpeg|png|webp)$')
  );
CREATE POLICY avatars_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Realtime ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END;
$$;

-- ─── Guard: no public table may lack RLS ────────────────────────────────────

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
    RAISE WARNING 'Enabled RLS (deny-all until policies exist) on public.%', t.relname;
  END LOOP;
END;
$$;
