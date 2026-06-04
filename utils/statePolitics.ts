import { 
    StateGovernment, Party, Character, Minister, 
    GeoJsonFeature, ElectionResults, PoliticalAlliance 
} from '../types';
import { getPartySeatCounts } from './politics';

// ─── Constants ─────────────────────────────────────────────────────────────────

// Real Malaysian DUN (Dewan Undangan Negeri) seat counts
const STATE_DUN_SEATS: Record<string, number> = {
    'JOHOR':           56,
    'KEDAH':           36,
    'KELANTAN':        45,
    'MELAKA':          28,
    'NEGERI SEMBILAN': 36,
    'PAHANG':          42,
    'PERAK':           59,
    'PERLIS':          15,
    'PULAU PINANG':    40,
    'SABAH':           73,
    'SARAWAK':         82,
    'SELANGOR':        56,
    'TERENGGANU':      32,
    // Federal Territories — no DUN
    'W.P. KUALA LUMPUR':     15,
    'LABUAN':           0,
    'PUTRAJAYA':        0,
};

const DEFAULT_DUN_PER_PARLIAMENT = 3; // Fallback for unknown states
const STATE_ELECTION_INTERVAL_YEARS = 5;
const MAJORITY_THRESHOLD_FACTOR = 0.5;

// ─── Extended State-level Types ────────────────────────────────────────────────

export interface StateElectionSchedule {
    state: string;
    nextElectionDate: Date;
    lastElectionDate: Date | null;
}

export interface StateApprovalRecord {
    state: string;
    approvalRating: number;
    economicScore: number;
    stabilityScore: number;
    lastUpdated: Date;
}

export interface StateCrisisEvent {
    id: string;
    state: string;
    title: string;
    description: string;
    type: 'flood' | 'corruption' | 'protest' | 'economic' | 'health';
    severity: 'low' | 'medium' | 'high';
    approvalImpact: number;
    date: Date;
    resolved: boolean;
    resolutionDate?: Date;
}

export interface StateByElectionResult {
    state: string;
    seatCode: string;
    seatName: string;
    date: Date;
    winnerPartyId: string;
    winnerName: string;
    previousHolderPartyId: string;
}

