
import React, { useState, useMemo } from 'react';
import { Character, Party, Affiliation } from '../types';
import { generateCharacterName } from '../utils/naming';

interface CharacterSelectionScreenProps {
  onCharacterSelect: (character: Omit<Character, 'currentSeatCode' | 'dateOfBirth' | 'isAlive' | 'ideology'>) => void;
  uniqueStates: string[];
  party: Party;
  affiliationsMap: Map<string, Affiliation>;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const CharacterSelectionScreen: React.FC<CharacterSelectionScreenProps> = ({ onCharacterSelect, uniqueStates, party, affiliationsMap }) => {
  const [customName, setCustomName] = useState('');
  
  const preGeneratedCharacters: Omit<Character, 'currentSeatCode' | 'isPlayer' | 'dateOfBirth' | 'isAlive' | 'ideology'>[] = useMemo(() => 
    Array.from({ length: 3 }, (_, i) => {
      const affiliationId = randomElement(party.affiliationIds);
      const affiliation = affiliationsMap.get(affiliationId)!;
      const ethnicity = affiliation.ethnicity;
      
      return {
        id: `pregen-${i}`,
        name: generateCharacterName(ethnicity),
        affiliationId,
        ethnicity,
        state: uniqueStates[Math.floor(Math.random() * uniqueStates.length)],
        charisma: Math.floor(Math.random() * 70) + 30,
        influence: Math.floor(Math.random() * 70) + 30,
        recognition: Math.floor(Math.random() * 70) + 30,
        isMP: false,
        history: [],
      };
    })
  , [party, affiliationsMap, uniqueStates]);
  
  const handleSelectPreGenerated = (character: Omit<Character, 'currentSeatCode' | 'isPlayer' | 'dateOfBirth' | 'isAlive' | 'ideology'>) => {
    onCharacterSelect({
      ...character,
      id: `player-${Date.now()}`,
      isPlayer: true,
    });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customName.trim()) {
      const affiliationId = randomElement(party.affiliationIds);
      const affiliation = affiliationsMap.get(affiliationId)!;
      const ethnicity = affiliation.ethnicity;
      onCharacterSelect({
        id: `player-${Date.now()}`,
        name: customName.trim(),
        ethnicity,
        affiliationId,
        state: uniqueStates[Math.floor(Math.random() * uniqueStates.length)],
        isPlayer: true,
        charisma: Math.floor(Math.random() * 50) + 25,
        influence: Math.floor(Math.random() * 50) + 25,
        recognition: Math.floor(Math.random() * 50) + 25,
        isMP: false,
        history: [],
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-gray-900 text-white font-sans p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-2">Select Your Character</h1>
        <p className="text-center text-lg mb-8" style={{ color: party.color, textShadow: '0 0 2px black' }}>
            You are joining the <span className="font-bold">{party.name}</span>.
        </p>
        
        <h2 className="text-2xl font-semibold mb-4 text-gray-300">Choose a character...</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {preGeneratedCharacters.map(char => (
            <div 
              key={char.id}
              onClick={() => handleSelectPreGenerated(char)}
              className="bg-gray-800 p-6 rounded-lg text-left cursor-pointer hover:bg-blue-600 hover:scale-105 transition-all duration-200"
            >
              <p className="text-2xl font-bold mb-2 text-center">{char.name}</p>
              <div className="text-sm text-gray-300 space-y-1">
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Affiliation:</span> {affiliationsMap.get(char.affiliationId)?.name}</p>
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Origin:</span> {char.state}</p>
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Ethnicity:</span> {char.ethnicity}</p>
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Charisma:</span> {char.charisma}</p>
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Influence:</span> {char.influence}</p>
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Recognition:</span> {char.recognition}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-semibold mb-4 text-center text-gray-300">...or create your own</h2>
        <form onSubmit={handleCustomSubmit} className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter character name"
            className="flex-grow bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit"
            disabled={!customName.trim()}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            Create & Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default CharacterSelectionScreen;
