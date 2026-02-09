/* ── Projection Engine V2 — 7-Phase Year Loop ────────── */

import { calculateIncomeTax, calculateCGT, inflateCGTExclusion } from "@/lib/tax";
import { compoundGrowth, getCapitalExpenseForYear, distributeToAccounts } from "./helpers";
import { solveWithdrawals } from "./withdrawal-solver";
import type {
  ProjectionConfig,
  ProjectionYearResult,
  MemberYearTax,
  AccountYearDetail,
  WithdrawalDetail,
  MemberConfig,
} from "./types";

/**
 * Run the V2 projection engine.
 *
 * Legacy mode: when `config.members` is empty, phases 4-6 are skipped
 * (no tax, no withdrawals, no reinvestment), producing output identical
 * to the original engine.
 */
export function runProjectionEngine(
  config: ProjectionConfig
): ProjectionYearResult[] {
  const {
    accounts,
    income,
    expenses,
    capitalExpenses,
    currentYear,
    targetYear,
    inflationRatePct,
    members,
    withdrawalOrder,
    settings,
  } = config;

  const isLegacyMode = members.length === 0;
  const inflationRate = inflationRatePct / 100;
  const results: ProjectionYearResult[] = [];

  // Running state
  const accountValues: Record<string, number> = {};
  const soldProperties = new Set<string>();

  for (const acc of accounts) {
    accountValues[acc.accountId] = acc.currentValue;
  }

  // Initialize cost basis for CGT-eligible accounts
  const costBasis: Record<string, number> = {};
  for (const acc of accounts) {
    if (acc.accountType === "non-retirement" || acc.accountType === "property") {
      costBasis[acc.accountId] = acc.taxBaseCost ?? (acc.currentValue * 0.5);
    }
  }

  // Build account owner map (accountId → memberId)
  const accountOwners: Record<string, string> = {};
  if (!isLegacyMode) {
    for (const acc of accounts) {
      if (acc.memberId) {
        accountOwners[acc.accountId] = acc.memberId;
      }
    }
  }

  // Build member retirement lookup
  const memberRetirement: Record<string, number> = {};
  for (const m of members) {
    memberRetirement[m.memberId] = m.retirementYear;
  }

  // Identify which member owns each income
  // (memberName → memberId for tax attribution in legacy fallback)
  const memberNameToId: Record<string, string> = {};
  for (const m of members) {
    memberNameToId[m.name] = m.memberId;
  }

  for (let year = currentYear; year <= targetYear; year++) {
    const yearsFromNow = year - currentYear;
    const inflationFactor = Math.pow(1 + inflationRate, yearsFromNow);

    // ── Determine retired members ──
    const retiredMemberIds: string[] = [];
    if (!isLegacyMode) {
      for (const m of members) {
        if (year >= m.retirementYear) {
          retiredMemberIds.push(m.memberId);
        }
      }
    }
    const retiredSet = new Set(retiredMemberIds);
    const isPartiallyRetired = retiredMemberIds.length > 0;
    const isFullyRetired = !isLegacyMode && retiredMemberIds.length === members.length;

    // Snapshot opening values for account detail tracking
    const openingValues: Record<string, number> = {};
    for (const acc of accounts) {
      openingValues[acc.accountId] = accountValues[acc.accountId];
    }

    // ══════════════════════════════════════════════════════
    // PHASE 1: Grow accounts
    // ══════════════════════════════════════════════════════
    let propertySaleProceeds = 0;
    const contributionsByAccount: Record<string, number> = {};
    const propertySaleEvents: { accountId: string; capitalGain: number; memberId?: string; isPrimaryResidence: boolean }[] = [];

    for (const acc of accounts) {
      if (soldProperties.has(acc.accountId)) {
        contributionsByAccount[acc.accountId] = 0;
        continue;
      }

      if (acc.accountType === "property") {
        // Property: simple annual appreciation, no contributions
        const netRate = acc.annualReturnPct / 100;
        accountValues[acc.accountId] = accountValues[acc.accountId] * (1 + netRate);
        contributionsByAccount[acc.accountId] = 0;

        // Check for sale event
        if (acc.plannedSaleYear && year === acc.plannedSaleYear) {
          const saleValue = accountValues[acc.accountId];
          const gain = Math.max(0, saleValue - (costBasis[acc.accountId] ?? 0));
          propertySaleEvents.push({
            accountId: acc.accountId,
            capitalGain: gain,
            memberId: accountOwners[acc.accountId],
            isPrimaryResidence: acc.cgtExemptionType === "primary_residence",
          });
          const inclusionPct = (acc.saleInclusionPct ?? 100) / 100;
          propertySaleProceeds += saleValue * inclusionPct;
          accountValues[acc.accountId] = 0;
          costBasis[acc.accountId] = 0;
          soldProperties.add(acc.accountId);
        }
      } else {
        // Determine contribution: 0 if member is retired (V2), otherwise normal
        let monthlyContrib = acc.monthlyContribution;
        if (!isLegacyMode && acc.memberId && retiredSet.has(acc.memberId)) {
          monthlyContrib = 0;
        }

        contributionsByAccount[acc.accountId] = monthlyContrib * 12;
        accountValues[acc.accountId] = compoundGrowth(
          accountValues[acc.accountId],
          monthlyContrib,
          acc.annualReturnPct
        );

        // Non-retirement contributions increase cost basis
        if (acc.accountType === "non-retirement") {
          costBasis[acc.accountId] = (costBasis[acc.accountId] ?? 0) + monthlyContrib * 12;
        }
      }
    }

    // ══════════════════════════════════════════════════════
    // PHASE 2: Distribute property sale proceeds
    // ══════════════════════════════════════════════════════
    if (propertySaleProceeds > 0) {
      distributeToAccounts(propertySaleProceeds, accounts, accountValues, soldProperties);
    }

    // ══════════════════════════════════════════════════════
    // PHASE 3: Calculate income & expenses
    // ══════════════════════════════════════════════════════
    let rentalIncomeTotal = 0;
    let jointRentalIncomeTotal = 0;

    // Rental income from properties
    for (const acc of accounts) {
      if (
        acc.accountType === "property" &&
        acc.rentalIncomeMonthly &&
        !soldProperties.has(acc.accountId)
      ) {
        const startOk = acc.rentalStartYear == null || year >= acc.rentalStartYear;
        const endOk = acc.rentalEndYear == null || year <= acc.rentalEndYear;
        if (startOk && endOk) {
          const amount = acc.rentalIncomeMonthly * 12 * inflationFactor;
          rentalIncomeTotal += amount;
          if (acc.isJoint) jointRentalIncomeTotal += amount;
        }
      }
    }

    // Regular income
    let totalIncome = 0;
    for (const inc of income) {
      const startOk = inc.startYear === null || year >= inc.startYear;
      const endOk = inc.endYear === null || year <= inc.endYear;
      if (startOk && endOk) {
        totalIncome += inc.monthlyAmount * 12 * inflationFactor;
      }
    }
    totalIncome += rentalIncomeTotal;

    // Expenses
    let totalExpenses = 0;
    for (const exp of expenses) {
      const startOk = exp.startYear === null || year >= exp.startYear;
      const endOk = exp.endYear === null || year <= exp.endYear;
      if (startOk && endOk) {
        totalExpenses += exp.monthlyAmount * 12 * inflationFactor;
      }
    }

    // Capital expenses
    let capitalExpenseTotal = 0;
    for (const ce of capitalExpenses) {
      const baseAmount = getCapitalExpenseForYear(ce, year);
      if (baseAmount > 0) {
        capitalExpenseTotal += baseAmount * inflationFactor;
      }
    }

    // ══════════════════════════════════════════════════════
    // PHASE 4: Calculate tax per member (V2 only)
    // ══════════════════════════════════════════════════════
    let memberTax: MemberYearTax[] = [];
    let householdTax = 0;
    let netCashFlow: number;
    let propertySaleCGTTotal = 0;
    let cgtExclusionUsed: Record<string, number> = {};

    if (!isLegacyMode) {
      // Track income per member
      const mGross: Record<string, number> = {};
      const mTaxable: Record<string, number> = {};
      for (const m of members) {
        mGross[m.memberId] = 0;
        mTaxable[m.memberId] = 0;
      }

      // Attribute regular income to members
      for (const inc of income) {
        const startOk = inc.startYear === null || year >= inc.startYear;
        const endOk = inc.endYear === null || year <= inc.endYear;
        if (!startOk || !endOk) continue;

        const annual = inc.monthlyAmount * 12 * inflationFactor;
        const taxable = annual * (inc.taxablePct / 100);

        // Find member by memberId or by name
        const memberId = inc.memberId ?? memberNameToId[inc.memberName];
        if (memberId && mGross[memberId] !== undefined) {
          mGross[memberId] += annual;
          mTaxable[memberId] += taxable;
        }
      }

      // Attribute rental income to members
      for (const acc of accounts) {
        if (
          acc.accountType === "property" &&
          acc.rentalIncomeMonthly &&
          !soldProperties.has(acc.accountId)
        ) {
          const startOk = acc.rentalStartYear == null || year >= acc.rentalStartYear;
          const endOk = acc.rentalEndYear == null || year <= acc.rentalEndYear;
          if (!startOk || !endOk) continue;

          const annual = acc.rentalIncomeMonthly * 12 * inflationFactor;

          if (acc.isJoint && members.length > 1) {
            // Split joint rental 50/50 across members
            const share = annual / members.length;
            for (const m of members) {
              mGross[m.memberId] += share;
              mTaxable[m.memberId] += share;
            }
          } else {
            const memberId = acc.memberId ?? memberNameToId[acc.memberName];
            if (memberId && mGross[memberId] !== undefined) {
              mGross[memberId] += annual;
              mTaxable[memberId] += annual;
            }
          }
        }
      }

      // Run tax engine per member
      memberTax = members.map((m) => {
        const birthYear = new Date(m.dateOfBirth).getFullYear();
        const age = year - birthYear;
        const taxResult = calculateIncomeTax(
          mTaxable[m.memberId],
          age,
          Math.max(0, yearsFromNow),
          settings.bracketInflationRatePct / 100
        );
        return {
          memberId: m.memberId,
          name: m.name,
          age,
          grossIncome: Math.round(mGross[m.memberId]),
          taxableIncome: Math.round(mTaxable[m.memberId]),
          netTax: taxResult.netTax,
          effectiveRate: taxResult.effectiveRate,
          marginalRate: taxResult.marginalRate,
          monthlyTax: taxResult.monthlyTax,
          cgtPayable: 0,
          capitalGains: 0,
        };
      });

      householdTax = memberTax.reduce((s, t) => s + t.netTax, 0);

      // ── Phase 4b: CGT from property sales ──
      cgtExclusionUsed = {};
      propertySaleCGTTotal = 0;

      for (const sale of propertySaleEvents) {
        if (!sale.memberId) continue;
        const mt = memberTax.find((t) => t.memberId === sale.memberId);
        const marginalRate = mt?.marginalRate ?? 36;
        const usedSoFar = cgtExclusionUsed[sale.memberId] ?? 0;
        const inflatedExclusion = inflateCGTExclusion(yearsFromNow, settings.bracketInflationRatePct / 100);
        const remaining = Math.max(0, inflatedExclusion - usedSoFar);

        const cgtResult = calculateCGT(sale.capitalGain, marginalRate, {
          remainingAnnualExclusion: remaining,
          primaryResidenceExclusion: sale.isPrimaryResidence ? 2_000_000 : 0,
        });

        cgtExclusionUsed[sale.memberId] = usedSoFar + cgtResult.exclusionUsed;
        propertySaleCGTTotal += cgtResult.tax;
        if (mt) {
          mt.cgtPayable += cgtResult.tax;
          mt.capitalGains += sale.capitalGain;
        }
      }
      householdTax += propertySaleCGTTotal;

      netCashFlow = totalIncome - totalExpenses - capitalExpenseTotal - householdTax;
    } else {
      // Legacy mode: no tax calculation
      netCashFlow = totalIncome - totalExpenses - capitalExpenseTotal;
    }

    const grossCashFlow = totalIncome - totalExpenses - capitalExpenseTotal;

    // ══════════════════════════════════════════════════════
    // PHASE 5: Post-retirement deficit withdrawal (V2 only)
    // ══════════════════════════════════════════════════════
    let withdrawalDetails: WithdrawalDetail[] = [];
    let deficit = 0;
    let depletedAccountIds: string[] = [];
    let portfolioDepleted = false;
    let withdrawalCGT = 0;

    if (!isLegacyMode && isPartiallyRetired && netCashFlow < 0) {
      deficit = Math.abs(netCashFlow);

      // Build base taxable per member for withdrawal solver
      const baseTaxableByMember: Record<string, number> = {};
      const memberAges: Record<string, number> = {};
      for (const mt of memberTax) {
        baseTaxableByMember[mt.memberId] = mt.taxableIncome;
        memberAges[mt.memberId] = mt.age;
      }

      const result = solveWithdrawals({
        deficit,
        accountValues,
        accounts,
        withdrawalOrder,
        baseTaxableByMember,
        memberAges,
        yearsFromBase: Math.max(0, yearsFromNow),
        bracketInflationRatePct: settings.bracketInflationRatePct,
        accountOwners,
        soldProperties,
        costBasis,
        cgtExclusionUsedByMember: cgtExclusionUsed,
      });

      withdrawalDetails = result.withdrawals;
      depletedAccountIds = result.depletedAccountIds;
      portfolioDepleted = result.portfolioDepleted;

      // Update tax with additional tax from withdrawals (income tax + CGT)
      withdrawalCGT = result.additionalCGT;
      const totalAdditionalFromSolver = result.additionalTax + result.additionalCGT;
      if (totalAdditionalFromSolver > 0) {
        householdTax += totalAdditionalFromSolver;
        netCashFlow -= totalAdditionalFromSolver;
      }
    }

    // ══════════════════════════════════════════════════════
    // PHASE 6: Surplus reinvestment (V2 only, conditional)
    // ══════════════════════════════════════════════════════
    let surplusReinvested = 0;

    if (!isLegacyMode && netCashFlow > 0) {
      const shouldReinvest = isPartiallyRetired
        ? settings.reinvestSurplusPostRetirement
        : settings.reinvestSurplusPreRetirement;

      if (shouldReinvest) {
        surplusReinvested = netCashFlow;
        distributeToAccounts(surplusReinvested, accounts, accountValues, soldProperties);
      }
    }

    // ══════════════════════════════════════════════════════
    // PHASE 7: Build enriched year result
    // ══════════════════════════════════════════════════════
    const total = Object.values(accountValues).reduce((s, v) => s + v, 0);

    // Build account details
    const accountDetails: AccountYearDetail[] = accounts.map((acc) => {
      const opening = Math.round(openingValues[acc.accountId]);
      const closing = Math.round(accountValues[acc.accountId]);
      const contributions = Math.round(contributionsByAccount[acc.accountId] ?? 0);
      const withdrawal = Math.round(
        withdrawalDetails
          .filter((w) => w.accountId === acc.accountId)
          .reduce((s, w) => s + w.amount, 0)
      );
      const growth = closing - opening - contributions + withdrawal;

      return {
        accountId: acc.accountId,
        accountName: acc.accountName,
        accountType: acc.accountType,
        opening,
        contributions,
        growth,
        withdrawal,
        closing,
      };
    });

    // Collect all currently depleted accounts
    const allDepletedIds: string[] = [];
    for (const acc of accounts) {
      if (accountValues[acc.accountId] <= 0 && !soldProperties.has(acc.accountId)) {
        allDepletedIds.push(acc.accountId);
      }
    }

    results.push({
      year,
      total: Math.round(total),
      accounts: { ...accountValues },
      totalIncome: Math.round(totalIncome),
      totalExpenses: Math.round(totalExpenses),
      capitalExpenseTotal: Math.round(capitalExpenseTotal),
      netCashFlow: Math.round(netCashFlow),
      propertySaleProceeds: Math.round(propertySaleProceeds),
      rentalIncome: Math.round(rentalIncomeTotal),
      jointRentalIncome: Math.round(jointRentalIncomeTotal),
      memberTax,
      householdTax: Math.round(householdTax),
      householdCGT: Math.round(propertySaleCGTTotal + withdrawalCGT),
      propertySaleCGT: Math.round(propertySaleCGTTotal),
      accountDetails,
      withdrawalDetails,
      grossCashFlow: Math.round(grossCashFlow),
      deficit: Math.round(deficit),
      surplusReinvested: Math.round(surplusReinvested),
      isFullyRetired,
      isPartiallyRetired,
      retiredMemberIds,
      depletedAccountIds: allDepletedIds,
      portfolioDepleted,
    });
  }

  return results;
}
