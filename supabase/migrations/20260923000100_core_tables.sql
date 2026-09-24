CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age int NOT NULL CHECK (age >= 18),
  ethnicity text,
  has_kids boolean NOT NULL DEFAULT false,
  num_kids int NOT NULL DEFAULT 0,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_2_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  couple_name text,
  bio text,
  zip_code text NOT NULL,
  location geography(point, 4326) NOT NULL,
  hosting_preference hosting_preference NOT NULL DEFAULT 'both',
  invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_invite_code UNIQUE (invite_code)
);

CREATE TABLE pending_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age int NOT NULL CHECK (age >= 18),
  has_kids boolean NOT NULL DEFAULT false,
  num_kids int NOT NULL DEFAULT 0,
  claimed_by uuid REFERENCES auth.users(id),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
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
