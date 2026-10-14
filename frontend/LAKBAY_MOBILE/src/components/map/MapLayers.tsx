import React, { memo, useEffect, useMemo, useState, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';
import type { IoniconName, LngLat } from '../../constants/mapConfig';
import { useMap } from './Map';

// ─── MapMarker — for one or two special pins only (not for lists of spots) ──
interface MapMarkerProps {
  id: string;
  coordinate: LngLat;
  label?: string;
  icon?: IoniconName;
  color?: string;
  children?: ReactElement;
}

export const MapMarker = memo(function MapMarker({
  id, coordinate, label, icon = 'location', color = '#10B981', children,
}: MapMarkerProps) {
  return (
    <Mapbox.MarkerView id={id} coordinate={coordinate} anchor={{ x: 0.5, y: 1 }} allowOverlap>
      {children ?? (
        <View style={styles.markerWrap}>
          {!!label && (
            <View style={[styles.markerLabel, { backgroundColor: color }]}>
              <Text style={styles.markerLabelText}>{label}</Text>
            </View>
          )}
          <Ionicons name={icon} size={30} color={color} style={styles.markerIcon} />
        </View>
      )}
    </Mapbox.MarkerView>
  );
});

// ─── MapRoute ────────────────────────────────────────────────────────────────
interface MapRouteProps {
  id: string;
  coordinates: LngLat[];
  color?: string;
  width?: number;
  opacity?: number;
  dashed?: boolean;
}

export const MapRoute = memo(function MapRoute({
  id, coordinates, color = '#3B82F6', width = 5, opacity = 0.9, dashed = false,
}: MapRouteProps) {
  const shape = useMemo<GeoJSON.Feature<GeoJSON.LineString>>(
    () => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }),
    [coordinates],
  );
  if (coordinates.length < 2) return null;
  return (
    <Mapbox.ShapeSource id={`${id}-source`} shape={shape}>
      <Mapbox.LineLayer
        id={`${id}-line`}
        style={{
          lineColor: color,
          lineWidth: width,
          lineOpacity: opacity,
          lineJoin: 'round',
          lineCap: 'round',
          ...(dashed ? { lineDasharray: [2, 1.5] } : {}),
        }}
      />
    </Mapbox.ShapeSource>
  );
});

// ─── MapUserLocation — puck with heading arrow, asks permission itself ──────
export const MapUserLocation = memo(function MapUserLocation({ visible = true }: { visible?: boolean }) {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    let alive = true;
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => alive && setGranted(status === 'granted'))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!granted || !visible) return null;
  return (
    <Mapbox.LocationPuck
      puckBearingEnabled
      puckBearing="heading"
      pulsing={{ isEnabled: true, color: '#3B82F6', radius: 50 }}
    />
  );
});

// ─── MapHeatmap — weight, intensity and radius scale with zoom ──────────────
interface MapHeatmapProps {
  id: string;
  shape: GeoJSON.FeatureCollection;
  weightProperty?: string;
}

export const MapHeatmap = memo(function MapHeatmap({ id, shape, weightProperty }: MapHeatmapProps) {
  return (
    <Mapbox.ShapeSource id={`${id}-source`} shape={shape}>
      <Mapbox.HeatmapLayer
        id={`${id}-layer`}
        style={{
          heatmapWeight: weightProperty
            ? ['interpolate', ['linear'], ['get', weightProperty], 0, 0.2, 1, 1]
            : 1,
          heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 10, 0.8, 16, 2.5],
          heatmapRadius: ['interpolate', ['linear'], ['zoom'], 10, 18, 13, 32, 16, 60],
          heatmapOpacity: ['interpolate', ['linear'], ['zoom'], 10, 0.85, 18, 0.6],
          heatmapColor: [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(26,86,219,0)',
            0.2, 'rgba(56,189,248,0.55)',
            0.45, 'rgba(16,185,129,0.7)',
            0.7, 'rgba(251,191,36,0.85)',
            1, 'rgba(239,68,68,0.95)',
          ],
        }}
      />
    </Mapbox.ShapeSource>
  );
});

// ─── Map3DBuildings — extruded buildings for the 3D tilt mode ───────────────
export const Map3DBuildings = memo(function Map3DBuildings() {
  const { theme } = useMap();
  return (
    <Mapbox.FillExtrusionLayer
      id="lakbay-3d-buildings"
      sourceID="composite"
      sourceLayerID="building"
      filter={['==', ['get', 'extrude'], 'true']}
      minZoomLevel={14}
      maxZoomLevel={24}
      style={{
        fillExtrusionColor: theme === 'dark' ? '#1E293B' : '#CBD5E1',
        fillExtrusionHeight: ['get', 'height'],
        fillExtrusionBase: ['get', 'min_height'],
        fillExtrusionOpacity: 0.7,
      }}
    />
  );
});

const styles = StyleSheet.create({
  markerWrap: { alignItems: 'center' },
  markerLabel: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 2 },
  markerLabelText: { fontFamily: FONTS.bold, fontSize: 11, color: '#fff' },
  markerIcon: {
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
