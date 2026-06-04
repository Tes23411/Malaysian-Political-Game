import React, { useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Party, PoliticalAlliance, AllianceManagementScreenProps } from '../types';

class ErrorBoundary extends React.Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
    state = { hasError: false, error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("AllianceManagementScreen Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 bg-black bg-opacity-90 z-[6000] flex items-center justify-center p-4 text-white">
                    <div className="bg-red-900 p-6 rounded-lg max-w-2xl w-full">
                        <h2 className="text-2xl font-bold mb-4">Something went wrong.</h2>
                        <pre className="bg-black p-4 rounded overflow-auto text-sm text-red-300">
                            {this.state.error?.toString()}
                        </pre>
                        <button 
                            className="mt-4 px-4 py-2 bg-white text-red-900 rounded font-bold"
                            onClick={() => window.location.reload()}
                        >
                            Reload
                        </button>
                    </div>
                </div>
            );
        }
        return (this as any).props.children;
    }
}

const AllianceManagementScreenContent: React.FC<AllianceManagementScreenProps> = ({
    playerParty,
    alliance,
    parties,
    alliances,
    onInviteParties,
    onKickParty,
    onLeaveAlliance,
    onDissolveAlliance,
    onClose
}) => {
    console.log("Rendering AllianceManagementScreen", { playerParty, alliance, parties, alliances });
    const [selectedPartyIds, setSelectedPartyIds] = useState<Set<string>>(new Set());
    const [view, setView] = useState<'members' | 'invite'>('members');
    const [hoveredPartyId, setHoveredPartyId] = useState<string | null>(null);

    const isLeader = alliance.leaderPartyId === playerParty.id;

    const availableParties = useMemo(() => {
        return parties.filter(p => {
            const alreadyInAlliance = alliances.some(a => a.memberPartyIds.includes(p.id));
            return !alreadyInAlliance;
        });
    }, [parties, alliances]);

    const handlePartyToggle = (partyId: string) => {
        const newSelection = new Set(selectedPartyIds);
        if (newSelection.has(partyId)) {
            newSelection.delete(partyId);
        } else {
            newSelection.add(partyId);
        }
        setSelectedPartyIds(newSelection);
    };

    const handleInvite = () => {
        if (selectedPartyIds.size > 0) {
            onInviteParties(Array.from(selectedPartyIds));
            setSelectedPartyIds(new Set());
            setView('members');
        }
    };

    const getLikelihood = (target: Party) => {
        const relation = playerParty.relations?.get(target.id) || 50;
        let chance = relation / 100;
        if (alliance.type === 'Alliance') chance -= 0.2;
        else chance += 0.1;

        if (chance >= 0.7) return { text: 'HIGH', value: chance, color: '#4ade80', bg: 'rgba(74,222,128,0.08)', bar: '#4ade80' };
        if (chance >= 0.4) return { text: 'MED', value: chance, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', bar: '#fbbf24' };
        return { text: 'LOW', value: chance, color: '#f87171', bg: 'rgba(248,113,113,0.08)', bar: '#f87171' };
    };

    const memberCount = alliance.memberPartyIds.length;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

                .ams-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 5000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    background: rgba(0,0,0,0.88);
                    backdrop-filter: blur(4px);
                }

                .ams-panel {
                    background: #0b0d12;
                    border: 1px solid rgba(255,255,255,0.07);
                    width: 100%;
                    max-width: 780px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.7);
                }

                .ams-panel::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, var(--accent), transparent);
                }

                .ams-panel::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: 
                        repeating-linear-gradient(
                            0deg,
                            transparent,
                            transparent 39px,
                            rgba(255,255,255,0.012) 40px
                        );
                    pointer-events: none;
                    z-index: 0;
                }

                .ams-header {
                    padding: 1.75rem 2rem 1.25rem;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    position: relative;
                    z-index: 1;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .ams-header-left {
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }

                .ams-label {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.6rem;
                    letter-spacing: 0.2em;
                    color: rgba(255,255,255,0.3);
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .ams-label::before {
                    content: '';
                    width: 12px;
                    height: 1px;
                    background: var(--accent);
                }

                .ams-title {
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 2.6rem;
                    letter-spacing: 0.04em;
                    color: #fff;
                    line-height: 1;
                    margin: 0;
                }

                .ams-meta {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 0.5rem;
                }

                .ams-badge {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.65rem;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    padding: 0.2rem 0.6rem;
                    border: 1px solid;
                    color: var(--accent);
                    border-color: rgba(var(--accent-rgb), 0.4);
                    background: rgba(var(--accent-rgb), 0.07);
                }

                .ams-count {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.65rem;
                    color: rgba(255,255,255,0.3);
                    letter-spacing: 0.08em;
                }

                .ams-close {
                    width: 36px;
                    height: 36px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: transparent;
                    color: rgba(255,255,255,0.4);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    transition: all 0.15s;
                    flex-shrink: 0;
                    margin-top: 0.2rem;
                }

                .ams-close:hover {
                    background: rgba(255,255,255,0.06);
                    color: #fff;
                    border-color: rgba(255,255,255,0.25);
                }

                .ams-tabs {
                    padding: 0 2rem;
                    display: flex;
                    gap: 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    position: relative;
                    z-index: 1;
                }

                .ams-tab {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.65rem;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    padding: 0.85rem 1.4rem 0.75rem;
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.28);
                    cursor: pointer;
                    position: relative;
                    transition: color 0.15s;
                    border-bottom: 2px solid transparent;
                    margin-bottom: -1px;
                }

                .ams-tab:hover {
                    color: rgba(255,255,255,0.6);
                }

                .ams-tab.active {
                    color: #fff;
                    border-bottom-color: var(--accent);
                }

                .ams-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem 2rem;
                    position: relative;
                    z-index: 1;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255,255,255,0.1) transparent;
                }

                .ams-body::-webkit-scrollbar { width: 3px; }
                .ams-body::-webkit-scrollbar-track { background: transparent; }
                .ams-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }

                /* Member Cards */
                .ams-section-label {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.58rem;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.2);
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .ams-section-label::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: rgba(255,255,255,0.06);
                }

                .ams-member {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.25rem;
                    margin-bottom: 0.5rem;
                    border: 1px solid rgba(255,255,255,0.05);
                    background: rgba(255,255,255,0.02);
                    transition: all 0.15s;
                    position: relative;
                    overflow: hidden;
                }

                .ams-member::before {
                    content: '';
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    width: 3px;
                    background: var(--party-color);
                }

                .ams-member:hover {
                    background: rgba(255,255,255,0.04);
                    border-color: rgba(255,255,255,0.1);
                }

                .ams-member-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .ams-party-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    box-shadow: 0 0 8px var(--party-color);
                }

                .ams-member-info {}

                .ams-member-name {
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 600;
                    font-size: 0.9rem;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .ams-you-tag {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.55rem;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: var(--accent);
                    border: 1px solid rgba(var(--accent-rgb), 0.4);
                    padding: 0.1rem 0.4rem;
                }

                .ams-member-role {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.6rem;
                    letter-spacing: 0.08em;
                    color: rgba(255,255,255,0.3);
                    margin-top: 0.15rem;
                    text-transform: uppercase;
                }

                .ams-leader-crown {
                    font-size: 0.7rem;
                    opacity: 0.7;
                }

                .ams-kick-btn {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.6rem;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    padding: 0.35rem 0.8rem;
                    border: 1px solid rgba(248,113,113,0.3);
                    background: transparent;
                    color: rgba(248,113,113,0.6);
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .ams-kick-btn:hover {
                    background: rgba(248,113,113,0.1);
                    color: #f87171;
                    border-color: rgba(248,113,113,0.6);
                }

                /* Invite Cards */
                .ams-invite-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.9rem 1.25rem;
                    margin-bottom: 0.4rem;
                    border: 1px solid rgba(255,255,255,0.05);
                    background: rgba(255,255,255,0.02);
                    cursor: pointer;
                    transition: all 0.15s;
                    position: relative;
                    overflow: hidden;
                }

                .ams-invite-card::before {
                    content: '';
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    width: 3px;
                    background: var(--party-color);
                    opacity: 0.4;
                    transition: opacity 0.15s;
                }

                .ams-invite-card:hover::before,
                .ams-invite-card.selected::before {
                    opacity: 1;
                }

                .ams-invite-card:hover {
                    background: rgba(255,255,255,0.04);
                    border-color: rgba(255,255,255,0.1);
                }

                .ams-invite-card.selected {
                    background: rgba(var(--accent-rgb), 0.05);
                    border-color: rgba(var(--accent-rgb), 0.2);
                }

                .ams-invite-left {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                }

                .ams-invite-name {
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 500;
                    font-size: 0.875rem;
                    color: #fff;
                }

                .ams-invite-right {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }

                .ams-likelihood {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.2rem;
                }

                .ams-likelihood-label {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.55rem;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.2);
                }

                .ams-likelihood-value {
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 0.95rem;
                    letter-spacing: 0.08em;
                }

                .ams-likelihood-bar {
                    width: 48px;
                    height: 2px;
                    background: rgba(255,255,255,0.08);
                    position: relative;
                    overflow: hidden;
                }

                .ams-likelihood-fill {
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    transition: width 0.3s;
                }

                .ams-checkbox {
                    width: 18px;
                    height: 18px;
                    border: 1px solid rgba(255,255,255,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s;
                    flex-shrink: 0;
                }

                .ams-checkbox.checked {
                    background: var(--accent);
                    border-color: var(--accent);
                }

                .ams-checkbox-mark {
                    color: #000;
                    font-size: 0.65rem;
                    font-weight: bold;
                    line-height: 1;
                }

                /* Footer */
                .ams-footer {
                    padding: 1.25rem 2rem;
                    border-top: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: relative;
                    z-index: 1;
                    background: rgba(0,0,0,0.3);
                }

                .ams-danger-btn {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.65rem;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    padding: 0.6rem 1.25rem;
                    border: 1px solid rgba(248,113,113,0.25);
                    background: transparent;
                    color: rgba(248,113,113,0.5);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .ams-danger-btn:hover {
                    background: rgba(248,113,113,0.08);
                    color: #f87171;
                    border-color: rgba(248,113,113,0.5);
                }

                .ams-invite-confirm-btn {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.65rem;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    padding: 0.6rem 1.5rem;
                    border: 1px solid var(--accent);
                    background: rgba(var(--accent-rgb), 0.12);
                    color: var(--accent);
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .ams-invite-confirm-btn:hover {
                    background: rgba(var(--accent-rgb), 0.2);
                }

                .ams-close-btn {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.65rem;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    padding: 0.6rem 1.25rem;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: transparent;
                    color: rgba(255,255,255,0.45);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .ams-close-btn:hover {
                    background: rgba(255,255,255,0.05);
                    color: #fff;
                    border-color: rgba(255,255,255,0.25);
                }

                .ams-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 0;
                    gap: 0.75rem;
                }

                .ams-empty-icon {
                    font-size: 2rem;
                    opacity: 0.15;
                }

                .ams-empty-text {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.65rem;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.2);
                }

                .ams-divider-row {
                    display: grid;
                    grid-template-columns: 1fr 1px 1fr;
                    gap: 0;
                    margin-bottom: 1.5rem;
                }

                .ams-stat-block {
                    padding: 0.75rem 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.15rem;
                }

                .ams-stat-block:first-child {
                    padding-right: 1.5rem;
                }

                .ams-stat-block:last-child {
                    padding-left: 1.5rem;
                }

                .ams-stat-val {
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 1.8rem;
                    letter-spacing: 0.04em;
                    color: #fff;
                    line-height: 1;
                }

                .ams-stat-key {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.55rem;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.25);
                }

                .ams-vr {
                    background: rgba(255,255,255,0.06);
                }
            `}</style>

            <div
                className="ams-overlay"
                style={{ '--accent': '#818cf8', '--accent-rgb': '129,140,248' } as React.CSSProperties}
            >
                <div className="ams-panel">
                    {/* Header */}
                    <div className="ams-header">
                        <div className="ams-header-left">
                            <div className="ams-label">Political Alliance</div>
                            <h2 className="ams-title">{alliance.name}</h2>
                            <div className="ams-meta">
                                <span className="ams-badge">{alliance.type}</span>
                                <span className="ams-count">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                                {isLeader && (
                                    <span className="ams-badge" style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.07)' }}>
                                        ★ Leader
                                    </span>
                                )}
                            </div>
                        </div>
                        <button className="ams-close" onClick={onClose}>✕</button>
                    </div>

                    {/* Stats bar */}
                    <div style={{ padding: '0.75rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '2rem', position: 'relative', zIndex: 1 }}>
                        <div>
                            <div className="ams-stat-key">Members</div>
                            <div className="ams-stat-val" style={{ fontSize: '1.4rem' }}>{memberCount}</div>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <div>
                            <div className="ams-stat-key">Type</div>
                            <div className="ams-stat-val" style={{ fontSize: '1.4rem' }}>{alliance.type}</div>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <div>
                            <div className="ams-stat-key">Your Role</div>
                            <div className="ams-stat-val" style={{ fontSize: '1.4rem', color: isLeader ? '#fbbf24' : 'rgba(255,255,255,0.6)' }}>
                                {isLeader ? 'Leader' : 'Member'}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="ams-tabs">
                        <button
                            className={`ams-tab ${view === 'members' ? 'active' : ''}`}
                            onClick={() => setView('members')}
                        >
                            Members
                        </button>
                        {isLeader && (
                            <button
                                className={`ams-tab ${view === 'invite' ? 'active' : ''}`}
                                onClick={() => setView('invite')}
                            >
                                Invite Parties
                                {availableParties.length > 0 && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontFamily: 'DM Mono, monospace',
                                        fontSize: '0.55rem',
                                        background: 'rgba(129,140,248,0.2)',
                                        color: '#818cf8',
                                        padding: '0.1rem 0.35rem',
                                        borderRadius: '2px'
                                    }}>
                                        {availableParties.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="ams-body">
                        {view === 'members' && (
                            <div>
                                <div className="ams-section-label">Alliance Roster</div>
                                {alliance.memberPartyIds.map(partyId => {
                                    const p = parties.find(p => p.id === partyId);
                                    if (!p) return null;
                                    const isPartyLeader = p.id === alliance.leaderPartyId;
                                    const isPlayer = p.id === playerParty.id;

                                    return (
                                        <div
                                            key={p.id}
                                            className="ams-member"
                                            style={{ '--party-color': p.color } as React.CSSProperties}
                                        >
                                            <div className="ams-member-left">
                                                <div
                                                    className="ams-party-dot"
                                                    style={{ background: p.color, '--party-color': p.color } as React.CSSProperties}
                                                />
                                                <div className="ams-member-info">
                                                    <div className="ams-member-name">
                                                        {isPartyLeader && <span className="ams-leader-crown">★</span>}
                                                        {p.name}
                                                        {isPlayer && <span className="ams-you-tag">You</span>}
                                                    </div>
                                                    <div className="ams-member-role">
                                                        {isPartyLeader ? 'Alliance Leader' : 'Member'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {isLeader && !isPartyLeader && (
                                                    <button
                                                        className="ams-kick-btn"
                                                        onClick={() => onKickParty(p.id)}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {view === 'invite' && isLeader && (
                            <div>
                                <div className="ams-section-label">Available Parties</div>
                                {availableParties.length === 0 ? (
                                    <div className="ams-empty">
                                        <div className="ams-empty-icon">◌</div>
                                        <div className="ams-empty-text">No parties available to invite</div>
                                    </div>
                                ) : (
                                    <div>
                                        {availableParties.map(p => {
                                            const likelihood = getLikelihood(p);
                                            const isSelected = selectedPartyIds.has(p.id);
                                            const fillPct = Math.round(likelihood.value * 100);

                                            return (
                                                <div
                                                    key={p.id}
                                                    className={`ams-invite-card ${isSelected ? 'selected' : ''}`}
                                                    style={{ '--party-color': p.color } as React.CSSProperties}
                                                    onClick={() => handlePartyToggle(p.id)}
                                                >
                                                    <div className="ams-invite-left">
                                                        <div
                                                            className="ams-party-dot"
                                                            style={{
                                                                background: p.color,
                                                                '--party-color': p.color,
                                                                boxShadow: `0 0 8px ${p.color}`
                                                            } as React.CSSProperties}
                                                        />
                                                        <span className="ams-invite-name">{p.name}</span>
                                                    </div>
                                                    <div className="ams-invite-right">
                                                        <div className="ams-likelihood">
                                                            <span className="ams-likelihood-label">Likelihood</span>
                                                            <span
                                                                className="ams-likelihood-value"
                                                                style={{ color: likelihood.color }}
                                                            >
                                                                {likelihood.text}
                                                            </span>
                                                            <div className="ams-likelihood-bar">
                                                                <div
                                                                    className="ams-likelihood-fill"
                                                                    style={{
                                                                        width: `${Math.min(100, fillPct)}%`,
                                                                        background: likelihood.bar
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className={`ams-checkbox ${isSelected ? 'checked' : ''}`}>
                                                            {isSelected && <span className="ams-checkbox-mark">✓</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="ams-footer">
                        <div>
                            {isLeader ? (
                                <button className="ams-danger-btn" onClick={onDissolveAlliance}>
                                    Dissolve Alliance
                                </button>
                            ) : (
                                <button className="ams-danger-btn" onClick={onLeaveAlliance}>
                                    Leave Alliance
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {view === 'invite' && selectedPartyIds.size > 0 && (
                                <button className="ams-invite-confirm-btn" onClick={handleInvite}>
                                    <span>Send Invitations</span>
                                    <span style={{
                                        background: 'var(--accent)',
                                        color: '#000',
                                        fontFamily: 'DM Mono, monospace',
                                        fontSize: '0.6rem',
                                        padding: '0.1rem 0.45rem',
                                        fontWeight: 700
                                    }}>
                                        {selectedPartyIds.size}
                                    </span>
                                </button>
                            )}
                            <button className="ams-close-btn" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const AllianceManagementScreen: React.FC<AllianceManagementScreenProps> = (props) => {
    return (
        <ErrorBoundary>
            <AllianceManagementScreenContent {...props} />
        </ErrorBoundary>
    );
};

export default AllianceManagementScreen;