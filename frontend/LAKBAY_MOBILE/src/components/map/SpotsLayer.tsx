import React, { memo, useCallback, useMemo, useRef, type ComponentProps } from 'react';
import Mapbox, { type ShapeSource } from '@rnmapbox/maps';
import { LOCKED_COLOR, MAP_FONT, SPOT_TYPES } from '../../constants/mapConfig';
import type { MapSpot } from '../../hooks/useMapSpots';
import { useMap } from './Map';

type OnPressEvent = Parameters<NonNullable<ComponentProps<typeof Mapbox.ShapeSource>['onPress']>>[0];

export interface SpotFeatureProps {
  id: string;
  color: string;
  locked: boolean;
  label: string;
}

export function buildSpotFeatures(
  spots: MapSpot[],
  userLevel: number,
): GeoJSON.FeatureCollection<GeoJSON.Point, SpotFeatureProps> {
  return {
    type: 'FeatureCollection',
    features: spots.map((spot) => {
      const locked = spot.required_level > userLevel;
      const typeLabel = SPOT_TYPES[spot.primary_type].shortLabel.split(' ')[0].toUpperCase();
      const label = locked
        ? `LOCKED · LVL ${spot.required_level}`
        : spot.required_level > 1
          ? `${typeLabel} · L${spot.required_level}`
          : typeLabel;
      return {
        type: 'Feature',
        id: spot.id,
        geometry: { type: 'Point', coordinates: [spot.longitude, spot.latitude] },
        properties: { id: spot.id, color: SPOT_TYPES[spot.primary_type].color, locked, label },
      };
    }),
  };
}

interface SpotsLayerProps {
  shape: GeoJSON.FeatureCollection<GeoJSON.Point, SpotFeatureProps>;
  selectedId: string | null;
  onSpotPress: (id: string) => void;
  /** Set to true by the layer right before a spot press so the map's onPress can ignore it. */
  featurePressRef: React.MutableRefObject<boolean>;
  /** Hide with layer visibility (not unmounting) so layers placed relative to these stay valid. */
  hidden?: boolean;
}

function SpotsLayerBase({ shape, selectedId, onSpotPress, featurePressRef, hidden = false }: SpotsLayerProps) {
  const { cameraRef } = useMap();
  const sourceRef = useRef<ShapeSource | null>(null);

  const handlePress = useCallback(
    async (e: OnPressEvent) => {
      const feature = e.features[0];
      if (!feature) return;
      featurePressRef.current = true;
      const props = feature.properties ?? {};

      if (props.cluster) {
        const zoom = await sourceRef.current?.getClusterExpansionZoom(feature).catch(() => undefined);
        if (feature.geometry.type === 'Point') {
          cameraRef.current?.setCamera({
            centerCoordinate: feature.geometry.coordinates,
            zoomLevel: (zoom ?? 13) + 0.5,
            animationDuration: 600,
            animationMode: 'easeTo',
          });
        }
        return;
      }
      if (typeof props.id === 'string') onSpotPress(props.id);
    },
    [cameraRef, featurePressRef, onSpotPress],
  );

  const visibility = hidden ? 'none' : 'visible';

  const selectedFilter = useMemo(() => ['==', ['get', 'id'], selectedId ?? ''], [selectedId]);

  return (
    <Mapbox.ShapeSource
      id="lakbay-spots"
      ref={sourceRef}
      shape={shape}
      cluster
      clusterRadius={44}
      clusterMaxZoomLevel={12.5}
      onPress={handlePress}
      hitbox={{ width: 28, height: 28 }}
    >
      {/* Clusters (zoomed out) */}
      <Mapbox.CircleLayer
        id="lakbay-spot-clusters"
        filter={['has', 'point_count']}
        style={{
          visibility,
          circleColor: '#0C2461',
          circleRadius: ['step', ['get', 'point_count'], 16, 5, 20, 15, 26],
          circleStrokeColor: '#FBBF24',
          circleStrokeWidth: 2.5,
          circleOpacity: 0.92,
        }}
      />
      <Mapbox.SymbolLayer
        id="lakbay-spot-cluster-count"
        filter={['has', 'point_count']}
        style={{
          visibility,
          textField: ['get', 'point_count_abbreviated'],
          textFont: MAP_FONT,
          textSize: 13,
          textColor: '#FBBF24',
          textAllowOverlap: true,
          textIgnorePlacement: true,
        }}
      />

      {/* Selected halo */}
      <Mapbox.CircleLayer
        id="lakbay-spot-selected"
        filter={['all', ['!', ['has', 'point_count']], selectedFilter]}
        style={{ visibility, circleColor: '#FFFFFF', circleOpacity: 0.35, circleRadius: 20 }}
      />

      {/* Individual spots, colored by type; locked spots get a red ring */}
      <Mapbox.CircleLayer
        id="lakbay-spot-points"
        filter={['!', ['has', 'point_count']]}
        style={{
          visibility,
          circleColor: ['get', 'color'],
          circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 7, 14, 10, 17, 13],
          circleStrokeColor: ['case', ['get', 'locked'], LOCKED_COLOR, '#FFFFFF'],
          circleStrokeWidth: ['case', ['get', 'locked'], 3, 2.5],
          circleOpacity: ['case', ['get', 'locked'], 0.75, 1],
          circlePitchAlignment: 'map',
        }}
      />
      <Mapbox.SymbolLayer
        id="lakbay-spot-labels"
        filter={['!', ['has', 'point_count']]}
        minZoomLevel={13}
        style={{
          visibility,
          textField: ['get', 'label'],
          textFont: MAP_FONT,
          textSize: 10,
          textOffset: [0, 1.6],
          textAnchor: 'top',
          textColor: '#FFFFFF',
          textHaloColor: ['case', ['get', 'locked'], LOCKED_COLOR, ['get', 'color']],
          textHaloWidth: 2,
          textOptional: true,
        }}
      />
    </Mapbox.ShapeSource>
  );
}

export const SpotsLayer = memo(SpotsLayerBase);
