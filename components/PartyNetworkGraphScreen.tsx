import React, { useMemo } from 'react';
import { Party, PartyGraphLink } from '../types';
import { X, GitMerge } from 'lucide-react';

interface PartyNetworkGraphScreenProps {
  activeParties: Party[];
  historicalParties: Party[];
  links: PartyGraphLink[];
  currentDate: Date;
  onClose: () => void;
}

export const PartyNetworkGraphScreen: React.FC<PartyNetworkGraphScreenProps> = ({
  activeParties,
  historicalParties,
  links,
  currentDate,
  onClose
}) => {
  const allNodes = useMemo(() => {
    const nodes = new Map<string, Party>();
    activeParties.forEach(p => nodes.set(p.id, p));
    historicalParties.forEach(p => nodes.set(p.id, p));
    return Array.from(nodes.values());
  }, [activeParties, historicalParties]);

  // Layout calculation
  const { layout, width, height, minDateMs, maxDateMs } = useMemo(() => {
    const START_DATE_MS = new Date('1947-01-01').getTime();
    const minDateMs = Math.min(START_DATE_MS, ...links.map(l => l.date.getTime()));
    const maxDateMs = currentDate.getTime();
    
    const partyLayout = new Map<string, { startDate: Date, endDate: Date | null, trackIndex: number }>();
    
    allNodes.forEach(p => {
        let pStartDate = new Date(minDateMs);
        if (p.leaderHistory && p.leaderHistory.length > 0 && p.leaderHistory[0].startDate) {
            pStartDate = new Date(Math.max(minDateMs, p.leaderHistory[0].startDate.getTime()));
        }
        partyLayout.set(p.id, { startDate: pStartDate, endDate: null, trackIndex: -1 });
    });

    const sortedLinks = [...links].sort((a,b) => a.date.getTime() - b.date.getTime());
    
    sortedLinks.forEach(link => {
        if (link.type === 'splits_from') {
           const layout = partyLayout.get(link.target);
           if (layout) layout.startDate = link.date;
        }
        if (link.type === 'merges_into') {
           const layout = partyLayout.get(link.target);
           if (layout && layout.startDate.getTime() === minDateMs) {
               layout.startDate = link.date;
           }
           const srcLayout = partyLayout.get(link.source);
           if (srcLayout && !srcLayout.endDate) srcLayout.endDate = link.date;
        }
        if (link.type === 'absorbed_by') {
           const srcLayout = partyLayout.get(link.source);
           if (srcLayout && !srcLayout.endDate) srcLayout.endDate = link.date;
        }
        if (link.type === 'renamed_to') {
           const layout = partyLayout.get(link.target);
           if (layout) layout.startDate = link.date;
           
           const srcLayout = partyLayout.get(link.source);
           if (srcLayout && !srcLayout.endDate) srcLayout.endDate = link.date;
        }
    });

    activeParties.forEach(p => {
        const l = partyLayout.get(p.id);
        if (l) l.endDate = currentDate;
    });

    historicalParties.forEach(p => {
        const l = partyLayout.get(p.id);
        if (l && !l.endDate) {
            const relevantLinks = links.filter(lk => lk.source === p.id || lk.target === p.id);
            if (relevantLinks.length > 0) {
                l.endDate = relevantLinks[relevantLinks.length - 1].date;
            } else {
                l.endDate = currentDate;
            }
        }
    });

    // Parent-child assignment for better track layout
    const parentMap = new Map<string, string>();
    const childrenMap = new Map<string, string[]>();
    
    allNodes.forEach(p => childrenMap.set(p.id, []));

    allNodes.forEach(p => {
        const creationLinks = links.filter(l => l.target === p.id && (l.type === 'splits_from' || l.type === 'renamed_to' || l.type === 'merges_into'));
        if (creationLinks.length > 0) {
            const renameLink = creationLinks.find(l => l.type === 'renamed_to');
            if (renameLink) {
                 parentMap.set(p.id, renameLink.source);
            } else {
                 const splitLink = creationLinks.find(l => l.type === 'splits_from');
                 if (splitLink) {
                     parentMap.set(p.id, splitLink.source);
                 } else {
                     parentMap.set(p.id, creationLinks[0].source);
                 }
            }
        }
    });
    
    parentMap.forEach((parentId, childId) => {
        if (childrenMap.has(parentId)) {
            childrenMap.get(parentId)!.push(childId);
        }
    });

    const roots = allNodes.filter(p => !parentMap.has(p.id));
    
    roots.sort((a,b) => {
        const aL = partyLayout.get(a.id);
        const bL = partyLayout.get(b.id);
        return (aL?.startDate.getTime() || 0) - (bL?.startDate.getTime() || 0);
    });

    let currentTrack = 0;
    
    const assignTrack = (nodeId: string) => {
        const l = partyLayout.get(nodeId);
        if (l && l.trackIndex === -1) {
            const renameLink = links.find(lk => lk.type === 'renamed_to' && lk.target === nodeId);
            if (renameLink) {
                const srcLayout = partyLayout.get(renameLink.source);
                if (srcLayout && srcLayout.trackIndex !== -1) {
                    l.trackIndex = srcLayout.trackIndex;
                } else {
                    l.trackIndex = currentTrack++;
                }
            } else {
                l.trackIndex = currentTrack++;
            }
        }
        
        const children = childrenMap.get(nodeId) || [];
        children.sort((a,b) => {
             const aL = partyLayout.get(a);
             const bL = partyLayout.get(b);
             return (aL?.startDate.getTime() || 0) - (bL?.startDate.getTime() || 0);
        });
        
        children.forEach(c => assignTrack(c));
    };

    roots.forEach(r => assignTrack(r.id));
    
    allNodes.forEach(p => {
        const l = partyLayout.get(p.id);
        if (l && l.trackIndex === -1) {
             l.trackIndex = currentTrack++;
        }
    });

    const w = 1200;
    const rowHeight = 40;
    const h = Math.max(400, currentTrack * rowHeight + 100);

    return { layout: partyLayout, width: w, height: h, minDateMs, maxDateMs };
  }, [allNodes, links, activeParties, historicalParties, currentDate]);

  const startX = 200;
  const endX = width - 150;
  const dateSpan = maxDateMs - minDateMs || 1;
  const getX = (date: Date) => startX + ((date.getTime() - minDateMs) / dateSpan) * (endX - startX);
  const getY = (track: number) => 60 + track * 40;

  // Render Time Axis Years
  const startYear = new Date(minDateMs).getFullYear();
  const endYear = new Date(maxDateMs).getFullYear();
  const yearMarkers = [];
  for (let y = startYear; y <= endYear; y += Math.ceil((endYear - startYear) / 10) || 1) {
      yearMarkers.push(y);
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e0e0e] border border-gray-700 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <GitMerge className="text-gray-400" size={20} />
            <h2 className="text-xl font-mono text-gray-200">Party Network Graph</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Legend */}
        <div className="bg-[#111] px-6 py-3 border-b border-gray-800 flex flex-wrap gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-2">
                <svg width="40" height="12"><line x1="0" y1="6" x2="30" y2="6" stroke="#fff" strokeWidth="3"/><polygon points="30,2 38,6 30,10" fill="#fff" /></svg>
                <span>Active Party</span>
            </div>
            <div className="flex items-center gap-2">
                <svg width="40" height="12"><line x1="0" y1="6" x2="33" y2="6" stroke="#888" strokeWidth="3"/><circle cx="33" cy="6" r="4" fill="#000" stroke="#888" strokeWidth="2" /></svg>
                <span>Extinct Party</span>
            </div>
            <div className="flex items-center gap-2">
                <svg width="24" height="12"><path d="M 0 12 C 5 12, 10 2, 20 2" stroke="#fff" strokeWidth="2" fill="none"/></svg>
                <span>Splinter/Split</span>
            </div>
            <div className="flex items-center gap-2">
                <svg width="28" height="12"><path d="M 0 2 C 10 2, 15 12, 20 12" stroke="#fff" strokeWidth="2" fill="none"/><circle cx="20" cy="12" r="2.5" fill="#fff" /></svg>
                <span>Merger/Absorption</span>
            </div>
            <div className="flex items-center gap-2">
                <svg width="28" height="12"><path d="M 0 2 C 10 2, 15 12, 20 12" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" fill="none"/><circle cx="20" cy="12" r="2.5" fill="#fff" /></svg>
                <span>Faction Migration</span>
            </div>
            <div className="flex items-center gap-2">
                <svg width="20" height="12"><line x1="0" y1="6" x2="20" y2="6" stroke="#888" strokeWidth="2" strokeDasharray="4 4" /></svg>
                <span>Renamed</span>
            </div>
            <div className="flex items-center gap-2">
                <svg width="20" height="12">
                   <line x1="0" y1="6" x2="20" y2="6" stroke="#888" strokeWidth="3" />
                   <circle cx="10" cy="6" r="2" fill="#fff" />
                </svg>
                <span>New Leader</span>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 relative" style={{ backgroundColor: '#0a0a0a' }}>
            <svg width={width} height={height} className="block mx-auto" style={{ minWidth: width }}>
                {/* Time Grid */}
                {yearMarkers.map(year => {
                    const d = new Date(year, 0, 1);
                    const x = getX(d);
                    return (
                        <g key={year}>
                            <line x1={x} y1={20} x2={x} y2={height} stroke="#333" strokeDasharray="4 4" />
                            <text x={x} y={15} fill="#666" fontSize="12" textAnchor="middle" fontFamily="monospace">{year}</text>
                        </g>
                    );
                })}

                {/* Draw Links */}
                {links.map((link, i) => {
                    const srcLayout = layout.get(link.source);
                    const tgtLayout = layout.get(link.target);
                    if (!srcLayout || !tgtLayout) return null;
                    
                    const x = getX(link.date);
                    const y1 = getY(srcLayout.trackIndex);
                    const y2 = getY(tgtLayout.trackIndex);
                    
                    // Draw connected line if it's the exact same track (renamed)
                    if (srcLayout.trackIndex === tgtLayout.trackIndex) {
                        return (
                            <g key={`link-${i}`}>
                                <line x1={x - 20} y1={y1} x2={x + 20} y2={y1} stroke="#888" strokeWidth="2" strokeDasharray="4 4" />
                                <circle cx={x} cy={y1} r={4} fill="#888" stroke="#000" strokeWidth="1" />
                            </g>
                        );
                    }
                    
                    const srcNode = allNodes.find(n => n.id === link.source);
                    const tgtNode = allNodes.find(n => n.id === link.target);
                    const linkColor = link.type === 'splits_from' ? tgtNode?.color : srcNode?.color;

                    let pathD = '';
                    let isDashed = false;
                    let strokeWidth = "3";
                    
                    if (link.type === 'splits_from') {
                        pathD = `M ${x} ${y1} C ${x + 10} ${y1}, ${x + 10} ${y2}, ${x + 20} ${y2}`;
                    } else if (link.type === 'absorbed_by') {
                        pathD = `M ${x - 20} ${y1} C ${x - 10} ${y1}, ${x - 10} ${y2}, ${x} ${y2}`;
                    } else if (link.type === 'faction_migrates') {
                        // Bow shape connecting two continuing lines
                        const mY = (y1 + y2) / 2;
                        const direction = y1 < y2 ? 20 : -20;
                        pathD = `M ${x} ${y1} Q ${x + direction} ${mY} ${x} ${y2}`;
                        isDashed = true;
                        strokeWidth = "2";
                    } else { // merges_into or renamed_to
                        pathD = `M ${x - 20} ${y1} C ${x} ${y1}, ${x} ${y2}, ${x + 20} ${y2}`;
                    }

                    return (
                        <g key={`link-${i}`} className="opacity-70 hover:opacity-100 hover:stroke-white transition-all duration-300" style={{ cursor: 'crosshair' }}>
                            <path 
                                d={pathD} 
                                stroke={linkColor || "#888"} 
                                strokeWidth={strokeWidth} 
                                className="hover:stroke-current"
                                fill="none" 
                                strokeLinecap="round"
                                strokeDasharray={isDashed ? "3 3" : undefined}
                            />
                            <circle cx={link.type === 'absorbed_by' || link.type === 'faction_migrates' ? x : x + 20} cy={y2} r={3} fill="#fff" />
                            <title>{link.type}: {srcNode?.name} {"->"} {tgtNode?.name} ({link.date.getFullYear()})</title>
                        </g>
                    );
                })}

                {/* Draw Party Lines */}
                {allNodes.map(p => {
                    const l = layout.get(p.id);
                    if (!l) return null;
                    
                    const startLink = links.find(lk => lk.target === p.id && lk.type !== 'faction_migrates' && lk.date.getTime() === l.startDate.getTime());
                    const offsetStart = startLink && startLink.type !== 'absorbed_by' ? 20 : 0;
                    
                    const endLink = links.find(lk => lk.source === p.id && lk.type !== 'faction_migrates' && l.endDate && lk.date.getTime() === l.endDate.getTime());
                    const offsetEnd = endLink && endLink.type !== 'splits_from' ? 20 : 0;

                    const x1 = getX(l.startDate) + offsetStart;
                    const x2 = getX(l.endDate || currentDate) - offsetEnd;
                    const y = getY(l.trackIndex);
                    
                    return (
                        <g key={`party-${p.id}`} className="group" style={{ cursor: 'pointer' }}>
                            {/* Line */}
                            <line 
                                x1={x1} y1={y} 
                                x2={x2} y2={y} 
                                stroke={p.color} 
                                strokeWidth="6" 
                                strokeLinecap="round" 
                                className="opacity-70 group-hover:opacity-100 transition-opacity duration-300" 
                            />
                            
                            {/* Start Node */}
                            <circle cx={x1} cy={y} r={5} fill={p.color} stroke="#000" strokeWidth="2" className="group-hover:r-[7px] transition-all duration-300" />
                            
                            {/* End Node or Arrow if active */}
                            {l.endDate && l.endDate.getTime() < currentDate.getTime() ? (
                                <circle cx={x2} cy={y} r={5} fill="#000" stroke={p.color} strokeWidth="2" className="group-hover:r-[7px] transition-all duration-300" />
                            ) : (
                                <polygon points={`${x2-5},${y-5} ${x2+5},${y} ${x2-5},${y+5}`} fill={p.color} className="group-hover:scale-125 transition-transform origin-center" style={{ transformOrigin: `${x2}px ${y}px` }} />
                            )}


                            {/* Leader Change Dots */}
                            {p.leaderHistory?.map((lh, idx) => {
                                // Skip the very first leader if it's the exact start of the party
                                // Actually, let's show it only if it's after the party start date
                                if (!lh.startDate) return null;
                                const lhMs = lh.startDate.getTime();
                                if (lhMs <= l.startDate.getTime() + 86400000) return null; // +1 day buffer
                                if (l.endDate && lhMs > l.endDate.getTime()) return null;
                                
                                const lx = getX(lh.startDate);
                                return (
                                    <g key={`lh-${p.id}-${idx}`}>
                                        <circle cx={lx} cy={y} r={2} fill="#fff" />
                                        <title>Leader Change: {lh.name} ({lh.startDate.getFullYear()})</title>
                                    </g>
                                );
                            })}

                            {/* Label */}
                            <text 
                                x={x1 - 15} 
                                y={y + 4} 
                                fill="none"
                                stroke="#0a0a0a"
                                strokeWidth="4"
                                strokeLinejoin="round"
                                fontSize="12" 
                                textAnchor="end" 
                                fontFamily="monospace"
                                fontWeight="bold"
                            >
                                {p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name}
                            </text>
                            <text 
                                x={x1 - 15} 
                                y={y + 4} 
                                fill={p.color} 
                                fontSize="12" 
                                textAnchor="end" 
                                fontFamily="monospace"
                                fontWeight="bold"
                            >
                                {p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name}
                            </text>
                            
                            {/* Hover info (SVG Title) */}
                            <title>
                                {p.name} ({l.startDate.getFullYear()} - {(l.endDate || currentDate).getFullYear()})
                            </title>
                        </g>
                    );
                })}
            </svg>
        </div>
      </div>
    </div>
  );
};

