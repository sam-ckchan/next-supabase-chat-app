# Implementation Plan: Realtime Messaging

**Branch**: `master` | **Date**: 2026-01-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-multi-workspace-chat/spec.md`

## Summary

Implement real-time message delivery for a multi-workspace chat application using Supabase Realtime (Postgres Changes). Messages must appear instantly across sessions, support INSERT/UPDATE/DELETE events, auto-scroll on new messages, deduplicate by ID, maintain chronological order, and reconcile on reconnect. All access control enforced via RLS—no service-role bypass.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Next.js 14+ (App Router), Supabase JS v2, TanStack Query v5, Zustand, Zod  
**Storage**: Supabase Postgres with RLS  
**Testing**: Vitest (unit), Playwright (e2e), manual checklist (acceptance)  
**Target Platform**: Web (Vercel deployment)  
**Project Type**: Web application (Next.js full-stack)  
**Performance Goals**: Message delivery < 500ms p95, channel load < 200ms p95  
**Constraints**: No service-role key for user operations, cursor pagination required  
**Scale/Scope**: POC scale (~100 concurrent users, ~10k messages/channel)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Status  | Evidence                                                               |
| ----------------------------- | ------- | ---------------------------------------------------------------------- |
| I. Security-First Tenancy     | ✅ Pass | RLS policies gate all message access via workspace membership          |
| II. No Privilege Bypass       | ✅ Pass | All operations use user session; service-role restricted to migrations |
| III. DB Is Source of Truth    | ✅ Pass | Reconnect triggers HTTP refetch; realtime applies deltas only          |
| IV. Clear Boundaries          | ✅ Pass | Realtime logic isolated in hooks; data access in `/lib/supabase`       |
| V. Validation                 | ✅ Pass | Zod schemas validate message body, channel ID before write             |
| VI. Performance Baseline      | ✅ Pass | Cursor pagination + indexes on (channel_id, created_at)                |
| VII. Realtime Correctness     | ✅ Pass | Dedupe by ID, teardown on channel switch, idempotent handlers          |
| VIII. Quality & Reviewability | ✅ Pass | Plan broken into small tasks; docs updated with design                 |
| IX. Testing                   | ✅ Pass | Manual checklist for authz boundaries, message CRUD, realtime          |
| X. Documentation              | ✅ Pass | Architecture, RLS, contracts documented in this plan                   |

**Gate Result**: ✅ PASS — Proceed to design.

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-workspace-chat/
├── spec.md              # Feature specification (exists)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API schemas)
└── checklists/
    └── requirements.md  # Quality checklist (exists)
```

### Source Code (repository root)

```text
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth routes (login, signup)
│   ├── (workspace)/          # Workspace routes
│   │   └── [workspaceId]/
│   │       └── [channelId]/
│   │           └── page.tsx  # Channel view with messages
│   └── layout.tsx
├── components/
│   ├── messages/
│   │   ├── MessageList.tsx       # Renders messages, handles scroll
│   │   ├── MessageItem.tsx       # Single message display
│   │   ├── MessageInput.tsx      # Compose + send
│   │   └── MessageActions.tsx    # Edit/delete controls
│   └── ui/                       # Shared UI primitives
├── hooks/
│   ├── useMessages.ts            # TanStack Query for message fetch
│   ├── useRealtimeMessages.ts    # Realtime subscription hook
│   └── useMessageMutations.ts    # Send/edit/delete mutations
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client (anon key)
│   │   ├── server.ts             # Server client (cookies)
│   │   ├── middleware.ts         # Auth middleware
│   │   └── realtime.ts           # Realtime helpers
│   └── schemas/
│       └── message.ts            # Zod schemas
├── services/
│   └── messages.ts               # Message business logic
├── stores/
│   └── workspace.ts              # Zustand store (selected workspace/channel)
└── types/
    └── database.ts               # Supabase generated types

supabase/
├── migrations/
│   └── 001_messages_realtime.sql # Schema + RLS + indexes
└── seed.sql                      # Test data

tests/
├── e2e/
│   └── realtime-messages.spec.ts
└── unit/
    └── hooks/
        └── useRealtimeMessages.test.ts
```

**Structure Decision**: Next.js App Router with collocated components. Realtime logic isolated in dedicated hooks per Constitution Principle IV.

