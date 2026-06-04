import React from 'react';

interface MusicControlsProps {
  isStarted: boolean;
  onStart: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentMood: string;
}

const MC_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

  .mc-root {
    --brass: #c9a84c;
    --border: rgba(201,168,76,0.25);
    --border-bright: rgba(201,168,76,0.6);
    --text-dim: rgba(201,168,76,0.45);
    --text-mid: rgba(201,168,76,0.7);
    --amber: #e8b84b;
    font-family: 'Share Tech Mono', monospace;
    background: linear-gradient(180deg, #1a1208 0%, #120d05 100%);
    border: 1px solid var(--border-bright);
    padding: 0.45rem 0.85rem;
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    position: relative;
    overflow: hidden;
  }

  .mc-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      90deg, transparent, transparent 59px,
      rgba(201,168,76,0.03) 60px
    );
    pointer-events: none;
  }

  .mc-label {
    font-size: 0.48rem;
    letter-spacing: 0.2em;
    color: var(--text-dim);
    text-transform: uppercase;
    display: block;
    margin-bottom: 0.15rem;
  }

  .mc-btn {
    border: 1px solid var(--border-bright);
    background: transparent;
    color: var(--text-mid);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.3rem 0.7rem;
    white-space: nowrap;
  }
  .mc-btn:hover {
    background: rgba(201,168,76,0.12);
    color: var(--brass);
    border-color: var(--brass);
  }

  .mc-icon-btn {
    width: 28px; height: 28px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-mid);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    padding: 0;
  }
  .mc-icon-btn:hover { background: rgba(201,168,76,0.1); color: var(--brass); border-color: var(--border-bright); }
  .mc-icon-btn.muted  { border-color: rgba(224,92,58,0.4); color: rgba(224,92,58,0.7); }
  .mc-icon-btn.muted:hover { background: rgba(224,92,58,0.1); color: #e05c3a; }

  .mc-sep { width: 1px; height: 24px; background: var(--border); flex-shrink: 0; }

  .mc-mood {
    font-size: 0.55rem;
    letter-spacing: 0.08em;
    color: var(--amber);
    background: rgba(201,168,76,0.08);
    border: 1px solid var(--border);
    padding: 0.15rem 0.45rem;
    text-transform: capitalize;
  }

  .mc-block { display: flex; flex-direction: column; }

  .mc-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 72px; height: 3px;
    background: rgba(201,168,76,0.2);
    border-radius: 0;
    outline: none;
    cursor: pointer;
  }
  .mc-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 9px; height: 9px;
    background: var(--brass);
    border-radius: 0;
    cursor: pointer;
  }
  .mc-slider::-moz-range-thumb {
    width: 9px; height: 9px;
    background: var(--brass);
    border-radius: 0;
    border: none;
  }

  .mc-vol-out { font-size: 0.45rem; color: var(--text-dim); letter-spacing: 0.12em; }
`;

const VolumeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>
);

const MuteIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
);

export const MusicControls: React.FC<MusicControlsProps> = ({
  isStarted, onStart, volume, onVolumeChange, isMuted, onToggleMute, currentMood,
}) => {
  const volPct = Math.round((isMuted ? 0 : volume) * 100);

  return (
    <>
      <style>{MC_STYLES}</style>
      <div className="mc-root">
        {!isStarted ? (
          <button className="mc-btn" onClick={onStart}>▶ Start Music</button>
        ) : (
          <>
            {/* Volume */}
            <div className="mc-block">
              <span className="mc-label">Volume</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  className={`mc-icon-btn ${isMuted || volume === 0 ? 'muted' : ''}`}
                  onClick={onToggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
                </button>
                <input
                  className="mc-slider"
                  type="range"
                  min="0" max="1" step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={e => onVolumeChange(parseFloat(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, rgba(201,168,76,0.7) ${volPct}%, rgba(201,168,76,0.15) ${volPct}%)`
                  }}
                />
                <span className="mc-vol-out">{isMuted ? 'muted' : `${volPct}%`}</span>
              </div>
            </div>

            <div className="mc-sep" />

            {/* Mood */}
            <div className="mc-block">
              <span className="mc-label">Mood</span>
              <span className="mc-mood">{currentMood}</span>
            </div>
          </>
        )}
      </div>
    </>
  );
};