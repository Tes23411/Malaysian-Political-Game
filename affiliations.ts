import { COLOR_PALETTE } from './constants';
import { Ethnicity, Party, Affiliation, PoliticalAlliance } from './types';

// Economic: 0 (Planned) - 100 (Market)
// Governance: 0 (Decentralized) - 100 (Centralized)

export const AFFILIATIONS: Affiliation[] = [
    // Malay Affiliations
    { id: 'malay-nat', name: 'Malay Nationalist', ethnicity: 'Malay', area: 'Rural', baseIdeology: { economic: 40, governance: 80 } },
    { id: 'malay-prog', name: 'Malay Progressive', ethnicity: 'Malay', area: 'Both', baseIdeology: { economic: 60, governance: 40 } },
    { id: 'malay-islamist', name: 'Islamist', ethnicity: 'Malay', area: 'Rural', baseIdeology: { economic: 98, governance: 88 } },
    { id: 'malay-socialist', name: 'Malay Socialist', ethnicity: 'Malay', area: 'Both', baseIdeology: { economic: 20, governance: 70 } },
    { id: 'malay-royalist', name: 'Malay Royalist', ethnicity: 'Malay', area: 'Both', baseIdeology: { economic: 50, governance: 85 } },
    { id: 'malay-civil', name: 'Malay Civil Service', ethnicity: 'Malay', area: 'Urban', baseIdeology: { economic: 50, governance: 90 } },
    { id: 'malay-biz', name: 'Malay Industrialist', ethnicity: 'Malay', area: 'Urban', baseIdeology: { economic: 85, governance: 60 } },
    { id: 'malay-edu', name: 'Malay Teachers', ethnicity: 'Malay', area: 'Urban', baseIdeology: { economic: 35, governance: 50 } },
    { id: 'malay-labour', name: 'Malay Trade Unionist', ethnicity: 'Malay', area: 'Urban', baseIdeology: { economic: 15, governance: 40 } },
    { id: 'malay-intel', name: 'Malay Intellectual', ethnicity: 'Malay', area: 'Urban', baseIdeology: { economic: 40, governance: 40 } },
    { id: 'malay-merchant', name: 'Malay Merchant Guild', ethnicity: 'Malay', area: 'Urban', baseIdeology: { economic: 80, governance: 50 } },
    { id: 'malay-professional', name: 'Malay Professionals', ethnicity: 'Malay', area: 'Urban', baseIdeology: { economic: 65, governance: 50 } },
    { id: 'malay-farmer', name: 'Malay Farmers Association', ethnicity: 'Malay', area: 'Rural', baseIdeology: { economic: 30, governance: 60 } },
    { id: 'malay-youth', name: 'Malay Youth Movement', ethnicity: 'Malay', area: 'Both', baseIdeology: { economic: 45, governance: 45 } },
    { id: 'malay-religious', name: 'Religious Scholars', ethnicity: 'Malay', area: 'Rural', baseIdeology: { economic: 98, governance: 98 } },
    { id: 'malay-veteran', name: 'Malay Veterans', ethnicity: 'Malay', area: 'Both', baseIdeology: { economic: 40, governance: 90 } },

    
    // Chinese Affiliations
    { id: 'chinese-biz', name: 'Chinese Industrialist', ethnicity: 'Chinese', area: 'Urban', baseIdeology: { economic: 95, governance: 60 } },
    { id: 'chinese-edu', name: 'Chinese Teachers', ethnicity: 'Chinese', area: 'Urban', baseIdeology: { economic: 40, governance: 40 } },
    { id: 'chinese-labour', name: 'Chinese Trade Unionist', ethnicity: 'Chinese', area: 'Urban', baseIdeology: { economic: 10, governance: 30 } },
    { id: 'chinese-intel', name: 'Chinese Intellectual', ethnicity: 'Chinese', area: 'Urban', baseIdeology: { economic: 45, governance: 35 } },
    { id: 'chinese-merchant', name: 'Chinese Merchant Guild', ethnicity: 'Chinese', area: 'Urban', baseIdeology: { economic: 90, governance: 50 } },
    { id: 'chinese-youth', name: 'Chinese Youth Wing', ethnicity: 'Chinese', area: 'Both', baseIdeology: { economic: 60, governance: 40 } },
    { id: 'chinese-professional', name: 'Chinese Professionals', ethnicity: 'Chinese', area: 'Urban', baseIdeology: { economic: 75, governance: 50 } },
    { id: 'chinese-chamber', name: 'Chinese Chamber of Commerce', ethnicity: 'Chinese', area: 'Urban', baseIdeology: { economic: 90, governance: 70 } },
    { id: 'chinese-clan', name: 'Chinese Clan Associations', ethnicity: 'Chinese', area: 'Both', baseIdeology: { economic: 70, governance: 80 } },
    { id: 'chinese-rural', name: 'Chinese Rural Community', ethnicity: 'Chinese', area: 'Rural', baseIdeology: { economic: 50, governance: 60 } },
    { id: 'chinese-progressive', name: 'Chinese Progressives', ethnicity: 'Chinese', area: 'Urban', baseIdeology: { economic: 55, governance: 30 } },
    
    // Indian Affiliations
    { id: 'indian-trad', name: 'Indian Traditionalist', ethnicity: 'Indian', area: 'Rural', baseIdeology: { economic: 40, governance: 75 } },
    { id: 'indian-reform', name: 'Indian Reformist', ethnicity: 'Indian', area: 'Both', baseIdeology: { economic: 50, governance: 35 } },
    { id: 'indian-prog', name: 'Indian Progressive', ethnicity: 'Indian', area: 'Urban', baseIdeology: { economic: 55, governance: 30 } },
    { id: 'indian-estate', name: 'Estate Workers Union', ethnicity: 'Indian', area: 'Rural', baseIdeology: { economic: 15, governance: 40 } },
    { id: 'indian-professional', name: 'Indian Professionals', ethnicity: 'Indian', area: 'Urban', baseIdeology: { economic: 65, governance: 50 } },
    { id: 'indian-merchant', name: 'Indian Merchants', ethnicity: 'Indian', area: 'Urban', baseIdeology: { economic: 85, governance: 50 } },
    { id: 'indian-youth', name: 'Indian Youth League', ethnicity: 'Indian', area: 'Both', baseIdeology: { economic: 45, governance: 40 } },
    { id: 'indian-labour', name: 'Indian Labour Movement', ethnicity: 'Indian', area: 'Urban', baseIdeology: { economic: 10, governance: 35 } },

    //--- SABAH AFFILIATIONS ---
    // Bumiputera Sabah (Muslim)
    { id: "sabah-bumiputera-muslim-village", name: "Sabah Muslim Village Council", ethnicity: "Bumiputera Sabah (Muslim)", area: "Rural", baseIdeology: { economic: 35, governance: 80 } },
    { id: "sabah-bumiputera-muslim-youth", name: "Sabah Muslim Youth Alliance", ethnicity: "Bumiputera Sabah (Muslim)", area: "Both", baseIdeology: { economic: 50, governance: 65 } },
    { id: "sabah-bumiputera-muslim-farmers", name: "Sabah Muslim Farmers Guild", ethnicity: "Bumiputera Sabah (Muslim)", area: "Rural", baseIdeology: { economic: 25, governance: 60 } },
    { id: "sabah-bumiputera-muslim-merchants", name: "Sabah Muslim Merchants League", ethnicity: "Bumiputera Sabah (Muslim)", area: "Both", baseIdeology: { economic: 70, governance: 50 } },
    { id: "sabah-bumiputera-muslim-scholars", name: "Sabah Muslim Scholars Forum", ethnicity: "Bumiputera Sabah (Muslim)", area: "Urban", baseIdeology: { economic: 45, governance: 85 } },
    { id: "sabah-bumiputera-muslim-fishermen", name: "Sabah Muslim Fishermen Union", ethnicity: "Bumiputera Sabah (Muslim)", area: "Rural", baseIdeology: { economic: 30, governance: 65 } },
    { id: "sabah-bumiputera-muslim-urban", name: "Sabah Urban Muslim Network", ethnicity: "Bumiputera Sabah (Muslim)", area: "Urban", baseIdeology: { economic: 60, governance: 45 } },
    { id: "sabah-bumiputera-muslim-professionals", name: "Sabah Muslim Professionals Front", ethnicity: "Bumiputera Sabah (Muslim)", area: "Urban", baseIdeology: { economic: 75, governance: 55 } },


    // Sabahan Malay (Maps to Malay %)
    { id: 'sabah-malay-united', name: 'United Sabahan Malays', ethnicity: 'Sabahan Malay', area: 'Rural', baseIdeology: { economic: 40, governance: 70 } },
    { id: 'sabah-malay-city', name: 'Sabah Urban Malay Front', ethnicity: 'Sabahan Malay', area: 'Urban', baseIdeology: { economic: 60, governance: 50 } },
    { id: 'sabah-malay-fishermen', name: 'Sabah Coastal Fishermen Society', ethnicity: 'Sabahan Malay', area: 'Rural', baseIdeology: { economic: 35, governance: 65 } },
    { id: 'sabah-malay-youth', name: 'Sabah Malay Youth Congress', ethnicity: 'Sabahan Malay', area: 'Urban', baseIdeology: { economic: 55, governance: 45 } },
    { id: 'sabah-malay-traders', name: 'Sabah Bumiputera Traders Alliance', ethnicity: 'Sabahan Malay', area: 'Both', baseIdeology: { economic: 50, governance: 60 } },
    { id: 'sabah-malay-religious', name: 'Sabah Islamic Welfare Council', ethnicity: 'Sabahan Malay', area: 'Both', baseIdeology: { economic: 40, governance: 80 } },
    { id: 'sabah-malay-professionals', name: 'Sabah Malay Professionals Guild', ethnicity: 'Sabahan Malay', area: 'Urban', baseIdeology: { economic: 70, governance: 55 } },
    { id: 'sabah-malay-agriculture', name: 'Sabah Farmers Cooperative', ethnicity: 'Sabahan Malay', area: 'Rural', baseIdeology: { economic: 30, governance: 60 } },
    
    // Sabahan Chinese (Maps to Chinese %)
    { id: 'sabah-chinese-guild', name: 'Sabah Merchants Guild', ethnicity: 'Sabahan Chinese', area: 'Urban', baseIdeology: { economic: 85, governance: 40 } },
    { id: 'sabah-chinese-union', name: 'Sabah Timber Union', ethnicity: 'Sabahan Chinese', area: 'Rural', baseIdeology: { economic: 30, governance: 30 } },
    { id: 'sabah-chinese-chamber', name: 'Sabah Chinese Chamber of Commerce', ethnicity: 'Sabahan Chinese', area: 'Urban', baseIdeology: { economic: 90, governance: 45 } },
    { id: 'sabah-chinese-planters', name: 'Sabah Plantation Owners Society', ethnicity: 'Sabahan Chinese', area: 'Rural', baseIdeology: { economic: 75, governance: 50 } },
    { id: 'sabah-chinese-youth', name: 'Sabah Chinese Youth Federation', ethnicity: 'Sabahan Chinese', area: 'Urban', baseIdeology: { economic: 65, governance: 35 } },
    { id: 'sabah-chinese-education', name: 'Sabah Chinese Education Society', ethnicity: 'Sabahan Chinese', area: 'Both', baseIdeology: { economic: 60, governance: 40 } },
    { id: 'sabah-chinese-fisheries', name: 'Sabah Fishing Industry Association', ethnicity: 'Sabahan Chinese', area: 'Rural', baseIdeology: { economic: 55, governance: 35 } },
    { id: 'sabah-chinese-hawkers', name: 'Sabah Hawkers and Traders Union', ethnicity: 'Sabahan Chinese', area: 'Urban', baseIdeology: { economic: 70, governance: 30 } },

    // Bumiputera Sabah (Non-Muslim)
    { id: 'kadazan-dusun-union', name: 'Kadazan-Dusun Cultural Union', ethnicity: "Bumiputera Sabah (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 45, governance: 60 } },
    { id: 'sabah-native-chiefs', name: 'Sabah Native Chiefs Council', ethnicity: "Bumiputera Sabah (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 30, governance: 80 } },
    { id: 'sabah-native-prog', name: 'Sabah Progressive Natives', ethnicity: "Bumiputera Sabah (Non-Muslim)", area: 'Urban', baseIdeology: { economic: 60, governance: 40 } },
    { id: 'sabah-bajau-assn', name: 'Sabah Bajau Community Association', ethnicity: "Bumiputera Sabah (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 35, governance: 70 } },
    { id: 'sabah-murut-society', name: 'Murut Heritage Society', ethnicity: "Bumiputera Sabah (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 30, governance: 75 } },
    { id: 'sabah-native-youth', name: 'Native Youth Empowerment Forum', ethnicity: "Bumiputera Sabah (Non-Muslim)", area: 'Urban', baseIdeology: { economic: 65, governance: 35 } },
    { id: 'sabah-native-rights', name: 'Sabah Indigenous Rights Movement', ethnicity: "Bumiputera Sabah (Non-Muslim)", area: 'Both', baseIdeology: { economic: 25, governance: 50 } },
    { id: 'sabah-native-professionals', name: 'Native Professionals Network', ethnicity: "Bumiputera Sabah (Non-Muslim)", area: 'Urban', baseIdeology: { economic: 70, governance: 45 } },
    { id: 'sabah-native-farmers', name: 'Native Farmers Collective', ethnicity: "Bumiputera Sabah (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 20, governance: 65 } },

    // --- SARAWAK AFFILIATIONS ---
    // Bumiputera Sarawak (Muslim)
    { id: "sarawak-bumiputera-muslim-village", name: "Sarawak Muslim Village Council", ethnicity: "Bumiputera Sarawak (Muslim)", area: "Rural", baseIdeology: { economic: 35, governance: 80 } },
    { id: "sarawak-bumiputera-muslim-youth", name: "Sarawak Muslim Youth Alliance", ethnicity: "Bumiputera Sarawak (Muslim)", area: "Both", baseIdeology: { economic: 50, governance: 65 } },
    { id: "sarawak-bumiputera-muslim-farmers", name: "Sarawak Muslim Farmers Guild", ethnicity: "Bumiputera Sarawak (Muslim)", area: "Rural", baseIdeology: { economic: 25, governance: 60 } },
    { id: "sarawak-bumiputera-muslim-merchants", name: "Sarawak Muslim Merchants League", ethnicity: "Bumiputera Sarawak (Muslim)", area: "Both", baseIdeology: { economic: 70, governance: 50 } },
    { id: "sarawak-bumiputera-muslim-scholars", name: "Sarawak Muslim Scholars Forum", ethnicity: "Bumiputera Sarawak (Muslim)", area: "Urban", baseIdeology: { economic: 45, governance: 85 } },
    { id: "sarawak-bumiputera-muslim-fishermen", name: "Sarawak Muslim Fishermen Union", ethnicity: "Bumiputera Sarawak (Muslim)", area: "Rural", baseIdeology: { economic: 30, governance: 65 } },
    { id: "sarawak-bumiputera-muslim-urban", name: "Sarawak Urban Muslim Network", ethnicity: "Bumiputera Sarawak (Muslim)", area: "Urban", baseIdeology: { economic: 60, governance: 45 } },
    { id: "sarawak-bumiputera-muslim-professionals", name: "Sarawak Muslim Professionals Front", ethnicity: "Bumiputera Sarawak (Muslim)", area: "Urban", baseIdeology: { economic: 75, governance: 55 } },


    // Sarawakian Malay (Maps to Malay %)
    { id: 'sarawak-malay-assn', name: 'Sarawak Malay Association', ethnicity: 'Sarawakian Malay', area: 'Both', baseIdeology: { economic: 45, governance: 75 } },
    { id: 'sarawak-malay-fishermen', name: 'Sarawak Coastal Communities Union', ethnicity: 'Sarawakian Malay', area: 'Rural', baseIdeology: { economic: 35, governance: 70 } },
    { id: 'sarawak-malay-urban', name: 'Sarawak Urban Malay League', ethnicity: 'Sarawakian Malay', area: 'Urban', baseIdeology: { economic: 55, governance: 60 } },
    { id: 'sarawak-malay-religious', name: 'Sarawak Islamic Council', ethnicity: 'Sarawakian Malay', area: 'Both', baseIdeology: { economic: 40, governance: 85 } },
    { id: 'sarawak-malay-traders', name: 'Sarawak Malay Traders Society', ethnicity: 'Sarawakian Malay', area: 'Both', baseIdeology: { economic: 50, governance: 65 } },
    { id: 'sarawak-malay-youth', name: 'Sarawak Malay Youth Movement', ethnicity: 'Sarawakian Malay', area: 'Urban', baseIdeology: { economic: 60, governance: 50 } },
    { id: 'sarawak-malay-kampung', name: 'Sarawak Village Headmen Assembly', ethnicity: 'Sarawakian Malay', area: 'Rural', baseIdeology: { economic: 30, governance: 80 } },
    { id: 'sarawak-malay-professionals', name: 'Sarawak Malay Professional Circle', ethnicity: 'Sarawakian Malay', area: 'Urban', baseIdeology: { economic: 65, governance: 55 } },
    
    // Sarawakian Chinese (Maps to Chinese %)
    { id: 'sarawak-chinese-chamber', name: 'Sarawak Chinese Chamber of Commerce', ethnicity: 'Sarawakian Chinese', area: 'Urban', baseIdeology: { economic: 90, governance: 60 } },
    { id: 'sarawak-united-peoples', name: 'Sarawak Peoples Movement', ethnicity: 'Sarawakian Chinese', area: 'Both', baseIdeology: { economic: 35, governance: 40 } },
    { id: 'sarawak-chinese-merchants', name: 'Sarawak Merchants Federation', ethnicity: 'Sarawakian Chinese', area: 'Urban', baseIdeology: { economic: 85, governance: 50 } },
    { id: 'sarawak-chinese-planters', name: 'Sarawak Agricultural Planters Guild', ethnicity: 'Sarawakian Chinese', area: 'Rural', baseIdeology: { economic: 75, governance: 45 } },
    { id: 'sarawak-chinese-education', name: 'Sarawak Chinese Education Association', ethnicity: 'Sarawakian Chinese', area: 'Both', baseIdeology: { economic: 60, governance: 55 } },
    { id: 'sarawak-chinese-youth', name: 'Sarawak Chinese Youth Council', ethnicity: 'Sarawakian Chinese', area: 'Urban', baseIdeology: { economic: 70, governance: 40 } },
    { id: 'sarawak-chinese-business', name: 'Sarawak Small Business Alliance', ethnicity: 'Sarawakian Chinese', area: 'Both', baseIdeology: { economic: 80, governance: 35 } },
    { id: 'sarawak-chinese-professionals', name: 'Sarawak Chinese Professionals Network', ethnicity: 'Sarawakian Chinese', area: 'Urban', baseIdeology: { economic: 75, governance: 45 } },
    { id: 'sarawak-chinese-clan', name: 'Sarawak Chinese Clan Associations', ethnicity: 'Sarawakian Chinese', area: 'Both', baseIdeology: { economic: 65, governance: 65 } },

    // Bumiputera Sarawak (Non-Muslim)
    { id: 'dayak-national', name: 'Dayak National Congress', ethnicity: "Bumiputera Sarawak (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 40, governance: 50 } },
    { id: 'iban-leaders', name: 'Iban Community Leaders Council', ethnicity: "Bumiputera Sarawak (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 30, governance: 70 } },
    { id: 'orang-ulu-alliance', name: 'Orang Ulu Heritage Alliance', ethnicity: "Bumiputera Sarawak (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 35, governance: 65 } },
    { id: 'sarawak-native-edu', name: 'Educated Native Forum', ethnicity: "Bumiputera Sarawak (Non-Muslim)", area: 'Urban', baseIdeology: { economic: 65, governance: 45 } },
    { id: 'sarawak-bidayuh-union', name: 'Bidayuh Cultural Union', ethnicity: "Bumiputera Sarawak (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 35, governance: 75 } },
    { id: 'sarawak-native-youth', name: 'Sarawak Native Youth Assembly', ethnicity: "Bumiputera Sarawak (Non-Muslim)", area: 'Urban', baseIdeology: { economic: 60, governance: 40 } },
    { id: 'sarawak-longhouse', name: 'Sarawak Longhouse Communities Network', ethnicity: "Bumiputera Sarawak (Non-Muslim)", area: 'Rural', baseIdeology: { economic: 25, governance: 80 } },
    { id: 'sarawak-native-rights', name: 'Sarawak Native Land Rights Movement', ethnicity: "Bumiputera Sarawak (Non-Muslim)", area: 'Both', baseIdeology: { economic: 20, governance: 55 } },
    { id: 'sarawak-native-professionals', name: 'Native Professionals Society', ethnicity: "Bumiputera Sarawak (Non-Muslim)", area: 'Urban', baseIdeology: { economic: 70, governance: 50 } },


    // Orang Asli Affiliations
    { id: "orang-asli-batin", name: "Batin Council", ethnicity: "Orang Asli", area: "Rural", baseIdeology: { economic: 30, governance: 80 } },
    { id: "orang-asli-youth", name: "Orang Asli Youth Movement", ethnicity: "Orang Asli", area: "Both", baseIdeology: { economic: 50, governance: 45 } },
    { id: "orang-asli-land", name: "Orang Asli Land Rights Defenders", ethnicity: "Orang Asli", area: "Rural", baseIdeology: { economic: 25, governance: 65 } },
    { id: "orang-asli-edu", name: "Orang Asli Education Alliance", ethnicity: "Orang Asli", area: "Both", baseIdeology: { economic: 60, governance: 50 } },

];
// ─── Scheduled Party Formations ───────────────────────────────────────────────
// Parties that don't exist at game-start but emerge at a specific point in time.
// Affiliations listed in `affiliationIds` must NOT be assigned to any party in
// PARTIES above – they start as independent factions and coalesce on the trigger
// date.  `splinterAffiliationIds` are affiliations currently inside another party
// that will *secede* to help form this new party (simulates a real split).

export interface ScheduledPartyFormation {
    /** Unique key used to track whether this formation has already fired */
    id: string;
    /** The game date on or after which the party is spawned (checked daily) */
    formationDate: Date;
    /** Display name of the new party */
    partyName: string;
    /** CSS hex colour string */
    partyColor: string;
    /**
     * IDs of AFFILIATIONS entries that are currently *unassigned* (not in any
     * Party's affiliationIds) and will be gathered into the new party.
     */
    affiliationIds: string[];
    /**
     * IDs of AFFILIATIONS entries that currently belong to another party and
     * will secede to join the new party (handleAffiliationSecession is called
     * for each one).  Leave empty if no split is required.
     */
    splinterAffiliationIds?: string[];
    /** Ideology override; defaults to average of member affiliations if omitted */
    ideology?: { economic: number; governance: number };
    /** Optional ethnicity lock; null = multi-ethnic */
    ethnicityFocus?: Ethnicity;
    /** Starting treasury */
    funds: number;
    /** Short narrative shown as an event modal / log entry */
    announcementText: string;
}

export const SCHEDULED_PARTY_FORMATIONS: ScheduledPartyFormation[] = [

   
];

export const getAffiliationsByEthnicity = (ethnicity: Ethnicity): Affiliation[] => {
  return AFFILIATIONS.filter(a => a.ethnicity === ethnicity);
};