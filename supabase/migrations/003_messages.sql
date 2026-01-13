-- Migration: 003_messages.sql
-- Creates messages table with indexes and triggers

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_not_empty CHECK (body <> '')
);

-- Indexes for messages
-- Primary query: fetch messages for channel, ordered by time (cursor pagination)
CREATE INDEX idx_messages_channel_created ON messages (channel_id, created_at DESC);

-- For user's own messages (edit/delete checks)
CREATE INDEX idx_messages_user ON messages (user_id);

-- For realtime filtering efficiency
CREATE INDEX idx_messages_channel_id ON messages (channel_id);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for messages updated_at
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
