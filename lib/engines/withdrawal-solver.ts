/* ── Withdrawal Solver ────────────────────────────────── */
/*
 * Solves the circular dependency: withdrawing from retirement accounts
 * creates taxable income → increases tax → increases the deficit.
 *
 * Algorithm:
 *  1. Start with the net deficit amount
 *  2. Withdraw from accounts in priority order
 *  3. Calculate additional tax from retirement-fund withdrawals
 *  4. Additional tax creates more deficit — withdraw more
 *  5. Repeat until convergence (delta < R100) or max 10 iterations
 *
 * Convergence is fast because marginal rate is bounded at 45%.
 */

import { calculateIncomeTax, calculateCGT, inflateCGTExclusion } from "@/lib/tax";
import type {
  AccountProjectionInput,
  WithdrawalOrderEntry,
  WithdrawalDetail,
  DEFAULT_WITHDRAWAL_ORDER,
} from "./types";

const CONVERGENCE_THRESHOLD = 100; // R100
const MAX_ITERATIONS = 10;

export interface WithdrawalSolverInput {
  /** The absolute deficit to cover (positive number) */
  deficit: number;
  /** Account values — will be mutated in-place */
  accountValues: Record<string, number>;
  /** All accounts (for type lookup) */
  accounts: AccountProjectionInput[];
  /** Ordered withdrawal priority — lower number = withdraw first */
  withdrawalOrder: WithdrawalOrderEntry[];
  /** Already-computed base taxable income per member (before withdrawals) */
  baseTaxableByMember: Record<string, number>;
  /** Member age in this year (for tax calc) */
  memberAges: Record<string, number>;
  /** Years from base year (for bracket inflation) */
  yearsFromBase: number;
  /** Bracket inflation rate */
  bracketInflationRatePct: number;
  /** Which member owns each account (accountId → memberId) */
  accountOwners: Record<string, string>;
  /** Set of accounts already depleted */
  soldProperties: Set<string>;
  /** Cost basis for CGT-eligible accounts — mutated in-place */
  costBasis: Record<string, number>;
  /** CGT annual exclusion already consumed by property sales (memberId → amount) */
  cgtExclusionUsedByMember: Record<string, number>;
}

export interface WithdrawalSolverResult {
  /** Per-account withdrawal details */
  withdrawals: WithdrawalDetail[];
  /** Total additional tax caused by retirement withdrawals */
  additionalTax: number;
  /** Total amount actually withdrawn (including tax gross-up) */
  totalWithdrawn: number;
  /** IDs of accounts that hit zero */
  depletedAccountIds: string[];
  /** True if all accounts depleted and deficit still not covered */
  portfolioDepleted: boolean;
  /** Total CGT from non-retirement withdrawals */
  additionalCGT: number;
}

/**
 * Build the ordered list of accounts to withdraw from.
 * Uses explicit withdrawal order entries if provided, otherwise
 * falls back to the default type-based ordering.
 */
function buildOrderedAccounts(
  accounts: AccountProjectionInput[],
  withdrawalOrder: WithdrawalOrderEntry[],
  accountValues: Record<string, number>,
  soldProperties: Set<string>
): AccountProjectionInput[] {
  // Filter to accounts with a positive balance
  const available = accounts.filter(
    (a) => accountValues[a.accountId] > 0 && !soldProperties.has(a.accountId)
  );

  if (withdrawalOrder.length > 0) {
    // Use explicit order
    const orderMap = new Map(withdrawalOrder.map((w) => [w.accountId, w.priority]));
    return [...available].sort((a, b) => {
      const pa = orderMap.get(a.accountId) ?? 999;
      const pb = orderMap.get(b.accountId) ?? 999;
      return pa - pb;
    });
  }

  // Default: tax-free(1) → non-retirement(2) → property(3) → retirement(4)
  const defaultOrder: Record<string, number> = {
    "tax-free": 1,
    "non-retirement": 2,
    property: 3,
    retirement: 4,
  };
  return [...available].sort(
    (a, b) => (defaultOrder[a.accountType] ?? 5) - (defaultOrder[b.accountType] ?? 5)
  );
}

/**
 * Perform a single withdrawal pass: withdraw `amount` from ordered accounts.
 * Returns the actual amount withdrawn and per-account breakdown.
 */
function withdrawPass(
  amount: number,
  orderedAccounts: AccountProjectionInput[],
  accountValues: Record<string, number>,
  costBasis: Record<string, number>
): { withdrawn: number; details: WithdrawalDetail[] } {
  let remaining = amount;
  const details: WithdrawalDetail[] = [];

  for (const acc of orderedAccounts) {
    if (remaining <= 0) break;
    const available = accountValues[acc.accountId];
    if (available <= 0) continue;

    const take = Math.min(remaining, available);
    accountValues[acc.accountId] -= take;
    remaining -= take;

    let capitalGain: number | undefined;
    if (acc.accountType === "non-retirement") {
      const cb = costBasis[acc.accountId] ?? 0;
      const gainRatio = available > 0 ? Math.max(0, 1 - cb / available) : 0;
      capitalGain = take * gainRatio;
      // Reduce cost basis proportionally
      if (available > 0) {
        costBasis[acc.accountId] = Math.max(0, cb - cb * (take / available));
      }
    }

    details.push({
      accountId: acc.accountId,
      accountName: acc.accountName,
      accountType: acc.accountType,
      amount: take,
      isTaxable: acc.accountType === "retirement",
      capitalGain,
    });
  }

  return { withdrawn: amount - remaining, details };
}

