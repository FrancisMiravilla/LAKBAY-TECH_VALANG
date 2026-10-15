import React, { memo, useCallback, useMemo, useRef, type ComponentProps } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import Mapbox, { type ShapeSource, type SymbolLayerStyle } from '@rnmapbox/maps';
import {
  LOCKED_COLOR, MAP_FONT, SPOT_TYPES, SPOT_TYPE_ORDER,
  type IoniconName, type SpotType,
} from '../../constants/mapConfig';
import type { MapSpot } from '../../hooks/useMapSpots';
import { useMap } from './Map';

type OnPressEvent = Parameters<NonNullable<ComponentProps<typeof Mapbox.ShapeSource>['onPress']>>[0];

// Symbol drawn inside each pin type.
const PIN_ICON: Record<SpotType, { icon: IoniconName; iconColor: string }> = {
  qr: { icon: 'qr-code', iconColor: '#FFFFFF' },
  ar: { icon: 'cube', iconColor: '#FFFFFF' },
  // Only used for a Catch spot that has no 3D model at all.
  catch: { icon: 'cube', iconColor: '#0C2461' },
  promotion: { icon: 'star', iconColor: '#FFFFFF' },
};

const pinImageName = (type: SpotType, locked: boolean) => `lakbay-pin-${type}${locked ? '-locked' : ''}`;

export interface SpotFeatureProps {
  id: string;
  color: string;
  locked: boolean;
  label: string;
  icon: string;
  model: string;
  hasModel: boolean;
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
      const model = spot.primary_type === 'catch' && spot.model_3d ? spot.model_3d : '';
      return {
        type: 'Feature',
        id: spot.id,
        geometry: { type: 'Point', coordinates: [spot.longitude, spot.latitude] },
        properties: {
          id: spot.id,
          color: SPOT_TYPES[spot.primary_type].color,
          locked,
          label,
          icon: pinImageName(spot.primary_type, locked),
          model,
          hasModel: model !== '',
        },
      };
    }),
  };
}

// Pin artwork rendered once into map images (native symbols, not React views on the map).
function PinArt({ type, locked }: { type: SpotType; locked: boolean }) {
  const { icon, iconColor } = PIN_ICON[type];
  return (
    // collapsable={false}: Mapbox images need exactly one child view, so this
    // wrapper must not be flattened away (locked pins would arrive as two views).
    <View style={pinStyles.canvas} collapsable={false}>
      <View style={[pinStyles.pin, { backgroundColor: SPOT_TYPES[type].color, borderColor: locked ? LOCKED_COLOR : '#FFFFFF' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      {locked && (
        <View style={pinStyles.lockBadge}>
          <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const PinImages = memo(function PinImages() {
  return (
    <Mapbox.Images>
      {SPOT_TYPE_ORDER.flatMap((type) =>
        [false, true].map((locked) => (
          <Mapbox.Image key={pinImageName(type, locked)} name={pinImageName(type, locked)}>
            <PinArt type={type} locked={locked} />
          </Mapbox.Image>
        )),
      )}
    </Mapbox.Images>
  );
});

// ─── Catch pin: small circle with the spot's own 3D model spinning inside ────
const HTML_ESCAPE: Record<string, string> = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
const escapeAttr = (v: string) => v.replace(/["'<>&]/g, (c) => HTML_ESCAPE[c]);

function buildPinModelHTML(modelUrl: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent}
model-viewer{width:100%;height:100%;background:transparent;--poster-color:transparent;--progress-bar-height:0}</style>
</head><body>
<model-viewer src="${escapeAttr(modelUrl)}" auto-rotate rotation-per-second="40deg" interaction-prompt="none"
  disable-zoom disable-pan disable-tap bounds="tight" exposure="1.1" shadow-intensity="0"></model-viewer>
</body></html>`;
}

interface CatchModelPinProps {
  id: string;
  coordinate: GeoJSON.Position;
  model: string;
  color: string;
  locked: boolean;
  selected: boolean;
  onPress: (id: string) => void;
}

const CatchModelPin = memo(function CatchModelPin({
  id, coordinate, model, color, locked, selected, onPress,
}: CatchModelPinProps) {
  const html = useMemo(() => buildPinModelHTML(model), [model]);
  return (
    <Mapbox.MarkerView id={`lakbay-catch-${id}`} coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
      <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(id)} style={pinStyles.modelCanvas}>
        {selected && <View style={pinStyles.modelHalo} />}
        <View
          style={[
            pinStyles.modelCircle,
            { backgroundColor: color, borderColor: locked ? LOCKED_COLOR : '#FFFFFF' },
          ]}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <WebView
              source={{ html }}
              style={pinStyles.modelWebview}
              originWhitelist={['*']}
              javaScriptEnabled
              scrollEnabled={false}
              androidLayerType="hardware"
            />
          </View>
        </View>
        {locked && (
          <View style={pinStyles.lockBadge}>
            <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    </Mapbox.MarkerView>
  );
});

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

  // Catch spots with a 3D model are drawn as model pins (below) and kept out of the
  // clustered source so they never appear twice.
  const pinShape = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point, SpotFeatureProps>>(
    () => ({ type: 'FeatureCollection', features: shape.features.filter((f) => !f.properties.hasModel) }),
    [shape],
  );
  const modelSpots = useMemo(() => shape.features.filter((f) => f.properties.hasModel), [shape]);

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
  const selectedKey = selectedId ?? '';

  const pinIconStyle: SymbolLayerStyle = {
    visibility,
    iconImage: ['get', 'icon'],
    iconSize: ['interpolate', ['linear'], ['zoom'], 11, 0.75, 15, 1, 18, 1.15],
    iconAllowOverlap: true,
    iconIgnorePlacement: true,
    iconPitchAlignment: 'viewport',
  };

  return (
    <>
      <PinImages />
      <Mapbox.ShapeSource
        id="lakbay-spots"
        ref={sourceRef}
        shape={pinShape}
        cluster
        clusterRadius={44}
        clusterMaxZoomLevel={12.5}
        onPress={handlePress}
        hitbox={{ width: 32, height: 32 }}
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
          filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedKey]]}
          style={{ visibility, circleColor: '#FFFFFF', circleOpacity: 0.45, circleRadius: 26 }}
        />

        {/* Symbol pins: QR code, AR cube, Promotion star */}
        <Mapbox.SymbolLayer
          id="lakbay-spot-pins"
          filter={['!', ['has', 'point_count']]}
          style={pinIconStyle}
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
            textOffset: [0, 2.1],
            textAnchor: 'top',
            textColor: '#FFFFFF',
            textHaloColor: ['case', ['get', 'locked'], LOCKED_COLOR, ['get', 'color']],
            textHaloWidth: 2,
            textOptional: true,
          }}
        />
      </Mapbox.ShapeSource>
      {/* Catch spots: circle pin with the spot's own 3D model spinning inside. */}
      {!hidden &&
        modelSpots.map((f) => (
          <CatchModelPin
            key={f.properties.id}
            id={f.properties.id}
            coordinate={f.geometry.coordinates}
            model={f.properties.model}
            color={f.properties.color}
            locked={f.properties.locked}
            selected={f.properties.id === selectedId}
            onPress={onSpotPress}
          />
        ))}
    </>
  );
}

export const SpotsLayer = memo(SpotsLayerBase);

const pinStyles = StyleSheet.create({
  canvas: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelCanvas: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  modelHalo: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  modelCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    overflow: 'hidden',
  },
  modelWebview: { flex: 1, backgroundColor: 'transparent' },
  lockBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: LOCKED_COLOR,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