export interface InterStateRelation {
    stateA: string;
    stateB: string;
    cooperationScore: number;
    disputeTopics: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export const getUniqueStates = (features: GeoJsonFeature[]): string[] => {
    const states = new Set(features.map(f => f.properties.NEGERI));
    return Array.from(states).filter(Boolean) as string[];
};

/** Get the real total DUN seat count for a state. */
export const getStateTotalDunSeats = (state: string): number => {
    if (state in STATE_DUN_SEATS) return STATE_DUN_SEATS[state];
    return DEFAULT_DUN_PER_PARLIAMENT;
};

/** Determine if a state uses the Chief Minister (CM) title vs Menteri Besar (MB). */
export const getStateLeaderTitle = (state: string): 'Chief Minister' | 'Menteri Besar' => {
    const cmStates = ['SARAWAK', 'SABAH', 'PULAU PINANG', 'MELAKA'];
    return cmStates.includes(state) ? 'Chief Minister' : 'Menteri Besar';
};

/** Check whether a party is regionally eligible for a given state. */
const isPartyEligibleForState = (
    party: Party,
    state: string,
    characters: Character[]
): boolean => {
    const partyMembers = characters.filter(c => party.affiliationIds.includes(c.affiliationId) && c.isAlive);
    if (partyMembers.length === 0) return false;

    const hasMemberFromState = partyMembers.some(c => c.state === state);
    if (!hasMemberFromState) return false;

    const sabahMembers   = partyMembers.filter(c => c.state === 'SABAH').length;
    const sarawakMembers = partyMembers.filter(c => c.state === 'SARAWAK').length;
    const total          = partyMembers.length;

    const isSabahParty   = sabahMembers   / total > 0.7;
    const isSarawakParty = sarawakMembers / total > 0.7;
    const isBorneoParty  = (sabahMembers + sarawakMembers) / total > 0.7;

    if (state === 'SABAH')   return !isSarawakParty;
    if (state === 'SARAWAK') return !isSabahParty;
    return !isBorneoParty;
};

/** Calculate a rough popularity score for a party in a given state. */
const calculateStatePartyPopularity = (
    partyId: string,
    state: string,
    parties: Party[],
    characters: Character[],
    parliamentResults: ElectionResults,
    features: GeoJsonFeature[]
): number => {
    const party = parties.find(p => p.id === partyId);
    if (!party) return 0;

    const stateSeats = features.filter(f => f.properties.NEGERI === state);
    const wonSeats   = stateSeats.filter(f => parliamentResults.get(f.properties.UNIQUECODE) === partyId).length;
    let score = wonSeats * 20;

    const stateMembers = characters.filter(c =>
        c.state === state && party.affiliationIds.includes(c.affiliationId) && c.isAlive
    );
    const avgInfluence = stateMembers.length > 0
        ? stateMembers.reduce((s, c) => s + c.influence, 0) / stateMembers.length
        : 0;
    score += avgInfluence * 0.5;

    return score;
};

// ─── Core: Simulate State Election ────────────────────────────────────────────

/**
 * Simulate state (DUN) assembly seat distribution.
 *
 * - Uses real DUN seat counts per state (STATE_DUN_SEATS).
 * - DUN seats under each parliament seat are contested individually with
 *   per-seat variance, producing realistic split outcomes.
 * - Alliance vote-pooling: allies of the federal winner share a secondary lift.
 * - Each DUN seat is a weighted-FPTP roll, so fringe parties can occasionally win.
 */
export const simulateStateElectionResults = (
    state: string,
    parliamentResults: ElectionResults,
    features: GeoJsonFeature[],
    parties: Party[],
    characters: Character[],
    alliances: PoliticalAlliance[] = []
): Map<string, number> => {
    const dunSeats = new Map<string, number>(parties.map(p => [p.id, 0]));

    const stateParliamentSeats = features.filter(f => f.properties.NEGERI === state);
    if (stateParliamentSeats.length === 0) return dunSeats;

    // Federal territories have no DUN
    const totalDun = getStateTotalDunSeats(state);
    if (totalDun === 0) return dunSeats;

    const eligibleParties = parties.filter(p => isPartyEligibleForState(p, state, characters));
    const partiesPool = eligibleParties.length > 0 ? eligibleParties : parties;

    const parliamentCount = stateParliamentSeats.length;
    // Distribute DUN seats across parliament seats as evenly as possible
    const baseDunPerParliament = Math.floor(totalDun / parliamentCount);
    const dunRemainder = totalDun % parliamentCount;

    // Alliance membership lookup: partyId → Set of all ally partyIds in same alliance
    const allianceMembersOf = new Map<string, Set<string>>();
    alliances.forEach(a => {
        const memberSet = new Set<string>(a.memberPartyIds);
        a.memberPartyIds.forEach(pid => allianceMembersOf.set(pid, memberSet));
    });

    // Pre-compute state-level influence once per party — avoids O(n²) recalculation
    const stateInfluenceCache = new Map<string, number>();
    partiesPool.forEach(p => {
        stateInfluenceCache.set(
            p.id,
            calculateStatePartyPopularity(p.id, state, parties, characters, parliamentResults, features)
        );
    });

    // ── Per-parliament-seat DUN simulation ───────────────────────────────────
    stateParliamentSeats.forEach((seat, seatIdx) => {
        const seatCode = seat.properties.UNIQUECODE;
        const federalWinnerId = parliamentResults.get(seatCode);

        // DUN seats allocated to this parliament seat (remainder distributed to first N seats)
        const dunForThisSeat = baseDunPerParliament + (seatIdx < dunRemainder ? 1 : 0);
        if (dunForThisSeat === 0) return;

        // Build vote weight for each eligible party in this parliament seat
        const partyWeights = new Map<string, number>();

        partiesPool.forEach(party => {
            let weight = 10; // Baseline — fringe parties retain small chance

            if (party.id === federalWinnerId) {
                // Federal winner gets a strong home-ground lift
                weight += 55 + Math.random() * 15;
            } else if (federalWinnerId) {
                // Alliance partners of the federal winner share a secondary lift
                const allies = allianceMembersOf.get(federalWinnerId);
                if (allies?.has(party.id)) {
                    weight += 20 + Math.random() * 10;
                }
            }

            // State-level influence: parliamentary seat count + member influence
            weight += (stateInfluenceCache.get(party.id) || 0) * 0.4;
            
            // Local campaign investment bonus (boosts DUN probability significantly)
            const investment = party.campaignInvestments?.get(seatCode) || 0;
            weight += (investment / 100000) * 25; 

            // Per-seat variance — each DUN seat can swing independently
            weight *= 0.75 + Math.random() * 0.5; // ±25% swing

            partyWeights.set(party.id, Math.max(0, weight));
        });

        const totalWeight = Array.from(partyWeights.values()).reduce((s, v) => s + v, 0);
        if (totalWeight === 0) return;

        // Simulate each individual DUN seat via weighted FPTP
        for (let dunIdx = 0; dunIdx < dunForThisSeat; dunIdx++) {
            // Independent roll per DUN seat — avoids all seats under one parliament seat flipping together
            const roll = Math.random() * totalWeight;
            let cumulative = 0;
            let winnerId = partiesPool[0]?.id || '';

            for (const [pid, weight] of partyWeights) {
                cumulative += weight;
                if (roll <= cumulative) {
                    winnerId = pid;
                    break;
                }
            }

            dunSeats.set(winnerId, (dunSeats.get(winnerId) || 0) + 1);
        }
    });

    return dunSeats;
};

// ─── Core: Form State Government ──────────────────────────────────────────────

/**
 * Determine which coalition forms the state government and pick a CM/MB.
 */
export const formStateGovernment = (
    state: string,
    seatDistribution: Map<string, number>,
    parties: Party[],
    characters: Character[],
    alliances: PoliticalAlliance[],
    currentDate: Date,
    previousGov?: StateGovernment,
    federalRulingPartyId?: string
): StateGovernment => {
    const totalSeats        = Array.from(seatDistribution.values()).reduce((a, b) => a + b, 0);
    const majorityThreshold = Math.floor(totalSeats * MAJORITY_THRESHOLD_FACTOR) + 1;

    // Special handling for Kuala Lumpur City Council
    if (state === 'W.P. KUALA LUMPUR') {
        // City Council has no government and opposition. Every party that wins seats is part of the council.
        const rulingCoalitionIds = Array.from(seatDistribution.entries())
            .filter(([_, count]) => count > 0)
            .map(([partyId]) => partyId);

        // City Mayor is chosen by the winning federal party, and is not from the city councillors (excluding W.P. KUALA LUMPUR residents)
        let cmCandidate: Character | undefined;
        if (federalRulingPartyId) {
            const federalParty = parties.find(p => p.id === federalRulingPartyId);
            if (federalParty) {
                // Sourced from members not originally in W.P. KUALA LUMPUR (or fallback to any member of the party)
                const partyCharacters = characters.filter(c => 
                    federalParty.affiliationIds.includes(c.affiliationId) && 
                    c.isAlive && 
                    c.state !== 'W.P. KUALA LUMPUR'
                ).sort((a, b) => b.influence - a.influence);
                
                if (partyCharacters.length > 0) {
                    cmCandidate = partyCharacters[0];
                } else {
                    const fallbackChars = characters.filter(c => 
                        federalParty.affiliationIds.includes(c.affiliationId) && 
                        c.isAlive
                    ).sort((a, b) => b.influence - a.influence);
                    if (fallbackChars.length > 0) cmCandidate = fallbackChars[0];
                }
            }
        }

        // Proportional Exco selection based on proportion of party seats in the city council
        const exco: Minister[] = [];
        const excoPortfolios = [
            'Finance', 'Infrastructure & Utilities', 'Health',
            'Education', 'Agriculture & Agro-Industry', 'Tourism & Environment',
            'Local Government', 'Housing & Planning',
        ];

        const klSeats = Array.from(seatDistribution.entries()).filter(([_, count]) => count > 0);
        klSeats.sort((a, b) => b[1] - a[1]); // Order of party size

        if (klSeats.length > 0) {
            const totalKlSeats = klSeats.reduce((sum, [_, count]) => sum + count, 0);
            
            // Proportional allocation (largest remainder)
            const partySlotAllocations = klSeats.map(([partyId, count]) => {
                const floatSlots = (count / totalKlSeats) * excoPortfolios.length;
                return {
                    partyId,
                    seats: count,
                    minSlots: Math.floor(floatSlots),
                    remainder: floatSlots - Math.floor(floatSlots)
                };
            });

            let allocatedSlots = partySlotAllocations.reduce((sum, p) => sum + p.minSlots, 0);
            const slotsNeeded = excoPortfolios.length - allocatedSlots;

            if (slotsNeeded > 0) {
                partySlotAllocations.sort((a, b) => b.remainder - a.remainder);
                for (let i = 0; i < slotsNeeded; i++) {
                    if (partySlotAllocations[i]) {
                        partySlotAllocations[i].minSlots += 1;
                    }
                }
            }

            const partySlotsMap = new Map<string, number>(partySlotAllocations.map(p => [p.partyId, p.minSlots]));
            const partyToCharacters = new Map<string, Character[]>();
            
            parties.forEach(p => {
                const pChars = characters.filter(c => 
                    p.affiliationIds.includes(c.affiliationId) && 
                    c.state === 'W.P. KUALA LUMPUR' && 
                    c.isAlive && 
                    c.id !== cmCandidate?.id
                ).sort((a, b) => b.influence - a.influence);
                partyToCharacters.set(p.id, pChars);
            });

            let portfolioIdx = 0;
            klSeats.forEach(([partyId]) => {
                const slotsToFill = partySlotsMap.get(partyId) || 0;
                const availableChars = partyToCharacters.get(partyId) || [];
                
                for (let i = 0; i < slotsToFill; i++) {
                    if (portfolioIdx >= excoPortfolios.length) break;
                    const portfolio = excoPortfolios[portfolioIdx];
                    const char = availableChars[i];
                    
                    if (char) {
                        exco.push({ ministerId: char.id, portfolio });
                    } else {
                        // Sourced from general party pool if needed
                        const generalChars = characters.filter(c => 
                            parties.find(p => p.id === partyId)?.affiliationIds.includes(c.affiliationId) && 
                            c.isAlive && 
                            c.id !== cmCandidate?.id && 
                            !exco.some(m => m.ministerId === c.id)
                        ).sort((a, b) => b.influence - a.influence);
                        
                        if (generalChars[0]) {
                            exco.push({ ministerId: generalChars[0].id, portfolio });
                        }
                    }
                    portfolioIdx++;
                }
            });
        }

        const finalCmId = cmCandidate?.id || 'VACANT';
        const cmPartyId = parties.find(p => p.affiliationIds.includes(cmCandidate?.affiliationId || ''))?.id;
        let cmHistory = previousGov ? [...previousGov.cmHistory] : [];
        
        if (cmHistory.length === 0 || cmHistory[cmHistory.length - 1].cmId !== finalCmId) {
            if (cmHistory.length > 0) {
                cmHistory[cmHistory.length - 1].endDate = currentDate;
            }
            cmHistory.push({
                cmId: finalCmId,
                startDate: currentDate,
                partyId: cmPartyId
            });
        }

        return {
            state,
            chiefMinisterId: finalCmId,
            rulingCoalitionIds,
            executiveCouncil: exco,
            formedDate: currentDate,
            seatDistribution,
            totalSeats,
            cmHistory,
        };
    }

    // ── 1. Find the ruling coalition ──────────────────────────────────────────
    let rulingCoalitionIds: string[] = [];
    let bestSeatCount = 0;

    for (const alliance of alliances) {
        const allianceSeats = alliance.memberPartyIds.reduce((s, pid) => s + (seatDistribution.get(pid) || 0), 0);
        if (allianceSeats > bestSeatCount) {
            bestSeatCount      = allianceSeats;
            rulingCoalitionIds = [...alliance.memberPartyIds];
        }
    }

    for (const party of parties) {
        const seats      = seatDistribution.get(party.id) || 0;
        const inAlliance = alliances.some(a => a.memberPartyIds.includes(party.id));
        if (!inAlliance && seats > bestSeatCount) {
            bestSeatCount      = seats;
            rulingCoalitionIds = [party.id];
        }
    }

    // Hung assembly fallback - negotiate a coalition
    if (bestSeatCount < majorityThreshold) {
        let currentSeats = bestSeatCount;
        
        // Find leading party to negotiate
        let maxSeatsInCurrent = -1;
        let leadPartyId = rulingCoalitionIds[0];
        rulingCoalitionIds.forEach(id => {
            const s = seatDistribution.get(id) || 0;
            if (s > maxSeatsInCurrent) {
                maxSeatsInCurrent = s;
                leadPartyId = id;
            }
        });

        const leadParty = parties.find(p => p.id === leadPartyId);
        
        if (leadParty) {
            const alliancesNotIncluded = alliances.filter(a => !rulingCoalitionIds.includes(a.memberPartyIds[0]));
            const independentPartiesNotIncluded = parties.filter(p => !alliances.some(a => a.memberPartyIds.includes(p.id)) && !rulingCoalitionIds.includes(p.id));
            
            const potentialPartners: { ids: string[], score: number, seats: number }[] = [];
            
            for (const a of alliancesNotIncluded) {
                 const leader = parties.find(p => p.id === a.leaderPartyId);
                 const baseScore = leader ? leadParty.relations.get(leader.id) || 50 : 50;
                 const seats = a.memberPartyIds.reduce((s, id) => s + (seatDistribution.get(id) || 0), 0);
                 if (seats > 0) {
                     potentialPartners.push({ ids: a.memberPartyIds, score: baseScore, seats });
                 }
            }
            
            for (const p of independentPartiesNotIncluded) {
                 const score = leadParty.relations.get(p.id) || 50;
                 const seats = seatDistribution.get(p.id) || 0;
                 if (seats > 0) {
                     potentialPartners.push({ ids: [p.id], score, seats });
                 }
            }
            
            // Sort potential partners by relations (highest first), then by seats
            potentialPartners.sort((a, b) => {
                 if (Math.abs(b.score - a.score) > 10) return b.score - a.score;
                 return b.seats - a.seats;
            });
            
            for (const partner of potentialPartners) {
                if (currentSeats >= majorityThreshold) break;
                if (partner.score < 30) continue; // Reject hostile alliances
                
                partner.ids.forEach(id => {
                    rulingCoalitionIds.push(id);
                    currentSeats += (seatDistribution.get(id) || 0);
                });
            }
        }
    }

    // ── 2. Dominant party within coalition ────────────────────────────────────
    let dominantPartyId     = rulingCoalitionIds[0];
    let maxSeatsInCoalition = -1;
    rulingCoalitionIds.forEach(pid => {
        const seats = seatDistribution.get(pid) || 0;
        if (seats > maxSeatsInCoalition) {
            maxSeatsInCoalition = seats;
            dominantPartyId     = pid;
        }
    });

    const dominantParty = parties.find(p => p.id === dominantPartyId);

    // ── 3. Select Chief Minister / Menteri Besar ──────────────────────────────
    let cmCandidate: Character | undefined;

    // Check if the ruling coalition is an alliance
    const rulingAlliance = alliances.find(a => 
        a.memberPartyIds.length === rulingCoalitionIds.length && 
        a.memberPartyIds.every(id => rulingCoalitionIds.includes(id))
    );

    if (rulingAlliance && rulingAlliance.stateLeaders) {
        const stateLeaderInfo = rulingAlliance.stateLeaders.get(state);
        if (stateLeaderInfo) {
            cmCandidate = characters.find(c => c.id === stateLeaderInfo.leaderId && c.isAlive);
        }
    }

    if (!cmCandidate && dominantParty) {
        const stateBranch = dominantParty.stateBranches.find(b => b.state === state);
        if (stateBranch?.leaderId) {
            cmCandidate = characters.find(c => c.id === stateBranch.leaderId && c.isAlive);
        }
    }

    if (!cmCandidate && dominantParty) {
        const stateMembers = characters
            .filter(c => dominantParty.affiliationIds.includes(c.affiliationId) && c.state === state && c.isAlive)
            .sort((a, b) => b.influence - a.influence);
        cmCandidate = stateMembers[0];
    }

    if (!cmCandidate && dominantParty) {
        cmCandidate = characters.find(c => dominantParty.affiliationIds.includes(c.affiliationId) && c.isAlive);
    }

    // ── 4. Build EXCO ─────────────────────────────────────────────────────────
    const exco: Minister[] = [];
    const excoPortfolios = [
        'Finance', 'Infrastructure & Utilities', 'Health',
        'Education', 'Agriculture & Agro-Industry', 'Tourism & Environment',
        'Local Government', 'Housing & Planning',
    ];

    const potentialExcos = characters
        .filter(c =>
            c.id !== cmCandidate?.id &&
            c.isAlive &&
            c.state === state &&
            rulingCoalitionIds.some(pid => {
                const p = parties.find(party => party.id === pid);
                return p?.affiliationIds.includes(c.affiliationId);
            })
        )
        .sort((a, b) => b.influence - a.influence)
        .slice(0, excoPortfolios.length);

    potentialExcos.forEach((char, idx) => {
        exco.push({ ministerId: char.id, portfolio: excoPortfolios[idx] });
    });

    const finalCmId = cmCandidate?.id || 'VACANT';
    const cmPartyId = parties.find(p => p.affiliationIds.includes(cmCandidate?.affiliationId || ''))?.id;
    let cmHistory = previousGov ? [...previousGov.cmHistory] : [];
    
    if (cmHistory.length === 0 || cmHistory[cmHistory.length - 1].cmId !== finalCmId) {
        if (cmHistory.length > 0) {
            cmHistory[cmHistory.length - 1].endDate = currentDate;
        }
        cmHistory.push({
            cmId: finalCmId,
            startDate: currentDate,
            partyId: cmPartyId
        });
    }

    return {
        state,
        chiefMinisterId: finalCmId,
        rulingCoalitionIds,
        executiveCouncil: exco,
        formedDate: currentDate,
        seatDistribution,
        totalSeats,
        cmHistory,
    };
};

// ─── State Election Scheduling ────────────────────────────────────────────────

export const getStateElectionSchedules = (
    states: string[],
    startDate: Date,
    electionHistory: { date: Date; results: ElectionResults }[]
): StateElectionSchedule[] => {
    const lastFederalElection = electionHistory.length > 0
        ? electionHistory[electionHistory.length - 1].date
        : startDate;

    return states.map(state => {
        const hasOwnCycle  = ['SABAH', 'SARAWAK'].includes(state);
        const offsetMonths = hasOwnCycle ? 8 : 0;

        const baseDate = new Date(lastFederalElection);
        baseDate.setFullYear(baseDate.getFullYear() + STATE_ELECTION_INTERVAL_YEARS);
        baseDate.setMonth(baseDate.getMonth() + offsetMonths);

        return {
            state,
            nextElectionDate: baseDate,
            lastElectionDate: lastFederalElection,
        };
    });
};

// ─── By-Election Logic ────────────────────────────────────────────────────────

export const conductStateByElection = (
    state: string,
    vacatedSeatCode: string,
    stateGovernment: StateGovernment,
    parties: Party[],
    characters: Character[],
    features: GeoJsonFeature[],
    currentDate: Date,
    currentApproval: number
): StateByElectionResult | null => {
    const seat = features.find(f => f.properties.UNIQUECODE === vacatedSeatCode);
    if (!seat) return null;

    const incumbentPenalty = currentApproval < 45 ? -15 : currentApproval > 65 ? 5 : -5;
    const eligibleParties  = parties.filter(p => isPartyEligibleForState(p, state, characters));

    const scores = new Map<string, number>();
    eligibleParties.forEach(party => {
        let score    = 30 + Math.random() * 40;
        const isRuling = stateGovernment.rulingCoalitionIds.includes(party.id);
        if (isRuling) score += incumbentPenalty;

        const stateSeats = stateGovernment.seatDistribution.get(party.id) || 0;
        score += stateSeats * 1.5;

        const stateMembers = characters.filter(c =>
            c.state === state && party.affiliationIds.includes(c.affiliationId) && c.isAlive
        );
        const avgInfluence = stateMembers.length > 0
            ? stateMembers.reduce((s, c) => s + c.influence, 0) / stateMembers.length
            : 0;
        score += avgInfluence * 0.4;

        scores.set(party.id, Math.max(0, score));
    });

    let bestPartyId = '';
    let bestScore   = -1;
    scores.forEach((score, pid) => {
        if (score > bestScore) { bestScore = score; bestPartyId = pid; }
    });

    if (!bestPartyId) return null;

    const winnerParty    = parties.find(p => p.id === bestPartyId);
    const previousHolder = stateGovernment.seatDistribution.keys().next().value || '';

    return {
        state,
        seatCode: vacatedSeatCode,
        seatName: seat.properties.PARLIMEN || vacatedSeatCode,
        date: currentDate,
        winnerPartyId: bestPartyId,
        winnerName: winnerParty?.name || bestPartyId,
        previousHolderPartyId: previousHolder,
    };
};

// ─── Approval Rating System ───────────────────────────────────────────────────

interface ApprovalFactors {
    economicGrowth: number;
    crisisCount: number;
    policyCount: number;
    timeInPower: number;
    federalAlignment: boolean;
}

export const calculateStateApproval = (
    baseApproval: number,
    factors: ApprovalFactors
): number => {
    let approval = baseApproval;
    approval += factors.economicGrowth * 2;
    approval -= factors.crisisCount * 8;
    approval += factors.policyCount * 4;
    approval -= Math.min(factors.timeInPower * 1.5, 20);
    approval += factors.federalAlignment ? 5 : -3;
    return Math.max(5, Math.min(95, Math.round(approval)));
};

export const updateStateApprovals = (
    stateGovernments: Map<string, StateGovernment>,
    federalGovernmentRulingIds: string[],
    currentDate: Date,
    activeCrisesByState: Map<string, StateCrisisEvent[]>
): Map<string, number> => {
    const approvals = new Map<string, number>();

    stateGovernments.forEach((gov, state) => {
        const yearsInPower = (currentDate.getFullYear() - gov.formedDate.getFullYear()) +
                             (currentDate.getMonth() - gov.formedDate.getMonth()) / 12;

        const federalAligned = gov.rulingCoalitionIds.some(id => federalGovernmentRulingIds.includes(id));
        const stateCrises    = activeCrisesByState.get(state) || [];
        const activeCrises   = stateCrises.filter(c => !c.resolved).length;

        const totalSeats   = gov.totalSeats;
        const rulingSeats  = gov.rulingCoalitionIds.reduce((s, pid) => s + (gov.seatDistribution.get(pid) || 0), 0);
        const mandateStrength = (rulingSeats / totalSeats) * 40;

        const approval = calculateStateApproval(50 + mandateStrength * 0.5, {
            economicGrowth: Math.random() * 6 - 3,
            crisisCount: activeCrises,
            policyCount: 0,
            timeInPower: yearsInPower,
            federalAlignment: federalAligned,
        });

        approvals.set(state, approval);
    });

    return approvals;
};

// ─── Crisis Generation ────────────────────────────────────────────────────────

const CRISIS_TEMPLATES: Omit<StateCrisisEvent, 'id' | 'state' | 'date' | 'resolved'>[] = [
    { title: 'Severe Monsoon Flooding', description: 'Heavy rains have triggered floods displacing thousands of residents across low-lying areas.', type: 'flood', severity: 'high', approvalImpact: -12 },
    { title: 'Corruption Scandal', description: 'A senior state official is under investigation for alleged embezzlement of public funds.', type: 'corruption', severity: 'medium', approvalImpact: -18 },
    { title: 'Public Service Strike', description: 'Workers in essential services have called a strike over pay disputes and working conditions.', type: 'protest', severity: 'medium', approvalImpact: -9 },
    { title: 'Economic Contraction', description: 'Key industries in the state report declining output and rising joblessness.', type: 'economic', severity: 'high', approvalImpact: -14 },
    { title: 'Rural Development Scandal', description: 'Funds allocated for rural infrastructure have been misappropriated by contractors.', type: 'corruption', severity: 'low', approvalImpact: -7 },
    { title: 'Drought Warning', description: 'Extended dry season threatens agricultural output and drinking water supplies.', type: 'economic', severity: 'medium', approvalImpact: -6 },
];

export const maybeGenerateStateCrisis = (
    state: string,
    stateGovernment: StateGovernment,
    currentApproval: number,
    currentDate: Date,
    existingActiveCrises: number
): StateCrisisEvent | null => {
    const baseProbability = 0.004;
    const approvalFactor  = currentApproval < 35 ? 2.5 : currentApproval < 50 ? 1.5 : 1.0;
    const crisesCap       = existingActiveCrises >= 2 ? 0 : 1;

    if (crisesCap === 0 || Math.random() > baseProbability * approvalFactor) return null;

    const template = CRISIS_TEMPLATES[Math.floor(Math.random() * CRISIS_TEMPLATES.length)];
    return {
        ...template,
        id: `crisis-${state}-${Date.now()}`,
        state,
        date: currentDate,
        resolved: false,
    };
};

// ─── Inter-State Relations ────────────────────────────────────────────────────

export const initializeInterStateRelations = (
    stateGovernments: Map<string, StateGovernment>
): InterStateRelation[] => {
    const states    = Array.from(stateGovernments.keys());
    const relations: InterStateRelation[] = [];

    for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
            const govA = stateGovernments.get(states[i])!;
            const govB = stateGovernments.get(states[j])!;

            const sharedParties = govA.rulingCoalitionIds.filter(id => govB.rulingCoalitionIds.includes(id)).length;
            const cooperation   = 30 + sharedParties * 20 + Math.floor(Math.random() * 20);

            relations.push({
                stateA: states[i],
                stateB: states[j],
                cooperationScore: Math.min(100, cooperation),
                disputeTopics: cooperation < 40 ? ['Water rights', 'Border development'] : [],
            });
        }
    }

    return relations;
};

