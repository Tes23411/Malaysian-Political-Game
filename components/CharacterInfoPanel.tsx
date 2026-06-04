import React, { useState } from 'react';
import { CharacterInfoPanelProps } from '../types';
import { getIdeologyName } from '../utils/politics';

const CIP_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Share+Tech+Mono&display=swap');

  .cip-root {
    --brass: #c9a84c;
    --amber: #e8b84b;
    --border: rgba(201,168,76,0.2);
    --border-bright: rgba(201,168,76,0.55);
    --text-dim: rgba(201,168,76,0.38);
    --text-mid: rgba(201,168,76,0.65);
    --text-body: rgba(232,210,160,0.85);
    --party: var(--brass);
    position: absolute;
    top: 5rem; left: 1rem;
    width: 380px;
    height: calc(100% - 5.5rem);
    background: linear-gradient(160deg, #1a1208 0%, #110c04 100%);
    border: 1px solid var(--border-bright);
    border-top: 2px solid var(--party);
    display: flex; flex-direction: column;
    z-index: 1000;
    font-family: 'Crimson Text', serif;
    box-shadow: 8px 0 40px rgba(0,0,0,0.7);
    overflow: hidden;
  }

  .cip-root::before {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(201,168,76,0.015) 24px);
    pointer-events: none; z-index: 0;
  }

  /* BANNER */
  .cip-banner {
    height: 80px;
    position: relative; flex-shrink: 0;
  }
  .cip-banner-bg {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, var(--party-dark, #3a2800) 0%, #0f0b05 100%);
    opacity: 0.7;
  }
  .cip-banner-pattern {
    position: absolute; inset: 0;
    background-image: repeating-linear-gradient(
      45deg,
      rgba(201,168,76,0.04) 0px,
      rgba(201,168,76,0.04) 1px,
      transparent 1px,
      transparent 12px
    );
  }
  .cip-close {
    position: absolute; top: 0.6rem; right: 0.6rem;
    width: 26px; height: 26px;
    border: 1px solid rgba(201,168,76,0.3);
    background: rgba(0,0,0,0.4);
    color: rgba(201,168,76,0.5);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem;
    transition: all 0.15s;
    z-index: 2;
  }
  .cip-close:hover { color: var(--brass); border-color: var(--border-bright); }
  .cip-avatar {
    position: absolute; bottom: -18px; left: 1.25rem;
    width: 54px; height: 54px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cinzel', serif;
    font-size: 1.4rem; font-weight: 700;
    color: #0f0b05;
    border: 3px solid #0f0b05;
    z-index: 2;
    flex-shrink: 0;
  }
  .cip-player-dot {
    position: absolute; bottom: 0; right: 0;
    width: 14px; height: 14px;
    background: #5db55e;
    border-radius: 50%;
    border: 2px solid #0f0b05;
  }

  /* IDENTITY */
  .cip-identity {
    padding: 1.35rem 1.25rem 0.75rem 5.5rem;
    position: relative; z-index: 1; flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }
  .cip-name {
    font-family: 'Cinzel', serif;
    font-size: 1.15rem; font-weight: 700;
    color: #fff; line-height: 1.15;
    margin-bottom: 0.35rem;
  }
  .cip-chips {
    display: flex; flex-wrap: wrap; gap: 0.3rem;
  }
  .cip-chip {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.48rem; letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--border);
    color: var(--text-mid);
  }
  .cip-chip.alive { border-color: rgba(93,181,94,0.4); color: rgba(130,200,131,0.8); }
  .cip-chip.deceased { border-color: rgba(180,60,60,0.4); color: rgba(200,100,100,0.8); }
  .cip-chip.player { border-color: rgba(93,181,94,0.5); color: #7fc880; }

  /* TABS */
  .cip-tabs {
    display: flex; border-bottom: 1px solid var(--border);
    position: relative; z-index: 1; flex-shrink: 0;
    background: rgba(0,0,0,0.15);
  }
  .cip-tab {
    flex: 1; padding: 0.55rem 0;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem; letter-spacing: 0.15em;
    text-transform: uppercase;
    background: transparent; border: none;
    color: var(--text-dim); cursor: pointer;
    transition: all 0.15s;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }
  .cip-tab:hover { color: var(--text-mid); }
  .cip-tab.active { color: var(--amber); border-bottom-color: var(--brass); }

  /* BODY */
  .cip-body {
    flex: 1; overflow-y: auto;
    padding: 1rem 1.25rem;
    position: relative; z-index: 1;
    scrollbar-width: thin;
    scrollbar-color: rgba(201,168,76,0.12) transparent;
  }
  .cip-body::-webkit-scrollbar { width: 3px; }
  .cip-body::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.12); }

  /* SECTION */
  .cip-section { margin-bottom: 1.1rem; }
  .cip-section-title {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.5rem; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--text-dim);
    margin-bottom: 0.55rem;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .cip-section-title::after {
    content: ''; flex: 1; height: 1px;
    background: linear-gradient(90deg, var(--border), transparent);
  }

  /* ROLE BLOCK */
  .cip-role-block {
    padding: 0.7rem 0.85rem;
    border: 1px solid var(--border);
    border-left: 3px solid var(--party);
    background: rgba(0,0,0,0.2);
    margin-bottom: 0.5rem;
  }
  .cip-role-party {
    display: flex; align-items: center; gap: 0.5rem;
    margin-bottom: 0.45rem;
  }
  .cip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .cip-party-name {
    font-family: 'Crimson Text', serif;
    font-size: 0.95rem; font-weight: 600;
    color: var(--text-body);
  }
  .cip-role-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
  }
  .cip-role-item {}
  .cip-role-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.47rem; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text-dim);
    margin-bottom: 0.1rem;
  }
  .cip-role-val {
    font-family: 'Crimson Text', serif;
    font-size: 0.85rem; color: var(--text-body);
  }
  .cip-roles-badges {
    display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem;
    padding-top: 0.5rem; border-top: 1px solid var(--border);
  }
  .cip-badge {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.45rem; letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.12rem 0.4rem;
    border: 1px solid;
  }
  .cip-badge.cm { border-color: rgba(201,168,76,0.5); color: var(--amber); }
  .cip-badge.minister { border-color: rgba(100,140,220,0.4); color: rgba(140,180,240,0.85); }
  .cip-badge.faction { border-color: rgba(201,168,76,0.3); color: var(--text-mid); }
  .cip-badge.mp { border-color: rgba(99,160,100,0.4); color: rgba(130,190,131,0.85); }

  /* STATS */
  .cip-stat-row { margin-bottom: 0.65rem; }
  .cip-stat-header { display: flex; justify-content: space-between; margin-bottom: 0.25rem; }
  .cip-stat-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.52rem; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text-mid);
  }
  .cip-stat-val {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.52rem; color: var(--text-mid); font-weight: bold;
  }
  .cip-stat-track { height: 3px; background: rgba(255,255,255,0.06); overflow: hidden; }
  .cip-stat-fill { height: 100%; transition: width 0.5s ease; }

  /* IDEOLOGY */
  .cip-ideology-name {
    font-family: 'Cinzel', serif;
    font-size: 0.8rem; font-weight: 600;
    color: var(--amber);
    margin-bottom: 0.6rem;
    text-align: right;
  }
  .cip-ideo-axis { margin-bottom: 0.55rem; }
  .cip-ideo-labels { display: flex; justify-content: space-between; margin-bottom: 0.2rem; }
  .cip-ideo-left, .cip-ideo-right {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.47rem; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text-dim);
  }
  .cip-ideo-track {
    height: 4px; background: rgba(255,255,255,0.06);
    position: relative; overflow: visible;
  }
  .cip-ideo-fill { height: 100%; }
  .cip-ideo-marker {
    position: absolute; top: -3px;
    width: 10px; height: 10px;
    border-radius: 50%;
    border: 2px solid #0f0b05;
    transform: translateX(-50%);
    transition: left 0.5s ease;
  }

  /* HISTORY */
  .cip-timeline {
    position: relative;
    padding-left: 1rem;
    border-left: 1px solid var(--border);
  }
  .cip-tl-entry { margin-bottom: 1rem; position: relative; }
  .cip-tl-entry::before {
    content: '';
    position: absolute; left: -1.35rem; top: 0.35rem;
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--brass-dim, #6a5020);
    border: 1px solid var(--brass);
    transition: background 0.15s;
  }
  .cip-tl-entry:hover::before { background: var(--brass); }
  .cip-tl-date {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.48rem; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text-dim);
    margin-bottom: 0.2rem;
  }
  .cip-tl-event {
    font-family: 'Crimson Text', serif;
    font-size: 0.85rem;
    color: var(--text-body);
    line-height: 1.4;
  }

  /* FOOTER ACTIONS */
  .cip-actions {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--border);
    position: relative; z-index: 1;
    flex-shrink: 0;
    background: rgba(0,0,0,0.25);
  }
  .cip-action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin-bottom: 0.4rem; }
  .cip-action-btn {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem; letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-mid);
    cursor: pointer; transition: all 0.15s;
    text-align: center;
  }
  .cip-action-btn:hover { background: rgba(201,168,76,0.06); color: var(--brass); border-color: var(--border-bright); }
  .cip-action-btn.primary {
    border-color: rgba(99,160,100,0.4);
    color: rgba(130,190,131,0.85);
  }
  .cip-action-btn.primary:hover { background: rgba(99,160,100,0.08); color: #7fc880; border-color: rgba(99,160,100,0.7); }
  .cip-action-btn.wide { grid-column: span 2; }
  .cip-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .cip-action-btn:disabled:hover { background: transparent; color: var(--text-mid); border-color: var(--border); }
  .cip-move-prompt {
    text-align: center; padding: 0.2rem 0;
  }
  .cip-move-text {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem; letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--amber);
    display: block; margin-bottom: 0.5rem;
    animation: cip-pulse 1.5s ease-in-out infinite;
  }
  .cip-cancel-btn {
    width: 100%;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.5rem;
    border: 1px solid rgba(200,60,60,0.4);
    background: transparent;
    color: rgba(200,100,100,0.8);
    cursor: pointer; transition: all 0.15s;
  }
  .cip-cancel-btn:hover { background: rgba(200,60,60,0.08); color: #e05c3a; border-color: rgba(200,60,60,0.7); }

  @keyframes cip-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const StatRow = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="cip-stat-row">
    <div className="cip-stat-header">
      <span className="cip-stat-label">{label}</span>
      <span className="cip-stat-val">{value}</span>
    </div>
    <div className="cip-stat-track">
      <div className="cip-stat-fill" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  </div>
);

