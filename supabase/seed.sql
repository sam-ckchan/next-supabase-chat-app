-- Seed data for development/testing
-- Run with: supabase db reset

-- Create test users in auth.users (Supabase local dev allows this)
INSERT INTO auth.users (
  id, 
  instance_id,
  email, 
  encrypted_password, 
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_current,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  aud,
  role,
  created_at, 
  updated_at,
  confirmation_sent_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  phone
)
VALUES 
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'alice@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'bob@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Create identities for the users
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'email',
    '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"alice@test.com"}'::jsonb,
    now(),
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'email',
    '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","email":"bob@test.com"}'::jsonb,
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Insert test workspaces
INSERT INTO workspaces (id, name, created_by) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Corp', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'Startup Inc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO NOTHING;

-- Insert workspace members
INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'member'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Insert test channels
INSERT INTO channels (id, workspace_id, name, created_by) VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'general', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'random', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('cccccccc-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'general', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO NOTHING;

-- Insert sample messages
INSERT INTO messages (channel_id, user_id, body, created_at) VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hello everyone! Welcome to Acme Corp.', now() - interval '2 hours'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hi there! Glad to be here.', now() - interval '1 hour 55 minutes'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feel free to ask any questions!', now() - interval '1 hour 50 minutes'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Random thoughts go here 🎲', now() - interval '30 minutes'),
  ('cccccccc-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Welcome to Startup Inc!', now() - interval '1 hour');

SELECT 'Seed completed! Test users: alice@test.com / bob@test.com (password: password123)' AS message;
