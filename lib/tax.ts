/* ── SARS 2025/2026 Tax Year ──────────────────────────── */

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  base: number;
}

interface TaxRebates {
  primary: number;
  secondary: number; // age >= 65
  tertiary: number; // age >= 75
}

const TAX_BRACKETS_2025_2026: TaxBracket[] = [
  { min: 0, max: 237100, rate: 0.18, base: 0 },
  { min: 237101, max: 370500, rate: 0.26, base: 42678 },
  { min: 370501, max: 512800, rate: 0.31, base: 77362 },
  { min: 512801, max: 673000, rate: 0.36, base: 121475 },
  { min: 673001, max: 857900, rate: 0.39, base: 179147 },
  { min: 857901, max: 1817000, rate: 0.41, base: 251258 },
  { min: 1817001, max: Infinity, rate: 0.45, base: 644489 },
];

const REBATES_2025_2026: TaxRebates = {
  primary: 17235,
  secondary: 9444,
  tertiary: 3145,
};

/* Tax thresholds (below this = no tax) */
const TAX_THRESHOLDS_2025_2026 = {
  under65: 95750,
  age65to74: 148217,
  age75plus: 165689,
};

/* CGT constants */
const CGT_ANNUAL_EXCLUSION = 40000;
const CGT_INCLUSION_RATE = 0.4;
const CGT_DEATH_EXCLUSION = 300000;

/* ── Inflate brackets for future years ────────────────── */

export function inflateBrackets(
  brackets: TaxBracket[],
  years: number,
  inflationRate: number = 0.02
): TaxBracket[] {
  const factor = Math.pow(1 + inflationRate, years);
  return brackets.map((b) => ({
    min: Math.round(b.min * factor),
    max: b.max === Infinity ? Infinity : Math.round(b.max * factor),
    rate: b.rate,
    base: Math.round(b.base * factor),
  }));
}

export function inflateRebates(
  rebates: TaxRebates,
  years: number,
  inflationRate: number = 0.02
): TaxRebates {
  const factor = Math.pow(1 + inflationRate, years);
  return {
    primary: Math.round(rebates.primary * factor),
    secondary: Math.round(rebates.secondary * factor),
    tertiary: Math.round(rebates.tertiary * factor),
  };
}

/* ── Income tax calculation ───────────────────────────── */

export interface IncomeTaxResult {
  annualTaxableIncome: number;
  grossTax: number;
  primaryRebate: number;
  secondaryRebate: number;
  tertiaryRebate: number;
  totalRebates: number;
  netTax: number;
  effectiveRate: number;
  marginalRate: number;
  monthlyTax: number;
}

export function calculateIncomeTax(
  annualTaxableIncome: number,
  age: number,
  yearsFromBase: number = 0,
  bracketInflationRate: number = 0.02
): IncomeTaxResult {
  const brackets =
    yearsFromBase > 0
      ? inflateBrackets(TAX_BRACKETS_2025_2026, yearsFromBase, bracketInflationRate)
      : TAX_BRACKETS_2025_2026;

  const rebates =
    yearsFromBase > 0
      ? inflateRebates(REBATES_2025_2026, yearsFromBase, bracketInflationRate)
      : REBATES_2025_2026;

  if (annualTaxableIncome <= 0) {
    return {
      annualTaxableIncome: 0,
      grossTax: 0,
      primaryRebate: 0,
      secondaryRebate: 0,
      tertiaryRebate: 0,
      totalRebates: 0,
      netTax: 0,
      effectiveRate: 0,
      marginalRate: brackets[0].rate,
      monthlyTax: 0,
    };
  }

  // Find the applicable bracket
  let grossTax = 0;
  let marginalRate = brackets[0].rate;

  for (const bracket of brackets) {
    if (annualTaxableIncome >= bracket.min) {
      marginalRate = bracket.rate;
      if (annualTaxableIncome <= bracket.max) {
        grossTax = bracket.base + (annualTaxableIncome - bracket.min + 1) * bracket.rate;
        // For the first bracket, don't add 1
        if (bracket.min === 0) {
          grossTax = annualTaxableIncome * bracket.rate;
        }
        break;
      }
    }
  }

  // Apply rebates
  const primaryRebate = rebates.primary;
  const secondaryRebate = age >= 65 ? rebates.secondary : 0;
  const tertiaryRebate = age >= 75 ? rebates.tertiary : 0;
  const totalRebates = primaryRebate + secondaryRebate + tertiaryRebate;

  const netTax = Math.max(0, grossTax - totalRebates);
  const effectiveRate =
    annualTaxableIncome > 0 ? (netTax / annualTaxableIncome) * 100 : 0;

  return {
    annualTaxableIncome,
    grossTax: Math.round(grossTax),
    primaryRebate,
    secondaryRebate,
    tertiaryRebate,
    totalRebates,
    netTax: Math.round(netTax),
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    marginalRate: marginalRate * 100,
    monthlyTax: Math.round(netTax / 12),
  };
}

/* ── Capital Gains Tax ────────────────────────────────── */

export interface CGTResult {
  capitalGain: number;
  annualExclusion: number;
  netGain: number;
  inclusionRate: number;
  taxableGain: number;
  marginalRate: number;
  tax: number;
  effectiveRate: number;
}

export function calculateCGT(
  capitalGain: number,
  marginalTaxRate: number,
  isDeathEvent: boolean = false
): CGTResult {
  const exclusion = isDeathEvent ? CGT_DEATH_EXCLUSION : CGT_ANNUAL_EXCLUSION;
  const netGain = Math.max(0, capitalGain - exclusion);
  const taxableGain = netGain * CGT_INCLUSION_RATE;
  const tax = taxableGain * (marginalTaxRate / 100);
  const effectiveRate = capitalGain > 0 ? (tax / capitalGain) * 100 : 0;

  return {
    capitalGain,
    annualExclusion: exclusion,
    netGain,
    inclusionRate: CGT_INCLUSION_RATE * 100,
    taxableGain: Math.round(taxableGain),
    marginalRate: marginalTaxRate,
    tax: Math.round(tax),
    effectiveRate: Math.round(effectiveRate * 100) / 100,
  };
}

/* ── Convenience: full tax for a year ─────────────────── */

export interface AnnualTaxInput {
  memberName: string;
  age: number;
  incomeItems: {
    label: string;
    annualAmount: number;
    taxablePct: number;
  }[];
}

export function calculateAnnualTax(
  input: AnnualTaxInput,
  yearsFromBase: number = 0,
  bracketInflationRate: number = 0.02
): IncomeTaxResult {
  const totalTaxableIncome = input.incomeItems.reduce(
    (sum, item) => sum + item.annualAmount * (item.taxablePct / 100),
    0
  );

  return calculateIncomeTax(
    totalTaxableIncome,
    input.age,
    yearsFromBase,
    bracketInflationRate
  );
}

/* ── Exported constants for display ───────────────────── */

export const CURRENT_TAX_BRACKETS = TAX_BRACKETS_2025_2026;
export const CURRENT_REBATES = REBATES_2025_2026;
export const CURRENT_THRESHOLDS = TAX_THRESHOLDS_2025_2026;
export const CGT_CONSTANTS = {
  annualExclusion: CGT_ANNUAL_EXCLUSION,
  deathExclusion: CGT_DEATH_EXCLUSION,
  inclusionRate: CGT_INCLUSION_RATE,
  maxEffectiveRate: 18,
};
