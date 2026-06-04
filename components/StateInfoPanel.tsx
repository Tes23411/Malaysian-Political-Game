import React, { useState, useMemo } from 'react';
import { StateGovernment, Party, Character } from '../types';
import { GCP_BASE } from '../gcpTheme';

export interface StatePolicy {
  id: string; name: string; description: string;
  category: 'economy' | 'welfare' | 'security' | 'education' | 'infrastructure';
  cost: number; approvalEffect: number; isActive: boolean; enactedDate?: Date;
}
export interface StateBudget { total: number; allocated: number; revenue: number; federalGrant: number; deficit: number; }
export interface StateCrisis {
  id: string; title: string; description: string;
  type: 'flood' | 'corruption' | 'protest' | 'economic' | 'health';
  severity: 'low' | 'medium' | 'high'; approvalImpact: number; date: Date; resolved: boolean;
}
export interface StateStats {
  approvalRating: number; economicScore: number; stabilityScore: number;
  budget: StateBudget; policies: StatePolicy[]; crises: StateCrisis[];
  byElections: { date: Date; seatName: string; winnerPartyId: string }[];
}
export interface StateElectionHistoryEntry {
  date: Date; seatDistribution: Map<string, number>; totalSeats: number; parties: {id: string, name: string, color: string}[];
}

const DEFAULT_POLICIES: StatePolicy[] = [
  { id: 'welfare', name: 'Social Welfare Expansion', description: 'Increase aid to low-income households.', category: 'welfare', cost: 15, approvalEffect: 8, isActive: false },
  { id: 'infra', name: 'Rural Infrastructure', description: 'Roads, bridges, and utilities in rural areas.', category: 'infrastructure', cost: 20, approvalEffect: 10, isActive: false },
  { id: 'edu', name: 'Education Grants', description: 'Scholarships and improved school facilities.', category: 'education', cost: 12, approvalEffect: 6, isActive: false },
  { id: 'biz', name: 'Business Investment Zone', description: 'Economic zones to attract investment.', category: 'economy', cost: 18, approvalEffect: 7, isActive: false },
  { id: 'sec', name: 'Community Policing', description: 'Enhanced police presence and neighbourhood watch.', category: 'security', cost: 10, approvalEffect: 5, isActive: false },
  { id: 'green', name: 'Green Energy Initiative', description: 'Subsidise solar panels, reduce carbon footprint.', category: 'economy', cost: 22, approvalEffect: 9, isActive: false },
];
const CRISIS_POOL: Omit<StateCrisis, 'id' | 'date' | 'resolved'>[] = [
  { title: 'Severe Flooding', description: 'Monsoon floods have displaced thousands.', type: 'flood', severity: 'high', approvalImpact: -12 },
  { title: 'Corruption Allegation', description: 'Senior official under investigation for embezzlement.', type: 'corruption', severity: 'medium', approvalImpact: -15 },
  { title: 'Workers Strike', description: 'Unions call a general strike over wages.', type: 'protest', severity: 'medium', approvalImpact: -8 },
  { title: 'Economic Slowdown', description: 'Key industries report declining output.', type: 'economic', severity: 'high', approvalImpact: -10 },
];
function generateStateStats(state: string): StateStats {
  const seed = state.charCodeAt(0) + state.charCodeAt(state.length - 1);
  const pseudo = (n: number) => ((seed * n * 9301 + 49297) % 233280) / 233280;
  const totalBudget = 2000 + Math.floor(pseudo(1) * 8000);
  const federalGrant = Math.floor(totalBudget * (0.3 + pseudo(2) * 0.2));
  const revenue = totalBudget - federalGrant;
  const allocated = Math.floor(totalBudget * (0.6 + pseudo(3) * 0.3));
  const activePolicies = DEFAULT_POLICIES.map((p, i) => ({ ...p, isActive: pseudo(i + 10) > 0.6, enactedDate: pseudo(i + 10) > 0.6 ? new Date(2020, Math.floor(pseudo(i + 20) * 12), 1) : undefined }));
  return {
    approvalRating: 35 + Math.floor(pseudo(4) * 45),
    economicScore:  30 + Math.floor(pseudo(5) * 50),
    stabilityScore: 40 + Math.floor(pseudo(6) * 45),
    budget: { total: totalBudget, allocated, revenue, federalGrant, deficit: allocated - totalBudget },
    policies: activePolicies,
    crises: pseudo(7) > 0.5 ? [{ ...CRISIS_POOL[Math.floor(pseudo(8) * CRISIS_POOL.length)], id: `crisis-${state}`, date: new Date(2023, Math.floor(pseudo(9) * 12), 1), resolved: pseudo(10) > 0.5 }] : [],
    byElections: [],
  };
}

