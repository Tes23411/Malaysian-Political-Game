// ============================================================
// src/utils/missionTrees.ts  — National Development Mission Trees
// ============================================================
//
// HOI4/EU4-INSPIRED MISSION SYSTEM
// Six ideologically-distinct mission trees, each with 35 missions across 5 tiers.
//
// Design pillars:
//   - Every tree tells a coherent historical narrative
//   - Branching choices lock out alternative paths (mutually exclusive)
//   - Cross-tree synergies reward ideological consistency
//   - Crisis missions trigger automatically from adverse conditions
//   - Legacy missions carry permanent reputation across elections
//   - Milestone missions require partial completion of multiple trees
//   - Each mission has a flavour quote, historical note, and event trigger
//
// TREES:
//   1. Bumiputera Agenda      — Malay ethno-nationalism & affirmative action
//   2. Developmental State    — Technocratic industrialisation, East Asian model
//   3. Liberal Open Economy   — Free markets, deregulation, meritocracy
//   4. Socialist Welfare      — Redistribution, labour rights, public ownership
//   5. Export Tiger           — Commodity, FDI, and export-led growth
//   6. Federal Pluralism      — Devolution, minority rights, multiracial democracy
// ============================================================

/**
 * @fileoverview Manages the National Development Mission Trees system.
 * Evaluates requirements, triggers crisis events, and orchestrates synergies across ideological mission networks.
 * 
 * @dependencies
 * - `../missionTrees_part*`: Pulls in static mission definitions.
 * - `../types`: Core types like `Mission`, `EconomicState`.
 */
import { EconomicPolicy, EconomicState, Ideology, Ethnicity, Bill, Party } from '../types';
import { type ComplexEconomicState } from './economics';

// ─────────────────────────────────────────────────────────────
// CORE TYPES
// ─────────────────────────────────────────────────────────────

export type MissionTreeId =
  | 'bumiputera_agenda'
  | 'developmental_state'
  | 'liberal_open_economy'
  | 'socialist_welfare'
  | 'export_tiger'
  | 'federal_pluralism';

export type MissionStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'crisis'
  | 'locked_by_choice';

export type MissionTier = 1 | 2 | 3 | 4 | 5;

export type MissionCategory =
  | 'economic'
  | 'social'
  | 'institutional'
  | 'external'
  | 'military'
  | 'crisis'
  | 'legacy'
  | 'diplomatic';

export interface PopulationGrowthBonus {
  ethnicity: Ethnicity | 'all';
  bonus: number;
}

export interface PolicyUnlock {
  description: string;
  unlockedOptions: Partial<Record<keyof EconomicPolicy, string[]>>;
}

export interface CrossTreeSynergy {
  beneficiaryTree: MissionTreeId;
  targetMissionId: string;
  requirementReduction?: number;
  bypassIdeologyGate?: boolean;
  description: string;
}

export interface MissionReward {
  gdpBonus?: number;
  unemploymentBonus?: number;
  inflationModifier?: number;
  budgetBonus?: number;
  approvalBonus?: number;
  legacyPoints?: number;
  populationGrowthBonuses?: PopulationGrowthBonus[];
  policyUnlock?: PolicyUnlock;
  structuralBonus?: {
    corruptionReduction?: number;
    infrastructureBoost?: number;
    humanCapitalBoost?: number;
    inequalityReduction?: number;
  };
  crossTreeSynergies?: CrossTreeSynergy[];
  locksOutMissions?: string[];
  flavourText: string;
  historicalNote?: string;
  eventTriggerId?: string; // triggers a game event on completion
}

export interface MissionRequirement {
  minGdpGrowth?: number;
  maxUnemployment?: number;
  maxInflation?: number;
  minBudgetBalance?: number;
  minInfrastructure?: number;
  minHumanCapital?: number;
  maxCorruption?: number;
  minApproval?: number;
  minCommodityIndex?: number;
  maxCommodityIndex?: number;
  requiredPolicy?: Partial<EconomicPolicy>;
  requiredPassedLaws?: string[];
  minMonthsInPower?: number;
  prerequisites?: string[];
  prerequisitesAny?: string[];
  minLegacyPoints?: number;
  crossTreePrerequisites?: string[];
  crisisTrigger?: {
    unemploymentAbove?: number;
    inflationAbove?: number;
    gdpBelow?: number;
    budgetDeficitAbove?: number;
  };
  description: string;
}

