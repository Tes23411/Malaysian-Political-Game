
import { Character, Ideology } from '../types';
import { generateCharacterName } from './naming';

// Mortality rates per day based on age brackets
const getMonthlyMortalityRate = (age: number): number => {
    if (age < 50) return 0.00015;  // 30 * daily rate
    if (age < 60) return 0.0003;   // ~1 in 3300 chance per month
    if (age < 70) return 0.0015;   // ~1 in 660 chance per month
    if (age < 80) return 0.045;    // ~1 in 22 chance per month
    if (age < 90) return 0.15;     // ~1 in 7 chance per month
    return 0.6;                    // ~1 in 1.6
};

export const shouldCharacterDie = (character: Character, currentDate: Date): boolean => {
    if (!character.isAlive) return false;
    
    // Calculate Age
    const age = Math.floor((currentDate.getTime() - new Date(character.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    
    const chance = getMonthlyMortalityRate(age);
    return Math.random() < chance;
};

export const createSuccessor = (deceased: Character, currentDate: Date): Character => {
    // Generate new birth date (25 to 50 years old)
    const ageInYears = 25 + Math.floor(Math.random() * 25);
    const dob = new Date(currentDate);
    dob.setFullYear(dob.getFullYear() - ageInYears);
    dob.setMonth(Math.floor(Math.random() * 12));
    dob.setDate(Math.floor(Math.random() * 28));

    // Slight ideological drift from the predecessor
    const driftEco = (Math.random() * 20) - 10;
    const driftGov = (Math.random() * 20) - 10;
    
    const newIdeology: Ideology = {
        economic: Math.max(0, Math.min(100, deceased.ideology.economic + driftEco)),
        governance: Math.max(0, Math.min(100, deceased.ideology.governance + driftGov))
    };

    return {
        id: `npc-${deceased.currentSeatCode}-${deceased.affiliationId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: generateCharacterName(deceased.ethnicity),
        affiliationId: deceased.affiliationId,
        ethnicity: deceased.ethnicity,
        state: deceased.state, // Inherits home state
        currentSeatCode: deceased.currentSeatCode, // Spawns in same seat
        // Stats are fresh, slightly randomized, generally lower than a dying veteran might have had
        charisma: 20 + Math.floor(Math.random() * 60), 
        influence: 10 + Math.floor(Math.random() * 40),
        recognition: 5 + Math.floor(Math.random() * 20),
        dateOfBirth: dob,
        isAlive: true,
        isPlayer: false,
        isMP: false, // Successor does not inherit the MP seat immediately (triggers by-election logic conceptually, or vacancy)
        isAffiliationLeader: false,
        history: [
            { 
                date: currentDate, 
                event: `Emerged as a new voice for the ${deceased.affiliationId} faction in ${deceased.currentSeatCode}, succeeding ${deceased.name}.` 
            }
        ],
        ideology: newIdeology
    };
};
