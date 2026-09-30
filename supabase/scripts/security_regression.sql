-- Security regression checks against a freshly reset local database (migrations + seed.sql).
-- Replays each known attack as the anon/authenticated roles and asserts it is blocked,
-- plus the legitimate flows that must keep working. Everything is rolled back.
--
--   supabase db reset
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/scripts/security_regression.sql
--
-- Seed actors: Pat (…01) & Sam (…02) = Delgados (c…01); Huy (…03) = Nguyens (c…10);
-- Marcus (…07) = Johnsons (c…12); Sara (…09) = Sara & Tomoko (c…13).

\set QUIET on
\o /dev/null
BEGIN;

CREATE FUNCTION pg_temp.act_as(p_user uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_user::text, ''), true);
  IF p_user IS NULL THEN SET LOCAL ROLE anon; ELSE SET LOCAL ROLE authenticated; END IF;
END;
$$;

CREATE FUNCTION pg_temp.expect_error(p_label text, p_sql text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'ok   % (%)', p_label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL % — statement succeeded: %', p_label, p_sql;
END;
$$;

CREATE FUNCTION pg_temp.expect_rows(p_label text, p_sql text, p_expected int) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n != p_expected THEN
    RAISE EXCEPTION 'FAIL % — expected % rows, got %', p_label, p_expected, n;
  END IF;
  RAISE NOTICE 'ok   %', p_label;
END;
$$;

CREATE FUNCTION pg_temp.expect_true(p_label text, p_cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL %', p_label; END IF;
  RAISE NOTICE 'ok   %', p_label;
END;
$$;

-- A brand-new user with a profile but no couple
INSERT INTO auth.users (id, email) VALUES ('99999999-0000-0000-0000-000000000001', 'eve@example.com');
INSERT INTO profiles (id, full_name, age) VALUES ('99999999-0000-0000-0000-000000000001', 'Eve Attacker', 30);

-- ── rls_disabled_in_public / extensions ──────────────────────────────────────
SELECT pg_temp.expect_true('every public table has RLS enabled',
  NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','p') AND NOT relrowsecurity));
SELECT pg_temp.expect_true('postgis and pg_trgm live outside public',
  NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname IN ('postgis','pg_trgm') AND extnamespace = 'public'::regnamespace));
SELECT pg_temp.expect_true('every SECURITY DEFINER function pins an empty search_path',
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef
              AND NOT EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c = 'search_path=""')));
SELECT pg_temp.expect_true('clients cannot TRUNCATE (bypasses RLS)',
  NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
              AND (has_table_privilege('authenticated', oid, 'TRUNCATE') OR has_table_privilege('anon', oid, 'TRUNCATE'))));

-- ── Anonymous access ─────────────────────────────────────────────────────────
SELECT pg_temp.act_as(NULL);
SELECT pg_temp.expect_error('anon cannot read couples table', 'SELECT * FROM couples');
SELECT pg_temp.expect_error('anon cannot call discover_couples', $$SELECT * FROM discover_couples('c0000000-0000-0000-0000-000000000001')$$);
SELECT pg_temp.expect_error('anon cannot call claim_partner_invite', $$SELECT claim_partner_invite('c0000000-0000-0000-0000-000000000001', 'invite-delgados')$$);
SELECT pg_temp.expect_rows('anon browse with no filter returns nothing', 'SELECT * FROM browse_couples_public()', 0);
SELECT pg_temp.expect_rows('anon browse by city still works', $$SELECT * FROM browse_couples_public('San Diego')$$, 5);
SELECT pg_temp.expect_error('anon browse exposes no couple ids', $$SELECT couple_id FROM browse_couples_public('San Diego')$$);
RESET ROLE;

-- ── Couples: membership and column lockdown ──────────────────────────────────
SELECT pg_temp.act_as('99999999-0000-0000-0000-000000000001');
SELECT pg_temp.expect_error('cannot list someone else as partner_2 on insert',
  $$INSERT INTO couples (partner_1_id, partner_2_id, zip_code, location) VALUES (auth.uid(), '00000000-0000-0000-0000-000000000003', '92129', 'POINT(-117.1 32.9)')$$);
