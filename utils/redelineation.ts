import { Demographics, GeoJsonGeometry } from '../types';
import { RasterData, sampleRasterAtPoint } from './populationRaster';

/**
 * Helper to determine which specific field name in Demographics represents
 * the chosen ethnic category.
 */
function getEthnicFieldName(seat: Demographics, ethnicGroup: 'malay' | 'chinese' | 'indian' | 'other'): string {
  if (ethnicGroup === 'malay') return 'malayPercent';
  if (ethnicGroup === 'chinese') return 'chinesePercent';
  if (ethnicGroup === 'indian') return 'indiansPercent';

  // For 'other', dynamically find the sub-field under Others / Bumiputera Sabah or Sarawak
  // that currently has the maximum value in this seat to match real demographics.
  const otherFields = [
    'bumiputeraSabahMuslimPercent',
    'bumiputeraSabahNonMuslimPercent',
    'bumiputeraSarawakMuslimPercent',
    'bumiputeraSarawakNonMuslimPercent',
    'orangAsliPercent',
    'othersPercent'
  ];
  let maxField = 'othersPercent';
  let maxVal = -1;
  for (const f of otherFields) {
    const val = (seat[f] as number) || 0;
    if (val > maxVal) {
      maxVal = val;
      maxField = f;
    }
  }
  return maxField;
}

/**
 * Dominant ethnic group: whichever of malay, chinese, indian, other has the highest count.
 */
export function dominantEthnic(seat: Demographics): 'malay' | 'chinese' | 'indian' | 'other' {
  const malay = seat.malayPercent || 0;
  const chinese = seat.chinesePercent || 0;
  const indian = seat.indiansPercent || 0;
  const other = 100 - (malay + chinese + indian);

  const max = Math.max(malay, chinese, indian, other);
  if (max === malay) return 'malay';
  if (max === chinese) return 'chinese';
  if (max === indian) return 'indian';
  return 'other';
}

/**
 * STEP 1 - NEIGHBOR GRAPH GENERATION
 * Generates a shared-border adjacency list.
 * Polygons which touch share at least 2 coordinate nodes (vertices).
 */
export function generateNeighborGraph(geojsonData: any[]): Record<string, string[]> {
  const neighbors: Record<string, string[]> = {};

  const getPoints = (geometry: any): string[] => {
    const points: string[] = [];
    if (!geometry) return points;

    const coords = geometry.coordinates;
    const type = geometry.type;

    const processPolygon = (polygon: any[][]) => {
      for (const ring of polygon) {
        for (const pt of ring) {
          const lng = pt[0];
          const lat = pt[1];
          points.push(`${lng.toFixed(5)},${lat.toFixed(5)}`);
        }
      }
    };

    if (type === 'Polygon') {
      processPolygon(coords);
    } else if (type === 'MultiPolygon') {
      for (const polygon of coords) {
        processPolygon(polygon);
      }
    }
    return points;
  };

  const featurePoints: Record<string, Set<string>> = {};

  for (const feature of geojsonData) {
    const code = feature.properties.UNIQUECODE || feature.properties.uniqueCode || '';
    if (!code) continue;
    const pts = getPoints(feature.geometry);
    featurePoints[code] = new Set(pts);
  }

  const codes = Object.keys(featurePoints);
  for (let i = 0; i < codes.length; i++) {
    const c1 = codes[i];
    neighbors[c1] = neighbors[c1] || [];

    for (let j = i + 1; j < codes.length; j++) {
      const c2 = codes[j];
      neighbors[c2] = neighbors[c2] || [];

      let sharedCount = 0;
      const set1 = featurePoints[c1];
      const set2 = featurePoints[c2];

      for (const pt of set1) {
        if (set2.has(pt)) {
          sharedCount++;
        }
      }

      if (sharedCount >= 2) {
        neighbors[c1].push(c2);
        neighbors[c2].push(c1);
      }
    }
  }

  for (const code of Object.keys(neighbors)) {
    neighbors[code] = Array.from(new Set(neighbors[code])).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }

  return neighbors;
}

