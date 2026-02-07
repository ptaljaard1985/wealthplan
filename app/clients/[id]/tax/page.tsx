"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { Calculator, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField } from "@/components/ui/input";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import {
  calculateIncomeTax,
  calculateCGT,
  inflateBrackets,
  inflateRebates,
  CURRENT_TAX_BRACKETS,
  CURRENT_REBATES,
  CGT_CONSTANTS,
} from "@/lib/tax";
import type { ClientFamily, FamilyMember, Account, Income } from "@/lib/types/database";

interface MemberFull extends FamilyMember {
  income: Income[];
  accounts: Account[];
}

/* ── Helpers ────────────────────────────────────────────── */

function getMemberAge(dob: string | null, year: number): number {
  if (!dob) return 40;
  return year - new Date(dob).getFullYear();
}

interface IncomeLineItem {
  label: string;
  annualGross: number;
  taxablePct: number;
  taxableAmount: number;
}

interface MemberYearTax {
  member: FamilyMember;
  age: number;
  incomeItems: IncomeLineItem[];
  totalGross: number;
  totalTaxable: number;
  taxResult: ReturnType<typeof calculateIncomeTax>;
}

function computeMemberTaxForYear(
  member: MemberFull,
  allMembers: MemberFull[],
  year: number,
  currentYear: number,
  inflationRatePct: number,
  bracketInflationRate: number,
): MemberYearTax {
  const yearsFromNow = year - currentYear;
  const inflationFactor = Math.pow(1 + inflationRatePct / 100, Math.max(0, yearsFromNow));
  const age = getMemberAge(member.date_of_birth, year);
  const yearsFromBase = Math.max(0, yearsFromNow);

  const items: IncomeLineItem[] = [];

  // 1. Regular income items
  for (const inc of member.income) {
    const startOk = inc.start_year === null || year >= inc.start_year;
    const endOk = inc.end_year === null || year <= inc.end_year;
    if (!startOk || !endOk) continue;

    const annualGross = Math.round(Number(inc.monthly_amount) * 12 * inflationFactor);
    const taxablePct = Number(inc.taxable_pct);
    items.push({
      label: inc.label,
      annualGross,
      taxablePct,
      taxableAmount: Math.round(annualGross * taxablePct / 100),
    });
  }

  // 2. Rental income from this member's own properties
  for (const acc of member.accounts) {
    if (acc.account_type !== "property" || !acc.rental_income_monthly) continue;
    // Check if property is sold
    if (acc.planned_sale_year && year >= acc.planned_sale_year) continue;
    const startOk = acc.rental_start_year == null || year >= acc.rental_start_year;
    const endOk = acc.rental_end_year == null || year <= acc.rental_end_year;
    if (!startOk || !endOk) continue;

    const fullRental = Math.round(Number(acc.rental_income_monthly) * 12 * inflationFactor);
    const share = acc.is_joint ? 0.5 : 1;
    const annualGross = Math.round(fullRental * share);
    items.push({
      label: `${acc.account_name}${acc.is_joint ? " (50% joint)" : ""} rental`,
      annualGross,
      taxablePct: 100,
      taxableAmount: annualGross,
    });
  }

  // 3. 50% of joint rental income from OTHER members' properties
  for (const other of allMembers) {
    if (other.id === member.id) continue;
    for (const acc of other.accounts) {
      if (acc.account_type !== "property" || !acc.rental_income_monthly || !acc.is_joint) continue;
      if (acc.planned_sale_year && year >= acc.planned_sale_year) continue;
      const startOk = acc.rental_start_year == null || year >= acc.rental_start_year;
      const endOk = acc.rental_end_year == null || year <= acc.rental_end_year;
      if (!startOk || !endOk) continue;

      const fullRental = Math.round(Number(acc.rental_income_monthly) * 12 * inflationFactor);
      const annualGross = Math.round(fullRental * 0.5);
      items.push({
        label: `${acc.account_name} (50% joint from ${other.first_name})`,
        annualGross,
        taxablePct: 100,
        taxableAmount: annualGross,
      });
    }
  }

  const totalGross = items.reduce((s, i) => s + i.annualGross, 0);
  const totalTaxable = items.reduce((s, i) => s + i.taxableAmount, 0);
  const taxResult = calculateIncomeTax(totalTaxable, age, yearsFromBase, bracketInflationRate);

  return { member, age, incomeItems: items, totalGross, totalTaxable, taxResult };
}

