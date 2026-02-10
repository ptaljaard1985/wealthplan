# Family Components

## Purpose
CRUD interface for client families — the top-level entity in the data model. Includes the visual family cards on the dashboard and modal forms for creating/editing families.

## Key Files
- `add-family-modal.tsx` — Modal form for creating a new family. Fields: name (required), inflation rate (default 6%), notes.
- `edit-family-form.tsx` — Inline form for updating family settings. Same fields as create.
- `family-card.tsx` — Dashboard display card with animated gradient accent, member count, total portfolio value, and created date.

## Data Flow
```
Dashboard page → AddFamilyModal → Supabase insert → onCreated callback → dashboard refreshes
Dashboard page → FamilyCard (display only) → click navigates to /clients/{id}
Client info page → EditFamilyForm → Supabase update → onSaved callback
```

## Business Rules
- `inflation_rate_pct` defaults to 6% (SA typical). Used by the projection engine for all future value calculations.
- Family name is the only required field.
- Family cards rotate through 4 gradient color schemes based on index.

## Dependencies
- **Depends on:** `components/ui/` (Modal, InputField, Card), Supabase client, `lib/formatters.ts`
- **Consumed by:** `app/(main)/dashboard/page.tsx`, `app/clients/[id]/page.tsx`
