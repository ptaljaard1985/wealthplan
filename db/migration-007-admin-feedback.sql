-- Migration 007: Admin dashboard & user feedback system
-- Creates user_profiles (admin flag) and support_requests (tickets) tables

-- ── user_profiles ─────────────────────────────────────────────
create table if not exists public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  display_name text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
alter table public.user_profiles enable row level security;

-- Helper: check admin status without RLS recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = ''
as $$
  select coalesce(
    (select is_admin from public.user_profiles where id = auth.uid()),
    false
  );
$$;

-- Users can read their own profile
create policy "Users read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Admins can read all profiles
create policy "Admins read all profiles"
  on public.user_profiles for select
  using (public.is_admin());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.user_profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Drop trigger if it exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── support_requests ──────────────────────────────────────────
create table if not exists public.support_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  user_email    text not null,
  request_type  text not null check (request_type in ('bug', 'feature', 'question')),
  details       text not null,
  screen_path   text,
  status        text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  admin_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index if not exists idx_support_requests_status on public.support_requests(status);
create index if not exists idx_support_requests_user_id on public.support_requests(user_id);

-- RLS
alter table public.support_requests enable row level security;

-- Users can insert their own requests
create policy "Users insert own requests"
  on public.support_requests for insert
  with check (auth.uid() = user_id);

-- Users can read their own requests
create policy "Users read own requests"
  on public.support_requests for select
  using (auth.uid() = user_id);

-- Admins can read all requests
create policy "Admins read all requests"
  on public.support_requests for select
  using (public.is_admin());

-- Admins can update all requests
create policy "Admins update all requests"
  on public.support_requests for update
  using (public.is_admin());

-- Admins can delete requests
create policy "Admins delete requests"
  on public.support_requests for delete
  using (public.is_admin());

-- ── Seed: Mark Pierre as admin ────────────────────────────────
---Run after migration. Replace the UUID if needed, or use email match:
insert into public.user_profiles (id, email, display_name, is_admin)
select id, email, 'Pierre', true
from auth.users
where email = 'pierre@simplewealth.co.za'
on conflict (id) do update set is_admin = true;
