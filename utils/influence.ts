
import { Character, Demographics, GeoJsonFeature, Affiliation, StrongholdMap } from '../types';

const URBAN_CONSTITUENCIES = new Set([
  "GEORGE TOWN", "KUALA LUMPUR BARAT", "KUALA LUMPUR TIMOR", "IPOH AND MENGLEMBU",
  "JOHORE BAHRU", "MALACCA CENTRAL", "SEREMBAN", "KINTA UTARA", "KINTA SELATAN",
  "PENANG ISLAND", "TELOK ANSON", "DINDINGS", "SELANGOR TENGAH", "LANGAT",
]);

const HOME_STATE_BONUS = 1.2;
const OUTSIDER_PENALTY = 0.8;
const BASELINE_APPEAL = 0.2; // Represents a character's appeal across ethnic lines (e.g., through party platform, general charisma).
const ETHNIC_ALIGNMENT_WEIGHT = 0.8; // Represents the portion of influence that is heavily dependent on shared ethnicity with voters.
const CANDIDATE_FOCUS_BONUS = 1.25;
const AFFILIATION_FOCUS_BONUS = 1.1;
const AREA_MATCH_BONUS = 1.2;
const AREA_MISMATCH_PENALTY = 0.8;
const STRONGHOLD_BONUS_PER_TERM = 0.1; // 10% per term

