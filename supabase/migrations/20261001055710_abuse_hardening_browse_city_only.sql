-- ─── Join requests: 30-day cooldown after a decline ─────────────────────────
-- Without it, a declined couple can re-request (and re-email the host) immediately.

CREATE OR REPLACE FUNCTION public.limit_join_request_rate()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF (
    SELECT count(*) FROM public.join_requests
    WHERE requester_couple_id = NEW.requester_couple_id
      AND created_at > now() - interval '1 day'
  ) >= 20 THEN
    RAISE EXCEPTION 'Too many requests today. Please try again tomorrow.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.join_requests
    WHERE requester_couple_id = NEW.requester_couple_id
      AND host_couple_id = NEW.host_couple_id
      AND status = 'declined'
      AND responded_at > now() - interval '30 days'
  ) THEN
    RAISE EXCEPTION 'This couple declined your last request. You can ask again 30 days after that.';
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Public browse: city only, plus a total count ───────────────────────────
-- Exact zip search let anonymous scrapers map every bio to a zip code.

DROP FUNCTION public.browse_couples_public(text, text, text, text);

CREATE FUNCTION public.browse_couples_public(search_city text DEFAULT NULL)
RETURNS TABLE (
  bio text,
  city text,
  state text,
  country text,
  total_count int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF COALESCE(char_length(trim(search_city)), 0) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.bio, c.city, c.state, c.country, (count(*) OVER ())::int
  FROM public.couples c
  WHERE extensions.similarity(lower(c.city), lower(search_city)) > 0.3
  ORDER BY extensions.similarity(lower(c.city), lower(search_city)) DESC, c.created_at DESC
  LIMIT 30;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.browse_couples_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.browse_couples_public(text) TO anon, authenticated;
