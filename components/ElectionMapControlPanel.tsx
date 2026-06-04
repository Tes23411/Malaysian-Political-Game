// ─── ElectionMapControlPanel.tsx ─────────────────────────────────────────────
import React from 'react';
import { Party, ElectionMapConfig, Metric, ElectionHistoryEntry } from '../types';
import { GCP_BASE } from '../gcpTheme';

interface ElectionMapControlPanelProps {
  config: ElectionMapConfig;
  onConfigChange: (config: ElectionMapConfig) => void;
  parties: Party[];
  onClose: () => void;
  electionHistory: ElectionHistoryEntry[];
}

const EMCP_EXTRA = `
  .emcp-select {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    letter-spacing: 0.08em;
    width: 100%;
    background: rgba(201,168,76,0.04);
    border: 1px solid var(--border);
    color: var(--text-mid);
    padding: 0.35rem 1.4rem 0.35rem 0.6rem;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    transition: border-color 0.15s;
    outline: none;
  }
  .emcp-select:hover, .emcp-select:focus {
    border-color: var(--border-bright);
    color: var(--brass);
  }
  .emcp-select option {
    background: #1a1208;
    color: var(--text-mid);
  }
  .emcp-select-wrap {
    position: relative;
  }
  .emcp-select-wrap::after {
    content: '▾';
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.55rem;
    color: var(--text-dim);
    pointer-events: none;
  }
`;

