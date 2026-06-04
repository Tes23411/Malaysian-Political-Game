import { Affiliation, Ethnicity, Ideology } from "../types";

// Names reflecting the 1950s Malayan context
const MALAY_GIVEN_NAMES_MALE = [
  "Ahmad",
  "Ismail",
  "Hassan",
  "Ali",
  "Rahman",
  "Jamal",
  "Idris",
  "Osman",
  "Yusof",
  "Mahmud",
  "Tunku",
  "Razak",
  "Hussein",
];
const MALAY_GIVEN_NAMES_FEMALE = [
  "Siti",
  "Fatima",
  "Nur",
  "Zainab",
  "Aminah",
  "Aishah",
  "Halimah",
  "Salmah",
  "Rohani",
  "Jamilah",
  "Azizah",
];

const CHINESE_SURNAMES = [
  "Tan",
  "Lee",
  "Wong",
  "Lim",
  "Chan",
  "Ng",
  "Goh",
  "Ong",
  "Teo",
  "Yap",
  "Lau",
  "Wee",
  "Chong",
  "Low",
];
const CHINESE_GIVEN_NAMES = [
  "Wei",
  "Mei",
  "Chen",
  "Li",
  "Jian",
  "Ling",
  "Hui",
  "Jin",
  "Ming",
  "Xiao",
  "Ah",
  "Kim",
  "Seng",
  "Hock",
  "Keong",
];

const SIAMESE_SURNAMES = [
  "Suwan",
  "Boon",
  "Thong",
  "Chai",
  "Sri",
  "Som",
  "Chan",
  "Wang",
  "Porn",
  "Saeng",
  "Niran",
  "Pong",
  "Klang",
  "Prasan",
  "Phong",
  "Suk",
  "Mongkol",
  "Sawat",
  "Anan",
  "Panya",
  "Wichai",
  "Nara",
  "Decha",
];

const INDIGENOUS_SURNAMES = [
  // Sabah
  "Tudan",
  "Mojilip",
  "Damit",
  "Lasimbang",
  "Siambun",
  "Ginibun",
  "Gimbad",
  "Gantuong",
  "Mandimin",
  "Sumping",
  // Sarawak (Iban often use "anak" + father's name)
  "Jugah",
  "Jinggut",
  "Riboh",
  "Munan",
  "Masing",
  "Baki",
  "Numpang",
];

const ORANG_ASLI_GIVEN_NAMES_MALE = [
  "Bah",
  "Along",
  "Angah",
  "Uda",
  "Achu",
  "Andak",
  "Teh",
  "Anjang",
  "Yok",
  "Busu",
  "Hitam",
  "Ali",
  "Hassan",
];
const ORANG_ASLI_GIVEN_NAMES_FEMALE = [
  "Wa",
  "Alang",
  "Anduh",
  "Minah",
  "Siti",
  "Bunga",
  "Melati",
  "Kuntum",
  "Puteh",
];
const INDIGENOUS_GIVEN_NAMES = [
  "Jovita",
  "Janelle",
  "Julius",
  "Jeffrey",
  "Dayang",
  "Awang",
  "Empiang",
  "Chambai",
  "Remy",
  "Nicholas",
  "Jennifer",
  "Jabu",
  "Salang",
  "Rentap",
];

const INDIAN_GIVEN_NAMES_MALE = [
  "Ravi",
  "Kumar",
  "Suresh",
  "Rajesh",
  "Mani",
  "Arjun",
  "Ganesh",
  "Muthu",
  "Raju",
  "Sambanthan",
  "Manickam",
];
const INDIAN_GIVEN_NAMES_FEMALE = [
  "Priya",
  "Anjali",
  "Deepa",
  "Lakshmi",
  "Sita",
  "Parvathi",
  "Geetha",
  "Kamala",
  "Devi",
];
const INDIAN_PATRONYMS = [
  "Krishnan",
  "Singh",
  "Pillai",
  "Rao",
  "Naidu",
  "Murthy",
  "Subramaniam",
  "Ramasamy",
  "Menon",
];

const randomElement = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

// 1. Replace the existing INDIGENOUS_SURNAMES array with these two:
const SABAH_NATIVE_SURNAMES = [
  "Tudan",
  "Mojilip",
  "Damit",
  "Lasimbang",
  "Siambun",
  "Ginibun",
  "Gimbad",
  "Gantuong",
  "Mandimin",
  "Sumping",
  "Kitingan",
];
const SARAWAK_NATIVE_SURNAMES = [
  "Jugah",
  "Jinggut",
  "Riboh",
  "Munan",
  "Masing",
  "Baki",
  "Numpang",
  "Taib",
  "Adenan",
  "Jabu",
];

