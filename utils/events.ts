
/**
 * @fileoverview Manages random and scheduled in-game political, economic, and social events.
 * It handles the random chance logic for an event triggering and applying its effects to the game state.
 * 
 * @dependencies
 * - `../types`: Uses `GameEvent`, `Character`, `Party`, `Demographics`, `GeoJsonFeature`, `Affiliation`.
 */
import { GameEvent, Character, Party, Demographics, GeoJsonFeature, Affiliation } from '../types';

const EVENT_CHANCE_MONTHLY = 0.05; // 5% chance of an event each month check

/**
 * Checks if a random game event should trigger on the current turn.
 * 
 * @param {Date} date - The current in-game date.
 * @param {Character[]} characters - List of all active characters in the game.
 * @param {Party[]} parties - List of all political parties.
 * @param {Map<string, Demographics>} demographicsMap - Demographics data mapped by seat unique code.
 * @param {GeoJsonFeature[]} features - GeoJSON features of all seats/regions.
 * @param {Map<string, Affiliation>} affiliationsMap - Affiliations data mapped by ID.
 * @returns {GameEvent | null} A GameEvent object if triggered, otherwise null.
 * 
 * @example
 * const event = checkForGameEvent(new Date(), characters, parties, demographics, features, affiliations);
 * if (event) triggerModal(event);
 * 
 * @logic
 * - Only checks on the 1st and 15th of the month.
 * - Flat 5% chance of any event triggering.
 * - If triggered, rolls a secondary chance to determine the event type:
 *   - Racial Tension (35%): Targets a mixed seat.
 *   - Scandal (25%): Targets a high-profile non-player character.
 *   - Economic (20%): Boom or bust.
 *   - Political (20%): Broad ideological shift.
 */
