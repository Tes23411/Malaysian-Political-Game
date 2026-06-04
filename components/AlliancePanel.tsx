import React, { useState } from 'react';
import { PoliticalAlliance, Party, Character } from '../types';
import { GCP_BASE } from '../gcpTheme';

interface AlliancePanelProps {
  alliances: PoliticalAlliance[];
  parties: Party[];
  characters: Character[];
  onClose: () => void;
}

const AlliancePanel: React.FC<AlliancePanelProps> = ({ alliances, parties, characters, onClose }) => {
  const [selectedAllianceId, setSelectedAllianceId] = useState<string | null>(alliances.length > 0 ? alliances[0].id : null);

  const selectedAlliance = alliances.find(a => a.id === selectedAllianceId);

  return (
    <>
      <style>{GCP_BASE}</style>
      <div className="gcp-modal-backdrop">
        <div className="gcp-panel gcp-fade-in" style={{ width: '100%', maxWidth: '960px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '2px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="gcp-subtitle" style={{ marginBottom: '0.2rem' }}>Federation of Malaya</div>
              <h2 className="gcp-title" style={{ fontSize: '1.4rem', margin: 0 }}>Political Alliances</h2>
            </div>
            <button className="gcp-close-btn" onClick={onClose}>✕</button>
          </div>

          {/* Body Layout */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            
            {/* Sidebar: Alliance List */}
            <div className="gcp-scroll" style={{ width: '300px', borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
              {alliances.length === 0 ? (
                <div style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--text-dim)', textAlign: 'center', marginTop: '2rem' }}>
                  No active alliances.
                </div>
              ) : (
                alliances.map(alliance => {
                  const isSelected = selectedAllianceId === alliance.id;
                  return (
                    <div
                      key={alliance.id}
                      onClick={() => setSelectedAllianceId(alliance.id)}
                      style={{
                        padding: '0.8rem',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--brass)' : 'var(--border)'}`,
                        background: isSelected ? 'rgba(201,168,76,0.08)' : 'transparent',
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onMouseEnter={e => !isSelected && (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                      onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', fontWeight: 600, color: isSelected ? 'var(--brass)' : 'var(--text-main)' }}>
                        {alliance.name}
                      </div>
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {alliance.type} • {alliance.memberPartyIds.length} members
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Main Content: Alliance Details */}
            <div className="gcp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {selectedAlliance ? (
                <div>
                  <div className="gcp-subtitle" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>{selectedAlliance.type}</div>
                  <h3 className="gcp-title" style={{ fontSize: '2rem', margin: '0 0 1rem 0', color: 'var(--brass)' }}>{selectedAlliance.name}</h3>

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    {selectedAlliance.formedDate && (
                      <div className="gcp-stat-box" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', padding: '0.75rem' }}>
                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Formed</div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.25rem', color: 'var(--brass)' }}>{selectedAlliance.formedDate.toLocaleDateString()}</div>
                      </div>
                    )}
                    
                    <div className="gcp-stat-box" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', padding: '0.75rem' }}>
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Cohesion</div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.25rem', color: selectedAlliance.cohesion >= 70 ? '#4CAF50' : selectedAlliance.cohesion >= 40 ? '#FFC107' : '#F44336' }}>
                        {selectedAlliance.cohesion ? selectedAlliance.cohesion.toFixed(0) : 80}%
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                        {selectedAlliance.cohesion >= 70 ? 'Stable' : selectedAlliance.cohesion >= 40 ? 'Fragmenting' : 'At Risk'}
                      </div>
                    </div>

                    <div className="gcp-stat-box" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', padding: '0.75rem' }}>
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ideology</div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: 'var(--text-main)' }}>
                        {(selectedAlliance.ideology?.economic || 50) > 50 ? 'Cap' : 'Soc'} • {(selectedAlliance.ideology?.governance || 50) > 50 ? 'Lib' : 'Con'}
                      </div>
                    </div>
                  </div>

                  {/* Member Parties */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div className="gcp-section-label">Member Parties</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                      {selectedAlliance.memberPartyIds.map(partyId => {
                        const party = parties.find(p => p.id === partyId);
                        if (!party) return null;
                        const isLeader = partyId === selectedAlliance.leaderPartyId;
                        
                        return (
                          <div key={partyId} style={{ border: '1px solid var(--border)', borderLeft: `4px solid ${party.color}`, padding: '0.8rem', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>{party.name}</div>
                                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.2rem', textTransform: 'uppercase' }}>
                                  {party.ethnicityFocus || 'Multi-Racial'}
                                </div>
                              </div>
                              {isLeader && (
                                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', background: 'rgba(201,168,76,0.15)', color: 'var(--brass)', padding: '0.2rem 0.4rem', border: '1px solid var(--brass)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                                  LEADER
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* State Leaders */}
                  <div>
                    <div className="gcp-section-label">Alliance State Chiefs</div>
                    {(!selectedAlliance.stateLeaders || selectedAlliance.stateLeaders.size === 0) ? (
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--text-dim)', fontStyle: 'italic', padding: '1rem', border: '1px dashed var(--border)', textAlign: 'center' }}>
                        No state chiefs elected yet.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        {Array.from(selectedAlliance.stateLeaders.entries()).map(([state, info]) => {
                          const leader = characters.find(c => c.id === info.leaderId);
                          const party = leader ? parties.find(p => p.affiliationIds.includes(leader.affiliationId)) : null;
                          
                          return (
                            <div key={state} style={{ border: '1px solid var(--border)', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                            >
                              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
                                {state}
                              </div>
                              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                {leader ? leader.name : 'Unknown'}
                              </div>
                              {party && (
                                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.65rem', color: party.color, marginTop: '0.2rem' }}>
                                  {party.name}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Share Tech Mono', monospace", color: 'var(--text-dim)' }}>
                  Select an alliance to view details.
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.3)' }}>
            <button className="gcp-btn primary" onClick={onClose}>Close</button>
          </div>
          
        </div>
      </div>
    </>
  );
};

export default React.memo(AlliancePanel);