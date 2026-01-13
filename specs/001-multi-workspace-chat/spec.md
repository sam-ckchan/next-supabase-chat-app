# Feature Specification: Multi-Workspace Chat

**Feature Branch**: `001-multi-workspace-chat`  
**Created**: 2025-12-28  
**Status**: Draft  
**Input**: User description: "Build the core multi-workspace chat experience of a Slack-like app"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Workspace Creation and Admin Role (Priority: P1)

As a user, I can create a new workspace and automatically become its Admin, giving me the foundation to invite team members and organize channels.

**Why this priority**: Without workspaces, no other features can function. This is the entry point for the entire application and establishes the tenant boundary.

**Independent Test**: Can be fully tested by creating a workspace and verifying the creator has Admin role. Delivers value as a standalone organizational unit.

**Acceptance Scenarios**:

1. **Given** I am a signed-in user, **When** I create a workspace with a valid name, **Then** the workspace is created and I am assigned the Admin role.
2. **Given** I am a signed-in user, **When** I attempt to create a workspace with an empty name, **Then** the system rejects the request with a validation error.
3. **Given** I am a signed-in user, **When** I create a workspace, **Then** I can see it in my workspace list immediately.

---

### User Story 2 - Workspace Switching and Isolation (Priority: P1)

As a user who belongs to multiple workspaces, I can switch between them and see only the channels and messages belonging to the selected workspace—never data from other workspaces.

**Why this priority**: Multi-tenancy isolation is the core security requirement. Without proper isolation, the entire product is unusable for teams with sensitive data.

**Independent Test**: Can be tested by creating two workspaces, adding different channels to each, and switching between them to verify isolation. Delivers trust and data safety.

**Acceptance Scenarios**:

1. **Given** I belong to Workspace A and Workspace B, **When** I select Workspace A, **Then** I see only channels from Workspace A.
2. **Given** I am viewing Workspace A, **When** I switch to Workspace B, **Then** the channel list updates to show only Workspace B channels, and any open message views are cleared.
3. **Given** I belong to Workspace A only, **When** I attempt to access Workspace B via URL manipulation, **Then** the system denies access and shows an error state.

---

### User Story 3 - Channel Creation (Priority: P2)

As a workspace Admin, I can create channels within my workspace so that team members have organized spaces for topic-based conversations.

**Why this priority**: Channels are the primary organizational unit for messages. After workspaces exist, channels must exist before messaging is meaningful.

**Independent Test**: Can be tested by an Admin creating a channel and verifying it appears in the channel list. Delivers organizational structure.

**Acceptance Scenarios**:

1. **Given** I am an Admin of a workspace, **When** I create a channel with a valid name, **Then** the channel appears in the workspace's channel list.
2. **Given** I am a Member (not Admin) of a workspace, **When** I attempt to create a channel, **Then** the system denies the action.
3. **Given** a channel named "general" exists in the workspace, **When** I attempt to create another channel named "general", **Then** the system rejects the duplicate name with an error.

---

### User Story 4 - Viewing Channel Message History (Priority: P2)

As a workspace Member, I can open a channel and view the message history so that I can catch up on past conversations.

**Why this priority**: Reading messages is fundamental to chat. Users must see existing content before sending new messages makes sense.

**Independent Test**: Can be tested by opening a channel with pre-existing messages and verifying they load correctly. Delivers information access.

**Acceptance Scenarios**:

1. **Given** I am a Member of a workspace with a channel containing messages, **When** I open the channel, **Then** I see the message history with the most recent messages visible.
2. **Given** I am a Member and the channel has more messages than fit on one screen, **When** I scroll up, **Then** older messages load progressively (pagination).
3. **Given** I am not a Member of the workspace, **When** I attempt to view a channel's messages, **Then** the system denies access.

---

### User Story 5 - Sending Messages (Priority: P2)

As a workspace Member, I can send a message to a channel so that I can communicate with my team.

**Why this priority**: Sending messages is the core interaction of a chat app. After viewing, sending completes the basic communication loop.

**Independent Test**: Can be tested by typing and sending a message, then verifying it appears in the channel. Delivers active communication.

**Acceptance Scenarios**:

1. **Given** I am a Member viewing a channel, **When** I type a message and submit, **Then** the message appears in the channel with my name and timestamp.
2. **Given** I am a Member, **When** I send an empty message, **Then** the system rejects the submission.
3. **Given** the message submission fails (network error), **When** the failure is detected, **Then** the UI shows an error and does not display a "ghost" message.

