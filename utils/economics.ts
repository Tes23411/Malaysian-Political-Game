// ============================================================
// src/utils/economics.ts  — Complex Economic Simulation
// ============================================================

/**
 * @fileoverview Complex Economic Simulation Engine.
 * Manages macro-economic state, sector transitions, inflation mapping, debt structures,
 * and how economic variables feed into demographic sentiment and political approval.
 *
 * @dependencies
 * - `../types`: Uses base `EconomicState`, `EconomicPolicy`, `EconomicModifier`.
 */
import {
  EconomicState,
  EconomicPolicy,
  EconomicModifier,
  EconomicSnapshot,
  EconomicEventType,
} from "../types";

// ──────────────────────────────────────────────
// EXTENDED TYPES  (add these to your types.ts)
// ──────────────────────────────────────────────

export interface SectorState {
  agriculture: number; // % of GDP contribution (0–100)
  industry: number;
  services: number;
  output: { agriculture: number; industry: number; services: number }; // growth rates
}

export interface ExternalFactors {
  globalGrowthRate: number; // world GDP growth — affects exports
  commodityPriceIndex: number; // 100 = baseline; drives tin/rubber revenue
  foreignReserves: number; // months of import cover
  exchangeRatePressure: number; // -100 (massive depreciation) to +100 (strong currency)
}

export interface StructuralIndicators {
  corruptionIndex: number; // 0 (clean) to 100 (rampant)
  infrastructureScore: number; // 0–100; degrades slowly, needs investment
  humanCapitalIndex: number; // 0–100; grows with education spending
  giniCoefficient: number; // 0.20–0.80; income inequality
  nairu: number;
  urbanizationRate: number;
  deindustrializationRisk: number;
}

export interface EconomicMomentum {
  gdpMomentum: number; // rolling 3-month avg delta
  unemploymentTrend: number; // positive = worsening
  inflationExpect: number; // inflation expectations (sticky)
  businessConfidence: number; // 0–100
  consumerConfidence: number; // 0–100
}

export interface PolicyQueueEntry {
  policy: EconomicPolicy;
  enactedDate: Date;
  effectiveDate: Date; // when it actually kicks in
}

export interface ComplexEconomicState extends EconomicState {
  sectors: SectorState;
  external: ExternalFactors;
  structural: StructuralIndicators;
  momentum: EconomicMomentum;
  policyQueue: PolicyQueueEntry[]; // pending policy changes
  activePolicy: EconomicPolicy; // currently in effect (may lag behind policy)
  electionCycleYear: number; // track political business cycle
  crisisDepth: number; // 0 = none, escalates during multi-event stacks
  gdpSize?: number; // track absolute GDP size over time
}

export const DEFAULT_COMPLEX_ECONOMIC_STATE: ComplexEconomicState = {
  // Base EconomicState fields
  gdpGrowthRate: 3.5,
  unemploymentRate: 9.0,
  inflationRate: 3.0,
  budgetBalance: -150,
  nationalDebt: 1200,
  publicApproval: 52,
  policy: {
    taxRate: "medium",
    spendingLevel: "balanced",
    prioritySector: "agriculture",
    welfareLevel: "minimal",
    openTrade: true,
  },
  activeModifiers: [],
  history: [],

  // Extended fields
  sectors: {
    agriculture: 40,
    industry: 25,
    services: 35,
    output: { agriculture: 2.0, industry: 3.5, services: 4.0 },
  },
  external: {
    globalGrowthRate: 3.0,
    commodityPriceIndex: 100,
    foreignReserves: 4.5, // months of import cover
    exchangeRatePressure: 0,
  },
  structural: {
    corruptionIndex: 35,
    infrastructureScore: 40,
    humanCapitalIndex: 30,
    giniCoefficient: 0.42,
    nairu: 9.0,
    urbanizationRate: 15.0,
    deindustrializationRisk: 0,
  },
  momentum: {
    gdpMomentum: 0,
    unemploymentTrend: 0,
    inflationExpect: 3.5,
    businessConfidence: 55,
    consumerConfidence: 50,
  },
  policyQueue: [],
  activePolicy: {
    taxRate: "medium",
    spendingLevel: "balanced",
    prioritySector: "agriculture",
    welfareLevel: "minimal",
    openTrade: true,
  },
  electionCycleYear: 0,
  crisisDepth: 0,
  gdpSize: 1500, // Starting estimate
};

// ──────────────────────────────────────────────
// POLICY LAG CONSTANTS
// ──────────────────────────────────────────────

/** Months before a newly enacted policy fully kicks in */
const POLICY_LAG_MONTHS: Record<string, number> = {
  taxRate: 6, // tax changes take time to process
  spendingLevel: 3, // spending kicks in faster
  prioritySector: 9, // structural reorientation is slow
  welfareLevel: 4,
  openTrade: 5,
};

// ──────────────────────────────────────────────
// POLICY BASELINE EFFECTS  (per year, divided by 12 monthly)
// ──────────────────────────────────────────────

interface PolicyImpact {
  gdpEffect: number;
  unemploymentEffect: number;
  inflationEffect: number;
  budgetEffect: number;
  approvalEffect: number;
  inequalityEffect: number; // NEW: gini delta
  corruptionEffect: number; // NEW
  confidenceEffect: number; // NEW: business confidence
}

const TAX_RATE_EFFECTS: Record<string, PolicyImpact> = {
  low: {
    gdpEffect: 1.4,
    unemploymentEffect: -0.9,
    inflationEffect: 0.6,
    budgetEffect: -280,
    approvalEffect: 7,
    inequalityEffect: 0.015,
    corruptionEffect: 2,
    confidenceEffect: 8,
  },
  medium: {
    gdpEffect: 0,
    unemploymentEffect: 0,
    inflationEffect: 0,
    budgetEffect: 0,
    approvalEffect: 0,
    inequalityEffect: 0,
    corruptionEffect: 0,
    confidenceEffect: 0,
  },
  high: {
    gdpEffect: -1.0,
    unemploymentEffect: 0.8,
    inflationEffect: -0.5,
    budgetEffect: 320,
    approvalEffect: -6,
    inequalityEffect: -0.02,
    corruptionEffect: -3,
    confidenceEffect: -10,
  },
};

const SPENDING_LEVEL_EFFECTS: Record<string, PolicyImpact> = {
  austerity: {
    gdpEffect: -1.3,
    unemploymentEffect: 1.8,
    inflationEffect: -1.2,
    budgetEffect: 380,
    approvalEffect: -10,
    inequalityEffect: 0.025,
    corruptionEffect: -5,
    confidenceEffect: -8,
  },
  balanced: {
    gdpEffect: 0,
    unemploymentEffect: 0,
    inflationEffect: 0,
    budgetEffect: 0,
    approvalEffect: 0,
    inequalityEffect: 0,
    corruptionEffect: 0,
    confidenceEffect: 0,
  },
  expansionary: {
    gdpEffect: 1.8,
    unemploymentEffect: -1.4,
    inflationEffect: 1.8,
    budgetEffect: -420,
    approvalEffect: 8,
    inequalityEffect: -0.015,
    corruptionEffect: 5,
    confidenceEffect: 12,
  },
};

const SECTOR_EFFECTS: Record<string, PolicyImpact> = {
  agriculture: {
    gdpEffect: 0.4,
    unemploymentEffect: -0.6,
    inflationEffect: -0.5,
    budgetEffect: -90,
    approvalEffect: 3,
    inequalityEffect: -0.01,
    corruptionEffect: 0,
    confidenceEffect: 2,
  },
  industry: {
    gdpEffect: 1.2,
    unemploymentEffect: -1.2,
    inflationEffect: 0.4,
    budgetEffect: -150,
    approvalEffect: 2,
    inequalityEffect: 0.005,
    corruptionEffect: 2,
    confidenceEffect: 8,
  },
  services: {
    gdpEffect: 1.0,
    unemploymentEffect: -0.8,
    inflationEffect: 0.2,
    budgetEffect: -100,
    approvalEffect: 2,
    inequalityEffect: 0.01,
    corruptionEffect: 1,
    confidenceEffect: 6,
  },
  balanced: {
    gdpEffect: 0.5,
    unemploymentEffect: -0.4,
    inflationEffect: 0,
    budgetEffect: -70,
    approvalEffect: 1,
    inequalityEffect: -0.005,
    corruptionEffect: 0,
    confidenceEffect: 3,
  },
};

