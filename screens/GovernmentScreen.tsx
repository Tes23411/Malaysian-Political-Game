import React from 'react';
import { Party, Character, Government } from '../types';

interface GovernmentScreenProps {
    government: Government | null;
    characters: Character[];
    partiesMap: Map<string, Party>;
    onClose: () => void;
    totalSeats: number;
    onOpenCharacter?: (characterId: string) => void;
}

const GovernmentScreen: React.FC<GovernmentScreenProps> = ({
    government, characters, partiesMap, onClose, totalSeats, onOpenCharacter
}) => {
    // calculate majority
    const governmentSeats = government ? government.rulingCoalitionIds.reduce((sum, partyId) => {
        // We'll calculate it from props or state.
        return sum;
    }, 0) : 0;

    const [expandedHistoryIdx, setExpandedHistoryIdx] = React.useState<number | null>(null);
    const [activeTab, setActiveTab] = React.useState<'current' | 'history'>('current');

    return (
        <div className="bg-gray-800 text-white rounded-lg shadow-2xl flex flex-col h-full border border-gray-700 w-96 animate-fade-in relative z-[100]">
           <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">👑</span> National Government
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex border-b border-gray-700 bg-gray-900/30">
                <button
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${activeTab === 'current' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}
                    onClick={() => setActiveTab('current')}
                >
                    Current Status
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${activeTab === 'history' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
                <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl p-5 border border-green-700/50 shadow-xl mb-4">
                    {activeTab === 'current' ? (
                        <>
                            <h3 className="text-lg font-bold mb-3 text-green-300 flex items-center gap-2">
                                <span>👑</span> Government Status
                            </h3>
                            {government ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-gray-900/30 p-3 rounded-lg">
                                        <span className="text-gray-400 flex items-center gap-2">
                                            <span>🏛️</span> Type:
                                        </span>
                                        <span className="font-bold text-lg">
                                            {government.rulingCoalitionIds.length > 1 ? '🤝 Coalition' : '⭐ Single-Party'}
                                        </span>
                                    </div>
                                    <div className="bg-gray-900/30 p-3 rounded-lg">
                                        <span className="text-gray-400 block mb-2 flex items-center gap-2">
                                            <span>🎭</span> Members:
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {government.rulingCoalitionIds.map((id: string) => {
                                                const party = partiesMap.get(id);
                                                return party ? (
                                                    <span 
                                                        key={id}
                                                        className="px-3 py-1 rounded-full text-sm font-semibold shadow-lg border"
                                                        style={{ 
                                                            backgroundColor: `${party.color}20`,
                                                            borderColor: party.color,
                                                            color: party.color
                                                        }}
                                                    >
                                                        {party.name}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>

                                    {government.cabinet && government.cabinet.length > 0 && (
                                        <div className="bg-gray-900/30 p-3 rounded-lg">
                                            <span className="text-gray-400 block mb-2 flex items-center gap-2">
                                                <span>💼</span> Cabinet Ministers:
                                            </span>
                                            <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {government.cabinet.map((minister, idx) => {
                                                    const mChar = characters?.find(c => c.id === minister.ministerId);
                                                    const mAffiliation = mChar?.affiliationId;
                                                    const pId = mAffiliation ? (Array.from(partiesMap.values()) as Party[]).find(p => p.affiliationIds.includes(mAffiliation))?.id : null;
                                                    const p = pId ? partiesMap.get(pId) : null;
                                                    
                                                    return (
                                                        <div key={idx} className="flex items-center gap-3 bg-gray-800/80 p-2 rounded border border-gray-700">
                                                            <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-xs"
                                                                 style={{ backgroundColor: p ? `${p.color}40` : '#333', color: p ? p.color : '#ccc' }}>
                                                                {mChar?.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div 
                                                                    className={`text-[0.75rem] font-bold text-gray-200 truncate ${onOpenCharacter ? 'cursor-pointer hover:underline hover:text-white' : ''}`}
                                                                    onClick={() => {
                                                                        if (onOpenCharacter && mChar) {
                                                                            onOpenCharacter(mChar.id);
                                                                        }
                                                                    }}
                                                                >
                                                                    {mChar?.name || 'Unknown'}
                                                                </div>
                                                                <div className="text-[0.65rem] text-yellow-500/80 uppercase tracking-wider truncate">{minister.portfolio}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-900/30 rounded-lg">
                                    <span className="text-4xl mb-4 opacity-50">🗳️</span>
                                    <h4 className="text-xl font-bold text-gray-400 mb-2">No Government Formed</h4>
                                    <p className="text-gray-500 text-sm">
                                        Awaiting election results or coalition negotiations.
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold mb-3 text-green-300 flex items-center gap-2">
                                <span>📜</span> Government History
                            </h3>
                            <div className="bg-gray-900/30 p-3 rounded-lg">
                                {(!government || !government.pmHistory || government.pmHistory.length === 0) ? (
                                    <p className="text-sm text-gray-500 italic text-center py-2">No History recorded</p>
                                ) : (
                                    <div className="space-y-2 mt-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {[...government.pmHistory].reverse().map((entry: any, idx: number) => {
                                            const pmChar = characters?.find(c => c.id === entry.pmId);
                                            const pmAffiliation = pmChar?.affiliationId;
                                            const pId = entry.partyId || (pmAffiliation ? (Array.from(partiesMap.values()) as Party[]).find(p => p.affiliationIds.includes(pmAffiliation))?.id : null);
                                            const p = pId ? partiesMap.get(pId) : null;
                                            
                                            const start = entry.startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                                            const end = entry.endDate ? entry.endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Present';
                                            
                                            return (
                                                <div key={idx} className="flex flex-col gap-2 bg-gray-800/60 p-2 rounded border border-gray-700 hover:border-gray-500 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded shrink-0 border border-gray-600 flex items-center justify-center font-bold text-sm"
                                                            style={{ backgroundColor: p ? `${p.color}20` : '#333', color: p ? p.color : '#ccc' }}>
                                                            {pmChar?.name?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div 
                                                                className={`text-sm font-bold text-gray-200 truncate ${onOpenCharacter && entry.pmId !== 'VACANT' ? 'cursor-pointer hover:underline hover:text-white' : ''}`}
                                                                onClick={() => {
                                                                    if (onOpenCharacter && entry.pmId !== 'VACANT') {
                                                                        onOpenCharacter(entry.pmId);
                                                                    }
                                                                }}
                                                            >
                                                                {pmChar?.name || (entry.pmId === 'VACANT' ? 'Vacant' : 'Unknown')}
                                                            </div>
                                                            {p && <div className="text-[0.65rem] uppercase tracking-wider truncate" style={{ color: p.color }}>{p.name}</div>}
                                                        </div>
                                                        <div className="text-[0.65rem] text-gray-400 font-mono text-right shrink-0">
                                                            <div>{end}</div>
                                                            <div className="text-gray-500">↑</div>
                                                            <div>{start}</div>
                                                        </div>
                                                        {entry.cabinet && entry.cabinet.length > 0 && (
                                                            <button 
                                                                onClick={() => setExpandedHistoryIdx(expandedHistoryIdx === idx ? null : idx)}
                                                                className="ml-2 text-gray-400 hover:text-white transition-colors"
                                                            >
                                                                <svg className={`w-4 h-4 transform transition-transform ${expandedHistoryIdx === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    {expandedHistoryIdx === idx && entry.cabinet && entry.cabinet.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-1">
                                                            <div className="text-xs text-gray-400 mb-1">Cabinet:</div>
                                                            {entry.cabinet.map((minister: any, mIdx: number) => {
                                                                const mChar = characters?.find(c => c.id === minister.ministerId);
                                                                return (
                                                                    <div key={mIdx} className="flex justify-between items-center bg-gray-900/40 p-1.5 rounded text-xs">
                                                                        <span 
                                                                            className={`truncate font-medium text-gray-300 ${onOpenCharacter ? 'cursor-pointer hover:underline hover:text-white' : ''}`}
                                                                            onClick={() => {
                                                                                if (onOpenCharacter && mChar) {
                                                                                    onOpenCharacter(mChar.id);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {mChar?.name || 'Unknown'}
                                                                        </span>
                                                                        <span className="text-yellow-500/80 uppercase tracking-wider text-[0.6rem] ml-2 shrink-0">{minister.portfolio}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(0, 0, 0, 0.2);
                  border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
};

export default GovernmentScreen;
