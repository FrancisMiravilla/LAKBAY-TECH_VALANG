import { ZAMBOANGA_BBOX } from './mapConfig';

// Same helpers as LAKBAY_MOBILE/src/utils/geo.ts.

export function isInsideZamboanga([lng, lat]) {
  const [minLng, minLat, maxLng, maxLat] = ZAMBOANGA_BBOX;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(point, rings) {
  if (!rings.length || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(point, hole));
}

export function pointInPolygon(point, geometry) {
  if (geometry.type === 'Polygon') return pointInPolygonRings(point, geometry.coordinates);
  return geometry.coordinates.some((rings) => pointInPolygonRings(point, rings));
}

// Area-weighted centroid of the largest ring; good enough for label placement.
export function polygonLabelPoint(geometry) {
  const outerRings = geometry.type === 'Polygon'
    ? [geometry.coordinates[0]]
    : geometry.coordinates.map((rings) => rings[0]);

  let best = [outerRings[0][0][0], outerRings[0][0][1]];
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
export function parseCoordinates(text) {
  const match = text.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}