const WELFARE_EFFECTS: Record<string, PolicyImpact> = {
  minimal: {
    gdpEffect: 0,
    unemploymentEffect: 0.4,
    inflationEffect: -0.2,
    budgetEffect: 120,
    approvalEffect: -5,
    inequalityEffect: 0.03,
    corruptionEffect: -2,
    confidenceEffect: -5,
  },
  moderate: {
    gdpEffect: 0.3,
    unemploymentEffect: 0,
    inflationEffect: 0.1,
    budgetEffect: -90,
    approvalEffect: 4,
    inequalityEffect: -0.01,
    corruptionEffect: 0,
    confidenceEffect: 2,
  },
  generous: {
    gdpEffect: 0.6,
    unemploymentEffect: -0.7,
    inflationEffect: 0.6,
    budgetEffect: -250,
    approvalEffect: 10,
    inequalityEffect: -0.025,
    corruptionEffect: 3,
    confidenceEffect: 5,
  },
};

const TRADE_EFFECTS: Record<"open" | "closed", PolicyImpact> = {
  open: {
    gdpEffect: 0.9,
    unemploymentEffect: -0.5,
    inflationEffect: -0.6,
    budgetEffect: 60,
    approvalEffect: 1,
    inequalityEffect: 0.008,
    corruptionEffect: -3,
    confidenceEffect: 10,
  },
  closed: {
    gdpEffect: -0.6,
    unemploymentEffect: 0.4,
    inflationEffect: 1.0,
    budgetEffect: -40,
    approvalEffect: -2,
    inequalityEffect: -0.005,
    corruptionEffect: 4,
    confidenceEffect: -8,
  },
};

// ──────────────────────────────────────────────
// POLICY CONTRADICTION PENALTIES
// ──────────────────────────────────────────────

/**
 * Contradictory policy combinations impose instability penalties.
 * These stack multiplicatively.
 */
const getPolicyContradictionPenalty = (
  policy: EconomicPolicy,
): {
  inflationMultiplier: number;
  gdpPenalty: number;
  instabilityNote: string | null;
} => {
  let inflationMultiplier = 1.0;
  let gdpPenalty = 0;
  let instabilityNote: string | null = null;

  // Expansionary spending + low tax = runaway deficit → inflation spiral
  if (policy.spendingLevel === "expansionary" && policy.taxRate === "low") {
    inflationMultiplier *= 1.4;
    gdpPenalty += 0.3;
    instabilityNote =
      "Expansionary spending with low taxes risks inflationary spiral.";
  }

  // Austerity + high tax = severe demand collapse
  if (policy.spendingLevel === "austerity" && policy.taxRate === "high") {
    gdpPenalty += 0.8;
    inflationMultiplier *= 0.7;
    instabilityNote =
      "Austerity combined with high taxation severely suppresses demand.";
  }

  // Generous welfare + austerity = incoherent signals
  if (
    policy.welfareLevel === "generous" &&
    policy.spendingLevel === "austerity"
  ) {
    gdpPenalty += 0.4;
    instabilityNote =
      "Generous welfare alongside austerity sends contradictory signals to markets.";
  }

  // Closed trade + industry focus = inefficient, can't import inputs
  if (!policy.openTrade && policy.prioritySector === "industry") {
    gdpPenalty += 0.5;
    instabilityNote =
      "Industrial policy is undermined by trade barriers limiting input imports.";
  }

  return { inflationMultiplier, gdpPenalty, instabilityNote };
};

// ──────────────────────────────────────────────
// DEBT SPIRAL MECHANICS
// ──────────────────────────────────────────────

const getDebtPressure = (
  nationalDebt: number,
  gdpEstimate: number,
): {
  borrowingCostPenalty: number; // annualised, added to budget outflow
  investmentDrag: number; // GDP penalty
  crisisRisk: number; // 0–1 probability per year of debt crisis
} => {
  const debtToGdpProxy = nationalDebt / Math.max(gdpEstimate, 1000);

  if (debtToGdpProxy < 0.4)
    return { borrowingCostPenalty: 0, investmentDrag: 0, crisisRisk: 0 };
  if (debtToGdpProxy < 0.7)
    return { borrowingCostPenalty: 20, investmentDrag: 0.2, crisisRisk: 0.01 };
  if (debtToGdpProxy < 1.0)
    return { borrowingCostPenalty: 80, investmentDrag: 0.6, crisisRisk: 0.04 };
  if (debtToGdpProxy < 1.5)
    return { borrowingCostPenalty: 200, investmentDrag: 1.2, crisisRisk: 0.1 };
  return { borrowingCostPenalty: 500, investmentDrag: 2.5, crisisRisk: 0.2 }; // near-default
};

// ──────────────────────────────────────────────
// CORRUPTION DEGRADATION
// ──────────────────────────────────────────────

/**
 * High corruption leaks policy effectiveness and drains budget.
 * Returns a multiplier (0.4–1.0) applied to all positive policy effects.
 */
const getCorruptionEfficiencyMultiplier = (corruptionIndex: number): number => {
  // At 0 corruption: full effectiveness (1.0)
  // At 100 corruption: only 40% of policy reaches the economy
  return 1.0 - (corruptionIndex / 100) * 0.6;
};

// ──────────────────────────────────────────────
// COMMODITY SECTOR LINKAGE
// ──────────────────────────────────────────────

const getCommodityEffect = (
  commodityPriceIndex: number,
  sectors: SectorState,
): { gdpBoost: number; inflationBoost: number; budgetBoost: number } => {
  const deviation = (commodityPriceIndex - 100) / 100; // -1 to +∞
  const agricultureWeight = sectors.agriculture / 100;
  const industryWeight = sectors.industry / 100;

  return {
    gdpBoost: deviation * (agricultureWeight * 1.5 + industryWeight * 1.0),
    inflationBoost: deviation * 1.2,
    budgetBoost: deviation * 80 * (agricultureWeight + industryWeight),
  };
};

// ──────────────────────────────────────────────
// POLITICAL BUSINESS CYCLE
// ──────────────────────────────────────────────

/**
 * Governments tend to stimulate the economy before elections.
 * Returns a modifier applied in election years.
 */
const getElectionCycleEffect = (
  monthsUntilElection: number,
  isRulingCoalitionPresent: boolean,
): { gdpBoost: number; budgetDrain: number; approvalBoost: number } => {
  if (!isRulingCoalitionPresent || monthsUntilElection > 18) {
    return { gdpBoost: 0, budgetDrain: 0, approvalBoost: 0 };
  }

  // Ramp up as election approaches
  const intensity = Math.max(0, (18 - monthsUntilElection) / 18);
  return {
    gdpBoost: intensity * 0.8,
    budgetDrain: intensity * 150,
    approvalBoost: intensity * 5,
  };
};

// ──────────────────────────────────────────────
// INFRASTRUCTURE & HUMAN CAPITAL EFFECTS
// ──────────────────────────────────────────────

const getStructuralBonus = (
  structural: StructuralIndicators,
): {
  gdpBonus: number;
  unemploymentBonus: number;
  capacityLimit: number; // max sustainable GDP growth
} => {
  const infraScore = structural.infrastructureScore / 100;
  const humanScore = structural.humanCapitalIndex / 100;

  return {
    gdpBonus: infraScore * 0.8 + humanScore * 0.6,
    unemploymentBonus: -(humanScore * 1.5),
    capacityLimit: 3.0 + infraScore * 4.0 + humanScore * 3.0, // overheating ceiling
  };
};

// ──────────────────────────────────────────────
// INEQUALITY → SOCIAL INSTABILITY
// ──────────────────────────────────────────────

const getInequalityApprovalPenalty = (gini: number): number => {
  // Gini above 0.45 starts denting approval; above 0.6 is severe
  if (gini <= 0.4) return 2; // low inequality = mild approval bonus
  if (gini <= 0.45) return 0;
  if (gini <= 0.55) return -Math.floor((gini - 0.45) * 80);
  return -Math.floor(8 + (gini - 0.55) * 120);
};

// ──────────────────────────────────────────────
// INFLATION EXPECTATIONS (sticky)
// ──────────────────────────────────────────────

const updateInflationExpectations = (
  currentExpect: number,
  actualInflation: number,
): number => {
  // Expectations adjust slowly toward actual — 15% per month
  const adjustment = (actualInflation - currentExpect) * 0.15;
  // High expectations feed back into wage demands → push actual inflation
  return Math.max(0, Math.min(30, currentExpect + adjustment));
};

const getExpectationsFeedback = (
  expectations: number,
  actualInflation: number,
): number => {
  // If expectations are above actual, workers demand higher wages → pushes inflation up
  const gap = expectations - actualInflation;
  return gap * 0.08; // 8% of the gap feeds back into monthly inflation
};