---

## 1. Architecture Overview

### Client vs Server Responsibilities

| Layer                 | Runs On | Responsibilities                                                 |
| --------------------- | ------- | ---------------------------------------------------------------- |
| **UI Components**     | Client  | Render messages, handle scroll, user interactions                |
| **React Hooks**       | Client  | TanStack Query cache, realtime subscriptions, optimistic updates |
| **Supabase Client**   | Client  | Auth session, DB queries (via RLS), realtime channels            |
| **Next.js Server**    | Server  | Initial page render, auth middleware, SSR data fetch             |
| **Supabase Postgres** | Server  | Source of truth, RLS enforcement, realtime broadcast             |

### Auth Session Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser   │────▶│ Next.js App  │────▶│ Supabase Auth   │
│  (cookies)  │     │  (middleware)│     │  (JWT verify)   │
└─────────────┘     └──────────────┘     └─────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ Supabase DB  │
                    │  (RLS uses   │
                    │  auth.uid()) │
                    └──────────────┘
```

-   Supabase client initialized with `anon` key + user session from cookies
-   All queries run as authenticated user; `auth.uid()` available in RLS
-   Realtime subscriptions authenticated via same session token

---

## 2. Data Model Changes

### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT messages_body_not_empty CHECK (body <> '')
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### Required Indexes

```sql
-- Primary query: fetch messages for channel, ordered by time (cursor pagination)
CREATE INDEX idx_messages_channel_created
  ON messages (channel_id, created_at DESC);

-- For user's own messages (edit/delete checks)
CREATE INDEX idx_messages_user
  ON messages (user_id);

-- For realtime filtering efficiency
CREATE INDEX idx_messages_channel_id
  ON messages (channel_id);
```

### Trigger for updated_at

```sql
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
```

---

## 3. RLS Policy Outline

### Membership Check Helper

```sql
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Messages RLS Policies

```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- SELECT: User can read messages in channels of workspaces they belong to
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

-- INSERT: User can send messages to channels in their workspaces
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

-- UPDATE: User can only edit their own messages
CREATE POLICY "Users can edit own messages"
  ON messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: User can only delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (user_id = auth.uid());
```

### Security Invariants

| Rule                      | Enforcement                                        |
| ------------------------- | -------------------------------------------------- |
| No cross-workspace access | RLS joins through `channels` → `workspace_members` |
| Owner-only edit/delete    | `user_id = auth.uid()` in USING clause             |
| No empty messages         | CHECK constraint on `body`                         |
| No service-role bypass    | Client uses `anon` key only                        |

---

## 4. Realtime Design

### Subscription Strategy

```typescript
// Subscribe to messages for active channel only
const channel = supabase
	.channel(`messages:${channelId}`)
	.on(
		"postgres_changes",
		{
			event: "*", // INSERT, UPDATE, DELETE
			schema: "public",
			table: "messages",
			filter: `channel_id=eq.${channelId}`,
		},
		handleRealtimeEvent
	)
	.subscribe();
```

### Event Handling (Idempotent)

```typescript
function handleRealtimeEvent(payload: RealtimePayload) {
	const { eventType, new: newRow, old: oldRow } = payload;

	queryClient.setQueryData(["messages", channelId], (oldData) => {
		switch (eventType) {
			case "INSERT":
				// Dedupe: skip if ID exists
				if (oldData.some((m) => m.id === newRow.id)) return oldData;
				// Append and sort
				return [...oldData, newRow].sort(byCreatedAtDesc);

			case "UPDATE":
				// Replace if newer updated_at
				return oldData.map((m) =>
					m.id === newRow.id && newRow.updated_at > m.updated_at ? newRow : m
				);

			case "DELETE":
				// Remove by ID
				return oldData.filter((m) => m.id !== oldRow.id);
		}
	});
}
```

### Subscription Lifecycle

```typescript
// In useRealtimeMessages hook
useEffect(() => {
	if (!channelId) return;

	const subscription = subscribeToMessages(channelId, handleEvent);

	return () => {
		// Teardown BEFORE new subscription (Constitution VII)
		subscription.unsubscribe();
	};
}, [channelId]); // Re-subscribe on channel change
```

### Auto-Scroll Behavior

