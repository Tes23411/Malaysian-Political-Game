import { fromArrayBuffer, GeoTIFF, TypedArray } from 'geotiff';
import { GeoJsonGeometry, Demographics } from '../types';
import { computePolygonAreaDegrees } from './redelineation';

export interface RasterData {
  data: TypedArray;
  width: number;
  height: number;
  bbox: [number, number, number, number];  // [west, south, east, north]
}

let cachedRaster: RasterData | null = null;

export async function loadPopulationRaster(): Promise<RasterData> {
  if (cachedRaster) return cachedRaster;

  const response = await fetch('./data/mys_population.tif');
  const arrayBuffer = await response.arrayBuffer();
  const tiff: GeoTIFF = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const bbox = image.getBoundingBox() as [number, number, number, number];
  const width = image.getWidth();
  const height = image.getHeight();
  const rasters = await image.readRasters();
  const data = rasters[0] as TypedArray;

  cachedRaster = { data, width, height, bbox };
  return cachedRaster;
}

export function sampleRasterAtPoint(
  raster: RasterData,
  lng: number,
  lat: number
): number {
  const [west, south, east, north] = raster.bbox;
  if (lng < west || lng > east || lat < south || lat > north) return 0;

  const col = Math.floor((lng - west) / (east - west) * raster.width);
  const row = Math.floor((north - lat) / (north - south) * raster.height);

  const clampedCol = Math.max(0, Math.min(col, raster.width - 1));
  const clampedRow = Math.max(0, Math.min(row, raster.height - 1));

  const val = raster.data[clampedRow * raster.width + clampedCol];
  return (val < 0 || isNaN(val as number)) ? 0 : (val as number);
}

export function sampleConstituencyPopulation(
  geom: GeoJsonGeometry,
  raster: RasterData,
  gridResolution: number = 20  // NxN grid of sample points
): number {
  // Get bounding box of the constituency
  const rings = geom.type === 'Polygon'
    ? geom.coordinates
    : geom.coordinates.flat(1);

  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  for (const ring of rings) {
    for (const pt of ring) {
      if (pt[0] < minLng) minLng = pt[0];
      if (pt[0] > maxLng) maxLng = pt[0];
      if (pt[1] < minLat) minLat = pt[1];
      if (pt[1] > maxLat) maxLat = pt[1];
    }
  }

  let total = 0;
  const outerRing = rings[0];

  for (let i = 0; i < gridResolution; i++) {
    for (let j = 0; j < gridResolution; j++) {
      const lng = minLng + (i + 0.5) / gridResolution * (maxLng - minLng);
      const lat = minLat + (j + 0.5) / gridResolution * (maxLat - minLat);

      if (pointInPolygon([lng, lat], outerRing)) {
        total += sampleRasterAtPoint(raster, lng, lat);
      }
    }
  }

  return total;
}

// Ray-casting point-in-polygon
function pointInPolygon(point: [number, number], ring: number[][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export async function buildWorldPopDensityMap(
  demographicsMap: Map<string, Demographics>
): Promise<Map<string, number>> {
  const raster = await loadPopulationRaster();
  const densityMap = new Map<string, number>();

  for (const [code, seat] of demographicsMap.entries()) {
    const geom = seat.currentGeometry;
    if (!geom) continue;

    const totalPop = sampleConstituencyPopulation(geom, raster);

    // Store raw population count — divide by area for true density
    const area = computePolygonAreaDegrees(geom) * 111 * 97;
    const density = area > 0 ? totalPop / area : 0;

    // Also store on the seat itself for tooltip access
    seat.worldPopDensity = density;
    densityMap.set(code, density);
  }

  return densityMap;
}
