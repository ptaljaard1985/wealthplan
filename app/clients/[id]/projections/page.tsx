"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { LineChart as LineChartIcon, Wallet, Target, Clock, TrendingUp, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatCurrencyCompact, formatPercentage, calculateAge, calculateRetirementYear } from "@/lib/formatters";
import {
  calculateProjections,
  weightedAverageReturn,
  type AccountProjectionInput,
  type IncomeInput,
  type ExpenseInput,
  type CapitalExpenseInput,
} from "@/lib/projections";
import type { ClientFamily, FamilyMember, Account, Income, Expense, CapitalExpense } from "@/lib/types/database";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

const CHART_COLORS = ["#ac9121", "#2f6fbd", "#2f9464", "#c9822b", "#8f877c", "#d04a4a"];

export default function ProjectionsPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [family, setFamily] = useState<ClientFamily | null>(null);
  const [members, setMembers] = useState<(FamilyMember & { accounts: Account[]; income: Income[] })[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [capitalExpenses, setCapitalExpenses] = useState<CapitalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRealValue, setShowRealValue] = useState(false);

  // Override controls
  const [returnOverride, setReturnOverride] = useState<number | null>(null);
  const [contributionOverride, setContributionOverride] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [familyRes, membersRes, expensesRes, capexRes] = await Promise.all([
      supabase.from("client_families").select("*").eq("id", familyId).single(),
      supabase.from("family_members").select("*, accounts(*), income(*)").eq("family_id", familyId),
      supabase.from("expenses").select("*").eq("family_id", familyId),
      supabase.from("capital_expenses").select("*").eq("family_id", familyId),
    ]);

    if (familyRes.data) setFamily(familyRes.data);
    if (membersRes.data) setMembers(membersRes.data as typeof members);
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (capexRes.data) setCapitalExpenses(capexRes.data);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute projections
  const { projectionData, accountInputs, targetYear, retirementYear, youngestBirthYear, currentTotalValue, weightedReturn, inflationRate } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const allAccounts: AccountProjectionInput[] = [];
    const allIncome: IncomeInput[] = [];

    for (const m of members) {
      for (const acc of m.accounts) {
        allAccounts.push({
          accountId: acc.id,
          accountName: `${acc.account_name} (${m.first_name})`,
          memberName: `${m.first_name} ${m.last_name}`,
          accountType: acc.account_type as Account["account_type"],
          currentValue: Number(acc.current_value),
          monthlyContribution: contributionOverride ?? Number(acc.monthly_contribution),
          annualReturnPct: returnOverride ?? Number(acc.expected_return_pct),
        });
      }

      for (const inc of m.income) {
        allIncome.push({
          label: inc.label,
          memberName: `${m.first_name} ${m.last_name}`,
          monthlyAmount: Number(inc.monthly_amount),
          taxablePct: Number(inc.taxable_pct),
          startYear: inc.start_year,
          endYear: inc.end_year,
        });
      }
    }

    // Target year: youngest member reaches age 100
    const membersWithDob = members.filter((m) => m.date_of_birth);
    const birthYears = membersWithDob.map((m) => new Date(m.date_of_birth!).getFullYear());
    const yBirthYear = birthYears.length > 0 ? Math.max(...birthYears) : currentYear - 40;
    const tYear = yBirthYear + 100;

    // Retirement year: earliest retirement across members (for summary display)
    const retirementYears = membersWithDob.map((m) => calculateRetirementYear(m.date_of_birth!, m.retirement_age));
    const retYear = retirementYears.length > 0 ? Math.min(...retirementYears) : currentYear + 25;

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

    const infRate = family?.inflation_rate_pct || 6;

    const results = calculateProjections({
      accounts: allAccounts,
      income: allIncome,
      expenses: expenseInputs,
      capitalExpenses: capexInputs,
      currentYear,
      targetYear: tYear,
      inflationRatePct: infRate,
    });

    const currentTotal = allAccounts.reduce((s, a) => s + a.currentValue, 0);
    const wReturn = weightedAverageReturn(allAccounts);

    return {
      projectionData: results,
      accountInputs: allAccounts,
      targetYear: tYear,
      retirementYear: retYear,
      youngestBirthYear: yBirthYear,
      currentTotalValue: currentTotal,
      weightedReturn: wReturn,
      inflationRate: infRate,
    };
  }, [members, expenses, capitalExpenses, family, returnOverride, contributionOverride]);

  const projectedAtRetirement = projectionData.find((r) => r.year === retirementYear)?.total || 0;
  const yearsToRetirement = retirementYear - new Date().getFullYear();

  // Real (inflation-adjusted) value at retirement
  const realValueAtRetirement = useMemo(() => {
    const years = retirementYear - new Date().getFullYear();
    const deflator = Math.pow(1 + inflationRate / 100, years);
    return Math.round(projectedAtRetirement / deflator);
  }, [projectedAtRetirement, retirementYear, inflationRate]);

  if (loading) return null;

  const hasAccounts = members.some((m) => m.accounts.length > 0);

  // Youngest member's age for the retirement reference line
  const retirementAge = retirementYear - youngestBirthYear;

  // Prepare chart data with age as primary axis
  const chartData = projectionData.map((row) => {
    const age = row.year - youngestBirthYear;
    const point: Record<string, unknown> = {
      year: row.year,
      age,
      ageLabel: `${age}`,
      Total: row.total,
    };
    for (const acc of accountInputs) {
      point[acc.accountName] = Math.round(row.accounts[acc.accountId] || 0);
    }
    return point;
  });

  return (
    <>
      <PageHeader title="Projections" subtitle="Wealth growth projections over time" />

      {!hasAccounts ? (
        <EmptyState
          icon={LineChartIcon}
          title="No accounts to project"
          body="Add investment accounts on the Assets page to see projections."
        />
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <Wallet size={20} style={{ color: "var(--brand-500)" }} />
                <div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                    Current Portfolio
                  </div>
                  <div style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>
                    {formatCurrency(currentTotalValue)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Flippable retirement card */}
            <div
              onClick={() => setShowRealValue(!showRealValue)}
              style={{ cursor: "pointer", perspective: "600px" }}
            >
              <div
                style={{
                  position: "relative",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.5s ease",
                  transform: showRealValue ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front — Nominal */}
                <div
                  className="card"
                  style={{
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <Target size={20} style={{ color: "var(--success-500)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                          At Retirement (Nominal)
                        </div>
                        <RefreshCw size={12} style={{ color: "var(--gray-400)" }} />
                      </div>
                      <div style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>
                        {formatCurrency(projectedAtRetirement)}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", marginTop: "2px" }}>
                        Click to see real value
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back — Real */}
                <div
                  className="card"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <Target size={20} style={{ color: "var(--info-500)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                          At Retirement (Today&apos;s Rands)
                        </div>
                        <RefreshCw size={12} style={{ color: "var(--gray-400)" }} />
                      </div>
                      <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--info-700)" }}>
                        {formatCurrency(realValueAtRetirement)}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", marginTop: "2px" }}>
                        Click to see nominal value
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <Clock size={20} style={{ color: "var(--info-500)" }} />
                <div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                    Years to Retirement
                  </div>
                  <div style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>
                    {yearsToRetirement}
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <TrendingUp size={20} style={{ color: "var(--warning-500)" }} />
                <div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                    Weighted Net Return
                  </div>
                  <div style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>
                    {formatPercentage(weightedReturn)}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Projection Chart */}
          <Card>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, marginBottom: "var(--space-4)" }}>
              Projected Wealth Growth
            </h3>
            <div style={{ width: "100%", height: 400 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Age (youngest member)", position: "insideBottom", offset: -5, style: { fontSize: 11, fill: "var(--gray-500)" } }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatCurrencyCompact(v)}
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    labelFormatter={(label) => {
                      const row = chartData.find((d) => d.age === label);
                      return row ? `Age ${label} (${row.year})` : `Age ${label}`;
                    }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--border-default)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  />
                  <Legend />
                  <ReferenceLine
                    x={retirementAge}
                    stroke="var(--error-500)"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Retirement (${retirementAge})`,
                      position: "top",
                      style: { fontSize: 11, fill: "var(--error-500)", fontWeight: 600 },
                    }}
                  />
                  {accountInputs.map((acc, i) => (
                    <Area
                      key={acc.accountId}
                      type="monotone"
                      dataKey={acc.accountName}
                      stackId="1"
                      fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]}
                      fillOpacity={0.3}
                      stroke={CHART_COLORS[(i + 1) % CHART_COLORS.length]}
                    />
                  ))}
                  <Area
                    type="monotone"
                    dataKey="Total"
                    fill="none"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Override Controls */}
          <Card>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, marginBottom: "var(--space-4)" }}>
              Adjust Parameters
            </h3>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginBottom: "var(--space-4)" }}>
              Override values to see what-if scenarios. Changes are not saved.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
              <div>
                <label className="label">
                  Override Expected Return (%)
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  placeholder="Use account defaults"
                  value={returnOverride ?? ""}
                  onChange={(e) => setReturnOverride(e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
              <div>
                <label className="label">
                  Override Monthly Contribution (R)
                </label>
                <input
                  className="input"
                  type="number"
                  step="100"
                  min="0"
                  placeholder="Use account defaults"
                  value={contributionOverride ?? ""}
                  onChange={(e) => setContributionOverride(e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
            </div>
            {(returnOverride !== null || contributionOverride !== null) && (
              <button
                className="btn-ghost"
                style={{ marginTop: "var(--space-3)" }}
                onClick={() => { setReturnOverride(null); setContributionOverride(null); }}
              >
                Reset to saved values
              </button>
            )}
          </Card>

          {/* Cash Flow Summary */}
          {projectionData.length > 0 && (
            <Card>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, marginBottom: "var(--space-4)" }}>
                Annual Cash Flow Summary
              </h3>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Age</th>
                      <th>Portfolio Value</th>
                      <th>Annual Income</th>
                      <th>Annual Expenses</th>
                      <th>Capital Expenses</th>
                      <th>Net Cash Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectionData.map((row) => {
                      const age = row.year - youngestBirthYear;
                      const isRetirement = row.year === retirementYear;
                      return (
                        <tr key={row.year} style={isRetirement ? { background: "var(--brand-50)", fontWeight: 600 } : undefined}>
                          <td style={{ fontWeight: 500 }}>{row.year}</td>
                          <td>{age}</td>
                          <td>{formatCurrency(row.total)}</td>
                          <td style={{ color: "var(--success-700)" }}>{formatCurrency(row.totalIncome)}</td>
                          <td style={{ color: "var(--error-700)" }}>{formatCurrency(row.totalExpenses)}</td>
                          <td style={{ color: row.capitalExpenseTotal > 0 ? "var(--warning-700)" : "var(--gray-400)" }}>
                            {row.capitalExpenseTotal > 0 ? formatCurrency(row.capitalExpenseTotal) : "—"}
                          </td>
                          <td style={{ fontWeight: 500, color: row.netCashFlow >= 0 ? "var(--success-700)" : "var(--error-700)" }}>
                            {formatCurrency(row.netCashFlow)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}
