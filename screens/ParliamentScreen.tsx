import React, { useMemo, useState } from 'react';
import { Party, ElectionResults, Character, GameState, Bill, BillVoteTally, BillVoteBreakdown, VoteDirection, PoliticalAlliance, Government } from '../types';
import { getPartySeatCounts } from '../utils/politics';
import BillProposalPanel from '../components/BillProposalPanel';
import BillResultsPanel from '../components/BillResultsPanel';

interface ParliamentScreenProps {
    gameState: GameState;
    electionResults: ElectionResults;
    partiesMap: Map<string, Party>;
    totalSeats: number;
    speaker: Character | null;
    onClose: () => void;
    currentBill: Bill | null;
    playerParty: Party | null;
    billVoteResults: { passed: boolean; tally: BillVoteTally; breakdown: BillVoteBreakdown; } | null;
    onVoteOnBill: (vote: VoteDirection) => void;
    onCloseBillResults: () => void;
    alliances?: PoliticalAlliance[];
    government?: Government | null;
    characters?: Character[];
    onCallVoteOfConfidence?: () => void;
    onProposeBill?: () => void;
    onDissolveParliament?: () => void;
}

type TabType = 'overview' | 'statistics' | 'composition' | 'parties';

const ParliamentScreen: React.FC<ParliamentScreenProps> = ({ 
    gameState, 
    electionResults, 
    partiesMap, 
    totalSeats, 
    speaker, 
    onClose, 
    currentBill, 
    playerParty, 
    billVoteResults, 
    onVoteOnBill, 
    onCloseBillResults,
    alliances = [],
    government = null,
    characters = [],
    onCallVoteOfConfidence,
    onProposeBill,
    onDissolveParliament
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
    const [hoveredPartyId, setHoveredPartyId] = useState<string | null>(null);

    const seatDistribution = useMemo(() => {
        const partySeatCounts = getPartySeatCounts(electionResults, partiesMap);
        const sortedParties = Array.from(partySeatCounts.entries())
            .sort((a, b) => b[1] - a[1]);

        let seats: { partyId: string, color: string }[] = [];
        sortedParties.forEach(([partyId, count]) => {
            const party = partiesMap.get(partyId);
            if (party && count > 0) {
                seats = seats.concat(Array(count).fill({ partyId, color: party.color }));
            }
        });
        return seats;
    }, [electionResults, partiesMap]);

    const partySeatCounts = useMemo(() => {
        return getPartySeatCounts(electionResults, partiesMap);
    }, [electionResults, partiesMap]);

    const statistics = useMemo(() => {
        const counts = Array.from(partySeatCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([partyId, seats]) => {
                const party = partiesMap.get(partyId);
                return {
                    partyId,
                    party,
                    seats,
                    percentage: ((seats / totalSeats) * 100).toFixed(1)
                };
            });

        const majorityThreshold = Math.floor(totalSeats / 2) + 1;
        const leadingParty = counts[0];
        const hasMajority = leadingParty && leadingParty.seats >= majorityThreshold;
        
        let governmentSeats = 0;
        if (government) {
            government.rulingCoalitionIds.forEach(partyId => {
                governmentSeats += partySeatCounts.get(partyId) || 0;
            });
        } else if (leadingParty) {
            governmentSeats = leadingParty.seats;
        }

        const oppositionSeats = totalSeats - governmentSeats;

        return {
            counts,
            majorityThreshold,
            hasMajority,
            governmentSeats,
            oppositionSeats,
            totalSeats
        };
    }, [partySeatCounts, totalSeats, government, partiesMap]);

    const governmentPartyIds = useMemo(() => {
        if (government) {
            return new Set(government.rulingCoalitionIds);
        }
        const sorted = Array.from(partySeatCounts.entries()).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? new Set([sorted[0][0]]) : new Set<string>();
    }, [government, partySeatCounts]);

    // Horseshoe layout constants
    const width = 420;
    const height = 280;
    const seatSize = 6;

    const LAYERS = [
        { radiusX: 95, radiusY: 60 },
        { radiusX: 125, radiusY: 85 },
        { radiusX: 155, radiusY: 110 },
        { radiusX: 185, radiusY: 135 }
    ];
    
    const seatsPerLayer = [0, 0, 0, 0];
    if (seatDistribution.length > 0) {
        seatDistribution.forEach((_, index) => {
            seatsPerLayer[index % LAYERS.length]++;
        });
    }

    return (
        <div className="h-full w-[600px] flex-shrink-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl overflow-hidden font-sans flex flex-col">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-900 p-6 shadow-xl relative border-b border-blue-800">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-3xl hover:text-red-400 transition-colors z-10 hover:scale-110 transform"
                >
                    &times;
                </button>
                <div className="flex items-center gap-3 mb-2">
                    <div className="text-4xl">🏛️</div>
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
                            Parliament
                        </h1>
                        <p className="text-blue-300 text-sm flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <span className="text-lg">💺</span> {totalSeats} Seats
                            </span>
                            <span className="text-blue-400">•</span>
                            <span className="flex items-center gap-1">
                                <span className="text-lg">🎯</span> {statistics.majorityThreshold} for Majority
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Enhanced Tabs */}
            <div className="flex border-b border-gray-700 bg-gray-800/50 shadow-lg">
                {[
                    { id: 'overview', label: 'Overview', icon: '📊' },
                    { id: 'statistics', label: 'Statistics', icon: '📈' },
                    { id: 'composition', label: 'Composition', icon: '🎨' },
                    { id: 'parties', label: 'Parties', icon: '🎭' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex-1 py-3 px-4 font-semibold transition-all ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white border-b-2 border-blue-400 shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Chamber Visualization */}
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
                            <h2 className="text-xl font-bold mb-4 text-blue-300 flex items-center gap-2">
                                <span>🏛️</span> Chamber Layout
                            </h2>
                            <div className="relative mx-auto bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg p-4 border border-gray-700 mb-4" style={{ width, height: height + 40 }}>
                                {seatDistribution.map((seat, index) => {
                                    const layerIndex = index % LAYERS.length;
                                    const seatIndexInLayer = Math.floor(index / LAYERS.length);
                                    const numSeatsInThisLayer = seatsPerLayer[layerIndex];
                                    const layer = LAYERS[layerIndex];
                                    
                                    let angle = 90;
                                    if (numSeatsInThisLayer > 1) {
                                        angle = 190 - (seatIndexInLayer / (numSeatsInThisLayer - 1)) * 200;
                                    }

                                    const radian = angle * Math.PI / 180;
                                    const x = width / 2 + layer.radiusX * Math.cos(radian);
                                    const y = (height / 2) + 20 + layer.radiusY * Math.sin(radian);

                                    const isGovernment = governmentPartyIds.has(seat.partyId);
                                    const isHighlighted = hoveredPartyId === seat.partyId || selectedPartyId === seat.partyId;

                                    return (
                                        <div
                                            key={index}
                                            className="absolute rounded-sm transition-all hover:scale-150 hover:z-10 cursor-pointer"
                                            style={{
                                                left: `${x - seatSize / 2}px`,
                                                top: `${y - seatSize / 2}px`,
                                                width: `${seatSize}px`,
                                                height: `${seatSize}px`,
                                                backgroundColor: seat.color,
                                                transform: `rotate(${angle + 90}deg)`,
                                                border: isGovernment ? '1px solid #fbbf24' : '1px solid #1a202c',
                                                boxShadow: isHighlighted 
                                                    ? `0 0 8px ${seat.color}` 
                                                    : isGovernment 
                                                        ? '0 0 4px rgba(251, 191, 36, 0.5)' 
                                                        : 'none',
                                                opacity: hoveredPartyId && !isHighlighted ? 0.3 : 1
                                            }}
                                            onMouseEnter={() => setHoveredPartyId(seat.partyId)}
                                            onMouseLeave={() => setHoveredPartyId(null)}
                                            onClick={() => setSelectedPartyId(selectedPartyId === seat.partyId ? null : seat.partyId)}
                                            title={`${partiesMap.get(seat.partyId)?.name} ${isGovernment ? '(Government)' : '(Opposition)'}`}
                                        />
                                    );
                                })}
                                
                                {/* Enhanced Speaker's Chair - Centered */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center">
                                    <div className="w-24 h-14 bg-gradient-to-b from-yellow-600 via-yellow-700 to-yellow-900 border-2 border-yellow-500 rounded-t-lg flex items-center justify-center shadow-2xl relative">
                                        <span className="text-xs text-yellow-100 font-bold">⚖️ Speaker</span>
                                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                    </div>
                                    <p className="text-sm mt-2 font-semibold text-yellow-300 bg-gray-900/50 px-2 py-1 rounded whitespace-nowrap">
                                        {speaker?.name || 'Vacant'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Hover Info - Fixed position */}
                            <div className="h-12 flex items-center justify-center">
                                {hoveredPartyId ? (
                                    <div className="p-3 bg-gray-700/80 rounded-lg border border-gray-600 text-center animate-fade-in">
                                        <span className="font-semibold" style={{ color: partiesMap.get(hoveredPartyId)?.color }}>
                                            {partiesMap.get(hoveredPartyId)?.name}
                                        </span>
                                        <span className="text-gray-400 ml-2">
                                            • {partySeatCounts.get(hoveredPartyId)} seats
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 text-sm italic">
                                        Hover over seats to see party details
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Active Alliances */}
                        {alliances.length > 0 && (
                            <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-5 border border-purple-700/50 shadow-xl">
                                <h3 className="text-lg font-bold mb-3 text-purple-300 flex items-center gap-2">
                                    <span>🤝</span> Active Alliances
                                </h3>
                                <div className="space-y-3">
                                    {alliances.map(alliance => {
                                        const memberSeats = alliance.memberPartyIds.reduce(
                                            (sum, id) => sum + (partySeatCounts.get(id) || 0), 
                                            0
                                        );
                                        return (
                                            <div key={alliance.id} className="bg-gray-900/40 p-4 rounded-lg border border-purple-600/30 hover:border-purple-500/50 transition-all hover:shadow-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-bold text-purple-200 text-lg">{alliance.name}</span>
                                                    <span className="text-xs px-3 py-1 rounded-full bg-purple-900/70 text-purple-200 border border-purple-600/50">
                                                        {alliance.type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="text-gray-400 flex items-center gap-1">
                                                        <span>💺</span> {memberSeats} seats
                                                    </span>
                                                    <span className="text-gray-400 flex items-center gap-1">
                                                        <span>🎭</span> {alliance.memberPartyIds.length} parties
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {alliance.memberPartyIds.map(id => {
                                                        const party = partiesMap.get(id);
                                                        return party ? (
                                                            <div 
                                                                key={id}
                                                                className="w-3 h-3 rounded-full border border-gray-700"
                                                                style={{ backgroundColor: party.color }}
                                                                title={party.name}
                                                            />
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Statistics Tab */}
                {activeTab === 'statistics' && (
                    <div className="space-y-6">
                        {/* Enhanced Seat Distribution Chart */}
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-5 border border-gray-700 shadow-xl">
                            <h2 className="text-xl font-bold mb-4 text-blue-300 flex items-center gap-2">
                                <span>📊</span> Seat Distribution
                            </h2>
                            
                            {/* Visual Bar with gradient overlay */}
                            <div className="mb-6">
                                <div className="h-10 rounded-xl overflow-hidden flex shadow-2xl border border-gray-700 relative">
                                    {statistics.counts.map(({ partyId, party, percentage }) => {
                                        if (!party) return null;
                                        return (
                                            <div
                                                key={partyId}
                                                style={{
                                                    width: `${percentage}%`,
                                                    backgroundColor: party.color
                                                }}
                                                className="transition-all hover:opacity-90 cursor-pointer relative group"
                                                title={`${party.name}: ${percentage}%`}
                                                onMouseEnter={() => setHoveredPartyId(partyId)}
                                                onMouseLeave={() => setHoveredPartyId(null)}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-gray-400">
                                    <span>0%</span>
                                    <span className="text-yellow-400 font-semibold flex items-center gap-1">
                                        <span>🎯</span> {((statistics.majorityThreshold / totalSeats) * 100).toFixed(1)}% Majority
                                    </span>
                                    <span>100%</span>
                                </div>
                            </div>

                            {/* Enhanced Party List */}
                            <div className="space-y-2">
                                {statistics.counts.map(({ partyId, party, seats, percentage }, index) => {
                                    if (!party) return null;
                                    const isGovernment = governmentPartyIds.has(partyId);
                                    const isHighlighted = selectedPartyId === partyId;
                                    return (
                                        <div 
                                            key={partyId} 
                                            className={`bg-gray-700/50 rounded-lg p-4 border transition-all cursor-pointer ${
                                                isHighlighted 
                                                    ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                                                    : 'border-gray-600 hover:border-gray-500'
                                            } hover:bg-gray-700`}
                                            onClick={() => setSelectedPartyId(isHighlighted ? null : partyId)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-gray-400 font-bold text-sm border border-gray-600">
                                                        {index + 1}
                                                    </div>
                                                    <div 
                                                        className="w-5 h-5 rounded-full shadow-lg border-2 border-gray-800" 
                                                        style={{ backgroundColor: party.color }}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-lg" style={{ color: party.color }}>
                                                                {party.name}
                                                            </span>
                                                            {isGovernment && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-yellow-900/70 to-amber-900/70 text-yellow-300 border border-yellow-700/50 shadow-lg">
                                                                    👑 Government
                                                                </span>
                                                            )}
                                                            {party.id === playerParty?.id && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-blue-900/70 to-indigo-900/70 text-blue-300 border border-blue-700/50">
                                                                    ⭐ You
                                                                </span>
                                                            )}
                                                        </div>
                                                        {party.ethnicityFocus && (
                                                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                                <span>🎯</span> Focus: {party.ethnicityFocus}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-blue-300">{seats}</div>
                                                    <div className="text-xs text-gray-400">{percentage}%</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Enhanced Government vs Opposition */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl p-5 border border-green-700/50 shadow-xl hover:shadow-green-500/20 transition-all">
                                <h3 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
                                    <span>👑</span> Government
                                </h3>
                                <div className="text-4xl font-bold text-green-400 mb-2">
                                    {statistics.governmentSeats}
                                </div>
                                <div className="text-xs text-gray-400 mb-2">
                                    {((statistics.governmentSeats / totalSeats) * 100).toFixed(1)}% of seats
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all"
                                        style={{ width: `${(statistics.governmentSeats / totalSeats) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-red-900/40 to-rose-900/40 rounded-xl p-5 border border-red-700/50 shadow-xl hover:shadow-red-500/20 transition-all">
                                <h3 className="text-sm font-semibold text-red-300 mb-3 flex items-center gap-2">
                                    <span>⚔️</span> Opposition
                                </h3>
                                <div className="text-4xl font-bold text-red-400 mb-2">
                                    {statistics.oppositionSeats}
                                </div>
                                <div className="text-xs text-gray-400 mb-2">
                                    {((statistics.oppositionSeats / totalSeats) * 100).toFixed(1)}% of seats
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-red-500 to-rose-500 h-full rounded-full transition-all"
                                        style={{ width: `${(statistics.oppositionSeats / totalSeats) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Composition Tab */}
                {activeTab === 'composition' && (
                    <div className="space-y-6">
                        {/* Enhanced Legend */}
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-5 border border-gray-700 shadow-xl">
                            <h2 className="text-xl font-bold mb-4 text-blue-300 flex items-center gap-2">
                                <span>🎨</span> Party Legend
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                {(Array.from(partiesMap.values()) as Party[])
                                    .filter(p => seatDistribution.some(s => s.partyId === p.id))
                                    .map(party => {
                                        const seats = partySeatCounts.get(party.id) || 0;
                                        const isGovernment = governmentPartyIds.has(party.id);
                                        return (
                                            <div 
                                                key={party.id} 
                                                className="flex items-center gap-3 bg-gray-700/50 p-3 rounded-lg border border-gray-600 hover:border-gray-500 transition-all cursor-pointer"
                                                onClick={() => setSelectedPartyId(selectedPartyId === party.id ? null : party.id)}
                                            >
                                                <div 
                                                    className="w-5 h-5 rounded-full shadow-lg flex-shrink-0 border-2 border-gray-800" 
                                                    style={{ backgroundColor: party.color }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold truncate" style={{ color: party.color }}>
                                                        {party.name}
                                                    </div>
                                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                                        <span>{seats} seat{seats !== 1 ? 's' : ''}</span>
                                                        {isGovernment && <span className="text-yellow-400">👑</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Enhanced Majority Analysis */}
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-5 border border-gray-700 shadow-xl">
                            <h2 className="text-xl font-bold mb-4 text-blue-300 flex items-center gap-2">
                                <span>📊</span> Majority Analysis
                            </h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                                    <span className="text-gray-400">Total Seats:</span>
                                    <span className="font-bold text-2xl">{totalSeats}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/30">
                                    <span className="text-gray-400 flex items-center gap-2">
                                        <span>🎯</span> Majority Threshold:
                                    </span>
                                    <span className="font-bold text-2xl text-yellow-400">
                                        {statistics.majorityThreshold}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-purple-900/20 rounded-lg border border-purple-700/30">
                                    <span className="text-gray-400 flex items-center gap-2">
                                        <span>⭐</span> Supermajority (2/3):
                                    </span>
                                    <span className="font-bold text-2xl text-purple-400">
                                        {Math.ceil(totalSeats * 2 / 3)}
                                    </span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-lg">
                                        <span className="text-gray-400 font-semibold">Government Has:</span>
                                        <span className={`font-bold text-2xl px-4 py-2 rounded-lg ${
                                            statistics.governmentSeats >= Math.ceil(totalSeats * 2 / 3)
                                                ? 'bg-purple-900/50 text-purple-300 border border-purple-600'
                                                : statistics.governmentSeats >= statistics.majorityThreshold
                                                    ? 'bg-green-900/50 text-green-300 border border-green-600'
                                                    : 'bg-red-900/50 text-red-300 border border-red-600'
                                        }`}>
                                            {statistics.governmentSeats >= Math.ceil(totalSeats * 2 / 3)
                                                ? '⭐ Supermajority'
                                                : statistics.governmentSeats >= statistics.majorityThreshold
                                                    ? '✅ Majority'
                                                    : '⚠️ Minority'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Fun Facts */}
                        <div className="bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-pink-900/30 rounded-xl p-5 border border-blue-700/50 shadow-xl">
                            <h3 className="text-lg font-bold mb-3 text-blue-300 flex items-center gap-2">
                                <span>💡</span> Quick Facts
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between p-2 bg-gray-900/30 rounded">
                                    <span className="text-gray-400">🏆 Largest party:</span>
                                    <span className="font-semibold" style={{ color: statistics.counts[0]?.party?.color }}>
                                        {statistics.counts[0]?.party?.name || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-900/30 rounded">
                                    <span className="text-gray-400">🎭 Parties in parliament:</span>
                                    <span className="font-semibold text-blue-300">
                                        {statistics.counts.length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-900/30 rounded">
                                    <span className="text-gray-400">📊 Majority share needed:</span>
                                    <span className="font-semibold text-blue-300">
                                        {((statistics.majorityThreshold / totalSeats) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                {speaker && (
                                    <div className="flex items-center justify-between p-2 bg-gray-900/30 rounded">
                                        <span className="text-gray-400">⚖️ Speaker:</span>
                                        <span className="font-semibold text-yellow-300">
                                            {speaker.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* New Parties Tab */}
                {activeTab === 'parties' && (
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-5 border border-gray-700 shadow-xl">
                            <h2 className="text-xl font-bold mb-4 text-blue-300 flex items-center gap-2">
                                <span>🎭</span> All Political Parties
                            </h2>
                            <div className="space-y-3">
                                {(Array.from(partiesMap.values()) as Party[])
                                    .sort((a, b) => {
                                        const seatsA = partySeatCounts.get(a.id) || 0;
                                        const seatsB = partySeatCounts.get(b.id) || 0;
                                        return seatsB - seatsA;
                                    })
                                    .map(party => {
                                        const seats = partySeatCounts.get(party.id) || 0;
                                        const isGovernment = governmentPartyIds.has(party.id);
                                        const isSelected = selectedPartyId === party.id;
                                        
                                        return (
                                            <div 
                                                key={party.id} 
                                                onClick={() => setSelectedPartyId(isSelected ? null : party.id)}
                                                className={`bg-gray-700/50 p-4 rounded-xl border transition-all cursor-pointer ${
                                                    isSelected 
                                                        ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                                                        : 'border-gray-600 hover:border-gray-500'
                                                } hover:bg-gray-700`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div 
                                                        className="w-12 h-12 rounded-full shadow-lg flex-shrink-0 border-2 border-gray-800 flex items-center justify-center font-bold text-white"
                                                        style={{ backgroundColor: party.color }}
                                                    >
                                                        {party.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                                            <h3 className="text-lg font-bold" style={{ color: party.color }}>
                                                                {party.name}
                                                            </h3>
                                                            {seats > 0 && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-blue-900/50 text-blue-300 border border-blue-700/50">
                                                                    💺 {seats} seat{seats !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                            {isGovernment && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-yellow-900/70 to-amber-900/70 text-yellow-300 border border-yellow-700/50">
                                                                    👑 Government
                                                                </span>
                                                            )}
                                                            {party.id === playerParty?.id && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-green-900/70 to-emerald-900/70 text-green-300 border border-green-700/50">
                                                                    ⭐ Your Party
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {party.ethnicityFocus && (
                                                            <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                                                                <span>🎯</span> Focus: <span className="text-gray-300">{party.ethnicityFocus}</span>
                                                            </p>
                                                        )}
                                                        
                                                        {party.affiliationIds && party.affiliationIds.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {party.affiliationIds.map(affId => (
                                                                    <span 
                                                                        key={affId} 
                                                                        className="text-xs bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300"
                                                                    >
                                                                        {affId}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Bar */}
            {(onProposeBill || onCallVoteOfConfidence || onDissolveParliament) && (
                <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
                    {onDissolveParliament && (
                        <button
                            onClick={() => {
                                if (window.confirm("Are you sure you want to dissolve parliament and call a snap election in 60 days?")) {
                                    onDissolveParliament();
                                }
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold rounded shadow hover:from-orange-500 hover:to-orange-600 transition-colors"
                            title="Dissolve parliament early and seek a fresh mandate"
                        >
                            📅 Dissolve Parliament
                        </button>
                    )}
                    {onCallVoteOfConfidence && (
                        <button
                            onClick={onCallVoteOfConfidence}
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded shadow hover:from-red-500 hover:to-red-600 transition-colors"
                            title="Call a vote to test the government's majority"
                        >
                            ⚔️ Vote of Confidence
                        </button>
                    )}
                    {onProposeBill && (
                        <button
                            onClick={onProposeBill}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded shadow hover:from-green-500 hover:to-emerald-500 transition-colors"
                            title="Propose a new bill to Parliament"
                        >
                            📜 Propose Bill
                        </button>
                    )}
                </div>
            )}

            {/* Bill Overlays */}
            {gameState === 'bill-proposal' && currentBill && playerParty && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <BillProposalPanel 
                        bill={currentBill}
                        playerParty={playerParty}
                        partiesMap={partiesMap}
                        electionResults={electionResults}
                        onVote={onVoteOnBill}
                    />
                </div>
            )}
            {gameState === 'bill-results' && billVoteResults && currentBill && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <BillResultsPanel 
                        bill={currentBill}
                        results={billVoteResults}
                        partiesMap={partiesMap}
                        onClose={onCloseBillResults}
                    />
                </div>
            )}
        </div>
    );
};

export default ParliamentScreen;