// 2. Update the generateCharacterName function switch statement:

export const generateCharacterName = (ethnicity: Ethnicity): string => {
  const isMale = Math.random() > 0.5;

  switch (ethnicity) {
    case "Malay":
    case "Bumiputera Sabah (Muslim)":
    case "Bumiputera Sarawak (Muslim)":
    case "Sabahan Malay":
    case "Sarawakian Malay":
    {
      // ... existing Malay logic ...
      if (isMale) {
        const givenName = randomElement(MALAY_GIVEN_NAMES_MALE);
        const fatherName = randomElement(
          MALAY_GIVEN_NAMES_MALE.filter((n) => n !== givenName),
        );
        return `${givenName} bin ${fatherName}`;
      } else {
        const givenName = randomElement(MALAY_GIVEN_NAMES_FEMALE);
        const fatherName = randomElement(MALAY_GIVEN_NAMES_MALE);
        return `${givenName} binti ${fatherName}`;
      }
    }

    // Add new Native cases
    case "Bumiputera Sabah (Non-Muslim)": {
      const surname = randomElement(SABAH_NATIVE_SURNAMES);
      const givenName = randomElement(INDIGENOUS_GIVEN_NAMES);
      return `${surname} ${givenName}`;
    }
    case "Bumiputera Sarawak (Non-Muslim)": {
      const surname = randomElement(SARAWAK_NATIVE_SURNAMES);
      const givenName = randomElement(INDIGENOUS_GIVEN_NAMES);
      return `${surname} ${givenName}`;
    }

    case "Orang Asli": {
      if (isMale) {
        const givenName = randomElement(ORANG_ASLI_GIVEN_NAMES_MALE);
        const fatherName = randomElement(
          ORANG_ASLI_GIVEN_NAMES_MALE.filter((n) => n !== givenName),
        );
        return `${givenName} a/l ${fatherName}`;
      } else {
        const givenName = randomElement(ORANG_ASLI_GIVEN_NAMES_FEMALE);
        const fatherName = randomElement(ORANG_ASLI_GIVEN_NAMES_MALE);
        return `${givenName} a/p ${fatherName}`;
      }
    }

    case "Others": {
      // Generic Others
      return "John Doe";
    }

    case "Chinese":
    case "Sabahan Chinese": // Add this
    case "Sarawakian Chinese": { // Add this
      // ... existing Chinese logic ...
      const surname = randomElement(CHINESE_SURNAMES);
      // ... rest of Chinese name logic
      const givenNamePart1 = randomElement(CHINESE_GIVEN_NAMES);
      if (Math.random() > 0.7) {
        return `${surname} ${givenNamePart1}`;
      }
      const givenNamePart2 = randomElement(
        CHINESE_GIVEN_NAMES.filter((n) => n !== givenNamePart1),
      );
      return `${surname} ${givenNamePart1} ${givenNamePart2}`;
    }

    // ... keep Indian case as is ...
    case "Indian": {
      // ...
      if (isMale) {
        const givenName = randomElement(INDIAN_GIVEN_NAMES_MALE);
        const fatherName = randomElement(INDIAN_PATRONYMS);
        return `${givenName} a/l ${fatherName}`;
      } else {
        const givenName = randomElement(INDIAN_GIVEN_NAMES_FEMALE);
        const fatherName = randomElement(INDIAN_PATRONYMS);
        return `${givenName} a/p ${fatherName}`;
      }
    }
    case "Multi-Racial":
    case "Multi-Racial (Sabah)":
    case "Multi-Racial (Sarawak)": {
      const rand = Math.random();
      if (rand < 0.4) {
        return generateCharacterName("Malay");
      } else if (rand < 0.7) {
        return generateCharacterName("Chinese");
      } else if (rand < 0.9) {
        return generateCharacterName("Indian");
      } else {
        return "John Doe"; // Generic Other
      }
    }
    default:
      return "John Doe";
  }
};

// --- Malayan 1950s Political Party Name Generation ---
// Reflects the communal politics, decolonisation atmosphere, and
// Emergency-era ideological landscape of 1948–1957 Malaya.

// Communal streams — parties in this era were almost always ethnically coded
export type CommunalStream = "malay" | "chinese" | "indian" | "multiracial";

