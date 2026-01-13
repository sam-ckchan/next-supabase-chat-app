# Data Model: Realtime Messaging

**Feature**: Multi-Workspace Chat  
**Date**: 2026-01-13  
**Status**: Draft

## Entity Overview

```
┌─────────────┐      ┌─────────────────────┐      ┌─────────────┐
│  Workspace  │──1:N─│  WorkspaceMember    │──N:1─│    User     │
└─────────────┘      └─────────────────────┘      └─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│   Channel   │
└─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│   Message   │──N:1─┐
└─────────────┘      │
                     │
              ┌──────┴──────┐
              │    User     │
              │  (author)   │
              └─────────────┘
```

## Entities

### Workspace

**Purpose**: Tenant boundary; top-level organizational unit.

| Field        | Type        | Constraints                     | Description                    |
| ------------ | ----------- | ------------------------------- | ------------------------------ |
| `id`         | UUID        | PK, default `gen_random_uuid()` | Unique identifier              |
| `name`       | TEXT        | NOT NULL, UNIQUE                | Display name (globally unique) |
| `created_by` | UUID        | FK → auth.users, NOT NULL       | Creator (becomes Admin)        |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()`       | Creation timestamp             |

**Indexes**:

-   PK on `id`
-   UNIQUE on `name`

---

### WorkspaceMember

**Purpose**: Associates users with workspaces; defines role.

| Field          | Type        | Constraints                                   | Description      |
| -------------- | ----------- | --------------------------------------------- | ---------------- |
| `workspace_id` | UUID        | FK → workspaces, NOT NULL                     | Parent workspace |
| `user_id`      | UUID        | FK → auth.users, NOT NULL                     | Member user      |
| `role`         | TEXT        | NOT NULL, CHECK (role IN ('admin', 'member')) | Permission level |
| `created_at`   | TIMESTAMPTZ | NOT NULL, default `now()`                     | Join timestamp   |

**Constraints**:

-   PK on `(workspace_id, user_id)`
-   UNIQUE on `(workspace_id, user_id)` (implicit from PK)

**Indexes**:

-   PK covers `(workspace_id, user_id)`
-   Index on `user_id` (for "my workspaces" queries)

---

### Channel

**Purpose**: Conversation container within a workspace.

| Field          | Type        | Constraints                     | Description        |
| -------------- | ----------- | ------------------------------- | ------------------ |
| `id`           | UUID        | PK, default `gen_random_uuid()` | Unique identifier  |
| `workspace_id` | UUID        | FK → workspaces, NOT NULL       | Parent workspace   |
| `name`         | TEXT        | NOT NULL                        | Display name       |
| `created_by`   | UUID        | FK → auth.users, NOT NULL       | Creator            |
| `created_at`   | TIMESTAMPTZ | NOT NULL, default `now()`       | Creation timestamp |

**Constraints**:

-   UNIQUE on `(workspace_id, name)` — channel names unique within workspace

**Indexes**:

-   PK on `id`
-   UNIQUE on `(workspace_id, name)`
-   Index on `workspace_id` (for channel list queries)

---

### Message

**Purpose**: Single communication within a channel.

| Field        | Type        | Constraints                                     | Description        |
| ------------ | ----------- | ----------------------------------------------- | ------------------ |
| `id`         | UUID        | PK, default `gen_random_uuid()`                 | Unique identifier  |
| `channel_id` | UUID        | FK → channels ON DELETE CASCADE, NOT NULL       | Parent channel     |
| `user_id`    | UUID        | FK → auth.users ON DELETE CASCADE, NOT NULL     | Author             |
| `body`       | TEXT        | NOT NULL, CHECK (`char_length(trim(body)) > 0`) | Message content    |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()`                       | Original send time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()`                       | Last edit time     |

**Constraints**:

-   `body` cannot be empty or whitespace-only
-   CASCADE delete when channel is deleted
-   CASCADE delete when user is deleted

**Indexes**:

-   PK on `id`
-   `idx_messages_channel_created` on `(channel_id, created_at DESC)` — pagination queries
-   `idx_messages_user` on `user_id` — user's messages lookup
-   `idx_messages_channel_id` on `channel_id` — realtime filter optimization

**Trigger**:

-   `updated_at` auto-set on UPDATE via trigger function

---

## Validation Rules

### Workspace

| Field  | Rule                                                       |
| ------ | ---------------------------------------------------------- |
| `name` | 1-100 characters, alphanumeric + hyphens + spaces, trimmed |

### Channel

| Field  | Rule                                                                      |
| ------ | ------------------------------------------------------------------------- |
| `name` | 1-80 characters, alphanumeric + hyphens + underscores, lowercase, trimmed |

### Message

| Field  | Rule                                                   |
| ------ | ------------------------------------------------------ |
| `body` | 1-4000 characters, trimmed, cannot be empty/whitespace |

---

## State Transitions

### Message Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Created   │────▶│   Updated   │────▶│   Deleted   │
│ (INSERT)    │     │ (UPDATE)    │     │ (DELETE)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   │ (can repeat)
       │                   ▼
       │            ┌─────────────┐
       └───────────▶│   Deleted   │
                    │ (DELETE)    │
                    └─────────────┘
```

**Invariants**:

-   `updated_at >= created_at` always
-   `updated_at` changes on every UPDATE
-   DELETE is permanent (no soft delete in POC)

---

## Relationships Summary

| From      | To              | Cardinality | Cascade        |
| --------- | --------------- | ----------- | -------------- |
| Workspace | WorkspaceMember | 1:N         | CASCADE DELETE |
| Workspace | Channel         | 1:N         | CASCADE DELETE |
| User      | WorkspaceMember | 1:N         | CASCADE DELETE |
| User      | Message         | 1:N         | CASCADE DELETE |
| Channel   | Message         | 1:N         | CASCADE DELETE |

---

## Migration SQL

```sql
-- 001_create_workspaces.sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 002_create_workspace_members.sql
CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- 003_create_channels.sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE INDEX idx_channels_workspace ON channels(workspace_id);

-- 004_create_messages.sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```
