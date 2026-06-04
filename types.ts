
/**
 * @fileoverview Main type definitions for the Political World Game.
 * Contains interfaces representing all major conceptual entities.
 */
import { LatLngExpression } from 'leaflet';

export type Metric = 'vote_percentage' | 'margin_gain';

export interface ElectionMapConfig {
  active: boolean;
  results?: ElectionResults;
  detailedResults?: Map<string, Map<string, number>>;
  previousDetailedResults?: Map<string, Map<string, number>> | null;
  selectedPartyId?: string;
  metric?: Metric;
  selectedElectionIndex?: number;
}

export interface City {
  id: number;
  name: string;
  position: LatLngExpression;
  description: string;
}

// GeoJSON Interfaces for map data
export interface GeoJsonGeometry {
  type: string;
  coordinates?: any; 
}

export interface GeoJsonProperties {
  [key: string]: any;
  isCombined?: boolean; // Flag to identify combined features
  originalFeatures?: GeoJsonFeature[]; // Store original features for splitting
}

export interface GeoJsonFeature {
  type: "Feature";
  properties: GeoJsonProperties;
  geometry: GeoJsonGeometry;
}

export type Ethnicity = 
  'Malay' | 'Sabahan Malay' | 'Sarawakian Malay' | 'Chinese' | 'Indian' | 'Others' | 'Orang Asli' |
  'Bumiputera Sabah (Muslim)' | 'Bumiputera Sabah (Non-Muslim)' |
  'Bumiputera Sarawak (Muslim)' | 'Bumiputera Sarawak (Non-Muslim)' |
  'Sabahan Chinese' | 'Sarawakian Chinese' | 'Siamese'| EthnicitySin | 'Multi-Racial' | 'Multi-Racial (Sabah)' | 'Multi-Racial (Sarawak)' | 'Multi-Racial (Singapore)';


export type EthnicitySin  = 'Singaporean Malay'|'Singaporean Chinese'|'Singaporean Indian';
export type AreaPreference = 'Urban' | 'Rural' | 'Both';

export interface Ideology {
  economic: number; // 0 = Planned, 100 = Free Market
  governance: number; // 0 = Decentralized, 100 = Centralized
}

export interface Affiliation {
  id: string;
  name: string;
  ethnicity: Ethnicity;
  area: AreaPreference;
  baseIdeology?: Ideology; // Static baseline for generation
  ideology?: Ideology; // Dynamic average of current members
}

export interface ConstituencyPartyBranch {
  seatCode: string; // The UNIQUECODE of the constituency
  state: string;    // The state the constituency is in
  leaderId?: string; // The character ID of the branch leader
  lastElectionDate?: Date; // Last time the branch leader was elected
}

export interface StatePartyBranch {
  state: string;
  leaderId?: string; // State Leader
  lastElectionDate?: Date; // Last time the state leader was elected
  executiveIds: string[];
}

/**
 * Represents a political party operating within the nation.
 * Handles the financial ledger, hierarchical leadership, and branch deployments.
 */
export interface PartyModifier {
  type: 'prevent_alliance_leave' | 'other_trait';
  expiresAt: Date;
}

export interface Party {
  id: string;
  name: string;
  abbreviation?: string;
  color: string;
  funds: number; // NEW: Party funds for development/campaigning
  affiliationIds: string[];
  // ... (keep rest of fields: leaderId, deputyLeaderId, etc.)
  leaderId?: string; 
  deputyLeaderId?: string;
  stateBranches: StatePartyBranch[];
  constituencyBranches?: Map<string, ConstituencyPartyBranch>;
  contestedSeats: Map<string, { allocatedAffiliationId: string | null; candidateId: string | null; }>;
  leaderHistory: { leaderId: string; name: string; startDate: Date; endDate?: Date }[];
  ethnicityFocus?: Ethnicity;
  relations: Map<string, number>; 
  unity: number; 
  ideology: Ideology;
  modifiers?: PartyModifier[];
  campaignInvestments?: Map<string, number>; // Maps seat unique code to invested amount
}

