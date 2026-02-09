"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { Sigma, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatPercentage, calculateRetirementYear } from "@/lib/formatters";
import {
  calculateProjections,
  type AccountProjectionInput,
  type IncomeInput,
  type ExpenseInput,
  type CapitalExpenseInput,
} from "@/lib/projections";
import { runProjectionEngine } from "@/lib/engines/projection-engine";
import { DEFAULT_FAMILY_SETTINGS } from "@/lib/engines/types";
import type { MemberConfig, ProjectionConfig as V2Config, ProjectionYearResult as V2Result } from "@/lib/engines/types";
import { calculateRetirementYear as calcRetYear } from "@/lib/formatters";
import type { ClientFamily, FamilyMember, Account, Income, Expense, CapitalExpense } from "@/lib/types/database";

interface MemberWithAll extends FamilyMember {
  accounts: Account[];
  income: Income[];
}

/* ── Detail sub-types ───────────────────────────────────── */

interface AccountGrowth {
  name: string;
  type: string;
  opening: number;
  contributions: number;
  growth: number;
  closing: number;
  returnPct: number;
}

interface IncomeDetail {
  label: string;
  memberName: string;
  annualGross: number;
  taxablePct: number;
  taxableAmount: number;
}

interface MemberTax {
  name: string;
  age: number;
  grossIncome: number;
  taxableIncome: number;
  netTax: number;
  effectiveRate: number;
  marginalRate: number;
  monthlyTax: number;
}

interface ExpenseDetail {
  label: string;
  amount: number;
}

interface CapexDetail {
  label: string;
  amount: number;
}

interface CalcRow {
  year: number;
  age: number;
  olderAge: number | null;
  portfolioTotal: number;
  totalContributions: number;
  totalGrowth: number;
  accountGrowth: AccountGrowth[];
  grossIncome: number;
  incomeItems: IncomeDetail[];
  totalExpenses: number;
  expenseItems: ExpenseDetail[];
  capitalExpenseTotal: number;
  capitalExpenseItems: CapexDetail[];
  memberTax: MemberTax[];
  householdTax: number;
  householdCGT: number;
  householdEffRate: number;
  netCashFlow: number;
  propertySaleProceeds: number;
  rentalIncome: number;
  jointRentalIncome: number;
}

/* ── Page ───────────────────────────────────────────────── */

