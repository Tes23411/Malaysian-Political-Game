import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { 
  Character, Party, GameState, Speed, GeoJsonFeature, Demographics, 
  Affiliation, ElectionResults, ElectionHistoryEntry, SeatWinner, 
  PlaySpeedValue, ActionType, CharacterRole, Bill, BillVoteTally, 
  BillVoteBreakdown, VoteDirection, PartyElectionVoteTally, Ethnicity,
  SpeakerVoteTally, SpeakerVoteBreakdown, PartyManagementScreenProps,
  Government, VoteOfConfidenceResult, PoliticalAlliance, AllianceType, SeatCandidateInfo,
  UnificationMode, Ideology, GameEvent, ElectionSystem, LogEntry, StrongholdMap, StateGovernment, ElectionMapConfig, SeatStronghold, PartyGraphLink
} from './types';
import { AFFILIATIONS, SCHEDULED_PARTY_FORMATIONS, type ScheduledPartyFormation } from './affiliations';
import { processBillVote } from './utils/billActions';
import { processAllianceInvite, processAllianceKick, processAllianceLeave, processAllianceDissolve } from './utils/gameActions';

const EconomicPanel = React.lazy(() => import('./components/EconomicPanel'));
const ElectionHistoryScreen = React.lazy(() => import('./screens/ElectionHistoryScreen'));
const PartyNetworkGraphScreen = React.lazy(() => import('./components/PartyNetworkGraphScreen').then(module => ({ default: module.PartyNetworkGraphScreen })));
import { malaysiaSeatsData } from './data/kelantan';
import { loadDemographicsData } from './data/demographics';
import { initializeNeighbors, aiGerrymanderState, malapportionmentScore, RedelineationAction, computePolygonAreaDegrees } from './utils/redelineation';
import { buildWorldPopDensityMap, loadPopulationRaster, sampleConstituencyPopulation } from './utils/populationRaster';
import { RedelineationModal } from './components/RedelineationModal';
import {
  runGovernmentAI, runOppositionAI,
  GovernmentAIResult, OppositionAIResult,
  OppositionNarrative, determineAIAction
} from './utils/ai';

export const getFeaturesForDate = (date: Date): GeoJsonFeature[] => {
  const isPostMalaysia = date >= new Date('1963-09-16');
  if (isPostMalaysia) {
    return malaysiaSeatsData;
  } else {
    return malaysiaSeatsData.filter(f => {
      const negeri = (f.properties.NEGERI || f.properties.state || '').toUpperCase();
      return negeri !== 'SABAH' && negeri !== 'SARAWAK' && negeri !== 'W.P. LABUAN';
    });
  }
};

// Monthly AI results — stored so per-character tick can read them
// (Moved inside App component)

// Derived sets used by per-character movement (rebuilt when monthly results change)
// (Moved inside App component)

// All opposition targets merged across parties
// (Moved inside App component)

// Narrative keyed by partyId (for per-character statement amplification)
// (Moved inside App component)
import { calculateEffectiveInfluence } from './utils/influence';
import { 
  conductPartyLeadershipElection, 
  electStateLeadersAndExecutives, 
  aiFullElectionStrategy, 
  determineSpeakerCandidates,
  conductSpeakerVote,
  handleAffiliationSecession,
  handlePartyMerger,
  handlePartyAbsorption,
  attemptAllianceFormation,
  updateAffiliationLeaders,
  aiDecideBillVote,
  formGovernment,
  conductVoteOfConfidence,
  initializePartyRelations,
  distributeAllianceSeats,
  updateAffiliationIdeologies,
  updatePartyIdeologies,
  getPartySeatCounts,
  performSecurityCrackdown,
  formBigTentCoalition,
  consolidateAllianceCohesion,
  attemptAllianceMerger,
  handleCharacterIdeologicalDrift,
  cleanupPoliticalVacancies,
  cleanupGovernmentVacancies,
  updateAllianceSeatDistributions,
  processAllianceStateLeaders,
} from './utils/politics';
import { processInternalPolitics } from './utils/partyPolitics';
import { 
    simulateStateElectionResults, 
    formStateGovernment, 
    getUniqueStates ,
    buildStateElectionSnapshot,
    getStateTotalDunSeats,
    type StateElectionHistoryEntry
} from './utils/statePolitics';
import { generateBill } from './utils/legislation';
import { generateCharacterName, generatePartyName, generateAllianceName } from './utils/naming';
import { COLOR_PALETTE, SEAT_CONTEST_COST } from './constants';
import { checkForGameEvent, applyEventEffects } from './utils/events';
import { shouldCharacterDie, createSuccessor } from './utils/simulation';

//Musics
import { useProcedualMusic, MusicMood } from './hooks/useProcedualMusic';
import { MusicControls } from './components/MusicControls';

// ── ECONOMICS ─────────────────────────────────────────────────────────────────
import { EconomicState, EconomicPolicy, DEFAULT_ECONOMIC_STATE } from './types';
import { 
  updateEconomy, 
  getElectionEconomicMultiplier,
  enqueuePolicyChange,
  aiManageEconomy,
  DEFAULT_COMPLEX_ECONOMIC_STATE,
  type ComplexEconomicState,
} from './utils/economics';
import {
  MissionTreeState, DEFAULT_MISSION_TREE_STATE,
  processMissionTick, applyMissionBonuses, getUnlockedTrees,
  startMission, getPopulationGrowthMultiplier, aiManageMissions, ALL_MISSIONS
} from './utils/missionTrees';
import MissionTreePanel from './components/MissionTreePanel';
import ActiveLawsPanel from './components/ActiveLawsPanel';

// Add to App state:
// (Moved inside App component)
// ──────────────────────────────────────────────────────────────────────────────

// Screens
import StartScreen from './screens/StartScreen';
import PartySelectionScreen from './screens/PartySelectionScreen';
import CharacterSelectionScreen from './screens/CharacterSelectionScreen';
import PartyManagementScreen from './screens/PartyManagementScreen';
import CharacterActionScreen from './screens/CharacterActionScreen';
import AffiliationManagementScreen from './screens/AffiliationManagementScreen';
import PartyElectionScreen from './screens/PartyElectionScreen';
import ParliamentScreen from './screens/ParliamentScreen';
import GovernmentScreen from './screens/GovernmentScreen';
import SpeakerElectionScreen from './screens/SpeakerElectionScreen';
import SecessionJoinPartyScreen from './screens/SecessionJoinPartyScreen';
import SecessionNewPartyScreen from './screens/SecessionNewPartyScreen';
import PartyMergerScreen from './screens/PartyMergerScreen';
import AllianceCreationScreen from './screens/AllianceCreationScreen';
import AllianceJoinScreen from './screens/AllianceJoinScreen';
import AllianceManagementScreen from './screens/AllianceManagementScreen';
import GovernmentFormationScreen from './screens/GovernmentFormationScreen';
import BillSelectionScreen from './screens/BillSelectionScreen';

// Components
import MapComponent from './components/MapComponent';
import GameControlPanel from './components/GameControlPanel';
import { ConstituencyPanel } from './components/ConstituencyPanel';
import CharacterInfoPanel from './components/CharacterInfoPanel';
import PartyPanel from './components/PartyPanel';
import PlayerCharacterButton from './components/PlayerCharacterButton';
import PartyElectionResultsPanel from './components/PartyElectionResultsPanel';
import ElectionResultsPanel from './components/ElectionResultsPanel';
import SpeakerElectionResultsPanel from './components/SpeakerElectionResultsPanel';
import PollsPanel from './components/PollsPanel';
import MergerResultModal from './components/MergerResultModal';
import PartyListPanel from './components/PartyListPanel';
import AlliancePanel from './components/AlliancePanel';
import EventModal from './components/EventModal';
import BillProposalPanel from './components/BillProposalPanel';
import BillResultsPanel from './components/BillResultsPanel';
import EventLogPanel from './components/EventLogPanel';
import EconomicHistoryPanel from './components/EconomicHistoryPanel';
import CountryInfoPanel from './components/CountryInfoPanel';
import StateInfoPanel from './components/StateInfoPanel';
import ElectionMapControlPanel from './components/ElectionMapControlPanel';

import { ALL_SCENARIOS } from './scenarios';

