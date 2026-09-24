-- Helper to find the couple(s) the current user belongs to
CREATE OR REPLACE FUNCTION user_couple_ids()
RETURNS SETOF uuid AS $$
  SELECT id FROM couples
  WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- couples
-- ============================================================
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

CREATE POLICY couples_select ON couples
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY couples_insert ON couples
  FOR INSERT WITH CHECK (auth.uid() = partner_1_id);

CREATE POLICY couples_update ON couples
  FOR UPDATE USING (auth.uid() = partner_1_id OR auth.uid() = partner_2_id);

-- ============================================================
-- pending_partners
-- ============================================================
ALTER TABLE pending_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY pending_partners_insert ON pending_partners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE id = couple_id AND partner_1_id = auth.uid()
    )
  );

CREATE POLICY pending_partners_select ON pending_partners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE id = couple_id AND invite_code IS NOT NULL AND partner_2_id IS NULL
    )
  );

-- ============================================================
-- availability
-- ============================================================
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY availability_select ON availability
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY availability_insert ON availability
  FOR INSERT WITH CHECK (couple_id IN (SELECT user_couple_ids()));

CREATE POLICY availability_update ON availability
  FOR UPDATE USING (couple_id IN (SELECT user_couple_ids()));

CREATE POLICY availability_delete ON availability
  FOR DELETE USING (couple_id IN (SELECT user_couple_ids()));

-- ============================================================
-- join_requests
-- ============================================================
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY join_requests_select ON join_requests
  FOR SELECT USING (
    requester_couple_id IN (SELECT user_couple_ids())
    OR host_couple_id IN (SELECT user_couple_ids())
  );

CREATE POLICY join_requests_insert ON join_requests
  FOR INSERT WITH CHECK (
    requester_couple_id IN (SELECT user_couple_ids())
  );

CREATE POLICY join_requests_update ON join_requests
  FOR UPDATE USING (
    host_couple_id IN (SELECT user_couple_ids())
  );

-- ============================================================
-- conversations
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select ON conversations
  FOR SELECT USING (
    couple_1_id IN (SELECT user_couple_ids())
    OR couple_2_id IN (SELECT user_couple_ids())
  );

-- ============================================================
-- messages
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

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
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (couple_1_id IN (SELECT user_couple_ids())
           OR couple_2_id IN (SELECT user_couple_ids()))
    )
  );

-- ============================================================
-- meals
-- ============================================================
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY meals_select ON meals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (couple_1_id IN (SELECT user_couple_ids())
           OR couple_2_id IN (SELECT user_couple_ids()))
    )
  );

CREATE POLICY meals_insert ON meals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (couple_1_id IN (SELECT user_couple_ids())
           OR couple_2_id IN (SELECT user_couple_ids()))
    )
  );

CREATE POLICY meals_update ON meals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (couple_1_id IN (SELECT user_couple_ids())
           OR couple_2_id IN (SELECT user_couple_ids()))
    )
  );
