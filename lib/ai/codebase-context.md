# Codebase Context (auto-generated)

## File Tree
```
app/
  (main)/
    admin/
      page.tsx
    dashboard/
      page.tsx
    layout.tsx
    loading.tsx
  api/
    analyse-ticket/
      route.ts
  auth/
    callback/
      route.ts
  clients/
    [id]/
      assets/
        page.tsx
      calculations/
        page.tsx
      capital-expenses/
        page.tsx
      events/
        page.tsx
      expenses/
        page.tsx
      income/
        page.tsx
      layout.tsx
      loading.tsx
      page.tsx
      projections/
        page.tsx
      property/
        page.tsx
      retirement/
        page.tsx
      scenarios/
        page.tsx
      tax/
        page.tsx
      withdrawal-order/
        page.tsx
  globals.css
  layout.tsx
  login/
    page.tsx
  page.tsx
components/
  accounts/
    account-form.tsx
    valuations-panel.tsx
  admin/
    add-request-modal.tsx
    kanban-board.tsx
    request-detail-modal.tsx
  app-shell.tsx
  capital-expenses/
    capital-expense-form.tsx
  client-sidebar.tsx
  events/
    event-form.tsx
  expenses/
    expense-form.tsx
  families/
    add-family-modal.tsx
    edit-family-form.tsx
    family-card.tsx
  feedback/
    feedback-button.tsx
    feedback-modal.tsx
  income/
    income-form.tsx
  members/
    member-card.tsx
    member-form.tsx
  shared/
    ticket-attachments.tsx
  top-bar.tsx
  ui/
    badge.tsx
    button.tsx
    card.tsx
    currency-input.tsx
    empty-state.tsx
    input.tsx
    modal.tsx
    page-header.tsx
    skeleton.tsx
lib/
  ai/
    analyse-ticket.ts
    codebase-context.md
    system-prompt.ts
    trigger-analysis.ts
  engines/
    helpers.ts
    projection-engine.ts
    types.ts
    withdrawal-solver.ts
  formatters.ts
  hooks/
    use-admin.ts
  projections.ts
  supabase/
    client.ts
    middleware.ts
    server.ts
  tax.ts
  types/
    database.ts
db/
  migration-002-property.sql
  migration-003-joint.sql
  migration-004-events.sql
  migration-005-family-settings.sql
  migration-006-auth.sql
  migration-007-admin-feedback.sql
  migration-008-ai-analysis.sql
  migration-009-ticket-attachments.sql
  migration-010-ai-prompt.sql
  migration-011-priority.sql
  schema.sql
```

## Routes
- API   /api/analyse-ticket
- API   /auth/callback
- PAGE  /
- PAGE  /admin
- PAGE  /clients/[id]
- PAGE  /clients/[id]/assets
- PAGE  /clients/[id]/calculations
- PAGE  /clients/[id]/capital-expenses
- PAGE  /clients/[id]/events
- PAGE  /clients/[id]/expenses
- PAGE  /clients/[id]/income
- PAGE  /clients/[id]/projections
- PAGE  /clients/[id]/property
- PAGE  /clients/[id]/retirement
- PAGE  /clients/[id]/scenarios
- PAGE  /clients/[id]/tax
- PAGE  /clients/[id]/withdrawal-order
- PAGE  /dashboard
- PAGE  /login

