import React, { useState, useEffect } from 'react';
import { Speed, PlaySpeedValue } from '../types';
import { Globe, Map, Users, ScrollText, TrendingUp, Landmark, History, Target, Play, Pause, Eye, EyeOff, Music, Volume2, VolumeX } from 'lucide-react';

interface GameControlPanelProps {
  currentDate: Date;
  currentSpeed: Speed;
  onSpeedChange: (speed: PlaySpeedValue) => void;
  onPlay: () => void;
  onPause: () => void;
  nextElectionDate: Date | null;
  onShowParliament: () => void;
  onShowGovernment?: () => void;
  electionHappened: boolean;
  onOpenHistory: () => void;
  isElectionClose: boolean;
  onOpenParties: () => void;
  onOpenAlliances?: () => void;
  onOpenPartyGraph?: () => void;
  observeMode: boolean;
  onToggleObserveMode: () => void;
  onToggleLog: () => void;
  unreadLogCount: number;
  onOpenCountryInfo: () => void;
  onToggleElectionMap: () => void;
  isElectionMapActive: boolean;
  onOpenEconomy?: () => void;
  isEconomyVisible?: boolean;
  onOpenEcoHistory?: () => void;
  onShowLaws?: () => void;
  isLawsVisible?: boolean;
  onOpenMissions?: () => void;
  onOpenPolls?: () => void;
  malapportionmentScore?: number;
  // Music props — pass these in to render music controls inline (no overlap)
  musicStarted?: boolean;
  onMusicStart?: () => void;
  musicVolume?: number;
  onMusicVolumeChange?: (vol: number) => void;
  isMusicMuted?: boolean;
  onToggleMusicMute?: () => void;
  currentMusicMood?: string;
}

const speedLevels: { label: string; value: PlaySpeedValue }[] = [
  { label: '1×', value: 2000 },
  { label: '2×', value: 500 },
  { label: '4×', value: 125 },
  { label: '8×', value: 50 },
  { label: '16×', value: 5 },
];

