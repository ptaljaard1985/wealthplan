# AI Ticket Analysis

## Purpose
Analyses support tickets using Claude Sonnet to generate structured summaries, identify affected code areas, and suggest implementation steps. Results are stored on the ticket and displayed in the admin Kanban board.

## Key Files
- `analyse-ticket.ts` — Core function: formats ticket + attachments into a Claude message, calls API, parses JSON response into `TicketAnalysis` object.
- `system-prompt.ts` — Builds system prompt from auto-generated `codebase-context.md`. Instructs Claude to return JSON with summary, affectedAreas, implementation steps, and a ready-to-paste prompt.
- `trigger-analysis.ts` — Fire-and-forget `fetch()` to `/api/analyse-ticket`. Called after ticket creation. Non-blocking, silently ignores errors.
- `codebase-context.md` — **Auto-generated, git-ignored.** Created by `scripts/generate-codebase-context.ts` on every build (`prebuild` hook). Contains file tree, routes, DB tables, and TypeScript interfaces.

## Data Flow
```
User submits feedback → FeedbackModal creates support_request → triggerAnalysis(id)
  → POST /api/analyse-ticket → analyse-ticket.ts → Claude Sonnet API
  → Stores ai_summary, ai_affected_areas, ai_implementation, ai_prompt on ticket
  → Admin views analysis in RequestDetailModal
```

## Business Rules
- Only ticket owner or admin can trigger analysis (validated in API route)
- Text-based attachments included in analysis (max 5 files, 2000 chars each)
- Analysis status tracks: pending → analyzing → done/error
- Analysis auto-saved as .md attachment on the ticket
- Model: `claude-sonnet-4-20250514`

## Dependencies
- **Depends on:** `ANTHROPIC_API_KEY` env var, `@anthropic-ai/sdk`, Supabase (for ticket data)
- **Consumed by:** `app/api/analyse-ticket/route.ts`, `components/feedback/feedback-modal.tsx`

## Important Notes
- `codebase-context.md` is regenerated on build — never edit it manually
- If the Anthropic API key is missing, analysis silently fails (no user-facing error)
- The generated prompt field (`ai_prompt`) is designed for copy-paste into Claude Code sessions
