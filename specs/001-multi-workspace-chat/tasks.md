# Tasks: Realtime Messaging

**Input**: Design documents from `/specs/001-multi-workspace-chat/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Scope**: This task list covers **US4-US6 (realtime messaging)** only. User stories US1-US3 (workspace/channel CRUD) and US7 (membership management) require separate task lists and are assumed to have pre-existing database schema.

**Tests**: Included per user request — manual test checklist + minimal e2e tests for realtime.

**Organization**: Tasks grouped by user story. Foundation phase must complete before user stories begin.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US4, US5, US6 for messaging stories)
- Exact file paths included in descriptions

## Path Conventions

- **Source**: `src/` at repository root (Next.js App Router)
- **Database**: `supabase/migrations/`
- **Tests**: `tests/e2e/`, `docs/acceptance.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [x] T001 Initialize Next.js 14+ project with App Router in repository root
  - **Done when**: `package.json` exists with `next`, `react`, `typescript` dependencies
- [x] T002 Install core dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`, `zustand`, `zod`
  - **Done when**: All packages in `package.json` dependencies
- [x] T003 [P] Configure TypeScript with strict mode in `tsconfig.json`
  - **Done when**: `"strict": true` in tsconfig
- [x] T004 [P] Configure ESLint + Prettier in `.eslintrc.js` and `.prettierrc`
  - **Done when**: `pnpm lint` runs without config errors
- [x] T005 Create `.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **Done when**: File exists with placeholder values

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, RLS policies, and Supabase client setup. **BLOCKS all user stories.**

### Database Schema

- [x] T006 Create `supabase/migrations/001_workspaces.sql` with workspaces + workspace_members tables
  - **Done when**: Migration file contains CREATE TABLE for both, with PK/FK constraints
- [x] T007 Create `supabase/migrations/002_channels.sql` with channels table and (workspace_id, name) unique constraint
  - **Done when**: Migration file contains CREATE TABLE with UNIQUE constraint
- [x] T008 Create `supabase/migrations/003_messages.sql` with messages table per data-model.md
  - Include: `id`, `channel_id`, `user_id`, `body`, `created_at`, `updated_at`
  - Include: CHECK constraint for non-empty body
  - **Done when**: Table created with all columns and constraint
- [x] T009 Add indexes to messages table in `supabase/migrations/003_messages.sql`
  - `idx_messages_channel_created` on `(channel_id, created_at DESC)`
  - `idx_messages_user` on `(user_id)`
  - **Done when**: Both indexes created
- [x] T010 Add `updated_at` trigger in `supabase/migrations/003_messages.sql`
  - **Done when**: Trigger auto-updates `updated_at` on UPDATE

### RLS Policies

- [x] T011 Create `supabase/migrations/004_rls_workspaces.sql` with RLS for workspaces + workspace_members
  - Enable RLS on both tables
  - SELECT: member can read own workspaces
  - INSERT: authenticated user can create workspace
  - **Done when**: RLS enabled, policies created
- [x] T012 Create `supabase/migrations/005_rls_channels.sql` with RLS for channels
  - SELECT: workspace members can read channels
  - INSERT: workspace admins can create channels
  - **Done when**: RLS enabled, policies created
- [x] T013 Create `supabase/migrations/006_rls_messages.sql` with RLS for messages per plan.md Section 3
  - SELECT: workspace members can read channel messages (join through channels → workspace_members)
  - INSERT: workspace members can send (user_id = auth.uid(), member of workspace)
  - UPDATE: owner only (user_id = auth.uid())
  - DELETE: owner only (user_id = auth.uid())
  - **Done when**: All 4 policies created and tested
- [x] T014 Enable realtime publication in `supabase/migrations/006_rls_messages.sql`
  - `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`
  - **Done when**: Messages table added to realtime publication

### RLS Gate (CRITICAL - Constitution Principle I)

- [ ] T014-GATE **[CRITICAL]** Verify RLS enabled on ALL user data tables before proceeding
  - Run: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
  - Required: `workspaces`, `workspace_members`, `channels`, `messages` all show `rowsecurity = true`
  - **Done when**: All 4 tables confirmed RLS-enabled. **BLOCKS Phase 3 until verified.**

### Verify RLS (Manual Test)