```typescript
// On INSERT event, scroll to bottom (POC UX requirement)
useEffect(() => {
	if (lastEvent?.type === "INSERT") {
		scrollContainerRef.current?.scrollTo({
			top: scrollContainerRef.current.scrollHeight,
			behavior: "smooth",
		});
	}
}, [lastEvent]);
```

---

## 5. Pagination + Reconciliation

### Cursor Pagination Strategy

```typescript
// Initial fetch: most recent N messages
const { data, fetchNextPage } = useInfiniteQuery({
	queryKey: ["messages", channelId],
	queryFn: ({ pageParam }) =>
		fetchMessages(channelId, {
			cursor: pageParam, // created_at of oldest loaded message
			limit: 50,
		}),
	getNextPageParam: (lastPage) =>
		lastPage.length === 50 ? lastPage[lastPage.length - 1].created_at : undefined,
	// Fetch older messages when scrolling up
});
```

### Cursor Query

```sql
SELECT * FROM messages
WHERE channel_id = $1
  AND created_at < $2  -- cursor (omit for first page)
ORDER BY created_at DESC
LIMIT 50;
```

### Realtime + Pagination Interaction

| Scenario                    | Handling                                       |
| --------------------------- | ---------------------------------------------- |
| INSERT while viewing recent | Append to list, auto-scroll                    |
| INSERT while scrolled up    | Append to list, show "new messages" indicator  |
| UPDATE any message          | Update in place if `updated_at` newer          |
| DELETE any message          | Remove from list regardless of scroll position |

### Reconnect Reconciliation

```typescript
// In useRealtimeMessages
const handleReconnect = async () => {
	// Constitution III: DB is source of truth
	await queryClient.invalidateQueries(["messages", channelId]);
	// This triggers refetch; TanStack Query replaces cache
};

// Supabase channel status listener
channel.on("system", { event: "reconnect" }, handleReconnect);
```

**Reconciliation Rules**:

1. On reconnect → invalidate query → refetch from server
2. Server response replaces local cache entirely (no merge)
3. Realtime resumes after refetch completes
4. Deduplication handled by React Query's cache key

---

## 6. Error Handling + UX

### Realtime Disconnect

```typescript
// Visual indicator in UI
const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("connected");

channel.on("system", { event: "disconnect" }, () => {
	setConnectionStatus("disconnected");
	// Show toast: "Reconnecting..."
});

channel.on("system", { event: "reconnect" }, () => {
	setConnectionStatus("connected");
	// Trigger reconciliation
});
```

### Optimistic Updates (Send Message)

```typescript
const sendMessage = useMutation({
	mutationFn: (body: string) => insertMessage(channelId, body),

	onMutate: async (body) => {
		// Cancel pending fetches
		await queryClient.cancelQueries(["messages", channelId]);

		// Snapshot for rollback
		const previous = queryClient.getQueryData(["messages", channelId]);

		// Optimistic insert
		const optimistic = {
			id: crypto.randomUUID(), // Temporary ID
			body,
			user_id: userId,
			created_at: new Date().toISOString(),
			_optimistic: true, // Flag for UI styling
		};

		queryClient.setQueryData(["messages", channelId], (old) => [...old, optimistic]);

		return { previous };
	},

	onError: (err, body, context) => {
		// Rollback on failure
		queryClient.setQueryData(["messages", channelId], context.previous);
		toast.error("Failed to send message");
	},

	onSuccess: (data) => {
		// Replace optimistic with real (realtime may beat this)
		// Dedupe logic handles either order
	},
});
```

### RLS Violation Response

```typescript
// Generic error for all auth failures (Constitution: no info leakage)
if (error.code === "PGRST301" || error.code === "42501") {
	toast.error("Access denied");
	router.push("/workspaces"); // Return to workspace selector
}
```

---

## 7. Implementation Plan

> **Note**: Task IDs below (T001-T023) are high-level buckets. See [tasks.md](tasks.md) for the detailed implementation breakdown with 60 granular tasks and different numbering.

### Phase 1: Database Foundation

