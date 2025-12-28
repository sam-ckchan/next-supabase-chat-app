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