---

### User Story 6 - Editing and Deleting Own Messages (Priority: P3)

As a message author, I can edit or delete my own messages so that I can correct mistakes or remove outdated information.

**Why this priority**: Message management is a quality-of-life feature. Core chat works without it, but it reduces user frustration.

**Independent Test**: Can be tested by editing a message and verifying the content updates, or deleting and verifying removal. Delivers message control.

**Acceptance Scenarios**:

1. **Given** I sent a message, **When** I edit it with new content, **Then** the message displays the updated content (optionally marked as edited).
2. **Given** I sent a message, **When** I delete it, **Then** the message is removed from the channel view.
3. **Given** another user sent a message, **When** I attempt to edit or delete it as a non-Admin, **Then** the system denies the action.

---

### User Story 7 - Admin Adds Member by Email (Priority: P3)

As a workspace Admin, I can add a new member by their email address so that my team can collaborate in the workspace.

**Why this priority**: Team growth is essential but requires existing workspaces and channels first. Adding members expands utility after the core is built.

**Independent Test**: Can be tested by Admin adding an email, then that user signing in and seeing the workspace. Delivers team onboarding.

**Acceptance Scenarios**:

1. **Given** I am an Admin, **When** I add a valid email address as a Member, **Then** that user (once signed in) sees the workspace in their list.
2. **Given** I am an Admin, **When** I add an email that is already a member, **Then** the system informs me the user is already a member.
3. **Given** I am a Member (not Admin), **When** I attempt to add another member, **Then** the system denies the action.

---

### Edge Cases

-   **Unauthorized workspace access**: User attempts to access a workspace they are not a member of via direct URL → System returns error and redirects to workspace selector.
-   **Unauthorized channel access**: User attempts to post to a channel in a workspace they don't belong to → System rejects the message at the database level (RLS) and UI shows error.
-   **Message send failure**: Network drops during message send → Optimistic UI rolls back, error toast displayed, no ghost message persists.
-   **Concurrent editing conflict**: Two users edit the same message simultaneously → Last write wins, both see final state after refresh.
-   **Empty workspace**: User creates workspace but no channels exist → UI shows empty state with prompt for Admin to create first channel.
-   **Workspace with no members except creator**: Admin is alone in workspace → System functions normally; Admin can still create channels and send messages.
-   **Invalid email format on member add**: Admin enters malformed email → Validation error shown before any database operation.

## Requirements _(mandatory)_

### Functional Requirements

**Workspaces**

-   **FR-001**: System MUST allow authenticated users to create workspaces with a unique name.
-   **FR-002**: System MUST assign the workspace creator the Admin role automatically.
-   **FR-003**: System MUST allow users to view only workspaces where they have membership.
-   **FR-004**: System MUST allow users to switch between workspaces they belong to.
-   **FR-005**: System MUST isolate all data (channels, messages) by workspace—no cross-workspace data exposure.

**Channels**

-   **FR-006**: System MUST allow workspace Admins to create channels with unique names within a workspace.
-   **FR-007**: System MUST prevent Members (non-Admins) from creating channels.
-   **FR-008**: System MUST display the channel list for the currently selected workspace only.

**Messages**

-   **FR-009**: System MUST allow workspace Members to send messages to channels in their workspace.
-   **FR-010**: System MUST display message history for a channel with the author and timestamp.
-   **FR-011**: System MUST support pagination for message history (cursor-based).
-   **FR-012**: System MUST allow users to edit their own messages.
-   **FR-013**: System MUST allow users to delete their own messages.
-   **FR-014**: System MUST reject empty or blank messages.

**Membership**

-   **FR-015**: System MUST allow workspace Admins to add members by email address.
-   **FR-016**: System MUST prevent duplicate membership entries (same user, same workspace).
-   **FR-017**: System MUST assign new members the Member role by default.

**Security & Authorization**

-   **FR-018**: System MUST enforce all access control via Row Level Security (RLS) at the database layer.
-   **FR-019**: System MUST deny access attempts to workspaces, channels, or messages the user is not authorized for.
-   **FR-020**: System MUST NOT use service-role credentials for user-facing operations.
-   **FR-021**: System MUST validate all user inputs (workspace name, channel name, message body, email) using schemas.

**Error Handling**

