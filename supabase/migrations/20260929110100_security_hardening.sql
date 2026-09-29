-- Security hardening: column-level privileges, tightened RLS, locked-down SECURITY DEFINER
-- functions, abuse limits, couple blocking, and storage restrictions.

-- ─────────────────────────────────────────────────────────────────────────────
-- Baseline: anon gets no direct table access; everything public goes through RPCs
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- Couple blocking (needed by helpers and policies below)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.couple_blocks (
  blocker_couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  blocked_couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_couple_id, blocked_couple_id),
  CONSTRAINT no_self_block CHECK (blocker_couple_id != blocked_couple_id)
);
REVOKE ALL ON public.couple_blocks FROM anon, authenticated;
GRANT SELECT, DELETE ON public.couple_blocks TO authenticated;
GRANT INSERT (blocker_couple_id, blocked_couple_id) ON public.couple_blocks TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_couple_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT id FROM public.couples
  WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid();
$$;

-- True when the caller's couple and p_other have blocked each other in either direction
CREATE FUNCTION public.is_blocked_with(p_other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_blocks b
    WHERE (b.blocker_couple_id = p_other AND b.blocked_couple_id IN (SELECT public.user_couple_ids()))
       OR (b.blocked_couple_id = p_other AND b.blocker_couple_id IN (SELECT public.user_couple_ids()))
  );
$$;

ALTER TABLE public.couple_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY couple_blocks_select ON public.couple_blocks
  FOR SELECT USING (blocker_couple_id IN (SELECT public.user_couple_ids()));
CREATE POLICY couple_blocks_insert ON public.couple_blocks
  FOR INSERT WITH CHECK (blocker_couple_id IN (SELECT public.user_couple_ids()));
CREATE POLICY couple_blocks_delete ON public.couple_blocks
  FOR DELETE USING (blocker_couple_id IN (SELECT public.user_couple_ids()));

-- Blocking declines any pending requests between the two couples
CREATE FUNCTION public.on_couple_blocked()
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
  AFTER INSERT ON public.couple_blocks
  FOR EACH ROW EXECUTE FUNCTION public.on_couple_blocked();

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
-- Special-category data (GDPR Art. 9) that the app never uses
ALTER TABLE public.profiles DROP COLUMN IF EXISTS ethnicity;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT profiles_age_max CHECK (age <= 120);

-- avatar_url becomes a storage path inside the caller's own folder, never an arbitrary URL
UPDATE public.profiles
SET avatar_url = substring(avatar_url FROM '/avatars/([^?#]+)')
WHERE avatar_url LIKE '%/avatars/%';
UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND avatar_url !~ ('^' || id::text || '/avatar\.(jpg|jpeg|png|webp)$');
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_path CHECK (
    avatar_url IS NULL OR avatar_url ~ ('^' || id::text || '/avatar\.(jpg|jpeg|png|webp)$')
  );

REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT INSERT (id, full_name, age, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

DROP POLICY profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Partners can read each other's profile
CREATE POLICY profiles_select_partner ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE (c.partner_1_id = auth.uid() AND c.partner_2_id = profiles.id)
         OR (c.partner_2_id = auth.uid() AND c.partner_1_id = profiles.id)
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_age_update()
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

-- ─────────────────────────────────────────────────────────────────────────────
-- couples
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.couples
  ADD CONSTRAINT couples_name_length CHECK (couple_name IS NULL OR char_length(couple_name) <= 100),
  ADD CONSTRAINT couples_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500),
  ADD CONSTRAINT couples_zip_length CHECK (char_length(zip_code) <= 20),
  ADD CONSTRAINT couples_city_length CHECK (city IS NULL OR char_length(city) <= 100),
  ADD CONSTRAINT couples_state_length CHECK (state IS NULL OR char_length(state) <= 100),
  ADD CONSTRAINT couples_country_length CHECK (country IS NULL OR char_length(country) <= 100),
  ADD CONSTRAINT couples_distinct_partners CHECK (partner_2_id IS NULL OR partner_2_id != partner_1_id);