export interface Mission {
  id: string;
  treeId: MissionTreeId;
  tier: MissionTier;
  category: MissionCategory;
  name: string;
  description: string;
  flavourQuote?: string;
  durationMonths: number;
  lapsesIfRequirementsLost?: boolean;
  requirements: MissionRequirement;
  reward: MissionReward;
  prerequisiteIds: string[];
  mutuallyExclusiveWith?: string[];
  branch?: string;
  icon?: string; // emoji/icon for UI
}

export interface ActiveMission {
  missionId: string;
  treeId: MissionTreeId;
  startDate: Date;
  completionDate: Date;
  monthsRemaining: number;
}

export interface CompletedMission {
  missionId: string;
  treeId: MissionTreeId;
  completionDate: Date;
}

export interface MissionTreeState {
  unlockedTreeIds: MissionTreeId[];
  activeMissions: ActiveMission[];
  completedMissions: CompletedMission[];
  failedMissionIds: string[];
  lockedOutMissionIds: string[];
  crossTreeSynergyUnlocks: string[];
  permanentBonuses: AccumulatedBonuses;
  unlockedPolicyOptions: Partial<Record<keyof EconomicPolicy, Set<string>>>;
  populationGrowthMultipliers: Partial<Record<Ethnicity | 'all', number>>;
  monthsInPower: number;
  legacyPoints: number;
  activeCrisisIds: string[];
}

export interface AccumulatedBonuses {
  gdpBonus: number;
  unemploymentBonus: number;
  inflationModifier: number;
  budgetBonus: number;
  corruptionReduction: number;
  infrastructureBoost: number;
  humanCapitalBoost: number;
  inequalityReduction: number;
}

// ─────────────────────────────────────────────────────────────
// TREE ACCESS RULES
// ─────────────────────────────────────────────────────────────

export interface TreeAccessRule {
  treeId: MissionTreeId;
  name: string;
  shortName: string;
  description: string;
  iconColor: string;
  economicRange: [number, number];
  governanceRange: [number, number];
  ethnicFocus?: Ethnicity | null;
  requiresMultiracial?: boolean;
  partialAccessFrom?: MissionTreeId[];
}

export const TREE_ACCESS_RULES: TreeAccessRule[] = [
  {
    treeId: 'bumiputera_agenda',
    name: 'Bumiputera Agenda',
    shortName: 'Bumi',
    description: 'Elevate the indigenous Bumiputera through affirmative policy, land reform, and state-directed capital formation. Navigate the eternal tension between ethnic equity and national efficiency.',
    iconColor: '#1d6b2e',
    economicRange: [20, 55],
    governanceRange: [55, 100],
    ethnicFocus: 'Malay',
  },
  {
    treeId: 'developmental_state',
    name: 'Developmental State',
    shortName: 'Dev',
    description: 'A technocratic state orchestrates industrialisation, infrastructure, and guided capitalism along the East Asian model. Success demands state capacity, disciplined bureaucracy, and ruthless anti-corruption.',
    iconColor: '#1e3a8a',
    economicRange: [25, 65],
    governanceRange: [60, 100],
    ethnicFocus: null,
    requiresMultiracial: false,
    partialAccessFrom: ['bumiputera_agenda', 'export_tiger'],
  },
  {
    treeId: 'liberal_open_economy',
    name: 'Liberal Open Economy',
    shortName: 'Liberal',
    description: 'Deregulation, free trade, and private enterprise unlock growth across all communities. Navigate the perpetual tension between market efficiency and redistributive expectations.',
    iconColor: '#b45309',
    economicRange: [60, 100],
    governanceRange: [20, 65],
    ethnicFocus: null,
    requiresMultiracial: true,
    partialAccessFrom: ['export_tiger'],
  },
  {
    treeId: 'socialist_welfare',
    name: 'Socialist Welfare State',
    shortName: 'Socialist',
    description: 'Redistribute wealth, expand public services, and build a safety net that lifts the rural and urban poor. Fiscal sustainability is the perennial challenge in a small open economy.',
    iconColor: '#991b1b',
    economicRange: [0, 40],
    governanceRange: [30, 70],
    ethnicFocus: null,
    requiresMultiracial: false,
    partialAccessFrom: ['federal_pluralism'],
  },
  {
    treeId: 'export_tiger',
    name: 'Export Tiger',
    shortName: 'Tiger',
    description: 'Attract foreign capital, build export zones, and ride commodity cycles to rapid industrialisation. Vulnerability to external shocks is the price of openness.',
    iconColor: '#7e22ce',
    economicRange: [50, 90],
    governanceRange: [40, 80],
    ethnicFocus: null,
    requiresMultiracial: false,
    partialAccessFrom: ['developmental_state', 'liberal_open_economy'],
  },
  {
    treeId: 'federal_pluralism',
    name: 'Federal Pluralism',
    shortName: 'Plural',
    description: 'Devolve power to states, protect minority rights, and build a pluralist economy celebrating diversity. Coordinating across thirteen states with different economic and ethnic profiles tests every institution.',
    iconColor: '#0f766e',
    economicRange: [30, 70],
    governanceRange: [0, 45],
    requiresMultiracial: true,
    partialAccessFrom: ['liberal_open_economy', 'socialist_welfare'],
  },
];

