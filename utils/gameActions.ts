import { Party, PoliticalAlliance, Character, LogEntry, Bill } from '../types';

type EventType = LogEntry['type'];

export interface AllianceActionResult {
    updatedAlliances: PoliticalAlliance[];
    updatedParties: Party[];
    logs: { title: string; desc: string; type: EventType }[];
}

export function processAllianceInvite(
    partyIds: string[],
    playerPartyId: string,
    alliances: PoliticalAlliance[],
    parties: Party[]
): AllianceActionResult {
    const playerParty = parties.find(p => p.id === playerPartyId);
    let updatedAlliances = [...alliances];
    const logs: { title: string; desc: string; type: EventType }[] = [];
    
    if (!playerParty) return { updatedAlliances, updatedParties: parties, logs };
    
    const alliance = alliances.find(a => a.memberPartyIds.includes(playerParty.id));
    if (!alliance) return { updatedAlliances, updatedParties: parties, logs };

    const targetParties = parties.filter(p => partyIds.includes(p.id));
    
    const acceptedIds: string[] = [];
    const rejectedIds: string[] = [];
    
    targetParties.forEach(target => {
        const relation = playerParty.relations.get(target.id) || 50;
        let chance = relation / 100;
        if (alliance.type === 'Alliance') chance -= 0.2;
        else chance += 0.1;
        
        if (Math.random() < chance) {
            acceptedIds.push(target.id);
        } else {
            rejectedIds.push(target.id);
        }
    });

    if (acceptedIds.length > 0) {
        updatedAlliances = updatedAlliances.map(a => {
            if (a.id === alliance.id) {
                return { ...a, memberPartyIds: [...a.memberPartyIds, ...acceptedIds] };
            }
            return a;
        });
        const acceptedNames = parties.filter(p => acceptedIds.includes(p.id)).map(p => p.name).join(', ');
        logs.push({ title: 'Alliance Expanded', desc: `The following parties joined ${alliance.name}: ${acceptedNames}`, type: 'politics' });
    }

    if (rejectedIds.length > 0) {
        const rejectedNames = parties.filter(p => rejectedIds.includes(p.id)).map(p => p.name).join(', ');
        logs.push({ title: 'Alliance Rejections', desc: `The following parties rejected the invitation to join ${alliance.name}: ${rejectedNames}`, type: 'politics' });
    }

    return { updatedAlliances, updatedParties: parties, logs };
}

export function processAllianceKick(
    partyId: string,
    playerPartyId: string,
    alliances: PoliticalAlliance[],
    parties: Party[]
): AllianceActionResult {
    let updatedAlliances = [...alliances];
    let updatedParties = [...parties];
    const logs: { title: string; desc: string; type: EventType }[] = [];

    const playerParty = parties.find(p => p.id === playerPartyId);
    if (!playerParty) return { updatedAlliances, updatedParties, logs };

    const alliance = alliances.find(a => a.memberPartyIds.includes(playerParty.id));
    if (!alliance || alliance.leaderPartyId !== playerParty.id) return { updatedAlliances, updatedParties, logs };

    const targetParty = parties.find(p => p.id === partyId);
    if (!targetParty) return { updatedAlliances, updatedParties, logs };

    updatedAlliances = updatedAlliances.map(a => {
        if (a.id === alliance.id) {
            return { ...a, memberPartyIds: a.memberPartyIds.filter(id => id !== partyId) };
        }
        return a;
    });

    updatedParties = updatedParties.map(p => {
        if (p.id === playerParty.id) {
            const newRelations = new Map<string, number>(p.relations);
            newRelations.set(partyId, Math.max(0, (newRelations.get(partyId) ?? 50) - 30));
            return { ...p, relations: newRelations };
        }
        if (p.id === partyId) {
            const newRelations = new Map<string, number>(p.relations);
            newRelations.set(playerParty.id, Math.max(0, (newRelations.get(playerParty.id) ?? 50) - 30));
            return { ...p, relations: newRelations };
        }
        return p;
    });

    logs.push({ title: 'Alliance Member Kicked', desc: `${targetParty.name} was kicked from ${alliance.name} by ${playerParty.name}.`, type: 'politics' });

    return { updatedAlliances, updatedParties, logs };
}

export function processAllianceLeave(
    playerPartyId: string,
    alliances: PoliticalAlliance[],
    parties: Party[]
): AllianceActionResult {
    let updatedAlliances = [...alliances];
    const logs: { title: string; desc: string; type: EventType }[] = [];

    const playerParty = parties.find(p => p.id === playerPartyId);
    if (!playerParty) return { updatedAlliances, updatedParties: parties, logs };

    const alliance = alliances.find(a => a.memberPartyIds.includes(playerParty.id));
    if (!alliance) return { updatedAlliances, updatedParties: parties, logs };

    updatedAlliances = updatedAlliances.map(a => {
        if (a.id === alliance.id) {
            return { ...a, memberPartyIds: a.memberPartyIds.filter(id => id !== playerParty.id) };
        }
        return a;
    }).filter(a => a.memberPartyIds.length > 1);

    logs.push({ title: 'Left Alliance', desc: `${playerParty.name} has left ${alliance.name}.`, type: 'politics' });

    return { updatedAlliances, updatedParties: parties, logs };
}

export function processAllianceDissolve(
    playerPartyId: string,
    alliances: PoliticalAlliance[],
    parties: Party[]
): AllianceActionResult {
    let updatedAlliances = [...alliances];
    const logs: { title: string; desc: string; type: EventType }[] = [];

    const playerParty = parties.find(p => p.id === playerPartyId);
    if (!playerParty) return { updatedAlliances, updatedParties: parties, logs };

    const alliance = alliances.find(a => a.memberPartyIds.includes(playerParty.id));
    if (!alliance || alliance.leaderPartyId !== playerParty.id) return { updatedAlliances, updatedParties: parties, logs };

    updatedAlliances = updatedAlliances.filter(a => a.id !== alliance.id);
    logs.push({ title: 'Alliance Dissolved', desc: `${alliance.name} has been dissolved by ${playerParty.name}.`, type: 'politics' });

    return { updatedAlliances, updatedParties: parties, logs };
}
