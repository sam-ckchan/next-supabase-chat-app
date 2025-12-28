# <!--

# SYNC IMPACT REPORT

Version change: N/A → 1.0.0 (initial)
Modified principles: None (initial constitution)
Added sections:

-   Core Principles (10 principles)
-   Non-Goals
-   Governance
    Removed sections: None (initial)
    Templates status:
-   .specify/templates/plan-template.md ✅ Compatible (Constitution Check section exists)
-   .specify/templates/spec-template.md ✅ Compatible (Requirements/Success Criteria align)
-   .specify/templates/tasks-template.md ✅ Compatible (Phase structure supports principles)
    Follow-up TODOs: None
    ================================================================================
    -->

# Smash (Slack-ish Chat POC) Constitution

A multi-workspace Slack-like chat proof-of-concept built with Next.js App Router, TypeScript, and Supabase (Auth, Postgres, Realtime).

## Core Principles

### I. Security-First Tenancy (NON-NEGOTIABLE)

All multi-workspace access control MUST be enforced via Supabase Row Level Security (RLS).

-   Every table containing user or workspace data MUST have RLS policies enabled
-   UI-level permission checks are convenience only; the database is the final gate
-   Membership is determined by the `workspace_members` table—no implicit access
-   Reference [docs/rls.md](docs/rls.md) as the authoritative RLS policy specification

**Rationale**: A single missed UI check should never expose data across tenants.

### II. No Privilege Bypass (NON-NEGOTIABLE)

DO NOT use the Supabase service-role key for user-facing operations.

-   All user-initiated actions MUST run under the authenticated user session
-   Service-role key usage is restricted to: migrations, admin scripts, CI seeding
-   If an operation fails RLS, the correct response is to fix RLS or deny the action—never bypass
-   Log and alert on any unexpected service-role usage patterns

**Rationale**: Bypassing RLS defeats the security model; one leaked endpoint becomes a full breach.

### III. DB Is Source of Truth

Postgres is authoritative; Realtime only applies deltas.

-   On reconnect or subscription error, the client MUST refetch from HTTP and reconcile
-   Never trust in-memory state after a disconnect without re-validation
-   Optimistic updates must roll back on RLS/network failure
-   Cache invalidation follows: mutate → refetch → reconcile pattern

**Rationale**: Realtime is an optimization, not a consistency guarantee.

### IV. Clear Boundaries

Keep UI components thin; centralize business logic and data access.

-   **UI Components**: Render props, handle user events, delegate to hooks/services
-   **Services/Modules**: Contain business logic, validation, transformation
-   **Data Access**: Centralized in `/lib/supabase` or similar—no direct Supabase calls in components
-   **Realtime Subscriptions**: Isolated in dedicated hooks; never mixed with rendering logic

**Rationale**: Separation enables testing, replacement, and reasoning about each layer independently.

### V. Validation

Validate all external inputs using schemas; reject unknown fields.

-   Message body, channel names, workspace names, IDs MUST be validated before database write
-   Use Zod (or equivalent) schemas at API boundaries
-   Unknown/extra fields MUST be stripped or rejected—never passed through
-   Validation errors return structured responses (field, code, message)

**Rationale**: Input validation is the first line of defense against injection and data corruption.

### VI. Performance Baseline

Use cursor pagination for messages; add necessary indexes; avoid N+1 queries.

-   Message lists MUST use cursor-based pagination (not offset)
-   Required indexes: message timestamps, foreign keys, unique constraints
-   Queries MUST be batched or joined—no loops issuing sequential queries
-   Target: channel load < 200ms p95 for cached users

**Rationale**: Chat apps live or die by perceived latency; pagination and indexes are non-negotiable.

### VII. Realtime Correctness

Handle insert/update/delete events deterministically; teardown subscriptions on context switch.

-   De-duplicate events by `id` and `updated_at` timestamp
-   Event handlers MUST be idempotent—same event twice yields same state
-   On workspace/channel switch: unsubscribe previous channels before subscribing to new
-   Handle event ordering: if `updated_at` < current, ignore the event

**Rationale**: Realtime without determinism creates ghost messages and UI flicker.

### VIII. Quality & Reviewability

Prefer small, reviewable changes. Update docs when behavior changes.

-   Each PR should address a single concern (feature slice, bug fix, refactor)
-   When contracts, RLS policies, or data models change, update relevant docs in the same PR
-   Reference files: [docs/spec.md](docs/spec.md), [docs/contracts.md](docs/contracts.md), [docs/rls.md](docs/rls.md)
-   Code must be explainable line-by-line; avoid "clever" one-liners

**Rationale**: Reviewers catch more bugs in small diffs; stale docs cause production incidents.

### IX. Testing

Add tests or documented manual checklists for critical paths.

Required coverage areas:

-   **Authz/Tenancy Boundaries**: User A cannot access Workspace B resources
-   **Message CRUD**: Create, read, update, delete with RLS enforcement
-   **Reaction Uniqueness**: Same user cannot add duplicate emoji to same message
-   **Pagination**: Cursor navigation, boundary conditions, empty states

Test types (choose appropriate):

-   Automated integration tests against Supabase (preferred)
-   Manual test checklist in [docs/acceptance.md](docs/acceptance.md) (minimum)

**Rationale**: Tenancy bugs are security bugs; untested CRUD is broken CRUD.

### X. Documentation

Maintain decisions, security notes, architecture overview, and sequence diagrams.

Required documentation:

-   [docs/spec.md](docs/spec.md): Feature specification and user stories
-   [docs/contracts.md](docs/contracts.md): API contracts and data schemas
-   [docs/rls.md](docs/rls.md): RLS policy definitions
-   [docs/decisions.md](docs/decisions.md): Architectural Decision Records (ADRs)
-   [docs/acceptance.md](docs/acceptance.md): Acceptance criteria and test checklists
-   At least one sequence diagram: "Send Message" flow

**Rationale**: POCs become products; undocumented systems become liabilities.

## Non-Goals

The following are explicitly OUT OF SCOPE for this POC:

-   ❌ Direct Messages (DMs)
-   ❌ File uploads
-   ❌ Video/voice calls
-   ❌ Enterprise permission matrix (granular roles beyond Admin/Member)
-   ❌ Pixel-perfect Slack UI replication
-   ❌ Push notifications
-   ❌ Message search (beyond basic filtering)

**Rationale**: Scope discipline keeps the POC deliverable. These can be added in future iterations.

## Governance

This constitution supersedes all other practices for the Smash project.

**Amendment Process**:

1. Propose change in a PR modifying this file
2. Justify the change with rationale
3. Update affected documentation (spec, contracts, RLS docs) in the same PR
4. Version bump follows semantic versioning (see below)

**Versioning Policy**:

-   **MAJOR**: Principle removal or backward-incompatible redefinition
-   **MINOR**: New principle added or existing principle materially expanded
-   **PATCH**: Clarifications, wording improvements, typo fixes

**Compliance Review**:

-   All PRs must verify alignment with Core Principles
-   Complexity deviations must be justified in PR description
-   Reference [docs/spec.md](docs/spec.md), [docs/contracts.md](docs/contracts.md), [docs/rls.md](docs/rls.md) for runtime guidance

**Version**: 1.0.0 | **Ratified**: 2025-12-28 | **Last Amended**: 2025-12-28
