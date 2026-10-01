-- Contact form rate limit. The contact-us edge function inserts a row (service role)
-- before emailing; the trigger rejects floods so they can't drain the Resend quota
-- that magic-link sign-in also depends on. Clients have no access to this table.

CREATE TABLE contact_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip text,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_messages_created_at_idx ON contact_messages (created_at);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON contact_messages FROM anon, authenticated;

CREATE FUNCTION limit_contact_rate()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF (NEW.ip IS NOT NULL AND (
        SELECT count(*) FROM public.contact_messages
        WHERE ip = NEW.ip AND created_at > now() - interval '1 hour') >= 3)
  OR (SELECT count(*) FROM public.contact_messages
      WHERE created_at > now() - interval '1 day') >= 20 THEN
    RAISE EXCEPTION 'Too many messages. Please try again later.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_limit_contact_rate
  BEFORE INSERT ON contact_messages
  FOR EACH ROW EXECUTE FUNCTION limit_contact_rate();

REVOKE EXECUTE ON FUNCTION limit_contact_rate() FROM PUBLIC, anon, authenticated;
