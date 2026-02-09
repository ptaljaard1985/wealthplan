"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ClientFamily, FamilyMember, Account, Income, Expense, CapitalExpense, LifeEvent } from "@/lib/types/database";
import { getIconColor } from "@/components/events/event-form";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyCompact, formatCurrency, calculateRetirementYear } from "@/lib/formatters";
import {
  type AccountProjectionInput,
  type IncomeInput,
  type ExpenseInput,
  type CapitalExpenseInput,
} from "@/lib/projections";
import { runProjectionEngine } from "@/lib/engines/projection-engine";
import { DEFAULT_FAMILY_SETTINGS } from "@/lib/engines/types";
import type { MemberConfig, ProjectionConfig as V2Config } from "@/lib/engines/types";
import { calculateRetirementYear as calcRetYear } from "@/lib/formatters";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  ArrowLeft,
  FileText,
  Wallet,
  TrendingUp,
  Receipt,
  Landmark,
  SlidersHorizontal,
  Calculator,
  Sigma,
  ZoomOut,
  Briefcase,
  ListOrdered,
  Flag,
} from "lucide-react";

const INCOME_COLORS = ["#2f9464", "#2f6fbd", "#c9822b", "#8f877c", "#ac9121", "#6b5fa0"];

const ASSET_TYPE_CONFIG = [
  { key: "retirement", label: "Retirement", color: "#ac9121" },
  { key: "non-retirement", label: "Non-retirement", color: "#2f6fbd" },
  { key: "tax-free", label: "Tax-free", color: "#2f9464" },
  { key: "property", label: "Property", color: "#c9822b" },
] as const;

