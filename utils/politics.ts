
import { Character, Party, StatePartyBranch, ConstituencyPartyBranch, GeoJsonFeature, Demographics, PartyElectionVoteTally, ElectionResults, SpeakerVoteTally, SpeakerVoteBreakdown, Bill, VoteDirection, Affiliation, CharacterHistoryEntry, Ethnicity, Government, Minister, VoteOfConfidenceResult, PoliticalAlliance, AllianceType, Ideology, GameEvent, StrongholdMap, LogEntry, PartyGraphLink } from '../types';
import { calculateEffectiveInfluence } from './influence';
import { COLOR_PALETTE, SEAT_CONTEST_COST } from '../constants';
import { AFFILIATIONS } from '../affiliations';

export const STATE_EXECUTIVE_COUNT = 3;

// --- Ideology Naming Logic ---

const IDEOLOGY_GRID = [
  // Row 0 (Eco 0-10) - Planned Economy
  ["Totalitarian Communism", "Maoism", "Juche", "Trotskyism", "Left Communism", "Communization", "Anarchist Communism", "Kropotkinism", "Post-Left Anarchism", "Anarcho-Primitivism"],
  // Row 1 (Eco 10-20)
  ["Stalinism", "Soviet Model", "Command Economy", "Central Planning", "Planned Economy", "Decentralized Planning", "Participatory Economics", "Anarcho-Communism", "Communitarian Anarchism", "Insurrectionary Anarchism"],
  // Row 2 (Eco 20-30)
  ["Marxism-Leninism", "Centralized Communism", "State Communism", "Planned Socialism", "Council Communism", "Federalist Communism", "Libertarian Marxism", "Anarcho-Syndicalism", "Anarcho-Collectivism", "Platform Anarchism"],
  // Row 3 (Eco 30-40)
  ["Leninist Socialism", "Fabian Socialism", "Guild Socialism", "Reformist Socialism", "Market Socialism", "Cooperative Socialism", "Communalism", "Syndicalism", "Left-Mutualism", "Collectivist Anarchism"],
  // Row 4 (Eco 40-50)
  ["Authoritarian Socialism", "State Socialism", "Social Corporatism", "Social Democracy", "Democratic Socialism", "Federalist Socialism", "Decentralized Social Democracy", "Libertarian Socialism", "Individualist Anarchism", "Egoist Anarchism"],
  // Row 5 (Eco 50-60) - Mixed/Center
  ["State Corporatism", "Third Way", "Keynesianism", "Progressive Capitalism", "Centrism", "Federalism", "Decentralized Centrism", "Georgism", "Mutualism", "Anarcho-Mutualism"],
  // Row 6 (Eco 60-70)
  ["Guided Democracy", "Corporatism", "Dirigisme", "Welfare Capitalism", "Mixed Economy", "Cooperative Federalism", "Social Liberalism", "Geolibertarianism", "Mutualism (Right)", "Agorism"],
  // Row 7 (Eco 70-80)
  ["Developmental State", "Asian Tiger Model", "Corporatist Capitalism", "Social Market Economy", "Liberal Democracy", "Federalist Liberalism", "Decentralized Democracy", "Libertarian Conservatism", "Market Anarchism", "Right-Anarchism"],
  // Row 8 (Eco 80-90)
  ["Authoritarian Neoliberalism", "Centralized Neoliberalism", "Neoliberalism", "Ordoliberalism", "Liberal Conservatism", "Classical Liberalism", "Decentralized Liberalism", "Right-Libertarianism", "Paleolibertarianism", "Voluntaryism"],
  // Row 9 (Eco 90-100) - Free Market
  ["State Capitalism", "Authoritarian Capitalism", "Technocratic Capitalism", "Guided Capitalism", "Regulated Capitalism", "Liberal Capitalism", "Decentralized Capitalism", "Libertarianism", "Minarchism", "Anarcho-Capitalism"]
];

export const getIdeologyName = (ideology: Ideology): string => {
    const ecoIndex = Math.min(9, Math.floor(ideology.economic / 10));
    const govIndex = Math.min(9, Math.floor((100 - ideology.governance) / 10));
    return IDEOLOGY_GRID[ecoIndex][govIndex] || "Centrism";
};

// --- Ideology Calculation Logic ---

export const calculateAverageIdeology = (items: Ideology[]): Ideology => {
    if (items.length === 0) return { economic: 50, governance: 50 };
    
    const total = items.reduce((acc, cur) => ({
        economic: acc.economic + cur.economic,
        governance: acc.governance + cur.governance
    }), { economic: 0, governance: 0 });
    
    return {
        economic: total.economic / items.length,
        governance: total.governance / items.length
    };
};

export const updateAffiliationIdeologies = (characters: Character[], affiliations: Affiliation[]): Affiliation[] => {
    return affiliations.map(aff => {
        const members = characters.filter(c => c.isAlive && c.affiliationId === aff.id);
        const memberIdeologies = members.map(m => m.ideology);
        const avgIdeology = calculateAverageIdeology(memberIdeologies);
        
        if (members.length === 0) {
             const base = aff.baseIdeology || { economic: 50, governance: 50 };
             if (aff.ideology?.economic === base.economic && aff.ideology?.governance === base.governance) return aff;
             return { ...aff, ideology: base };
        }
        if (aff.ideology?.economic === avgIdeology.economic && aff.ideology?.governance === avgIdeology.governance) return aff;
        return { ...aff, ideology: avgIdeology };
    });
};

export const updatePartyIdeologies = (parties: Party[], affiliations: Affiliation[]): Party[] => {
    const affMap = new Map(affiliations.map(a => [a.id, a]));
    
    return parties.map(p => {
        const partyAffs = p.affiliationIds.map(id => affMap.get(id)).filter((a): a is Affiliation => !!a && !!a.ideology);
        const affIdeologies = partyAffs.map(a => a.ideology!);
        const avgIdeology = calculateAverageIdeology(affIdeologies);
        
        if (p.ideology.economic === avgIdeology.economic && p.ideology.governance === avgIdeology.governance) return p;
        return { ...p, ideology: avgIdeology };
    });
};

// --- Relations Logic ---

const calculateIdeologicalCompatibility = (a: Party, b: Party): number => {
    let score = 100;

    const distEco = a.ideology.economic - b.ideology.economic;
    const distGov = a.ideology.governance - b.ideology.governance;
    const distance = Math.sqrt(distEco * distEco + distGov * distGov);
    
    score -= (distance * 0.5);

    const isAMulti = !a.ethnicityFocus || a.ethnicityFocus.startsWith('Multi-Racial');
    const isBMulti = !b.ethnicityFocus || b.ethnicityFocus.startsWith('Multi-Racial');

    if (!isAMulti && !isBMulti) {
        if (a.ethnicityFocus !== b.ethnicityFocus) {
            const malaySubtypes = ['Malay', 'Bumiputera Sabah (Muslim)', 'Bumiputera Sarawak (Muslim)', 'Singaporean Malay'];
            const aIsMalay = malaySubtypes.includes(a.ethnicityFocus as any);
            const bIsMalay = malaySubtypes.includes(b.ethnicityFocus as any);
            if (aIsMalay && bIsMalay) {
                score -= 10; // small penalty for regional difference
            } else {
                score -= 30;
            }
        }
    } else if ((!isAMulti && isBMulti) || (isAMulti && !isBMulti)) {
        score -= 15;
    } else if (isAMulti && isBMulti) {
        if (a.ethnicityFocus !== b.ethnicityFocus) {
            score -= 5;
        }
    }
    
    return Math.max(0, Math.min(100, score));
};

let lastPartyIdsHash = '';

export const initializePartyRelations = (parties: Party[]): Party[] => {
    const currentHash = parties.map(p => p.id).sort().join(',');
    if (currentHash === lastPartyIdsHash) {
        return parties;
    }
    
    lastPartyIdsHash = currentHash;
    return parties.map(p1 => {
        let needsUpdate = false;
        const newRelations = new Map<string, number>(p1.relations);
        
        parties.forEach(p2 => {
            if (p1.id === p2.id) return;
            if (!newRelations.has(p2.id)) {
                needsUpdate = true;
                const score = calculateIdeologicalCompatibility(p1, p2);
                const variance = Math.floor(Math.random() * 10) - 5;
                newRelations.set(p2.id, Math.max(0, Math.min(100, score + variance)));
            }
        });
        
        return needsUpdate ? { ...p1, relations: newRelations } : p1;
    });
};

// --- Alliance & Consolidation Logic ---

export const consolidateAllianceCohesion = (
    parties: Party[], 
    alliances: PoliticalAlliance[]
): Party[] => {
    let updatedParties = [...parties];
    const partiesMap = new Map(updatedParties.map(p => [p.id, p]));

    alliances.forEach(alliance => {
        const members = alliance.memberPartyIds.map(id => partiesMap.get(id)).filter(Boolean) as Party[];
        if (members.length < 2) return;

        // 1. Calculate Average Alliance Ideology
        const avgEco = members.reduce((sum, p) => sum + p.ideology.economic, 0) / members.length;
        const avgGov = members.reduce((sum, p) => sum + p.ideology.governance, 0) / members.length;

        // 2. Shift Members closer to average (Consolidation)
        members.forEach(member => {
            // Move 5% closer to the center
            const newEco = member.ideology.economic + (avgEco - member.ideology.economic) * 0.05;
            const newGov = member.ideology.governance + (avgGov - member.ideology.governance) * 0.05;
            
            member.ideology = { economic: newEco, governance: newGov };

            // 3. Improve relations with allies
            members.forEach(ally => {
                if (ally.id !== member.id) {
                    const currentRel = member.relations.get(ally.id) || 50;
                    member.relations.set(ally.id, Math.min(100, currentRel + 1));
                }
            });

            // 4. Decrease relations with outsiders (Polarization)
            updatedParties.forEach(outsider => {
                if (!alliance.memberPartyIds.includes(outsider.id)) {
                    const currentRel = member.relations.get(outsider.id) || 50;
                    member.relations.set(outsider.id, Math.max(0, currentRel - 0.5));
                }
            });
        });
    });

    return updatedParties;
};

export const attemptAllianceMerger = (
    alliances: PoliticalAlliance[],
    parties: Party[]
): { mergedParty: Party; dissolvedAllianceId: string; removedPartyIds: string[] } | null => {
    const partiesMap = new Map(parties.map(p => [p.id, p]));

    for (const alliance of alliances) {
        if (alliance.type !== 'Alliance') continue; // Only full alliances merge, not pacts
        
        const members = alliance.memberPartyIds.map(id => partiesMap.get(id)).filter(Boolean) as Party[];
        if (members.length < 2) continue;

        // Criteria 1: Ideological Unity (Deviation < 3)
        const avgEco = members.reduce((sum, p) => sum + p.ideology.economic, 0) / members.length;
        const avgGov = members.reduce((sum, p) => sum + p.ideology.governance, 0) / members.length;

        const isIdeologicallyUnified = members.every(p => {
            const dist = Math.sqrt(Math.pow(p.ideology.economic - avgEco, 2) + Math.pow(p.ideology.governance - avgGov, 2));
            return dist < 3.0; // Very tight threshold
        });

        if (!isIdeologicallyUnified) continue;

        // Criteria 2: Relational Unity (All pairs > 95)
        let isFriendly = true;
        for (let i = 0; i < members.length; i++) {
            for (let j = i + 1; j < members.length; j++) {
                const rel = members[i].relations.get(members[j].id) || 0;
                if (rel < 95) {
                    isFriendly = false;
                    break;
                }
            }
            if (!isFriendly) break;
        }

        // Criteria 3: RNG to avoid constant merging when conditions are met
        if (isFriendly && Math.random() < 0.02) {
            // MERGE!
            const leaderParty = partiesMap.get(alliance.leaderPartyId) || members[0];
            const allAffiliations = Array.from(new Set(members.flatMap(p => p.affiliationIds)));
            
            const mergedParty: Party = {
                id: `merged-${alliance.id}`,
                name: alliance.name, // Takes alliance name
                color: leaderParty.color,
                affiliationIds: allAffiliations,
                leaderId: leaderParty.leaderId,
                deputyLeaderId: members.find(p => p.id !== leaderParty.id)?.leaderId, // Second strongest leader becomes deputy
                stateBranches: [], // Reset branches, re-elect later
                contestedSeats: new Map(), // Reset, AI will reallocate
                leaderHistory: leaderParty.leaderHistory,
                ethnicityFocus: members.every(p => p.ethnicityFocus === members[0].ethnicityFocus) ? members[0].ethnicityFocus : 'Multi-Racial',
                relations: new Map(), // Re-init later
                unity: 100, // High unity at birth
                ideology: { economic: avgEco, governance: avgGov },
                funds: members.reduce((sum, p) => sum + p.funds, 0) // Combine funds
            };

            return {
                mergedParty,
                dissolvedAllianceId: alliance.id,
                removedPartyIds: members.map(p => p.id)
            };
        }
    }

    return null;
};

export const formBigTentCoalition = (
    parties: Party[],
    governmentParties: string[], // IDs
    allianceName: string,
    leaderCharId: string | null,
    currentDate: Date
): { alliance: PoliticalAlliance, parties: Party[] } | null => {
    const oppositionParties = parties.filter(p => !governmentParties.includes(p.id));
    
    // Sort opposition by size/influence (using seats would be best, but unity/relations works for proxy)
    // Here we pick largest opposition to lead.
    if (oppositionParties.length < 2) return null; // Need at least 2 to form a coalition

    // Simply take all opposition parties
    const memberIds = oppositionParties.map(p => p.id);
    const leaderParty = oppositionParties[0]; // Simplification

    const avgEco = oppositionParties.reduce((sum, p) => sum + p.ideology.economic, 0) / oppositionParties.length;
    const avgGov = oppositionParties.reduce((sum, p) => sum + p.ideology.governance, 0) / oppositionParties.length;

    const alliance: PoliticalAlliance = {
        id: `big-tent-${currentDate.getTime()}`,
        name: allianceName, // Generic Big Tent name
        memberPartyIds: memberIds,
        type: 'Alliance',
        leaderPartyId: leaderParty.id,
        cohesion: 60, // Starts fragile
        ideology: { economic: avgEco, governance: avgGov },
        formedDate: new Date(currentDate.getTime())
    };

    // Boost relations immediately and add a modifier to prevent leaving for 7 years
    const expiresAt = new Date(currentDate.getTime());
    expiresAt.setFullYear(expiresAt.getFullYear() + 7);

    const updatedParties = parties.map(p => {
        if (memberIds.includes(p.id)) {
            const newRelations = new Map(p.relations);
            memberIds.forEach(allyId => {
                if (allyId !== p.id) newRelations.set(allyId, 90); // Forced unity
            });
            const modifiers = [...(p.modifiers || [])];
            modifiers.push({ type: 'prevent_alliance_leave', expiresAt });
            
            return { ...p, relations: newRelations, unity: Math.max(p.unity, 80), modifiers };
        }
        return p;
    });

    return { alliance, parties: updatedParties };
};