- [ ] T015 Verify RLS policies block cross-workspace access
  - Manual test: User A cannot SELECT messages from User B's workspace
  - Manual test: User A cannot INSERT message to channel in User B's workspace
  - **Done when**: Both tests fail with RLS error (PGRST301 or 42501)

### Supabase Client Setup

- [x] T016 Create `src/lib/supabase/client.ts` with browser Supabase client (anon key only)
  - **Done when**: `createBrowserClient()` exported, uses `NEXT_PUBLIC_*` env vars
- [x] T017 Create `src/lib/supabase/server.ts` with server Supabase client (cookies)
  - **Done when**: `createServerClient()` exported for Server Components
- [x] T018 Create `src/lib/supabase/middleware.ts` with auth session refresh middleware
  - **Done when**: Middleware refreshes session on each request
- [x] T019 Create `src/middleware.ts` that uses the auth middleware for protected routes
  - **Done when**: Unauthenticated users redirected to login

### Type Generation

- [x] T020 Run `supabase gen types typescript` and save to `src/types/database.ts`
  - **Done when**: File contains generated types for all tables

### Validation Schemas

- [x] T021 Create `src/lib/schemas/message.ts` with Zod schemas per contracts/messages.md
  - `MessageBodySchema`: 1-4000 chars, trimmed, non-empty
  - `MessageSchema`: full message shape
  - `CreateMessageSchema`: channel_id + body
  - `UpdateMessageSchema`: id + body
  - **Done when**: All schemas exported with proper validation

**Checkpoint**: Foundation ready — User story implementation can begin.

---

## Phase 3: User Story 4 - Viewing Channel Message History (Priority: P2)

**Goal**: Members can open a channel and view paginated message history.

**Independent Test**: Open channel with messages → see history with timestamps, scroll up → older messages load.

### Implementation for US4

- [x] T022 [US4] Create `src/services/messages.ts` with `fetchMessages(channelId, cursor?, limit?)` function
  - Uses cursor pagination (created_at < cursor)
  - Orders by created_at DESC
  - Default limit 50
  - **Done when**: Function returns array of messages, respects cursor
- [x] T023 [US4] Create `src/hooks/useMessages.ts` with TanStack `useInfiniteQuery` hook
  - Query key: `['messages', channelId]`
  - Implements `getNextPageParam` for cursor pagination
  - **Done when**: Hook returns `data`, `fetchNextPage`, `hasNextPage`, `isLoading`
- [x] T024 [US4] Create `src/components/messages/MessageItem.tsx` component
  - Displays: author name/avatar, body, timestamp
  - Formats timestamp relative (e.g., "2 min ago")
  - **Done when**: Component renders single message correctly
- [x] T025 [US4] Create `src/components/messages/MessageList.tsx` component
  - Maps messages to `MessageItem` components
  - Shows loading spinner during fetch
  - Shows empty state if no messages
  - **Done when**: List renders messages in chronological order (newest at bottom)
- [x] T026 [US4] Add scroll-to-load-more in `src/components/messages/MessageList.tsx`
  - Detect scroll to top → call `fetchNextPage()`
  - **Done when**: Scrolling up loads older messages

**Checkpoint**: US4 complete — Can view message history with pagination.

---

## Phase 4: User Story 5 - Sending Messages with Realtime (Priority: P2)

**Goal**: Members can send messages; messages appear in real-time for all viewers with optimistic updates.

**Independent Test**: User A sends message → appears instantly (optimistic) → User B sees it via realtime → no ghost on failure.

### Realtime Subscription

- [x] T027 [US5] Create `src/lib/supabase/realtime.ts` with `subscribeToMessages(channelId, handlers)` helper
  - Subscribes to postgres_changes for INSERT/UPDATE/DELETE
  - Filter: `channel_id=eq.${channelId}`
  - Returns subscription with `unsubscribe()` method
  - **Done when**: Helper exported and accepts event callbacks
- [x] T028 [US5] Create `src/hooks/useRealtimeMessages.ts` with realtime subscription hook
  - Subscribes when channelId changes
  - Teardown on unmount or channelId change (Constitution VII: teardown-first)
  - **Done when**: Hook logs realtime events to console when messages change

### Realtime Event Handlers (Dedupe + Ordering)