// ─────────────────────────────────────────────────────────────
// TREE 1: BUMIPUTERA AGENDA — 35 MISSIONS, 5 TIERS
// ─────────────────────────────────────────────────────────────
//
// NARRATIVE ARC:
//   Tier 1 — Foundation: Land, Credit, Education, Trust Fund, Identity
//   Tier 2 — Economic Restructuring: NEP, FELDA, Heavy Industry OR Cooperatives,
//             Quota System, Corporate Equity Drive
//   Tier 3 — FORK A: Ethnic Capitalism (Mahathir path)
//             FORK B: Integrationist (Bangsa Malaysia path)
//             Both forks share: Wawasan 2020, Sovereign Wealth
//   Tier 4 — Consolidation: New Economic Model OR Authoritarian Consolidation
//   Tier 5 — Endgame: Reformed Bumiputera Policy OR Institutionalised Patronage
//             (Crisis: Kleptocracy Scandal)
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// MASTER REGISTRY — ALL 210 MISSIONS
// ─────────────────────────────────────────────────────────────

import { BUMIPUTERA_MISSIONS } from '../missionTrees_part1';
import { DEVELOPMENTAL_STATE_MISSIONS } from '../missionTrees_part2';
import { LIBERAL_MISSIONS } from '../missionTrees_part3';
import { SOCIALIST_MISSIONS } from '../missionTrees_part4';
import { EXPORT_TIGER_MISSIONS } from '../missionTrees_part5';
import { FEDERAL_PLURALISM_MISSIONS } from '../missionTrees_part6';

export const ALL_MISSIONS: Mission[] = ([
  ...BUMIPUTERA_MISSIONS,
  ...DEVELOPMENTAL_STATE_MISSIONS,
  ...LIBERAL_MISSIONS,
  ...SOCIALIST_MISSIONS,
  ...EXPORT_TIGER_MISSIONS,
  ...FEDERAL_PLURALISM_MISSIONS,
] as unknown) as Mission[];

export const MISSIONS_BY_TREE: Record<MissionTreeId, Mission[]> = {
  bumiputera_agenda:    BUMIPUTERA_MISSIONS as unknown as Mission[],
  developmental_state:  DEVELOPMENTAL_STATE_MISSIONS as unknown as Mission[],
  liberal_open_economy: LIBERAL_MISSIONS as unknown as Mission[],
  socialist_welfare:    SOCIALIST_MISSIONS as unknown as Mission[],
  export_tiger:         EXPORT_TIGER_MISSIONS as unknown as Mission[],
  federal_pluralism:    FEDERAL_PLURALISM_MISSIONS as unknown as Mission[],
};

// ─────────────────────────────────────────────────────────────
// DEFAULT STATE
// ─────────────────────────────────────────────────────────────

export const DEFAULT_MISSION_TREE_STATE = {
  unlockedTreeIds: [],
  activeMissions: [],
  completedMissions: [],
  failedMissionIds: [],
  lockedOutMissionIds: [],
  crossTreeSynergyUnlocks: [],
  permanentBonuses: {
    gdpBonus: 0, unemploymentBonus: 0, inflationModifier: 0, budgetBonus: 0,
    corruptionReduction: 0, infrastructureBoost: 0, humanCapitalBoost: 0, inequalityReduction: 0,
  },
  unlockedPolicyOptions: {},
  populationGrowthMultipliers: {},
  monthsInPower: 0,
  legacyPoints: 0,
  activeCrisisIds: [],
};

// ─────────────────────────────────────────────────────────────
// TREE UNLOCKING
// ─────────────────────────────────────────────────────────────

/**
 * Computes which mission trees from the master registry are unlocked based on the ruling party's properties.
 * 
 * @param {Ideology} ideology - Used to determine bounds checking against economic/governance ranges.
 * @param {Ethnicity | null} ethnicFocus - The specific racial focus of the party, or null if multiracial.
 * @param {boolean} isMultiracial - Boolean flag indicating wide tent status.
 * @param {number} [legacyPoints=0] - Points accrued for future unlock usage.
 * @returns {MissionTreeId[]} Array of identifiers representing available trees for the reigning government.
 */
