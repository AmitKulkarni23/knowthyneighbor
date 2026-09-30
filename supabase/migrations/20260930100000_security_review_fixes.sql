-- Fixes from the September 2026 security review.

-- ─── SECURITY DEFINER functions must pin search_path to '' ───────────────
-- These two used `search_path = public`, so an object planted earlier on the
-- path could shadow `conversations`/`couples`/`join_requests` inside a
-- privileged function.

CREATE OR REPLACE FUNCTION get_conversations_for_user()
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

CREATE OR REPLACE FUNCTION get_join_requests_for_user()
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

-- ─── Table privileges ────────────────────────────────────────────────────
-- Supabase's default grants include TRUNCATE, which ignores RLS entirely.

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

-- ─── availability: column grants and a per-couple row cap ────────────────
-- Clients could previously pick id/created_at and insert unbounded rows.

REVOKE INSERT, UPDATE ON availability FROM authenticated;
GRANT INSERT (couple_id, day_of_week, specific_date, time_slot, recurring) ON availability TO authenticated;
GRANT UPDATE (day_of_week, specific_date, time_slot, recurring) ON availability TO authenticated;

CREATE FUNCTION limit_availability_rows()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Seeds and service-role jobs run without a user and are not limited
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

-- ─── pending_partners ────────────────────────────────────────────────────
-- One open invite per couple: claim_partner_invite picks an arbitrary unclaimed
-- row, and partner 1 could otherwise insert unlimited rows.
CREATE UNIQUE INDEX uniq_pending_partners_open
  ON pending_partners (couple_id) WHERE claimed_by IS NULL;

-- Without ON DELETE, deleting the partner's auth user fails on this FK
ALTER TABLE pending_partners DROP CONSTRAINT pending_partners_claimed_by_fkey;
ALTER TABLE pending_partners
  ADD CONSTRAINT pending_partners_claimed_by_fkey
  FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── messages: no blank bodies ───────────────────────────────────────────
ALTER TABLE messages ADD CONSTRAINT messages_body_not_blank CHECK (char_length(btrim(body)) > 0);

-- ─── Storage: stop public listing of the avatars bucket ──────────────────
-- Public URLs are served without RLS, so a SELECT policy is only needed for
-- the owner's upsert. The old `USING (bucket_id = 'avatars')` policy let
-- anyone call list() and enumerate every user id (folder names).
DROP POLICY avatars_select ON storage.objects;
CREATE POLICY avatars_select_own ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Function privileges for the new trigger function ────────────────────
REVOKE EXECUTE ON FUNCTION limit_availability_rows() FROM PUBLIC, anon, authenticated;
