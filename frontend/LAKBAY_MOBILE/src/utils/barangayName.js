import barangayData from '../../assets/data/zamboanga-city-barangays.json';
import { pointInPolygon } from './geo';

// Barangay name at a lat/lng (bundled PSGC boundaries, works offline), or null.
// Plain JS version of components/map barangayAt, without the native map import.
const cache = new Map();

export function barangayName(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(key)) return cache.get(key);
  const hit = barangayData.features.find((f) => pointInPolygon([lng, lat], f.geometry));
  const name = hit ? hit.properties.name : null;
  cache.set(key, name);
  return name;
}
