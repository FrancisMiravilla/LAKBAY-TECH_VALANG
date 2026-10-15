import barangayData from './zamboanga-city-barangays.json';
import { pointInPolygon } from './geo';

/** Barangay name at a [lng, lat] point, or null outside Zamboanga City's barangays. */
export function barangayAt(coordinate) {
  const hit = barangayData.features.find((f) => pointInPolygon(coordinate, f.geometry));
  return hit ? hit.properties.name : null;
}
