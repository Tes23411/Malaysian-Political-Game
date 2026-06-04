import { Party, Bill, ElectionResults, BillVoteTally, BillVoteBreakdown, VoteDirection, GameState, ElectionSystem } from '../types';
import { aiDecideBillVote } from './politics';

export interface BillVoteOutcome {
    passed: boolean;
    tally: BillVoteTally;
    breakdown: BillVoteBreakdown;
    updatedPassedLaws: Bill[];
    updatedElectionSystem: ElectionSystem;
    logs: { title: string; desc: string; type: 'politics' }[];
}

export function processBillVote(
    playerVote: VoteDirection,
    playerPartyId: string | undefined,
    parliamentBill: Bill,
    parties: Party[],
    electionResults: ElectionResults,
    allSeatCodesLength: number,
    currentPassedLaws: Bill[],
    currentElectionSystem: ElectionSystem
): BillVoteOutcome {
    const tally: BillVoteTally = { Aye: 0, Nay: 0, Abstain: 0 };
    const breakdown: BillVoteBreakdown = new Map();
    const seatCounts = new Map<string, number>();
    const logs: { title: string; desc: string; type: 'politics' }[] = [];
    
    parties.forEach(p => seatCounts.set(p.id, 0));
    for (const partyId of electionResults.values()) {
        seatCounts.set(partyId, (seatCounts.get(partyId) || 0) + 1);
    }

    parties.forEach(party => {
        let vote: VoteDirection;
        if (playerPartyId && party.id === playerPartyId) {
            vote = playerVote;
        } else {
            vote = aiDecideBillVote(party, parliamentBill);
        }
        
        const seats = seatCounts.get(party.id) || 0;
        tally[vote] += seats;
        breakdown.set(party.id, vote);
    });

    const totalMembers = allSeatCodesLength; 
    let passed = false;
    
    if (parliamentBill.isConstitutional) {
        passed = tally.Aye >= Math.ceil(totalMembers * 2 / 3);
    } else {
        passed = tally.Aye > tally.Nay;
    }
    
    let updatedPassedLaws = [...currentPassedLaws];
    let updatedElectionSystem = currentElectionSystem;
    if (passed) {
        updatedPassedLaws.push(parliamentBill);
        if (parliamentBill.id === 'const_prop_rep') {
            updatedElectionSystem = 'PR';
            logs.push({ title: 'Constitutional Amendment', desc: "Proportional Representation Act passed. Future elections will use PR.", type: 'politics' });
        }
    }

    return { passed, tally, breakdown, updatedPassedLaws, updatedElectionSystem, logs };
}