// ──────────────────────────────────────────────
// FOREIGN RESERVES & EXCHANGE RATE
// ──────────────────────────────────────────────

const updateForeignReserves = (
  reserves: number,
  budgetBalance: number,
  openTrade: boolean,
  commodityIndex: number,
): { newReserves: number; exchangePressure: number } => {
  const tradeFlow = openTrade ? (commodityIndex - 100) * 0.03 : -0.05;
  const fiscalDrain =
    budgetBalance < -500 ? -0.1 : budgetBalance < 0 ? -0.03 : 0.02;

  const newReserves = Math.max(
    0,
    reserves + tradeFlow + fiscalDrain + (Math.random() - 0.5) * 0.1,
  );

  // < 2 months cover = crisis territory; > 6 = very comfortable
  let exchangePressure = 0;
  if (newReserves < 1.0) exchangePressure = -60;
  else if (newReserves < 2.0) exchangePressure = -30;
  else if (newReserves < 3.0) exchangePressure = -10;
  else if (newReserves > 6.0) exchangePressure = 15;
  else if (newReserves > 8.0) exchangePressure = 30;

  return { newReserves, exchangePressure };
};

// ──────────────────────────────────────────────
// SECTOR EVOLUTION
// ──────────────────────────────────────────────

const updateSectors = (
  sectors: SectorState,
  policy: EconomicPolicy,
  structural: StructuralIndicators,
  globalGrowth: number,
): SectorState => {
  const infraBonus = (structural.infrastructureScore / 100) * 0.5;

  // Each sector drifts toward policy priority
  let agOut = sectors.output.agriculture;
  let indOut = sectors.output.industry;
  let svcOut = sectors.output.services;

  // Global demand affects all sectors slightly
  agOut += globalGrowth * 0.1 + (Math.random() - 0.5) * 0.4;
  indOut += globalGrowth * 0.15 + infraBonus + (Math.random() - 0.5) * 0.5;
  svcOut +=
    globalGrowth * 0.12 + infraBonus * 0.5 + (Math.random() - 0.5) * 0.4;

  // Policy priority gives a sector a direct boost
  if (policy.prioritySector === "agriculture") agOut += 0.3;
  if (policy.prioritySector === "industry") indOut += 0.5;
  if (policy.prioritySector === "services") svcOut += 0.4;

  // Mean-revert sector shares slowly
  const totalShare = sectors.agriculture + sectors.industry + sectors.services;
  const agShare = sectors.agriculture + (agOut > 0 ? 0.1 : -0.1);
  const indShare = sectors.industry + (indOut > 0 ? 0.1 : -0.1);
  const svcShare = sectors.services + (svcOut > 0 ? 0.1 : -0.1);

  return {
    agriculture: Math.max(5, Math.min(70, agShare)),
    industry: Math.max(5, Math.min(60, indShare)),
    services: Math.max(10, Math.min(70, svcShare)),
    output: {
      agriculture: Math.max(-8, Math.min(12, agOut)),
      industry: Math.max(-8, Math.min(14, indOut)),
      services: Math.max(-6, Math.min(12, svcOut)),
    },
  };
};

// ──────────────────────────────────────────────
// STRUCTURAL INDICATOR EVOLUTION
// ──────────────────────────────────────────────

const updateStructural = (
  structural: StructuralIndicators,
  policy: EconomicPolicy,
  giniDelta: number,
): StructuralIndicators => {
  let {
    corruptionIndex,
    infrastructureScore,
    humanCapitalIndex,
    giniCoefficient,
  } = structural;

  // Infrastructure degrades without investment; expansionary builds it
  let infraInvestment =
    policy.spendingLevel === "expansionary"
      ? 0.3
      : policy.spendingLevel === "balanced"
        ? 0.05
        : -0.15; // austerity lets it decay

  if (policy.prioritySector === "industry") infraInvestment += 0.15; // Industrial priority builds roads/ports

  infrastructureScore = Math.max(
    0,
    Math.min(100, infrastructureScore + infraInvestment - 0.08),
  );

  // Human capital grows with welfare/education spending, decays with austerity
  let hcInvestment =
    policy.welfareLevel === "generous"
      ? 0.2
      : policy.welfareLevel === "moderate"
        ? 0.07
        : -0.05;

  if (policy.prioritySector === "services") hcInvestment += 0.15; // Services priority builds knowledge economy

  humanCapitalIndex = Math.max(
    0,
    Math.min(100, humanCapitalIndex + hcInvestment),
  );

  // Corruption: expansionary spending increases it; closed trade insulates graft
  // High human capital actively demands transparency and reduces corruption
  const corruptionChange =
    (policy.spendingLevel === "expansionary" ? 0.08 : -0.04) +
    (!policy.openTrade ? 0.05 : -0.05) -
    (humanCapitalIndex / 100) * 0.05 +
    (Math.random() - 0.5) * 0.1;
  corruptionIndex = Math.max(
    0,
    Math.min(100, corruptionIndex + corruptionChange),
  );

  // Gini coefficient drifts based on policy inequality effect
  giniCoefficient = Math.max(
    0.2,
    Math.min(0.75, giniCoefficient + giniDelta / 12),
  );

  return {
    corruptionIndex,
    infrastructureScore,
    humanCapitalIndex,
    giniCoefficient,
    nairu: structural.nairu || 6.0,
    urbanizationRate: structural.urbanizationRate || 15.0,
    deindustrializationRisk: structural.deindustrializationRisk || 0.0,
  };
};

// ──────────────────────────────────────────────
// CONFIDENCE INDICATORS
// ──────────────────────────────────────────────

const updateConfidence = (
  momentum: EconomicMomentum,
  gdpGrowth: number,
  unemployment: number,
  inflation: number,
  crisisDepth: number,
  activeModifiers: EconomicModifier[],
): EconomicMomentum => {
  const hasNegativeShock = activeModifiers.some((m) => m.gdpEffect < 0);
  const hasPositiveShock = activeModifiers.some((m) => m.gdpEffect > 0);

  // Business confidence responds to GDP trend and stability
  let bizConf = momentum.businessConfidence;
  bizConf += gdpGrowth * 1.5;
  bizConf -= unemployment * 0.5;
  bizConf -= inflation > 6 ? (inflation - 6) * 1.5 : 0;
  bizConf -= crisisDepth * 8;
  if (hasNegativeShock) bizConf -= 5;
  if (hasPositiveShock) bizConf += 4;
  bizConf += (Math.random() - 0.5) * 4;
  bizConf = Math.max(
    0,
    Math.min(100, bizConf * 0.9 + momentum.businessConfidence * 0.1),
  );

  // Consumer confidence: more sensitive to unemployment and prices
  let conConf = momentum.consumerConfidence;
  conConf += gdpGrowth * 0.8;
  conConf -= unemployment * 1.2;
  conConf -= inflation > 4 ? (inflation - 4) * 2.0 : 0;
  conConf -= crisisDepth * 10;
  conConf += (Math.random() - 0.5) * 5;
  conConf = Math.max(
    0,
    Math.min(100, conConf * 0.88 + momentum.consumerConfidence * 0.12),
  );

  // GDP momentum: rolling 3-month trend
  const newGdpMomentum = momentum.gdpMomentum * 0.7 + gdpGrowth * 0.3;

  return {
    ...momentum,
    gdpMomentum: newGdpMomentum,
    unemploymentTrend: (unemployment - 8) * 0.3, // deviation from natural rate
    businessConfidence: bizConf,
    consumerConfidence: conConf,
  };
};

// ──────────────────────────────────────────────
// EXTENDED ECONOMIC EVENTS
// ──────────────────────────────────────────────

interface ExtendedEventTemplate {
  type: EconomicEventType;
  name: string;
  description: string;
  probability: number;
  severity: "mild" | "moderate" | "severe";
  cascadeTriggers?: EconomicEventType[]; // can spawn these if crisis deepens
  conditions?: (state: ComplexEconomicState) => boolean;
  modifier: Omit<EconomicModifier, "id" | "remainingMonths">;
}

