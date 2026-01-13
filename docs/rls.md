# RLS Policies (Multi-Workspace)

## Principle

The database enforces access. The app assumes RLS is the final gate.
Client-side checks are convenience only.

## Membership rules

A user is a "workspace member" if a row exists in WorkspaceMember(workspace_id, user_id).
A user can read/write channels/messages only if they are a member of the channel's workspace.

## Required policies (plain English)

### workspaces

- SELECT: allowed if user is a member of workspace OR created_by = user
- INSERT: allowed for authenticated users, created_by = auth.uid()
- UPDATE/DELETE: allowed for workspace admins (optional)

### workspace_members

- SELECT: allowed if user is a member of that workspace
- INSERT: allowed if inviter is workspace admin (optional) OR if it's self-join via invite token (if implemented)
- For POC, simplest: creator automatically inserts self as admin.

### channels

- SELECT: allowed if user is a member of channel.workspace_id
- INSERT: allowed if user is workspace member (or admin only if you prefer)
- UPDATE/DELETE: admin only (optional)

### messages

- SELECT: allowed if user is member of channel.workspace_id
- INSERT: allowed if user is member of channel.workspace_id AND user_id = auth.uid()
- UPDATE: allowed only if messages.user_id = auth.uid() (or admin override optional)
- DELETE: allowed only if messages.user_id = auth.uid() (or admin override optional)

### reactions

- SELECT: allowed if user can read the message's channel workspace
- INSERT/DELETE: allowed if user can read that message AND user_id = auth.uid()
- Enforce uniqueness (message_id, user_id, emoji)

## Tests you must run (manual)

- User A cannot read workspace B
- User A cannot post in workspace/channel they are not a member of
- User A cannot edit User B messages
- Reaction toggling respects uniqueness

---

## Messages RLS Policies (SQL Implementation)

### SELECT Policy: Members can read channel messages

```sql
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
```

**Explanation**: A user can read a message if:

1. The message belongs to a channel
2. That channel belongs to a workspace
3. The user is a member of that workspace

### INSERT Policy: Members can send messages

```sql
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
```

**Explanation**: A user can insert a message if:

1. The `user_id` field matches their authenticated ID
2. They are a member of the workspace containing the target channel

### UPDATE Policy: Users can edit own messages

```sql
CREATE POLICY "Users can edit own messages"
  ON messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Explanation**: A user can only update messages where they are the author.

### DELETE Policy: Users can delete own messages

```sql
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (user_id = auth.uid());
```

**Explanation**: A user can only delete messages where they are the author.

## Security Invariants

| Rule                      | Enforcement                                        |
| ------------------------- | -------------------------------------------------- |
| No cross-workspace access | RLS joins through `channels` → `workspace_members` |
| Owner-only edit/delete    | `user_id = auth.uid()` in USING clause             |
| No empty messages         | CHECK constraint on `body`                         |
| No service-role bypass    | Client uses `anon` key only                        |