const GCP_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Share+Tech+Mono&display=swap');

  .gcp-root {
    --brass: #c9a84c;
    --brass-dim: #8a6f2e;
    --amber: #e8b84b;
    --ink: #1a1208;
    --parchment: #2a1f0e;
    --border: rgba(201,168,76,0.25);
    --border-bright: rgba(201,168,76,0.6);
    --text-dim: rgba(201,168,76,0.45);
    --text-mid: rgba(201,168,76,0.7);
    font-family: 'Crimson Text', serif;
    background: linear-gradient(180deg, #1a1208 0%, #120d05 100%);
    border-bottom: 1px solid var(--border-bright);
    padding: 0.55rem 1.25rem;
    position: relative;
    overflow: hidden;
  }

  .gcp-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 119px,
      rgba(201,168,76,0.03) 120px
    );
    pointer-events: none;
  }

  .gcp-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    position: relative;
    z-index: 1;
  }

  /* DATE BLOCK */
  .gcp-date {
    display: flex;
    flex-direction: column;
    line-height: 1;
    padding: 0.3rem 0.75rem 0.3rem 0;
    border-right: 1px solid var(--border);
    margin-right: 0.25rem;
  }
  .gcp-date-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.5rem;
    letter-spacing: 0.2em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 0.15rem;
  }
  .gcp-date-value {
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--brass);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* ELECTION BLOCK */
  .gcp-election {
    display: flex;
    flex-direction: column;
    padding: 0.3rem 0.75rem;
    border-right: 1px solid var(--border);
    line-height: 1;
  }
  .gcp-election-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.5rem;
    letter-spacing: 0.2em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 0.15rem;
  }
  .gcp-election-value {
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--amber);
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }
  .gcp-election-value.urgent {
    color: #e05c3a;
    animation: gcp-flicker 1.5s ease-in-out infinite;
  }
  .gcp-election-days {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.6rem;
    color: var(--text-mid);
    padding: 0.1rem 0.35rem;
    border: 1px solid var(--border);
    border-radius: 2px;
  }
  .gcp-election-days.urgent {
    color: #e05c3a;
    border-color: rgba(224,92,58,0.5);
    animation: gcp-flicker 1.5s ease-in-out infinite;
  }

  /* DEMOCRACY INDEX BLOCK */
  .gcp-democracy {
    display: flex;
    flex-direction: column;
    padding: 0.3rem 0.75rem;
    border-right: 1px solid var(--border);
    line-height: 1;
  }
  .gcp-democracy-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.5rem;
    letter-spacing: 0.2em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 0.15rem;
  }
  .gcp-democracy-value {
    font-family: 'Cinzel', serif;
    font-weight: 600;
    display: flex;
    align-items: baseline;
  }

  /* OBSERVE TOGGLE */
  .gcp-observe {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0 0.5rem;
    border-right: 1px solid var(--border);
  }
  .gcp-observe-btn {
    width: 30px; height: 30px;
    border: 1px solid var(--border-bright);
    background: transparent;
    color: var(--text-mid);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-size: 0.75rem;
  }
  .gcp-observe-btn:hover, .gcp-observe-btn.active {
    background: rgba(201,168,76,0.12);
    color: var(--brass);
    border-color: var(--brass);
  }
  .gcp-observe-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.42rem;
    letter-spacing: 0.15em;
    color: var(--text-dim);
    text-transform: uppercase;
  }

  /* ACTION BUTTONS */
  .gcp-actions {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .gcp-btn {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.35rem 0.65rem;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-mid);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    position: relative;
  }
  .gcp-btn:hover {
    background: rgba(201,168,76,0.08);
    color: var(--brass);
    border-color: var(--border-bright);
  }
  .gcp-btn.active {
    background: rgba(201,168,76,0.15);
    color: var(--amber);
    border-color: var(--brass);
  }
  .gcp-btn.highlight {
    border-color: rgba(99,160,100,0.5);
    color: rgba(99,160,100,0.8);
  }
  .gcp-btn.highlight:hover {
    background: rgba(99,160,100,0.1);
    color: #7fc880;
    border-color: rgba(99,160,100,0.8);
  }
  .gcp-btn.gov {
    border-color: rgba(100,140,220,0.4);
    color: rgba(140,170,230,0.8);
  }
  .gcp-btn.gov:hover {
    background: rgba(100,140,220,0.08);
    color: #8faaee;
    border-color: rgba(100,140,220,0.7);
  }
  .gcp-badge {
    position: absolute;
    top: -5px; right: -5px;
    min-width: 14px; height: 14px;
    background: #c0392b;
    color: #fff;
    font-size: 0.45rem;
    font-family: 'Share Tech Mono', monospace;
    display: flex; align-items: center; justify-content: center;
    border-radius: 7px;
    padding: 0 3px;
    border: 1px solid #1a1208;
    font-weight: bold;
  }

  /* SEPARATOR */
  .gcp-sep {
    width: 1px; height: 28px;
    background: var(--border);
    flex-shrink: 0;
  }

  /* SPEED CONTROLS */
  .gcp-speed {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding-left: 0.5rem;
    border-left: 1px solid var(--border);
  }
  .gcp-speed-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.48rem;
    letter-spacing: 0.15em;
    color: var(--text-dim);
    text-transform: uppercase;
    writing-mode: horizontal-tb;
    margin-right: 0.15rem;
  }
  .gcp-play-btn {
    width: 30px; height: 30px;
    border: 1px solid rgba(99,160,100,0.5);
    background: transparent;
    color: rgba(99,160,100,0.8);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    font-size: 0.7rem;
  }
  .gcp-play-btn:hover {
    background: rgba(99,160,100,0.12);
    color: #7fc880;
    border-color: rgba(99,160,100,0.8);
  }
  .gcp-pause-btn {
    width: 30px; height: 30px;
    border: 1px solid var(--border);
    background: rgba(201,168,76,0.06);
    color: var(--text-mid);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    font-size: 0.7rem;
  }
  .gcp-pause-btn:hover {
    background: rgba(201,168,76,0.12);
    color: var(--brass);
  }
  .gcp-speed-btn {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.6rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
    min-width: 32px;
    text-align: center;
  }
  .gcp-speed-btn:hover:not(:disabled) {
    background: rgba(201,168,76,0.08);
    color: var(--text-mid);
    border-color: var(--border-bright);
  }
  .gcp-speed-btn.active {
    background: rgba(201,168,76,0.18);
    color: var(--amber);
    border-color: var(--brass);
    box-shadow: 0 0 8px rgba(201,168,76,0.15);
  }
  .gcp-speed-btn:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }

  @keyframes gcp-flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.65; }
  }

  .gcp-music {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 0.65rem;
    border-left: 1px solid var(--border);
    flex-shrink: 0;
  }
  .gcp-music-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.48rem;
    letter-spacing: 0.18em;
    color: var(--text-dim);
    text-transform: uppercase;
    display: block;
    margin-bottom: 0.12rem;
  }
  .gcp-music-start {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.3rem 0.65rem;
    border: 1px solid var(--border-bright);
    background: transparent;
    color: var(--text-mid);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .gcp-music-start:hover { background: rgba(201,168,76,0.1); color: var(--brass); }
  .gcp-music-mute {
    width: 26px; height: 26px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-mid);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    font-size: 0.65rem;
    flex-shrink: 0;
  }
  .gcp-music-mute:hover { background: rgba(201,168,76,0.1); color: var(--brass); border-color: var(--border-bright); }
  .gcp-music-mute.muted { border-color: rgba(224,92,58,0.4); color: rgba(224,92,58,0.6); }
  .gcp-music-mute.muted:hover { background: rgba(224,92,58,0.08); color: #e05c3a; }
  .gcp-music-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 58px; height: 3px;
    border-radius: 0;
    outline: none;
    cursor: pointer;
    flex-shrink: 0;
  }
  .gcp-music-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 8px; height: 8px;
    background: var(--brass);
    border-radius: 0;
    cursor: pointer;
  }
  .gcp-music-slider::-moz-range-thumb {
    width: 8px; height: 8px;
    background: var(--brass);
    border-radius: 0; border: none;
  }
  .gcp-music-mood {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.5rem;
    letter-spacing: 0.08em;
    text-transform: capitalize;
    color: var(--amber);
    background: rgba(201,168,76,0.07);
    border: 1px solid var(--border);
    padding: 0.12rem 0.4rem;
    white-space: nowrap;
  }