SELECT pg_temp.expect_error('cannot choose own invite_code',
  $$INSERT INTO couples (partner_1_id, zip_code, location, invite_code) VALUES (auth.uid(), '92129', 'POINT(-117.1 32.9)', 'known')$$);
SELECT pg_temp.expect_error('cannot insert Null Island location',
  $$INSERT INTO couples (partner_1_id, zip_code, location) VALUES (auth.uid(), '92129', 'POINT(0 0)')$$);
SELECT pg_temp.expect_error('cannot choose own couple id',
  $$INSERT INTO couples (id, partner_1_id, zip_code, location) VALUES ('eeeeeeee-0000-0000-0000-00000000000a', auth.uid(), '92129', 'POINT(-117.1 32.9)')$$);
SELECT pg_temp.expect_rows('can create one couple',
  $$INSERT INTO couples (partner_1_id, zip_code, location) VALUES (auth.uid(), '92129', 'POINT(-117.1 32.9)')$$, 1);
RESET ROLE;
UPDATE couples SET id = 'eeeeeeee-0000-0000-0000-00000000000a' WHERE partner_1_id = '99999999-0000-0000-0000-000000000001';
SELECT pg_temp.act_as('99999999-0000-0000-0000-000000000001');
SELECT pg_temp.expect_error('cannot create a second couple',
  $$INSERT INTO couples (partner_1_id, zip_code, location) VALUES (auth.uid(), '92129', 'POINT(-117.1 32.9)')$$);
SELECT pg_temp.expect_error('cannot add partner_2 via update',
  $$UPDATE couples SET partner_2_id = '00000000-0000-0000-0000-000000000003' WHERE id = 'eeeeeeee-0000-0000-0000-00000000000a'$$);
SELECT pg_temp.expect_error('cannot move location after creation',
  $$UPDATE couples SET location = 'POINT(-117.2 32.8)' WHERE id = 'eeeeeeee-0000-0000-0000-00000000000a'$$);
SELECT pg_temp.expect_error('cannot rewrite invite_code',
  $$UPDATE couples SET invite_code = 'known' WHERE id = 'eeeeeeee-0000-0000-0000-00000000000a'$$);
SELECT pg_temp.expect_rows('can edit descriptive fields',
  $$UPDATE couples SET couple_name = 'The Eves', bio = 'hi' WHERE id = 'eeeeeeee-0000-0000-0000-00000000000a'$$, 1);
SELECT pg_temp.expect_error('bio length enforced in DB',
  $$UPDATE couples SET bio = repeat('x', 501) WHERE id = 'eeeeeeee-0000-0000-0000-00000000000a'$$);
SELECT pg_temp.expect_rows('cannot read another couple row (invite_code stays private)',
  $$SELECT * FROM couples WHERE id = 'c0000000-0000-0000-0000-000000000001'$$, 0);
RESET ROLE;

-- ── Join requests ────────────────────────────────────────────────────────────
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000007'); -- Marcus / Johnsons
SELECT pg_temp.expect_error('requester cannot insert a pre-accepted request',
  $$INSERT INTO join_requests (requester_couple_id, host_couple_id, meal_type, status) VALUES ('c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000013', 'dinner', 'accepted')$$);
SELECT pg_temp.expect_error('cannot request on behalf of another couple',
  $$INSERT INTO join_requests (requester_couple_id, host_couple_id, meal_type) VALUES ('c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000013', 'dinner')$$);
SELECT pg_temp.expect_error('message length enforced in DB',
  $$INSERT INTO join_requests (requester_couple_id, host_couple_id, meal_type, message) VALUES ('c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000013', 'dinner', repeat('x', 501))$$);
SELECT pg_temp.expect_rows('can send a normal request',
  $$INSERT INTO join_requests (requester_couple_id, host_couple_id, meal_type) VALUES ('c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000013', 'dinner')$$, 1);
