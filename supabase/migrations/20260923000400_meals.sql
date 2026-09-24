CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  host_couple_id uuid NOT NULL REFERENCES couples(id),
  guest_couple_id uuid NOT NULL REFERENCES couples(id),
  meal_type meal_slot NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status meal_status NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_hosting CHECK (host_couple_id != guest_couple_id)
);

CREATE INDEX idx_meals_conversation ON meals (conversation_id);
CREATE INDEX idx_meals_status ON meals (status);