const getAllianceAcceptanceChance = (initiator: Party, target: Party, type: AllianceType): number => {
    const relation = initiator.relations.get(target.id) || 50;
    let chance = relation / 100;

    if (type === 'Alliance') {
        chance -= 0.2;
    } else {
        chance += 0.1;
    }
    return Math.max(0, Math.min(1, chance));
};

// Update the signature and body of attemptAllianceFormation

export const attemptAllianceFormation = (
    initiatorParty: Party,
    targetParties: Party[],
    allianceName: string,
    type: AllianceType,
    existingAlliances: PoliticalAlliance[],
    // NEW ARGUMENTS REQUIRED FOR SEAT ALLOCATION
    allSeatCodes: string[],
    demographicsMap: Map<string, Demographics>,
    featuresMap: Map<string, GeoJsonFeature>,
    affiliationsMap: Map<string, Affiliation>,
    characters: Character[],
    strongholdMap: StrongholdMap
): { alliance: PoliticalAlliance | null, rejectedIds: string[], updatedParties?: Party[] } => {
    
    // Constraint: Initiator cannot form a new alliance if already in one
    if (existingAlliances.some(a => a.memberPartyIds.includes(initiatorParty.id))) {
        console.log("Alliance Formation Blocked: Initiator is already in an alliance.");
        return { alliance: null, rejectedIds: targetParties.map(p => p.id) };
    }

    const acceptedIds: string[] = [initiatorParty.id];
    const rejectedIds: string[] = [];

    targetParties.forEach(target => {
        // Constraint: Target cannot be in an alliance
        if (existingAlliances.some(a => a.memberPartyIds.includes(target.id))) {
             rejectedIds.push(target.id);
             return;
        }

        const acceptanceChance = getAllianceAcceptanceChance(initiatorParty, target, type);
        console.log(`Alliance Proposal: ${initiatorParty.name} -> ${target.name} (${type}). Chance: ${acceptanceChance.toFixed(2)}`);
        
        if (Math.random() < acceptanceChance) {
            acceptedIds.push(target.id);
        } else {
            rejectedIds.push(target.id);
        }
    });

    if (acceptedIds.length > 1) {
        const memberParties = [initiatorParty, ...targetParties.filter(p => acceptedIds.includes(p.id))];
        const avgEco = memberParties.reduce((sum, p) => sum + p.ideology.economic, 0) / memberParties.length;
        const avgGov = memberParties.reduce((sum, p) => sum + p.ideology.governance, 0) / memberParties.length;
        
        const newAlliance: PoliticalAlliance = {
            id: `alliance-${Date.now()}`,
            name: allianceName,
            memberPartyIds: acceptedIds,
            type: type,
            leaderPartyId: initiatorParty.id,
            lastSeatDistributionDate: new Date(),
            cohesion: 80,
            ideology: { economic: avgEco, governance: avgGov },
            formedDate: new Date()
        };

        // --- AUTO ALLOCATE SEATS IMMEDIATELY ---
        
        const updatedParties = distributeAllianceSeats(
            newAlliance,
            memberParties,
            allSeatCodes,
            demographicsMap,
            featuresMap,
            affiliationsMap,
            characters,
            strongholdMap
        );

        return {
            alliance: newAlliance,
            rejectedIds,
            updatedParties: updatedParties // Return the parties with their new seat/affiliation allocations
        };
    }

    return { alliance: null, rejectedIds: targetParties.map(p => p.id) };
};

/**
 * Check if alliance needs seat redistribution (every 3 years)
 */
