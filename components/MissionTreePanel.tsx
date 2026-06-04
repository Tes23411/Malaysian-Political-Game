// ============================================================
// src/components/MissionTreePanel.tsx
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import {
  MissionTreeId, MissionTreeState, Mission, MissionStatus,
  MISSIONS_BY_TREE, TREE_ACCESS_RULES, TREE_COLORS, TREE_NAMES,
  ALL_MISSIONS, getMissionStatus, getTreeProgress,
  getActiveMissionDetails, checkMissionRequirements, startMission,
} from '../utils/missionTrees';
import { type ComplexEconomicState } from '../utils/economics';

import { Bill } from '../types';

interface Props {
  missionTreeState: MissionTreeState;
  econState: ComplexEconomicState;
  passedLaws?: Bill[];
  onStartMission: (missionId: string) => void;
  onClose: () => void;
  isGovernment: boolean;
}

const TIER_LABELS = ['Foundation', 'Development', 'Legacy'];

const STATUS_STYLES: Record<MissionStatus, { bg: string; border: string; text: string; label: string; shadow?: string }> = {
  locked:      { bg: 'bg-[#111111]',  border: 'border-white/5', text: 'text-gray-600', label: 'Locked' },
  available:   { bg: 'bg-[#1a1c1a]',  border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'Available', shadow: 'shadow-[0_0_15px_rgba(234,179,8,0.1)]' },
  in_progress: { bg: 'bg-[#121c26]',  border: 'border-blue-500/50', text: 'text-blue-400', label: 'Active', shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]' },
  completed:   { bg: 'bg-[#122216]',  border: 'border-green-500/30', text: 'text-green-500', label: 'Resolved' },
  failed:      { bg: 'bg-[#2a1313]',  border: 'border-red-500/30',   text: 'text-red-400',   label: 'Failed' },
  crisis:      { bg: 'bg-[#2a1a11]',  border: 'border-orange-500/50', text: 'text-orange-400', label: 'Crisis', shadow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]' },
  locked_by_choice: { bg: 'bg-[#111]', border: 'border-dashed border-white/10', text: 'text-gray-700', label: 'Bypassed' },
};

const formatValue = (num: number, prefix: string = '', suffix: string = '') => 
    `${num > 0 ? '+' : ''}${prefix}${num.toFixed(1).replace(/\.0$/, '')}${suffix}`;

// ── Active mission progress bar ────────────────────────────
const ActiveMissionBar: React.FC<{ missionId: string; state: MissionTreeState; color: string }> = ({ missionId, state, color }) => {
  const active = state.activeMissions.find(a => a.missionId === missionId);
  if (!active) return null;
  const { mission, progressPercent } = getActiveMissionDetails(active);
  if (!mission) return null;
  return (
    <div className="mt-4 border-t border-white/5 pt-3">
      <div className="flex justify-between text-[10px] text-gray-400 tracking-widest uppercase mb-1">
        <span>Progress</span>
        <span>{active.monthsRemaining} mo</span>
      </div>
      <div className="h-1 bg-black/50 overflow-hidden relative border border-white/5">
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0"
            style={{ backgroundColor: color }}
        />
        {/* Shimmer effect */}
        <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      </div>
    </div>
  );
};

