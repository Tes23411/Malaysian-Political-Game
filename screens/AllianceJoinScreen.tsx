import React, { useState, useMemo } from 'react';
import { Party, PoliticalAlliance, AllianceJoinScreenProps } from '../types';

const AllianceJoinScreen: React.FC<AllianceJoinScreenProps> = ({ playerParty, parties, alliances, onConfirm, onCancel }) => {
  const [selectedAllianceId, setSelectedAllianceId] = useState<string | null>(null);

  // Calculate likelihood of the alliance leader accepting
  const getLikelihood = (alliance: PoliticalAlliance) => {
      const leaderParty = parties.find(p => p.id === alliance.leaderPartyId);
      if (!leaderParty) return { text: 'Low', color: 'text-red-400' };

      const relation = leaderParty.relations.get(playerParty.id) || 50;
      let chance = relation / 100;
      if (alliance.type === 'Alliance') chance -= 0.2;
      else chance += 0.1;
      
      if (chance >= 0.7) return { text: 'High', color: 'text-green-400' };
      if (chance >= 0.4) return { text: 'Medium', color: 'text-yellow-400' };
      return { text: 'Low', color: 'text-red-400' };
  };

  const availableAlliances = useMemo(() => {
      return alliances;
  }, [alliances]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedAllianceId) {
          onConfirm(selectedAllianceId);
      }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 z-[5000] flex items-center justify-center font-sans p-4">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <h2 className="text-3xl font-bold mb-2 text-center text-indigo-400">Join Political Coalition</h2>
        <p className="text-center text-gray-400 mb-6">Propose to join an existing alliance.</p>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto pr-2 mb-6 bg-gray-900/30 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-300">Select Alliance to Join</h3>
                {availableAlliances.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableAlliances.map(alliance => {
                             const likelihood = getLikelihood(alliance);
                             const leaderParty = parties.find(p => p.id === alliance.leaderPartyId);
                             return (
                                <div 
                                    key={alliance.id}
                                    onClick={() => setSelectedAllianceId(alliance.id)}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors flex justify-between items-center ${selectedAllianceId === alliance.id ? 'border-indigo-500 bg-indigo-900/30' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
                                >
                                    <div>
                                        <p className="font-bold text-indigo-300">{alliance.name}</p>
                                        <p className="text-xs text-gray-500">Leader: {leaderParty?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">Type: {alliance.type}</p>
                                        <p className="text-xs text-gray-500">Members: {alliance.memberPartyIds.length}</p>
                                    </div>
                                    <div className="text-right">
                                        {selectedAllianceId === alliance.id ? (
                                            <span className="text-indigo-400 font-bold text-xl">✓</span>
                                        ) : (
                                            <span className={`text-xs font-bold ${likelihood.color}`}>{likelihood.text} Chance</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500 italic text-center py-10">No available alliances to join.</p>
                )}
            </div>

            <div className="flex justify-end gap-4 mt-auto">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 font-bold rounded-lg transition-colors">
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={!selectedAllianceId}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-bold rounded-lg transition-colors"
                >
                    Propose to Join
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AllianceJoinScreen;