export const checkForGameEvent = (
    date: Date,
    characters: Character[],
    parties: Party[],
    demographicsMap: Map<string, Demographics>,
    features: GeoJsonFeature[],
    affiliationsMap: Map<string, Affiliation>
): GameEvent | null => {
    // Only check on the 1st of the month to avoid hogging
    if (date.getDate() !== 1) return null;
    
    // Increased event chance for more flavor!
    if (Math.random() > 0.08) return null; 

    const roll = Math.random();

    // 1. Racial/Religious Tension Event (15% chance)
    if (roll < 0.15) {
        // Find a mixed seat (Urban usually)
        const mixedSeats = features.filter(f => {
            const demo = demographicsMap.get(f.properties.UNIQUECODE);
            if (!demo) return false;
            // Mixed if no race > 65%
            return demo.malayPercent < 65 && demo.chinesePercent < 65 && demo.indiansPercent < 65;
        });

        if (mixedSeats.length > 0) {
            const targetSeat = mixedSeats[Math.floor(Math.random() * mixedSeats.length)];
            const seatName = targetSeat.properties.PARLIMEN;
            const seatCode = targetSeat.properties.UNIQUECODE;
            
            return {
                id: `evt-racial-${Date.now()}`,
                title: `Cultural Tensions in ${seatName}`,
                description: `Simmering ethnic and religious tensions have flared up in ${seatName} following a heated political rally and viral social media posts. Local communities are polarized.`,
                date: date,
                type: 'racial_tension',
                affectedSeatCodes: [seatCode],
                magnitude: 15,
                effects: [
                    "Increased influence for ethnic and conservative-based parties in this seat.",
                    "Decreased influence for multi-ethnic parties in this seat.",
                    "Temporary halt to cross-community campaigning."
                ]
            };
        }
    }

    // 2. Scandal (15% chance)
    if (roll < 0.30) {
        // Pick a random high profile character (National Leader or Minister)
        const highProfileChars = characters.filter(c => 
            (c.influence > 70 || c.isMP) && !c.isPlayer // Don't hit player randomly yet, maybe too harsh
        );
        
        if (highProfileChars.length > 0) {
            const target = highProfileChars[Math.floor(Math.random() * highProfileChars.length)];
            const party = parties.find(p => p.affiliationIds.includes(target.affiliationId));
            
            const scandals = [
                "corruption involving state funds",
                "an inappropriate relationship with a prominent business figure",
                "nepotism in awarding mega-infrastructure contracts",
                "a leaked audio recording exposing coalition backstabbing"
            ];
            
            return {
                id: `evt-scandal-${Date.now()}`,
                title: `Major Scandal: ${target.name}`,
                description: `Explosive rumors of ${scandals[Math.floor(Math.random() * scandals.length)]} involving ${target.name} have surfaced. The public and opposition are demanding immediate resignations.`,
                date: date,
                type: 'scandal',
                affectedPartyIds: party ? [party.id] : [],
                magnitude: 20,
                effects: [
                    `${target.name} loses significant influence and public recognition.`,
                    party ? `${party.name} suffers a sharp drop in unity and support.` : "Reputation irreversibly damaged."
                ]
            };
        }
    }

    // 3. Economic / Cost of Living Event (25% chance)
    if (roll < 0.55) {
        const ecoRoll = Math.random();
        if (ecoRoll > 0.6) {
            return {
                id: `evt-eco-boom-${Date.now()}`,
                title: "FDI Influx & Economic Boom",
                description: "A massive influx of Foreign Direct Investment (FDI) has supercharged the manufacturing sector. Job creation is at an all-time high, easing urban anxieties.",
                date: date,
                type: 'economic',
                magnitude: 12,
                effects: ["Increased support for the Government in industrial nodes.", "Urban unrest heavily decreases."]
            };
        } else if (ecoRoll > 0.3) {
            return {
                id: `evt-eco-bust-${Date.now()}`,
                title: "Cost of Living Crisis",
                description: "A sharp spike in global inflation and energy prices has led to a severe cost-of-living crisis. Daily necessities are increasingly unaffordable for the working class.",
                date: date,
                type: 'economic',
                magnitude: 15,
                effects: ["Major decrease in Government support across all sectors.", "Opposition and populist factions gain massive traction."]
            };
        } else {
            return {
                id: `evt-eco-agri-${Date.now()}`,
                title: "Commodity Price Shock",
                description: "A sudden drop in global palm oil and rubber prices threatens the livelihoods of rural estates and Felda settlements.",
                date: date,
                type: 'economic',
                magnitude: 10,
                effects: ["Decreased support for the Government in rural areas.", "Conservative and rural-focused factions mobilize the disillusioned."]
            };
        }
    }
    
    // 4. Political Movement / Youth Wave (25% chance)
    if (roll < 0.80) {
        const ideologies = ['Socialist', 'Islamist', 'Nationalist', 'Progressive', 'Youth-Led'];
        const surge = ideologies[Math.floor(Math.random() * ideologies.length)];
        
        let title = `${surge} Wave`;
        let description = `Grassroots movements aligned with ${surge.toLowerCase()} ideals are gaining massive traction across the country, fueled by online campaigns.`;
        if (surge === 'Youth-Led') {
            title = 'The Youth Awakening (Undi Muda)';
            description = "A massive surge in youth political engagement is disrupting traditional patronage networks. Young voters are demanding radical climate action, wage reforms, and an end to corruption.";
        }
        
        return {
            id: `evt-pol-${Date.now()}`,
            title: title,
            description: description,
            date: date,
            type: 'political',
            magnitude: 15,
            effects: [
                `Parties and factions aligned with ${surge} trends gain immediate influence.`
            ]
        };
    }
    
    // 5. Infrastructure / Crisis / Natural Disaster (20% chance)
    const disRoll = Math.random();
    if (disRoll > 0.5) {
        return {
            id: `evt-disaster-flood-${Date.now()}`,
            title: "Devastating Monsoon Floods",
            description: "Unprecedented monsoon rains have swamped the East Coast and low-lying urban centers. Relief efforts are heavily scrutinized by a critical public.",
            date: date,
            type: 'political',
            magnitude: 10,
            effects: ["If the government response is perceived as slow, incumbent support drops heavily.", "Creates a fertile ground for grassroots welfare movements."]
        };
    } else {
        return {
            id: `evt-disaster-infra-${Date.now()}`,
            title: "Catastrophic Infrastructure Failure",
            description: "A major failure in the capital's transit system during peak hours has caused metropolitan gridlock and widespread public fury over cronyism in maintenance contracts.",
            date: date,
            type: 'political',
            magnitude: 10,
            effects: ["Anti-establishment sentiment rises in urban areas.", "Reformist and technocratic factions gain influence."]
        };
    }
};