-   **FR-022**: System MUST show clear error states when access is denied.
-   **FR-023**: System MUST roll back optimistic UI updates when operations fail.
-   **FR-035**: System MUST display generic "Access denied" message for RLS violations (no specific reason to prevent information leakage).
-   **FR-036**: System MUST provide navigation option to return to workspace selector after access denial.
-   **FR-037**: System MUST NOT reveal whether a resource exists when access is denied (same error for "not found" and "not authorized").

**Real-Time Behavior**

-   **FR-024**: System MUST deliver new messages to viewing users instantly (append to bottom of message list).
-   **FR-025**: System MUST allow brief out-of-order display if messages arrive with network timing variance; timestamp display ensures user comprehension.
-   **FR-026**: System MUST NOT block message display waiting for perfect chronological ordering.
-   **FR-027**: System MUST deduplicate real-time events by message ID; if a message with the same ID already exists in the view, the duplicate event is ignored.
-   **FR-028**: System MUST treat message updates (edits) as separate events; dedupe applies only to INSERT events with identical IDs.
-   **FR-029**: System MUST refetch the current page of messages from the server when the real-time connection reconnects.
-   **FR-030**: System MUST replace local message state entirely on reconnect refetch (no merge with stale local data).
-   **FR-031**: System MUST resubscribe to real-time channel events after reconnect refetch completes.
-   **FR-032**: System MUST unsubscribe from all previous workspace's real-time channels before subscribing to new workspace channels on workspace switch.
-   **FR-033**: System MUST NOT process real-time events from a previous workspace after switch begins (teardown-first ordering).
-   **FR-034**: System MUST clear all channel and message UI state from previous workspace before displaying new workspace data.

### Key Entities

-   **Workspace**: A tenant boundary containing channels and members. Key attributes: name, creator, creation timestamp.
-   **Workspace Member**: The association between a user and a workspace, including their role (Admin or Member). Key attributes: workspace reference, user reference, role, join timestamp.
-   **Channel**: A conversation space within a workspace. Key attributes: name, workspace reference, creator, creation timestamp.
-   **Message**: A single communication within a channel. Key attributes: body content, channel reference, author, creation timestamp, last update timestamp.

## Success Criteria _(mandatory)_

### Measurable Outcomes

-   **SC-001**: Users can create a workspace and become Admin within 10 seconds of initiating the action.
-   **SC-002**: Users can switch between workspaces and see the correct channel list within 2 seconds.
-   **SC-003**: Channel message history loads within 3 seconds for the initial page of messages.
-   **SC-004**: Sent messages appear in the channel within 1 second under normal network conditions.
-   **SC-005**: 100% of unauthorized access attempts are blocked at the database level (RLS) and result in a visible error state.
-   **SC-006**: Zero data leakage incidents—users never see channels or messages from workspaces they don't belong to.
-   **SC-007**: Users can complete the happy-path flow (login → select workspace → select channel → send message) on their first attempt without guidance.
-   **SC-008**: All user inputs are validated, and invalid inputs receive clear feedback within 500ms.

## Assumptions

-   Users authenticate via Supabase Auth (email/password). OAuth or SSO may be added later but is not required for this slice.
-   Workspace names are globally unique within the system (not just per-user).
-   Channel names are unique within a workspace (not globally).
-   Message editing updates the `updated_at` timestamp but does not maintain edit history.
-   "Adding member by email" means the email must correspond to an existing user account in Supabase Auth. Inviting non-registered users is out of scope.
-   Admins cannot currently demote themselves or be removed; workspace ownership transfer is out of scope.

## Clarifications

### Session 2026-01-06

-   Q: When User A sends a message and User B is viewing the same channel, how should User B's UI update? → A: Messages appear instantly at the bottom of the list as they arrive (may briefly show out-of-order if network varies).
-   Q: If a real-time event delivers the same message twice, how should the system handle it? → A: Deduplicate by message ID; if ID already exists, ignore the duplicate event.
-   Q: When a user's real-time connection drops and reconnects, how should the system synchronize state? → A: Refetch the current page of messages from the server on reconnect; replace local state entirely.
-   Q: When a user switches from Workspace A to Workspace B, what should happen to active real-time subscriptions? → A: Immediately unsubscribe from all Workspace A channels before subscribing to Workspace B channels.
-   Q: When a user's action is blocked by RLS, what should the UI display? → A: Show generic denial "Access denied" with option to return to workspace selector (no specific reason to avoid information leakage).
