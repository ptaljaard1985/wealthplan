# Client Detail Pages

## Purpose
The main feature area of the app. A tabbed layout for viewing and managing all aspects of a client family: assets, income, expenses, projections, tax, scenarios, and more.

## Key Files
- `layout.tsx` — **~1100 lines.** Fetches all family data, runs the V2 projection engine, renders portfolio chart (stacked bar by asset type) and income/expenses chart. Contains tab navigation for all child routes. This is the largest file in the codebase.
- `page.tsx` — Family overview: edit family settings, manage members (add/edit/delete)
- `assets/page.tsx` — Account management grouped by member. Add/edit/delete accounts with valuations.
- `income/page.tsx` — Income sources per member. Age-based start/end converted to calendar years.
- `expenses/page.tsx` — Family-level expenses with categories and date ranges.
- `capital-expenses/page.tsx` — One-time and recurring large expenses.
- `events/page.tsx` — Timeline milestones with icons and colors.
- `projections/page.tsx` — Area chart of portfolio value over time (Recharts). Nominal/real toggle, return % override.
- `scenarios/page.tsx` — Multi-tab analysis: summary, assets, expenses, retirement.
- `tax/page.tsx` — Per-member yearly tax breakdown using engine output.
- `calculations/page.tsx` — Year-by-year detailed tables with drill-down (growth, income, tax, expenses, cash flow).
- `retirement/page.tsx` — Retirement account listing (stub — details coming soon).
- `withdrawal-order/page.tsx` — Displays default withdrawal priority (read-only; custom ordering not yet built).
- `property/page.tsx` — Property-specific views.

## Data Flow
```
layout.tsx: fetches family + members + accounts + income + expenses + capex + events
  → runs runProjectionEngine() → passes projection data to charts
  → renders tab navigation → {children} renders active sub-page
Sub-pages: fetch their own data independently for forms/CRUD
```

## Business Rules
- **Charts re-render on every tab change** — layout.tsx re-fetches and re-runs engine when pathname changes
- **Dual-age X-axis** — For couples, chart shows both ages (e.g., "52 / 50")
- **Real vs Nominal toggle** — Deflates values using family inflation rate when "real" is selected
- **After-tax income bars** — Income chart shows post-tax income using per-member effective tax rates from engine
- **Milestone years** — Calculations page auto-detects retirement years, property sale years for display

## Dependencies
- **Depends on:** `lib/engines/` (projection engine), `lib/tax.ts`, `lib/formatters.ts`, all `components/` form modules, `recharts`
- **Consumed by:** End users (this is the primary UI)

## Important Notes
- `layout.tsx` is a known tech debt item — the chart logic should be extracted into separate components
- The layout fetches data for charts; sub-pages fetch their own data for CRUD. This means some data is fetched twice.
- Events appear as clickable dots on both portfolio and income charts
- Withdrawal order page is read-only with hardcoded default; custom ordering is not yet implemented
