# Database Schema & Migrations

## Purpose
PostgreSQL schema for Supabase with Row Level Security. Contains the base schema and 12 sequential migrations that evolved the data model from basic financial data to full auth, admin, AI analysis, and CGT support.

## Key Files
- `schema.sql` — Base tables: client_families, family_members, accounts, valuations, income, expenses, capital_expenses
- `migration-002-property.sql` — Adds property account type + rental/sale fields
- `migration-003-joint.sql` — Joint account flag
- `migration-004-events.sql` — Timeline events table
- `migration-005-family-settings.sql` — Surplus reinvestment toggles, bracket inflation, withdrawal_order table
- `migration-006-auth.sql` — **Critical:** Adds user_id to client_families, replaces all RLS with user-scoped policies
- `migration-007-admin-feedback.sql` — user_profiles (with auto-create trigger), support_requests
- `migration-008-ai-analysis.sql` — AI analysis JSONB fields on support_requests
- `migration-009-ticket-attachments.sql` — File attachments + Supabase Storage bucket
- `migration-010-ai-prompt.sql` — AI prompt field
- `migration-011-priority.sql` — Ticket priority (p1/p2/p3)
- `migration-012-fix-jsonb-encoding.sql` — Fixes double-encoded JSONB arrays
- `migration-013-cgt.sql` — CGT fields on accounts (tax_base_cost, acquisition_date, cgt_exemption_type)

## Data Flow
All data access goes through Supabase client SDK with RLS enforcement. No direct SQL from the app.

## Business Rules
- **Auth boundary:** `client_families.user_id` is the single ownership column. All child tables are scoped through nested RLS joins to this column.
- **Cascade deletes:** Deleting a family cascades to all children (members → accounts → valuations, etc.)
- **Valuation uniqueness:** One valuation per account per date (UNIQUE index)
- **User profile auto-creation:** DB trigger on `auth.users` insert creates `user_profiles` row automatically

## Dependencies
- **Consumed by:** All Supabase queries in the app (client-side and server-side)
- **Types mirror:** `lib/types/database.ts` — keep TypeScript interfaces in sync with any schema changes

## Important Notes
- Migrations are applied manually via Supabase SQL editor — no runner or version tracking
- All migrations use `IF NOT EXISTS` for idempotency — safe to re-run
- Migration-006 is the auth migration; `user_id` may still be nullable if backfill wasn't completed
- The double-encoding fix (migration-012) means old data may have string-wrapped JSON; frontend handles both
- Never modify RLS policies without understanding the cascade from client_families → child tables
