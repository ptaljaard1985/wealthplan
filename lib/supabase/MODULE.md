# Supabase Client Setup

## Purpose
Configures Supabase clients for browser, server, and middleware contexts. Handles auth session management, JWT refresh, and route guards.

## Key Files
- `client.ts` — Browser client via `createBrowserClient()`. Used in all `"use client"` components.
- `server.ts` — Server-side client via `createServerClient()`. Reads cookies for auth context. Used in Server Components and API routes.
- `middleware.ts` — Auth middleware: validates JWT via `auth.getClaims()`, refreshes expired tokens, redirects unauthenticated users to `/login`, redirects authenticated users from `/login` to `/dashboard`.

## Data Flow
```
Browser request → middleware.ts (JWT refresh + route guard)
  → Page component → client.ts (browser Supabase queries with RLS)
  → API route → server.ts (server Supabase queries with RLS)
```

## Business Rules
- Public routes: `/`, `/login`, `/auth/*` — no auth required
- All other routes require valid session
- JWT stored in HTTP-only cookies (set by `@supabase/ssr`)
- Server client cookie writes wrapped in try-catch (Server Components are read-only)

## Dependencies
- **Depends on:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
- **Consumed by:** Every page, component, and API route that touches data
- **Called from:** Root `middleware.ts` delegates to this module's `updateSession()`

## Important Notes
- Always use `createClient()` from `client.ts` in browser code, `createClient()` from `server.ts` in server code — never mix them
- The middleware runs on every non-static request; keep it lightweight
- Cookie handling differences between Server Components (read-only) and Route Handlers (read-write) are handled internally
