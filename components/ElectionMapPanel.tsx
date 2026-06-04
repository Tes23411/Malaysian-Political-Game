import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Party, ElectionResults, GeoJsonFeature } from '../types';

interface ElectionMapPanelProps {
  featuresMap: Map<string, GeoJsonFeature>;
  results: ElectionResults;
  detailedResults: Map<string, Map<string, number>>;
  previousDetailedResults: Map<string, Map<string, number>> | null;
  partiesMap: Map<string, Party>;
}

type Metric = 'vote_percentage' | 'margin_gain';

// Helper component to fit bounds
const FitBounds = ({ features }: { features: GeoJsonFeature[] }) => {
  const map = useMap();
  useEffect(() => {
    if (features.length > 0) {
      const group = L.featureGroup(features.map(f => L.geoJSON(f)));
      try {
          map.fitBounds(group.getBounds());
      } catch (e) {
          console.warn("Could not fit bounds", e);
      }
    }
  }, [features, map]);
  return null;
};

const ElectionMapPanel: React.FC<ElectionMapPanelProps> = ({
  featuresMap,
  results,
  detailedResults,
  previousDetailedResults,
  partiesMap,
}) => {
  const [selectedPartyId, setSelectedPartyId] = useState<string>('all');
  const [metric, setMetric] = useState<Metric>('vote_percentage');

  const features = useMemo(() => Array.from(featuresMap.values()), [featuresMap]);
  const parties = useMemo(() => Array.from(partiesMap.values()), [partiesMap]);

  const getFeatureStyle = (feature: GeoJsonFeature) => {
    const seatCode = feature.properties.UNIQUECODE;
    const winnerId = results.get(seatCode);
    
    // Default style
    let fillColor = '#333';
    let fillOpacity = 0.2;
    let color = '#555';
    let weight = 1;

    if (selectedPartyId === 'all') {
      // Show winner
      if (winnerId) {
        const party = partiesMap.get(winnerId);
        if (party) {
          fillColor = party.color;
          fillOpacity = 0.7;
        }
      }
    } else {
      // Specific party selected
      const party = partiesMap.get(selectedPartyId);
      if (party) {
        const seatVotes = detailedResults.get(seatCode);
        const totalVotes = seatVotes ? Array.from(seatVotes.values()).reduce((a, b) => (a as number) + (b as number), 0) as number : 0;
        const partyVotes = seatVotes ? (seatVotes.get(selectedPartyId) as number) || 0 : 0;
        
        if (metric === 'vote_percentage') {
          fillColor = party.color;
          const percentage = totalVotes > 0 ? (partyVotes / totalVotes) : 0;
          // Scale opacity: 0% -> 0.1, 100% -> 0.9
          fillOpacity = 0.1 + (percentage * 0.8);
        } else if (metric === 'margin_gain') {
          const currentPercentage = totalVotes > 0 ? (partyVotes / totalVotes) * 100 : 0;
          
          let prevPercentage = 0;
          if (previousDetailedResults) {
            const prevSeatVotes = previousDetailedResults.get(seatCode);
            const prevTotalVotes = prevSeatVotes ? Array.from(prevSeatVotes.values()).reduce((a, b) => (a as number) + (b as number), 0) as number : 0;
            const prevPartyVotes = prevSeatVotes ? (prevSeatVotes.get(selectedPartyId) as number) || 0 : 0;
            prevPercentage = prevTotalVotes > 0 ? (prevPartyVotes / prevTotalVotes) * 100 : 0;
          }
          
          const gain = currentPercentage - prevPercentage;
          
          // Gain > 0: Green, Loss < 0: Red
          // Opacity based on magnitude. Max magnitude ~20%?
          const magnitude = Math.min(Math.abs(gain), 20) / 20; // 0 to 1
          
          if (gain > 0) {
            fillColor = '#22c55e'; // Green-500
          } else {
            fillColor = '#ef4444'; // Red-500
          }
          fillOpacity = 0.2 + (magnitude * 0.8);
          
          if (Math.abs(gain) < 0.1) {
             fillColor = '#6b7280'; // Gray
             fillOpacity = 0.1;
          }
        }
      }
    }

    return {
      fillColor,
      fillOpacity,
      color,
      weight,
      opacity: 1
    };
  };

  const onEachFeature = (feature: GeoJsonFeature, layer: L.Layer) => {
    const seatCode = feature.properties.UNIQUECODE;
    const seatName = feature.properties.NAMAPAR || feature.properties.PARLIMEN || 'Unknown Seat';
    
    let tooltipContent = `<div class="font-bold">${seatName} (${seatCode})</div>`;
    
    const winnerId = results.get(seatCode);
    if (winnerId) {
        const winner = partiesMap.get(winnerId);
        tooltipContent += `<div>Winner: <span style="color:${winner?.color}">${winner?.name}</span></div>`;
    }

    if (selectedPartyId !== 'all') {
        const seatVotes = detailedResults.get(seatCode);
        const totalVotes = seatVotes ? Array.from(seatVotes.values()).reduce((a, b) => (a as number) + (b as number), 0) as number : 0;
        const partyVotes = seatVotes ? (seatVotes.get(selectedPartyId) as number) || 0 : 0;
        const percentage = totalVotes > 0 ? (partyVotes / totalVotes) * 100 : 0;
        
        tooltipContent += `<div>${partiesMap.get(selectedPartyId)?.name}: ${percentage.toFixed(1)}%</div>`;
        
        if (metric === 'margin_gain' && previousDetailedResults) {
            const prevSeatVotes = previousDetailedResults.get(seatCode);
            const prevTotalVotes = prevSeatVotes ? Array.from(prevSeatVotes.values()).reduce((a, b) => (a as number) + (b as number), 0) as number : 0;
            const prevPartyVotes = prevSeatVotes ? (prevSeatVotes.get(selectedPartyId) as number) || 0 : 0;
            const prevPercentage = prevTotalVotes > 0 ? (prevPartyVotes / prevTotalVotes) * 100 : 0;
            const gain = percentage - prevPercentage;
            const sign = gain > 0 ? '+' : '';
            const color = gain > 0 ? '#4ade80' : gain < 0 ? '#f87171' : '#9ca3af';
            tooltipContent += `<div>Swing: <span style="color:${color}">${sign}${gain.toFixed(1)}%</span></div>`;
        }
    }

    layer.bindTooltip(tooltipContent, {
      className: 'leaflet-tooltip-custom',
      sticky: true,
      direction: 'top'
    });
  };

  if (!features || features.length === 0) {
      return (
          <div className="flex items-center justify-center h-full text-gray-400">
              No map data available.
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex gap-4 mb-4 p-2 bg-gray-800 rounded-lg shrink-0">
        <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1">View Party</label>
            <select 
                value={selectedPartyId} 
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="bg-gray-700 text-white rounded px-2 py-1 border border-gray-600"
            >
                <option value="all">All (Winners)</option>
                {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
        </div>
        
        {selectedPartyId !== 'all' && (
            <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Metric</label>
                <select 
                    value={metric} 
                    onChange={(e) => setMetric(e.target.value as Metric)}
                    className="bg-gray-700 text-white rounded px-2 py-1 border border-gray-600"
                >
                    <option value="vote_percentage">Vote Percentage</option>
                    <option value="margin_gain">Margin Gain (vs Prev)</option>
                </select>
            </div>
        )}
        
        <div className="flex-1 flex items-center justify-end text-xs text-gray-400">
            {selectedPartyId === 'all' ? (
                <span>Showing winning party for each seat</span>
            ) : metric === 'vote_percentage' ? (
                <span>Opacity indicates vote share (Darker = Higher %)</span>
            ) : (
                <span><span className="text-green-500">Green</span> = Gain, <span className="text-red-500">Red</span> = Loss</span>
            )}
        </div>
      </div>
      
      <div className="flex-1 rounded-lg overflow-hidden border border-gray-700 relative min-h-0">
        <MapContainer 
            style={{ height: '100%', width: '100%', background: '#1f2937' }} 
            zoom={6} 
            center={[4.2105, 101.9758]}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <GeoJSON 
                key={`${selectedPartyId}-${metric}`} // Force re-render on change
                data={features as any} 
                style={getFeatureStyle as any}
                onEachFeature={onEachFeature}
            />
            <FitBounds features={features} />
        </MapContainer>
      </div>
    </div>
  );
};

export default ElectionMapPanel;
