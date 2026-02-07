-- ============================================================
-- Migration 003: Add joint account flag
-- Run this in the Supabase SQL Editor
-- ============================================================

alter table accounts add column if not exists is_joint boolean default false;
