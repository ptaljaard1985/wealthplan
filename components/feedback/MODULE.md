# Feedback System

## Purpose
Floating action button + modal that lets authenticated users submit bug reports, feature requests, and questions. Submissions create support tickets and trigger AI analysis.

## Key Files
- `feedback-button.tsx` — Fixed-position FAB (bottom-right) with MessageSquarePlus icon. Only visible to authenticated users. Click opens FeedbackModal.
- `feedback-modal.tsx` — Form with request type selector, details textarea, and multi-file upload. On submit: creates ticket → uploads files to storage → links attachments → triggers AI analysis → shows success toast.

## Data Flow
```
FeedbackButton → opens FeedbackModal
FeedbackModal submit:
  1. Insert support_request to DB
  2. Upload files to Supabase Storage bucket 'ticket-attachments'
  3. Create ticket_attachments records linking files to ticket
  4. Call triggerAnalysis(ticketId) — fire-and-forget
  5. Show success message (1.5s) → close modal → reset form
```

## Business Rules
- File uploads stored under `{ticket_id}/{filename}` path in storage (RLS policies parse this path)
- AI analysis triggered automatically but non-blocking — ticket exists even if analysis fails
- Request types: bug, feature, question

## Dependencies
- **Depends on:** `components/ui/` (Modal, Button, InputField), `lib/ai/trigger-analysis.ts`, Supabase client + storage
- **Consumed by:** `app/layout.tsx` (root layout — always present when authenticated)

## Important Notes
- The button is rendered in the root layout, not per-page — it persists across all routes
- Storage path structure (`{ticket_id}/`) is relied on by RLS policies; don't change it
