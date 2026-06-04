import { COLOR_PALETTE } from '../constants';
import { Party, PoliticalAlliance, ScenarioConfig } from '../types';

// ─────────────────────────────────────────────────────────────
//  1969 — A NATION AT CROSSROADS
//  Date: 1 Jan 1969  (Malaysia — Peninsular + Sabah + Sarawak)
//  Context: 3rd General Election (May 10). Racial tensions peak.
//  PMIP → PAS by this point. Gerakan & DAP split the opposition.
//  Sabah: USNO dominant, UPKO, SCA, PASOK all contesting.
//  Sarawak: SUPP, SNAP, Bumiputera Party/Pesaka all present.
// ─────────────────────────────────────────────────────────────
export const SCENARIO_1969: ScenarioConfig = {
  id: '1969_crossroads',
  title: 'A Nation at Crossroads',
  date: '1969-01-01',
  description:
    'Racial tensions simmer beneath years of growth. The Third General Election looms, and opposition parties have never been stronger. Will you maintain the historic Alliance coalition — or rewrite Malaysian politics forever?',
 
  parties: [
    // ── PENINSULAR MALAYSIA ───────────────────────────────────
 
    {
      id: 'umno',
      name: 'UMNO',
      color: COLOR_PALETTE[3],
      affiliationIds: [
        'malay-civil', 'malay-edu', 'malay-merchant', 'malay-nat',
        'malay-royalist', 'malay-prog', 'malay-professional',
        'malay-biz', 'malay-farmer', 'malay-labour', 'malay-youth', 'malay-veteran',
        'orang-asli-batin', 'orang-asli-youth', 'orang-asli-land', 'orang-asli-edu',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Malay',
      relations: new Map(),
      unity: 88,
      ideology: { economic: 62, governance: 82 },
      funds: 20000000,
    },
 
    {
      id: 'mca',
      name: 'MCA',
      color: COLOR_PALETTE[2],
      affiliationIds: ['chinese-biz', 'chinese-edu', 'chinese-merchant'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Chinese',
      relations: new Map(),
      unity: 78,
      ideology: { economic: 78, governance: 60 },
      funds: 5000000,
    },
 
    {
      id: 'mic',
      name: 'MIC',
      color: COLOR_PALETTE[4],
      affiliationIds: ['indian-trad', 'indian-reform', 'indian-professional'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Indian',
      relations: new Map(),
      unity: 75,
      ideology: { economic: 45, governance: 55 },
      funds: 1800000,
    },
 
    // PAS (formerly PMIP, renamed 1973 — but widely called PAS
    // by 1969 in common usage; use PAS for consistency).
    {
      id: 'pas',
      name: 'PAS',
      color: COLOR_PALETTE[1],
      affiliationIds: ['malay-religious', 'malay-islamist'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Malay',
      relations: new Map(),
      unity: 90,
      ideology: { economic: 98, governance: 92 },
      funds: 7000000,
    },
 
    // DAP — formed 1966 from PAP's Malaysian wing.
    {
      id: 'dap',
      name: 'Democratic Action Party',
      color: '#E8002D',
      affiliationIds: [
        'chinese-progressive', 'chinese-labour', 'indian-prog',
        'indian-labour', 'indian-estate', 'chinese-intel',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Multi-Racial',
      relations: new Map(),
      unity: 82,
      ideology: { economic: 28, governance: 28 },
      funds: 900000,
    },
 
    // Gerakan — formed March 1968.
    {
      id: 'gerakan',
      name: 'Gerakan',
      color: '#1A6BAD',
      affiliationIds: [
        'chinese-professional', 'chinese-youth',
        'chinese-chamber', 'chinese-clan',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Multi-Racial',
      relations: new Map(),
      unity: 80,
      ideology: { economic: 55, governance: 32 },
      funds: 700000,
    },
 
    // Parti Raayat — still active in 1969.
    {
      id: 'pr',
      name: 'Parti Raayat',
      color: COLOR_PALETTE[10],
      affiliationIds: ['malay-socialist'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Multi-Racial',
      relations: new Map(),
      unity: 65,
      ideology: { economic: 22, governance: 55 },
      funds: 250000,
    },
 
    // ── SABAH ─────────────────────────────────────────────────
 
    // USNO — dominant Muslim/Malay Sabah party since 1961.
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
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sabah (Muslim)',
      relations: new Map(),
      unity: 88,
      ideology: { economic: 42, governance: 75 },
      funds: 2500000,
    },
 
    // UPKO — Kadazan-Dusun-Murut representation.
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
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sabah (Non-Muslim)',
      relations: new Map(),
      unity: 80,
      ideology: { economic: 38, governance: 68 },
      funds: 12000000,
    },
 
    // SCA — Sabah Chinese Association (Alliance affiliate).
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
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Sabahan Chinese',
      relations: new Map(),
      unity: 82,
      ideology: { economic: 82, governance: 45 },
      funds: 1800000,
    },
 
    // PASOK — progressive urban Sabahan Malay breakaway (1966).
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
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sabah (Muslim)',
      relations: new Map(),
      unity: 72,
      ideology: { economic: 58, governance: 55 },
      funds: 400000,
    },
 
    // STFUP — Sabah United Workers Party (Chinese labour).
    {
      id: 'stfup',
      name: 'Sabah United Workers Party',
      color: '#37474F',
      affiliationIds: [
        'sabah-chinese-union', 'sabah-chinese-fisheries', 'sabah-chinese-hawkers',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Sabahan Chinese',
      relations: new Map(),
      unity: 70,
      ideology: { economic: 28, governance: 32 },
      funds: 180000,
    },
 
    // ── SARAWAK ───────────────────────────────────────────────
 
    // SUPP — Sarawak's oldest party; Chinese-majority, left-leaning.
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
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Sarawakian Chinese',
      relations: new Map(),
      unity: 82,
      ideology: { economic: 38, governance: 40 },
      funds: 1500000,
    },
 
    // SNAP — Dayak/Iban/Bidayuh voice, formed 1961.
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
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sarawak (Non-Muslim)',
      relations: new Map(),
      unity: 78,
      ideology: { economic: 35, governance: 68 },
      funds: 12000000,
    },
 
    // Bumiputera Party / Parti Bumiputera — Malay/Melanau, Alliance member.
    // (Pre-dates the 1973 PBB merger; in 1969 it is still "Parti Bumiputera")
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
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sarawak (Muslim)',
      relations: new Map(),
      unity: 84,
      ideology: { economic: 48, governance: 78 },
      funds: 1800000,
    },
 
    // Pesaka — Iban/Dayak conservative bloc, Alliance affiliate.
    // (Merged into PBB in 1973.)
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
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sarawak (Non-Muslim)',
      relations: new Map(),
      unity: 76,
      ideology: { economic: 32, governance: 65 },
      funds: 900000,
    },
 
    // PPM — moderate urban Malay reformist, small party.
    {
      id: 'ppm',
      name: 'Parti Pesaka Masyarakat',
      color: '#00695C',
      affiliationIds: [
        'sarawak-malay-urban', 'sarawak-malay-youth', 'sarawak-malay-professionals',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sarawak (Muslim)',
      relations: new Map(),
      unity: 68,
      ideology: { economic: 58, governance: 58 },
      funds: 300000,
    },
 
    // SUCP (Sarawak United Chinese Party) — business-oriented
    // Chinese party, distinct from the more left-wing SUPP.
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
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Sarawakian Chinese',
      relations: new Map(),
      unity: 78,
      ideology: { economic: 82, governance: 52 },
      funds: 2200000,
    },
  ],
 
  alliances: [
    {
      id: 'alliance',
      name: 'The Alliance',
      // Alliance in 1969 included peninsula parties + Sabah (USNO, SCA)
      // + Sarawak (Bumiputera Party, Pesaka, SUCP, SNAP at various points).
      // SNAP was an Alliance member in Sarawak by 1969.
      memberPartyIds: [
        'umno', 'mca', 'mic',
        'usno', 'sca',
        'bumiputera', 'pesaka', 'snap', 'sucp',
      ],
      type: 'Alliance',
      leaderPartyId: 'umno',
      ideology: { economic: 60, governance: 72 },
      cohesion: 78,
      formedDate: new Date('1952-01-01'),
    },
    {
      id: 'dgp',
      name: 'DAP-Gerakan Pact',
      // Alliance in 1969 included peninsula parties + Sabah (USNO, SCA)
      // + Sarawak (Bumiputera Party, Pesaka, SUCP, SNAP at various points).
      // SNAP was an Alliance member in Sarawak by 1969.
      memberPartyIds: [
        'dap', 'gerakan', 'pr',
      ],
      type: 'Pact',
      leaderPartyId: 'dap',
      ideology: { economic: 60, governance: 72 },
      cohesion: 78,
      formedDate: new Date('1968-01-01'),
    },
  ],
};