export default function ClientDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;
  const [family, setFamily] = useState<ClientFamily | null>(null);
  const [members, setMembers] = useState<(FamilyMember & { accounts: Account[]; income: Income[] })[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [capitalExpenses, setCapitalExpenses] = useState<CapitalExpense[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart view tab
  const [chartView, setChartView] = useState<"assets" | "income">("assets");
  const [showReal, setShowReal] = useState(false);

  // Zoom state for the chart
  const [zoomLeft, setZoomLeft] = useState<number | null>(null);
  const [zoomRight, setZoomRight] = useState<number | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const isZoomed = zoomLeft !== null && zoomRight !== null;

  // Asset type toggles
  const [visibleAssetTypes, setVisibleAssetTypes] = useState<Record<string, boolean>>({
    retirement: true,
    "non-retirement": true,
    "tax-free": true,
    property: true,
  });
  const toggleAssetType = (key: string) => {
    setVisibleAssetTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Income source toggles (absent key = visible)
  const [visibleIncomeSources, setVisibleIncomeSources] = useState<Record<string, boolean>>({});
  const toggleIncomeSource = (label: string) => {
    setVisibleIncomeSources((prev) => ({ ...prev, [label]: prev[label] === false ? true : false }));
  };
  const [showExpenseLine, setShowExpenseLine] = useState(true);
  const [showGrossLine, setShowGrossLine] = useState(true);
  const [hoveredEventAge, setHoveredEventAge] = useState<number | null>(null);

  const base = `/clients/${id}`;

  const tabs = [
    { href: base, label: "Information", icon: FileText, exact: true, color: "var(--gray-500)" },
    { href: `${base}/assets`, label: "Assets", icon: Wallet, color: "var(--brand-500)" },
    { href: `${base}/income`, label: "Income", icon: TrendingUp, color: "var(--success-500)" },
    { href: `${base}/expenses`, label: "Expenses", icon: Receipt, color: "var(--error-500)" },
    { href: `${base}/capital-expenses`, label: "Capital Exp.", icon: Landmark, color: "var(--warning-700)" },
    { href: `${base}/events`, label: "Events", icon: Flag, color: "#6b5fa0" },
    { href: `${base}/scenarios`, label: "Scenarios", icon: SlidersHorizontal, color: "var(--brand-500)" },
    { href: `${base}/tax`, label: "Tax View", icon: Calculator, color: "var(--gray-600)" },
    { href: `${base}/calculations`, label: "Calculations", icon: Sigma, color: "var(--info-500)" },
    { href: `${base}/retirement`, label: "Retirement", icon: Briefcase, color: "var(--brand-600)" },
    { href: `${base}/withdrawal-order`, label: "Withdrawal Order", icon: ListOrdered, color: "var(--warning-700)" },
  ];

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [familyRes, membersRes, expensesRes, capexRes, eventsRes] = await Promise.all([
      supabase.from("client_families").select("*").eq("id", id).single(),
      supabase.from("family_members").select("*, accounts(*), income(*)").eq("family_id", id),
      supabase.from("expenses").select("*").eq("family_id", id),
      supabase.from("capital_expenses").select("*").eq("family_id", id),
      supabase.from("events").select("*").eq("family_id", id).order("event_year"),
    ]);

    if (familyRes.data) setFamily(familyRes.data);
    if (membersRes.data) setMembers(membersRes.data as typeof members);
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (capexRes.data) setCapitalExpenses(capexRes.data);
    if (eventsRes.data) setLifeEvents(eventsRes.data);
    setLoading(false);
  }, [id]);

  // Re-fetch on every tab change so charts reflect latest data
  useEffect(() => {
    fetchData();
  }, [fetchData, pathname]);

  // Compute projections for the overview chart
  const { chartData, retirementAge, hasAccounts, inflationRate, baseYear, incomeLabels, accountTypes, youngestName, olderName, ageDiff } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const noAccounts = !members.some((m) => m.accounts.length > 0);

    if (noAccounts) {
      return { chartData: [] as Record<string, number>[], retirementAge: 65, hasAccounts: false, inflationRate: 6, baseYear: currentYear, incomeLabels: [] as string[], accountTypes: new Set<string>(), youngestName: "", olderName: null as string | null, ageDiff: 0 };
    }

    const allAccounts: AccountProjectionInput[] = [];
    const allIncome: IncomeInput[] = [];

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
        allAccounts.push({
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
          memberId: m.id,
          category: inc.category,
        });
      }
    }

    const membersWithDob = members.filter((m) => m.date_of_birth);
    const birthYears = membersWithDob.map((m) => new Date(m.date_of_birth!).getFullYear());
    const youngestBirthYear = birthYears.length > 0 ? Math.max(...birthYears) : currentYear - 40;
    const oldestBirthYear = birthYears.length > 1 ? Math.min(...birthYears) : null;
    const ageDiff = oldestBirthYear !== null ? youngestBirthYear - oldestBirthYear : 0;

    const youngestMem = membersWithDob.length > 0
      ? membersWithDob.reduce((a, b) => (a.date_of_birth! > b.date_of_birth! ? a : b))
      : null;
    const olderMem = membersWithDob.length > 1
      ? membersWithDob.reduce((a, b) => (a.date_of_birth! < b.date_of_birth! ? a : b))
      : null;

    const targetYear = youngestBirthYear + 100;

    const retirementYears = membersWithDob.map((m) => calculateRetirementYear(m.date_of_birth!, m.retirement_age));
    const retYear = retirementYears.length > 0 ? Math.min(...retirementYears) : currentYear + 25;
    const retAge = retYear - youngestBirthYear;

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

    // Run V2 engine with member info for built-in tax
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

    // Build per-source income labels (regular income + property rental)
    const incomeLabels = allIncome.map((inc) => `${inc.label} (${inc.memberName.split(" ")[0]})`);
    const propertyRentalAccounts = allAccounts.filter((a) => a.accountType === "property" && a.rentalIncomeMonthly);
    const rentalLabels = propertyRentalAccounts.map((a) => `${a.isJoint ? "Joint " : ""}Rental: ${a.accountName}`);
    const allIncomeLabels = [...incomeLabels, ...rentalLabels];

    // Track which account types exist
    const accountTypes = new Set(allAccounts.map((a) => a.accountType));

    // Build member name → ID map for tax lookup
    const memberNameToId: Record<string, string> = {};
    for (const m of members) {
      memberNameToId[`${m.first_name} ${m.last_name}`] = m.id;
    }
    const allMemberNames = members.map((m) => `${m.first_name} ${m.last_name}`);

    const data = results.map((row) => {
      const yearsFromNow = row.year - currentYear;
      const inflationFactor = Math.pow(1 + infRate / 100, yearsFromNow);

      const point: Record<string, number> = {
        age: row.year - youngestBirthYear,
        year: row.year,
        Total: row.total,
        Expenses: row.totalExpenses + row.capitalExpenseTotal,
      };

      // Per-type asset breakdown
      for (const t of ASSET_TYPE_CONFIG) {
        point[t.key] = allAccounts
          .filter((a) => a.accountType === t.key)
          .reduce((sum, a) => sum + Math.round(row.accounts[a.accountId] || 0), 0);
      }

      // Per-source income (gross first)
      for (let i = 0; i < allIncome.length; i++) {
        const inc = allIncome[i];
        const startOk = inc.startYear === null || row.year >= inc.startYear;
        const endOk = inc.endYear === null || row.year <= inc.endYear;
        point[incomeLabels[i]] = startOk && endOk
          ? Math.round(inc.monthlyAmount * 12 * inflationFactor)
          : 0;
      }

      // Per-property rental income (gross)
      for (let i = 0; i < propertyRentalAccounts.length; i++) {
        const acc = propertyRentalAccounts[i];
        const sold = row.accounts[acc.accountId] === 0 && acc.plannedSaleYear && row.year >= acc.plannedSaleYear;
        const startOk = acc.rentalStartYear == null || row.year >= acc.rentalStartYear;
        const endOk = acc.rentalEndYear == null || row.year <= acc.rentalEndYear;
        point[rentalLabels[i]] = !sold && startOk && endOk
          ? Math.round((acc.rentalIncomeMonthly || 0) * 12 * inflationFactor)
          : 0;
      }

      // ── After-tax computation using engine-provided tax ──
      // Build per-member effective-on-gross rates from engine tax data
      const mEffRate: Record<string, number> = {};
      for (const mt of row.memberTax) {
        mEffRate[mt.name] = mt.grossIncome > 0 ? mt.netTax / mt.grossIncome : 0;
      }
      const avgEffRate = row.memberTax.length > 1
        ? row.memberTax.reduce((s, mt) => s + (mt.grossIncome > 0 ? mt.netTax / mt.grossIncome : 0), 0) / row.memberTax.length
        : (row.memberTax[0]?.grossIncome > 0 ? row.memberTax[0].netTax / row.memberTax[0].grossIncome : 0);

      // Store gross total, then reduce bars to after-tax
      let grossTotal = 0;
      for (const label of allIncomeLabels) { grossTotal += point[label] || 0; }
      point.GrossIncome = Math.round(grossTotal);

      for (let i = 0; i < incomeLabels.length; i++) {
        const memberName = allIncome[i].memberName;
        const rate = mEffRate[memberName] || 0;
        point[incomeLabels[i]] = Math.round((point[incomeLabels[i]] || 0) * (1 - rate));
      }
      for (let i = 0; i < rentalLabels.length; i++) {
        const rate = (propertyRentalAccounts[i].isJoint && allMemberNames.length > 1)
          ? avgEffRate
          : (mEffRate[propertyRentalAccounts[i].memberName] || 0);
        point[rentalLabels[i]] = Math.round((point[rentalLabels[i]] || 0) * (1 - rate));
      }

      return point;
    });

    return { chartData: data, retirementAge: retAge, hasAccounts: true, inflationRate: infRate, baseYear: currentYear, incomeLabels: allIncomeLabels, accountTypes, youngestName: youngestMem?.first_name || "", olderName: olderMem?.first_name || null, ageDiff };
  }, [members, expenses, capitalExpenses, family]);

  // Build event-by-age lookup for chart markers
  const eventsByAge = useMemo(() => {
    if (!members.length) return new Map<number, LifeEvent[]>();
    const membersWithDob = members.filter((m) => m.date_of_birth);
    const birthYears = membersWithDob.map((m) => new Date(m.date_of_birth!).getFullYear());
    const youngestBirthYear = birthYears.length > 0 ? Math.max(...birthYears) : new Date().getFullYear() - 40;
    const map = new Map<number, LifeEvent[]>();
    for (const ev of lifeEvents) {
      const age = ev.event_year - youngestBirthYear;
      const existing = map.get(age) || [];
      existing.push(ev);
      map.set(age, existing);
    }
    return map;
  }, [lifeEvents, members]);

  if (loading) {
    return (
      <main className="client-bg" style={{ overflow: "auto", minHeight: "100vh" }}>
        <div className="client-shell">
          <Skeleton width="120px" height="14px" />
          <Skeleton width="240px" height="32px" />
          <Skeleton width="100%" height="360px" style={{ marginTop: "var(--space-4)", borderRadius: "12px" }} />
          <div style={{ display: "flex", gap: "2px", marginTop: "var(--space-4)" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} width="100px" height="40px" style={{ borderRadius: "10px 10px 0 0" }} />
            ))}
          </div>
          <div className="client-panel">
            <Skeleton width="60%" height="24px" />
            <Skeleton width="100%" height="200px" style={{ marginTop: "var(--space-4)" }} />
          </div>
        </div>
        <style>{layoutStyles}</style>
      </main>
    );
  }

  if (!family) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700 }}>Family not found</h1>
        <p style={{ color: "var(--gray-500)", marginTop: "var(--space-2)" }}>
          This client family does not exist.
        </p>
      </div>
    );
  }

  return (
    <main className="client-bg" style={{ overflow: "auto", minHeight: "100vh" }}>
      <div className="client-shell">
        {/* Header */}
        <div className="client-header">
          <Link href="/dashboard" className="client-back">
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>
          <h1 className="client-title">{family.family_name}</h1>
        </div>

        {/* Charts (top half) — tabbed with drag-to-zoom */}
        {hasAccounts && (() => {
          // Apply inflation deflation for real values
          const deflate = (value: number, year: number) => {
            if (!showReal) return value;
            const years = year - baseYear;
            if (years <= 0) return value;
            return Math.round(value / Math.pow(1 + inflationRate / 100, years));
          };

          const displayData = chartData.map((d) => {
            const point: Record<string, number> = {
              ...d,
              Total: deflate(d.Total, d.year),
              Expenses: deflate(d.Expenses, d.year),
            };
            for (const t of ASSET_TYPE_CONFIG) {
              point[t.key] = deflate(d[t.key] ?? 0, d.year);
            }
            for (const label of incomeLabels) {
              point[label] = deflate(d[label] ?? 0, d.year);
            }
            point.GrossIncome = deflate(d.GrossIncome ?? 0, d.year);
            return point;
          });

          const visibleData = isZoomed
            ? displayData.filter((d) => d.age >= zoomLeft! && d.age <= zoomRight!)
            : displayData;

          // Compute XAxis ticks: regular 5-year intervals merged with event ages
          const visibleAges = visibleData.map(d => d.age);
          const minVisibleAge = visibleAges[0] ?? 0;
          const maxVisibleAge = visibleAges[visibleAges.length - 1] ?? 100;
          const regularTicks: number[] = [];
          for (let a = Math.ceil(minVisibleAge / 5) * 5; a <= maxVisibleAge; a += 5) {
            regularTicks.push(a);
          }
          const regularTickSet = new Set(regularTicks);
          const visibleEventAges = Array.from(eventsByAge.keys()).filter(a => a >= minVisibleAge && a <= maxVisibleAge);
          const xTicks = visibleEventAges.length > 0
            ? [...new Set([...regularTicks, ...visibleEventAges])].sort((a, b) => a - b)
            : undefined;
          const dotDy = ageDiff > 0 ? 42 : 26;

          // Y values based on stacked visible asset types
          const yValues = visibleData.map((d) =>
            ASSET_TYPE_CONFIG
              .filter((t) => visibleAssetTypes[t.key] && accountTypes.has(t.key))
              .reduce((sum, t) => sum + (d[t.key] || 0), 0)
          );
          const yMin = Math.min(...yValues);
          const yMax = Math.max(...yValues);
          const yPad = (yMax - yMin) * 0.05 || 1;

          return (
            <div>
              {/* Chart tab strip */}
              <div style={{ display: "flex", gap: "2px", alignItems: "flex-end" }}>
                <button
                  onClick={() => setChartView("assets")}
                  className={chartView === "assets" ? "chart-tab chart-tab-active" : "chart-tab"}
                  style={chartView === "assets" ? { background: "var(--brand-500)", color: "#fff", borderColor: "var(--brand-500)" } : undefined}
                >
                  <Wallet size={13} style={{ color: chartView === "assets" ? "#fff" : "var(--brand-500)" }} />
                  Portfolio
                </button>
                <button
                  onClick={() => setChartView("income")}
                  className={chartView === "income" ? "chart-tab chart-tab-active" : "chart-tab"}
                  style={chartView === "income" ? { background: "var(--success-500)", color: "#fff", borderColor: "var(--success-500)" } : undefined}
                >
                  <TrendingUp size={13} style={{ color: chartView === "income" ? "#fff" : "var(--success-500)" }} />
                  Income (after tax) &amp; Expenses
                </button>

                {/* Right-side controls */}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-3)", paddingBottom: "4px", flexWrap: "wrap" }}>
                  {chartView === "assets" && ASSET_TYPE_CONFIG.filter((t) => accountTypes.has(t.key)).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => toggleAssetType(t.key)}
                      className="asset-toggle"
                      style={
                        visibleAssetTypes[t.key]
                          ? { background: t.color, borderColor: t.color, color: "#fff" }
                          : undefined
                      }
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: visibleAssetTypes[t.key] ? "#fff" : t.color,
                          opacity: visibleAssetTypes[t.key] ? 1 : 0.4,
                        }}
                      />
                      {t.label}
                    </button>
                  ))}
                  {chartView === "income" && (
                    <>
                      {incomeLabels.map((label, i) => {
                        const color = INCOME_COLORS[i % INCOME_COLORS.length];
                        const visible = visibleIncomeSources[label] !== false;
                        return (
                          <button
                            key={label}
                            onClick={() => toggleIncomeSource(label)}
                            className="asset-toggle"
                            style={visible ? { background: color, borderColor: color, color: "#fff" } : undefined}
                          >
                            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: visible ? "#fff" : color, opacity: visible ? 1 : 0.4 }} />
                            {label}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setShowExpenseLine(!showExpenseLine)}
                        className="asset-toggle"
                        style={showExpenseLine ? { background: "var(--error-500)", borderColor: "var(--error-500)", color: "#fff" } : undefined}
                      >
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: showExpenseLine ? "#fff" : "var(--error-500)", opacity: showExpenseLine ? 1 : 0.4 }} />
                        Expenses
                      </button>
                      <button
                        onClick={() => setShowGrossLine(!showGrossLine)}
                        className="asset-toggle"
                        style={showGrossLine ? { background: "var(--gray-500)", borderColor: "var(--gray-500)", color: "#fff" } : undefined}
                      >
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: showGrossLine ? "#fff" : "var(--gray-500)", opacity: showGrossLine ? 1 : 0.4 }} />
                        Gross Income
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowReal(!showReal)}
                    className="real-toggle"
                    title={showReal ? "Showing today's rands — click for nominal" : "Showing nominal — click for today's rands"}
                  >
                    <span className={showReal ? "real-toggle-option" : "real-toggle-option real-toggle-active"}>Nominal</span>
                    <span className={showReal ? "real-toggle-option real-toggle-active" : "real-toggle-option"}>Real</span>
                  </button>
                  {isZoomed && (
                    <button
                      className="btn-ghost"
                      onClick={() => { setZoomLeft(null); setZoomRight(null); }}
                      style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "var(--text-xs)", padding: "6px 12px" }}
                    >
                      <ZoomOut size={13} />
                      Reset Zoom
                    </button>
                  )}
                </div>
              </div>

              {/* Chart panel */}
              <div className="chart-panel" style={{ userSelect: "none" }}>
                {chartView === "assets" && (
                  <div style={{ width: "100%", height: 360 }}>
                    <ResponsiveContainer>
                      <ComposedChart
                        data={visibleData}
                        onMouseDown={(e) => {
                          if (e && e.activeLabel != null) {
                            setRefAreaLeft(Number(e.activeLabel));
                            setRefAreaRight(null);
                          }
                        }}
                        onMouseMove={(e) => {
                          if (refAreaLeft !== null && e && e.activeLabel != null) {
                            setRefAreaRight(Number(e.activeLabel));
                          }
                        }}
                        onMouseUp={() => {
                          if (refAreaLeft !== null && refAreaRight !== null) {
                            const left = Math.min(refAreaLeft, refAreaRight);
                            const right = Math.max(refAreaLeft, refAreaRight);
                            if (right - left >= 2) {
                              setZoomLeft(left);
                              setZoomRight(right);
                            }
                          }
                          setRefAreaLeft(null);
                          setRefAreaRight(null);
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                        <XAxis
                          dataKey="age"
                          allowDataOverflow
                          ticks={xTicks}
                          height={(ageDiff > 0 ? 50 : 30) + (lifeEvents.length > 0 ? 20 : 0)}
                          tick={(props: { x: string | number; y: string | number; payload: { value: number } }) => {
                            const { x, y, payload } = props;
                            const age = payload.value;
                            const showLabel = regularTickSet.has(age);
                            const evs = eventsByAge.get(age);
                            if (!showLabel && !evs) return <g />;
                            return (
                              <g transform={`translate(${x},${y})`}>
                                {showLabel && (
                                  <>
                                    <text x={0} y={0} dy={14} textAnchor="middle" fontSize={11} fill="#4f4a42">
                                      {age}
                                    </text>
                                    {ageDiff > 0 && (
                                      <text x={0} y={0} dy={27} textAnchor="middle" fontSize={9} fill="#b6afa4">
                                        {age + ageDiff}
                                      </text>
                                    )}
                                  </>
                                )}
                                {evs && (() => {
                                  const color = evs[0].color || getIconColor(evs[0].icon);
                                  const isHovered = hoveredEventAge === age;
                                  const labelText = evs.map(e => e.label).join(", ");
                                  const textW = labelText.length * 6.5 + 16;
                                  return (
                                    <g
                                      onMouseEnter={() => setHoveredEventAge(age)}
                                      onMouseLeave={() => setHoveredEventAge(null)}
                                      style={{ cursor: "pointer" }}
                                    >
                                      <circle cx={0} cy={dotDy} r={16} fill="transparent" />
                                      <circle cx={0} cy={dotDy} r={isHovered ? 10 : 8} fill={color} stroke="#fff" strokeWidth={2} />
                                      <text x={0} y={dotDy} textAnchor="middle" dy={4} fontSize={9} fill="#fff" fontWeight={700} style={{ pointerEvents: "none" }}>
                                        {evs.length > 1 ? evs.length : evs[0].icon.charAt(0).toUpperCase()}
                                      </text>
                                      {isHovered && (
                                        <g>
                                          <rect x={-textW / 2} y={dotDy - 28} width={textW} height={20} rx={6} fill={color} opacity={0.95} />
                                          <polygon points={`${-4},${dotDy - 8} ${4},${dotDy - 8} ${0},${dotDy - 4}`} fill={color} opacity={0.95} />
                                          <text x={0} y={dotDy - 15} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600} style={{ pointerEvents: "none" }}>
                                            {labelText}
                                          </text>
                                        </g>
                                      )}
                                    </g>
                                  );
                                })()}
                              </g>
                            );
                          }}
                          label={ageDiff > 0
                            ? { value: `${youngestName} / ${olderName}`, position: "insideBottom", offset: -5, style: { fontSize: 10, fill: "var(--gray-500)" } }
                            : { value: youngestName || "Age", position: "insideBottom", offset: -5, style: { fontSize: 10, fill: "var(--gray-500)" } }
                          }
                        />
                        <YAxis
                          tickFormatter={(v: number) => formatCurrencyCompact(v)}
                          tick={{ fontSize: 11 }}
                          width={72}
                          domain={isZoomed ? [Math.max(0, yMin - yPad), yMax + yPad] : ["auto", "auto"]}
                          allowDataOverflow
                        />
                        <Tooltip
                          formatter={(value, name) => {
                            const cfg = ASSET_TYPE_CONFIG.find((t) => t.key === name);
                            return [formatCurrency(Number(value)), cfg ? cfg.label : String(name)];
                          }}
                          labelFormatter={(label) => {
                            const row = chartData.find((d) => d.age === Number(label));
                            const ageStr = ageDiff > 0
                              ? `${youngestName} ${label} / ${olderName} ${Number(label) + ageDiff}`
                              : `${youngestName || "Age"} ${label}`;
                            const evs = eventsByAge.get(Number(label));
                            const evStr = evs ? ` — ${evs.map((e) => e.label).join(", ")}` : "";
                            return row ? `${ageStr} (${row.year})${evStr}` : `${ageStr}${evStr}`;
                          }}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid var(--border-default)",
                            boxShadow: "var(--shadow-sm)",
                            fontSize: "var(--text-sm)",
                          }}
                        />
                        <ReferenceLine
                          x={retirementAge}
                          stroke="var(--error-500)"
                          strokeDasharray="6 4"
                          strokeWidth={1.5}
                          label={{
                            value: `Retirement (${retirementAge})`,
                            position: "insideTopLeft",
                            style: { fontSize: 10, fill: "var(--error-500)", fontWeight: 600 },
                          }}
                        />
                        {ASSET_TYPE_CONFIG
                          .filter((t) => visibleAssetTypes[t.key] && accountTypes.has(t.key))
                          .map((t) => (
                            <Bar
                              key={t.key}
                              dataKey={t.key}
                              name={t.label}
                              stackId="assets"
                              fill={t.color}
                              fillOpacity={0.75}
                            />
                          ))}
                        {refAreaLeft !== null && refAreaRight !== null && (
                          <ReferenceArea
                            x1={refAreaLeft}
                            x2={refAreaRight}
                            strokeOpacity={0.3}
                            fill="var(--brand-300)"
                            fillOpacity={0.2}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {chartView === "income" && (
                  <div style={{ width: "100%", height: 360 }}>
                    <ResponsiveContainer>
                      <ComposedChart
                        data={visibleData}
                        onMouseDown={(e) => {
                          if (e && e.activeLabel != null) {
                            setRefAreaLeft(Number(e.activeLabel));
                            setRefAreaRight(null);
                          }
                        }}
                        onMouseMove={(e) => {
                          if (refAreaLeft !== null && e && e.activeLabel != null) {
                            setRefAreaRight(Number(e.activeLabel));
                          }
                        }}
                        onMouseUp={() => {
                          if (refAreaLeft !== null && refAreaRight !== null) {
                            const left = Math.min(refAreaLeft, refAreaRight);
                            const right = Math.max(refAreaLeft, refAreaRight);
                            if (right - left >= 2) {
                              setZoomLeft(left);
                              setZoomRight(right);
                            }
                          }
                          setRefAreaLeft(null);
                          setRefAreaRight(null);
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                        <XAxis
                          dataKey="age"
                          allowDataOverflow
                          ticks={xTicks}
                          height={(ageDiff > 0 ? 50 : 30) + (lifeEvents.length > 0 ? 20 : 0)}
                          tick={(props: { x: string | number; y: string | number; payload: { value: number } }) => {
                            const { x, y, payload } = props;
                            const age = payload.value;
                            const showLabel = regularTickSet.has(age);
                            const evs = eventsByAge.get(age);
                            if (!showLabel && !evs) return <g />;
                            return (
                              <g transform={`translate(${x},${y})`}>
                                {showLabel && (
                                  <>
                                    <text x={0} y={0} dy={14} textAnchor="middle" fontSize={11} fill="#4f4a42">
                                      {age}
                                    </text>
                                    {ageDiff > 0 && (
                                      <text x={0} y={0} dy={27} textAnchor="middle" fontSize={9} fill="#b6afa4">
                                        {age + ageDiff}
                                      </text>
                                    )}
                                  </>
                                )}
                                {evs && (() => {
                                  const color = evs[0].color || getIconColor(evs[0].icon);
                                  const isHovered = hoveredEventAge === age;
                                  const labelText = evs.map(e => e.label).join(", ");
                                  const textW = labelText.length * 6.5 + 16;
                                  return (
                                    <g
                                      onMouseEnter={() => setHoveredEventAge(age)}
                                      onMouseLeave={() => setHoveredEventAge(null)}
                                      style={{ cursor: "pointer" }}
                                    >
                                      <circle cx={0} cy={dotDy} r={16} fill="transparent" />
                                      <circle cx={0} cy={dotDy} r={isHovered ? 10 : 8} fill={color} stroke="#fff" strokeWidth={2} />
                                      <text x={0} y={dotDy} textAnchor="middle" dy={4} fontSize={9} fill="#fff" fontWeight={700} style={{ pointerEvents: "none" }}>
                                        {evs.length > 1 ? evs.length : evs[0].icon.charAt(0).toUpperCase()}
                                      </text>
                                      {isHovered && (
                                        <g>
                                          <rect x={-textW / 2} y={dotDy - 28} width={textW} height={20} rx={6} fill={color} opacity={0.95} />
                                          <polygon points={`${-4},${dotDy - 8} ${4},${dotDy - 8} ${0},${dotDy - 4}`} fill={color} opacity={0.95} />
                                          <text x={0} y={dotDy - 15} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600} style={{ pointerEvents: "none" }}>
                                            {labelText}
                                          </text>
                                        </g>
                                      )}
                                    </g>
                                  );
                                })()}
                              </g>
                            );
                          }}
                          label={ageDiff > 0
                            ? { value: `${youngestName} / ${olderName}`, position: "insideBottom", offset: -5, style: { fontSize: 10, fill: "var(--gray-500)" } }
                            : { value: youngestName || "Age", position: "insideBottom", offset: -5, style: { fontSize: 10, fill: "var(--gray-500)" } }
                          }
                        />
                        <YAxis
                          tickFormatter={(v: number) => formatCurrencyCompact(v)}
                          tick={{ fontSize: 11 }}
                          width={72}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                          labelFormatter={(label) => {
                            const row = chartData.find((d) => d.age === Number(label));
                            const ageStr = ageDiff > 0
                              ? `${youngestName} ${label} / ${olderName} ${Number(label) + ageDiff}`
                              : `${youngestName || "Age"} ${label}`;
                            const evs = eventsByAge.get(Number(label));
                            const evStr = evs ? ` — ${evs.map((e) => e.label).join(", ")}` : "";
                            return row ? `${ageStr} (${row.year})${evStr}` : `${ageStr}${evStr}`;
                          }}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid var(--border-default)",
                            boxShadow: "var(--shadow-sm)",
                            fontSize: "var(--text-sm)",
                          }}
                        />
                        <ReferenceLine
                          x={retirementAge}
                          stroke="var(--gray-400)"
                          strokeDasharray="6 4"
                          strokeWidth={1.5}
                          label={{
                            value: `Retirement (${retirementAge})`,
                            position: "insideTopLeft",
                            style: { fontSize: 10, fill: "var(--gray-500)", fontWeight: 600 },
                          }}
                        />
                        {incomeLabels
                          .filter((label) => visibleIncomeSources[label] !== false)
                          .map((label) => {
                            const i = incomeLabels.indexOf(label);
                            return (
                              <Bar
                                key={label}
                                dataKey={label}
                                stackId="income"
                                fill={INCOME_COLORS[i % INCOME_COLORS.length]}
                                fillOpacity={0.6}
                              />
                            );
                          })}
                        {showExpenseLine && (
                          <Line
                            type="monotone"
                            dataKey="Expenses"
                            stroke="var(--error-500)"
                            strokeWidth={2.5}
                            dot={false}
                          />
                        )}
                        {showGrossLine && (
                          <Line
                            type="monotone"
                            dataKey="GrossIncome"
                            name="Gross Income"
                            stroke="var(--gray-400)"
                            strokeWidth={1.5}
                            strokeDasharray="6 3"
                            dot={false}
                          />
                        )}
                        {refAreaLeft !== null && refAreaRight !== null && (
                          <ReferenceArea
                            x1={refAreaLeft}
                            x2={refAreaRight}
                            strokeOpacity={0.3}
                            fill="var(--brand-300)"
                            fillOpacity={0.2}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Tab strip */}
        <nav style={{ display: "flex", gap: "2px", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={isActive ? "client-tab client-tab-active" : "client-tab"}
                style={isActive ? { background: tab.color, color: "#fff", borderColor: tab.color } : undefined}
              >
                <tab.icon size={14} style={{ color: isActive ? "#fff" : tab.color }} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Content panel */}
        <div className="client-panel">
          <div className="page-stack">{children}</div>
        </div>
      </div>

      <style>{layoutStyles}</style>
    </main>
  );
}

const layoutStyles = `
  .client-bg {
    background: linear-gradient(180deg, #f5f0e8 0%, #ede7db 40%, #e5dfd3 100%);
  }
  .client-shell {
    padding: var(--space-3) var(--space-6);
    max-width: 1600px;
    margin: 0 auto;
  }

  /* Header */
  .client-header {
    padding: var(--space-2) 0 var(--space-3);
  }
  .client-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--gray-500);
    text-decoration: none;
    padding: 4px 10px 4px 6px;
    border-radius: 8px;
    transition: background 200ms ease, color 200ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .client-back:hover {
    background: rgba(172, 145, 33, 0.08);
    color: var(--brand-700);
    transform: translateX(-2px);
  }
  .client-title {
    font-size: clamp(1.25rem, 2.5vw, 1.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: var(--space-1) 0 0 0;
    background: linear-gradient(135deg, var(--gray-900) 0%, #4a3d28 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* Content tabs */
  .client-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: rgba(255,255,255,0.5);
    border: 1px solid rgba(0,0,0,0.06);
    border-bottom: none;
    border-radius: 10px 10px 0 0;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--gray-500);
    text-decoration: none;
    position: relative;
    z-index: 1;
    bottom: -1px;
    transition: background 200ms ease, color 200ms ease, transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease;
    white-space: nowrap;
  }
  .client-tab:hover {
    background: rgba(255,255,255,0.8);
    color: var(--gray-700);
    transform: translateY(-1px);
  }
  .client-tab-active {
    background: var(--surface-primary);
    color: var(--gray-900);
    font-weight: 600;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
  }
  .client-tab-active:hover {
    background: var(--surface-primary);
    color: var(--gray-900);
    transform: none;
  }

  /* Content panel */
  .client-panel {
    background: var(--surface-primary);
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 0 0 14px 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03);
    padding: var(--space-8);
    min-height: 400px;
  }

  /* Chart tabs */
  .chart-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: rgba(255,255,255,0.5);
    border: 1px solid rgba(0,0,0,0.06);
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--gray-500);
    cursor: pointer;
    position: relative;
    z-index: 1;
    bottom: -1px;
    transition: background 200ms ease, color 200ms ease, transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
    white-space: nowrap;
  }
  .chart-tab:hover {
    background: rgba(255,255,255,0.8);
    color: var(--gray-700);
    transform: translateY(-1px);
  }
  .chart-tab-active {
    background: var(--surface-primary);
    color: var(--gray-900);
    font-weight: 600;
  }
  .chart-tab-active:hover {
    background: var(--surface-primary);
    color: var(--gray-900);
    transform: none;
  }

  /* Chart panel */
  .chart-panel {
    background: var(--surface-primary);
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 0 14px 14px 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03);
    padding: var(--space-4) var(--space-5);
  }
  .chart-panel *:focus,
  .chart-panel *:focus-visible {
    outline: none;
  }

  /* Asset / income toggle pills */
  .asset-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    color: var(--gray-400);
    background: rgba(255,255,255,0.6);
    cursor: pointer;
    transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
    white-space: nowrap;
  }
  .asset-toggle:hover {
    border-color: var(--gray-300);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  }

  /* Real / nominal toggle */
  .real-toggle {
    display: inline-flex;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(255,255,255,0.4);
    cursor: pointer;
    padding: 0;
  }
  .real-toggle-option {
    padding: 5px 12px;
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--gray-400);
    transition: background 200ms ease, color 200ms ease, box-shadow 200ms ease;
  }
  .real-toggle-active {
    background: linear-gradient(135deg, #2c2518 0%, #4a3d28 100%);
    color: #fff;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }
`;