- [x] T029 [US5] Implement INSERT handler in `src/hooks/useRealtimeMessages.ts`
  - Dedupe: Skip if message ID already exists in cache (FR-027)
  - Append to cache and sort by created_at DESC
  - **Done when**: New messages appear once, in correct order
- [x] T030 [US5] Implement UPDATE handler in `src/hooks/useRealtimeMessages.ts`
  - Replace message if `new.updated_at > existing.updated_at`
  - Ignore if stale (FR-028)
  - **Done when**: Edits update in place, stale updates ignored
- [x] T031 [US5] Implement DELETE handler in `src/hooks/useRealtimeMessages.ts`
  - Remove message from cache by ID
  - **Done when**: Deleted messages disappear from all clients

### Auto-Scroll

- [x] T032 [US5] Add auto-scroll on INSERT in `src/components/messages/MessageList.tsx`
  - Scroll to bottom when new message arrives (POC UX)
  - **Done when**: New messages trigger smooth scroll to bottom

### Send Message with Optimistic Update

- [x] T033 [US5] Create `src/services/messages.ts` `sendMessage(channelId, body)` function
  - Validates body with `MessageBodySchema`
  - Inserts via Supabase client
  - **Done when**: Function inserts message and returns result
- [x] T034 [US5] Create `src/hooks/useMessageMutations.ts` with `useSendMessage` hook
  - Uses TanStack `useMutation`
  - **onMutate**: Cancel queries, snapshot cache, add optimistic message with `_optimistic: true` flag
  - **onError**: Rollback to snapshot, show error toast "Failed to send message"
  - **onSuccess**: Let realtime handle final state (dedupe handles race)
  - **Done when**: Optimistic message appears instantly, rolls back on failure
- [x] T035 [US5] Create `src/components/messages/MessageInput.tsx` component
  - Text input with submit button
  - Validates non-empty before send
  - Clears input on successful send
  - Disables during pending mutation
  - **Done when**: Can type and send messages, input clears on success
- [x] T036 [US5] Style optimistic messages in `src/components/messages/MessageItem.tsx`
  - Show subtle "sending..." indicator for messages with `_optimistic: true`
  - **Done when**: Pending messages visually distinguished

### Dedupe: Optimistic vs Realtime

- [x] T037 [US5] Ensure dedupe handles optimistic→realtime race in `src/hooks/useRealtimeMessages.ts`
  - When realtime INSERT arrives and ID matches optimistic, replace optimistic with confirmed
  - Use ID comparison (optimistic uses temp UUID, server returns real UUID)
  - Alternative: Match by body + user_id + ~timestamp if needed
  - **Done when**: No duplicate messages when realtime beats mutation response

**Checkpoint**: US5 complete — Can send messages with optimistic UI, realtime sync, no ghosts.

---

## Phase 5: User Story 6 - Editing and Deleting Own Messages (Priority: P3)

**Goal**: Authors can edit/delete their own messages; changes appear in real-time.

**Independent Test**: Edit message → updated content visible → Delete message → removed from list.

### Edit/Delete Service Functions

- [x] T038 [US6] Add `editMessage(messageId, body)` to `src/services/messages.ts`
  - Validates body with `MessageBodySchema`
  - Updates via Supabase client
  - **Done when**: Function updates message and returns result
- [x] T039 [US6] Add `deleteMessage(messageId)` to `src/services/messages.ts`
  - Deletes via Supabase client
  - **Done when**: Function deletes message

### Edit/Delete Mutations

- [x] T040 [US6] Add `useEditMessage` hook to `src/hooks/useMessageMutations.ts`
  - Optimistic update: immediately show new body
  - Rollback on error with toast
  - **Done when**: Edits appear instantly, roll back on failure
- [x] T041 [US6] Add `useDeleteMessage` hook to `src/hooks/useMessageMutations.ts`
  - Optimistic update: immediately remove from list
  - Rollback on error with toast
  - **Done when**: Deletes remove instantly, roll back on failure

### Edit/Delete UI

- [x] T042 [US6] Create `src/components/messages/MessageActions.tsx` component
  - Shows Edit/Delete buttons for user's own messages only
  - Edit opens inline edit mode
  - Delete confirms before executing
  - **Done when**: Actions visible for own messages only
- [x] T043 [US6] Add inline edit mode to `src/components/messages/MessageItem.tsx`
  - Toggle between view and edit mode
  - Save/Cancel buttons
  - **Done when**: Can edit message inline and save