export const calculateEffectiveInfluence = (
  character: Character, 
  seat: GeoJsonFeature, 
  demographics: Demographics | null,
  affiliationsMap: Map<string, Affiliation>,
  strongholdMap: StrongholdMap,
  candidateId?: string | null,
  allocatedAffiliationId?: string | null,
  campaignInvestmentAmount?: number
): number => {
  // Base power combines influence and recognition to represent a character's overall potential.
  const basePower = (character.influence * 0.8) + (character.recognition * 0.2);

  if (!seat.properties.NEGERI) {
    return Math.round(basePower);
  }

  // State bonus/penalty for being a local or outsider.
  const stateModifier = character.state === seat.properties.NEGERI 
    ? HOME_STATE_BONUS 
    : OUTSIDER_PENALTY;

  const campaignModifier = 1.0 + ((campaignInvestmentAmount || 0) / 100000) * 0.20; // 20% boost per 100k MYR invested


  const affiliation = affiliationsMap.get(character.affiliationId);

  // Ethnicity modifier makes it much harder to win in a constituency where the party's/affiliation's target ethnicity is a small minority.
  // We use the Affiliation's ethnicity, not the character's, as influence comes from the political platform's support base.
  let ethnicityModifier = 1.0;
  if (demographics && affiliation) {
    if (affiliation.ethnicity === 'Multi-Racial') {
        // Multi-racial parties have a flat, moderate appeal across all demographics
        ethnicityModifier = 0.85; 
    } else {
        let supportPercent = 0;
        const eth = affiliation.ethnicity;
        if (eth === 'Malay' || eth === 'Sabahan Malay' || eth === 'Sarawakian Malay') {
            supportPercent = demographics.malayPercent;
        } else if (eth === 'Chinese' || eth === 'Sabahan Chinese' || eth === 'Sarawakian Chinese') {
            supportPercent = demographics.chinesePercent;
        } else if (eth === "Indian") {
            supportPercent = demographics.indiansPercent;
        } else if (eth === "Bumiputera Sabah (Muslim)") {
            supportPercent = demographics.bumiputeraSabahMuslimPercent || 0;
        } else if (eth === "Bumiputera Sabah (Non-Muslim)") {
            supportPercent = demographics.bumiputeraSabahNonMuslimPercent || 0;
        } else if (eth === "Bumiputera Sarawak (Muslim)") {
            supportPercent = demographics.bumiputeraSarawakMuslimPercent || 0;
        } else if (eth === "Bumiputera Sarawak (Non-Muslim)") {
            supportPercent = demographics.bumiputeraSarawakNonMuslimPercent || 0;
        } else if (eth === "Orang Asli") {
            supportPercent = demographics.orangAsliPercent || 0;
        } else if (eth === "Others" || eth === "Siamese") {
            supportPercent = demographics.othersPercent;
        }
        
        // Ensure valid number
        supportPercent = supportPercent || 0;
        
        // The modifier is a sum of a small baseline appeal and a larger, scaled appeal to the affiliation's ethnicity support.
        ethnicityModifier = BASELINE_APPEAL + (ETHNIC_ALIGNMENT_WEIGHT * (supportPercent / 100));
    }
  }

  // Area (Urban/Rural) modifier
  const seatName = seat.properties.PARLIMEN;
  const isUrban = URBAN_CONSTITUENCIES.has(seatName);
  let areaModifier = 1.0;
  if (affiliation) {
      if (affiliation.area === 'Urban' && !isUrban) {
          areaModifier = AREA_MISMATCH_PENALTY;
      } else if (affiliation.area === 'Rural' && isUrban) {
          areaModifier = AREA_MISMATCH_PENALTY;
      } else if (affiliation.area === 'Urban' && isUrban) {
          areaModifier = AREA_MATCH_BONUS;
      } else if (affiliation.area === 'Rural' && !isUrban) { // Rural in Rural
          areaModifier = AREA_MATCH_BONUS;
      }
  }

  // Bonus if the character is the designated candidate or in the focused affiliation.
  let focusBonus = 1.0;
    if (candidateId && character.id === candidateId) {
        focusBonus = CANDIDATE_FOCUS_BONUS;
    } else if (allocatedAffiliationId && character.affiliationId === allocatedAffiliationId) {
        focusBonus = AFFILIATION_FOCUS_BONUS;
    }

  // Historical and Regional Advantages
  const NORTHERN_STATES = new Set(['KELANTAN', 'TERENGGANU', 'KEDAH', 'PERLIS']);
  const SABAH_STATE = 'SABAH';
  const SARAWAK_STATE = 'SARAWAK';
  let historicalModifier = 1.0;
  
  if (affiliation) {
      if (affiliation.id === 'malay-islamist' || affiliation.id === 'malay-religious') {
          if (seat.properties.NEGERI && NORTHERN_STATES.has(seat.properties.NEGERI.toUpperCase())) {
              // If the seat is highly Malay (>60%), give a massive regional historical boost.
              if (demographics && demographics.malayPercent >= 60) {
                  historicalModifier = 6.5; // Significantly increased bump for PAS in the north
              }
          } else if (demographics && demographics.malayPercent >= 65) {
              historicalModifier = 4.0; // Toned up bump in other highly Malay areas
          }
      } else if (affiliation.id === 'chinese-progressive' || affiliation.id === 'chinese-labour' || affiliation.id === 'chinese-youth') {
          // DAP/Secular parties perform exceptionally well in high-Chinese areas, even if not strictly classified as urban
          if (demographics && demographics.chinesePercent >= 50) {
              historicalModifier = 2.2;
          } else if (demographics && demographics.chinesePercent >= 35 && isUrban) {
              historicalModifier = 1.9;
          }
      } else if (affiliation.id === 'malay-civil' || affiliation.id === 'malay-nat' || affiliation.id === 'malay-royalist' || affiliation.id === 'malay-edu') {
          // UMNO/Nationalist parties perform exceptionally well in rural high-Malay areas outside of the North's absolute stronghold
          if (!isUrban && demographics && demographics.malayPercent >= 65) {
              historicalModifier = 1.8;
          }
      } else if (affiliation.ethnicity === 'Multi-Racial') {
          // Multi-racial parties get a modest boost in mixed demographics (no single race > 60%)
          if (demographics && demographics.malayPercent <= 60 && demographics.chinesePercent <= 60) {
              historicalModifier = 1.5;
          }
      }
      
      // East Malaysia exclusivity buffers
      const isSabahSeat = seat.properties.NEGERI?.toUpperCase() === SABAH_STATE;
      const isSarawakSeat = seat.properties.NEGERI?.toUpperCase() === SARAWAK_STATE;
      
      const isSabahAffiliation = affiliation.ethnicity === "Bumiputera Sabah (Non-Muslim)" || affiliation.ethnicity === "Bumiputera Sabah (Muslim)" || affiliation.ethnicity === 'Sabahan Chinese';
      const isSarawakAffiliation = affiliation.ethnicity === "Bumiputera Sarawak (Non-Muslim)" || affiliation.ethnicity === "Bumiputera Sarawak (Muslim)" || affiliation.ethnicity === 'Sarawakian Chinese';

      if (isSabahAffiliation) {
          if (isSabahSeat) {
              historicalModifier *= 3.0; // Local parties dominate Sabah
          } else {
              historicalModifier *= 0.1; // Peninsular/Sarawak rejection
          }
      } else if (isSarawakAffiliation) {
          if (isSarawakSeat) {
              historicalModifier *= 3.0; // Local parties dominate Sarawak
          } else {
              historicalModifier *= 0.1; // Peninsular/Sabah rejection
          }
      } else {
          // Peninsular parties face resistance in East Malaysia unless partnered/established
          if (isSabahSeat || isSarawakSeat) {
              historicalModifier *= 0.6;
          }
      }
  }

  // Stronghold Bonus
  let strongholdBonus = 1.0;
  const stronghold = strongholdMap.get(seat.properties.UNIQUECODE);
  if (stronghold && stronghold.affiliationId === character.affiliationId) {
      strongholdBonus = 1.0 + (stronghold.terms * STRONGHOLD_BONUS_PER_TERM);
  }
  
  const effectiveInfluence = basePower * stateModifier * ethnicityModifier * focusBonus * areaModifier * historicalModifier * strongholdBonus * campaignModifier;
  
  return Math.round(Math.max(0, effectiveInfluence));
};