-- ============================================================
-- Migration 002: Add property account type
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Drop the old CHECK constraint and add the new one with 'property'
alter table accounts drop constraint if exists accounts_account_type_check;
alter table accounts add constraint accounts_account_type_check
  check (account_type in ('retirement', 'non-retirement', 'tax-free', 'property'));

-- 2. Add property-specific columns
alter table accounts add column if not exists rental_income_monthly numeric(18,2);
alter table accounts add column if not exists rental_start_year integer;
alter table accounts add column if not exists rental_end_year integer;
alter table accounts add column if not exists planned_sale_year integer;
alter table accounts add column if not exists sale_inclusion_pct numeric(5,2) default 100.00;
