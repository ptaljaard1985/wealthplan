-- Migration 005: Family settings + withdrawal order
-- Adds surplus reinvestment toggles and bracket inflation to client_families.
-- Creates withdrawal_order table for custom asset liquidation sequencing.

-- ── New columns on client_families ──────────────────────

ALTER TABLE client_families
  ADD COLUMN IF NOT EXISTS reinvest_surplus_pre_retirement boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reinvest_surplus_post_retirement boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bracket_inflation_rate_pct numeric(5,2) DEFAULT 2.00;

-- ── Withdrawal order table ──────────────────────────────

CREATE TABLE IF NOT EXISTS withdrawal_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES client_families(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  priority integer NOT NULL,
  UNIQUE(family_id, account_id)
);

-- Index for fast lookup by family
CREATE INDEX IF NOT EXISTS idx_withdrawal_order_family
  ON withdrawal_order(family_id);

-- Enable RLS
ALTER TABLE withdrawal_order ENABLE ROW LEVEL SECURITY;

-- RLS policy: same pattern as other family-scoped tables
CREATE POLICY "Users can manage withdrawal order for their families"
  ON withdrawal_order
  FOR ALL
  USING (
    family_id IN (
      SELECT id FROM client_families
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT id FROM client_families
    )
  );
