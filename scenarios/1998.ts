import { COLOR_PALETTE } from '../constants';
import { Party, PoliticalAlliance, ScenarioConfig } from '../types';

// ─────────────────────────────────────────────────────────────
//  1998 — THE MILLENNIUM CRISIS
//  Date: 1 Jan 1998  (Full Malaysia)
//  Context: Asian Financial Crisis, Anwar Ibrahim sacked
//  Sep 1998. PKR formally launched April 1999 — listed here
//  as a nascent movement (pre-launch); Barisan Alternatif
//  forms Oct 1998.
// ─────────────────────────────────────────────────────────────
export const SCENARIO_1998: ScenarioConfig = {
  id: '1998_crisis',
  title: 'The Millennium Crisis',
  date: '1998-01-01',
  description:
    'The Asian Financial Crisis threatens decades of growth. The ringgit collapses. Anwar Ibrahim will soon be sacked, arrested, and charged — igniting a Reformasi movement that fractures UMNO and unites the opposition for the first time. Manage economic shocks while confronting unprecedented political turbulence.',
 
  parties: [
    // ── PENINSULAR MALAYSIA ───────────────────────────────────
 
    {
      id: 'umno',
      name: 'UMNO',
      color: COLOR_PALETTE[3],
      affiliationIds: [
        'malay-civil', 'malay-edu', 'malay-merchant', 'malay-nat',
        'malay-royalist', 'malay-professional', 'malay-biz',
        'malay-farmer', 'malay-labour', 'malay-youth', 'malay-veteran',
        'orang-asli-batin', 'orang-asli-youth', 'orang-asli-land', 'orang-asli-edu',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Malay',
      relations: new Map(),
      unity: 82, // Cracking under Anwar/Mahathir split
      ideology: { economic: 68, governance: 85 },
      funds: 80000000,
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
      unity: 80,
      ideology: { economic: 78, governance: 62 },
      funds: 12000000,
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
      unity: 72,
      ideology: { economic: 48, governance: 58 },
      funds: 3500000,
    },
 
    {
      id: 'pas',
      name: 'PAS',
      color: COLOR_PALETTE[1],
      affiliationIds: ['malay-religious', 'malay-islamist', 'malay-veteran'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Malay',
      relations: new Map(),
      unity: 90,
      ideology: { economic: 98, governance: 90 },
      funds: 5000000,
    },
 
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
      unity: 85,
      ideology: { economic: 28, governance: 28 },
      funds: 2500000,
    },
 
    {
      id: 'gerakan',
      name: 'Gerakan',
      color: '#1A6BAD',
      affiliationIds: [
        'chinese-professional', 'chinese-youth',
        'chinese-chamber', 'chinese-clan', 'chinese-merchant',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Multi-Racial',
      relations: new Map(),
      unity: 78,
      ideology: { economic: 58, governance: 35 },
      funds: 3000000,
    },
 
    // Parti Raayat — still extant in 1998, very small.
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
      unity: 62,
      ideology: { economic: 22, governance: 50 },
      funds: 200000,
    },
 
    // PKR — Reformasi movement crystallising. Anwar sacked
    // Sep 1998; Keadilan Nasional launched April 1999.
    // Represented here as a nascent movement with low funds/unity.
    {
      id: 'pkr',
      name: 'Parti Keadilan Rakyat',
      color: '#ADD8E6',
      affiliationIds: [
        'malay-prog', 'malay-intel', 'malay-farmer',
        'chinese-progressive', 'indian-reform',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Multi-Racial',
      relations: new Map(),
      unity: 55, // Still coalescing
      ideology: { economic: 38, governance: 42 },
      funds: 400000,
    },
 
    // Semangat 46 — technically dissolved back into UMNO in 1996,
    // but some of its network feeds into PKR/Reformasi by 1998.
    // Omitted as a party; its affiliations redistributed to UMNO
    // and nascent PKR above.
 
    // ── SABAH ─────────────────────────────────────────────────
 
    // UPKO — Native non-Muslim Sabah representation.
    {
      id: 'upko',
      name: 'UPKO',
      color: '#F57F17',
      affiliationIds: [
        'kadazan-dusun-union', 'sabah-native-chiefs', 'sabah-murut-society',
        'sabah-native-prog', 'sabah-native-youth', 'sabah-native-professionals',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sabah (Non-Muslim)',
      relations: new Map(),
      unity: 82,
      ideology: { economic: 38, governance: 68 },
      funds: 2500000,
    },
 
    // UMNO Sabah — UMNO expanded into Sabah in 1991, absorbing
    // most of USNO's base and the bulk of PBS defectors by 1994.
    {
      id: 'umno-sabah',
      name: 'UMNO Sabah',
      color: COLOR_PALETTE[3],
      affiliationIds: [
        'sabah-malay-youth', 'sabah-malay-city', 'sabah-malay-professionals',
        'sabah-malay-traders', 'sabah-native-rights',
        'sabah-malay-united', 'sabah-malay-fishermen', 'sabah-malay-religious',
        'sabah-bajau-assn', 'sabah-native-farmers', 'sabah-malay-agriculture',
        'sabah-bumiputera-muslim-village', 'sabah-bumiputera-muslim-youth',
        'sabah-bumiputera-muslim-merchants', 'sabah-bumiputera-muslim-professionals',
        'sabah-bumiputera-muslim-urban',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sabah (Muslim)',
      relations: new Map(),
      unity: 85,
      ideology: { economic: 62, governance: 82 },
      funds: 15000000,
    },
 
    // Sabah Chinese bloc (consolidated into one party by 1998,
    // representing SCA successor + business community).
    {
      id: 'lsba',
      name: 'Liberal Democratic Party (Sabah)',
      color: '#C62828',
      affiliationIds: [
        'sabah-chinese-chamber', 'sabah-chinese-guild',
        'sabah-chinese-planters', 'sabah-chinese-hawkers',
        'sabah-chinese-education', 'sabah-chinese-union', 'sabah-chinese-fisheries',
        'sabah-chinese-youth',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Sabahan Chinese',
      relations: new Map(),
      unity: 75,
      ideology: { economic: 80, governance: 42 },
      funds: 8000000,
    },
 
    // ── SARAWAK ───────────────────────────────────────────────
 
    // PBB — dominant Sarawak Bumiputera party (post-1973 merger).
    {
      id: 'pbb',
      name: 'Parti Pesaka Bumiputera Bersatu',
      color: '#1A237E',
      affiliationIds: [
        'sarawak-malay-assn', 'sarawak-malay-religious',
        'sarawak-malay-kampung', 'sarawak-malay-traders', 'sarawak-malay-fishermen',
        'sarawak-malay-urban', 'sarawak-malay-youth', 'sarawak-malay-professionals',
        'sarawak-bumiputera-muslim-village', 'sarawak-bumiputera-muslim-farmers',
        'sarawak-bumiputera-muslim-youth', 'sarawak-bumiputera-muslim-merchants',
        'sarawak-bumiputera-muslim-scholars', 'sarawak-bumiputera-muslim-professionals',
        'sarawak-bumiputera-muslim-urban',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sarawak (Muslim)',
      relations: new Map(),
      unity: 88,
      ideology: { economic: 48, governance: 76 },
      funds: 12000000,
    },
 
    // SUPP — Chinese-majority, now inside BN coalition.
    {
      id: 'supp',
      name: "Sarawak United People's Party",
      color: '#C62828',
      affiliationIds: [
        'sarawak-united-peoples', 'sarawak-chinese-education',
        'sarawak-chinese-clan', 'sarawak-chinese-youth',
        'sarawak-chinese-business', 'sarawak-chinese-planters',
        'sarawak-chinese-professionals', 'sarawak-chinese-chamber',
        'sarawak-chinese-merchants',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Sarawakian Chinese',
      relations: new Map(),
      unity: 82,
      ideology: { economic: 55, governance: 48 },
      funds: 8000000,
    },
 
    // SNAP — by 1998 largely a rump; Dayak vote split with PBDS.
    {
      id: 'snap',
      name: 'Sarawak National Party',
      color: '#E65100',
      affiliationIds: ['dayak-national', 'iban-leaders', 'sarawak-longhouse'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sarawak (Non-Muslim)',
      relations: new Map(),
      unity: 62,
      ideology: { economic: 35, governance: 65 },
      funds: 1200000,
    },
 
    // PBDS — assertive Dayak nationalist party (formed 1983).
    {
      id: 'pbds',
      name: 'Parti Bansa Dayak Sarawak',
      color: '#880E4F',
      affiliationIds: [
        'sarawak-native-rights', 'sarawak-native-youth', 'sarawak-native-edu',
        'sarawak-bidayuh-union', 'orang-ulu-alliance', 'sarawak-native-professionals',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Bumiputera Sarawak (Non-Muslim)',
      relations: new Map(),
      unity: 78,
      ideology: { economic: 28, governance: 55 },
      funds: 3000000,
    },
  ],
 
  alliances: [
    {
      id: 'bn',
      name: 'Barisan Nasional',
      memberPartyIds: [
        'umno', 'mca', 'mic', 'gerakan',
        'upko', 'umno-sabah', 'lsba',
        'supp', 'snap', 'pbb', 'pbds',
      ],
      type: 'Alliance',
      leaderPartyId: 'umno',
      ideology: { economic: 62, governance: 72 },
      cohesion: 78,
      formedDate: new Date('1973-01-01'),
    },
    {
      id: 'ba',
      name: 'Barisan Alternatif',
      // BA formed Oct 1998 (after Anwar's arrest); PKR technically
      // pre-launch but its nucleus joins the coalition.
      memberPartyIds: ['pkr', 'pas', 'dap', 'pr'],
      type: 'Pact',
      leaderPartyId: 'pkr',
      ideology: { economic: 38, governance: 45 },
      cohesion: 48,
      formedDate: new Date('1998-10-24'),
    },
  ],
};