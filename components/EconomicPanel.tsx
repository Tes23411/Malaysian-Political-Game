// ============================================================
// src/components/EconomicPanel.tsx
// Economic dashboard + policy management for the government
// ============================================================

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  EconomicState,
  EconomicPolicy,
  TaxRate,
  SpendingLevel,
  PrioritySector,
  WelfareLevel,
} from '../types'; // adjust to your types path
import {
  getEconomicOutlookLabel,
  getElectionImpactDescription,
  getActiveShockSummary,
  getElectionEconomicMultiplier,
  getEconomicFlavor,
} from '../utils/economics'; // adjust path

interface EconomicPanelProps {
  economicState: EconomicState;
  onPolicyChange: (newPolicy: EconomicPolicy) => void;
  onClose: () => void;
  isGovernment: boolean;       // only ruling coalition can change policy
  publicApproval: number;
  currentDate: Date;
}

// ──────────────────────────────────────────────
// SPARKLINE (SVG mini-chart)
// ──────────────────────────────────────────────

const Sparkline: React.FC<{
  data: number[];
  color: string;
  width?: number;
  height?: number;
}> = ({ data, color, width = 120, height = 36 }) => {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* Last-point dot */}
      <circle
        cx={parseFloat(pts[pts.length - 1].split(',')[0])}
        cy={parseFloat(pts[pts.length - 1].split(',')[1])}
        r="3"
        fill={color}
      />
    </svg>
  );
};

// ──────────────────────────────────────────────
// INDICATOR CARD
// ──────────────────────────────────────────────

const IndicatorCard: React.FC<{
  label: string;
  value: string;
  trend: number;         // positive = up
  sparkData: number[];
  color: string;
  inverse?: boolean;     // if true, up = bad (unemployment, inflation)
}> = ({ label, value, trend, sparkData, color, inverse = false }) => {
  const trendPositive = inverse ? trend < 0 : trend > 0;
  const trendColor = trend === 0 ? '#94a3b8' : trendPositive ? '#22c55e' : '#ef4444';
  const trendSymbol = trend === 0 ? '─' : trend > 0 ? '▲' : '▼';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111] rounded-sm p-4 border border-[#2a2a2a] relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-2">{label}</div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-white text-2xl font-light tracking-tight">{value}</span>
          <span
            className="ml-2 text-xs font-mono font-bold"
            style={{ color: trendColor }}
          >
            {trendSymbol} {Math.abs(trend).toFixed(1)}
          </span>
        </div>
        <Sparkline data={sparkData} color={color} />
      </div>
    </motion.div>
  );
};

// ──────────────────────────────────────────────
// TOGGLE BUTTON GROUP (policy options)
// ──────────────────────────────────────────────

