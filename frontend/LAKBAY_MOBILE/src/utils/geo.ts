import type { LngLat } from '../constants/mapConfig';
import { ZAMBOANGA_BBOX } from '../constants/mapConfig';

export interface VisibleBounds {
  ne: GeoJSON.Position;
  sw: GeoJSON.Position;
}

export function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideBounds([lng, lat]: LngLat, bounds: VisibleBounds): boolean {
  const minLng = Math.min(bounds.ne[0], bounds.sw[0]);
  const maxLng = Math.max(bounds.ne[0], bounds.sw[0]);
  const minLat = Math.min(bounds.ne[1], bounds.sw[1]);
  const maxLat = Math.max(bounds.ne[1], bounds.sw[1]);
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

export function isInsideZamboanga([lng, lat]: LngLat): boolean {
  const [minLng, minLat, maxLng, maxLat] = ZAMBOANGA_BBOX;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

function pointInRing([x, y]: LngLat, ring: GeoJSON.Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(point: LngLat, rings: GeoJSON.Position[][]): boolean {
  if (!rings.length || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(point, hole));
}

export function pointInPolygon(point: LngLat, geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): boolean {
  if (geometry.type === 'Polygon') return pointInPolygonRings(point, geometry.coordinates);
  return geometry.coordinates.some((rings) => pointInPolygonRings(point, rings));
}

// Area-weighted centroid of the largest ring; good enough for label placement.
export function polygonLabelPoint(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): LngLat {
  const outerRings =
    geometry.type === 'Polygon'
      ? [geometry.coordinates[0]]
      : geometry.coordinates.map((rings) => rings[0]);

  let best: LngLat = [outerRings[0][0][0], outerRings[0][0][1]];
  let bestArea = -1;

  for (const ring of outerRings) {
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      area += cross;
      cx += (ring[j][0] + ring[i][0]) * cross;
      cy += (ring[j][1] + ring[i][1]) * cross;
    }
    const absArea = Math.abs(area);
    if (absArea > bestArea && area !== 0) {
      bestArea = absArea;
      best = [cx / (3 * area), cy / (3 * area)];
    }
  }
  return best;
}

// Accepts "6.92314, 122.08251" (lat, lng) as typed by people, returns [lng, lat].
export function parseCoordinates(text: string): LngLat | null {
  const match = text.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}