export type AllianceType = 'Alliance' | 'Pact';

export interface PartyGraphLink {
  source: string;
  target: string;
  type: 'merges_into' | 'splits_from' | 'renamed_to' | 'absorbed_by' | 'faction_migrates';
  date: Date;
}

export interface PoliticalAlliance {
  id: string;
  name: string;
  memberPartyIds: string[];
  type: AllianceType;
  leaderPartyId: string;
  lastSeatDistributionDate?: Date;
  stateLeaders?: Map<string, { leaderId: string, lastElectionDate: Date }>;
  cohesion: number; // 0-100 indicating stability of the alliance
  ideology: Ideology; // Overall average ideology
  formedDate?: Date; // When it was created
}

export interface CharacterHistoryEntry {
  date: Date;
  event: string;
}

/**
 * Represents an individual political operator, including the player.
 * Contains vital stats such as charisma, influence, and personal ideology tracking.
 */
export interface Character {
  id: string;
  name: string;
  currentSeatCode: string;
  affiliationId: string;
  ethnicity: Ethnicity;
  state: string; // Character's state of origin
  isPlayer?: boolean;
  charisma: number;
  influence: number;
  recognition: number;
  dateOfBirth: Date;
  isAlive: boolean;
  isAffiliationLeader?: boolean;
  isMP?: boolean;
  history: CharacterHistoryEntry[];
  ideology: Ideology;
  satisfaction?: number; // 0-100, satisfaction with party leadership
}

export interface Demographics {
  uniqueCode: string;
  state: string;
  parliamentaryConstituencyCode: string;
  parliamentaryConstituencyName: string;
  totalElectors: number;
  malayPercent: number;
  chinesePercent: number;
  indiansPercent: number;
  bumiputeraSabahMuslimPercent: number;
  bumiputeraSabahNonMuslimPercent: number;
  bumiputeraSarawakMuslimPercent: number;
  bumiputeraSarawakNonMuslimPercent: number;
  orangAsliPercent: number;
  othersPercent: number;
  worldPopDensity?: number;
  urbanRuralClassification20182018?: string;
  medianIncome?: number;
  youngVotersPercent?: number;
  baselineVoters?: {
    totalElectors: number;
    malayPercent: number;
    chinesePercent: number;
    indiansPercent: number;
    bumiputeraSabahMuslimPercent: number;
    bumiputeraSabahNonMuslimPercent: number;
    bumiputeraSarawakMuslimPercent: number;
    bumiputeraSarawakNonMuslimPercent: number;
    orangAsliPercent: number;
    othersPercent: number;
  };
  redelineationHistory?: Array<{
    year: number;
    strategy: 'CRACKING' | 'PACKING' | 'APPORTIONMENT';
    votersBefore: number;
    votersAfter: number;
    ethnicShift: string;
    fromCode?: string;
    toCode?: string;
    description: string;
    geometrySnapshot?: {
      sharedVertexCount: number;
      shiftMagnitudeDegrees: number;
      direction: { x: number; y: number };
    };
  }>;
  baselineGeometry?: GeoJsonGeometry;
  currentGeometry?: GeoJsonGeometry;
  [key: string]: any;
}

export type PlaySpeedValue = 2000 | 1000 | 500 | 250 | 125 | 50 | 25 | 5;
export type Speed = PlaySpeedValue | null;

export type GameState = 
  'start' | 
  'party-selection' | 
  'character-selection' | 
  'position-selection' | 
  'game' | 
  'election-results' | 
  'government-formation' |
  'party-election-voting' | 
  'party-election-results' |
  'affiliation-candidate-selection' |
  'parliament' |
  'speaker-election-voting' | 
  'speaker-election-results' |
  'bill-selection' |
  'bill-proposal' |
  'bill-results' |
  'secession-join-party' |
  'secession-new-party' |
  'alliance-join'|
  'party-merger'|
  'party-merger-result' |
  'alliance-creation' |
  'alliance-management' |
  'election-history'|
  'party-management' |
  'vote-of-confidence' |
  'event-modal'|
  'by-election' |
  'pas-invitation' |
  'party-graph';

