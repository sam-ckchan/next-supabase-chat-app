-- Migration: 006_rls_messages.sql
-- RLS policies for messages table and realtime publication

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages: Workspace members can read channel messages
CREATE POLICY "Members can read channel messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = messages.channel_id
        AND wm.user_id = auth.uid()
    )
  );

-- Messages: Workspace members can send messages
CREATE POLICY "Members can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = messages.channel_id
        AND wm.user_id = auth.uid()
    )
  );

-- Messages: Users can only edit their own messages
CREATE POLICY "Users can edit own messages"
  ON messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Messages: Users can only delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime publication for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