export default function CalculationsPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [family, setFamily] = useState<ClientFamily | null>(null);
  const [members, setMembers] = useState<MemberWithAll[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [capitalExpenses, setCapitalExpenses] = useState<CapitalExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEveryYear, setShowEveryYear] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [familyRes, membersRes, expRes, capexRes] = await Promise.all([
      supabase.from("client_families").select("*").eq("id", familyId).single(),
      supabase.from("family_members").select("*, accounts(*), income(*)").eq("family_id", familyId),
      supabase.from("expenses").select("*").eq("family_id", familyId),
      supabase.from("capital_expenses").select("*").eq("family_id", familyId),
    ]);

    if (familyRes.data) setFamily(familyRes.data);
    if (membersRes.data) setMembers(membersRes.data as MemberWithAll[]);
    if (expRes.data) setExpenses(expRes.data);
    if (capexRes.data) setCapitalExpenses(capexRes.data);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calcRows = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const hasAccounts = members.some((m) => m.accounts.length > 0);
    if (!hasAccounts) return [];

    const allAccounts: AccountProjectionInput[] = [];
    const allIncome: IncomeInput[] = [];
    const accountMeta: Record<string, { name: string; type: string; monthlyContrib: number; annualReturnPct: number; memberName: string }> = {};

    // Build V2 member configs
    const memberConfigs: MemberConfig[] = members
      .filter((m) => m.date_of_birth)
      .map((m) => ({
        memberId: m.id,
        name: `${m.first_name} ${m.last_name}`,
        dateOfBirth: m.date_of_birth!,
        retirementAge: m.retirement_age,
        retirementYear: calcRetYear(m.date_of_birth!, m.retirement_age),
      }));

    for (const m of members) {
      for (const acc of m.accounts) {
        const input: AccountProjectionInput = {
          accountId: acc.id,
          accountName: `${acc.account_name} (${m.first_name})`,
          memberName: `${m.first_name} ${m.last_name}`,
          accountType: acc.account_type as Account["account_type"],
          currentValue: Number(acc.current_value),
          monthlyContribution: Number(acc.monthly_contribution),
          annualReturnPct: Number(acc.expected_return_pct),
          rentalIncomeMonthly: acc.rental_income_monthly ? Number(acc.rental_income_monthly) : undefined,
          rentalStartYear: acc.rental_start_year,
          rentalEndYear: acc.rental_end_year,
          plannedSaleYear: acc.planned_sale_year,
          saleInclusionPct: acc.sale_inclusion_pct ? Number(acc.sale_inclusion_pct) : undefined,
          isJoint: acc.is_joint ?? false,
          memberId: m.id,
          taxBaseCost: acc.tax_base_cost ? Number(acc.tax_base_cost) : null,
          cgtExemptionType: (acc.cgt_exemption_type as "none" | "primary_residence") || "none",
        };
        allAccounts.push(input);
        accountMeta[acc.id] = {
          name: input.accountName,
          type: acc.account_type,
          monthlyContrib: Number(acc.monthly_contribution),
          annualReturnPct: Number(acc.expected_return_pct),
          memberName: input.memberName,
        };
      }
      for (const inc of m.income) {
        allIncome.push({
          label: inc.label,
          memberName: `${m.first_name} ${m.last_name}`,
          monthlyAmount: Number(inc.monthly_amount),
          taxablePct: Number(inc.taxable_pct),
          startYear: inc.start_year,
          endYear: inc.end_year,
          memberId: m.id,
          category: inc.category,
        });
      }
    }

    const membersWithDob = members.filter((m) => m.date_of_birth);
    const birthYears = membersWithDob.map((m) => new Date(m.date_of_birth!).getFullYear());
    const youngestBirthYear = birthYears.length > 0 ? Math.max(...birthYears) : currentYear - 40;
    const oldestBirthYear = birthYears.length > 1 ? Math.min(...birthYears) : null;

    // Property rental accounts
    const rentalAccounts = allAccounts.filter((a) => a.accountType === "property" && a.rentalIncomeMonthly);

    const targetYear = youngestBirthYear + 100;
    const infRate = family?.inflation_rate_pct || 6;

    const expenseInputs: ExpenseInput[] = expenses.map((e) => ({
      label: e.label,
      monthlyAmount: Number(e.monthly_amount),
      startYear: e.start_year,
      endYear: e.end_year,
    }));

    const capexInputs: CapitalExpenseInput[] = capitalExpenses.map((ce) => ({
      label: ce.label,
      amount: Number(ce.amount),
      startYear: ce.start_year,
      recurrenceIntervalYears: ce.recurrence_interval_years,
      recurrenceCount: ce.recurrence_count,
    }));

    // Run the V2 engine with member info for built-in tax
    const v2Config: V2Config = {
      accounts: allAccounts,
      income: allIncome,
      expenses: expenseInputs,
      capitalExpenses: capexInputs,
      currentYear,
      targetYear,
      inflationRatePct: infRate,
      members: memberConfigs,
      withdrawalOrder: [],
      settings: {
        reinvestSurplusPreRetirement: family?.reinvest_surplus_pre_retirement ?? false,
        reinvestSurplusPostRetirement: family?.reinvest_surplus_post_retirement ?? false,
        bracketInflationRatePct: family?.bracket_inflation_rate_pct ?? 2.0,
      },
    };

    const results = runProjectionEngine(v2Config);

    // Build rows with full detail
    const rows: CalcRow[] = results.map((row, rowIdx) => {
      const yearsFromNow = row.year - currentYear;
      const inflationFactor = Math.pow(1 + infRate / 100, yearsFromNow);
      const age = row.year - youngestBirthYear;
      const olderAge = oldestBirthYear !== null ? row.year - oldestBirthYear : null;

      // ── Account growth detail (use engine-provided accountDetails) ──
      let totalContributions = 0;
      let totalGrowth = 0;

      const accountGrowth: AccountGrowth[] = row.accountDetails.map((ad) => {
        const base = ad.opening + ad.contributions / 2;
        const returnPct = base > 0 ? (ad.growth / base) * 100 : 0;
        totalContributions += ad.contributions;
        totalGrowth += ad.growth;
        return {
          name: ad.accountName,
          type: ad.accountType,
          opening: ad.opening,
          contributions: ad.contributions,
          growth: ad.growth,
          closing: ad.closing,
          returnPct: Math.round(returnPct * 100) / 100,
        };
      });

      // ── Income by source ──
      const incomeItems: IncomeDetail[] = [];
      for (const inc of allIncome) {
        const startOk = inc.startYear === null || row.year >= inc.startYear;
        const endOk = inc.endYear === null || row.year <= inc.endYear;
        if (!startOk || !endOk) continue;
        const gross = Math.round(inc.monthlyAmount * 12 * inflationFactor);
        incomeItems.push({
          label: inc.label,
          memberName: inc.memberName,
          annualGross: gross,
          taxablePct: inc.taxablePct,
          taxableAmount: Math.round(gross * inc.taxablePct / 100),
        });
      }
      // Rental income items
      for (const acc of rentalAccounts) {
        const sold = row.accounts[acc.accountId] === 0 && acc.plannedSaleYear && row.year >= acc.plannedSaleYear;
        const startOk = acc.rentalStartYear == null || row.year >= acc.rentalStartYear;
        const endOk = acc.rentalEndYear == null || row.year <= acc.rentalEndYear;
        if (sold || !startOk || !endOk) continue;
        const gross = Math.round((acc.rentalIncomeMonthly || 0) * 12 * inflationFactor);
        incomeItems.push({
          label: `${acc.isJoint ? "Joint " : ""}Rental: ${acc.accountName}`,
          memberName: acc.memberName,
          annualGross: gross,
          taxablePct: 100,
          taxableAmount: gross,
        });
      }

      // ── Expense items ──
      const expenseItems: ExpenseDetail[] = [];
      for (const exp of expenseInputs) {
        const startOk = exp.startYear === null || row.year >= exp.startYear;
        const endOk = exp.endYear === null || row.year <= exp.endYear;
        if (!startOk || !endOk) continue;
        expenseItems.push({
          label: exp.label,
          amount: Math.round(exp.monthlyAmount * 12 * inflationFactor),
        });
      }

      // ── Capital expense items ──
      const capitalExpenseItems: CapexDetail[] = [];
      for (const ce of capexInputs) {
        if (row.year < ce.startYear) continue;
        if (!ce.recurrenceIntervalYears || ce.recurrenceIntervalYears <= 0) {
          if (row.year === ce.startYear) {
            capitalExpenseItems.push({ label: ce.label, amount: Math.round(ce.amount * inflationFactor) });
          }
        } else {
          const diff = row.year - ce.startYear;
          if (diff % ce.recurrenceIntervalYears === 0) {
            const idx = diff / ce.recurrenceIntervalYears;
            if (idx < ce.recurrenceCount) {
              capitalExpenseItems.push({ label: ce.label, amount: Math.round(ce.amount * inflationFactor) });
            }
          }
        }
      }

      // ── Tax: use engine-provided data ──
      const memberTax: MemberTax[] = row.memberTax.map((mt) => ({
        name: mt.name.split(" ")[0],
        age: mt.age,
        grossIncome: mt.grossIncome,
        taxableIncome: mt.taxableIncome,
        netTax: mt.netTax,
        effectiveRate: mt.effectiveRate,
        marginalRate: mt.marginalRate,
        monthlyTax: mt.monthlyTax,
      }));

      const householdTax = row.householdTax;
      const householdTaxable = memberTax.reduce((s, t) => s + t.taxableIncome, 0);
      const householdEffRate = householdTaxable > 0 ? (householdTax / householdTaxable) * 100 : 0;

      return {
        year: row.year,
        age,
        olderAge,
        portfolioTotal: row.total,
        totalContributions,
        totalGrowth,
        accountGrowth,
        grossIncome: row.totalIncome,
        incomeItems,
        totalExpenses: row.totalExpenses,
        expenseItems,
        capitalExpenseTotal: row.capitalExpenseTotal,
        capitalExpenseItems,
        memberTax,
        householdTax,
        householdCGT: row.householdCGT,
        householdEffRate: Math.round(householdEffRate * 100) / 100,
        netCashFlow: row.netCashFlow,
        propertySaleProceeds: row.propertySaleProceeds,
        rentalIncome: row.rentalIncome,
        jointRentalIncome: row.jointRentalIncome,
      };
    });

    return rows;
  }, [members, expenses, capitalExpenses, family]);

  if (loading) return null;

  const hasData = calcRows.length > 0;

  // Milestone years: current, every 5, retirement, sale, last
  const milestoneYears = new Set<number>();
  if (hasData) {
    const currentYear = new Date().getFullYear();
    milestoneYears.add(currentYear);
    for (const row of calcRows) {
      if (row.age % 5 === 0) milestoneYears.add(row.year);
      if (row.propertySaleProceeds > 0) milestoneYears.add(row.year);
    }
    for (const m of members.filter((m) => m.date_of_birth)) {
      milestoneYears.add(calculateRetirementYear(m.date_of_birth!, m.retirement_age));
    }
    milestoneYears.add(calcRows[calcRows.length - 1].year);
  }

  const displayRows = showEveryYear
    ? calcRows
    : calcRows.filter((r) => milestoneYears.has(r.year));

  return (
    <>
      <PageHeader
        title="Calculations"
        subtitle="Year-by-year projections with investment growth and per-member tax"
        action={
          hasData ? (
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", cursor: "pointer", color: "var(--gray-600)" }}>
              <input
                type="checkbox"
                checked={showEveryYear}
                onChange={(e) => setShowEveryYear(e.target.checked)}
              />
              Show every year
            </label>
          ) : undefined
        }
      />

      {!hasData ? (
        <EmptyState
          icon={Sigma}
          title="No accounts yet"
          body="Add accounts on the Assets tab to see year-by-year calculations."
        />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <th>Year</th>
                <th>Age</th>
                <th style={{ textAlign: "right" }}>Portfolio</th>
                <th style={{ textAlign: "right" }}>Growth</th>
                <th style={{ textAlign: "right" }}>Gross Income</th>
                <th style={{ textAlign: "right" }}>Expenses</th>
                <th style={{ textAlign: "right" }}>Tax</th>
                <th style={{ textAlign: "right" }}>Eff. Rate</th>
                <th style={{ textAlign: "right" }}>Net Cash Flow</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                const isExpanded = expandedYear === row.year;
                const isRetirement = members.some((m) => m.date_of_birth && calculateRetirementYear(m.date_of_birth, m.retirement_age) === row.year);
                const hasSale = row.propertySaleProceeds > 0;

                return (
                  <tr
                    key={row.year}
                    onClick={() => setExpandedYear(isExpanded ? null : row.year)}
                    style={{
                      cursor: "pointer",
                      ...(isRetirement ? { background: "var(--error-50)" } : hasSale ? { background: "var(--warning-50)" } : {}),
                    }}
                  >
                    <td>
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {row.year}
                      {isRetirement && <span style={{ color: "var(--error-500)", fontSize: "var(--text-xs)", marginLeft: 4 }}>RET</span>}
                      {hasSale && <span style={{ color: "var(--warning-600)", fontSize: "var(--text-xs)", marginLeft: 4 }}>SALE</span>}
                    </td>
                    <td>
                      {row.age}
                      {row.olderAge !== null && (
                        <span style={{ color: "var(--gray-400)", fontSize: "var(--text-xs)" }}> / {row.olderAge}</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(row.portfolioTotal)}</td>
                    <td style={{ textAlign: "right", color: row.totalGrowth >= 0 ? "var(--success-600)" : "var(--error-600)" }}>
                      {formatCurrency(row.totalGrowth)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--success-600)" }}>{formatCurrency(row.grossIncome)}</td>
                    <td style={{ textAlign: "right", color: "var(--error-600)" }}>{formatCurrency(row.totalExpenses + row.capitalExpenseTotal)}</td>
                    <td style={{ textAlign: "right", color: "var(--gray-600)" }}>{formatCurrency(row.householdTax)}</td>
                    <td style={{ textAlign: "right", color: "var(--gray-500)" }}>{formatPercentage(row.householdEffRate, 1)}</td>
                    <td style={{
                      textAlign: "right",
                      fontWeight: 500,
                      color: row.netCashFlow >= 0 ? "var(--success-600)" : "var(--error-600)",
                    }}>
                      {formatCurrency(row.netCashFlow)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ── Expanded detail panel ── */}
          {expandedYear !== null && (() => {
            const row = calcRows.find((r) => r.year === expandedYear);
            if (!row) return null;
            return (
              <Card style={{ marginTop: "var(--space-4)" }}>
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-5)" }}>
                  {row.year} Detail
                  <span style={{ color: "var(--gray-500)", fontWeight: 400, marginLeft: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                    Age {row.age}{row.olderAge !== null ? ` / ${row.olderAge}` : ""}
                  </span>
                </h3>

                {/* ── Investment Growth ── */}
                <SectionHeading>Investment Growth</SectionHeading>
                <div style={{ overflowX: "auto", marginBottom: "var(--space-5)" }}>
                  <table className="table" style={{ fontSize: "var(--text-sm)" }}>
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th style={{ textAlign: "right" }}>Opening</th>
                        <th style={{ textAlign: "right" }}>Contributions</th>
                        <th style={{ textAlign: "right" }}>Return</th>
                        <th style={{ textAlign: "right" }}>Return %</th>
                        <th style={{ textAlign: "right" }}>Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.accountGrowth.filter((a) => a.opening > 0 || a.closing > 0).map((a) => (
                        <tr key={a.name}>
                          <td>
                            {a.name}
                            <span style={{ color: "var(--gray-400)", fontSize: "var(--text-xs)", marginLeft: 4 }}>
                              {a.type}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>{formatCurrency(a.opening)}</td>
                          <td style={{ textAlign: "right", color: a.contributions > 0 ? "var(--brand-600)" : "var(--gray-400)" }}>
                            {a.contributions > 0 ? formatCurrency(a.contributions) : "—"}
                          </td>
                          <td style={{ textAlign: "right", color: a.growth >= 0 ? "var(--success-600)" : "var(--error-600)" }}>
                            {formatCurrency(a.growth)}
                          </td>
                          <td style={{ textAlign: "right", color: a.returnPct >= 0 ? "var(--success-600)" : "var(--error-600)" }}>
                            {formatPercentage(a.returnPct, 1)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(a.closing)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: "2px solid var(--border-default)", fontWeight: 700 }}>
                        <td>Total</td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(row.accountGrowth.reduce((s, a) => s + a.opening, 0))}</td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(row.totalContributions)}</td>
                        <td style={{ textAlign: "right", color: row.totalGrowth >= 0 ? "var(--success-600)" : "var(--error-600)" }}>
                          {formatCurrency(row.totalGrowth)}
                        </td>
                        <td></td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(row.portfolioTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
                  {/* ── Left column: Income & Tax ── */}
                  <div>
                    {/* Income by source */}
                    <SectionHeading>Income by Source</SectionHeading>
                    {row.incomeItems.length === 0 ? (
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginBottom: "var(--space-4)" }}>No income this year.</p>
                    ) : (
                      <table className="table" style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-5)" }}>
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th style={{ textAlign: "right" }}>Annual</th>
                            <th style={{ textAlign: "right" }}>Tax %</th>
                            <th style={{ textAlign: "right" }}>Taxable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.incomeItems.map((item, i) => (
                            <tr key={i}>
                              <td>
                                {item.label}
                                <span style={{ color: "var(--gray-400)", fontSize: "var(--text-xs)", marginLeft: 4 }}>
                                  ({item.memberName.split(" ")[0]})
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>{formatCurrency(item.annualGross)}</td>
                              <td style={{ textAlign: "right" }}>{formatPercentage(item.taxablePct, 0)}</td>
                              <td style={{ textAlign: "right" }}>{formatCurrency(item.taxableAmount)}</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: "2px solid var(--border-default)", fontWeight: 700 }}>
                            <td>Total</td>
                            <td style={{ textAlign: "right" }}>{formatCurrency(row.grossIncome)}</td>
                            <td></td>
                            <td style={{ textAlign: "right" }}>{formatCurrency(row.incomeItems.reduce((s, i) => s + i.taxableAmount, 0))}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {/* Per-member tax */}
                    <SectionHeading>Tax by Member</SectionHeading>
                    <div style={{ display: "grid", gridTemplateColumns: row.memberTax.length > 1 ? "1fr 1fr" : "1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                      {row.memberTax.map((mt) => (
                        <div key={mt.name} style={{ background: "var(--surface-sunken)", borderRadius: 8, padding: "var(--space-3)" }}>
                          <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", marginBottom: "var(--space-2)" }}>
                            {mt.name} <span style={{ color: "var(--gray-400)", fontWeight: 400 }}>({mt.age})</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2px var(--space-3)", fontSize: "var(--text-xs)" }}>
                            <span style={{ color: "var(--gray-500)" }}>Gross</span>
                            <span style={{ textAlign: "right" }}>{formatCurrency(mt.grossIncome)}</span>
                            <span style={{ color: "var(--gray-500)" }}>Taxable</span>
                            <span style={{ textAlign: "right" }}>{formatCurrency(mt.taxableIncome)}</span>
                            <span style={{ color: "var(--gray-500)" }}>Tax</span>
                            <span style={{ textAlign: "right", color: "var(--error-600)", fontWeight: 600 }}>{formatCurrency(mt.netTax)}</span>
                            <span style={{ color: "var(--gray-500)" }}>Eff / Marginal</span>
                            <span style={{ textAlign: "right" }}>{formatPercentage(mt.effectiveRate, 1)} / {formatPercentage(mt.marginalRate, 0)}</span>
                            <span style={{ color: "var(--gray-500)" }}>Monthly</span>
                            <span style={{ textAlign: "right" }}>{formatCurrency(mt.monthlyTax)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-4)", padding: "var(--space-2) 0", fontSize: "var(--text-sm)" }}>
                      <span style={{ fontWeight: 600 }}>Household Tax:</span>
                      <span style={{ color: "var(--error-600)", fontWeight: 600 }}>{formatCurrency(row.householdTax)}</span>
                      <span style={{ color: "var(--gray-500)" }}>({formatPercentage(row.householdEffRate, 1)} effective)</span>
                    </div>
                  </div>

                  {/* ── Right column: Expenses & Cash Flow ── */}
                  <div>
                    {/* Expenses */}
                    <SectionHeading>Expenses</SectionHeading>
                    {row.expenseItems.length === 0 && row.capitalExpenseItems.length === 0 ? (
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginBottom: "var(--space-4)" }}>No expenses this year.</p>
                    ) : (
                      <table className="table" style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-5)" }}>
                        <tbody>
                          {row.expenseItems.map((exp, i) => (
                            <tr key={i}>
                              <td>{exp.label}</td>
                              <td style={{ textAlign: "right", color: "var(--error-600)" }}>{formatCurrency(exp.amount)}</td>
                            </tr>
                          ))}
                          {row.capitalExpenseItems.map((ce, i) => (
                            <tr key={`ce-${i}`} style={{ fontStyle: "italic" }}>
                              <td>
                                {ce.label}
                                <span style={{ color: "var(--gray-400)", fontSize: "var(--text-xs)", marginLeft: 4 }}>capital</span>
                              </td>
                              <td style={{ textAlign: "right", color: "var(--warning-600)" }}>{formatCurrency(ce.amount)}</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: "2px solid var(--border-default)", fontWeight: 700 }}>
                            <td>Total</td>
                            <td style={{ textAlign: "right", color: "var(--error-600)" }}>
                              {formatCurrency(row.totalExpenses + row.capitalExpenseTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {/* Cash flow waterfall */}
                    <SectionHeading>Cash Flow</SectionHeading>
                    <table className="table" style={{ fontSize: "var(--text-sm)" }}>
                      <tbody>
                        <tr>
                          <td>Gross Income</td>
                          <td style={{ textAlign: "right", color: "var(--success-600)" }}>{formatCurrency(row.grossIncome)}</td>
                        </tr>
                        <tr>
                          <td>Less: Income Tax</td>
                          <td style={{ textAlign: "right", color: "var(--error-600)" }}>-{formatCurrency(row.householdTax - row.householdCGT)}</td>
                        </tr>
                        {row.householdCGT > 0 && (
                          <tr>
                            <td>Less: Capital Gains Tax</td>
                            <td style={{ textAlign: "right", color: "var(--error-600)" }}>-{formatCurrency(row.householdCGT)}</td>
                          </tr>
                        )}
                        <tr style={{ borderTop: "1px solid var(--border-default)" }}>
                          <td style={{ fontWeight: 600 }}>Net After-Tax Income</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(row.grossIncome - row.householdTax)}</td>
                        </tr>
                        <tr>
                          <td>Less: Living Expenses</td>
                          <td style={{ textAlign: "right", color: "var(--error-600)" }}>-{formatCurrency(row.totalExpenses)}</td>
                        </tr>
                        {row.capitalExpenseTotal > 0 && (
                          <tr>
                            <td>Less: Capital Expenses</td>
                            <td style={{ textAlign: "right", color: "var(--warning-600)" }}>-{formatCurrency(row.capitalExpenseTotal)}</td>
                          </tr>
                        )}
                        {row.propertySaleProceeds > 0 && (
                          <tr>
                            <td style={{ color: "var(--warning-600)" }}>Add: Property Sale Proceeds</td>
                            <td style={{ textAlign: "right", color: "var(--warning-600)", fontWeight: 500 }}>+{formatCurrency(row.propertySaleProceeds)}</td>
                          </tr>
                        )}
                        <tr style={{ borderTop: "2px solid var(--border-default)" }}>
                          <td style={{ fontWeight: 700 }}>Net Cash Flow</td>
                          <td style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: row.netCashFlow >= 0 ? "var(--success-600)" : "var(--error-600)",
                          }}>
                            {formatCurrency(row.netCashFlow)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>
      )}
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{
      fontSize: "var(--text-xs)",
      fontWeight: 700,
      color: "var(--gray-500)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: "var(--space-2)",
    }}>
      {children}
    </h4>
  );
}
