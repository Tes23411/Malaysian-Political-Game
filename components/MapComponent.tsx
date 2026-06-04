
import React, { useRef, useCallback, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { GeoJsonFeature, Character, Demographics, Party, ElectionResults, Affiliation, StrongholdMap, ElectionMapConfig } from '../types';
import type { Layer, PathOptions, GeoJSON as LeafletGeoJSON, LeafletMouseEvent } from 'leaflet';
import { calculateEffectiveInfluence } from '../utils/influence';
import { densityToColor } from '../utils/redelineation';

interface MapComponentProps {
  features: GeoJsonFeature[];
  characters: Character[];
  demographicsMap: Map<string, Demographics>;
  parties: Party[];
  selectedSeatCode: string | null;
  onSeatClick: (seatCode: string | null) => void;
  affiliationToPartyMap: Map<string, string>;
  electionResults: ElectionResults;
  isPlayerMoving: boolean;
  isPositionSelectionMode?: boolean;
  onPositionSelect?: (seatCode: string) => void;
  affiliationsMap: Map<string, Affiliation>;
  strongholdMap: StrongholdMap;
  electionMapConfig?: ElectionMapConfig;
  densityMap: Map<string, number>;
  isDensityLoading?: boolean;
  redelineatedCodesWithYear?: Map<string, number>;
  currentYear?: number;
}

const NEUTRAL_COLOR = '#555555';
const HIGHLIGHT_COLOR = '#FFFFFF';
const SELECTED_COLOR = '#00FFFF';
const MOVE_TARGET_COLOR = '#00FFFF';
const PLAYER_LOCATION_COLOR = '#FFD700';
const POSITION_SELECT_COLOR = '#A78BFA'; // A violet color for position selection

type MapMode = 'political' | 'population' | 'malay' | 'chinese' | 'indian' | 'others' | 'classification' | 'income' | 'youth' | 'density';

const MapResizer = () => {
  const map = useMap();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '=' || e.key === '+') {
        map.zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        map.zoomOut();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [map]);

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [map]);
  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({ features, characters, demographicsMap, parties, selectedSeatCode, onSeatClick, affiliationToPartyMap, electionResults, isPlayerMoving, isPositionSelectionMode, onPositionSelect, affiliationsMap, strongholdMap, electionMapConfig, densityMap, isDensityLoading, redelineatedCodesWithYear, currentYear }) => {
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
  const initialPosition: [number, number] = [4.2105, 101.9758];
  const initialZoom = 7;
  const [mapMode, setMapMode] = useState<MapMode>('political');

  const partiesMap = useMemo(() => new Map<string, Party>(parties.map(p => [p.id, p])), [parties]);
  const featuresMap = useMemo(() => new Map(features.map(f => [f.properties.UNIQUECODE, f])), [features]);
  const player = useMemo(() => characters.find(c => c.isPlayer), [characters]);

  const seatData = useMemo(() => {
    const seatPartyMap = new Map<string, string>();
    const characterCounts = new Map<string, number>();
    const seatInfluence = new Map<string, number>();
    
    const livingCharacters = characters.filter(c => c.isAlive);
    const charactersBySeat = new Map<string, Character[]>();
    for (const char of livingCharacters) {
      if (!charactersBySeat.has(char.currentSeatCode)) {
        charactersBySeat.set(char.currentSeatCode, []);
      }
      charactersBySeat.get(char.currentSeatCode)!.push(char);
    }

    for (const [seatCode, seatCharacters] of charactersBySeat.entries()) {
      characterCounts.set(seatCode, seatCharacters.length);
      
      const seatFeature = featuresMap.get(seatCode);
      const seatDemographics = demographicsMap.get(seatCode);

      if (seatFeature) {
        const partyInfluence: { [partyId: string]: number } = {};
        let dominantPartyId = '';
        let maxInfluence = 0;
        let totalSeatInfluence = 0;
  
        for (const char of seatCharacters) {
          const partyId = affiliationToPartyMap.get(char.affiliationId);
          if (!partyId) continue;
          
          const party = partiesMap.get(partyId);
          if (!party || !party.contestedSeats.has(seatCode)) continue;
          const contestData = party.contestedSeats.get(seatCode);
          
          const effectiveInfluence = calculateEffectiveInfluence(char, seatFeature, seatDemographics || null, affiliationsMap, strongholdMap, contestData?.candidateId, contestData?.allocatedAffiliationId);
          
          partyInfluence[partyId] = (partyInfluence[partyId] || 0) + effectiveInfluence;
          totalSeatInfluence += effectiveInfluence;
        }
        
        seatInfluence.set(seatCode, totalSeatInfluence);
  
        for (const partyId in partyInfluence) {
          if (partyInfluence[partyId] > maxInfluence) {
            maxInfluence = partyInfluence[partyId];
            dominantPartyId = partyId;
          }
        }
        seatPartyMap.set(seatCode, dominantPartyId);
      }
    }

    return { seatPartyMap, characterCounts, seatInfluence };
  }, [characters, featuresMap, demographicsMap, affiliationToPartyMap, partiesMap, affiliationsMap, strongholdMap]);

  const { seatPartyMap, characterCounts, seatInfluence } = seatData;

  // Calculate population range for gradient
  const populationRange = useMemo(() => {
    let min = Infinity;
    let max = 0;
    demographicsMap.forEach(d => {
      if (d.totalElectors < min) min = d.totalElectors;
      if (d.totalElectors > max) max = d.totalElectors;
    });
    return { min, max };
  }, [demographicsMap]);

  const getGradientColor = useCallback((value: number, min: number, max: number, colorStart: [number, number, number], colorEnd: [number, number, number]) => {
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const r = Math.round(colorStart[0] + ratio * (colorEnd[0] - colorStart[0]));
    const g = Math.round(colorStart[1] + ratio * (colorEnd[1] - colorStart[1]));
    const b = Math.round(colorStart[2] + ratio * (colorEnd[2] - colorStart[2]));
    return `rgb(${r}, ${g}, ${b})`;
  }, []);

  const highlightStyle: PathOptions = {
    weight: 2,
    color: HIGHLIGHT_COLOR,
    fillOpacity: 0.8,
  };

  const selectedStyle: PathOptions = {
    weight: 3,
    color: SELECTED_COLOR,
  };

  const getStyle = useCallback((feature?: GeoJsonFeature): PathOptions => {
    const baseStyle: PathOptions = {
      weight: 1,
      color: '#1a202c',
      fillOpacity: 0.6
    };
    
    if (!feature || !feature.properties.UNIQUECODE) {
      return { ...baseStyle, fillColor: NEUTRAL_COLOR };
    }
    
    const seatCode = feature.properties.UNIQUECODE;

    // Election Map Overlay Logic
    if (electionMapConfig?.active && electionMapConfig.results) {
        const { results, detailedResults, previousDetailedResults, selectedPartyId, metric } = electionMapConfig;
        const winnerId = results.get(seatCode);
        
        let fillColor = '#333';
        let fillOpacity = 0.2;

        if (!selectedPartyId || selectedPartyId === 'all') {
            if (winnerId) {
                const party = partiesMap.get(winnerId);
                if (party) {
                    fillColor = party.color;
                    fillOpacity = 0.7;
                }
            }
        } else {
            const party = partiesMap.get(selectedPartyId);
            if (party && detailedResults) {
                const seatVotes = detailedResults.get(seatCode);
                const totalVotes = seatVotes ? Array.from(seatVotes.values()).reduce((a, b) => (a as number) + (b as number), 0) as number : 0;
                const partyVotes = seatVotes ? (seatVotes.get(selectedPartyId) as number) || 0 : 0;

                if (metric === 'vote_percentage') {
                    fillColor = party.color;
                    const percentage = totalVotes > 0 ? (partyVotes / totalVotes) : 0;
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
                    const magnitude = Math.min(Math.abs(gain), 20) / 20;
                    
                    if (gain > 0) fillColor = '#22c55e';
                    else fillColor = '#ef4444';
                    
                    fillOpacity = 0.2 + (magnitude * 0.8);
                    if (Math.abs(gain) < 0.1) {
                        fillColor = '#6b7280';
                        fillOpacity = 0.1;
                    }
                }
            }
        }
        return {
            ...baseStyle,
            fillColor,
            fillOpacity,
            weight: 1,
            color: '#555'
        };
    }
    
    if (isPositionSelectionMode) {
      return {
        ...baseStyle,
        weight: 2,
        color: POSITION_SELECT_COLOR,
        fillColor: '#444',
        fillOpacity: 0.7
      };
    }
    
    if (isPlayerMoving) {
      const winningPartyId = electionResults.get(seatCode);
      const partyColor = winningPartyId ? partiesMap.get(winningPartyId)?.color : NEUTRAL_COLOR;

      if (player && seatCode === player.currentSeatCode) {
        return {
          ...baseStyle,
          weight: 3,
          color: PLAYER_LOCATION_COLOR,
          fillColor: partyColor
        };
      }
      return { 
        ...baseStyle, 
        weight: 2,
        color: MOVE_TARGET_COLOR,
        fillOpacity: 0.7,
        fillColor: partyColor
      };
    }

    let seatColor = NEUTRAL_COLOR;
    const demo = demographicsMap.get(seatCode);

    if (mapMode === 'political') {
      const winningPartyId = electionResults.get(seatCode);
      if (winningPartyId) {
        seatColor = partiesMap.get(winningPartyId)?.color || NEUTRAL_COLOR;
      } else {
        const dominantPartyId = seatPartyMap.get(seatCode);
        seatColor = dominantPartyId ? (partiesMap.get(dominantPartyId)?.color || NEUTRAL_COLOR) : NEUTRAL_COLOR;
      }
    } else if (demo) {
      switch (mapMode) {
        case 'population':
          seatColor = getGradientColor(demo.totalElectors, populationRange.min, populationRange.max, [200, 230, 255], [0, 50, 150]); // Light blue to Dark blue
          break;
        case 'malay':
          seatColor = getGradientColor(demo.malayPercent, 0, 100, [240, 255, 240], [0, 100, 0]); // Light green to Dark green
          break;
        case 'chinese':
          seatColor = getGradientColor(demo.chinesePercent, 0, 100, [255, 240, 240], [150, 0, 0]); // Light red to Dark red
          break;
        case 'indian':
          seatColor = getGradientColor(demo.indiansPercent, 0, 100, [255, 245, 230], [200, 100, 0]); // Light orange to Dark orange
          break;
        case 'others':
          seatColor = getGradientColor(demo.othersPercent, 0, 100, [245, 245, 245], [50, 50, 50]); // Light grey to Dark grey
          break;
        case 'classification':
          const classification = String(demo.urbanRuralClassification2018 || 'SEMI-URBAN').toUpperCase();
          if (classification.includes('URBAN') && classification !== 'SEMI-URBAN' && classification !== 'SEMI URBAN') {
            seatColor = '#1f77b4'; // Blue for Urban
          } else if (classification.includes('RURAL')) {
            seatColor = '#2ca02c'; // Green for Rural
          } else {
            seatColor = '#ff7f0e'; // Orange for Semi-Urban
          }
          break;
        case 'income':
          seatColor = getGradientColor(demo.medianIncome || 0, 2000, 12000, [255, 235, 180], [0, 100, 0]); // Light yellow to Dark Green
          break;
        case 'youth':
          seatColor = getGradientColor(demo.youngVotersPercent || 0, 18, 48, [240, 240, 255], [106, 13, 173]); // Light violet to Deep Purple
          break;
        case 'density':
          seatColor = densityToColor(densityMap.get(seatCode) ?? 0);
          break;
      }
    }
    
    baseStyle.fillColor = seatColor;
    baseStyle.fillOpacity = mapMode === 'political' ? 0.6 : mapMode === 'density' ? 1.0 : 0.8;

    if (redelineatedCodesWithYear && currentYear !== undefined) {
      const redelineatedYear = redelineatedCodesWithYear.get(seatCode);
      const yearsSince = redelineatedYear ? currentYear - redelineatedYear : Infinity;
      const highlightOpacity = yearsSince < 3 ? 1 - (yearsSince / 3) : 0;
      if (highlightOpacity > 0) {
        baseStyle.color = `rgba(245, 158, 11, ${highlightOpacity})`;
        baseStyle.weight = 2.5;
      }
    }
    
    if (seatCode === selectedSeatCode) {
      return {
        ...baseStyle,
        ...selectedStyle,
        fillOpacity: 0.9,
      };
    }

    return baseStyle;
  }, [seatPartyMap, partiesMap, selectedSeatCode, electionResults, isPlayerMoving, player, isPositionSelectionMode, mapMode, demographicsMap, populationRange, getGradientColor, redelineatedCodesWithYear, currentYear, electionMapConfig, densityMap]);

  const getTooltipContent = useCallback((feature: GeoJsonFeature) => {
    const seatCode = feature.properties?.UNIQUECODE;
    if (!seatCode || !feature.properties.PARLIMEN) return '';

    if (electionMapConfig?.active && electionMapConfig.results) {
        const { results, detailedResults, previousDetailedResults, selectedPartyId, metric } = electionMapConfig;
        const seatName = feature.properties.NAMAPAR || feature.properties.PARLIMEN || 'Unknown Seat';
        let content = `<div class="font-bold">${seatName} (${seatCode})</div>`;
        
        const winnerId = results.get(seatCode);
        if (winnerId) {
            const winner = partiesMap.get(winnerId);
            content += `<div>Winner: <span style="color:${winner?.color}">${winner?.name}</span></div>`;
        }

        if (selectedPartyId && selectedPartyId !== 'all' && detailedResults) {
            const seatVotes = detailedResults.get(seatCode);
            const totalVotes = seatVotes ? Array.from(seatVotes.values()).reduce((a, b) => (a as number) + (b as number), 0) as number : 0;
            const partyVotes = seatVotes ? (seatVotes.get(selectedPartyId) as number) || 0 : 0;
            const percentage = totalVotes > 0 ? (partyVotes / totalVotes) * 100 : 0;
            
            content += `<div>${partiesMap.get(selectedPartyId)?.name}: ${percentage.toFixed(1)}%</div>`;
            
            if (metric === 'margin_gain' && previousDetailedResults) {
                const prevSeatVotes = previousDetailedResults.get(seatCode);
                const prevTotalVotes = prevSeatVotes ? Array.from(prevSeatVotes.values()).reduce((a, b) => (a as number) + (b as number), 0) as number : 0;
                const prevPartyVotes = prevSeatVotes ? (prevSeatVotes.get(selectedPartyId) as number) || 0 : 0;
                const prevPercentage = prevTotalVotes > 0 ? (prevPartyVotes / prevTotalVotes) * 100 : 0;
                const gain = percentage - prevPercentage;
                const sign = gain > 0 ? '+' : '';
                const color = gain > 0 ? '#4ade80' : gain < 0 ? '#f87171' : '#9ca3af';
                content += `<div>Swing: <span style="color:${color}">${sign}${gain.toFixed(1)}%</span></div>`;
            }
        }
        return content;
    }

    if (isPositionSelectionMode) {
        return `<strong>${feature.properties.PARLIMEN}</strong><br/>Click to choose as starting location.`;
    } else if (isPlayerMoving) {
      if (player && player.currentSeatCode === seatCode) {
          return `<strong>${feature.properties.PARLIMEN}</strong><br/>(Current Location)<br/>Click again to cancel move.`;
      }
      return `<strong>${feature.properties.PARLIMEN}</strong><br/>Click to move here.`;
    }

    const count = seatData.characterCounts.get(seatCode) || 0;
    const demoData = demographicsMap.get(seatCode);
    const dominantPartyId = seatData.seatPartyMap.get(seatCode);
    const dominantParty = dominantPartyId ? partiesMap.get(dominantPartyId) : null;
    const winningPartyId = electionResults.get(seatCode);
    const ownerParty = winningPartyId ? partiesMap.get(winningPartyId) : null;

    let demographicInfo = '';
    let redelineationInfo = '';
    
    if (demoData) {
      const densityLine = mapMode === 'density' 
        ? `<br />Density: ${densityMap.get(seatCode)?.toFixed(1) || 0} electors/km²` 
        : '';
        
      if (demoData.redelineationHistory && demoData.redelineationHistory.length > 0) {
        redelineationInfo = `<div style="color: #f59e0b; font-size: 0.9em; margin-top: 4px;">✦ Boundary adjusted ${demoData.redelineationHistory.length}x since ${demoData.redelineationHistory[0].year}</div>`;
      }
        
      demographicInfo = `
        <br /><hr style="margin: 4px 0; border-color: #444;" />
        Electorate: ${demoData.totalElectors.toLocaleString()}
        ${densityLine}
        <br />
        Malay: ${demoData.malayPercent}% | Chinese: ${demoData.chinesePercent}% | Indian: ${demoData.indiansPercent}% | Orang Asli: ${demoData.orangAsliPercent || 0}%
        <br />
        Sabah (M/NM): ${demoData.bumiputeraSabahMuslimPercent || 0}% / ${demoData.bumiputeraSabahNonMuslimPercent || 0}%
        <br />
        Sarawak (M/NM): ${demoData.bumiputeraSarawakMuslimPercent || 0}% / ${demoData.bumiputeraSarawakNonMuslimPercent || 0}%
        <br />
        Others: ${demoData.othersPercent}%
        <br />
        Class: ${demoData.urbanRuralClassification2018 || 'Semi-Urban'}
        ${demoData.youngVotersPercent ? `<br />Youth (18-35): ${demoData.youngVotersPercent}%` : ''}
        ${demoData.medianIncome ? `<br />Median Income: RM ${demoData.medianIncome.toLocaleString()}` : ''}
        ${redelineationInfo}
      `;
    }
    
    const ownerInfo = ownerParty
      ? `<br />Seat Held By: ${ownerParty.name}`
      : '';
    
    const dominantInfo = dominantParty 
      ? `<br />Current Influence: ${dominantParty.name}` 
      : '<br />Current Influence: Neutral';

    return `
      <div>
        <strong>${feature.properties.PARLIMEN}</strong>
        ${ownerInfo}
        ${dominantInfo}
        <br />
        Characters: ${count.toLocaleString()}
        ${demographicInfo}
      </div>
    `;
  }, [electionMapConfig, partiesMap, isPositionSelectionMode, isPlayerMoving, player, seatData, demographicsMap, electionResults]);

  // Use refs to avoid stale closures in Leaflet events
  const getStyleRef = useRef(getStyle);
  const isPlayerMovingRef = useRef(isPlayerMoving);
  const isPositionSelectionModeRef = useRef(isPositionSelectionMode);
  const selectedSeatCodeRef = useRef(selectedSeatCode);
  const onSeatClickRef = useRef(onSeatClick);
  const onPositionSelectRef = useRef(onPositionSelect);

  useEffect(() => {
    getStyleRef.current = getStyle;
    isPlayerMovingRef.current = isPlayerMoving;
    isPositionSelectionModeRef.current = isPositionSelectionMode;
    selectedSeatCodeRef.current = selectedSeatCode;
    onSeatClickRef.current = onSeatClick;
    onPositionSelectRef.current = onPositionSelect;
  });

  const onEachFeature = useCallback((feature: GeoJsonFeature, layer: Layer) => {
    const seatCode = feature.properties?.UNIQUECODE;
    if (!seatCode || !feature.properties.PARLIMEN) return;

    // Initial dummy tooltip bind (will be updated by useEffect instantly)
    layer.bindTooltip('', {
        className: 'leaflet-tooltip-custom',
        sticky: true,
        direction: 'auto'
    });

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        if (!isPlayerMovingRef.current && !isPositionSelectionModeRef.current && feature.properties.UNIQUECODE !== selectedSeatCodeRef.current) {
            e.target.setStyle(highlightStyle);
        }
        e.target.bringToFront();
      },
      mouseout: (e: LeafletMouseEvent) => {
         if (!isPlayerMovingRef.current && !isPositionSelectionModeRef.current && feature.properties.UNIQUECODE !== selectedSeatCodeRef.current) {
             e.target.setStyle(getStyleRef.current(feature));
         }
      },
      click: () => {
        if (isPositionSelectionModeRef.current) {
          onPositionSelectRef.current?.(seatCode);
        } else {
          onSeatClickRef.current(seatCode);
        }
      }
    });
  }, []);
  
  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer((layer: any) => {
      const feature = layer.feature as GeoJsonFeature;
      if (feature && feature.properties && feature.properties.UNIQUECODE) {
         layer.setStyle(getStyle(feature));
         const content = getTooltipContent(feature);
         
         const tooltip = layer.getTooltip();
         if (tooltip) {
             layer.setTooltipContent(content);
         }
      }
    });
  }, [getStyle, getTooltipContent]);

  const geoJsonKey = useMemo(() => {
    return `stable-map-${features.length}`;
  }, [features.length]);

  return (
    <div className="h-full w-full absolute top-0 left-0 z-0">
      <MapContainer 
        center={initialPosition} 
        zoom={initialZoom} 
        scrollWheelZoom={true} 
        className="h-full w-full"
        minZoom={2}
        worldCopyJump={true}
        zoomControl={false}
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON 
          key={geoJsonKey}
          ref={geoJsonRef}
          data={features as any} 
          style={getStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
      
      {/* Map Mode Control */}
      <div className="absolute top-24 right-4 z-[1000] bg-gray-800/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-700">
        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Map View</label>
        <select 
          value={mapMode} 
          onChange={(e) => setMapMode(e.target.value as MapMode)}
          className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500 w-full"
        >
          <option value="political">Political Influence</option>
          <option value="population">Total Electors</option>
          <option value="density">Population Density (Electors/km²) {isDensityLoading ? '⏳' : ''}</option>
          <option value="malay">Malay Population %</option>
          <option value="chinese">Chinese Population %</option>
          <option value="indian">Indian Population %</option>
          <option value="others">Others Population %</option>
          <option value="classification">Development Classification</option>
          <option value="income">Median Income Avg</option>
          <option value="youth">Young Voters (18-35) %</option>
        </select>
        
        {/* Legend for current mode */}
        <div className="mt-2 text-xs text-gray-300">
          {mapMode === 'political' && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-500"></span>
              <span>Party Colors</span>
            </div>
          )}
          {mapMode === 'density' && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="font-bold mb-1">Electors/km²</div>
              {[4500, 2500, 1000, 500, 250, 100, 50, 10, 0].map(val => (
                <div key={val} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: densityToColor(val) }}></span>
                  <span>{val === 0 ? '0-10' : `${val}+`}</span>
                </div>
              ))}
            </div>
          )}
          {mapMode === 'classification' && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#1f77b4]"></span><span>Urban</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#ff7f0e]"></span><span>Semi-Urban</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#2ca02c]"></span><span>Rural</span></div>
            </div>
          )}
          {mapMode === 'income' && (
            <div className="flex items-center justify-between">
              <span>Low</span>
              <div className="h-2 w-16 bg-gradient-to-r from-[rgb(255,235,180)] to-[rgb(0,100,0)] rounded mx-2"></div>
              <span>High</span>
            </div>
          )}
          {mapMode === 'youth' && (
            <div className="flex items-center justify-between">
              <span>Low</span>
              <div className="h-2 w-16 bg-gradient-to-r from-[rgb(240,240,255)] to-[rgb(106,13,173)] rounded mx-2"></div>
              <span>High</span>
            </div>
          )}
          {mapMode === 'population' && (
            <div className="flex items-center justify-between">
              <span>Low</span>
              <div className="h-2 w-16 bg-gradient-to-r from-[rgb(200,230,255)] to-[rgb(0,50,150)] rounded mx-2"></div>
              <span>High</span>
            </div>
          )}
          {mapMode === 'malay' && (
            <div className="flex items-center justify-between">
              <span>0%</span>
              <div className="h-2 w-16 bg-gradient-to-r from-[rgb(240,255,240)] to-[rgb(0,100,0)] rounded mx-2"></div>
              <span>100%</span>
            </div>
          )}
          {mapMode === 'chinese' && (
            <div className="flex items-center justify-between">
              <span>0%</span>
              <div className="h-2 w-16 bg-gradient-to-r from-[rgb(255,240,240)] to-[rgb(150,0,0)] rounded mx-2"></div>
              <span>100%</span>
            </div>
          )}
          {mapMode === 'indian' && (
            <div className="flex items-center justify-between">
              <span>0%</span>
              <div className="h-2 w-16 bg-gradient-to-r from-[rgb(255,245,230)] to-[rgb(200,100,0)] rounded mx-2"></div>
              <span>100%</span>
            </div>
          )}
          {mapMode === 'others' && (
            <div className="flex items-center justify-between">
              <span>0%</span>
              <div className="h-2 w-16 bg-gradient-to-r from-[rgb(245,245,245)] to-[rgb(50,50,50)] rounded mx-2"></div>
              <span>100%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
