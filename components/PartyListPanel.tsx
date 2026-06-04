import React, { useState, useMemo } from 'react';
import { Party, Affiliation } from '../types';

interface PartyListPanelProps {
  parties: Party[];
  affiliationsMap: Map<string, Affiliation>;
  onClose: () => void;
  onPartyClick: (partyId: string) => void;
  partySeatCounts?: Map<string, number>;
  playerPartyId?: string;
}

const PLP_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Share+Tech+Mono&display=swap');

  .plp-root {
    --brass: #c9a84c;
    --amber: #e8b84b;
    --border: rgba(201,168,76,0.2);
    --border-bright: rgba(201,168,76,0.55);
    --text-dim: rgba(201,168,76,0.38);
    --text-mid: rgba(201,168,76,0.65);
    --text-body: rgba(232,210,160,0.85);
    position: absolute;
    top: 5rem; left: 1rem;
    height: calc(100% - 5.5rem);
    width: 380px;
    background: linear-gradient(160deg, #1a1208 0%, #110c04 100%);
    border: 1px solid var(--border-bright);
    border-top: 2px solid var(--brass);
    display: flex; flex-direction: column;
    z-index: 10;
    font-family: 'Crimson Text', serif;
    box-shadow: 8px 0 40px rgba(0,0,0,0.7);
    overflow: hidden;
  }

  .plp-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 23px, rgba(201,168,76,0.015) 24px
    );
    pointer-events: none; z-index: 0;
  }

  .plp-header {
    padding: 1rem 1.25rem 0.85rem;
    border-bottom: 1px solid var(--border);
    position: relative; z-index: 1;
    flex-shrink: 0;
  }
  .plp-header-top {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 0.75rem;
  }
  .plp-title {
    font-family: 'Cinzel', serif;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--amber);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .plp-subtitle {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.52rem;
    letter-spacing: 0.18em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-top: 0.15rem;
  }
  .plp-close {
    width: 28px; height: 28px;
    border: 1px solid var(--border);
    background: transparent; color: var(--text-dim);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem; transition: all 0.15s; flex-shrink: 0;
  }
  .plp-close:hover { color: var(--brass); border-color: var(--border-bright); background: rgba(201,168,76,0.06); }

  .plp-stats {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem; margin-bottom: 0.75rem;
  }
  .plp-stat {
    background: rgba(0,0,0,0.25);
    border: 1px solid var(--border);
    padding: 0.4rem 0.6rem;
  }
  .plp-stat-val {
    font-family: 'Cinzel', serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--brass);
    line-height: 1;
  }
  .plp-stat-key {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.47rem;
    letter-spacing: 0.14em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-top: 0.15rem;
  }

  .plp-search {
    width: 100%;
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--border);
    color: var(--text-body);
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 0.05em;
    padding: 0.45rem 0.7rem;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .plp-search:focus { border-color: var(--brass); }
  .plp-search::placeholder { color: var(--text-dim); }

  .plp-controls {
    padding: 0.5rem 1.25rem;
    display: flex; gap: 0.4rem;
    border-bottom: 1px solid var(--border);
    position: relative; z-index: 1;
    flex-shrink: 0;
  }
  .plp-sort-btn {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.3rem 0.65rem;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
  }
  .plp-sort-btn:hover { color: var(--text-mid); border-color: var(--border-bright); }
  .plp-sort-btn.active { color: var(--amber); border-color: var(--brass); background: rgba(201,168,76,0.08); }

  .plp-filter {
    margin-left: auto;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--border);
    background: rgba(0,0,0,0.3);
    color: var(--text-dim);
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }
  .plp-filter:focus { border-color: var(--brass); }
  option { background: #1a1208; }

  .plp-list {
    flex: 1; overflow-y: auto;
    padding: 0.75rem 1.25rem;
    position: relative; z-index: 1;
    scrollbar-width: thin;
    scrollbar-color: rgba(201,168,76,0.12) transparent;
  }
  .plp-list::-webkit-scrollbar { width: 3px; }
  .plp-list::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.12); }

  .plp-party-card {
    border: 1px solid var(--border);
    margin-bottom: 0.5rem;
    background: rgba(0,0,0,0.2);
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
    overflow: hidden;
  }
  .plp-party-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--party-color);
    opacity: 0.5;
    transition: opacity 0.15s;
  }
  .plp-party-card:hover { border-color: var(--border-bright); background: rgba(201,168,76,0.03); }
  .plp-party-card:hover::before { opacity: 1; }
  .plp-party-card.selected { border-color: var(--brass); background: rgba(201,168,76,0.05); }
  .plp-party-card.selected::before { opacity: 1; }
  .plp-party-card.player-party { border-color: rgba(99,160,100,0.35); }
  .plp-party-card.player-party::before { background: #7fc880; opacity: 0.7; }

  .plp-card-main {
    padding: 0.7rem 0.9rem 0.7rem 1.1rem;
    display: flex; align-items: center; gap: 0.75rem;
  }
  .plp-card-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 700;
    color: rgba(0,0,0,0.7);
    flex-shrink: 0;
    border: 2px solid rgba(0,0,0,0.3);
  }
  .plp-card-info { flex: 1; min-width: 0; }
  .plp-card-name {
    font-family: 'Cinzel', serif;
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.2;
  }
  .plp-card-focus {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.5rem;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-top: 0.15rem;
  }
  .plp-card-tags {
    display: flex; gap: 0.3rem; margin-top: 0.3rem; flex-wrap: wrap;
  }
  .plp-tag {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.42rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.1rem 0.35rem;
    border: 1px solid;
  }
  .plp-tag.you { border-color: rgba(99,160,100,0.5); color: #7fc880; }
  .plp-tag.parliament { border-color: rgba(100,140,220,0.4); color: rgba(140,180,240,0.8); }
  .plp-tag.noparl { border-color: var(--border); color: var(--text-dim); }

  .plp-card-seats {
    flex-shrink: 0; text-align: right;
    padding: 0.2rem 0.4rem;
    border: 1px solid rgba(100,140,220,0.2);
    background: rgba(100,140,220,0.04);
  }
  .plp-card-seats-val {
    font-family: 'Cinzel', serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: rgba(140,180,240,0.9);
    line-height: 1;
    display: block;
  }
  .plp-card-seats-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.42rem;
    letter-spacing: 0.1em;
    color: rgba(140,180,240,0.4);
    text-transform: uppercase;
    display: block;
  }

  .plp-card-expanded {
    padding: 0.6rem 1.1rem 0.7rem;
    border-top: 1px solid var(--border);
    background: rgba(0,0,0,0.15);
  }
  .plp-expanded-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.5rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 0.4rem;
  }
  .plp-aff-chips {
    display: flex; flex-wrap: wrap; gap: 0.3rem;
  }
  .plp-aff-chip {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.48rem;
    letter-spacing: 0.06em;
    padding: 0.15rem 0.45rem;
    border: 1px solid var(--border);
    color: var(--text-dim);
    text-transform: uppercase;
  }

  .plp-bar-track {
    height: 2px; background: rgba(255,255,255,0.05);
    margin-top: 0.5rem; overflow: hidden;
  }
  .plp-bar-fill { height: 100%; transition: width 0.5s ease; }

  .plp-footer {
    padding: 0.5rem 1.25rem;
    border-top: 1px solid var(--border);
    display: flex; justify-content: space-between;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.48rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
    position: relative; z-index: 1;
    flex-shrink: 0;
  }

  .plp-empty {
    text-align: center; padding: 3rem 0;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.6rem; letter-spacing: 0.15em;
    text-transform: uppercase; color: var(--text-dim);
  }