## Database Tables
- client_families (id, family_name, inflation_rate_pct, notes, created_at, updated_at)
- family_members (id, family_id, first_name, last_name, email, phone, date_of_birth, retirement_age, notes, created_at, updated_at)
- accounts (id, member_id, account_name, account_type, current_value, monthly_contribution, expected_return_pct, fee_pct, notes, created_at, updated_at)
- valuations (id, account_id, valuation_date, value, notes, created_at)
- income (id, member_id, label, category, monthly_amount, taxable_pct, start_year, end_year, notes, created_at)
- expenses (id, family_id, label, category, monthly_amount, start_year, end_year, notes, created_at)
- capital_expenses (id, family_id, label, amount, start_year, recurrence_interval_years, recurrence_count, notes, created_at)
- events (id, family_id, label, event_year, icon, color, notes, created_at)
- withdrawal_order (id, family_id, account_id, priority, UNIQUE(family_id,)
- user_profiles (id, email, display_name, is_admin, created_at, updated_at)
- support_requests (id, user_id, user_email, request_type, details, screen_path, status, admin_notes, created_at, updated_at)
- ticket_attachments (id, ticket_id, file_name, file_size, content_type, storage_path, uploaded_by, created_at)

## Key TypeScript Interfaces
- lib/types/database.ts: ClientFamily { id, family_name, inflation_rate_pct, reinvest_surplus_pre_retirement, reinvest_surplus_post_retirement, bracket_inflation_rate_pct, notes, user_id, created_at, updated_at }
- lib/types/database.ts: FamilyMember { id, family_id, first_name, last_name, email, phone, date_of_birth, retirement_age, notes, created_at, updated_at }
- lib/types/database.ts: Account { id, member_id, account_name, account_type, current_value, monthly_contribution, expected_return_pct, notes, created_at, updated_at, is_joint, rental_income_monthly, rental_start_year, rental_end_year, planned_sale_year, sale_inclusion_pct }
- lib/types/database.ts: Valuation { id, account_id, valuation_date, value, notes, created_at }
- lib/types/database.ts: Income { id, member_id, label, category, monthly_amount, taxable_pct, start_year, end_year, notes, created_at }
- lib/types/database.ts: Expense { id, family_id, label, category, monthly_amount, start_year, end_year, notes, created_at }
- lib/types/database.ts: CapitalExpense { id, family_id, label, amount, start_year, recurrence_interval_years, recurrence_count, notes, created_at }
- lib/types/database.ts: LifeEvent { id, family_id, label, event_year, icon, color, notes, created_at }
- lib/types/database.ts: WithdrawalOrder { id, family_id, account_id, priority }
- lib/types/database.ts: UserProfile { id, email, display_name, is_admin, created_at, updated_at }
- lib/types/database.ts: SupportRequest { id, user_id, user_email, request_type, details, screen_path, status, priority, admin_notes, ai_summary, ai_affected_areas, ai_implementation }
- lib/types/database.ts: TicketAttachment { id, ticket_id, file_name, file_size, content_type, storage_path, uploaded_by, created_at }
- lib/types/database.ts: FamilyMemberWithAccounts { accounts }
- lib/types/database.ts: FamilyMemberWithIncome { income }
- lib/types/database.ts: FamilyMemberWithAll { accounts, income }
- lib/types/database.ts: ClientFamilyWithMembers { family_members }
- lib/types/database.ts: ClientFamilySummary { family_members, member_count, total_value }
- lib/engines/types.ts: MemberConfig { memberId, name, dateOfBirth, retirementAge, retirementYear }
- lib/engines/types.ts: AccountProjectionInput { accountId, accountName, memberName, accountType, currentValue, monthlyContribution, annualReturnPct, isJoint, memberId, rentalIncomeMonthly, rentalStartYear, rentalEndYear, plannedSaleYear, saleInclusionPct }
- lib/engines/types.ts: IncomeInput { label, memberName, monthlyAmount, taxablePct, startYear, endYear, memberId, category }
- lib/engines/types.ts: ExpenseInput { label, monthlyAmount, startYear, endYear }
- lib/engines/types.ts: CapitalExpenseInput { label, amount, startYear, recurrenceIntervalYears, recurrenceCount }
- lib/engines/types.ts: WithdrawalOrderEntry { accountId, priority }
- lib/engines/types.ts: FamilySettings { reinvestSurplusPreRetirement, reinvestSurplusPostRetirement, bracketInflationRatePct }
- lib/engines/types.ts: ProjectionConfig { accounts, income, expenses, capitalExpenses, currentYear, targetYear, inflationRatePct, members, withdrawalOrder, settings }
- lib/engines/types.ts: MemberYearTax { memberId, name, age, grossIncome, taxableIncome, netTax, effectiveRate, marginalRate, monthlyTax }
- lib/engines/types.ts: AccountYearDetail { accountId, accountName, accountType, opening, contributions, growth, withdrawal, closing }
- lib/engines/types.ts: WithdrawalDetail { accountId, accountName, accountType, amount, isTaxable }
- lib/engines/types.ts: ProjectionYearResult { year, total, accounts, totalIncome, totalExpenses, capitalExpenseTotal, netCashFlow, propertySaleProceeds, rentalIncome, jointRentalIncome, memberTax, householdTax, accountDetails, withdrawalDetails, grossCashFlow, deficit, surplusReinvested, isFullyRetired, isPartiallyRetired, retiredMemberIds, depletedAccountIds, portfolioDepleted }

## Migrations
- migration-002-property.sql
- migration-003-joint.sql
- migration-004-events.sql
- migration-005-family-settings.sql
- migration-006-auth.sql
- migration-007-admin-feedback.sql
- migration-008-ai-analysis.sql
- migration-009-ticket-attachments.sql
- migration-010-ai-prompt.sql
- migration-011-priority.sql
