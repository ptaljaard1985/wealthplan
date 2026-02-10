# Account Components

## Purpose
Forms and panels for managing financial accounts (retirement, non-retirement, tax-free, property) and their historical valuations.

## Key Files
- `account-form.tsx` — Modal form for creating/editing accounts. Handles all 4 account types with conditional fields for property (rental income, planned sale) and CGT (base cost, acquisition date, exemption type).
- `valuations-panel.tsx` — Inline collapsible panel showing historical valuations for an account. Add/delete valuation entries (date + value).

## Data Flow
```
Assets page → AccountForm (modal) → Supabase upsert → onSaved callback → page refreshes
Assets page → ValuationsPanel → Supabase insert/delete → re-fetches valuations
```

## Business Rules
- Account types: retirement, non-retirement, tax-free, property. Property unlocks extra fields.
- `current_value` is what the projection engine uses. Valuations are an audit trail — they don't auto-update `current_value`.
- Joint accounts (`is_joint`) are flagged but still owned by one member. Shared display is handled in UI.
- CGT fields (`tax_base_cost`, `acquisition_date`, `cgt_exemption_type`) only relevant for non-retirement and property accounts.
- Valuations have a unique constraint: one per account per date.

## Dependencies
- **Depends on:** `components/ui/` (Modal, InputField, CurrencyInput, SelectField), Supabase client
- **Consumed by:** `app/clients/[id]/assets/page.tsx`

## Important Notes
- The member dropdown in AccountForm requires members to be passed as props — it doesn't fetch them itself
- CurrencyInput emits strings; AccountForm parses to number with `parseFloat(value.replace(/,/g, ''))` before saving