// Global variable representing the neighbor graph
export let constituencyNeighbors: Record<string, string[]> = {};

/**
 * Initializes the global constituencyNeighbors map once at game start.
 */
export function initializeNeighbors(geojsonData: any[]) {
  constituencyNeighbors = generateNeighborGraph(geojsonData);
}

function computeCentroid(geom: GeoJsonGeometry): [number, number] {
  const rings = geom.type === 'Polygon'
    ? geom.coordinates
    : geom.coordinates.flat(1)
  let sumX = 0, sumY = 0, count = 0
  for (const ring of rings) {
    for (const pt of ring) {
      sumX += pt[0]; sumY += pt[1]; count++
    }
  }
  return [sumX / count, sumY / count]
}

function extractOrderedSharedEdge(
  geomA: GeoJsonGeometry,
  geomB: GeoJsonGeometry,
  tolerance: number = 0.0001
): Array<[number, number]> {
  // Collect all vertices from A that appear in B
  const flatCoords = (geom: GeoJsonGeometry): Array<[number, number]> => {
    const out: Array<[number, number]> = []
    const rings = geom.type === 'Polygon'
      ? geom.coordinates
      : geom.coordinates.flat(1)
    for (const ring of rings) {
      for (const pt of ring) out.push([pt[0], pt[1]])
    }
    return out
  }

  const ptsA = flatCoords(geomA)
  const ptsB = flatCoords(geomB)

  const shared = ptsA.filter(a =>
    ptsB.some(b =>
      Math.abs(a[0] - b[0]) < tolerance &&
      Math.abs(a[1] - b[1]) < tolerance
    )
  )

  if (shared.length < 2) return shared

  // Order shared vertices by walking geomA's ring in sequence
  // This preserves the natural order of the border as it exists in the polygon
  const rings = geomA.type === 'Polygon'
    ? geomA.coordinates
    : geomA.coordinates.flat(1)

  const ordered: Array<[number, number]> = []
  const sharedSet = new Set(shared.map(s => `${s[0].toFixed(6)},${s[1].toFixed(6)}`))

  for (const ring of rings) {
    for (const pt of ring) {
      const key = `${pt[0].toFixed(6)},${pt[1].toFixed(6)}`
      if (sharedSet.has(key)) {
        ordered.push([pt[0], pt[1]])
      }
    }
  }

  // Deduplicate consecutive duplicates from ring traversal
  return ordered.filter((pt, i) =>
    i === 0 ||
    Math.abs(pt[0] - ordered[i-1][0]) > 1e-9 ||
    Math.abs(pt[1] - ordered[i-1][1]) > 1e-9
  )
}

function sampleDensityAlongEdge(
  vertices: Array<[number, number]>,
  raster: RasterData,
  sampleRadius: number = 0.02  // ~2km sampling radius in degrees
): number[] {
  const rawDensities = vertices.map(([lng, lat]) => {
    // Sample a small grid around each vertex to get local density
    let total = 0
    let count = 0
    const steps = 3
    for (let di = -steps; di <= steps; di++) {
      for (let dj = -steps; dj <= steps; dj++) {
        const sLng = lng + (di / steps) * sampleRadius
        const sLat = lat + (dj / steps) * sampleRadius
        const val = sampleRasterAtPoint(raster, sLng, sLat)
        if (val > 0) { total += val; count++ }
      }
    }
    return count > 0 ? total / count : 0
  })

  // Normalize: high density → low movement weight
  const maxD = Math.max(...rawDensities, 1)
  return rawDensities.map(d => {
    // Logarithmic inverse: dense areas barely move, sparse areas move fully
    const logD = Math.log1p(d) / Math.log1p(maxD)  // 0..1
    return Math.max(0, 1 - logD)  // invert: 1=sparse=moves, 0=dense=stays
  })
}

