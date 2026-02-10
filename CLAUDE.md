# CLAUDE.md — Wealth Projector

> This file is the persistent context for every Claude Code session. Read it fully before making changes. Keep it accurate — update it when you change architecture, add features, or fix bugs.

---

## 1. Project Overview

**Wealth Projector** is an internal CRM and financial planning tool for **Simple Wealth**, a 2-person financial advisory firm in South Africa. It models multi-member family portfolios, projects asset growth over time, calculates South African income tax and capital gains tax (CGT), and helps advisors visualise retirement readiness for their clients.

**Users:** The two advisors at Simple Wealth (plus an admin role for managing support requests).

**Key domain concepts:**
- A **Client Family** has 1–2 **Family Members** (typically a couple)
- Each member owns **Accounts** (retirement, non-retirement, tax-free, property)
- Accounts have **Valuations** (point-in-time snapshots)
- Members have **Income** sources; Families have shared **Expenses** and **Capital Expenses**
- The **Projection Engine** runs a year-by-year simulation from now to age 100 of the youngest member
- **Withdrawal Order** controls which accounts are drawn down first in retirement
- **Events** are timeline milestones (e.g. "Kids leave home", "Downsize property")

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| UI | React 19, CSS custom properties (see Architecture Decisions) |
| Charts | Recharts 3.7 |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) with Row Level Security (RLS) |
| Auth | Supabase Auth (email/password, JWT in HTTP-only cookies) |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) for ticket analysis |
| Deployment | Vercel + Supabase Cloud |
| Fonts | Instrument Sans (body), Geist Mono (monospace) |

**Key dependencies:** `@supabase/ssr`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `recharts`, `lucide-react`

---

## 3. Architecture Decisions

> **DO NOT CHANGE without discussion** — these are deliberate choices.

### Styling: CSS Custom Properties
The app uses a custom design system defined in `app/globals.css` via CSS custom properties (`--brand-*`, `--gray-*`, `--space-*`, `--text-*`, `--surface-*`, `--border-*`, `--shadow-*`). Tailwind CSS is installed but the existing codebase uses inline styles referencing these CSS variables. **Follow this existing pattern** — use the CSS custom properties and inline styles, not Tailwind utility classes. If a future decision is made to migrate to Tailwind utilities, it should be done as a deliberate refactor, not piecemeal.

### Data Fetching: Client-Side via Supabase
Most pages are `"use client"` components that fetch data using `createClient()` from `@/lib/supabase/client` in `useEffect` / `useCallback`. This is the established pattern. Both client-side and server-side approaches are acceptable going forward — be pragmatic.

### Monetary Values
- **Database:** `numeric(18,2)` in PostgreSQL — precise decimal storage
- **TypeScript:** JavaScript `number` (sufficient precision for financial planning scale)
- **Display:** Use formatters from `lib/formatters.ts` (`formatCurrency`, `formatCurrencyCompact`, `formatCurrencyPrecise`)
- **Input:** `CurrencyInput` component handles formatting; stores as string until parsed to number on save
- **Percentages:** Stored as the raw number (e.g., `6` means 6%), scaled in calculation functions

### Auth & RLS
- Supabase Auth with email/password sign-in
- JWT stored in HTTP-only cookies, refreshed in middleware
- RLS policies scope data by `auth.uid() = user_id` on `client_families`, with nested policies cascading to child tables
- Admin flag on `user_profiles.is_admin` — checked via `useAdmin()` hook

### Tax Calculations
- SARS 2025/2026 tax year brackets, rebates, and thresholds are **hardcoded** in `lib/tax.ts`
- CGT constants (annual exclusion R40K, inclusion rate 40%, primary residence exclusion R2M) in same file
- Bracket inflation is supported (default 2%) for multi-year projections
- **When SARS updates tax tables**, update the constants in `lib/tax.ts`

### Projection Engine (V2)
- Core engine: `lib/engines/projection-engine.ts` — runs a 7-phase annual loop
- Withdrawal solver: `lib/engines/withdrawal-solver.ts` — iterative solver for tax-withdrawal circularity
- Legacy wrapper: `lib/projections.ts` — backward-compatible interface that calls V2 engine
- **Always use the V2 engine** (`runProjectionEngine` from `lib/engines/projection-engine.ts`) for new features

