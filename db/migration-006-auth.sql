-- Migration 006: Authentication & Row-Level Security
-- Adds user_id to client_families and replaces "Allow all" policies
-- with user-scoped RLS policies using Supabase Auth.
--
-- IMPORTANT: Run steps in order. See backfill instructions below.

-- ── Step 1: Add user_id column to client_families ─────────

ALTER TABLE client_families
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_client_families_user_id
  ON client_families(user_id);

-- ── Step 2: Backfill existing rows ────────────────────────
-- Uncomment and replace with your actual user UUID from
-- Supabase Dashboard → Authentication → Users
--
-- UPDATE client_families SET user_id = '<YOUR_USER_UUID>';

-- ── Step 3: Make user_id NOT NULL (run after backfill) ────
-- Uncomment after backfilling:
--
-- ALTER TABLE client_families ALTER COLUMN user_id SET NOT NULL;

-- ── Step 4: Drop all "Allow all" policies ─────────────────

DROP POLICY IF EXISTS "Allow all" ON client_families;
DROP POLICY IF EXISTS "Allow all" ON family_members;
DROP POLICY IF EXISTS "Allow all" ON accounts;
DROP POLICY IF EXISTS "Allow all" ON valuations;
DROP POLICY IF EXISTS "Allow all" ON income;
DROP POLICY IF EXISTS "Allow all" ON expenses;
DROP POLICY IF EXISTS "Allow all" ON capital_expenses;
DROP POLICY IF EXISTS "Allow all" ON events;
DROP POLICY IF EXISTS "Users can manage withdrawal order for their families" ON withdrawal_order;

-- ── Step 5: Create user-scoped RLS policies ───────────────

-- client_families: direct user_id match
CREATE POLICY "User owns family"
  ON client_families FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- expenses: family_id → client_families.user_id
CREATE POLICY "User owns family expenses"
  ON expenses FOR ALL
  USING (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()))
  WITH CHECK (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()));

-- capital_expenses: family_id → client_families.user_id
CREATE POLICY "User owns family capital expenses"
  ON capital_expenses FOR ALL
  USING (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()))
  WITH CHECK (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()));

-- events: family_id → client_families.user_id
CREATE POLICY "User owns family events"
  ON events FOR ALL
  USING (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()))
  WITH CHECK (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()));

-- withdrawal_order: family_id → client_families.user_id
CREATE POLICY "User owns family withdrawal order"
  ON withdrawal_order FOR ALL
  USING (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()))
  WITH CHECK (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()));

-- family_members: member → client_families.user_id
CREATE POLICY "User owns family members"
  ON family_members FOR ALL
  USING (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()))
  WITH CHECK (family_id IN (SELECT id FROM client_families WHERE user_id = auth.uid()));

-- income: member_id → family_members → client_families.user_id
CREATE POLICY "User owns member income"
  ON income FOR ALL
  USING (member_id IN (
    SELECT fm.id FROM family_members fm
    JOIN client_families cf ON cf.id = fm.family_id
    WHERE cf.user_id = auth.uid()
  ))
  WITH CHECK (member_id IN (
    SELECT fm.id FROM family_members fm
    JOIN client_families cf ON cf.id = fm.family_id
    WHERE cf.user_id = auth.uid()
  ));

-- accounts: member_id → family_members → client_families.user_id
CREATE POLICY "User owns member accounts"
  ON accounts FOR ALL
  USING (member_id IN (
    SELECT fm.id FROM family_members fm
    JOIN client_families cf ON cf.id = fm.family_id
    WHERE cf.user_id = auth.uid()
  ))
  WITH CHECK (member_id IN (
    SELECT fm.id FROM family_members fm
    JOIN client_families cf ON cf.id = fm.family_id
    WHERE cf.user_id = auth.uid()
  ));

-- valuations: account_id → accounts → family_members → client_families.user_id
CREATE POLICY "User owns account valuations"
  ON valuations FOR ALL
  USING (account_id IN (
    SELECT a.id FROM accounts a
    JOIN family_members fm ON fm.id = a.member_id
    JOIN client_families cf ON cf.id = fm.family_id
    WHERE cf.user_id = auth.uid()
  ))
  WITH CHECK (account_id IN (
    SELECT a.id FROM accounts a
    JOIN family_members fm ON fm.id = a.member_id
    JOIN client_families cf ON cf.id = fm.family_id
    WHERE cf.user_id = auth.uid()
  ));
