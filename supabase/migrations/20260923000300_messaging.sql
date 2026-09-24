CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_1_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  couple_2_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT unique_couple_pair UNIQUE (couple_1_id, couple_2_id),
  CONSTRAINT no_self_conversation CHECK (couple_1_id != couple_2_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_profile_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL CHECK (char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
