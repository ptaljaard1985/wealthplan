-- Migration 013: Capital Gains Tax (CGT) support fields
-- Adds cost basis, acquisition date, and CGT exemption type to accounts

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS tax_base_cost numeric(18,2),
  ADD COLUMN IF NOT EXISTS acquisition_date date,
  ADD COLUMN IF NOT EXISTS cgt_exemption_type text DEFAULT 'none'
    CHECK (cgt_exemption_type IN ('none', 'primary_residence'));
