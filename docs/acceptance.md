# Acceptance Criteria + Test Plan

## Definition of Done (Functional)

- [ ] User can sign up/sign in.
- [ ] User can create a workspace and becomes Admin member.
- [ ] User can switch between multiple workspaces they belong to.
- [ ] User can create channels in a workspace.
- [ ] User can send messages in a channel.
- [ ] Messages appear in real-time across two sessions.
- [ ] Cursor pagination loads older messages.
- [ ] Threads: user can reply in thread; thread updates real-time.
- [ ] Reactions: user can toggle emoji reaction; counts update real-time.
- [ ] Presence: shows users currently in the channel.

## Definition of Done (Security)

- [ ] RLS prevents reading non-member workspaces/channels/messages.
- [ ] RLS prevents writing messages outside membership.
- [ ] Only message owner can edit/delete (admin override optional).

## Definition of Done (Resilience)

- [ ] If realtime disconnects and reconnects, the UI refetches and matches DB.
- [ ] Optimistic send rolls back on error and shows toast.

## Demo Script (30 min)

1. (2 min) Intro: vertical slice scope + architecture
2. (6 min) Multi-workspace: create workspace A + channel; switch to workspace B
3. (8 min) Realtime: open two browsers; send/edit/delete message
4. (6 min) Threads: reply in thread; show real-time update
5. (4 min) Reactions: toggle emoji; show count updates
6. (2 min) Presence: show online list
7. (2 min) Q&A transition: show RLS.md + contracts.md

## Manual Test Checklist

- [ ] open non-member workspace URL → access denied
- [ ] post message with forged channel_id → denied
- [ ] edit someone else’s message → denied
- [ ] add same reaction twice → only one exists
- [ ] disconnect network → reconnect → state reconciles

---

## Realtime Messaging Test Checklist

### RT-01: Realtime INSERT

- [ ] Send message in session A → appears in session B within 1s

### RT-02: Realtime UPDATE

- [ ] Edit message in session A → updated in session B within 1s

### RT-03: Realtime DELETE

- [ ] Delete message in session A → removed in session B within 1s

### RT-04: Optimistic Dedupe

- [ ] Send message → optimistic shows immediately → no duplicate after confirm

### RT-05: Disconnect Indicator

- [ ] Disconnect network → "Reconnecting" indicator shows

### RT-06: Reconnect Reconciliation

- [ ] Reconnect network → messages refetch and match server

### RT-07: Workspace Switch

- [ ] Switch workspace → old channel messages cleared

### RT-08: RLS SELECT

- [ ] User A cannot see User B's workspace messages (RLS)

### RT-09: RLS INSERT

- [ ] User A cannot send to User B's channel (RLS)

### RT-10: Optimistic Rollback

- [ ] Send fails → optimistic rolls back, error toast shown, no ghost

### RT-11: Cursor Pagination

- [ ] Scroll up → older messages load (pagination)

### RT-12: Auto-Scroll

- [ ] New message arrives → auto-scroll to bottom