function smoothWeights(weights: number[], passes: number = 3): number[] {
  let w = [...weights]
  for (let p = 0; p < passes; p++) {
    const smoothed = [...w]
    for (let i = 1; i < w.length - 1; i++) {
      // Weighted average: center gets 50%, neighbors get 25% each
      smoothed[i] = w[i - 1] * 0.25 + w[i] * 0.50 + w[i + 1] * 0.25
    }
    // Endpoints stay anchored at 0
    smoothed[0] = 0
    smoothed[w.length - 1] = 0
    w = smoothed
  }
  return w
}

function computeVertexNormals(
  ordered: Array<[number, number]>,
  donorGeom: GeoJsonGeometry
): Array<{ x: number; y: number }> {
  const donorCentroid = computeCentroid(donorGeom)

  return ordered.map((pt, i) => {
    const prev = ordered[i - 1] ?? pt
    const next = ordered[i + 1] ?? pt

    // Tangent vector using central difference
    const tx = next[0] - prev[0]
    const ty = next[1] - prev[1]
    const tLen = Math.sqrt(tx * tx + ty * ty) || 1

    // Two candidate normals (perpendicular to tangent)
    const n1 = { x: -ty / tLen, y: tx / tLen }
    const n2 = { x: ty / tLen, y: -tx / tLen }

    // Pick the one pointing toward donor centroid (inward)
    const toCentroid = {
      x: donorCentroid[0] - pt[0],
      y: donorCentroid[1] - pt[1]
    }
    const dot1 = n1.x * toCentroid.x + n1.y * toCentroid.y
    return dot1 >= 0 ? n1 : n2
  })
}

function applyDisplacementsAtomically(
  geomA: GeoJsonGeometry,
  geomB: GeoJsonGeometry,
  ordered: Array<[number, number]>,
  displacements: Array<{ dx: number; dy: number }>,
  tolerance: number = 0.0001
): void {
  // Build lookup: original coordinate string → new coordinate
  const moveMap = new Map<string, [number, number]>()
  ordered.forEach((pt, i) => {
    const key = `${pt[0].toFixed(6)},${pt[1].toFixed(6)}`
    moveMap.set(key, [
      pt[0] + displacements[i].dx,
      pt[1] + displacements[i].dy
    ])
  })

  const applyToGeom = (geom: GeoJsonGeometry) => {
    const rings = geom.type === 'Polygon'
      ? geom.coordinates
      : geom.coordinates.flat(1)
    for (const ring of rings) {
      for (const pt of ring) {
        const key = `${pt[0].toFixed(6)},${pt[1].toFixed(6)}`
        const newPos = moveMap.get(key)
        if (newPos) {
          pt[0] = newPos[0]
          pt[1] = newPos[1]
        }
      }
    }
  }

  // Apply identically to both — same moveMap guarantees no gap
  applyToGeom(geomA)
  applyToGeom(geomB)
}