export const shouldRedistributeSeats = (
    alliance: PoliticalAlliance,
    currentDate: Date
): boolean => {
    // If no distribution date set, it needs distribution
    if (!alliance.lastSeatDistributionDate) {
        return true;
    }

    const daysSinceLastDistribution = Math.floor(
        (currentDate.getTime() - alliance.lastSeatDistributionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const THREE_YEARS_IN_DAYS = 1460; // 3 years = 1095 days

    return daysSinceLastDistribution >= THREE_YEARS_IN_DAYS;
};

/**
 * Check all alliances and redistribute seats where needed
 * Call this function in your game loop (daily or monthly update)
 */
export const processAllianceStateLeaders = (
    alliances: PoliticalAlliance[],
    parties: Party[],
    characters: Character[],
    currentDate: Date,
    uniqueStates: string[]
): { updatedAlliances: PoliticalAlliance[], logs: LogEntry[], stateChiefUpdates: { state: string, newCmId: string, allianceId: string }[] } => {
    const logs: LogEntry[] = [];
    const stateChiefUpdates: { state: string, newCmId: string, allianceId: string }[] = [];
    const updatedAlliances = alliances.map(alliance => {
        const updatedAlliance = { ...alliance };
        if (!updatedAlliance.stateLeaders) {
            updatedAlliance.stateLeaders = new Map();
        }

        const memberParties = parties.filter(p => alliance.memberPartyIds.includes(p.id));

        uniqueStates.forEach(state => {
            const currentStateLeader = updatedAlliance.stateLeaders?.get(state);
            const needsElection = !currentStateLeader || 
                (currentDate.getTime() - currentStateLeader.lastElectionDate.getTime()) / (1000 * 60 * 60 * 24 * 365) >= 6;

            if (needsElection) {
                // Find candidates: Party state leaders of member parties in this state
                const candidates: Character[] = [];
                const voters: Character[] = [];

                memberParties.forEach(party => {
                    const branch = party.stateBranches.find(b => b.state === state);
                    if (branch) {
                        if (branch.leaderId) {
                            const leader = characters.find(c => c.id === branch.leaderId && c.isAlive);
                            if (leader) candidates.push(leader);
                        }
                        branch.executiveIds.forEach(execId => {
                            const exec = characters.find(c => c.id === execId && c.isAlive);
                            if (exec) voters.push(exec);
                        });
                    }
                });

                if (candidates.length > 0) {
                    // Elect leader
                    let winnerId = candidates[0].id;
                    if (candidates.length > 1 && voters.length > 0) {
                        const tally = new Map<string, number>();
                        candidates.forEach(c => tally.set(c.id, 0));

                        voters.forEach(voter => {
                            // Voter votes for candidate with highest relation, or from same party
                            let bestCandidate = candidates[0];
                            let bestScore = -1;

                            candidates.forEach(candidate => {
                                let score = 0;
                                if (voter.affiliationId === candidate.affiliationId) score += 50;
                                // Simple relation proxy: influence + random
                                score += candidate.influence * 0.5 + Math.random() * 50;
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestCandidate = candidate;
                                }
                            });

                            tally.set(bestCandidate.id, (tally.get(bestCandidate.id) || 0) + 1);
                        });

                        let maxVotes = -1;
                        tally.forEach((votes, cId) => {
                            if (votes > maxVotes) {
                                maxVotes = votes;
                                winnerId = cId;
                            }
                        });
                    }

                    updatedAlliance.stateLeaders!.set(state, { leaderId: winnerId, lastElectionDate: currentDate });
                    stateChiefUpdates.push({ state, newCmId: winnerId, allianceId: alliance.id });
                    
                    const winner = characters.find(c => c.id === winnerId);
                    if (winner) {
                        logs.push({
                            id: `alliance-state-leader-${alliance.id}-${state}-${currentDate.getTime()}`,
                            date: currentDate,
                            title: `${alliance.name} State Chief Elected`,
                            description: `${winner.name} has been elected as the ${alliance.name} State Chief for ${state}.`,
                            type: 'politics'
                        });
                    }
                }
            }
        });

        return updatedAlliance;
    });

    return { updatedAlliances, logs, stateChiefUpdates };
};

export const updateAllianceSeatDistributions = (
    alliances: PoliticalAlliance[],
    parties: Party[],
    allSeatCodes: string[],
    demographicsMap: Map<string, Demographics>,
    featuresMap: Map<string, GeoJsonFeature>,
    affiliationsMap: Map<string, Affiliation>,
    characters: Character[],
    strongholdMap: StrongholdMap,
    currentDate: Date
): {
    updatedAlliances: PoliticalAlliance[];
    updatedParties: Party[];
    redistributionLogs: string[];
} => {
    const updatedAlliances: PoliticalAlliance[] = [];
    let updatedParties = [...parties];
    const redistributionLogs: string[] = [];
    const partiesMap = new Map(updatedParties.map(p => [p.id, p]));

    alliances.forEach(alliance => {
        // Check if this alliance needs redistribution
        if (shouldRedistributeSeats(alliance, currentDate)) {
            // Get member parties
            const memberParties = alliance.memberPartyIds
                .map(id => partiesMap.get(id))
                .filter((p): p is Party => !!p);

            if (memberParties.length >= 2) {
                console.log(`[Alliance Redistribution] ${alliance.name} redistributing seats after 3 years`);

                // Perform redistribution
                const redistributedParties = distributeAllianceSeats(
                    alliance,
                    memberParties,
                    allSeatCodes,
                    demographicsMap,
                    featuresMap,
                    affiliationsMap,
                    characters,
                    strongholdMap
                );

                // Update parties in our tracking map and array
                redistributedParties.forEach(updatedParty => {
                    const index = updatedParties.findIndex(p => p.id === updatedParty.id);
                    if (index !== -1) {
                        updatedParties[index] = updatedParty;
                        partiesMap.set(updatedParty.id, updatedParty);
                    }
                });

                // Update alliance with new distribution date
                updatedAlliances.push({
                    ...alliance,
                    lastSeatDistributionDate: new Date(currentDate)
                });

                redistributionLogs.push(
                    `${alliance.name} has completed seat redistribution among ${memberParties.length} member parties.`
                );
            } else {
                // Alliance too small, just update date
                updatedAlliances.push({
                    ...alliance,
                    lastSeatDistributionDate: new Date(currentDate)
                });
            }
        } else {
            // No redistribution needed yet
            updatedAlliances.push(alliance);
        }
    });

    return {
        updatedAlliances,
        updatedParties,
        redistributionLogs
    };
};

/**
 * Helper: Force immediate redistribution for a specific alliance
 * Useful for when new parties join or leave
 */
export const forceAllianceRedistribution = (
    alliance: PoliticalAlliance,
    parties: Party[],
    allSeatCodes: string[],
    demographicsMap: Map<string, Demographics>,
    featuresMap: Map<string, GeoJsonFeature>,
    affiliationsMap: Map<string, Affiliation>,
    characters: Character[],
    strongholdMap: StrongholdMap,
    currentDate: Date
): {
    updatedAlliance: PoliticalAlliance;
    updatedParties: Party[];
} => {
    const memberParties = alliance.memberPartyIds
        .map(id => parties.find(p => p.id === id))
        .filter((p): p is Party => !!p);

    const redistributedParties = distributeAllianceSeats(
        alliance,
        memberParties,
        allSeatCodes,
        demographicsMap,
        featuresMap,
        affiliationsMap,
        characters,
        strongholdMap
    );

    const updatedAlliance: PoliticalAlliance = {
        ...alliance,
        lastSeatDistributionDate: new Date(currentDate)
    };

    return {
        updatedAlliance,
        updatedParties: redistributedParties
    };
};

export const getCoalitionAcceptanceChance = (initiator: Party, target: Party, existingCoalitionMembers: Party[]): number => {
    let baseScore = initiator.relations.get(target.id) || 50;
    
    // Check relations with existing members too
    for(const member of existingCoalitionMembers) {
        const rel = member.relations.get(target.id) || 50;
        baseScore = (baseScore + rel) / 2;
    }

    let chance = baseScore / 100;
    
    // Bonus if ideologies are close
    const distEco = Math.abs(initiator.ideology.economic - target.ideology.economic);
    if (distEco < 20) chance += 0.1;

    return Math.max(0, Math.min(1, chance));
};


// --- Seat Allocation Helpers ---

const calculatePartySeatScore = (
    party: Party,
    seatCode: string,
    featuresMap: Map<string, GeoJsonFeature>,
    demographicsMap: Map<string, Demographics>,
    affiliationsMap: Map<string, Affiliation>,
    characters: Character[],
    affiliationToPartyMap: Map<string, string>,
    strongholdMap: StrongholdMap,
    cache?: Map<string, Map<string, number>>
): number => {
    if (cache) {
        if (!cache.has(seatCode)) cache.set(seatCode, new Map());
        const seatCache = cache.get(seatCode)!;
        if (seatCache.has(party.id)) return seatCache.get(party.id)!;
    }

    const feature = featuresMap.get(seatCode);
    if (!feature) return 0;

    const state = feature.properties.NEGERI?.toUpperCase() || '';
    const isSabahSeat = state === 'SABAH' || state === 'W.P. LABUAN';
    const isSarawakSeat = state === 'SARAWAK';
    const isMalayaSeat = !isSabahSeat && !isSarawakSeat;

    const getAffiliationRegion = (aff: Affiliation | undefined) => {
        if (!aff) return 'UNKNOWN';
        const ethnicity = aff.ethnicity;
        if (ethnicity.startsWith('Sabah') || ethnicity === 'Bumiputera Sabah (Non-Muslim)') return 'SABAH';
        if (ethnicity.startsWith('Sarawak') || ethnicity === 'Bumiputera Sarawak (Non-Muslim)') return 'SARAWAK';
        return 'MALAYA'; // includes Malay, Chinese, Indian
    };
    
    // Determine if the party has any regional presence.
    // An alliance can contest across regions ONLY if it has member parties from those regions.
    // For standalone parties (or affiliations within a party), determine where they belong.
    const hasSabahPresence = party.affiliationIds.some(affId => getAffiliationRegion(affiliationsMap.get(affId)) === 'SABAH');
    const hasSarawakPresence = party.affiliationIds.some(affId => getAffiliationRegion(affiliationsMap.get(affId)) === 'SARAWAK');
    const hasMalayaPresence = party.affiliationIds.some(affId => getAffiliationRegion(affiliationsMap.get(affId)) === 'MALAYA');

    const hasValidAffiliation = party.affiliationIds.some(affId => {
        const aff = affiliationsMap.get(affId);
        const region = getAffiliationRegion(aff);
        
        // Block allocating seats outside of the party's regional presence ONLY IF the party has local presence it should be using instead.
        // E.g., if it has Sabah presence, Malaya affiliations are blocked in Sabah unless no local affiliation works. 
        // We handle this selection later in determineBestAffiliationForSeat. 
        // Here we just say the *Party* as a whole can contest anywhere, as long as it has ONE affiliation that fits.
        
        if (isSabahSeat && region !== 'SABAH' && region !== 'MALAYA') return false;
        if (isSarawakSeat && region !== 'SARAWAK' && region !== 'MALAYA') return false;
        if (isMalayaSeat && region !== 'MALAYA') return false;
        
        return true;
    });

    if (!hasValidAffiliation) {
        if (cache) cache.get(seatCode)!.set(party.id, 0);
        return 0;
    }

    const demographics = demographicsMap.get(seatCode);

    let score = 0;

    const charactersInSeat = characters.filter(c => c.currentSeatCode === seatCode && c.isAlive);
    charactersInSeat.forEach(char => {
        const pId = affiliationToPartyMap.get(char.affiliationId);
        if (pId === party.id) {
            const influence = calculateEffectiveInfluence(char, feature, demographics || null, affiliationsMap, strongholdMap, char.id, char.affiliationId);
            score += influence;
        }
    });

    const incumbentMP = characters.find(c => c.isMP && c.currentSeatCode === seatCode);
    if (incumbentMP) {
        const incPartyId = affiliationToPartyMap.get(incumbentMP.affiliationId);
        if (incPartyId === party.id) {
            score += 50; 
        }
    }

    if (demographics) {
        let ethnicScore = 0;
        if (party.ethnicityFocus && !party.ethnicityFocus.startsWith('Multi-Racial')) {
            const key = `${party.ethnicityFocus.toLowerCase()}Percent` as keyof Demographics;
            const percent = (demographics[key] as number) || 0;
            ethnicScore = percent;
        } else {
            // Multi-racial parties or parties with no specific focus have a baseline appeal
            ethnicScore = 35;
        }
        score += ethnicScore;
    } else {
        score += 20;
    }

    if (cache) {
        cache.get(seatCode)!.set(party.id, score);
    }

    return score;
};

export const determineBestAffiliationForSeat = (
    party: Party,
    seatCode: string,
    featuresMap: Map<string, GeoJsonFeature>,
    demographicsMap: Map<string, Demographics>,
    affiliationsMap: Map<string, Affiliation>,
    partyMembers: Character[],
    strongholdMap: StrongholdMap,
    targetShares?: Map<string, number>,
    currentShares?: Map<string, number>
): string | null => {
    const seatFeature = featuresMap.get(seatCode);
    const demographics = demographicsMap.get(seatCode);
    
    if (!seatFeature) return null;

    const state = seatFeature.properties.NEGERI?.toUpperCase() || '';
    const isSabahSeat = state === 'SABAH' || state === 'W.P. LABUAN';
    const isSarawakSeat = state === 'SARAWAK';
    const isMalayaSeat = !isSabahSeat && !isSarawakSeat;

    const getAffiliationRegion = (aff: Affiliation | undefined) => {
        if (!aff) return 'UNKNOWN';
        const ethnicity = aff.ethnicity;
        if (ethnicity.startsWith('Sabah') || ethnicity === 'Bumiputera Sabah (Non-Muslim)') return 'SABAH';
        if (ethnicity.startsWith('Sarawak') || ethnicity === 'Bumiputera Sarawak (Non-Muslim)') return 'SARAWAK';
        return 'MALAYA'; // includes Malay, Chinese, Indian
    };

    const hasSabahPresence = party.affiliationIds.some(affId => getAffiliationRegion(affiliationsMap.get(affId)) === 'SABAH');
    const hasSarawakPresence = party.affiliationIds.some(affId => getAffiliationRegion(affiliationsMap.get(affId)) === 'SARAWAK');
    const hasMalayaPresence = party.affiliationIds.some(affId => getAffiliationRegion(affiliationsMap.get(affId)) === 'MALAYA');

    const validAffiliationIds = party.affiliationIds.filter(affId => {
        const aff = affiliationsMap.get(affId);
        const region = getAffiliationRegion(aff);
        // Strict regional exclusion
        // Prevent Malaya-only parties from distributing seats in Borneo, and vice-versa.
        if (isSabahSeat && region !== 'SABAH' && region !== 'MALAYA') return false;
        if (isSarawakSeat && region !== 'SARAWAK' && region !== 'MALAYA') return false;
        if (isMalayaSeat && region !== 'MALAYA') return false;
        return true;
    });

    let bestAffiliationId: string | null = null;
    let maxInf = -1;

    for (const affId of validAffiliationIds) {
        // Try to force fair sharing: if this affiliation has hit its target share, heavily penalize its score
        const currentCount = currentShares?.get(affId) || 0;
        const targetCount = targetShares?.get(affId) || 0;
        
        const membersOfAff = partyMembers.filter(c => c.affiliationId === affId);
        if (membersOfAff.length === 0) continue;
        
        const topCandidate = membersOfAff.reduce((prev, current) => {
           let prevScore = prev.influence + prev.charisma;
           let currScore = current.influence + current.charisma;
           
           if (party.leaderId === prev.id) prevScore *= 5.0;
           else if (party.stateBranches.some(b => b.leaderId === prev.id)) prevScore *= 2.5;

           if (party.leaderId === current.id) currScore *= 5.0;
           else if (party.stateBranches.some(b => b.leaderId === current.id)) currScore *= 2.5;

           return prevScore > currScore ? prev : current;
        });

        let inf = calculateEffectiveInfluence(topCandidate, seatFeature, demographics || null, affiliationsMap, strongholdMap, topCandidate.id, affId);
        
        // Massive buff if this seat is the party leader's current seat, or a large buff if they need a seat
        if (party.leaderId === topCandidate.id) {
            if (topCandidate.currentSeatCode === seatCode) {
                inf *= 10.0;
            } else {
                inf *= 5.0;
            }
        }

        // Artificial penalty if affiliation has hit quota, but don't outright ban it in case it's the *only* valid one
        if (targetShares && currentShares && currentCount >= targetCount && targetCount < 999) {
            // Wait! Never penalize the party leader's own seat assignment,
            // or if the affiliation hasn't secured any seats yet.
            const isLeaderCurrentSeat = party.leaderId === topCandidate.id && topCandidate.currentSeatCode === seatCode;
            const needsFirstSeatForLeader = party.leaderId === topCandidate.id && currentCount === 0;

            if (!isLeaderCurrentSeat && !needsFirstSeatForLeader) {
                inf *= 0.1; 
            }
        }

        if (inf > maxInf) {
            maxInf = inf;
            bestAffiliationId = affId;
        }
    }
    
    if (bestAffiliationId && currentShares) {
        currentShares.set(bestAffiliationId, (currentShares.get(bestAffiliationId) || 0) + 1);
    } else if (!bestAffiliationId && validAffiliationIds.length > 0) {
        bestAffiliationId = validAffiliationIds[0];
        if (currentShares) currentShares.set(bestAffiliationId, (currentShares.get(bestAffiliationId) || 0) + 1);
    }
    return bestAffiliationId;
};

// --- Seat Allocation Logic ---

// Find the distributeAllianceSeats function and replace it with this updated version:

// Replace the distributeAllianceSeats function with this updated version:

export const distributeAllianceSeats = (
    alliance: PoliticalAlliance,
    memberParties: Party[],
    allSeatCodes: string[],
    demographicsMap: Map<string, Demographics>,
    featuresMap: Map<string, GeoJsonFeature>,
    affiliationsMap: Map<string, Affiliation>,
    characters: Character[],
    strongholdMap: StrongholdMap
): Party[] => {
    const updatedParties = memberParties.map(p => ({ 
        ...p, 
        contestedSeats: new Map(p.contestedSeats) 
    }));
    const partyMap = new Map(updatedParties.map(p => [p.id, p]));

    updatedParties.forEach(p => p.contestedSeats.clear());

    const affToPartyId = new Map<string, string>();
    updatedParties.forEach(p => p.affiliationIds.forEach(aid => affToPartyId.set(aid, p.id)));

    // --- Regional Classification via Member Heuristic (>70% threshold) ---

    const REGIONAL_THRESHOLD = 0.7;

    /**
     * Returns the regional classification of a party based on where >70% of its
     * living members reside. Returns 'sabah', 'sarawak', 'borneo', or 'national'.
     */
    const getPartyRegion = (party: Party): 'sabah' | 'sarawak' | 'borneo' | 'peninsular' | 'national' => {
        const members = characters.filter(c => 
            c.isAlive && party.affiliationIds.includes(c.affiliationId)
        );

        if (members.length === 0) {
            // Fallback to affiliation-ID heuristic if no members exist
            const allSabah = party.affiliationIds.every(id => id.includes('sabah'));
            const allSarawak = party.affiliationIds.every(id => id.includes('sarawak'));
            const allBorneo = party.affiliationIds.every(id => id.includes('sabah') || id.includes('sarawak'));
            if (allSabah) return 'sabah';
            if (allSarawak) return 'sarawak';
            if (allBorneo) return 'borneo';
            return 'peninsular'; // Default to peninsular if no borneo info exists
        }

        const total = members.length;
        const sabahCount = members.filter(c => c.state === 'SABAH' || c.state === 'W.P. LABUAN').length;
        const sarawakCount = members.filter(c => c.state === 'SARAWAK').length;
        const borneoCount = sabahCount + sarawakCount;
        const peninsularCount = total - borneoCount;

        const sabahRatio = sabahCount / total;
        const sarawakRatio = sarawakCount / total;
        const borneoRatio = borneoCount / total;
        const peninsularRatio = peninsularCount / total;

        if (sabahRatio >= REGIONAL_THRESHOLD) return 'sabah';
        if (sarawakRatio >= REGIONAL_THRESHOLD) return 'sarawak';
        if (borneoRatio >= REGIONAL_THRESHOLD) return 'borneo';
        if (peninsularRatio >= REGIONAL_THRESHOLD) return 'peninsular';
        return 'national';
    };

    // Pre-compute region for each party (avoid repeated calculations)
    const partyRegionMap = new Map<string, 'sabah' | 'sarawak' | 'borneo' | 'peninsular' | 'national'>();
    updatedParties.forEach(p => partyRegionMap.set(p.id, getPartyRegion(p)));

    // Check what regions the alliance as a whole has dedicated parties for
    const allianceRegions = Array.from(partyRegionMap.values());
    const hasSabahParty = allianceRegions.includes('sabah') || allianceRegions.includes('borneo');
    const hasSarawakParty = allianceRegions.includes('sarawak') || allianceRegions.includes('borneo');
    const hasPeninsularParty = allianceRegions.includes('peninsular');

    /**
     * Returns true if a party is allowed to contest a given seat's state.
     */
    const canPartyContestState = (partyId: string, state: string | undefined): boolean => {
        const region = partyRegionMap.get(partyId) || 'national';
        if (region === 'national') return true; // Truly mixed party, no restriction
        if (!state) return false;

        const isSabahSeat = state === 'SABAH' || state === 'W.P. LABUAN';
        const isSarawakSeat = state === 'SARAWAK';
        const isPeninsularSeat = !isSabahSeat && !isSarawakSeat;

        switch (region) {
            case 'peninsular':
                return true; // Allow peninsular parties to contest anywhere. Local multipliers will naturally favor local parties if present.
            case 'sabah':
                if (isPeninsularSeat) return !hasPeninsularParty;
                if (isSarawakSeat) return !hasSarawakParty;
                return true;
            case 'sarawak':
                if (isPeninsularSeat) return !hasPeninsularParty;
                if (isSabahSeat) return !hasSabahParty;
                return true;
            case 'borneo':
                if (isPeninsularSeat) return !hasPeninsularParty;
                return true;
            default:
                return true;
        }
    };

    // --- Score Calculation ---

    const seatPartyScores = new Map<string, Map<string, number>>();
    const seatMaxAllianceScore = new Map<string, number>(); // Track best score for the alliance in each seat
    const calcCache = new Map<string, Map<string, number>>();

    allSeatCodes.forEach(seatCode => {
        const scores = new Map<string, number>();
        const seatFeature = featuresMap.get(seatCode);
        const state = seatFeature?.properties.NEGERI;
        let maxScoreForSeat = -Infinity;

        updatedParties.forEach(p => {
            if (!canPartyContestState(p.id, state)) {
                scores.set(p.id, -Infinity);
                return;
            }

            const score = calculatePartySeatScore(
                p, 
                seatCode, 
                featuresMap, 
                demographicsMap, 
                affiliationsMap, 
                characters, 
                affToPartyId,
                strongholdMap,
                calcCache
            );
            scores.set(p.id, score);
            if (score > maxScoreForSeat) {
                maxScoreForSeat = score;
            }
        });
        seatPartyScores.set(seatCode, scores);
        seatMaxAllianceScore.set(seatCode, maxScoreForSeat);
    });

    // Sort seats by alliance's best potential score (descending)
    // This ensures budget is spent on the most winnable seats first
    const sortedSeatCodes = [...allSeatCodes].sort((a, b) => {
        return (seatMaxAllianceScore.get(b) || -Infinity) - (seatMaxAllianceScore.get(a) || -Infinity);
    });

    // --- Initial Allocation ---

    const allocations = new Map<string, string>();
    const partyMaxSeats = new Map<string, number>();
    const partyCurrentSeats = new Map<string, number>();

    updatedParties.forEach(p => {
        partyMaxSeats.set(p.id, Math.floor(p.funds / SEAT_CONTEST_COST));
        partyCurrentSeats.set(p.id, 0);
    });
    
    sortedSeatCodes.forEach(seatCode => {
        const scores = seatPartyScores.get(seatCode);
        if (!scores) return;

        let winnerId: string | null = null;
        let maxScore = -Infinity;

        const shuffledParties = [...updatedParties].sort(() => Math.random() - 0.5);

        shuffledParties.forEach(p => {
            // Check budget constraint
            if ((partyCurrentSeats.get(p.id) || 0) >= (partyMaxSeats.get(p.id) || 0)) return;

            const s = scores.get(p.id) ?? -Infinity;
            if (s > maxScore) {
                maxScore = s;
                winnerId = p.id;
            }
        });

        if (winnerId && maxScore > -Infinity) {
            allocations.set(seatCode, winnerId);
            partyCurrentSeats.set(winnerId, (partyCurrentSeats.get(winnerId) || 0) + 1);
        }
    });

    // --- Rebalancing (ensure minimum seats per party) ---

    if (allSeatCodes.length >= updatedParties.length * 2) {
        let rebalancingNeeded = true;
        let safetyLoop = 0;

        while (rebalancingNeeded && safetyLoop < 20) {
            rebalancingNeeded = false;
            safetyLoop++;

            const seatCounts = new Map<string, number>();
            updatedParties.forEach(p => seatCounts.set(p.id, 0));
            allocations.forEach(pId => seatCounts.set(pId, (seatCounts.get(pId) || 0) + 1));

            const deficitParties = updatedParties.filter(p => (seatCounts.get(p.id) || 0) < 4);

            if (deficitParties.length === 0) break;

            rebalancingNeeded = true;

            const surplusParties = updatedParties
                .filter(p => (seatCounts.get(p.id) || 0) > 4)
                .sort((a, b) => (seatCounts.get(b.id) || 0) - (seatCounts.get(a.id) || 0));
            
            if (surplusParties.length === 0) break;

            const donor = surplusParties[0];
            const receiver = deficitParties[0];

            // Check if receiver can afford another seat
            if ((partyCurrentSeats.get(receiver.id) || 0) >= (partyMaxSeats.get(receiver.id) || 0)) {
                // Receiver is broke, cannot take more seats even if rebalancing is needed
                // Remove from deficit list effectively by skipping this iteration for this receiver
                // But we need to break or try next pair. 
                // Let's just break for now to avoid infinite loop if all deficits are broke.
                break; 
            }

            let bestSeatToSwap: string | null = null;
            let bestReceiverScore = -1;

            for (const [seatCode, ownerId] of allocations.entries()) {
                if (ownerId !== donor.id) continue;

                const seatFeature = featuresMap.get(seatCode);
                const state = seatFeature?.properties.NEGERI;

                // Respect regional restrictions during rebalancing
                if (!canPartyContestState(receiver.id, state)) continue;

                const scores = seatPartyScores.get(seatCode);
                const receiverScore = scores ? (scores.get(receiver.id) || 0) : 0;
                
                if (receiverScore > bestReceiverScore) {
                    bestReceiverScore = receiverScore;
                    bestSeatToSwap = seatCode;
                }
            }

            if (bestSeatToSwap) {
                allocations.set(bestSeatToSwap, receiver.id);
                // Update counts
                partyCurrentSeats.set(donor.id, (partyCurrentSeats.get(donor.id) || 0) - 1);
                partyCurrentSeats.set(receiver.id, (partyCurrentSeats.get(receiver.id) || 0) + 1);
            } else {
                // Fallback: find any valid seat from donor for receiver
                let swapped = false;
                for (const [seatCode, ownerId] of allocations.entries()) {
                    if (ownerId !== donor.id) continue;

                    const seatFeature = featuresMap.get(seatCode);
                    const state = seatFeature?.properties.NEGERI;

                    if (!canPartyContestState(receiver.id, state)) continue;

                    allocations.set(seatCode, receiver.id);
                    partyCurrentSeats.set(donor.id, (partyCurrentSeats.get(donor.id) || 0) - 1);
                    partyCurrentSeats.set(receiver.id, (partyCurrentSeats.get(receiver.id) || 0) + 1);
                    swapped = true;
                    break;
                }
                // If no valid swap found for this receiver, stop trying (fully locked out)
                if (!swapped) break;
            }
        }
    }

    // --- Candidate Assignment ---

    const assignedCandidateIds = new Set<string>();
    
    // Determine allocation targets for each affiliation within a party
    const targetAffiliationShares = new Map<string, Map<string, number>>();
    const currentAffiliationShares = new Map<string, Map<string, number>>();

    updatedParties.forEach(p => {
        const totalSeats = partyCurrentSeats.get(p.id) || 0;
        const targetShares = new Map<string, number>();
        const currentShares = new Map<string, number>();
        
        if (totalSeats > 0 && p.affiliationIds.length > 0) {
            // Give every affiliation 1 guaranteed seat if possible, then distribute remainder by influence score
            p.affiliationIds.forEach(affId => {
                targetShares.set(affId, 0); 
                currentShares.set(affId, 0);
            });
            
            // Only try to enforce sharing if there are enough seats to go around (e.g. at least 1 per affiliation)
            if (totalSeats >= p.affiliationIds.length) {
                let remainingSeats = totalSeats;
                p.affiliationIds.forEach(affId => {
                    targetShares.set(affId, 1);
                    remainingSeats--;
                });
                
                // Very simple remaining distribution: equal slices (or you could weight it by affiliation power)
                const extraPerAffiliation = Math.floor(remainingSeats / p.affiliationIds.length);
                let remainder = remainingSeats % p.affiliationIds.length;
                
                p.affiliationIds.forEach(affId => {
                    targetShares.set(affId, (targetShares.get(affId) || 0) + extraPerAffiliation + (remainder > 0 ? 1 : 0));
                    if (remainder > 0) remainder--;
                });
            } else {
                // Not enough seats, just let best performance win out
                p.affiliationIds.forEach(affId => targetShares.set(affId, 999));
            }
        }
        
        targetAffiliationShares.set(p.id, targetShares);
        currentAffiliationShares.set(p.id, currentShares);
    });

    const determineBestAffiliationForSeat = (
        party: Party,
        seatCode: string,
        featuresMap: Map<string, GeoJsonFeature>,
        demographicsMap: Map<string, Demographics>,
        affiliationsMap: Map<string, Affiliation>,
        partyMembers: Character[],
        strongholdMap: StrongholdMap,
        targetShares: Map<string, number>,
        currentShares: Map<string, number>
    ): string | null => {
        const seatFeature = featuresMap.get(seatCode);
        const demographics = demographicsMap.get(seatCode);
        
        if (!seatFeature) return null;

        const state = seatFeature.properties.NEGERI?.toUpperCase() || '';
        const isSabahSeat = state === 'SABAH' || state === 'W.P. LABUAN';
        const isSarawakSeat = state === 'SARAWAK';
        const isMalayaSeat = !isSabahSeat && !isSarawakSeat;

        const getAffiliationRegion = (aff: Affiliation | undefined) => {
            if (!aff) return 'UNKNOWN';
            const ethnicity = aff.ethnicity;
            if (ethnicity.startsWith('Sabah') || ethnicity === 'Bumiputera Sabah (Non-Muslim)') return 'SABAH';
            if (ethnicity.startsWith('Sarawak')) return 'SARAWAK';
            return 'MALAYA'; // includes Malay, Chinese, Indian
        };

        const validAffiliationIds = party.affiliationIds.filter(affId => {
            const aff = affiliationsMap.get(affId);
            const region = getAffiliationRegion(aff);
            // Strict regional exclusion
            if (isSabahSeat && region !== 'SABAH' && region !== 'MALAYA') return false; // Malaya can contest anywhere if no local aff exists
            if (isSarawakSeat && region !== 'SARAWAK' && region !== 'MALAYA') return false;
            if (isMalayaSeat && region !== 'MALAYA') return false;
            return true;
        });

        let bestAffiliationId: string | null = null;
        let maxInf = -1;

        for (const affId of validAffiliationIds) {
            // Try to force fair sharing: if this affiliation has hit its target share, heavily penalize its score
            const currentCount = currentShares.get(affId) || 0;
            const targetCount = targetShares.get(affId) || 0;
            
            const membersOfAff = partyMembers.filter(c => c.affiliationId === affId);
            if (membersOfAff.length === 0) continue;
            
            const topCandidate = membersOfAff.reduce((prev, current) => 
               (prev.influence + prev.charisma) > (current.influence + current.charisma) ? prev : current
            );

            let inf = calculateEffectiveInfluence(topCandidate, seatFeature, demographics || null, affiliationsMap, strongholdMap, topCandidate.id, affId);
            
            // Artificial penalty if affiliation has hit quota, but don't outright ban it in case it's the *only* valid one
            if (currentCount >= targetCount && targetCount < 999) {
                inf *= 0.1; 
            }

            if (inf > maxInf) {
                maxInf = inf;
                bestAffiliationId = affId;
            }
        }
        
        if (bestAffiliationId) {
            currentShares.set(bestAffiliationId, (currentShares.get(bestAffiliationId) || 0) + 1);
        } else if (validAffiliationIds.length > 0) {
            bestAffiliationId = validAffiliationIds[0];
            currentShares.set(bestAffiliationId, (currentShares.get(bestAffiliationId) || 0) + 1);
        }
        return bestAffiliationId;
    };

    allocations.forEach((partyId, seatCode) => {
        const party = partyMap.get(partyId);
        if (party) {
             const partyMembers = characters.filter(c => party.affiliationIds.includes(c.affiliationId) && c.isAlive);
             const targets = targetAffiliationShares.get(party.id)!;
             const currents = currentAffiliationShares.get(party.id)!;
             
             const bestAffiliationId = determineBestAffiliationForSeat(
                 party,
                 seatCode,
                 featuresMap,
                 demographicsMap,
                 affiliationsMap,
                 partyMembers,
                 strongholdMap,
                 targets,
                 currents
             );

             let bestCandidateId: string | null = null;

             if (bestAffiliationId) {
                 const potentialCandidates = partyMembers.filter(c => 
                     c.affiliationId === bestAffiliationId && 
                     !assignedCandidateIds.has(c.id)
                 );

                 const seatFeature = featuresMap.get(seatCode);
                 const demographics = demographicsMap.get(seatCode);

                 if (seatFeature && potentialCandidates.length > 0) {
                     let maxInf = -1;

                     potentialCandidates.forEach(cand => {
                         let inf = calculateEffectiveInfluence(
                             cand, 
                             seatFeature, 
                             demographics || null, 
                             affiliationsMap, 
                             strongholdMap, 
                             cand.id, 
                             cand.affiliationId
                         );

                         if (cand.currentSeatCode === seatCode) inf *= 2.0;
                         if (cand.state === seatFeature.properties.NEGERI) inf *= 1.2;

                         if (inf > maxInf) {
                             maxInf = inf;
                             bestCandidateId = cand.id;
                         }
                     });
                 }
             }

             if (bestCandidateId) {
                 assignedCandidateIds.add(bestCandidateId);
             }

             party.contestedSeats.set(seatCode, { 
                 allocatedAffiliationId: bestAffiliationId, 
                 candidateId: bestCandidateId 
             });
        }
    });

    return updatedParties;
};


export const electStateLeadersAndExecutives = (party: Party, allCharacters: Character[], uniqueStates: string[], currentDate: Date): { updatedParty: Party; roleChanges: { charId: string, event: string }[] } => {
  const updatedParty = { ...party };
  const partyMembers = allCharacters.filter(c => party.affiliationIds.includes(c.affiliationId) && c.isAlive);
  const roleChanges: { charId: string, event: string }[] = [];
  
  // 1. Process Constituency Branches (formed if > 3 members; leader elected every 9 years by influence+charisma+recognition)
  const branches = updatedParty.constituencyBranches || new Map<string, ConstituencyPartyBranch>();
  const membersBySeat = new Map<string, Character[]>();
  
  partyMembers.forEach(m => {
      const seat = m.currentSeatCode;
      if (!membersBySeat.has(seat)) membersBySeat.set(seat, []);
      membersBySeat.get(seat)!.push(m);
  });

  const updatedBranches = new Map<string, ConstituencyPartyBranch>();
  const activeBranchLeadersByState = new Map<string, Character[]>(); // Used for state elections

  membersBySeat.forEach((members, seatCode) => {
      if (members.length > 3) {
          const state = members[0].state || 'Unknown';
          const existingBranch = branches.get(seatCode);
          let leaderId = existingBranch?.leaderId;
          let lastElectionDate = existingBranch?.lastElectionDate;
          
          let needsElection = false;
          if (!leaderId || !lastElectionDate) {
              needsElection = true;
          } else {
              const yearsSince = (currentDate.getTime() - lastElectionDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
              if (yearsSince >= 9) {
                  needsElection = true;
              }
              // Also check if existing leader died or left the party/seat
              if (!members.find(m => m.id === leaderId)) {
                  needsElection = true;
              }
          }

          if (needsElection) {
              const sorted = [...members].sort((a, b) => {
                  let scoreA = a.influence + a.charisma + a.recognition;
                  let scoreB = b.influence + b.charisma + b.recognition;
                  if (a.id === leaderId) scoreA *= 1.2; // Small incumbent buff
                  if (b.id === leaderId) scoreB *= 1.2;
                  return scoreB - scoreA;
              });
              const newLeader = sorted[0];
              leaderId = newLeader.id;
              lastElectionDate = currentDate;
              if (newLeader.id !== existingBranch?.leaderId) {
                  roleChanges.push({ charId: newLeader.id, event: `Elected Constituency Branch Leader for ${party.name} in ${seatCode}.` });
              }
          }

          const newBranch: ConstituencyPartyBranch = { seatCode, state, leaderId, lastElectionDate };
          updatedBranches.set(seatCode, newBranch);
          
          if (leaderId) {
              if (!activeBranchLeadersByState.has(state)) activeBranchLeadersByState.set(state, []);
              const l = members.find(m => m.id === leaderId);
              if (l) activeBranchLeadersByState.get(state)!.push(l);
          }
      }
  });
  
  updatedParty.constituencyBranches = updatedBranches;

  // 2. Process State Party Branches (Leaders elected by Constituency Branch Leaders)
  const oldBranchLeaders = new Map<string, string | undefined>();
  party.stateBranches.forEach(b => oldBranchLeaders.set(b.state, b.leaderId));
  const oldExecutives = new Set(party.stateBranches.flatMap(b => b.executiveIds));

  updatedParty.stateBranches = uniqueStates.map(state => {
    const membersInState = partyMembers.filter(m => m.state === state);
    const oldLeaderId = oldBranchLeaders.get(state);
    const branchLeaders = activeBranchLeadersByState.get(state) || [];
    
    // Determine the state leader using votes from branch leaders
    let newLeaderId: string | undefined = undefined;
    
    if (branchLeaders.length > 0) {
        // Candidates can be any member in the state
        // Branch leaders vote based on influence + relationship (abstracted as ideology distance & influence)
        const votes = new Map<string, number>();
        membersInState.forEach(m => votes.set(m.id, 0));
        
        branchLeaders.forEach(voter => {
            let bestCandidate = membersInState[0];
            let bestScore = -Infinity;
            const voterAff = voter.affiliationId; // Just for slight bias
            
            membersInState.forEach(candidate => {
                let score = candidate.influence + (candidate.charisma * 0.5);
                if (candidate.id === oldLeaderId) score *= 1.5;
                if (candidate.affiliationId === voterAff) score *= 1.2; // Favor own affiliation
                
                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = candidate;
                }
            });
            
            if (bestCandidate) {
                votes.set(bestCandidate.id, (votes.get(bestCandidate.id) || 0) + 1);
            }
        });
        
        // Find candidate with most votes
        let topCandidateId: string | undefined = undefined;
        let maxVotes = -1;
        votes.forEach((v, id) => {
            if (v > maxVotes) {
                maxVotes = v;
                topCandidateId = id;
            }
        });
        
        newLeaderId = topCandidateId;
    } else {
        // Fallback if no branches exist in the state: fallback to raw influence (legacy behavior)
        if (membersInState.length > 0) {
            const sorted = [...membersInState].sort((a, b) => {
                let scoreA = a.influence;
                let scoreB = b.influence;
                if (a.id === oldLeaderId) scoreA *= 1.5;
                if (b.id === oldLeaderId) scoreB *= 1.5;
                if (oldExecutives.has(a.id)) scoreA *= 1.2;
                if (oldExecutives.has(b.id)) scoreB *= 1.2;
                return scoreB - scoreA;
            });
            newLeaderId = sorted[0].id;
        }
    }

    // Executives are just the next most influential people in the state, excluding the leader
    const remainingMembers = membersInState.filter(m => m.id !== newLeaderId);
    remainingMembers.sort((a, b) => {
        let scoreA = a.influence;
        let scoreB = b.influence;
        if (oldExecutives.has(a.id)) scoreA *= 1.2;
        if (oldExecutives.has(b.id)) scoreB *= 1.2;
        return scoreB - scoreA;
    });

    // Make sure we have STATE_EXECUTIVE_COUNT executives (assuming it was defined previously)
    const execCount = 3; // Hardcoded default just in case STATE_EXECUTIVE_COUNT is missing
    const newExecutiveIds = remainingMembers.slice(0, execCount).map(m => m.id);

    if (newLeaderId && newLeaderId !== oldLeaderId) {
        roleChanges.push({ charId: newLeaderId, event: `Elected State Leader for ${party.name} in ${state}.` });
    }
    newExecutiveIds.forEach(execId => {
        if (!oldExecutives.has(execId)) {
            roleChanges.push({ charId: execId, event: `Appointed State Executive for ${party.name} in ${state}.` });
        }
    });

    return {
      state,
      leaderId: newLeaderId,
      executiveIds: newExecutiveIds,
      lastElectionDate: currentDate // update election date for state branches too
    };
  });

  return { updatedParty, roleChanges };
};

export const conductPartyLeadershipElection = (
    voters: Character[], 
    candidates: Character[],
    party?: Party,
    chiefMinisterId?: string
): { leaderId?: string; deputyLeaderId?: string; voteTally: PartyElectionVoteTally } => {
    const voteTally: PartyElectionVoteTally = new Map();
    
    candidates.forEach(candidate => voteTally.set(candidate.id, 0));

    if (voters.length === 0 && candidates.length > 0) {
        let sortedByInfluence = [...candidates];
        if (party || chiefMinisterId) {
             sortedByInfluence.sort((a, b) => {
                 let scoreA = a.influence;
                 let scoreB = b.influence;
                 if (party && party.leaderId === a.id) scoreA *= 2.0;
                 if (chiefMinisterId && chiefMinisterId === a.id) scoreA *= 3.0;
                 if (party && party.leaderId === b.id) scoreB *= 2.0;
                 if (chiefMinisterId && chiefMinisterId === b.id) scoreB *= 3.0;
                 return scoreB - scoreA;
             });
        } else {
             sortedByInfluence.sort((a, b) => b.influence - a.influence);
        }
        
        const leaderId = sortedByInfluence.length > 0 ? sortedByInfluence[0].id : undefined;
        const deputyLeaderId = sortedByInfluence.length > 1 ? sortedByInfluence[1].id : undefined;
        if (leaderId) {
            voteTally.set(leaderId, 1);
        }
        return { leaderId, deputyLeaderId, voteTally };
    }

    for (const voter of voters) {
        let bestCandidateId: string | null = null;
        let maxScore = -1;

        for (const candidate of candidates) {
            let score = candidate.influence + candidate.charisma;
            if (voter.affiliationId === candidate.affiliationId) {
                score *= 1.5;
            }
            score += candidate.recognition / 2;
            
            const distEco = Math.abs(voter.ideology.economic - candidate.ideology.economic);
            const distGov = Math.abs(voter.ideology.governance - candidate.ideology.governance);
            score += (200 - (distEco + distGov)) * 0.2;

            if (party && party.leaderId === candidate.id) {
                score *= 2.0;
            }
            if (chiefMinisterId && chiefMinisterId === candidate.id) {
                score *= 3.0;
            }

            score *= (1 + Math.random() * 0.1);

            if (score > maxScore) {
                maxScore = score;
                bestCandidateId = candidate.id;
            }
        }

        if (bestCandidateId) {
            const currentVotes = voteTally.get(bestCandidateId) || 0;
            voteTally.set(bestCandidateId, currentVotes + 1);
        }
    }
    
    const sortedVotes = Array.from(voteTally.entries()).sort((a, b) => b[1] - a[1]);

    let leaderId: string | undefined = undefined;
    let deputyLeaderId: string | undefined = undefined;
    
    if (sortedVotes.length === 0 || sortedVotes.every(v => v[1] === 0)) {
        const sortedByInfluence = [...candidates].sort((a, b) => b.influence - a.influence);
        leaderId = sortedByInfluence.length > 0 ? sortedByInfluence[0].id : undefined;
        deputyLeaderId = sortedByInfluence.length > 1 ? sortedByInfluence[1].id : undefined;
    } else {
        leaderId = sortedVotes.length > 0 ? sortedVotes[0][0] : undefined;
        deputyLeaderId = sortedVotes.length > 1 ? sortedVotes[1][0] : undefined;
    }

    if (leaderId && leaderId === deputyLeaderId) {
      deputyLeaderId = undefined;
    }
    
    return { leaderId, deputyLeaderId, voteTally };
};

export const aiManagePartyContests = (
    party: Party,
    allCharacters: Character[],
    allSeatCodes: string[],
    featuresMap: Map<string, GeoJsonFeature>,
    demographicsMap: Map<string, Demographics>,
    affiliationsMap: Map<string, Affiliation>,
    strongholdMap: StrongholdMap
): Party => {
    const newContestedSeats = new Map<string, { allocatedAffiliationId: string | null; candidateId: string | null; }>();
    const partyMembers = allCharacters.filter(c => party.affiliationIds.includes(c.affiliationId) && c.isAlive);
    
    const affToPartyId = new Map<string, string>();
    party.affiliationIds.forEach(aid => affToPartyId.set(aid, party.id));

    // Calculate max seats affordable based on funds
    const maxSeats = Math.floor(party.funds / SEAT_CONTEST_COST);
    
    // Early exit: if we already picked exactly this many seats, assume no change needed
    // to avoid tearing down and rebuilding the nested Maps.
    if (maxSeats === party.contestedSeats.size && party.contestedSeats.size > 0) {
        return party;
    }

    // Collect potential seats with scores
    const potentialSeats: { seatCode: string; score: number; existingContest: any }[] = [];
    const calcCache = new Map<string, Map<string, number>>();

    allSeatCodes.forEach(seatCode => {
        const existingContest = party.contestedSeats.get(seatCode);
        
        const score = calculatePartySeatScore(
            party, 
            seatCode, 
            featuresMap, 
            demographicsMap, 
            affiliationsMap, 
            allCharacters, 
            affToPartyId,
            strongholdMap,
            calcCache
        );

        if (score > 15 || existingContest) {
            potentialSeats.push({ seatCode, score, existingContest });
        }
    });

    // Sort by score (descending) to prioritize best seats
    potentialSeats.sort((a, b) => b.score - a.score);

    // Go through potential seats until we hit our maxSeats quota or run out of valid seats
    let assignedSeats = 0;
    
    // We do one tentative pass to see how many seats can actually be contested 
    // to better inform our targetShares.
    const validSeatCodes: { seatCode: string, existingContest: any }[] = [];
    
    for (const pSeat of potentialSeats) {
        if (assignedSeats >= maxSeats) break;
        
        // Quick check to see if any valid affiliation exists for this seat
        const testBest = determineBestAffiliationForSeat(
             party,
             pSeat.seatCode,
             featuresMap,
             demographicsMap,
             affiliationsMap,
             partyMembers,
             strongholdMap
        );
         
        if (testBest) {
             validSeatCodes.push({ seatCode: pSeat.seatCode, existingContest: pSeat.existingContest });
             assignedSeats++;
        }
    }
    
    // Determine allocation targets for fair sharing based on actual valid seats
    const targetShares = new Map<string, number>();
    const currentShares = new Map<string, number>();

    if (validSeatCodes.length > 0 && party.affiliationIds.length > 0) {
        party.affiliationIds.forEach(affId => {
            targetShares.set(affId, 0); 
            currentShares.set(affId, 0);
        });
        
        if (validSeatCodes.length >= party.affiliationIds.length) {
            let remainingSeats = validSeatCodes.length;
            party.affiliationIds.forEach(affId => {
                targetShares.set(affId, 1);
                remainingSeats--;
            });
            
            const extraPerAffiliation = Math.floor(remainingSeats / party.affiliationIds.length);
            let remainder = remainingSeats % party.affiliationIds.length;
            
            party.affiliationIds.forEach(affId => {
                targetShares.set(affId, (targetShares.get(affId) || 0) + extraPerAffiliation + (remainder > 0 ? 1 : 0));
                if (remainder > 0) remainder--;
            });
        } else {
            party.affiliationIds.forEach(affId => targetShares.set(affId, 999));
        }
    }

    validSeatCodes.forEach(({ seatCode, existingContest }) => {
         const bestAffiliationId = determineBestAffiliationForSeat(
             party,
             seatCode,
             featuresMap,
             demographicsMap,
             affiliationsMap,
             partyMembers,
             strongholdMap,
             targetShares,
             currentShares
         );

         // Only add the contested seat if a valid affiliation was found for it
         if (bestAffiliationId) {
             newContestedSeats.set(seatCode, { 
                allocatedAffiliationId: bestAffiliationId, 
                candidateId: existingContest?.candidateId || null 
            });
         }
    });

    return { ...party, contestedSeats: newContestedSeats };
};

export const aiSelectAffiliationCandidates = (
  affiliationMembers: Character[],
  allocatedSeats: { seatCode: string; party: Party; seatFeature: GeoJsonFeature }[],
  demographicsMap: Map<string, Demographics>,
  affiliationsMap: Map<string, Affiliation>,
  strongholdMap: StrongholdMap,
  party: Party
): Map<string, string> => {
    const selections = new Map<string, string>();
    let availableMembers = [...affiliationMembers];
    let availableSeats = [...allocatedSeats];

    // Priority 1: Party Leader
    const partyLeader = availableMembers.find(m => m.id === party.leaderId);
    // Priority 2: Affiliation Leaders
    const affiliationLeaders = availableMembers.filter(m => m.isAffiliationLeader && m.id !== party.leaderId);
    // Priority 3: State Leaders
    const stateLeaders = availableMembers.filter(m => party.stateBranches.some(b => b.leaderId === m.id) && m.id !== party.leaderId && !affiliationLeaders.some(al => al.id === m.id));
    // Priority 4: Incumbent Speaker
    const incumbentSpeakers = availableMembers.filter(m => m.currentSeatCode === 'SPEAKER' && m.id !== party.leaderId && !affiliationLeaders.some(al => al.id === m.id) && !stateLeaders.some(sl => sl.id === m.id));

    const priorityCandidates = [];
    if (partyLeader) priorityCandidates.push(partyLeader);
    priorityCandidates.push(...affiliationLeaders);
    priorityCandidates.push(...stateLeaders);
    priorityCandidates.push(...incumbentSpeakers);

    // Assign VIPs first to their best possible seats
    for (const vip of priorityCandidates) {
        if (availableSeats.length === 0) break;
        let bestSeatIndex = -1;
        let bestInfluence = -Infinity;

        for (let i = 0; i < availableSeats.length; i++) {
            const seat = availableSeats[i];
            const demographics = demographicsMap.get(seat.seatCode) || null;
            let influence = calculateEffectiveInfluence(vip, seat.seatFeature, demographics, affiliationsMap, strongholdMap, vip.id, vip.affiliationId);
            
            if (vip.isMP && vip.currentSeatCode === seat.seatCode) {
                influence *= 1.5;
            }
            if (influence > bestInfluence) {
                bestInfluence = influence;
                bestSeatIndex = i;
            }
        }

        if (bestSeatIndex !== -1) {
            selections.set(availableSeats[bestSeatIndex].seatCode, vip.id);
            availableSeats.splice(bestSeatIndex, 1);
            availableMembers = availableMembers.filter(m => m.id !== vip.id);
        }
    }

    // Now assign remaining seats to best available members
    for (const seat of availableSeats) {
        let bestCandidate: { id: string; influence: number } | null = null;

        for (const member of availableMembers) {
            const demographics = demographicsMap.get(seat.seatCode) || null;
            let influence = calculateEffectiveInfluence(member, seat.seatFeature, demographics, affiliationsMap, strongholdMap, member.id, member.affiliationId);
            
            if (member.isMP && member.currentSeatCode === seat.seatCode) {
                influence *= 1.5;
            }

            if (bestCandidate === null || influence > bestCandidate.influence) {
                bestCandidate = { id: member.id, influence: influence };
            }
        }

        if (bestCandidate) {
            selections.set(seat.seatCode, bestCandidate.id);
            availableMembers = availableMembers.filter(m => m.id !== bestCandidate!.id);
        }
    }

    return selections;
};

export const aiFullElectionStrategy = (
    party: Party,
    allCharacters: Character[],
    allSeatCodes: string[],
    featuresMap: Map<string, GeoJsonFeature>,
    demographicsMap: Map<string, Demographics>,
    affiliationsMap: Map<string, Affiliation>,
    currentDate: Date,
    strongholdMap: StrongholdMap,
    skipStrategy: boolean = false,
    skipAffiliationIds: string[] = []
): { updatedParty: Party, historyUpdates: { charId: string, entry: CharacterHistoryEntry }[] } => {
    let partyWithAffiliationFocus = party;
    if (!skipStrategy) {
        partyWithAffiliationFocus = aiManagePartyContests(party, allCharacters, allSeatCodes, featuresMap, demographicsMap, affiliationsMap, strongholdMap);
    }

    const historyUpdates: { charId: string, entry: CharacterHistoryEntry }[] = [];
    const newContestedSeats = new Map(partyWithAffiliationFocus.contestedSeats);

    const partyAffiliations = party.affiliationIds.map(id => affiliationsMap.get(id)).filter((aff): aff is Affiliation => !!aff);

    for (const affiliation of partyAffiliations) {
        if (skipAffiliationIds.includes(affiliation.id)) continue;
        
        const allocatedSeatsForAffiliation = Array.from(partyWithAffiliationFocus.contestedSeats.entries())
            .filter(([, data]) => data.allocatedAffiliationId === affiliation.id)
            .map(([seatCode]) => {
                const seatFeature = featuresMap.get(seatCode);
                return seatFeature ? { seatCode, party: partyWithAffiliationFocus, seatFeature } : null;
            })
            .filter((s): s is { seatCode: string; party: Party; seatFeature: GeoJsonFeature } => s !== null);

        if (allocatedSeatsForAffiliation.length > 0) {
            const affiliationMembers = allCharacters.filter(c => c.affiliationId === affiliation.id && c.isAlive);
            const selections = aiSelectAffiliationCandidates(
                affiliationMembers,
                allocatedSeatsForAffiliation,
                demographicsMap,
                affiliationsMap,
                strongholdMap,
                partyWithAffiliationFocus
            );

            for (const [seatCode, candidateId] of selections.entries()) {
                const currentData = newContestedSeats.get(seatCode);
                if (currentData) {
                    newContestedSeats.set(seatCode, { ...currentData, candidateId });
                    
                    const seatName = featuresMap.get(seatCode)?.properties.PARLIMEN || 'a constituency';
                    historyUpdates.push({
                        charId: candidateId,
                        entry: {
                            date: currentDate,
                            event: `Selected as candidate for ${seatName}.`
                        }
                    });
                }
            }
        }
    }
    const updatedParty = { ...partyWithAffiliationFocus, contestedSeats: newContestedSeats };
    return { updatedParty, historyUpdates };
};

export const getPartySeatCounts = (electionResults: ElectionResults, partiesMap: Map<string, Party>): Map<string, number> => {
    const partySeatCounts = new Map<string, number>();
    partiesMap.forEach(p => partySeatCounts.set(p.id, 0));
    for (const partyId of electionResults.values()) {
        partySeatCounts.set(partyId, (partySeatCounts.get(partyId) || 0) + 1);
    }
    return partySeatCounts;
};

const totalSeats = (seatCounts: Map<string, number>): number => {
    let total = 0;
    for (const count of seatCounts.values()) {
        total += count;
    }
    return total;
};

export const determineSpeakerCandidates = (electionResults: ElectionResults, parties: Party[], characters: Character[]): Character[] => {
    const partiesMap = new Map(parties.map(p => [p.id, p]));
    const seatCounts = getPartySeatCounts(electionResults, partiesMap);
    
    const sortedParties = [...seatCounts.entries()].sort((a,b) => b[1] - a[1]);

    const candidates: Character[] = [];

    if (sortedParties.length > 0) {
        const govParty = partiesMap.get(sortedParties[0][0]);
        if (govParty?.leaderId) {
            const candidate = characters.find(c => c.id === govParty.leaderId && c.isAlive);
            if (candidate) candidates.push(candidate);
        }
    }
    
    if (sortedParties.length > 1) {
        const oppParty = partiesMap.get(sortedParties[1][0]);
        if (oppParty?.leaderId && !candidates.some(c => c.id === oppParty.leaderId)) {
            const candidate = characters.find(c => c.id === oppParty.leaderId && c.isAlive);
            if (candidate) candidates.push(candidate);
        }
    }
    
    if(candidates.length < 2 && characters.length > 1) {
        const otherChars = characters
            .filter(c => c.isAlive && !candidates.some(cand => cand.id === c.id))
            .sort((a,b) => (b.influence + b.recognition) - (a.influence + a.recognition));
        
        while(candidates.length < 2 && otherChars.length > 0) {
            candidates.push(otherChars.shift()!);
        }
    }

    return candidates;
};

export const conductSpeakerVote = (
    electionResults: ElectionResults,
    parties: Party[],
    candidates: Character[],
    affiliationToPartyMap: Map<string, string>,
    playerPartyId: string,
    playerVoteId: string 
): { winnerId: string; tally: SpeakerVoteTally; breakdown: SpeakerVoteBreakdown } => {
    const partiesMap = new Map(parties.map(p => [p.id, p]));
    const seatCounts = getPartySeatCounts(electionResults, partiesMap);
    
    const voteTally: SpeakerVoteTally = new Map();
    const voteBreakdown: SpeakerVoteBreakdown = new Map<string, string>(); 
    
    candidates.forEach(c => voteTally.set(c.id, 0));

    if (candidates.length === 0) return { winnerId: '', tally: new Map(), breakdown: new Map() };
    if (candidates.length === 1) return { winnerId: candidates[0].id, tally: new Map([[candidates[0].id, totalSeats(seatCounts)]]), breakdown: new Map() };
    
    const govCandidate = candidates[0];
    const oppCandidate = candidates.length > 1 ? candidates[1] : candidates[0];
    const govPartyId = affiliationToPartyMap.get(govCandidate.affiliationId);
    
    const alliancePartyIds = ['umno', 'mca', 'mic'];

    for (const [partyId, seats] of seatCounts.entries()) {
        if (seats === 0) continue;

        let voteGoesToId: string;

        if (partyId === playerPartyId) {
            voteGoesToId = playerVoteId;
        } else {
            const isAllianceMember = alliancePartyIds.includes(partyId);
            const isGovPartyAlliance = alliancePartyIds.includes(govPartyId!);
            
            if (isGovPartyAlliance && isAllianceMember) {
                voteGoesToId = govCandidate.id;
            } else {
                voteGoesToId = oppCandidate.id;
            }
        }
        
        voteTally.set(voteGoesToId, (voteTally.get(voteGoesToId) || 0) + seats);
        voteBreakdown.set(partyId, voteGoesToId);
    }
    
    const sortedVotes = Array.from(voteTally.entries()).sort((a, b) => b[1] - a[1]);
    const winnerId = sortedVotes.length > 0 ? sortedVotes[0][0] : candidates[0].id;
    
    return { winnerId, tally: voteTally, breakdown: voteBreakdown };
};

export const aiDecideBillVote = (party: Party | undefined, bill: Bill): VoteDirection => {
    if (!party) return 'Abstain';
    const alliancePartyIds = ['umno', 'mca', 'mic'];
    const isProposingPartyInAlliance = alliancePartyIds.includes(bill.proposingPartyId);
    const isVotingPartyInAlliance = alliancePartyIds.includes(party.id);

    // Constitutional Bill Logic - Requires 2/3, stakes are higher.
    if (bill.isConstitutional) {
         // If proposed by ally, strict discipline
         if (isProposingPartyInAlliance && isVotingPartyInAlliance) return 'Aye';
         // If proposed by ally, strict discipline
         if (isProposingPartyInAlliance && isVotingPartyInAlliance) return 'Aye';
         // If proposed by rival, strict opposition unless it benefits us
         if (!isProposingPartyInAlliance && isVotingPartyInAlliance) return 'Nay';
         if (isProposingPartyInAlliance && !isVotingPartyInAlliance) return 'Nay';

         // For independent interactions or special cases, check effects
         for (const effect of bill.effects) {
            if (effect.type === 'party_influence' && effect.targetId === party.id) {
                if (effect.value > 0) return 'Aye';
                if (effect.value < 0) return 'Nay';
            }
         }
    }

    if (isProposingPartyInAlliance && isVotingPartyInAlliance) {
        return Math.random() > 0.1 ? 'Aye' : 'Abstain'; 
    }
    
    for (const effect of bill.effects) {
        if (effect.type === 'party_influence' && effect.targetId === party.id) {
            return effect.value > 0 ? 'Aye' : 'Nay'; 
        }
    }
    
    if (bill.tags.includes('economic')) {
        if (party.ideology.economic > 60) return 'Aye';
        if (party.ideology.economic < 40) return 'Nay';
    }

    if (bill.tags.includes('religious') && party.affiliationIds.some(id => id.includes('islamist'))) {
        return 'Aye';
    }
     if (bill.tags.includes('nationalist') && party.affiliationIds.some(id => id.includes('nat'))) {
        return 'Aye';
    }
     if (bill.tags.includes('social') && party.affiliationIds.some(id => id.includes('chinese') || id.includes('indian'))) {
        return Math.random() > 0.3 ? 'Aye' : 'Abstain';
    }
    
    if (isProposingPartyInAlliance && !isVotingPartyInAlliance) {
        return Math.random() > 0.2 ? 'Nay' : 'Abstain';
    }

    return 'Abstain';
};


export const updateAffiliationLeaders = (characters: Character[], affiliations: Affiliation[]): Character[] => {
    const affiliationLeaders = new Set<string>();

    for (const affiliation of affiliations) {
        const members = characters.filter(c => c.isAlive && c.affiliationId === affiliation.id);
        if (members.length > 0) {
            const leader = members.sort((a, b) => b.influence - a.influence)[0];
            affiliationLeaders.add(leader.id);
        }
    }

    return characters.map(c => {
        const isLeader = affiliationLeaders.has(c.id);
        if (c.isAffiliationLeader === isLeader) return c;
        return { ...c, isAffiliationLeader: isLeader };
    });
};

export const handleAffiliationSecession = (
    currentParties: Party[],
    currentCharacters: Character[],
    currentElectionResults: ElectionResults,
    affiliationId: string,
    leader: Character | undefined,
    type: 'join' | 'new',
    options: { targetPartyId?: string; newPartyName?: string },
    date: Date,
    newPartyEthnicityFocus?: Ethnicity | null
): { newParties: Party[]; newElectionResults: ElectionResults; updatedCharacters: Character[]; removedParties: Party[]; newLinks: PartyGraphLink[] } => {
    let newParties = currentParties;
    let newElectionResults = currentElectionResults;
    
    const sourcePartyIndex = currentParties.findIndex(p => p.affiliationIds.includes(affiliationId));
    let sourcePartyName = 'Independent';

    if (sourcePartyIndex !== -1) {
        newParties = [...currentParties];
        const sourceParty = { ...newParties[sourcePartyIndex] };
        sourcePartyName = sourceParty.name;
        
        sourceParty.affiliationIds = sourceParty.affiliationIds.filter(id => id !== affiliationId);

        if (sourceParty.affiliationIds.length === 0) {
            newParties.splice(sourcePartyIndex, 1);
        } else {
            if (leader && sourceParty.leaderId === leader.id) {
                const remainingMembers = currentCharacters.filter(c => sourceParty.affiliationIds.includes(c.affiliationId) && c.isAlive);
                remainingMembers.sort((a,b) => b.influence - a.influence);
                sourceParty.leaderId = remainingMembers[0]?.id;
                sourceParty.deputyLeaderId = remainingMembers[1]?.id;
            }
            newParties[sourcePartyIndex] = sourceParty;
        }
    }

    let targetPartyName = '';
    
    if (type === 'join' && options.targetPartyId) {
        const targetPartyIndex = newParties.findIndex(p => p.id === options.targetPartyId);
        if (targetPartyIndex !== -1) {
            if (newParties === currentParties) newParties = [...currentParties];
            const targetParty = { ...newParties[targetPartyIndex] };
            targetParty.affiliationIds = [...targetParty.affiliationIds, affiliationId];
            newParties[targetPartyIndex] = targetParty;
            targetPartyName = targetParty.name;

            if (sourcePartyIndex !== -1) {
                currentElectionResults.forEach((winningPartyId, seatCode) => {
                    if (winningPartyId === currentParties[sourcePartyIndex].id) {
                        const mp = currentCharacters.find(c => c.currentSeatCode === seatCode && c.isMP);
                        if (mp && mp.affiliationId === affiliationId) {
                            if (newElectionResults === currentElectionResults) {
                                newElectionResults = new Map(currentElectionResults);
                            }
                            newElectionResults.set(seatCode, targetParty.id);
                        }
                    }
                });
            }
        }
    } else if (type === 'new' && options.newPartyName && leader) {
        const newParty: Party = {
            id: `party-${Date.now()}`,
            name: options.newPartyName,
            color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
            affiliationIds: [affiliationId],
            leaderId: leader.id,
            deputyLeaderId: '', // No deputy initially
            stateBranches: [],
            contestedSeats: new Map(),
            leaderHistory: [{ leaderId: leader.id, name: leader.name, startDate: date }],
            ethnicityFocus: newPartyEthnicityFocus === null ? 'Multi-Racial' : (newPartyEthnicityFocus || undefined),
            relations: new Map(),
            unity: 100,
            ideology: leader.ideology,
            funds: 500000 // Initial funds for new party
        };
        if (newParties === currentParties) newParties = [...currentParties];
        newParties.push(newParty);
        targetPartyName = newParty.name;

        if (sourcePartyIndex !== -1) {
            currentElectionResults.forEach((winningPartyId, seatCode) => {
                if (winningPartyId === currentParties[sourcePartyIndex].id) {
                    const mp = currentCharacters.find(c => c.currentSeatCode === seatCode && c.isMP);
                     if (mp && mp.affiliationId === affiliationId) {
                        if (newElectionResults === currentElectionResults) {
                            newElectionResults = new Map(currentElectionResults);
                        }
                        newElectionResults.set(seatCode, newParty.id);
                    }
                }
            });
        }
    }
    
    let updatedCharacters = currentCharacters;
    
    // Only map if we actually have changes
    const needsCharUpdate = currentCharacters.some(c => c.affiliationId === affiliationId);
    if (needsCharUpdate) {
        updatedCharacters = currentCharacters.map(c => {
            if (c.affiliationId === affiliationId) {
                const event = sourcePartyIndex !== -1 
                    ? `Left ${sourcePartyName} to join ${targetPartyName}.`
                    : `Joined ${targetPartyName} as an affiliated faction.`;
                const newHistory = [...c.history, { date, event }];
                return { ...c, history: newHistory };
            }
            return c;
        });
    }

    newParties = initializePartyRelations(newParties);
    
    // Determine removed parties
    const originalPartyIds = new Set(currentParties.map(p => p.id));
    const newPartyIds = new Set(newParties.map(p => p.id));
    const removedParties = currentParties.filter(p => !newPartyIds.has(p.id));

    // Determine graph links
    const newLinks: PartyGraphLink[] = [];
    if (sourcePartyIndex !== -1) {
        const sourcePartyId = currentParties[sourcePartyIndex].id;
        const targetPartyId = type === 'join' ? options.targetPartyId : newParties.find(p => p.name === options.newPartyName)?.id;
        const completelyEmpty = currentParties[sourcePartyIndex].affiliationIds.length === 1;
        
        if (targetPartyId) {
            newLinks.push({
                source: sourcePartyId,
                target: targetPartyId,
                type: type === 'new' 
                      ? (completelyEmpty ? 'renamed_to' : 'splits_from')
                      : (completelyEmpty ? 'absorbed_by' : 'faction_migrates'),
                date
            });
        }
    }

    return { newParties, newElectionResults, updatedCharacters, removedParties, newLinks };
};

export const handlePartyAbsorption = (
    currentParties: Party[],
    hostPartyId: string,
    acceptedParties: Party[],
    acceptedAffiliations: Affiliation[],
    currentElectionResults: ElectionResults,
    currentCharacters: Character[],
    date: Date
): { newParties: Party[]; newElectionResults: ElectionResults; updatedCharacters: Character[]; removedParties: Party[]; newLinks: PartyGraphLink[] } => {
    
    const hostPartyIndex = currentParties.findIndex(p => p.id === hostPartyId);
    if (hostPartyIndex === -1) return { newParties: currentParties, newElectionResults: currentElectionResults, updatedCharacters: currentCharacters, removedParties: [], newLinks: [] };
    
    const hostParty = { ...currentParties[hostPartyIndex] };
    const hostPartyName = hostParty.name;

    const absorbedPartyIds = new Set(acceptedParties.map(p => p.id));
    const absorbedAffiliationIds = new Set([
        ...acceptedParties.flatMap(p => p.affiliationIds),
        ...acceptedAffiliations.map(a => a.id)
    ]);
    
    absorbedAffiliationIds.forEach(id => {
        if (!hostParty.affiliationIds.includes(id)) {
            hostParty.affiliationIds.push(id);
        }
    });

    let remainingParties = currentParties.filter(p => p.id !== hostPartyId && !absorbedPartyIds.has(p.id));

    const poachedAffiliationIds = new Set(acceptedAffiliations.map(a => a.id));
    remainingParties = remainingParties.map(p => {
        const updatedAffiliations = p.affiliationIds.filter(affId => !poachedAffiliationIds.has(affId));
        if (updatedAffiliations.length < p.affiliationIds.length) {
             return { ...p, affiliationIds: updatedAffiliations };
        }
        return p;
    }).filter(p => p.affiliationIds.length > 0);

    let newParties = [...remainingParties, hostParty];

    const newElectionResults = new Map(currentElectionResults);
    
    // Transfer seats from absorbed parties to host party
    absorbedPartyIds.forEach(id => {
        for (const [seatCode, partyId] of newElectionResults.entries()) {
             if (partyId === id) {
                 newElectionResults.set(seatCode, hostParty.id);
             }
        }
    });

    const updatedCharacters = currentCharacters.map(c => {
         // Logic to add history
         const oldParty = currentParties.find(p => p.affiliationIds.includes(c.affiliationId));
         
         // If character's affiliation was poached or their party was absorbed
         if (poachedAffiliationIds.has(c.affiliationId) || (oldParty && absorbedPartyIds.has(oldParty.id))) {
             return { ...c, history: [...c.history, { date, event: `Absorbed into ${hostPartyName}.` }] };
         }
         return c;
    });

    hostParty.ideology = calculateAverageIdeology(
        hostParty.affiliationIds
            .map(id => AFFILIATIONS.find(a => a.id === id)?.ideology)
            .filter((i): i is Ideology => !!i)
    );
    newParties = initializePartyRelations(newParties);
    
    // Determine removed parties
    const newPartyIds = new Set(newParties.map(p => p.id));
    const removedParties = currentParties.filter(p => !newPartyIds.has(p.id));

    const newLinks: PartyGraphLink[] = removedParties.map(p => ({
        source: p.id,
        target: hostParty.id,
        type: 'absorbed_by',
        date
    }));

    poachedAffiliationIds.forEach(affId => {
        const sourceParty = currentParties.find(p => !removedParties.some(rp => rp.id === p.id) && p.id !== hostParty.id && p.affiliationIds.includes(affId));
        if (sourceParty && !newLinks.some(l => l.source === sourceParty.id && l.target === hostParty.id)) {
            newLinks.push({
                source: sourceParty.id,
                target: hostParty.id,
                type: 'faction_migrates',
                date
            });
        }
    });

    return { newParties, newElectionResults, updatedCharacters, removedParties, newLinks };
};

export const handlePartyMerger = (
    currentParties: Party[],
    initiatorPartyId: string,
    acceptedParties: Party[],
    acceptedAffiliations: Affiliation[],
    newName: string,
    leaderId: string,
    deputyId: string | undefined,
    currentElectionResults: ElectionResults,
    currentCharacters: Character[],
    date: Date
): { newParties: Party[]; newElectionResults: ElectionResults; updatedCharacters: Character[]; removedParties: Party[]; newLinks: PartyGraphLink[] } => {
    
    const participatingPartyIds = new Set([initiatorPartyId, ...acceptedParties.map(p => p.id)]);
    const participatingParties = currentParties.filter(p => participatingPartyIds.has(p.id));
    const participatingAffiliations = new Set([
        ...participatingParties.flatMap(p => p.affiliationIds),
        ...acceptedAffiliations.map(a => a.id)
    ]);
    
    const newParty: Party = {
        id: `party-${Date.now()}-merged`,
        name: newName,
        color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        affiliationIds: Array.from(participatingAffiliations),
        leaderId: leaderId,
        deputyLeaderId: deputyId,
        stateBranches: [],
        contestedSeats: new Map(),
        leaderHistory: [{ leaderId: leaderId, name: currentCharacters.find(c => c.id === leaderId)?.name || 'Leader', startDate: date }],
        ethnicityFocus: 'Multi-Racial', // Mergers usually result in broader coalitions or new focus, let's default to multi-ethnic for now or inherit from initiator if strict.
        relations: new Map(),
        unity: 100,
        ideology: { economic: 50, governance: 50 }, // Simplified average, ideally calc from affiliations
        funds: currentParties.filter(p => participatingPartyIds.has(p.id)).reduce((sum, p) => sum + p.funds, 0) // Combine funds
    };
    
    // Remove participating parties and strip poached affiliations from others
    let remainingParties = currentParties.filter(p => !participatingPartyIds.has(p.id));
    const poachedAffiliationIds = new Set(acceptedAffiliations.map(a => a.id));
    
    remainingParties = remainingParties.map(p => {
        const updatedAffiliations = p.affiliationIds.filter(affId => !poachedAffiliationIds.has(affId));
        if (updatedAffiliations.length < p.affiliationIds.length) {
             return { ...p, affiliationIds: updatedAffiliations };
        }
        return p;
    }).filter(p => p.affiliationIds.length > 0);
    
    const newParties = [...remainingParties, newParty];
    newParty.ideology = calculateAverageIdeology(
        newParty.affiliationIds
            .map(id => AFFILIATIONS.find(a => a.id === id)?.ideology)
            .filter((i): i is Ideology => !!i)
    );

    const newElectionResults = new Map(currentElectionResults);
    participatingPartyIds.forEach(id => {
        for (const [seatCode, partyId] of newElectionResults.entries()) {
             if (partyId === id) {
                 newElectionResults.set(seatCode, newParty.id);
             }
        }
    });

    const updatedCharacters = currentCharacters.map(c => {
        const oldParty = currentParties.find(p => p.affiliationIds.includes(c.affiliationId));
        if (participatingAffiliations.has(c.affiliationId)) {
             return { ...c, history: [...c.history, { date, event: `Merged into ${newName}.` }] };
        }
        return c;
    });

    const newPartyIds = new Set(newParties.map(p => p.id));
    const removedParties = currentParties.filter(p => !newPartyIds.has(p.id));

    const newLinks: PartyGraphLink[] = removedParties.map(p => ({
        source: p.id,
        target: newParty.id,
        type: 'merges_into',
        date
    }));

    poachedAffiliationIds.forEach(affId => {
        const sourceParty = currentParties.find(p => !removedParties.some(rp => rp.id === p.id) && p.affiliationIds.includes(affId));
        if (sourceParty && !newLinks.some(l => l.source === sourceParty.id && l.target === newParty.id)) {
            newLinks.push({
                source: sourceParty.id,
                target: newParty.id,
                type: 'faction_migrates',
                date
            });
        }
    });

    return { 
        newParties: initializePartyRelations(newParties), 
        newElectionResults, 
        updatedCharacters,
        removedParties,
        newLinks
    };
};


export const formGovernment = (
    electionResults: ElectionResults,
    parties: Party[],
    characters: Character[],
    date: Date,
    alliances: PoliticalAlliance[],
    forcedCoalitionIds?: string[],
    previousGovernment?: Government | null
): { government: Government; updatedCharacters: Character[] } => {
    
    const seatCounts = getPartySeatCounts(electionResults, new Map(parties.map(p => [p.id, p])));
    const total = Array.from(seatCounts.values()).reduce((a,b) => a+b, 0);
    const majority = Math.floor(total / 2) + 1;
    
    let rulingCoalitionIds: string[] = [];
    
    if (forcedCoalitionIds) {
        rulingCoalitionIds = forcedCoalitionIds;
    } else {
        // AI Logic to determine winner
        // 1. Check pre-existing alliances
        let bestAlliance: PoliticalAlliance | null = null;
        let maxSeats = -1;
        
        for (const alliance of alliances) {
            let seats = 0;
            alliance.memberPartyIds.forEach(pid => seats += (seatCounts.get(pid) || 0));
            if (seats > maxSeats) {
                maxSeats = seats;
                bestAlliance = alliance;
            }
        }
        
        // 2. Check single parties not in alliances
        let bestParty: Party | null = null;
        let maxPartySeats = -1;
        parties.forEach(p => {
             if (!alliances.some(a => a.memberPartyIds.includes(p.id))) {
                 const s = seatCounts.get(p.id) || 0;
                 if (s > maxPartySeats) {
                     maxPartySeats = s;
                     bestParty = p;
                 }
             }
        });

        if (bestAlliance && maxSeats >= maxPartySeats) {
            rulingCoalitionIds = [...bestAlliance.memberPartyIds];
        } else if (bestParty) {
            rulingCoalitionIds = [bestParty.id];
        } else if (parties.length > 0) {
            rulingCoalitionIds = [parties[0].id]; // Fallback
        }

        // Hung Parliament processing: 
        // If the leading coalition doesn't have a majority, try adding friendly parties
        let currentSeats = rulingCoalitionIds.reduce((sum, pid) => sum + (seatCounts.get(pid) || 0), 0);
        
        if (currentSeats < majority) {
            rulingCoalitionIds.sort((a,b) => (seatCounts.get(b) || 0) - (seatCounts.get(a) || 0));
            const leadPartyIdForNegotiations = rulingCoalitionIds[0];
            const leadPartyForNegotiations = parties.find(p => p.id === leadPartyIdForNegotiations);

            if (leadPartyForNegotiations) {
                const alliancesNotIncluded = alliances.filter(a => !rulingCoalitionIds.includes(a.memberPartyIds[0]));
                const independentPartiesNotIncluded = parties.filter(p => !alliances.some(a => a.memberPartyIds.includes(p.id)) && !rulingCoalitionIds.includes(p.id));
                
                const potentialPartners: { ids: string[], score: number, seats: number }[] = [];
                
                for (const a of alliancesNotIncluded) {
                     const leader = parties.find(p => p.id === a.leaderPartyId);
                     const baseRelation = leader ? leadPartyForNegotiations.relations.get(leader.id) || 50 : 50;
                     const ideScore = leader ? calculateIdeologicalCompatibility(leadPartyForNegotiations, leader) : 50;
                     
                     // Highly prioritize ideological alignment to prevent weird marriages of convenience unless desperate
                     const score = (baseRelation * 0.4) + (ideScore * 0.6);
                     
                     const seats = a.memberPartyIds.reduce((s, id) => s + (seatCounts.get(id) || 0), 0);
                     if (seats > 0) {
                         potentialPartners.push({ ids: a.memberPartyIds, score, seats });
                     }
                }
                
                for (const p of independentPartiesNotIncluded) {
                     const baseRelation = leadPartyForNegotiations.relations.get(p.id) || 50;
                     const ideScore = calculateIdeologicalCompatibility(leadPartyForNegotiations, p);
                     const score = (baseRelation * 0.4) + (ideScore * 0.6);
                     
                     const seats = seatCounts.get(p.id) || 0;
                     if (seats > 0) {
                         potentialPartners.push({ ids: [p.id], score, seats });
                     }
                }
                
                // Sort by highest relations, then by seat contribution
                potentialPartners.sort((a, b) => {
                     if (Math.abs(b.score - a.score) > 10) return b.score - a.score;
                     return b.seats - a.seats;
                });
                
                for (const partner of potentialPartners) {
                    if (currentSeats >= majority) break;
                    if (partner.score < 30) continue; // Reject hostile alliances
                    
                    partner.ids.forEach(id => {
                        rulingCoalitionIds.push(id);
                        currentSeats += (seatCounts.get(id) || 0);
                    });
                }
            }
        }
    }
    
    // Sort coalition members by seat count to determine leader
    rulingCoalitionIds.sort((a,b) => (seatCounts.get(b) || 0) - (seatCounts.get(a) || 0));
    const leadPartyId = rulingCoalitionIds[0];
    const leadParty = parties.find(p => p.id === leadPartyId);
    
    let chiefMinisterId = '';
    if (leadParty) {
        const leader = characters.find(c => c.id === leadParty.leaderId);
        if (leader && leader.isMP) {
            chiefMinisterId = leader.id;
        } else {
            const leadPartyMPs = characters.filter(c => c.isMP && leadParty.affiliationIds.includes(c.affiliationId));
            if (leadPartyMPs.length > 0) {
                leadPartyMPs.sort((a, b) => b.influence - a.influence);
                chiefMinisterId = leadPartyMPs[0].id;
            } else {
                const coalitionMPs = characters.filter(c => c.isMP && rulingCoalitionIds.includes(
                    parties.find(p => p.affiliationIds.includes(c.affiliationId))?.id || ''
                ));
                if (coalitionMPs.length > 0) {
                    coalitionMPs.sort((a, b) => b.influence - a.influence);
                    chiefMinisterId = coalitionMPs[0].id;
                }
            }
        }
    }
    
    // Assign Cabinet
    const cabinet: Minister[] = [];
    const portfolios = ['Home Affairs', 'Finance', 'Defence', 'Education', 'Health', 'Agriculture', 'Transport'];
    
    // Distribute portfolios among coalition partners proportional to seats
    const totalCoalitionSeats = rulingCoalitionIds.reduce((sum, id) => sum + (seatCounts.get(id) || 0), 0);
    
    const partyPortfolioCounts = new Map<string, number>();
    let remainingPortfolios = portfolios.length;
    const remainders: { id: string, remainder: number }[] = [];

    rulingCoalitionIds.forEach(id => {
        const seats = seatCounts.get(id) || 0;
        const quota = (seats / totalCoalitionSeats) * portfolios.length;
        const floor = Math.floor(quota);
        partyPortfolioCounts.set(id, floor);
        remainders.push({ id, remainder: quota - floor });
        remainingPortfolios -= floor;
    });

    remainders.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remainingPortfolios; i++) {
        const id = remainders[i]?.id;
        if (id) {
            partyPortfolioCounts.set(id, (partyPortfolioCounts.get(id) || 0) + 1);
        }
    }

    const availablePortfolios = [...portfolios];

    rulingCoalitionIds.forEach(id => {
        const count = partyPortfolioCounts.get(id) || 0;
        const party = parties.find(p => p.id === id);
        if (party && count > 0) {
            const partyMPs = characters.filter(c => 
                c.isMP && 
                party.affiliationIds.includes(c.affiliationId) && 
                c.id !== chiefMinisterId
            ).sort((a, b) => b.influence - a.influence);

            for (let i = 0; i < count; i++) {
                if (partyMPs.length > 0 && availablePortfolios.length > 0) {
                    const minister = partyMPs.shift()!;
                    const portfolio = availablePortfolios.shift()!;
                    cabinet.push({ ministerId: minister.id, portfolio });
                }
            }
        }
    });

    // If there are still remaining portfolios (e.g. not enough MPs), assign to just highest influence MPs left over
    if (availablePortfolios.length > 0) {
        const remainingMPs = characters.filter(c => 
            c.isMP && 
            rulingCoalitionIds.includes(parties.find(p => p.affiliationIds.includes(c.affiliationId))?.id || '') && 
            c.id !== chiefMinisterId &&
            !cabinet.some(m => m.ministerId === c.id)
        ).sort((a, b) => b.influence - a.influence);

        while (availablePortfolios.length > 0 && remainingMPs.length > 0) {
            const minister = remainingMPs.shift()!;
            const portfolio = availablePortfolios.shift()!;
            cabinet.push({ ministerId: minister.id, portfolio });
        }
    }

    const pmPartyId = leadPartyId;
    
    let pmHistory = previousGovernment ? [...previousGovernment.pmHistory] : [];
    
    if (pmHistory.length === 0 || pmHistory[pmHistory.length - 1].pmId !== chiefMinisterId) {
        if (pmHistory.length > 0) {
            pmHistory[pmHistory.length - 1].endDate = date;
        }
        pmHistory.push({
            pmId: chiefMinisterId,
            startDate: date,
            partyId: pmPartyId,
            cabinet: [...cabinet]
        });
    }

    const government: Government = {
        chiefMinisterId,
        rulingCoalitionIds,
        cabinet,
        formedDate: date,
        pmHistory
    };

    const updatedCharacters = characters.map(c => {
        if (c.id === chiefMinisterId) {
             return { ...c, history: [...c.history, { date, event: 'Appointed as Chief Minister.' }] };
        }
        const cab = cabinet.find(m => m.ministerId === c.id);
        if (cab) {
             return { ...c, history: [...c.history, { date, event: `Appointed as Minister of ${cab.portfolio}.` }] };
        }
        return c;
    });

    return { government, updatedCharacters };
};

