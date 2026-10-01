-- Partner invites: expiry, revocation, and claiming with an existing profile.
-- The frontend no longer shows invite links (as of 2026-10-01); this keeps the backend
-- safe and ready if the feature comes back.

-- ─── Expiry ─────────────────────────────────────────────────────────────────
-- A leaked, unclaimed link used to work forever. Not client-writable (no column grant).

ALTER TABLE public.couples
  ADD COLUMN invite_expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days';

-- ─── Claim ──────────────────────────────────────────────────────────────────

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

  -- Same message for wrong, used and expired codes, so the RPC isn't an oracle
  IF NOT FOUND OR v_couple.partner_2_id IS NOT NULL OR v_couple.invite_expires_at <= now() THEN
    RAISE EXCEPTION 'This invite link is invalid or has already been used';
  END IF;

  SELECT * INTO v_pending
  FROM public.pending_partners
  WHERE couple_id = p_couple_id AND claimed_by IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invite link is invalid or has already been used';
  END IF;

  -- The partner may already have a profile (e.g. signed up before opening the link).
  -- Keep it; enforce_single_couple_membership still blocks anyone already in a couple.
  INSERT INTO public.profiles (id, full_name, age)
  VALUES (auth.uid(), v_pending.full_name, v_pending.age)
  ON CONFLICT (id) DO NOTHING;

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

-- ─── Revocation ─────────────────────────────────────────────────────────────

-- Partner 1 kills a leaked/old link and gets a fresh one valid for 7 more days.
CREATE FUNCTION public.regenerate_invite_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_code text := encode(extensions.gen_random_bytes(16), 'hex');
BEGIN
  UPDATE public.couples
  SET invite_code = v_code,
      invite_expires_at = now() + interval '7 days',
      updated_at = now()
  WHERE partner_1_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only the partner who created the couple profile can do this';
  END IF;
  RETURN v_code;
END;
$$;

-- Partner 1 removes whoever claimed the invite (e.g. a stranger with a leaked link).
-- They immediately lose access to the couple's requests, conversations and messages.
-- To re-invite: insert a new pending_partners row, then regenerate_invite_code().
CREATE FUNCTION public.remove_partner()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.couples
  SET partner_2_id = NULL,
      invite_code = encode(extensions.gen_random_bytes(16), 'hex'),
      updated_at = now()
  WHERE partner_1_id = auth.uid() AND partner_2_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'There is no partner to remove';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.regenerate_invite_code(), public.remove_partner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(), public.remove_partner() TO authenticated;