export async function displaceConstituencyBorder(
  fromSeat: Demographics,
  toSeat: Demographics,
  votersMovedPercent: number,
  raster: RasterData | null
): Promise<{ shiftMagnitudeDegrees: number, direction: { x: number; y: number }, sharedVertexCount: number } | null> {
  const fromGeom = fromSeat.currentGeometry
  const toGeom = toSeat.currentGeometry
  if (!fromGeom || !toGeom) return null

  // Step A: Extract ordered shared edge
  const ordered = extractOrderedSharedEdge(fromGeom, toGeom)
  if (ordered.length < 2) return null

  // Step B: Base displacement magnitude
  const MAX_SHIFT = 0.45
  const baseMagnitude = Math.min(votersMovedPercent * MAX_SHIFT, MAX_SHIFT)

  // Step C: Get per-vertex density weights
  // If no raster available, fall back to uniform sine falloff
  let weights: number[]
  if (raster) {
    const rawWeights = sampleDensityAlongEdge(ordered, raster)
    weights = smoothWeights(rawWeights, 3)
    // Enforce zero at endpoints regardless of density
    weights[0] = 0
    weights[weights.length - 1] = 0
  } else {
    // Fallback: pure sine bell curve
    weights = ordered.map((_, i) => {
      const t = i / (ordered.length - 1)
      return Math.sin(t * Math.PI)
    })
  }

  // Step D: Compute per-vertex inward normals
  const normals = computeVertexNormals(ordered, fromGeom)

  // Step E: Clamp each displacement to 80% of shortest adjacent segment
  // to prevent any vertex from jumping past its immediate neighbor
  const displacements = ordered.map((pt, i) => {
    const weight = weights[i]
    const normal = normals[i]

    const segLenPrev = i > 0
      ? Math.sqrt((pt[0]-ordered[i-1][0])**2 + (pt[1]-ordered[i-1][1])**2)
      : Infinity
    const segLenNext = i < ordered.length - 1
      ? Math.sqrt((ordered[i+1][0]-pt[0])**2 + (ordered[i+1][1]-pt[1])**2)
      : Infinity
    const maxLocal = Math.min(segLenPrev, segLenNext) * 0.8

    const magnitude = Math.min(baseMagnitude * weight, maxLocal)

    return {
      dx: normal.x * magnitude,
      dy: normal.y * magnitude
    }
  })

  // Step F: Apply atomically to both geometries
  applyDisplacementsAtomically(fromGeom, toGeom, ordered, displacements)

  // Return metadata
  const fromCentroid = computeCentroid(fromGeom)
  const toCentroid = computeCentroid(toGeom)
  const dx = toCentroid[0] - fromCentroid[0]
  const dy = toCentroid[1] - fromCentroid[1]
  const len = Math.sqrt(dx*dx + dy*dy) || 1

  return {
    shiftMagnitudeDegrees: baseMagnitude,
    direction: { x: dx/len, y: dy/len },
    sharedVertexCount: ordered.length
  }
}

/**
 * STEP 2 - VOTER TRANSFER FUNCTION
 * Moves a percentage of a specific ethnic group's voters from one constituency to a neighbor.
 * Handles exact voter math and recalibrates ethnic percentages.
 */