const EXTENDED_EVENTS: ExtendedEventTemplate[] = [
  // ── Negative ──
  {
    type: "recession",
    name: "Economic Recession",
    description:
      "Declining demand and investment have triggered a contraction.",
    probability: 0.05,
    severity: "moderate",
    cascadeTriggers: ["financial_crisis"],
    modifier: {
      name: "Recession",
      description: "GDP contracts; unemployment spikes.",
      gdpEffect: -3.5,
      unemploymentEffect: 3.0,
      inflationEffect: -1.0,
      approvalEffect: -15,
      durationMonths: 18,
    },
  },
  {
    type: "financial_crisis",
    name: "Financial Crisis",
    description: "Bank failures and capital flight trigger a credit freeze.",
    probability: 0.025,
    severity: "severe",
    conditions: (s) =>
      s.structural.corruptionIndex > 50 || s.external.foreignReserves < 2.0,
    modifier: {
      name: "Financial Crisis",
      description: "Credit freezes; investment collapses.",
      gdpEffect: -4.5,
      unemploymentEffect: 4.5,
      inflationEffect: 2.5,
      approvalEffect: -22,
      durationMonths: 24,
    },
  },
  {
    type: "drought",
    name: "Agricultural Drought",
    description: "Severe drought devastates crop yields.",
    probability: 0.07,
    severity: "moderate",
    conditions: (s) => s.sectors.agriculture > 25,
    modifier: {
      name: "Drought",
      description: "Agricultural output collapses; rural poverty rises.",
      gdpEffect: -1.8,
      unemploymentEffect: 1.8,
      inflationEffect: 2.5,
      approvalEffect: -9,
      durationMonths: 12,
    },
  },
  {
    type: "commodity_spike",
    name: "Global Commodity Spike",
    description: "Oil and commodity prices surge on world markets.",
    probability: 0.06,
    severity: "moderate",
    modifier: {
      name: "Commodity Spike",
      description: "Input costs rise; inflation accelerates.",
      gdpEffect: -0.6,
      unemploymentEffect: 0.6,
      inflationEffect: 3.5,
      approvalEffect: -7,
      durationMonths: 14,
    },
  },
  {
    type: "communist_insurgency" as EconomicEventType,
    name: "Communist Insurgency",
    description:
      "Armed insurgency disrupts rural production and frightens investors.",
    probability: 0.04,
    severity: "moderate",
    conditions: (s) => s.structural.giniCoefficient > 0.48,
    modifier: {
      name: "Insurgency Disruption",
      description: "Foreign investment dries up; rural output falls.",
      gdpEffect: -2.0,
      unemploymentEffect: 1.5,
      inflationEffect: 0.8,
      approvalEffect: -12,
      durationMonths: 36,
    },
  },
  {
    type: "hyperinflation" as EconomicEventType,
    name: "Inflationary Spiral",
    description: "Runaway money printing has led to accelerating inflation.",
    probability: 0.02,
    severity: "severe",
    conditions: (s) => s.inflationRate > 10 && s.momentum.inflationExpect > 8,
    modifier: {
      name: "Inflationary Spiral",
      description: "Currency loses value; real wages collapse.",
      gdpEffect: -2.5,
      unemploymentEffect: 2.0,
      inflationEffect: 8.0,
      approvalEffect: -25,
      durationMonths: 20,
    },
  },
  {
    type: "debt_crisis" as EconomicEventType,
    name: "Sovereign Debt Crisis",
    description: "Foreign creditors lose confidence; borrowing costs soar.",
    probability: 0.015,
    severity: "severe",
    conditions: (s) => s.external.foreignReserves < 1.5,
    modifier: {
      name: "Debt Crisis",
      description: "Forced austerity; emergency IMF-style measures.",
      gdpEffect: -5.0,
      unemploymentEffect: 5.0,
      inflationEffect: 3.0,
      approvalEffect: -28,
      durationMonths: 30,
    },
  },
  {
    type: "brain_drain" as EconomicEventType,
    name: "Brain Drain",
    description: "Skilled professionals emigrate, hollowing out human capital.",
    probability: 0.03,
    severity: "mild",
    conditions: (s) =>
      s.structural.humanCapitalIndex > 40 && s.structural.corruptionIndex > 55,
    modifier: {
      name: "Brain Drain",
      description: "Productivity growth slows; key sectors suffer.",
      gdpEffect: -1.0,
      unemploymentEffect: 0.2,
      inflationEffect: 0,
      approvalEffect: -5,
      durationMonths: 48,
    },
  },

  // ── Positive ──
  {
    type: "boom",
    name: "Economic Boom",
    description:
      "Rising commodity prices and foreign investment fuel rapid growth.",
    probability: 0.05,
    severity: "moderate",
    modifier: {
      name: "Economic Boom",
      description: "Strong growth lifts all sectors.",
      gdpEffect: 3.2,
      unemploymentEffect: -2.2,
      inflationEffect: 1.2,
      approvalEffect: 13,
      durationMonths: 24,
    },
  },
  {
    type: "industrial_surge",
    name: "Industrial Surge",
    description: "Tin and rubber export prices hit record highs.",
    probability: 0.06,
    severity: "moderate",
    conditions: (s) => s.sectors.industry > 20,
    modifier: {
      name: "Industrial Surge",
      description: "Export revenues boom; investment flows in.",
      gdpEffect: 2.8,
      unemploymentEffect: -1.8,
      inflationEffect: 0.6,
      approvalEffect: 9,
      durationMonths: 18,
    },
  },
  {
    type: "trade_deal",
    name: "Major Trade Agreement",
    description: "A landmark trade deal opens new export markets.",
    probability: 0.035,
    severity: "mild",
    conditions: (s) => s.policy.openTrade,
    modifier: {
      name: "Trade Deal Boost",
      description: "Export earnings rise; foreign goods cheaper.",
      gdpEffect: 1.4,
      unemploymentEffect: -0.9,
      inflationEffect: -0.6,
      approvalEffect: 7,
      durationMonths: 36,
    },
  },
  {
    type: "foreign_investment",
    name: "Foreign Investment Wave",
    description: "Foreign capital floods in seeking opportunities.",
    probability: 0.045,
    severity: "mild",
    conditions: (s) => s.external.exchangeRatePressure > -20,
    modifier: {
      name: "Foreign Investment Wave",
      description: "Capital flows create jobs and modernise infrastructure.",
      gdpEffect: 2.2,
      unemploymentEffect: -1.6,
      inflationEffect: 0.9,
      approvalEffect: 11,
      durationMonths: 30,
    },
  },
  {
    type: "green_revolution" as EconomicEventType,
    name: "Agricultural Modernisation",
    description:
      "New farming techniques dramatically boost rural productivity.",
    probability: 0.025,
    severity: "mild",
    conditions: (s) =>
      s.structural.humanCapitalIndex > 35 && s.sectors.agriculture > 30,
    modifier: {
      name: "Green Revolution",
      description: "Food production soars; rural incomes rise.",
      gdpEffect: 1.5,
      unemploymentEffect: -0.8,
      inflationEffect: -1.5,
      approvalEffect: 8,
      durationMonths: 60,
    },
  },
  {
    type: "infrastructure_boom" as EconomicEventType,
    name: "Infrastructure Programme",
    description:
      "A major government infrastructure programme begins delivering results.",
    probability: 0.03,
    severity: "mild",
    conditions: (s) =>
      s.structural.infrastructureScore > 50 &&
      s.policy.spendingLevel === "expansionary",
    modifier: {
      name: "Infrastructure Dividend",
      description: "Improved connectivity boosts productivity nationwide.",
      gdpEffect: 1.8,
      unemploymentEffect: -1.4,
      inflationEffect: 0.3,
      approvalEffect: 9,
      durationMonths: 48,
    },
  },
];

// ──────────────────────────────────────────────
// PUBLIC APPROVAL (COMPLEX VERSION)
// ──────────────────────────────────────────────

/**
 * Calculates national public approval rating based on economic markers.
 *
 * @param {number} gdpGrowthRate - Current GDP Growth percentage.
 * @param {number} unemploymentRate - Current Unemployment percentage.
 * @param {number} inflationRate - Current Inflation percentage.
 * @param {number} budgetBalance - Current budgetary fiscal surplus/deficit.
 * @param {number} nationalDebt - Total National Debt.
 * @param {number} giniCoefficient - Income inequality index.
 * @param {number} businessConfidence - Business sector confidence (0-100).
 * @param {number} consumerConfidence - General consumer sentiment (0-100).
 * @returns {number} The calculated theoretical approval bounded between 0 and 100.
 *
 * @logic
 * - GDP uses loss aversion weighting (declines hurt more).
 * - Severe inflation completely tanks approval.
 * - Confidences act as multipliers for sentiment.
 */
export const calculateEconomicApproval = (
  gdpGrowthRate: number,
  unemploymentRate: number,
  inflationRate: number,
  budgetBalance: number,
  nationalDebt: number,
  giniCoefficient: number,
  businessConfidence: number,
  consumerConfidence: number,
): number => {
  let score = 50;

  // GDP: non-linear — citizens notice declines more than gains (loss aversion)
  if (gdpGrowthRate >= 0) {
    score += Math.min(gdpGrowthRate * 3.5, 20);
  } else {
    score += Math.max(gdpGrowthRate * 7, -35);
  }

  // Unemployment: strong penalty above 6% natural rate
  const uPenalty = Math.max(0, unemploymentRate - 6) * 3.5;
  score -= Math.min(uPenalty, 28);

  // Inflation: sweet spot 1–3%; both extremes hurt
  if (inflationRate < 0.5) {
    score -= 8; // deflation scares
  } else if (inflationRate < 1) {
    score -= 3;
  } else if (inflationRate <= 3) {
    // Fine
  } else if (inflationRate <= 6) {
    score -= (inflationRate - 3) * 3.5;
  } else {
    score -= 10 + (inflationRate - 6) * 5; // severe
  }

  // Budget & debt
  if (budgetBalance < -800) score -= 6;
  else if (budgetBalance < -400) score -= 3;
  else if (budgetBalance > 200) score += 2;

  // Inequality
  score += getInequalityApprovalPenalty(giniCoefficient);

  // Confidence acts as a sentiment multiplier
  const confAvg = (businessConfidence + consumerConfidence) / 2;
  const confEffect = ((confAvg - 50) / 50) * 8; // ±8 pts
  score += confEffect;

  return Math.max(0, Math.min(100, score));
};

// ──────────────────────────────────────────────
// POLICY QUEUE MANAGEMENT
// ──────────────────────────────────────────────

/**
 * Enqueue a new policy. Each dimension has its own lag.
 * Returns an updated queue and the currently active (lagged) policy.
 */
/**
 * Stages a new economic policy change into the queue.
 * Policies do not activate immediately; they obey dynamic lag variables defined in `POLICY_LAG_MONTHS`.
 *
 * @param {EconomicPolicy} currentActivePolicy - The active policy currently in effect.
 * @param {EconomicPolicy} newPolicy - The desired new policy state.
 * @param {Date} currentDate - Baseline point in time.
 * @param {PolicyQueueEntry[]} queue - The existing queue of forthcoming shifts.
 * @returns {{ newQueue: PolicyQueueEntry[], newActivePolicy: EconomicPolicy }} Updated queue.
 */
export const enqueuePolicyChange = (
  currentActivePolicy: EconomicPolicy,
  newPolicy: EconomicPolicy,
  currentDate: Date,
  queue: PolicyQueueEntry[],
): { newQueue: PolicyQueueEntry[]; newActivePolicy: EconomicPolicy } => {
  // Only enqueue dimensions that actually changed
  const newQueue = [...queue];

  const dims: (keyof EconomicPolicy)[] = [
    "taxRate",
    "spendingLevel",
    "prioritySector",
    "welfareLevel",
    "openTrade",
  ];
  dims.forEach((dim) => {
    if (currentActivePolicy[dim] !== newPolicy[dim]) {
      const lagMonths = POLICY_LAG_MONTHS[dim] || 3;
      const effectiveDate = new Date(currentDate);
      effectiveDate.setMonth(effectiveDate.getMonth() + lagMonths);

      // Remove any existing queued change for this dimension
      const filtered = newQueue.filter(
        (e) => (e.policy as any)[dim] === undefined || dim === "taxRate",
      );

      newQueue.push({
        policy: newPolicy,
        enactedDate: currentDate,
        effectiveDate,
      });
    }
  });

  return { newQueue, newActivePolicy: currentActivePolicy };
};

/**
 * Process queue: apply any entries whose effectiveDate has passed.
 */
const processQueue = (
  queue: PolicyQueueEntry[],
  activePolicy: EconomicPolicy,
  currentDate: Date,
): {
  updatedQueue: PolicyQueueEntry[];
  updatedActivePolicy: EconomicPolicy;
} => {
  let updatedPolicy = { ...activePolicy };
  const remaining: PolicyQueueEntry[] = [];

  queue.forEach((entry) => {
    if (currentDate >= entry.effectiveDate) {
      updatedPolicy = { ...updatedPolicy, ...entry.policy };
    } else {
      remaining.push(entry);
    }
  });

  return { updatedQueue: remaining, updatedActivePolicy: updatedPolicy };
};

// ──────────────────────────────────────────────
// MAIN MONTHLY UPDATE
// ──────────────────────────────────────────────

/**
 * The core economic turn processor.
 * Tick the vast simulation forward by one time step, cascading policies, commodity shifts, and structural degredation.
 *
 * @param {ComplexEconomicState} state - Comprehensive tracker of national economy.
 * @param {Date} date - The active game date.
 * @param {boolean} [isRulingCoalitionPresent=true] - Flags whether an active government exists.
 * @param {number} [monthsUntilElection=24] - Signals impending elections to initiate stimulus cycles.
 * @returns {{ newState: ComplexEconomicState, triggeredEvent: GameEvent | null, policyWarning: string | null }} State post-tick, accompanied by alerts.
 *
 * @logic
 * - Checks/Pops the pending Policy Queue.
 * - Mutates Sector output distributions based on long-term infrastructure.
 * - Flushes out expired event modifiers.
 * - Applies corruption and GDP lag calculations.
 */