### Database Migrations
- Located in `db/` — numbered sequentially (`migration-002-*.sql` through `migration-013-*.sql`)
- Base schema: `db/schema.sql`
- All migrations use `IF NOT EXISTS` for idempotency
- Applied manually via Supabase SQL editor (no migration runner)

---

## 4. Folder Structure

```
wealthplan/
├── app/
│   ├── (main)/              # Protected routes (wrapped in AppShell)
│   │   ├── admin/           # Admin dashboard (Kanban board for support tickets)
│   │   ├── dashboard/       # Family listing page (main entry point after login)
│   │   └── layout.tsx       # Wraps children in AppShell
│   ├── api/
│   │   └── analyse-ticket/  # POST endpoint — AI ticket analysis via Claude
│   ├── auth/
│   │   └── callback/        # Supabase auth callback handler
│   ├── clients/
│   │   └── [id]/            # Per-family pages (layout has overview chart + tabs)
│   │       ├── assets/      # Account management
│   │       ├── calculations/# Detailed year-by-year calculation tables
│   │       ├── capital-expenses/
│   │       ├── events/      # Timeline milestone events
│   │       ├── expenses/
│   │       ├── income/
│   │       ├── projections/ # Line/area chart of portfolio over time
│   │       ├── property/    # Property-specific views
│   │       ├── retirement/  # Retirement readiness analysis
│   │       ├── scenarios/   # Multi-tab scenario analysis
│   │       ├── tax/         # Per-member tax breakdown
│   │       └── withdrawal-order/ # Custom withdrawal priority
│   ├── login/               # Login page
│   ├── globals.css          # Design system (CSS custom properties)
│   ├── layout.tsx           # Root layout (fonts, FeedbackButton)
│   └── page.tsx             # Landing page (redirects to dashboard if auth'd)
├── components/
│   ├── accounts/            # Account forms, valuations panel
│   ├── admin/               # Kanban board, request modals
│   ├── capital-expenses/    # Capital expense form
│   ├── events/              # Event form
│   ├── expenses/            # Expense form
│   ├── families/            # Family cards, add/edit modals
│   ├── feedback/            # Floating feedback button + modal
│   ├── income/              # Income form
│   ├── members/             # Member cards, member form
│   ├── shared/              # Cross-cutting components (ticket attachments)
│   ├── ui/                  # Reusable primitives (Button, Card, Modal, Input, Badge, etc.)
│   ├── app-shell.tsx        # Main app layout (sidebar + content)
│   ├── client-sidebar.tsx   # Per-family navigation sidebar
│   └── top-bar.tsx          # Static page header
├── db/
│   ├── schema.sql           # Base database schema
│   └── migration-*.sql      # Sequential migrations (002–013)
├── lib/
│   ├── ai/                  # AI ticket analysis (Anthropic SDK)
│   │   ├── analyse-ticket.ts
│   │   ├── codebase-context.md  # Auto-generated (git-ignored)
│   │   ├── system-prompt.ts
│   │   └── trigger-analysis.ts
│   ├── engines/             # Core financial calculation engine
│   │   ├── helpers.ts       # Compound growth, reinvestment distribution
│   │   ├── projection-engine.ts  # V2 engine (7-phase annual loop)
│   │   ├── types.ts         # Engine input/output types
│   │   └── withdrawal-solver.ts  # Iterative withdrawal-tax solver
│   ├── hooks/
│   │   └── use-admin.ts     # Admin role check hook
│   ├── supabase/            # Supabase client setup
│   │   ├── client.ts        # Browser client
│   │   ├── middleware.ts     # Auth middleware (JWT refresh, route guards)
│   │   └── server.ts        # Server-side client
│   ├── types/
│   │   └── database.ts      # TypeScript interfaces matching DB schema
│   ├── formatters.ts        # Currency, date, percentage, age formatters
│   ├── projections.ts       # Legacy wrapper around V2 engine
│   └── tax.ts               # SA income tax + CGT calculations
├── scripts/
│   └── generate-codebase-context.ts  # Generates lib/ai/codebase-context.md
├── middleware.ts             # Next.js middleware (delegates to supabase middleware)
├── next.config.ts
├── tsconfig.json             # Strict mode, @/* path alias
└── package.json
```

