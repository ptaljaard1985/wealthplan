# Admin Components

## Purpose
Admin dashboard for managing support tickets. Features a 3-column Kanban board (New → In Progress → Done) with AI-powered ticket analysis display.

## Key Files
- `kanban-board.tsx` — 3-column board. Cards show type badge (bug/feature/question), user email, details preview, creation date. Move buttons shift tickets between statuses. Sparkles icon indicates AI-analysed tickets.
- `request-detail-modal.tsx` — Full ticket view with admin notes, status/priority selectors, AI analysis display (summary, affected areas, implementation steps), and file attachment listing with download links.
- `add-request-modal.tsx` — Modal for admins to manually create support requests on behalf of users.

## Data Flow
```
Admin page → KanbanBoard fetches support_requests → displays cards by status
Card click → RequestDetailModal → admin edits status/priority/notes → Supabase update
AI analysis section reads ai_summary, ai_affected_areas, ai_implementation from ticket record
```

## Business Rules
- Only users with `is_admin = true` can access (enforced by `useAdmin()` hook in admin page)
- Ticket types: bug (red), feature (blue), question (gray) — color-coded badges
- Priority levels: P1, P2, P3 (optional)
- AI analysis fields may be double-encoded JSONB (migration-012 legacy); frontend handles both array and string-wrapped formats

## Dependencies
- **Depends on:** `components/ui/` (Modal, Badge, Button), Supabase client, `lib/formatters.ts`
- **Consumed by:** `app/(main)/admin/page.tsx`

## Important Notes
- The double-encoded JSONB handling (parsing string-wrapped arrays) is intentional — don't "fix" it without checking migration-012
- File downloads use Supabase Storage signed URLs
