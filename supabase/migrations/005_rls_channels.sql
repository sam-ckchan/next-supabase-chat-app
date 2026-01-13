-- Migration: 005_rls_channels.sql
-- RLS policies for channels table

-- Enable RLS on channels
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Channels: Workspace members can read channels
CREATE POLICY "Workspace members can read channels"
  ON channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = channels.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- Channels: Workspace admins can create channels
CREATE POLICY "Workspace admins can create channels"
  ON channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = channels.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'admin'
    )
    AND created_by = auth.uid()
  );

-- Channels: Workspace admins can update channels
CREATE POLICY "Workspace admins can update channels"
  ON channels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = channels.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'admin'
    )
  );

-- Channels: Workspace admins can delete channels
CREATE POLICY "Workspace admins can delete channels"
  ON channels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = channels.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'admin'
    )
  );