export const conductVoteOfConfidence = (
    government: Government,
    characters: Character[],
    parties: Party[],
    electionResults: ElectionResults
): VoteOfConfidenceResult => {
    const votesBreakdown = new Map<string, 'For' | 'Against' | 'Abstain'>();
    let votesFor = 0;
    let votesAgainst = 0;
    
    const mps = characters.filter(c => c.isMP && c.isAlive);
    const partiesMap = new Map(parties.map(p => [p.id, p]));
    const affToParty = new Map<string, string>();
    parties.forEach(p => p.affiliationIds.forEach(aid => affToParty.set(aid, p.id)));

    mps.forEach(mp => {
        if (mp.currentSeatCode === 'SPEAKER') return; // Speaker doesn't vote usually

        const partyId = affToParty.get(mp.affiliationId);
        let vote: 'For' | 'Against' | 'Abstain' = 'Abstain';

        if (partyId && government.rulingCoalitionIds.includes(partyId)) {
            vote = 'For';
        } else {
            // Opposition logic
            // If relations with lead party are high, might abstain or vote for?
            // For now, strict opposition.
            vote = 'Against';
        }

        if (vote === 'For') votesFor++;
        if (vote === 'Against') votesAgainst++;
        votesBreakdown.set(mp.id, vote);
    });

    return {
        passed: votesFor > votesAgainst,
        votesFor,
        votesAgainst,
        breakdown: votesBreakdown
    };
};