export async function redistributeVoters(
  fromCode: string,
  toCode: string,
  ethnicGroup: 'malay' | 'chinese' | 'indian' | 'other',
  percentage: number,
  demographicsMap: Map<string, Demographics>,
  year: number,
  strategy: 'CRACKING' | 'PACKING' | 'APPORTIONMENT',
  description: string,
  raster: RasterData | null = null
): Promise<{ success: boolean; votersMoved?: number; ethnicFieldName?: string; votersBeforeFrom?: number; votersAfterFrom?: number }> {
  const fromSeat = demographicsMap.get(fromCode);
  const toSeat = demographicsMap.get(toCode);
  if (!fromSeat || !toSeat) return { success: false };

  // Determine exact field targeting
  const fieldName = getEthnicFieldName(fromSeat, ethnicGroup);

  const fromPercent = (fromSeat[fieldName] as number) || 0;
  const fromTotalElectors = fromSeat.totalElectors || 0;
  const targetGroupVoters = fromTotalElectors * (fromPercent / 100);

  // voters to move = total of that ethnicity * percentage / 100
  let votersToMove = Math.round(targetGroupVoters * (percentage / 100));

  // Ensure we only move positive numbers and do not reduce the donor seat below 14000 electors
  // and do not increase the recipient seat above 35000 electors
  let maxAllowableToMove = Math.min(Math.round(targetGroupVoters), fromTotalElectors - 14000);
  
  const toTotalElectors = toSeat.totalElectors || 0;
  if (toTotalElectors + votersToMove > 35000) {
      const maxToMoveForCapacity = 35000 - toTotalElectors;
      maxAllowableToMove = Math.min(maxAllowableToMove, maxToMoveForCapacity);
  }

  if (votersToMove > maxAllowableToMove) {
    votersToMove = maxAllowableToMove;
  }

  if (votersToMove <= 0) return { success: false };

  // STEP 7 - PERSISTENCE & BASELINE RECORDING
  if (!fromSeat.baselineVoters) {
    fromSeat.baselineVoters = {
      totalElectors: fromSeat.totalElectors,
      malayPercent: fromSeat.malayPercent,
      chinesePercent: fromSeat.chinesePercent,
      indiansPercent: fromSeat.indiansPercent,
      bumiputeraSabahMuslimPercent: fromSeat.bumiputeraSabahMuslimPercent,
      bumiputeraSabahNonMuslimPercent: fromSeat.bumiputeraSabahNonMuslimPercent,
      bumiputeraSarawakMuslimPercent: fromSeat.bumiputeraSarawakMuslimPercent,
      bumiputeraSarawakNonMuslimPercent: fromSeat.bumiputeraSarawakNonMuslimPercent,
      orangAsliPercent: fromSeat.orangAsliPercent,
      othersPercent: fromSeat.othersPercent,
    };
  }
  if (!toSeat.baselineVoters) {
    toSeat.baselineVoters = {
      totalElectors: toSeat.totalElectors,
      malayPercent: toSeat.malayPercent,
      chinesePercent: toSeat.chinesePercent,
      indiansPercent: toSeat.indiansPercent,
      bumiputeraSabahMuslimPercent: toSeat.bumiputeraSabahMuslimPercent,
      bumiputeraSabahNonMuslimPercent: toSeat.bumiputeraSabahNonMuslimPercent,
      bumiputeraSarawakMuslimPercent: toSeat.bumiputeraSarawakMuslimPercent,
      bumiputeraSarawakNonMuslimPercent: toSeat.bumiputeraSarawakNonMuslimPercent,
      orangAsliPercent: toSeat.orangAsliPercent,
      othersPercent: toSeat.othersPercent,
    };
  }

  const fieldsToRecalculate = [
    'malayPercent',
    'chinesePercent',
    'indiansPercent',
    'bumiputeraSabahMuslimPercent',
    'bumiputeraSabahNonMuslimPercent',
    'bumiputeraSarawakMuslimPercent',
    'bumiputeraSarawakNonMuslimPercent',
    'orangAsliPercent',
    'othersPercent',
  ];

  const applyTransfer = (seat: Demographics, sign: 1 | -1) => {
    const originalE = seat.totalElectors;
    const newE = originalE + sign * votersToMove;

    const absCounts: Record<string, number> = {};
    for (const f of fieldsToRecalculate) {
      const pct = (seat[f] as number) || 0;
      absCounts[f] = originalE * (pct / 100);
    }

    absCounts[fieldName] = Math.max(0, absCounts[fieldName] + sign * votersToMove);

    seat.totalElectors = newE;
    for (const f of fieldsToRecalculate) {
      seat[f] = Math.round((absCounts[f] / newE) * 10000) / 100;
    }
  };

  const oldFromE = fromSeat.totalElectors;
  const oldToE = toSeat.totalElectors;

  applyTransfer(fromSeat, -1);
  applyTransfer(toSeat, 1);

  // STEP 5 - HOOK INTO redistributeVoters() & BORDER DISPLACEMENT
  const votersMovedPercent = votersToMove / fromTotalElectors;
  const geomSnap = await displaceConstituencyBorder(fromSeat, toSeat, votersMovedPercent, raster);

  fromSeat.redelineationHistory = fromSeat.redelineationHistory || [];
  toSeat.redelineationHistory = toSeat.redelineationHistory || [];

  fromSeat.redelineationHistory.push({
    year,
    strategy,
    votersBefore: oldFromE,
    votersAfter: fromSeat.totalElectors,
    ethnicShift: `-${votersToMove.toLocaleString()} (${ethnicGroup})`,
    fromCode,
    toCode,
    description: `Transferred ${votersToMove.toLocaleString()} ${ethnicGroup} voters to ${toSeat.parliamentaryConstituencyName} (${description})`,
    ...(geomSnap ? { geometrySnapshot: geomSnap } : {})
  });

  toSeat.redelineationHistory.push({
    year,
    strategy,
    votersBefore: oldToE,
    votersAfter: toSeat.totalElectors,
    ethnicShift: `+${votersToMove.toLocaleString()} (${ethnicGroup})`,
    fromCode,
    toCode,
    description: `Received ${votersToMove.toLocaleString()} ${ethnicGroup} voters from ${fromSeat.parliamentaryConstituencyName} (${description})`,
    ...(geomSnap ? { geometrySnapshot: geomSnap } : {})
  });

  return { success: true, votersMoved: votersToMove, ethnicFieldName: fieldName, votersBeforeFrom: oldFromE, votersAfterFrom: fromSeat.totalElectors };
}