-- Reject the old "geocoding failed" POINT(0 0) placeholder for new rows
ALTER TABLE public.couples
  ADD CONSTRAINT couples_location_not_null_island CHECK (
    NOT (extensions.ST_X(location::extensions.geometry) = 0 AND extensions.ST_Y(location::extensions.geometry) = 0)
  ) NOT VALID;

-- A person belongs to at most one couple, in either slot
CREATE UNIQUE INDEX uniq_couples_partner_1 ON public.couples (partner_1_id);
CREATE UNIQUE INDEX uniq_couples_partner_2 ON public.couples (partner_2_id) WHERE partner_2_id IS NOT NULL;

CREATE FUNCTION public.enforce_single_couple_membership()
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
  BEFORE INSERT OR UPDATE OF partner_1_id, partner_2_id ON public.couples
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_couple_membership();

-- Clients may only set descriptive fields; membership, invite code and location are fixed
REVOKE INSERT, UPDATE ON public.couples FROM authenticated;
GRANT INSERT (partner_1_id, couple_name, bio, zip_code, city, state, country, location, hosting_preference)
  ON public.couples TO authenticated;
GRANT UPDATE (couple_name, bio, hosting_preference) ON public.couples TO authenticated;

DROP POLICY couples_insert ON public.couples;
CREATE POLICY couples_insert ON public.couples
  FOR INSERT WITH CHECK (auth.uid() = partner_1_id AND partner_2_id IS NULL);

