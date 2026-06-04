import { COLOR_PALETTE } from '../constants';
import { Party, PoliticalAlliance, ScenarioConfig } from '../types';
 
// ─────────────────────────────────────────────────────────────
//  1947 — THE GRAND DESIGN
//  Date: 1 Jan 1947  (Malaya only — no Malaysia yet)
//  Context: Post-WWII, Malayan Union controversy, UMNO freshly
//  founded (May 1946), left-wing nationalism rising, MIC and
//  MCA do not yet exist in their familiar forms.
// ─────────────────────────────────────────────────────────────
export const SCENARIO_1947: ScenarioConfig = {
  id: '1947_grand_design',
  title: 'The Grand Design',
  date: '1947-01-01',
  description:
    'The early days of party politics begin on the Malay Peninsula. The Malayan Union proposal has sparked fury among Malay nationalists. Shape the very foundations of a future nation — build ideological networks from scratch, forge alliances, and navigate colonial transition.',
 
  parties: [
    // ── UMNO ──────────────────────────────────────────────────
    // Founded May 1946. Broad Malay coalition opposing the Malayan Union.
    // In 1947 it is still a mass movement more than a disciplined party —
    // high unity around the single issue of defending Malay rights vs the MU.
    {
      id: 'umno',
      name: 'UMNO',
      color: COLOR_PALETTE[3],
      affiliationIds: [
        'malay-civil', 'malay-edu', 'malay-merchant', 'malay-nat',
        'malay-royalist', 'malay-prog', 'malay-professional',
        'malay-farmer', 'malay-veteran',
        'orang-asli-batin', 'orang-asli-youth',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Malay',
      relations: new Map(),
      unity: 88,
      ideology: { economic: 55, governance: 82 },
      funds: 40000000,
    },
 
    // ── Parti Kebangsaan Melayu Malaya (PKMM) ─────────────────
    // Malay nationalist-left party, formed 1945. Aligned with
    // AMCJA in the Hartal (1947). Anti-colonial, socialist-leaning.
    {
      id: 'pkmm',
      name: 'Parti Kebangsaan Melayu Malaya',
      color: COLOR_PALETTE[10],
      affiliationIds: ['malay-socialist', 'malay-labour', 'malay-intel', 'malay-youth'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Malay',
      relations: new Map(),
      unity: 72,
      ideology: { economic: 22, governance: 55 },
      funds: 6000000,
    },
 
    // ── MCA (proto-form) ──────────────────────────────────────
    // The Malayan Chinese Association was formally founded in Feb
    // 1949; in 1947 Chinese community politics centred on clan
    // associations, the OCBC network, and KMT-linked commerce.
    // Represented here as the organised Chinese business/education
    // lobby that would coalesce into MCA.
    {
      id: 'mca',
      name: 'Malayan Chinese Association',
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
      unity: 70,
      ideology: { economic: 82, governance: 58 },
      funds: 8500000,
    },
 
    // ── Malayan Democratic Union (MDU) ────────────────────────
    // First political party in post-war Malaya (Jan 1946).
    // Multi-racial, left-liberal, largely Chinese professionals
    // and some Indian reformists. Part of AMCJA coalition.
    {
      id: 'mdu',
      name: 'Malayan Democratic Union',
      color: COLOR_PALETTE[15],
      affiliationIds: ['chinese-progressive', 'chinese-intel', 'chinese-labour', 'indian-prog'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Multi-Racial',
      relations: new Map(),
      unity: 68,
      ideology: { economic: 25, governance: 28 },
      funds: 850000,
    },
 
    // ── MIC (early form) ──────────────────────────────────────
    // Founded Aug 1946. Initially more left-leaning and linked to
    // the Indian National Congress ethos. Estate workers dominant.
    {
      id: 'mic',
      name: 'Malayan Indian Congress',
      color: COLOR_PALETTE[4],
      affiliationIds: ['indian-trad', 'indian-reform', 'indian-estate', 'indian-labour'],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Indian',
      relations: new Map(),
      unity: 65,
      ideology: { economic: 32, governance: 45 },
      funds: 600000,
    },
 
    // ── Angkatan Wanita Sedar / Putera-AMCJA bloc ─────────────
    // The left-nationalist Malay women's movement (AWAS) and the
    // broader Putera coalition (API, AWAS, PKMM) allied with the
    // AMCJA to oppose the Federation of Malaya Agreement.
    // Represented as an independent left bloc separate from PKMM.
    {
      id: 'putera',
      name: 'Putera-AMCJA',
      color: '#7B1FA2',
      affiliationIds: [
        'malay-farmer', 'indian-merchant', 'chinese-professional',
        'chinese-youth', 'indian-professional',
      ],
      deputyLeaderId: undefined,
      stateBranches: [],
      contestedSeats: new Map(),
      leaderHistory: [],
      ethnicityFocus: 'Multi-Racial',
      relations: new Map(),
      unity: 60,
      ideology: { economic: 18, governance: 38 },
      funds: 750000,
    },
  ],
 
  alliances: [
    // The formal Alliance (UMNO-MCA-MIC) does not yet exist in
    // 1947; it emerges from the 1952 KL municipal election.
    // Show only the loose Malay nationalist front here.
    {
      id: 'malay-front-1947',
      name: 'Malay Nationalist Front',
      memberPartyIds: ['umno', 'pmip'],
      type: 'Alliance',
      leaderPartyId: 'umno',
      ideology: { economic: 62, governance: 88 },
      cohesion: 65,
      formedDate: new Date('1946-05-11'),
    },
    {
      id: 'amcja',
      name: 'All-Malaya Council of Joint Action',
      memberPartyIds: ['mdu', 'mic', 'putera','pkmm'],
      type: 'Alliance',
      leaderPartyId: 'mdu',
      ideology: { economic: 25, governance: 35 },
      cohesion: 52,
      formedDate: new Date('1946-12-01'),
    },
  ],
};