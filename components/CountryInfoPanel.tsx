import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Demographics, Character } from '../types';

interface CountryInfoPanelProps {
  demographicsMap: Map<string, Demographics>;
  characters: Character[];
  allSeatCodes: string[];
  onClose: () => void;
}

const ETHNIC_COLORS = {
  malay:   '#d4a843', // goldish
  chinese: '#c0392b', // red
  indian:  '#2980b9', // blue
  sabahM: '#2e8b57',
  sabahNM: '#d0c354',
  sarawakM: '#4682b4',
  sarawakNM: '#cd853f',
  orangAsli: '#8b4513',
  others:  '#7f8c8d', // gray
};

const formatNumber = (num: number) => new Intl.NumberFormat('en-MY').format(Math.round(num));

const CountryInfoPanel: React.FC<CountryInfoPanelProps> = ({ demographicsMap, characters, allSeatCodes, onClose }) => {
  const stats = useMemo(() => {
    const stateStats = new Map<string, { total: number; malay: number; chinese: number; indian: number; sabahM: number; sabahNM: number; sarawakM: number; sarawakNM: number; orangAsli: number; others: number; urban: number; semiUrban: number; rural: number }>();
    const national = { total: 0, malay: 0, chinese: 0, indian: 0, sabahM: 0, sabahNM: 0, sarawakM: 0, sarawakNM: 0, orangAsli: 0, others: 0, urban: 0, semiUrban: 0, rural: 0 };

    const activeSeatSet = new Set(allSeatCodes);
    demographicsMap.forEach((demo, seatCode) => {
      if (!activeSeatSet.has(seatCode)) return;

      const state = demo.state.trim().toUpperCase();
      const pop = demo.totalElectors;
      const malay   = Math.round(pop * (demo.malayPercent   / 100));
      const chinese = Math.round(pop * (demo.chinesePercent / 100));
      const indian  = Math.round(pop * (demo.indiansPercent  / 100));
      const sabahM = Math.round(pop * (demo.bumiputeraSabahMuslimPercent / 100) || 0);
      const sabahNM = Math.round(pop * (demo.bumiputeraSabahNonMuslimPercent / 100) || 0);
      const sarawakM = Math.round(pop * (demo.bumiputeraSarawakMuslimPercent / 100) || 0);
      const sarawakNM = Math.round(pop * (demo.bumiputeraSarawakNonMuslimPercent / 100) || 0);
      const orangAsli = Math.round(pop * (demo.orangAsliPercent / 100) || 0);
      const others  = Math.round(pop * (demo.othersPercent  / 100));
      
      const classification = String(demo.urbanRuralClassification2018 || 'SEMI-URBAN').toUpperCase();
      let isUrban = classification.includes('URBAN') && classification !== 'SEMI-URBAN' && classification !== 'SEMI URBAN';
      let isRural = classification.includes('RURAL');
      let urbanPop = isUrban ? pop : 0;
      let ruralPop = isRural ? pop : 0;
      let semiUrbanPop = (!isUrban && !isRural) ? pop : 0;

      national.total   += pop;
      national.malay   += malay;
      national.chinese += chinese;
      national.indian  += indian;
      national.sabahM += sabahM;
      national.sabahNM += sabahNM;
      national.sarawakM += sarawakM;
      national.sarawakNM += sarawakNM;
      national.orangAsli += orangAsli;
      national.others  += others;
      national.urban   += urbanPop;
      national.semiUrban += semiUrbanPop;
      national.rural += ruralPop;

      if (!stateStats.has(state)) stateStats.set(state, { total: 0, malay: 0, chinese: 0, indian: 0, sabahM: 0, sabahNM: 0, sarawakM: 0, sarawakNM: 0, orangAsli: 0, others: 0, urban: 0, semiUrban: 0, rural: 0 });
      const s = stateStats.get(state)!;
      s.total += pop; s.malay += malay; s.chinese += chinese; s.indian += indian; s.sabahM += sabahM; s.sabahNM += sabahNM; s.sarawakM += sarawakM; s.sarawakNM += sarawakNM; s.orangAsli += orangAsli; s.others += others;
      s.urban += urbanPop; s.semiUrban += semiUrbanPop; s.rural += ruralPop;
    });

    const stateList = Array.from(stateStats.entries()).map(([name, data]) => ({
      name, ...data,
      malayPercent:   (data.malay   / data.total) * 100,
      chinesePercent: (data.chinese / data.total) * 100,
      indiansPercent:  (data.indian  / data.total) * 100,
      sabahMPercent: (data.sabahM / data.total) * 100,
      sabahNMPercent: (data.sabahNM / data.total) * 100,
      sarawakMPercent: (data.sarawakM / data.total) * 100,
      sarawakNMPercent: (data.sarawakNM / data.total) * 100,
      orangAsliPercent: (data.orangAsli / data.total) * 100,
      othersPercent:  (data.others  / data.total) * 100,
      urbanPercent:   (data.urban   / data.total) * 100,
      semiUrbanPercent:(data.semiUrban / data.total) * 100,
      ruralPercent:   (data.rural   / data.total) * 100,
    })).sort((a, b) => b.total - a.total);

    const nationalPercents = {
        malay:   (national.malay   / national.total) * 100,
        chinese: (national.chinese / national.total) * 100,
        indian:  (national.indian  / national.total) * 100,
        sabahM: (national.sabahM / national.total) * 100,
        sabahNM: (national.sabahNM / national.total) * 100,
        sarawakM: (national.sarawakM / national.total) * 100,
        sarawakNM: (national.sarawakNM / national.total) * 100,
        orangAsli: (national.orangAsli / national.total) * 100,
        others:  (national.others  / national.total) * 100,
        urban:   (national.urban   / national.total) * 100,
        semiUrban: (national.semiUrban / national.total) * 100,
        rural:   (national.rural   / national.total) * 100,
    };

    const aliveCharactersCount = characters.filter(c => c.isAlive).length;
    return { national, nationalPercents, stateList, aliveCharactersCount };
  }, [demographicsMap, characters, allSeatCodes]);

  const getNationalFlavor = () => {
      const isHighlyUrban = stats.nationalPercents.urban > 45;
      const isMalayMajority = stats.nationalPercents.malay > 50;
      const isMixed = stats.nationalPercents.malay <= 50;
      
      let text = "The strategic electoral math of this nation relies on securing key urban centres while preserving appeal in expansive rural strongholds. ";
      
      if (isHighlyUrban) {
          text += "Fast-paced urbanization dictates that economic policy, cost of living, and metropolitan development are paramount electoral issues. ";
      } else {
          text += "A strong semi-urban and rural base means that issues of agriculture, traditional values, and local infrastructure remain essential to clinching a parliamentary majority. ";
      }

      if (isMalayMajority) {
          text += "The electorate is anchored by a strong Bumiputera majority, making the preservation of cultural heritage and affirmative action central themes, while robust minority voting blocs require inclusive coalition strategies to attain a supermajority.";
      } else if (isMixed) {
          text += "With a highly mixed demographic makeup, no single group can govern autonomously; complex, multiracial coalitions and centrist policy-making form the bedrock of political success here.";
      }

      return text;
  };

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8"
        onClick={onClose}
    >
      <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
          className="w-full max-w-5xl bg-[#0a0a0a] border border-[#2a2a2a] shadow-2xl overflow-hidden flex flex-col max-h-full font-sans"
          onClick={e => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a] bg-[#0f0f0f]">
              <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
                  <div>
                      <h2 className="text-xl font-medium text-white tracking-tight">Electorate Demographics</h2>
                      <div className="text-[11px] uppercase tracking-widest text-gray-500 font-mono mt-0.5">National Statistics Department</div>
                  </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#0a0a0a]">
              
              {/* National Overview Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Hero Stats */}
                  <div className="md:col-span-1 space-y-4">
                      <div className="p-5 border border-[#2a2a2a] bg-[#111] rounded-sm relative overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                           <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2">Total Electorate</div>
                           <div className="text-4xl font-light text-white tracking-tight">{formatNumber(stats.national.total)}</div>
                      </div>
                      <div className="p-5 border border-[#2a2a2a] bg-[#111] rounded-sm relative overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                           <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2">Active Politicians</div>
                           <div className="text-4xl font-light text-white tracking-tight">{formatNumber(stats.aliveCharactersCount)}</div>
                      </div>
                  </div>

                  {/* Demographic Breakdown */}
                  <div className="md:col-span-2 p-6 border border-[#2a2a2a] bg-[#111] rounded-sm">
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-6">Ethnic Distribution</div>
                      
                      {/* Big Bar */}
                      <div className="h-4 w-full flex rounded-full overflow-hidden mb-8 border border-[#2a2a2a]">
                          {[
                              { w: stats.nationalPercents.malay, c: ETHNIC_COLORS.malay },
                              { w: stats.nationalPercents.chinese, c: ETHNIC_COLORS.chinese },
                              { w: stats.nationalPercents.indian, c: ETHNIC_COLORS.indian },
                              { w: stats.nationalPercents.sabahM, c: ETHNIC_COLORS.sabahM },
                              { w: stats.nationalPercents.sabahNM, c: ETHNIC_COLORS.sabahNM },
                              { w: stats.nationalPercents.sarawakM, c: ETHNIC_COLORS.sarawakM },
                              { w: stats.nationalPercents.sarawakNM, c: ETHNIC_COLORS.sarawakNM },
                              { w: stats.nationalPercents.orangAsli, c: ETHNIC_COLORS.orangAsli },
                              { w: stats.nationalPercents.others, c: ETHNIC_COLORS.others }
                          ].map((seg, i) => (
                              <motion.div 
                                  key={i} 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${seg.w}%` }} 
                                  transition={{ duration: 1, delay: 0.2 }}
                                  style={{ backgroundColor: seg.c }} 
                              />
                          ))}
                      </div>

                      {/* Distribution Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                              { label: 'Malay', pct: stats.nationalPercents.malay, val: stats.national.malay, color: ETHNIC_COLORS.malay },
                              { label: 'Chinese', pct: stats.nationalPercents.chinese, val: stats.national.chinese, color: ETHNIC_COLORS.chinese },
                              { label: 'Indian', pct: stats.nationalPercents.indian, val: stats.national.indian, color: ETHNIC_COLORS.indian },
                              { label: 'Bumi Sabah (M)', pct: stats.nationalPercents.sabahM, val: stats.national.sabahM, color: ETHNIC_COLORS.sabahM },
                              { label: 'Bumi Sabah (NM)', pct: stats.nationalPercents.sabahNM, val: stats.national.sabahNM, color: ETHNIC_COLORS.sabahNM },
                              { label: 'Bumi Swk (M)', pct: stats.nationalPercents.sarawakM, val: stats.national.sarawakM, color: ETHNIC_COLORS.sarawakM },
                              { label: 'Bumi Swk (NM)', pct: stats.nationalPercents.sarawakNM, val: stats.national.sarawakNM, color: ETHNIC_COLORS.sarawakNM },
                              { label: 'O. Asli', pct: stats.nationalPercents.orangAsli, val: stats.national.orangAsli, color: ETHNIC_COLORS.orangAsli },
                              { label: 'Others', pct: stats.nationalPercents.others, val: stats.national.others, color: ETHNIC_COLORS.others },
                          ].map((e, i) => (
                              <motion.div 
                                  key={e.label}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 + (i * 0.1) }}
                                  className="p-3 border border-[#222] rounded-sm"
                              >
                                  <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{e.label}</span>
                                  </div>
                                  <div className="text-2xl font-light text-white mb-1">{e.pct.toFixed(1)}<span className="text-sm text-gray-500 ml-1">%</span></div>
                                  <div className="text-[10px] font-mono text-gray-600">{formatNumber(e.val)}</div>
                              </motion.div>
                          ))}
                      </div>

                      <div className="mt-8 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-6 border-t border-[#2a2a2a] pt-6">Development Classification</div>
                      
                      <div className="h-4 w-full flex rounded-full overflow-hidden mb-8 border border-[#2a2a2a]">
                          {[
                              { w: stats.nationalPercents.urban, c: '#1f77b4' },
                              { w: stats.nationalPercents.semiUrban, c: '#ff7f0e' },
                              { w: stats.nationalPercents.rural, c: '#2ca02c' }
                          ].map((seg, i) => (
                              <motion.div 
                                  key={i} 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${seg.w}%` }} 
                                  transition={{ duration: 1, delay: 0.4 }}
                                  style={{ backgroundColor: seg.c }} 
                              />
                          ))}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                          {[
                              { label: 'Urban', pct: stats.nationalPercents.urban, val: stats.national.urban, color: '#1f77b4' },
                              { label: 'Semi-Urban', pct: stats.nationalPercents.semiUrban, val: stats.national.semiUrban, color: '#ff7f0e' },
                              { label: 'Rural', pct: stats.nationalPercents.rural, val: stats.national.rural, color: '#2ca02c' },
                          ].map((e, i) => (
                              <motion.div 
                                  key={e.label}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.5 + (i * 0.1) }}
                                  className="p-3 border border-[#222] rounded-sm"
                              >
                                  <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{e.label}</span>
                                  </div>
                                  <div className="text-xl sm:text-2xl font-light text-white mb-1">{e.pct.toFixed(1)}<span className="text-xs sm:text-sm text-gray-500 ml-1">%</span></div>
                                  <div className="text-[10px] font-mono text-gray-600 truncate">{formatNumber(e.val)}</div>
                              </motion.div>
                          ))}
                      </div>
                  </div>
                  
                  {/* National Flavor Box */}
                  <div className="md:col-span-3 mt-2 p-5 border border-dashed border-[#444] bg-[rgba(201,168,76,0.05)] rounded-sm">
                      <div className="flex items-start gap-4">
                          <svg className="w-5 h-5 text-[#d4a84b] mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-sm italic font-serif leading-relaxed text-gray-300">
                              "{getNationalFlavor()}"
                          </div>
                      </div>
                  </div>
              </div>

              {/* State Breakdown Table */}
              <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-4 px-1 flex items-center gap-3">
                      <span>Regional Analysis</span>
                      <div className="flex-1 h-px bg-[#2a2a2a]" />
                  </div>
                  
                  <div className="border border-[#2a2a2a] rounded-sm bg-[#111] overflow-hidden">
                      {/* Grid Header */}
                      <div className="grid grid-cols-12 gap-4 p-3 border-b border-[#2a2a2a] bg-[#0a0a0a] text-[10px] font-mono uppercase tracking-wider text-gray-500">
                          <div className="col-span-2">State</div>
                          <div className="col-span-2 text-right">Electorate</div>
                          <div className="col-span-4 pl-4">Ethnic Composition</div>
                          <div className="col-span-4 pl-4">Class. (U/SU/R)</div>
                      </div>

                      {/* Rows */}
                      <div className="divide-y divide-[#222]">
                          {stats.stateList.map((state, idx) => (
                              <motion.div 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 + (idx * 0.05) }}
                                  key={state.name} 
                                  className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-[#1a1a1a] transition-colors"
                              >
                                  <div className="col-span-2 font-medium text-sm text-gray-200 truncate pr-2">{state.name}</div>
                                  <div className="col-span-2 text-right text-xs font-mono text-gray-400">{formatNumber(state.total)}</div>
                                  <div className="col-span-4 pl-4 flex items-center gap-4">
                                      {/* Mini Bar */}
                                      <div className="flex-1 h-1 flex rounded-full overflow-hidden bg-[#222]">
                                          {[
                                              { w: state.malayPercent, c: ETHNIC_COLORS.malay },
                                              { w: state.chinesePercent, c: ETHNIC_COLORS.chinese },
                                              { w: state.indiansPercent, c: ETHNIC_COLORS.indian },
                                              { w: state.sabahMPercent, c: ETHNIC_COLORS.sabahM },
                                              { w: state.sabahNMPercent, c: ETHNIC_COLORS.sabahNM },
                                              { w: state.sarawakMPercent, c: ETHNIC_COLORS.sarawakM },
                                              { w: state.sarawakNMPercent, c: ETHNIC_COLORS.sarawakNM },
                                              { w: state.orangAsliPercent, c: ETHNIC_COLORS.orangAsli },
                                              { w: state.othersPercent, c: ETHNIC_COLORS.others }
                                          ].map((seg, i) => (
                                              <div key={i} style={{ width: `${seg.w}%`, backgroundColor: seg.c }} />
                                          ))}
                                      </div>
                                  </div>
                                  <div className="col-span-4 pl-4 flex items-center gap-4">
                                      {/* Mini Bar for Urbanization */}
                                      <div className="flex-1 h-1 flex rounded-full overflow-hidden bg-[#222]">
                                          {[
                                              { w: state.urbanPercent, c: '#1f77b4' },
                                              { w: state.semiUrbanPercent, c: '#ff7f0e' },
                                              { w: state.ruralPercent, c: '#2ca02c' }
                                          ].map((seg, i) => (
                                              <div key={i} style={{ width: `${seg.w}%`, backgroundColor: seg.c }} />
                                          ))}
                                      </div>
                                  </div>
                              </motion.div>
                          ))}
                      </div>
                  </div>
              </div>

          </div>
      </motion.div>
    </motion.div>
  );
};

export default React.memo(CountryInfoPanel);