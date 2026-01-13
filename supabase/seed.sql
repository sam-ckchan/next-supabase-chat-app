-- Seed data for development/testing
-- Run with: supabase db seed

-- Note: You need to create test users in Supabase Auth first
-- This seed assumes user IDs are available

-- Insert test workspaces (replace UUIDs with actual user IDs from auth.users)
-- INSERT INTO workspaces (id, name, created_by) VALUES
--   ('11111111-1111-1111-1111-111111111111', 'Acme Corp', '<user-a-id>'),
--   ('22222222-2222-2222-2222-222222222222', 'Startup Inc', '<user-b-id>');

-- Insert workspace members
-- INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
--   ('11111111-1111-1111-1111-111111111111', '<user-a-id>', 'admin'),
--   ('11111111-1111-1111-1111-111111111111', '<user-b-id>', 'member'),
--   ('22222222-2222-2222-2222-222222222222', '<user-b-id>', 'admin');

-- Insert test channels
-- INSERT INTO channels (id, workspace_id, name, created_by) VALUES
--   ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'general', '<user-a-id>'),
--   ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'random', '<user-a-id>'),
--   ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'general', '<user-b-id>');

-- Insert sample messages
-- INSERT INTO messages (channel_id, user_id, body) VALUES
--   ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '<user-a-id>', 'Hello everyone!'),
--   ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '<user-b-id>', 'Hi there!'),
--   ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '<user-a-id>', 'Welcome to the channel.');

SELECT 'Seed file ready - uncomment and replace UUIDs to seed data' AS message;
