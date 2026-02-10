# UI Primitives

## Purpose
Reusable design system components used across the entire app. All styled with CSS custom properties from `app/globals.css` and CSS classes — not Tailwind utilities.

## Key Files
- `button.tsx` — `Button` with variants (primary/secondary/ghost), sizes (sm/md), loading state with spinner
- `card.tsx` — `Card` container with optional hover effect
- `modal.tsx` — `Modal` dialog: Escape to close, backdrop click to close, title + footer slots
- `input.tsx` — `InputField`, `TextareaField`, `SelectField` — all support label + error display
- `currency-input.tsx` — `CurrencyInput`: formats with commas on blur, emits clean numeric string via onChange
- `badge.tsx` — `Badge` + specialized `AccountTypeBadge`, `IncomeCategoryBadge`
- `page-header.tsx` — `PageHeader` with title, subtitle, optional action button
- `skeleton.tsx` — `Skeleton`, `SkeletonCard`, `SkeletonTable` loading placeholders
- `empty-state.tsx` — `EmptyState` with icon, title, body, optional action
- `error-boundary.tsx` — React error boundary wrapper

## Data Flow
These are leaf components — they receive props and render. No data fetching.

## Business Rules
- `CurrencyInput` stores value as string internally, emits clean numeric string (no commas) to parent. Parent parses to number on save.
- `Modal` traps focus; always provide `onClose` handler.

## Dependencies
- **Depends on:** CSS custom properties (`--brand-*`, `--space-*`, `--text-*`, etc.) from `globals.css`, Lucide icons
- **Consumed by:** Every form and page in the app

## Important Notes
- **Follow the CSS custom properties pattern** — use inline styles with `var(--space-4)` etc., not Tailwind classes
- Components use CSS classes defined in `globals.css` (e.g., `.btn-primary`, `.card`, `.input`, `.modal-backdrop`)
- `"use client"` only on interactive components (Button, Modal, Input, CurrencyInput, ErrorBoundary)
- Static display components (Card, Badge, PageHeader, Skeleton, EmptyState) are server-compatible
