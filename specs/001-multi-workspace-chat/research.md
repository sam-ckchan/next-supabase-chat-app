# Research: Realtime Messaging

**Feature**: Multi-Workspace Chat - Realtime Messaging  
**Date**: 2026-01-13  
**Status**: Complete

## Research Tasks Completed

### 1. Supabase Realtime Best Practices

**Decision**: Use Postgres Changes (not Broadcast) for message events

**Rationale**:

-   Postgres Changes integrates with RLS automatically
-   Events are durable (tied to actual DB changes)
-   Filter syntax (`filter: channel_id=eq.${id}`) reduces client-side filtering
-   Broadcast is for ephemeral events (typing indicators)—not message persistence

**Alternatives Considered**:

-   Broadcast channels: Rejected—no RLS integration, requires manual auth
-   Supabase Realtime v1 (deprecated): Not considered

**Source**: [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)

---

### 2. TanStack Query + Realtime Integration Pattern

**Decision**: Use `queryClient.setQueryData` for realtime updates; invalidate on reconnect

**Rationale**:

-   `setQueryData` provides optimistic-style updates without network call
-   Maintains TanStack Query cache as single source of client truth
-   Invalidation on reconnect triggers proper refetch cycle
-   Avoids dual state management (React state + Query cache)

**Pattern**:

```typescript
// Realtime event → update cache
queryClient.setQueryData(["messages", channelId], (old) => {
	// Apply INSERT/UPDATE/DELETE
});

// Reconnect → invalidate → refetch
queryClient.invalidateQueries(["messages", channelId]);
```

**Alternatives Considered**:

-   Separate React state for realtime: Rejected—creates sync bugs
-   Refetch on every event: Rejected—defeats purpose of realtime

---

### 3. Cursor Pagination for Chat Messages

**Decision**: Use `created_at` as cursor, descending order, with index

**Rationale**:

-   `created_at` is monotonically increasing (with microsecond precision)
-   Descending order loads newest first (chat UX expectation)
-   Index on `(channel_id, created_at DESC)` enables efficient range scans
-   Cursor pagination is stable across inserts (unlike offset)

**Query Pattern**:

```sql
SELECT * FROM messages
WHERE channel_id = $1
  AND ($2::timestamptz IS NULL OR created_at < $2)
ORDER BY created_at DESC
LIMIT 50;
```

**Alternatives Considered**:

-   UUID cursor: Rejected—UUIDs not ordered, requires extra index
-   Offset pagination: Rejected—unstable with realtime inserts
-   Keyset on `id`: Rejected—UUID v4 not time-ordered

---

### 4. Supabase RLS for Multi-Tenant Isolation

**Decision**: RLS policies join through `channels` → `workspace_members`

**Rationale**:

-   Messages don't directly reference workspace; channel does
-   Single membership check via join is clear and auditable
-   `SECURITY DEFINER` function caches membership check for performance
-   Same pattern used for SELECT, INSERT; stricter for UPDATE/DELETE

**Security Model**:

```
messages.channel_id → channels.workspace_id → workspace_members.user_id = auth.uid()
```

**Alternatives Considered**:

-   Denormalize `workspace_id` into messages: Rejected—data duplication, sync risk
-   Application-level checks only: Rejected—violates Constitution I

---

### 5. Optimistic Updates with Rollback

**Decision**: Use TanStack Query's `onMutate`/`onError` pattern

**Rationale**:

-   Proven pattern from TanStack Query docs
-   Snapshot-based rollback is atomic
-   Works with realtime (eventual consistency is fine)
-   Clear separation of optimistic state (`_optimistic` flag)

**Pattern**:

```typescript
onMutate: async () => {
  await queryClient.cancelQueries(key);
  const previous = queryClient.getQueryData(key);
  queryClient.setQueryData(key, optimisticData);
  return { previous };
},
onError: (err, vars, context) => {
  queryClient.setQueryData(key, context.previous);
},
```

**Alternatives Considered**:

-   No optimistic updates: Rejected—poor UX for chat
-   Separate optimistic state: Rejected—complexity without benefit

---

### 6. Reconnect Reconciliation Strategy

**Decision**: Full refetch and replace on reconnect

**Rationale**:

-   Constitution III mandates DB as source of truth
-   Delta sync requires tracking last-seen event ID (complex)
-   Full refetch is simple, correct, and fast for 50-message pages
-   TanStack Query handles cache replacement automatically

**Flow**:

```
disconnect → show indicator → reconnect event → invalidateQueries → refetch → hide indicator
```

**Alternatives Considered**:

-   Delta sync with event log: Rejected—complexity, requires server-side tracking
-   Merge local + remote: Rejected—conflict resolution is error-prone

---

### 7. Subscription Teardown on Navigation

**Decision**: Cleanup in `useEffect` return, before new subscription

**Rationale**:

-   Constitution VII requires teardown before new subscription
-   React's cleanup runs before effect re-runs on dependency change
-   Prevents stale events from previous channel
-   Zustand store change triggers hook re-render

**Pattern**:

```typescript
useEffect(() => {
	const sub = subscribe(channelId);
	return () => sub.unsubscribe(); // Teardown first
}, [channelId]);
```

**Alternatives Considered**:

-   Keep subscriptions alive: Rejected—memory leak, stale events
-   Lazy cleanup: Rejected—race condition with new channel events

---

## Technology Decisions Summary

| Area                   | Decision                 | Confidence |
| ---------------------- | ------------------------ | ---------- |
| Realtime mechanism     | Postgres Changes         | High       |
| Client cache           | TanStack Query           | High       |
| Pagination             | Cursor (created_at DESC) | High       |
| Access control         | RLS with join path       | High       |
| Optimistic updates     | onMutate/onError pattern | High       |
| Reconnect              | Full refetch             | High       |
| Subscription lifecycle | useEffect cleanup        | High       |

## Open Questions (None)

All NEEDS CLARIFICATION items from Technical Context have been resolved.