RESET ROLE;
UPDATE join_requests SET id = 'dddddddd-0000-0000-0000-000000000001'
WHERE requester_couple_id = 'c0000000-0000-0000-0000-000000000012' AND host_couple_id = 'c0000000-0000-0000-0000-000000000013' AND status = 'pending';
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000007');
SELECT pg_temp.expect_error('cannot open a duplicate pending request',
  $$INSERT INTO join_requests (requester_couple_id, host_couple_id, meal_type) VALUES ('c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000013', 'lunch')$$);
SELECT pg_temp.expect_rows('requester cannot accept their own request',
  $$UPDATE join_requests SET status = 'accepted' WHERE id = 'dddddddd-0000-0000-0000-000000000001'$$, 0);
RESET ROLE;

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000009'); -- Sara / host
SELECT pg_temp.expect_error('host cannot re-point requester_couple_id (forced-chat attack)',
  $$UPDATE join_requests SET requester_couple_id = 'c0000000-0000-0000-0000-000000000010' WHERE id = 'dddddddd-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error('host cannot forge responded_at',
  $$UPDATE join_requests SET responded_at = now() WHERE id = 'dddddddd-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_rows('host can accept', $$UPDATE join_requests SET status = 'accepted' WHERE id = 'dddddddd-0000-0000-0000-000000000001'$$, 1);
SELECT pg_temp.expect_rows('accept created the conversation',
  $$SELECT 1 FROM conversations WHERE couple_1_id = 'c0000000-0000-0000-0000-000000000012' AND couple_2_id = 'c0000000-0000-0000-0000-000000000013'$$, 1);
SELECT pg_temp.expect_true('responded_at set server-side',
  (SELECT responded_at IS NOT NULL FROM join_requests WHERE id = 'dddddddd-0000-0000-0000-000000000001'));
SELECT pg_temp.expect_rows('accepted request cannot be flipped back',
  $$UPDATE join_requests SET status = 'pending' WHERE id = 'dddddddd-0000-0000-0000-000000000001'$$, 0);
RESET ROLE;

-- ── Messages ─────────────────────────────────────────────────────────────────
CREATE TEMP TABLE conv AS SELECT id FROM conversations
WHERE couple_1_id = 'c0000000-0000-0000-0000-000000000012' AND couple_2_id = 'c0000000-0000-0000-0000-000000000013';
GRANT SELECT ON conv TO authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000001'); -- Pat, outsider to Johnsons<->Sara
SELECT pg_temp.expect_error('outsider cannot post into a conversation',
  $$INSERT INTO messages (conversation_id, sender_profile_id, body) VALUES ((SELECT id FROM conv), auth.uid(), 'x')$$);
SELECT pg_temp.expect_error('cannot send a blank message',
  $$INSERT INTO messages (conversation_id, sender_profile_id, body) VALUES ('e0000000-0000-0000-0000-000000000001', auth.uid(), '   ')$$);
SELECT pg_temp.expect_error('cannot spoof sender',
  $$INSERT INTO messages (conversation_id, sender_profile_id, body) VALUES ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'x')$$);
RESET ROLE;

SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000007'); -- Marcus
DO $$
BEGIN
  FOR i IN 1..20 LOOP
    INSERT INTO messages (conversation_id, sender_profile_id, body)
    VALUES ((SELECT id FROM conv), auth.uid(), 'msg ' || i);
  END LOOP;
END;
$$;
SELECT pg_temp.expect_error('message rate limit (21st in a minute)',
  $$INSERT INTO messages (conversation_id, sender_profile_id, body) VALUES ((SELECT id FROM conv), auth.uid(), 'spam')$$);
RESET ROLE;

-- ── Blocking ─────────────────────────────────────────────────────────────────
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003'); -- Huy / Nguyens
SELECT pg_temp.expect_rows('Nguyens request Sara & Tomoko',
  $$INSERT INTO join_requests (requester_couple_id, host_couple_id, meal_type) VALUES ('c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000013', 'brunch')$$, 1);
RESET ROLE;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000009'); -- Sara blocks Nguyens and Johnsons
SELECT pg_temp.expect_rows('can block a couple',
  $$INSERT INTO couple_blocks (blocker_couple_id, blocked_couple_id) VALUES ('c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000010'), ('c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000012')$$, 2);