---

## 5. Database Schema Summary

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `client_families` | Top-level entity. One per client family. | `family_name`, `inflation_rate_pct` (default 6%), `user_id` (owner), `reinvest_surplus_pre/post_retirement`, `bracket_inflation_rate_pct` |
| `family_members` | Individuals in a family (max 2) | `family_id` → client_families, `first_name`, `last_name`, `date_of_birth`, `retirement_age` (default 65) |
| `accounts` | Financial accounts per member | `member_id` → family_members, `account_type` (retirement/non-retirement/tax-free/property), `current_value`, `monthly_contribution`, `expected_return_pct`, `is_joint`, property fields, CGT fields |
| `valuations` | Point-in-time account snapshots | `account_id` → accounts, `valuation_date` (unique per account), `value` |
| `income` | Income sources per member | `member_id` → family_members, `category` (salary/rental/pension/other), `monthly_amount`, `taxable_pct`, `start_year`, `end_year` |
| `expenses` | Shared family expenses | `family_id` → client_families, `category`, `monthly_amount`, `start_year`, `end_year` |
| `capital_expenses` | One-time or recurring large expenses | `family_id`, `amount`, `start_year`, `recurrence_interval_years`, `recurrence_count` |
| `events` | Timeline milestones | `family_id`, `label`, `event_year`, `icon`, `color` |
| `withdrawal_order` | Custom account drawdown priority | `family_id`, `account_id`, `priority` (unique per family) |

### Auth & Admin Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User metadata + `is_admin` flag. Auto-created on signup via DB trigger. |
| `support_requests` | Bug/feature/question tickets. Status: new → in_progress → done. AI fields: `ai_summary`, `ai_affected_areas`, `ai_implementation`, `ai_prompt`, `ai_analysis_status` |
| `ticket_attachments` | Files attached to support requests. Stored in Supabase Storage bucket `ticket-attachments`. |

### Key Relationships
```
client_families (1) → (N) family_members (1) → (N) accounts (1) → (N) valuations
client_families (1) → (N) expenses
client_families (1) → (N) capital_expenses
client_families (1) → (N) events
client_families (1) → (N) withdrawal_order → accounts
family_members (1) → (N) income
```

---

## 6. API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/analyse-ticket` | AI-analyses a support request using Claude Sonnet. Validates auth (owner or admin), fetches ticket + text attachments, calls Anthropic API, stores structured analysis (summary, affected areas, implementation steps). |
| GET | `/auth/callback` | Supabase auth callback — exchanges code for session. |

All other data operations go directly through Supabase client SDK (no API routes needed thanks to RLS).

---

## 7. Code Conventions

### Component Patterns
- **Client components** use `"use client"` directive at top of file
- **Forms** are modal-based: parent opens modal → form component handles create/update → calls `onSaved`/`onCreated` callback → parent refreshes data
- **Data fetching** in pages: `useCallback` for fetch function, `useEffect` to trigger on mount or route change
- **Loading states**: `useState(true)` initial, set false after fetch. `Skeleton` components for loading UI.
- **Error handling**: Try-catch around Supabase calls, `window.alert()` for user-facing errors (simple but effective for internal tool)

### Naming
- Files: kebab-case (`account-form.tsx`, `use-admin.ts`)
- Components: PascalCase (`AccountForm`, `FamilyCard`)
- Functions/variables: camelCase (`fetchData`, `calculateProjections`)
- Types/interfaces: PascalCase (`ClientFamily`, `ProjectionYearResult`)
- Database columns: snake_case (`family_name`, `current_value`)
- CSS variables: kebab-case with category prefix (`--brand-500`, `--space-4`, `--text-sm`)

### Exports
- Components: `export default function ComponentName`
- Utilities/types: Named exports (`export function`, `export interface`)
- No barrel files (index.ts re-exports)

