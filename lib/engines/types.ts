/* ── Projection Engine V2 — Type Definitions ─────────── */

/* ── Input types ─────────────────────────────────────── */

export interface MemberConfig {
  memberId: string;
  name: string;
  dateOfBirth: string;
  retirementAge: number;
  /** Pre-computed: birth year + retirementAge */
  retirementYear: number;
}

export interface AccountProjectionInput {
  accountId: string;
  accountName: string;
  memberName: string;
  accountType: "retirement" | "non-retirement" | "tax-free" | "property";
  currentValue: number;
  monthlyContribution: number;
  annualReturnPct: number;
  isJoint?: boolean;
  /** Links this account to a specific member (for contribution stop at retirement) */
  memberId?: string;
  /* Property-specific */
  rentalIncomeMonthly?: number;
  rentalStartYear?: number | null;
  rentalEndYear?: number | null;
  plannedSaleYear?: number | null;
  saleInclusionPct?: number;
}

export interface IncomeInput {
  label: string;
  memberName: string;
  monthlyAmount: number;
  taxablePct: number;
  startYear: number | null;
  endYear: number | null;
  /** Links income to a specific member (for tax attribution) */
  memberId?: string;
  category?: "salary" | "rental" | "pension" | "other";
}

export interface ExpenseInput {
  label: string;
  monthlyAmount: number;
  startYear: number | null;
  endYear: number | null;
}

export interface CapitalExpenseInput {
  label: string;
  amount: number;
  startYear: number;
  recurrenceIntervalYears: number | null;
  recurrenceCount: number;
}

export interface WithdrawalOrderEntry {
  accountId: string;
  priority: number;
}

export interface FamilySettings {
  reinvestSurplusPreRetirement: boolean;
  reinvestSurplusPostRetirement: boolean;
  bracketInflationRatePct: number;
}

export interface ProjectionConfig {
  accounts: AccountProjectionInput[];
  income: IncomeInput[];
  expenses: ExpenseInput[];
  capitalExpenses: CapitalExpenseInput[];
  currentYear: number;
  targetYear: number;
  inflationRatePct: number;
  /** V2 fields — when members is empty, engine runs in legacy mode */
  members: MemberConfig[];
  withdrawalOrder: WithdrawalOrderEntry[];
  settings: FamilySettings;
}

/* ── Output types ────────────────────────────────────── */

export interface MemberYearTax {
  memberId: string;
  name: string;
  age: number;
  grossIncome: number;
  taxableIncome: number;
  netTax: number;
  effectiveRate: number;
  marginalRate: number;
  monthlyTax: number;
}

export interface AccountYearDetail {
  accountId: string;
  accountName: string;
  accountType: string;
  opening: number;
  contributions: number;
  growth: number;
  withdrawal: number;
  closing: number;
}

export interface WithdrawalDetail {
  accountId: string;
  accountName: string;
  accountType: string;
  amount: number;
  /** Whether this withdrawal creates additional taxable income */
  isTaxable: boolean;
}

export interface ProjectionYearResult {
  year: number;
  /* ── Legacy-compatible fields ── */
  total: number;
  accounts: Record<string, number>;
  totalIncome: number;
  totalExpenses: number;
  capitalExpenseTotal: number;
  netCashFlow: number;
  propertySaleProceeds: number;
  rentalIncome: number;
  jointRentalIncome: number;
  /* ── V2 enriched fields ── */
  memberTax: MemberYearTax[];
  householdTax: number;
  accountDetails: AccountYearDetail[];
  withdrawalDetails: WithdrawalDetail[];
  grossCashFlow: number;
  deficit: number;
  surplusReinvested: number;
  isFullyRetired: boolean;
  isPartiallyRetired: boolean;
  retiredMemberIds: string[];
  depletedAccountIds: string[];
  portfolioDepleted: boolean;
}

/* ── Default settings ────────────────────────────────── */

export const DEFAULT_FAMILY_SETTINGS: FamilySettings = {
  reinvestSurplusPreRetirement: false,
  reinvestSurplusPostRetirement: false,
  bracketInflationRatePct: 2.0,
};

/** Default withdrawal order: tax-free → non-retirement → property → retirement */
export const DEFAULT_WITHDRAWAL_ORDER: Record<string, number> = {
  "tax-free": 1,
  "non-retirement": 2,
  property: 3,
  retirement: 4,
};