export const BORNEO_PARTIES_TO_SPAWN: Party[] = [
  {
    id: 'usno',
    name: 'United Sabah National Organisation',
    color: '#1B5E20',
    affiliationIds: [
      'sabah-malay-united', 'sabah-malay-fishermen',
      'sabah-malay-religious', 'sabah-bajau-assn', 'sabah-native-farmers',
      'sabah-bumiputera-muslim-village', 'sabah-bumiputera-muslim-farmers',
      'sabah-bumiputera-muslim-fishermen',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Bumiputera Sabah (Muslim)',
    relations: new Map(),
    unity: 88,
    ideology: { economic: 42, governance: 75 },
    funds: 2500000,
    contestedSeats: new Map(),
  },
  {
    id: 'upko',
    name: 'UPKO',
    color: '#F57F17',
    affiliationIds: [
      'kadazan-dusun-union', 'sabah-native-chiefs', 'sabah-murut-society',
      'sabah-native-prog', 'sabah-native-youth', 'sabah-native-professionals',
      'sabah-native-rights',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Bumiputera Sabah (Non-Muslim)',
    relations: new Map(),
    unity: 80,
    ideology: { economic: 38, governance: 68 },
    funds: 1200000,
    contestedSeats: new Map(),
  },
  {
    id: 'sca',
    name: 'Sabah Chinese Association',
    color: '#B71C1C',
    affiliationIds: [
      'sabah-chinese-guild', 'sabah-chinese-chamber',
      'sabah-chinese-planters', 'sabah-chinese-youth', 'sabah-chinese-education',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Sabahan Chinese',
    relations: new Map(),
    unity: 82,
    ideology: { economic: 82, governance: 45 },
    funds: 1800000,
    contestedSeats: new Map(),
  },
  {
    id: 'pasok',
    name: 'Parti Pribumi Sabah',
    color: '#4A148C',
    affiliationIds: [
      'sabah-malay-youth', 'sabah-malay-city',
      'sabah-malay-professionals', 'sabah-malay-traders',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Bumiputera Sabah (Muslim)',
    relations: new Map(),
    unity: 72,
    ideology: { economic: 58, governance: 55 },
    funds: 400000,
    contestedSeats: new Map(),
  },
  {
    id: 'stfup',
    name: 'Sabah United Workers Party',
    color: '#37474F',
    affiliationIds: [
      'sabah-chinese-union', 'sabah-chinese-fisheries', 'sabah-chinese-hawkers',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Sabahan Chinese',
    relations: new Map(),
    unity: 70,
    ideology: { economic: 28, governance: 32 },
    funds: 180000,
    contestedSeats: new Map(),
  },
  {
    id: 'supp',
    name: "Sarawak United People's Party",
    color: '#C62828',
    affiliationIds: [
      'sarawak-united-peoples', 'sarawak-chinese-education',
      'sarawak-chinese-clan', 'sarawak-chinese-youth',
      'sarawak-chinese-business',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Sarawakian Chinese',
    relations: new Map(),
    unity: 82,
    ideology: { economic: 38, governance: 40 },
    funds: 1500000,
    contestedSeats: new Map(),
  },
  {
    id: 'snap',
    name: 'Sarawak National Party',
    color: '#E65100',
    affiliationIds: [
      'dayak-national', 'iban-leaders', 'sarawak-bidayuh-union',
      'sarawak-longhouse', 'orang-ulu-alliance', 'sarawak-native-professionals',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Bumiputera Sarawak (Non-Muslim)',
    relations: new Map(),
    unity: 78,
    ideology: { economic: 35, governance: 68 },
    funds: 1200000,
    contestedSeats: new Map(),
  },
  {
    id: 'bumiputera',
    name: 'Parti Bumiputera',
    color: '#1A237E',
    affiliationIds: [
      'sarawak-malay-assn', 'sarawak-malay-religious',
      'sarawak-malay-kampung', 'sarawak-malay-traders',
      'sarawak-malay-fishermen',
      'sarawak-bumiputera-muslim-village', 'sarawak-bumiputera-muslim-farmers',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Bumiputera Sarawak (Muslim)',
    relations: new Map(),
    unity: 84,
    ideology: { economic: 48, governance: 78 },
    funds: 1800000,
    contestedSeats: new Map(),
  },
  {
    id: 'pesaka',
    name: 'Pesaka',
    color: '#BF360C',
    affiliationIds: [
      'sarawak-native-rights', 'sarawak-native-youth',
      'sarawak-native-edu',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Bumiputera Sarawak (Non-Muslim)',
    relations: new Map(),
    unity: 76,
    ideology: { economic: 32, governance: 65 },
    funds: 900000,
    contestedSeats: new Map(),
  },
  {
    id: 'ppm',
    name: 'Parti Pesaka Masyarakat',
    color: '#00695C',
    affiliationIds: [
      'sarawak-malay-urban', 'sarawak-malay-youth', 'sarawak-malay-professionals',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Bumiputera Sarawak (Muslim)',
    relations: new Map(),
    unity: 68,
    ideology: { economic: 58, governance: 58 },
    funds: 300000,
    contestedSeats: new Map(),
  },
  {
    id: 'sucp',
    name: 'Sarawak United Chinese Party',
    color: '#EF6C00',
    affiliationIds: [
      'sarawak-chinese-chamber', 'sarawak-chinese-merchants',
      'sarawak-chinese-planters', 'sarawak-chinese-professionals',
    ],
    deputyLeaderId: undefined,
    stateBranches: [],
    leaderHistory: [],
    ethnicityFocus: 'Sarawakian Chinese',
    relations: new Map(),
    unity: 78,
    ideology: { economic: 82, governance: 52 },
    funds: 2200000,
    contestedSeats: new Map(),
  }
];

export const generateBorneoNPCs = (currentDate: Date, demographicsMap: Map<string, Demographics>): Character[] => {
  const newNPCs: Character[] = [];
  const activeFeatures = malaysiaSeatsData.filter(f => {
    const negeri = (f.properties.NEGERI || f.properties.state || '').toUpperCase();
    return negeri === 'SABAH' || negeri === 'SARAWAK';
  });
  const seatsByState = new Map<string, string[]>();
  activeFeatures.forEach(seat => {
    const seatCode = seat.properties.UNIQUECODE;
    const state = seat.properties.NEGERI || 'Unknown';
    if (seatCode) {
        if (!seatsByState.has(state)) seatsByState.set(state, []);
        seatsByState.get(state)!.push(seatCode);
    }
  });

  const ELIGIBLE_AFFIL_THRESHOLD = 2;

  // For each state, determine eligible affiliations and generate characters
  seatsByState.forEach((stateSeatCodes, state) => {
    const isBorneo = true;
    const isMainland = false;

    // Aggregate demographics across all seats in the state (simple average)
    let totalMalay = 0, totalChinese = 0, totalIndian = 0, totalOrangAsli = 0, count = 0;
    let totalSabahMuslim = 0, totalSabahNonMuslim = 0, totalSarawakMuslim = 0, totalSarawakNonMuslim = 0;
    stateSeatCodes.forEach(seatCode => {
      const demo = demographicsMap.get(seatCode);
      if (demo) {
        totalMalay += demo.malayPercent;
        totalChinese += demo.chinesePercent;
        totalIndian += demo.indiansPercent;
        totalOrangAsli += demo.orangAsliPercent || 0;
        totalSabahMuslim += demo.bumiputeraSabahMuslimPercent || 0;
        totalSabahNonMuslim += demo.bumiputeraSabahNonMuslimPercent || 0;
        totalSarawakMuslim += demo.bumiputeraSarawakMuslimPercent || 0;
        totalSarawakNonMuslim += demo.bumiputeraSarawakNonMuslimPercent || 0;
        count++;
      }
    });

    const avgMalay   = count > 0 ? totalMalay   / count : 0;
    const avgChinese = count > 0 ? totalChinese / count : 0;
    const avgIndian  = count > 0 ? totalIndian  / count : 0;
    const avgOrangAsli=count > 0 ? totalOrangAsli / count : 0;
    
    const avgSabahMuslim = count > 0 ? totalSabahMuslim / count : 0;
    const avgSabahNonMuslim = count > 0 ? totalSabahNonMuslim / count : 0;
    const avgSarawakMuslim = count > 0 ? totalSarawakMuslim / count : 0;
    const avgSarawakNonMuslim = count > 0 ? totalSarawakNonMuslim / count : 0;

    const getPopPct = (aff: Affiliation) => {
      const isSabahEthnicity = 
          aff.ethnicity === 'Bumiputera Sabah (Muslim)' || 
          aff.ethnicity === 'Sabahan Chinese' || 
          aff.ethnicity === 'Bumiputera Sabah (Non-Muslim)' ||
          aff.ethnicity === 'Multi-Racial (Sabah)';

      const isSarawakEthnicity = 
          aff.ethnicity === 'Bumiputera Sarawak (Muslim)' || 
          aff.ethnicity === 'Sarawakian Chinese' || 
          aff.ethnicity === 'Bumiputera Sarawak (Non-Muslim)' ||
          aff.ethnicity === 'Multi-Racial (Sarawak)';

      if (isSabahEthnicity    && state === 'SARAWAK') return 0;
      if (isSarawakEthnicity  && state === 'SABAH')   return 0;

      if (aff.ethnicity === 'Bumiputera Sabah (Muslim)') return avgSabahMuslim;
      if (aff.ethnicity === 'Bumiputera Sabah (Non-Muslim)') return avgSabahNonMuslim;
      if (aff.ethnicity === 'Bumiputera Sarawak (Muslim)') return avgSarawakMuslim;
      if (aff.ethnicity === 'Bumiputera Sarawak (Non-Muslim)') return avgSarawakNonMuslim;
      if (aff.ethnicity === 'Sabahan Malay' || aff.ethnicity === 'Sarawakian Malay') return avgMalay;
      if (aff.ethnicity === 'Sabahan Chinese' || aff.ethnicity === 'Sarawakian Chinese') return avgChinese;
      if (aff.ethnicity === 'Multi-Racial (Sabah)' && state === 'SABAH') return 100;
      if (aff.ethnicity === 'Multi-Racial (Sarawak)' && state === 'SARAWAK') return 100;
      
      return 0;
    };

    // Determine eligible affiliations for this state
    const eligibleAffs = AFFILIATIONS.filter(aff => {
      return getPopPct(aff) >= ELIGIBLE_AFFIL_THRESHOLD;
    }).sort((a, b) => getPopPct(b) - getPopPct(a));

    // Distribute characters across seats in the state (round-robin)
    let seatIndex = 0;
    for (const affiliation of eligibleAffs) {
      for (let i = 0; i < 6; i++) {
        let assignedSeatCode = stateSeatCodes[seatIndex % stateSeatCodes.length];

        const baseIdeology = affiliation.baseIdeology ?? { economic: 50, governance: 50 };
        const ideology: Ideology = {
          economic:   Math.max(0, Math.min(100, baseIdeology.economic   + (Math.random() * 30 - 15))),
          governance: Math.max(0, Math.min(100, baseIdeology.governance + (Math.random() * 30 - 15))),
        };

        newNPCs.push({
          id: `npc-${assignedSeatCode}-${affiliation.id}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          name: generateCharacterName(affiliation.ethnicity),
          affiliationId: affiliation.id,
          ethnicity: affiliation.ethnicity,
          state,
          currentSeatCode: assignedSeatCode,
          charisma:    20 + Math.floor(Math.random() * 60),
          influence:   10 + Math.floor(Math.random() * 50),
          recognition:  5 + Math.floor(Math.random() * 30),
          dateOfBirth: new Date(
              currentDate.getFullYear() - (25 + Math.floor(Math.random() * 30)),
              Math.floor(Math.random() * 12),
              1
          ),
          isAlive: true,
          isPlayer: false,
          isMP: false,
          history: [{ date: currentDate, event: "Entered political life in the Borneo state of " + state + " upon the formation of Malaysia." }],
          ideology,
        });

        seatIndex++;
      }
    }
  });

  return newNPCs;
};

const START_DATE = new Date('1947-01-01');
const ELECTION_INTERVAL_MS = 5 * 365 * 24 * 60 * 60 * 1000; // 4 years approx

// Custom hook for stable intervals
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const App: React.FC = () => {
  // Monthly AI results — stored so per-character tick can read them
  const [govAIResult,  setGovAIResult]  = useState<GovernmentAIResult  | null>(null);
  const [oppAIResults, setOppAIResults] = useState<Map<string, OppositionAIResult>>(() => new Map());

  // Derived sets used by per-character movement (rebuilt when monthly results change)
  const govDefencePriorities = useMemo<Set<string>>(() => {
    if (!govAIResult) return new Set();
    return new Set(govAIResult.seatDefencePlan.map(p => p.seatCode));
  }, [govAIResult]);

  // All opposition targets merged across parties
  const oppAttackTargets = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    oppAIResults.forEach(r => r.targets.forEach(t => s.add(t.seatCode)));
    return s;
  }, [oppAIResults]);

  // Narrative keyed by partyId (for per-character statement amplification)
  const oppNarrativeMap = useMemo<Map<string, OppositionNarrative>>(() => {
    const m = new Map<string, OppositionNarrative>();
    oppAIResults.forEach((r, pId) => m.set(pId, r.narrative));
    return m;
  }, [oppAIResults]);

  const {
    start:        startMusic,
    stop:         stopMusic,
    setMood:      setMusicMood,
    setVolume:    setMusicVolume,
    toggleMute:   toggleMusicMute,
    currentMood:  currentMusicMood,
    volume:       musicVolume,
    isMuted:      isMusicMuted,
    isStarted:    isMusicStarted,
  } = useProcedualMusic();

  // --- State ---
  const [missionTreeState, setMissionTreeState] = useState<MissionTreeState>(DEFAULT_MISSION_TREE_STATE);
  const [showMissionTree, setShowMissionTree] = useState(false);
  const [gameState, setGameState] = useState<GameState>('start');
  const [gameStartDate, setGameStartDate] = useState<Date>(START_DATE);
  const [currentDate, setCurrentDate] = useState<Date>(START_DATE);
  const [playSpeed, setPlaySpeed] = useState<Speed>(null);
  const lastActiveSpeedRef = useRef<number>(2000);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setPlaySpeed(prev => {
          if (prev === null) {
            return (lastActiveSpeedRef.current || 2000) as Speed;
          } else {
            lastActiveSpeedRef.current = prev;
            return null;
          }
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [parties, setParties] = useState<Party[]>(ALL_SCENARIOS[0].parties);
  const [historicalParties, setHistoricalParties] = useState<Party[]>([]);
  const [partyGraphLinks, setPartyGraphLinks] = useState<PartyGraphLink[]>([]);
  const [alliances, setAlliances] = useState<PoliticalAlliance[]>(ALL_SCENARIOS[0].alliances);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(null);

  const gameStateRef = useRef({ parties, characters, alliances, electionResults: new Map<string, string>() });
  useEffect(() => {
    gameStateRef.current = { parties, characters, alliances, electionResults: gameStateRef.current.electionResults };
  }, [parties, characters, alliances]);

  const [economicState, setEconomicState] = useState<EconomicState>(
    DEFAULT_COMPLEX_ECONOMIC_STATE as EconomicState
  );
  
  const [passedLaws, setPassedLaws] = useState<Bill[]>([]);
  const [showLawsPanel, setShowLawsPanel] = useState(false);
  
  const [policyWarning, setPolicyWarning] = useState<string | null>(null);

  const [showEconomicPanel, setShowEconomicPanel] = useState(false);
  const [inactiveParties, setInactiveParties] = useState<Party[]>([]);
  const previousPartiesRef = useRef<Party[]>(parties);
  
  useEffect(() => {
      const currentIds = new Set(parties.map(p => p.id));
      const removed = previousPartiesRef.current.filter(p => !currentIds.has(p.id));
      if (removed.length > 0) {
          setInactiveParties(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newToAdd = removed.filter(p => !existingIds.has(p.id));
              return [...prev, ...newToAdd];
          });
      }
      previousPartiesRef.current = parties;
  }, [parties]);

  // Refs removed in favor of gameStateRef

  // ── Scheduled Party Formations ────────────────────────────────────────────
  // Tracks which formations have already fired so they never repeat.
  const [formedScheduledPartyIds, setFormedScheduledPartyIds] = useState<Set<string>>(new Set());
  const [pasInvitationData, setPasInvitationData] = useState<{ pasPartyId: string } | null>(null);
  // Ref so the game-loop closure always reads the latest value without stale captures.
  const formedScheduledPartyIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    formedScheduledPartyIdsRef.current = formedScheduledPartyIds;
  }, [formedScheduledPartyIds]);
  // ─────────────────────────────────────────────────────────────────────────

  // Pending character state for position selection flow
  const [pendingCharacter, setPendingCharacter] = useState<Omit<Character, 'currentSeatCode'> | null>(null);
  
  const [densityMap, setDensityMap] = useState<Map<string, number>>(new Map());
  const [isDensityLoading, setIsDensityLoading] = useState<boolean>(true);

  const [features, setFeatures] = useState<GeoJsonFeature[]>(malaysiaSeatsData);
  const [displayGeoJSON, setDisplayGeoJSON] = useState<{ type: string; features: GeoJsonFeature[] }>(() => {
    return { type: 'FeatureCollection', features: malaysiaSeatsData };
  });

  useEffect(() => {
    setDisplayGeoJSON(prev => {
      if (prev.features === features) return prev;
      return { type: 'FeatureCollection', features };
    });
  }, [features]);

  const [demographicsMap, setDemographicsMap] = useState<Map<string, Demographics>>(() => new Map());
  const [affiliationsMap, setAffiliationsMap] = useState<Map<string, Affiliation>>(() => new Map(AFFILIATIONS.map(a => [a.id, a])));
  
  const [selectedSeatCode, setSelectedSeatCode] = useState<string | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [viewingPartyId, setViewingPartyId] = useState<string | null>(null);

  const [electionResults, setElectionResults] = useState<ElectionResults>(new Map());
  useEffect(() => {
    gameStateRef.current.electionResults = electionResults;
  }, [electionResults]);
  const [detailedElectionResults, setDetailedElectionResults] = useState<Map<string, Map<string, number>>>(() => new Map());
  const [electionHistory, setElectionHistory] = useState<ElectionHistoryEntry[]>([]);
  const [electionSystem, setElectionSystem] = useState<ElectionSystem>('FPTP');
  const [strongholdMap, setStrongholdMap] = useState<StrongholdMap>(() => new Map());
  
  // UI State
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [showParliament, setShowParliament] = useState(false);
  const [showGovernment, setShowGovernment] = useState(false);
  const [showElectionHistory, setShowElectionHistory] = useState(false);
  const [showPartyList, setShowPartyList] = useState(false);
  const [showAllianceList, setShowAllianceList] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [showEcoHistory, setShowEcoHistory] = useState(false);
  const [showCountryInfo, setShowCountryInfo] = useState(false);
  const [showPollsPanel, setShowPollsPanel] = useState(false);

  // --- Redelineation State Hooks ---
  const [lastRedelineationYear, setLastRedelineationYear] = useState<number | null>(null);
  const [redelineationModalOpen, setRedelineationModalOpen] = useState(false);
  const [redelineationActions, setRedelineationActions] = useState<RedelineationAction[]>([]);
  const [redelineatedCodesWithYear, setRedelineatedCodesWithYear] = useState<Map<string, number>>(new Map());
  const [redelineationInitialScore, setRedelineationInitialScore] = useState(1.0);
  const [redelineationUpdatedScore, setRedelineationUpdatedScore] = useState(1.0);
  const [mostAffectedState, setMostAffectedState] = useState('');

  const currentMalapportionmentScore = useMemo(() => {
    return malapportionmentScore(Array.from(demographicsMap.values()));
  }, [demographicsMap]);

  const handleOpenPolls = () => {
    setShowPollsPanel(prev => !prev);
    setShowPartyList(false);
    setShowAllianceList(false);
    setShowCountryInfo(false);
    setElectionMapConfig(prev => ({ ...prev, active: false }));
  };
  
  const handleOpenCountryInfo = () => {
    setShowCountryInfo(prev => !prev);
    setShowPartyList(false);
    setShowAllianceList(false);
    setElectionMapConfig(prev => ({ ...prev, active: false }));
  };

  const handleOpenPartyList = () => {
    setShowPartyList(prev => !prev);
    setShowCountryInfo(false);
    setShowAllianceList(false);
    setElectionMapConfig(prev => ({ ...prev, active: false }));
  };

  const handleOpenAllianceList = () => {
    setShowAllianceList(prev => !prev);
    setShowPartyList(false);
    setShowCountryInfo(false);
    setElectionMapConfig(prev => ({ ...prev, active: false }));
  };

  const handleToggleElectionMap = () => {
    setElectionMapConfig(prev => {
      const newActive = !prev.active;
      if (newActive) {
        setShowCountryInfo(false);
        setShowPartyList(false);
        setShowAllianceList(false);
      }
      return { ...prev, active: newActive };
    });
  };
  
  const handleSeatClick = (seatCode: string | null) => {
    setSelectedSeatCode(seatCode);
    if (seatCode) {
      setSelectedState(null);
      setViewingPartyId(null);
      setSelectedCharacterId(null);
    }
  };

  const handleInvestCampaignFunds = (seatCode: string, amount: number) => {
      const pParty = playerPartyRef.current;
      if (!pParty || pParty.funds < amount) return;
      
      setParties(prevParties => {
          return prevParties.map(p => {
              if (p.id === pParty.id) {
                  const newInvestments = new Map<string, number>(p.campaignInvestments || new Map());
                  const currentInvested = newInvestments.get(seatCode) || 0;
                  newInvestments.set(seatCode, currentInvested + amount);
                  
                  return {
                      ...p,
                      funds: p.funds - amount,
                      campaignInvestments: newInvestments
                  };
              }
              return p;
          });
      });
      addToLog('Campaign Investment', `Invested MYR ${amount.toLocaleString()} into ${featuresMap.get(seatCode)?.properties.PARLIMEN || seatCode}.`, 'politics');
  };

  const handleStateClick = (state: string | null) => {
    setSelectedState(state);
    if (state) {
      setSelectedSeatCode(null);
      setViewingPartyId(null);
      setSelectedCharacterId(null);
    }
  };

  const handlePartyClick = (partyId: string | null) => {
    setViewingPartyId(partyId);
    if (partyId) {
      setSelectedSeatCode(null);
      setSelectedState(null);
      setSelectedCharacterId(null);
    }
  };

  const handleCharacterClick = (characterId: string | null) => {
    setSelectedCharacterId(characterId);
    if (characterId) {
      setSelectedSeatCode(null);
      setSelectedState(null);
      setViewingPartyId(null);
      setShowCountryInfo(false);
      setShowPartyList(false);
      setElectionMapConfig(prev => ({ ...prev, active: false }));
    }
  };

  // Interaction State for complex flows
  const [partyManagementOpen, setPartyManagementOpen] = useState(false);
  const [actionScreenOpen, setActionScreenOpen] = useState(false);
  const [affiliationManagementData, setAffiliationManagementData] = useState<{
      affiliationId: string;
      allocatedSeats: { seatCode: string; party: Party; seatFeature: GeoJsonFeature }[];
  } | null>(null);

  // Elections & Politics State
  const [nextPartyElectionDate, setNextPartyElectionDate] = useState<Date>(new Date('1949-06-15'));

  const [partyElectionData, setPartyElectionData] = useState<{
      party: Party;
      candidates: Character[];
      voteTally?: PartyElectionVoteTally;
      winnerId?: string;
      deputyWinnerId?: string;
  } | null>(null);

  const [speakerElectionData, setSpeakerElectionData] = useState<{
      candidates: Character[];
      results?: { winner: Character; tally: SpeakerVoteTally; breakdown: SpeakerVoteBreakdown };
  } | null>(null);
  
  const [government, setGovernment] = useState<Government | null>(null);
  const previousGovernmentRef = useRef<Government | null>(null);
  const [stateGovernments, setStateGovernments] = useState<Map<string, StateGovernment>>(() => new Map());
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Regime Tracking
  const [regimeStartDate, setRegimeStartDate] = useState<Date>(START_DATE);
  const [regimeLeaderPartyId, setRegimeLeaderPartyId] = useState<string | null>('umno');
  const [bigTentTriggered, setBigTentTriggered] = useState<boolean>(false);

  const [parliamentBill, setParliamentBill] = useState<Bill | null>(null);
  const [billVoteResults, setBillVoteResults] = useState<{ passed: boolean; tally: BillVoteTally; breakdown: BillVoteBreakdown; } | null>(null);
  
  const [secessionData, setSecessionData] = useState<{
      affiliationId: string;
      leaderId: string;
      type: 'join' | 'new';
  } | null>(null);

  const [mergerData, setMergerData] = useState<{
      initiatingPartyId: string;
      results?: { accepted: (Party | Affiliation)[]; rejected: (Party | Affiliation)[]; newName: string; };
  } | null>(null);
  
  const [mergerMode, setMergerMode] = useState<UnificationMode>('merge');

  const [hasRunPostElectionStrategy, setHasRunPostElectionStrategy] = useState(false);
  const [hasFormedBN, setHasFormedBN] = useState(false);
  
  const [hasPlayerManagedStrategy, setHasPlayerManagedStrategy] = useState(false);
  const [hasPlayerManagedAffiliation, setHasPlayerManagedAffiliation] = useState(false);

  // New Event State
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [preEventSpeed, setPreEventSpeed] = useState<Speed>(null);

  // Observe Mode State
  const [observeMode, setObserveMode] = useState<boolean>(false);
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  const [unreadLogCount, setUnreadLogCount] = useState(0);

  // Sabah & Sarawak Malaysia Formation Feature Toggle
  const [hasFormedMalaysia, setHasFormedMalaysia] = useState(false);

  useEffect(() => {
    // Date of Malaysia formation: Sept 16, 1963
    const isPostMalaysia = currentDate >= new Date('1963-09-16');
    const hasSabahSarawak = features.some(f => {
      const negeri = (f.properties.NEGERI || f.properties.state || '').toUpperCase();
      return negeri === 'SABAH' || negeri === 'SARAWAK' || negeri === 'W.P. LABUAN';
    });

    if (isPostMalaysia && !hasSabahSarawak) {
       setFeatures(malaysiaSeatsData);

       // 1. Generate Borneo (Sabah and Sarawak) NPCs
       const borneoNPCs = generateBorneoNPCs(currentDate, demographicsMap);

       // 2. Identify and setup Borneo political parties if they don't exist yet
       const existingIds = new Set(parties.map(p => p.id));
       const localNewParties: Party[] = [...parties];
       
       BORNEO_PARTIES_TO_SPAWN.forEach(bp => {
           if (!existingIds.has(bp.id)) {
               // Assign a leader from the generated borneo NPCs
               const bpAffiliations = bp.affiliationIds;
               const eligibleLeaders = borneoNPCs.filter(c => bpAffiliations.includes(c.affiliationId));
               let leaderId: string | undefined = undefined;
               if (eligibleLeaders.length > 0) {
                   const sortedLeaders = [...eligibleLeaders].sort((a, b) => b.influence - a.influence);
                   leaderId = sortedLeaders[0].id;
                   // Mark as affiliation leader
                   const charIndex = borneoNPCs.findIndex(c => c.id === leaderId);
                   if (charIndex !== -1) {
                       borneoNPCs[charIndex].isAffiliationLeader = true;
                   }
               }
               
               localNewParties.push({
                   ...bp,
                   leaderId,
                   contestedSeats: new Map(),
                   relations: new Map(),
                   leaderHistory: leaderId ? [{ leaderId, name: eligibleLeaders.find(c => c.id === leaderId)!.name, startDate: new Date(currentDate) }] : []
               } as Party);
           }
       });

       // 3. Keep existing characters but append new non-duplicated Borneo characters
       const existingCharIds = new Set(characters.map(c => c.id));
       const filteredBorneoNPCs = borneoNPCs.filter(c => !existingCharIds.has(c.id));
       const localNewCharacters = [...characters, ...filteredBorneoNPCs];

       // 4. Update the alliances list locally
       const localNewAlliances = alliances.map(alliance => {
           if (alliance.id === 'alliance') {
               const borneoAllianceMembers = ['usno', 'sca', 'bumiputera', 'pesaka', 'snap', 'sucp'];
               const nextMemberPartyIds = Array.from(new Set([...alliance.memberPartyIds, ...borneoAllianceMembers]));
               return {
                   ...alliance,
                   memberPartyIds: nextMemberPartyIds
               };
           }
           return alliance;
       });

       // Commit the new values to React state in a single synchronous batch
       setParties(localNewParties);
       setCharacters(localNewCharacters);
       setAlliances(localNewAlliances);

       // 5. Initialize State Governments for Sabah and Sarawak
       setStateGovernments(prevGovs => {
           const nextGovs = new Map(prevGovs);
           const initialFederalPartyId = localNewAlliances[0]?.leaderPartyId || localNewParties.find(p => p.id === 'umno')?.id || localNewParties[0]?.id;
           
           const borneoStates = ['SABAH', 'SARAWAK'];
           borneoStates.forEach(state => {
               if (nextGovs.has(state)) return;
               
               // Get seat codes for this state
               const stateSeatCodes = malaysiaSeatsData
                   .filter(f => (f.properties.NEGERI || '').toUpperCase() === state)
                   .map(f => f.properties.UNIQUECODE)
                   .filter(Boolean);
                   
               if (stateSeatCodes.length === 0) return;
               
               const dummyResults = new Map<string, string>(); 
               
               const seatDist = simulateStateElectionResults(state, dummyResults, malaysiaSeatsData, localNewParties, localNewCharacters);
               const gov = formStateGovernment(state, seatDist, localNewParties, localNewCharacters, localNewAlliances, currentDate, undefined, initialFederalPartyId);
               nextGovs.set(state, gov);
           });
           return nextGovs;
       });

       if (gameState === 'game') {
           setGameLog(prev => [{
               id: Math.random().toString(36).substring(2, 9),
               date: new Date(currentDate),
               title: 'Formation of Malaysia',
               description: 'The Federation of Malaya, Sarawak, and North Borneo (Sabah) have merged to form the new nation of Malaysia.',
               type: 'event'
           }, ...prev]);
           
           setCurrentEvent({
                id: 'formation_of_malaysia',
                title: 'Formation of Malaysia',
                description: 'History has been made today. The Federation of Malaya, Sarawak, and North Borneo (Sabah) have merged to form the new nation of Malaysia. The Bornean states bring significant autonomy and new political dynamics to the federation. (Note: Singapore is excluded here, representing its brief tenure before departure).',
                date: new Date(currentDate),
                type: 'political',
                effects: ['Borneo states are now active in the federation', 'New seats are available for contestation']
           });
           setPreEventSpeed(playSpeed);
           setGameState('event-modal');
           setPlaySpeed(null);
       }
       setHasFormedMalaysia(true);
    } else if (!isPostMalaysia && hasSabahSarawak) {
       setFeatures(malaysiaSeatsData.filter(f => {
         const negeri = (f.properties.NEGERI || f.properties.state || '').toUpperCase();
         return negeri !== 'SABAH' && negeri !== 'SARAWAK' && negeri !== 'W.P. LABUAN';
       }));
       setHasFormedMalaysia(false);
    }
  }, [currentDate, features, gameState, playSpeed, parties, characters, alliances, demographicsMap]);

  // Election Map Overlay State
  const [electionMapConfig, setElectionMapConfig] = useState<ElectionMapConfig>({
      active: false,
      selectedPartyId: 'all',
      metric: 'vote_percentage'
  });

  // tracking alive members efficiently
  const aliveCharacters = useMemo(() => characters.filter(c => c.isAlive), [characters]);

  // guard ref to prevent double-firing the general election
  const electionInProgressRef = useRef(false);

  // --- Job Queue for Deferred State Updates ---
  const jobQueueRef = useRef<Array<() => void>>([]);
  
  useEffect(() => {
     if (jobQueueRef.current.length > 0) {
         const jobs = jobQueueRef.current;
         jobQueueRef.current = [];
         unstable_batchedUpdates(() => {
            jobs.forEach(job => {
                if (typeof job === 'function') {
                    job();
                } else {
                    console.error("Not a function in jobQueue:", job);
                }
            });
         });
     }
  }, [currentDate]);

  // --- Computed Memos ---
  // The following variables depend on 'features' which acts as a static constant after initial load.
  // We use dependencies carefully to ensure it reacts when features change.
  const featuresMap = useMemo(() => new Map(features.map(f => [f.properties.UNIQUECODE, f])), [features]);
  const allSeatCodes = useMemo(() => features.map(f => f.properties.UNIQUECODE).filter(Boolean), [features]);
  const uniqueStates = useMemo(() => Array.from(new Set(features.map(f => f.properties.NEGERI))).filter(Boolean) as string[], [features]);
  
  const partiesMap = useMemo(() => new Map([...parties, ...inactiveParties].map(p => [p.id, p])), [parties, inactiveParties]);
  const affiliationToPartyMap = useMemo(() => {
    const map = new Map<string, string>();
    parties.forEach(p => p.affiliationIds.forEach(affId => map.set(affId, p.id)));
    return map;
  }, [parties]);
  const allianceToPartyMap = useMemo(() => {
    const map = new Map<string, string>();
    alliances.forEach(a => {
        a.memberPartyIds.forEach(pid => map.set(pid, a.id));
    });
    return map;
  }, [alliances]);
  const allianceToPartyMapRef = useRef(allianceToPartyMap);
  useEffect(() => { allianceToPartyMapRef.current = allianceToPartyMap; }, [allianceToPartyMap]);

  const playerCharacter = useMemo(() => characters.find(c => c.id === playerCharacterId) || null, [characters, playerCharacterId]);

  const selectedSeat = useMemo(() => selectedSeatCode ? featuresMap.get(selectedSeatCode) : undefined, [selectedSeatCode]); // featuresMap is stable
  const selectedSeatDemographics = useMemo(() => selectedSeatCode ? demographicsMap.get(selectedSeatCode) || null : null, [selectedSeatCode, demographicsMap]);
  const selectedParty = useMemo(() => selectedPartyId ? partiesMap.get(selectedPartyId) : undefined, [selectedPartyId, partiesMap]);
  
  const playerParty = useMemo(() => playerCharacter ? partiesMap.get(affiliationToPartyMap.get(playerCharacter.affiliationId) || '') : null, [playerCharacter, partiesMap, affiliationToPartyMap]);
  const playerPartyRef = useRef<Party | null>(playerParty);
  useEffect(() => { playerPartyRef.current = playerParty; }, [playerParty]);
  const speaker = useMemo(() => characters.find(c => c.isMP && c.currentSeatCode === 'SPEAKER') || null, [characters]); 

  const [stateElectionHistoryMap, setStateElectionHistoryMap] =
      useState<Map<string, StateElectionHistoryEntry[]>>(new Map());

  const [snapElectionDate, setSnapElectionDate] = useState<Date | null>(null);

  const nextElectionDate = useMemo(() => {
      if (snapElectionDate) return snapElectionDate;
      if (electionHistory.length === 0) {
          if (gameStartDate.getFullYear() === 1947) return new Date('1955-07-27');
          if (gameStartDate.getFullYear() === 1955) return new Date('1955-07-27');
          if (gameStartDate.getFullYear() === 1969) return new Date('1969-05-10');
          if (gameStartDate.getFullYear() === 1998) return new Date('1999-11-29');
          return new Date(gameStartDate.getFullYear() + 4, gameStartDate.getMonth(), gameStartDate.getDate());
      }
      const lastElection = electionHistory[electionHistory.length - 1].date;
      return new Date(lastElection.getTime() + ELECTION_INTERVAL_MS);
  }, [snapElectionDate, electionHistory, gameStartDate]);

  const daysUntilElection = useMemo(() => {
      return Math.ceil((nextElectionDate.getTime() - currentDate.getTime()) / (1000 * 60 * 72 * 24));
  }, [nextElectionDate, currentDate]);

  const playerRoleInfo = useMemo(() => {
      if (!playerCharacter || !playerParty) return { role: 'Member' as CharacterRole, details: 'Member' };
      
      if (government && government.chiefMinisterId === playerCharacter.id) return { role: 'Chief Minister' as CharacterRole, details: 'Prime Minister' };
      
      const cabinetPos = government?.cabinet.find(m => m.ministerId === playerCharacter.id);
      if (cabinetPos) return { role: 'Minister' as CharacterRole, details: `Minister of ${cabinetPos.portfolio}` };

      for (const [state, stateGov] of stateGovernments) {
          if (stateGov.chiefMinisterId === playerCharacter.id) {
               const title = (state === 'SARAWAK' || state === 'SABAH' || state === 'PULAU PINANG' || state === 'MELAKA') 
                        ? 'Chief Minister' 
                        : 'Menteri Besar';
               return { role: 'Chief Minister' as CharacterRole, details: `${title} of ${state}` };
          }
          const excoPos = stateGov.executiveCouncil.find(m => m.ministerId === playerCharacter.id);
          if (excoPos) {
              return { role: 'State Executive' as CharacterRole, details: `${excoPos.portfolio} (${state})` };
          }
      }

      if (playerParty.leaderId === playerCharacter.id) return { role: 'National Leader' as CharacterRole, details: 'National Leader' };
      if (playerParty.deputyLeaderId === playerCharacter.id) return { role: 'National Deputy Leader' as CharacterRole, details: 'National Deputy Leader' };
      
      const stateBranch = playerParty.stateBranches.find(b => b.state === playerCharacter.state);
      if (stateBranch?.leaderId === playerCharacter.id) return { role: 'State Leader' as CharacterRole, details: `State Leader (${playerCharacter.state})` };
      if (stateBranch?.executiveIds.includes(playerCharacter.id)) return { role: 'State Executive' as CharacterRole, details: `State Executive (${playerCharacter.state})` };

      if (playerParty.constituencyBranches) {
          const constBranch = playerParty.constituencyBranches.get(playerCharacter.currentSeatCode);
          if (constBranch?.leaderId === playerCharacter.id) {
              return { role: 'Constituency Branch Leader' as CharacterRole, details: `Branch Leader (${playerCharacter.currentSeatCode})` };
          }
      }

      return { role: 'Member' as CharacterRole, details: 'Ordinary Member' };
  }, [playerCharacter, playerParty, government, stateGovernments]);

  const previousElectionResults = useMemo(() => {
      return electionHistory.length > 1 ? electionHistory[electionHistory.length - 2].results : new Map();
  }, [electionHistory]);

  const currentMapConfig = useMemo(() => {
      let results = electionResults;
      let detailedResults = detailedElectionResults;
      let previousDetailedResults = electionHistory.length > 1 ? electionHistory[electionHistory.length - 2].detailedResults : undefined;

      if (electionMapConfig.selectedElectionIndex !== undefined && electionHistory[electionMapConfig.selectedElectionIndex]) {
          const entry = electionHistory[electionMapConfig.selectedElectionIndex];
          results = entry.results;
          detailedResults = entry.detailedResults;
          previousDetailedResults = electionMapConfig.selectedElectionIndex > 0 
              ? electionHistory[electionMapConfig.selectedElectionIndex - 1].detailedResults 
              : undefined;
      }

      return {
          ...electionMapConfig,
          results,
          detailedResults,
          previousDetailedResults
      };
  }, [electionMapConfig, electionResults, detailedElectionResults, electionHistory]);

  const isElectionClose = daysUntilElection <= 20;

  // --- Effects ---

  useEffect(() => {
    const loadData = async () => {
      const demoData = await loadDemographicsData();
      const dMap = new Map<string, Demographics>();
      demoData.forEach(d => dMap.set(d.uniqueCode, d));

      // STEP 6 — POPULATE currentGeometry AT GAME START
      malaysiaSeatsData.forEach(feature => {
        const code = feature.properties.UNIQUECODE || feature.properties.uniqueCode;
        const seat = dMap.get(code);
        if (seat && feature.geometry) {
          seat.currentGeometry = JSON.parse(JSON.stringify(feature.geometry));
        }
      });

      setDemographicsMap(dMap);
      buildWorldPopDensityMap(dMap).then(map => {
        setDensityMap(map);
        setIsDensityLoading(false);
      });
      initializeNeighbors(malaysiaSeatsData);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isMusicStarted) return;

    let mood: MusicMood = 'peaceful';

    if (gameState === 'event-modal') {
      mood = 'dramatic';
    } else if (
      gameState === 'election-results' ||
      gameState === 'government-formation' ||
      gameState === 'party-election-results' ||
      gameState === 'speaker-election-results'
    ) {
      mood = 'triumphant';
    } else if (
      gameState === 'party-election-voting' ||
      gameState === 'speaker-election-voting' ||
      gameState === 'bill-proposal' ||
      gameState === 'bill-results'
    ) {
      mood = 'political';
    } else if (gameState === 'game' || gameState === 'parliament') {
      if (isElectionClose) {
        mood = 'tense';
      } else if (electionHistory.length > 0) {
        mood = government ? 'political' : 'tense';
      } else {
        mood = 'peaceful';
      }
    } else if (
      gameState === 'start' ||
      gameState === 'party-selection' ||
      gameState === 'character-selection' ||
      gameState === 'position-selection'
    ) {
      mood = 'peaceful';
    }

    setMusicMood(mood);
  }, [
    gameState,
    isElectionClose,
    electionHistory.length,
    government,
    isMusicStarted,
    setMusicMood,
  ]);

  // Initialize State Governments
  useEffect(() => {
      if (features.length > 0 && parties.length > 0 && stateGovernments.size === 0) {
          const states = getUniqueStates(features);
          const newGovernments = new Map<string, StateGovernment>();
          
          const initialFederalPartyId = alliances[0]?.leaderPartyId || parties.find(p => p.id === 'umno')?.id || parties[0]?.id;
          states.forEach(state => {
              if (getStateTotalDunSeats(state) === 0) return; // Skip Federal Territories
              const dummyResults = new Map<string, string>(); 
              const seatDist = simulateStateElectionResults(state, dummyResults, features, parties, characters);
              const gov = formStateGovernment(state, seatDist, parties, characters, alliances, currentDate, undefined, initialFederalPartyId);
              newGovernments.set(state, gov);
          });
          setStateGovernments(newGovernments);
      }
  }, [features, parties, characters]);
  
  // Clear unread count when log is opened
  useEffect(() => {
      if (showEventLog) {
          setUnreadLogCount(0);
      }
  }, [showEventLog]);

  const addToLog = useCallback((title: string, description: string, type: 'event' | 'politics' | 'election' | 'personal') => {
      setGameLog(prev => {
          const newLog = {
              id: `log-${Date.now()}-${Math.random()}`,
              date: currentDate,
              title,
              description,
              type
          };
          const updatedLogs = [...prev, newLog];
          if (updatedLogs.length > 40) {
              return updatedLogs.slice(updatedLogs.length - 40);
          }
          return updatedLogs;
      });
      if (!showEventLog) {
          setUnreadLogCount(prev => prev + 1);
      }
  }, [currentDate, showEventLog]);

  // Kuala Lumpur Federal Territory Separation Check
  useEffect(() => {
    // We only perform the separation if currentDate is >= 1974-02-01
    // and we haven't already marked it as separated in features.
    // A quick check is whether 'SETAPAK' seat is still part of 'SELANGOR' in 'features'.
    const setapakSeat = features.find(f => (f.properties.PARLIMEN || '').toUpperCase() === 'SETAPAK');
    if (setapakSeat && setapakSeat.properties.NEGERI === 'SELANGOR' && currentDate >= new Date('1974-02-01')) {
        console.log("Separating Kuala Lumpur Federal Territory from Selangor...");
        
        // 1. Update Features
        setFeatures(prevFeatures => {
            return prevFeatures.map(f => {
                const code = f.properties.UNIQUECODE || '';
                const name = (f.properties.PARLIMEN || '').toUpperCase();
                if (
                    ['P.84', 'P.85', 'P.86', 'P.87', 'P.88'].includes(code) ||
                    ['KEPONG', 'SETAPAK', 'DAMANSARA', 'KUALA LUMPUR BANDAR', 'SUNGAI BESI'].includes(name)
                ) {
                    return {
                        ...f,
                        properties: {
                            ...f.properties,
                            NEGERI: 'W.P. KUALA LUMPUR'
                        }
                    };
                }
                return f;
            });
        });

        // 2. Update Characters State (any character in those seats now belongs to W.P. KUALA LUMPUR state)
        setCharacters(prevChars => {
            return prevChars.map(c => {
                if (['P.84', 'P.85', 'P.86', 'P.87', 'P.88'].includes(c.currentSeatCode)) {
                    return {
                        ...c,
                        state: 'W.P. KUALA LUMPUR'
                    };
                }
                return c;
            });
        });

        // 3. Update Demographics Map (Ensure W.P. KUALA LUMPUR statistics are properly segregated from Selangor in the Nation Info)
        setDemographicsMap(prevMap => {
            const nextMap = new Map(prevMap);
            const targetCodes = ['P.84', 'P.85', 'P.86', 'P.87', 'P.88'];
            targetCodes.forEach(code => {
                const demo = nextMap.get(code);
                if (demo) {
                    nextMap.set(code, {
                        ...demo,
                        state: 'W.P. KUALA LUMPUR'
                    });
                }
            });
            return nextMap;
        });

        // ── Trigger a GameEvent modal if this happened during active gameplay (not on exact scenario load) ──
        const timeDiff = currentDate.getTime() - gameStartDate.getTime();
        const daysPlayed = timeDiff / (1000 * 60 * 60 * 24);
        
        if (daysPlayed > 5) { // More than 5 days into the simulation
            const klSeparationEvent: GameEvent = {
                id: `kl-separation-${Date.now()}`,
                title: "Federal Territory of Kuala Lumpur Established",
                description: "On 1 February 1974, Kuala Lumpur is officially separated from Selangor to form Malaysia's first Federal Territory (Wilayah Persekutuan). The constituencies of Kepong, Setapak, Damansara, Kuala Lumpur Bandar, and Sungai Besi are transferred to this new federal jurisdiction. As a direct result, these urban centers are no longer factored into Selangor's population, and they will no longer participate in Selangor's state legislative assembly (DUN) elections.",
                date: currentDate,
                type: 'political',
                effects: [
                    "Kuala Lumpur seats transferred to W.P. KUALA LUMPUR.",
                    "Selangor's population and state assembly seat count adjusted downward.",
                    "No further state-level elections held for these constituencies."
                ]
            };
            
            if (observeMode) {
                addToLog(klSeparationEvent.title, klSeparationEvent.description, 'event');
            } else {
                setCurrentEvent(klSeparationEvent);
                setPreEventSpeed(playSpeed);
                setPlaySpeed(null);
                setGameState('event-modal');
            }
        } else {
            // Silently log and set
            addToLog("Kuala Lumpur Separation", "Kuala Lumpur (Setapak, Kepong, Damansara, Kuala Lumpur Bandar, Sungai Besi) is administered under the Federal Territory of Kuala Lumpur.", "politics");
        }
    }
  }, [currentDate, features, gameStartDate, observeMode, playSpeed, addToLog]);

  // ── handleScheduledPartyFormation ──────────────────────────────────────────
  /**
   * Spawns a historically-timed party that was not present at game start.
   *
   * Flow:
   *  1. Pull in unassigned affiliations listed in `affiliationIds`.
   *  2. For each id in `splinterAffiliationIds`, call handleAffiliationSecession
   *     so those factions cleanly leave their current party and join the new one.
   *  3. Elect a leader from the gathered members.
   *  4. Register the party in state and fire a log / event notification.
   */


const handleScheduledPartyFormation = useCallback(
  (formation: ScheduledPartyFormation, date: Date) => {
    const currentParties = gameStateRef.current.parties;
    const currentChars = gameStateRef.current.characters;

    const newParty: Party = {
      id: `party-${formation.id}-${Date.now()}`,
      name: formation.partyName,
      color: formation.partyColor,
      affiliationIds: [], // start empty, build up via secession calls
      leaderId: undefined,
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus:
        formation.ethnicityFocus === null ? undefined : formation.ethnicityFocus,
      relations: new Map(),
      unity: 85,
      ideology: formation.ideology ?? { economic: 50, governance: 50 },
      funds: formation.funds,
    };

    let workingParties: Party[] = [...currentParties, newParty];
    let workingChars = [...currentChars];
    let workingElection = new Map<string, string>(gameStateRef.current.electionResults);

    const allAffIdsToTransfer = Array.from(new Set([
      ...formation.affiliationIds,
      ...(formation.splinterAffiliationIds ?? [])
    ]));

    // Handle all affiliations — use secession to properly transfer characters
    for (const affId of allAffIdsToTransfer) {
      const affLeader = workingChars.find(
        c => c.isAffiliationLeader && c.affiliationId === affId && c.isAlive
      );

      const res = handleAffiliationSecession(
        workingParties, workingChars, workingElection,
        affId, affLeader, 'join',
        { targetPartyId: newParty.id }, date
      );
      workingParties = res.newParties;
      workingChars = res.updatedCharacters;
      workingElection = res.newElectionResults;
    }

    // Elect leader from all members now in the new party
    const finalNewParty = workingParties.find(p => p.id === newParty.id);
    if (finalNewParty) {
      const allMemberChars = workingChars.filter(
        c => finalNewParty.affiliationIds.includes(c.affiliationId) && c.isAlive
      );
      if (allMemberChars.length > 0) {
        const sorted = [...allMemberChars].sort((a, b) => b.influence - a.influence);
        const withLeader: Party = {
          ...finalNewParty,
          leaderId: sorted[0].id,
          deputyLeaderId: sorted[1]?.id,
          leaderHistory: [{
            leaderId: sorted[0].id,
            name: sorted[0].name,
            startDate: date,
          }],
        };

        if (!formation.ideology) {
          const memberIdeologies = finalNewParty.affiliationIds
            .map(id => affiliationsMap.get(id)?.ideology)
            .filter((i): i is { economic: number; governance: number } => !!i);
          if (memberIdeologies.length > 0) {
            withLeader.ideology = {
              economic: memberIdeologies.reduce((s, i) => s + i.economic, 0) / memberIdeologies.length,
              governance: memberIdeologies.reduce((s, i) => s + i.governance, 0) / memberIdeologies.length,
            };
          }
        }

        workingParties = workingParties.map(p => p.id === newParty.id ? withLeader : p);
      }
    }

    // Special logic for PAS and PMIP
    if (formation.id === 'pas') {
      const pmip = workingParties.find(p => p.id === 'pmip');
      if (pmip) {
        if (playerPartyRef.current?.id === 'pmip') {
          // Trigger invitation for player
          setPasInvitationData({ pasPartyId: newParty.id });
          setPreEventSpeed(playSpeed);
          setPlaySpeed(null);
          setGameState('pas-invitation');
          // We don't set 'event-modal' below if we do this
        } else {
          // AI PMIP automatically joins PAS
          const res = handlePartyAbsorption(
              workingParties, newParty.id, [pmip], [], workingElection, workingChars, date
          );
          workingParties = res.newParties;
          workingChars = res.updatedCharacters;
          workingElection = res.newElectionResults;
          setHistoricalParties(prev => [...prev, ...res.removedParties]);
          setPartyGraphLinks(prev => [...prev, ...res.newLinks]);

          // Re-evaluate leader
          const pasParty = workingParties.find(p => p.id === newParty.id);
          if (pasParty) {
              const allMemberChars = workingChars.filter(
                  c => pasParty.affiliationIds.includes(c.affiliationId) && c.isAlive
              );
              const sorted = [...allMemberChars].sort((a, b) => b.influence - a.influence);
              if (sorted.length > 0 && sorted[0].id !== pasParty.leaderId) {
                  pasParty.leaderId = sorted[0].id;
                  pasParty.deputyLeaderId = sorted[1]?.id;
                  pasParty.leaderHistory.push({
                      leaderId: sorted[0].id,
                      name: sorted[0].name,
                      startDate: date,
                  });
              }
          }

          // Clean up alliances
          setAlliances(prev => prev.map(a => {
              if (!a.memberPartyIds.includes('pmip')) return a;
              return {
                  ...a,
                  memberPartyIds: a.memberPartyIds.filter(id => id !== 'pmip')
              };
          }).filter(a => a.memberPartyIds.length > 1));
        }
      }
    }

    const finalParties = initializePartyRelations(workingParties);
    setParties(finalParties);
    setCharacters(workingChars);
    setElectionResults(workingElection);

    const event: GameEvent = {
      id: `evt-party-formation-${formation.id}`,
      title: `New Party: ${formation.partyName}`,
      description: formation.announcementText,
      date,
      type: 'political',
      effects: [`${formation.partyName} has entered the political arena.`],
    };

    if (observeMode) {
      addToLog(event.title, event.description, 'politics');
    } else if (formation.id !== 'pas' || playerPartyRef.current?.id !== 'pmip') {
      setCurrentEvent(event);
      setPreEventSpeed(playSpeed);
      setPlaySpeed(null);
      setGameState('event-modal');
    }

    addToLog(`${formation.partyName} Founded`, formation.announcementText, 'politics');
  },
  [affiliationsMap, observeMode, playSpeed, addToLog]
);

  // Ref removed in favor of gameStateRef
  // ─────────────────────────────────────────────────────────────────────────

  // --- Game Loop ---
  useInterval(() => {
    if (gameState !== 'game') return;

    // Enforce speed restriction close to election
    const daysUntil = Math.ceil((nextElectionDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 20 && playSpeed !== null && playSpeed < 125) {
        setPlaySpeed(125);
    }

    setCurrentDate(prevDate => {
      const nextDate = new Date(prevDate);
      nextDate.setDate(prevDate.getDate() + 1);
      
      // 1. General Elections
      if (nextElectionDate && nextDate >= nextElectionDate && !electionInProgressRef.current) {
         electionInProgressRef.current = true;
         setPlaySpeed(null);
         jobQueueRef.current.push(() => {
             handleGeneralElection(nextDate);
             setHasRunPostElectionStrategy(false);
         });
      }
      
            // 2. Population Growth (Yearly) & Monthly Economic Update (on the 1st)
      if (nextDate.getDate() === 1) {
          jobQueueRef.current.push(() => {
              // --- Dynamic Parliament Dissolution Check ---
              const currentGov = previousGovernmentRef.current || government;
              if (currentGov && electionHistory.length > 0 && !snapElectionDate) {
                  const result = conductVoteOfConfidence(currentGov, characters, parties, electionResults);
                  if (!result.passed) {
                      const snapDate = new Date(nextDate.getTime() + 60 * 24 * 60 * 60 * 1000);
                      setSnapElectionDate(snapDate);
                      addToLog("Parliament Dissolved", 
                          `The ruling coalition has lost its majority (${result.votesFor} For, ${result.votesAgainst} Against). Parliament is dissolved and a snap election is called for ${snapDate.toLocaleDateString()}.`,
                          "event");
                      setPlaySpeed(null);
                  } else {
                      // AI may call a snap election if they feel good (High popularity >65% majority, 1% chance monthly)
                      // Only if it's >1 year before the normal general election
                      const daysToNext = (nextElectionDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24);
                      const cm = characters.find(c => c.id === currentGov.chiefMinisterId);
                      if (daysToNext > 365 && cm && cm.id !== playerCharacter?.id) {
                          const total = result.votesFor + result.votesAgainst;
                          if (total > 0 && result.votesFor / total > 0.65) {
                              if (Math.random() < 0.01) {
                                  const snapDate = new Date(nextDate.getTime() + 60 * 24 * 60 * 60 * 1000);
                                  setSnapElectionDate(snapDate);
                                  addToLog("Snap Election Called", 
                                      `Riding high on strong parliamentary support (${Math.round(result.votesFor/total*100)}% of seats), the Prime Minister has dissolved parliament early to seek a fresh mandate.`,
                                      "event");
                              }
                          }
                      }
                  }
              }
              // ---------------------------------------------
              // Electoral Redelineation System (Gerrymandering Check every 8 years) - STEP 3
              const currentYear = nextDate.getFullYear();
              const elapsedYears = currentYear - START_DATE.getFullYear();
              const isFederalRulingCoalitionInPower = !!government && government.rulingCoalitionIds.length > 0;

              const shouldTriggerRedelineation =
                (lastRedelineationYear === null ? elapsedYears >= 8 : currentYear - lastRedelineationYear >= 8)
                && isFederalRulingCoalitionInPower
                && !redelineationModalOpen;

              if (shouldTriggerRedelineation) {
                const isTerritory = (s: string) => {
                  const u = s.toUpperCase();
                  return u === 'WILAYAH PERSEKUTUAN' || u === 'KUALA LUMPUR' || u === 'LABUAN' || u === 'PUTRAJAYA' || u === 'FEDERAL TERRITORY' || u === 'FEDERAL TERRITORIES';
                };

                const rulingCoalitionControlledStates: string[] = [];
                for (const [stateName, stateGov] of stateGovernments.entries()) {
                  const isRulingState = stateGov.rulingCoalitionIds.some(id => government?.rulingCoalitionIds.includes(id));
                  if (isRulingState && !isTerritory(stateName)) {
                    rulingCoalitionControlledStates.push(stateName);
                  }
                }

                const executeRedelineation = async () => {
                  const raster = await loadPopulationRaster().catch(() => null);
                  const rulingPartyIdsSet = new Set(government?.rulingCoalitionIds || []);
                  const allActions: RedelineationAction[] = [];

                  const scoreBefore = malapportionmentScore(Array.from(demographicsMap.values()).map(d => ({ totalElectors: d.totalElectors } as Demographics)));

                  // Run gerrymandering for every state the ruling coalition controls
                  for (const state of rulingCoalitionControlledStates) {
                    const stateActions = await aiGerrymanderState(
                      state,
                      rulingPartyIdsSet,
                      demographicsMap,
                      electionResults,               // Map<seatCode, winningPartyId>
                      currentYear,
                      detailedElectionResults,       // Map<seatCode, Map<partyId, votes>>
                      raster
                    );
                    allActions.push(...stateActions);
                  }

                  if (allActions.length > 0) {
                    // Find most affected state by action count
                    const stateCounts = allActions.reduce((acc, a) => {
                      acc[a.state] = (acc[a.state] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const topState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

                    const scoreAfter = malapportionmentScore(Array.from(demographicsMap.values())); // already mutated in-place

                    setRedelineationActions(allActions);
                    setMostAffectedState(topState);
                    setRedelineationInitialScore(scoreBefore);
                    setRedelineationUpdatedScore(scoreAfter);
                    setPlaySpeed(null); // Pause the game loop
                    setRedelineationModalOpen(true);
                    setLastRedelineationYear(currentYear);

                    addToLog(
                      "Electoral Redelineation Proposed",
                      `The Election Commission has announced proposed boundaries modifications, particularly affecting constituency seats in ${topState}. Opposition parties claim gerrymandering.`,
                      "event"
                    );
                  }
                };
                executeRedelineation();
              }
              // ---------------------------------------------
              // Population growth (throttled to once a year to avoid cascading memo updates) - SUSPENDED BY USER REQUEST
              if (false && nextDate.getMonth() === 0) {
                  setDemographicsMap(prevMap => {
                  const newMap = new Map<string, Demographics>(prevMap);
                  newMap.forEach((demo, code) => {
                      const classificationUpper = typeof demo.urbanRuralClassification2018 === 'string'
                      ? demo.urbanRuralClassification2018.toUpperCase() : '';

                      let baseRate = (classificationUpper === 'URBAN' ? 0.000925
                      : classificationUpper === 'SEMI URBAN' ? 0.0005167
                      : 0.000125) * 12;

                      // --- MISSION TREE BONUS ---
                      // Determine dominant ethnicity of this seat to apply the right multiplier
                      const malayPct  = demo.malayPercent  ?? 0;
                      const chinesePct = demo.chinesePercent ?? 0;
                      const indianPct = demo.indiansPercent  ?? 0;
                      const dominantEth: Ethnicity = malayPct >= chinesePct && malayPct >= indianPct ? 'Malay'
                      : chinesePct >= indianPct ? 'Chinese' : 'Indian';

                      const missionBonus = getPopulationGrowthMultiplier(
                      dominantEth,
                      missionTreeState.populationGrowthMultipliers
                      ) * 12;
                      // -------------------------

                      const growth = Math.ceil(demo.totalElectors * (baseRate + missionBonus));
                      newMap.set(code, { ...demo, totalElectors: demo.totalElectors + growth });
                  });
                  return newMap;
                  });
              }
              setMissionTreeState(prevMissions => {
                const { newMissionState, newEconState, completedThisMonth } =
                    processMissionTick(prevMissions, economicState as ComplexEconomicState, nextDate);

                // Notify player of completions
                completedThisMonth.forEach(m => {
                    const event: GameEvent = {
                    id: `mission-done-${m.id}-${Date.now()}`,
                    title: `Mission Complete: ${m.name}`,
                    description: m.reward.flavourText,
                    date: nextDate,
                    type: 'political',
                    effects: [],
                    };
                    if (observeMode) {
                    addToLog(event.title, event.description, 'politics');
                    } else {
                    setCurrentEvent(event);
                    setPreEventSpeed(playSpeed);
                    setPlaySpeed(null);
                    setGameState('event-modal');
                    }
                });

                // Apply permanent bonuses back to economy
                setEconomicState(prev =>
                    applyMissionBonuses(prev as ComplexEconomicState, newMissionState.permanentBonuses)
                );

                let finalMissionState = newMissionState;
                if (government && (observeMode || government.chiefMinisterId !== playerCharacter?.id)) {
                    const cm = characters.find(c => c.id === government.chiefMinisterId);
                    const rulingPartyId = cm?.affiliationId ? affiliationToPartyMap.get(cm.affiliationId) : null;
                    const rulingParty = rulingPartyId ? parties.find(p => p.id === rulingPartyId) : null;
                    if (rulingParty) {
                        finalMissionState = aiManageMissions(
                            finalMissionState,
                            economicState as ComplexEconomicState,
                            nextDate,
                            rulingParty,
                            passedLaws
                        );
                    }
                }

                return finalMissionState;
                });

              setEconomicState(prevEcon => {
                  const monthsUntilElection = Math.ceil(
                      (nextElectionDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
                  );
                  
                  let currentEcon = prevEcon as ComplexEconomicState;
                  
                  if (government && (observeMode || government.chiefMinisterId !== playerCharacter?.id)) {
                      const requiredPolicies = missionTreeState.activeMissions
                          .map(m => ALL_MISSIONS.find(am => am.id === m.missionId)?.requirements.requiredPolicy)
                          .filter(Boolean) as Partial<EconomicPolicy>[];
                          
                      currentEcon = aiManageEconomy(currentEcon, nextDate, requiredPolicies);
                  }

                  const { newState, triggeredEvent, policyWarning: econWarning } = updateEconomy(
                      currentEcon,
                      nextDate,
                      !!government,
                      Math.max(0, monthsUntilElection)
                  );

                  if (econWarning) {
                      setPolicyWarning(econWarning);
                  }

                  if (triggeredEvent) {
                      const econGameEvent: GameEvent = {
                          id: `econ-${Date.now()}`,
                          title: triggeredEvent.name,
                          description: triggeredEvent.description,
                          date: nextDate,
                          type: 'political',
                          effects: [`GDP, unemployment, and inflation affected for several months.`],
                      };
                      if (observeMode) {
                          addToLog(econGameEvent.title, econGameEvent.description, 'event');
                      } else {
                          setCurrentEvent(econGameEvent);
                          setPreEventSpeed(playSpeed);
                          setPlaySpeed(null);
                          setGameState('event-modal');
                      }
                  }

                  return newState;
              });
              // ── Government AI ──────────────────────────────────────────
                if (government && parties.length > 0) {
                const govParty = partiesMap.get(government.rulingCoalitionIds[0]);
                if (govParty) {
                    const isPlayerGoverning =
                    !!playerParty && government.rulingCoalitionIds.includes(playerParty.id);

                    const result = runGovernmentAI(
                    govParty,
                    economicState as ComplexEconomicState,
                    missionTreeState,          // pass DEFAULT_MISSION_TREE_STATE if not using missions
                    electionResults,
                    characters,
                    featuresMap,
                    demographicsMap,
                    affiliationToPartyMap,
                    affiliationsMap,
                    strongholdMap,
                    Math.max(0, Math.ceil((nextElectionDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24 * 30))),
                    isPlayerGoverning
                    );

                    setGovAIResult(result);

                    // Apply automatic policy change (AI government only)
                    if (result.policyChange && !isPlayerGoverning) {
                    handleEconomicPolicyChange({
                        ...(economicState.policy),
                        ...result.policyChange,
                    });
                    addToLog('Government Policy', result.policyChangeRationale ?? 'Policy adjusted.', 'politics');
                    }

                    // Auto-start suggested mission (AI government only)
                    if (result.suggestedMission && !isPlayerGoverning && missionTreeState.activeMissions.length < 2) {
                    handleStartMission(result.suggestedMission.missionId);
                    addToLog('Mission Begun', result.suggestedMission.rationale, 'politics');
                    }

                    // Log crisis actions
                    result.crisisActions.slice(0, 1).forEach(a => {
                    if (a.urgency === 'critical') {
                        addToLog('Economic Crisis', a.description, 'event');
                    }
                    });

                    result.logMessages.forEach(m => console.debug(m));
                }
                }

                // ── Opposition AI ───────────────────────────────────────────
                const oppositionParties = parties.filter(p => {
                if (!government) return false;
                return !government.rulingCoalitionIds.includes(p.id);
                });

                const newOppResults = new Map<string, OppositionAIResult>();
                const monthsUntilElection = Math.max(0, Math.ceil(
                (nextElectionDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
                ));

                oppositionParties.forEach(oppParty => {
                // Find alliance partners (other opposition parties in same alliance)
                const myAlliance = alliances.find(a => a.memberPartyIds.includes(oppParty.id));
                const alliancePartners = myAlliance
                    ? myAlliance.memberPartyIds.filter(id => id !== oppParty.id && !government!.rulingCoalitionIds.includes(id))
                    : [];

                const result = runOppositionAI(
                    oppParty,
                    alliancePartners,
                    economicState as ComplexEconomicState,
                    electionResults,
                    parties,
                    characters,
                    featuresMap,
                    demographicsMap,
                    affiliationToPartyMap,
                    affiliationsMap,
                    strongholdMap,
                    allSeatCodes.length,
                    monthsUntilElection
                );

                newOppResults.set(oppParty.id, result);

                // Vote of no confidence — only trigger if player is not in government
                if (result.voteOfConfidence.shouldCall && !playerParty?.id) {
                    addToLog(
                    'No-Confidence Motion',
                    `${oppParty.name} is calling for a vote of no confidence. ${result.voteOfConfidence.rationale}`,
                    'politics'
                    );
                    // Optionally: setGameState('vote-of-confidence') here
                }

                result.logMessages.forEach(m => console.debug(m));
                });

                setOppAIResults(newOppResults);

          });

          // ── Scheduled Party Formations (checked monthly on the 1st) ────────
          SCHEDULED_PARTY_FORMATIONS.forEach(formation => {
            // Already fired?
            if (formedScheduledPartyIdsRef.current.has(formation.id)) return;
            // Not yet time?
            if (nextDate < formation.formationDate) return;

            // Mark as fired immediately in the ref to prevent double-triggering
            // if the loop fires again before React re-renders.
            formedScheduledPartyIdsRef.current = new Set([
              ...formedScheduledPartyIdsRef.current,
              formation.id,
            ]);

            jobQueueRef.current.push(() => {
              handleScheduledPartyFormation(formation, nextDate);
              // Also persist into React state for serialisation / save-game support.
              setFormedScheduledPartyIds(prev => new Set([...prev, formation.id]));
            });
          });
          // ──────────────────────────────────────────────────────────────────
      }
      
      // Monthly Mortality Check
      if (nextDate.getDate() === 28) { 
           jobQueueRef.current.push(() => {
                let deaths: string[] = [];
                let replacements: Character[] = [];
                
                setCharacters(prevChars => {
                    const deadMPs: { seatCode: string, name: string }[] = [];
                    const nextChars = prevChars.map(c => {
                        if (c.isAlive && !c.isPlayer && shouldCharacterDie(c, nextDate)) {
                            deaths.push(c.name);
                            if (c.isMP) {
                                deadMPs.push({ seatCode: c.currentSeatCode, name: c.name });
                            }
                            const successor = createSuccessor(c, nextDate);
                            replacements.push(successor);
                            return { 
                                ...c, 
                                isAlive: false, 
                                isMP: false,
                                history: [...c.history, { date: nextDate, event: "Died of natural causes." }] 
                            };
                        }
                        return c;
                    });
                    
                    if (deaths.length > 0) {
                         const livingIds = new Set<string>(nextChars.filter(c => c.isAlive).map(c => c.id));
                         jobQueueRef.current.push(() =>  {
                            deaths.forEach(name => addToLog('Obituary', `${name} has passed away.`, 'personal'));
                            replacements.forEach(r => {
                                const seatName = featuresMap.get(r.currentSeatCode)?.properties.PARLIMEN || r.currentSeatCode;
                                const affName = affiliationsMap.get(r.affiliationId)?.name || 'Unknown Faction';
                                addToLog('New Blood', `${r.name} has emerged to represent the ${affName} in ${seatName}.`, 'politics');
                            });
                             setParties(prev => cleanupPoliticalVacancies(prev, livingIds, nextDate));
                             setGovernment(prev => cleanupGovernmentVacancies(prev, livingIds));
                         });
                         
                         // Trigger instant dummy by-elections to fill vacated seats
                         if (deadMPs.length > 0) {
                             jobQueueRef.current.push(() => {
                                 const byElectionWinners = new Map<string, { winnerCharId: string, winningPartyId: string | undefined, seatName: string, partyName: string | undefined, fallback: boolean }>();

                                 setCharacters(currentChars => {
                                     let updatedChars = [...currentChars];
                                     deadMPs.forEach(deadMp => {
                                         const seatFeature = featuresMap.get(deadMp.seatCode);
                                         const demographics = demographicsMap.get(deadMp.seatCode);
                                         const currentParties = gameStateRef.current.parties;
                                         const currentAlliances = gameStateRef.current.alliances;
                                         
                                         if (!seatFeature) return;
                                         
                                         // Map parties to alliances to respect seat distribution
                                         const allianceMemberMap = allianceToPartyMapRef.current;
                                         
                                         let bestCandidate: Character | null = null;
                                         let maxEffectiveInfluence = -1;
                                         let winningPartyId: string | undefined = undefined;

                                         // All active parties contest the by-election with their best local candidate
                                         currentParties.forEach(party => {
                                            // Alliance seat distribution check
                                            const allianceId = allianceMemberMap.get(party.id);
                                            if (allianceId) {
                                                // Check if another party in the same alliance was explicitly allocated this seat
                                                const seatAllocatedToOther = currentParties.some(other => 
                                                    other.id !== party.id && 
                                                    other.contestedSeats.has(deadMp.seatCode) && 
                                                    allianceMemberMap.get(other.id) === allianceId
                                                );
                                                
                                                const thisPartyAllocated = party.contestedSeats.has(deadMp.seatCode);
                                                
                                                // If seat was explicitly allocated to another allied party, this party stands down to respect the alliance
                                                if (seatAllocatedToOther && !thisPartyAllocated) {
                                                    return;
                                                }
                                            }

                                            const partyCandidates = updatedChars.filter(c => 
                                                c.isAlive && !c.isMP && c.currentSeatCode === deadMp.seatCode && party.affiliationIds.includes(c.affiliationId)
                                            );
                                            
                                            if (partyCandidates.length > 0) {
                                                const partyTopCandidate = partyCandidates.reduce((prev, current) => (prev.influence > current.influence) ? prev : current);
                                                
                                                const campaignInvestment = party.campaignInvestments?.get(deadMp.seatCode);
                                                let effInf = calculateEffectiveInfluence(
                                                    partyTopCandidate, seatFeature, demographics || null, affiliationsMap, 
                                                    strongholdMap, partyTopCandidate.id, partyTopCandidate.affiliationId, 
                                                    campaignInvestment
                                                );
                                                
                                                // Simulation swing +/- 25%
                                                effInf *= (0.75 + Math.random() * 0.5);
                                                
                                                if (effInf > maxEffectiveInfluence) {
                                                    maxEffectiveInfluence = effInf;
                                                    bestCandidate = partyTopCandidate;
                                                    winningPartyId = party.id;
                                                }
                                            }
                                         });

                                         if (bestCandidate) {
                                             const winnerId = (bestCandidate as Character).id;
                                             updatedChars = updatedChars.map(c => c.id === winnerId ? { ...c, isMP: true, history: [...c.history, { date: nextDate, event: `Won by-election following the death of ${deadMp.name}.` }] } : c);
                                             
                                             const seatName = seatFeature.properties.PARLIMEN || deadMp.seatCode;
                                             const partyName = currentParties.find(p => p.id === winningPartyId)?.name;
                                             
                                             byElectionWinners.set(deadMp.seatCode, {
                                                 winnerCharId: winnerId,
                                                 winningPartyId,
                                                 seatName,
                                                 partyName,
                                                 fallback: false
                                             });
                                         } else {
                                             // Fallback: If absolutely no party had a candidate, somehow find a random person or do the old logic
                                             const charsInSeat = updatedChars.filter(char => char.currentSeatCode === deadMp.seatCode && char.isAlive && !char.isMP);
                                             if (charsInSeat.length > 0) {
                                                 const winner = charsInSeat.reduce((prev, current) => (prev.influence > current.influence) ? prev : current);
                                                 updatedChars = updatedChars.map(c => c.id === winner.id ? { ...c, isMP: true, history: [...c.history, { date: nextDate, event: `Defaulted by-election following the death of ${deadMp.name}.` }] } : c);
                                                 const fallbackPartyId = affiliationsMap.get(winner.affiliationId) ? affiliationToPartyMap.get(winner.affiliationId) : undefined;
                                                 
                                                 byElectionWinners.set(deadMp.seatCode, {
                                                     winnerCharId: winner.id,
                                                     winningPartyId: fallbackPartyId,
                                                     seatName: seatFeature.properties.PARLIMEN || deadMp.seatCode,
                                                     partyName: undefined,
                                                     fallback: true
                                                 });
                                             }
                                         }
                                     });
                                     return updatedChars;
                                 });

                                 setTimeout(() => {
                                     if (byElectionWinners.size > 0) {
                                         setElectionResults(prevResults => {
                                             const newResults = new Map(prevResults);
                                             for (const [seatCode, details] of byElectionWinners.entries()) {
                                                 if (details.winningPartyId) {
                                                     newResults.set(seatCode, details.winningPartyId);
                                                 }
                                             }
                                             return newResults;
                                         });
                                         for (const details of byElectionWinners.values()) {
                                             if (!details.fallback && details.winningPartyId) {
                                                 addToLog('By-Election Result', `${details.partyName} has secured ${details.seatName} in the by-election.`, 'event');
                                             }
                                         }
                                     }
                                 });
                             });
                         }
                    }
                    
                    return [...nextChars, ...replacements];
                });

           });
      }

      if (nextDate.getDate() === 1) {
          // --- ALLIANCE COHESION ---
          setAlliances(prevAlliances => {
              const newAlliances = prevAlliances.map(alliance => {
                  const leaderParty = parties.find(p => p.id === alliance.leaderPartyId);
                  const memberParties = parties.filter(p => alliance.memberPartyIds.includes(p.id));
                  
                  if (!leaderParty || memberParties.length < 2) return alliance;
                  
                  // Recalculate ideology averages so it drifts with the member parties' current ideologies
                  const avgEco = memberParties.reduce((sum, p) => sum + p.ideology.economic, 0) / memberParties.length;
                  const avgGov = memberParties.reduce((sum, p) => sum + p.ideology.governance, 0) / memberParties.length;
                  
                  // Calculate new cohesion
                  // Cohesion relies heavily on relations with the leader party
                  const avgRelationToLeader = memberParties
                      .filter(p => p.id !== leaderParty.id)
                      .reduce((sum, p) => sum + (p.relations.get(leaderParty.id) || 50), 0) / (memberParties.length - 1);
                      
                  let cohesionChange = 0;
                  if (avgRelationToLeader < 40) cohesionChange -= 2;
                  else if (avgRelationToLeader > 70) cohesionChange += 1;
                  
                  // General drift towards 50
                  if (alliance.cohesion > 50) cohesionChange -= 0.5;
                  if (alliance.cohesion < 50) cohesionChange += 0.5;

                  let newCohesion = Math.max(0, Math.min(100, alliance.cohesion + cohesionChange));
                  
                  if (alliance.cohesion === newCohesion && alliance.ideology.economic === avgEco && alliance.ideology.governance === avgGov) {
                      return alliance;
                  }

                  return {
                      ...alliance,
                      ideology: { economic: avgEco, governance: avgGov },
                      cohesion: newCohesion
                  };
              });

              // Check for defections
              const defections: { allianceName: string, partyName: string }[] = [];
              const alliancesAfterDefection = newAlliances.map(alliance => {
                  if (alliance.cohesion < 30) {
                      // Chance for a member to secede if relation with leader is very poor
                      const leaderParty = parties.find(p => p.id === alliance.leaderPartyId);
                      if (leaderParty) {
                          let members = parties.filter(p => alliance.memberPartyIds.includes(p.id) && p.id !== leaderParty.id);
                          
                          // Filter out members who have an active prevent_alliance_leave modifier
                          members = members.filter(p => !p.modifiers?.some(m => m.type === 'prevent_alliance_leave' && currentDate < new Date(m.expiresAt)));

                          if (members.length > 0) {
                              const unhappiest = members.reduce((worst, p) => (p.relations.get(leaderParty.id) || 50) < (worst.relations.get(leaderParty.id) || 50) ? p : worst, members[0]);
                              
                              if (unhappiest && (unhappiest.relations.get(leaderParty.id) || 50) < 30) {
                                  if (Math.random() < 0.1) { // 10% chance per month if critical
                                      defections.push({ allianceName: alliance.name, partyName: unhappiest.name });
                                      return {
                                          ...alliance,
                                          memberPartyIds: alliance.memberPartyIds.filter(id => id !== unhappiest.id),
                                          cohesion: Math.min(100, alliance.cohesion + 20) // Cohesion bounces back slightly after the instigator leaves
                                      };
                                  }
                              }
                          }
                      }
                  }
                  return alliance;
              }).filter(a => a.memberPartyIds.length > 1); // Disband if only 1 party left
              
              if (defections.length > 0) {
                  defections.forEach(d => {
                      addToLog('Alliance Fracture', `${d.partyName} has seceded from ${d.allianceName} due to internal conflicts and ideological differences!`, 'politics');
                  });
              }
              
              return alliancesAfterDefection;
          });

          const redistributionResult = updateAllianceSeatDistributions(
              gameStateRef.current.alliances,
              gameStateRef.current.parties,
              allSeatCodes,
              demographicsMap,
              featuresMap,
              affiliationsMap,
              gameStateRef.current.characters,
              strongholdMap,
              currentDate
          );

          if (redistributionResult.redistributionLogs.length > 0) {
              setAlliances(redistributionResult.updatedAlliances);
              setParties(redistributionResult.updatedParties);
              
              redistributionResult.redistributionLogs.forEach(log => {
                  addToLog('Alliance Redistribution', log, 'politics');
              });
          }
      }

      // 3. Party Elections (First in 1953)
      if (nextDate >= nextPartyElectionDate) {
          setPlaySpeed(null);
          jobQueueRef.current.push(() => {
              parties.forEach(p => {
                  if (!playerParty || p.id !== playerParty.id) {
                      handlePartyElectionAuto(p, nextDate);
                  }
              });
              
              setNextPartyElectionDate(new Date(nextDate.getFullYear() + 3, nextDate.getMonth(), nextDate.getDate()));
              
              if (playerParty) {
                  handlePartyElectionStart(playerParty);
              } else {
                  setPlaySpeed(playSpeed);
              }
          });
      }
      
      // 4. State Party Elections
      if (nextDate.getMonth() === 4 && nextDate.getDate() === 1 && nextDate.getFullYear() === nextPartyElectionDate.getFullYear()) {
          jobQueueRef.current.push(() => handleStatePartyElections(nextDate));
      }
      
      // 5. Political Developments
      if (nextDate.getDate() === 5) {
          jobQueueRef.current.push(() => handleInternalPolitics(nextDate));
      }

      if (nextDate.getDate() === 15) {
          jobQueueRef.current.push(() => handlePoliticalDevelopments(nextDate));
      }
      
      if (nextDate.getDate() === 20) {
          jobQueueRef.current.push(() => {
              setParties(prevParties => consolidateAllianceCohesion(prevParties, alliances));
          });
      }

      if (nextDate.getDate() === 25) {
           jobQueueRef.current.push(() => {
              setCharacters(prevChars => {
                  const { updatedCharacters, driftLogs } = handleCharacterIdeologicalDrift(prevChars, affiliationsMap, nextDate);
                  if (driftLogs.length > 0) {
                       driftLogs.forEach(log => addToLog('Faction Drift', log, 'politics'));
                  }
                  return updatedCharacters;
              });
          });
      }
      
      // 20-Year Regime Check (Annual)
      if (nextDate.getMonth() === 0 && nextDate.getDate() === 1) {
          const yearsRuled = (nextDate.getFullYear() - regimeStartDate.getFullYear());
          if (yearsRuled > 0 && yearsRuled % 25 === 0 && government) {
              const allianceName = generateAllianceName();
              const result = formBigTentCoalition(parties, government.rulingCoalitionIds, allianceName, null, nextDate);
              if (result) {
                  setAlliances(prev => {
                      const newMemberIds = result.alliance.memberPartyIds;
                      const cleanedAlliances = prev.map(a => {
                          const hasNewMember = a.memberPartyIds.some(pid => newMemberIds.includes(pid));
                          if (!hasNewMember) return a;
                          return {
                              ...a,
                              memberPartyIds: a.memberPartyIds.filter(pid => !newMemberIds.includes(pid))
                          };
                      }).filter(a => a.memberPartyIds.length >= 2);
                      
                      return [...cleanedAlliances, result.alliance];
                  });

                   setParties(result.parties);
                   setBigTentTriggered(true);
                   
                   const event: GameEvent = {
                       id: `evt-bigtent-${Date.now()}`,
                       title: "End of an Era?",
                       description: `The current regime has held power for over 20 years. In a historic move, opposition parties have united to form "${result.alliance.name}" to challenge the incumbent's dominance.`,
                       date: nextDate,
                       type: 'political',
                       effects: [
                           "Opposition parties form a single bloc.",
                           "Opposition unity greatly increased.",
                           "Increased political polarization."
                       ]
                   };
                   
                   if (observeMode) {
                        addToLog(event.title, event.description, 'event');
                   } else {
                       setCurrentEvent(event);
                       setPreEventSpeed(playSpeed);
                       setPlaySpeed(null);
                       setGameState('event-modal');
                   }
              }
          }
      }

      // 6. Game Events (Monthly Check)
      if (nextDate.getDate() === 1) {
           jobQueueRef.current.push(() => {
               const event = checkForGameEvent(nextDate, characters, parties, demographicsMap, features, affiliationsMap);
               if (event) {
                   if (observeMode) {
                        const { updatedCharacters, updatedParties } = applyEventEffects(event, characters, parties, affiliationsMap);
                        setCharacters(updatedCharacters);
                        setParties(updatedParties);
                        addToLog(event.title, event.description, 'event');
                   } else {
                       setCurrentEvent(event);
                       setPreEventSpeed(playSpeed);
                       setPlaySpeed(null);
                       setGameState('event-modal');
                   }
               }
           });
      }

      return nextDate;
    });
    
    // Post-Election AI Strategy
    const lastEventDate = electionHistory.length > 0 ? electionHistory[electionHistory.length - 1].date : gameStartDate;
    const daysSinceLastEvent = Math.floor((currentDate.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastEvent >= 21 && !hasRunPostElectionStrategy) {
        runAIStrategies();
        setHasRunPostElectionStrategy(true);
    }
    
    const getAffiliationToPartyMap = () => {
        const map = new Map<string, string>();
        parties.forEach(p => p.affiliationIds.forEach(id => map.set(id, p.id)));
        return map;
    };
    
    // Periodically refresh affiliation leaders (every 30 days)
    if (currentDate.getDate() === 1) {
         setCharacters(prevChars => {
             const newChars = updateAffiliationLeaders(prevChars, affiliationsMap ? Array.from(affiliationsMap.values()) : AFFILIATIONS);
             const updatedAffiliations = updateAffiliationIdeologies(newChars, AFFILIATIONS);
             
             unstable_batchedUpdates(() => {
                 setAffiliationsMap(new Map(updatedAffiliations.map(a => [a.id, a])));
                 setParties(prevParties => updatePartyIdeologies(prevParties, updatedAffiliations));
             });

             return newChars;
         });
    }

  }, playSpeed);

  // --- AI Processing Tick (Runs less frequently) ---
  useInterval(() => {
    if (gameState !== 'game' || !playSpeed) return;
    
    // AI seat population map
    const seatAffiliationPopMap = new Map<string, Map<string, number>>();
    const seatTotalPopMap = new Map<string, number>();

    aliveCharacters.forEach(c => {
        if (!seatAffiliationPopMap.has(c.currentSeatCode)) {
            seatAffiliationPopMap.set(c.currentSeatCode, new Map());
        }
        const affMap = seatAffiliationPopMap.get(c.currentSeatCode)!;
        affMap.set(c.affiliationId, (affMap.get(c.affiliationId) || 0) + 1);

        seatTotalPopMap.set(c.currentSeatCode, (seatTotalPopMap.get(c.currentSeatCode) || 0) + 1);
    });

    jobQueueRef.current.push(() => {
        setCharacters(prevChars => {
            let changed = false;
            const newChars = prevChars.map(char => {
                if (!char.isAlive || char.isPlayer) return char;

                // Determine which party this character belongs to
                const partyId = affiliationToPartyMap.get(char.affiliationId);
                const party = partyId ? partiesMap.get(partyId) : undefined;

                let role: CharacterRole = 'Member';
                if (government && government.chiefMinisterId === char.id) role = 'Chief Minister';
                else if (government?.cabinet.some(m => m.ministerId === char.id)) role = 'Minister';
                else if (party?.leaderId === char.id) role = 'National Leader';
                else if (party?.deputyLeaderId === char.id) role = 'National Deputy Leader';
                else if (party?.stateBranches.some(b => b.leaderId === char.id)) role = 'State Leader';
                else if (party?.stateBranches.some(b => b.executiveIds.includes(char.id))) role = 'State Executive';
                else if (party?.constituencyBranches?.get(char.currentSeatCode)?.leaderId === char.id) role = 'Constituency Branch Leader';
                else if (char.isMP) role = 'MP';

                const charIsIncumbent = partyId ? (government?.rulingCoalitionIds.includes(partyId) || false) : false;
                const charNarrative = partyId ? oppNarrativeMap.get(partyId) ?? null : null;

                const result = determineAIAction(
                  char,
                  role,
                  prevChars,
                  allSeatCodes,
                  featuresMap,
                  demographicsMap,
                  affiliationToPartyMap,
                  affiliationsMap,
                  seatAffiliationPopMap,
                  seatTotalPopMap,
                  strongholdMap, // we will throttle this later
                  economicState,
                  charIsIncumbent,
                  charIsIncumbent ? govDefencePriorities : undefined,
                  !charIsIncumbent ? oppAttackTargets    : undefined,
                  charNarrative
                );
                
                if (result !== char) changed = true;
                return result;
            });
            return changed ? newChars : prevChars;
        });
    });
  }, playSpeed ? playSpeed * 3 : null);

  // --- Handlers ---
  
  const handleInternalPolitics = (date: Date) => {
      let updatedParties = [...parties];
      let updatedCharacters = [...characters];
      
      updatedParties = updatedParties.map(party => {
          const members = updatedCharacters.filter(c => party.affiliationIds.includes(c.affiliationId) && c.isAlive);
          
          const isRulingParty = government?.rulingCoalitionIds.includes(party.id) || false;
          
          const { updatedParty, updatedMembers: newMembers, logs } = processInternalPolitics(
              party, 
              members, 
              electionResults, 
              affiliationsMap, 
              date,
              isRulingParty
          );

          newMembers.forEach(nm => {
              const idx = updatedCharacters.findIndex(c => c.id === nm.id);
              if (idx !== -1) updatedCharacters[idx] = nm;
          });

          logs.forEach(log => addToLog(log.title, log.description, log.type));

          return updatedParty;
      });

      setParties(updatedParties);
      setCharacters(updatedCharacters);

      const { updatedAlliances, logs: allianceLogs, stateChiefUpdates } = processAllianceStateLeaders(
          alliances,
          updatedParties,
          updatedCharacters,
          date,
          getUniqueStates(features)
      );
      
      if (allianceLogs.length > 0) {
          setAlliances(updatedAlliances);
          allianceLogs.forEach(log => addToLog(log.title, log.description, log.type));
      }

      if (stateChiefUpdates.length > 0) {
          setStateGovernments((prevGovs: Map<string, StateGovernment>) => {
              const newGovs = new Map<string, StateGovernment>(prevGovs);
              let changed = false;
              for (const update of stateChiefUpdates) {
                  const gov = newGovs.get(update.state);
                  if (gov) {
                      // Check if the alliance is part of the ruling coalition
                      const rulingAlliance = updatedAlliances.find(a => 
                          a.memberPartyIds.length === gov.rulingCoalitionIds.length && 
                          a.memberPartyIds.every(id => gov.rulingCoalitionIds.includes(id))
                      );
                      
                      if (rulingAlliance && rulingAlliance.id === update.allianceId && gov.chiefMinisterId !== update.newCmId) {
                          const newHistory = [...gov.cmHistory];
                          if (newHistory.length > 0) {
                              newHistory[newHistory.length - 1].endDate = date;
                          }
                          const newCm = characters.find(c => c.id === update.newCmId);
                          const cmPartyId = updatedParties.find(p => p.affiliationIds.includes(newCm?.affiliationId || ''))?.id;
                          newHistory.push({ cmId: update.newCmId, startDate: date, partyId: cmPartyId });
                          
                          newGovs.set(update.state, {
                              ...gov,
                              chiefMinisterId: update.newCmId,
                              cmHistory: newHistory
                          });
                          changed = true;
                      }
                  }
              }
              return changed ? newGovs : prevGovs;
          });
      }
  };

  const handleEventAcknowledge = () => {
      if (currentEvent) {
          const { updatedCharacters, updatedParties } = applyEventEffects(currentEvent, characters, parties, affiliationsMap);
          setCharacters(updatedCharacters);
          setParties(updatedParties);
          addToLog(currentEvent.title, currentEvent.description, 'event');
      }
      setCurrentEvent(null);
      setGameState('game');
      setPlaySpeed(preEventSpeed);
  };

  const handlePoliticalDevelopments = (date: Date) => {
      let activeParties = parties;
      let activeCharacters = characters;
      let activeElectionResults = electionResults;
      let activeAlliances = alliances;
      
      const currentAffToPartyMap = new Map(affiliationToPartyMap);

      const canAffiliationJoinParty = (affiliation: Affiliation, party: Party): boolean => {
          if (!party.ethnicityFocus || party.ethnicityFocus === 'Multi-Racial') return true;
          
          if (party.ethnicityFocus === 'Multi-Racial (Sabah)') {
              return ['Bumiputera Sabah (Muslim)', 'Sabahan Chinese', 'Bumiputera Sabah (Non-Muslim)'].includes(affiliation.ethnicity);
          }
          if (party.ethnicityFocus === 'Multi-Racial (Sarawak)') {
              return ['Bumiputera Sarawak (Muslim)', 'Sarawakian Chinese', 'Bumiputera Sarawak (Non-Muslim)'].includes(affiliation.ethnicity);
          }

          const malaySubtypes = ['Malay', 'Bumiputera Sabah (Muslim)', 'Bumiputera Sarawak (Muslim)'];
          if (party.ethnicityFocus === 'Malay' && malaySubtypes.includes(affiliation.ethnicity as any)) {
              return true;
          }
          
          if (party.ethnicityFocus === affiliation.ethnicity) return true;
          return false;
      };

      // PHASE 1: Alliance Integrity & Disbandment
      const alliancesToDissolve = new Set<string>();
      
      activeAlliances = activeAlliances.map(alliance => {
          const leaderParty = activeParties.find(p => p.id === alliance.leaderPartyId);
          if (!leaderParty) {
              alliancesToDissolve.add(alliance.id);
              return alliance;
          }

          const newMemberIds = alliance.memberPartyIds.filter(memberId => {
              if (memberId === alliance.leaderPartyId) return true;
              const memberParty = activeParties.find(p => p.id === memberId);
              if (!memberParty) return false;

              // Prevent leaving if they have prevent_alliance_leave
              if (memberParty.modifiers?.some(m => m.type === 'prevent_alliance_leave' && currentDate < new Date(m.expiresAt))) {
                  return true;
              }

              const relation = leaderParty.relations.get(memberId) || 50;
              const dist = Math.sqrt(Math.pow(leaderParty.ideology.economic - memberParty.ideology.economic, 2) + Math.pow(leaderParty.ideology.governance - memberParty.ideology.governance, 2));
              
              if (relation < 40 || dist > 40) {
                  addToLog('Alliance Breakup', `${memberParty.name} has withdrawn from the ${alliance.name} due to disagreements.`, 'politics');
                  return false;
              }
              return true;
          });
          
          if (newMemberIds.length < 2) {
              alliancesToDissolve.add(alliance.id);
              addToLog('Alliance Collapse', `The ${alliance.name} has collapsed due to lack of members.`, 'politics');
          }

          return { ...alliance, memberPartyIds: newMemberIds };
      });

      if (alliancesToDissolve.size > 0) {
          activeAlliances = activeAlliances.filter(a => !alliancesToDissolve.has(a.id));
      }

      // PHASE 2: Party Schisms
      activeParties = activeParties.map(p => {
          let newUnity = p.unity;
          if (p.affiliationIds.length > 1) {
             newUnity += (Math.random() * 4 - 2.5); 
          } else {
             newUnity += (Math.random() * 2 - 0.5);
          }
          newUnity = Math.max(0, Math.min(100, newUnity));
          if (p.unity === newUnity) return p;
          return { ...p, unity: newUnity };
      });

      let schismOccurred = false;
      const partyIdsToCheck = activeParties.map(p => p.id);

      for (const pId of partyIdsToCheck) {
          if (schismOccurred) break;
          
          let p = activeParties.find(party => party.id === pId);
          if (!p) continue;

          if (p.unity < 20 && p.affiliationIds.length >= 3) {
               if (Math.random() < 0.0055) {
                   const partyMembers = activeCharacters.filter(c => p!.affiliationIds.includes(c.affiliationId) && c.isAlive);
                   const nonLeaderInfluentials = partyMembers.filter(c => c.isAffiliationLeader && c.id !== p!.leaderId);
                   
                   if (nonLeaderInfluentials.length === 0) continue;

                   const dissidentLeader = nonLeaderInfluentials.sort((a,b) => b.influence - a.influence)[0];

                   if (dissidentLeader) {
                       const leaderChar = activeCharacters.find(c => c.id === p!.leaderId);
                       const rebelAffiliationIds: string[] = [dissidentLeader.affiliationId];
                       
                       const dissidentAff = affiliationsMap.get(dissidentLeader.affiliationId);
                       const leaderAff = leaderChar ? affiliationsMap.get(leaderChar.affiliationId) : null;

                       if (dissidentAff && leaderAff) {
                            p.affiliationIds.forEach(affId => {
                                if (affId === dissidentLeader.affiliationId || affId === leaderChar?.affiliationId) return;
                                const aff = affiliationsMap.get(affId);
                                if (!aff) return;
                                
                                const distDissident = Math.sqrt(Math.pow(aff.ideology!.economic - dissidentAff.ideology!.economic, 2) + Math.pow(aff.ideology!.governance - dissidentAff.ideology!.governance, 2));
                                const distLeader = Math.sqrt(Math.pow(aff.ideology!.economic - leaderAff.ideology!.economic, 2) + Math.pow(aff.ideology!.governance - leaderAff.ideology!.governance, 2));

                                if (distDissident < distLeader) {
                                    rebelAffiliationIds.push(affId);
                                }
                            });
                       }

                       if (rebelAffiliationIds.length > 0) {
                            schismOccurred = true;
                            
                            let formNewParty = Math.random() < 0.0575;
                            let targetParty: Party | undefined = undefined;

                            if (!formNewParty) {
                                const potentialTargets = activeParties.filter(t => {
                                    if (t.id === p!.id) return false;
                                    
                                    if (!canAffiliationJoinParty(dissidentAff!, t)) {
                                        return false;
                                    }
                                    
                                    const dist = Math.sqrt(Math.pow(t.ideology.economic - dissidentAff!.ideology!.economic, 2) + Math.pow(t.ideology.governance - dissidentAff!.ideology!.governance, 2));
                                    return dist < 40; 
                                });

                                if (potentialTargets.length > 0) {
                                    potentialTargets.sort((a, b) => {
                                        const distA = Math.sqrt(Math.pow(a.ideology.economic - dissidentAff!.ideology!.economic, 2) + Math.pow(a.ideology.governance - dissidentAff!.ideology!.governance, 2));
                                        const distB = Math.sqrt(Math.pow(b.ideology.economic - dissidentAff!.ideology!.economic, 2) + Math.pow(b.ideology.governance - dissidentAff!.ideology!.governance, 2));
                                        return distA - distB;
                                    });
                                    targetParty = potentialTargets[0];
                                } else {
                                    formNewParty = true;
                                }
                            }
                            
                            if (formNewParty) {
                                let newPartyName = generatePartyName(dissidentAff);
                                let nameCounter = 1;
                                while (activeParties.some(ap => ap.name === newPartyName)) {
                                    newPartyName = `${newPartyName} (${nameCounter++})`;
                                }
                                
                                const res = handleAffiliationSecession(
                                    activeParties, activeCharacters, activeElectionResults,
                                    rebelAffiliationIds[0], dissidentLeader, 'new', { newPartyName }, date
                                );
                                activeParties = res.newParties;
                                activeCharacters = res.updatedCharacters;
                                activeElectionResults = res.newElectionResults;
                                
                                const createdPartyId = activeParties[activeParties.length - 1].id;
                                currentAffToPartyMap.set(rebelAffiliationIds[0], createdPartyId);
                                
                                for (let i = 1; i < rebelAffiliationIds.length; i++) {
                                    const affId = rebelAffiliationIds[i];
                                    const affLeader = activeCharacters.find(c => c.isAffiliationLeader && c.affiliationId === affId);
                                    if (affLeader) {
                                        const joinRes = handleAffiliationSecession(
                                            activeParties, activeCharacters, activeElectionResults,
                                            affId, affLeader, 'join', { targetPartyId: createdPartyId }, date
                                        );
                                        activeParties = joinRes.newParties;
                                        activeCharacters = joinRes.updatedCharacters;
                                        activeElectionResults = joinRes.newElectionResults;
                                        currentAffToPartyMap.set(affId, createdPartyId);
                                    }
                                }
                                addToLog('Party Schism', `${dissidentLeader.name} has led a faction split from ${p.name} to form ${newPartyName}.`, 'politics');
                            
                            } else if (targetParty) {
                                const res = handleAffiliationSecession(
                                    activeParties, activeCharacters, activeElectionResults,
                                    rebelAffiliationIds[0], dissidentLeader, 'join', { targetPartyId: targetParty.id }, date
                                );
                                activeParties = res.newParties;
                                activeCharacters = res.updatedCharacters;
                                activeElectionResults = res.newElectionResults;
                                currentAffToPartyMap.set(rebelAffiliationIds[0], targetParty.id);

                                for (let i = 1; i < rebelAffiliationIds.length; i++) {
                                    const affId = rebelAffiliationIds[i];
                                    const affLeader = activeCharacters.find(c => c.affiliationId === affId && c.isAlive);
                                    if (affLeader) {
                                        const joinRes = handleAffiliationSecession(
                                            activeParties, activeCharacters, activeElectionResults,
                                            affId, affLeader, 'join', { targetPartyId: targetParty.id }, date
                                        );
                                        activeParties = joinRes.newParties;
                                        activeCharacters = joinRes.updatedCharacters;
                                        activeElectionResults = joinRes.newElectionResults;
                                        currentAffToPartyMap.set(affId, targetParty.id);
                                    }
                                }
                                addToLog('Party Defection', `${dissidentLeader.name} has led a faction split from ${p.name} to join ${targetParty.name}.`, 'politics');
                            }
                       }
                   }
               }
          }
      }

      // PHASE 3: Independent Alignment
      const initialIndependentAffs = AFFILIATIONS.filter(a => !currentAffToPartyMap.has(a.id));
      
      initialIndependentAffs.forEach(aff => {
          const affLeader = activeCharacters.find(c => c.isAffiliationLeader && c.affiliationId === aff.id && c.isAlive);
          if (!affLeader) return;

          const currentAffStats = affiliationsMap.get(aff.id);
          const myIdeology = currentAffStats?.ideology || aff.baseIdeology || { economic: 50, governance: 50 };

          const potentialParties = activeParties.filter(p => {
              if (!canAffiliationJoinParty(aff, p)) return false;
              const distEco = Math.abs(p.ideology.economic - myIdeology.economic);
              const distGov = Math.abs(p.ideology.governance - myIdeology.governance);
              const dist = Math.sqrt(distEco*distEco + distGov*distGov);
              return dist < 50; 
          });

          if (potentialParties.length > 0 && Math.random() < 0.90) { 
              potentialParties.sort((a, b) => {
                   const distA = Math.sqrt(Math.pow(a.ideology.economic - myIdeology.economic, 2) + Math.pow(a.ideology.governance - myIdeology.governance, 2));
                   const distB = Math.sqrt(Math.pow(b.ideology.economic - myIdeology.economic, 2) + Math.pow(b.ideology.governance - myIdeology.governance, 2));
                   return distA - distB;
              });
              const target = potentialParties[0];
              
              const res = handleAffiliationSecession(
                  activeParties, activeCharacters, activeElectionResults,
                  aff.id, affLeader, 'join', { targetPartyId: target.id }, date
              );
              
              activeParties = res.newParties;
              activeCharacters = res.updatedCharacters;
              activeElectionResults = res.newElectionResults;
              currentAffToPartyMap.set(aff.id, target.id);
              addToLog('Political Alignment', `The independent ${aff.name} faction has aligned with ${target.name}.`, 'politics');
          }
      });

      // PHASE 4: AI Alliance Formation
      const viableForAlliance = activeParties.filter(p => {
          const inAlliance = activeAlliances.find(a => a.memberPartyIds.includes(p.id));
          if (inAlliance && inAlliance.leaderPartyId !== p.id) return false; 
          const hasSeats = Array.from(activeElectionResults.values()).filter(id => id === p.id).length > 0;
          return hasSeats || p.leaderId; 
      });

      const processedForAlliance = new Set<string>();
      
      for (const p1 of viableForAlliance) {
          if (processedForAlliance.has(p1.id)) continue;

          const existingAlliance = activeAlliances.find(a => a.leaderPartyId === p1.id);
          
          let bestPartner: Party | null = null;
          let minDistance = 30;

          for (const p2 of viableForAlliance) {
              if (p1.id === p2.id || processedForAlliance.has(p2.id)) continue;
              if (activeAlliances.some(a => a.memberPartyIds.includes(p2.id))) continue;

              const relation = p1.relations.get(p2.id) || 50;
              if (relation < 70) continue; 

              const dist = Math.sqrt(Math.pow(p1.ideology.economic - p2.ideology.economic, 2) + Math.pow(p1.ideology.governance - p2.ideology.governance, 2));
              if (dist > minDistance) continue;

              const p1Strict = !!p1.ethnicityFocus;
              const p2Strict = !!p2.ethnicityFocus;
              if (p1Strict && p2Strict && p1.ethnicityFocus !== p2.ethnicityFocus) {
                  if (relation < 85) continue;
              }

              bestPartner = p2;
              minDistance = dist; 
              break; 
          }

          if (bestPartner && Math.random() < 0.05) { 
              if (!existingAlliance) {
                  if (!activeAlliances.some(a => a.memberPartyIds.includes(p1.id))) {
                      const allianceName = generateAllianceName();
                      const avgEco = (p1.ideology.economic + bestPartner.ideology.economic) / 2;
                      const avgGov = (p1.ideology.governance + bestPartner.ideology.governance) / 2;
                      const newAlliance: PoliticalAlliance = {
                          id: `alliance-${Date.now()}-${Math.random()}`,
                          name: allianceName,
                          type: 'Alliance',
                          memberPartyIds: [p1.id, bestPartner.id],
                          leaderPartyId: p1.id,
                          cohesion: 70, // Startup cohesion
                          ideology: { economic: avgEco, governance: avgGov },
                          formedDate: new Date(date)
                      };
                      
                      const allianceMembers = [p1, bestPartner];
                      const updatedAllianceMembers = distributeAllianceSeats(
                          newAlliance, allianceMembers, allSeatCodes,
                          demographicsMap, featuresMap, affiliationsMap, activeCharacters, strongholdMap
                      );
                      
                      activeParties = activeParties.map(p => {
                          const updated = updatedAllianceMembers.find(up => up.id === p.id);
                          return updated || p;
                      });

                      activeAlliances = [...activeAlliances, newAlliance];
                      processedForAlliance.add(p1.id);
                      processedForAlliance.add(bestPartner.id);
                      addToLog('New Alliance', `${p1.name} and ${bestPartner.name} have formed the "${allianceName}"!`, 'politics');
                  }
              }
          }
      }

      // PHASE 5: Independent Coalition (Form New Party)
      const remainingIndependentAffs = AFFILIATIONS.filter(a => !currentAffToPartyMap.has(a.id));
      const processedIndependents = new Set<string>();

      const indepStats = new Map<string, { totalInf: number, leader: Character | null }>();
      activeCharacters.forEach(c => {
          if (c.isAlive && !currentAffToPartyMap.has(c.affiliationId)) {
              const s = indepStats.get(c.affiliationId) || { totalInf: 0, leader: null };
              s.totalInf += c.influence;
              if (!s.leader || c.influence > s.leader.influence) s.leader = c;
              indepStats.set(c.affiliationId, s);
          }
      });

      const sortedIndependents = remainingIndependentAffs.sort((a,b) => {
          return (indepStats.get(b.id)?.totalInf || 0) - (indepStats.get(a.id)?.totalInf || 0);
      });

      for (const initiator of sortedIndependents) {
          if (processedIndependents.has(initiator.id)) continue;
          
          const stats = indepStats.get(initiator.id);
          if (!stats || stats.totalInf < 20 || !stats.leader) continue;

          const partners: Affiliation[] = [];
          
          for (const potential of sortedIndependents) {
              if (potential.id === initiator.id || processedIndependents.has(potential.id)) continue;
              
              const sameEth = initiator.ethnicity === potential.ethnicity;
              const i1 = affiliationsMap.get(initiator.id)?.ideology || initiator.baseIdeology!;
              const i2 = affiliationsMap.get(potential.id)?.ideology || potential.baseIdeology!;
              const dist = Math.sqrt(Math.pow(i1.economic - i2.economic, 2) + Math.pow(i1.governance - i2.governance, 2));
              
              if (sameEth || dist < 30) {
                  partners.push(potential);
              }
          }

          if (partners.length >= 2) {
               if (Math.random() > 0.1) continue;

               let partyName = generatePartyName(initiator); 
               if (activeParties.some(p => p.name === partyName)) {
                   partyName = `${partyName} (${date.getFullYear()})`;
               }

               const res1 = handleAffiliationSecession(
                  activeParties, activeCharacters, activeElectionResults,
                  initiator.id, stats.leader, 'new', { newPartyName: partyName }, date
               );
               activeParties = res1.newParties;
               activeCharacters = res1.updatedCharacters;
               activeElectionResults = res1.newElectionResults;
               
               const newParty = activeParties[activeParties.length - 1];
               currentAffToPartyMap.set(initiator.id, newParty.id);
               processedIndependents.add(initiator.id);
               
               const partnerNames: string[] = [];
               for (const partner of partners) {
                   const pStats = indepStats.get(partner.id);
                   const pLeader = pStats?.leader || activeCharacters.find(c => c.affiliationId === partner.id && c.isAlive);
                   
                   if (pLeader) {
                        const resP = handleAffiliationSecession(
                            activeParties, activeCharacters, activeElectionResults,
                            partner.id, pLeader, 'join', { targetPartyId: newParty.id }, date
                        );
                        activeParties = resP.newParties;
                        activeCharacters = resP.updatedCharacters;
                        activeElectionResults = resP.newElectionResults;
                        currentAffToPartyMap.set(partner.id, newParty.id);
                        processedIndependents.add(partner.id);
                        partnerNames.push(partner.name);
                   }
               }

               addToLog('Party Formation', `The ${initiator.name} has rallied ${partnerNames.join(', ')} to form the ${newParty.name}!`, 'politics');
          }
      }
      
      // PHASE 6: Alliance Full Merger
      const mergerResult = attemptAllianceMerger(activeAlliances, activeParties);
      if (mergerResult) {
          const { mergedParty, dissolvedAllianceId, removedPartyIds } = mergerResult;
          const oldPartyNames = activeParties.filter(p => removedPartyIds.includes(p.id)).map(p => p.name).join(', ');

          activeParties = activeParties.filter(p => !removedPartyIds.includes(p.id));
          activeParties.push(mergedParty);
          activeAlliances = activeAlliances.filter(a => a.id !== dissolvedAllianceId);

          const removedSet = new Set(removedPartyIds);
          const newMap = new Map(activeElectionResults);
          activeElectionResults.forEach((partyId, seatCode) => {
              if (removedSet.has(partyId)) {
                  newMap.set(seatCode, mergedParty.id);
              }
          });
          activeElectionResults = newMap;
          
          activeCharacters = activeCharacters.map(c => {
               if (mergedParty.affiliationIds.includes(c.affiliationId)) {
                   return { ...c, history: [...c.history, { date: date, event: `Party merged into ${mergedParty.name}.` }] };
               }
               return c;
          });

          addToLog('Historic Merger', `${oldPartyNames} have officially merged to form the single unified party: ${mergedParty.name}!`, 'politics');
      }

      // PHASE 7: Party Consolidation
      const currentSeatCounts = getPartySeatCounts(activeElectionResults, new Map(activeParties.map(p => [p.id, p])));
      const weakParties = activeParties.filter(p => (currentSeatCounts.get(p.id) || 0) === 0 && p.id !== playerParty?.id);
      const consolidationProcessed = new Set<string>();

      for (const weakP of weakParties) {
          if (consolidationProcessed.has(weakP.id)) continue;
          if (Math.random() > 0.0002) continue;

          let target: Party | null = null;
          let bestScore = -1;

          for (const otherP of activeParties) {
              if (otherP.id === weakP.id) continue;
              if (consolidationProcessed.has(otherP.id)) continue;
              if (otherP.id === playerParty?.id) continue;

              const weakPAffiliations = weakP.affiliationIds.map(id => AFFILIATIONS.find(a => a.id === id)).filter(Boolean) as Affiliation[];
              const canAllJoin = weakPAffiliations.every(aff => canAffiliationJoinParty(aff, otherP));
              if (!canAllJoin) continue;
              
              if (weakP.ethnicityFocus && !otherP.ethnicityFocus) continue;

              const dist = Math.sqrt(Math.pow(weakP.ideology.economic - otherP.ideology.economic, 2) + Math.pow(weakP.ideology.governance - otherP.ideology.governance, 2));
              if (dist > 25) continue;

              const rel = weakP.relations.get(otherP.id) || 50;
              if (rel < 40) continue;

              const seats = currentSeatCounts.get(otherP.id) || 0;
              const score = (seats * 20) + (100 - dist) + rel;
              
              if (score > bestScore) {
                  bestScore = score;
                  target = otherP;
              }
          }

          if (target) {
              const targetSeats = currentSeatCounts.get(target.id) || 0;
              
              if (targetSeats > 0) {
                  const res = handlePartyAbsorption(
                      activeParties, target.id, [weakP], [], activeElectionResults, activeCharacters, date
                  );
                  activeParties = res.newParties;
                  activeCharacters = res.updatedCharacters;
                  activeElectionResults = res.newElectionResults;
                  setHistoricalParties(prev => [...prev, ...res.removedParties]);
                  setPartyGraphLinks(prev => [...prev, ...res.newLinks]);
                  consolidationProcessed.add(weakP.id);
                  addToLog('Party Absorbed', `${weakP.name} has been absorbed by ${target.name} due to poor performance.`, 'politics');
              } else {
                  if (!consolidationProcessed.has(target.id)) {
                      const l1 = activeCharacters.find(c => c.id === weakP.leaderId);
                      const l2 = activeCharacters.find(c => c.id === target?.leaderId);
                      const newLeaderId = (l1?.influence || 0) > (l2?.influence || 0) ? weakP.leaderId : target.leaderId;
                      
                      const affId = weakP.affiliationIds[0] || target.affiliationIds[0];
                      const newName = generatePartyName(affiliationsMap.get(affId));
                      
                      const res = handlePartyMerger(
                          activeParties, weakP.id, [target], [], newName, newLeaderId || '', undefined,
                          activeElectionResults, activeCharacters, date
                      );
                      
                      activeParties = res.newParties;
                      activeCharacters = res.updatedCharacters;
                      activeElectionResults = res.newElectionResults;
                      
                      setHistoricalParties(prev => [...prev, ...res.removedParties]);
                      setPartyGraphLinks(prev => [...prev, ...res.newLinks]);
                      consolidationProcessed.add(weakP.id);
                      consolidationProcessed.add(target.id);
                      addToLog('Party Merger', `${weakP.name} and ${target.name} have merged to form ${newName} to pool resources.`, 'politics');
                  }
              }
          }
      }

      unstable_batchedUpdates(() => {
          setParties(activeParties);
          setCharacters(activeCharacters);
          setElectionResults(activeElectionResults);
          setAlliances(activeAlliances);
      });
  };

  const handleStatePartyElections = (date: Date) => {
      let updatedParties = [...parties];
      let updatedCharacters = [...characters];
      const allRoleChanges: { charId: string, event: string }[] = [];

      updatedParties = updatedParties.map(p => {
          const { updatedParty, roleChanges } = electStateLeadersAndExecutives(p, updatedCharacters, uniqueStates, date);
          roleChanges.forEach(rc => allRoleChanges.push(rc));
          return updatedParty;
      });

      const changesMap = new Map<string, string[]>();
      allRoleChanges.forEach(rc => {
          if (!changesMap.has(rc.charId)) changesMap.set(rc.charId, []);
          changesMap.get(rc.charId)?.push(rc.event);
      });

      updatedCharacters = updatedCharacters.map(c => {
          const events = changesMap.get(c.id);
          if (events) {
              const newEntries = events.map(e => ({ date: date, event: e }));
              return { ...c, history: [...c.history, ...newEntries] };
          }
          return c;
      });
      
      updatedCharacters = updateAffiliationLeaders(updatedCharacters, AFFILIATIONS);

      setParties(updatedParties);
      setCharacters(updatedCharacters);
  };
  
  const handlePartyElectionAuto = (party: Party, date: Date) => {
      const partyMembers = characters.filter(c => party.affiliationIds.includes(c.affiliationId) && c.isAlive);
      const candidates = partyMembers.filter(c => {
          const isStateLeader = party.stateBranches.some(b => b.leaderId === c.id);
          const isIncumbent = party.leaderId === c.id;
          return isStateLeader || isIncumbent;
      });

      const validVoterIds = new Set<string>();
      party.stateBranches.forEach(branch => {
          if (branch.leaderId) validVoterIds.add(branch.leaderId);
          branch.executiveIds.forEach(id => validVoterIds.add(id));
      });
      characters.forEach(c => {
         if (c.isAffiliationLeader && party.affiliationIds.includes(c.affiliationId) && c.isAlive) {
             validVoterIds.add(c.id);
         }
      });
      const voters = characters.filter(c => validVoterIds.has(c.id) && c.isAlive);
      
      const chiefMinisterId = government?.chiefMinisterId;

      const { leaderId, deputyLeaderId } = conductPartyLeadershipElection(voters, candidates, party, chiefMinisterId);
      
      setParties(prev => prev.map(p => {
         if (p.id === party.id) {
             let newLeaderHistory = [...p.leaderHistory];
             if (leaderId !== p.leaderId && leaderId) {
                 if (newLeaderHistory.length > 0) {
                     const lastEntry = newLeaderHistory[newLeaderHistory.length - 1];
                     if (!lastEntry.endDate) {
                        newLeaderHistory[newLeaderHistory.length - 1] = { ...lastEntry, endDate: date };
                     }
                 }
                 newLeaderHistory.push({ 
                     leaderId, 
                     name: characters.find(c=>c.id===leaderId)?.name || 'Unknown', 
                     startDate: date 
                 });
             }

             return { ...p, leaderId, deputyLeaderId, leaderHistory: newLeaderHistory };
         }
         return p;
     }));

     if (leaderId) {
         setCharacters(prev => prev.map(c => {
             if (c.id === leaderId) return { ...c, history: [...c.history, { date, event: `Elected National Leader of ${party.name}.` }]};
             if (c.id === deputyLeaderId) return { ...c, history: [...c.history, { date, event: `Elected Deputy Leader of ${party.name}.` }]};
             return c;
         }));

         // Update National PM if this party leads the national government
         setGovernment(prevGov => {
             if (prevGov && prevGov.rulingCoalitionIds[0] === party.id) {
                 const candidateIsMP = characters.some(c => c.id === leaderId && c.isMP);
                 let newPmId = leaderId;
                 
                 if (!candidateIsMP) {
                     const partyMPs = characters.filter(c => c.isMP && party.affiliationIds.includes(c.affiliationId));
                     partyMPs.sort((a, b) => b.influence - a.influence);
                     if (partyMPs.length > 0) {
                         newPmId = partyMPs[0].id;
                     } else {
                         newPmId = prevGov.chiefMinisterId;
                     }
                 }

                 if (prevGov.chiefMinisterId !== newPmId) {
                     const newHistory = [...(prevGov.pmHistory || [])];
                     if (newHistory.length > 0) {
                         newHistory[newHistory.length - 1].endDate = date;
                     }
                     newHistory.push({ pmId: newPmId, startDate: date, partyId: party.id, cabinet: [...prevGov.cabinet] });
                     return { ...prevGov, chiefMinisterId: newPmId, pmHistory: newHistory };
                 }
             }
             return prevGov;
         });
     }
  };

  const runAIStrategies = () => {
      let currentPartiesMap = new Map<string, Party>(parties.map(p => [p.id, p]));
      const allianceMap = new Map<string, string>(); 
      
      alliances.forEach(a => {
          a.memberPartyIds.forEach(pid => allianceMap.set(pid, a.id));
      });

      const processedPartyIds = new Set<string>();

      alliances.forEach(alliance => {
          const members = alliance.memberPartyIds.map(id => currentPartiesMap.get(id)).filter(Boolean) as Party[];
          if (members.length > 0) {
              const distributedMembers = distributeAllianceSeats(
                  alliance, members, allSeatCodes, demographicsMap, featuresMap, affiliationsMap, characters, strongholdMap
              );
              
              distributedMembers.forEach(p => {
                  currentPartiesMap.set(p.id, p);
                  processedPartyIds.add(p.id);
              });
          }
      });

      let finalParties = Array.from(currentPartiesMap.values());
      let updatedCharacters = [...characters];

      finalParties = finalParties.map(party => {
          let skipStrategy = false;
          const skipAffiliationIds: string[] = [];

          if (playerParty && party.id === playerParty.id && playerCharacter) {
              if (playerCharacter.id === party.leaderId) skipStrategy = true;
              if (playerCharacter.isAffiliationLeader) skipAffiliationIds.push(playerCharacter.affiliationId);
          }
          
          if (allianceMap.has(party.id) && !skipStrategy) {
             skipStrategy = true; 
          }

          const { updatedParty, historyUpdates } = aiFullElectionStrategy(
              party, updatedCharacters, allSeatCodes, featuresMap, demographicsMap,
              affiliationsMap, currentDate, strongholdMap, skipStrategy, skipAffiliationIds
          );
          
          historyUpdates.forEach(update => {
              const charIndex = updatedCharacters.findIndex(c => c.id === update.charId);
              if (charIndex !== -1) {
                  updatedCharacters[charIndex] = {
                      ...updatedCharacters[charIndex],
                      history: [...updatedCharacters[charIndex].history, update.entry]
                  };
              }
          });

          return updatedParty;
      });

      setParties(finalParties);
      setCharacters(updatedCharacters);
  };
const ELIGIBLE_AFFIL_THRESHOLD = 2;
  const generateInitialNPCs = (playerChar: Character | null, startDate: Date, initialParties?: Party[]) => {
  const newNPCs: Character[] = [];
  console.log('Generating NPCs...', { startDate, playerChar, initialPartiesLen: initialParties?.length, partiesLen: parties.length });


  // Group seat codes by state - using dynamic features state to respect KL separation and Malaysia formation dynamically
  const activeFeatures = getFeaturesForDate(startDate);
  const seatsByState = new Map<string, string[]>();
  activeFeatures.forEach(seat => {
    const seatCode = seat.properties.UNIQUECODE;
    const state = seat.properties.NEGERI || 'Unknown';
    if (seatCode) {
        if (!seatsByState.has(state)) seatsByState.set(state, []);
        seatsByState.get(state)!.push(seatCode);
    }
  });

  // For each state, determine eligible affiliations and generate one character per affiliation
  seatsByState.forEach((stateSeatCodes, state) => {
    const isBorneo = state === 'SABAH' || state === 'SARAWAK';
    const isMainland = !isBorneo;

    // Aggregate demographics across all seats in the state (simple average)
    let totalMalay = 0, totalChinese = 0, totalIndian = 0, totalOrangAsli = 0, count = 0;
    let totalSabahMuslim = 0, totalSabahNonMuslim = 0, totalSarawakMuslim = 0, totalSarawakNonMuslim = 0;
    stateSeatCodes.forEach(seatCode => {
      const demo = demographicsMap.get(seatCode);
      if (demo) {
        totalMalay += demo.malayPercent;
        totalChinese += demo.chinesePercent;
        totalIndian += demo.indiansPercent;
        totalOrangAsli += demo.orangAsliPercent || 0;
        totalSabahMuslim += demo.bumiputeraSabahMuslimPercent || 0;
        totalSabahNonMuslim += demo.bumiputeraSabahNonMuslimPercent || 0;
        totalSarawakMuslim += demo.bumiputeraSarawakMuslimPercent || 0;
        totalSarawakNonMuslim += demo.bumiputeraSarawakNonMuslimPercent || 0;
        count++;
      }
    });

    const avgMalay   = count > 0 ? totalMalay   / count : 0;
    const avgChinese = count > 0 ? totalChinese / count : 0;
    const avgIndian  = count > 0 ? totalIndian  / count : 0;
    const avgOrangAsli=count > 0 ? totalOrangAsli / count : 0;
    
    const avgSabahMuslim = count > 0 ? totalSabahMuslim / count : 0;
    const avgSabahNonMuslim = count > 0 ? totalSabahNonMuslim / count : 0;
    const avgSarawakMuslim = count > 0 ? totalSarawakMuslim / count : 0;
    const avgSarawakNonMuslim = count > 0 ? totalSarawakNonMuslim / count : 0;

    const getPopPct = (aff: Affiliation) => {
    const isMainlandEthnicity = 
        aff.ethnicity === 'Malay' || 
        aff.ethnicity === 'Chinese' || 
        aff.ethnicity === 'Indian' ||
        aff.ethnicity === 'Orang Asli' ||
        aff.ethnicity === 'Multi-Racial';

    const isSabahEthnicity = 
        aff.ethnicity === 'Bumiputera Sabah (Muslim)' || 
        aff.ethnicity === 'Sabahan Chinese' || 
        aff.ethnicity === 'Bumiputera Sabah (Non-Muslim)' ||
        aff.ethnicity === 'Multi-Racial (Sabah)';

    const isSarawakEthnicity = 
        aff.ethnicity === 'Bumiputera Sarawak (Muslim)' || 
        aff.ethnicity === 'Sarawakian Chinese' || 
        aff.ethnicity === 'Bumiputera Sarawak (Non-Muslim)' ||
        aff.ethnicity === 'Multi-Racial (Sarawak)';

    const isBorneoEthnicity = isSabahEthnicity || isSarawakEthnicity;

    if (isMainlandEthnicity && isBorneo)            return 0;
    if (isBorneoEthnicity   && isMainland)          return 0;
    if (isSabahEthnicity    && state === 'SARAWAK') return 0;
    if (isSarawakEthnicity  && state === 'SABAH')   return 0;

    if (isMainlandEthnicity && isMainland) {
        if (aff.ethnicity === 'Malay')   return avgMalay;
        if (aff.ethnicity === 'Chinese') return avgChinese;
        if (aff.ethnicity === 'Indian')  return avgIndian;
        if (aff.ethnicity === 'Orang Asli') return avgOrangAsli;
        if (aff.ethnicity === 'Multi-Racial') return 100;
    }

    if (isBorneo) {
        if (aff.ethnicity === 'Bumiputera Sabah (Muslim)') return avgSabahMuslim;
        if (aff.ethnicity === 'Bumiputera Sabah (Non-Muslim)') return avgSabahNonMuslim;
        if (aff.ethnicity === 'Bumiputera Sarawak (Muslim)') return avgSarawakMuslim;
        if (aff.ethnicity === 'Bumiputera Sarawak (Non-Muslim)') return avgSarawakNonMuslim;
        if (aff.ethnicity === 'Sabahan Malay' || aff.ethnicity === 'Sarawakian Malay') return avgMalay;
        if (aff.ethnicity === 'Sabahan Chinese' || aff.ethnicity === 'Sarawakian Chinese') return avgChinese;
        if (aff.ethnicity === 'Multi-Racial (Sabah)' && state === 'SABAH') return 100;
        if (aff.ethnicity === 'Multi-Racial (Sarawak)' && state === 'SARAWAK') return 100;
        
        return 0; // Default if no other condition matches within Borneo
    }

    return 0;
    };

    // Determine eligible affiliations for this state
    const eligibleAffs = AFFILIATIONS.filter(aff => {
      if (aff.ethnicity === 'Orang Asli') {
        return stateSeatCodes.some(c => (demographicsMap.get(c)?.orangAsliPercent || 0) > 2);
      }
      return getPopPct(aff) >= ELIGIBLE_AFFIL_THRESHOLD;
    }).sort((a, b) => getPopPct(b) - getPopPct(a));

    // Distribute characters across seats in the state (round-robin)
    let seatIndex = 0;
    // Distribute characters across seats in the state (round-robin, 4 per affiliation)
    for (const affiliation of eligibleAffs) {
    for (let i = 0; i < 6; i++) {
        let assignedSeatCode = stateSeatCodes[seatIndex % stateSeatCodes.length];

        let validSeats = stateSeatCodes;
        if (affiliation.ethnicity === 'Orang Asli') {
            const seatsWithOA = stateSeatCodes.filter(c => (demographicsMap.get(c)?.orangAsliPercent || 0) > 2);
            if (seatsWithOA.length > 0) validSeats = seatsWithOA;
        }

        assignedSeatCode = validSeats[seatIndex % validSeats.length];

        if (assignedSeatCode === playerChar?.currentSeatCode && validSeats.length > 1) {
            seatIndex++;
            assignedSeatCode = validSeats[seatIndex % validSeats.length];
        }

        const baseIdeology = affiliation.baseIdeology ?? { economic: 50, governance: 50 };
        const ideology: Ideology = {
        economic:   Math.max(0, Math.min(100, baseIdeology.economic   + (Math.random() * 30 - 15))),
        governance: Math.max(0, Math.min(100, baseIdeology.governance + (Math.random() * 30 - 15))),
        };

        newNPCs.push({
        id: `npc-${assignedSeatCode}-${affiliation.id}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        name: generateCharacterName(affiliation.ethnicity),
        affiliationId: affiliation.id,
        ethnicity: affiliation.ethnicity,
        state,
        currentSeatCode: assignedSeatCode,
        charisma:    20 + Math.floor(Math.random() * 60),
        influence:   10 + Math.floor(Math.random() * 50),
        recognition:  5 + Math.floor(Math.random() * 30),
        dateOfBirth: new Date(
            startDate.getFullYear() - (25 + Math.floor(Math.random() * 30)),
            Math.floor(Math.random() * 12),
            1
        ),
        isAlive: true,
        isPlayer: false,
        isMP: false,
        history: [],
        ideology,
        });

        seatIndex++;
    }
    }
  });

  // Party leadership assignment (unchanged)
  const targetParties = initialParties || parties;
  const updatedParties = targetParties.map(originalParty => {
    const p = { 
        ...originalParty, 
        relations: new Map(originalParty.relations), 
        contestedSeats: new Map(originalParty.contestedSeats), 
        stateBranches: [...originalParty.stateBranches], 
        leaderHistory: [...originalParty.leaderHistory] 
    };
    const members = newNPCs.filter(c => p.affiliationIds.includes(c.affiliationId));
    if (members.length > 0) {
      members.sort((a, b) => b.influence - a.influence);
      p.leaderId = members[0].id;
      p.deputyLeaderId = members.length > 1 ? members[1].id : undefined;
      if (p.leaderId) {
        const leader = members[0];
        leader.history.push({ date: startDate, event: `Became the leader of ${p.name}.` });
        p.leaderHistory = [{ leaderId: leader.id, name: leader.name, startDate: startDate }];
      }
    }
    const allianceFounders = ['umno', 'mca', 'mic'];
    if (allianceFounders.includes(p.id)) p.unity = 100;
    return p;
  });

  let partiesWithRelations = initializePartyRelations(updatedParties);
  partiesWithRelations = partiesWithRelations.map(p => {
    const allianceFounders = ['umno', 'mca', 'mic'];
    if (allianceFounders.includes(p.id)) {
      const newRelations = new Map(p.relations);
      allianceFounders.forEach(allyId => {
        if (allyId !== p.id) newRelations.set(allyId, 100);
      });
      return { ...p, relations: newRelations };
    }
    return p;
  });

  setParties(partiesWithRelations);
  return newNPCs;
};

  const handleStartGame = (scenarioId: string) => {
      const scenario = ALL_SCENARIOS.find(s => s.id === scenarioId) || ALL_SCENARIOS[0];
      const startDate = new Date(scenario.date);
      setGameStartDate(startDate);
      setCurrentDate(startDate);
      setRegimeStartDate(startDate);
      const activeFeatures = getFeaturesForDate(startDate);
      setFeatures(activeFeatures);
      setNextPartyElectionDate(new Date(startDate.getFullYear() + 2, 5, 15));
      setFormedScheduledPartyIds(new Set());
      formedScheduledPartyIdsRef.current = new Set();
      setParties(scenario.parties);
      setAlliances(scenario.alliances);
      if (scenario.initialEconomicState) {
          setEconomicState(scenario.initialEconomicState);
      }
      setGameState('party-selection');
  };
  
  const handleSpectatorStart = (scenarioId: string) => {
      const scenario = ALL_SCENARIOS.find(s => s.id === scenarioId) || ALL_SCENARIOS[0];
      const startDate = new Date(scenario.date);
      setGameStartDate(startDate);
      setCurrentDate(startDate);
      setRegimeStartDate(startDate);
      const activeFeatures = getFeaturesForDate(startDate);
      setFeatures(activeFeatures);
      setNextPartyElectionDate(new Date(startDate.getFullYear() + 2, 5, 15));
      setFormedScheduledPartyIds(new Set());
      formedScheduledPartyIdsRef.current = new Set();
      const initialParties = scenario.parties;
      setParties(scenario.parties);
      setAlliances(scenario.alliances);
      if (scenario.initialEconomicState) {
          setEconomicState(scenario.initialEconomicState);
      }
      const npcs = generateInitialNPCs(null, startDate, initialParties);
      let allCharacters = npcs;
      
      allCharacters = updateAffiliationLeaders(allCharacters, AFFILIATIONS);
      const updatedAffiliations = updateAffiliationIdeologies(allCharacters, AFFILIATIONS);
      setAffiliationsMap(new Map(updatedAffiliations.map(a => [a.id, a])));
      setParties(prev => updatePartyIdeologies(prev, updatedAffiliations));

      setCharacters(allCharacters);
      setPlayerCharacterId(null);
      setObserveMode(true);
      setGameState('game');
  };
  
  const handlePartySelect = (party: Party) => {
      setSelectedPartyId(party.id); 
      setGameState('character-selection');
  };

  const handleCharacterSelect = (char: Omit<Character, 'currentSeatCode' | 'dateOfBirth' | 'isAlive' | 'ideology'>) => {
      const dob = new Date(currentDate.getFullYear() - (25 + Math.floor(Math.random() * 30)), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28));
      const affiliation = affiliationsMap.get(char.affiliationId);
      const baseIdeology = affiliation?.baseIdeology || { economic: 50, governance: 50 };

      const partialCharacter: Omit<Character, 'currentSeatCode'> = {
          ...char,
          dateOfBirth: dob,
          isAlive: true,
          isPlayer: true,
          ideology: {
              economic: Math.max(0, Math.min(100, baseIdeology.economic + (Math.random() * 10 - 5))),
              governance: Math.max(0, Math.min(100, baseIdeology.governance + (Math.random() * 10 - 5)))
          }
      };
      
      setPendingCharacter(partialCharacter);
      setGameState('position-selection');
  };

  const handlePositionSelect = (seatCode: string) => {
      if (!pendingCharacter) return;

      const newPlayerCharacter: Character = {
          ...pendingCharacter,
          currentSeatCode: seatCode,
      };

      const npcs = generateInitialNPCs(newPlayerCharacter, currentDate);
      
      let allCharacters = [newPlayerCharacter, ...npcs];
      allCharacters = updateAffiliationLeaders(allCharacters, AFFILIATIONS);
      
      const updatedAffiliations = updateAffiliationIdeologies(allCharacters, AFFILIATIONS);
      setAffiliationsMap(new Map(updatedAffiliations.map(a => [a.id, a])));
      setParties(prev => updatePartyIdeologies(prev, updatedAffiliations));

      setCharacters(allCharacters);
      setPlayerCharacterId(newPlayerCharacter.id);
      setPendingCharacter(null);
      setGameState('game');
      setSelectedSeatCode(seatCode);
  };

  const handleStateElections = (electionDay: Date, parliamentResults: ElectionResults, currentParties: Party[], currentCharacters: Character[]) => {
      const states = getUniqueStates(features);
      const newGovernments = new Map(stateGovernments);
      const newHistoryMap = new Map<string, StateElectionHistoryEntry[]>(stateElectionHistoryMap);

      // Determine the winning federal party (party with most seats in parliament)
      const seatCounts = new Map<string, number>();
      parliamentResults.forEach((partyId) => {
          seatCounts.set(partyId, (seatCounts.get(partyId) || 0) + 1);
      });
      let maxFederalSeats = -1;
      let federalWinnerPartyId = '';
      seatCounts.forEach((count, pid) => {
          if (count > maxFederalSeats) {
              maxFederalSeats = count;
              federalWinnerPartyId = pid;
          }
      });

      states.forEach(state => {
          if (getStateTotalDunSeats(state) === 0) return; // Skip Federal Territories
          const seatDist = simulateStateElectionResults(state, parliamentResults, features, currentParties, currentCharacters);
          const previousGov = stateGovernments.get(state);
          const gov = formStateGovernment(state, seatDist, currentParties, currentCharacters, alliances, electionDay, previousGov, federalWinnerPartyId);
          newGovernments.set(state, gov);

          const snapshot = buildStateElectionSnapshot(gov, currentParties, electionDay);
          newHistoryMap.set(state, [...(newHistoryMap.get(state) || []), snapshot]);

          if (state === 'W.P. KUALA LUMPUR') {
              const mayorChar = currentCharacters.find(c => c.id === gov.chiefMinisterId);
              const mayorName = mayorChar?.name || 'Vacant';
              addToLog('City Council Formation', `W.P. KUALA LUMPUR: City Council established with ${mayorName} appointed as City Mayor by the federal election winner.`, 'election');
          } else {
              const winnerId = gov.rulingCoalitionIds[0];
              const winnerName = partiesMap.get(winnerId)?.name || winnerId;
              addToLog('State Election', `${state}: ${winnerName} forms the state government.`, 'election');
          }
      });

      setStateGovernments(newGovernments);
      setStateElectionHistoryMap(newHistoryMap);
  };

  const handleGeneralElection = (electionDay: Date) => {
    const parties = gameStateRef.current.parties;
    const characters = gameStateRef.current.characters;
    setGameState('election-results');
    setSnapElectionDate(null);
    setGovernment((prev) => {
        previousGovernmentRef.current = prev;
        return null;
    });
    setHasPlayerManagedStrategy(false);
    setHasRunPostElectionStrategy(false);
    setHasPlayerManagedAffiliation(false);
    
    const updatedParties = parties.map(p => {
        const cost = p.contestedSeats.size * SEAT_CONTEST_COST;
        return { ...p, funds: Math.max(0, p.funds - cost) };
    });

    const candidateSeatMoves = new Map<string, string>();
    updatedParties.forEach(p => {
        p.contestedSeats.forEach((data, seatCode) => {
            if (data.candidateId) {
                candidateSeatMoves.set(data.candidateId, seatCode);
            }
        });
    });

    const charactersForElection = characters.map(c => {
        const targetSeat = candidateSeatMoves.get(c.id);
        if (targetSeat && targetSeat !== c.currentSeatCode) {
            return { ...c, currentSeatCode: targetSeat };
        }
        return c;
    });

    // --- AI Campaign Investments ---
    const partiesWithInvestments = updatedParties.map(p => {
        if (p.id === playerPartyRef.current?.id) return p;

        let availableFunds = p.funds - 100000; // keep 100k reserve
        const investments = new Map<string, number>();
        const contestedSeats: string[] = Array.from(p.contestedSeats.keys());
        
        if (availableFunds >= 100000 && contestedSeats.length > 0) {
            // Find seats with highest base influence to push them over the edge, 
            // or defend incumbent seats.
            const seatScores = contestedSeats.map(seatCode => {
                const chars = charactersForElection.filter(c => c.currentSeatCode === seatCode && c.isAlive);
                const myAffiliations = p.affiliationIds;
                const myInf = chars.filter(c => myAffiliations.includes(c.affiliationId)).reduce((sum, c) => sum + c.influence + c.recognition, 0);
                const isIncumbent = chars.some(c => myAffiliations.includes(c.affiliationId) && c.isMP);
                return { seatCode, myInf, isIncumbent };
            });
            
            // Sort by highest expected influence + incumbent bias
            seatScores.sort((a, b) => {
                 const scoreA = a.myInf + (a.isIncumbent ? 200 : 0);
                 const scoreB = b.myInf + (b.isIncumbent ? 200 : 0);
                 return scoreB - scoreA; 
            });

            // Invest chunks in top priorities
            for (const seat of seatScores) {
                if (availableFunds < 100000) break;
                // Invest up to 300k max per seat if we have tons of money, else 100k
                let amountToInvest = 100000;
                if (availableFunds >= 500000) amountToInvest = 300000;
                else if (availableFunds >= 300000) amountToInvest = 200000;
                
                investments.set(seat.seatCode, amountToInvest);
                availableFunds -= amountToInvest;
            }
        }
        
        const totalInvested = Array.from(investments.values()).reduce((sum, val) => sum + val, 0);
        if (investments.size === 0 && (!p.campaignInvestments || p.campaignInvestments.size === 0)) return p;
        return { 
            ...p, 
            funds: p.funds - totalInvested, 
            campaignInvestments: investments.size > 0 ? investments : undefined 
        };
    });
    
    setParties(partiesWithInvestments);

    const newWinningPartyResults = new Map<string, string>(); 
    const newDetailedResults = new Map<string, Map<string, number>>(); 
    const seatWinners = new Map<string, SeatWinner>();
    const newSeatCandidates = new Map<string, Map<string, { id: string, name: string }>>();
    const newMPs = new Set<string>();
    let totalCurrentVotes = 0;
    let totalElectors = 0;

    const allianceMemberMap = allianceToPartyMapRef.current;

    const allSeatVotes = new Map<string, Map<string, number>>(); 

    allSeatCodes.forEach(seatCode => {
        const seatFeature = featuresMap.get(seatCode);
        const demographics = demographicsMap.get(seatCode);
        if (!seatFeature) return;

        const electorate = demographics ? demographics.totalElectors : 10000; 
        totalElectors += electorate;

        const partyInfluenceScores = new Map<string, number>();
        const charactersInSeat = charactersForElection.filter(c => c.currentSeatCode === seatCode && c.isAlive);
        const contestingPartiesInSeat = partiesWithInvestments.filter(p => p.contestedSeats.has(seatCode));
        const seatCandidateMap = new Map<string, { id: string, name: string }>();

        contestingPartiesInSeat.forEach(contestingParty => {
            let partyTotal = 0;
            const allianceMembers = allianceMemberMap.get(contestingParty.id);
            
            const allianceId = alliances.find(a => a.memberPartyIds.includes(contestingParty.id))?.id;
            if (allianceId) {
                const seatAllocatedToOther = contestingPartiesInSeat.some(other => 
                    other.id !== contestingParty.id && 
                    alliances.find(a => a.memberPartyIds.includes(other.id))?.id === allianceId
                );
                const thisPartyAllocated = contestingParty.contestedSeats.has(seatCode);
                if (seatAllocatedToOther && !thisPartyAllocated) {
                    return;
                }
            }

            const contestData = contestingParty.contestedSeats.get(seatCode);
            if (contestData?.candidateId) {
                const candidate = charactersForElection.find(c => c.id === contestData.candidateId);
                if (candidate) {
                     seatCandidateMap.set(contestingParty.id, { id: candidate.id, name: candidate.name });
                }
            }

            charactersInSeat.forEach(char => {
                const charPartyId = affiliationToPartyMap.get(char.affiliationId);
                if (!charPartyId) return;

                const isContributor = (charPartyId === contestingParty.id) || (allianceMembers && charPartyId && allianceMemberMap.get(charPartyId) === allianceMembers);

                if (isContributor) {
                     const charInfluence = calculateEffectiveInfluence(
                         char, seatFeature, demographics || null, affiliationsMap,
                         strongholdMap, contestData?.candidateId, contestData?.allocatedAffiliationId,
                         contestingParty.campaignInvestments?.get(seatCode)
                     );
                     partyTotal += charInfluence;
                }
            });
            
            partyInfluenceScores.set(contestingParty.id, partyTotal);
        });
        
        newSeatCandidates.set(seatCode, seatCandidateMap);

        const rulingCoalitionSet = new Set<string>(government?.rulingCoalitionIds ?? []);

        const finalPartyScores = new Map<string, number>();
        let finalTotalScore = 0;

        const baseTurnout = 0.65;
        const turnoutVariance = Math.random() * 0.20;
        const turnoutRate = baseTurnout + turnoutVariance;
        const validVotes = Math.floor(electorate * turnoutRate);

        partyInfluenceScores.forEach((score, pId) => {
            // Increased variance for more dynamic and exciting elections (0.7 to 1.3)
            const variance = 0.70 + (Math.random() * 0.6);
            const isRulingParty = rulingCoalitionSet.has(pId) ||
                (government && alliances.some(a =>
                    a.memberPartyIds.includes(pId) &&
                    a.memberPartyIds.some(id => rulingCoalitionSet.has(id))
                ));
            const complexEcon = economicState as ComplexEconomicState;
            // Higher impact of economy on incumbents
            const economicMultiplier = getElectionEconomicMultiplier(
                !!isRulingParty,
                economicState.publicApproval,
                complexEcon.momentum
            );
            const adjustedScore = score * variance * economicMultiplier;
            finalPartyScores.set(pId, adjustedScore);
            finalTotalScore += adjustedScore;
        });

        const seatVotes = new Map<string, number>();
        let seatTotalVotes = 0;

        if (finalTotalScore > 0) {
            finalPartyScores.forEach((score, pId) => {
                const votes = Math.floor((score / finalTotalScore) * validVotes);
                seatVotes.set(pId, votes);
                seatTotalVotes += votes;
            });
        }

        allSeatVotes.set(seatCode, seatVotes);
        newDetailedResults.set(seatCode, seatVotes);
        totalCurrentVotes += seatTotalVotes;
    });

    const seatAllocations = new Map<string, string>(); 

    if (electionSystem === 'FPTP') {
        allSeatVotes.forEach((votesMap, seatCode) => {
             let maxVotes = -1;
             let winningPartyId = '';

             votesMap.forEach((votes, pId) => {
                 if (votes > maxVotes) {
                     maxVotes = votes;
                     winningPartyId = pId;
                 }
             });

             if (winningPartyId) {
                 seatAllocations.set(seatCode, winningPartyId);
             }
        });
    } else if (electionSystem === 'PR') {
        const nationalVotes = new Map<string, number>();
        let totalNationalVotes = 0;

        allSeatVotes.forEach((votesMap) => {
            votesMap.forEach((votes, pId) => {
                nationalVotes.set(pId, (nationalVotes.get(pId) || 0) + votes);
                totalNationalVotes += votes;
            });
        });

        const totalSeats = allSeatCodes.length;
        const targetSeats = new Map<string, number>();
        const remainders = new Map<string, number>();
        let allocatedCount = 0;

        nationalVotes.forEach((votes, pId) => {
            const share = (votes / totalNationalVotes) * totalSeats;
            const seats = Math.floor(share);
            targetSeats.set(pId, seats);
            remainders.set(pId, share - seats);
            allocatedCount += seats;
        });

        const sortedRemainders = [...remainders.entries()].sort((a,b) => b[1] - a[1]);
        let rIndex = 0;
        while (allocatedCount < totalSeats && rIndex < sortedRemainders.length) {
            const pId = sortedRemainders[rIndex][0];
            targetSeats.set(pId, (targetSeats.get(pId) || 0) + 1);
            allocatedCount++;
            rIndex++;
        }

        const performanceList: { seatCode: string, partyId: string, percent: number }[] = [];
        allSeatVotes.forEach((votesMap, seatCode) => {
            let seatTotal = 0;
            votesMap.forEach(v => seatTotal += v);
            if (seatTotal > 0) {
                votesMap.forEach((votes, pId) => {
                    performanceList.push({ seatCode, partyId: pId, percent: votes / seatTotal });
                });
            }
        });

        performanceList.sort((a, b) => b.percent - a.percent);

        const assignedSeats = new Set<string>();
        const partyWinCounts = new Map<string, number>();
        parties.forEach(p => partyWinCounts.set(p.id, 0));

        for (const perf of performanceList) {
            if (assignedSeats.has(perf.seatCode)) continue;
            const currentWins = partyWinCounts.get(perf.partyId) || 0;
            const quota = targetSeats.get(perf.partyId) || 0;
            
            if (currentWins < quota) {
                seatAllocations.set(perf.seatCode, perf.partyId);
                assignedSeats.add(perf.seatCode);
                partyWinCounts.set(perf.partyId, currentWins + 1);
            }
        }

        if (assignedSeats.size < totalSeats) {
             for (const perf of performanceList) {
                if (!assignedSeats.has(perf.seatCode)) {
                     seatAllocations.set(perf.seatCode, perf.partyId);
                     assignedSeats.add(perf.seatCode);
                }
             }
        }
    }
    
    const newStrongholdMap = new Map<string, SeatStronghold>(strongholdMap);

    seatAllocations.forEach((winningPartyId, seatCode) => {
        newWinningPartyResults.set(seatCode, winningPartyId);
        
        const party = partiesMap.get(winningPartyId);
        const contestData = party?.contestedSeats.get(seatCode);
        const candidateId = contestData?.candidateId;

        if (candidateId) {
            newMPs.add(candidateId);
             const candidate = charactersForElection.find(c => c.id === candidateId);
             if (candidate) {
                  seatWinners.set(seatCode, {
                      partyId: winningPartyId,
                      candidateId: candidateId,
                      candidateName: candidate.name
                  });
                  
                  const currentStronghold = newStrongholdMap.get(seatCode);
                  if (currentStronghold && currentStronghold.affiliationId === candidate.affiliationId) {
                      newStrongholdMap.set(seatCode, { affiliationId: candidate.affiliationId, terms: currentStronghold.terms + 1 });
                  } else {
                      newStrongholdMap.set(seatCode, { affiliationId: candidate.affiliationId, terms: 1 });
                  }
             }
        } else {
             newStrongholdMap.delete(seatCode);
        }
    });
    
    setStrongholdMap(newStrongholdMap);

    handleStateElections(electionDay, newWinningPartyResults, partiesWithInvestments, charactersForElection);

    const historyEntry: ElectionHistoryEntry = {
        date: electionDay,
        results: newWinningPartyResults,
        detailedResults: newDetailedResults,
        seatWinners: seatWinners,
        seatCandidates: newSeatCandidates,
        totalElectors: totalElectors,
        totalVotes: totalCurrentVotes,
        totalSeats: allSeatCodes.length,
        alliances: alliances.map(a => ({ id: a.id, name: a.name, memberPartyIds: a.memberPartyIds, type: a.type, leaderPartyId: a.leaderPartyId })),
        parties: parties.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color,
            funds: p.funds,
            unity: p.unity,
            ideology: p.ideology,
            leaderId: p.leaderId,
            affiliationIds: p.affiliationIds,
        })),
    };
    setElectionHistory(prevHistory => [...prevHistory, historyEntry]);

    setElectionResults(newWinningPartyResults);
    setDetailedElectionResults(newDetailedResults);

    const candidateContests = new Map<string, string>();
    parties.forEach(p => {
        p.contestedSeats.forEach((data, seatCode) => {
            if (data.candidateId) {
                candidateContests.set(data.candidateId, seatCode);
            }
        });
    });

    setCharacters(prevChars => {
         return prevChars.map(char => {
            const targetSeat = candidateSeatMoves.get(char.id);
            const wasMP = char.isMP;
            const isNowMP = newMPs.has(char.id);
            const contestedSeatCode = candidateContests.get(char.id);

            if (!isNowMP && !wasMP && !contestedSeatCode && (!targetSeat || targetSeat === char.currentSeatCode)) {
                return char;
            }

            let updatedChar = { ...char };
            if (targetSeat && targetSeat !== char.currentSeatCode) {
                updatedChar.currentSeatCode = targetSeat;
            }
            
            let newHistory = char.history;

            const seatName = contestedSeatCode ? featuresMap.get(contestedSeatCode)?.properties.PARLIMEN : (featuresMap.get(char.currentSeatCode)?.properties.PARLIMEN || 'Unknown');

            if (isNowMP) {
                 if (!wasMP) {
                     newHistory = [...newHistory, { date: electionDay, event: `Won election in ${seatName}, becoming a Member of Parliament.` }];
                 } else {
                     newHistory = [...newHistory, { date: electionDay, event: `Re-elected in ${seatName}.` }];
                 }
            } else {
                if (wasMP) {
                    if (contestedSeatCode) {
                        newHistory = [...newHistory, { date: electionDay, event: `Defeated in ${seatName}, losing seat.` }];
                    } else {
                         newHistory = [...newHistory, { date: electionDay, event: `Did not contest, losing seat.` }];
                    }
                } else if (contestedSeatCode) {
                     newHistory = [...newHistory, { date: electionDay, event: `Defeated in election for ${seatName}.` }];
                }
            }

            return { ...updatedChar, history: newHistory, isMP: isNowMP };
        });
    });

    setParties(prevParties => prevParties.map(p => {
        if (p.campaignInvestments === undefined) return p;
        return {
            ...p,
            campaignInvestments: undefined // Reset warchest investments after election
        };
    }));
  };

  const handlePartyElectionStart = (party: Party) => {
      const partyMembers = characters.filter(c => party.affiliationIds.includes(c.affiliationId) && c.isAlive);
      const candidates = partyMembers.filter(c => {
          const isStateLeader = party.stateBranches.some(b => b.leaderId === c.id);
          const isIncumbent = party.leaderId === c.id;
          return isStateLeader || isIncumbent;
      });
      
      setPartyElectionData({ party, candidates });
      setGameState('party-election-voting');
  };

  const handlePartyVote = (candidateId?: string) => {
     if (!partyElectionData) return;
     const currentElectionData = partyElectionData;
     const party = currentElectionData.party;

     const validVoterIds = new Set<string>();
     
     party.stateBranches.forEach(branch => {
         if (branch.leaderId) validVoterIds.add(branch.leaderId);
         branch.executiveIds.forEach(id => validVoterIds.add(id));
     });

     characters.forEach(c => {
         if (c.isAffiliationLeader && party.affiliationIds.includes(c.affiliationId) && c.isAlive) {
             validVoterIds.add(c.id);
         }
     });

     const voters = characters.filter(c => validVoterIds.has(c.id) && c.isAlive);
     const npcVoters = voters.filter(c => !c.isPlayer);
     
     const chiefMinisterId = government?.chiefMinisterId;
     const { leaderId, deputyLeaderId, voteTally } = conductPartyLeadershipElection(npcVoters, currentElectionData.candidates, currentElectionData.party, chiefMinisterId);
     
     const isPlayerEligible = playerCharacterId ? validVoterIds.has(playerCharacterId) : false;

     if (candidateId && isPlayerEligible) {
        const currentVotes = voteTally.get(candidateId) || 0;
        voteTally.set(candidateId, currentVotes + 1);
     }
     
     const sorted = Array.from(voteTally.entries()).sort((a,b) => b[1] - a[1]);
     const finalLeaderId = sorted.length > 0 ? sorted[0][0] : undefined;
     const finalDeputyId = sorted.length > 1 ? sorted[1][0] : undefined;
     
     setParties(prev => prev.map(p => {
         if (p.id === currentElectionData.party.id) {
             let newLeaderHistory = [...p.leaderHistory];
             if (finalLeaderId !== p.leaderId && finalLeaderId) {
                 if (newLeaderHistory.length > 0) {
                     const lastEntry = newLeaderHistory[newLeaderHistory.length - 1];
                     if (!lastEntry.endDate) {
                        newLeaderHistory[newLeaderHistory.length - 1] = { ...lastEntry, endDate: currentDate };
                     }
                 }
                 newLeaderHistory.push({ 
                     leaderId: finalLeaderId, 
                     name: characters.find(c=>c.id===finalLeaderId)?.name || 'Unknown', 
                     startDate: currentDate 
                 });
             }

             return { ...p, leaderId: finalLeaderId, deputyLeaderId: finalDeputyId, leaderHistory: newLeaderHistory };
         }
         return p;
     }));

     setCharacters(prev => prev.map(c => {
         if (c.id === finalLeaderId) return { ...c, history: [...c.history, { date: currentDate, event: `Elected National Leader of ${currentElectionData.party.name}.` }]};
         if (c.id === finalDeputyId) return { ...c, history: [...c.history, { date: currentDate, event: `Elected Deputy Leader of ${currentElectionData.party.name}.` }]};
         return c;
     }));

     // Update National PM if this party leads the national government
     if (finalLeaderId) {
         setGovernment(prevGov => {
             if (prevGov && prevGov.rulingCoalitionIds[0] === currentElectionData.party.id) {
                 const candidateIsMP = characters.some(c => c.id === finalLeaderId && c.isMP);
                 let newPmId = finalLeaderId;
                 
                 if (!candidateIsMP) {
                     const partyMPs = characters.filter(c => c.isMP && currentElectionData.party.affiliationIds.includes(c.affiliationId));
                     partyMPs.sort((a, b) => b.influence - a.influence);
                     if (partyMPs.length > 0) {
                         newPmId = partyMPs[0].id;
                     } else {
                         newPmId = prevGov.chiefMinisterId;
                     }
                 }

                 if (prevGov.chiefMinisterId !== newPmId) {
                     const newHistory = [...(prevGov.pmHistory || [])];
                     if (newHistory.length > 0) {
                         newHistory[newHistory.length - 1].endDate = currentDate;
                     }
                     newHistory.push({ pmId: newPmId, startDate: currentDate, partyId: currentElectionData.party.id, cabinet: [...prevGov.cabinet] });
                     return { ...prevGov, chiefMinisterId: newPmId, pmHistory: newHistory };
                 }
             }
             return prevGov;
         });
     }

     setPartyElectionData({ ...currentElectionData, voteTally, winnerId: finalLeaderId, deputyWinnerId: finalDeputyId });
     setGameState('party-election-results');
  };

  const handleSpeakerElectionStart = () => {
      const candidates = determineSpeakerCandidates(electionResults, parties, characters);
      setSpeakerElectionData({ candidates });
      setGameState('speaker-election-voting');
  };
  
  const handleSpeakerVote = (voteId?: string) => {
     if (!speakerElectionData) return;
     const currentElectionData = speakerElectionData; 

     const results = conductSpeakerVote(
         electionResults, parties, currentElectionData.candidates,
         affiliationToPartyMap, playerParty?.id || 'independent', voteId || ''
     );
     
     setCharacters(prev => prev.map(c => {
         if (c.id === results.winnerId) return { ...c, isMP: true, currentSeatCode: 'SPEAKER', history: [...c.history, { date: currentDate, event: 'Elected as Speaker of Parliament.' }] };
         return c;
     }));

     setSpeakerElectionData({ ...currentElectionData, results: { winner: currentElectionData.candidates.find(c => c.id === results.winnerId)!, tally: results.tally, breakdown: results.breakdown } });
     setGameState('speaker-election-results');
  };

  const handleEconomicPolicyChange = (newPolicy: EconomicPolicy) => {
      setEconomicState(prev => {
          const complex = prev as ComplexEconomicState;
          const { newQueue, newActivePolicy } = enqueuePolicyChange(
              complex.activePolicy ?? prev.policy,
              newPolicy,
              currentDate,
              complex.policyQueue ?? []
          );
          return {
              ...prev,
              policy: newPolicy,
              activePolicy: newActivePolicy,
              policyQueue: newQueue,
          };
      });
      addToLog(
          'Policy Change',
          `Government has updated economic policy: ${newPolicy.spendingLevel} spending, ${newPolicy.taxRate} taxation, focus on ${newPolicy.prioritySector}. Changes will take effect over the coming months.`,
          'politics'
      );
      setPolicyWarning(null);
  };

  const handleGovernmentFormation = (coalitionIds?: string[]) => {
      const prevGov = government || previousGovernmentRef.current;
      const { government: newGovernment, updatedCharacters } = formGovernment(electionResults, parties, characters, currentDate, alliances, coalitionIds, prevGov);
      setGovernment(newGovernment);
      previousGovernmentRef.current = null; // Clear the ref since we have a new active government
      const govParty = parties.find(p => p.id === newGovernment.rulingCoalitionIds[0]);
        const isMultiracial = newGovernment.rulingCoalitionIds.length > 1 ||
        !govParty?.ethnicityFocus;

        const unlockedTrees = govParty
        ? getUnlockedTrees(govParty.ideology, govParty.ethnicityFocus ?? null, isMultiracial)
        : [];

        setMissionTreeState(prev => ({
        ...prev,
        unlockedTreeIds: unlockedTrees,
        monthsInPower: 0,
        }));
      setCharacters(updatedCharacters);
      
      const newLeaderPartyId = newGovernment.rulingCoalitionIds[0];
      const prevLeaderPartyId = regimeLeaderPartyId;

      let isSameRegime = false;
      if (newLeaderPartyId === prevLeaderPartyId) {
          isSameRegime = true;
      } else {
          const oldAlliance = alliances.find(a => a.memberPartyIds.includes(prevLeaderPartyId || ''));
          const newAlliance = alliances.find(a => a.memberPartyIds.includes(newLeaderPartyId));
          if (oldAlliance && newAlliance && oldAlliance.id === newAlliance.id) {
              isSameRegime = true;
          }
      }

      if (!isSameRegime) {
          setRegimeStartDate(currentDate);
          setBigTentTriggered(false);
          setRegimeLeaderPartyId(newLeaderPartyId);
      }
      
      handleSpeakerElectionStart();
  };
  
  const startGovernmentFormationFlow = () => {
      const seatCounts = getPartySeatCounts(electionResults, new Map(parties.map(p => [p.id, p])));
      const playerPartySeats = playerParty ? seatCounts.get(playerParty.id) || 0 : 0;
      const isPlayerLeader = playerParty && playerParty.leaderId === playerCharacterId;
      
      const sortedParties = Array.from(seatCounts.entries()).sort((a, b) => b[1] - a[1]);
      const isTopParty = playerParty && sortedParties.slice(0, 3).some(p => p[0] === playerParty.id);

      if (isPlayerLeader && playerPartySeats > 0 && isTopParty) {
          setGameState('government-formation');
      } else {
          handleGovernmentFormation();
      }
  };
  
  const handleVoteOfConfidence = () => {
      if(!government) return;
      const result = conductVoteOfConfidence(government, characters, parties, electionResults);
      addToLog('Vote of Confidence', `Results: ${result.votesFor} For, ${result.votesAgainst} Against. Result: ${result.passed ? "Passed" : "Failed"}.`, 'politics');
      
      if (!result.passed && !snapElectionDate) {
          const snapDate = new Date(currentDate.getTime() + 60 * 24 * 60 * 60 * 1000);
          setSnapElectionDate(snapDate);
          addToLog("Parliament Dissolved", 
              `The ruling coalition has lost its vote of confidence. Parliament is dissolved and a snap election is called for ${snapDate.toLocaleDateString()}.`,
              "event");
          setPlaySpeed(null);
          setShowParliament(false);
      }
  };

  const handleBillProposal = () => {
      setGameState('bill-selection');
      setShowParliament(false); 
  };

  const handleBillSelect = (billTemplate: Omit<Bill, 'proposingPartyId'>) => {
      if (!playerParty) return;
      const bill: Bill = { ...billTemplate, proposingPartyId: playerParty.id };
      setParliamentBill(bill);
      setGameState('bill-proposal');
  };

  const handleBillVote = (playerVote: VoteDirection) => {
      if (!parliamentBill) return;
      const { passed, tally, breakdown, updatedPassedLaws, updatedElectionSystem, logs } = processBillVote(
          playerVote,
          playerParty?.id,
          parliamentBill,
          parties,
          electionResults,
          allSeatCodes.length,
          passedLaws,
          electionSystem
      );
      
      setPassedLaws(updatedPassedLaws);
      setElectionSystem(updatedElectionSystem);
      logs.forEach(log => addToLog(log.title, log.desc, log.type));
      setBillVoteResults({ passed, tally, breakdown });
      setGameState('bill-results');
  };

    const handleStartMission = (missionId: string) => {
        setMissionTreeState(prev => {
            const { newState, error } = startMission(
            missionId, prev, currentDate, economicState as ComplexEconomicState
            );
            if (error) console.warn('Mission start error:', error);
            return newState;
        });
        addToLog('Mission Started', `A new national mission has begun.`, 'politics');
        };

  const handlePerformAction = (action: ActionType, payload?: any) => {
      if (action === 'promoteParty' || action === 'addressLocal' || action === 'organizeStateRally' || action === 'strengthenLocalBranch' || action === 'undermineRival') {
          setCharacters(prev => prev.map(c => {
              if (c.id !== playerCharacterId) return c;
              let infGain = 0;
              let recGain = 0;
              switch(action) {
                  case 'promoteParty': infGain = 5; recGain = 2; break;
                  case 'addressLocal': infGain = 8; recGain = 4; break;
                  case 'strengthenLocalBranch': infGain = 5; recGain = 0; break;
                  case 'organizeStateRally': infGain = 10; recGain = 5; break;
              }
              return { ...c, influence: Math.min(100, c.influence + infGain), recognition: Math.min(100, c.recognition + recGain) };
          }));
          setActionScreenOpen(false);
          addToLog('Action Performed', `You performed: ${action}`, 'personal');
      } else if (action === 'secedeJoinParty') {
          if (!playerCharacter) return;
          setSecessionData({ affiliationId: playerCharacter.affiliationId, leaderId: playerCharacter.id, type: 'join' });
          setActionScreenOpen(false);
          setGameState('secession-join-party');
      } else if (action === 'secedeNewParty') {
          if (!playerCharacter) return;
          setSecessionData({ affiliationId: playerCharacter.affiliationId, leaderId: playerCharacter.id, type: 'new' });
          setActionScreenOpen(false);
          setGameState('secession-new-party');
      } else if (action === 'negotiatePartyMerger') {
          setActionScreenOpen(false);
          setMergerMode(payload?.mode || 'merge');
          setGameState('party-merger');
      } else if (action === 'inviteToParty') {
          setActionScreenOpen(false);
          setMergerMode(payload?.mode || 'absorb');
          setGameState('party-merger');
      } else if (action === 'createAlliance') {
          setActionScreenOpen(false);
          setGameState('alliance-creation');
      } else if (action === 'joinAlliance') {
          setActionScreenOpen(false);
          setGameState('alliance-join');
      } else if (action === 'manageAlliance') {
        const playerAlliance = alliances.find(a => a.memberPartyIds.includes(playerParty?.id || ''));
        if (!playerAlliance) {
            addToLog('No Alliance', 'You are not currently in an alliance.', 'politics');
            return;
        }
        setActionScreenOpen(false);
        setGameState('alliance-management');
      } else if (action === 'securityCrackdown') {
          if(government) {
              const { event, updatedCharacters, updatedParties } = performSecurityCrackdown(currentDate, characters, parties, government);
              if (observeMode) {
                  setCharacters(updatedCharacters);
                  setParties(updatedParties);
                  addToLog(event.title, event.description, 'event');
              } else {
                  setCharacters(updatedCharacters);
                  setParties(updatedParties);
                  setCurrentEvent(event);
                  setPreEventSpeed(playSpeed); 
                  setPlaySpeed(null); 
                  setGameState('event-modal');
              }
          }
          setActionScreenOpen(false);
      }
  };

  const handleSecessionConfirm = (options: { targetPartyId?: string; newPartyName?: string; newPartyEthnicityFocus?: Ethnicity | null }) => {
      if (!secessionData || !playerCharacter) return;
      
      const result = handleAffiliationSecession(
          parties, characters, electionResults,
          secessionData.affiliationId, playerCharacter,
          secessionData.type, options, currentDate, options.newPartyEthnicityFocus
      );
      
      setParties(result.newParties);
      setCharacters(result.updatedCharacters);
      setElectionResults(result.newElectionResults);
      setHistoricalParties(prev => [...prev, ...result.removedParties]);
      setPartyGraphLinks(prev => [...prev, ...result.newLinks]);
      
      setSecessionData(null);
      setGameState('game');
  };

  const handleMergerPropose = (targets: { parties: Party[], affiliations: Affiliation[] }, newName: string) => {
      if (!playerParty || !playerCharacter) return;
      
      const successChance = playerCharacter.influence > 60 ? 0.8 : 0.3;
      
      const acceptedParties = targets.parties.filter(() => Math.random() < successChance);
      const rejectedParties = targets.parties.filter(p => !acceptedParties.includes(p));
      const acceptedAffiliations = targets.affiliations.filter(() => Math.random() < successChance);
      const rejectedAffiliations = targets.affiliations.filter(a => !acceptedAffiliations.includes(a));
      
      if (acceptedParties.length === 0 && acceptedAffiliations.length === 0) {
          setMergerData({ initiatingPartyId: playerParty.id, results: { accepted: [], rejected: [...targets.parties, ...targets.affiliations], newName }});
          setGameState('party-merger-result');
          return;
      }
      
      if (mergerMode === 'merge') {
           const result = handlePartyMerger(
              parties, playerParty.id, acceptedParties, acceptedAffiliations,
              newName, playerCharacter.id, undefined, electionResults, characters, currentDate
          );
          setParties(result.newParties);
          setCharacters(result.updatedCharacters);
          setElectionResults(result.newElectionResults);
          setHistoricalParties(prev => [...prev, ...result.removedParties]);
          setPartyGraphLinks(prev => [...prev, ...result.newLinks]);
      } else {
           const result = handlePartyAbsorption(
              parties, playerParty.id, acceptedParties, acceptedAffiliations,
              electionResults, characters, currentDate
           );
          setParties(result.newParties);
          setCharacters(result.updatedCharacters);
          setElectionResults(result.newElectionResults);
          setHistoricalParties(prev => [...prev, ...result.removedParties]);
          setPartyGraphLinks(prev => [...prev, ...result.newLinks]);
      }
      
      setMergerData({ 
          initiatingPartyId: playerParty.id, 
          results: { 
              accepted: [...acceptedParties, ...acceptedAffiliations], 
              rejected: [...rejectedParties, ...rejectedAffiliations], 
              newName 
          }
      });
      setGameState('party-merger-result');
  };

  const handleAlliancePropose = (name: string, invitedPartyIds: string[], type: AllianceType) => {
      if (!playerParty) return;
      const targetParties = parties.filter(p => invitedPartyIds.includes(p.id));
      
      const { alliance, rejectedIds, updatedParties } = attemptAllianceFormation(
          playerParty, targetParties, name, type, alliances,
          allSeatCodes, demographicsMap, featuresMap, affiliationsMap, characters, strongholdMap
      );
      
      if (alliance) {
          setAlliances(prev => [...prev, alliance]);
          
          if (updatedParties) {
              setParties(prev => prev.map(p => {
                  const updated = updatedParties.find(up => up.id === p.id);
                  return updated || p;
              }));
          }

          addToLog('Alliance Formed', `The "${alliance.name}" (${alliance.type}) has been successfully formed!`, 'politics');
      } else {
          addToLog('Alliance Failed', "Alliance formation failed. No parties accepted the invitation or constraints were violated.", 'politics');
      }
      setGameState('game');
  };

  const handleAllianceJoinPropose = (allianceId: string) => {
      if (!playerParty) return;
      const alliance = alliances.find(a => a.id === allianceId);
      if (!alliance) return;

      const leaderParty = parties.find(p => p.id === alliance.leaderPartyId);
      if (!leaderParty) return;

      const relation = leaderParty.relations.get(playerParty.id) || 50;
      let chance = relation / 100;
      if (alliance.type === 'Alliance') chance -= 0.2;
      else chance += 0.1;

      if (Math.random() < chance) {
          const updatedAlliance = { ...alliance, memberPartyIds: [...alliance.memberPartyIds, playerParty.id] };
          
          // Redistribute seats immediately
          const memberParties = parties.filter(p => updatedAlliance.memberPartyIds.includes(p.id));
          const updatedParties = distributeAllianceSeats(
              updatedAlliance,
              memberParties,
              allSeatCodes,
              demographicsMap,
              featuresMap,
              affiliationsMap,
              characters,
              strongholdMap
          );

          setAlliances(prev => prev.map(a => a.id === alliance.id ? updatedAlliance : a));
          setParties(prev => prev.map(p => {
              const updated = updatedParties.find(up => up.id === p.id);
              return updated || p;
          }));

          addToLog('Alliance Joined', `${playerParty.name} has successfully joined ${alliance.name}!`, 'politics');
      } else {
          addToLog('Alliance Rejected', `${leaderParty.name} rejected ${playerParty.name}'s proposal to join ${alliance.name}.`, 'politics');
      }
      setGameState('game');
  };

  const handleAllianceInvite = (partyIds: string[]) => {
      if (!playerParty) return;
      const { updatedAlliances, logs } = processAllianceInvite(partyIds, playerParty.id, alliances, parties);
      setAlliances(updatedAlliances);
      logs.forEach(log => addToLog(log.title, log.desc, log.type));
  };

  const handleAllianceKick = (partyId: string) => {
      if (!playerParty) return;
      const { updatedAlliances, updatedParties, logs } = processAllianceKick(partyId, playerParty.id, alliances, parties);
      setAlliances(updatedAlliances);
      setParties(updatedParties);
      logs.forEach(log => addToLog(log.title, log.desc, log.type));
  };

  const handleAllianceLeave = () => {
      if (!playerParty) return;
      const alliance = alliances.find(a => a.memberPartyIds.includes(playerParty.id));
      if (!alliance) return;

      setAlliances(prev => prev.map(a => {
          if (a.id === alliance.id) {
              return { ...a, memberPartyIds: a.memberPartyIds.filter(id => id !== playerParty.id) };
          }
          return a;
      }));

      addToLog('Alliance Left', `${playerParty.name} has left ${alliance.name}.`, 'politics');
      setGameState('game');
  };

  const handleAllianceDissolve = () => {
      if (!playerParty) return;
      const { updatedAlliances, logs } = processAllianceDissolve(playerParty.id, alliances, parties);
      setAlliances(updatedAlliances);
      logs.forEach(log => addToLog(log.title, log.desc, log.type));
      setGameState('game');
  };


  return (
    <div className="h-screen w-screen overflow-hidden relative bg-gray-900">
      {gameState === 'start' && <StartScreen onStart={handleStartGame} onSpectate={handleSpectatorStart} />}
      
      {gameState === 'party-selection' && (
        <PartySelectionScreen 
          parties={parties} 
          onPartySelect={handlePartySelect} 
        />
      )}
      
      {gameState === 'character-selection' && selectedPartyId && (
        <CharacterSelectionScreen 
            onCharacterSelect={handleCharacterSelect}
            uniqueStates={uniqueStates}
            party={partiesMap.get(selectedPartyId)!}
            affiliationsMap={affiliationsMap}
        />
      )}

      {(gameState === 'game' || gameState === 'party-graph' || gameState === 'parliament' || gameState === 'election-results' || gameState === 'government-formation' || gameState === 'position-selection' || gameState === 'secession-join-party' || gameState === 'secession-new-party' || gameState === 'party-merger' || gameState === 'party-merger-result' || gameState === 'alliance-creation' || gameState === 'event-modal' || gameState === 'pas-invitation' || gameState === 'bill-selection' || gameState === 'bill-proposal' || gameState === 'bill-results'|| gameState === 'alliance-management'|| gameState === 'alliance-join') && (
          <>
            <MapComponent 
                features={displayGeoJSON.features}
                characters={characters}
                demographicsMap={demographicsMap}
                parties={parties}
                selectedSeatCode={selectedSeatCode}
                onSeatClick={(seatCode) => {
                    if (isPlayerMoving) return;
                    if (gameState === 'position-selection') {
                      if (seatCode) {
                        handlePositionSelect(seatCode);
                      }
                      return;
                    }
                    handleSeatClick(seatCode);
                }}
                affiliationToPartyMap={affiliationToPartyMap}
                electionResults={electionResults}
                isPlayerMoving={isPlayerMoving}
                onPositionSelect={(code) => {
                    if(isPlayerMoving && playerCharacter) {
                        setCharacters(prev => prev.map(c => c.id === playerCharacter.id ? { ...c, currentSeatCode: code } : c));
                        setIsPlayerMoving(false);
                    } else if (gameState === 'position-selection') {
                        handlePositionSelect(code);
                    }
                }}
                isPositionSelectionMode={gameState === 'position-selection'}
                affiliationsMap={affiliationsMap}
                strongholdMap={strongholdMap}
                electionMapConfig={currentMapConfig}
                densityMap={densityMap}
                isDensityLoading={isDensityLoading}
                redelineatedCodesWithYear={redelineatedCodesWithYear}
                currentYear={currentDate.getFullYear()}
            />
            
            {electionMapConfig.active && (
                <ElectionMapControlPanel 
                    config={currentMapConfig}
                    onConfigChange={setElectionMapConfig}
                    parties={Array.from(partiesMap.values())}
                    onClose={() => setElectionMapConfig(prev => ({ ...prev, active: false }))}
                    electionHistory={electionHistory}
                />
            )}
            
            {gameState === 'position-selection' && (
                <div className="absolute top-20 left-0 w-full flex justify-center z-30 pointer-events-none">
                   <div className="bg-black/70 text-white px-6 py-3 rounded-full text-xl font-bold shadow-lg backdrop-blur-sm border border-white/20 pointer-events-auto animate-pulse">
                      Select your starting constituency
                   </div>
                </div>
            )}

            <div className="absolute top-0 left-0 w-full z-20 pointer-events-none">
                <div className="pointer-events-auto">
                    <GameControlPanel 
                        currentDate={currentDate}
                        currentSpeed={playSpeed}
                        onSpeedChange={(speed) => {
                            setPlaySpeed(speed);
                            if (speed !== null) lastActiveSpeedRef.current = speed;
                        }}
                        onPlay={() => setPlaySpeed((lastActiveSpeedRef.current || 2000) as Speed)}
                        onPause={() => {
                            setPlaySpeed(prev => {
                                if (prev !== null) lastActiveSpeedRef.current = prev;
                                return null;
                            });
                        }}
                        nextElectionDate={nextElectionDate}
                        malapportionmentScore={currentMalapportionmentScore}
                        onShowParliament={() => setShowParliament(!showParliament)}
                        onShowGovernment={() => setShowGovernment(!showGovernment)}
                        electionHappened={electionHistory.length > 0}
                        onOpenHistory={() => setShowElectionHistory(true)}
                        isElectionClose={isElectionClose}
                        onOpenParties={handleOpenPartyList}
                        onOpenAlliances={handleOpenAllianceList}
                        onOpenPartyGraph={() => setGameState('party-graph')}
                        observeMode={observeMode}
                        onToggleObserveMode={() => setObserveMode(!observeMode)}
                        onToggleLog={() => setShowEventLog(!showEventLog)}
                        unreadLogCount={unreadLogCount}
                        onOpenCountryInfo={handleOpenCountryInfo}
                        onToggleElectionMap={handleToggleElectionMap}
                        isElectionMapActive={electionMapConfig.active}
                        onOpenEconomy={() => setShowEconomicPanel(!showEconomicPanel)}
                        isEconomyVisible={showEconomicPanel}
                        onOpenEcoHistory={() => setShowEcoHistory(!showEcoHistory)}
                        onShowLaws={() => setShowLawsPanel(!showLawsPanel)}
                        isLawsVisible={showLawsPanel}
                        onOpenMissions={() => setShowMissionTree(!showMissionTree)}
                        onOpenPolls={handleOpenPolls}
                        musicStarted={isMusicStarted}
                        onMusicStart={startMusic}
                        musicVolume={musicVolume}
                        onMusicVolumeChange={setMusicVolume}
                        isMusicMuted={isMusicMuted}
                        onToggleMusicMute={toggleMusicMute}
                        currentMusicMood={currentMusicMood}

                    />
                </div>
            </div>

            {showEventLog && (
                <EventLogPanel 
                    logEntries={gameLog} 
                    onClose={() => setShowEventLog(false)}
                />
            )}
            
            {showEcoHistory && (
                <EconomicHistoryPanel 
                    history={economicState.history} 
                    onClose={() => setShowEcoHistory(false)}
                />
            )}

            {showCountryInfo && (
                <CountryInfoPanel 
                    demographicsMap={demographicsMap}
                    allSeatCodes={allSeatCodes}
                    characters={characters}
                    onClose={() => setShowCountryInfo(false)}
                />
            )}

            {selectedSeat && (
                <ConstituencyPanel 
                    seat={selectedSeat}
                    demographics={selectedSeatDemographics}
                    characters={characters}
                    affiliationsMap={affiliationsMap}
                    partiesMap={partiesMap}
                    onClose={() => handleSeatClick(null)}
                    onCharacterClick={(char) => handleCharacterClick(char.id)}
                    affiliationToPartyMap={affiliationToPartyMap}
                    onPartyClick={(pid) => handlePartyClick(pid)}
                    onStateClick={(state) => handleStateClick(state)}
                    electionHistory={electionHistory}
                    strongholdMap={strongholdMap}
                    playerParty={playerParty || null}
                    onInvestCampaignFunds={handleInvestCampaignFunds}
                />
            )}
            
            {selectedState && stateGovernments.get(selectedState) && (
                    <StateInfoPanel 
                        stateGovernment={stateGovernments.get(selectedState)!}
                        parties={parties}
                        characters={characters}
                        onClose={() => handleStateClick(null as any)}
                        onCharacterClick={(charId) => handleCharacterClick(charId)}
                        stateElectionHistory={stateElectionHistoryMap.get(selectedState) || []}
                    />
            )}
            {viewingPartyId && partiesMap.get(viewingPartyId) && (
                <PartyPanel
                    party={partiesMap.get(viewingPartyId)!}
                    members={characters.filter(c => affiliationToPartyMap.get(c.affiliationId) === viewingPartyId)}
                    affiliationsMap={affiliationsMap}
                    featuresMap={featuresMap}
                    demographicsMap={demographicsMap}
                    onClose={() => handlePartyClick(null as any)}
                    onCharacterClick={(char) => handleCharacterClick(char.id)}
                    strongholdMap={strongholdMap}
                />
            )}
            
            {showPartyList && (
                <PartyListPanel
                    parties={parties}
                    affiliationsMap={affiliationsMap}
                    onClose={() => setShowPartyList(false)}
                    onPartyClick={(pid) => {
                        setViewingPartyId(pid);
                    }}
                />
            )}

            {showAllianceList && (
                <AlliancePanel
                    alliances={alliances}
                    parties={parties}
                    characters={characters}
                    onClose={() => setShowAllianceList(false)}
                />
            )}
            
            {selectedCharacterId && (
                (() => {
                    const char = characters.find(c => c.id === selectedCharacterId);
                    if (!char) return null;
                    const aff = affiliationsMap.get(char.affiliationId);
                    const pId = affiliationToPartyMap.get(char.affiliationId);
                    const p = pId ? partiesMap.get(pId) : undefined;
                    return (
                        <CharacterInfoPanel 
                            character={char}
                            affiliation={aff}
                            party={p}
                            seat={featuresMap.get(char.currentSeatCode)}
                            onClose={() => setSelectedCharacterId(null)}
                            currentDate={currentDate}
                            roleInfo={char.isPlayer ? playerRoleInfo : { role: 'Member', details: 'NPC' }} 
                            isPlayerMoving={isPlayerMoving}
                            onInitiateMove={() => { setIsPlayerMoving(true); setSelectedCharacterId(null); setSelectedSeatCode(null); }}
                            onCancelMove={() => setIsPlayerMoving(false)}
                            onOpenPartyManagement={() => setPartyManagementOpen(true)}
                            onOpenActions={() => setActionScreenOpen(true)}
                            onOpenAffiliationManagement={() => {
                                if (!p) return;
                                const allocated = Array.from(p.contestedSeats.entries())
                                    .filter(([, data]) => data.allocatedAffiliationId === char.affiliationId)
                                    .map(([sCode]) => {
                                        const f = featuresMap.get(sCode);
                                        return f ? { seatCode: sCode, party: p, seatFeature: f } : null
                                    })
                                    .filter((x): x is { seatCode: string; party: Party; seatFeature: GeoJsonFeature } => x !== null);
                                setAffiliationManagementData({ affiliationId: char.affiliationId, allocatedSeats: allocated });
                            }}
                            isPartyManagementDisabled={!char.isPlayer || (!p || (p.leaderId !== char.id && playerRoleInfo.role !== 'National Leader' && playerRoleInfo.role !== 'National Deputy Leader' && playerRoleInfo.role !== 'State Leader'))}
                            partyManagementTooltip={
                                !char.isPlayer || (!p || (p.leaderId !== char.id && playerRoleInfo.role !== 'National Leader' && playerRoleInfo.role !== 'National Deputy Leader' && playerRoleInfo.role !== 'State Leader'))
                                ? "Only Party Leaders and Executives can manage the party." 
                                : "Manage party strategy and internal affairs."
                            }
                            isAffiliationManagementDisabled={!char.isPlayer || !char.isAffiliationLeader}
                            affiliationManagementTooltip={
                                !char.isPlayer || !char.isAffiliationLeader 
                                ? "Only the Faction Leader can manage the faction." 
                                : "Manage faction members and candidates."
                            }
                            government={government}
                        />
                    );
                })()
            )}

            {playerCharacter && !selectedCharacterId && (
                <PlayerCharacterButton player={playerCharacter} onClick={() => setSelectedCharacterId(playerCharacter.id)} />
            )}
            
            {partyManagementOpen && playerParty && (
                <PartyManagementScreen 
                    party={playerParty}
                    allParties={parties}
                    allSeatFeatures={features}
                    affiliationsMap={affiliationsMap}
                    featuresMap={featuresMap}
                    demographicsMap={demographicsMap}
                    characters={characters}
                    currentDate={currentDate}
                    onSave={(updatedParties) => {
                        setParties(prev => prev.map(p => {
                            const updated = updatedParties.find(up => up.id === p.id);
                            return updated || p;
                        }));
                        setHasPlayerManagedStrategy(true);
                        setPartyManagementOpen(false);
                    }}
                    onClose={() => setPartyManagementOpen(false)}
                    alliances={alliances}
                    strongholdMap={strongholdMap}
                />
            )}

            {actionScreenOpen && playerCharacter && (
                <CharacterActionScreen 
                    player={playerCharacter}
                    onClose={() => setActionScreenOpen(false)}
                    onPerformAction={handlePerformAction}
                    characters={characters}
                    partiesMap={partiesMap}
                    affiliationToPartyMap={affiliationToPartyMap}
                    roleInfo={playerRoleInfo}
                    isAffiliationLeader={!!playerCharacter.isAffiliationLeader}
                    daysUntilElection={daysUntilElection}
                    alliances={alliances}
                    government={government}
                />
            )}
            
            {affiliationManagementData && (
                <AffiliationManagementScreen 
                    affiliation={affiliationsMap.get(affiliationManagementData.affiliationId)!}
                    allocatedSeats={affiliationManagementData.allocatedSeats}
                    affiliationMembers={characters.filter(c => c.affiliationId === affiliationManagementData.affiliationId && c.isAlive)}
                    demographicsMap={demographicsMap}
                    affiliationsMap={affiliationsMap}
                    onConfirm={(pId, selections) => {
                        setParties(prev => prev.map(p => {
                            if (p.id !== pId) return p;
                            const newContested = new Map<string, { allocatedAffiliationId: string | null; candidateId: string | null; }>(p.contestedSeats);
                            selections.forEach((charId, seatCode) => {
                                const existing = newContested.get(seatCode);
                                if (existing) {
                                    newContested.set(seatCode, { ...existing, candidateId: charId });
                                }
                            });
                            return { ...p, contestedSeats: newContested };
                        }));
                        setHasPlayerManagedAffiliation(true);
                        setAffiliationManagementData(null);
                    }}
                    onCancel={() => setAffiliationManagementData(null)}
                    strongholdMap={strongholdMap}
                />
            )}

            {showParliament && (
                <div className="absolute left-0 top-20 h-[calc(100%-5rem)] z-30 animate-slideRight">
                    <ParliamentScreen 
                        gameState={gameState}
                        electionResults={electionResults}
                        partiesMap={partiesMap}
                        totalSeats={allSeatCodes.length}
                        speaker={speaker}
                        onClose={() => setShowParliament(false)}
                        currentBill={parliamentBill}
                        playerParty={playerParty}
                        billVoteResults={billVoteResults}
                        onVoteOnBill={(v) => handleBillVote(v)}
                        onCloseBillResults={() => {
                            setBillVoteResults(null);
                            setParliamentBill(null);
                            setGameState('game');
                        }}
                        government={government}
                        characters={characters}
                        onCallVoteOfConfidence={handleVoteOfConfidence}
                        onProposeBill={handleBillProposal}
                        onDissolveParliament={
                            playerCharacter && government?.chiefMinisterId === playerCharacter.id && !snapElectionDate
                            ? () => {
                                const snapDate = new Date(currentDate.getTime() + 60 * 24 * 60 * 60 * 1000);
                                setSnapElectionDate(snapDate);
                                addToLog("Parliament Dissolved", 
                                   `Prime Minister ${playerCharacter.name} has dissolved parliament. A snap election has been called for ${snapDate.toLocaleDateString()}.`,
                                   "event");
                                setShowParliament(false);
                            }
                            : undefined
                        }
                    />
                </div>
            )}

            {showGovernment && (
                <div className="absolute right-0 top-20 h-[calc(100%-5rem)] z-30 animate-slideLeft">
                    <GovernmentScreen
                        government={government}
                        partiesMap={partiesMap}
                        characters={characters}
                        totalSeats={allSeatCodes.length}
                        onClose={() => setShowGovernment(false)}
                        onOpenCharacter={setSelectedCharacterId}
                    />
                </div>
            )}

            {showEconomicPanel && (
                <React.Suspense fallback={<div className="p-4 bg-white/10 text-white rounded">Loading Economy...</div>}>
                    <EconomicPanel
                    economicState={economicState}
                    onPolicyChange={handleEconomicPolicyChange}
                    onClose={() => setShowEconomicPanel(false)}
                    isGovernment={
                        !!government &&
                        !!playerParty &&
                        government.rulingCoalitionIds.includes(playerParty.id)
                    }
                    publicApproval={economicState.publicApproval}
                    currentDate={currentDate}
                />
                </React.Suspense>
            )}
            {showMissionTree && (
            <MissionTreePanel
                missionTreeState={missionTreeState}
                econState={economicState as ComplexEconomicState}
                passedLaws={passedLaws}
                onStartMission={handleStartMission}
                onClose={() => setShowMissionTree(false)}
                isGovernment={
                !!government &&
                !!playerParty &&
                government.rulingCoalitionIds.includes(playerParty.id)
                }
            />
            )}
            
            {showLawsPanel && (
                <div className="absolute top-[8rem] right-[5rem] z-50 h-[32rem]">
                    <ActiveLawsPanel 
                        passedLaws={passedLaws} 
                        onClose={() => setShowLawsPanel(false)} 
                    />
                </div>
            )}

            {gameState === 'bill-selection' && (
                <BillSelectionScreen 
                    onSelect={handleBillSelect}
                    onCancel={() => {
                        setGameState('game');
                        setShowParliament(true);
                    }}
                />
            )}

            {gameState === 'bill-proposal' && parliamentBill && playerParty && (
                <BillProposalPanel 
                    bill={parliamentBill}
                    playerParty={playerParty}
                    partiesMap={partiesMap}
                    electionResults={electionResults}
                    onVote={handleBillVote}
                />
            )}

            {gameState === 'bill-results' && billVoteResults && parliamentBill && (
                <BillResultsPanel 
                    bill={parliamentBill}
                    results={billVoteResults}
                    partiesMap={partiesMap}
                    onClose={() => {
                        setBillVoteResults(null);
                        setParliamentBill(null);
                        setGameState('game');
                        setShowParliament(true);
                    }}
                />
            )}
            
            {showElectionHistory && (
                <React.Suspense fallback={<div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
                    <ElectionHistoryScreen 
                    history={electionHistory}
                    partiesMap={partiesMap}
                    totalSeats={allSeatCodes.length}
                    onClose={() => setShowElectionHistory(false)}
                    electionHistory={electionHistory}
                    featuresMap={featuresMap}
                />
                </React.Suspense>
            )}

            {gameState === 'secession-join-party' && secessionData && affiliationsMap.get(secessionData.affiliationId) && (
                <SecessionJoinPartyScreen 
                    parties={parties}
                    currentPartyId={affiliationToPartyMap.get(secessionData.affiliationId) || ''}
                    affiliation={affiliationsMap.get(secessionData.affiliationId)!}
                    onSelect={(targetPartyId) => handleSecessionConfirm({ targetPartyId })}
                    onCancel={() => { setSecessionData(null); setGameState('game'); }}
                />
            )}

            {gameState === 'secession-new-party' && secessionData && affiliationsMap.get(secessionData.affiliationId) && (
                <SecessionNewPartyScreen 
                    affiliation={affiliationsMap.get(secessionData.affiliationId)!}
                    onConfirm={(name, focus) => handleSecessionConfirm({ newPartyName: name, newPartyEthnicityFocus: focus })}
                    onCancel={() => { setSecessionData(null); setGameState('game'); }}
                />
            )}

            {gameState === 'party-merger' && playerParty && (
                <PartyMergerScreen 
                    playerParty={playerParty}
                    parties={parties}
                    affiliations={AFFILIATIONS}
                    characters={characters}
                    onPropose={handleMergerPropose}
                    onCancel={() => setGameState('game')}
                    mode={mergerMode}
                />
            )}
            
            {gameState === 'party-merger-result' && mergerData && mergerData.results && (
                <MergerResultModal 
                    result={mergerData.results}
                    onClose={() => { setMergerData(null); setGameState('game'); }}
                />
            )}

            {gameState === 'alliance-creation' && playerParty && (
                <AllianceCreationScreen 
                    playerParty={playerParty}
                    parties={parties}
                    alliances={alliances}
                    onConfirm={handleAlliancePropose}
                    onCancel={() => setGameState('game')}
                />
            )}

            {gameState === 'alliance-join' && playerParty && (
                <AllianceJoinScreen 
                    playerParty={playerParty}
                    parties={parties}
                    alliances={alliances.filter(a => !a.memberPartyIds.includes(playerParty.id))}
                    onConfirm={handleAllianceJoinPropose}
                    onCancel={() => setGameState('game')}
                />
            )}

            {gameState === 'alliance-management' && playerParty && (() => {
                const playerAlliance = alliances.find(a => a.memberPartyIds.includes(playerParty.id));
                if (!playerAlliance) {
                    // Player isn't in an alliance — close the screen
                    jobQueueRef.current.push(() => setGameState('game'));
                    return null;
                }
                return (
                    <AllianceManagementScreen 
                        playerParty={playerParty}
                        alliance={playerAlliance}
                        parties={parties}
                        alliances={alliances}
                        onInviteParties={handleAllianceInvite}
                        onKickParty={handleAllianceKick}
                        onLeaveAlliance={handleAllianceLeave}
                        onDissolveAlliance={handleAllianceDissolve}
                        onClose={() => setGameState('game')}
                    />
                );
            })()}

            {gameState === 'government-formation' && playerParty && (
                <GovernmentFormationScreen 
                    playerParty={playerParty}
                    parties={parties}
                    electionResults={electionResults}
                    totalSeats={allSeatCodes.length}
                    alliances={alliances}
                    onConfirm={(coalitionIds) => handleGovernmentFormation(coalitionIds)}
                    onAuto={() => handleGovernmentFormation()}
                />
            )}

             {gameState === 'event-modal' && currentEvent && (
                <EventModal 
                    event={currentEvent}
                    onAcknowledge={handleEventAcknowledge}
                />
            )}

            <RedelineationModal
                isOpen={redelineationModalOpen}
                onClose={(updatedScore) => {
                  setRedelineationModalOpen(false);
                  // Apply approval penalty if malapportionment exceeded 5.0
                  if (updatedScore > 5.0) {
                    setEconomicState(prevEcon => ({
                      ...prevEcon,
                      publicApproval: Math.max(0, prevEcon.publicApproval - 6)
                    }));
                    addToLog(
                      "Democratic Outcry", 
                      `National malapportionment has spiked to ${updatedScore.toFixed(2)}:1. Human rights watchdogs and opposition groups lead massive rallies protesting the gerrymandered seats, inflicting a -6% approval penalty.`, 
                      "event"
                    );
                  }
                  setDemographicsMap(new Map(demographicsMap));

                  const newRedelMap = new Map(redelineatedCodesWithYear);
                  redelineationActions.forEach(a => {
                    newRedelMap.set(a.fromCode, currentDate.getFullYear());
                    newRedelMap.set(a.toCode, currentDate.getFullYear());
                  });
                  setRedelineatedCodesWithYear(newRedelMap);

                  setIsDensityLoading(true);
                  loadPopulationRaster().then(raster => {
                    const updatedDensity = new Map(densityMap);
                    redelineationActions.forEach(action => {
                      for (const code of [action.fromCode, action.toCode]) {
                        const seat = demographicsMap.get(code);
                        if (!seat?.currentGeometry) continue;
                        const pop = sampleConstituencyPopulation(seat.currentGeometry, raster);
                        const area = computePolygonAreaDegrees(seat.currentGeometry) * 111 * 97;
                        const density = area > 0 ? pop / area : 0;
                        seat.worldPopDensity = density;
                        updatedDensity.set(code, density);
                      }
                    });
                    setDensityMap(updatedDensity);
                    setIsDensityLoading(false);
                  });
                }}
                mostAffectedState={mostAffectedState}
                actions={redelineationActions}
                initialScore={redelineationInitialScore}
                updatedScore={redelineationUpdatedScore}
            />

            {gameState === 'party-graph' && (
                <PartyNetworkGraphScreen 
                    activeParties={parties}
                    historicalParties={historicalParties}
                    links={partyGraphLinks}
                    currentDate={currentDate}
                    onClose={() => setGameState('game')}
                />
            )}

            {gameState === 'pas-invitation' && pasInvitationData && playerParty && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4">Invitation to Join PAS</h2>
                        <p className="text-gray-300 mb-6">
                            The Parti Islam Se-Malaysia (PAS) has been formed. They have sent an invitation to PMIP to merge and unite the Islamic political movement under their banner.
                        </p>
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => {
                                    const res = handlePartyAbsorption(
                                        parties, pasInvitationData.pasPartyId, [playerParty], [], electionResults, characters, currentDate
                                    );
                                    
                                    // Re-evaluate leader for PAS
                                    const pasParty = res.newParties.find(p => p.id === pasInvitationData.pasPartyId);
                                    if (pasParty) {
                                        const allMemberChars = res.updatedCharacters.filter(
                                            c => pasParty.affiliationIds.includes(c.affiliationId) && c.isAlive
                                        );
                                        const sorted = [...allMemberChars].sort((a, b) => b.influence - a.influence);
                                        if (sorted.length > 0 && sorted[0].id !== pasParty.leaderId) {
                                            pasParty.leaderId = sorted[0].id;
                                            pasParty.deputyLeaderId = sorted[1]?.id;
                                            pasParty.leaderHistory.push({
                                                leaderId: sorted[0].id,
                                                name: sorted[0].name,
                                                startDate: currentDate,
                                            });
                                        }
                                    }

                                    setParties(res.newParties);
                                    setCharacters(res.updatedCharacters);
                                    setElectionResults(res.newElectionResults);
                                    setHistoricalParties(prev => [...prev, ...res.removedParties]);
                                    setPartyGraphLinks(prev => [...prev, ...res.newLinks]);
                                    
                                    // Clean up alliances
                                    const newAlliances = alliances.map(a => ({
                                        ...a,
                                        memberPartyIds: a.memberPartyIds.filter(id => id !== playerParty.id)
                                    })).filter(a => a.memberPartyIds.length > 1);
                                    setAlliances(newAlliances);

                                    setPasInvitationData(null);
                                    setGameState('game');
                                    setPlaySpeed(preEventSpeed);
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded"
                            >
                                Accept & Merge
                            </button>
                            <button
                                onClick={() => {
                                    setPasInvitationData(null);
                                    setGameState('game');
                                    setPlaySpeed(preEventSpeed);
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}

          </>
      )}
      
      {gameState === 'election-results' && (
          <ElectionResultsPanel 
             results={electionResults}
             previousResults={previousElectionResults}
             detailedResults={detailedElectionResults}
             previousDetailedResults={null}
             partiesMap={partiesMap}
             totalSeats={allSeatCodes.length}
             onClose={() => {
                 electionInProgressRef.current = false;
                 startGovernmentFormationFlow();
             }}
             electionDate={currentDate}
             totalElectors={electionHistory[electionHistory.length-1]?.totalElectors || 0}
             alliances={alliances}
             featuresMap={featuresMap}
          />
      )}
      
      {gameState === 'party-election-voting' && partyElectionData && (
          <PartyElectionScreen 
             party={partyElectionData.party}
             candidates={partyElectionData.candidates}
             affiliationsMap={affiliationsMap}
             onVote={handlePartyVote}
             isPlayerEligibleToVote={
                !!playerCharacter && (
                    !!playerCharacter.isAffiliationLeader || 
                    (partyElectionData && partyElectionData.party.stateBranches.some(b => b.leaderId === playerCharacter.id || b.executiveIds.includes(playerCharacter.id)))
                )
             }
          />
      )}
      
      {gameState === 'party-election-results' && partyElectionData && partyElectionData.voteTally && partyElectionData.winnerId && (
          <PartyElectionResultsPanel 
              voteTally={partyElectionData.voteTally}
              winnerId={partyElectionData.winnerId}
              deputyWinnerId={partyElectionData.deputyWinnerId}
              party={partyElectionData.party}
              partyMembers={characters.filter(c => partyElectionData.party.affiliationIds.includes(c.affiliationId))}
              onClose={() => {
                  setPartyElectionData(null);
                  setGameState('game');
              }}
          />
      )}

      {gameState === 'speaker-election-voting' && speakerElectionData && (
          <SpeakerElectionScreen 
             candidates={speakerElectionData.candidates}
             onVote={handleSpeakerVote}
             partiesMap={partiesMap}
             electionResults={electionResults}
             playerPartyId={playerParty?.id || ''}
             isSpectator={!playerCharacterId}
          />
      )}
      
      {gameState === 'speaker-election-results' && speakerElectionData && speakerElectionData.results && (
          <SpeakerElectionResultsPanel 
            results={speakerElectionData.results}
            partiesMap={partiesMap}
            characters={characters}
            onClose={() => {
                setSpeakerElectionData(null);
                
                // BARISAN NASIONAL CHECK
                const seatCounts = getPartySeatCounts(electionResults, partiesMap);
                const mainAlliance = alliances.find(a => a.id === 'alliance');
                const majority = Math.floor(allSeatCodes.length / 2) + 1;
                
                let seats = 0;
                mainAlliance?.memberPartyIds.forEach(pid => seats += (seatCounts.get(pid) || 0));

                const isAllianceInPower = government?.rulingCoalitionIds.includes(mainAlliance?.leaderPartyId || '') || 
                                          mainAlliance?.memberPartyIds.includes(government?.rulingCoalitionIds[0] || '');

                if (mainAlliance && mainAlliance.name === 'The Alliance' && !hasFormedBN && seats > 0 && seats < majority && isAllianceInPower) {
                    setHasFormedBN(true);

                    const otherAlliances = alliances.filter(a => a.id !== 'alliance');
                    otherAlliances.sort((a,b) => {
                        const seatsA = a.memberPartyIds.reduce((sum, pid) => sum + (seatCounts.get(pid) || 0), 0);
                        const seatsB = b.memberPartyIds.reduce((sum, pid) => sum + (seatCounts.get(pid) || 0), 0);
                        return seatsB - seatsA;
                    });
                    const biggestOtherAlliance = otherAlliances[0];
                    const biggestOtherAllianceName = biggestOtherAlliance ? biggestOtherAlliance.name : '';

                    setAlliances(prev => prev.map(a => {
                        if (a.id === 'alliance') {
                            return {
                                ...a,
                                name: 'Barisan Nasional',
                                memberPartyIds: Array.from(new Set([...a.memberPartyIds, ...(government?.rulingCoalitionIds || [])])),
                                formedDate: currentDate,
                                cohesion: Math.max(a.cohesion || 50, 80)
                            };
                        }
                        return a;
                    }).filter(a => !(biggestOtherAlliance && a.id === biggestOtherAlliance.id)));
                    
                    const effects = [
                        'The Alliance is renamed to Barisan Nasional.', 
                        'Coalition partners are permanently integrated into the new expanded alliance.'
                    ];
                    
                    if (biggestOtherAllianceName) {
                        effects.push(`${biggestOtherAllianceName} is completely dissolved under immense pressure and targeted destabilization.`);
                    }

                    const bnEvent: GameEvent = {
                        id: `bn-formation-${Date.now()}`,
                        title: 'Formation of Barisan Nasional',
                        description: 'Following the failure to secure a clear simple majority independently in the General Election, The Alliance has absorbed its coalition partners, reinventing itself as Barisan Nasional (National Front) to ensure absolute political hegemony.',
                        date: currentDate,
                        type: 'political',
                        effects: effects
                    };

                    setPreEventSpeed(playSpeed);
                    setPlaySpeed(null);
                    setCurrentEvent(bnEvent);
                    setGameState('event-modal');
                } else {
                    setGameState('game');
                    setShowParliament(true);
                }
            }}
          />
      )}

      {showPollsPanel && (
         <PollsPanel 
            currentParties={parties}
            alliances={alliances}
            demographicsMap={demographicsMap}
            featuresMap={featuresMap}
            strongholdMap={strongholdMap}
            characters={characters}
            affiliationsMap={affiliationsMap}
            government={government}
            economicState={economicState as ComplexEconomicState}
            allSeatCodes={allSeatCodes}
            onClose={() => setShowPollsPanel(false)}
         />
      )}

    </div>
  );
};

export default App;