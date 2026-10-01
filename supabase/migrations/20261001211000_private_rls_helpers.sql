-- RLS helpers leave the API-exposed `public` schema, so PostgREST no longer serves them at
-- /rest/v1/rpc/* (Supabase linter 0029; is_blocked_with also told a caller who blocked them).
-- Policies reference functions by OID and keep working after SET SCHEMA; function bodies
-- resolve names at run time, so the ones calling the helpers are repointed below.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
-- Policies run the helpers as the querying user, who needs USAGE + EXECUTE
GRANT USAGE ON SCHEMA private TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

ALTER FUNCTION public.user_couple_ids() SET SCHEMA private;
ALTER FUNCTION public.is_blocked_with(uuid) SET SCHEMA private;

CREATE OR REPLACE FUNCTION private.is_blocked_with(p_other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_blocks b
    WHERE (b.blocker_couple_id = p_other AND b.blocked_couple_id IN (SELECT private.user_couple_ids()))
       OR (b.blocked_couple_id = p_other AND b.blocker_couple_id IN (SELECT private.user_couple_ids()))
  );
$$;

CREATE OR REPLACE FUNCTION public.get_couple_profile(p_couple_id uuid)
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
  IF NOT EXISTS (SELECT 1 FROM private.user_couple_ids()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF private.is_blocked_with(p_couple_id) THEN
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

CREATE OR REPLACE FUNCTION public.get_couple_availability(p_couple_id uuid)
RETURNS TABLE (specific_date date, time_slot public.meal_slot)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.user_couple_ids()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF private.is_blocked_with(p_couple_id) THEN
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
