/* ── Pure math helpers for the projection engine ─────── */

import type { AccountProjectionInput, CapitalExpenseInput } from "./types";

/**
 * Monthly compounding growth for one year.
 *
 *   monthlyRate = (1 + netAnnualRate)^(1/12) - 1
 *   FV = PV × (1 + monthlyRate)^12 + PMT × ((1 + monthlyRate)^12 − 1) / monthlyRate
 */
export function compoundGrowth(
  pv: number,
  monthlyContribution: number,
  annualReturnPct: number
): number {
  const netRate = annualReturnPct / 100;
  if (netRate === 0) {
    return pv + monthlyContribution * 12;
  }
  const monthlyRate = Math.pow(1 + netRate, 1 / 12) - 1;
  const growthFactor = Math.pow(1 + monthlyRate, 12);
  return pv * growthFactor + monthlyContribution * ((growthFactor - 1) / monthlyRate);
}

/**
 * Check if a capital expense occurs in the given year and return its amount.
 */
export function getCapitalExpenseForYear(
  ce: CapitalExpenseInput,
  year: number
): number {
  if (year < ce.startYear) return 0;
  if (!ce.recurrenceIntervalYears || ce.recurrenceIntervalYears <= 0) {
    return year === ce.startYear ? ce.amount : 0;
  }
  const diff = year - ce.startYear;
  if (diff % ce.recurrenceIntervalYears !== 0) return 0;
  const occurrenceIndex = diff / ce.recurrenceIntervalYears;
  if (occurrenceIndex >= ce.recurrenceCount) return 0;
  return ce.amount;
}

/**
 * Distribute an amount to accounts proportionally by current value.
 * If excludeIds is given, those accounts are skipped.
 * Prefers non-retirement accounts; falls back to any non-property account.
 */
export function distributeToAccounts(
  amount: number,
  accounts: AccountProjectionInput[],
  accountValues: Record<string, number>,
  soldProperties: Set<string>,
  excludeIds?: Set<string>
): void {
  if (amount <= 0) return;

  const skip = excludeIds ?? new Set<string>();

  // Try non-retirement accounts first
  const nonRetAccounts = accounts.filter(
    (a) =>
      a.accountType === "non-retirement" &&
      !soldProperties.has(a.accountId) &&
      !skip.has(a.accountId)
  );

  if (nonRetAccounts.length > 0) {
    const totalValue = nonRetAccounts.reduce(
      (s, a) => s + accountValues[a.accountId],
      0
    );
    for (const a of nonRetAccounts) {
      const weight =
        totalValue > 0
          ? accountValues[a.accountId] / totalValue
          : 1 / nonRetAccounts.length;
      accountValues[a.accountId] += amount * weight;
    }
    return;
  }

  // Fallback: any non-property account
  const otherAccounts = accounts.filter(
    (a) =>
      a.accountType !== "property" &&
      !soldProperties.has(a.accountId) &&
      !skip.has(a.accountId)
  );

  if (otherAccounts.length > 0) {
    const share = amount / otherAccounts.length;
    for (const a of otherAccounts) {
      accountValues[a.accountId] += share;
    }
  }
}

/**
 * Calculate weighted average net return across accounts.
 */
export function weightedAverageReturn(
  accounts: AccountProjectionInput[]
): number {
  const totalValue = accounts.reduce((s, a) => s + a.currentValue, 0);
  if (totalValue === 0) return 0;
  const weighted = accounts.reduce(
    (s, a) => s + a.annualReturnPct * (a.currentValue / totalValue),
    0
  );
  return Math.round(weighted * 100) / 100;
}
