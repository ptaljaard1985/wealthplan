-- Migration 004: Life Events
-- Family-level events for marking key milestones on the projection timeline

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references client_families(id) on delete cascade not null,
  label text not null,
  event_year integer not null,
  icon text not null default 'milestone',
  color text default null,
  notes text,
  created_at timestamptz default now()
);

alter table events enable row level security;
create policy "Allow all" on events for all using (true) with check (true);