`;

const PartyListPanel: React.FC<PartyListPanelProps> = ({
  parties, affiliationsMap, onClose, onPartyClick,
  partySeatCounts = new Map(), playerPartyId
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'seats' | 'name'>('seats');
  const [filter, setFilter] = useState<'all' | 'inParliament' | 'notInParliament'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = parties.length;
    const inParl = parties.filter(p => (partySeatCounts.get(p.id) || 0) > 0).length;
    const totalSeats = Array.from(partySeatCounts.values()).reduce((a, b) => a + b, 0);
    return { total, inParl, totalSeats };
  }, [parties, partySeatCounts]);

  const filtered = useMemo(() => {
    return parties
      .filter(p => {
        const seats = partySeatCounts.get(p.id) || 0;
        if (filter === 'inParliament' && seats === 0) return false;
        if (filter === 'notInParliament' && seats > 0) return false;
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) ||
          p.affiliationIds.some(id => affiliationsMap.get(id)?.name.toLowerCase().includes(s));
      })
      .sort((a, b) => {
        if (sortBy === 'seats') {
          const diff = (partySeatCounts.get(b.id) || 0) - (partySeatCounts.get(a.id) || 0);
          return diff !== 0 ? diff : a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [parties, search, sortBy, filter, partySeatCounts, affiliationsMap]);

  return (
    <>
      <style>{PLP_STYLES}</style>
      <div className="plp-root">
        {/* Header */}
        <div className="plp-header">
          <div className="plp-header-top">
            <div>
              <div className="plp-title">Political Parties</div>
              <div className="plp-subtitle">Registry of active factions</div>
            </div>
            <button className="plp-close" onClick={onClose}>✕</button>
          </div>
          <div className="plp-stats">
            <div className="plp-stat">
              <div className="plp-stat-val">{stats.total}</div>
              <div className="plp-stat-key">Total</div>
            </div>
            <div className="plp-stat">
              <div className="plp-stat-val" style={{ color: '#7fc880' }}>{stats.inParl}</div>
              <div className="plp-stat-key">In Parliament</div>
            </div>
            <div className="plp-stat">
              <div className="plp-stat-val" style={{ color: 'rgba(140,180,240,0.9)' }}>{stats.totalSeats}</div>
              <div className="plp-stat-key">Total Seats</div>
            </div>
          </div>
          <input
            className="plp-search"
            placeholder="Search parties or factions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Controls */}
        <div className="plp-controls">
          <button className={`plp-sort-btn ${sortBy === 'seats' ? 'active' : ''}`} onClick={() => setSortBy('seats')}>By Seats</button>
          <button className={`plp-sort-btn ${sortBy === 'name' ? 'active' : ''}`} onClick={() => setSortBy('name')}>By Name</button>
          <select className="plp-filter" value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="all">All</option>
            <option value="inParliament">In Parliament</option>
            <option value="notInParliament">Not in Parliament</option>
          </select>
        </div>

        {/* List */}
        <div className="plp-list">
          {filtered.length === 0 ? (
            <div className="plp-empty">No parties found</div>
          ) : filtered.map(party => {
            const seats = partySeatCounts.get(party.id) || 0;
            const isPlayer = party.id === playerPartyId;
            const isSelected = selectedId === party.id;
            const totalSeats = stats.totalSeats;

            return (
              <div
                key={party.id}
                className={`plp-party-card ${isSelected ? 'selected' : ''} ${isPlayer ? 'player-party' : ''}`}
                style={{ '--party-color': party.color } as any}
                onClick={() => {
                  setSelectedId(isSelected ? null : party.id);
                  onPartyClick(party.id);
                }}
              >
                <div className="plp-card-main">
                  <div className="plp-card-avatar" style={{ backgroundColor: party.color }}>
                    {party.name.charAt(0)}
                  </div>
                  <div className="plp-card-info">
                    <div className="plp-card-name" style={{ color: party.color }}>{party.name}</div>
                    {party.ethnicityFocus && (
                      <div className="plp-card-focus">{party.ethnicityFocus} focus</div>
                    )}
                    <div className="plp-card-tags">
                      {isPlayer && <span className="plp-tag you">Your Party</span>}
                      {seats > 0
                        ? <span className="plp-tag parliament">{seats} seats</span>
                        : <span className="plp-tag noparl">No seats</span>
                      }
                    </div>
                  </div>
                  {seats > 0 && (
                    <div className="plp-card-seats">
                      <span className="plp-card-seats-val">{seats}</span>
                      <span className="plp-card-seats-label">Seats</span>
                    </div>
                  )}
                </div>

                {seats > 0 && totalSeats > 0 && (
                  <div style={{ padding: '0 1.1rem 0.6rem' }}>
                    <div className="plp-bar-track">
                      <div className="plp-bar-fill" style={{ width: `${(seats / totalSeats) * 100}%`, background: party.color, opacity: 0.5 }} />
                    </div>
                  </div>
                )}

                {isSelected && party.affiliationIds.length > 0 && (
                  <div className="plp-card-expanded">
                    <div className="plp-expanded-label">Affiliated Factions</div>
                    <div className="plp-aff-chips">
                      {party.affiliationIds.map(id => {
                        const aff = affiliationsMap.get(id);
                        return aff ? <span key={id} className="plp-aff-chip">{aff.name}</span> : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="plp-footer">
          <span>Click party to view details</span>
          <span>{filtered.length} shown</span>
        </div>
      </div>
    </>
  );
};

export default React.memo(PartyListPanel);