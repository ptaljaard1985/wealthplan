"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  SlidersHorizontal,
  Target,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Wallet,
  Receipt,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatCurrencyCompact, calculateRetirementYear } from "@/lib/formatters";
import {
  calculateProjections,
  weightedAverageReturn,
  type AccountProjectionInput,
  type IncomeInput,
  type ExpenseInput,
  type CapitalExpenseInput,
} from "@/lib/projections";
import { runProjectionEngine } from "@/lib/engines/projection-engine";
import { DEFAULT_FAMILY_SETTINGS } from "@/lib/engines/types";
import type { MemberConfig, ProjectionConfig as V2Config } from "@/lib/engines/types";
import { calculateRetirementYear as calcRetYear } from "@/lib/formatters";
import type { ClientFamily, FamilyMember, Account, Income, Expense, CapitalExpense } from "@/lib/types/database";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

type TabId = "summary" | "assets" | "expenses" | "retirement";

const TABS: { id: TabId; label: string; icon: typeof Wallet }[] = [
  { id: "summary", label: "Summary", icon: Target },
  { id: "assets", label: "Assets", icon: Wallet },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "retirement", label: "Retirement", icon: Clock },
];

export default function ScenariosPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [family, setFamily] = useState<ClientFamily | null>(null);
  const [members, setMembers] = useState<(FamilyMember & { accounts: Account[]; income: Income[] })[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [capitalExpenses, setCapitalExpenses] = useState<CapitalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("summary");

  // Scenario controls (null = use baseline)
  const [returnOverride, setReturnOverride] = useState<number | null>(null);
  const [contributionOverride, setContributionOverride] = useState<number | null>(null);
  const [inflationOverride, setInflationOverride] = useState<number | null>(null);
  const [retirementAgeOverride, setRetirementAgeOverride] = useState<number | null>(null);
  const [expenseAdjustPct, setExpenseAdjustPct] = useState<number | null>(null);
  const [lumpSum, setLumpSum] = useState<number | null>(null);

  const hasAnyOverride =
    returnOverride !== null ||
    contributionOverride !== null ||
    inflationOverride !== null ||
    retirementAgeOverride !== null ||
    expenseAdjustPct !== null ||
    lumpSum !== null;

  const resetAll = () => {
    setReturnOverride(null);
    setContributionOverride(null);
    setInflationOverride(null);
    setRetirementAgeOverride(null);
    setExpenseAdjustPct(null);
    setLumpSum(null);
  };

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

  // Build baseline + scenario projections
  const {
    chartData,
    baselineRetirementAge,
    scenarioRetirementAge,
    baselineAtRetirement,
    scenarioAtRetirement,
    baselineWeightedReturn,
    baselineInflation,
    baselineRetirementAgeValue,
    hasAccounts,
  } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const noAccounts = !members.some((m) => m.accounts.length > 0);

    if (noAccounts) {
      return {
        chartData: [],
        baselineRetirementAge: 65,
        scenarioRetirementAge: 65,
        baselineAtRetirement: 0,
        scenarioAtRetirement: 0,
        baselineWeightedReturn: 0,
        baselineInflation: 6,
        baselineRetirementAgeValue: 65,
        hasAccounts: false,
      };
    }

    // ── Build V2 member configs ──
    const memberConfigs: MemberConfig[] = members
      .filter((m) => m.date_of_birth)
      .map((m) => ({
        memberId: m.id,
        name: `${m.first_name} ${m.last_name}`,
        dateOfBirth: m.date_of_birth!,
        retirementAge: m.retirement_age,
        retirementYear: calcRetYear(m.date_of_birth!, m.retirement_age),
      }));

    // ── Baseline inputs ──
    const baselineAccounts: AccountProjectionInput[] = [];
    const baselineIncome: IncomeInput[] = [];

    for (const m of members) {
      for (const acc of m.accounts) {
        baselineAccounts.push({
          accountId: acc.id,
          accountName: `${acc.account_name} (${m.first_name})`,
          memberName: `${m.first_name} ${m.last_name}`,
          accountType: acc.account_type as Account["account_type"],
          currentValue: Number(acc.current_value),
          monthlyContribution: Number(acc.monthly_contribution),
          annualReturnPct: Number(acc.expected_return_pct),
          memberId: m.id,
        });
      }

      for (const inc of m.income) {
        baselineIncome.push({
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

    const baselineExpenses: ExpenseInput[] = expenses.map((e) => ({
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

    const membersWithDob = members.filter((m) => m.date_of_birth);
    const birthYears = membersWithDob.map((m) => new Date(m.date_of_birth!).getFullYear());
    const youngestBirthYear = birthYears.length > 0 ? Math.max(...birthYears) : currentYear - 40;
    const targetYear = youngestBirthYear + 100;

    const retirementYears = membersWithDob.map((m) => calculateRetirementYear(m.date_of_birth!, m.retirement_age));
    const baseRetirementYear = retirementYears.length > 0 ? Math.min(...retirementYears) : currentYear + 25;
    const baseRetAge = baseRetirementYear - youngestBirthYear;

    const memberRetirementAges = membersWithDob.map((m) => m.retirement_age);
    const baseRetAgeValue = memberRetirementAges.length > 0 ? Math.min(...memberRetirementAges) : 65;

    const infRate = family?.inflation_rate_pct || 6;
    const wReturn = weightedAverageReturn(baselineAccounts);

    const familySettings = {
      reinvestSurplusPreRetirement: family?.reinvest_surplus_pre_retirement ?? false,
      reinvestSurplusPostRetirement: family?.reinvest_surplus_post_retirement ?? false,
      bracketInflationRatePct: family?.bracket_inflation_rate_pct ?? 2.0,
    };

    // ── Run baseline ──
    const baselineResults = runProjectionEngine({
      accounts: baselineAccounts,
      income: baselineIncome,
      expenses: baselineExpenses,
      capitalExpenses: capexInputs,
      currentYear,
      targetYear,
      inflationRatePct: infRate,
      members: memberConfigs,
      withdrawalOrder: [],
      settings: familySettings,
    });

    // ── Scenario inputs ──
    const totalPortfolio = baselineAccounts.reduce((s, a) => s + a.currentValue, 0);
    const lumpSumAmount = lumpSum ?? 0;

    const scenarioAccounts: AccountProjectionInput[] = baselineAccounts.map((acc) => {
      let lumpSumShare = 0;
      if (lumpSumAmount > 0) {
        const weight = totalPortfolio > 0 ? acc.currentValue / totalPortfolio : 1 / baselineAccounts.length;
        lumpSumShare = lumpSumAmount * weight;
      }

      return {
        ...acc,
        currentValue: acc.currentValue + lumpSumShare,
        monthlyContribution: contributionOverride ?? acc.monthlyContribution,
        annualReturnPct: returnOverride ?? acc.annualReturnPct,
      };
    });

    const scenarioExpenses: ExpenseInput[] = baselineExpenses.map((exp) => ({
      ...exp,
      monthlyAmount: exp.monthlyAmount * (1 + (expenseAdjustPct ?? 0) / 100),
    }));

    // Build scenario member configs (override retirement age if set)
    const scenarioMembers = retirementAgeOverride !== null
      ? memberConfigs.map((m) => ({
          ...m,
          retirementAge: retirementAgeOverride,
          retirementYear: new Date(m.dateOfBirth).getFullYear() + retirementAgeOverride,
        }))
      : memberConfigs;

    const scenarioResults = runProjectionEngine({
      accounts: scenarioAccounts,
      income: baselineIncome,
      expenses: scenarioExpenses,
      capitalExpenses: capexInputs,
      currentYear,
      targetYear,
      inflationRatePct: inflationOverride ?? infRate,
      members: scenarioMembers,
      withdrawalOrder: [],
      settings: familySettings,
    });

    // ── Scenario retirement ──
    const scenRetAge = retirementAgeOverride !== null
      ? retirementAgeOverride
      : baseRetAge;
    const scenRetirementYear = youngestBirthYear + scenRetAge;

    // ── Merge chart data ──
    const merged = baselineResults.map((row, i) => {
      const age = row.year - youngestBirthYear;
      return {
        year: row.year,
        age,
        Baseline: row.total,
        Scenario: scenarioResults[i]?.total ?? 0,
      };
    });

    const baseVal = baselineResults.find((r) => r.year === baseRetirementYear)?.total ?? 0;
    const scenVal = scenarioResults.find((r) => r.year === scenRetirementYear)?.total ?? 0;

    return {
      chartData: merged,
      baselineRetirementAge: baseRetAge,
      scenarioRetirementAge: scenRetAge,
      baselineAtRetirement: baseVal,
      scenarioAtRetirement: scenVal,
      baselineWeightedReturn: wReturn,
      baselineInflation: infRate,
      baselineRetirementAgeValue: baseRetAgeValue,
      hasAccounts: true,
    };
  }, [members, expenses, capitalExpenses, family, returnOverride, contributionOverride, inflationOverride, retirementAgeOverride, expenseAdjustPct, lumpSum]);

  const difference = scenarioAtRetirement - baselineAtRetirement;
  const differencePct = baselineAtRetirement !== 0 ? (difference / baselineAtRetirement) * 100 : 0;
  const isPositive = difference >= 0;

  if (loading) return null;

  return (
    <>
      {hasAnyOverride && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn-secondary" onClick={resetAll} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <RotateCcw size={14} />
            Reset All
          </button>
        </div>
      )}

      {!hasAccounts ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="No accounts to model"
          body="Add investment accounts on the Assets page to run scenario comparisons."
        />
      ) : (
        <>
          {/* ── Chart (top half) ── */}
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <div style={{ width: "100%", height: 420 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
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
                    x={baselineRetirementAge}
                    stroke="var(--error-500)"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Retirement (${baselineRetirementAge})`,
                      position: "top",
                      style: { fontSize: 11, fill: "var(--error-500)", fontWeight: 600 },
                    }}
                  />
                  {scenarioRetirementAge !== baselineRetirementAge && (
                    <ReferenceLine
                      x={scenarioRetirementAge}
                      stroke="var(--brand-500)"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Scenario (${scenarioRetirementAge})`,
                        position: "top",
                        style: { fontSize: 11, fill: "var(--brand-500)", fontWeight: 600 },
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="Baseline"
                    stroke="var(--gray-400)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Scenario"
                    stroke="var(--brand-500)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Paper-tabbed bottom half ── */}
          <div>
            {/* Tab strip */}
            <div style={{ display: "flex", gap: "2px", paddingLeft: "var(--space-2)" }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? "paper-tab paper-tab-active" : "paper-tab"}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content panel */}
            <div className="paper-panel">
              {/* ── Summary tab ── */}
              {activeTab === "summary" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-6)" }}>
                  <div className="scenario-stat">
                    <Target size={22} style={{ color: "var(--gray-400)" }} />
                    <div>
                      <div className="scenario-stat-label">Baseline at Retirement</div>
                      <div className="scenario-stat-value">
                        {formatCurrency(baselineAtRetirement)}
                      </div>
                    </div>
                  </div>

                  <div className="scenario-stat">
                    <Target size={22} style={{ color: "var(--brand-500)" }} />
                    <div>
                      <div className="scenario-stat-label">Scenario at Retirement</div>
                      <div className="scenario-stat-value" style={{ color: "var(--brand-700)" }}>
                        {formatCurrency(scenarioAtRetirement)}
                      </div>
                    </div>
                  </div>

                  <div className="scenario-stat">
                    {isPositive ? (
                      <TrendingUp size={22} style={{ color: "var(--success-500)" }} />
                    ) : (
                      <TrendingDown size={22} style={{ color: "var(--error-500)" }} />
                    )}
                    <div>
                      <div className="scenario-stat-label">Difference</div>
                      <div
                        className="scenario-stat-value"
                        style={{ color: isPositive ? "var(--success-700)" : "var(--error-700)" }}
                      >
                        {isPositive ? "+" : ""}{formatCurrency(difference)}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: isPositive ? "var(--success-500)" : "var(--error-500)", fontWeight: 500 }}>
                        {isPositive ? "+" : ""}{differencePct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Assets tab ── */}
              {activeTab === "assets" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-6)" }}>
                  <div>
                    <label className="label">Expected Return (%)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      placeholder={`${baselineWeightedReturn.toFixed(1)}% (weighted avg)`}
                      value={returnOverride ?? ""}
                      onChange={(e) => setReturnOverride(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                    <div className="input-hint">Override all accounts&apos; expected return</div>
                  </div>
                  <div>
                    <label className="label">Monthly Contribution (R)</label>
                    <input
                      className="input"
                      type="number"
                      step="500"
                      min="0"
                      placeholder="Per-account defaults"
                      value={contributionOverride ?? ""}
                      onChange={(e) => setContributionOverride(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                    <div className="input-hint">Override all accounts&apos; monthly contribution</div>
                  </div>
                  <div>
                    <label className="label">Additional Lump Sum (R)</label>
                    <input
                      className="input"
                      type="number"
                      step="10000"
                      min="0"
                      placeholder="R 0"
                      value={lumpSum ?? ""}
                      onChange={(e) => setLumpSum(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                    <div className="input-hint">Added to portfolio today, split by account weight</div>
                  </div>
                </div>
              )}

              {/* ── Expenses tab ── */}
              {activeTab === "expenses" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)", maxWidth: 600 }}>
                  <div>
                    <label className="label">Inflation Rate (%)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      min="0"
                      max="20"
                      placeholder={`${baselineInflation}%`}
                      value={inflationOverride ?? ""}
                      onChange={(e) => setInflationOverride(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                    <div className="input-hint">Affects income and expense growth rate</div>
                  </div>
                  <div>
                    <label className="label">Expenses Adjustment (%)</label>
                    <input
                      className="input"
                      type="number"
                      step="5"
                      min="-50"
                      max="100"
                      placeholder="0% (no change)"
                      value={expenseAdjustPct ?? ""}
                      onChange={(e) => setExpenseAdjustPct(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                    <div className="input-hint">Increase or decrease all expenses</div>
                  </div>
                </div>
              )}

              {/* ── Retirement tab ── */}
              {activeTab === "retirement" && (
                <div style={{ maxWidth: 300 }}>
                  <label className="label">Retirement Age</label>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    min="50"
                    max="75"
                    placeholder={`${baselineRetirementAgeValue}`}
                    value={retirementAgeOverride ?? ""}
                    onChange={(e) => setRetirementAgeOverride(e.target.value ? parseInt(e.target.value) : null)}
                  />
                  <div className="input-hint">
                    Shifts the retirement reference line and summary lookup year
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .paper-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: var(--gray-50);
          border: 1px solid var(--border-default);
          border-bottom: none;
          border-radius: 10px 10px 0 0;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--gray-500);
          cursor: pointer;
          position: relative;
          z-index: 1;
          bottom: -1px;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .paper-tab:hover {
          background: var(--gray-100);
          color: var(--gray-700);
        }
        .paper-tab-active {
          background: var(--surface-primary);
          color: var(--gray-900);
          font-weight: 600;
          box-shadow: var(--shadow-xs);
        }
        .paper-tab-active:hover {
          background: var(--surface-primary);
          color: var(--gray-900);
        }
        .paper-panel {
          background: var(--surface-primary);
          border: 1px solid var(--border-default);
          border-radius: 0 12px 12px 12px;
          box-shadow: var(--shadow-sm);
          padding: var(--space-8);
          min-height: 160px;
        }
        .scenario-stat {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .scenario-stat-label {
          font-size: var(--text-xs);
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .scenario-stat-value {
          font-size: var(--text-2xl);
          font-weight: 700;
          margin-top: 2px;
        }
        .input-hint {
          font-size: var(--text-xs);
          color: var(--gray-400);
          margin-top: var(--space-1);
        }
      `}</style>
    </>
  );
}
