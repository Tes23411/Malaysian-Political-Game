import React, { useState, useEffect } from 'react';
import { Party, PoliticalAlliance, Demographics, GeoJsonFeature, StrongholdMap, Character, Affiliation, Government, ComplexEconomicState } from '../types';
import { getElectionEconomicMultiplier } from '../utils/economics';
import { calculateEffectiveInfluence } from '../utils/influence';

interface PollsPanelProps {
  currentParties: Party[];
  alliances: PoliticalAlliance[];
  demographicsMap: Map<string, Demographics>;
  featuresMap: Map<string, GeoJsonFeature>;
  strongholdMap: StrongholdMap;
  characters: Character[];
  affiliationsMap: Map<string, Affiliation>;
  government: Government | null;
  economicState: ComplexEconomicState;
  allSeatCodes: string[];
  onClose: () => void;
}

const PollsPanel: React.FC<PollsPanelProps> = ({
  currentParties, alliances, demographicsMap, featuresMap, strongholdMap,
  characters, affiliationsMap, government, economicState, allSeatCodes, onClose
}) => {
  const [projectedSeats, setProjectedSeats] = useState<Map<string, number>>(new Map());
  const [projectedVotes, setProjectedVotes] = useState<Map<string, number>>(new Map());
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    const runSimulation = () => {
      // Determine which alliances are ruling alliances (all members are in ruling coalition)
      const rulingCoalitionSet = new Set<string>(government?.rulingCoalitionIds ?? []);

      const rulingAllianceIds = new Set<string>(
        alliances
          .filter(a => a.memberPartyIds.some(id => rulingCoalitionSet.has(id)))
          .map(a => a.memberPartyIds)
          .flat()
      );

      const affiliationToPartyMap = new Map<string, string>();
      currentParties.forEach(p => p.affiliationIds.forEach(id => affiliationToPartyMap.set(id, p.id)));

      // Accumulate results locally — no setState inside the loop
      const newSeats = new Map<string, number>();
      const newVotes = new Map<string, number>();
      let totalValidVotes = 0;

      allSeatCodes.forEach(seatCode => {
        const seatFeature = featuresMap.get(seatCode);
        const demographics = demographicsMap.get(seatCode);
        if (!seatFeature) return;

        const electorate = demographics ? demographics.totalElectors : 10000;
        const charactersInSeat = characters.filter(c => c.currentSeatCode === seatCode && c.isAlive);

        const seatScores = new Map<string, number>();
        currentParties.forEach(p => {
          let partyTotal = 0;
          charactersInSeat.forEach(char => {
            const charPartyId = affiliationToPartyMap.get(char.affiliationId);
            if (charPartyId === p.id) {
              const charInfluence = calculateEffectiveInfluence(
                char, seatFeature, demographics || null, affiliationsMap, strongholdMap
              );
              partyTotal += charInfluence;
            }
          });
          seatScores.set(p.id, partyTotal);
        });

        const adjustedScores = new Map<string, number>();
        let finalTot = 0;

        seatScores.forEach((score, pId) => {
          // A party is "ruling" if it's directly in the coalition or in a ruling alliance
          const isRulingParty = rulingCoalitionSet.has(pId) || rulingAllianceIds.has(pId);

          const variance = 0.9 + (Math.random() * 0.2);
          const economicMultiplier = getElectionEconomicMultiplier(
            isRulingParty,
            economicState.publicApproval,
            economicState.momentum
          );
          const adj = score * variance * economicMultiplier;
          adjustedScores.set(pId, adj);
          finalTot += adj;
        });

        const turnoutRate = 0.65 + Math.random() * 0.1;
        const validVotes = Math.floor(electorate * turnoutRate);
        const seatVotes = new Map<string, number>();

        if (finalTot > 0) {
          adjustedScores.forEach((score, pId) => {
            const svotes = Math.floor((score / finalTot) * validVotes);
            seatVotes.set(pId, svotes);
            newVotes.set(pId, (newVotes.get(pId) || 0) + svotes);
            totalValidVotes += svotes;
          });
        }

        // FPTP: seat goes to the party with the most votes
        let maxV = -1;
        let winner = '';
        seatVotes.forEach((v, p) => { if (v > maxV) { maxV = v; winner = p; } });
        if (winner) {
          newSeats.set(winner, (newSeats.get(winner) || 0) + 1);
        }
      });

      // Single batch update after all seats are processed
      setProjectedSeats(newSeats);
      setProjectedVotes(newVotes);
      setIsSimulating(false);

      // totalValidVotes available here if you want to display turnout
      void totalValidVotes;
    };

    const timerId = setTimeout(runSimulation, 50);

    // Cleanup: cancel if the component unmounts before the timeout fires
    return () => clearTimeout(timerId);
  }, [
    currentParties, alliances, characters, government, economicState,
    allSeatCodes, featuresMap, demographicsMap, strongholdMap, affiliationsMap
  ]);

  const totalSeats = allSeatCodes.length;
  const totalVotes = Array.from(projectedVotes.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-600 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700 font-bold text-xl text-blue-400">
          Independent Polling Data
          <button onClick={onClose} className="float-right text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="p-6">
          {isSimulating ? (
            <div className="text-white text-center py-10 animate-pulse">Running National Polls...</div>
          ) : (
            <div className="space-y-6">
              {/* Seat distribution */}
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-white font-bold mb-4">Projected Seat Distribution (FPTP)</h3>
                <div className="space-y-2">
                  {currentParties
                    .map(p => ({ p, seats: projectedSeats.get(p.id) || 0 }))
                    .sort((a, b) => b.seats - a.seats)
                    .map(item => (
                      <div key={item.p.id} className="flex items-center">
                        <div className="w-8 h-4 rounded" style={{ backgroundColor: item.p.color }}></div>
                        <div className="w-1/3 ml-3 text-gray-200">{item.p.name}</div>
                        <div className="w-full bg-gray-900 h-6 rounded overflow-hidden relative">
                          <div
                            className="h-full"
                            style={{ width: `${(item.seats / totalSeats) * 100}%`, backgroundColor: item.p.color }}
                          ></div>
                          <div className="absolute inset-0 flex items-center px-2 text-xs font-bold text-white mix-blend-difference">
                            {item.seats} Seats
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Vote share */}
              {totalVotes > 0 && (
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h3 className="text-white font-bold mb-4">Projected Vote Share</h3>
                  <div className="space-y-2">
                    {currentParties
                      .map(p => ({ p, votes: projectedVotes.get(p.id) || 0 }))
                      .sort((a, b) => b.votes - a.votes)
                      .map(item => {
                        const pct = ((item.votes / totalVotes) * 100).toFixed(1);
                        return (
                          <div key={item.p.id} className="flex items-center">
                            <div className="w-8 h-4 rounded" style={{ backgroundColor: item.p.color }}></div>
                            <div className="w-1/3 ml-3 text-gray-200">{item.p.name}</div>
                            <div className="w-full bg-gray-900 h-6 rounded overflow-hidden relative">
                              <div
                                className="h-full"
                                style={{ width: `${pct}%`, backgroundColor: item.p.color }}
                              ></div>
                              <div className="absolute inset-0 flex items-center px-2 text-xs font-bold text-white mix-blend-difference">
                                {pct}%
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-400 italic">
                * This poll represents the immediate political climate and assumes a general election held today.
                Margin of error remains due to rapid public opinion changes or election strategies.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollsPanel;