// ============================================================
// src/utils/ai.ts  — AI Government & Opposition Behaviour
// ============================================================
//
// Layered AI system:
//
//  Layer 1 — Individual character movement & campaigning (existing, enhanced)
//  Layer 2 — Government AI: automatic economic policy management, crisis response,
//             mission tree auto-selection, seat defence as election approaches
//  Layer 3 — Opposition AI: coordinated seat targeting, anti-government messaging,
//             vote-of-no-confidence signalling, economic attack framing
//
// Both Layer 2 and Layer 3 are exported as top-level functions called from App.tsx
// on a monthly cadence, separate from the per-character tick.
// ============================================================

import {
  Character, Demographics, GeoJsonFeature, Affiliation,
  CharacterRole, StrongholdMap, EconomicState, EconomicPolicy,
  Party, Government, PoliticalAlliance,
} from '../types';
import { calculateEffectiveInfluence } from './influence';
import { type ComplexEconomicState } from './economics';
import {
  MissionTreeState, ALL_MISSIONS, MISSIONS_BY_TREE,
  getUnlockedTrees, checkMissionRequirements, getMissionStatus,
  MissionTreeId, TREE_ACCESS_RULES,
} from './missionTrees';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const MOVEMENT_CHANCE_REGULAR = 0.005;
const MOVEMENT_CHANCE_LEADER  = 0.5;
const NUM_SEATS_REGULAR       = 10;
const NUM_SEATS_LEADER        = 20;
const STATEMENT_ACTION_CHANCE = 0.3;
const STRONGHOLD_DEFENSE_THRESHOLD = 3;
const SWING_SEAT_MARGIN            = 100;

// ─────────────────────────────────────────────────────────────
// ECONOMIC CONTEXT
// ─────────────────────────────────────────────────────────────

interface EconomicContext {
  incumbentPressure:    number;  // 0 = helps incumbents, 1 = devastating
  campaignUrgency:      number;  // 0–1
  inflationStress:      number;  // -1 to +1
  unemploymentExcess:   number;  // above natural rate of 8%
  commodityDeviation:   number;  // (index - 100) / 100
  activeNegativeShock:  boolean;
  activePositiveShock:  boolean;
  publicApproval:       number;  // 0–100
  businessConfidence:   number;  // 0–100
  consumerConfidence:   number;  // 0–100
  gdpMomentum:          number;  // rolling average — negative = deteriorating
  crisisDepth:          number;  // 0–5
  isIncumbent:          boolean;
}

const buildEconomicContext = (
  econState: EconomicState | null | undefined,
  isIncumbent: boolean
): EconomicContext => {
  if (!econState) {
    return {
      incumbentPressure: 0, campaignUrgency: 0.3, inflationStress: 0,
      unemploymentExcess: 0, commodityDeviation: 0, activeNegativeShock: false,
      activePositiveShock: false, publicApproval: 50, businessConfidence: 50,
      consumerConfidence: 50, gdpMomentum: 0, crisisDepth: 0, isIncumbent,
    };
  }

  const cx = econState as ComplexEconomicState;
  const approval   = econState.publicApproval ?? 50;
  const crisisDepth = cx.crisisDepth ?? 0;

  const rawPressure     = (50 - approval) / 50;
  const incumbentPressure = Math.max(0, Math.min(1, rawPressure));

  const baseUrgency = isIncumbent
    ? incumbentPressure * 0.6 + crisisDepth * 0.1
    : (1 - incumbentPressure) * 0.3 + crisisDepth * 0.08;
  const campaignUrgency = Math.max(0.1, Math.min(1, baseUrgency + 0.2));

  const inflation        = econState.inflationRate ?? 3;
  const inflationStress  = Math.max(-1, Math.min(1, (inflation - 3) / 10));
  const unemployment     = econState.unemploymentRate ?? 8;
  const unemploymentExcess = Math.max(0, unemployment - 8);
  const commodityDeviation = ((cx.external?.commodityPriceIndex ?? 100) - 100) / 100;

  const modifiers          = econState.activeModifiers ?? [];
  const activeNegativeShock = modifiers.some(m => m.gdpEffect < -1);
  const activePositiveShock  = modifiers.some(m => m.gdpEffect > 1);

  return {
    incumbentPressure,
    campaignUrgency,
    inflationStress,
    unemploymentExcess,
    commodityDeviation,
    activeNegativeShock,
    activePositiveShock,
    publicApproval:     approval,
    businessConfidence: cx.momentum?.businessConfidence ?? 50,
    consumerConfidence: cx.momentum?.consumerConfidence ?? 50,
    gdpMomentum:        cx.momentum?.gdpMomentum ?? 0,
    crisisDepth,
    isIncumbent,
  };
};

// ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
//  LAYER 2 — GOVERNMENT AI
// ══════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────

// ── 2a. Economic policy advisor ──────────────────────────────

/**
 * Returns a recommended EconomicPolicy adjustment for an AI government.
 * Called monthly; only produces changes when a clear signal exists.
 * Respects the governing party's ideology so a right-wing government
 * won't reflexively raise taxes during a recession.
 */
export interface GovernmentPolicyRecommendation {
  policy:    Partial<EconomicPolicy>;
  rationale: string;
}