export interface RedelineationAction {
  strategy: 'CRACKING' | 'PACKING' | 'APPORTIONMENT';
  state: string;
  fromCode: string;
  toCode: string;
  votersMoved: number;
  ethnicGroup: string;
  details: string;
  votersBeforeFrom: number;
  votersAfterFrom: number;
}

function getNeighborsWithinMaxHops(startCode: string, maxHops: number): string[] {
  const visited = new Set<string>();
  let currentFrontier = [startCode];
  visited.add(startCode);

  for (let hop = 0; hop < maxHops; hop++) {
    const nextFrontier: string[] = [];
    for (const code of currentFrontier) {
      const nbs = constituencyNeighbors[code] || [];
      for (const n of nbs) {
        if (!visited.has(n)) {
          visited.add(n);
          nextFrontier.push(n);
        }
      }
    }
    currentFrontier = nextFrontier;
  }

  visited.delete(startCode);
  return Array.from(visited);
}

/**
 * STEP 3 - AI GERRYMANDERING LOGIC
 * Runs Cracking on opposition seats with wide victory margins.
 * Runs Packing to secure marginal ruling party seats from safe ruling party neighbors.
 */
export async function aiGerrymanderState(
  stateName: string,
  rulingPartyIds: Set<string>,
  demographicsMap: Map<string, Demographics>,
  results: Map<string, string>, // seatCode -> partyId
  year: number,
  detailedResults: Map<string, Map<string, number>>,
  raster: RasterData | null = null
): Promise<RedelineationAction[]> {
  const actions: RedelineationAction[] = [];

  const upperState = stateName.toUpperCase();
  // Federal Territories are fully exempt from boundaries shifts
  if (
    upperState === 'WILAYAH PERSEKUTUAN' ||
    upperState === 'KUALA LUMPUR' ||
    upperState === 'LABUAN' ||
    upperState === 'PUTRAJAYA' ||
    upperState === 'FEDERAL TERRITORY' ||
    upperState === 'FEDERAL TERRITORIES'
  ) {
    return [];
  }

  const stateSeats = Array.from(demographicsMap.values()).filter(seat => {
    const s = (seat.state || '').toUpperCase();
    return s === upperState;
  });

  const seatMargins = new Map<string, number>();
  const seatWinners = new Map<string, string>();

  stateSeats.forEach(seat => {
    const code = seat.uniqueCode;
    const winnerId = results.get(code);
    if (!winnerId) return;

    seatWinners.set(code, winnerId);

    const seatVotes = detailedResults.get(code);
    if (!seatVotes || seatVotes.size === 0) {
      seatMargins.set(code, 0);
      return;
    }

    const sortedVotes = Array.from(seatVotes.entries()).sort((a, b) => b[1] - a[1]);
    const totalVotes = sortedVotes.reduce((sum, entry) => sum + entry[1], 0);
    const winnerVotes = sortedVotes[0][1];
    const runnerUpVotes = sortedVotes.length > 1 ? sortedVotes[1][1] : 0;

    const margin = totalVotes > 0 ? (winnerVotes - runnerUpVotes) / totalVotes : 0;
    seatMargins.set(code, margin);
  });

  for (const seat of stateSeats) {
    const code = seat.uniqueCode;
    const winnerId = seatWinners.get(code);
    if (!winnerId) continue;

    const isRuling = rulingPartyIds.has(winnerId);
    const margin = seatMargins.get(code) || 0;
    const neighbors = getNeighborsWithinMaxHops(code, 2);

    if (seat.totalElectors > 35000) {
      // --- APPORTIONMENT ---
      // Distribute excess voters to neighboring seats that are under capacity
      const availableNeighbors = neighbors.filter(nCode => {
        const nSeat = demographicsMap.get(nCode);
        return nSeat && nSeat.totalElectors < 35000;
      });

      if (availableNeighbors.length > 0) {
        const domEthnic = dominantEthnic(seat);
        const excess = seat.totalElectors - 35000;
        const targetPercent = (excess / seat.totalElectors) * 100;
        const splitPct = targetPercent / availableNeighbors.length;

        for (const nCode of availableNeighbors) {
          const neighborSeat = demographicsMap.get(nCode);
          if (!neighborSeat) continue;

          const res = await redistributeVoters(
            code,
            nCode,
            domEthnic,
            splitPct,
            demographicsMap,
            year,
            'APPORTIONMENT',
            `breaking up oversized constituency`,
            raster
          );

          if (res.success && res.votersMoved) {
            const destName = neighborSeat.parliamentaryConstituencyName || nCode;
            actions.push({
              strategy: 'APPORTIONMENT',
              state: stateName,
              fromCode: code,
              toCode: nCode,
              votersMoved: res.votersMoved,
              ethnicGroup: domEthnic,
              details: `Apportionment: Redistributed ${res.votersMoved.toLocaleString()} ${domEthnic} voters from oversized constituency ${seat.parliamentaryConstituencyName} to ${destName}.`,
              votersBeforeFrom: res.votersBeforeFrom ?? 0,
              votersAfterFrom: res.votersAfterFrom ?? 0
            });
          }
        }
      }
    } else if (!isRuling && margin > 0.15) {
      // --- CRACKING ---
      // Distribute 8% of dominant ethnic group to neighboring ruling seats
      const rulingNeighbors = neighbors.filter(nCode => {
        const nWinner = seatWinners.get(nCode);
        return nWinner && rulingPartyIds.has(nWinner);
      });

      if (rulingNeighbors.length > 0) {
        const domEthnic = dominantEthnic(seat);
        const splitPct = 48 / rulingNeighbors.length;

        for (const nCode of rulingNeighbors) {
          const res = await redistributeVoters(
            code,
            nCode,
            domEthnic,
            splitPct,
            demographicsMap,
            year,
            'CRACKING',
            `gerrymandering cracking of opposition margin ${Math.round(margin * 100)}%`,
            raster
          );
          if (res.success && res.votersMoved) {
            const destName = demographicsMap.get(nCode)?.parliamentaryConstituencyName || nCode;
            actions.push({
              strategy: 'CRACKING',
              state: stateName,
              fromCode: code,
              toCode: nCode,
              votersMoved: res.votersMoved,
              ethnicGroup: domEthnic,
              details: `Gerrymander Cracking: Shited ${res.votersMoved.toLocaleString()} ${domEthnic} voters from opposition stronghold ${seat.parliamentaryConstituencyName} into ruling seat ${destName}.`,
              votersBeforeFrom: res.votersBeforeFrom ?? 0,
              votersAfterFrom: res.votersAfterFrom ?? 0
            });
          }
        }
      }
    } else if (isRuling && margin < 0.05) {
      // --- PACKING ---
      // Pull 5% of dominant ethnic group from neighboring safe ruling seats (margin > 20%)
      const safeRulingNeighbors = neighbors.filter(nCode => {
        const nWinner = seatWinners.get(nCode);
        const nMargin = seatMargins.get(nCode) || 0;
        return nWinner && rulingPartyIds.has(nWinner) && nMargin > 0.20;
      });

      for (const nCode of safeRulingNeighbors) {
        const neighborSeat = demographicsMap.get(nCode);
        if (!neighborSeat) continue;

        const neighborDomEthnic = dominantEthnic(neighborSeat);
        const res = await redistributeVoters(
          nCode,
          code,
          neighborDomEthnic,
          5,
          demographicsMap,
          year,
          'PACKING',
          `securing marginal ruling seat with packing`,
          raster
        );

        if (res.success && res.votersMoved) {
          actions.push({
            strategy: 'PACKING',
            state: stateName,
            fromCode: nCode,
            toCode: code,
            votersMoved: res.votersMoved,
            ethnicGroup: neighborDomEthnic,
            details: `Gerrymander Packing: Transferred ${res.votersMoved.toLocaleString()} ${neighborDomEthnic} voters from safe ruling seat ${neighborSeat.parliamentaryConstituencyName} into marginal seat ${seat.parliamentaryConstituencyName}.`,
            votersBeforeFrom: res.votersBeforeFrom ?? 0,
            votersAfterFrom: res.votersAfterFrom ?? 0
          });
        }
      }
    }
  }

  return actions;
}