DROP POLICY couples_update ON public.couples;
CREATE POLICY couples_update ON public.couples
  FOR UPDATE
  USING (auth.uid() = partner_1_id OR auth.uid() = partner_2_id)
  WITH CHECK (auth.uid() = partner_1_id OR auth.uid() = partner_2_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- pending_partners
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.pending_partners
  ADD CONSTRAINT pending_partners_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT pending_partners_age_max CHECK (age <= 120);

REVOKE INSERT, UPDATE ON public.pending_partners FROM authenticated;
GRANT INSERT (couple_id, full_name, age) ON public.pending_partners TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_partner_invite(p_couple_id uuid, p_invite_code text)
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

  -- Same error for a bad code and a used code, so the RPC is not an oracle
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

  -- Rotate the code so the link is dead once used
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

-- ─────────────────────────────────────────────────────────────────────────────
-- availability: own couple only; other couples' future slots come from an RPC
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY availability_select ON public.availability;
CREATE POLICY availability_select ON public.availability
  FOR SELECT USING (couple_id IN (SELECT public.user_couple_ids()));

DROP POLICY availability_update ON public.availability;
CREATE POLICY availability_update ON public.availability
  FOR UPDATE
  USING (couple_id IN (SELECT public.user_couple_ids()))
  WITH CHECK (couple_id IN (SELECT public.user_couple_ids()));

CREATE FUNCTION public.get_couple_availability(p_couple_id uuid)
RETURNS TABLE (specific_date date, time_slot public.meal_slot)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- join_requests
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.join_requests
  ADD COLUMN notified_at timestamptz,
  ADD CONSTRAINT join_requests_message_length CHECK (message IS NULL OR char_length(message) <= 500);

-- One open request per couple pair
CREATE UNIQUE INDEX uniq_join_requests_pending_pair
  ON public.join_requests (requester_couple_id, host_couple_id)
  WHERE status = 'pending';

REVOKE INSERT, UPDATE ON public.join_requests FROM authenticated;
GRANT INSERT (requester_couple_id, host_couple_id, meal_type, proposed_date, message)
  ON public.join_requests TO authenticated;
GRANT UPDATE (status) ON public.join_requests TO authenticated;

DROP POLICY join_requests_insert ON public.join_requests;
CREATE POLICY join_requests_insert ON public.join_requests
  FOR INSERT WITH CHECK (
    requester_couple_id IN (SELECT public.user_couple_ids())
    AND status = 'pending'
    AND responded_at IS NULL
    AND notified_at IS NULL
    AND (proposed_date IS NULL OR proposed_date >= CURRENT_DATE)
    AND NOT public.is_blocked_with(host_couple_id)
  );

DROP POLICY join_requests_update ON public.join_requests;
CREATE POLICY join_requests_update ON public.join_requests
  FOR UPDATE
  USING (host_couple_id IN (SELECT public.user_couple_ids()) AND status = 'pending')
  WITH CHECK (host_couple_id IN (SELECT public.user_couple_ids()) AND status IN ('accepted', 'declined'));

-- Status machine + conversation creation. Runs as owner so it can insert the conversation,
-- and rejects any attempt to re-point a request at different couples.
CREATE OR REPLACE FUNCTION public.on_join_request_accepted()
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

-- At most 20 new requests per couple per day
CREATE FUNCTION public.limit_join_request_rate()
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
  BEFORE INSERT ON public.join_requests
  FOR EACH ROW EXECUTE FUNCTION public.limit_join_request_rate();

CREATE INDEX idx_join_requests_requester_created ON public.join_requests (requester_couple_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- conversations / messages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
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

-- Allow account deletion: keep the other couple's history, drop the sender link
ALTER TABLE public.messages ALTER COLUMN sender_profile_id DROP NOT NULL;
ALTER TABLE public.messages DROP CONSTRAINT messages_sender_profile_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_profile_id_fkey
  FOREIGN KEY (sender_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

REVOKE INSERT, UPDATE ON public.messages FROM authenticated;
GRANT INSERT (conversation_id, sender_profile_id, body) ON public.messages TO authenticated;

DROP POLICY messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
  FOR INSERT WITH CHECK (
    sender_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          (c.couple_1_id IN (SELECT public.user_couple_ids()) AND NOT public.is_blocked_with(c.couple_2_id))
          OR (c.couple_2_id IN (SELECT public.user_couple_ids()) AND NOT public.is_blocked_with(c.couple_1_id))
        )
    )
  );

-- At most 20 messages per minute and 300 per day per sender
CREATE FUNCTION public.limit_message_rate()
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
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.limit_message_rate();

CREATE INDEX idx_messages_sender_created ON public.messages (sender_profile_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Discovery / browse / couple profile RPCs
-- ─────────────────────────────────────────────────────────────────────────────
-- Recreated: no caller-supplied coordinates, clamped radius, capped results, no names
DROP FUNCTION IF EXISTS public.discover_couples(uuid, float, float, float, text, text);
CREATE FUNCTION public.discover_couples(
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
  hosting_preference public.hosting_preference,
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

-- Recreated: requires a search term, returns no ids or names, capped results
DROP FUNCTION IF EXISTS public.browse_couples_public(text, text, text, text);
CREATE FUNCTION public.browse_couples_public(
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

-- Another couple's public-facing profile, without ids, invite code, zip or location
CREATE FUNCTION public.get_couple_profile(p_couple_id uuid)
RETURNS TABLE (
  couple_id uuid,
  couple_name text,
  bio text,
  city text,
  state text,
  hosting_preference public.hosting_preference,
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Function privileges: nothing is callable by anon/PUBLIC unless granted here
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.browse_couples_public(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_couple_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_partner_invite(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_couples(uuid, float, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_couple_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_couple_availability(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: avatars must be a single image per user at <uid>/avatar.<ext>
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE storage.buckets
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';

DROP POLICY IF EXISTS avatars_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_update ON storage.objects;
DROP POLICY IF EXISTS avatars_delete ON storage.objects;

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

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime: chat subscribes to message inserts (RLS still applies to delivery)
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Guard: no table in the exposed schema may be left without RLS
-- ─────────────────────────────────────────────────────────────────────────────
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