export const advisePolicyAdjustment = (
  currentPolicy: EconomicPolicy,
  econState:      ComplexEconomicState,
  partyIdeology:  { economic: number; governance: number }, // 0=planned, 100=free-market
  monthsUntilElection: number
): GovernmentPolicyRecommendation | null => {
  const cx     = econState;
  const infl   = cx.inflationRate;
  const unemp  = cx.unemploymentRate;
  const gdp    = cx.gdpGrowthRate;
  const budget = cx.budgetBalance;
  const debt   = cx.nationalDebt;
  const approx = cx.publicApproval;
  const isRightLeaning  = partyIdeology.economic > 55;
  const isLeftLeaning   = partyIdeology.economic < 45;
  const isElectionClose = monthsUntilElection <= 18;

  // ── CRISIS: high inflation (>6%) ──
  if (infl > 6) {
    const rec: Partial<EconomicPolicy> = {};
    if (currentPolicy.spendingLevel === 'expansionary') rec.spendingLevel = 'balanced';
    else if (currentPolicy.spendingLevel === 'balanced' && infl > 9) rec.spendingLevel = 'austerity';
    
    if (currentPolicy.taxRate === 'low') rec.taxRate = 'medium';
    else if (currentPolicy.taxRate === 'medium' && infl > 9) rec.taxRate = 'high';

    if (Object.keys(rec).length > 0) {
      return { policy: rec, rationale: `High inflation at ${infl.toFixed(1)}% — tightening fiscal stance.` };
    }
  }

  // ── CRISIS: rising unemployment (>8%) ──
  if (unemp > 8 && currentPolicy.spendingLevel !== 'expansionary' && infl < 5) {
    if (!isRightLeaning || unemp > 11) {
      return {
        policy: { spendingLevel: 'expansionary' },
        rationale: `Unemployment rising to ${unemp.toFixed(1)}% — enacting stimulus.`,
      };
    }
  }

  // ── CRISIS: sluggish growth (GDP < 2%) ──
  if (gdp < 2 && currentPolicy.spendingLevel === 'austerity') {
    return {
      policy: { spendingLevel: 'balanced' },
      rationale: `Sluggish growth at ${gdp.toFixed(1)}% — easing austerity measures.`,
    };
  }

  // ── DEBT CONCERNS: switch to austerity when deficit is high ──
  const debtToGdpProxy = debt / Math.max(5000, debt * 0.8);
  if ((debtToGdpProxy > 1.0 || budget < -300) && currentPolicy.spendingLevel === 'expansionary') {
    return {
      policy: { spendingLevel: 'balanced', taxRate: isLeftLeaning ? 'high' : 'medium' },
      rationale: `Deficit widening (${budget.toFixed(0)}M) — fiscal consolidation required.`,
    };
  }

  // ── ELECTION STIMULUS: pre-election boom (right-leaning: tax cuts; left: spending) ──
  if (isElectionClose && approx < 55 && cx.crisisDepth === 0) {
    if (isRightLeaning && currentPolicy.taxRate !== 'low' && budget > -200) {
      return {
        policy: { taxRate: 'low' },
        rationale: `Election approaching — pre-election tax cut to boost approval.`,
      };
    }
    if (isLeftLeaning && currentPolicy.welfareLevel !== 'generous' && budget > -200) {
      return {
        policy: { welfareLevel: 'generous' },
        rationale: `Election approaching — welfare expansion to boost approval.`,
      };
    }
    if (currentPolicy.spendingLevel === 'austerity' && budget > -100) {
      return {
        policy: { spendingLevel: 'balanced' },
        rationale: `Election approaching — ending austerity to minimise voter backlash.`,
      };
    }
    if (currentPolicy.spendingLevel === 'balanced' && budget > 100) {
      return {
          policy: { spendingLevel: 'expansionary' },
          rationale: `Election approaching — stimulus spending.`,
      };
    }
  }

  // ── COMMODITY BOOM: capitalise on high commodity prices ──
  const commodityIndex = cx.external?.commodityPriceIndex ?? 100;
  if (commodityIndex > 120 && budget >= -100 && currentPolicy.spendingLevel !== 'expansionary') {
    return {
      policy: { spendingLevel: 'expansionary', prioritySector: 'industry' },
      rationale: `Commodity boom at index ${commodityIndex.toFixed(0)} — investing surplus in industry.`,
    };
  }

  // ── ROUTINE MANAGEMENT (right-leaning: deregulate; left: spend) ──
  if (cx.crisisDepth === 0) {
    if (isRightLeaning) {
        if (currentPolicy.openTrade === false) {
            return {
                policy: { openTrade: true },
                rationale: `Favourable conditions — opening trade to attract foreign capital.`,
            };
        }
        if (currentPolicy.welfareLevel === 'generous') {
             return { policy: { welfareLevel: 'moderate' }, rationale: 'Reducing oversized welfare state.' };
        }
    } else if (isLeftLeaning) {
        if (currentPolicy.welfareLevel === 'minimal' && budget > -100) {
            return {
                policy: { welfareLevel: 'moderate' },
                rationale: `Favourable conditions — expanding domestic demand through welfare.`,
            };
        }
    }
  }

  // ── BUDGET SURPLUS: pay down debt (fiscally conservative govts) ──
  if (budget > 200 && !isLeftLeaning && currentPolicy.spendingLevel === 'expansionary') {
    return {
      policy: { spendingLevel: 'balanced' },
      rationale: `Budget surplus — moderating spending to reduce debt.`,
    };
  }

  return null; // no change recommended
};

// ── 2b. Sector priority rebalancing ──────────────────────────

/**
 * Recommends a sector priority based on structural conditions.
 * Only fires if the current priority is clearly suboptimal.
 */
export const adviseSectorPriority = (
  currentPriority: EconomicPolicy['prioritySector'],
  econState:        ComplexEconomicState,
  partyIdeology:    { economic: number; governance: number }
): EconomicPolicy['prioritySector'] | null => {
  const infra   = econState.structural.infrastructureScore;
  const human   = econState.structural.humanCapitalIndex;
  const sectors = econState.sectors;
  const isRightLeaning = partyIdeology.economic > 55;

  // If infrastructure is very weak, industry investment will be wasted — prioritise agriculture
  if (infra < 25 && currentPriority === 'industry') return 'agriculture';

  // If human capital is high and services sector is growing fast, shift to services
  if (human > 55 && sectors.output.services > 5 && currentPriority !== 'services') {
    return isRightLeaning ? 'services' : null; // left-wing govts prefer industry
  }

  // If industry output is surging and infrastructure supports it, lean in
  if (sectors.output.industry > 6 && infra > 50 && currentPriority !== 'industry') {
    return 'industry';
  }

  // Commodity boom: agriculture/industry depending on type
  if ((econState.external?.commodityPriceIndex ?? 100) > 130 && sectors.agriculture > 30) {
    return currentPriority !== 'agriculture' ? 'agriculture' : null;
  }

  return null;
};

// ── 2c. Crisis response actions ──────────────────────────────

export interface GovernmentCrisisAction {
  type:        'policy_change' | 'security_crackdown' | 'emergency_spending' | 'trade_liberalisation';
  description: string;
  urgency:     'low' | 'medium' | 'high' | 'critical';
  policyChange?: Partial<EconomicPolicy>;
}

export const assessCrisisResponse = (
  econState:  ComplexEconomicState,
  government: Government,
  parties:    Party[]
): GovernmentCrisisAction[] => {
  const actions: GovernmentCrisisAction[] = [];
  const cx = econState;

  // Debt crisis
  if (cx.external?.foreignReserves < 1.5) {
    actions.push({
      type: 'policy_change',
      description: 'Foreign reserves critical — emergency fiscal tightening and trade opening.',
      urgency: 'critical',
      policyChange: { spendingLevel: 'austerity', openTrade: true },
    });
  }

  // Inflationary spiral
  if (cx.inflationRate > 12 && cx.momentum?.inflationExpect > 9) {
    actions.push({
      type: 'policy_change',
      description: `Inflation spiral at ${cx.inflationRate.toFixed(1)}% — contractionary policy.`,
      urgency: 'critical',
      policyChange: { spendingLevel: 'balanced', taxRate: 'high' },
    });
  }

  // High corruption eating public funds
  if (cx.structural.corruptionIndex > 65 && cx.budgetBalance < -400) {
    actions.push({
      type: 'security_crackdown',
      description: 'Corruption at crisis level — anti-corruption drive required.',
      urgency: 'high',
    });
  }

  // Commodity crash
  if ((cx.external?.commodityPriceIndex ?? 100) < 65) {
    actions.push({
      type: 'emergency_spending',
      description: 'Commodity crash — emergency support for plantation and industrial sectors.',
      urgency: 'high',
      policyChange: { spendingLevel: 'expansionary', prioritySector: 'agriculture' },
    });
  }

  // Severe recession with room to stimulate
  if (cx.gdpGrowthRate < -3 && cx.budgetBalance > -600) {
    actions.push({
      type: 'emergency_spending',
      description: `Deep recession at ${cx.gdpGrowthRate.toFixed(1)}% GDP — emergency stimulus.`,
      urgency: 'critical',
      policyChange: { spendingLevel: 'expansionary' },
    });
  }

  return actions.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.urgency] - order[b.urgency];
  });
};

