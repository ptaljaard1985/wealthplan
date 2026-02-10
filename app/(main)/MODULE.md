# Protected Routes

## Purpose
App shell wrapper and main entry points for authenticated users. Contains the dashboard (family listing) and admin page (support ticket management).

## Key Files
- `layout.tsx` — Wraps all child routes in `AppShell` (sidebar navigation + content area). This makes all routes under `(main)/` protected.
- `dashboard/page.tsx` — Primary landing page after login. Lists all client families as gradient cards with member count and total portfolio value. Time-based greeting. Add family button opens modal.
- `admin/page.tsx` — Admin-only page. Protected by `useAdmin()` hook (redirects non-admins to /dashboard). Renders KanbanBoard for support tickets.
- `loading.tsx` — Loading skeleton shown during page transitions.

## Data Flow
```
Auth middleware validates session → layout.tsx wraps in AppShell
Dashboard: fetches client_families with nested family_members + accounts → renders FamilyCards
Admin: fetches support_requests → renders KanbanBoard
```

## Business Rules
- Dashboard uses a nested Supabase select: `client_families(*, family_members(*, accounts(*)))` to compute totals in one query
- Family cards animate in with staggered delay (80ms per card)
- Admin access requires `user_profiles.is_admin = true`; non-admins see no admin link in sidebar

## Dependencies
- **Depends on:** `components/app-shell.tsx` (layout shell), `components/families/` (cards + modals), `components/admin/` (kanban)
- **AppShell provides:** Sidebar with "Dashboard" and conditional "Admin" link, sign-out button

## Important Notes
- The `(main)` folder is a Next.js route group — it doesn't add to the URL path
- AppShell hides sidebar on mobile (< 768px) — mobile nav is minimal
- The admin link only appears in the sidebar if `useAdmin()` returns `isAdmin: true`
