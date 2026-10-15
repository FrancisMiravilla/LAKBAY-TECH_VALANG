import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ComponentRef, type ReactNode, type RefObject,
} from 'react';
import { ActivityIndicator, StyleSheet, View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import Mapbox, { type MapState, type MapView } from '@rnmapbox/maps';
import { COLORS } from '../../constants/theme';
import { DEFAULT_ZOOM, MAP_STYLES, ZAMBOANGA_CENTER, type LngLat } from '../../constants/mapConfig';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

export type CameraHandle = ComponentRef<typeof Mapbox.Camera>;

export type MapTheme = 'light' | 'dark' | 'system';
export type ResolvedMapTheme = 'light' | 'dark';

export interface MapBounds {
  ne: LngLat;
  sw: LngLat;
  padding?: number;
}

interface MapContextValue {
  cameraRef: RefObject<CameraHandle | null>;
  mapRef: RefObject<MapView | null>;
  isLoaded: boolean;
  theme: ResolvedMapTheme;
  registerOverlay: (id: string, element: ReactNode) => void;
  unregisterOverlay: (id: string) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

export function useMap(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMap must be used inside <Map>');
  return ctx;
}

interface MapProps {
  center?: LngLat;
  zoom?: number;
  bounds?: MapBounds | null;
  followUserLocation?: boolean;
  followZoom?: number;
  followPitch?: number;
  followHeading?: boolean;
  followPadding?: { paddingBottom?: number; paddingTop?: number };
  onCameraChanged?: (state: MapState) => void;
  onMapIdle?: (state: MapState) => void;
  onPress?: (feature: GeoJSON.Feature<GeoJSON.Point>) => void;
  theme?: MapTheme;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Map({
  center = ZAMBOANGA_CENTER,
  zoom = DEFAULT_ZOOM,
  bounds,
  followUserLocation = false,
  followZoom = 16,
  followPitch = 0,
  followHeading = false,
  followPadding,
  onCameraChanged,
  onMapIdle,
  onPress,
  theme = 'system',
  style,
  children,
}: MapProps) {
  const cameraRef = useRef<CameraHandle | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [overlays, setOverlays] = useState<Record<string, ReactNode>>({});
  const systemScheme = useColorScheme();

  const resolvedTheme: ResolvedMapTheme =
    theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : theme;

  // The initial camera is applied once; later moves go through cameraRef so
  // re-renders never snap the camera back.
  const defaultSettings = useRef({ centerCoordinate: center, zoomLevel: zoom }).current;

  useEffect(() => {
    if (!bounds || !isLoaded) return;
    const pad = bounds.padding ?? 40;
    cameraRef.current?.fitBounds(bounds.ne, bounds.sw, [pad, pad, pad, pad], 1000);
  }, [bounds, isLoaded]);

  const registerOverlay = useCallback((id: string, element: ReactNode) => {
    setOverlays((prev) => (prev[id] === element ? prev : { ...prev, [id]: element }));
  }, []);

  const unregisterOverlay = useCallback((id: string) => {
    setOverlays((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const contextValue = useMemo<MapContextValue>(
    () => ({ cameraRef, mapRef, isLoaded, theme: resolvedTheme, registerOverlay, unregisterOverlay }),
    [isLoaded, resolvedTheme, registerOverlay, unregisterOverlay],
  );

  // Overlay changes re-render only the plain View on top, not the native map tree.
  const mapTree = useMemo(
    () => (
      <Mapbox.MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        styleURL={MAP_STYLES[resolvedTheme]}
        // TextureView: a SurfaceView map disappears (shows transparent) when layered with the AR camera.
        surfaceView={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        logoPosition={{ bottom: 8, left: 8 }}
        attributionPosition={{ bottom: 8, left: 92 }}
        onDidFinishLoadingMap={() => setIsLoaded(true)}
        onCameraChanged={onCameraChanged}
        onMapIdle={onMapIdle}
        onPress={onPress}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={defaultSettings}
          followUserLocation={followUserLocation}
          followUserMode={followHeading ? Mapbox.UserTrackingMode.FollowWithHeading : Mapbox.UserTrackingMode.Follow}
          followZoomLevel={followZoom}
          followPitch={followPitch}
          followPadding={followPadding}
          animationDuration={1000}
          animationMode="flyTo"
        />
        {children}
      </Mapbox.MapView>
    ),
    [
      resolvedTheme, onCameraChanged, onMapIdle, onPress, defaultSettings, followUserLocation,
      followHeading, followZoom, followPitch, followPadding, children,
    ],
  );

  return (
    <MapContext.Provider value={contextValue}>
      <View style={[styles.container, style]}>
        {mapTree}
        {!isLoaded && (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator size="large" color={COLORS.gold} />
          </View>
        )}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {Object.entries(overlays).map(([id, element]) => (
            <React.Fragment key={id}>{element}</React.Fragment>
          ))}
        </View>
      </View>
    </MapContext.Provider>
  );
}

// Renders its children in the overlay layer above the native map.
export function MapOverlay({ id, children }: { id: string; children: ReactNode }) {
  const { registerOverlay, unregisterOverlay } = useMap();
  useEffect(() => {
    registerOverlay(id, children);
  }, [id, children, registerOverlay]);
  useEffect(() => () => unregisterOverlay(id), [id, unregisterOverlay]);
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: COLORS.navy },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(4,10,38,0.6)',
  },
});