// ── 2d. Mission tree auto-selection ──────────────────────────

export interface MissionAutoSelection {
  missionId:  string;
  treeId:     MissionTreeId;
  rationale:  string;
  priority:   number; // higher = more important
}

/**
 * Given the current economic state and the governing party's ideology,
 * suggest the best available mission to start next.
 * Only fires when there is a slot free (< 2 active missions).
 */
export const suggestNextMission = (
  missionTreeState:  MissionTreeState,
  econState:         ComplexEconomicState,
  partyIdeology:     { economic: number; governance: number },
  partyEthnicFocus?: string | null,
  isMultiracial?:    boolean
): MissionAutoSelection | null => {
  if (missionTreeState.activeMissions.length >= 2) return null;

  const unlockedTrees = missionTreeState.unlockedTreeIds;
  if (unlockedTrees.length === 0) return null;

  const candidates: MissionAutoSelection[] = [];

  for (const treeId of unlockedTrees) {
    const treeMissions = MISSIONS_BY_TREE[treeId];

    for (const mission of treeMissions) {
      const status = getMissionStatus(mission.id, missionTreeState);
      if (status !== 'available') continue;

      const { met } = checkMissionRequirements(mission, econState, missionTreeState);
      if (!met) continue;

      // Score this mission
      let priority = 100;

      // Tier 1 missions are always a good start
      if (mission.tier === 1) priority += 20;

      // Bias toward missions that address current economic weaknesses
      const cx = econState;
      if (mission.reward.unemploymentBonus && cx.unemploymentRate > 10) priority += 30;
      if (mission.reward.inflationModifier && mission.reward.inflationModifier < 0 && cx.inflationRate > 7) priority += 25;
      if (mission.reward.gdpBonus && cx.gdpGrowthRate < 2) priority += 25;
      if (mission.reward.structuralBonus?.corruptionReduction && cx.structural.corruptionIndex > 55) priority += 20;
      if (mission.reward.structuralBonus?.infrastructureBoost && cx.structural.infrastructureScore < 35) priority += 20;
      if (mission.reward.structuralBonus?.humanCapitalBoost && cx.structural.humanCapitalIndex < 35) priority += 20;
      if (mission.reward.approvalBonus && cx.publicApproval < 45) priority += 15;
      if (mission.reward.budgetBonus && mission.reward.budgetBonus > 0 && cx.budgetBalance < -400) priority += 15;

      // Prefer shorter missions when election is approaching (heuristic via crisis depth)
      if (cx.crisisDepth > 1 && mission.durationMonths <= 12) priority += 10;

      // Ideological alignment bonus
      const rule = TREE_ACCESS_RULES.find(r => r.treeId === treeId);
      if (rule) {
        const midEco = (rule.economicRange[0] + rule.economicRange[1]) / 2;
        const midGov = (rule.governanceRange[0] + rule.governanceRange[1]) / 2;
        const ideoDist = Math.sqrt(
          Math.pow(partyIdeology.economic - midEco, 2) +
          Math.pow(partyIdeology.governance - midGov, 2)
        );
        priority -= ideoDist * 0.3; // slight penalty for ideologically distant trees
      }

      candidates.push({
        missionId: mission.id,
        treeId,
        rationale: `${mission.name} (${treeId}) — priority ${priority.toFixed(0)}`,
        priority,
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
};

// ── 2e. Seat defence planner ─────────────────────────────────

export interface SeatDefencePlan {
  seatCode:      string;
  priority:      'critical' | 'high' | 'medium';
  currentMargin: number;
  reason:        string;
}

/**
 * Identifies government seats that need defensive reinforcement.
 * Called in the monthly loop for the governing party's national leader.
 */
export const buildSeatDefencePlan = (
  governingPartyId:    string,
  electionResults:     Map<string, string>,
  allCharacters:       Character[],
  featuresMap:         Map<string, GeoJsonFeature>,
  demographicsMap:     Map<string, Demographics>,
  affiliationToPartyMap: Map<string, string>,
  affiliationsMap:     Map<string, Affiliation>,
  strongholdMap:       StrongholdMap,
  econCtx:             EconomicContext,
  monthsUntilElection: number
): SeatDefencePlan[] => {
  const plans: SeatDefencePlan[] = [];
  const ownedSeats = Array.from(electionResults.entries())
    .filter(([, pId]) => pId === governingPartyId)
    .map(([sc]) => sc);

  for (const seatCode of ownedSeats) {
    const margin = getPartyMarginInSeat(
      governingPartyId, seatCode, allCharacters, featuresMap,
      demographicsMap, affiliationToPartyMap, affiliationsMap, strongholdMap
    );

    const feature = featuresMap.get(seatCode);
    const demo    = demographicsMap.get(seatCode);
    const classif = typeof (demo as any)?.urbanRuralClassification === 'string' ? (demo as any).urbanRuralClassification.toUpperCase() : '';
    const isUrban = classif === 'URBAN';

    // Only flag at-risk seats
    if (margin > 200 && econCtx.incumbentPressure < 0.4) continue;

    let priority: SeatDefencePlan['priority'] = 'medium';
    let reason = '';

    // Critically thin majority
    if (margin < 50) {
      priority = 'critical';
      reason = `Majority only ${margin.toFixed(0)} — seat is nearly lost.`;
    } else if (margin < 120) {
      priority = 'high';
      reason = `Thin majority of ${margin.toFixed(0)} — vulnerable in a swing.`;
    } else if (econCtx.incumbentPressure > 0.5 && margin < 250) {
      priority = 'high';
      reason = `Incumbent pressure ${(econCtx.incumbentPressure * 100).toFixed(0)}% — safe seat at risk.`;
    }

    // Urban seats are more volatile under inflation
    if (isUrban && econCtx.inflationStress > 0.3) {
      priority = priority === 'medium' ? 'high' : priority;
      reason += ` Inflation-stressed urban seat.`;
    }

    // Final push — within 6 months all marginals need defence
    if (monthsUntilElection <= 6 && margin < 300) {
      priority = 'critical';
      reason += ` Election imminent.`;
    }

    if (priority !== 'medium' || monthsUntilElection <= 12) {
      plans.push({ seatCode, priority, currentMargin: margin, reason: reason.trim() });
    }
  }

  return plans.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return order[a.priority] - order[b.priority];
  });
};

// ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
//  LAYER 3 — OPPOSITION AI
// ══════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────

// ── 3a. Attack framing ───────────────────────────────────────

export type AttackFrame =
  | 'cost_of_living'     // inflation / prices
  | 'unemployment'       // jobs
  | 'corruption'         // graft / mismanagement
  | 'inequality'         // gini / wealth gap
  | 'debt_burden'        // national debt / austerity
  | 'foreign_dependency' // trade vulnerability / FDI reliance
  | 'ethnic_grievance'   // available only to ethnic-focus parties
  | 'competence'         // general mismanagement when approval is low
  | 'stability'          // when government is performing well — "don't rock the boat" is bad, argue change needed

export interface OppositionNarrative {
  primaryFrame:   AttackFrame;
  secondaryFrame: AttackFrame | null;
  intensityBonus: number; // multiplied into recognition/influence gains
  messagingNote:  string; // human-readable for log
}

export const buildOppositionNarrative = (
  econState:      ComplexEconomicState,
  partyEthnicity: string | undefined,
  govApproval:    number
): OppositionNarrative => {
  const cx = econState;
  let primaryFrame:   AttackFrame = 'competence';
  let secondaryFrame: AttackFrame | null = null;
  let intensityBonus = 1.0;
  let messagingNote  = '';

  // Rank attack vectors by their political potency
  interface AttackVector { frame: AttackFrame; score: number; note: string }
  const vectors: AttackVector[] = [];

  // Inflation — most visible to voters
  if (cx.inflationRate > 6) {
    vectors.push({
      frame: 'cost_of_living',
      score: (cx.inflationRate - 3) * 8 + cx.momentum.consumerConfidence < 40 ? 20 : 0,
      note:  `Inflation at ${cx.inflationRate.toFixed(1)}% is hurting households.`,
    });
  }

  // Unemployment
  if (cx.unemploymentRate > 9) {
    vectors.push({
      frame: 'unemployment',
      score: (cx.unemploymentRate - 8) * 7,
      note:  `Unemployment at ${cx.unemploymentRate.toFixed(1)}% — jobs message resonates.`,
    });
  }

  // Corruption
  if (cx.structural.corruptionIndex > 50) {
    vectors.push({
      frame: 'corruption',
      score: cx.structural.corruptionIndex - 35,
      note:  `Corruption index at ${cx.structural.corruptionIndex.toFixed(0)}.`,
    });
  }

  // Inequality
  if (cx.structural.giniCoefficient > 0.48) {
    vectors.push({
      frame: 'inequality',
      score: (cx.structural.giniCoefficient - 0.4) * 80,
      note:  `Gini at ${cx.structural.giniCoefficient.toFixed(2)} — inequality is salient.`,
    });
  }

  // Debt
  if (cx.nationalDebt > 2000 && cx.budgetBalance < -300) {
    vectors.push({
      frame: 'debt_burden',
      score: 15 + Math.min(25, (cx.nationalDebt - 1500) / 40),
      note:  `National debt at ${cx.nationalDebt.toFixed(0)}M — fiscal recklessness angle.`,
    });
  }

  // Open trade vulnerability
  if (cx.external.foreignReserves < 2.5 && cx.policy.openTrade) {
    vectors.push({
      frame: 'foreign_dependency',
      score: (2.5 - cx.external.foreignReserves) * 15,
      note:  `Low reserves and open trade = dependency narrative.`,
    });
  }

  // Ethnic grievance (only for ethnic-focus parties)
  if (partyEthnicity && cx.structural.giniCoefficient > 0.45) {
    vectors.push({
      frame: 'ethnic_grievance',
      score: 10 + (cx.structural.giniCoefficient - 0.4) * 40,
      note:  `Ethnic inequality message.`,
    });
  }

  // General competence when approval is low but no single big issue
  if (govApproval < 38) {
    vectors.push({
      frame: 'competence',
      score: (50 - govApproval),
      note:  `Overall incompetence — approval at ${govApproval}%.`,
    });
  }

  // When government is popular, argue "time for a change"
  if (govApproval > 62 && vectors.length === 0) {
    vectors.push({
      frame: 'stability',
      score: 20,
      note:  `Government is popular — contrast with vision for the future.`,
    });
  }

  if (vectors.length === 0) {
    vectors.push({ frame: 'competence', score: 10, note: 'General opposition messaging.' });
  }

  vectors.sort((a, b) => b.score - a.score);
  primaryFrame   = vectors[0].frame;
  secondaryFrame = vectors[1]?.frame ?? null;
  messagingNote  = vectors[0].note;
  intensityBonus = Math.max(1.0, Math.min(2.5, 1 + vectors[0].score / 50));

  return { primaryFrame, secondaryFrame, intensityBonus, messagingNote };
};

// ── 3b. Coordinated seat targeting ───────────────────────────

export interface OppositionSeatTarget {
  seatCode:      string;
  targetPartyId: string; // who currently holds it
  flipScore:     number;
  reason:        string;
}

/**
 * For an opposition party: identify which government seats are most flippable
 * given current economic conditions. Parties in an alliance share this analysis
 * and avoid duplicating effort (each party targets different seats).
 */
export const buildOppositionTargets = (
  oppositionPartyId:    string,
  alliancePartyIds:     string[], // all allied opposition parties — for deconfliction
  electionResults:      Map<string, string>,
  allParties:           Party[],
  allCharacters:        Character[],
  featuresMap:          Map<string, GeoJsonFeature>,
  demographicsMap:      Map<string, Demographics>,
  affiliationToPartyMap: Map<string, string>,
  affiliationsMap:      Map<string, Affiliation>,
  strongholdMap:        StrongholdMap,
  econCtx:              EconomicContext,
  maxTargets:           number = 15
): OppositionSeatTarget[] => {
  const targets: OppositionSeatTarget[] = [];

  // Government seats
  const govSeats = Array.from(electionResults.entries())
    .filter(([, pId]) => pId !== oppositionPartyId && !alliancePartyIds.includes(pId));

  for (const [seatCode, holdingPartyId] of govSeats) {
    const margin = getPartyMarginInSeat(
      oppositionPartyId, seatCode, allCharacters, featuresMap,
      demographicsMap, affiliationToPartyMap, affiliationsMap, strongholdMap
    );

    if (margin < -400) continue; // too far behind to flip

    const feature = featuresMap.get(seatCode);
    const demo    = demographicsMap.get(seatCode);
    const classif = typeof (demo as any)?.urbanRuralClassification === 'string' ? (demo as any).urbanRuralClassification.toUpperCase() : '';
    const isUrban = classif === 'URBAN';
    const isRural = classif === 'RURAL' || classif === 'SEMI URBAN';
    const state   = feature?.properties.NEGERI as string ?? '';
    const isBorneo = state === 'SABAH' || state === 'SARAWAK';

    let flipScore = Math.max(0, 200 + margin); // closer to flipping = higher score

    // Economic conditions amplify flip potential
    if (econCtx.inflationStress > 0.3 && isUrban)   flipScore += econCtx.inflationStress * 40;
    if (econCtx.unemploymentExcess > 2 && isRural)  flipScore += econCtx.unemploymentExcess * 12;
    if (econCtx.commodityDeviation < -0.2 && (isBorneo || isRural)) flipScore += Math.abs(econCtx.commodityDeviation) * 50;
    if (econCtx.activeNegativeShock)                flipScore += 30;
    if (econCtx.incumbentPressure > 0.5)            flipScore += econCtx.incumbentPressure * 40;

    // Stronghold penalty — hard to flip entrenched seats
    const sh = strongholdMap.get(seatCode);
    if (sh && sh.terms >= 3) flipScore -= 30;

    let reason = `Margin: ${margin.toFixed(0)}`;
    if (isUrban && econCtx.inflationStress > 0.3) reason += ', urban inflation';
    if (isRural && econCtx.unemploymentExcess > 2) reason += ', rural unemployment';
    if (econCtx.activeNegativeShock) reason += ', shock swing';

    targets.push({ seatCode, targetPartyId: holdingPartyId, flipScore, reason });
  }

  targets.sort((a, b) => b.flipScore - a.flipScore);
  return targets.slice(0, maxTargets);
};

// ── 3c. No-confidence signalling ─────────────────────────────

export interface VoteOfConfidenceSignal {
  shouldCall:   boolean;
  confidence:   number; // probability of success (0–1)
  rationale:    string;
}

export const assessVoteOfConfidence = (
  econState:           ComplexEconomicState,
  electionResults:     Map<string, string>,
  allParties:          Party[],
  oppositionPartyIds:  string[],
  totalSeats:          number,
  monthsUntilElection: number
): VoteOfConfidenceSignal => {
  const govApproval = econState.publicApproval;
  const crisisDepth = econState.crisisDepth;

  // Count opposition seats
  const oppSeats = Array.from(electionResults.values())
    .filter(pId => oppositionPartyIds.includes(pId)).length;
  const oppMajority = oppSeats / totalSeats;

  // Rough confidence in winning vote
  const baseConf = oppMajority - 0.5; // negative if no majority
  const crisisBoost = crisisDepth * 0.08;
  const approvalBoost = govApproval < 35 ? (35 - govApproval) / 100 : 0;
  const confidence = Math.max(0, Math.min(1, baseConf + crisisBoost + approvalBoost));

  // Conditions that make calling worthwhile
  const shouldCall =
    confidence > 0.45 &&            // decent chance of success
    govApproval < 38 &&             // government is unpopular
    monthsUntilElection > 12 &&     // not pointless near election
    crisisDepth >= 2;               // genuine crisis context

  let rationale = '';
  if (shouldCall) {
    rationale = `Conditions favour a VoNC: ${oppSeats} opposition seats, gov approval ${govApproval}%, crisis depth ${crisisDepth}.`;
  } else {
    rationale = `VoNC unwise: confidence ${(confidence * 100).toFixed(0)}%, approval ${govApproval}%.`;
  }

  return { shouldCall, confidence, rationale };
};

// ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
//  MONTHLY GOVERNMENT AI TICK  (call from App.tsx game loop)
// ══════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────

export interface GovernmentAIResult {
  policyChange:         Partial<EconomicPolicy> | null;
  policyChangeRationale: string | null;
  crisisActions:        GovernmentCrisisAction[];
  suggestedMission:     MissionAutoSelection | null;
  seatDefencePlan:      SeatDefencePlan[];
  logMessages:          string[];
}

/**
 * Run all government AI logic for one month.
 * Returns a result object — App.tsx applies the changes.
 *
 * @param governingParty        The lead governing party
 * @param econState             Current ComplexEconomicState
 * @param missionTreeState      Current mission tree state (pass DEFAULT if not used)
 * @param electionResults       Current seat->party map
 * @param allCharacters         Full character list
 * @param featuresMap           Seat feature map
 * @param demographicsMap       Seat demographics map
 * @param affiliationToPartyMap Affiliation->party lookup
 * @param affiliationsMap       Affiliation detail map
 * @param strongholdMap         Stronghold data
 * @param monthsUntilElection   Months until next general election
 * @param isPlayerGoverning     If true, suppress policy changes (player controls those)
 */
export const runGovernmentAI = (
  governingParty:       Party,
  econState:            ComplexEconomicState,
  missionTreeState:     MissionTreeState,
  electionResults:      Map<string, string>,
  allCharacters:        Character[],
  featuresMap:          Map<string, GeoJsonFeature>,
  demographicsMap:      Map<string, Demographics>,
  affiliationToPartyMap: Map<string, string>,
  affiliationsMap:      Map<string, Affiliation>,
  strongholdMap:        StrongholdMap,
  monthsUntilElection:  number,
  isPlayerGoverning:    boolean
): GovernmentAIResult => {
  const logs: string[] = [];
  const ideology = governingParty.ideology ?? { economic: 50, governance: 50 };
  const econCtx  = buildEconomicContext(econState, true);

  // 1. Crisis triage
  const crisisActions = assessCrisisResponse(econState, { chiefMinisterId: '', rulingCoalitionIds: [governingParty.id], cabinet: [], formedDate: new Date(), pmHistory: [] }, [governingParty]);
  if (crisisActions.length > 0) {
    logs.push(`[GOV] Crisis detected: ${crisisActions[0].description}`);
  }

  // 2. Policy recommendation (skip if player is governing)
  let policyChange: Partial<EconomicPolicy> | null = null;
  let policyChangeRationale: string | null = null;

  if (!isPlayerGoverning) {
    // Crisis policy takes precedence
    if (crisisActions.length > 0 && crisisActions[0].urgency === 'critical' && crisisActions[0].policyChange) {
      policyChange = crisisActions[0].policyChange;
      policyChangeRationale = crisisActions[0].description;
    } else {
      const activePolicy = (econState as ComplexEconomicState).activePolicy ?? econState.policy;
      const rec = advisePolicyAdjustment(activePolicy, econState, ideology, monthsUntilElection);
      if (rec) {
        policyChange = rec.policy;
        policyChangeRationale = rec.rationale;
        logs.push(`[GOV] Policy: ${rec.rationale}`);
      }

      // Sector rebalancing
      const newSector = adviseSectorPriority(activePolicy.prioritySector, econState, ideology);
      if (newSector && newSector !== activePolicy.prioritySector) {
        policyChange = { ...policyChange, prioritySector: newSector };
        logs.push(`[GOV] Sector rebalanced to ${newSector}`);
      }
    }
  }

  // 3. Mission suggestion
  const suggestedMission = missionTreeState.unlockedTreeIds.length > 0
    ? suggestNextMission(
        missionTreeState, econState, ideology,
        governingParty.ethnicityFocus ?? null,
        !governingParty.ethnicityFocus
      )
    : null;
  if (suggestedMission) {
    logs.push(`[GOV] Mission suggested: ${suggestedMission.rationale}`);
  }

  // 4. Seat defence
  const seatDefencePlan = buildSeatDefencePlan(
    governingParty.id, electionResults, allCharacters,
    featuresMap, demographicsMap, affiliationToPartyMap,
    affiliationsMap, strongholdMap, econCtx, monthsUntilElection
  );
  if (seatDefencePlan.filter(p => p.priority === 'critical').length > 0) {
    logs.push(`[GOV] ${seatDefencePlan.filter(p => p.priority === 'critical').length} critical seats need defence.`);
  }

  return { policyChange, policyChangeRationale, crisisActions, suggestedMission, seatDefencePlan, logMessages: logs };
};

// ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
//  MONTHLY OPPOSITION AI TICK  (call from App.tsx game loop)
// ══════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────

export interface OppositionAIResult {
  narrative:    OppositionNarrative;
  targets:      OppositionSeatTarget[];
  logMessages:  string[];
  voteOfConfidence: { shouldCall: boolean; rationale: string };
}

export const runOppositionAI = (
  oppositionParty:      Party,
  alliancePartyIds:     string[],
  econState:            ComplexEconomicState,
  electionResults:      Map<string, string>,
  allParties:           Party[],
  allCharacters:        Character[],
  featuresMap:          Map<string, GeoJsonFeature>,
  demographicsMap:      Map<string, Demographics>,
  affiliationToPartyMap: Map<string, string>,
  affiliationsMap:      Map<string, Affiliation>,
  strongholdMap:        StrongholdMap,
  totalSeats:           number,
  monthsUntilElection:  number
): OppositionAIResult => {
  const logs: string[] = [];
  const econCtx = buildEconomicContext(econState, false);
  const allOppositionIds = [oppositionParty.id, ...alliancePartyIds];

  const narrative = buildOppositionNarrative(
    econState,
    oppositionParty.ethnicityFocus ?? undefined,
    econState.publicApproval
  );
  logs.push(`[OPP:${oppositionParty.name}] Frame: ${narrative.primaryFrame} — ${narrative.messagingNote}`);

  const targets = buildOppositionTargets(
    oppositionParty.id, alliancePartyIds,
    electionResults, allParties, allCharacters,
    featuresMap, demographicsMap, affiliationToPartyMap,
    affiliationsMap, strongholdMap, econCtx
  );
  if (targets.length > 0) {
    logs.push(`[OPP:${oppositionParty.name}] Top target: ${targets[0].seatCode} (${targets[0].reason})`);
  }

  const voteOfConfidence = assessVoteOfConfidence(
    econState, electionResults, allParties,
    allOppositionIds, totalSeats, monthsUntilElection
  );
  if (voteOfConfidence.shouldCall) {
    logs.push(`[OPP:${oppositionParty.name}] Recommends VoNC: ${voteOfConfidence.rationale}`);
  }

  return { narrative, targets, voteOfConfidence, logMessages: logs };
};

// ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
//  LAYER 1 — INDIVIDUAL CHARACTER ACTIONS  (enhanced)
// ══════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────

interface SeatAnalysis {
  currentMargin:    number;
  volatility:       number;
  strategicValue:   number;
  isStronghold:     boolean;
  isPriorityTarget: boolean;
  economicBonus:    number;
}

const analyzeSeat = (
  seatCode:             string,
  partyId:              string,
  allCharacters:        Character[],
  featuresMap:          Map<string, GeoJsonFeature>,
  demographicsMap:      Map<string, Demographics>,
  affiliationToPartyMap: Map<string, string>,
  affiliationsMap:      Map<string, Affiliation>,
  strongholdMap:        StrongholdMap,
  econCtx:              EconomicContext,
  defencePriorities?:   Set<string>,   // seats government must defend
  attackTargets?:       Set<string>    // seats opposition is targeting
): SeatAnalysis => {
  const margin = getPartyMarginInSeat(
    partyId, seatCode, allCharacters, featuresMap,
    demographicsMap, affiliationToPartyMap, affiliationsMap, strongholdMap
  );

  const strongholdData  = strongholdMap.get(seatCode);
  const isOurStronghold = !!(strongholdData &&
    allCharacters.some(c =>
      c.currentSeatCode === seatCode &&
      c.affiliationId === strongholdData.affiliationId &&
      affiliationToPartyMap.get(c.affiliationId) === partyId
    ));
  const volatility = Math.abs(margin) < SWING_SEAT_MARGIN ? 100 : 0;

  let strategicValue = 50;
  if (volatility > 0 && margin > -50 && margin < 150) strategicValue += 30;
  if (isOurStronghold && strongholdData && strongholdData.terms >= STRONGHOLD_DEFENSE_THRESHOLD) strategicValue += 40;
  if (!isOurStronghold && strongholdData && strongholdData.terms >= 2 && margin > -100) strategicValue += 25;

  // Boost from government defence plan
  if (defencePriorities?.has(seatCode)) strategicValue += 60;
  // Boost from opposition target plan
  if (attackTargets?.has(seatCode)) strategicValue += 50;

  let economicBonus = 0;
  const feature = featuresMap.get(seatCode);
  const demo    = demographicsMap.get(seatCode);

  if (feature && demo) {
    const state    = feature.properties.NEGERI as string;
    const isBorneo = state === 'SABAH' || state === 'SARAWAK';
    const classif  = typeof (demo as any).urbanRuralClassification === 'string' ? (demo as any).urbanRuralClassification.toUpperCase() : '';
    const isUrban  = classif === 'URBAN';
    const isRural  = classif === 'RURAL' || classif === 'SEMI URBAN';

    if (econCtx.unemploymentExcess > 2) {
      if (!econCtx.isIncumbent && isRural)     economicBonus += econCtx.unemploymentExcess * 6;
      if (econCtx.isIncumbent && isOurStronghold) economicBonus += econCtx.unemploymentExcess * 3;
    }
    if ((isBorneo || isRural) && Math.abs(econCtx.commodityDeviation) > 0.2) {
      const boost = Math.abs(econCtx.commodityDeviation) * 40;
      economicBonus += (!econCtx.isIncumbent && econCtx.commodityDeviation < -0.2) ? boost * 1.5 : boost;
    }
    if (econCtx.inflationStress > 0.3 && isUrban) {
      economicBonus += !econCtx.isIncumbent
        ? econCtx.inflationStress * 35
        : (isOurStronghold ? econCtx.inflationStress * 20 : 0);
    }
    if (econCtx.consumerConfidence < 40 && volatility > 0) {
      economicBonus += (40 - econCtx.consumerConfidence) * 0.8;
    }
    if (econCtx.activeNegativeShock) {
      if (!econCtx.isIncumbent && margin > -100) economicBonus += 30;
      if (econCtx.isIncumbent && isOurStronghold) economicBonus += 20;
    }
    if (econCtx.activePositiveShock) {
      if (econCtx.isIncumbent && margin > 0)    economicBonus += 20;
      if (!econCtx.isIncumbent && margin > -50) economicBonus += 10;
    }
  }

  strategicValue += economicBonus;
  return {
    currentMargin: margin, volatility, strategicValue,
    isStronghold:  isOurStronghold, isPriorityTarget: strategicValue > 70, economicBonus,
  };
};

const getPartyMarginInSeat = (
  partyId:              string,
  seatCode:             string,
  allCharacters:        Character[],
  featuresMap:          Map<string, GeoJsonFeature>,
  demographicsMap:      Map<string, Demographics>,
  affiliationToPartyMap: Map<string, string>,
  affiliationsMap:      Map<string, Affiliation>,
  strongholdMap:        StrongholdMap
): number => {
  const chars   = allCharacters.filter(c => c.currentSeatCode === seatCode && c.isAlive);
  const feature = featuresMap.get(seatCode);
  if (!feature) return 0;

  const demo = demographicsMap.get(seatCode);
  const influenceMap = new Map<string, number>();

  chars.forEach(c => {
    const charParty = affiliationToPartyMap.get(c.affiliationId);
    if (!charParty) return;
    const inf = calculateEffectiveInfluence(c, feature, demo || null, affiliationsMap, strongholdMap);
    influenceMap.set(charParty, (influenceMap.get(charParty) || 0) + inf);
  });

  const ours = influenceMap.get(partyId) || 0;
  let rival  = 0;
  for (const [id, inf] of influenceMap) {
    if (id !== partyId && inf > rival) rival = inf;
  }
  return ours - rival;
};

const determineRegularAction = (
  character:        Character,
  allSeatCodes:     string[],
  featuresMap:      Map<string, GeoJsonFeature>,
  demographicsMap:  Map<string, Demographics>,
  affiliationsMap:  Map<string, Affiliation>,
  strongholdMap:    StrongholdMap,
  econCtx:          EconomicContext,
  defencePriorities?: Set<string>,
  attackTargets?:     Set<string>
): Character => {
  const numSeats = econCtx.activeNegativeShock ? Math.round(NUM_SEATS_REGULAR * 1.5) : NUM_SEATS_REGULAR;
  const sampleSeats = Array.from({ length: numSeats }, () =>
    allSeatCodes[Math.floor(Math.random() * allSeatCodes.length)]
  );

  let bestSeatCode = character.currentSeatCode;
  const currentFeature = featuresMap.get(bestSeatCode);
  if (!currentFeature) return character;

  const incumbentBonus = Math.max(1.0, 1.15 - (econCtx.isIncumbent ? econCtx.incumbentPressure * 0.08 : 0));
  let maxInfluence = calculateEffectiveInfluence(
    character, currentFeature, demographicsMap.get(bestSeatCode) || null, affiliationsMap, strongholdMap
  ) * incumbentBonus;

  // Hard pull toward defence/attack priority seats
  const prioritisedSeats = [
    ...(defencePriorities ? Array.from(defencePriorities) : []),
    ...(attackTargets     ? Array.from(attackTargets)     : []),
  ];
  const seatsToEvaluate = [...new Set([...prioritisedSeats, ...sampleSeats])];

  for (const seatCode of seatsToEvaluate) {
    const feature = featuresMap.get(seatCode);
    if (!feature) continue;

    let potentialInfluence = calculateEffectiveInfluence(
      character, feature, demographicsMap.get(seatCode) || null, affiliationsMap, strongholdMap
    );

    const demo = demographicsMap.get(seatCode);
    if (demo) {
      const classif = typeof (demo as any).urbanRuralClassification === 'string' ? (demo as any).urbanRuralClassification.toUpperCase() : '';
      const isRural = classif === 'RURAL' || classif === 'SEMI URBAN';
      const isUrban = classif === 'URBAN';
      if (!econCtx.isIncumbent && econCtx.unemploymentExcess > 2 && isRural)  potentialInfluence *= 1 + econCtx.unemploymentExcess * 0.04;
      if (!econCtx.isIncumbent && econCtx.inflationStress > 0.3 && isUrban)   potentialInfluence *= 1 + econCtx.inflationStress * 0.15;
    }

    // Priority seats are treated as if they have boosted influence potential
    if (defencePriorities?.has(seatCode) || attackTargets?.has(seatCode)) potentialInfluence *= 1.3;

    const moveBar = econCtx.activeNegativeShock ? 1.05 : 1.1;
    if (potentialInfluence > maxInfluence * moveBar) {
      maxInfluence = potentialInfluence;
      bestSeatCode = seatCode;
    }
  }

  return bestSeatCode !== character.currentSeatCode ? { ...character, currentSeatCode: bestSeatCode } : character;
};

const determineStrategicMove = (
  character:            Character,
  seatsToConsider:      string[],
  allCharacters:        Character[],
  featuresMap:          Map<string, GeoJsonFeature>,
  demographicsMap:      Map<string, Demographics>,
  affiliationToPartyMap: Map<string, string>,
  affiliationsMap:      Map<string, Affiliation>,
  strongholdMap:        StrongholdMap,
  econCtx:              EconomicContext,
  defencePriorities?:   Set<string>,
  attackTargets?:       Set<string>
): Character => {
  const partyId = affiliationToPartyMap.get(character.affiliationId);
  if (!partyId) return character;

  const seatAnalyses = new Map<string, SeatAnalysis>();
  seatsToConsider.forEach(sc =>
    seatAnalyses.set(sc, analyzeSeat(
      sc, partyId, allCharacters, featuresMap, demographicsMap,
      affiliationToPartyMap, affiliationsMap, strongholdMap, econCtx,
      defencePriorities, attackTargets
    ))
  );

  const prioritySeats = Array.from(seatAnalyses.entries())
    .filter(([, a]) => a.isPriorityTarget).map(([sc]) => sc);

  const seatsToEvaluate = [...new Set([
    ...prioritySeats,
    ...(defencePriorities ? Array.from(defencePriorities) : []),
    ...(attackTargets     ? Array.from(attackTargets)     : []),
    ...seatsToConsider.sort(() => Math.random() - 0.5).slice(0, NUM_SEATS_LEADER),
  ])];

  const currentSeatAnalysis = seatAnalyses.get(character.currentSeatCode);
  const currentSeatMargin   = currentSeatAnalysis?.currentMargin || 0;

  interface MoveEval { seatCode: string; score: number }
  const moveEvals: MoveEval[] = [];

  for (const targetSeatCode of seatsToEvaluate) {
    if (!targetSeatCode || targetSeatCode === character.currentSeatCode) continue;

    const targetAnalysis = seatAnalyses.get(targetSeatCode) ??
      analyzeSeat(targetSeatCode, partyId, allCharacters, featuresMap, demographicsMap,
        affiliationToPartyMap, affiliationsMap, strongholdMap, econCtx, defencePriorities, attackTargets);

    const targetSeatMargin = targetAnalysis.currentMargin;
    const hypotheticalChars = allCharacters.map(c =>
      c.id === character.id ? { ...c, currentSeatCode: targetSeatCode } : c
    );
    const newCurrentMargin = getPartyMarginInSeat(partyId, character.currentSeatCode, hypotheticalChars, featuresMap, demographicsMap, affiliationToPartyMap, affiliationsMap, strongholdMap);
    const newTargetMargin  = getPartyMarginInSeat(partyId, targetSeatCode, hypotheticalChars, featuresMap, demographicsMap, affiliationToPartyMap, affiliationsMap, strongholdMap);

    const marginImprovement = (newTargetMargin - targetSeatMargin) + (newCurrentMargin - currentSeatMargin);
    let score = marginImprovement * 0.5 + targetAnalysis.strategicValue * 2;

    if (targetSeatMargin < 0 && newTargetMargin > 0) score += 200 * (1 + econCtx.campaignUrgency * 0.5);
    if (targetAnalysis.isStronghold && targetSeatMargin < 100) score += 150 * (econCtx.isIncumbent ? 1 + econCtx.incumbentPressure : 1);
    if (targetAnalysis.volatility > 0 && newTargetMargin > 50) score += 100 * (!econCtx.isIncumbent ? 1 + econCtx.incumbentPressure : 1);
    if (currentSeatAnalysis?.isStronghold && currentSeatMargin > 0) score -= econCtx.isIncumbent ? 100 + econCtx.incumbentPressure * 80 : 100;
    if (econCtx.campaignUrgency > 0.6) score += targetAnalysis.economicBonus * econCtx.campaignUrgency;

    // Huge bonus for moving to a priority seat
    if (defencePriorities?.has(targetSeatCode)) score += 300;
    if (attackTargets?.has(targetSeatCode))     score += 250;

    moveEvals.push({ seatCode: targetSeatCode, score });
  }

  moveEvals.sort((a, b) => b.score - a.score);
  if (moveEvals.length > 0) {
    let moveThreshold = 50;
    if (currentSeatAnalysis?.isStronghold && currentSeatMargin < 50) {
      moveThreshold = econCtx.isIncumbent ? 80 + econCtx.incumbentPressure * 60 : 100;
    }
    if (econCtx.activeNegativeShock) moveThreshold *= 0.7;
    moveThreshold *= Math.max(0.5, 1 - econCtx.campaignUrgency * 0.4);

    if (moveEvals[0].score > moveThreshold) {
      return { ...character, currentSeatCode: moveEvals[0].seatCode };
    }
  }
  return character;
};

const performStatementAction = (
  character: Character,
  role:      CharacterRole,
  econCtx:   EconomicContext,
  narrative: OppositionNarrative | null
): Character => {
  let influenceGain   = 0;
  let recognitionGain = 0;

  if (role === 'National Leader')                             { influenceGain = 12; recognitionGain = 8; }
  else if (role === 'National Deputy Leader' || role === 'State Leader') {
    if (Math.random() < 0.6) { influenceGain = 10; recognitionGain = 5; }
    else                      { influenceGain = 8;  recognitionGain = 3; }
  } else { influenceGain = 5; recognitionGain = 2; }

  // Opposition narrative intensity bonus
  if (!econCtx.isIncumbent && narrative) {
    influenceGain   = Math.round(influenceGain   * narrative.intensityBonus);
    recognitionGain = Math.round(recognitionGain * narrative.intensityBonus);
  }

  if (!econCtx.isIncumbent && econCtx.incumbentPressure > 0.3) {
    const anger = 1 + econCtx.incumbentPressure * 0.6;
    influenceGain = Math.round(influenceGain * anger); recognitionGain = Math.round(recognitionGain * anger);
  }
  if (econCtx.isIncumbent && econCtx.publicApproval > 60) {
    const credit = 1 + (econCtx.publicApproval - 60) / 100;
    influenceGain = Math.round(influenceGain * credit); recognitionGain = Math.round(recognitionGain * credit);
  }
  if (econCtx.inflationStress > 0.4)     recognitionGain = Math.round(recognitionGain * (1 + econCtx.inflationStress * 0.4));
  if (econCtx.businessConfidence < 35) {
    const apathy = 0.7 + (econCtx.businessConfidence / 35) * 0.3;
    influenceGain = Math.round(influenceGain * apathy); recognitionGain = Math.round(recognitionGain * apathy);
  }
  if (econCtx.activeNegativeShock) {
    const amp = 1 + econCtx.campaignUrgency * 0.3;
    influenceGain = Math.round(influenceGain * amp); recognitionGain = Math.round(recognitionGain * amp);
  }

  return {
    ...character,
    influence:   Math.min(100, character.influence   + Math.max(1, influenceGain)),
    recognition: Math.min(100, character.recognition + Math.max(1, recognitionGain)),
  };
};

// ─────────────────────────────────────────────────────────────
// MAIN PER-CHARACTER DISPATCHER  (called every tick per char)
// ─────────────────────────────────────────────────────────────

export const determineAIAction = (
  character:            Character,
  role:                 CharacterRole,
  allCharacters:        Character[],
  allSeatCodes:         string[],
  featuresMap:          Map<string, GeoJsonFeature>,
  demographicsMap:      Map<string, Demographics>,
  affiliationToPartyMap: Map<string, string>,
  affiliationsMap:      Map<string, Affiliation>,
  seatAffiliationPopMap: Map<string, Map<string, number>>,
  seatTotalPopMap:       Map<string, number>,
  strongholdMap:         StrongholdMap,
  economicState?:        EconomicState | null,
  isIncumbent?:          boolean,
  // NEW — pass down from App.tsx monthly results
  govDefencePriorities?: Set<string>,
  oppAttackTargets?:     Set<string>,
  oppNarrative?:         OppositionNarrative | null
): Character => {
  const seatAffs = seatAffiliationPopMap.get(character.currentSeatCode);
  const affCount = seatAffs ? (seatAffs.get(character.affiliationId) || 0) : 0;
  const totalPop = seatTotalPopMap.get(character.currentSeatCode) || 0;
  const canMove  = affCount > 1 && totalPop > 9;

  const econCtx = buildEconomicContext(economicState, !!isIncumbent);

  let actionChance = (
    role === 'National Leader' || role === 'National Deputy Leader' || role === 'State Leader'
  ) ? MOVEMENT_CHANCE_LEADER : MOVEMENT_CHANCE_REGULAR;

  actionChance = Math.min(1, actionChance * (1 + econCtx.campaignUrgency * 0.8));
  if (Math.random() > actionChance) return character;

  let statementThreshold = STATEMENT_ACTION_CHANCE;
  if (!canMove)                statementThreshold = 0.8;
  else if (role === 'National Leader') statementThreshold = 0.2;

  if (econCtx.isIncumbent && econCtx.incumbentPressure > 0.4)  statementThreshold += econCtx.incumbentPressure * 0.15;
  else if (!econCtx.isIncumbent && econCtx.incumbentPressure > 0.4) statementThreshold -= econCtx.incumbentPressure * 0.15;

  statementThreshold = Math.max(0.05, Math.min(0.9, statementThreshold));

  if (Math.random() < statementThreshold) {
    return performStatementAction(character, role, econCtx, oppNarrative ?? null);
  }
  if (!canMove) return character;

  const defPriorities = econCtx.isIncumbent ? govDefencePriorities : undefined;
  const atkTargets    = !econCtx.isIncumbent ? oppAttackTargets    : undefined;

  if (role === 'National Leader' || role === 'National Deputy Leader') {
    return determineStrategicMove(
      character, allSeatCodes, allCharacters, featuresMap,
      demographicsMap, affiliationToPartyMap, affiliationsMap,
      strongholdMap, econCtx, defPriorities, atkTargets
    );
  }
  if (role === 'State Leader') {
    const stateSeatCodes = allSeatCodes.filter(
      sc => featuresMap.get(sc)?.properties.NEGERI === character.state
    );
    return determineStrategicMove(
      character, stateSeatCodes, allCharacters, featuresMap,
      demographicsMap, affiliationToPartyMap, affiliationsMap,
      strongholdMap, econCtx, defPriorities, atkTargets
    );
  }
  return determineRegularAction(
    character, allSeatCodes, featuresMap, demographicsMap,
    affiliationsMap, strongholdMap, econCtx, defPriorities, atkTargets
  );
};