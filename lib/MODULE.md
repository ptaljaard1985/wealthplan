# Lib Root Utilities

## Purpose
Standalone utility modules for tax calculations, value formatting, and the legacy projection wrapper. These are the most-imported files in the codebase.

## Key Files
- `tax.ts` — SA income tax (SARS 2025/2026 brackets) and CGT calculations. Hardcoded constants that must be updated each tax year.
- `formatters.ts` — Currency (`formatCurrency`, `formatCurrencyCompact`, `formatCurrencyPrecise`), date, percentage, age, and file size formatters. All currency is ZAR.
- `projections.ts` — Legacy backward-compatible wrapper. Calls V2 engine internally. Do not use for new features.

## Business Rules
**Tax (tax.ts):**
- 7 income tax brackets (18%–45%) with bracket inflation support (default 2%/year)
- Age-based rebates: primary (all), secondary (≥65), tertiary (≥75)
- CGT: 40% inclusion rate, R40K annual exclusion (indexed), R2M primary residence exclusion, R300K death exclusion
- Percentages stored as raw numbers (e.g., `6` = 6%), scaled inside calculation functions

**Formatters (formatters.ts):**
- `formatCurrency` → "R 1 234 567" (0 decimals)
- `formatCurrencyCompact` → "R 1.5M" or "R 250K"
- `formatCurrencyPrecise` → "R 1 234 567.89" (2 decimals)
- `calculateAge(dob)` considers month/day for exact age
- `calculateRetirementYear(dob, retirementAge)` used throughout for year conversions

## Dependencies
- **tax.ts** consumed by: `lib/engines/projection-engine.ts`, `lib/engines/withdrawal-solver.ts`, tax page
- **formatters.ts** consumed by: nearly every page and component
- **projections.ts** consumed by: older components that haven't migrated to V2 engine directly

## Important Notes
- When SARS updates tax tables (annually, usually February budget speech), update constants in `tax.ts`
- Never change formatter output format without checking all consumers — charts and tables depend on consistent formatting
- `projections.ts` exists only for backward compatibility; new code should import from `lib/engines/` directly
