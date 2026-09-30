-- Baseline: anon gets no direct table access; everything public goes through RPCs
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- ─── profiles ────────────────────────────────────────────────────────────

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

-- ─── couples ─────────────────────────────────────────────────────────────

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

-- ─── pending_partners ────────────────────────────────────────────────────

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

-- ─── availability ────────────────────────────────────────────────────────

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

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

-- ─── join_requests ───────────────────────────────────────────────────────

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

-- ─── conversations ───────────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select ON conversations
  FOR SELECT USING (
    couple_1_id IN (SELECT user_couple_ids())
    OR couple_2_id IN (SELECT user_couple_ids())
  );

-- ─── messages ────────────────────────────────────────────────────────────

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

-- ─── couple_blocks ───────────────────────────────────────────────────────

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

-- ─── Function privileges ─────────────────────────────────────────────────

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

-- ─── Storage policies ────────────────────────────────────────────────────

CREATE POLICY avatars_select ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
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

-- ─── Realtime ────────────────────────────────────────────────────────────

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

-- ─── Guard: no public table may lack RLS ─────────────────────────────────

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