// ── Mission card ────────────────────────────────────────────
const MissionCard: React.FC<{
  mission: Mission;
  status: MissionStatus;
  treeColor: string;
  missionTreeState: MissionTreeState;
  econState: ComplexEconomicState;
  passedLaws?: Bill[];
  onStart: (id: string) => void;
  isGovernment: boolean;
}> = ({ mission, status, treeColor, missionTreeState, econState, passedLaws, onStart, isGovernment }) => {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLES[status];

  const { met, unmetReasons } = useMemo(() =>
    checkMissionRequirements(mission, econState, missionTreeState, passedLaws),
    [mission, econState, missionTreeState, passedLaws]
  );

  const canStart = status === 'available' && met && isGovernment;

  return (
    <motion.div
      id={`mission-${mission.id}`}
      layout
      transition={{ layout: { duration: 0.3, type: 'spring', bounce: 0.2 } }}
      className={`relative border ${style.bg} ${style.border} ${style.shadow || ''} cursor-pointer transition-colors duration-300 overflow-hidden group w-72 shrink-0 z-10`}
      style={{
          borderLeft: status === 'in_progress' || status === 'available' ? `4px solid ${treeColor}` : undefined
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Background graphic */}
      {status === 'completed' && (
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-2 -translate-y-4">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
          </div>
      )}

      <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider ${style.text} bg-black/40 border border-white/5`}>
                  {style.label}
                </span>
                <span className="text-gray-500 font-mono text-[10px] tracking-widest">{mission.durationMonths} MO</span>
              </div>
              <h3 className={`text-sm tracking-tight ${status === 'completed' ? 'text-gray-300' : 'text-gray-100'} font-medium`}>
                  {mission.name}
              </h3>
            </div>
          </div>

          <AnimatePresence initial={false}>
              {expanded && (
                  <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                  >
                      <div className="text-gray-400 text-xs mt-3 leading-relaxed border-l-2 border-white/10 pl-3">
                          {mission.description}
                      </div>
                      
                      {mission.flavourQuote && (
                        <div className="mt-3 text-[11px] text-gray-500 italic font-serif">
                            "{mission.flavourQuote}"
                        </div>
                      )}

                      <div className="mt-4 space-y-3">
                          {/* Requirements */}
                          <div className="bg-black/20 p-3 rounded-sm border border-white/5">
                            <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-2">Conditions</h4>
                            <p className="text-gray-300 text-[11px]">{mission.requirements.description}</p>
                            
                            {!met && status === 'available' && (
                              <ul className="mt-2 space-y-1">
                                {unmetReasons.map((r, i) => (
                                  <li key={i} className="text-red-400/90 text-[11px] flex items-start gap-1.5">
                                    <span className="shrink-0 mt-0.5">⊗</span><span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Rewards */}
                          <div className="bg-black/20 p-3 rounded-sm border border-white/5 flex flex-wrap gap-x-4 gap-y-2">
                            <h4 className="w-full text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">Impact</h4>
                            
                            {mission.reward.gdpBonus && <div className="text-[11px]"><span className="text-gray-500">GDP:</span> <span className="text-green-400">+{mission.reward.gdpBonus}%</span></div>}
                            {mission.reward.unemploymentBonus !== undefined && <div className="text-[11px]"><span className="text-gray-500">Unemap:</span> <span className={mission.reward.unemploymentBonus > 0 ? 'text-red-400' : 'text-green-400'}>{formatValue(mission.reward.unemploymentBonus, '', '%')}</span></div>}
                            {mission.reward.inflationModifier !== undefined && <div className="text-[11px]"><span className="text-gray-500">Inflation:</span> <span className={mission.reward.inflationModifier > 0 ? 'text-orange-400' : 'text-green-400'}>{formatValue(mission.reward.inflationModifier, '', '%')}</span></div>}
                            {mission.reward.budgetBonus !== undefined && <div className="text-[11px]"><span className="text-gray-500">Reserves:</span> <span className="text-green-400">{formatValue(mission.reward.budgetBonus, '', 'M')}</span></div>}
                            {mission.reward.structuralBonus?.corruptionReduction !== undefined && <div className="text-[11px]"><span className="text-gray-500">Corruption:</span> <span className="text-green-400">-{mission.reward.structuralBonus.corruptionReduction}</span></div>}
                            {mission.reward.policyUnlock && <div className="text-[11px] w-full mt-1 border-t border-white/5 pt-1"><span className="text-gray-500">Unlocks:</span> <span className="text-blue-300">{mission.reward.policyUnlock.description}</span></div>}
                          </div>
                      </div>

                      {/* Action */}
                      <div className="mt-4">
                          {canStart && (
                            <button
                              className="w-full py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors"
                              onClick={e => { e.stopPropagation(); onStart(mission.id); }}
                            >
                              Initialize Directive
                            </button>
                          )}
                          {status === 'available' && !met && isGovernment && (
                            <div className="w-full py-2 bg-red-500/10 text-red-400/80 text-[10px] font-bold uppercase tracking-wider text-center border border-red-500/20">
                              Conditions Not Met
                            </div>
                          )}
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>

          {/* Active progress (shows even when collapsed) */}
          {status === 'in_progress' && (
            <ActiveMissionBar missionId={mission.id} state={missionTreeState} color={treeColor} />
          )}
      </div>
    </motion.div>
  );
};

// ── Tree column ─────────────────────────────────────────────
const TreeColumn: React.FC<{
  treeId: MissionTreeId;
  missionTreeState: MissionTreeState;
  econState: ComplexEconomicState;
  passedLaws?: Bill[];
  onStart: (id: string) => void;
  isGovernment: boolean;
  isUnlocked: boolean;
}> = ({ treeId, missionTreeState, econState, passedLaws, onStart, isGovernment, isUnlocked }) => {
  const color = TREE_COLORS[treeId];
  const name  = TREE_NAMES[treeId];
  const missions = MISSIONS_BY_TREE[treeId];
  const progress = getTreeProgress(treeId, missionTreeState);
  const rule = TREE_ACCESS_RULES.find(r => r.treeId === treeId)!;

  const tiers: (1 | 2 | 3)[] = [1, 2, 3];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border border-white/10 relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: color }} />

      {/* Tree header */}
      <div className="p-6 border-b border-white/10 relative z-10 bg-black/40 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
            <div>
                <motion.h2 
                    key={name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-mono text-2xl font-light tracking-tight text-white"
                >
                    {name}
                </motion.h2>
                <p className="text-gray-400 text-sm mt-2 max-w-2xl font-serif italic border-l-2 border-white/20 pl-4">{rule.description}</p>
            </div>
            
            <div className="text-right">
                <div className="text-[10px] font-mono tracking-widest text-gray-500 uppercase mb-1">Completion</div>
                <div className="text-3xl font-light" style={{ color }}>{Math.round(progress.percentage)}%</div>
            </div>
        </div>

        {/* Progress Bar overall */}
        <div className="h-0.5 bg-white/10 w-full mb-4 relative">
             <div className="absolute inset-y-0 left-0 bg-white/60 transition-all duration-1000" style={{ width: `${progress.percentage}%` }} />
        </div>

        {/* Access requirements */}
        <div className="flex flex-wrap gap-2 text-[10px] font-mono tracking-wider uppercase">
          <span className="border border-white/10 bg-black/50 px-2 py-1 text-gray-400">
            EC: {rule.economicRange[0]}–{rule.economicRange[1]}
          </span>
          <span className="border border-white/10 bg-black/50 px-2 py-1 text-gray-400">
            GV: {rule.governanceRange[0]}–{rule.governanceRange[1]}
          </span>
          {rule.ethnicFocus && (
            <span className="border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-yellow-500">
              {rule.ethnicFocus}
            </span>
          )}
        </div>
      </div>

      {/* Missions by tier */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10" id={`tree-container-${treeId}`}>
        <Xwrapper>
          <div className="space-y-16">
            {tiers.map(tier => {
              const tierMissions = missions.filter(m => m.tier === tier);
              if (tierMissions.length === 0) return null;
              
              return (
                <motion.div 
                    key={tier}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: tier * 0.1 }}
                    className="relative"
                >
                  <div className="text-[10px] font-mono text-center tracking-[0.2em] uppercase text-gray-500 mb-8 flex items-center gap-4">
                      <div className="h-px flex-1 bg-white/10" />
                      <span>Phase 0{tier} // {TIER_LABELS[tier - 1]}</span>
                      <div className="h-px flex-1 bg-white/10" />
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-8">
                    {tierMissions.map(mission => {
                      const status = isUnlocked
                        ? getMissionStatus(mission.id, missionTreeState)
                        : 'locked';
                      return (
                        <MissionCard
                          key={mission.id}
                          mission={mission}
                          status={status}
                          treeColor={color}
                          missionTreeState={missionTreeState}
                          econState={econState}
                          passedLaws={passedLaws}
                          onStart={onStart}
                          isGovernment={isGovernment && isUnlocked}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Draw Arrows underneath cards but over background */}
          {missions.map(mission => 
            mission.prerequisiteIds.map(prereqId => {
               const prereqStatus = isUnlocked ? getMissionStatus(prereqId, missionTreeState) : 'locked';
               // color green if prereq completed, else dim
               const isActive = prereqStatus === 'completed';
               return (
                 <Xarrow
                   key={`${prereqId}-${mission.id}`}
                   start={`mission-${prereqId}`}
                   end={`mission-${mission.id}`}
                   color={isActive ? color : 'rgba(255,255,255,0.15)'}
                   strokeWidth={3}
                   path="grid"
                   showHead={true}
                   headSize={5}
                   zIndex={0}
                   dashness={!isActive ? { strokeLen: 5, nonStrokeLen: 5, animation: false } : undefined}
                 />
               );
            })
          )}
        </Xwrapper>
      </div>
    </div>
  );
};

// ── Main Panel ──────────────────────────────────────────────
const MissionTreePanel: React.FC<Props> = ({
  missionTreeState, econState, passedLaws, onStartMission, onClose, isGovernment,
}) => {
  const [selectedTreeId, setSelectedTreeId] = useState<MissionTreeId>(
    missionTreeState.unlockedTreeIds[0] ?? 'bumiputera_agenda'
  );
  const [startError, setStartError] = useState<string | null>(null);

  const handleStartMission = (missionId: string) => {
    const { error } = startMission(missionId, missionTreeState, new Date(), econState);
    if (error) {
      setStartError(error);
      setTimeout(() => setStartError(null), 3000);
    } else {
      onStartMission(missionId);
    }
  };

  const allTreeIds: MissionTreeId[] = [
    'bumiputera_agenda', 'developmental_state', 'liberal_open_economy',
    'socialist_welfare', 'export_tiger', 'federal_pluralism',
  ];

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-stretch bg-black/90 backdrop-blur-md p-4 md:p-8"
        onClick={onClose}
    >
      <div 
          className="flex flex-col w-full h-full max-w-7xl mx-auto bg-[#050505] border border-white/10 shadow-2xl overflow-hidden font-sans text-gray-200"
          onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
           <div className="flex items-center gap-4">
               <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
               </div>
               <div>
                   <h1 className="text-lg font-medium tracking-tight uppercase">Strategic Initiatives</h1>
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">National Development Directorate</p>
               </div>
           </div>
           
           <button onClick={onClose} className="px-4 py-2 border border-white/10 hover:bg-white hover:text-black transition-colors text-xs uppercase tracking-wider font-bold">
               Close
           </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 shrink-0 border-r border-white/10 flex flex-col bg-[#020202]">
            <div className="p-6">
                <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-500 mb-4">Paradigms</div>
                <div className="space-y-1">
                    {allTreeIds.map(tid => {
                        const isUnlocked = missionTreeState.unlockedTreeIds.includes(tid);
                        const isSelected = selectedTreeId === tid;
                        return (
                            <button
                                key={tid}
                                onClick={() => setSelectedTreeId(tid)}
                                className={`w-full text-left px-4 py-3 border-l-2 transition-all flex items-center justify-between group ${isSelected ? 'bg-white/5 border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            >
                                <span className={`text-xs uppercase tracking-wider ${isSelected ? 'font-bold' : ''}`}>{TREE_NAMES[tid]}</span>
                                {!isUnlocked && <span className="opacity-50">🔒</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
            
            {/* Active / Errors */}
            <div className="flex-1 p-6 border-t border-white/10 overflow-y-auto">
                {startError && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6 p-4 border border-red-500/50 bg-red-500/10">
                        <div className="text-[10px] uppercase tracking-wider text-red-500 font-bold mb-1">Authorization Failed</div>
                        <div className="text-xs text-red-400">{startError}</div>
                    </motion.div>
                )}
                
                <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-500 mb-4">Active Operations</div>
                <div className="space-y-3">
                    {missionTreeState.activeMissions.length === 0 ? (
                        <div className="text-xs text-gray-600 italic">No active directives.</div>
                    ) : (
                        missionTreeState.activeMissions.map(am => {
                            const { mission, progressPercent } = getActiveMissionDetails(am);
                            if (!mission) return null;
                            return (
                                <div key={am.missionId} className="p-3 border border-blue-500/20 bg-blue-500/5">
                                    <div className="text-xs font-medium text-blue-100 truncate">{mission.name}</div>
                                    <div className="mt-2 h-1 bg-black overflow-hidden relative">
                                        <div className="absolute inset-y-0 left-0 bg-blue-500" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                    <div className="mt-1 text-[10px] text-blue-400 font-mono flex justify-between">
                                        <span>{Math.round(progressPercent)}%</span>
                                        <span>{am.monthsRemaining}M</span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
              <TreeColumn
                  treeId={selectedTreeId}
                  missionTreeState={missionTreeState}
                  econState={econState}
                  passedLaws={passedLaws}
                  onStart={handleStartMission}
                  isGovernment={isGovernment}
                  isUnlocked={missionTreeState.unlockedTreeIds.includes(selectedTreeId)}
              />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MissionTreePanel;

