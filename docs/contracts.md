# Contracts: API + Realtime

## 1) DTOs (Shapes)
### Workspace
- id: string (uuid)
- name: string
- created_by: string (user id)
- created_at: string (ISO)

### Channel
- id: string
- workspace_id: string
- name: string

### Message
- id: string
- channel_id: string
- user_id: string
- body: string
- created_at: string
- updated_at: string
- parent_message_id: string | null

### Reaction
- id: string
- message_id: string
- user_id: string
- emoji: string
- created_at: string

## 2) Operations (MUST)
Note: actual transport can be "Supabase client direct DB ops" OR "Next.js route handlers".
Pick one and keep it consistent across the app.

### Create workspace
Input: { name }
Output: Workspace
Errors:
- 401 unauthenticated
- 400 invalid name

### Create channel
Input: { workspace_id, name }
Output: Channel
Errors:
- 403 not workspace member
- 409 duplicate channel name in workspace

### Send message
Input: { channel_id, body, parent_message_id? }
Output: Message
Errors:
- 403 not channel member
- 400 empty body
  Client behavior:
- optimistic insert with temporary id
- replace with server message on success
- rollback on error

### Edit message
Input: { message_id, body }
Output: Message
Errors:
- 403 not owner (unless admin)
- 400 empty body

### Delete message
Input: { message_id }
Output: { ok: true }
Errors:
- 403 not owner (unless admin)

### Toggle reaction
Input: { message_id, emoji }
Output: { reacted: boolean }  // true if added, false if removed
Errors:
- 403 not channel member (via message->channel)
  Rules:
- unique(message_id, user_id, emoji)

## 3) Realtime Events (MUST)
Supabase Postgres changes events (conceptual):
- messages: INSERT / UPDATE / DELETE
- reactions: INSERT / DELETE

### messages INSERT payload (minimum fields)
- id, channel_id, user_id, body, created_at, updated_at, parent_message_id

Client handling:
- If payload.channel_id != currentChannelId → ignore
- Else upsert message into cache
- De-duplicate by id

### messages UPDATE payload
- same fields
  Client handling:
- upsert by id

### messages DELETE payload
- id, channel_id
  Client handling:
- remove by id

### reactions INSERT/DELETE payload
- message_id, user_id, emoji
  Client handling:
- update reaction counts for that message in cache
- if counts not stored, refetch message reactions for that message_id

## 4) Presence (MUST)
Presence channel:
- presence:workspace:{wid}:channel:{cid}

Presence state payload:
- user_id
- display_name (optional)
- entered_at

Client handling:
- show list of present users
- cleanup on unmount