export const updateInterStateRelations = (
    relations: InterStateRelation[],
    stateGovernments: Map<string, StateGovernment>
): InterStateRelation[] => {
    return relations.map(rel => {
        const govA = stateGovernments.get(rel.stateA);
        const govB = stateGovernments.get(rel.stateB);
        if (!govA || !govB) return rel;

        const sharedParties = govA.rulingCoalitionIds.filter(id => govB.rulingCoalitionIds.includes(id)).length;
        const delta = sharedParties > 0 ? 1 : -1;
        return {
            ...rel,
            cooperationScore: Math.max(0, Math.min(100, rel.cooperationScore + delta + (Math.random() * 3 - 1.5))),
        };
    });
};

// ─── State Government Stability ───────────────────────────────────────────────

export interface StateStabilityResult {
    isStable: boolean;
    rulingSeats: number;
    majorityRequired: number;
    confidence: 'strong' | 'slim' | 'minority' | 'collapsed';
}

export const assessStateGovernmentStability = (
    gov: StateGovernment,
    approval: number
): StateStabilityResult => {
    const rulingSeats      = gov.rulingCoalitionIds.reduce((s, pid) => s + (gov.seatDistribution.get(pid) || 0), 0);
    const majorityRequired = Math.floor(gov.totalSeats / 2) + 1;
    const surplusSeats     = rulingSeats - majorityRequired;

    let confidence: StateStabilityResult['confidence'];
    if (rulingSeats < majorityRequired) {
        confidence = approval < 30 ? 'collapsed' : 'minority';
    } else if (surplusSeats <= 2) {
        confidence = 'slim';
    } else {
        confidence = 'strong';
    }

    return {
        isStable: rulingSeats >= majorityRequired && approval >= 20,
        rulingSeats,
        majorityRequired,
        confidence,
    };
};

