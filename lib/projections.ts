/* ── Projection Engine — Backward-Compatible Wrapper ─── */
/*
 * This file wraps the new V2 projection engine so that all existing
 * consumers continue to work with zero changes.
 *
 * New consumers should import from `@/lib/engines/types` and
 * `@/lib/engines/projection-engine` directly.
 */

import { runProjectionEngine } from "./engines/projection-engine";
import { DEFAULT_FAMILY_SETTINGS } from "./engines/types";
import type {
  ProjectionConfig as V2Config,
  ProjectionYearResult as V2Result,
} from "./engines/types";

/* ── Re-export legacy types (same shape as before) ───── */

export type { AccountProjectionInput } from "./engines/types";
export type { IncomeInput } from "./engines/types";
export type { ExpenseInput } from "./engines/types";
export type { CapitalExpenseInput } from "./engines/types";

export interface ProjectionConfig {
  accounts: import("./engines/types").AccountProjectionInput[];
  income: import("./engines/types").IncomeInput[];
  expenses: import("./engines/types").ExpenseInput[];
  capitalExpenses: import("./engines/types").CapitalExpenseInput[];
  currentYear: number;
  targetYear: number;
  inflationRatePct: number;
}

export interface ProjectionYearResult {
  year: number;
  total: number;
  accounts: Record<string, number>;
  totalIncome: number;
  totalExpenses: number;
  capitalExpenseTotal: number;
  netCashFlow: number;
  propertySaleProceeds: number;
  rentalIncome: number;
  jointRentalIncome: number;
}

/**
 * Legacy-compatible projection calculation.
 *
 * Builds a minimal V2 config with `members: []` (legacy mode),
 * calls the new engine, and returns the old result shape.
 */
export function calculateProjections(
  config: ProjectionConfig
): ProjectionYearResult[] {
  const v2Config: V2Config = {
    ...config,
    members: [],
    withdrawalOrder: [],
    settings: DEFAULT_FAMILY_SETTINGS,
  };

  const v2Results = runProjectionEngine(v2Config);

  // Map V2 enriched output back to legacy shape
  return v2Results.map((r) => ({
    year: r.year,
    total: r.total,
    accounts: r.accounts,
    totalIncome: r.totalIncome,
    totalExpenses: r.totalExpenses,
    capitalExpenseTotal: r.capitalExpenseTotal,
    netCashFlow: r.netCashFlow,
    propertySaleProceeds: r.propertySaleProceeds,
    rentalIncome: r.rentalIncome,
    jointRentalIncome: r.jointRentalIncome,
  }));
}

/* ── Re-export helper ────────────────────────────────── */

export { weightedAverageReturn } from "./engines/helpers";