export const getUnlockedTrees = (ideology, ethnicFocus, isMultiracial, legacyPoints = 0) => {
  const unlocked = [];
  for (const rule of TREE_ACCESS_RULES) {
    const inEconomicRange = ideology.economic >= rule.economicRange[0] && ideology.economic <= rule.economicRange[1];
    const inGovernanceRange = ideology.governance >= rule.governanceRange[0] && ideology.governance <= rule.governanceRange[1];
    if (!inEconomicRange || !inGovernanceRange) continue;
    if (rule.ethnicFocus !== undefined) {
      if (rule.ethnicFocus !== null && ethnicFocus !== rule.ethnicFocus) continue;
    }
    if (rule.requiresMultiracial && !isMultiracial) continue;
    unlocked.push(rule.treeId);
  }
  return unlocked;
};

// ─────────────────────────────────────────────────────────────
// CRISIS DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * Verifies if any 'crisis' class missions have triggered implicitly based on disastrous economic thresholds.
 * 
 * @param {ComplexEconomicState} econState - Defines numeric vulnerabilities (inflation, deficit, etc).
 * @param {MissionTreeState} missionTreeState - History of completed nodes.
 * @returns {string[]} An array of crisis mission IDs that should be forcibly activated immediately.
 */
export const detectCrisisMissions = (econState, missionTreeState) => {
  const triggered = [];
  const completedIds = new Set(missionTreeState.completedMissions.map(m => m.missionId));
  const activeIds = new Set(missionTreeState.activeMissions.map(m => m.missionId));

  for (const mission of ALL_MISSIONS) {
    if (mission.category !== 'crisis') continue;
    if (completedIds.has(mission.id) || activeIds.has(mission.id)) continue;
    if (missionTreeState.failedMissionIds.includes(mission.id)) continue;
    if (missionTreeState.lockedOutMissionIds.includes(mission.id)) continue;
    const prereqsMet = mission.prerequisiteIds.every(pid => completedIds.has(pid));
    if (!prereqsMet) continue;
    const trigger = mission.requirements.crisisTrigger;
    if (!trigger) continue;
    let shouldTrigger = false;
    if (trigger.unemploymentAbove !== undefined && econState.unemploymentRate > trigger.unemploymentAbove) shouldTrigger = true;
    if (trigger.inflationAbove !== undefined && econState.inflationRate > trigger.inflationAbove) shouldTrigger = true;
    if (trigger.gdpBelow !== undefined && econState.gdpGrowthRate < trigger.gdpBelow) shouldTrigger = true;
    if (trigger.budgetDeficitAbove !== undefined && econState.budgetBalance < -trigger.budgetDeficitAbove) shouldTrigger = true;
    // Special triggers
    if (mission.id === 'bumi_t5_kleptocracy_crisis') shouldTrigger = completedIds.has('bumi_t3_sovereign_wealth') && econState.structural?.corruptionIndex > 60;
    if (mission.id === 'dev_t5_financial_crisis_response') shouldTrigger = completedIds.has('dev_t3_msc') && econState.gdpGrowthRate < -3.0;
    if (mission.id === 'soc_t5_fiscal_crisis') shouldTrigger = completedIds.has('soc_t3_peoples_economy') && econState.budgetBalance < -500;
    if (mission.id === 'tiger_t4_commodity_crash_crisis') shouldTrigger = completedIds.has('tiger_t3_tiger_economy') && econState.external?.commodityPriceIndex < 60;
    if (shouldTrigger) triggered.push(mission.id);
  }
  return triggered;
};

// ─────────────────────────────────────────────────────────────
// REQUIREMENT CHECKING
// ─────────────────────────────────────────────────────────────

/**
 * Validates a single mission node's requirements against current socio-economic variables.
 * 
 * @param {Mission} mission - The mission template being tested.
 * @param {ComplexEconomicState} econState - Provides current indicators to match against thresholds.
 * @param {MissionTreeState} missionTreeState - Cross-references pre-requisite completeness.
 * @param {Bill[]} [passedLaws=[]] - History of active legislation mapping.
 * @returns {{ met: boolean, unmetReasons: string[] }} True if executable; otherwise returns error hints.
 * 
 * @logic
 * Resolves static prerequisites, cross-tree synergies (which dynamically reduce numeric breakpoints), and ensures mutually excessive paths aren't violated.
 */
