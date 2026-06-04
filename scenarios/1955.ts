import { COLOR_PALETTE } from '../constants';
import { Party, PoliticalAlliance, ScenarioConfig } from '../types';

// ─────────────────────────────────────────────────────────────
//  1955 — EVE OF INDEPENDENCE
//  Date: 27 Jan 1955  (Malaya only — Malaysia formed 1963)
//  Context: First federal election. Alliance dominates.
//  PMIP is the main Malay opposition. No Sabah/Sarawak parties.
// ─────────────────────────────────────────────────────────────
export const SCENARIO_1955: ScenarioConfig = {
  id: '1955_independence',
  title: 'Eve of Independence',
  date: '1955-01-27',
  description:
    'With independence on the horizon, the Alliance coalition has been forged. The first federal election in Malaya looms. Can you secure a mandate strong enough to negotiate independence from the British?',
 
  parties: [
    // ── UMNO ──────────────────────────────────────────────────
    {
      id: 'umno',
      name: 'UMNO',
      color: COLOR_PALETTE[3],
      affiliationIds: [
        'malay-civil', 'malay-edu', 'malay-merchant', 'malay-nat',
        'malay-royalist', 'malay-prog', 'malay-professional',
        'malay-farmer', 'malay-youth', 'malay-veteran',
        'orang-asli-batin', 'orang-asli-youth', 'orang-asli-land', 'orang-asli-edu',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Malay',
      relations: new Map(),
      unity: 92,
      ideology: { economic: 58, governance: 80 },
      funds: 8000000,
    },
 
    // ── MCA ───────────────────────────────────────────────────
    {
      id: 'mca',
      name: 'MCA',
      color: COLOR_PALETTE[2],
      affiliationIds: [
        'chinese-biz', 'chinese-edu', 'chinese-merchant',
        'chinese-chamber', 'chinese-clan',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Chinese',
      relations: new Map(),
      unity: 84,
      ideology: { economic: 80, governance: 60 },
      funds: 3500000,
    },
 
    // ── MIC ───────────────────────────────────────────────────
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
      unity: 78,
      ideology: { economic: 45, governance: 55 },
      funds: 1200000,
    },
 
    // ── PMIP ─────────────────────────────────────────────────
    // Pan-Malayan Islamic Party; split from UMNO's ulama wing in
    // 1951. Strong in Kelantan & Terengganu.
    {
      id: 'pmip',
      name: 'PMIP',
      color: COLOR_PALETTE[1],
      affiliationIds: ['malay-religious', 'malay-islamist'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Malay',
      relations: new Map(),
      unity: 88,
      ideology: { economic: 98, governance: 95 },
      funds: 1500000,
    },
 
    // ── Parti Raayat ─────────────────────────────────────────
    // Socialist party; contested 1955 election.
    {
      id: 'pr',
      name: 'Parti Raayat',
      color: COLOR_PALETTE[10],
      affiliationIds: ['malay-socialist', 'malay-labour'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Multi-Racial',
      relations: new Map(),
      unity: 75,
      ideology: { economic: 22, governance: 55 },
      funds: 350000,
    },
 
    // ── Labour Party of Malaya ────────────────────────────────
    // Multi-racial, urban labour/left bloc. Contest 1955 elections
    // in alliance with Parti Raayat (Socialist Front, formalized 1957).
    {
      id: 'lpm',
      name: 'Labour Party of Malaya',
      color: '#B71C1C',
      affiliationIds: [
        'chinese-labour', 'indian-labour', 'indian-estate',
        'chinese-progressive', 'indian-prog',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Multi-Racial',
      relations: new Map(),
      unity: 72,
      ideology: { economic: 15, governance: 32 },
      funds: 280000,
    },
  ],
 
  alliances: [
    {
      id: 'alliance',
      name: 'The Alliance',
      memberPartyIds: ['umno', 'mca', 'mic'],
      type: 'Alliance',
      leaderPartyId: 'umno',
      ideology: { economic: 62, governance: 72 },
      cohesion: 85,
      formedDate: new Date('1952-01-01'),
    },
    {
      id: 'socialist-front',
      name: 'Socialist Front',
      memberPartyIds: ['pr', 'lpm'],
      type: 'Alliance',
      leaderPartyId: 'lpm',
      ideology: { economic: 18, governance: 42 },
      cohesion: 58,
      formedDate: new Date('1954-06-01'),
    },
  ],
};