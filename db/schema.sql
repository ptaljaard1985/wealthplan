-- ============================================================
-- Wealth Projector — Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Client Families ─────────────────────────────────────────

create table client_families (
  id uuid primary key default gen_random_uuid(),
  family_name text not null,
  inflation_rate_pct numeric(5,2) default 6.00,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table client_families enable row level security;
create policy "Allow all" on client_families for all using (true) with check (true);

-- ── Family Members (max 2 per family) ───────────────────────

create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references client_families(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  retirement_age integer default 65,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table family_members enable row level security;
create policy "Allow all" on family_members for all using (true) with check (true);

-- ── Accounts (per member) ───────────────────────────────────

create table accounts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references family_members(id) on delete cascade not null,
  account_name text not null,
  account_type text not null default 'non-retirement'
    check (account_type in ('retirement', 'non-retirement', 'tax-free')),
  current_value numeric(18,2) not null default 0,
  monthly_contribution numeric(18,2) default 0,
  expected_return_pct numeric(5,2) default 8.00,
  fee_pct numeric(5,2) default 0.00,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table accounts enable row level security;
create policy "Allow all" on accounts for all using (true) with check (true);

-- ── Valuations (per account) ────────────────────────────────

create table valuations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade not null,
  valuation_date date not null,
  value numeric(18,2) not null,
  notes text,
  created_at timestamptz default now()
);

alter table valuations enable row level security;
create policy "Allow all" on valuations for all using (true) with check (true);

create unique index valuations_account_date on valuations(account_id, valuation_date);

-- ── Income (per member) ─────────────────────────────────────

create table income (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references family_members(id) on delete cascade not null,
  label text not null,
  category text not null default 'other'
    check (category in ('salary', 'rental', 'pension', 'other')),
  monthly_amount numeric(18,2) not null,
  taxable_pct numeric(5,2) default 100.00,
  start_year integer,
  end_year integer,
  notes text,
  created_at timestamptz default now()
);

alter table income enable row level security;
create policy "Allow all" on income for all using (true) with check (true);

-- ── Expenses (per family) ───────────────────────────────────

create table expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references client_families(id) on delete cascade not null,
  label text not null,
  category text not null default 'living_expenses',
  monthly_amount numeric(18,2) not null,
  start_year integer,
  end_year integer,
  notes text,
  created_at timestamptz default now()
);

alter table expenses enable row level security;
create policy "Allow all" on expenses for all using (true) with check (true);

-- ── Capital Expenses (per family) ───────────────────────────

create table capital_expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references client_families(id) on delete cascade not null,
  label text not null,
  amount numeric(18,2) not null,
  start_year integer not null,
  recurrence_interval_years integer,
  recurrence_count integer default 1,
  notes text,
  created_at timestamptz default now()
);

alter table capital_expenses enable row level security;
create policy "Allow all" on capital_expenses for all using (true) with check (true);

-- ── Updated-at trigger ──────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger client_families_updated_at
  before update on client_families
  for each row execute function update_updated_at();

create trigger family_members_updated_at
  before update on family_members
  for each row execute function update_updated_at();

create trigger accounts_updated_at
  before update on accounts
  for each row execute function update_updated_at();