// Ideological tendencies as they actually existed in 1950s Malaya
export type Ideology1950s =
  | "nationalist" // communal/ethnic nationalism (UMNO model)
  | "islamist" // PAS/PMIP/Hizbul Muslimin model
  | "leftist" // anti-colonial left (PKMM, API, Labour Party)
  | "conservative" // pro-Ruler, pro-British loyalist
  | "labour"; // trade union / plantation worker organising

type LangRegister = "malay" | "english";
type OrgType = "party" | "association" | "alliance";

interface NameParts {
  pre: string[];
  core: string[];
  suf: string[];
}
type LangData = Record<LangRegister, Record<OrgType, NameParts>>;
type IdeologyData = Record<Ideology1950s, LangData>;
type StreamData = Record<CommunalStream, IdeologyData>;

const NAMING_DATA: StreamData = {
  malay: {
    nationalist: {
      malay: {
        party: {
          pre: ["Pertubuhan", "Persatuan", "Parti", "Kesatuan"],
          core: [
            "Kebangsaan Melayu",
            "Melayu",
            "Bumiputera Malaya",
            "Melayu Se-Malaya",
            "Melayu Bersatu",
          ],
          suf: ["", "Bersatu", "Se-Malaya"],
        },
        association: {
          pre: ["Persatuan", "Pertubuhan", "Majlis", "Gabungan"],
          core: ["Melayu", "Kebangsaan Melayu", "Bumiputera"],
          suf: ["", "Tanah Melayu", "Se-Malaya"],
        },
        alliance: {
          pre: ["Perikatan", "Gabungan", "Barisan"],
          core: ["Melayu", "Kebangsaan", "Bumiputera"],
          suf: ["Bersatu", "Malaya", "Tanah Melayu"],
        },
      },
      english: {
        party: {
          pre: ["Malay", "United Malay", "All-Malaya Malay"],
          core: ["National", "Nationalist", "Union"],
          suf: ["Organisation", "Party", "Congress"],
        },
        association: {
          pre: ["Malay", "Bumiputera"],
          core: ["Association", "Union", "Council"],
          suf: ["of Malaya", ""],
        },
        alliance: {
          pre: ["Malay", "National"],
          core: ["Alliance", "Coalition", "Front"],
          suf: ["of Malaya", ""],
        },
      },
    },
    islamist: {
      malay: {
        party: {
          pre: ["Parti", "Harakah", "Persatuan"],
          core: ["Islam", "Muslimin", "Islam Se-Malaya", "Hizbul Muslimin"],
          suf: ["", "Malaya", "Tanah Melayu"],
        },
        association: {
          pre: ["Persatuan", "Pertubuhan", "Majlis"],
          core: ["Ulama", "Islam", "Muslimin", "Agama Islam"],
          suf: ["", "Malaya"],
        },
        alliance: {
          pre: ["Perikatan", "Gabungan"],
          core: ["Islam", "Muslimin"],
          suf: ["Se-Malaya", "Malaya"],
        },
      },
      english: {
        party: {
          pre: ["Pan-Malayan", "Malayan", "Islamic"],
          core: ["Islamic", "Muslim", "Religious"],
          suf: ["Party", "Congress", "Union"],
        },
        association: {
          pre: ["Council of", "Association of", "Islamic"],
          core: ["Muslim", "Ulama", "Religious"],
          suf: ["Affairs", "of Malaya", ""],
        },
        alliance: {
          pre: ["Islamic", "Muslim", "Religious"],
          core: ["Alliance", "Front", "Coalition"],
          suf: ["of Malaya", ""],
        },
      },
    },
    leftist: {
      malay: {
        party: {
          pre: ["Parti", "Angkatan", "Kesatuan"],
          core: ["Rakyat", "Merdeka", "Kebangsaan Rakyat", "Sosialis", "Buruh"],
          suf: ["Malaya", "", "Se-Malaya"],
        },
        association: {
          pre: ["Persatuan", "Angkatan", "Kesatuan"],
          core: ["Buruh", "Rakyat", "Petani", "Pemuda"],
          suf: ["Malaya", "", "Se-Malaya"],
        },
        alliance: {
          pre: ["Gagasan", "Barisan", "Front"],
          core: ["Rakyat", "Merdeka", "Antikolonial"],
          suf: ["Malaya", ""],
        },
      },
      english: {
        party: {
          pre: ["Malayan", "Pan-Malayan", "People's"],
          core: ["Socialist", "Labour", "Nationalist", "Independence"],
          suf: ["Party", "Front", "Union"],
        },
        association: {
          pre: ["Malayan", "People's", "Workers'"],
          core: ["Labour", "Trade", "Peasants'"],
          suf: ["Union", "Association", "Congress"],
        },
        alliance: {
          pre: ["People's", "United", "Anti-Colonial"],
          core: ["Democratic", "Freedom", "Independence"],
          suf: ["Front", "Coalition", "Alliance"],
        },
      },
    },
    conservative: {
      malay: {
        party: {
          pre: ["Parti", "Persatuan", "Pertubuhan"],
          core: ["Setia", "Raja-Raja", "Warisan Melayu", "Adat Istiadat"],
          suf: ["", "Malaya"],
        },
        association: {
          pre: ["Persatuan", "Pertubuhan"],
          core: ["Setia", "Warisan", "Adat"],
          suf: ["Melayu", "Malaya", ""],
        },
        alliance: {
          pre: ["Perikatan", "Barisan"],
          core: ["Setia", "Warisan", "Tradisi"],
          suf: ["Malaya", ""],
        },
      },
      english: {
        party: {
          pre: ["Malay", "Loyalist", "Traditional"],
          core: ["Conservative", "Monarchist", "Traditionalist"],
          suf: ["Party", "Association", "Movement"],
        },
        association: {
          pre: ["Loyalist", "Traditional", "Malay"],
          core: ["Heritage", "Royalist", "Customary"],
          suf: ["Association", "Union", "Council"],
        },
        alliance: {
          pre: ["Conservative", "Traditional"],
          core: ["Front", "Alliance"],
          suf: ["of Malaya", ""],
        },
      },
    },
    labour: {
      malay: {
        party: {
          pre: ["Kesatuan", "Persatuan", "Gabungan"],
          core: ["Buruh", "Pekerja", "Tani", "Buruh Melayu"],
          suf: ["Malaya", "", "Se-Malaya"],
        },
        association: {
          pre: ["Kesatuan", "Persatuan"],
          core: ["Sekerja", "Buruh", "Pekerja"],
          suf: ["Malaya", "Se-Malaya", ""],
        },
        alliance: {
          pre: ["Gabungan", "Kesatuan"],
          core: ["Buruh", "Pekerja"],
          suf: ["Malaya", "Se-Malaya"],
        },
      },
      english: {
        party: {
          pre: ["Malayan", "Workers'", "Trade"],
          core: ["Labour", "Workers", "Plantation"],
          suf: ["Party", "Union", "Congress"],
        },
        association: {
          pre: ["General", "Malayan", "United"],
          core: ["Labour", "Workers'", "Trade"],
          suf: ["Union", "Congress", "Federation"],
        },
        alliance: {
          pre: ["Labour", "Workers'"],
          core: ["Front", "Alliance", "Coalition"],
          suf: ["of Malaya", ""],
        },
      },
    },
  },
  chinese: {
    nationalist: {
      malay: {
        party: {
          pre: ["Persatuan", "Parti"],
          core: ["Cina Malaya", "Cina Bersatu"],
          suf: ["", "Se-Malaya"],
        },
        association: {
          pre: ["Persatuan", "Dewan"],
          core: ["Perniagaan Cina", "Cina"],
          suf: ["", "Malaya"],
        },
        alliance: {
          pre: ["Perikatan", "Gabungan"],
          core: ["Cina"],
          suf: ["Malaya", "Bersatu"],
        },
      },
      english: {
        party: {
          pre: ["Malayan", "United"],
          core: ["Chinese", "Chinese National"],
          suf: ["Association", "Party"],
        },
        association: {
          pre: ["Chinese"],
          core: ["Chamber of Commerce", "Association"],
          suf: ["of Malaya", ""],
        },
        alliance: {
          pre: ["Chinese", "United"],
          core: ["Alliance", "Front"],
          suf: ["of Malaya", ""],
        },
      },
    },
    islamist: {
      malay: {
        party: { pre: [], core: ["Cina Muslim"], suf: [] },
        association: { pre: [], core: ["Dewan Cina Muslim"], suf: [] },
        alliance: { pre: [], core: ["Perikatan Cina Muslim"], suf: [] },
      },
      english: {
        party: { pre: [], core: ["Chinese Muslim"], suf: ["Association"] },
        association: { pre: [], core: ["Chinese Muslim Council"], suf: [] },
        alliance: { pre: [], core: ["Chinese Muslim Alliance"], suf: [] },
      },
    },
    leftist: {
      malay: {
        party: {
          pre: ["Parti", "Barisan"],
          core: ["Sosialis Cina", "Komunis", "Rakyat Cina"],
          suf: ["Malaya", ""],
        },
        association: {
          pre: ["Kesatuan", "Persatuan"],
          core: ["Pemuda Cina", "Pekerja Cina"],
          suf: ["Malaya", ""],
        },
        alliance: {
          pre: ["Barisan", "Rakyat"],
          core: ["Sosialis Cina"],
          suf: ["Malaya", ""],
        },
      },
      english: {
        party: {
          pre: ["Malayan", "Chinese"],
          core: ["Communist", "Socialist", "Democratic"],
          suf: ["Party", "Front"],
        },
        association: {
          pre: ["Chinese"],
          core: ["Trade Union", "Youth League"],
          suf: ["of Malaya", ""],
        },
        alliance: {
          pre: ["Chinese"],
          core: ["Socialist Front", "Anti-Colonial Front"],
          suf: [""],
        },
      },
    },
    conservative: {
      malay: {
        party: {
          pre: ["Persatuan"],
          core: ["Cina Peranakan", "Cina Selat", "Setia Bersatu"],
          suf: [""],
        },
        association: {
          pre: ["Persatuan"],
          core: ["Cina Selat", "Negeri-Negeri Selat"],
          suf: [""],
        },
        alliance: { pre: ["Gagasan"], core: ["Cina Setia"], suf: [""] },
      },
      english: {
        party: {
          pre: ["Straits", "Loyalist"],
          core: ["Chinese British", "Chinese"],
          suf: ["Association", "Party"],
        },
        association: {
          pre: ["Straits Chinese"],
          core: ["British Association", "Council"],
          suf: [""],
        },
        alliance: { pre: ["Straits Chinese"], core: ["Alliance"], suf: [""] },
      },
    },
    labour: {
      malay: {
        party: {
          pre: ["Kesatuan", "Parti"],
          core: ["Lombong Cina", "Buruh Cina"],
          suf: ["Malaya"],
        },
        association: {
          pre: ["Kesatuan", "Persatuan"],
          core: ["Pekerja Berbahasa Cina", "Pelombong"],
          suf: ["Malaya"],
        },
        alliance: { pre: ["Gabungan"], core: ["Buruh Cina"], suf: ["Malaya"] },
      },
      english: {
        party: {
          pre: ["Chinese"],
          core: ["Miners Union", "Labour"],
          suf: ["Party", "Congress"],
        },
        association: {
          pre: ["Chinese"],
          core: ["Workers Union", "Miners Association"],
          suf: ["of Malaya", ""],
        },
        alliance: { pre: ["Chinese"], core: ["Labour Front"], suf: [""] },
      },
    },
  },
  indian: {
    nationalist: {
      malay: {
        party: {
          pre: ["Kongres", "Parti"],
          core: ["India Malaya", "India Tanah Melayu"],
          suf: ["", "Bersatu"],
        },
        association: {
          pre: ["Persatuan", "Majlis"],
          core: ["India", "India Muslim"],
          suf: ["Malaya"],
        },
        alliance: {
          pre: ["Perikatan", "Kongres"],
          core: ["India"],
          suf: ["Malaya"],
        },
      },
      english: {
        party: {
          pre: ["Malayan", "All-Malayan"],
          core: ["Indian"],
          suf: ["Congress", "Association"],
        },
        association: {
          pre: ["Malayan Indian"],
          core: ["Association", "Council"],
          suf: [""],
        },
        alliance: {
          pre: ["Indian"],
          core: ["Alliance", "Front"],
          suf: ["of Malaya"],
        },
      },
    },
    islamist: {
      malay: {
        party: {
          pre: ["Parti", "Persatuan"],
          core: ["India Muslim"],
          suf: ["Malaya"],
        },
        association: {
          pre: ["Dewan", "Persatuan"],
          core: ["Perniagaan India Muslim", "India Muslim"],
          suf: ["Malaya"],
        },
        alliance: {
          pre: ["Gabungan"],
          core: ["India Muslim"],
          suf: ["Malaya"],
        },
      },
      english: {
        party: {
          pre: ["Malayan", "Indian"],
          core: ["Muslim"],
          suf: ["Congress", "Party"],
        },
        association: {
          pre: ["Indian Muslim"],
          core: ["Association", "Chamber of Commerce"],
          suf: ["of Malaya"],
        },
        alliance: { pre: ["Indian Muslim"], core: ["Alliance"], suf: [""] },
      },
    },
    leftist: {
      malay: {
        party: {
          pre: ["Parti", "Barisan"],
          core: ["Sosialis India", "Rakyat India"],
          suf: ["Malaya", ""],
        },
        association: {
          pre: ["Kesatuan"],
          core: ["Buruh Ladang India", "Pekerja India"],
          suf: ["Malaya", ""],
        },
        alliance: {
          pre: ["Barisan"],
          core: ["Sosialis India"],
          suf: ["Malaya", ""],
        },
      },
      english: {
        party: {
          pre: ["Malayan", "Indian"],
          core: ["Socialist", "Democratic"],
          suf: ["Party", "Front"],
        },
        association: {
          pre: ["Indian"],
          core: ["Workers Union", "Youth League"],
          suf: ["of Malaya", ""],
        },
        alliance: {
          pre: ["Indian"],
          core: ["Socialist Front", "Anti-Colonial Front"],
          suf: [""],
        },
      },
    },
    conservative: {
      malay: {
        party: {
          pre: ["Persatuan"],
          core: ["India Selat", "Setia Bersatu"],
          suf: [""],
        },
        association: {
          pre: ["Persatuan"],
          core: ["India Selat", "Saudagar India"],
          suf: [""],
        },
        alliance: { pre: ["Gagasan"], core: ["India Setia"], suf: [""] },
      },
      english: {
        party: {
          pre: ["Straits", "Loyalist"],
          core: ["Indian British", "Indian"],
          suf: ["Association", "Party"],
        },
        association: {
          pre: ["Straits Indian"],
          core: ["British Association", "Merchants Council"],
          suf: [""],
        },
        alliance: { pre: ["Straits Indian"], core: ["Alliance"], suf: [""] },
      },
    },
    labour: {
      malay: {
        party: {
          pre: ["Kesatuan", "Parti"],
          core: ["Pekerja Ladang", "Buruh India"],
          suf: ["Malaya"],
        },
        association: {
          pre: ["Kesatuan", "Persatuan"],
          core: ["Pekerja Ladang", "Buruh Estet"],
          suf: ["Malaya"],
        },
        alliance: {
          pre: ["Gabungan"],
          core: ["Buruh India", "Pekerja Ladang"],
          suf: ["Malaya"],
        },
      },
      english: {
        party: {
          pre: ["National", "Indian"],
          core: ["Union of Plantation Workers", "Estate Labour"],
          suf: ["Party", "Congress"],
        },
        association: {
          pre: ["National"],
          core: ["Plantation Workers Union", "Estate Workers Association"],
          suf: ["of Malaya", ""],
        },
        alliance: {
          pre: ["Indian"],
          core: ["Labour Front", "Estate Workers Alliance"],
          suf: [""],
        },
      },
    },
  },
  multiracial: {
    nationalist: {
      malay: {
        party: {
          pre: ["Parti"],
          core: ["Kemerdekaan Malaya", "Negara", "Rakyat Malaya"],
          suf: [""],
        },
        association: {
          pre: ["Persatuan", "Majlis"],
          core: ["Kebangsaan", "Kemerdekaan"],
          suf: ["Malaya"],
        },
        alliance: {
          pre: ["Perikatan", "Gagasan"],
          core: ["Nasional"],
          suf: ["Malaya"],
        },
      },
      english: {
        party: {
          pre: ["Independence of Malaya", "National", "People's"],
          core: ["Party", "Action Party"],
          suf: [""],
        },
        association: {
          pre: ["Malayan", "National"],
          core: ["Civic Association", "Union"],
          suf: [""],
        },
        alliance: {
          pre: ["Malayan", "National"],
          core: ["Alliance", "Coalition"],
          suf: [""],
        },
      },
    },
    islamist: {
      malay: {
        party: {
          pre: ["Parti", "Majlis"],
          core: ["Syura Muslimin", "Pas", "Islam Se-Malaya"],
          suf: ["Malaya", ""],
        },
        association: {
          pre: ["Majlis", "Dewan"],
          core: ["Ulama", "Agama Islam"],
          suf: ["Malaya"],
        },
        alliance: {
          pre: ["Angkatan"],
          core: ["Muslimin"],
          suf: ["Malaya", ""],
        },
      },
      english: {
        party: {
          pre: ["Pan-Malayan", "Islamic"],
          core: ["Islamic", "Muslim"],
          suf: ["Party", "Council"],
        },
        association: {
          pre: ["Islamic", "Malayan Muslim"],
          core: ["Council", "Association"],
          suf: [""],
        },
        alliance: {
          pre: ["Islamic"],
          core: ["Alliance", "Front"],
          suf: ["of Malaya"],
        },
      },
    },
    leftist: {
      malay: {
        party: {
          pre: ["Parti", "Barisan"],
          core: ["Buruh Malaya", "Rakyat", "Sosialis"],
          suf: ["Malaya", ""],
        },
        association: {
          pre: ["Kesatuan"],
          core: ["Sekerja", "Buruh"],
          suf: ["Malaya", "Se-Malaya"],
        },
        alliance: { pre: ["Barisan"], core: ["Sosialis"], suf: ["Malaya", ""] },
      },
      english: {
        party: {
          pre: ["Labour", "People's", "Socialist"],
          core: ["Party", "Front", "Action Party"],
          suf: ["of Malaya", ""],
        },
        association: {
          pre: ["Malayan", "Trade Union"],
          core: ["Congress", "Council"],
          suf: [""],
        },
        alliance: {
          pre: ["Socialist", "People's"],
          core: ["Front", "Alliance"],
          suf: ["of Malaya", ""],
        },
      },
    },
    conservative: {
      malay: {
        party: {
          pre: ["Parti"],
          core: ["Perikatan", "Progresif Perlembagaan"],
          suf: ["Malaya", ""],
        },
        association: {
          pre: ["Persatuan", "Majlis"],
          core: ["Perbandaran", "Sivil"],
          suf: ["Malaya", ""],
        },
        alliance: {
          pre: ["Perikatan", "Barisan"],
          core: ["Nasional"],
          suf: ["Malaya", ""],
        },
      },
      english: {
        party: {
          pre: ["Alliance", "Progressive"],
          core: ["Party", "National Party"],
          suf: ["of Malaya", ""],
        },
        association: {
          pre: ["Malayan", "Civic"],
          core: ["Association", "Council"],
          suf: [""],
        },
        alliance: {
          pre: ["National", "Alliance"],
          core: ["Coalition", "Front"],
          suf: [""],
        },
      },
    },
    labour: {
      malay: {
        party: {
          pre: ["Parti", "Barisan"],
          core: ["Buruh", "Kesatuan Sekerja"],
          suf: ["Malaya", ""],
        },
        association: {
          pre: ["Kongres", "Kesatuan"],
          core: ["Sekerja Malaya", "Buruh"],
          suf: [""],
        },
        alliance: { pre: ["Barisan"], core: ["Buruh"], suf: ["Malaya", ""] },
      },
      english: {
        party: {
          pre: ["Malayan", "Labour"],
          core: ["Labour", "Workers'"],
          suf: ["Party", "Congress"],
        },
        association: {
          pre: ["Malayan"],
          core: ["Trade Union Congress", "Workers' Union"],
          suf: [""],
        },
        alliance: {
          pre: ["Labour", "Workers"],
          core: ["Front", "Alliance"],
          suf: [""],
        },
      },
    },
  },
};