| Task | Files                                      | Description                            |
| ---- | ------------------------------------------ | -------------------------------------- |
| T001 | `supabase/migrations/001_messages.sql`     | Create messages table with constraints |
| T002 | `supabase/migrations/001_messages.sql`     | Add indexes for pagination + realtime  |
| T003 | `supabase/migrations/001_messages.sql`     | Add updated_at trigger                 |
| T004 | `supabase/migrations/002_messages_rls.sql` | Implement RLS policies                 |
| T005 | `supabase/migrations/002_messages_rls.sql` | Enable realtime publication            |

### Phase 2: Data Access Layer

| Task | Files                          | Description                                        |
| ---- | ------------------------------ | -------------------------------------------------- |
| T006 | `src/lib/schemas/message.ts`   | Zod schemas for message validation                 |
| T007 | `src/types/database.ts`        | Generate Supabase types                            |
| T008 | `src/services/messages.ts`     | Message CRUD functions (fetch, send, edit, delete) |
| T009 | `src/lib/supabase/realtime.ts` | Realtime subscription helpers                      |

### Phase 3: React Hooks

| Task | Files                              | Description                                |
| ---- | ---------------------------------- | ------------------------------------------ |
| T010 | `src/hooks/useMessages.ts`         | TanStack Query hook with cursor pagination |
| T011 | `src/hooks/useRealtimeMessages.ts` | Realtime subscription + event handling     |
| T012 | `src/hooks/useMessageMutations.ts` | Send/edit/delete with optimistic updates   |

### Phase 4: UI Components

| Task | Files                                                    | Description                          |
| ---- | -------------------------------------------------------- | ------------------------------------ |
| T013 | `src/components/messages/MessageList.tsx`                | Virtualized list + scroll handling   |
| T014 | `src/components/messages/MessageItem.tsx`                | Single message + edit/delete actions |
| T015 | `src/components/messages/MessageInput.tsx`               | Compose box with validation          |
| T016 | `src/app/(workspace)/[workspaceId]/[channelId]/page.tsx` | Channel page integration             |

### Phase 5: Error Handling + Polish

| Task | Files                                          | Description                              |
| ---- | ---------------------------------------------- | ---------------------------------------- |
| T017 | `src/components/messages/ConnectionStatus.tsx` | Realtime status indicator                |
| T018 | `src/hooks/useRealtimeMessages.ts`             | Reconnect reconciliation logic           |
| T019 | Update error handling                          | Generic "Access denied" for RLS failures |

### Phase 6: Testing + Documentation

| Task | Files                                 | Description                        |
| ---- | ------------------------------------- | ---------------------------------- |
| T020 | `docs/acceptance.md`                  | Manual test checklist for realtime |
| T021 | `tests/e2e/realtime-messages.spec.ts` | E2E: two sessions, message sync    |
| T022 | `docs/rls.md`                         | Update RLS documentation           |
| T023 | `docs/contracts.md`                   | Update API contracts               |

---

## Key Tradeoffs

| Decision           | Chosen                    | Alternative                        | Rationale                                                            |
| ------------------ | ------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| **Ordering**       | Append + sort client-side | Server-enforced order              | Simpler; timestamps visible; brief reorder acceptable per spec       |
| **Dedupe**         | By message ID only        | ID + updated_at                    | INSERT events are unique; UPDATE uses timestamp comparison           |
| **Reconnect**      | Full refetch + replace    | Delta sync                         | Constitution III: DB is truth; delta sync is complex and error-prone |
| **Pagination**     | Cursor (created_at)       | Offset                             | Offset breaks with realtime inserts; cursor is stable                |
| **Auto-scroll**    | Always on INSERT          | Smart scroll (only if near bottom) | POC simplicity; can refine later                                     |
| **Error messages** | Generic "Access denied"   | Specific reasons                   | Security: no info leakage about resource existence                   |

---

## Checklist for `/speckit.tasks`

```text
[ ] T001-T005: Database schema, indexes, RLS, realtime publication
[ ] T006-T009: Data access layer (schemas, types, services, realtime helpers)
[ ] T010-T012: React hooks (query, realtime, mutations)
[ ] T013-T016: UI components (list, item, input, page)
[ ] T017-T019: Error handling and reconnect logic
[ ] T020-T023: Testing and documentation
```

**Total tasks**: 23  
**Estimated phases**: 6  
**Critical path**: T001 → T004 → T008 → T010 → T011 → T013 → T016