export type ElectionResults = Map<string, string>; // seatCode -> partyId

export interface SeatWinner {
  partyId: string;
  candidateId: string;
  candidateName: string;
}

export interface SeatCandidateInfo {
    id: string;
    name: string;
}

export interface ScenarioConfig {
  id: string;
  title: string;
  date: string; // ISO date string e.g., '1947-01-01'
  description: string;
  parties: Party[];
  alliances: PoliticalAlliance[];
  initialEconomicState?: any; // To be imported or passed if needed
}

export interface HistoricalParty {
  id: string;
  name: string;
  color: string;
  funds?: number;
  unity?: number;
  ideology?: Ideology;
  leaderId?: string;
  affiliationIds?: string[];
}

export interface HistoricalAlliance {
  id: string;
  name: string;
  memberPartyIds: string[];
  type: AllianceType;
  leaderPartyId: string;
}

export interface ElectionHistoryEntry {
  date: Date;
  results: ElectionResults;
  detailedResults: Map<string, Map<string, number>>;
  seatWinners: Map<string, SeatWinner>;
  seatCandidates: Map<string, Map<string, SeatCandidateInfo>>; // seatCode -> partyId -> CandidateInfo
  totalElectors: number;
  totalVotes: number;
  totalSeats: number;
  alliances: HistoricalAlliance[];
  parties: HistoricalParty[]; // Snapshot of parties at the time of election
}

export type ActionType = 
  'promoteParty' | 
  'addressLocal' | 
  'undermineRival' |
  'organizeStateRally' |
  'strengthenLocalBranch' |
  'secedeJoinParty' |
  'secedeNewParty' |
  'negotiatePartyMerger' |
  'inviteToParty' |
  'createAlliance' |
  'joinAlliance' |
  'manageAlliance' |
  'securityCrackdown';

export type PartyElectionVoteTally = Map<string, number>; // candidateId -> weightedVotes
export type SpeakerVoteTally = Map<string, number>; // candidateId -> votes
export type SpeakerVoteBreakdown = Map<string, string>; // partyId -> candidateId

export interface BillEffect {
    type: 'party_influence' | 'affiliation_recognition';
    targetId: string; // partyId or affiliationId
    value: number; // e.g., +5, -10
}

export interface Bill {
    id: string;
    title: string;
    description: string;
    proposingPartyId: string;
    effects: BillEffect[];
    tags: ('economic' | 'social' | 'religious' | 'nationalist' | 'constitutional' | 'progressive')[];
    isConstitutional?: boolean; // Requires 2/3 majority
}

export type VoteDirection = 'Aye' | 'Nay' | 'Abstain';
export type BillVoteBreakdown = Map<string, VoteDirection>; // partyId -> VoteDirection
export type BillVoteTally = { Aye: number; Nay: number; Abstain: number };

export type CharacterRole = 
  'Chief Minister' | 
  'Minister' | 
  'National Leader' | 
  'National Deputy Leader' | 
  'State Leader' | 
  'State Executive' | 
  'Constituency Branch Leader' |
  'Member' |
  'MP' |
  'State Assemblyperson'; // ADUN

export interface Minister {
    ministerId: string;
    portfolio: string;
}

export interface StateCMHistoryEntry {
    cmId: string;
    startDate: Date;
    endDate?: Date;
    partyId?: string;
}

export interface StateGovernment {
    state: string;
    chiefMinisterId: string; // Menteri Besar / Ketua Menteri
    rulingCoalitionIds: string[];
    executiveCouncil: Minister[]; // EXCO members
    formedDate: Date;
    seatDistribution: Map<string, number>; // PartyID -> Count of state seats won
    totalSeats: number;
    cmHistory: StateCMHistoryEntry[];
}