SELECT pg_temp.expect_error('cannot block on behalf of another couple',
  $$INSERT INTO couple_blocks (blocker_couple_id, blocked_couple_id) VALUES ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010')$$);
RESET ROLE;
SELECT pg_temp.expect_true('blocking declined the pending request',
  (SELECT status = 'declined' FROM join_requests WHERE requester_couple_id = 'c0000000-0000-0000-0000-000000000010' AND host_couple_id = 'c0000000-0000-0000-0000-000000000013'));
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');
SELECT pg_temp.expect_error('blocked couple cannot send a new request',
  $$INSERT INTO join_requests (requester_couple_id, host_couple_id, meal_type) VALUES ('c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000013', 'lunch')$$);
SELECT pg_temp.expect_rows('blocked couple hidden from discovery',
  $$SELECT 1 FROM discover_couples('c0000000-0000-0000-0000-000000000010', 100) WHERE couple_id = 'c0000000-0000-0000-0000-000000000013'$$, 0);
SELECT pg_temp.expect_rows('blocked couple profile hidden',
  $$SELECT 1 FROM get_couple_profile('c0000000-0000-0000-0000-000000000013')$$, 0);
RESET ROLE;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000008'); -- Janelle / Johnsons (partner 2)
SELECT pg_temp.expect_error('blocked couple cannot message',
  $$INSERT INTO messages (conversation_id, sender_profile_id, body) VALUES ((SELECT id FROM conv), auth.uid(), 'hello?')$$);
RESET ROLE;

-- ── Discovery, profiles, availability ────────────────────────────────────────
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000001'); -- Pat
SELECT pg_temp.expect_error('cannot run discovery for another couple',
  $$SELECT * FROM discover_couples('c0000000-0000-0000-0000-000000000010')$$);
SELECT pg_temp.expect_true('discovery works for own couple',
  (SELECT count(*) > 0 FROM discover_couples('c0000000-0000-0000-0000-000000000001')));
SELECT pg_temp.expect_true('discovery radius is clamped to 100 miles',
  (SELECT COALESCE(max(distance_miles), 0) <= 100 FROM discover_couples('c0000000-0000-0000-0000-000000000001', 100000)));
SELECT pg_temp.expect_true('couple profile shows first names only',
  (SELECT partner_1_first_name = 'Sara' AND partner_2_first_name = 'Tomoko' FROM get_couple_profile('c0000000-0000-0000-0000-000000000013')));
SELECT pg_temp.expect_rows('cannot read other couples availability table directly',
  $$SELECT 1 FROM availability WHERE couple_id = 'c0000000-0000-0000-0000-000000000013'$$, 0);
SELECT pg_temp.expect_rows('partner profile readable',
  $$SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000002'$$, 1);
SELECT pg_temp.expect_rows('non-partner profile not readable',
  $$SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000003'$$, 0);
SELECT pg_temp.expect_error('avatar_url cannot be an external URL',
  $$UPDATE profiles SET avatar_url = 'https://evil.example/pixel.png' WHERE id = auth.uid()$$);
SELECT pg_temp.expect_error('avatar_url cannot point into another user folder',
  $$UPDATE profiles SET avatar_url = '00000000-0000-0000-0000-000000000003/avatar.png' WHERE id = auth.uid()$$);
SELECT pg_temp.expect_rows('avatar_url accepts own storage path',
  $$UPDATE profiles SET avatar_url = '00000000-0000-0000-0000-000000000001/avatar.png' WHERE id = auth.uid()$$, 1);
SELECT pg_temp.expect_error('age is immutable',
  $$UPDATE profiles SET age = 19 WHERE id = auth.uid()$$);
RESET ROLE;

-- ── Storage ──────────────────────────────────────────────────────────────────
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000001');
SELECT pg_temp.expect_error('cannot upload arbitrary files to avatars',
  $$INSERT INTO storage.objects (bucket_id, name) VALUES ('avatars', '00000000-0000-0000-0000-000000000001/phish.html')$$);
SELECT pg_temp.expect_error('cannot upload into another user folder',
  $$INSERT INTO storage.objects (bucket_id, name) VALUES ('avatars', '00000000-0000-0000-0000-000000000003/avatar.png')$$);
SELECT pg_temp.expect_rows('can upload own avatar',
  $$INSERT INTO storage.objects (bucket_id, name) VALUES ('avatars', '00000000-0000-0000-0000-000000000001/avatar.png')$$, 1);
SELECT pg_temp.expect_rows('cannot list another user avatar folder',
  $$SELECT 1 FROM storage.objects WHERE bucket_id = 'avatars' AND name NOT LIKE '00000000-0000-0000-0000-000000000001/%'$$, 0);
RESET ROLE;
INSERT INTO storage.objects (bucket_id, name) VALUES ('avatars', '00000000-0000-0000-0000-000000000003/avatar.png');
SELECT pg_temp.act_as(NULL);
SELECT pg_temp.expect_rows('anon cannot list the avatars bucket',
  $$SELECT 1 FROM storage.objects WHERE bucket_id = 'avatars'$$, 0);
RESET ROLE;
SELECT pg_temp.expect_true('avatars bucket restricts type and size',
  (SELECT allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'] AND file_size_limit = 5242880 FROM storage.buckets WHERE id = 'avatars'));

-- ── Partner invite ───────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES ('99999999-0000-0000-0000-000000000002', 'partner@example.com');
SELECT pg_temp.act_as('99999999-0000-0000-0000-000000000001'); -- Eve adds a pending partner
SELECT pg_temp.expect_rows('partner 1 can add pending partner',
  $$INSERT INTO pending_partners (couple_id, full_name, age) VALUES ('eeeeeeee-0000-0000-0000-00000000000a', 'Adam', 31)$$, 1);
SELECT pg_temp.expect_error('only one open pending partner per couple',
  $$INSERT INTO pending_partners (couple_id, full_name, age) VALUES ('eeeeeeee-0000-0000-0000-00000000000a', 'Mallory', 31)$$);
SELECT pg_temp.expect_error('availability cannot be set years ahead',
  $$INSERT INTO availability (couple_id, specific_date, time_slot, recurring) VALUES ('eeeeeeee-0000-0000-0000-00000000000a', CURRENT_DATE + 5000, 'dinner', false)$$);
SELECT pg_temp.expect_error('availability id is not client-chosen',
  $$INSERT INTO availability (id, couple_id, specific_date, time_slot, recurring) VALUES ('eeeeeeee-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-00000000000a', CURRENT_DATE + 1, 'dinner', false)$$);
SELECT pg_temp.expect_rows('availability for next week works',
  $$INSERT INTO availability (couple_id, specific_date, time_slot, recurring) VALUES ('eeeeeeee-0000-0000-0000-00000000000a', CURRENT_DATE + 7, 'dinner', false)$$, 1);
RESET ROLE;
CREATE TEMP TABLE invite AS SELECT invite_code FROM couples WHERE id = 'eeeeeeee-0000-0000-0000-00000000000a';
GRANT SELECT ON invite TO authenticated;
SELECT pg_temp.act_as('99999999-0000-0000-0000-000000000002');
SELECT pg_temp.expect_error('wrong invite code rejected',
  $$SELECT claim_partner_invite('eeeeeeee-0000-0000-0000-00000000000a', 'nope')$$);
SELECT pg_temp.expect_rows('invite can be claimed',
  $$SELECT claim_partner_invite('eeeeeeee-0000-0000-0000-00000000000a', (SELECT invite_code FROM invite))$$, 1);
RESET ROLE;
SELECT pg_temp.expect_true('invite code rotated after claim',
  (SELECT c.invite_code != i.invite_code FROM couples c, invite i WHERE c.id = 'eeeeeeee-0000-0000-0000-00000000000a'));

-- ── Function privileges ──────────────────────────────────────────────────────
SELECT pg_temp.expect_true('anon can execute only browse_couples_public',
  (SELECT array_agg(proname::text ORDER BY proname) = ARRAY['browse_couples_public']
   FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND has_function_privilege('anon', oid, 'EXECUTE')));

\echo 'All security regression checks passed'
ROLLBACK;