/**
 * STEP 4 - MALAPPORTIONMENT SCORE / DEMOCRACY INDEX
 * Computes ratio of largest total electors to smallest total electors across all seats.
 */
export function malapportionmentScore(constituencies: Demographics[]): number {
  if (constituencies.length === 0) return 1.0;
  let maxVoters = -Infinity;
  let minVoters = Infinity;

  for (const c of constituencies) {
    const voters = c.totalElectors || 0;
    if (voters > 0) {
      if (voters > maxVoters) maxVoters = voters;
      if (voters < minVoters) minVoters = voters;
    }
  }

  if (minVoters === 0 || minVoters === Infinity) return 1.0;
  const ratio = maxVoters / minVoters;
  // Cap score at 10.0 for scaling/display
  return Math.min(10.0, ratio);
}

export function computePolygonAreaDegrees(geom: GeoJsonGeometry): number {
  // Shoelace formula on the outer ring only
  const ring = geom.type === 'Polygon'
    ? geom.coordinates[0]
    : geom.coordinates[0][0]  // first polygon, outer ring

  if (!ring || ring.length < 3) return 1
  let area = 0
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1]
    area -= ring[i + 1][0] * ring[i][1]
  }
  return Math.abs(area / 2)
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = a.replace('#', '')
  const bh = b.replace('#', '')
  const ar = parseInt(ah.slice(0,2), 16)
  const ag = parseInt(ah.slice(2,4), 16)
  const ab = parseInt(ah.slice(4,6), 16)
  const br = parseInt(bh.slice(0,2), 16)
  const bg = parseInt(bh.slice(2,4), 16)
  const bb = parseInt(bh.slice(4,6), 16)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const b2 = Math.round(ab + (bb - ab) * t)
  return `rgb(${r},${g},${b2})`
}

export function densityToColor(density: number): string {
  // density = electors per unit area (degree²)
  // Log scale breakpoints matching reference heatmap
  const stops: Array<[number, string]> = [
    [0,     '#f7f4e9'],  // cream — empty
    [10,    '#fde8c8'],  // pale orange
    [50,    '#f5a968'],  // orange
    [100,   '#e8692a'],  // deep orange
    [250,   '#c0392b'],  // red
    [500,   '#8b0000'],  // dark red
    [1000,  '#6a0572'],  // dark purple
    [2500,  '#4a0080'],  // deep purple
    [4500,  '#2d004f'],  // near black purple
  ]

  if (density <= 0) return stops[0][1]

  for (let i = stops.length - 1; i >= 0; i--) {
    if (density >= stops[i][0]) {
      if (i === stops.length - 1) return stops[i][1]
      // Lerp between this stop and the next
      const t = (density - stops[i][0]) / (stops[i + 1][0] - stops[i][0])
      return lerpColor(stops[i][1], stops[i + 1][1], Math.min(t, 1))
    }
  }
  return stops[0][1]
}