/* ── Component ──────────────────────────────────────────── */

export default function TaxViewPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [family, setFamily] = useState<ClientFamily | null>(null);
  const [members, setMembers] = useState<MemberFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [cgtGain, setCgtGain] = useState("");
  const [showBrackets, setShowBrackets] = useState(false);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [familyRes, membersRes] = await Promise.all([
      supabase.from("client_families").select("*").eq("id", familyId).single(),
      supabase
        .from("family_members")
        .select("*, income(*), accounts(*)")
        .eq("family_id", familyId)
        .order("created_at"),
    ]);

    if (familyRes.data) setFamily(familyRes.data);
    if (membersRes.data) setMembers(membersRes.data as MemberFull[]);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const inflationRatePct = family?.inflation_rate_pct ?? 6;
  const bracketInflation = 0.02;

  // Year range: youngest member's birth year → birth + 100
  const { minYear, maxYear, memberAges } = useMemo(() => {
    const dobs = members.filter((m) => m.date_of_birth).map((m) => new Date(m.date_of_birth!).getFullYear());
    const youngestBirth = dobs.length > 0 ? Math.max(...dobs) : currentYear - 40;
    return {
      minYear: currentYear,
      maxYear: youngestBirth + 100,
      memberAges: members.map((m) => ({
        name: m.first_name,
        age: getMemberAge(m.date_of_birth, selectedYear),
      })),
    };
  }, [members, currentYear, selectedYear]);

  // Compute side-by-side tax for selected year
  const memberTaxes = useMemo(() => {
    return members.map((m) =>
      computeMemberTaxForYear(m, members, selectedYear, currentYear, inflationRatePct, bracketInflation)
    );
  }, [members, selectedYear, currentYear, inflationRatePct]);

  // Combined household totals
  const householdTotals = useMemo(() => {
    const totalGross = memberTaxes.reduce((s, t) => s + t.totalGross, 0);
    const totalTaxable = memberTaxes.reduce((s, t) => s + t.totalTaxable, 0);
    const totalTax = memberTaxes.reduce((s, t) => s + t.taxResult.netTax, 0);
    const effectiveRate = totalTaxable > 0 ? (totalTax / totalTaxable) * 100 : 0;
    return { totalGross, totalTaxable, totalTax, effectiveRate };
  }, [memberTaxes]);

  // Inflated brackets for display
  const yearsFromBase = Math.max(0, selectedYear - currentYear);
  const displayBrackets = yearsFromBase > 0
    ? inflateBrackets(CURRENT_TAX_BRACKETS, yearsFromBase, bracketInflation)
    : CURRENT_TAX_BRACKETS;
  const displayRebates = yearsFromBase > 0
    ? inflateRebates(CURRENT_REBATES, yearsFromBase, bracketInflation)
    : CURRENT_REBATES;

  // CGT using first member's marginal rate
  const cgtResult = useMemo(() => {
    if (!cgtGain) return null;
    const gain = parseFloat(cgtGain);
    if (isNaN(gain) || gain <= 0) return null;
    const marginalRate = memberTaxes.length > 0 ? memberTaxes[0].taxResult.marginalRate : 36;
    return calculateCGT(gain, marginalRate);
  }, [cgtGain, memberTaxes]);

  if (loading) return null;

  return (
    <>
      <PageHeader
        title="Tax View"
        subtitle="Side-by-side tax calculations with projected income"
      />

      {members.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="No members to calculate"
          body="Add family members and income items to see tax calculations."
        />
      ) : (
        <>
          {/* Year selector + household summary */}
          <Card>
            {/* Slider row */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-2)" }}>
                  <label style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--gray-700)" }}>
                    Tax Year
                  </label>
                  <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--brand-700)" }}>
                    {selectedYear}
                  </span>
                </div>
                <input
                  type="range"
                  min={minYear}
                  max={maxYear}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--brand-600)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--gray-400)", marginTop: 2 }}>
                  <span>{minYear}</span>
                  <span>{maxYear}</span>
                </div>
              </div>

              {/* Age chips */}
              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                {memberAges.map((m) => (
                  <div key={m.name} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--gray-800)" }}>
                      {m.age}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Household summary — below slider */}
            <div style={{
              display: "flex",
              gap: "var(--space-6)",
              marginTop: "var(--space-4)",
              paddingTop: "var(--space-4)",
              borderTop: "1px solid var(--border-default)",
              flexWrap: "wrap",
            }}>
              <TaxStat label="Household Gross" value={formatCurrency(householdTotals.totalGross)} />
              <TaxStat label="Household Taxable" value={formatCurrency(householdTotals.totalTaxable)} />
              <TaxStat label="Total Tax" value={formatCurrency(householdTotals.totalTax)} color="var(--error-700)" bold />
              <TaxStat label="Household Net" value={formatCurrency(householdTotals.totalGross - householdTotals.totalTax)} color="var(--success-700)" bold />
              <TaxStat label="Eff. Rate" value={formatPercentage(Math.round(householdTotals.effectiveRate * 100) / 100)} />
            </div>
          </Card>

          {/* Side-by-side tax cards */}
          <div style={{ display: "grid", gridTemplateColumns: members.length > 1 ? "1fr 1fr" : "1fr", gap: "var(--space-4)" }}>
            {memberTaxes.map(({ member, age, incomeItems, totalGross, totalTaxable, taxResult }) => (
              <Card key={member.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-3)" }}>
                  <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: 0 }}>
                    {member.first_name} {member.last_name}
                  </h3>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)" }}>
                    Age {age}
                    {age >= 65 && age < 75 ? " (65+ rebate)" : ""}
                    {age >= 75 ? " (75+ rebate)" : ""}
                  </span>
                </div>

                {/* Income line items */}
                {incomeItems.length === 0 ? (
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", margin: "var(--space-2) 0 var(--space-4)" }}>
                    No income in {selectedYear}.
                  </p>
                ) : (
                  <table className="table" style={{ marginBottom: "var(--space-4)", fontSize: "var(--text-sm)" }}>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th style={{ textAlign: "right" }}>Annual</th>
                        <th style={{ textAlign: "right" }}>Tax %</th>
                        <th style={{ textAlign: "right" }}>Taxable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeItems.map((item, i) => (
                        <tr key={i}>
                          <td>{item.label}</td>
                          <td style={{ textAlign: "right" }}>{formatCurrency(item.annualGross)}</td>
                          <td style={{ textAlign: "right" }}>{formatPercentage(item.taxablePct, 0)}</td>
                          <td style={{ textAlign: "right" }}>{formatCurrency(item.taxableAmount)}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border-default)" }}>
                        <td>Total</td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(totalGross)}</td>
                        <td></td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(totalTaxable)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* Tax calculation breakdown */}
                <div style={{
                  background: "var(--surface-sunken)",
                  borderRadius: 10,
                  padding: "var(--space-4)",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                    <TaxRow label="Gross Tax" value={formatCurrency(taxResult.grossTax)} />
                    <TaxRow label="Primary Rebate" value={`-${formatCurrency(taxResult.primaryRebate)}`} color="var(--success-700)" />
                    {taxResult.secondaryRebate > 0 && (
                      <TaxRow label="Secondary Rebate (65+)" value={`-${formatCurrency(taxResult.secondaryRebate)}`} color="var(--success-700)" />
                    )}
                    {taxResult.tertiaryRebate > 0 && (
                      <TaxRow label="Tertiary Rebate (75+)" value={`-${formatCurrency(taxResult.tertiaryRebate)}`} color="var(--success-700)" />
                    )}
                    <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border-default)", margin: "var(--space-1) 0" }} />
                    <TaxRow label="Net Tax Payable" value={formatCurrency(taxResult.netTax)} bold color="var(--error-700)" />
                    <TaxRow label="Monthly Tax" value={formatCurrency(taxResult.monthlyTax)} />
                  </div>

                  {/* Rates row */}
                  <div style={{
                    display: "flex",
                    gap: "var(--space-5)",
                    marginTop: "var(--space-3)",
                    paddingTop: "var(--space-3)",
                    borderTop: "1px solid var(--border-default)",
                  }}>
                    <TaxStat label="Effective Rate" value={formatPercentage(taxResult.effectiveRate)} />
                    <TaxStat label="Marginal Rate" value={formatPercentage(taxResult.marginalRate)} />
                    <TaxStat
                      label="Take-home"
                      value={formatCurrency(Math.max(0, totalGross - taxResult.netTax))}
                      color="var(--success-700)"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Tax Brackets Reference — collapsible */}
          <Card>
            <button
              onClick={() => setShowBrackets(!showBrackets)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontSize: "var(--text-base)",
                fontWeight: 600,
                color: "var(--gray-800)",
              }}
            >
              {showBrackets ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              SARS Tax Brackets — {selectedYear === currentYear ? "2025/2026" : `${selectedYear} (inflated at ${bracketInflation * 100}%/yr)`}
            </button>

            {showBrackets && (
              <>
                <table className="table" style={{ marginTop: "var(--space-4)" }}>
                  <thead>
                    <tr>
                      <th>Taxable Income</th>
                      <th>Rate</th>
                      <th>Base Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayBrackets.map((bracket, i) => (
                      <tr key={i}>
                        <td>
                          {formatCurrency(bracket.min)}
                          {bracket.max === Infinity ? "+" : ` — ${formatCurrency(bracket.max)}`}
                        </td>
                        <td style={{ fontWeight: 500 }}>{formatPercentage(bracket.rate * 100, 0)}</td>
                        <td>{formatCurrency(bracket.base)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--gray-500)" }}>
                  <strong>Rebates:</strong> Primary R{displayRebates.primary.toLocaleString()} |
                  Secondary (65+) R{displayRebates.secondary.toLocaleString()} |
                  Tertiary (75+) R{displayRebates.tertiary.toLocaleString()}
                </div>
              </>
            )}
          </Card>

          {/* CGT Calculator */}
          <Card>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, marginBottom: "var(--space-4)" }}>
              Capital Gains Tax Calculator
            </h3>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginBottom: "var(--space-4)" }}>
              Annual exclusion: R{CGT_CONSTANTS.annualExclusion.toLocaleString()} |
              Inclusion rate: {CGT_CONSTANTS.inclusionRate * 100}% |
              Max effective rate: {CGT_CONSTANTS.maxEffectiveRate}%
            </p>
            <div style={{ maxWidth: 300 }}>
              <InputField
                label="Capital Gain (R)"
                id="cgt-gain"
                type="number"
                step="1000"
                min="0"
                placeholder="e.g. 500000"
                value={cgtGain}
                onChange={(e) => setCgtGain(e.target.value)}
              />
            </div>

            {cgtResult && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "var(--space-4)",
                marginTop: "var(--space-4)",
                padding: "var(--space-4)",
                background: "var(--surface-sunken)",
                borderRadius: 10,
              }}>
                <TaxStat label="Capital Gain" value={formatCurrency(cgtResult.capitalGain)} />
                <TaxStat label="Exclusion" value={`-${formatCurrency(cgtResult.annualExclusion)}`} color="var(--success-700)" />
                <TaxStat label="Net Gain" value={formatCurrency(cgtResult.netGain)} />
                <TaxStat label="Inclusion (40%)" value={formatCurrency(cgtResult.taxableGain)} />
                <TaxStat label="Marginal Rate" value={formatPercentage(cgtResult.marginalRate)} />
                <TaxStat label="CGT Payable" value={formatCurrency(cgtResult.tax)} color="var(--error-700)" bold />
                <TaxStat label="Effective Rate" value={formatPercentage(cgtResult.effectiveRate)} />
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function TaxStat({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: "var(--text-sm)", fontWeight: bold ? 700 : 500, color: color || "var(--gray-900)" }}>
        {value}
      </div>
    </div>
  );
}

function TaxRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <>
      <div style={{ color: "var(--gray-600)", fontWeight: bold ? 700 : 400 }}>{label}</div>
      <div style={{ textAlign: "right", fontWeight: bold ? 700 : 500, color: color || "var(--gray-900)" }}>{value}</div>
    </>
  );
}
