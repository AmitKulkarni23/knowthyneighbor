-- Extensions (in `extensions` schema to keep internal tables out of the Data API)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Enums
CREATE TYPE hosting_preference AS ENUM ('host', 'visit', 'both');
CREATE TYPE meal_slot AS ENUM ('brunch', 'lunch', 'dinner');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined');

-- ─── Tables ──────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age int NOT NULL CHECK (age >= 18),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 100),
  CONSTRAINT profiles_age_max CHECK (age <= 120),
  CONSTRAINT profiles_avatar_path CHECK (
    avatar_url IS NULL OR avatar_url ~ ('^' || id::text || '/avatar\.(jpg|jpeg|png|webp)$')
  )
);

CREATE TABLE couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_2_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  couple_name text,
  bio text,
  zip_code text NOT NULL,
  city text,
  state text,
  country text,
  location extensions.geography(point, 4326) NOT NULL,
  hosting_preference hosting_preference NOT NULL DEFAULT 'both',
  invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_invite_code UNIQUE (invite_code),
  CONSTRAINT couples_name_length CHECK (couple_name IS NULL OR char_length(couple_name) <= 100),
  CONSTRAINT couples_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500),
  CONSTRAINT couples_zip_length CHECK (char_length(zip_code) <= 20),
  CONSTRAINT couples_city_length CHECK (city IS NULL OR char_length(city) <= 100),
  CONSTRAINT couples_state_length CHECK (state IS NULL OR char_length(state) <= 100),
  CONSTRAINT couples_country_length CHECK (country IS NULL OR char_length(country) <= 100),
  CONSTRAINT couples_distinct_partners CHECK (partner_2_id IS NULL OR partner_2_id != partner_1_id),
  CONSTRAINT couples_location_not_null_island CHECK (
    NOT (extensions.ST_X(location::extensions.geometry) = 0
     AND extensions.ST_Y(location::extensions.geometry) = 0)
  )
);

CREATE UNIQUE INDEX uniq_couples_partner_1 ON couples (partner_1_id);
CREATE UNIQUE INDEX uniq_couples_partner_2 ON couples (partner_2_id) WHERE partner_2_id IS NOT NULL;

CREATE TABLE pending_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age int NOT NULL CHECK (age >= 18),
  claimed_by uuid REFERENCES auth.users(id),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_partners_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 100),
  CONSTRAINT pending_partners_age_max CHECK (age <= 120)
);

CREATE TABLE availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date date,
  time_slot meal_slot NOT NULL,
  recurring boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (day_of_week IS NOT NULL OR specific_date IS NOT NULL)
);

CREATE TABLE join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  host_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  meal_type meal_slot NOT NULL,
  proposed_date date,
  message text,
  status request_status NOT NULL DEFAULT 'pending',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT no_self_request CHECK (requester_couple_id != host_couple_id),
  CONSTRAINT join_requests_message_length CHECK (message IS NULL OR char_length(message) <= 500)
);

CREATE UNIQUE INDEX uniq_join_requests_pending_pair
  ON join_requests (requester_couple_id, host_couple_id)
  WHERE status = 'pending';

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
  sender_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE couple_blocks (
  blocker_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  blocked_couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_couple_id, blocked_couple_id),
  CONSTRAINT no_self_block CHECK (blocker_couple_id != blocked_couple_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────

CREATE INDEX idx_couples_location ON couples USING gist (location);
CREATE INDEX idx_couples_city ON couples (city);
CREATE INDEX idx_couples_state ON couples (state);
CREATE INDEX idx_couples_country ON couples (country);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
CREATE INDEX idx_join_requests_requester_created ON join_requests (requester_couple_id, created_at);
CREATE INDEX idx_messages_sender_created ON messages (sender_profile_id, created_at);

-- ─── Storage ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);
