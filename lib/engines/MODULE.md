# Projection Engine

## Purpose
Year-by-year financial simulation engine. Models portfolio growth, retirement withdrawals, SA income tax, and CGT for multi-member families from now to age 100 of the youngest member.

## Key Files
- `projection-engine.ts` — V2 engine: 7-phase annual loop (growth → property sales → rental → capex → income/tax → withdrawals → reinvestment)
- `withdrawal-solver.ts` — Iterative solver for the circular dependency between withdrawals and tax. Converges in <10 iterations (45% marginal cap ensures stability).
- `helpers.ts` — `compoundGrowth()` (monthly compounding with contributions), `getCapitalExpenseForYear()`, `distributeToAccounts()` (reinvestment allocation, prefers non-retirement)
- `types.ts` — All engine input/output types (`ProjectionConfig`, `ProjectionYearResult`, `MemberYearTax`, etc.)

## Data Flow
Page fetches family data from Supabase → builds `ProjectionConfig` → calls `runProjectionEngine()` → returns `ProjectionYearResult[]` → page renders charts/tables.

## Business Rules
- **Withdrawal order default:** tax-free(1) → non-retirement(2) → property(3) → retirement(4). Custom order via `withdrawal_order` table.
- **CGT on withdrawals:** Only non-retirement accounts trigger CGT. Tracks per-member annual exclusion (R40K, inflation-indexed).
- **Property sales:** Triggered at `planned_sale_year`. Proceeds added to cash flow, CGT calculated with primary residence exclusion (R2M) if applicable.
- **Retirement detection:** Per-member based on `retirementYear`. Partial retirement (one member retired) and full retirement (all) handled differently.
- **Surplus reinvestment:** Controlled by family settings. Distributes to non-retirement first, then tax-free, then retirement.

## Dependencies
- **Depends on:** `lib/tax.ts` (tax bracket calculations, CGT)
- **Consumed by:** `app/clients/[id]/layout.tsx` (charts), `calculations/page.tsx`, `scenarios/page.tsx`, `tax/page.tsx`
- **Legacy wrapper:** `lib/projections.ts` calls V2 engine with backward-compatible interface

## Important Notes
- Always use V2 engine (`runProjectionEngine`) for new features — never the legacy wrapper for new code
- Withdrawal solver has no explicit divergence handling; safe given SA tax structure but would need review if tax rules change dramatically
- Engine re-runs on every tab navigation (fetched in layout.tsx's useEffect with pathname dependency)