export const checkMissionRequirements = (mission, econState, missionTreeState, passedLaws = []) => {
  const req = mission.requirements;
  const unmet = [];
  const completedIds = new Set(missionTreeState.completedMissions.map(m => m.missionId));

  if (missionTreeState.lockedOutMissionIds.includes(mission.id))
    return { met: false, unmetReasons: ['This path was closed by an earlier decision.'] };

  for (const prereqId of mission.prerequisiteIds) {
    if (!completedIds.has(prereqId)) {
      const prereq = ALL_MISSIONS.find(m => m.id === prereqId);
      unmet.push(`Requires: ${prereq?.name ?? prereqId}`);
    }
  }

  if (req.prerequisitesAny?.length > 0) {
    const anyMet = req.prerequisitesAny.some(id => completedIds.has(id));
    if (!anyMet) {
      const names = req.prerequisitesAny.map(id => ALL_MISSIONS.find(m => m.id === id)?.name ?? id);
      unmet.push(`Requires at least one of: ${names.join(', ')}`);
    }
  }

  // Synergy reductions
  let reductionFactor = 1.0;
  const appliedSynergies = ALL_MISSIONS.flatMap(m =>
    m.reward.crossTreeSynergies?.filter(s => s.targetMissionId === mission.id && completedIds.has(m.id)) ?? []
  );
  if (appliedSynergies.length > 0) {
    const totalReduction = appliedSynergies.reduce((sum, s) => sum + (s.requirementReduction ?? 0), 0);
    reductionFactor = Math.max(0.5, 1.0 - totalReduction);
  }
  const adj = v => v * reductionFactor;

  if (req.minGdpGrowth !== undefined && econState.gdpGrowthRate < adj(req.minGdpGrowth)) unmet.push(`GDP ≥ ${adj(req.minGdpGrowth).toFixed(1)}% (${econState.gdpGrowthRate.toFixed(1)}%)`);
  if (req.maxUnemployment !== undefined && econState.unemploymentRate > req.maxUnemployment) unmet.push(`Unemployment ≤ ${req.maxUnemployment}% (${econState.unemploymentRate.toFixed(1)}%)`);
  if (req.maxInflation !== undefined && econState.inflationRate > req.maxInflation) unmet.push(`Inflation ≤ ${req.maxInflation}% (${econState.inflationRate.toFixed(1)}%)`);
  if (req.minBudgetBalance !== undefined && econState.budgetBalance < adj(req.minBudgetBalance)) unmet.push(`Budget ≥ ${adj(req.minBudgetBalance).toFixed(0)}M`);
  if (req.minInfrastructure !== undefined && econState.structural?.infrastructureScore < adj(req.minInfrastructure)) unmet.push(`Infrastructure ≥ ${adj(req.minInfrastructure).toFixed(0)}`);
  if (req.minHumanCapital !== undefined && econState.structural?.humanCapitalIndex < adj(req.minHumanCapital)) unmet.push(`Human Capital ≥ ${adj(req.minHumanCapital).toFixed(0)}`);
  if (req.maxCorruption !== undefined && econState.structural?.corruptionIndex > req.maxCorruption) unmet.push(`Corruption ≤ ${req.maxCorruption}`);
  if (req.minApproval !== undefined && econState.publicApproval < adj(req.minApproval)) unmet.push(`Approval ≥ ${adj(req.minApproval).toFixed(0)}%`);
  if (req.minCommodityIndex !== undefined && econState.external?.commodityPriceIndex < req.minCommodityIndex) unmet.push(`Commodity ≥ ${req.minCommodityIndex}`);
  if (req.maxCommodityIndex !== undefined && econState.external?.commodityPriceIndex > req.maxCommodityIndex) unmet.push(`Commodity ≤ ${req.maxCommodityIndex}`);
  if (req.minMonthsInPower !== undefined && missionTreeState.monthsInPower < req.minMonthsInPower) unmet.push(`In power ≥ ${req.minMonthsInPower} months`);
  if (req.minLegacyPoints !== undefined && missionTreeState.legacyPoints < req.minLegacyPoints) unmet.push(`Legacy ≥ ${req.minLegacyPoints}`);

  if (req.requiredPolicy) {
    const policy = econState.activePolicy ?? econState.policy;
    for (const [key, value] of Object.entries(req.requiredPolicy)) {
      if (policy[key] !== value) unmet.push(`Policy: ${key} = "${value}" (now: "${policy[key]}")`);
    }
  }

  if (req.requiredPassedLaws?.length) {
    for (const lawId of req.requiredPassedLaws) {
      if (!passedLaws.some(l => l.id === lawId)) unmet.push(`Requires passed law: ${lawId.replace(/_/g, ' ')}`);
    }
  }

  return { met: unmet.length === 0, unmetReasons: unmet };
};