- [x] T044 [US6] Show "(edited)" indicator in `src/components/messages/MessageItem.tsx`
  - Display when `updated_at > created_at`
  - **Done when**: Edited messages show indicator

**Checkpoint**: US6 complete — Can edit/delete own messages with realtime sync.

---

## Phase 6: Reconnect/Resync Behavior

**Goal**: After disconnect, HTTP refetch reconciles state; no stale data.

### Connection Status

- [x] T045 Create `src/components/messages/ConnectionStatus.tsx` component
  - Shows "Reconnecting..." indicator when disconnected
  - Hides when connected
  - **Done when**: Visual indicator appears/disappears with connection state
- [x] T046 Add connection status listeners in `src/hooks/useRealtimeMessages.ts`
  - Listen for `system.disconnect` → set status disconnected
  - Listen for `system.reconnect` → set status connected, trigger reconciliation
  - **Done when**: Status updates on disconnect/reconnect

### Reconciliation

- [x] T047 Implement reconnect reconciliation in `src/hooks/useRealtimeMessages.ts`
  - On reconnect: `queryClient.invalidateQueries(['messages', channelId])`
  - This triggers refetch; server response replaces cache (FR-029, FR-030)
  - **Done when**: After reconnect, messages match server state exactly

**Checkpoint**: Reconnect behavior complete — State converges to server truth.

---

## Phase 7: Workspace Switching (Subscription Teardown)

**Goal**: Switching workspaces tears down old subscriptions before creating new ones.

- [x] T048 Create `src/stores/workspace.ts` Zustand store
  - State: `currentWorkspaceId`, `currentChannelId`
  - Actions: `setWorkspace(id)`, `setChannel(id)`, `clearChannel()`
  - **Done when**: Store manages current workspace/channel selection
- [x] T049 Update `src/hooks/useRealtimeMessages.ts` to unsubscribe on channel/workspace change
  - Effect dependency on channelId
  - Cleanup function calls `unsubscribe()` before new subscription
  - **Done when**: Old subscription torn down before new one starts (FR-032, FR-033)
- [x] T050 Clear message cache on workspace switch
  - When workspace changes: clear channel, clear messages cache
  - **Done when**: No messages from old workspace visible after switch (FR-034)

**Checkpoint**: Workspace switching complete — Clean subscription lifecycle.

---

## Phase 8: Error Handling + Polish

**Goal**: Generic error messages, no info leakage, polished UX.

### RLS Error Handling

- [x] T051 Create `src/lib/errors.ts` with error handling utilities
  - `isRLSError(error)`: checks for PGRST301 or 42501 codes
  - `handleRLSError(error, router)`: shows "Access denied" toast, redirects to workspace selector
  - **Done when**: Utilities exported and handle RLS errors generically (FR-035, FR-037)
- [x] T052 Apply RLS error handling in all message mutations
  - `useSendMessage`, `useEditMessage`, `useDeleteMessage`
  - **Done when**: RLS failures show generic "Access denied", redirect to /workspaces

### Channel Page Integration

- [x] T053 Create `src/app/(workspace)/[workspaceId]/[channelId]/page.tsx`
  - Combines: MessageList, MessageInput, ConnectionStatus
  - Uses hooks: useMessages, useRealtimeMessages, useMessageMutations
  - **Done when**: Full channel view works end-to-end
- [x] T054 Add workspace/channel validation in page component
  - Verify user is member of workspace (via RLS—if query fails, redirect)
  - **Done when**: Non-members see "Access denied" and redirect

**Checkpoint**: Error handling complete — Secure, user-friendly error states.

---

## Phase 9: Testing + Documentation

**Goal**: Manual test checklist and minimal e2e tests for realtime behavior.

### Manual Test Checklist