### TypeScript
- Strict mode enabled
- Path alias: `@/*` maps to project root
- Database types in `lib/types/database.ts` — keep in sync with schema
- Engine types in `lib/engines/types.ts`

---

## 8. Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key (RLS enforced) |
| `ANTHROPIC_API_KEY` | Server only | Claude API key for ticket analysis |

---

## 9. Current Feature Status

### ✅ Complete
- Family management (create, edit, delete families)
- Member management (add, edit, delete members with DOB and retirement age)
- Account management (4 types: retirement, non-retirement, tax-free, property)
- Valuations history per account
- Income sources per member (salary, rental, pension, other)
- Expenses per family (with categories and date ranges)
- Capital expenses (one-time and recurring)
- Life events / timeline milestones
- Withdrawal order (custom account drawdown priority)
- V2 Projection Engine (multi-member, 7-phase annual loop)
- Portfolio chart (stacked bar by asset type, drag-to-zoom, nominal/real toggle)
- Income & Expenses chart (stacked income bars, expense line, gross income line)
- Tax calculations (SARS 2025/2026 brackets, rebates, age-based thresholds)
- CGT calculations (annual exclusion, primary residence exclusion, inclusion rate)
- Scenario analysis (multi-tab: summary, assets, expenses, retirement)
- Tax view (per-member yearly tax breakdown)
- Authentication (email/password via Supabase)
- RLS (data scoped to authenticated user)
- Admin dashboard (Kanban board for support tickets)
- Feedback system (floating button, modal with file uploads)
- AI ticket analysis (Claude analyses support requests, stores structured output)
- Joint account support
- Property features (rental income, planned sale, CGT on disposal)
- Surplus reinvestment (pre/post retirement toggles)
- Bracket inflation for multi-year tax projections

### 🔧 In Progress / Partial
- Calculations page (year-by-year detailed tables — page exists but may need refinement)
- Retirement readiness page (exists but evolving)
- Mobile responsiveness (sidebar hidden on mobile, but not fully optimised)

### ❌ Not Started
- *(Add planned features here as they're decided)*

---

## 10. Known Issues / Tech Debt

1. **Double-encoded JSONB** — Migration 012 fixed double-encoded `ai_affected_areas` and `ai_implementation` fields, but any data written before that migration may still be double-encoded. The frontend handles both formats.

2. **Alert-based error handling** — Most forms use `window.alert()` for errors. Fine for an internal 2-person tool but not scalable if the user base grows.

3. **No test suite** — No unit or integration tests exist. The projection engine and tax calculations are the highest-value targets for testing.

4. **Client layout file is very large** — `app/clients/[id]/layout.tsx` contains the entire overview chart implementation (~1100 lines). Could be extracted into separate chart components.

5. **Manual migration application** — Migrations are applied manually via Supabase SQL editor. No migration runner or version tracking.

6. **Tax table updates** — SARS tax brackets in `lib/tax.ts` are hardcoded for 2025/2026. Must be manually updated each tax year.

7. **Withdrawal solver convergence** — Assumes convergence in 10 iterations with <R100 delta. This is safe given the 45% marginal rate cap but has no explicit divergence handling.

8. **Generated codebase context** — `lib/ai/codebase-context.md` is auto-generated by `scripts/generate-codebase-context.ts` and is git-ignored. It's regenerated on every build via the `prebuild` script.

---

## 11. Session Log

> Track what each session changed. Append new entries — don't delete old ones.

### Template
```
### Session — YYYY-MM-DD
**Focus:** [Brief description of what was worked on]
**Changes:**
- [File changed]: [What was done]
**Decisions:**
- [Any architectural or design decisions made]
**Follow-up:**
- [Anything left incomplete or to revisit]
```

---

### Session — 2026-02-10
**Focus:** Created CLAUDE.md for persistent session context
**Changes:**
- `CLAUDE.md`: Created with full project documentation
**Decisions:**
- CSS custom properties is the established styling pattern — follow it until a deliberate migration decision is made
- Both client-side and server-side data fetching are acceptable
**Follow-up:**
- Add planned features to "Not Started" section when decided
- Consider adding unit tests for projection engine and tax calculations
