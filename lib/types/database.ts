export interface ClientFamily {
  id: string;
  family_name: string;
  inflation_rate_pct: number;
  reinvest_surplus_pre_retirement: boolean;
  reinvest_surplus_post_retirement: boolean;
  bracket_inflation_rate_pct: number;
  notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  retirement_age: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  member_id: string;
  account_name: string;
  account_type: "retirement" | "non-retirement" | "tax-free" | "property";
  current_value: number;
  monthly_contribution: number;
  expected_return_pct: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_joint: boolean;
  /* Property-specific fields */
  rental_income_monthly: number | null;
  rental_start_year: number | null;
  rental_end_year: number | null;
  planned_sale_year: number | null;
  sale_inclusion_pct: number | null;
}

export interface Valuation {
  id: string;
  account_id: string;
  valuation_date: string;
  value: number;
  notes: string | null;
  created_at: string;
}

export interface Income {
  id: string;
  member_id: string;
  label: string;
  category: "salary" | "rental" | "pension" | "other";
  monthly_amount: number;
  taxable_pct: number;
  start_year: number | null;
  end_year: number | null;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  family_id: string;
  label: string;
  category: string;
  monthly_amount: number;
  start_year: number | null;
  end_year: number | null;
  notes: string | null;
  created_at: string;
}

export interface CapitalExpense {
  id: string;
  family_id: string;
  label: string;
  amount: number;
  start_year: number;
  recurrence_interval_years: number | null;
  recurrence_count: number;
  notes: string | null;
  created_at: string;
}

export interface LifeEvent {
  id: string;
  family_id: string;
  label: string;
  event_year: number;
  icon: string;
  color: string | null;
  notes: string | null;
  created_at: string;
}

export interface WithdrawalOrder {
  id: string;
  family_id: string;
  account_id: string;
  priority: number;
}

/* ── Composite types for joined queries ───────────────── */

export interface FamilyMemberWithAccounts extends FamilyMember {
  accounts: Account[];
}

export interface FamilyMemberWithIncome extends FamilyMember {
  income: Income[];
}

export interface FamilyMemberWithAll extends FamilyMember {
  accounts: Account[];
  income: Income[];
}

export interface ClientFamilyWithMembers extends ClientFamily {
  family_members: FamilyMemberWithAll[];
}

export interface ClientFamilySummary extends ClientFamily {
  family_members: FamilyMember[];
  member_count: number;
  total_value: number;
}
