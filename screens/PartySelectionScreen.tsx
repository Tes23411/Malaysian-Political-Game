import React from 'react';
import { Party } from '../types';

interface PartySelectionScreenProps {
  parties: Party[];
  onPartySelect: (party: Party) => void;
}

const PartySelectionScreen: React.FC<PartySelectionScreenProps> = ({ parties, onPartySelect }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-gray-900 text-white font-sans p-4">
      <h1 className="text-3xl md:text-5xl font-bold text-center mb-8">Choose Your Party</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl">
        {parties.map(party => (
          <div
            key={party.id}
            onClick={() => onPartySelect(party)}
            className="p-8 rounded-lg text-center cursor-pointer hover:scale-105 transition-all duration-200 shadow-lg"
            style={{ backgroundColor: party.color }}
          >
            <h2 className="text-2xl font-bold text-white uppercase" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>{party.name}</h2>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartySelectionScreen;
