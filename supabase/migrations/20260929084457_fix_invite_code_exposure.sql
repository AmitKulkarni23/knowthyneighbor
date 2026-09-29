-- Restrict couples_select to own couple only.
-- Discovery uses discover_couples() which is SECURITY DEFINER and bypasses RLS.
-- This prevents any authenticated user from reading other couples' invite_code.
DROP POLICY IF EXISTS couples_select ON couples;
CREATE POLICY couples_select ON couples
  FOR SELECT USING (
    partner_1_id = auth.uid() OR partner_2_id = auth.uid()
  );
