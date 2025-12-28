# Engineering Decisions

1) Multi-tenant boundary is Workspace -> Channel -> Message.
2) Authorization is enforced primarily via Supabase RLS, not UI checks.
3) DB is source of truth; realtime only pushes deltas. Reconnect triggers refetch.
4) Cursor pagination used for messages (stable ordering under concurrent inserts).
5) Reactions use a unique constraint (message_id, user_id, emoji) to prevent duplicates.
6) Threads implemented via parent_message_id adjacency list for 1-level threads.
7) Client uses TanStack Query for server state; Zustand for UI-only state.
8) Non-goals intentionally excluded to protect scope (DMs, files, notifications).
