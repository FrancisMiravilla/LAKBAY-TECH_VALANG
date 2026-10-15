import React, { memo, useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';
import barangayData from '../../../assets/data/zamboanga-city-barangays.json';
import { MAP_FONT, type LngLat } from '../../constants/mapConfig';
import type { MapSpot } from '../../hooks/useMapSpots';
import { pointInPolygon, polygonLabelPoint } from '../../utils/geo';
import { useMap } from './Map';

interface BarangayProps {
  name: string;
  psgc_code: string;
}

type BarangayGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;
type BarangayCollection = GeoJSON.FeatureCollection<BarangayGeometry, BarangayProps>;

// Bundled with the app (PSGC 2023), so boundaries work offline.
export const BARANGAYS = barangayData as BarangayCollection;

interface LabelProps {
  name: string;
  countText: string;
  count: number;
}

export function countSpotsPerBarangay(spots: MapSpot[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const spot of spots) {
    const hit = BARANGAYS.features.find((f) => pointInPolygon([spot.longitude, spot.latitude], f.geometry));
    if (hit) counts[hit.properties.psgc_code] = (counts[hit.properties.psgc_code] ?? 0) + 1;
  }
  return counts;
}

/** Barangay name at a [lng, lat] point, or null outside Zamboanga City's barangays. */
export function barangayAt(coordinate: LngLat): string | null {
  const hit = BARANGAYS.features.find((f) => pointInPolygon(coordinate, f.geometry));
  return hit ? hit.properties.name : null;
}

// Label anchors never change, so compute them once.
export const LABEL_POINTS = BARANGAYS.features.map((f) => ({
  psgc: f.properties.psgc_code,
  name: f.properties.name,
  point: polygonLabelPoint(f.geometry),
}));

function BarangayLayerBase({ spots }: { spots: MapSpot[] }) {
  const { theme } = useMap();
  const dark = theme === 'dark';

  const labels = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point, LabelProps>>(() => {
    const counts = countSpotsPerBarangay(spots);
    return {
      type: 'FeatureCollection',
      features: LABEL_POINTS.map(({ psgc, name, point }) => {
        const count = counts[psgc] ?? 0;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: point },
          properties: {
            name,
            count,
            countText: count === 0 ? '' : `${count} spot${count === 1 ? '' : 's'}`,
          },
        };
      }),
    };
  }, [spots]);

  const lineColor = dark ? '#38BDF8' : '#1A56DB';
  const fillColor = dark ? '#38BDF8' : '#1A56DB';
  const nameColor = dark ? '#E2E8F0' : '#0C2461';
  const haloColor = dark ? 'rgba(4,10,38,0.85)' : 'rgba(255,255,255,0.9)';

  return (
    <>
      <Mapbox.ShapeSource id="lakbay-barangays" shape={BARANGAYS}>
        <Mapbox.FillLayer
          id="lakbay-barangay-fill"
          belowLayerID="lakbay-spot-clusters"
          style={{ fillColor, fillOpacity: 0.12 }}
        />
        <Mapbox.LineLayer
          id="lakbay-barangay-line"
          belowLayerID="lakbay-spot-clusters"
          style={{
            lineColor,
            lineOpacity: 0.7,
            lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 0.8, 16, 2],
          }}
        />
      </Mapbox.ShapeSource>
      <Mapbox.ShapeSource id="lakbay-barangay-labels" shape={labels}>
        <Mapbox.SymbolLayer
          id="lakbay-barangay-label"
          belowLayerID="lakbay-spot-clusters"
          minZoomLevel={11.5}
          style={{
            textField: [
              'format',
              ['get', 'name'], { 'font-scale': 1 },
              '\n', {},
              ['get', 'countText'], { 'font-scale': 0.85, 'text-color': '#F59E0B' },
            ],
            textFont: MAP_FONT,
            textSize: ['interpolate', ['linear'], ['zoom'], 11.5, 9, 15, 13],
            textColor: nameColor,
            textHaloColor: haloColor,
            textHaloWidth: 1.5,
            textMaxWidth: 8,
            textOptional: true,
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
}

export const BarangayLayer = memo(BarangayLayerBase);