// ── Approval gauge ─────────────────────────────────────────────────────────────
const ApprovalGauge: React.FC<{ value: number }> = ({ value }) => {
  const color = value >= 60 ? '#63a064' : value >= 40 ? '#c9a84c' : '#e05c3a';
  const label = value >= 60 ? 'Strong' : value >= 40 ? 'Moderate' : 'Weak';
  const circ = 2 * Math.PI * 26;
  const progress = (value / 100) * circ;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
        <svg width="52" height="52" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="5" />
          <circle cx="28" cy="28" r="26" fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${progress} ${circ}`} strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.6rem', color: 'var(--brass)', fontWeight: 'bold' }}>{value}%</div>
      </div>
      <div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.18em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Approval</div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', fontWeight: 600, color }}>{label}</div>
      </div>
    </div>
  );
};

// ── Mini bar ───────────────────────────────────────────────────────────────────
const MiniBar: React.FC<{ label: string; value: number; max?: number; color: string }> = ({ label, value, max = 100, color }) => (
  <div style={{ marginBottom: '0.6rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>
      <span>{label}</span>
      <span style={{ color: 'var(--text-mid)' }}>{value}{max === 100 ? '%' : 'M'}</span>
    </div>
    <div style={{ height: '4px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ height: '100%', backgroundColor: color, width: `${(value / max) * 100}%`, transition: 'width 0.5s ease' }} />
    </div>
  </div>
);

// ── Category colors ────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = { economy: '#6a8ee0', welfare: '#63a064', security: '#e05c3a', education: '#a78bfa', infrastructure: '#c9a84c' };
const CRISIS_ICONS: Record<string, string> = { flood: '≈', corruption: '⚖', protest: '✊', economic: '↓', health: '+' };

// ── Flavour Text ───────────────────────────────────────────────────────────────
function getStateFlavour(state: string) {
    const s = state.toUpperCase();
    if (["SABAH", "SARAWAK"].includes(s)) {
        return "Securing an electoral mandate in Borneo requires careful navigation of state rights, MA63 compliance, and rural development promises. Voters heavily favour regional autonomy over peninsula-centric policies.";
    } else if (["KELANTAN", "TERENGGANU"].includes(s)) {
        return "A bastion of traditionalism. Policies that emphasize moral governance, religious heritage, and community welfare see high approval, while secular or rapid modernist agendas may be met with distrust.";
    } else if (s === "PULAU PINANG") {
        return "Highly urbanised and reliant on industrial manufacturing and tourism. Here, infrastructural bottlenecks and property development are hot-button issues for the electorate.";
    } else if (["SELANGOR", "W.P. KUALA LUMPUR"].includes(s)) {
        return "The economic powerhouse of the federation. With a diverse, dense, and highly informed electorate, governance demands sound economic management, addressing cost of living, and improving metropolitan infrastructure.";
    } else if (s === "JOHOR") {
        return "A dynamic southern state bridging traditional heartlands with rapid commercial growth fuelled by cross-border dynamics. Both rural subsidies and high-tech investments are key to winning hearts here.";
    } else if (["KEDAH", "PERLIS"].includes(s)) {
        return "The agricultural 'rice bowl' belt. Electorates here are highly sensitive to food security, agrarian subsidies, and rural infrastructure. Conservative, populist approaches often perform well.";
    } else if (["PERAK", "PAHANG", "NEGERI SEMBILAN", "MELAKA"].includes(s)) {
        return "Representing the diverse middle-ground of the peninsula. Success requires a delicate balancing act of catering to semi-urban development aspirations and strong traditional values in rural pockets.";
    }
    return "A dynamic state where demographic complexities demand nuanced governance and inclusive policy making.";
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface StateInfoPanelProps {
  stateGovernment: StateGovernment;
  parties: Party[];
  characters: Character[];
  onClose: () => void;
  onCharacterClick: (characterId: string) => void;
  stateElectionHistory?: StateElectionHistoryEntry[];
  isPlayerCM?: boolean;
  currentDate?: Date;
}
type TabId = 'current' | 'economy' | 'policies' | 'crises' | 'history';

const StateInfoPanel: React.FC<StateInfoPanelProps> = ({
  stateGovernment, parties, characters, onClose, onCharacterClick,
  stateElectionHistory, isPlayerCM = false, currentDate = new Date(),
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('current');
  const [stateStats, setStateStats] = useState<StateStats>(() => generateStateStats(stateGovernment.state));
  const [noConfidenceStep, setNoConfidenceStep] = useState<'idle' | 'confirm' | 'result'>('idle');
  const [noConfidenceResult, setNoConfidenceResult] = useState<'passed' | 'failed' | null>(null);

  const chiefs = characters.find(c => c.id === stateGovernment.chiefMinisterId);
  const chiefMinister = characters.find(c => c.id === stateGovernment.chiefMinisterId);
  const cmParty = parties.find(p => p.affiliationIds?.includes(chiefMinister?.affiliationId || ''));
  const getPartyName  = (id: string) => parties.find(p => p.id === id)?.name  || id;
  const getPartyColor = (id: string) => parties.find(p => p.id === id)?.color || '#6b7280';
  const sortedSeats = Array.from(stateGovernment.seatDistribution.entries()).sort((a, b) => b[1] - a[1]);
  const isKualaLumpur = stateGovernment.state === 'W.P. KUALA LUMPUR';
  const isBorneoOrMelakaPinang = ['SARAWAK', 'SABAH', 'PULAU PINANG', 'MELAKA'].includes(stateGovernment.state);
  const cmTitle = isKualaLumpur ? 'City Mayor' : (isBorneoOrMelakaPinang ? 'Chief Minister' : 'Menteri Besar');

  const historyData = useMemo(() => {
    if (!stateElectionHistory?.length) return [];
    return [...stateElectionHistory].reverse().map(entry => {
      const sortedSeats = Array.from(entry.seatDistribution.entries()).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
      return { date: entry.date, totalSeats: entry.totalSeats, sortedSeats, winnerId: sortedSeats[0]?.[0] ?? null, parties: entry.parties };
    });
  }, [stateElectionHistory]);

  const activePolicyCount = stateStats.policies.filter(p => p.isActive).length;
  const activeCrises = stateStats.crises.filter(c => !c.resolved);
  const budgetUsedPct = Math.round((stateStats.policies.filter(p => p.isActive).reduce((s, p) => s + p.cost, 0)));

  const handlePolicyToggle = (policyId: string) => {
    setStateStats(prev => {
      const policy = prev.policies.find(p => p.id === policyId);
      if (!policy) return prev;
      const budgetUsed = prev.policies.filter(p => p.isActive && p.id !== policyId).reduce((s, p) => s + p.cost, 0);
      if (!policy.isActive && budgetUsed + policy.cost > 85) return prev;
      const updatedPolicies = prev.policies.map(p => p.id === policyId ? { ...p, isActive: !p.isActive, enactedDate: !p.isActive ? currentDate : undefined } : p);
      return { ...prev, policies: updatedPolicies, approvalRating: Math.max(0, Math.min(100, prev.approvalRating + (policy.isActive ? -policy.approvalEffect : policy.approvalEffect))) };
    });
  };
  const handleNoConfidence = () => {
    const rulingSeats = stateGovernment.rulingCoalitionIds.reduce((s, pid) => s + (stateGovernment.seatDistribution.get(pid) || 0), 0);
    const passed = rulingSeats < Math.floor(stateGovernment.totalSeats / 2) + 1 || stateStats.approvalRating < 25;
    setNoConfidenceResult(passed ? 'passed' : 'failed');
    setNoConfidenceStep('result');
  };

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'current',  label: 'Govt'    },
    { id: 'economy',  label: 'Budget'  },
    { id: 'policies', label: 'Policies', badge: activePolicyCount },
    { id: 'crises',   label: 'Crises',  badge: activeCrises.length || undefined },
    { id: 'history',  label: 'History' },
  ];

  return (
    <>
      <style>{GCP_BASE}</style>
      <div className="gcp-panel" style={{ position: 'fixed', inset: 'auto 0 0 auto', top: 0, right: 0, width: '26rem', height: '100vh', display: 'flex', flexDirection: 'column', zIndex: 50, borderLeft: '1px solid var(--border-bright)', borderTop: 'none', borderBottom: 'none', borderRight: 'none', borderRadius: 0 }}>

        {/* Header */}
        <div style={{ padding: '1rem 1.1rem 0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0, position: 'relative', background: 'linear-gradient(135deg, #1a1208 0%, #120d05 100%)' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(201,168,76,0.03) 0, rgba(201,168,76,0.03) 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="gcp-subtitle" style={{ marginBottom: '0.2rem' }}>{isKualaLumpur ? 'City Council' : 'State Government'}</div>
              <h2 className="gcp-title" style={{ fontSize: '1.1rem', margin: 0 }}>{isKualaLumpur ? 'Kuala Lumpur City Council' : stateGovernment.state}</h2>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.48rem', color: 'var(--text-dim)', marginTop: '0.15rem', letterSpacing: '0.12em' }}>{stateGovernment.totalSeats} {isKualaLumpur ? 'city councillor seats' : 'assembly seats'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <ApprovalGauge value={stateStats.approvalRating} />
              <button className="gcp-close-btn" onClick={onClose} style={{ marginTop: '0.1rem' }}>✕</button>
            </div>
          </div>
          {/* Stat pills */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem', position: 'relative' }}>
            {[{ label: 'Economy', value: stateStats.economicScore, color: 'var(--blue)' }, { label: 'Stability', value: stateStats.stabilityScore, color: 'var(--green)' }].map(s => (
              <div key={s.label} style={{ flex: 1, border: '1px solid var(--border)', padding: '0.3rem 0.5rem', background: 'rgba(201,168,76,0.03)' }}>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.14em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.1rem' }}>{s.label}</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 600, color: s.color }}>{s.value}/100</div>
              </div>
            ))}
            {activeCrises.length > 0 && (
              <div style={{ flex: 1, border: '1px solid rgba(224,92,58,0.4)', padding: '0.3rem 0.5rem', background: 'rgba(224,92,58,0.06)' }}>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.14em', color: 'rgba(224,92,58,0.6)', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Crises</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 600, color: 'var(--urgent)' }}>{activeCrises.length} Active</div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: '#0f0b05' }}>
          {tabs.map(t => (
            <button key={t.id} className={`gcp-tab ${activeTab === t.id ? 'active' : ''}`} style={{ flex: 1, padding: '0.45rem 0.25rem', fontSize: '0.48rem' }} onClick={() => setActiveTab(t.id)}>
              {t.label}
              {t.badge ? <span style={{ marginLeft: '0.25rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '14px', height: '14px', background: 'var(--brass)', color: '#1a1208', fontSize: '0.42rem', fontWeight: 'bold', padding: '0 3px' }}>{t.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="gcp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0.9rem' }}>

          {/* ─ GOVT TAB ─ */}
          {activeTab === 'current' && (
            <div className="gcp-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* CM card */}
              <div style={{ border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s', padding: '0.7rem' }}
                onClick={() => chiefMinister && onCharacterClick(chiefMinister.id)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div className="gcp-subtitle" style={{ marginBottom: '0.5rem' }}>{cmTitle}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 44, height: 44, border: `1px solid ${cmParty?.color || 'var(--border)'}`, background: cmParty?.color ? `${cmParty.color}22` : 'rgba(201,168,76,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '1.1rem', fontWeight: 700, color: cmParty?.color || 'var(--brass)', flexShrink: 0 }}>
                    {chiefMinister?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.85rem', fontWeight: 600, color: 'var(--amber)' }}>{chiefMinister?.name || 'Vacant'}</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', color: cmParty?.color || 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '0.1rem' }}>{cmParty?.name || 'Independent'}</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>Since {stateGovernment.formedDate.getFullYear()}</div>
                  </div>
                </div>
              </div>

              {/* Assembly composition */}
              <div>
                <div className="gcp-section-label">{isKualaLumpur ? 'Council Composition' : 'Assembly Composition'}</div>
                <div style={{ display: 'flex', height: '8px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '0.6rem' }}>
                  {sortedSeats.map(([pId, count]) => {
                    const w = (count / stateGovernment.totalSeats) * 100;
                    if (!w) return null;
                    return <div key={pId} style={{ width: `${w}%`, backgroundColor: getPartyColor(pId) }} title={`${getPartyName(pId)}: ${count}`} />;
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {sortedSeats.map(([pId, count]) => {
                    if (!count) return null;
                    const isRuling = stateGovernment.rulingCoalitionIds.includes(pId);
                    return (
                      <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.52rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '7px', height: '7px', backgroundColor: getPartyColor(pId), flexShrink: 0 }} />
                          <span style={{ color: (isRuling || isKualaLumpur) ? 'var(--text-mid)' : 'var(--text-dim)' }}>{getPartyName(pId)}</span>
                          {!isKualaLumpur && isRuling && <span style={{ fontSize: '0.42rem', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>[Gov]</span>}
                          {isKualaLumpur && <span style={{ fontSize: '0.42rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>[Councillor]</span>}
                        </div>
                        <span style={{ color: 'var(--brass)', fontWeight: 'bold' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* State Flavor Box */}
              <div style={{ padding: '0.75rem', border: '1px dashed var(--border-bright)', background: 'rgba(201,168,76,0.05)' }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-body)', lineHeight: 1.4 }}>
                      "{getStateFlavour(stateGovernment.state)}"
                  </div>
              </div>

              {/* Majority line */}
              {isKualaLumpur ? (
                <div style={{ border: '1px solid var(--border)', padding: '0.5rem 0.65rem', background: 'rgba(201,168,76,0.03)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--brass)', fontSize: '0.8rem' }}>ℹ</span>
                  <div>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--brass)', fontWeight: 600 }}>Proportional Coalition Council</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '0.1rem' }}>No traditional government/opposition dynamics. Exco is allocated proportionally with a federal-appointed Mayor.</div>
                  </div>
                </div>
              ) : (() => {
                const rulingSeats = stateGovernment.rulingCoalitionIds.reduce((s, pid) => s + (stateGovernment.seatDistribution.get(pid) || 0), 0);
                const majority = Math.floor(stateGovernment.totalSeats / 2) + 1;
                const hasMajority = rulingSeats >= majority;
                return (
                  <div style={{ border: `1px solid ${hasMajority ? 'rgba(99,160,100,0.35)' : 'rgba(224,92,58,0.35)'}`, padding: '0.5rem 0.65rem', background: hasMajority ? 'rgba(99,160,100,0.05)' : 'rgba(224,92,58,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: hasMajority ? 'var(--green)' : 'var(--urgent)', fontSize: '0.8rem' }}>{hasMajority ? '✓' : '⚠'}</span>
                    <div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: hasMajority ? 'var(--green)' : 'var(--urgent)', fontWeight: 600 }}>{hasMajority ? 'Majority Government' : 'Minority Government'}</div>
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '0.1rem' }}>{rulingSeats}/{stateGovernment.totalSeats} seats — majority at {majority}</div>
                    </div>
                  </div>
                );
              })()}

              {/* EXCO */}
              {stateGovernment.executiveCouncil.length > 0 && (
                <div>
                  <div className="gcp-section-label">{isKualaLumpur ? 'City Council Exco' : 'Executive Council (EXCO)'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {stateGovernment.executiveCouncil.map((minister, i) => {
                      const char = characters.find(c => c.id === minister.ministerId);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.35rem 0.5rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                          onClick={() => char && onCharacterClick(char.id)}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        >
                          <div style={{ width: 28, height: 28, background: 'rgba(201,168,76,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 600, color: 'var(--brass)', flexShrink: 0 }}>
                            {char?.name?.charAt(0) || '?'}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{char?.name || 'Vacant'}</div>
                            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', color: 'var(--text-dim)', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{minister.portfolio}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Confidence / Appointment note */}
              {isPlayerCM && (
                isKualaLumpur ? (
                  <div style={{ border: '1px dashed var(--border)', padding: '0.65rem', background: 'rgba(201,168,76,0.02)' }}>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Federal Mandate</div>
                    <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>The City Mayor is directly appointed by the federal government and is not subject to council motions of confidence.</p>
                  </div>
                ) : (
                  <div style={{ border: '1px solid rgba(224,92,58,0.35)', padding: '0.65rem', background: 'rgba(224,92,58,0.04)' }}>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', letterSpacing: '0.2em', color: 'rgba(224,92,58,0.65)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Confidence Vote</div>
                    {noConfidenceStep === 'idle' && <><p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>Call a state assembly vote of no confidence against the current government.</p><button className="gcp-btn danger" style={{ width: '100%' }} onClick={() => setNoConfidenceStep('confirm')}>Call Vote of No Confidence</button></>}
                    {noConfidenceStep === 'confirm' && <><p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', color: 'var(--amber)', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>⚠ This will trigger an immediate confidence vote. Proceed?</p><div style={{ display: 'flex', gap: '0.4rem' }}><button className="gcp-btn danger" style={{ flex: 1 }} onClick={handleNoConfidence}>Proceed</button><button className="gcp-btn" style={{ flex: 1 }} onClick={() => setNoConfidenceStep('idle')}>Cancel</button></div></>}
                    {noConfidenceStep === 'result' && noConfidenceResult && <><p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', color: noConfidenceResult === 'passed' ? 'var(--urgent)' : 'var(--green)', margin: '0 0 0.5rem 0' }}>{noConfidenceResult === 'passed' ? '✓ Motion passed — government has fallen.' : '✗ Motion failed — government retains confidence.'}</p><button className="gcp-btn" style={{ width: '100%' }} onClick={() => { setNoConfidenceStep('idle'); setNoConfidenceResult(null); }}>Dismiss</button></>}
                  </div>
                )
              )}
            </div>
          )}

          {/* ─ BUDGET TAB ─ */}
          {activeTab === 'economy' && (
            <div className="gcp-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <div className="gcp-section-label">Budget Overview</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {[
                    { label: 'Total Budget', value: `RM ${stateStats.budget.total.toLocaleString()}M`, color: 'var(--brass)' },
                    { label: 'Federal Grant', value: `RM ${stateStats.budget.federalGrant.toLocaleString()}M`, color: 'var(--blue)' },
                    { label: 'State Revenue', value: `RM ${stateStats.budget.revenue.toLocaleString()}M`, color: 'var(--green)' },
                    { label: 'Surplus / Deficit', value: `${stateStats.budget.deficit < 0 ? '−' : '+'}RM ${Math.abs(stateStats.budget.deficit).toLocaleString()}M`, color: stateStats.budget.deficit < 0 ? 'var(--urgent)' : 'var(--green)' },
                  ].map(item => (
                    <div key={item.label} style={{ border: '1px solid var(--border)', padding: '0.4rem 0.55rem', background: 'rgba(201,168,76,0.02)' }}>
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.42rem', letterSpacing: '0.14em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{item.label}</div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 600, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <MiniBar label="Budget Utilisation" value={Math.round((stateStats.budget.allocated / stateStats.budget.total) * 100)} color={stateStats.budget.allocated / stateStats.budget.total > 0.85 ? 'var(--urgent)' : 'var(--blue)'} />
              </div>
              <div>
                <div className="gcp-section-label">Performance Indicators</div>
                <MiniBar label="Economic Development" value={stateStats.economicScore} color="var(--blue)" />
                <MiniBar label="Political Stability" value={stateStats.stabilityScore} color="var(--green)" />
                <MiniBar label="Public Approval" value={stateStats.approvalRating} color={stateStats.approvalRating > 60 ? 'var(--green)' : stateStats.approvalRating > 40 ? 'var(--amber)' : 'var(--urgent)'} />
              </div>
            </div>
          )}

          {/* ─ POLICIES TAB ─ */}
          {activeTab === 'policies' && (
            <div className="gcp-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.48rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                <span>Budget used: <span style={{ color: 'var(--amber)' }}>{budgetUsedPct}%</span> / 85% cap</span>
                <span>{activePolicyCount} active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {stateStats.policies.map(policy => {
                  const cc = CAT_COLORS[policy.category] || 'var(--brass)';
                  return (
                    <div key={policy.id} style={{ border: `1px solid ${policy.isActive ? 'rgba(106,142,224,0.35)' : 'var(--border)'}`, padding: '0.5rem 0.6rem', background: policy.isActive ? 'rgba(106,142,224,0.05)' : 'transparent', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                            <div style={{ width: '6px', height: '6px', backgroundColor: cc, flexShrink: 0 }} />
                            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{policy.name}</span>
                          </div>
                          <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 0.3rem' }}>{policy.description}</p>
                          <div style={{ display: 'flex', gap: '0.6rem', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem' }}>
                            <span style={{ color: 'var(--amber)' }}>Budget: {policy.cost}%</span>
                            <span style={{ color: 'var(--green)' }}>Approval: +{policy.approvalEffect}%</span>
                          </div>
                        </div>
                        {isPlayerCM ? (
                          <button className={`gcp-btn ${policy.isActive ? 'danger' : 'info'}`} style={{ flexShrink: 0, fontSize: '0.48rem', padding: '0.25rem 0.5rem' }} onClick={() => handlePolicyToggle(policy.id)}>
                            {policy.isActive ? 'Repeal' : 'Enact'}
                          </button>
                        ) : policy.isActive ? (
                          <span className="gcp-badge green">Active</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!isPlayerCM && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '0.75rem', letterSpacing: '0.1em' }}>Only the {cmTitle} can enact or repeal policies.</p>}
            </div>
          )}

          {/* ─ CRISES TAB ─ */}
          {activeTab === 'crises' && (
            <div className="gcp-fade-in">
              {stateStats.crises.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>◯</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>No crises recorded</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {stateStats.crises.map(crisis => {
                    const isActive = !crisis.resolved;
                    const sev = crisis.severity === 'high' ? 'rgba(224,92,58,0.35)' : crisis.severity === 'medium' ? 'rgba(201,168,76,0.35)' : 'rgba(99,160,100,0.25)';
                    return (
                      <div key={crisis.id} style={{ border: `1px solid ${sev}`, padding: '0.55rem 0.65rem', background: `${sev.replace('0.35', '0.04')}`, opacity: crisis.resolved ? 0.55 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', color: isActive ? 'var(--urgent)' : 'var(--text-dim)', flexShrink: 0 }}>{CRISIS_ICONS[crisis.type]}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-mid)' }}>{crisis.title}</span>
                              <span className={`gcp-badge ${crisis.resolved ? 'green' : 'red'}`}>{crisis.resolved ? 'Resolved' : 'Active'}</span>
                            </div>
                            <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 0.25rem' }}>{crisis.description}</p>
                            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: crisis.approvalImpact < 0 ? 'var(--urgent)' : 'var(--green)' }}>
                              {crisis.approvalImpact > 0 ? '+' : ''}{crisis.approvalImpact}% approval
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isPlayerCM && activeCrises.length > 0 && (
                    <div style={{ border: '1px solid var(--border)', padding: '0.6rem', marginTop: '0.25rem' }}>
                      <div className="gcp-subtitle" style={{ marginBottom: '0.4rem' }}>Crisis Response</div>
                      <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0 0 0.5rem' }}>Allocate emergency funds to resolve the active crisis (−8% budget).</p>
                      {activeCrises.slice(0, 1).map(c => (
                        <button key={c.id} className="gcp-btn success" style={{ width: '100%' }} onClick={() => setStateStats(prev => ({ ...prev, approvalRating: Math.min(100, prev.approvalRating + 5), crises: prev.crises.map(cr => cr.id === c.id ? { ...cr, resolved: true } : cr) }))}>
                          Resolve "{c.title}"
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─ HISTORY TAB ─ */}
          {activeTab === 'history' && (
            <div className="gcp-fade-in">
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="gcp-section-label" style={{ marginBottom: '0.8rem' }}>Chief Minister History</div>
                {(!stateGovernment.cmHistory || stateGovernment.cmHistory.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>No CM recorded yet</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[...stateGovernment.cmHistory].reverse().map((entry, idx) => {
                      const char = characters.find(c => c.id === entry.cmId);
                      const charPartyId = entry.partyId || (char?.affiliationId ? // Find party fallback
                          parties.find(p => p.affiliationIds.includes(char.affiliationId))?.id
                          : null);
                      const charParty = charPartyId ? parties.find(p => p.id === charPartyId) : undefined;
                      
                      const startDateStr = entry.startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                      const endDateStr = entry.endDate ? entry.endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Present';

                      return (
                        <div key={idx} style={{ border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', padding: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                          onClick={() => char && onCharacterClick(char.id)}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        >
                          <div style={{ width: 36, height: 36, border: `1px solid ${charParty?.color || 'var(--border)'}`, background: charParty?.color ? `${charParty.color}22` : 'rgba(201,168,76,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.9rem', fontWeight: 700, color: charParty?.color || 'var(--brass)', flexShrink: 0 }}>
                            {char?.name?.charAt(0) || '?'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>{char ? char.name : (entry.cmId === 'VACANT' ? 'Vacant' : 'Unknown')}</div>
                            {charParty && <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: charParty.color, marginTop: '0.1rem', textTransform: 'uppercase' }}>{charParty.name}</div>}
                          </div>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', color: 'var(--text-dim)', textAlign: 'right', minWidth: '70px' }}>
                            <div>{endDateStr}</div>
                            <div style={{ color: 'var(--brass)' }}>↑</div>
                            <div>{startDateStr}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="gcp-section-label" style={{ marginBottom: '0.8rem' }}>Legislative History</div>
              {historyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.2rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>◎</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>No legislative history yet</div>
                </div>
              ) : historyData.map((data, idx) => {
                const winnerParty = data.winnerId ? data.parties.find((p: Party) => p.id === data.winnerId) : null;
                return (
                  <div key={idx} style={{ border: '1px solid var(--border)', padding: '0.65rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', fontWeight: 600, color: 'var(--blue)' }}>{data.date.getFullYear()} State Election</div>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.45rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{data.totalSeats} seats</span>
                    </div>
                    {winnerParty
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Winner:</span>
                          <div style={{ width: '7px', height: '7px', backgroundColor: winnerParty.color }} />
                          <span style={{ color: winnerParty.color, fontWeight: 'bold' }}>{winnerParty.name}</span>
                        </div>
                      : <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', color: 'var(--amber)', marginBottom: '0.45rem' }}>⚠ Hung Assembly</div>
                    }
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.45rem' }}>
                      {data.sortedSeats.slice(0, 4).map(([pId, count]: [string, number]) => {
                        const p = data.parties.find((party: Party) => party.id === pId);
                        if (!p || !count) return null;
                        return (
                          <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <div style={{ width: '6px', height: '6px', backgroundColor: p.color }} />
                              <span style={{ color: 'var(--text-dim)' }}>{p.name}</span>
                            </div>
                            <span style={{ color: 'var(--brass)', fontWeight: 'bold' }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', height: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      {data.sortedSeats.map(([pId, count]: [string, number]) => {
                        const p = data.parties.find((party: Party) => party.id === pId);
                        if (!p || !count) return null;
                        return <div key={pId} style={{ width: `${(count / data.totalSeats) * 100}%`, backgroundColor: p.color }} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(StateInfoPanel);