- [x] T055 Update `docs/acceptance.md` with realtime messaging test checklist
  - [ ] **RT-01**: Send message in session A → appears in session B within 1s
  - [ ] **RT-02**: Edit message in session A → updated in session B within 1s
  - [ ] **RT-03**: Delete message in session A → removed in session B within 1s
  - [ ] **RT-04**: Send message → optimistic shows immediately → no duplicate after confirm
  - [ ] **RT-05**: Disconnect network → "Reconnecting" indicator shows
  - [ ] **RT-06**: Reconnect network → messages refetch and match server
  - [ ] **RT-07**: Switch workspace → old channel messages cleared
  - [ ] **RT-08**: User A cannot see User B's workspace messages (RLS)
  - [ ] **RT-09**: User A cannot send to User B's channel (RLS)
  - [ ] **RT-10**: Send fails → optimistic rolls back, error toast shown, no ghost
  - [ ] **RT-11**: Scroll up → older messages load (pagination)
  - [ ] **RT-12**: New message arrives → auto-scroll to bottom
  - **Done when**: All 12 test cases documented with pass/fail tracking

### E2E Test

- [x] T056 Create `tests/e2e/realtime-messages.spec.ts` with Playwright
  - Test: Two browser contexts (User A, User B) in same channel
  - User A sends message → User B sees it
  - **Done when**: Test passes with two concurrent sessions
- [x] T057 Add e2e test for optimistic rollback
  - Mock network failure on send
  - Verify optimistic message removed, error toast shown
  - **Done when**: Test passes for failure scenario

### Documentation Updates

- [x] T058 [P] Update `docs/rls.md` with messages RLS policy documentation
  - Document all 4 policies with explanations
  - **Done when**: RLS doc covers SELECT/INSERT/UPDATE/DELETE for messages
- [x] T059 [P] Update `docs/contracts.md` with message API contracts
  - Copy from specs/001-multi-workspace-chat/contracts/messages.md
  - **Done when**: Contracts doc includes message operations

### Validation

- [ ] T060 Run `quickstart.md` validation
  - Follow quickstart steps from scratch
  - Verify realtime works between two sessions
  - **Done when**: Quickstart produces working realtime chat

**Checkpoint**: Testing + docs complete — Feature ready for review.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────────────────────┐
                                                          │
Phase 2 (Foundation) ◄────────────────────────────────────┘
    │
    │ BLOCKS all user stories until complete
    ▼
┌─────────────────────────────────────────────────────────┐
│ User Stories (can run in parallel after Phase 2)        │
│                                                         │
│   Phase 3 (US4: View Messages)                          │
│       │                                                 │
│       ▼                                                 │
│   Phase 4 (US5: Send + Realtime) ◄── depends on US4     │
│       │                                                 │
│       ▼                                                 │
│   Phase 5 (US6: Edit/Delete) ◄── depends on US5         │
└─────────────────────────────────────────────────────────┘
    │
    ▼
Phase 6 (Reconnect) ◄── depends on US5 realtime
    │
    ▼
Phase 7 (Workspace Switch) ◄── depends on Phase 6
    │
    ▼
Phase 8 (Error Handling) ◄── depends on Phase 7
    │
    ▼
Phase 9 (Testing + Docs) ◄── depends on Phase 8
```

### Critical Path

T006 → T008 → T013 → T014 → T015 → T022 → T027 → T033 → T034 → T053 → T055

### Parallel Opportunities

**Phase 1** (all tasks can run in parallel):

- T001, T002, T003, T004, T005

**Phase 2** (after schema):

- T011, T012, T013 can run in parallel (different tables)
- T016, T017, T018 can run in parallel (different files)

**Phase 9** (docs):

- T058, T059 can run in parallel (different files)

---

## Task Summary

| Phase         | Task Range | Count | Purpose                            |
| ------------- | ---------- | ----- | ---------------------------------- |
| 1. Setup      | T001-T005  | 5     | Project initialization             |
| 2. Foundation | T006-T021  | 16    | DB, RLS, client, types, schemas    |
| 3. US4 (View) | T022-T026  | 5     | Message history + pagination       |
| 4. US5 (Send) | T027-T037  | 11    | Realtime + optimistic updates      |
| 5. US6 (Edit) | T038-T044  | 7     | Edit/delete own messages           |
| 6. Reconnect  | T045-T047  | 3     | Connection status + reconciliation |
| 7. Switch     | T048-T050  | 3     | Workspace subscription lifecycle   |
| 8. Errors     | T051-T054  | 4     | RLS error handling + page          |
| 9. Testing    | T055-T060  | 6     | Checklist, e2e, docs               |

**Total tasks**: 60  
**Estimated phases**: 9  
**MVP checkpoint**: After Phase 4 (T037) — Core realtime messaging works