export interface PMHistoryEntry {
    pmId: string;
    startDate: Date;
    endDate?: Date;
    partyId?: string;
    cabinet?: Minister[];
}

export interface Government {
    chiefMinisterId: string;
    rulingCoalitionIds: string[];
    cabinet: Minister[];
    formedDate: Date;
    pmHistory: PMHistoryEntry[];
}

export interface VoteOfConfidenceResult {
    passed: boolean;
    votesFor: number;
    votesAgainst: number;
    breakdown: Map<string, 'For' | 'Against' | 'Abstain'>; // charId -> vote
}

/**
 * Represents a discrete, often randomized narrative event in the game world.
 * Encapsulates the flavour text alongside executable target effects.
 */
export interface GameEvent {
    id: string;
    title: string;
    description: string;
    date: Date;
    type: 'racial_tension' | 'economic' | 'scandal' | 'political' | 'crackdown_backlash';
    effects: string[];
    // Data required for application
    affectedSeatCodes?: string[];
    affectedPartyIds?: string[];
    affectedAffiliationIds?: string[];
    magnitude?: number;
}

export interface LogEntry {
    id: string;
    date: Date;
    title: string;
    description: string;
    type: 'event' | 'politics' | 'election' | 'personal';
}

export interface SeatStronghold {
    affiliationId: string;
    terms: number;
}

export type StrongholdMap = Map<string, SeatStronghold>;

export interface PartyManagementScreenProps {
    party: Party;
    allParties: Party[]; // Needed to manage alliance members
    allSeatFeatures: GeoJsonFeature[];
    affiliationsMap: Map<string, Affiliation>;
    featuresMap: Map<string, GeoJsonFeature>;
    demographicsMap: Map<string, Demographics>;
    characters: Character[];
    currentDate: Date;
    onSave: (updatedParties: Party[]) => void; // Changed to accept array
    onClose: () => void;
    alliances: PoliticalAlliance[];
    strongholdMap: StrongholdMap;
}

export interface CharacterInfoPanelProps {
  character: Character;
  affiliation: Affiliation | undefined;
  party: Party | undefined;
  seat: GeoJsonFeature | undefined;
  onClose: () => void;
  currentDate: Date;
  roleInfo: { role: CharacterRole, details: string };
  isPlayerMoving: boolean;
  onInitiateMove: () => void;
  onCancelMove: () => void;
  onOpenPartyManagement: () => void;
  onOpenActions: () => void;
  onOpenAffiliationManagement: () => void;
  isPartyManagementDisabled?: boolean;
  partyManagementTooltip?: string;
  isAffiliationManagementDisabled?: boolean;
  affiliationManagementTooltip?: string;
  government?: Government | null;
}

export interface CharacterActionScreenProps {
    player: Character;
    onClose: () => void;
    onPerformAction: (action: ActionType, payload?: any) => void;
    characters: Character[];
    partiesMap: Map<string, Party>;
    affiliationToPartyMap: Map<string, string>;
    roleInfo: { role: CharacterRole, details: string };
    isAffiliationLeader: boolean;
    daysUntilElection: number;
    alliances: PoliticalAlliance[];
    government: Government | null;
}

export interface PartyElectionScreenProps {
  party: Party;
  candidates: Character[];
  affiliationsMap: Map<string, Affiliation>;
  onVote: (candidateId?: string) => void;
  isPlayerEligibleToVote: boolean;
}

export interface AllianceCreationScreenProps {
    playerParty: Party;
    parties: Party[];
    alliances: PoliticalAlliance[];
    onConfirm: (name: string, invitedPartyIds: string[], type: AllianceType) => void;
    onCancel: () => void;
}

export interface AllianceJoinScreenProps {
    playerParty: Party;
    parties: Party[];
    alliances: PoliticalAlliance[];
    onConfirm: (allianceId: string) => void;
    onCancel: () => void;
}