const HISTORICAL_CONTEXT: Record<string, string> = {
  "malay-nationalist":
    "Modelled on UMNO (est. 1946) — the dominant Malay nationalist vehicle for decolonisation.",
  "malay-islamist":
    "Reflects Pan-Malayan Islamic Party (PMIP/PAS, est. 1951) and earlier Hizbul Muslimin (1948).",
  "malay-leftist":
    "Echoes PKMM (1945) and Angkatan Pemuda Insaf — the radical anti-colonial Malay left.",
  "malay-conservative":
    "Pro-Ruler, pro-British loyalists; resistance to mass politics and universal suffrage.",
  "malay-labour":
    "Smallholder and rubber tapper organising; distinct from Chinese-dominated urban labour.",
  "chinese-nationalist":
    "Pattern of MCA (est. 1949) — communal Chinese representation within the Alliance formula.",
  "chinese-leftist":
    "Post-Emergency clandestine and open leftist formations; many banned or suppressed.",
  "chinese-conservative":
    "Straits Chinese and Peranakan loyalist associations; pro-Crown, moderate.",
  "chinese-labour":
    "Tin mining and urban labour unions; several with pre-Emergency Communist links.",
  "indian-nationalist":
    "Modelled on MIC (est. 1946) — the Alliance's third communal pillar.",
  "indian-labour":
    "Estate Tamil plantation workers; some of the most organised labour in Malaya.",
  "indian-leftist": "INA veteran networks and anti-colonial Indian socialists.",
  "multiracial-nationalist":
    "Pan-Malayan independence framing — non-communal nationalists like IMP (1951).",
  "multiracial-leftist":
    "Labour Party of Malaya (est. 1952) and Parti Rakyat Malaya — the socialist opposition.",
  "multiracial-conservative":
    "Pro-Federation loyalists and moderate multiracial civic associations.",
  "multiracial-labour":
    "Pan-Malayan Labour Party and MTUC orbit; cross-racial union federation.",
  "multiracial-islamist":
    "Pan-Malayan Islamic federations seeking cross-ethnic Muslim solidarity.",
};

