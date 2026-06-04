import React, { useMemo, useState } from 'react';
import { Party, ElectionResults, PoliticalAlliance, GeoJsonFeature, HistoricalAlliance } from '../types';
import { GCP_BASE } from '../gcpTheme';

interface ElectionResultsPanelProps {
  results: ElectionResults;
  previousResults: ElectionResults;
  detailedResults: Map<string, Map<string, number>>;
  previousDetailedResults: Map<string, Map<string, number>> | null;
  partiesMap: Map<string, Party>;
  totalSeats: number;
  onClose: () => void;
  electionDate: Date;
  totalElectors: number;
  alliances?: (PoliticalAlliance | HistoricalAlliance)[];
  featuresMap: Map<string, GeoJsonFeature>;
}

interface ResultStats {
  id: string; name: string; color: string;
  seats: number; seatChange: number;
  votes: number; votePercentage: number; votePercentageChange: number;
  hasParticipated: boolean; isAlliance?: boolean;
  members?: ResultStats[]; type?: string;
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent = 'var(--brass)' }) => (
  <div style={{ border: '1px solid var(--border)', padding: '0.5rem 0.85rem', background: 'rgba(201,168,76,0.03)', minWidth: '100px' }}>
    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
    <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.25rem', fontWeight: 600, color: accent }}>{value}</div>
  </div>
);

// ── Seat bar ──────────────────────────────────────────────────────────────────
const SeatBar: React.FC<{ seats: number; total: number; color: string }> = ({ seats, total, color }) => (
  <div style={{ width: '100%', height: '6px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--border)', overflow: 'hidden' }}>
    <div style={{ width: `${(seats / total) * 100}%`, height: '100%', backgroundColor: color, transition: 'width 0.8s ease' }} />
  </div>
);

// ── Change chip ───────────────────────────────────────────────────────────────
const ChangeChip: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  if (value === 0) return <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--text-dim)' }}>–</span>;
  const positive = value > 0;
  return (
    <span style={{
      fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', fontWeight: 'bold',
      color: positive ? 'var(--green)' : 'var(--urgent)',
      padding: '0.1rem 0.3rem', border: `1px solid ${positive ? 'rgba(99,160,100,0.35)' : 'rgba(224,92,58,0.35)'}`,
      background: positive ? 'rgba(99,160,100,0.06)' : 'rgba(224,92,58,0.06)',
    }}>
      {positive ? '+' : ''}{value}{suffix}
    </span>
  );
};