// ─── Snapshot & History ───────────────────────────────────────────────────────

export interface StateElectionSnapshot {
    state: string;
    date: Date;
    seatDistribution: Map<string, number>;
    winningCoalitionIds: string[];
    chiefMinisterId: string;
    totalSeats: number;
}

export const captureStateElectionSnapshot = (gov: StateGovernment, date: Date): StateElectionSnapshot => ({
    state: gov.state,
    date,
    seatDistribution: new Map(gov.seatDistribution),
    winningCoalitionIds: [...gov.rulingCoalitionIds],
    chiefMinisterId: gov.chiefMinisterId,
    totalSeats: gov.totalSeats,
});

/**
 * One entry per state election. Stores the exact DUN seat distribution so the
 * history tab shows real seat counts rather than re-derived federal seat counts.
 */
export interface StateElectionHistoryEntry {
    date: Date;
    seatDistribution: Map<string, number>;
    totalSeats: number;
    parties: {id: string, name: string, color: string}[];
}

/**
 * Build a history snapshot immediately after formStateGovernment().
 * gov.seatDistribution already contains the exact DUN counts from
 * simulateStateElectionResults — this just captures it into a serialisable entry.
 */
export const buildStateElectionSnapshot = (
    gov: StateGovernment,
    parties: Party[],
    date: Date
): StateElectionHistoryEntry => ({
    date,
    seatDistribution: new Map(gov.seatDistribution),
    totalSeats: gov.totalSeats,
    parties: parties.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color
    })),
});