// ─────────────────────────────────────────────────────────────
// MISSION MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Activates a node when manually clicked by the player or explicitly invoked by the AI.
 * 
 * @param {string} missionId - The target mission identifier.
 * @param {MissionTreeState} state - The current active state matrix.
 * @param {Date} currentDate - Baseline initiation date determining the timeout trajectory.
 * @param {ComplexEconomicState} econState - Validation fallback object.
 * @returns {{ newState: MissionTreeState, error: string | undefined }} Successfully adds the active mission to the queue pool.
 */
export const startMission = (missionId, state, currentDate, econState) => {
  const mission = ALL_MISSIONS.find(m => m.id === missionId);
  if (!mission) return { newState: state, error: 'Mission not found.' };
  if (state.activeMissions.some(m => m.missionId === missionId)) return { newState: state, error: 'Already in progress.' };
  if (state.completedMissions.some(m => m.missionId === missionId)) return { newState: state, error: 'Already completed.' };
  if (state.lockedOutMissionIds.includes(missionId)) return { newState: state, error: 'Path closed by earlier decision.' };
  if (state.activeMissions.length >= 3) return { newState: state, error: 'Already running 3 missions.' };
  const { met, unmetReasons } = checkMissionRequirements(mission, econState, state);
  if (!met) return { newState: state, error: `Requirements not met: ${unmetReasons[0]}` };
  const completionDate = new Date(currentDate);
  completionDate.setMonth(completionDate.getMonth() + mission.durationMonths);
  return {
    newState: {
      ...state,
      activeMissions: [...state.activeMissions, { missionId, treeId: mission.treeId, startDate: new Date(currentDate), completionDate, monthsRemaining: mission.durationMonths }],
    },
  };
};

/**
 * Mutates active missions reducing their duration month by month. Completes missions when duration expires.
 * 
 * @param {MissionTreeState} state - Current missions.
 * @param {ComplexEconomicState} econState - State configuration providing variable references.
 * @param {Date} currentDate - Evaluative step date.
 * @returns {Object} Wrapper containing the newly modified states and any spawned crisis missions.
 */