export const updateEconomy = (
  rawState: EconomicState,
  currentDate: Date,
  isRulingCoalitionPresent: boolean,
  monthsUntilElection: number = 60,
): {
  newState: EconomicState;
  triggeredEvent: {
    name: string;
    description: string;
    type: EconomicEventType;
  } | null;
  policyWarning: string | null;
} => {
  // Upgrade plain EconomicState to ComplexEconomicState if needed
  const state = rawState as ComplexEconomicState;
  let sectors = {
    ...(state.sectors ?? DEFAULT_COMPLEX_ECONOMIC_STATE.sectors),
  };
  sectors.output = { ...sectors.output }; // deep clone output
  let external = {
    ...(state.external ?? DEFAULT_COMPLEX_ECONOMIC_STATE.external),
  };
  let structural = {
    ...(state.structural ?? DEFAULT_COMPLEX_ECONOMIC_STATE.structural),
  };
  let momentum = {
    ...(state.momentum ?? DEFAULT_COMPLEX_ECONOMIC_STATE.momentum),
  };
  const policyQueue = state.policyQueue ? [...state.policyQueue] : [];
  const crisisDepth = state.crisisDepth ?? 0;

  // ── 1. Process policy queue (apply lagged policies) ──
  const { updatedQueue, updatedActivePolicy } = processQueue(
    policyQueue,
    state.activePolicy ?? state.policy,
    currentDate,
  );
  const policy = updatedActivePolicy;

  // ── 2. Policy contradiction check ──
  const { inflationMultiplier, gdpPenalty, instabilityNote } =
    getPolicyContradictionPenalty(policy);

  // ── 3. Sum base policy effects ──
  const allEffects = [
    TAX_RATE_EFFECTS[policy.taxRate],
    SPENDING_LEVEL_EFFECTS[policy.spendingLevel],
    SECTOR_EFFECTS[policy.prioritySector],
    WELFARE_EFFECTS[policy.welfareLevel],
    policy.openTrade ? TRADE_EFFECTS.open : TRADE_EFFECTS.closed,
  ];

  const corruptionMultiplier = getCorruptionEfficiencyMultiplier(
    structural.corruptionIndex,
  );

  // Positive effects are degraded by corruption; negative effects pass through fully
  // ── 3. Sum base policy effects with Diminishing Returns (Req 1) ──
  const sigmoid = (effect, sensitivity, threshold, current) =>
    effect * (1 / (1 + Math.exp(-sensitivity * (threshold - current))));
  const getSigmoidScale = (sensitivity, threshold, current) =>
    1 / (1 + Math.exp(-sensitivity * (threshold - current)));

  let totalGdpEffect = 0;
  let totalUnemployEffect = 0;
  let totalInflationEffect = 0;
  // totalBudgetEffect is removed in favor of direct revenues (Req 9)
  let totalApprovalEffect = 0;
  let totalInequalityDelta = 0;

  const gdpEstimate = Math.max(100, state.gdpSize || 1500); // Req 7 prep
  const debtRatio = state.nationalDebt / gdpEstimate;

  allEffects.forEach((e) => {
    let gdpEff = e.gdpEffect;
    let unempEff = e.unemploymentEffect;

    // Diminishing returns for tax cuts (Laffer curve effect) when GDP > 5%
    if (e === TAX_RATE_EFFECTS.low && gdpEff > 0) {
      gdpEff *= getSigmoidScale(1.0, 5, state.gdpGrowthRate); // Lower effect as GDP grows
    }
    // Expansionary spending loses effectiveness (crowding out) when debtRatio > 0.6
    if (e === SPENDING_LEVEL_EFFECTS.expansionary && gdpEff > 0) {
      gdpEff *= getSigmoidScale(10.0, 0.6, debtRatio); // Drops sharply after 0.6
    }
    // Welfare spending has stronger unemp effects when unemployment > 12
    if (e === WELFARE_EFFECTS.generous && unempEff < 0) {
      unempEff *=
        1 + 2 * (1 - getSigmoidScale(0.5, 12, state.unemploymentRate));
    }

    totalGdpEffect += gdpEff > 0 ? gdpEff * corruptionMultiplier : gdpEff;
    totalUnemployEffect += unempEff;
    totalInflationEffect += e.inflationEffect;
    totalApprovalEffect += e.approvalEffect;
    totalInequalityDelta += e.inequalityEffect || 0;
  });

  totalGdpEffect -= gdpPenalty;
  totalInflationEffect *= inflationMultiplier;
  totalApprovalEffect *= corruptionMultiplier;

  // ── 4. Active modifier effects ──
  // ── Regional Crisis Transmission (Req 10) ──
  let regionalCrisisRisk = external.commodityPriceIndex < 70 ? 1 : 0;
  let globalMultiplier = external.globalGrowthRate < 1.0 ? 1.2 : 1.0;

  // ── Inequality-Growth Feedback (Kuznets Curve) (Req 12) ──
  let kuznetsGdpEffect = 0;
  if (structural.humanCapitalIndex < 40) {
    kuznetsGdpEffect = structural.giniCoefficient > 0.4 ? 0.3 : 0; // Rising phase
  } else if (structural.humanCapitalIndex <= 70) {
    kuznetsGdpEffect = -(structural.giniCoefficient - 0.45) * 0.5; // Middle trap
  } else {
    kuznetsGdpEffect = -(structural.giniCoefficient - 0.35) * 1.5; // Advanced stage
  }
  // ── 4b. Active modifier effects applied ──
  let modGdp =
    state.activeModifiers.reduce((s, m) => s + m.gdpEffect / 12, 0) *
      globalMultiplier +
    kuznetsGdpEffect / 12;
  const modUnemp = state.activeModifiers.reduce(
    (s, m) => s + m.unemploymentEffect / 12,
    0,
  );
  const modInflation = state.activeModifiers.reduce(
    (s, m) => s + m.inflationEffect / 12,
    0,
  );
  const modApproval = state.activeModifiers.reduce(
    (s, m) => s + (m.approvalEffect || 0) / 12,
    0,
  );

  const remainingModifiers = state.activeModifiers
    .map((m) => ({ ...m, remainingMonths: m.remainingMonths - 1 }))
    .filter((m) => m.remainingMonths > 0);

  // ── 5. Structural bonus & Lewis Model Transformation (Req 8) ──
  let { gdpBonus, unemploymentBonus, capacityLimit } =
    getStructuralBonus(structural);

  // Lewis dual-sector transition
  let lewisWagePressure = 0;
  if (sectors.agriculture > 30) {
    // Surplus rural labour buffers urban wages
    unemploymentBonus -= 1.0;
  } else if (sectors.agriculture < 15) {
    // Lewis turning point reached
    structural.nairu = Math.max(4.0, (structural.nairu || 6.0) - 0.05); // NAIRU drops
    lewisWagePressure = 1.5; // Upward wage pressure → inflation
  }

  // Move labour from agriculture to higher productivity
  let aggroDelta = sectors.agriculture > 15 ? 0.35 : 0; // Natural active urbanization
  // Accelerate if industry priority
  if (policy.prioritySector === "industry") aggroDelta += 0.25;

  let lewisGdpBoost = aggroDelta * 0.08 * 12; // Annualized
  gdpBonus += lewisGdpBoost;
  structural.urbanizationRate = Math.min(
    90,
    (structural.urbanizationRate || 15) + aggroDelta / 12,
  );
  if (sectors.agriculture > 10) {
    sectors.agriculture -= aggroDelta / 12;
    sectors.industry += (aggroDelta / 12) * 0.7; // 70% to industry
    sectors.services += (aggroDelta / 12) * 0.3; // 30% to services
  }

  // ── 6. Commodity linkage & Dutch Disease (Req 3) ──
  const commodity = getCommodityEffect(external.commodityPriceIndex, sectors);

  if (external.commodityPriceIndex > 140) {
    let dutchDiseasePenalty = (external.commodityPriceIndex - 140) * 0.02;
    sectors.industry = Math.max(0, sectors.industry - dutchDiseasePenalty / 12);
    structural.deindustrializationRisk =
      (structural.deindustrializationRisk || 0) + 1;
    commodity.gdpBoost -= dutchDiseasePenalty; // hurts non-commodity exports
  } else if (
    external.commodityPriceIndex < 70 &&
    (structural.deindustrializationRisk || 0) > 10
  ) {
    // Collapse after hollowing out
    commodity.gdpBoost -= structural.deindustrializationRisk * 0.1;
  }

  // ── 7. Debt pressure & Fisher Effect (Req 4) ──
  const debtPressure = getDebtPressure(state.nationalDebt, gdpEstimate);

  let realInterestRate = 3.0;
  let nominalInterestRate =
    realInterestRate +
    momentum.inflationExpect +
    debtPressure.borrowingCostPenalty / 100;
  let fisherInvestmentDrag =
    nominalInterestRate > 12 ? (nominalInterestRate - 12) * 0.15 : 0;
  debtPressure.investmentDrag += fisherInvestmentDrag;

  // Debt Monetization
  if (state.inflationRate > 8) {
    state.nationalDebt =
      state.nationalDebt -
      state.nationalDebt * (state.inflationRate / 100) * 0.02;
  }

  // ── 8. Political business cycle ──
  const electionEffect = getElectionCycleEffect(
    monthsUntilElection,
    isRulingCoalitionPresent,
  );

  // ── 9. Inflation expectations feedback ──
  const expectFeedback = getExpectationsFeedback(
    momentum.inflationExpect,
    state.inflationRate,
  );

  // ── 10. Confidence effects on GDP ──
  const confidenceGdpEffect = ((momentum.businessConfidence - 50) / 100) * 0.6;
  const confidenceUnempEffect =
    ((momentum.consumerConfidence - 50) / 100) * -0.4;

  // ── 11. Compute final deltas & Capital Flight (Req 7) ──
  const randomNoise = {
    gdp: (Math.random() - 0.5) * 0.5,
    unemp: (Math.random() - 0.5) * 0.3,
    infl: (Math.random() - 0.5) * 0.3,
  };

  let capitalFlightRisk =
    crisisDepth * 0.05 + (structural.corruptionIndex > 60 ? 0.03 : 0);
  let isCapitalFlight = false;
  if (crisisDepth > 2 && Math.random() < capitalFlightRisk) {
    isCapitalFlight = true;
    external.foreignReserves = Math.max(
      0,
      external.foreignReserves - (0.5 + Math.random() * 1.0),
    );
    modGdp -= 2.0; // severe hit
  }

  let newGdp =
    state.gdpGrowthRate +
    totalGdpEffect / 12 +
    modGdp +
    gdpBonus / 12 +
    commodity.gdpBoost / 12 -
    debtPressure.investmentDrag / 12 +
    electionEffect.gdpBoost / 12 +
    confidenceGdpEffect / 12 +
    randomNoise.gdp;

  // Overheat ceiling — GDP can't exceed structural capacity for long
  if (newGdp > capacityLimit) {
    const overheat = newGdp - capacityLimit;
    newGdp -= overheat * 0.5; // partial pullback
  }

  let newUnemp =
    state.unemploymentRate +
    totalUnemployEffect / 12 +
    modUnemp +
    unemploymentBonus / 12 +
    confidenceUnempEffect / 12 +
    randomNoise.unemp;

  // ── Okun's Law linkage (Req 2) ──
  // NAIRU dynamic based on human capital
  let targetNAIRU = 10.0 - (structural.humanCapitalIndex / 100) * 4.0;
  structural.nairu =
    (structural.nairu || targetNAIRU) * 0.99 + targetNAIRU * 0.01;

  // Hysteresis calculation
  if (newGdp < -2) {
    structural.nairu += 0.05; // prolonged recession permanent damage
  }

  let unemploymentGap = newUnemp - structural.nairu;
  // Developing economy Okun coefficient (~0.5)
  // Actually Okun says: deltaUnemp = -0.5 * (gdpGrowth - potentialGdpGrowth)
  let potentialGdpGrowth = 3.5;
  newUnemp += (-0.5 * (newGdp - potentialGdpGrowth)) / 12; // Apply monthly delta

  // ── Expectations-Augmented Phillips Curve (Req 5) ──
  // inflation = expectedInflation - alpha * unempGap + supplyShocks
  let supplyShocks = commodity.inflationBoost / 12 + modInflation;
  if (structural.corruptionIndex > 60) supplyShocks += 0.5 / 12; // Rent-seeking floor
  supplyShocks += lewisWagePressure / 12;

  let phillipsInflation =
    momentum.inflationExpect - 0.3 * unemploymentGap + supplyShocks * 12;
  // Smoothed application
  let newInflation =
    state.inflationRate +
    (phillipsInflation - state.inflationRate) * 0.2 +
    totalInflationEffect / 12 +
    randomNoise.infl;

  // ── Budget Dynamics (Req 9) ──
  // Direct revenues and expenditures calculation based on GDP Size
  let taxRevenueRate =
    { low: 0.1, medium: 0.15, high: 0.2, massive: 0.25 }[policy.taxRate] ||
    0.15;
  let spendingRate =
    { austerity: 0.1, balanced: 0.15, expansionary: 0.22, massive: 0.3 }[
      policy.spendingLevel
    ] || 0.15;

  let revenueEstimate =
    gdpEstimate * taxRevenueRate + commodity.budgetBoost * 10;
  let expenditureEstimate =
    gdpEstimate * spendingRate +
    debtPressure.borrowingCostPenalty +
    electionEffect.budgetDrain +
    (policy.welfareLevel === "generous" ? gdpEstimate * 0.05 : 0);

  // Annualized balance
  let newBudgetBalance = revenueEstimate - expenditureEstimate;

  // ── Regime-Based Stabilization (Req 6) ──
  // Tigers can reach 8-10% equilibrium GDP growth with great fundamentals
  let fdiBonus =
    policy.openTrade && momentum.businessConfidence > 60
      ? (momentum.businessConfidence - 60) * 0.05
      : 0;

  let equilibriumGDP =
    2.0 +
    (structural.infrastructureScore / 100) * 4.0 +
    (structural.humanCapitalIndex / 100) * 3.0 -
    (structural.corruptionIndex / 100) * 2.0 +
    fdiBonus;

  let bizConfFactor = Math.max(0.01, momentum.businessConfidence / 100);
  let reversionSpeed = bizConfFactor * 0.1; // low confidence slows recovery
  newGdp = newGdp * (1 - reversionSpeed) + equilibriumGDP * reversionSpeed;

  newUnemp = newUnemp * 0.95 + structural.nairu * 0.05;
  // newInflation already calculated with sticky Phillips curve
  newInflation = newInflation * 0.95 + momentum.inflationExpect * 0.05;

  // Hard clamps
  newGdp = Math.max(-15, Math.min(18, newGdp));
  newUnemp = Math.max(1, Math.min(40, newUnemp));
  newInflation = Math.max(0, Math.min(35, newInflation));

  // ── 12. Update national debt and GDP Size ──
  const monthlyDeficit = -(newBudgetBalance / 12);
  const newDebt = Math.max(0, state.nationalDebt + monthlyDeficit);
  const newGdpSize = gdpEstimate * (1 + newGdp / 100 / 12);

  // ── 13. Foreign reserves ──
  const { newReserves, exchangePressure } = updateForeignReserves(
    external.foreignReserves,
    newBudgetBalance,
    policy.openTrade,
    external.commodityPriceIndex,
  );

  // Slow commodity drift
  const newCommodityIndex = Math.max(
    40,
    Math.min(250, external.commodityPriceIndex + (Math.random() - 0.49) * 3),
  );

  // ── 14. Update sub-systems ──
  const newSectors = updateSectors(
    sectors,
    policy,
    structural,
    external.globalGrowthRate,
  );
  const newStructural = updateStructural(
    structural,
    policy,
    totalInequalityDelta,
  );
  const newInflExpect = updateInflationExpectations(
    momentum.inflationExpect,
    newInflation,
  );
  const newMomentum = updateConfidence(
    { ...momentum, inflationExpect: newInflExpect },
    newGdp,
    newUnemp,
    newInflation,
    crisisDepth,
    remainingModifiers,
  );

  // ── 15. Public approval ──
  const baseApproval = calculateEconomicApproval(
    newGdp,
    newUnemp,
    newInflation,
    newBudgetBalance,
    newDebt,
    newStructural.giniCoefficient,
    newMomentum.businessConfidence,
    newMomentum.consumerConfidence,
  );
  const newApproval = Math.max(
    0,
    Math.min(
      100,
      baseApproval +
        totalApprovalEffect +
        modApproval +
        electionEffect.approvalBoost,
    ),
  );

  // ── 16. Crisis depth tracker ──
  const negativeShockCount = remainingModifiers.filter(
    (m) => m.gdpEffect < -1,
  ).length;
  const newCrisisDepth = Math.max(0, Math.min(5, negativeShockCount));

  // ── 17. Random event roll ──
  let triggeredEvent: {
    name: string;
    description: string;
    type: EconomicEventType;
  } | null = null;
  const activeModifierNames = new Set(remainingModifiers.map((m) => m.name));
  const buildState = {
    ...state,
    sectors: newSectors,
    structural: newStructural,
    external: { ...external, foreignReserves: newReserves },
    momentum: newMomentum,
    national_debt_ratio: newDebt / gdpEstimate,
  } as any;

  for (const template of EXTENDED_EVENTS) {
    if (activeModifierNames.has(template.modifier.name)) continue;
    if (template.conditions && !template.conditions(buildState)) continue;

    const monthlyProb = template.probability / 12;
    // Severity multiplier: crisis depth amplifies negative events
    const severityMult =
      template.modifier.gdpEffect < 0 && crisisDepth > 1
        ? 1 + crisisDepth * 0.2
        : 1;

    if (Math.random() < monthlyProb * severityMult) {
      const newModifier: EconomicModifier = {
        id: `econ-evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        remainingMonths: template.modifier.durationMonths,
        ...template.modifier,
      };
      remainingModifiers.push(newModifier);
      triggeredEvent = {
        name: template.name,
        description: template.description,
        type: template.type,
      };
      break;
    }
  }

  // ── 18. Debt crisis auto-trigger ──
  if (
    !triggeredEvent &&
    newReserves < 0.8 &&
    !activeModifierNames.has("Debt Crisis")
  ) {
    const crisisTemplate = EXTENDED_EVENTS.find(
      (e) => e.type === "debt_crisis",
    );
    if (crisisTemplate) {
      remainingModifiers.push({
        id: `debt-crisis-${Date.now()}`,
        remainingMonths: crisisTemplate.modifier.durationMonths,
        ...crisisTemplate.modifier,
      });
      triggeredEvent = {
        name: crisisTemplate.name,
        description: crisisTemplate.description,
        type: crisisTemplate.type,
      };
    }
  }

  // ── 19. Snapshot ──
  const snapshot: EconomicSnapshot = {
    date: new Date(currentDate),
    gdpGrowthRate: newGdp,
    unemploymentRate: newUnemp,
    inflationRate: newInflation,
    publicApproval: newApproval,
    budgetBalance: newBudgetBalance,
    nationalDebt: newDebt,
  };
  const newHistory = [...state.history, snapshot].slice(-120); // 10 years

  const newState: ComplexEconomicState = {
    ...state,
    gdpGrowthRate: newGdp,
    unemploymentRate: newUnemp,
    inflationRate: newInflation,
    budgetBalance: newBudgetBalance,
    nationalDebt: newDebt,
    gdpSize: newGdpSize,
    publicApproval: newApproval,
    activeModifiers: remainingModifiers,
    history: newHistory,
    sectors: newSectors,
    external: {
      ...external,
      commodityPriceIndex: newCommodityIndex,
      foreignReserves: newReserves,
      exchangeRatePressure: exchangePressure,
    },
    structural: newStructural,
    momentum: newMomentum,
    policyQueue: updatedQueue,
    activePolicy: updatedActivePolicy,
    crisisDepth: newCrisisDepth,
  };

  return { newState, triggeredEvent, policyWarning: instabilityNote };
};

// ──────────────────────────────────────────────
// AI ECONOMY MANAGEMENT
// ──────────────────────────────────────────────

/**
 * Automates the economy on behalf of AI factions in power.
 * Given their ideology, the AI selects appropriate parameters based on the current financial crisis indicators.
 *
 * @param {ComplexEconomicState} state - The current economy.
 * @param {Ideology} rulingIdeology - Determining mapping to socialist/liberal parameters.
 * @param {Date} currentDate - The game date.
 * @returns {ComplexEconomicState} An updated state equipped with freshly enqueued AI-driven policies.
 */
export const aiManageEconomy = (
  state: ComplexEconomicState,
  currentDate: Date,
  requiredPolicies: Partial<EconomicPolicy>[] = [],
): ComplexEconomicState => {
  let newPolicy = { ...(state.activePolicy ?? state.policy) };
  let changed = false;

  // 1. Fulfill mission requirements first
  for (const req of requiredPolicies) {
    for (const key of Object.keys(req) as (keyof EconomicPolicy)[]) {
      if (req[key] !== undefined && newPolicy[key] !== req[key]) {
        (newPolicy as any)[key] = req[key];
        changed = true;
      }
    }
  }

  // 2. Address critical economic issues if not overridden by missions
  if (!changed) {
    if (state.inflationRate > 8 && newPolicy.spendingLevel !== "austerity") {
      newPolicy.spendingLevel = "austerity";
      changed = true;
    } else if (
      state.unemploymentRate > 8 &&
      newPolicy.spendingLevel !== "expansionary"
    ) {
      newPolicy.spendingLevel = "expansionary";
      changed = true;
    } else if (state.budgetBalance < -5 && newPolicy.taxRate !== "high") {
      newPolicy.taxRate = "high";
      changed = true;
    } else if (state.gdpGrowthRate < 1 && newPolicy.taxRate !== "low") {
      newPolicy.taxRate = "low";
      changed = true;
    }
  }

  if (changed) {
    const { newQueue, newActivePolicy } = enqueuePolicyChange(
      state.activePolicy ?? state.policy,
      newPolicy,
      currentDate,
      state.policyQueue ?? [],
    );
    return {
      ...state,
      policy: newPolicy,
      policyQueue: newQueue,
      activePolicy: newActivePolicy,
    };
  }

  return state;
};

// ──────────────────────────────────────────────
// ELECTION INFLUENCE
// ──────────────────────────────────────────────

export const getElectionEconomicMultiplier = (
  isRulingCoalition: boolean,
  publicApproval: number,
  momentum?: EconomicMomentum,
): number => {
  const normalised = (publicApproval - 50) / 50;
  const MAX_SWING = 0.3; // increased from 0.25

  // Momentum bonus: a worsening trend hurts incumbents more than a static bad number
  let trendPenalty = 0;
  if (momentum && isRulingCoalition) {
    trendPenalty =
      momentum.gdpMomentum < -1 ? -0.05 : momentum.gdpMomentum > 2 ? 0.04 : 0;
  }

  const swing = normalised * MAX_SWING;
  return isRulingCoalition
    ? Math.max(0.5, 1.0 + swing + trendPenalty)
    : Math.max(0.5, 1.0 - swing - trendPenalty);
};

// ──────────────────────────────────────────────
// DISPLAY HELPERS
// ──────────────────────────────────────────────

export const getEconomicOutlookLabel = (
  approval: number,
): { label: string; color: string } => {
  if (approval >= 80) return { label: "Booming", color: "#22c55e" };
  if (approval >= 65) return { label: "Strong", color: "#86efac" };
  if (approval >= 50) return { label: "Stable", color: "#fbbf24" };
  if (approval >= 38) return { label: "Sluggish", color: "#f97316" };
  if (approval >= 25) return { label: "Struggling", color: "#ef4444" };
  if (approval >= 12) return { label: "Crisis", color: "#991b1b" };
  return { label: "Collapse", color: "#450a0a" };
};

export const getElectionImpactDescription = (
  approval: number,
  momentum?: EconomicMomentum,
): string => {
  const trend = momentum
    ? momentum.gdpMomentum > 1
      ? " and improving"
      : momentum.gdpMomentum < -1
        ? " and deteriorating"
        : ""
    : "";
  if (approval >= 75)
    return `Economic performance${trend} strongly favours the ruling coalition.`;
  if (approval >= 60)
    return `The economy${trend} gives the ruling coalition a modest edge.`;
  if (approval >= 45)
    return `Economic performance${trend} is roughly neutral on the vote.`;
  if (approval >= 30)
    return `A sluggish economy${trend} undermines the ruling coalition.`;
  return `Economic crisis${trend} is likely to cost the ruling coalition heavily at the polls.`;
};

export const getActiveShockSummary = (
  modifiers: EconomicModifier[],
): { name: string; monthsLeft: number; positive: boolean }[] =>
  modifiers.map((m) => ({
    name: m.name,
    monthsLeft: m.remainingMonths,
    positive: m.gdpEffect > 0,
  }));

export const getDebtSeverityLabel = (
  nationalDebt: number,
  gdpEstimate: number,
): { label: string; color: string; ratio: number } => {
  const ratio = nationalDebt / Math.max(gdpEstimate, 1);
  if (ratio < 0.3) return { label: "Sustainable", color: "#22c55e", ratio };
  if (ratio < 0.5) return { label: "Manageable", color: "#86efac", ratio };
  if (ratio < 0.7) return { label: "Elevated", color: "#fbbf24", ratio };
  if (ratio < 1.0) return { label: "Dangerous", color: "#f97316", ratio };
  if (ratio < 1.5) return { label: "Critical", color: "#ef4444", ratio };
  return { label: "Default Risk", color: "#991b1b", ratio };
};

export const getCommodityOutlook = (
  index: number,
): { label: string; color: string } => {
  if (index > 160) return { label: "Boom", color: "#22c55e" };
  if (index > 120) return { label: "Strong", color: "#86efac" };
  if (index > 85) return { label: "Normal", color: "#fbbf24" };
  if (index > 60) return { label: "Weak", color: "#f97316" };
  return { label: "Crash", color: "#ef4444" };
};

export const getEconomicFlavor = (state: ComplexEconomicState): string => {
  let flavor = "The national economy is currently ";

  // Base on Growth
  if (state.gdpGrowthRate > 6)
    flavor += "experiencing a period of rapid, breakneck expansion, ";
  else if (state.gdpGrowthRate > 3)
    flavor += "enjoying steady and reliable growth, ";
  else if (state.gdpGrowthRate > 0)
    flavor += "stagnating with sluggish economic activity, ";
  else if (state.gdpGrowthRate > -3)
    flavor += "suffering through a painful recession, ";
  else flavor += "enduring a severe economic depression, ";

  // Combine with Unemployment
  if (state.unemploymentRate > 15)
    flavor +=
      "exacerbated by a crippling lack of jobs that leaves millions idle. ";
  else if (state.unemploymentRate > 8)
    flavor += "weighed down by stubbornly high joblessness. ";
  else if (state.unemploymentRate > 4)
    flavor += "coupled with a manageable employment market. ";
  else
    flavor +=
      "bolstered by full employment leading to fierce competition for labour. ";

  // Structural details
  flavor += "\nStructurally, the nation leans heavily on its ";
  const sectors = state.sectors;
  if (sectors) {
    if (sectors.agriculture > 25)
      flavor +=
        "agricultural and primary estates, maintaining a strong traditional supply chain. ";
    else if (sectors.industry > 35)
      flavor +=
        "industrial manufacturing capabilities, serving as an export juggernaut. ";
    else
      flavor +=
        "expanding services sector, aspiring toward high-income status. ";
  } else {
    flavor += "mixed economic foundation. ";
  }

  // Inflation & Confidence
  if (state.inflationRate > 12)
    flavor +=
      "However, rampant hyperinflation is devastating the purchasing power of the working class, causing widespread anxiety. ";
  else if (state.inflationRate > 6)
    flavor +=
      "However, a sharply rising cost of living is causing anxiety at the checkout counter. ";
  else if (state.inflationRate < 1)
    flavor +=
      "Deflationary pressures are mounting, creating a cautious consumer mindset delaying major purchases. ";

  if (state.crisisDepth > 2)
    flavor +=
      "Public confidence remains fundamentally shattered by cascading structural failures and continuous shocks.";
  else if (state.momentum && state.momentum.businessConfidence > 65)
    flavor +=
      "Meanwhile, investors and business conglomerates remain highly optimistic about the future business climate.";
  else if (state.momentum && state.momentum.consumerConfidence < 35)
    flavor +=
      "Meanwhile, pessimism permeates consumer mindsets, deeply hindering retail and domestic expansion.";

  return flavor;
};