`;

const GameControlPanel: React.FC<GameControlPanelProps> = ({
  currentDate, currentSpeed, onSpeedChange, onPlay, onPause,
  nextElectionDate, onShowParliament, onShowGovernment, electionHappened, onOpenHistory,
  isElectionClose, onOpenParties, onOpenAlliances, onOpenPartyGraph, observeMode, onToggleObserveMode,
  onToggleLog, unreadLogCount, onOpenCountryInfo, onToggleElectionMap,
  isElectionMapActive, onOpenEconomy, isEconomyVisible, onOpenEcoHistory, onShowLaws, isLawsVisible, onOpenMissions, onOpenPolls,
  musicStarted, onMusicStart, musicVolume = 0.5, onMusicVolumeChange,
  isMusicMuted, onToggleMusicMute, currentMusicMood,
  malapportionmentScore
}) => {
  const isPaused = currentSpeed === null;
  const [daysUntil, setDaysUntil] = useState<number | null>(null);

  useEffect(() => {
    if (nextElectionDate) {
      setDaysUntil(Math.ceil((nextElectionDate.getTime() - currentDate.getTime()) / 86400000));
    }
  }, [nextElectionDate, currentDate]);

  const dateStr = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <>
      <style>{GCP_STYLES}</style>
      <div className="gcp-root">
        <div className="gcp-inner">

          {/* Observe */}
          <div className="gcp-observe">
            <button
              className={`gcp-observe-btn ${observeMode ? 'active' : ''}`}
              onClick={onToggleObserveMode}
              title={observeMode ? 'Observe Mode' : 'Manual Mode'}
            >
              {observeMode ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <span className="gcp-observe-label">{observeMode ? 'Watch' : 'Play'}</span>
          </div>

          {/* Date */}
          <div className="gcp-date">
            <span className="gcp-date-label">Current Date</span>
            <span className="gcp-date-value">{dateStr}</span>
          </div>

          {/* Election */}
          {nextElectionDate && (
            <div className="gcp-election">
              <span className="gcp-election-label">Next Election</span>
              <div className={`gcp-election-value ${isElectionClose ? 'urgent' : ''}`}>
                <span>{nextElectionDate.getFullYear()}</span>
                {daysUntil !== null && (
                  <span className={`gcp-election-days ${isElectionClose ? 'urgent' : ''}`}>
                    {daysUntil}d
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Democracy Index */}
          {malapportionmentScore !== undefined && (
            <div className="gcp-democracy">
              <span className="gcp-democracy-label">Democracy Index</span>
              <div 
                className="gcp-democracy-value font-bold" 
                style={{ 
                  color: malapportionmentScore <= 1.5 ? '#2ecc71' : 
                         malapportionmentScore <= 3.0 ? '#f1c40f' : 
                         malapportionmentScore <= 5.0 ? '#e67e22' : '#e74c3c' 
                }}
              >
                <span className="text-[0.9rem] flex items-center">
                  {(10.0 - malapportionmentScore).toFixed(1)}/10
                </span>
                <span className="text-[0.55rem] font-mono opacity-80 ml-1.5" style={{ color: 'rgba(201,168,76,0.8)' }}>
                  [{malapportionmentScore.toFixed(1)}:1]
                </span>
              </div>
            </div>
          )}

          <div className="gcp-sep" />

          {/* Action Buttons */}
          <div className="gcp-actions">
            <button className="gcp-btn" onClick={onOpenCountryInfo} title="Nation Info"><Globe size={14} style={{ marginRight: '4px' }} />Nation</button>
            <button className={`gcp-btn ${isElectionMapActive ? 'active' : ''}`} onClick={onToggleElectionMap} title="Election Map"><Map size={14} style={{ marginRight: '4px' }} />Map</button>
            <button className="gcp-btn" onClick={onOpenParties} title="Parties"><Users size={14} style={{ marginRight: '4px' }} />Parties</button>
            {onOpenPartyGraph && (
              <button className="gcp-btn" onClick={onOpenPartyGraph} title="Party Network"><History size={14} style={{ marginRight: '4px' }} />Party Graph</button>
            )}
            {onOpenAlliances && (
              <button className="gcp-btn" onClick={onOpenAlliances} title="Alliances"><Users size={14} style={{ marginRight: '4px' }} />Alliances</button>
            )}
            <button className="gcp-btn" onClick={onToggleLog} style={{ position: 'relative' }} title="Event Log">
              <ScrollText size={14} style={{ marginRight: '4px' }} />Log
              {unreadLogCount > 0 && (
                <span className="gcp-badge">{unreadLogCount > 9 ? '9+' : unreadLogCount}</span>
              )}
            </button>
            {onOpenPolls && (
              <button className="gcp-btn" onClick={onOpenPolls} title="National Polls"><Globe size={14} style={{ marginRight: '4px' }} />Polls</button>
            )}

            {electionHappened && (
              <>
                {onOpenEconomy && (
                  <button className={`gcp-btn highlight ${isEconomyVisible ? 'active' : ''}`} onClick={onOpenEconomy} title="Economy"><TrendingUp size={14} style={{ marginRight: '4px' }} />Economy</button>
                )}
                {onOpenEcoHistory && (
                  <button className="gcp-btn highlight" onClick={onOpenEcoHistory} title="Economic History"><TrendingUp size={14} style={{ marginRight: '4px' }} />Eco History</button>
                )}
                {onShowGovernment && (
                  <button className="gcp-btn gov" onClick={onShowGovernment} title="Government"><Landmark size={14} style={{ marginRight: '4px' }} />Government</button>
                )}
                <button className="gcp-btn gov" onClick={onShowParliament} title="Parliament"><Landmark size={14} style={{ marginRight: '4px' }} />Parliament</button>
                {onShowLaws && (
                  <button className={`gcp-btn gov ${isLawsVisible ? 'active' : ''}`} onClick={onShowLaws} title="Active Laws"><ScrollText size={14} style={{ marginRight: '4px' }} />Laws</button>
                )}
                <button className="gcp-btn gov" onClick={onOpenHistory} title="Election History"><History size={14} style={{ marginRight: '4px' }} />History</button>
                {onOpenMissions && (
                  <button className="gcp-btn gov" onClick={onOpenMissions} title="Missions"><Target size={14} style={{ marginRight: '4px' }} />Missions</button>
                )}
              </>
            )}
          </div>

          <div className="gcp-sep" />

          {/* Speed */}
          <div className="gcp-speed">
            <span className="gcp-speed-label">Speed</span>
            {isPaused ? (
              <button className="gcp-play-btn" onClick={onPlay} aria-label="Play" title="Play"><Play size={14} fill="currentColor" /></button>
            ) : (
              <button className="gcp-pause-btn" onClick={onPause} aria-label="Pause" title="Pause"><Pause size={14} fill="currentColor" /></button>
            )}
            {speedLevels.map(({ label, value }) => {
              const disabled = isElectionClose && value < 125;
              const active = !isPaused && currentSpeed === value;
              return (
                <button
                  key={label}
                  className={`gcp-speed-btn ${active ? 'active' : ''}`}
                  onClick={() => !disabled && onSpeedChange(value)}
                  disabled={disabled}
                  title={disabled ? 'Speed restricted near election' : ''}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Music — inline, no overlap */}
          {(onMusicStart || musicStarted) && (
            <div className="gcp-music">
              {!musicStarted ? (
                <button className="gcp-music-start" onClick={onMusicStart} title="Start Music"><Music size={14} style={{ marginRight: '4px' }} />Music</button>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="gcp-music-label">Music</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        className={`gcp-music-mute ${isMusicMuted || musicVolume === 0 ? 'muted' : ''}`}
                        onClick={onToggleMusicMute}
                        title={isMusicMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMusicMuted || musicVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
                      <input
                        className="gcp-music-slider"
                        type="range"
                        min="0" max="1" step="0.01"
                        value={isMusicMuted ? 0 : musicVolume}
                        onChange={e => onMusicVolumeChange?.(parseFloat(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, rgba(201,168,76,0.65) ${Math.round((isMusicMuted ? 0 : musicVolume) * 100)}%, rgba(201,168,76,0.12) ${Math.round((isMusicMuted ? 0 : musicVolume) * 100)}%)`
                        }}
                      />
                    </div>
                  </div>
                  {currentMusicMood && (
                    <span className="gcp-music-mood">{currentMusicMood}</span>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default React.memo(GameControlPanel);