// ── Comparison Banner ─────────────────────────────────────────────────────────
const ComparisonBanner: React.FC<{
  stats: ResultStats[];
  previousResults: ElectionResults;
  previousDetailedResults: Map<string, Map<string, number>> | null;
  totalSeats: number;
  partiesMap: Map<string, Party>;
}> = ({ stats, previousResults, previousDetailedResults, totalSeats, partiesMap }) => {
  const hasPrevious = previousResults.size > 0 || (previousDetailedResults && previousDetailedResults.size > 0);
  if (!hasPrevious) return null;

  const prevSeatCounts = new Map<string, number>();
  previousResults.forEach(pid => prevSeatCounts.set(pid, (prevSeatCounts.get(pid) || 0) + 1));
  const prevSorted = Array.from(prevSeatCounts.entries()).sort((a, b) => b[1] - a[1]);
  const prevLeaderId = prevSorted[0]?.[0];
  const prevLeaderSeats = prevSorted[0]?.[1] ?? 0;
  const prevLeaderParty = prevLeaderId ? partiesMap.get(prevLeaderId) : null;
  const currentLeader = stats[0];
  const leaderFlipped = currentLeader && prevLeaderId && currentLeader.id !== prevLeaderId;
  const prevLeaderNow = prevLeaderId ? stats.find(s => s.id === prevLeaderId) : null;
  const movers = stats.filter(p => p.seatChange !== 0).sort((a, b) => Math.abs(b.seatChange) - Math.abs(a.seatChange)).slice(0, 4);

  return (
    <div style={{ border: '1px solid var(--border)', marginBottom: '1rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', borderBottom: '1px solid var(--border)', background: 'rgba(201,168,76,0.04)' }}>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Compared with Previous Election
        </span>
        {leaderFlipped && (
          <span className="gcp-badge amber gcp-flicker">⚡ Power Shift</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0', borderTop: 'none' }}>

        {/* Leadership */}
        <div style={{ padding: '0.75rem', borderRight: '1px solid var(--border)' }}>
          <div className="gcp-subtitle" style={{ marginBottom: '0.5rem' }}>Leadership</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '8px', height: '8px', backgroundColor: prevLeaderParty?.color || '#888', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.6rem', color: 'var(--text-mid)' }}>{prevLeaderParty?.name ?? 'Unknown'}</span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>{prevLeaderSeats}</span>
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.48rem', color: 'var(--text-dim)', margin: '0.15rem 0', letterSpacing: '0.1em' }}>↓ now →</div>
          {currentLeader && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: currentLeader.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', fontWeight: 600, color: currentLeader.color }}>{currentLeader.name}</span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.6rem', color: 'var(--blue)', marginLeft: 'auto', fontWeight: 'bold' }}>{currentLeader.seats}</span>
            </div>
          )}
          {leaderFlipped && prevLeaderNow && (
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.48rem', color: 'var(--amber)', marginTop: '0.35rem' }}>
              Prev. leader: {prevLeaderNow.seats} seats <ChangeChip value={prevLeaderNow.seatChange} />
            </div>
          )}
          {!leaderFlipped && <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.48rem', color: 'var(--green)', marginTop: '0.35rem' }}>✓ Same party retained</div>}
        </div>

        {/* Biggest Movers */}
        <div style={{ padding: '0.75rem', borderRight: '1px solid var(--border)' }}>
          <div className="gcp-subtitle" style={{ marginBottom: '0.5rem' }}>Biggest Movers</div>
          {movers.length === 0
            ? <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--text-dim)' }}>No seat changes</span>
            : movers.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <div style={{ width: '7px', height: '7px', backgroundColor: p.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--text-mid)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <ChangeChip value={p.seatChange} />
                {previousDetailedResults && p.votePercentageChange !== 0 && (
                  <ChangeChip value={parseFloat(p.votePercentageChange.toFixed(1))} suffix="%" />
                )}
              </div>
            ))
          }
        </div>

        {/* Seat shift bars */}
        <div style={{ padding: '0.75rem' }}>
          <div className="gcp-subtitle" style={{ marginBottom: '0.5rem' }}>Seat Share Shift</div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', marginBottom: '0.2rem', letterSpacing: '0.1em' }}>Previous</div>
          <div style={{ display: 'flex', height: '10px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
            {prevSorted.slice(0, 6).map(([pid, count]) => (
              <div key={pid} style={{ width: `${(count / totalSeats) * 100}%`, backgroundColor: partiesMap.get(pid)?.color || '#555' }} title={`${partiesMap.get(pid)?.name}: ${count}`} />
            ))}
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', marginBottom: '0.2rem', letterSpacing: '0.1em' }}>Current</div>
          <div style={{ display: 'flex', height: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {stats.filter(p => p.seats > 0).slice(0, 6).map(p => (
              <div key={p.id} style={{ width: `${(p.seats / totalSeats) * 100}%`, backgroundColor: p.color }} title={`${p.name}: ${p.seats}`} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', color: 'var(--text-dim)', marginTop: '0.2rem', letterSpacing: '0.08em' }}>
            <span>0</span><span>{totalSeats} seats</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Panel ─────────────────────────────────────────────────────────────────
const ElectionResultsPanel: React.FC<ElectionResultsPanelProps> = ({
  results, previousResults, detailedResults, previousDetailedResults,
  partiesMap, totalSeats, onClose, electionDate, totalElectors,
  alliances = [], featuresMap,
}) => {
  const [expandedAllianceIds, setExpandedAllianceIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'visual' | 'states'>('table');

  const { stats, totalCurrentVotes, totalCurrentSeats, stateResults } = useMemo(() => {
    const getSeatCounts = (res: ElectionResults) => {
      const counts = new Map<string, number>();
      res.forEach(pid => counts.set(pid, (counts.get(pid) || 0) + 1));
      return counts;
    };
    const currentSeatCounts  = getSeatCounts(results);
    const previousSeatCounts = getSeatCounts(previousResults);

    const stateMap = new Map<string, { state: string; totalSeats: number; partyStats: Map<string, { seats: number; votes: number }>; winnerId: string | null }>();
    featuresMap.forEach(feature => {
      const state = feature.properties.NEGERI || feature.properties.STATE;
      if (!state) return;
      if (!stateMap.has(state)) stateMap.set(state, { state, totalSeats: 0, partyStats: new Map(), winnerId: null });
      stateMap.get(state)!.totalSeats++;
    });

    const currentVoteCounts = new Map<string, number>();
    let totalCurrentVotes = 0;
    if (detailedResults) {
      for (const [seatCode, seatTally] of detailedResults.entries()) {
        const feature = featuresMap.get(seatCode);
        const state = feature?.properties.NEGERI || feature?.properties.STATE;
        const stateData = state ? stateMap.get(state) : null;
        for (const [pid, votes] of seatTally.entries()) {
          currentVoteCounts.set(pid, (currentVoteCounts.get(pid) || 0) + votes);
          totalCurrentVotes += votes;
          if (stateData) {
            if (!stateData.partyStats.has(pid)) stateData.partyStats.set(pid, { seats: 0, votes: 0 });
            stateData.partyStats.get(pid)!.votes += votes;
          }
        }
      }
    }
    results.forEach((pid, seatCode) => {
      const feature = featuresMap.get(seatCode);
      const state = feature?.properties.NEGERI || feature?.properties.STATE;
      const stateData = state ? stateMap.get(state) : null;
      if (stateData) {
        if (!stateData.partyStats.has(pid)) stateData.partyStats.set(pid, { seats: 0, votes: 0 });
        stateData.partyStats.get(pid)!.seats++;
      }
    });
    stateMap.forEach(sd => {
      let maxSeats = -1, winner: string | null = null;
      sd.partyStats.forEach((st, pid) => {
        if (st.seats > maxSeats) { maxSeats = st.seats; winner = pid; }
        else if (st.seats === maxSeats) winner = null;
      });
      sd.winnerId = winner;
    });

    const previousVoteCounts = new Map<string, number>();
    let totalPreviousVotes = 0;
    if (previousDetailedResults) {
      for (const seatTally of previousDetailedResults.values()) {
        for (const [pid, votes] of seatTally.entries()) {
          previousVoteCounts.set(pid, (previousVoteCounts.get(pid) || 0) + votes);
          totalPreviousVotes += votes;
        }
      }
    }
    const totalCurrentSeats = Array.from(currentSeatCounts.values()).reduce((s, c) => s + c, 0);

    const allPartyIds = new Set<string>();
    [partiesMap, currentSeatCounts, previousSeatCounts, currentVoteCounts, previousVoteCounts].forEach(m => m.forEach((_, k) => allPartyIds.add(k)));

    const partyStatsMap = new Map<string, ResultStats>();
    allPartyIds.forEach(pid => {
      const party = partiesMap.get(pid);
      const cSeats = currentSeatCounts.get(pid) || 0;
      const pSeats = previousSeatCounts.get(pid) || 0;
      const cVotes = currentVoteCounts.get(pid) || 0;
      const pVotes = previousVoteCounts.get(pid) || 0;
      const cVP = totalCurrentVotes > 0 ? (cVotes / totalCurrentVotes) * 100 : 0;
      const pVP = totalPreviousVotes > 0 ? (pVotes / totalPreviousVotes) * 100 : 0;
      partyStatsMap.set(pid, {
        id: pid, name: party?.name || 'Unknown', color: party?.color || '#888',
        seats: cSeats, seatChange: cSeats - pSeats,
        votes: cVotes, votePercentage: cVP, votePercentageChange: cVP - pVP,
        hasParticipated: cSeats > 0 || pSeats > 0 || cVotes > 0 || pVotes > 0,
      });
    });

    const processedPartyIds = new Set<string>();
    const groupedStats: ResultStats[] = [];
    alliances.forEach(alliance => {
      if (alliance.type !== 'Alliance') return;
      const memberStats: ResultStats[] = [];
      let allianceSeats = 0, allianceVotes = 0, alliancePrevVotes = 0;
      let hasParticipation = false;
      alliance.memberPartyIds.forEach(pid => {
        const pStat = partyStatsMap.get(pid);
        if (pStat) {
          memberStats.push(pStat); allianceSeats += pStat.seats; allianceVotes += pStat.votes;
          alliancePrevVotes += previousVoteCounts.get(pid) || 0;
          if (pStat.hasParticipated) hasParticipation = true;
          processedPartyIds.add(pid);
        }
      });
      if (hasParticipation) {
        const aVP = totalCurrentVotes > 0 ? (allianceVotes / totalCurrentVotes) * 100 : 0;
        const aPVP = totalPreviousVotes > 0 ? (alliancePrevVotes / totalPreviousVotes) * 100 : 0;
        const leaderParty = partiesMap.get(alliance.leaderPartyId);
        groupedStats.push({
          id: alliance.id, name: alliance.name, color: leaderParty?.color || '#fff',
          seats: allianceSeats, seatChange: memberStats.reduce((s, m) => s + m.seatChange, 0),
          votes: allianceVotes, votePercentage: aVP, votePercentageChange: aVP - aPVP,
          hasParticipated: true, isAlliance: true,
          members: memberStats.sort((a, b) => b.seats - a.seats), type: 'Alliance',
        });
      }
    });
    partyStatsMap.forEach((stat, pid) => { if (!processedPartyIds.has(pid) && stat.hasParticipated) groupedStats.push(stat); });
    const sortedStats = groupedStats.sort((a, b) => b.seats - a.seats || b.votes - a.votes);
    const sortedStateResults = Array.from(stateMap.values()).sort((a, b) => a.state.localeCompare(b.state));
    return { stats: sortedStats, totalCurrentVotes, totalCurrentSeats, stateResults: sortedStateResults };
  }, [results, previousResults, detailedResults, previousDetailedResults, partiesMap, alliances, featuresMap]);

  const majoritySeats = Math.floor(totalSeats / 2) + 1;
  const turnout = totalElectors > 0 && totalCurrentVotes > 0 ? (totalCurrentVotes / totalElectors) * 100 : 0;
  const largestParty = stats[0];
  const hasMajority = largestParty && largestParty.seats >= majoritySeats;

  const toggleAlliance = (id: string) => {
    const s = new Set(expandedAllianceIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedAllianceIds(s);
  };

  const rankIcon = (i: number) => ['◈', '◇', '◆'][i] ?? '·';

  return (
    <>
      <style>{GCP_BASE}</style>
      <div className="gcp-modal-backdrop">
        <div className="gcp-panel gcp-fade-in" style={{ width: '100%', maxWidth: '1100px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '2px' }}>

          {/* Header */}
          <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div>
                <div className="gcp-subtitle" style={{ marginBottom: '0.25rem' }}>
                  {electionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <h2 className="gcp-title" style={{ fontSize: '1.6rem', margin: 0 }}>
                  {electionDate.getFullYear()} General Election
                </h2>
              </div>
              <button className="gcp-close-btn" onClick={onClose}>✕</button>
            </div>

            {/* Key stats */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <StatPill label="Total Seats" value={String(totalSeats)} />
              <StatPill label="Majority" value={String(majoritySeats)} accent="var(--amber)" />
              <StatPill label="Valid Votes" value={totalCurrentVotes.toLocaleString()} accent="var(--blue)" />
              <StatPill label="Turnout" value={turnout > 0 ? `${turnout.toFixed(1)}%` : 'N/A'} accent="var(--green)" />
              <StatPill
                label="Government"
                value={hasMajority ? '✓ Majority' : '⚠ Hung'}
                accent={hasMajority ? 'var(--green)' : 'var(--urgent)'}
              />
            </div>

            <ComparisonBanner
              stats={stats} previousResults={previousResults}
              previousDetailedResults={previousDetailedResults}
              totalSeats={totalSeats} partiesMap={partiesMap}
            />

            {/* View tabs + leading party */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                {(['table', 'visual', 'states'] as const).map(mode => (
                  <button key={mode} className={`gcp-tab ${viewMode === mode ? 'active' : ''}`} onClick={() => setViewMode(mode)}>
                    {mode === 'table' ? 'Table View' : mode === 'visual' ? 'Visual View' : 'State Breakdown'}
                  </button>
                ))}
              </div>
              {largestParty && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.3rem 0.65rem' }}>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Leading:</span>
                  <div style={{ width: '8px', height: '8px', backgroundColor: largestParty.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 600, color: largestParty.color }}>{largestParty.name}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.65rem', color: 'var(--blue)', fontWeight: 'bold' }}>{largestParty.seats} seats</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="gcp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', minHeight: 0 }}>

            {/* ── TABLE VIEW ── */}
            {viewMode === 'table' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.62rem' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0f0b05' }}>
                  <tr style={{ borderBottom: '1px solid var(--border-bright)' }}>
                    {['Party / Alliance', 'Votes', 'Vote %', 'Swing', 'Seat Bar', 'Seats', '±'].map((h, i) => (
                      <th key={h} style={{ padding: '0.4rem 0.5rem', color: 'var(--text-dim)', fontWeight: 'normal', letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'right', width: i === 0 ? '28%' : i === 4 ? '16%' : '9%' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((p, index) => (
                    <React.Fragment key={p.id}>
                      <tr
                        style={{ borderBottom: '1px solid var(--border)', background: index === 0 ? 'rgba(201,168,76,0.04)' : index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent', cursor: p.isAlliance ? 'pointer' : 'default', borderLeft: index === 0 ? '2px solid var(--brass)' : '2px solid transparent' }}
                        onClick={() => p.isAlliance && toggleAlliance(p.id)}
                      >
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {p.isAlliance && <span style={{ color: 'var(--text-dim)', fontSize: '0.55rem' }}>{expandedAllianceIds.has(p.id) ? '▼' : '▶'}</span>}
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.6rem', minWidth: '12px' }}>{rankIcon(index)}</span>
                            <div style={{ width: '8px', height: '8px', backgroundColor: p.color, flexShrink: 0 }} />
                            <span style={{ color: index === 0 ? 'var(--amber)' : 'var(--text-mid)', fontWeight: p.isAlliance ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            {p.isAlliance && <span className="gcp-badge" style={{ fontSize: '0.42rem', marginLeft: '0.2rem' }}>Alliance</span>}
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-mid)' }}>{p.votes.toLocaleString()}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--brass)', fontWeight: 'bold' }}>{p.votePercentage.toFixed(2)}%</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          {previousDetailedResults ? <ChangeChip value={parseFloat(p.votePercentageChange.toFixed(2))} suffix="%" /> : <span style={{ color: 'var(--text-dim)' }}>–</span>}
                        </td>
                        <td style={{ padding: '0.5rem' }}><SeatBar seats={p.seats} total={totalSeats} color={p.color} /></td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--amber)', fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: '0.9rem' }}>{p.seats}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          {previousResults.size > 0 ? <ChangeChip value={p.seatChange} /> : <span style={{ color: 'var(--text-dim)' }}>–</span>}
                        </td>
                      </tr>

                      {p.isAlliance && expandedAllianceIds.has(p.id) && p.members?.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(201,168,76,0.015)', opacity: 0.85 }}>
                          <td style={{ padding: '0.35rem 0.5rem 0.35rem 2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ width: '6px', height: '6px', backgroundColor: m.color, flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: 'var(--text-dim)' }}>{m.votes.toLocaleString()}</td>
                          <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: 'var(--text-dim)' }}>{m.votePercentage.toFixed(2)}%</td>
                          <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                            {previousDetailedResults ? <ChangeChip value={parseFloat(m.votePercentageChange.toFixed(2))} suffix="%" /> : <span style={{ color: 'var(--text-dim)' }}>–</span>}
                          </td>
                          <td style={{ padding: '0.35rem 0.5rem' }}><SeatBar seats={m.seats} total={totalSeats} color={m.color} /></td>
                          <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: 'var(--text-mid)' }}>{m.seats}</td>
                          <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                            {previousResults.size > 0 ? <ChangeChip value={m.seatChange} /> : <span style={{ color: 'var(--text-dim)' }}>–</span>}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot style={{ position: 'sticky', bottom: 0, background: '#0f0b05', borderTop: '1px solid var(--border-bright)' }}>
                  <tr>
                    <td style={{ padding: '0.4rem 0.5rem', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Total</td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: 'var(--text-mid)' }}>{totalCurrentVotes.toLocaleString()}</td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: 'var(--text-mid)' }}>100%</td>
                    <td /><td />
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: "'Cinzel', serif", fontSize: '0.9rem', fontWeight: 600, color: 'var(--amber)' }}>{totalCurrentSeats}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── VISUAL VIEW ── */}
            {viewMode === 'visual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Full seat bar */}
                <div style={{ border: '1px solid var(--border)', padding: '0.75rem' }}>
                  <div className="gcp-section-label">Seat Distribution</div>
                  <div style={{ display: 'flex', height: '24px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '0.4rem' }}>
                    {stats.filter(p => p.seats > 0).map(p => (
                      <div key={p.id} style={{ width: `${(p.seats / totalSeats) * 100}%`, backgroundColor: p.color, transition: 'width 0.8s ease' }} title={`${p.name}: ${p.seats}`} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                    <span>0</span>
                    <span style={{ color: 'var(--amber)' }}>{majoritySeats} majority threshold</span>
                    <span>{totalSeats}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
                  {stats.map((p, index) => (
                    <div key={p.id} style={{ border: `1px solid ${index === 0 ? 'var(--border-bright)' : 'var(--border)'}`, padding: '0.75rem', background: index === 0 ? 'rgba(201,168,76,0.04)' : 'transparent', transition: 'border-color 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--text-dim)' }}>{rankIcon(index)}</span>
                          <div style={{ width: '10px', height: '10px', backgroundColor: p.color, flexShrink: 0 }} />
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 600, color: p.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.35rem', fontWeight: 700, color: 'var(--blue)' }}>{p.seats}</div>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>seats</div>
                        </div>
                      </div>
                      <SeatBar seats={p.seats} total={totalSeats} color={p.color} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.5rem' }}>
                        <div style={{ border: '1px solid var(--border)', padding: '0.3rem 0.4rem' }}>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '0.1rem' }}>Votes</div>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.6rem', color: 'var(--text-mid)' }}>{p.votes.toLocaleString()}</div>
                        </div>
                        <div style={{ border: '1px solid var(--border)', padding: '0.3rem 0.4rem' }}>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '0.1rem' }}>Vote Share</div>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.6rem', color: 'var(--brass)' }}>{p.votePercentage.toFixed(2)}%</div>
                        </div>
                        {previousResults.size > 0 && (
                          <>
                            <div style={{ border: '1px solid var(--border)', padding: '0.3rem 0.4rem' }}>
                              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '0.1rem' }}>Seat Δ</div>
                              <ChangeChip value={p.seatChange} />
                            </div>
                            <div style={{ border: '1px solid var(--border)', padding: '0.3rem 0.4rem' }}>
                              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '0.1rem' }}>Swing</div>
                              <ChangeChip value={parseFloat(p.votePercentageChange.toFixed(2))} suffix="%" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── STATE VIEW ── */}
            {viewMode === 'states' && (() => {
              const prevStateVotes = new Map<string, Map<string, number>>();
              if (previousDetailedResults) {
                previousDetailedResults.forEach((seatTally, seatCode) => {
                  const feat = featuresMap.get(seatCode);
                  const st = feat?.properties.NEGERI || feat?.properties.STATE;
                  if (!st) return;
                  if (!prevStateVotes.has(st)) prevStateVotes.set(st, new Map());
                  const sm = prevStateVotes.get(st)!;
                  seatTally.forEach((v, pid) => sm.set(pid, (sm.get(pid) || 0) + v));
                });
              }
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
                  {stateResults.map(stateData => {
                    const prevVotes = prevStateVotes.get(stateData.state) || new Map<string, number>();
                    const totalPrevStateVotes: number = Array.from(prevVotes.values()).reduce((s, v) => s + v, 0);

                    // Group by Alliance
                    const groupedStateStats: { id: string, name: string, color: string, seats: number, votes: number, prevVotes: number, isAlliance: boolean, members?: { id: string, name: string, color: string, seats: number, votes: number, prevVotes: number }[] }[] = [];
                    const processedPids = new Set<string>();
                    
                    let groupWinnerId: string | null = null;
                    let maxGroupSeats = -1;

                    alliances.forEach(alliance => {
                      if (alliance.type !== 'Alliance') return;
                      let aSeats = 0;
                      let aVotes = 0;
                      let aPrevVotes = 0;
                      let hasMem = false;
                      const members: { id: string, name: string, color: string, seats: number, votes: number, prevVotes: number }[] = [];
                      
                      alliance.memberPartyIds.forEach(pid => {
                        let mSeats = 0;
                        let mVotes = 0;
                        let mPrevVotes = 0;
                        let mHasMem = false;

                        if (stateData.partyStats.has(pid)) {
                          const s = stateData.partyStats.get(pid)!;
                          aSeats += s.seats;
                          aVotes += s.votes;
                          mSeats = s.seats;
                          mVotes = s.votes;
                          hasMem = true;
                          mHasMem = true;
                        }
                        const pv = prevVotes.get(pid);
                        if (pv !== undefined) {
                          aPrevVotes += pv;
                          mPrevVotes = pv;
                          hasMem = true;
                          mHasMem = true;
                        }

                        if (mHasMem) {
                          const party = partiesMap.get(pid);
                          members.push({
                             id: pid, name: party?.name || 'Unknown', color: party?.color || '#888',
                             seats: mSeats, votes: mVotes, prevVotes: mPrevVotes
                          });
                        }
                        processedPids.add(pid);
                      });

                      if (hasMem) {
                        const leader = partiesMap.get(alliance.leaderPartyId);
                        members.sort((a,b) => b.seats - a.seats || b.votes - a.votes);
                        groupedStateStats.push({
                          id: alliance.id, name: alliance.name, color: leader?.color || '#fff',
                          seats: aSeats, votes: aVotes, prevVotes: aPrevVotes, isAlliance: true, members
                        });
                        if (aSeats > maxGroupSeats) {
                          maxGroupSeats = aSeats;
                          groupWinnerId = alliance.id;
                        } else if (aSeats === maxGroupSeats) {
                          groupWinnerId = null;
                        }
                      }
                    });

                    stateData.partyStats.forEach((st, pid) => {
                      if (!processedPids.has(pid)) {
                        const party = partiesMap.get(pid);
                        groupedStateStats.push({
                          id: pid, name: party?.name || 'Unknown', color: party?.color || '#888',
                          seats: st.seats, votes: st.votes, prevVotes: prevVotes.get(pid) || 0, isAlliance: false
                        });
                        if (st.seats > maxGroupSeats) {
                           maxGroupSeats = st.seats;
                           groupWinnerId = pid;
                        } else if (st.seats === maxGroupSeats) {
                           groupWinnerId = null;
                        }
                      }
                    });

                    // Add parties that had prevVotes but not current participate
                    prevVotes.forEach((pv, pid) => {
                       if (!processedPids.has(pid) && !stateData.partyStats.has(pid)) {
                           const party = partiesMap.get(pid);
                           groupedStateStats.push({
                              id: pid, name: party?.name || 'Unknown', color: party?.color || '#888',
                              seats: 0, votes: 0, prevVotes: pv, isAlliance: false
                           });
                       }
                    });

                    groupedStateStats.sort((a,b) => b.seats - a.seats || b.votes - a.votes);

                    const totalStateVotes: number = groupedStateStats.reduce((s, g) => s + g.votes, 0);
                    const hasPrevData = previousDetailedResults !== null && totalPrevStateVotes > 0;
                    const majorityNeeded = Math.floor(stateData.totalSeats / 2) + 1;
                    const firstGroup = groupedStateStats[0];
                    const hasStateMajority = firstGroup ? firstGroup.seats >= majorityNeeded : false;

                    return (
                      <div key={stateData.state} style={{ border: '1px solid var(--border)', overflow: 'hidden', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        <div style={{ padding: '0.5rem 0.65rem', borderBottom: '1px solid var(--border)', background: 'rgba(201,168,76,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', fontWeight: 600, color: 'var(--brass)' }}>{stateData.state}</div>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <span className={`gcp-badge ${!groupWinnerId ? 'amber' : hasStateMajority ? 'green' : 'red'}`}>
                              {!groupWinnerId ? '⚠ Hung' : hasStateMajority ? 'Majority' : 'Minority'}
                            </span>
                            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{stateData.totalSeats}s</span>
                          </div>
                        </div>
                        <div style={{ padding: '0.55rem 0.65rem' }}>
                          {/* Seat bar */}
                          <div style={{ display: 'flex', height: '8px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                            {groupedStateStats.filter(g => g.seats > 0).map(g => (
                              <div key={g.id} style={{ width: `${(g.seats / stateData.totalSeats) * 100}%`, backgroundColor: g.color }} title={`${g.name}: ${g.seats}`} />
                            ))}
                          </div>
                          {/* Party/Alliance rows */}
                          {groupedStateStats.slice(0, 4).map((g, idx) => {
                            const vPct = totalStateVotes > 0 ? (g.votes / totalStateVotes) * 100 : 0;
                            const swing = hasPrevData && totalPrevStateVotes > 0 ? vPct - (g.prevVotes / totalPrevStateVotes) * 100 : null;
                            const isExpanded = expandedAllianceIds.has(g.id);
                            
                            return (
                              <React.Fragment key={g.id}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', cursor: g.isAlliance ? 'pointer' : 'default' }} onClick={() => g.isAlliance && toggleAlliance(g.id)}>
                                  {idx === 0 ? <span style={{ color: 'var(--brass)', fontSize: '0.55rem' }}>◈</span> : <span style={{ width: '0.55rem' }} />}
                                  {g.isAlliance && <span style={{ color: 'var(--text-dim)', fontSize: '0.45rem', width: '0.45rem' }}>{isExpanded ? '▼' : '▶'}</span>}
                                  <div style={{ width: '7px', height: '7px', backgroundColor: g.color, flexShrink: 0 }} />
                                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.52rem', color: idx === 0 ? 'var(--text-mid)' : 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: g.isAlliance ? 'bold' : 'normal' }}>{g.name}</span>
                                  {g.isAlliance && <span className="gcp-badge" style={{ fontSize: '0.35rem', marginLeft: '-0.1rem', padding: '0.1rem 0.2rem', marginTop: 0 }}>Alliance</span>}
                                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--brass)', fontWeight: 'bold', flexShrink: 0 }}>{g.seats}</span>
                                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.48rem', color: 'var(--text-dim)', flexShrink: 0 }}>{vPct.toFixed(1)}%</span>
                                  {swing !== null && <ChangeChip value={parseFloat(swing.toFixed(1))} suffix="pp" />}
                                </div>
                                {g.isAlliance && isExpanded && g.members?.map(m => {
                                   const mvPct = totalStateVotes > 0 ? (m.votes / totalStateVotes) * 100 : 0;
                                   const mSwing = hasPrevData && totalPrevStateVotes > 0 ? mvPct - (m.prevVotes / totalPrevStateVotes) * 100 : null;
                                   return (
                                     <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem', paddingLeft: '1.45rem', opacity: 0.85 }}>
                                        <div style={{ width: '5px', height: '5px', backgroundColor: m.color, flexShrink: 0 }} />
                                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.48rem', color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', color: 'var(--text-mid)', fontWeight: 'bold', flexShrink: 0 }}>{m.seats}</span>
                                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', flexShrink: 0 }}>{mvPct.toFixed(1)}%</span>
                                        {mSwing !== null && <ChangeChip value={parseFloat(mSwing.toFixed(1))} suffix="pp" />}
                                     </div>
                                   );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <button className="gcp-btn primary" onClick={onClose} style={{ fontSize: '0.65rem', padding: '0.45rem 1.5rem', letterSpacing: '0.15em' }}>
              Continue to Government Formation
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ElectionResultsPanel;