export interface PartyNameResult {
  name: string;
  abbreviation: string;
  historicalNote: string;
}

export const generateDetailedPartyName = (
  stream: CommunalStream = "malay",
  ideology: Ideology1950s = "nationalist",
  lang: LangRegister = "malay",
  orgType: OrgType = "party",
): PartyNameResult => {
  const streamData = NAMING_DATA[stream];
  const ideoData =
    streamData[ideology] ??
    streamData[Object.keys(streamData)[0] as Ideology1950s];
  const langData =
    ideoData[lang] ?? ideoData[Object.keys(ideoData)[0] as LangRegister];
  const parts = langData[orgType] ?? langData["party"];

  const pre = randomElement(parts.pre);
  const core = randomElement(parts.core);
  const suf = randomElement(parts.suf);
  const name = [pre, core, suf].filter(Boolean).join(" ").trim();

  // Generate abbreviation (skip common stop words)
  const stops = new Set(["of", "and", "the", "atau", "dan", "se", "bin"]);
  const words = name
    .split(" ")
    .filter((w) => !stops.has(w.toLowerCase()) && w.length > 1);
  const abbreviation = words
    .slice(0, 4)
    .map((w) => w[0].toUpperCase())
    .join("");

  const historicalNote = HISTORICAL_CONTEXT[`${stream}-${ideology}`] ?? "";

  return { name, abbreviation, historicalNote };
};

