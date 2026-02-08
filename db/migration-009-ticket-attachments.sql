-- Migration 009: File attachments for support tickets
-- Creates ticket_attachments table, storage bucket, and RLS policies

-- ── ticket_attachments table ──────────────────────────────────
create table if not exists public.ticket_attachments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.support_requests(id) on delete cascade,
  file_name     text not null,
  file_size     bigint not null,
  content_type  text not null,
  storage_path  text not null,
  uploaded_by   uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- Indexes
create index if not exists idx_ticket_attachments_ticket_id on public.ticket_attachments(ticket_id);

-- RLS
alter table public.ticket_attachments enable row level security;

-- Users can read attachments on their own tickets
create policy "Users read own ticket attachments"
  on public.ticket_attachments for select
  using (
    exists (
      select 1 from public.support_requests
      where id = ticket_id and user_id = auth.uid()
    )
  );

-- Users can insert attachments on their own tickets
create policy "Users insert own ticket attachments"
  on public.ticket_attachments for insert
  with check (
    auth.uid() = uploaded_by
    and exists (
      select 1 from public.support_requests
      where id = ticket_id and user_id = auth.uid()
    )
  );

-- Admins can read all attachments
create policy "Admins read all attachments"
  on public.ticket_attachments for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Admins can insert attachments on any ticket
create policy "Admins insert all attachments"
  on public.ticket_attachments for insert
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Admins can delete attachments
create policy "Admins delete attachments"
  on public.ticket_attachments for delete
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── Storage bucket ────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

-- Storage policies: ticket owner can upload
create policy "Ticket owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.support_requests
      where id = (storage.foldername(name))[1]::uuid
        and user_id = auth.uid()
    )
  );

-- Storage policies: ticket owner can download
create policy "Ticket owner download"
  on storage.objects for select
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.support_requests
      where id = (storage.foldername(name))[1]::uuid
        and user_id = auth.uid()
    )
  );

-- Storage policies: admins can upload
create policy "Admin upload attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Storage policies: admins can download
create policy "Admin download attachments"
  on storage.objects for select
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Storage policies: admins can delete
create policy "Admin delete attachments"
  on storage.objects for delete
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );
