CREATE TABLE join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  host_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  meal_type meal_slot NOT NULL,
  message text,
  status request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT no_self_request CHECK (requester_couple_id != host_couple_id)
);