/**
 * Applies the specific stat modifications of a triggered event to the game state.
 * 
 * @param {GameEvent} event - The event that was triggered.
 * @param {Character[]} characters - The current roster of characters.
 * @param {Party[]} parties - The current political parties.
 * @param {Map<string, Affiliation>} affiliationsMap - Affiliations data.
 * @returns {{ updatedCharacters: Character[], updatedParties: Party[] }} A copy of characters and parties with adjusted influence/unity.
 * 
 * @example
 * const { updatedCharacters, updatedParties } = applyEventEffects(event, characters, parties, affiliations);
 * updateState(updatedCharacters, updatedParties);
 * 
 * @edge_cases
 * - Scandal events lack strong structural Char IDs, so they broadly penalize leaders/deputies.
 * - Unknown event types gracefully fall through without mutually breaking the state.
 */
export const applyEventEffects = (
    event: GameEvent,
    characters: Character[],
    parties: Party[],
    affiliationsMap: Map<string, Affiliation>
): { updatedCharacters: Character[], updatedParties: Party[] } => {
    let updatedCharacters = [...characters];
    let updatedParties = [...parties];
    const magnitude = event.magnitude || 10;

    switch (event.type) {
        case 'racial_tension':
            if (event.affectedSeatCodes) {
                // Boost chars in single-ethnic parties, nerf multi-ethnic in that seat
                updatedCharacters = updatedCharacters.map(c => {
                    if (event.affectedSeatCodes?.includes(c.currentSeatCode)) {
                        const party = parties.find(p => p.affiliationIds.includes(c.affiliationId));
                        if (party) {
                            if (party.ethnicityFocus && !party.ethnicityFocus.startsWith('Multi-Racial')) {
                                return { ...c, influence: Math.min(100, c.influence + magnitude) };
                            } else {
                                return { ...c, influence: Math.max(0, c.influence - magnitude) };
                            }
                        }
                    }
                    return c;
                });
            }
            break;
        
        case 'scandal':
             // Scandal logic needs specific target char ID usually, but we stored it in description basically. 
             // For now, let's apply to the party overall or just random influential members if specific ID isn't in struct.
             // Ideally GameEvent should store targetCharId.
             // We'll apply minor penalty to all high ranking members of affected party.
             if (event.affectedPartyIds) {
                 const pId = event.affectedPartyIds[0];
                 const party = parties.find(p => p.id === pId);
                 if (party) {
                     updatedCharacters = updatedCharacters.map(c => {
                         if (party.affiliationIds.includes(c.affiliationId) && (c.id === party.leaderId || c.id === party.deputyLeaderId)) {
                             return { ...c, influence: Math.max(0, c.influence - magnitude), recognition: Math.max(0, c.recognition - 5) };
                         }
                         return c;
                     });
                     // Party unity hit
                     updatedParties = updatedParties.map(p => p.id === pId ? { ...p, unity: Math.max(0, p.unity - 10) } : p);
                 }
             }
             break;

        case 'economic':
            // Simple gov/opp bonus/penalty based on desc logic
            // Not implementing detailed eco-sim, so maybe just flavor for now or broad mood swing?
            // Let's randomly shift 5% influence from Gov to Opp or vice versa
            break;

        case 'political':
             // Find keywords in title to boost specific affiliations
             const keyword = event.title.split(' ')[0]; // e.g. "Socialist"
             updatedCharacters = updatedCharacters.map(c => {
                 const aff = affiliationsMap.get(c.affiliationId);
                 if (aff && aff.name.includes(keyword)) {
                     return { ...c, influence: Math.min(100, c.influence + magnitude) };
                 }
                 return c;
             });
             break;
             
        case 'crackdown_backlash':
            // Handled custom when creating the event usually, but if generic:
            // Reduce government party unity
             if (event.affectedPartyIds) {
                 updatedParties = updatedParties.map(p => 
                    event.affectedPartyIds?.includes(p.id) ? { ...p, unity: Math.max(0, p.unity - 15) } : p
                 );
             }
            break;
    }

    return { updatedCharacters, updatedParties };
};