export const performSecurityCrackdown = (
    date: Date,
    characters: Character[],
    parties: Party[],
    government: Government
): { event: GameEvent, updatedCharacters: Character[], updatedParties: Party[] } => {
    const updatedCharacters = [...characters];
    let updatedParties = [...parties];

    const oppMPs = characters.filter(c => {
         if (!c.isMP || c.currentSeatCode === 'SPEAKER') return false;
         const pId = parties.find(p => p.affiliationIds.includes(c.affiliationId))?.id;
         return pId && !government.rulingCoalitionIds.includes(pId);
    }).sort((a,b) => b.influence - a.influence);

    const target = oppMPs[0]; // Top opposition leader
    let eventDescription = "The government has initiated a security crackdown.";
    let eventEffects: string[] = [];

    if (target) {
         eventDescription = `Opposition leader ${target.name} has been detained under the Internal Security Act, citing threats to national stability.`;
         eventEffects = [`${target.name} removed from active politics.`, "Opposition anger rises.", "Government unity penalty."];
         
         const charIndex = updatedCharacters.findIndex(c => c.id === target.id);
         if (charIndex !== -1) {
             updatedCharacters[charIndex] = {
                 ...updatedCharacters[charIndex],
                 influence: 0,
                 history: [...updatedCharacters[charIndex].history, { date, event: "Detained under Internal Security Act." }]
             };
         }
    }

    const event: GameEvent = {
        id: `evt-crackdown-${Date.now()}`,
        title: "Internal Security Crackdown",
        description: eventDescription,
        date: date,
        type: 'crackdown_backlash',
        affectedPartyIds: government.rulingCoalitionIds,
        effects: eventEffects
    };

    return { event, updatedCharacters, updatedParties };
};

