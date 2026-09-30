-- Join requests (sent + received) with the other couple's name.
-- couples_select RLS only allows reading your own couple, so the client cannot
-- resolve the other couple's name. This SECURITY DEFINER function returns both
-- directions with only the other couple's public name — never zip_code,
-- invite_code, or location.

CREATE FUNCTION get_join_requests_for_user()
RETURNS TABLE (
  request_id uuid,
  direction text,
  other_couple_id uuid,
  other_couple_name text,
  meal_type meal_slot,
  proposed_date date,
  message text,
  status request_status,
  created_at timestamptz
) AS $$
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
  FROM join_requests j
  JOIN couples my
    ON my.id IN (j.requester_couple_id, j.host_couple_id)
   AND (my.partner_1_id = auth.uid() OR my.partner_2_id = auth.uid())
  JOIN couples oc
    ON oc.id = CASE
      WHEN j.requester_couple_id = my.id THEN j.host_couple_id
      ELSE j.requester_couple_id
    END
  ORDER BY j.created_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_join_requests_for_user() TO authenticated;
