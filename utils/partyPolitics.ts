
import { Party, Character, ElectionResults, LogEntry, Ideology, Affiliation } from '../types';
import { calculateEffectiveInfluence } from './influence';

// Constants
const BASE_INCOME = 10000;
const INCOME_PER_SEAT = 5500;
const INCOME_PER_MEMBER = 100;
const UPKEEP_PER_MEMBER = 50;

export const calculatePartyIncome = (party: Party, electionResults: ElectionResults, members: Character[], isRulingParty: boolean = false): number => {
    let income = BASE_INCOME;
    
    // Seat Income (State funding / Donations from MPs)
    let seats = 0;
    electionResults.forEach((pId) => {
        if (pId === party.id) seats++;
    });
    income += seats * INCOME_PER_SEAT;

    // Membership Dues / Donations
    income += members.length * INCOME_PER_MEMBER;

    // Patronage / Government Advantage
    if (isRulingParty) {
        income += 50000; // Big flat boost
        income += seats * 2500; // Extra bonus per seat held for being in power
    }

    // Expenses
    const expenses = members.length * UPKEEP_PER_MEMBER;

    return income - expenses;
};

export const calculateMemberSatisfaction = (
    member: Character, 
    party: Party, 
    leader: Character | undefined,
    affiliationsMap: Map<string, Affiliation>
): number => {
    if (!leader) return 50; // No leader = uncertainty
    if (member.id === leader.id) return 100; // Leader is happy with themselves

    let satisfaction = 70; // Base

    // 1. Ideological Compatibility
    const memberIdeology = member.ideology;
    const leaderIdeology = leader.ideology;
    
    const distEco = Math.abs(memberIdeology.economic - leaderIdeology.economic);
    const distGov = Math.abs(memberIdeology.governance - leaderIdeology.governance);
    const dist = Math.sqrt(distEco * distEco + distGov * distGov);

    satisfaction -= (dist * 0.5); // Max penalty ~70

    // 2. Ambition vs Position
    if (member.influence > leader.influence) {
        satisfaction -= 20; // "I should be leader"
    }

    // 3. Party Unity
    satisfaction += (party.unity - 50) * 0.5;

    // 4. Ethnicity Friction (if applicable)
    let isMatch = true;
    if (party.ethnicityFocus && party.ethnicityFocus !== 'Multi-Racial') {
        if (party.ethnicityFocus === 'Malay') {
            const malaySubtypes = ['Malay', 'Bumiputera Sabah (Muslim)', 'Bumiputera Sarawak (Muslim)'];
            isMatch = malaySubtypes.includes(member.ethnicity as any);
        } else if (party.ethnicityFocus === 'Multi-Racial (Sabah)') {
            const sabahSubtypes = ['Bumiputera Sabah (Muslim)', 'Bumiputera Sabah (Non-Muslim)', 'Sabahan Chinese', 'Multi-Racial (Sabah)'];
            isMatch = sabahSubtypes.includes(member.ethnicity as any);
        } else if (party.ethnicityFocus === 'Multi-Racial (Sarawak)') {
            const sarawakSubtypes = ['Bumiputera Sarawak (Muslim)', 'Bumiputera Sarawak (Non-Muslim)', 'Sarawakian Chinese', 'Multi-Racial (Sarawak)'];
            isMatch = sarawakSubtypes.includes(member.ethnicity as any);
        } else {
            isMatch = member.ethnicity === party.ethnicityFocus;
        }

        if (!isMatch) {
            satisfaction -= 15; // significant friction if somehow out of alignment
        } else if (member.affiliationId !== leader.affiliationId) {
            satisfaction -= 5;
        }
    }

    return Math.max(0, Math.min(100, satisfaction));
};

export interface InternalPoliticsResult {
    updatedParty: Party;
    updatedMembers: Character[];
    logs: LogEntry[];
    schism?: {
        newParty: Party;
        leavingMemberIds: string[];
    };
}