export const handleCharacterIdeologicalDrift = (
    characters: Character[],
    affiliationsMap: Map<string, Affiliation>,
    date: Date
): { updatedCharacters: Character[], driftLogs: string[] } => {
    const updatedCharacters: Character[] = [];
    const driftLogs: string[] = [];

    characters.forEach(c => {
        let char = { ...c };
        // Small chance to drift
        if (Math.random() < 0.01) { 
            const driftEco = (Math.random() * 4) - 2;
            const driftGov = (Math.random() * 4) - 2;
            
            char.ideology = {
                economic: Math.max(0, Math.min(100, char.ideology.economic + driftEco)),
                governance: Math.max(0, Math.min(100, char.ideology.governance + driftGov))
            };
        }
        updatedCharacters.push(char);
    });

    return { updatedCharacters, driftLogs };
};

export const cleanupPoliticalVacancies = (
    parties: Party[], 
    livingCharIds: Set<string>, // Changed from Character[]
    currentDate: Date
): Party[] => {
    return parties.map(p => {
        let needsUpdate = false;
        
        if (p.leaderId && !livingCharIds.has(p.leaderId)) needsUpdate = true;
        if (p.deputyLeaderId && !livingCharIds.has(p.deputyLeaderId)) needsUpdate = true;
        
        let branchesNeedUpdate = false;
        p.stateBranches.forEach(b => {
             if (b.leaderId && !livingCharIds.has(b.leaderId)) branchesNeedUpdate = true;
             if (b.executiveIds.some(eid => !livingCharIds.has(eid))) branchesNeedUpdate = true;
        });
        
        if (branchesNeedUpdate) needsUpdate = true;
        
        if (!needsUpdate) return p;

        let updatedParty = { ...p };
        let historyUpdated = false;
        let newHistory = [...p.leaderHistory];
        
        // Check National Leader
        if (p.leaderId && !livingCharIds.has(p.leaderId)) {
            // Leader died or left
            if (newHistory.length > 0) {
                const lastEntry = newHistory[newHistory.length - 1];
                if (!lastEntry.endDate) {
                    newHistory[newHistory.length - 1] = { ...lastEntry, endDate: currentDate };
                    historyUpdated = true;
                }
            }
            updatedParty.leaderId = undefined; // Force election next cycle
        }
        
        if (historyUpdated) {
            updatedParty.leaderHistory = newHistory;
        }

        // Check Deputy
        if (p.deputyLeaderId && !livingCharIds.has(p.deputyLeaderId)) {
             updatedParty.deputyLeaderId = undefined;
        }

        // Check State Branches
        if (branchesNeedUpdate) {
            updatedParty.stateBranches = p.stateBranches.map(b => ({
                ...b,
                leaderId: (b.leaderId && livingCharIds.has(b.leaderId)) ? b.leaderId : undefined,
                executiveIds: b.executiveIds.filter(eid => livingCharIds.has(eid))
            }));
        }

        return updatedParty;
    });
};

export const cleanupGovernmentVacancies = (
    government: Government | null,
    livingCharIds: Set<string> // Changed from Character[]
): Government | null => {
    if (!government) return null;

    // Check Cabinet
    const updatedCabinet = government.cabinet.filter(m => livingCharIds.has(m.ministerId));
    
    // If CM dead, the gov effectively falls or needs reshuffle. For now, leave empty string or handle upstream.
    const cmAlive = livingCharIds.has(government.chiefMinisterId);
    
    if (!cmAlive) {
        // Just remove from post. Election cycle logic or vote of confidence should trigger.
        return { ...government, chiefMinisterId: '', cabinet: updatedCabinet };
    }

    return { ...government, cabinet: updatedCabinet };
};
