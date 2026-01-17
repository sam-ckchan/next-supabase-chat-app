---
description: Repository Information Overview
alwaysApply: true
---

# Smash - Multi-Workspace Chat Application

## Summary
Slack-like multi-workspace chat application with channels, real-time messaging, threads, reactions, and presence. Built as a proof-of-concept deployed on Vercel with Supabase backend (Postgres + Auth + Realtime). Supports workspace and channel management, real-time message updates, threaded conversations, emoji reactions, and user presence tracking.

## Structure
- **src/app/** - Next.js App Router pages and layouts (login, workspace, channels)
- **src/components/** - Reusable React components
- **src/hooks/** - Custom React hooks for data fetching and state
- **src/lib/** - Utility functions and helpers
- **src/services/** - Business logic and data access layer
- **src/stores/** - Zustand state management stores
- **src/types/** - TypeScript type definitions and schemas
- **supabase/** - Database migrations, seed data, and Supabase configuration
- **tests/** - Unit tests (Vitest) and E2E tests (Playwright)
- **docs/** - Technical specifications and documentation (spec.md, contracts.md, rls.md, acceptance.md)

## Language & Runtime
**Language**: TypeScript 5.9.3  
**Framework**: Next.js 16.1.1 (App Router)  
**Build System**: Next.js build system  
**Package Manager**: pnpm

## Dependencies
**Main Dependencies**:
- `next` ^16.1.1 - React framework for production
- `react` ^19.2.3, `react-dom` ^19.2.3 - React library
- `@supabase/supabase-js` ^2.90.1, `@supabase/ssr` ^0.8.0 - Supabase client and SSR utilities
- `@tanstack/react-query` ^5.90.16 - Server state management
- `zustand` ^5.0.10 - Client-side state management
- `zod` ^4.3.5 - TypeScript-first schema validation

**Development Dependencies**:
- `typescript` ^5.9.3 - TypeScript compiler
- `@playwright/test` ^1.57.0 - E2E testing framework
- `vitest` ^4.0.17 - Unit testing framework
- `@vitejs/plugin-react` ^5.1.2 - Vite React plugin
- `@testing-library/jest-dom` ^6.9.1 - Testing utilities
- `tailwindcss` ^4.1.18, `@tailwindcss/postcss` ^4.1.18 - CSS framework
- `eslint` ^9.39.2, `eslint-config-next` ^16.1.1 - Linting
- `prettier` ^3.7.4 - Code formatting

## Build & Installation
```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Linting
pnpm lint
```

## Supabase Configuration
**Local Development**: Supabase local instance configured via `supabase/config.toml`
**Database**: PostgreSQL 15
**Services**:
- API server on port 54321
- Database on port 54322
- Studio UI on port 54323
- Inbucket (email testing) on port 54324
- Auth with JWT (1-hour expiry)
- Realtime enabled for live updates
- Storage with 50MiB file size limit

**Database Schema**: 
- Migrations in `supabase/migrations/` covering workspaces, channels, messages, and RLS policies
- Seed data in `supabase/seed.sql`

**Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous/public API key

## Main Files
**Entry Points**:
- `src/app/layout.tsx` - Root layout component
- `src/app/page.tsx` - Home page
- `src/app/login/page.tsx` - Login page
- `src/app/(workspace)/[workspaceId]/` - Workspace pages
- `src/middleware.ts` - Next.js middleware for auth

**Configuration**:
- `next.config.mjs` - Next.js configuration
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*` → `./src/*`)
- `.env.local.example` - Environment variables template
- `supabase/config.toml` - Supabase local configuration

## Testing

### Unit Tests (Vitest)
**Framework**: Vitest 4.0.17 with jsdom environment  
**Test Location**: `tests/` directory  
**Configuration**: `vitest.config.ts`  
**Setup**: `tests/setup.ts` for global test configuration  
**Run Command**:
```bash
pnpm test
```

### E2E Tests (Playwright)
**Framework**: Playwright 1.57.0  
**Test Location**: `tests/e2e/`  
**Naming Convention**: `*.spec.ts`  
**Configuration**: `playwright.config.ts`
- Base URL: `http://localhost:3000`
- Browser: Chromium (Desktop Chrome)
- Web server: Automatically starts dev server for tests
- Parallel execution enabled

**Run Command**:
```bash
pnpm test:e2e
```

## Code Quality
**ESLint**: Next.js core-web-vitals configuration (`.eslintrc.js`)  
**Prettier**: Configured with 2-space tabs, semicolons, double quotes, 100-char line width (`.prettierrc`)  
**PostCSS**: Configured for Tailwind CSS processing (`postcss.config.js`)