function PolicyToggle<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  descriptions,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  disabled: boolean;
  descriptions?: Record<T, string>;
}) {
  return (
    <div className="mb-6">
      <div className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase mb-3 px-1">
        {label}
      </div>
      <div className="flex bg-[#0a0a0a] rounded-full p-1 border border-[#2a2a2a]">
        {options.map(opt => (
          <button
            key={opt}
            title={descriptions?.[opt]}
            onClick={() => !disabled && onChange(opt)}
            className={`flex-1 py-2 rounded-full text-xs font-medium capitalize transition-all duration-300 relative overflow-hidden
              ${value === opt
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'}
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
          >
            {value === opt && (
               <motion.div 
                  layoutId={`bg-${label}`} 
                  className="absolute inset-0 bg-[#222] border border-[#333] rounded-full" 
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
               />
            )}
            <span className="relative z-10">{opt.replace(/_/g, ' ')}</span>
          </button>
        ))}
      </div>
      {descriptions && value in descriptions && (
        <motion.p 
            key={value}
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="text-gray-500 text-[11px] mt-2 px-2 h-4"
        >
            {descriptions[value]}
        </motion.p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// APPROVAL BAR
// ──────────────────────────────────────────────

const ApprovalBar: React.FC<{ approval: number }> = ({ approval }) => {
  const { label, color } = getEconomicOutlookLabel(approval);
  return (
    <div className="mb-8 p-5 border border-[#2a2a2a] bg-[#111] rounded-sm">
      <div className="flex justify-between items-baseline mb-4">
        <span className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase">
          Economic Approval
        </span>
        <span className="font-medium text-sm tracking-wide" style={{ color }}>
          {label} — {Math.round(approval)}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${approval}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// MAIN PANEL
// ──────────────────────────────────────────────

const EconomicPanel: React.FC<EconomicPanelProps> = ({
  economicState,
  onPolicyChange,
  onClose,
  isGovernment,
  publicApproval,
  currentDate,
}) => {
  const [localPolicy, setLocalPolicy] = useState<EconomicPolicy>({
    ...economicState.policy,
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'policy' | 'shocks'>('overview');

  // ── Spark-data from history ──
  const gdpData = economicState.history.map(h => h.gdpGrowthRate);
  const unempData = economicState.history.map(h => h.unemploymentRate);
  const inflData = economicState.history.map(h => h.inflationRate);
  const approvalData = economicState.history.map(h => h.publicApproval);

  // Trend vs last month
  const trend = (arr: number[]) =>
    arr.length >= 2 ? arr[arr.length - 1] - arr[arr.length - 2] : 0;

  const shocks = useMemo(
    () => getActiveShockSummary(economicState.activeModifiers),
    [economicState.activeModifiers]
  );

  const electionMultiplierGov = getElectionEconomicMultiplier(true, publicApproval);
  const electionImpact = getElectionImpactDescription(publicApproval);

  const handleSave = () => {
    onPolicyChange(localPolicy);
  };

  const policyChanged =
    JSON.stringify(localPolicy) !== JSON.stringify(economicState.policy);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-[100] bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
          className="relative flex flex-col bg-[#0a0a0a] rounded-sm border border-[#2a2a2a] shadow-2xl overflow-hidden font-sans"
          style={{ width: 680, maxHeight: '88vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a] bg-[#0f0f0f]">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
              <div>
                <h2 className="text-white font-medium text-xl tracking-tight">
                  Economic Management
                </h2>
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mt-1">
                  {currentDate.toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-[#2a2a2a] bg-[#0a0a0a] px-6">
            {(['overview', 'policy', 'shocks'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-6 text-[11px] font-mono uppercase tracking-[0.15em] transition-colors relative
                  ${activeTab === tab
                    ? 'text-amber-500'
                    : 'text-gray-500 hover:text-gray-300'}
                `}
              >
                {tab}
                {tab === 'shocks' && shocks.length > 0 && (
                  <span className="ml-2 bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] rounded-full px-1.5 py-0.5">
                    {shocks.length}
                  </span>
                )}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabIndicatorEco" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" 
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-8 flex-1 bg-[#0a0a0a]" style={{ minHeight: 0 }}>
            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                <ApprovalBar approval={publicApproval} />

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <IndicatorCard
                    label="GDP Growth"
                    value={`${economicState.gdpGrowthRate.toFixed(1)}%`}
                    trend={trend(gdpData)}
                    sparkData={gdpData.slice(-24)}
                    color="#22c55e"
                  />
                  <IndicatorCard
                    label="Unemployment"
                    value={`${economicState.unemploymentRate.toFixed(1)}%`}
                    trend={trend(unempData)}
                    sparkData={unempData.slice(-24)}
                    color="#f97316"
                    inverse
                  />
                  <IndicatorCard
                    label="Inflation"
                    value={`${economicState.inflationRate.toFixed(1)}%`}
                    trend={trend(inflData)}
                    sparkData={inflData.slice(-24)}
                    color="#a78bfa"
                    inverse
                  />
                  <IndicatorCard
                    label="Budget Balance"
                    value={`${economicState.budgetBalance >= 0 ? '+' : ''}${Math.round(economicState.budgetBalance)}M`}
                    trend={trend(approvalData)}
                    sparkData={approvalData.slice(-24)}
                    color="#60a5fa"
                  />
                </div>

                {/* National Debt */}
                <div className="bg-[#111] rounded-sm p-6 border border-[#2a2a2a] mb-6 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase mb-2">
                      National Debt
                    </div>
                    <div className="text-white text-3xl font-light tracking-tight">
                      ${Math.round(economicState.nationalDebt).toLocaleString()}M
                    </div>
                    { (economicState as any).gdpSize && (
                      <div className="text-xs mt-1" style={{ color: (economicState.nationalDebt / (economicState as any).gdpSize) > 1.0 ? '#ef4444' : (economicState.nationalDebt / (economicState as any).gdpSize) > 0.6 ? '#fbbf24' : '#22c55e' }}>
                         Debt-to-GDP: {Math.round((economicState.nationalDebt / (economicState as any).gdpSize) * 100)}%
                      </div>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs text-right max-w-[220px] font-mono">
                    {economicState.budgetBalance < 0
                      ? `Deficit of ${Math.abs(Math.round(economicState.budgetBalance))}M/yr adds to debt.`
                      : `Surplus of ${Math.round(economicState.budgetBalance)}M/yr reduces debt.`}
                  </div>
                </div>

                {/* Complex Indicators */}
                {((economicState as any).structural || (economicState as any).sectors) && (
                  <div className="bg-[#111] rounded-sm p-6 border border-[#2a2a2a] mb-6 flex flex-col gap-4">
                    <div className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase mb-2">
                       Structural & Sectoral Indicators
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Structure */}
                      { (economicState as any).structural && (
                        <>
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Corruption Index</span>
                            <span className="text-white text-lg">{Math.round((economicState as any).structural.corruptionIndex)}/100</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Infrastructure</span>
                            <span className="text-white text-lg">{Math.round((economicState as any).structural.infrastructureScore)}/100</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Gini (Inequality)</span>
                            <span className="text-white text-lg">{(economicState as any).structural.giniCoefficient.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Human Capital</span>
                            <span className="text-white text-lg">{Math.round((economicState as any).structural.humanCapitalIndex)}/100</span>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Sectors */}
                    { (economicState as any).sectors && (
                      <div className="mt-2">
                         <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">GDP Output Share</div>
                         <div className="flex h-3 rounded bg-[#222] overflow-hidden">
                            <div title={`Agri: ${Math.round((economicState as any).sectors.agriculture)}%`} style={{width: `${(economicState as any).sectors.agriculture}%`, backgroundColor: '#84cc16'}} />
                            <div title={`Indus: ${Math.round((economicState as any).sectors.industry)}%`} style={{width: `${(economicState as any).sectors.industry}%`, backgroundColor: '#f59e0b'}} />
                            <div title={`Serv: ${Math.round((economicState as any).sectors.services)}%`} style={{width: `${(economicState as any).sectors.services}%`, backgroundColor: '#3b82f6'}} />
                         </div>
                         <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-1">
                            <span>Agri: {Math.round((economicState as any).sectors.agriculture)}%</span>
                            <span>Indus: {Math.round((economicState as any).sectors.industry)}%</span>
                            <span>Serv: {Math.round((economicState as any).sectors.services)}%</span>
                         </div>
                      </div>
                    )}
                    {/* Confidence & Reserves */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                       { (economicState as any).momentum && (
                          <>
                            <div className="flex flex-col">
                              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Consumer Conf.</span>
                              <span className="text-white text-lg">{Math.round((economicState as any).momentum.consumerConfidence)}/100</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Business Conf.</span>
                              <span className="text-white text-lg">{Math.round((economicState as any).momentum.businessConfidence)}/100</span>
                            </div>
                          </>
                       )}
                       { (economicState as any).external && (
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px] uppercase tracking-wider">FX Reserves</span>
                            <span className="text-white text-lg">{(economicState as any).external.foreignReserves.toFixed(1)} mo</span>
                          </div>
                       )}
                    </div>
                  </div>
                )}
                
                {/* Election Impact */}
                <div
                  className="rounded-sm p-5 border flex items-start gap-4 mb-6"
                  style={{
                    backgroundColor: publicApproval >= 50 ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)',
                    borderColor: publicApproval >= 50 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  }}
                >
                  <div className="text-3xl mt-1">
                    {publicApproval >= 70
                      ? '📈'
                      : publicApproval >= 50
                      ? '📊'
                      : publicApproval >= 35
                      ? '📉'
                      : '🚨'}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm mb-1 uppercase tracking-wide">
                      Election Impact
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed max-w-md">{electionImpact}</p>
                    <p className="text-gray-500 text-[11px] mt-3 font-mono">
                      Ruling Coalition Multiplier:{' '}
                      <span
                        className="font-bold text-xs"
                        style={{
                          color:
                            electionMultiplierGov >= 1.1
                              ? '#22c55e'
                              : electionMultiplierGov <= 0.9
                              ? '#ef4444'
                              : '#fbbf24',
                        }}
                      >
                        ×{electionMultiplierGov.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* State of the Economy Flavor Text */}
                <div className="bg-[#111] rounded-sm p-5 border border-[#2a2a2a] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                     <span className="text-6xl font-serif">"</span>
                  </div>
                  <div className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase mb-3">
                    State of the Economy
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {getEconomicFlavor(economicState as any)}
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── POLICY TAB ── */}
            {activeTab === 'policy' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {!isGovernment && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-sm p-4 mb-8 text-amber-500 text-xs font-mono uppercase tracking-wide flex items-center gap-3">
                    <span className="text-lg">⚠️</span> 
                    <span>Only the ruling coalition can set economic policy.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <PolicyToggle<TaxRate>
                            label="Tax Rate"
                            options={['low', 'medium', 'high']}
                            value={localPolicy.taxRate}
                            onChange={v => setLocalPolicy(p => ({ ...p, taxRate: v }))}
                            disabled={!isGovernment}
                            descriptions={{
                            low: 'Boosts growth & employment. Shrinks budget revenue.',
                            medium: 'Balanced approach.',
                            high: 'Increases revenue but dampens economic activity.',
                            }}
                        />
                        <PolicyToggle<SpendingLevel>
                            label="Government Spending"
                            options={['austerity', 'balanced', 'expansionary']}
                            value={localPolicy.spendingLevel}
                            onChange={v => setLocalPolicy(p => ({ ...p, spendingLevel: v }))}
                            disabled={!isGovernment}
                            descriptions={{
                            austerity: 'Cut spending to reduce deficit. Hurts jobs and approval.',
                            balanced: 'Maintain current expenditure.',
                            expansionary: 'Invest heavily to grow economy. Increases deficit.',
                            }}
                        />
                    </div>
                    <div>
                        <PolicyToggle<PrioritySector>
                            label="Priority Sector"
                            options={['agriculture', 'industry', 'services', 'balanced']}
                            value={localPolicy.prioritySector}
                            onChange={v => setLocalPolicy(p => ({ ...p, prioritySector: v }))}
                            disabled={!isGovernment}
                            descriptions={{
                            agriculture: 'Support rubber & tin sectors. Rural voter appeal.',
                            industry: 'Invest in manufacturing. Higher growth potential.',
                            services: 'Develop trade & commerce. Urban approval.',
                            balanced: 'No single sector prioritised.',
                            }}
                        />
                        <PolicyToggle<WelfareLevel>
                            label="Welfare & Social Spending"
                            options={['minimal', 'moderate', 'generous']}
                            value={localPolicy.welfareLevel}
                            onChange={v => setLocalPolicy(p => ({ ...p, welfareLevel: v }))}
                            disabled={!isGovernment}
                            descriptions={{
                            minimal: 'Reduce spending. Unpopular but saves budget.',
                            moderate: 'Standard welfare provision.',
                            generous: 'High welfare spending. Very popular; costly.',
                            }}
                        />
                    </div>
                </div>

                {/* Trade Toggle */}
                <div className="mb-8">
                  <div className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase mb-3 px-1">
                    Trade Policy
                  </div>
                  <button
                    onClick={() =>
                      !isGovernment ||
                      setLocalPolicy(p => ({ ...p, openTrade: !p.openTrade }))
                    }
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-sm border transition-all
                      ${localPolicy.openTrade
                        ? 'bg-blue-500/5 border-blue-500/30 text-blue-400'
                        : 'bg-[#111] border-[#2a2a2a] text-gray-400'}
                      ${!isGovernment ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    `}
                  >
                    <span className="text-2xl">{localPolicy.openTrade ? '🌐' : '🚧'}</span>
                    <div className="text-left">
                      <div className="font-medium text-sm text-white">
                        {localPolicy.openTrade ? 'Open Trade' : 'Protectionism'}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {localPolicy.openTrade
                          ? 'Free trade boosts growth and lowers inflation.'
                          : 'Protectionism shields domestic industries but reduces efficiency.'}
                      </div>
                    </div>
                  </button>
                </div>

                <AnimatePresence>
                    {isGovernment && policyChanged && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        onClick={handleSave}
                        className="w-full py-4 bg-white hover:bg-gray-200 text-black font-bold rounded-sm transition-colors text-xs tracking-widest uppercase"
                    >
                        Apply External Policy Directives
                    </motion.button>
                    )}
                </AnimatePresence>

                {isGovernment && !policyChanged && (
                  <div className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-gray-600 py-4 border border-dashed border-[#2a2a2a] rounded-sm">
                    No active changes pending
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SHOCKS TAB ── */}
            {activeTab === 'shocks' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                {shocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[#2a2a2a] rounded-sm">
                    <div className="text-4xl mb-4 opacity-50 grayscale">📊</div>
                    <div className="text-sm font-medium text-white mb-2">System Optimal</div>
                    <div className="text-[11px] text-gray-500 font-mono tracking-wide uppercase">No anomalous economic conditions detected</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {economicState.activeModifiers.map((mod, i) => {
                      const positive = mod.gdpEffect > 0;
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                          key={mod.id}
                          className="rounded-sm p-5 border bg-[#111]"
                          style={{
                            borderColor: positive
                              ? 'rgba(34,197,94,0.3)'
                              : 'rgba(239,68,68,0.3)',
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white text-sm font-semibold tracking-wide">
                              {positive ? '↑ ' : '↓ '}
                              {mod.name}
                            </span>
                            <span className="text-gray-500 font-mono text-[10px] uppercase">
                              {mod.remainingMonths} mo
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mb-4 min-h-[40px] leading-relaxed">{mod.description}</p>
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] font-mono uppercase">
                            <span style={{ color: mod.gdpEffect >= 0 ? '#22c55e' : '#ef4444' }}>
                              GDP {mod.gdpEffect >= 0 ? '+' : ''}{mod.gdpEffect.toFixed(1)}%
                            </span>
                            <span style={{ color: mod.unemploymentEffect <= 0 ? '#22c55e' : '#ef4444' }}>
                              UNEMP {mod.unemploymentEffect >= 0 ? '+' : ''}{mod.unemploymentEffect.toFixed(1)}%
                            </span>
                            <span style={{ color: mod.inflationEffect <= 0 ? '#22c55e' : '#f97316' }}>
                              INFL {mod.inflationEffect >= 0 ? '+' : ''}{mod.inflationEffect.toFixed(1)}%
                            </span>
                            <span style={{ color: mod.approvalEffect >= 0 ? '#60a5fa' : '#ef4444' }}>
                              APPV {mod.approvalEffect >= 0 ? '+' : ''}{mod.approvalEffect}
                            </span>
                          </div>
                          {/* Duration progress bar */}
                          <div className="mt-4 h-1 bg-[#222] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(mod.remainingMonths / mod.durationMonths) * 100}%` }}
                              className="h-full rounded-full transition-all"
                              style={{
                                background: positive ? '#22c55e' : '#ef4444',
                              }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EconomicPanel;
