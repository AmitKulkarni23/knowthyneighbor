-- Seed data for local Supabase development
-- Creates test users in auth.users, then populates all app tables

-- ── Test users in auth.users ──
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pat@example.com',    crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pat Delgado"}',   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sam@example.com',    crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sam Delgado"}',   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'huy@example.com',    crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Huy Nguyen"}',    now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'linh@example.com',   crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Linh Nguyen"}',   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mike@example.com',   crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mike Patel"}',    now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya@example.com',  crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Patel"}',   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marcus@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marcus Johnson"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'janelle@example.com',crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Janelle Johnson"}',now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sara@example.com',   crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sara Kim"}',      now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tomoko@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tomoko Sato"}',   now(), now(), '', '', '', '');

-- Also insert into auth.identities (required for Supabase auth to work properly)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"pat@example.com"}',    'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"sam@example.com"}',    'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '{"sub":"00000000-0000-0000-0000-000000000003","email":"huy@example.com"}',    'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '{"sub":"00000000-0000-0000-0000-000000000004","email":"linh@example.com"}',   'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', '{"sub":"00000000-0000-0000-0000-000000000005","email":"mike@example.com"}',   'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', '{"sub":"00000000-0000-0000-0000-000000000006","email":"priya@example.com"}',  'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000007', '{"sub":"00000000-0000-0000-0000-000000000007","email":"marcus@example.com"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000008', '{"sub":"00000000-0000-0000-0000-000000000008","email":"janelle@example.com"}','email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000009', '{"sub":"00000000-0000-0000-0000-000000000009","email":"sara@example.com"}',   'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', '{"sub":"00000000-0000-0000-0000-000000000010","email":"tomoko@example.com"}', 'email', now(), now(), now());

-- ── Profiles ──
INSERT INTO profiles (id, full_name, age, ethnicity) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Pat Delgado',     34, 'Hispanic'),
  ('00000000-0000-0000-0000-000000000002', 'Sam Delgado',     32, 'Hispanic'),
  ('00000000-0000-0000-0000-000000000003', 'Huy Nguyen',      29, 'Vietnamese'),
  ('00000000-0000-0000-0000-000000000004', 'Linh Nguyen',     28, 'Vietnamese'),
  ('00000000-0000-0000-0000-000000000005', 'Mike Patel',      36, 'Indian'),
  ('00000000-0000-0000-0000-000000000006', 'Priya Patel',     33, 'Indian'),
  ('00000000-0000-0000-0000-000000000007', 'Marcus Johnson',  52, 'African American'),
  ('00000000-0000-0000-0000-000000000008', 'Janelle Johnson', 50, 'African American'),
  ('00000000-0000-0000-0000-000000000009', 'Sara Kim',        31, 'Korean'),
  ('00000000-0000-0000-0000-000000000010', 'Tomoko Sato',     30, 'Japanese');

-- ── Couples ──
-- All zip codes are in the San Diego area near 92129 (Rancho Peñasquitos)
INSERT INTO couples (id, partner_1_id, partner_2_id, couple_name, bio, zip_code, location, hosting_preference, invite_code) VALUES
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'The Delgados', 'We love hosting taco nights and trying new recipes together.', '92129',
   ST_SetSRID(ST_MakePoint(-117.1054, 32.9596), 4326)::geography, 'host', 'invite-delgados'),

  ('c0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004',
   'The Nguyens', 'Huge fans of Sunday brunch — we make killer eggs benedict. Two kids, one golden retriever.', '92128',
   ST_SetSRID(ST_MakePoint(-117.0770, 32.9940), 4326)::geography, 'host', 'invite-nguyens'),

  ('c0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006',
   'Mike & Priya', 'Just moved to the neighborhood! Would love to meet people over homemade curry or pizza.', '92131',
   ST_SetSRID(ST_MakePoint(-117.0855, 32.9150), 4326)::geography, 'visit', 'invite-patels'),

  ('c0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008',
   'The Johnsons', 'Empty nesters with a big backyard grill. We host BBQs every other weekend in the summer.', '92127',
   ST_SetSRID(ST_MakePoint(-117.1284, 32.9420), 4326)::geography, 'host', 'invite-johnsons'),

  ('c0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010',
   'Sara & Tomoko', 'Foodies who document every meal. Always hunting for the next great dinner conversation.', '92130',
   ST_SetSRID(ST_MakePoint(-117.1120, 32.9700), 4326)::geography, 'both', 'invite-kimsat');