export interface AllianceManagementScreenProps {
    playerParty: Party;
    alliance: PoliticalAlliance;
    parties: Party[];
    alliances: PoliticalAlliance[];
    onInviteParties: (partyIds: string[]) => void;
    onKickParty: (partyId: string) => void;
    onLeaveAlliance: () => void;
    onDissolveAlliance: () => void;
    onClose: () => void;
}

export type UnificationMode = 'merge' | 'absorb';

export interface PartyMergerScreenProps {
  playerParty: Party;
  parties: Party[];
  affiliations: Affiliation[];
  characters: Character[];
  onPropose: (targets: { parties: Party[], affiliations: Affiliation[] }, newName: string) => void;
  onCancel: () => void;
  mode: UnificationMode;
}

export interface GovernmentFormationScreenProps {
    playerParty: Party;
    parties: Party[];
    electionResults: ElectionResults;
    totalSeats: number;
    alliances: PoliticalAlliance[];
    onConfirm: (coalitionIds: string[]) => void;
    onAuto: () => void;
}

export type ElectionSystem = 'FPTP' | 'PR';

export interface BillSelectionScreenProps {
    onSelect: (billTemplate: Omit<Bill, 'proposingPartyId'>) => void;
    onCancel: () => void;
}

export interface SpeakerElectionScreenProps {
  candidates: Character[];
  onVote: (candidateId: string) => void;
  partiesMap: Map<string, Party>;
  electionResults: ElectionResults;
  playerPartyId: string;
  isSpectator?: boolean;
}

export type TaxRate = 'low' | 'medium' | 'high';
export type SpendingLevel = 'austerity' | 'balanced' | 'expansionary';
export type PrioritySector = 'agriculture' | 'industry' | 'services' | 'balanced';
export type WelfareLevel = 'minimal' | 'moderate' | 'generous';
export type EconomicEventType =
  | 'recession' | 'boom' | 'drought' | 'industrial_surge'
  | 'trade_deal' | 'financial_crisis' | 'commodity_spike'
  | 'foreign_investment' | 'inflation_shock' | 'unemployment_wave'
  | 'debt_crisis';

export interface EconomicPolicy {
  taxRate: TaxRate;
  spendingLevel: SpendingLevel;
  prioritySector: PrioritySector;
  welfareLevel: WelfareLevel;
  openTrade: boolean;
}

export interface EconomicModifier {
  id: string;
  name: string;
  description: string;
  gdpEffect: number;
  unemploymentEffect: number;
  inflationEffect: number;
  approvalEffect: number;
  durationMonths: number;
  remainingMonths: number;
}

export interface EconomicSnapshot {
  date: Date;
  gdpGrowthRate: number;
  unemploymentRate: number;
  inflationRate: number;
  publicApproval: number;
  budgetBalance: number;
  nationalDebt: number;
}

/**
 * Represents the fundamental economic environment and indicators.
 * Extended into `ComplexEconomicState` directly by the Economics sub-system.
 */
export interface EconomicState {
  gdpGrowthRate: number;
  unemploymentRate: number;
  inflationRate: number;
  nationalDebt: number;
  budgetBalance: number;
  publicApproval: number;
  policy: EconomicPolicy;
  activeModifiers: EconomicModifier[];
  history: EconomicSnapshot[];
}

export const DEFAULT_ECONOMIC_STATE: EconomicState = {
  gdpGrowthRate: 3.5,
  unemploymentRate: 12.0,
  inflationRate: 4.0,
  nationalDebt: 800,
  budgetBalance: -50,
  publicApproval: 50,
  policy: {
    taxRate: 'medium',
    spendingLevel: 'balanced',
    prioritySector: 'agriculture',
    welfareLevel: 'minimal',
    openTrade: true,
  },
  activeModifiers: [],
  history: [],

}
  // ──────────────────────────────────────────────
// EXTENDED TYPES  (add these to your types.ts)
// ──────────────────────────────────────────────