export const processInternalPolitics = (
    party: Party,
    members: Character[],
    electionResults: ElectionResults,
    affiliationsMap: Map<string, Affiliation>,
    date: Date,
    isRulingParty: boolean = false
): InternalPoliticsResult => {
    let updatedParty = { ...party };
    let updatedMembers = [...members];
    const logs: LogEntry[] = [];

    // 1. Finances
    const netIncome = calculatePartyIncome(updatedParty, electionResults, updatedMembers, isRulingParty);
    updatedParty.funds = (updatedParty.funds || 0) + netIncome;

    // 2. Update Satisfaction & Check for Challenges
    const leader = updatedMembers.find(c => c.id === updatedParty.leaderId);
    
    updatedMembers = updatedMembers.map(m => {
        const sat = calculateMemberSatisfaction(m, updatedParty, leader, affiliationsMap);
        if (m.satisfaction === sat) return m;
        return { ...m, satisfaction: sat };
    });

    // 3. Leadership Challenge Logic
    // Only if unity is low or random chance
    if (updatedParty.unity < 40 || Math.random() < 0.05) {
        // Find potential challenger
        const potentialChallengers = updatedMembers.filter(m => 
            m.id !== updatedParty.leaderId && 
            (m.satisfaction || 100) < 40 && 
            m.influence > 30
        );

        if (potentialChallengers.length > 0) {
            potentialChallengers.sort((a, b) => b.influence - a.influence);
            const challenger = potentialChallengers[0];

            // Challenge!
            if (leader) {
                const leaderPower = leader.influence + (updatedParty.funds > 100000 ? 20 : 0); // Leader uses funds
                const challengerPower = challenger.influence + (challenger.charisma * 0.5);

                if (challengerPower > leaderPower) {
                    // Coup Success
                    updatedParty.leaderId = challenger.id;
                    updatedParty.unity = Math.max(0, updatedParty.unity - 20); // Chaos
                    
                    logs.push({
                        id: `coup-${date.getTime()}`,
                        date: date,
                        title: "Leadership Coup",
                        description: `${challenger.name} has successfully ousted ${leader.name} as leader of ${updatedParty.name}!`,
                        type: 'politics'
                    });

                    // Old leader loses influence
                    const oldLeaderIdx = updatedMembers.findIndex(c => c.id === leader.id);
                    if (oldLeaderIdx !== -1) {
                        updatedMembers[oldLeaderIdx] = {
                            ...updatedMembers[oldLeaderIdx],
                            influence: Math.max(0, updatedMembers[oldLeaderIdx].influence - 20),
                            satisfaction: 0
                        };
                    }
                } else {
                    // Coup Failed
                    updatedParty.unity = Math.max(0, updatedParty.unity - 10);
                    logs.push({
                        id: `coup-fail-${date.getTime()}`,
                        date: date,
                        title: "Failed Coup",
                        description: `${challenger.name} attempted to oust ${leader.name} but failed.`,
                        type: 'politics'
                    });

                    // Challenger might leave or be expelled
                    if (Math.random() < 0.5) {
                        // Expelled/Leaves
                        // This would be handled by the caller to actually remove them/create new party
                        // For now, just tank their satisfaction to 0 to trigger schism logic later
                         const chalIdx = updatedMembers.findIndex(c => c.id === challenger.id);
                         if (chalIdx !== -1) {
                             updatedMembers[chalIdx] = {
                                 ...updatedMembers[chalIdx],
                                 satisfaction: 0
                             };
                         }
                    }
                }
            }
        }
    }

    // 4. Spending Funds to Boost Unity
    if (updatedParty.funds > 50000 && updatedParty.unity < 60) {
        updatedParty.funds -= 20000;
        updatedParty.unity += 10;
        // logs.push(...) // Maybe too spammy
    }

    // 5. Random Scandals
    if (Math.random() < 0.005) { // 0.5% chance per month per party
        const scandalType = Math.random() < 0.5 ? 'Corruption' : 'Moral Turpitude';
        const target = updatedMembers[Math.floor(Math.random() * updatedMembers.length)];
        
        if (target) {
            const severity = 10 + Math.floor(Math.random() * 20);
            updatedParty.unity = Math.max(0, updatedParty.unity - severity);
            
            // Target loses influence
            const tIdx = updatedMembers.findIndex(c => c.id === target.id);
            if (tIdx !== -1) {
                updatedMembers[tIdx] = {
                    ...updatedMembers[tIdx],
                    influence: Math.max(0, updatedMembers[tIdx].influence - severity),
                    satisfaction: Math.max(0, (updatedMembers[tIdx].satisfaction || 50) - 20)
                };
            }

            logs.push({
                id: `scandal-${date.getTime()}-${Math.random()}`,
                date: date,
                title: "Party Scandal!",
                description: `${target.name} of ${updatedParty.name} has been implicated in a ${scandalType} scandal! Unity drops by ${severity}.`,
                type: 'politics'
            });
        }
    }

    // 6. NPC General Actions
    // Give non-player characters a chance to independently build their influence and recognition
    updatedMembers = updatedMembers.map(m => {
        if (m.isPlayer || !m.isAlive) return m; // Players do this manually, dead don't do things

        // Base 15% chance per month to do an action
        if (Math.random() < 0.15) {
            let infGain = 0;
            let recGain = 0;
            
            // Determine possible actions based on their role
            const possibleActions = ['promoteParty', 'addressLocal'];
            
            if (updatedParty.leaderId === m.id || 
                updatedParty.deputyLeaderId === m.id || 
                m.isAffiliationLeader ||
                updatedParty.stateBranches.some(b => b.leaderId === m.id)
            ) {
                possibleActions.push('strengthenLocalBranch', 'organizeStateRally');
            }
            
            const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
            
            switch(action) {
                case 'promoteParty': infGain = 5; recGain = 2; break;
                case 'addressLocal': infGain = 8; recGain = 4; break;
                case 'strengthenLocalBranch': infGain = 5; recGain = 0; break;
                case 'organizeStateRally': infGain = 10; recGain = 5; break;
            }
            
            // Add a small bit of variance
            infGain = Math.floor(infGain * (0.8 + Math.random() * 0.4));
            recGain = Math.floor(recGain * (0.8 + Math.random() * 0.4));

            return {
                ...m,
                influence: Math.min(100, m.influence + infGain),
                recognition: Math.min(100, m.recognition + recGain)
            };
        }
        return m;
    });

    return {
        updatedParty,
        updatedMembers,
        logs
    };
};