export const processMissionTick = (state, econState, currentDate) => {
  const completedThisMonth = [];
  const updatedActive = state.activeMissions.map(am => ({ ...am, monthsRemaining: am.monthsRemaining - 1 }));
  const stillActive = [];
  const newlyCompleted = [];
  let newBonuses = { ...state.permanentBonuses };
  let newEconState = { ...econState };
  let newPopMultipliers = { ...state.populationGrowthMultipliers };
  let legacyPoints = state.legacyPoints;
  const newPolicyOptions = { ...state.unlockedPolicyOptions };
  let lockedOutIds = [...state.lockedOutMissionIds];
  let crossTreeSynergies = [...state.crossTreeSynergyUnlocks];

  for (const am of updatedActive) {
    if (am.monthsRemaining <= 0) {
      const mission = ALL_MISSIONS.find(m => m.id === am.missionId);
      if (!mission) { stillActive.push(am); continue; }
      completedThisMonth.push(mission);
      newlyCompleted.push({ missionId: am.missionId, treeId: am.treeId, completionDate: new Date(currentDate) });
      const r = mission.reward;
      if (r.gdpBonus) newBonuses.gdpBonus += r.gdpBonus;
      if (r.unemploymentBonus) newBonuses.unemploymentBonus += r.unemploymentBonus;
      if (r.inflationModifier) newBonuses.inflationModifier += r.inflationModifier;
      if (r.budgetBonus) newBonuses.budgetBonus += r.budgetBonus;
      if (r.legacyPoints) legacyPoints += r.legacyPoints;
      if (r.structuralBonus) {
        const sb = r.structuralBonus;
        if (sb.corruptionReduction) newBonuses.corruptionReduction += sb.corruptionReduction;
        if (sb.infrastructureBoost) newBonuses.infrastructureBoost += sb.infrastructureBoost;
        if (sb.humanCapitalBoost) newBonuses.humanCapitalBoost += sb.humanCapitalBoost;
        if (sb.inequalityReduction) newBonuses.inequalityReduction += sb.inequalityReduction;
        newEconState = {
          ...newEconState,
          structural: {
            ...newEconState.structural,
            corruptionIndex: Math.max(0, Math.min(100, newEconState.structural.corruptionIndex - (sb.corruptionReduction || 0))),
            infrastructureScore: Math.max(0, Math.min(100, newEconState.structural.infrastructureScore + (sb.infrastructureBoost || 0))),
            humanCapitalIndex: Math.max(0, Math.min(100, newEconState.structural.humanCapitalIndex + (sb.humanCapitalBoost || 0))),
            giniCoefficient: Math.max(0.2, Math.min(0.75, newEconState.structural.giniCoefficient + (sb.inequalityReduction || 0))),
          },
        };
      }
      if (r.approvalBonus) newEconState = { ...newEconState, publicApproval: Math.min(100, newEconState.publicApproval + r.approvalBonus) };
      if (r.populationGrowthBonuses) {
        for (const pgb of r.populationGrowthBonuses) {
          newPopMultipliers[pgb.ethnicity] = (newPopMultipliers[pgb.ethnicity] || 0) + pgb.bonus;
        }
      }
      if (r.policyUnlock) {
        for (const [field, options] of Object.entries(r.policyUnlock.unlockedOptions)) {
          if (!newPolicyOptions[field]) newPolicyOptions[field] = new Set();
          if (Array.isArray(options)) {
            options.forEach(opt => newPolicyOptions[field].add(opt));
          }
        }
      }
      if (r.locksOutMissions) lockedOutIds = [...new Set([...lockedOutIds, ...r.locksOutMissions])];
      if (mission.mutuallyExclusiveWith) lockedOutIds = [...new Set([...lockedOutIds, ...mission.mutuallyExclusiveWith])];
      if (r.crossTreeSynergies) {
        for (const syn of r.crossTreeSynergies) {
          if (!crossTreeSynergies.includes(syn.targetMissionId)) crossTreeSynergies.push(syn.targetMissionId);
        }
      }
    } else {
      stillActive.push(am);
    }
  }

  const existingCrises = new Set(state.activeCrisisIds);
  const newCrisisIds = detectCrisisMissions(newEconState, {
    ...state,
    completedMissions: [...state.completedMissions, ...newlyCompleted],
    lockedOutMissionIds: lockedOutIds,
  }).filter(id => !existingCrises.has(id));

  return {
    newMissionState: {
      ...state,
      activeMissions: stillActive,
      completedMissions: [...state.completedMissions, ...newlyCompleted],
      lockedOutMissionIds: lockedOutIds,
      crossTreeSynergyUnlocks: crossTreeSynergies,
      permanentBonuses: newBonuses,
      unlockedPolicyOptions: newPolicyOptions,
      populationGrowthMultipliers: newPopMultipliers,
      monthsInPower: state.monthsInPower + 1,
      legacyPoints,
      activeCrisisIds: [...state.activeCrisisIds, ...newCrisisIds],
    },
    newEconState,
    completedThisMonth,
    failedThisMonth: [],
    newCrisisIds,
  };
};

export const applyMissionBonuses = (econState, bonuses) => ({
  ...econState,
  gdpGrowthRate: econState.gdpGrowthRate + bonuses.gdpBonus / 12,
  unemploymentRate: econState.unemploymentRate - bonuses.unemploymentBonus / 12,
  inflationRate: econState.inflationRate + bonuses.inflationModifier / 12,
  budgetBalance: econState.budgetBalance + bonuses.budgetBonus / 12,
});

export const getPopulationGrowthMultiplier = (ethnicity, multipliers) =>
  (multipliers[ethnicity] || 0) + (multipliers['all'] || 0);

export const getMissionStatus = (missionId, state) => {
  if (state.completedMissions.some(m => m.missionId === missionId)) return 'completed';
  if (state.activeMissions.some(m => m.missionId === missionId)) return 'in_progress';
  if (state.failedMissionIds.includes(missionId)) return 'failed';
  if (state.lockedOutMissionIds.includes(missionId)) return 'locked_by_choice';
  if (state.activeCrisisIds.includes(missionId)) return 'crisis';
  const mission = ALL_MISSIONS.find(m => m.id === missionId);
  if (!mission) return 'locked';
  const completedIds = new Set(state.completedMissions.map(m => m.missionId));
  if (!mission.prerequisiteIds.every(pid => completedIds.has(pid))) return 'locked';
  return 'available';
};