export interface SectorState {
  agriculture: number;   // % of GDP contribution (0–100)
  industry:    number;
  services:    number;
  output:      { agriculture: number; industry: number; services: number }; // growth rates
}

export interface ExternalFactors {
  globalGrowthRate:    number;  // world GDP growth — affects exports
  commodityPriceIndex: number;  // 100 = baseline; drives tin/rubber revenue
  foreignReserves:     number;  // months of import cover
  exchangeRatePressure: number; // -100 (massive depreciation) to +100 (strong currency)
}

export interface StructuralIndicators {
  corruptionIndex:      number; // 0 (clean) to 100 (rampant)
  infrastructureScore:  number; // 0–100; degrades slowly, needs investment
  humanCapitalIndex:    number; // 0–100; grows with education spending
  giniCoefficient:      number; // 0.20–0.80; income inequality
  /** @property {number} nairu Natural rate of unemployment (starting ~9%), responds to human capital and hysteresis. */
  nairu:                number;
  /** @property {number} urbanizationRate Tracks Lewis model transition, starting ~15%. */
  urbanizationRate:     number;
  /** @property {number} deindustrializationRisk Risks accumulated from Dutch Disease during commodity booms. */
  deindustrializationRisk: number;
}

export interface EconomicMomentum {
  gdpMomentum:        number; // rolling 3-month avg delta
  unemploymentTrend:  number; // positive = worsening
  inflationExpect:    number; // inflation expectations (sticky)
  businessConfidence: number; // 0–100
  consumerConfidence: number; // 0–100
}

export interface PolicyQueueEntry {
  policy:       EconomicPolicy;
  enactedDate:  Date;
  effectiveDate: Date; // when it actually kicks in
}

export interface ComplexEconomicState extends EconomicState {
  sectors:       SectorState;
  external:      ExternalFactors;
  structural:    StructuralIndicators;
  momentum:      EconomicMomentum;
  policyQueue:   PolicyQueueEntry[];   // pending policy changes
  activePolicy:  EconomicPolicy;       // currently in effect (may lag behind policy)
  electionCycleYear: number;           // track political business cycle
  crisisDepth:   number;               // 0 = none, escalates during multi-event stacks
  gdpSize?:      number;
}

export const DEFAULT_COMPLEX_ECONOMIC_STATE: ComplexEconomicState = {
  // Base EconomicState fields
  gdpGrowthRate:    3.5,
  unemploymentRate: 9.0,
  inflationRate:    3.0,
  budgetBalance:    -150,
  nationalDebt:     1200,
  publicApproval:   52,
  policy: {
    taxRate:        'medium',
    spendingLevel:  'balanced',
    prioritySector: 'agriculture',
    welfareLevel:   'minimal',
    openTrade:      true,
  },
  activeModifiers: [],
  history: [],

  // Extended fields
  sectors: {
    agriculture: 40,
    industry:    25,
    services:    35,
    output: { agriculture: 2.0, industry: 3.5, services: 4.0 },
  },
  external: {
    globalGrowthRate:     3.0,
    commodityPriceIndex:  100,
    foreignReserves:      4.5,  // months of import cover
    exchangeRatePressure: 0,
  },
  structural: {
    corruptionIndex:     35,
    infrastructureScore: 40,
    humanCapitalIndex:   30,
    giniCoefficient:     0.42,
    nairu:               9.0,
    urbanizationRate:    15.0,
    deindustrializationRisk: 0,
  },
  momentum: {
    gdpMomentum:        0,
    unemploymentTrend:  0,
    inflationExpect:    3.5,
    businessConfidence: 55,
    consumerConfidence: 50,
  },
  policyQueue:   [],
  activePolicy: {
    taxRate:        'medium',
    spendingLevel:  'balanced',
    prioritySector: 'agriculture',
    welfareLevel:   'minimal',
    openTrade:      true,
  },
  electionCycleYear: 0,
  crisisDepth:       0,
};