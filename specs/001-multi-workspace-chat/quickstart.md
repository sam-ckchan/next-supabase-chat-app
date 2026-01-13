# Quickstart: Realtime Messaging

**Feature**: Multi-Workspace Chat  
**Date**: 2026-01-13

## Prerequisites

-   Node.js 20+
-   pnpm (or npm/yarn)
-   Supabase CLI installed (`brew install supabase/tap/supabase`)
-   Supabase project (local or hosted)

## 1. Clone and Install

```bash
git clone <repo-url>
cd smash
pnpm install
```

## 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## 3. Start Supabase Locally

```bash
supabase start
```

This starts:

-   Postgres on port 54322
-   Supabase API on port 54321
-   Realtime on port 54321 (same as API)

## 4. Run Migrations

```bash
supabase db push
```

Or apply manually:

```bash
supabase migration up
```

## 5. Seed Test Data (Optional)

```bash
supabase db seed
```

Creates:

-   2 test users
-   2 workspaces
-   3 channels
-   Sample messages

## 6. Start Dev Server

```bash
pnpm dev
```

Open http://localhost:3000

## 7. Test Realtime

1. Open two browser windows (or incognito)
2. Log in as different users
3. Join same workspace/channel
4. Send message in one window
5. Verify it appears in other window instantly

## Quick Commands

| Command                         | Description                   |
| ------------------------------- | ----------------------------- |
| `pnpm dev`                      | Start Next.js dev server      |
| `pnpm build`                    | Production build              |
| `pnpm lint`                     | Run ESLint                    |
| `pnpm test`                     | Run unit tests                |
| `pnpm test:e2e`                 | Run Playwright e2e tests      |
| `supabase start`                | Start local Supabase          |
| `supabase stop`                 | Stop local Supabase           |
| `supabase db reset`             | Reset DB and rerun migrations |
| `supabase gen types typescript` | Regenerate DB types           |

## Troubleshooting

### Realtime not working

1. Check Supabase is running: `supabase status`
2. Verify `messages` table is in realtime publication:
    ```sql
    SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
    ```
3. Check browser console for WebSocket errors

### RLS blocking access

1. Verify user is authenticated: check Supabase auth cookies
2. Verify workspace membership exists in `workspace_members`
3. Test RLS policy directly:
    ```sql
    SET request.jwt.claim.sub = '<user-id>';
    SELECT * FROM messages WHERE channel_id = '<channel-id>';
    ```

### Messages not appearing

1. Check channel_id filter matches subscription
2. Verify INSERT succeeded (check Postgres logs)
3. Check for JavaScript errors in event handler