export const getTreeProgress = (treeId, state) => {
  const missions = MISSIONS_BY_TREE[treeId];
  const completed = missions.filter(m => state.completedMissions.some(cm => cm.missionId === m.id)).length;
  const inProgress = missions.filter(m => state.activeMissions.some(am => am.missionId === m.id)).length;
  const lockedByChoice = missions.filter(m => state.lockedOutMissionIds.includes(m.id)).length;
  const available = missions.filter(m => getMissionStatus(m.id, state) === 'available').length;
  const locked = missions.length - completed - inProgress - lockedByChoice - available;
  return { total: missions.length, completed, inProgress, available, locked, lockedByChoice, percentage: Math.round((completed / missions.length) * 100) };
};

export const getMutualExclusionPreview = (missionId) => {
  const mission = ALL_MISSIONS.find(m => m.id === missionId);
  if (!mission?.mutuallyExclusiveWith) return [];
  return mission.mutuallyExclusiveWith.map(id => ALL_MISSIONS.find(m => m.id === id)).filter(Boolean);
};

export const getCrossTreeSynergyPreview = (missionId) => {
  const mission = ALL_MISSIONS.find(m => m.id === missionId);
  return mission?.reward.crossTreeSynergies ?? [];
};

export const getActiveMissionDetails = (activeMission: ActiveMission) => {
  const mission = ALL_MISSIONS.find((m) => m.id === activeMission.missionId);
  if (!mission) return { mission: undefined, progressPercent: 0 };
  const totalMonths = mission.durationMonths;
  const elapsedMonths = totalMonths - activeMission.monthsRemaining;
  const progressPercent = totalMonths > 0 ? (elapsedMonths / totalMonths) * 100 : 100;
  return { mission, progressPercent };
};

export const TREE_COLORS = {
  bumiputera_agenda: '#1d6b2e',
  developmental_state: '#1e3a8a',
  liberal_open_economy: '#b45309',
  socialist_welfare: '#991b1b',
  export_tiger: '#7e22ce',
  federal_pluralism: '#0f766e',
};

export const TREE_NAMES = {
  bumiputera_agenda: 'Bumiputera Agenda',
  developmental_state: 'Developmental State',
  liberal_open_economy: 'Liberal Open Economy',
  socialist_welfare: 'Socialist Welfare',
  export_tiger: 'Export Tiger',
  federal_pluralism: 'Federal Pluralism',
};

export const MISSION_CATEGORY_LABELS = {
  economic: 'Economic', social: 'Social', institutional: 'Institutional',
  external: 'External', military: 'Military', crisis: '⚠ Crisis',
  legacy: '★ Legacy', diplomatic: 'Diplomatic',
};

/**
 * Re-evaluates which missions the AI should autonomously embark upon.
 * 
 * @param {MissionTreeState} state - Currently processing trees.
 * @param {ComplexEconomicState} econState - Live economic inputs to avoid invalid branches.
 * @param {Date} currentDate - Simulation day.
 * @param {Party} rulingParty - Governs which tree variants are traversable.
 * @param {Bill[]} passedLaws - Active legal parameters limiting options.
 * @returns {MissionTreeState} Evolved state with potentially newly-in-progress AI missions.
 */
export const aiManageMissions = (
  state: MissionTreeState,
  econState: ComplexEconomicState,
  currentDate: Date,
  rulingParty: Party,
  passedLaws: Bill[]
): MissionTreeState => {
  let newState = { ...state };
  
  const MAX_CONCURRENT_MISSIONS = 3;
  if (newState.activeMissions.length >= MAX_CONCURRENT_MISSIONS) {
    return newState;
  }

  const isMultiracial = !rulingParty.ethnicityFocus;
  const unlockedTreeIds = getUnlockedTrees(
    rulingParty.ideology,
    rulingParty.ethnicityFocus ?? null,
    isMultiracial,
    newState.legacyPoints || 0
  );

  const availableMissions = ALL_MISSIONS.filter(m => 
    unlockedTreeIds.includes(m.treeId) &&
    getMissionStatus(m.id, newState) === 'available' &&
    checkMissionRequirements(m, econState, newState, passedLaws).met
  ).sort((a, b) => {
    // Crisis first
    if (a.category === 'crisis' && b.category !== 'crisis') return -1;
    if (b.category === 'crisis' && a.category !== 'crisis') return 1;
    return a.tier - b.tier; // prefer lower tier missions
  });

  for (const mission of availableMissions) {
    if (newState.activeMissions.length >= MAX_CONCURRENT_MISSIONS) break;
    const result = startMission(mission.id, newState, currentDate, econState);
    if (!result.error) {
      newState = result.newState as MissionTreeState;
    }
  }

  return newState;
};