const CharacterInfoPanel: React.FC<CharacterInfoPanelProps> = ({
  character, affiliation, party, seat, onClose, currentDate, roleInfo,
  isPlayerMoving, onInitiateMove, onCancelMove, onOpenPartyManagement,
  onOpenActions, onOpenAffiliationManagement, isPartyManagementDisabled,
  isAffiliationManagementDisabled, government
}) => {
  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const age = Math.floor((currentDate.getTime() - new Date(character.dateOfBirth).getTime()) / 31557600000);
  const partyColor = party?.color || '#c9a84c';
  const ideologyName = getIdeologyName(character.ideology);
  const ministerRole = government?.cabinet.find(m => m.ministerId === character.id);
  const isCM = government?.chiefMinisterId === character.id;

  // Darken party color for banner bg
  const bannerStyle = { '--party': partyColor, '--party-dark': partyColor + '33' } as any;

  const getCharacterFlavor = () => {
    let focus = "";
    if (character.ideology.economic < 30) focus = "A staunch advocate for state intervention and workers' rights, viewing the market with deep skepticism. ";
    else if (character.ideology.economic > 70) focus = "A pro-business reformist, championing free markets, deregulation, and corporate growth. ";
    else focus = "A centrist on economic issues, preferring pragmatic policies over strict adherence to market philosophy. ";

    if (character.ideology.governance < 30) focus += "Believes heavily in traditional values, centralized authority, and preserving established social hierarchies.";
    else if (character.ideology.governance > 70) focus += "Fiercely defends civil liberties, progressive social reform, and institutional transparency.";
    else focus += "Maintains a balanced view on governance, often acting as a stabilizing voice in radical times.";

    return focus;
  };

  return (
    <>
      <style>{CIP_STYLES}</style>
      <div className="cip-root" style={bannerStyle}>

        {/* Banner */}
        <div className="cip-banner">
          <div className="cip-banner-bg" style={{ background: `linear-gradient(135deg, ${partyColor}22 0%, #0f0b05 100%)`, opacity: 1 }} />
          <div className="cip-banner-pattern" />
          <button className="cip-close" onClick={onClose}>✕</button>
          <div className="cip-avatar" style={{ background: partyColor }}>
            {character.name.charAt(0)}
            {character.isPlayer && <div className="cip-player-dot" />}
          </div>
        </div>

        {/* Identity */}
        <div className="cip-identity">
          <div className="cip-name">{character.name}</div>
          <div className="cip-chips">
            {character.isPlayer && <span className="cip-chip player">You</span>}
            <span className={`cip-chip ${character.isAlive ? 'alive' : 'deceased'}`}>
              {character.isAlive ? 'Active' : 'Deceased'}
            </span>
            <span className="cip-chip">{age}y</span>
            <span className="cip-chip">{character.ethnicity}</span>
            <span className="cip-chip">{character.state}</span>
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-dim)', lineHeight: '1.3' }}>
            "{getCharacterFlavor()}"
          </div>
        </div>

        {/* Tabs */}
        <div className="cip-tabs">
          <button className={`cip-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
          <button className={`cip-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Career</button>
        </div>

        {/* Body */}
        <div className="cip-body">
          {tab === 'overview' && (
            <>
              {/* Political Standing */}
              <div className="cip-section">
                <div className="cip-section-title">Political Standing</div>
                <div className="cip-role-block" style={{ '--party': partyColor, borderLeftColor: partyColor } as any}>
                  <div className="cip-role-party">
                    <span className="cip-dot" style={{ background: partyColor, boxShadow: `0 0 5px ${partyColor}` }} />
                    <span className="cip-party-name">{party?.name || 'Independent'}</span>
                  </div>
                  <div className="cip-role-grid">
                    <div className="cip-role-item">
                      <div className="cip-role-label">Constituency</div>
                      <div className="cip-role-val">{seat?.properties.PARLIMEN || '—'}</div>
                    </div>
                    <div className="cip-role-item">
                      <div className="cip-role-label">Faction</div>
                      <div className="cip-role-val">{affiliation?.name || '—'}</div>
                    </div>
                  </div>
                  <div className="cip-roles-badges">
                    <span className="cip-badge faction">{roleInfo.details}</span>
                    {isCM && <span className="cip-badge cm">Chief Minister</span>}
                    {ministerRole && <span className="cip-badge minister">Min. {ministerRole.portfolio}</span>}
                    {character.isAffiliationLeader && <span className="cip-badge faction">Faction Leader</span>}
                    {character.isMP && <span className="cip-badge mp">MP</span>}
                  </div>
                </div>
              </div>

              {/* Ideology */}
              <div className="cip-section">
                <div className="cip-section-title">Ideology</div>
                <div className="cip-ideology-name">{ideologyName}</div>
                <div className="cip-ideo-axis">
                  <div className="cip-ideo-labels">
                    <span className="cip-ideo-left">Planned</span>
                    <span className="cip-ideo-right">Free Market</span>
                  </div>
                  <div className="cip-ideo-track">
                    <div className="cip-ideo-fill" style={{ width: `${character.ideology.economic}%`, background: `linear-gradient(90deg, #4a90d9, #c9a84c)`, opacity: 0.4 }} />
                    <div className="cip-ideo-marker" style={{ left: `${character.ideology.economic}%`, background: '#4a90d9' }} />
                  </div>
                </div>
                <div className="cip-ideo-axis">
                  <div className="cip-ideo-labels">
                    <span className="cip-ideo-left">Authoritarian</span>
                    <span className="cip-ideo-right">Liberal</span>
                  </div>
                  <div className="cip-ideo-track">
                    <div className="cip-ideo-fill" style={{ width: `${character.ideology.governance}%`, background: `linear-gradient(90deg, #c94c4c, #9b59b6)`, opacity: 0.4 }} />
                    <div className="cip-ideo-marker" style={{ left: `${character.ideology.governance}%`, background: '#9b59b6' }} />
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              {character.isAlive && (
                <div className="cip-section">
                  <div className="cip-section-title">Capabilities</div>
                  <StatRow label="Influence" value={character.influence} color="#c9a84c" />
                  <StatRow label="Charisma" value={character.charisma} color="#9b59b6" />
                  <StatRow label="Recognition" value={character.recognition} color="#2ecc71" />
                  {character.satisfaction !== undefined && (
                    <StatRow label="Satisfaction" value={character.satisfaction} color={character.satisfaction > 50 ? '#2ecc71' : '#e74c3c'} />
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <div className="cip-timeline">
              {[...character.history].reverse().map((entry, i) => (
                <div className="cip-tl-entry" key={i}>
                  <div className="cip-tl-date">
                    {entry.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="cip-tl-event">{entry.event}</div>
                </div>
              ))}
              {character.history.length === 0 && (
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.3)', padding: '1rem 0' }}>
                  No history recorded
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {character.isPlayer && character.isAlive && (
          <div className="cip-actions">
            {!isPlayerMoving ? (
              <>
                <div className="cip-action-grid">
                  <button className="cip-action-btn" onClick={onInitiateMove}>Move Seat</button>
                  <button className="cip-action-btn primary" onClick={onOpenActions}>Perform Action</button>
                  {character.isAffiliationLeader && (
                    <button
                      className="cip-action-btn"
                      onClick={onOpenAffiliationManagement}
                      disabled={isAffiliationManagementDisabled}
                    >
                      Faction Candidates
                    </button>
                  )}
                  {(roleInfo.role === 'National Leader' || roleInfo.role === 'National Deputy Leader' || roleInfo.role === 'State Leader' || party?.leaderId === character.id || (party?.leaderHistory?.length > 0 && party.leaderHistory[party.leaderHistory.length - 1].leaderId === character.id)) && (
                    <button
                      className="cip-action-btn"
                      onClick={onOpenPartyManagement}
                      disabled={isPartyManagementDisabled}
                    >
                      Party Strategy
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="cip-move-prompt">
                <span className="cip-move-text">Select a constituency on the map</span>
                <button className="cip-cancel-btn" onClick={onCancelMove}>Cancel Move</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CharacterInfoPanel;