export const ElectionMapControlPanel: React.FC<ElectionMapControlPanelProps> = ({
  config, onConfigChange, parties, onClose, electionHistory,
}) => {
  const hasResults = config.results && config.results.size > 0;

  return (
    <>
      <style>{GCP_BASE}{EMCP_EXTRA}</style>
      <div className="gcp-panel gcp-fade-in" style={{ position: 'absolute', top: '6rem', left: '1rem', width: '17rem', zIndex: 30, borderRadius: '2px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Overlay</div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.85rem', fontWeight: 600, color: 'var(--brass)' }}>Election Map</div>
          </div>
          <button className="gcp-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* No data warning */}
          {!hasResults && (
            <div style={{ border: '1px solid rgba(232,184,75,0.35)', padding: '0.5rem 0.65rem', background: 'rgba(232,184,75,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <span style={{ color: 'var(--amber)', fontSize: '0.7rem', flexShrink: 0 }}>⚠</span>
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.48rem', letterSpacing: '0.08em', color: 'var(--amber)', margin: 0, lineHeight: 1.5 }}>
                  No election results available. Wait for the first election.
                </p>
              </div>
            </div>
          )}

          <div style={{ opacity: hasResults ? 1 : 0.4, pointerEvents: hasResults ? 'auto' : 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Election picker */}
            <div>
              <div className="gcp-subtitle" style={{ marginBottom: '0.35rem' }}>Select Election</div>
              <div className="emcp-select-wrap">
                <select
                  className="emcp-select"
                  value={config.selectedElectionIndex !== undefined ? config.selectedElectionIndex : 'latest'}
                  onChange={e => onConfigChange({ ...config, selectedElectionIndex: e.target.value === 'latest' ? undefined : parseInt(e.target.value, 10) })}
                >
                  <option value="latest">Latest Election</option>
                  {[...electionHistory].reverse().map((entry, i) => (
                    <option key={i} value={electionHistory.length - 1 - i}>{entry.date.getFullYear()} Election</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metric toggle */}
            <div>
              <div className="gcp-subtitle" style={{ marginBottom: '0.35rem' }}>Display Metric</div>
              <div style={{ display: 'flex', border: '1px solid var(--border)', overflow: 'hidden' }}>
                {(['vote_percentage', 'margin_gain'] as Metric[]).map((m, i) => (
                  <button
                    key={m}
                    className={`gcp-btn ${config.metric === m ? 'active' : ''}`}
                    style={{ flex: 1, borderRadius: 0, borderLeft: i > 0 ? '1px solid var(--border)' : 'none', borderTop: 'none', borderBottom: 'none', borderRight: 'none', fontSize: '0.48rem', padding: '0.3rem 0.4rem' }}
                    onClick={() => onConfigChange({ ...config, metric: m })}
                  >
                    {m === 'vote_percentage' ? 'Vote Share' : 'Swing ±'}
                  </button>
                ))}
              </div>
            </div>

            {/* Party filter */}
            <div>
              <div className="gcp-subtitle" style={{ marginBottom: '0.35rem' }}>Filter by Party</div>
              <div className="emcp-select-wrap">
                <select
                  className="emcp-select"
                  value={config.selectedPartyId || 'all'}
                  onChange={e => onConfigChange({ ...config, selectedPartyId: e.target.value })}
                >
                  <option value="all">All Parties (Winners)</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info note */}
            <div style={{ border: '1px solid var(--border)', padding: '0.45rem 0.6rem', background: 'rgba(201,168,76,0.02)' }}>
              <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                {config.metric === 'vote_percentage'
                  ? 'Colour intensity shows support strength for the selected party across constituencies.'
                  : 'Green = vote share gained. Red = vote share lost vs. previous election.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(ElectionMapControlPanel);


// ─── MapModeSelector.tsx ───────────────────────────────────────────────────────
// Drop-in replacement for the map mode control overlay inside MapComponent.
// Usage: render this as a sibling to <MapContainer> in MapComponent's return.

type MapMode = 'political' | 'population' | 'malay' | 'chinese' | 'indian' | 'others';

interface MapModeSelectorProps {
  value: MapMode;
  onChange: (mode: MapMode) => void;
}

const MAP_EXTRA = `
  .mms-select {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 0.07em;
    width: 100%;
    background: rgba(201,168,76,0.04);
    border: 1px solid var(--border);
    color: var(--text-mid);
    padding: 0.3rem 1.4rem 0.3rem 0.5rem;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }
  .mms-select:hover, .mms-select:focus { border-color: var(--border-bright); color: var(--brass); }
  .mms-select option { background: #1a1208; color: var(--text-mid); }
  .mms-wrap { position: relative; }
  .mms-wrap::after { content: '▾'; position: absolute; right: 0.45rem; top: 50%; transform: translateY(-50%); font-size: 0.5rem; color: var(--text-dim); pointer-events: none; }
`;

const GRADIENTS: Record<MapMode, { from: string; to: string; label: string } | null> = {
  political: null,
  population: { from: 'rgb(200,230,255)', to: 'rgb(0,50,150)', label: 'Low → High' },
  malay:     { from: 'rgb(240,255,240)', to: 'rgb(0,100,0)',   label: '0% → 100%' },
  chinese:   { from: 'rgb(255,240,240)', to: 'rgb(150,0,0)',   label: '0% → 100%' },
  indian:    { from: 'rgb(255,245,230)', to: 'rgb(200,100,0)', label: '0% → 100%' },
  others:    { from: 'rgb(230,230,230)', to: 'rgb(50,50,50)',  label: '0% → 100%' },
};

export const MapModeSelector: React.FC<MapModeSelectorProps> = ({ value, onChange }) => {
  const grad = GRADIENTS[value];
  return (
    <>
      <style>{GCP_BASE}{MAP_EXTRA}</style>
      <div className="gcp-panel" style={{ position: 'absolute', top: '6rem', right: '1rem', zIndex: 1000, width: '11rem', borderRadius: '2px', padding: '0.6rem 0.65rem' }}>
        <div className="gcp-subtitle" style={{ marginBottom: '0.35rem' }}>Map View</div>
        <div className="mms-wrap" style={{ marginBottom: '0.5rem' }}>
          <select className="mms-select" value={value} onChange={e => onChange(e.target.value as MapMode)}>
            <option value="political">Political Influence</option>
            <option value="population">Population Density</option>
            <option value="malay">Malay %</option>
            <option value="chinese">Chinese %</option>
            <option value="indian">Indian %</option>
            <option value="others">Others %</option>
          </select>
        </div>
        {/* Legend */}
        {grad ? (
          <div>
            <div style={{ height: '6px', border: '1px solid var(--border)', background: `linear-gradient(to right, ${grad.from}, ${grad.to})`, marginBottom: '0.25rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
              <span>{grad.label.split(' → ')[0]}</span>
              <span>{grad.label.split(' → ')[1]}</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
            <div style={{ width: '10px', height: '6px', border: '1px solid var(--border)', background: 'rgba(201,168,76,0.2)' }} />
            <span>Party colours</span>
          </div>
        )}
      </div>
    </>
  );
};