-- ── Availability (The Delgados) ──
INSERT INTO availability (couple_id, day_of_week, time_slot, recurring) VALUES
  ('c0000000-0000-0000-0000-000000000001', 5, 'dinner',  true),
  ('c0000000-0000-0000-0000-000000000001', 6, 'brunch',  true),
  ('c0000000-0000-0000-0000-000000000001', 6, 'dinner',  true),
  ('c0000000-0000-0000-0000-000000000001', 0, 'brunch',  true),
  ('c0000000-0000-0000-0000-000000000001', 0, 'lunch',   true);

-- ── Availability (Sara & Tomoko) ──
INSERT INTO availability (couple_id, specific_date, time_slot, recurring) VALUES
  ('c0000000-0000-0000-0000-000000000013', '2026-10-03', 'dinner',  false),
  ('c0000000-0000-0000-0000-000000000013', '2026-10-04', 'brunch',  false),
  ('c0000000-0000-0000-0000-000000000013', '2026-10-04', 'dinner',  false),
  ('c0000000-0000-0000-0000-000000000013', '2026-10-05', 'brunch',  false),
  ('c0000000-0000-0000-0000-000000000013', '2026-10-10', 'dinner',  false),
  ('c0000000-0000-0000-0000-000000000013', '2026-10-11', 'lunch',   false);

-- ── Availability (The Johnsons) ──
INSERT INTO availability (couple_id, specific_date, time_slot, recurring) VALUES
  ('c0000000-0000-0000-0000-000000000012', '2026-10-03', 'dinner',  false),
  ('c0000000-0000-0000-0000-000000000012', '2026-10-04', 'lunch',   false),
  ('c0000000-0000-0000-0000-000000000012', '2026-10-04', 'dinner',  false),
  ('c0000000-0000-0000-0000-000000000012', '2026-10-11', 'dinner',  false);

-- ── Join requests ──
-- Received by The Delgados
INSERT INTO join_requests (requester_couple_id, host_couple_id, meal_type, message, status, created_at, responded_at) VALUES
  ('c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000001', 'dinner',
   'Hey! We''d love to come over for dinner sometime. We can bring dessert!', 'pending', '2026-09-24T14:30:00Z', NULL),
  ('c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000001', 'brunch',
   'Sunday brunch at your place sounds amazing — we make great mimosas.', 'pending', '2026-09-22T09:15:00Z', NULL),
  ('c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000001', 'dinner',
   NULL, 'accepted', '2026-09-15T18:00:00Z', '2026-09-16T10:00:00Z');

-- Sent by The Delgados
INSERT INTO join_requests (requester_couple_id, host_couple_id, meal_type, message, status, created_at, responded_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000012', 'dinner',
   'We heard you throw great BBQs — would love to join one!', 'accepted', '2026-09-20T12:00:00Z', '2026-09-21T08:30:00Z');

-- ── Conversations (created after accepted requests) ──
INSERT INTO conversations (id, couple_1_id, couple_2_id, created_at, last_message_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010',
   '2026-09-16T10:00:00Z', '2026-09-25T19:30:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000001',
   '2026-09-21T08:30:00Z', '2026-09-23T14:15:00Z');

-- ── Messages ──
INSERT INTO messages (conversation_id, sender_profile_id, body, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Hey! So excited to plan dinner. What day works for you?', '2026-09-16T10:05:00Z'),
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'How about Saturday the 4th? We''re free that evening.', '2026-09-16T12:30:00Z'),
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Perfect! 6:30pm work? We''ll do tacos.', '2026-09-16T14:00:00Z'),
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Sounds amazing! We''ll bring a salad and some wine.', '2026-09-25T19:30:00Z'),
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 'Welcome! We do BBQs on Saturdays usually. Oct 11 good?', '2026-09-21T09:00:00Z'),
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Oct 11 is great! What can we bring?', '2026-09-23T14:15:00Z');

-- ── Meals ──
INSERT INTO meals (conversation_id, host_couple_id, guest_couple_id, meal_type, scheduled_at, status, created_at, updated_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010',
   'dinner', '2026-10-04T18:30:00Z', 'confirmed', '2026-09-25T19:30:00Z', '2026-09-25T20:00:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000001',
   'dinner', '2026-10-11T17:00:00Z', 'proposed', '2026-09-23T14:15:00Z', '2026-09-23T14:15:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000001',
   'brunch', '2026-09-14T10:00:00Z', 'completed', '2026-09-10T12:00:00Z', '2026-09-14T14:00:00Z');
