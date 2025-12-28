# Spec: Slack-ish Multi-Workspace (POC)

## 0) Summary
Build a Slack-like multi-workspace chat app with channels, realtime messages, threads, reactions, and presence.
Target: deployed on Vercel. Backend platform: Supabase (Postgres + Auth + Realtime).

## 1) Goals (MUST)
- Multi-workspace: a user can belong to multiple workspaces.
- Workspace contains channels; channels contain messages.
- Real-time updates for messages (create/edit/delete).
- Threads and reactions.
- Presence: show which users are “in this channel”.
- Clean architecture: separations between UI, data access, realtime subscriptions, and authz.

## 2) Non-goals (MUST NOT)
- Direct messages (DMs)
- File uploads
- Notifications system
- Advanced granular permissions beyond Member/Admin
- Slack-perfect UI polish (functional > pixel-perfect)

## 3) Roles & Permissions (MUST)
Roles:
- Workspace Admin
- Workspace Member

Rules:
- User MUST only access workspaces they are a member of.
- User MUST only access channels within member workspaces.
- User MUST only read/write messages in channels where they are a member (via workspace membership).
- User MUST only edit/delete their own messages, unless Admin override is enabled (optional).

## 4) User Stories (MUST)
- As a user, I can sign up/sign in.
- As a user, I can create a workspace.
- As a user, I can switch between workspaces I belong to.
- As a user, I can create channels in a workspace (if allowed).
- As a user, I can view channel message history.
- As a user, I can send messages and see them appear in real-time for other users.
- As a user, I can reply in a thread.
- As a user, I can add/remove reactions on a message.
- As a user, I can see who is currently present in the channel.

## 5) UX Flows (Happy Path)
### Flow A: Core Slack loop
1. Login
2. Select workspace (or create one)
3. Select channel
4. Send message
5. Open second browser session → message appears in real-time

### Flow B: Threads
1. Click a message → open thread panel
2. Reply in thread
3. Thread updates in real-time across sessions

### Flow C: Reactions
1. Add emoji reaction to message
2. Count updates in real-time
3. Clicking again removes reaction

### Flow D: Presence
1. Enter channel → user appears in “online in channel” list
2. Leave channel → user disappears

## 6) Edge Cases (MUST handle)
- Unauthorized access: user tries to open workspace/channel not a member of → show 403/redirect.
- Message send fails (network/RLS violation) → optimistic UI rolls back + toast.
- Reconnect after offline → refetch latest page and resubscribe.
- Duplicate events or out-of-order events → client de-duplicates by message id and updated_at.
- Workspace switching should teardown previous subscriptions.

## 7) Architecture (MUST)
- Next.js App Router (React)
- Supabase Auth for login sessions
- Supabase Postgres as source of truth
- Supabase Realtime:
  - Postgres changes for messages/reactions
  - Presence for channel presence

Client State:
- TanStack Query for server state (channels, messages, reactions)
- Zustand for UI-only state (selected workspace/channel, thread panel open)

Invariant (MUST):
- DB is source of truth.
- Realtime only applies deltas; on reconnect, HTTP refetch reconciles.

## 8) Data Model (MUST)
Entities:
- Workspace(id, name, created_by, created_at)
- WorkspaceMember(workspace_id, user_id, role, created_at)
- Channel(id, workspace_id, name, is_private, created_by, created_at)
- Message(id, channel_id, user_id, body, created_at, updated_at, parent_message_id NULL)
- Reaction(id, message_id, user_id, emoji, created_at)

Constraints:
- WorkspaceMember unique(workspace_id, user_id)
- Channel unique(workspace_id, name)
- Reaction unique(message_id, user_id, emoji)

Indexes (SHOULD):
- Message(channel_id, created_at desc, id desc)
- Reaction(message_id)
- WorkspaceMember(user_id), WorkspaceMember(workspace_id)

## 9) Pagination (MUST)
- Messages MUST use cursor pagination (not offset).
- Ordering MUST be stable: created_at DESC, id DESC.
- Cursor MUST include (created_at, id).
- UI SHOULD support “Load older”.

## 10) Realtime (MUST)
Subscriptions:
- messages table changes filtered by channel_id
- reactions table changes filtered by message_id(s) OR by joining via message->channel (implementation choice)
Presence:
- presence channel key: presence:workspace:{workspaceId}:channel:{channelId}

Client rules (MUST):
- On INSERT message event → add to cache if channel matches.
- On UPDATE message event → update in cache.
- On DELETE message event → remove from cache.
- On reconnect → refetch latest page + resubscribe.

## 11) Security & AuthZ (MUST)
- Enforce authz with Supabase RLS policies; app code must not bypass with service role for user actions.
- All reads/writes to workspace/channel/message MUST be allowed only for members based on WorkspaceMember.
- UI MUST NOT rely on client-side checks alone.

## 12) Observability (SHOULD)
- Log key actions (create workspace/channel/message/reaction) with user_id + workspace_id + channel_id.
- Provide a debug page or console logs in dev (optional).

## 13) Future Work (MAY)
- DMs
- File uploads
- Search (full-text)
- Notifications
- Message editing history