const getStreamAndIdeology = (
  affiliation?: Affiliation,
): { stream: CommunalStream; ideology: Ideology1950s } => {
  if (!affiliation) return { stream: "multiracial", ideology: "nationalist" }; // using fallback

  let stream: CommunalStream = "multiracial";
  const lowerName = affiliation.name.toLowerCase();

  if (lowerName.includes("malay") || lowerName.includes("bumi")) {
    stream = "malay";
  } else if (lowerName.includes("chinese") || lowerName.includes("cina")) {
    stream = "chinese";
  } else if (lowerName.includes("indian")) {
    stream = "indian";
  }

  const affIdeology = affiliation.ideology ||
    affiliation.baseIdeology || { economic: 50, governance: 50 };

  let ideology: Ideology1950s = "nationalist";
  if (lowerName.includes("islam") || lowerName.includes("muslim"))
    ideology = "islamist";
  else if (
    lowerName.includes("social") ||
    lowerName.includes("labour") ||
    lowerName.includes("worker") ||
    lowerName.includes("buruh")
  ) {
    ideology =
      lowerName.includes("labour") ||
      lowerName.includes("worker") ||
      lowerName.includes("buruh")
        ? "labour"
        : "leftist";
  } else if (affIdeology.economic < 30) ideology = "leftist";
  else if (affIdeology.economic > 70) ideology = "conservative";
  else if (affIdeology.governance > 70) ideology = "nationalist";
  else ideology = "nationalist";

  return { stream, ideology };
};

export const generatePartyName = (affiliation?: Affiliation): string => {
  const { stream, ideology } = getStreamAndIdeology(affiliation);
  const lang: LangRegister = Math.random() > 0.4 ? "malay" : "english";
  return generateDetailedPartyName(stream, ideology, lang, "party").name;
};

export const generateAllianceName = (): string => {
  const lang: LangRegister = Math.random() > 0.5 ? "malay" : "english";
  return generateDetailedPartyName(
    "multiracial",
    "nationalist",
    lang,
    "alliance",
  ).name;
};
