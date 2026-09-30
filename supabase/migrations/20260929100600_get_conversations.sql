-- Chat list with the other couple's name.
-- couples_select RLS only allows reading your own couple, so the client-side
-- join to couples for couple_name returns null for the other couple. This
-- SECURITY DEFINER function returns only the other couple's public name —
-- never zip_code, invite_code, or location.

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

GRANT EXECUTE ON FUNCTION get_conversations_for_user() TO authenticated;
