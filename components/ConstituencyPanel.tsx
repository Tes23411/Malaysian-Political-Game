import React, { useMemo, useState } from 'react';
import { GeoJsonFeature, Demographics, Character, Affiliation, Party, ElectionHistoryEntry, PoliticalAlliance, StrongholdMap } from '../types';
import { calculateEffectiveInfluence } from '../utils/influence';

interface ConstituencyPanelProps {
  seat: GeoJsonFeature;
  demographics: Demographics | null;
  characters: Character[];
  affiliationsMap: Map<string, Affiliation>;
  partiesMap: Map<string, Party>;
  onClose: () => void;
  onCharacterClick: (character: Character) => void;
  affiliationToPartyMap: Map<string, string>;
  onPartyClick: (partyId: string) => void;
  onStateClick: (state: string) => void;
  electionHistory: ElectionHistoryEntry[];
  strongholdMap: StrongholdMap;
  playerParty?: Party | null;
  onInvestCampaignFunds: (seatCode: string, amount: number) => void;
}

const CP_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Share+Tech+Mono&display=swap');

  .cp-root {
    --brass: #c9a84c;
    --brass-dim: #8a6f2e;
    --amber: #e8b84b;
    --ink: #0f0b05;
    --parchment: #1e1508;
    --border: rgba(201,168,76,0.2);
    --border-bright: rgba(201,168,76,0.55);
    --text-dim: rgba(201,168,76,0.4);
    --text-mid: rgba(201,168,76,0.65);
    --text-body: rgba(232,210,160,0.85);
    position: absolute;
    top: 5rem; right: 1rem;
    height: calc(100% - 5.5rem);
    width: 400px;
    background: linear-gradient(160deg, #1a1208 0%, #110c04 100%);
    border: 1px solid var(--border-bright);
    border-top: 2px solid var(--brass);
    display: flex; flex-direction: column;
    z-index: 10;
    font-family: 'Crimson Text', serif;
    box-shadow: -8px 0 40px rgba(0,0,0,0.7), inset 1px 0 0 rgba(201,168,76,0.05);
    overflow: hidden;
  }

  .cp-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 23px, rgba(201,168,76,0.015) 24px
    );
    pointer-events: none;
    z-index: 0;
  }

  .cp-header {
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--border);
    position: relative; z-index: 1;
    flex-shrink: 0;
  }
  .cp-header-top {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 0.5rem;
  }
  .cp-title {
    font-family: 'Cinzel', serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--amber);
    letter-spacing: 0.03em;
    line-height: 1.1;
  }
  .cp-close {
    width: 28px; height: 28px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .cp-close:hover { color: var(--brass); border-color: var(--border-bright); background: rgba(201,168,76,0.06); }

  .cp-meta {
    display: flex; align-items: center; gap: 0.5rem;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .cp-meta-link {
    background: none; border: none; cursor: pointer;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    color: var(--text-mid);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: color 0.15s;
    padding: 0;
  }
  .cp-meta-link:hover { color: var(--brass); }
  .cp-meta-dot { color: var(--border-bright); }

  /* TABS */
  .cp-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    position: relative; z-index: 1;
    flex-shrink: 0;
    background: rgba(0,0,0,0.2);
  }
  .cp-tab {
    flex: 1;
    padding: 0.6rem 0;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }
  .cp-tab:hover { color: var(--text-mid); }
  .cp-tab.active { color: var(--amber); border-bottom-color: var(--brass); }
  .cp-tab-count {
    font-size: 0.5rem;
    padding: 0.05rem 0.3rem;
    border: 1px solid currentColor;
    border-radius: 2px;
    opacity: 0.8;
  }

  /* BODY */
  .cp-body {
    flex: 1; overflow-y: auto; padding: 1rem 1.25rem;
    position: relative; z-index: 1;
    scrollbar-width: thin;
    scrollbar-color: rgba(201,168,76,0.15) transparent;
  }
  .cp-body::-webkit-scrollbar { width: 3px; }
  .cp-body::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.15); }

  /* SECTION */
  .cp-section { margin-bottom: 1.25rem; }
  .cp-section-title {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.52rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 0.6rem;
    display: flex; align-items: center; gap: 0.6rem;
  }
  .cp-section-title::after {
    content: ''; flex: 1; height: 1px;
    background: linear-gradient(90deg, var(--border), transparent);
  }

  /* MP BLOCK */
  .cp-mp-block {
    padding: 0.85rem 1rem;
    border: 1px solid var(--border);
    border-left: 3px solid var(--party-color, var(--brass));
    background: rgba(201,168,76,0.03);
    position: relative;
  }
  .cp-mp-name {
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.3rem;
  }
  .cp-mp-party {
    display: flex; align-items: center; gap: 0.5rem;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .cp-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .cp-vacant {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-style: italic;
  }

  /* STRONGHOLD */
  .cp-stronghold {
    padding: 0.7rem 1rem;
    border: 1px solid rgba(100,160,220,0.3);
    background: rgba(100,160,220,0.04);
    display: flex; align-items: center; gap: 0.75rem;
  }
  .cp-stronghold-icon {
    font-size: 1.2rem; opacity: 0.6; flex-shrink: 0;
  }
  .cp-stronghold-name {
    font-family: 'Crimson Text', serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: rgba(140,190,240,0.9);
  }
  .cp-stronghold-meta {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem;
    color: rgba(140,190,240,0.5);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 0.15rem;
  }

  /* DEMO BARS */
  .cp-demo-row { margin-bottom: 0.7rem; }
  .cp-demo-header { display: flex; justify-content: space-between; margin-bottom: 0.3rem; }
  .cp-demo-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-mid);
  }
  .cp-demo-value {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    color: var(--text-mid);
    font-weight: bold;
  }
  .cp-bar-track {
    height: 3px;
    background: rgba(255,255,255,0.06);
    position: relative; overflow: hidden;
  }
  .cp-bar-fill { height: 100%; transition: width 0.5s ease; }

  /* PARTY INFLUENCE */
  .cp-party-row {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(201,168,76,0.06);
    cursor: pointer;
    transition: background 0.1s;
  }
  .cp-party-row:hover { background: rgba(201,168,76,0.03); }
  .cp-party-row:last-child { border-bottom: none; }
  .cp-party-info { flex: 1; min-width: 0; }
  .cp-party-name {
    font-family: 'Crimson Text', serif;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-body);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cp-party-pct {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.85rem;
    color: var(--brass);
    flex-shrink: 0;
    min-width: 40px;
    text-align: right;
  }

  /* CHAR ROWS */
  .cp-search {
    width: 100%;
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--border);
    color: var(--text-body);
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.05em;
    padding: 0.45rem 0.7rem;
    outline: none;
    margin-bottom: 0.75rem;
    transition: border-color 0.15s;
  }
  .cp-search:focus { border-color: var(--brass); }
  .cp-search::placeholder { color: var(--text-dim); }

  .cp-char-row {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    margin-bottom: 0.3rem;
    border: 1px solid var(--border);
    background: rgba(0,0,0,0.2);
    cursor: pointer;
    transition: all 0.15s;
  }
  .cp-char-row:hover { border-color: var(--border-bright); background: rgba(201,168,76,0.04); }
  .cp-char-avatar {
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cinzel', serif;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink);
    flex-shrink: 0;
  }
  .cp-char-info { flex: 1; min-width: 0; }
  .cp-char-name {
    font-family: 'Crimson Text', serif;
    font-size: 0.9rem;
    font-weight: 600;
    color: #fff;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cp-char-name.player { color: #8fc880; }
  .cp-char-sub {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.52rem;
    letter-spacing: 0.07em;
    color: var(--text-dim);
    text-transform: uppercase;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 0.1rem;
  }
  .cp-char-inf {
    flex-shrink: 0;
    text-align: right;
  }
  .cp-char-inf-val {
    font-family: 'Cinzel', serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--amber);
    display: block;
    line-height: 1;
  }
  .cp-char-inf-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.42rem;
    letter-spacing: 0.12em;
    color: var(--text-dim);
    text-transform: uppercase;
    display: block;
  }
  .cp-mp-tag {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.45rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.08rem 0.3rem;
    border: 1px solid rgba(100,160,220,0.5);
    color: rgba(140,190,240,0.8);
    margin-left: 0.35rem;
  }

  /* HISTORY */
  .cp-hist-entry {
    border: 1px solid var(--border);
    margin-bottom: 0.75rem;
    overflow: hidden;
  }
  .cp-hist-header {
    background: rgba(201,168,76,0.06);
    padding: 0.5rem 0.75rem;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid var(--border);
  }
  .cp-hist-year {
    font-family: 'Cinzel', serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--brass);
  }
  .cp-hist-votes {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.52rem;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    text-transform: uppercase;
  }
  .cp-hist-result {
    padding: 0.5rem 0.75rem;
  }
  .cp-hist-row {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid rgba(201,168,76,0.04);
  }
  .cp-hist-row:last-child { border-bottom: none; }
  .cp-hist-row.winner { background: rgba(99,160,100,0.04); }
  .cp-hist-winner-star { color: var(--amber); font-size: 0.65rem; flex-shrink: 0; }
  .cp-hist-name {
    font-family: 'Crimson Text', serif;
    font-size: 0.85rem;
    color: var(--text-body);
    flex: 1; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cp-hist-pct {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.65rem;
    font-weight: bold;
    color: var(--text-mid);
    flex-shrink: 0;
    min-width: 36px;
    text-align: right;
  }
  .cp-hist-swing {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem;
    flex-shrink: 0;
    min-width: 36px;
    text-align: right;
  }
  .cp-hist-swing.up { color: #7fc880; }
  .cp-hist-swing.down { color: #e05c3a; }

  .cp-empty {
    text-align: center; padding: 3rem 0;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .cp-flavor-box {
    margin-top: 1rem;
    padding: 0.85rem;
    border: 1px dashed var(--border-bright);
    background: rgba(201,168,76,0.05);
    font-style: italic;
    font-size: 0.8rem;
    color: var(--text-body);
    line-height: 1.4;
  }
`;

function getConstituencyFlavor(d: Demographics | null): string {
  if (!d) return "A politically dynamic constituency with diverse local interests.";
  
  let classificationStr = d.urbanRuralClassification2018 || 'SEMI-URBAN';
  if (typeof classificationStr !== 'string') classificationStr = 'SEMI-URBAN';
  
  let density = "moderate density";
  if (classificationStr.toUpperCase().includes('URBAN')) density = "high density";
  if (classificationStr.toUpperCase() === 'RURAL') density = "agricultural and low density";
  
  const dominant = Math.max(d.malayPercent, d.chinesePercent, d.indiansPercent, d.bumiputeraSabahMuslimPercent || 0, d.bumiputeraSabahNonMuslimPercent || 0, d.bumiputeraSarawakMuslimPercent || 0, d.bumiputeraSarawakNonMuslimPercent || 0, d.orangAsliPercent || 0, d.othersPercent);
  
  let communityDesc = "highly mixed communities";
  if (dominant > 75) {
    if (d.malayPercent > 75) communityDesc = "a strong Malay majority";
    else if (d.chinesePercent > 75) communityDesc = "a strong Chinese majority";
    else if (d.indiansPercent > 75) communityDesc = "a strong Indian majority";
    else if (d.bumiputeraSabahMuslimPercent > 75) communityDesc = "a strong Sabah Muslim majority";
    else if (d.bumiputeraSabahNonMuslimPercent > 75) communityDesc = "a strong Sabah Non-Muslim majority";
    else if (d.bumiputeraSarawakMuslimPercent > 75) communityDesc = "a strong Sarawak Muslim majority";
    else if (d.bumiputeraSarawakNonMuslimPercent > 75) communityDesc = "a strong Sarawak Non-Muslim majority";
    else if (d.orangAsliPercent > 75) communityDesc = "a strong Orang Asli majority";
    else if (d.othersPercent > 75) communityDesc = "a strong Others majority";
  } else if (dominant > 55) {
    if (d.malayPercent > 55) communityDesc = "a leaning Malay majority";
    else if (d.chinesePercent > 55) communityDesc = "a leaning Chinese majority";    
    else if (d.indiansPercent > 55) communityDesc = "a leaning Indian majority";    
    else communityDesc = "a prominent demographic majority";
  }

  const state = (d.state || '').toUpperCase();
  const eastCoast = ["KELANTAN", "TERENGGANU", "PAHANG"];
  const borneo = ["SABAH", "SARAWAK"];
  
  let regionalFlavor = "It serves as a typical indicator of national trends.";
  if (eastCoast.includes(state)) {
    regionalFlavor = "Steeped in East Coast traditions, Islamic conservative values play a large role here.";
  } else if (borneo.includes(state)) {
    regionalFlavor = "Local autonomy under MA63, infrastructure, and state rights remain key political issues here.";
  } else if (["W.P. KUALA LUMPUR", "SELANGOR", "PULAU PINANG", "JOHOR", "SINGAPORE"].includes(state) && density === "high density") {
    regionalFlavor = "Economic policies, housing affordability, and fast-paced urban development are key battlegrounds.";
  } else if (["W.P. KUALA LUMPUR", "SELANGOR"].includes(state)) {
    regionalFlavor = "Being in the central economic hub of Klang Valley, national issues strongly resonate here.";
  } else if (state === "PULAU PINANG") {
    regionalFlavor = "A heavily industrialised and urbanized state, though with distinct mainland and island political cultures.";
  } else if (["JOHOR", "MELAKA", "NEGERI SEMBILAN", "MALACCA"].includes(state)) {
    if (classificationStr.toUpperCase().includes('URBAN')) {
      regionalFlavor = "A southern urban centre, it is a key focal point for industrial growth and middle-class voter sentiment.";
    } else {
      regionalFlavor = "Balancing steady development with traditional heritage, this southern constituency often sees tight electoral contests.";
    }
  } else if (state === "KEDAH" || state === "PERLIS") {
    regionalFlavor = "Known as the rice bowl of the country, agriculture and food security heavily influence the voting patterns of this belt.";
  } else if (state === "PERAK") {
    regionalFlavor = "Once a tin mining powerhouse, this state is now known for highly mixed voting priorities and swing voter demographics.";
  }

  let youthFlavor = "";
  if (d.youngVotersPercent) {
    if (d.youngVotersPercent > 40) youthFlavor = " A commanding youth demographic makes social media campaigns and fresh progressive policies highly resonant.";
    else if (d.youngVotersPercent < 25) youthFlavor = " An older voting base means traditional loyalty lines and local welfare are more likely to dictate results.";
    else youthFlavor = " With a balanced youth base, parties must juggle future-facing opportunities with grounded socioeconomic stability.";
  }

  let incomeFlavor = "";
  if (d.medianIncome) {
    if (d.medianIncome > 8000) incomeFlavor = " High median income levels suggest voters are sensitive to broad macroeconomic policy, taxation, and elite governance issues.";
    else if (d.medianIncome < 4000) incomeFlavor = " Lower median income points towards a populace where direct subsidies, basic infrastructure, and cost-of-living are absolute priorities.";
  }

  return `Classified as ${classificationStr.toLowerCase()} with ${density} and ${communityDesc}. ${regionalFlavor}${youthFlavor}${incomeFlavor}`;
}

export const ConstituencyPanel: React.FC<ConstituencyPanelProps> = ({
  seat, demographics, characters, affiliationsMap, partiesMap, onClose,
  onCharacterClick, affiliationToPartyMap, onPartyClick, onStateClick,
  electionHistory, strongholdMap, playerParty, onInvestCampaignFunds
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'characters' | 'history'>('overview');
  const [search, setSearch] = useState('');

  const seatCode = seat.properties.UNIQUECODE;
  const living = useMemo(() => characters.filter(c => c.isAlive && c.currentSeatCode === seatCode), [characters, seatCode]);
  const stronghold = useMemo(() => strongholdMap.get(seatCode), [strongholdMap, seatCode]);
  const strongholdAff = stronghold ? affiliationsMap.get(stronghold.affiliationId) : null;

  const { sortedParties } = useMemo(() => {
    const map = new Map<string, { inf: number; count: number }>();
    let total = 0;
    living.forEach(char => {
      const pId = affiliationToPartyMap.get(char.affiliationId);
      if (!pId) return;
      const party = partiesMap.get(pId);
      if (!party) return;
      const cd = party.contestedSeats?.get(seatCode);
      const inf = calculateEffectiveInfluence(char, seat, demographics, affiliationsMap, strongholdMap, cd?.candidateId, cd?.allocatedAffiliationId, party.campaignInvestments?.get(seatCode));
      const cur = map.get(pId) || { inf: 0, count: 0 };
      map.set(pId, { inf: cur.inf + inf, count: cur.count + 1 });
      total += inf;
    });
    return {
      sortedParties: Array.from(map.entries())
        .map(([id, d]) => ({ id, ...d, pct: total > 0 ? (d.inf / total) * 100 : 0 }))
        .sort((a, b) => b.inf - a.inf)
    };
  }, [living, seat, demographics, affiliationToPartyMap, partiesMap, affiliationsMap, seatCode, strongholdMap]);

  const sortedChars = useMemo(() => {
    return living
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .map(c => {
        const pId = affiliationToPartyMap.get(c.affiliationId);
        const party = pId ? partiesMap.get(pId) : undefined;
        const cd = party?.contestedSeats?.get(c.currentSeatCode);
        return { ...c, eff: calculateEffectiveInfluence(c, seat, demographics, affiliationsMap, strongholdMap, cd?.candidateId, cd?.allocatedAffiliationId, party?.campaignInvestments?.get(c.currentSeatCode)) };
      })
      .sort((a, b) => b.eff - a.eff);
  }, [living, search, seat, demographics, affiliationsMap, affiliationToPartyMap, partiesMap, strongholdMap]);

  const currentMPChar = useMemo(() => {
    return characters.find(c => c.isAlive && c.isMP && c.currentSeatCode === seatCode) || null;
  }, [characters, seatCode]);
  
  const mpParty = useMemo(() => {
    if (!currentMPChar) return null;
    const pId = affiliationToPartyMap.get(currentMPChar.affiliationId);
    return pId ? partiesMap.get(pId) || null : null;
  }, [currentMPChar, affiliationToPartyMap, partiesMap]);

  return (
    <>
      <style>{CP_STYLES}</style>
      <div className="cp-root">
        {/* Header */}
        <div className="cp-header">
          <div className="cp-header-top">
            <div>
              <div className="cp-title">{seat.properties.PARLIMEN}</div>
              <div className="cp-meta" style={{ marginTop: '0.3rem' }}>
                <button className="cp-meta-link" onClick={() => onStateClick(seat.properties.NEGERI || '')}>
                  {seat.properties.NEGERI || 'Unknown State'}
                </button>
                {demographics && (
                  <>
                    <span className="cp-meta-dot">·</span>
                    <span>{demographics.totalElectors.toLocaleString()} voters</span>
                  </>
                )}
              </div>
            </div>
            <button className="cp-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="cp-tabs">
          {[
            { key: 'overview', label: 'Overview', count: null },
            { key: 'characters', label: 'People', count: living.length },
            { key: 'history', label: 'History', count: electionHistory.length },
          ].map(t => (
            <button
              key={t.key}
              className={`cp-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key as any)}
            >
              {t.label}
              {t.count !== null && <span className="cp-tab-count">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="cp-body">

          {activeTab === 'overview' && (
            <>
              {/* MP */}
              <div className="cp-section">
                <div className="cp-section-title">Incumbent</div>
                <div className="cp-mp-block" style={{ '--party-color': mpParty?.color || 'var(--brass)' } as any}>
                  {currentMPChar ? (
                    <>
                      <button className="cp-mp-name" onClick={() => onCharacterClick(currentMPChar)} style={{ background: 'none', border: 'none', padding: 0, margin: 0, textAlign: 'left', cursor: 'pointer' }}>{currentMPChar.name}</button>
                      <button className="cp-mp-party" onClick={() => mpParty && onPartyClick(mpParty.id)} style={{ background: 'none', border: 'none', padding: 0, margin: 0, textAlign: 'left', cursor: 'pointer' }}>
                        <span className="cp-dot" style={{ backgroundColor: mpParty?.color || '#888' }} />
                        <span style={{ color: mpParty?.color || 'var(--text-mid)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{mpParty?.name}</span>
                      </button>
                    </>
                  ) : (
                    <div className="cp-vacant">Seat Vacant — Awaiting Election</div>
                  )}
                </div>
              </div>

              {/* Stronghold */}
              {stronghold && strongholdAff && (
                <div className="cp-section">
                  <div className="cp-section-title">Political Status</div>
                  <div className="cp-stronghold">
                    <div className="cp-stronghold-icon">🛡</div>
                    <div>
                      <div className="cp-stronghold-name">{strongholdAff.name} Stronghold</div>
                      <div className="cp-stronghold-meta">
                        Held {stronghold.terms} term{stronghold.terms > 1 ? 's' : ''} · +{stronghold.terms * 10}% influence
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Demographics */}
              {demographics && (
                <div className="cp-section">
                  <div className="cp-section-title">Demographics</div>
                  {[
                    { label: 'Youth (18-35)', value: demographics.youngVotersPercent || 0, color: '#9b59b6' },
                    { label: 'Malay', value: demographics.malayPercent, color: '#d4a84b' },
                    { label: 'Chinese', value: demographics.chinesePercent, color: '#c0392b' },
                    { label: 'Indian', value: demographics.indiansPercent, color: '#e07b2a' },
                    { label: 'Bumi Sabah (Muslim)', value: demographics.bumiputeraSabahMuslimPercent || 0, color: '#2e8b57' },
                    { label: 'Bumi Sabah (Non-Muslim)', value: demographics.bumiputeraSabahNonMuslimPercent || 0, color: '#d0c354' },
                    { label: 'Bumi Sarawak (Muslim)', value: demographics.bumiputeraSarawakMuslimPercent || 0, color: '#4682b4' },
                    { label: 'Bumi Sarawak (Non-Muslim)', value: demographics.bumiputeraSarawakNonMuslimPercent || 0, color: '#cd853f' },
                    { label: 'Orang Asli', value: demographics.orangAsliPercent || 0, color: '#8b4513' },
                    { label: 'Others', value: demographics.othersPercent, color: '#8e44ad' },
                  ].map(({ label, value, color }) => (
                    <div className="cp-demo-row" key={label}>
                      <div className="cp-demo-header">
                        <span className="cp-demo-label">{label}</span>
                        <span className="cp-demo-value">{value.toFixed(1)}%</span>
                      </div>
                      <div className="cp-bar-track">
                        <div className="cp-bar-fill" style={{ width: `${value}%`, background: color }} />
                      </div>
                    </div>
                  ))}

                  {demographics.medianIncome && (
                    <div className="cp-demo-row mt-2" style={{ paddingTop: '0.4rem', borderTop: '1px solid var(--border)' }}>
                      <div className="cp-demo-header">
                        <span className="cp-demo-label" style={{ color: 'var(--text-body)' }}>Median Avg. Income</span>
                        <span className="cp-demo-value" style={{ color: '#63a064' }}>RM {demographics.medianIncome.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="cp-flavor-box">
                    {getConstituencyFlavor(demographics)}
                  </div>
                </div>
              )}

              {/* Party influence */}
              <div className="cp-section">
                <div className="cp-section-title">Local Influence</div>
                {sortedParties.length > 0 ? sortedParties.map(({ id, pct, count }) => {
                  const party = partiesMap.get(id);
                  if (!party) return null;
                  return (
                    <div className="cp-party-row" key={id} onClick={() => onPartyClick(id)}>
                      <span className="cp-dot" style={{ backgroundColor: party.color, boxShadow: `0 0 6px ${party.color}` }} />
                      <div className="cp-party-info">
                        <div className="cp-party-name" style={{ color: party.color }}>{party.name}</div>
                        <div className="cp-bar-track" style={{ marginTop: '0.3rem' }}>
                          <div className="cp-bar-fill" style={{ width: `${pct}%`, background: party.color, opacity: 0.6 }} />
                        </div>
                      </div>
                      <div className="cp-party-pct">{pct.toFixed(1)}%</div>
                    </div>
                  );
                }) : <div className="cp-empty">No political presence</div>}
              </div>

              {/* Actions */}
              {playerParty && (
                  <div className="cp-section">
                    <div className="cp-section-title">Campaign Support</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-mid)', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                      Fund grassroot events and local infrastructure. Increases base influence in this seat prior to an election.
                      <br/><br/>
                      {(playerParty.campaignInvestments && playerParty.campaignInvestments.get(seatCode))
                          ? <strong style={{color: 'var(--amber)'}}>Total Warchest: MYR ${(playerParty.campaignInvestments.get(seatCode)!).toLocaleString()}</strong>
                          : "No active investments in this constituency."}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {[10000, 100000, 500000].map(amount => (
                          <button 
                              key={amount}
                              onClick={() => {
                                  if (playerParty.funds >= amount) {
                                      onInvestCampaignFunds(seatCode, amount);
                                  }
                              }}
                              disabled={playerParty.funds < amount}
                              style={{
                                  flex: 1,
                                  padding: '0.4rem',
                                  background: playerParty.funds >= amount ? 'rgba(201,168,76,0.1)' : 'rgba(0,0,0,0.2)',
                                  border: `1px solid ${playerParty.funds >= amount ? 'var(--border-bright)' : 'var(--border)'}`,
                                  color: playerParty.funds >= amount ? 'var(--amber)' : 'var(--text-dim)',
                                  fontFamily: 'Share Tech Mono',
                                  fontSize: '0.7rem',
                                  textTransform: 'uppercase',
                                  cursor: playerParty.funds >= amount ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.2s ease',
                              }}
                              onMouseOver={(e) => { if(playerParty.funds >= amount) e.currentTarget.style.background = 'rgba(201,168,76,0.2)' }}
                              onMouseOut={(e) => { if(playerParty.funds >= amount) e.currentTarget.style.background = 'rgba(201,168,76,0.1)' }}
                          >
                              +{(amount/1000)}k
                          </button>
                      ))}
                    </div>
                    {playerParty.funds < 10000 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem', textAlign: 'center' }}>
                            Insufficient party funds
                        </div>
                    )}
                  </div>
              )}
            </>
          )}

          {activeTab === 'characters' && (
            <>
              <input
                className="cp-search"
                placeholder="Search by name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {sortedChars.length > 0 ? sortedChars.map(char => {
                const pId = affiliationToPartyMap.get(char.affiliationId);
                const party = pId ? partiesMap.get(pId) : undefined;
                return (
                  <div className="cp-char-row" key={char.id} onClick={() => onCharacterClick(char)}>
                    <div className="cp-char-avatar" style={{ background: party?.color || '#4a3a1a' }}>
                      {char.name.charAt(0)}
                    </div>
                    <div className="cp-char-info">
                      <div className={`cp-char-name ${char.isPlayer ? 'player' : ''}`}>
                        {char.name}
                        {char.isMP && <span className="cp-mp-tag">MP</span>}
                      </div>
                      <div className="cp-char-sub">
                        {party?.name || 'Independent'}
                      </div>
                    </div>
                    <div className="cp-char-inf">
                      <span className="cp-char-inf-val">{Math.round(char.eff)}</span>
                      <span className="cp-char-inf-label">Inf</span>
                    </div>
                  </div>
                );
              }) : <div className="cp-empty">No characters here</div>}
            </>
          )}

          {activeTab === 'history' && (
            electionHistory.length > 0
              ? [...electionHistory].reverse().map(entry => {
                  const seatVotes = entry.detailedResults.get(seatCode);
                  if (!seatVotes) return null;
                  const total = Array.from(seatVotes.values()).reduce((a, b) => (a as number) + (b as number), 0) as number;
                  const winner = entry.seatWinners.get(seatCode);
                  const results = Array.from(seatVotes.entries())
                    .map(([pId, votes]) => {
                      const party = partiesMap.get(pId);
                      const pct = total > 0 ? ((votes as number) / total) * 100 : 0;
                      return { pId, partyName: party?.name || 'Unknown', color: party?.color || '#666', pct, isWinner: winner?.partyId === pId };
                    })
                    .sort((a, b) => b.pct - a.pct);
                  return (
                    <div className="cp-hist-entry" key={entry.date.toISOString()}>
                      <div className="cp-hist-header">
                        <span className="cp-hist-year">{entry.date.getFullYear()} General Election</span>
                        <span className="cp-hist-votes">{total.toLocaleString()} votes</span>
                      </div>
                      <div className="cp-hist-result">
                        {results.map(r => (
                          <div className={`cp-hist-row ${r.isWinner ? 'winner' : ''}`} key={r.pId}>
                            {r.isWinner ? <span className="cp-hist-winner-star">★</span> : <span style={{ width: '0.65rem', display: 'inline-block' }} />}
                            <span className="cp-dot" style={{ backgroundColor: r.color }} />
                            <span className="cp-hist-name">{r.partyName}</span>
                            <span className="cp-hist-pct">{r.pct.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              : <div className="cp-empty">No election history yet</div>
          )}

        </div>
      </div>
    </>
  );
};