export function solveWithdrawals(input: WithdrawalSolverInput): WithdrawalSolverResult {
  const {
    deficit,
    accountValues,
    accounts,
    withdrawalOrder,
    baseTaxableByMember,
    memberAges,
    yearsFromBase,
    bracketInflationRatePct,
    accountOwners,
    soldProperties,
    costBasis,
    cgtExclusionUsedByMember,
  } = input;

  if (deficit <= 0) {
    return {
      withdrawals: [],
      additionalTax: 0,
      totalWithdrawn: 0,
      depletedAccountIds: [],
      portfolioDepleted: false,
      additionalCGT: 0,
    };
  }

  // Snapshot account values and cost basis so we can reset between iterations
  const originalValues: Record<string, number> = {};
  for (const id of Object.keys(accountValues)) {
    originalValues[id] = accountValues[id];
  }
  const originalCostBasis: Record<string, number> = { ...costBasis };

  let totalAdditionalTax = 0;
  let totalAdditionalCGT = 0;
  let finalDetails: WithdrawalDetail[] = [];
  let portfolioDepleted = false;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Reset account values and cost basis to pre-withdrawal state for this iteration
    for (const id of Object.keys(originalValues)) {
      accountValues[id] = originalValues[id];
    }
    for (const id of Object.keys(originalCostBasis)) {
      costBasis[id] = originalCostBasis[id];
    }

    const orderedAccounts = buildOrderedAccounts(
      accounts,
      withdrawalOrder,
      accountValues,
      soldProperties
    );

    const totalNeeded = deficit + totalAdditionalTax + totalAdditionalCGT;
    const { withdrawn, details } = withdrawPass(totalNeeded, orderedAccounts, accountValues, costBasis);
    finalDetails = details;

    if (withdrawn < totalNeeded) {
      portfolioDepleted = true;
    }

    // Calculate additional tax from retirement withdrawals
    const retirementWithdrawalsByMember: Record<string, number> = {};
    for (const d of details) {
      if (d.isTaxable) {
        const memberId = accountOwners[d.accountId];
        if (memberId) {
          retirementWithdrawalsByMember[memberId] =
            (retirementWithdrawalsByMember[memberId] ?? 0) + d.amount;
        }
      }
    }

    // Compute new income tax with retirement withdrawals added
    let newAdditionalTax = 0;
    const newMarginalRates: Record<string, number> = {};
    for (const [memberId, withdrawalAmount] of Object.entries(retirementWithdrawalsByMember)) {
      const baseTaxable = baseTaxableByMember[memberId] ?? 0;
      const age = memberAges[memberId] ?? 65;

      const baseTax = calculateIncomeTax(
        baseTaxable,
        age,
        yearsFromBase,
        bracketInflationRatePct / 100
      );
      const newTax = calculateIncomeTax(
        baseTaxable + withdrawalAmount,
        age,
        yearsFromBase,
        bracketInflationRatePct / 100
      );
      newAdditionalTax += newTax.netTax - baseTax.netTax;
      newMarginalRates[memberId] = newTax.marginalRate;
    }

    // Calculate CGT from non-retirement withdrawals
    const nonRetGainsByMember: Record<string, number> = {};
    for (const d of details) {
      if (d.capitalGain && d.capitalGain > 0) {
        const memberId = accountOwners[d.accountId];
        if (memberId) {
          nonRetGainsByMember[memberId] = (nonRetGainsByMember[memberId] ?? 0) + d.capitalGain;
        }
      }
    }

    let newCGT = 0;
    for (const [memberId, totalGain] of Object.entries(nonRetGainsByMember)) {
      const usedFromPhase4 = cgtExclusionUsedByMember[memberId] ?? 0;
      const inflatedExcl = inflateCGTExclusion(yearsFromBase, bracketInflationRatePct / 100);
      const remaining = Math.max(0, inflatedExcl - usedFromPhase4);
      // Use marginal rate including retirement withdrawal income if available
      const baseTaxable = baseTaxableByMember[memberId] ?? 0;
      const age = memberAges[memberId] ?? 65;
      const retWithdrawal = retirementWithdrawalsByMember[memberId] ?? 0;
      const taxResult = calculateIncomeTax(
        baseTaxable + retWithdrawal,
        age,
        yearsFromBase,
        bracketInflationRatePct / 100
      );
      const cgtResult = calculateCGT(totalGain, taxResult.marginalRate, {
        remainingAnnualExclusion: remaining,
      });
      newCGT += cgtResult.tax;
    }

    const deltaIncomeTax = Math.abs(newAdditionalTax - totalAdditionalTax);
    const deltaCGT = Math.abs(newCGT - totalAdditionalCGT);
    totalAdditionalTax = newAdditionalTax;
    totalAdditionalCGT = newCGT;

    if ((deltaIncomeTax + deltaCGT) < CONVERGENCE_THRESHOLD || portfolioDepleted) {
      break;
    }
  }

  // Determine depleted accounts
  const depletedAccountIds: string[] = [];
  for (const acc of accounts) {
    if (
      originalValues[acc.accountId] > 0 &&
      accountValues[acc.accountId] <= 0 &&
      !soldProperties.has(acc.accountId)
    ) {
      depletedAccountIds.push(acc.accountId);
    }
  }

  return {
    withdrawals: finalDetails,
    additionalTax: Math.round(totalAdditionalTax),
    totalWithdrawn: finalDetails.reduce((s, d) => s + d.amount, 0),
    depletedAccountIds,
    portfolioDepleted,
    additionalCGT: Math.round(totalAdditionalCGT),
  };
}
