import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, ImageBackground, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCameraPermissions } from 'expo-camera';
import type { MapState } from '@rnmapbox/maps';
import { COLORS, FONTS, SIZES, SPACING, BG_OVERLAY } from '../constants/theme';
import {
  CAMERA, PROXIMITY_RADIUS_M, SPOT_TYPES, SPOT_TYPE_ORDER,
  type IoniconName, type LngLat, type SpotType,
} from '../constants/mapConfig';
import ErrorModal from '../components/ErrorModal';
import ARNavigationOverlay from '../components/ARNavigationOverlay';
import VintaCard from '../components/VintaCard';
import { useToast } from '../components/Toast';
import { Map, MapOverlay, useMap, type MapTheme } from '../components/map/Map';
import { MapMarker, MapRoute, MapUserLocation, Map3DBuildings } from '../components/map/MapLayers';
import { SpotsLayer, buildSpotFeatures } from '../components/map/SpotsLayer';
import { BarangayLayer } from '../components/map/BarangayLayer';
import { FeatureButton, ZoomControls } from '../components/map/MapControls';
import { MapSearchBar, type SearchResult } from '../components/map/MapSearchBar';
import { CategoryChips } from '../components/map/CategoryChips';
import { SpotDetailCard, type RouteInfo } from '../components/map/SpotDetailCard';
import { useMapSpots, type MapSpot } from '../hooks/useMapSpots';
import { haversineMetres, isInsideBounds, type VisibleBounds } from '../utils/geo';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_OFFSCREEN = 640;
// Floating map during AR navigation (camera fills the screen behind it).
const NAV_MAP_SMALL = { width: SCREEN_W - 32, height: 170 };
const NAV_MAP_LARGE = { width: SCREEN_W - 32, height: Math.round(SCREEN_H * 0.38) };
const NAV_MAP_GAP = 12;
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

const THEME_CYCLE: Record<MapTheme, { next: MapTheme; icon: IoniconName; label: string }> = {
  system: { next: 'dark', icon: 'contrast-outline', label: 'Map theme: system' },
  dark: { next: 'light', icon: 'moon-outline', label: 'Map theme: dark' },
  light: { next: 'system', icon: 'sunny-outline', label: 'Map theme: light' },
};

interface UserCoords {
  lat: number;
  lng: number;
  accuracy: number | null;
}

interface SearchPin {
  coordinate: LngLat;
  name: string;
}

interface ErrorState {
  visible: boolean;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

// ─── Controls that need the camera live inside <Map> so they can use useMap() ─
interface MapToolsProps {
  barangaysOn: boolean;
  tiltOn: boolean;
  rotateOn: boolean;
  theme: MapTheme;
  searchOpen: boolean;
  onToggleSearch: () => void;
  onCycleTheme: () => void;
  onToggleBarangays: () => void;
  onToggleTilt: () => void;
  onToggleRotate: () => void;
}

function MapTools({
  barangaysOn, tiltOn, rotateOn, theme, searchOpen,
  onToggleSearch, onCycleTheme, onToggleBarangays, onToggleTilt, onToggleRotate,
}: MapToolsProps) {
  const { cameraRef } = useMap();
  const headingRef = useRef(0);

  useEffect(() => {
    cameraRef.current?.setCamera({
      pitch: tiltOn ? CAMERA.tiltPitch : 0,
      animationDuration: CAMERA.tiltDuration,
      animationMode: 'easeTo',
    });
  }, [tiltOn, cameraRef]);

  // Auto-rotate: +90° every 2 s with linear easing; reset heading when stopped.
  useEffect(() => {
    if (!rotateOn) return;
    const camera = cameraRef.current;
    const step = () => {
      headingRef.current = (headingRef.current + CAMERA.rotateStepDegrees) % 360;
      camera?.setCamera({
        heading: headingRef.current,
        animationDuration: CAMERA.rotateIntervalMs,
        animationMode: 'linearTo',
      });
    };
    step();
    const id = setInterval(step, CAMERA.rotateIntervalMs);
    return () => {
      clearInterval(id);
      headingRef.current = 0;
      camera?.setCamera({ heading: 0, animationDuration: CAMERA.tiltDuration, animationMode: 'easeTo' });
    };
  }, [rotateOn, cameraRef]);

  return (
    <View style={styles.toolColumn} pointerEvents="box-none">
      <ZoomControls />
      <View style={styles.toolSpacer} />
      <FeatureButton icon="search-outline" active={searchOpen} onPress={onToggleSearch} accessibilityLabel="Search" />
      <FeatureButton icon={THEME_CYCLE[theme].icon} active={theme !== 'system'} activeColor="#38BDF8" onPress={onCycleTheme} accessibilityLabel={THEME_CYCLE[theme].label} />
      <FeatureButton icon="map-outline" active={barangaysOn} activeColor="#38BDF8" onPress={onToggleBarangays} accessibilityLabel="Barangay boundaries" />
      <FeatureButton icon="cube-outline" active={tiltOn} activeColor={COLORS.teal} onPress={onToggleTilt} accessibilityLabel="3D tilt" />
      {tiltOn && (
        <FeatureButton icon="refresh-outline" active={rotateOn} activeColor={COLORS.teal} onPress={onToggleRotate} accessibilityLabel="Auto-rotate" />
      )}
    </View>
  );
}

// Flies the camera when `target` changes; lives inside <Map> to reach the camera ref.
function CameraDirector({ target }: { target: { coordinate: LngLat; zoom: number; key: number } | null }) {
  const { cameraRef } = useMap();
  useEffect(() => {
    if (!target) return;
    cameraRef.current?.setCamera({
      centerCoordinate: target.coordinate,
      zoomLevel: target.zoom,
      animationDuration: CAMERA.flyDuration,
      animationMode: 'flyTo',
    });
  }, [target, cameraRef]);
  return null;
}

function FitRoute({ coordinates }: { coordinates: LngLat[] | null }) {
  const { cameraRef } = useMap();
  useEffect(() => {
    if (!coordinates || coordinates.length < 2) return;
    const lngs = coordinates.map((c) => c[0]);
    const lats = coordinates.map((c) => c[1]);
    cameraRef.current?.fitBounds(
      [Math.max(...lngs), Math.max(...lats)],
      [Math.min(...lngs), Math.min(...lats)],
      [80, 60, 280, 60],
      1000,
    );
  }, [coordinates, cameraRef]);
  return null;
}

function ResetPitch({ when }: { when: number }) {
  const { cameraRef } = useMap();
  useEffect(() => {
    if (when === 0) return;
    cameraRef.current?.setCamera({ pitch: 0, heading: 0, animationDuration: 800, animationMode: 'easeTo' });
  }, [when, cameraRef]);
  return null;
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { spots, profile, loading, error } = useMapSpots();
  const userXp = profile?.xp ?? 0;
  const userLevel = Math.floor(userXp / 100) + 1;

  const [theme, setTheme] = useState<MapTheme>('system');
  const [barangaysOn, setBarangaysOn] = useState(false);
  const [tiltOn, setTiltOn] = useState(false);
  const [rotateOn, setRotateOn] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeType, setActiveType] = useState<SpotType | null>(null);
  const [visibleBounds, setVisibleBounds] = useState<VisibleBounds | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchPin, setSearchPin] = useState<SearchPin | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ coordinate: LngLat; zoom: number; key: number } | null>(null);

  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [routeCoords, setRouteCoords] = useState<LngLat[] | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [following, setFollowing] = useState(false);
  const [routeStart, setRouteStart] = useState<LngLat | null>(null);
  const [navMapExpanded, setNavMapExpanded] = useState(false);
  const [proximitySpot, setProximitySpot] = useState<MapSpot | null>(null);
  const [resetPitchKey, setResetPitchKey] = useState(0);
  const [errorModal, setErrorModal] = useState<ErrorState>({ visible: false, type: 'error', title: '', message: '' });

  const { toast, showToast } = useToast();
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  const featurePressRef = useRef(false);
  const followingRef = useRef(false);
  const spotsRef = useRef<MapSpot[]>([]);
  const cardAnim = useRef(new Animated.Value(CARD_OFFSCREEN)).current;
  const routeBannerAnim = useRef(new Animated.Value(-80)).current;

  followingRef.current = following;
  spotsRef.current = spots;

  const showErr = useCallback(
    (title: string, message: string, type: ErrorState['type'] = 'error') =>
      setErrorModal({ visible: true, type, title, message }),
    [],
  );

  const selectedSpot = useMemo(() => spots.find((s) => s.id === selectedId) ?? null, [spots, selectedId]);

  // ── Derived map data (memoized so the native layers only update on real changes) ──
  const filteredSpots = useMemo(
    () => (activeType ? spots.filter((s) => s.feature_types.includes(activeType)) : spots),
    [spots, activeType],
  );
  const spotShape = useMemo(() => buildSpotFeatures(filteredSpots, userLevel), [filteredSpots, userLevel]);

  const visibleCounts = useMemo(() => {
    const counts: Record<SpotType, number> = { qr: 0, ar: 0, catch: 0, promotion: 0 };
    for (const spot of spots) {
      if (visibleBounds && !isInsideBounds([spot.longitude, spot.latitude], visibleBounds)) continue;
      for (const type of SPOT_TYPE_ORDER) if (spot.feature_types.includes(type)) counts[type] += 1;
    }
    return counts;
  }, [spots, visibleBounds]);

  // ── GPS: one watcher, faster while navigating; proximity check reads refs (no stale state) ──
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let alive = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !alive) return;
        sub = await Location.watchPositionAsync(
          isNavigating
            ? { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 }
            : { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 2 },
          (loc) => {
            const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy };
            setUserLocation(coords);
            const nearby =
              spotsRef.current.find(
                (s) => haversineMetres(coords.lat, coords.lng, s.latitude, s.longitude) <= PROXIMITY_RADIUS_M,
              ) ?? null;
            setProximitySpot((prev) => (prev?.id === nearby?.id ? prev : nearby));
          },
        );
        if (!alive) sub.remove();
      } catch (err) {
        console.warn('GPS location tracking error:', err);
      }
    })();
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [isNavigating]);

  // ── Map events ────────────────────────────────────────────────────────────
  const markFeaturePress = useCallback(() => {
    featurePressRef.current = true;
    // In case the map never fires its own onPress for this tap.
    setTimeout(() => {
      featurePressRef.current = false;
    }, 350);
  }, []);

  const closeCard = useCallback(() => {
    Animated.timing(cardAnim, { toValue: CARD_OFFSCREEN, duration: 240, useNativeDriver: true }).start(() => {
      setSelectedId(null);
    });
    setRouteInfo(null);
    setRouteCoords(null);
    setRouting(false);
    Animated.timing(routeBannerAnim, { toValue: -80, duration: 200, useNativeDriver: true }).start();
  }, [cardAnim, routeBannerAnim]);

  const openSpot = useCallback(
    (id: string) => {
      markFeaturePress();
      setRouteInfo(null);
      setRouteCoords(null);
      setRouting(false);
      setSelectedId(id);
      Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }).start();
    },
    [cardAnim, markFeaturePress],
  );

  const handleMapPress = useCallback(() => {
    if (featurePressRef.current) {
      featurePressRef.current = false;
      return;
    }
    if (selectedId && !isNavigating) closeCard();
  }, [selectedId, isNavigating, closeCard]);

  const handleCameraChanged = useCallback((state: MapState) => {
    // Stop following as soon as the user drags the map; the locate button resumes it.
    if (followingRef.current && state.gestures.isGestureActive) setFollowing(false);
  }, []);

  const handleMapIdle = useCallback((state: MapState) => {
    setVisibleBounds({ ne: state.properties.bounds.ne, sw: state.properties.bounds.sw });
  }, []);

  // ── Locate ────────────────────────────────────────────────────────────────
  const handleLocate = useCallback(async () => {
    if (isNavigating) {
      setFollowing(true);
      return;
    }
    setLocating(true);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        showToast('Location permission is needed to find you on the map.', 'warning');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        showToast('Turn on Location services (GPS) on your phone.', 'warning');
        return;
      }
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 60000 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      setFlyTarget({ coordinate: [pos.coords.longitude, pos.coords.latitude], zoom: CAMERA.locateZoom, key: Date.now() });
    } catch {
      showToast('Could not get your location. Try again outside.', 'error');
    } finally {
      setLocating(false);
    }
  }, [isNavigating, showToast]);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      setSearchOpen(false);
      if (result.kind === 'spot') {
        setSearchPin(null);
        if (activeType && !result.spot.feature_types.includes(activeType)) setActiveType(null);
        setFlyTarget({ coordinate: [result.spot.longitude, result.spot.latitude], zoom: 15.5, key: Date.now() });
        openSpot(result.spot.id);
        return;
      }
      if (result.outside) showToast('That location is outside Zamboanga City.', 'warning');
      setSearchPin({ coordinate: result.coordinate, name: result.name });
      setFlyTarget({ coordinate: result.coordinate, zoom: 15, key: Date.now() });
    },
    [activeType, openSpot, showToast],
  );

  // ── Directions & AR navigation (existing behaviour, now native) ───────────
  const clearRoute = useCallback(() => {
    setRouteInfo(null);
    setRouteCoords(null);
    setRouting(false);
    setIsNavigating(false);
    setFollowing(false);
    setRouteStart(null);
    setResetPitchKey(Date.now());
    Animated.timing(routeBannerAnim, { toValue: -80, duration: 200, useNativeDriver: true }).start();
  }, [routeBannerAnim]);

  const startNavigation = useCallback(async () => {
    if (!userLocation) return;
    if (!cameraPerm?.granted) {
      const p = await requestCameraPerm();
      if (!p.granted) {
        showErr('Camera Required', 'Camera permission is needed for AR Navigation.');
        return;
      }
    }
    setRouteStart([userLocation.lng, userLocation.lat]);
    setNavMapExpanded(false);
    setIsNavigating(true);
    setFollowing(true);
    setTiltOn(false);
    setRotateOn(false);
    showToast('Navigation started. Follow the arrow!', 'success');
  }, [userLocation, cameraPerm, requestCameraPerm, showErr, showToast]);

  const handleDirections = useCallback(async () => {
    if (!selectedSpot) return;
    if (routeInfo) {
      startNavigation();
      return;
    }

    let loc = userLocation;
    if (!loc) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showErr('Location Required', 'Please enable location permissions to get directions.', 'warning');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      loc = { lat: result.coords.latitude, lng: result.coords.longitude, accuracy: result.coords.accuracy };
      setUserLocation(loc);
    }

    setRouting(true);
    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/${loc.lng},${loc.lat};` +
        `${selectedSpot.longitude},${selectedSpot.latitude}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const json: unknown = await res.json();
      const route =
        typeof json === 'object' && json !== null && Array.isArray((json as { routes?: unknown }).routes)
          ? (json as { routes: { distance: number; duration: number; geometry: { coordinates: LngLat[] } }[] }).routes[0]
          : undefined;
      if (!route) throw new Error('No route');
      setRouteCoords(route.geometry.coordinates);
      setRouteInfo({ distKm: (route.distance / 1000).toFixed(1), mins: Math.ceil(route.duration / 60) });
      Animated.spring(routeBannerAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
    } catch {
      showErr('Directions Unavailable', 'Could not calculate a route to this spot. Make sure you have an internet connection.', 'warning');
    } finally {
      setRouting(false);
    }
  }, [selectedSpot, routeInfo, userLocation, startNavigation, showErr, routeBannerAnim]);

  const navMapSize = navMapExpanded ? NAV_MAP_LARGE : NAV_MAP_SMALL;
  // Map floats at the bottom; the spot title and distance sit at the top of the camera view.
  const navMapBottom = insets.bottom + NAV_MAP_GAP;

  const cardOpen = !!selectedSpot && !isNavigating;
  const navColor = selectedSpot ? SPOT_TYPES[selectedSpot.primary_type].color : SPOT_TYPES.qr.color;

  return (
    <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.bgImage} resizeMode="cover">
      <View style={styles.bgOverlay} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.container} edges={['top']}>
        {!isNavigating && (
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>INTERACTIVE MAP</Text>
              <Text style={styles.headerSubtitle}>Discover Zamboanga&apos;s Cultural Heritage</Text>
            </View>
            <View style={styles.headerLevelChip}>
              <Ionicons name="shield-checkmark" size={13} color={COLORS.gold} />
              <Text style={styles.headerLevelText}>LVL {userLevel}</Text>
            </View>
          </View>
        )}

        <View style={styles.mapContainer}>
          {isNavigating && cameraPerm?.granted && (
            <ARNavigationOverlay
              icon={{
                id: selectedSpot?.id,
                name: selectedSpot?.name,
                tagline: selectedSpot?.description ?? '',
                about: '',
                significance: '',
                color: navColor,
                glow: `${navColor}55`,
                model_3d: selectedSpot?.model_3d ?? null,
              }}
              spot={selectedSpot}
              nearbySpot={proximitySpot}
              userLocation={userLocation}
              hideBottomPanel
              showCelebration={false}
              onInspectSpot={(spotToInspect: MapSpot | null) => {
                if (spotToInspect) setSelectedId(spotToInspect.id);
              }}
              onContinue={() => {
                setIsNavigating(false);
                setFollowing(false);
                if (selectedSpot) {
                  Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }).start();
                }
              }}
              onClose={() => {
                setIsNavigating(false);
                setFollowing(false);
              }}
            />
          )}

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={COLORS.gold} size="large" />
              <Text style={styles.loadingText}>Loading map spots…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Ionicons name="warning-outline" size={40} color={COLORS.gold} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View
              style={
                isNavigating
                  ? [styles.navFloatingMap, navMapSize, { bottom: navMapBottom }]
                  : styles.fullMap
              }
            >
              {/* Same tree in both modes so the map is never re-created; only the frame changes. */}
              <VintaCard
                borderWidth={isNavigating ? 3 : 0}
                style={[styles.mapFrame, { borderRadius: isNavigating ? 20 : 0 }]}
                contentStyle={styles.mapFrameInner}
              >
              <Map
                theme={theme}
                followUserLocation={following}
                followZoom={isNavigating ? CAMERA.navZoom : CAMERA.locateZoom}
                followPitch={isNavigating ? CAMERA.tiltPitch : 0}
                followHeading={isNavigating}
                onPress={handleMapPress}
                onCameraChanged={handleCameraChanged}
                onMapIdle={handleMapIdle}
              >
                {barangaysOn && <BarangayLayer spots={spots} />}
                {tiltOn && <Map3DBuildings />}
                {routeCoords && <MapRoute id="lakbay-route" coordinates={routeCoords} />}
                <SpotsLayer
                  shape={spotShape}
                  selectedId={selectedId}
                  onSpotPress={openSpot}
                  featurePressRef={featurePressRef}
                />
                <MapUserLocation />
                {isNavigating && routeStart && (
                  <MapMarker id="lakbay-route-start" coordinate={routeStart} label="Start" icon="flag" color={COLORS.teal} />
                )}
                {searchPin && (
                  <MapMarker id="lakbay-search-pin" coordinate={searchPin.coordinate} label={searchPin.name} icon="location" color="#EF4444" />
                )}
                <CameraDirector target={flyTarget} />
                <FitRoute coordinates={isNavigating ? null : routeCoords} />
                <ResetPitch when={resetPitchKey} />

                {!isNavigating && (
                  <MapOverlay id="top">
                    <View style={styles.topOverlay} pointerEvents="box-none">
                      {searchOpen ? (
                        <MapSearchBar spots={spots} onSelect={handleSearchSelect} onClose={() => setSearchOpen(false)} />
                      ) : (
                        <CategoryChips
                          counts={visibleCounts}
                          active={activeType}
                          onToggle={(t) => setActiveType((prev) => (prev === t ? null : t))}
                        />
                      )}
                    </View>
                  </MapOverlay>
                )}

                {!isNavigating && !searchOpen && (
                  <MapOverlay id="tools">
                    <MapTools
                      barangaysOn={barangaysOn}
                      tiltOn={tiltOn}
                      rotateOn={rotateOn}
                      theme={theme}
                      searchOpen={searchOpen}
                      onToggleSearch={() => setSearchOpen((v) => !v)}
                      onCycleTheme={() => setTheme((t) => THEME_CYCLE[t].next)}
                      onToggleBarangays={() => setBarangaysOn((v) => !v)}
                      onToggleTilt={() => {
                        setTiltOn((v) => !v);
                        setRotateOn(false);
                      }}
                      onToggleRotate={() => setRotateOn((v) => !v)}
                    />
                  </MapOverlay>
                )}

                {!cardOpen && !isNavigating && (
                  <MapOverlay id="locate">
                    <View style={styles.locateWrap} pointerEvents="box-none">
                      <FeatureButton
                        icon="locate"
                        active={following}
                        activeColor={COLORS.teal}
                        loading={locating}
                        onPress={handleLocate}
                        accessibilityLabel="Go to my location"
                      />
                    </View>
                  </MapOverlay>
                )}
              </Map>
              </VintaCard>

              {/* Floating-map controls during navigation */}
              {isNavigating && (
                <View style={styles.navMapButtons} pointerEvents="box-none">
                  <TouchableOpacity
                    style={[styles.navMapBtn, following && styles.navMapBtnActive]}
                    onPress={() => setFollowing(true)}
                    accessibilityLabel="Follow my location"
                  >
                    <Ionicons name="locate" size={16} color={following ? '#FFFFFF' : COLORS.navy} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.navMapBtn}
                    onPress={() => setNavMapExpanded((v) => !v)}
                    accessibilityLabel={navMapExpanded ? 'Shrink map' : 'Expand map'}
                  >
                    <Ionicons name={navMapExpanded ? 'contract' : 'expand'} size={16} color={COLORS.navy} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Route banner */}
          <Animated.View
            pointerEvents={isNavigating ? 'none' : 'auto'}
            style={[styles.routeBanner, { transform: [{ translateY: routeBannerAnim }] }, isNavigating && styles.hidden]}
          >
            <View style={styles.routeBannerInner}>
              <View style={styles.routeBannerLeft}>
                <Ionicons name="navigate" size={16} color={COLORS.teal} />
                <Text style={styles.routeBannerDist}>{routeInfo?.distKm} km</Text>
                <View style={styles.routeBannerDivider} />
                <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.routeBannerTime}>{routeInfo?.mins} min</Text>
              </View>
              <TouchableOpacity onPress={clearRoute} style={styles.routeBannerClose}>
                <Text style={styles.routeBannerCloseText}>{isNavigating ? 'Exit' : 'Clear'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {toast}
        </View>

        {selectedSpot && !isNavigating && (
          <SpotDetailCard
            spot={selectedSpot}
            userLevel={userLevel}
            userXp={userXp}
            routing={routing}
            routeInfo={routeInfo}
            translateY={cardAnim}
            bottomInset={insets.bottom}
            onClose={closeCard}
            onDirections={handleDirections}
          />
        )}

        <ErrorModal
          visible={errorModal.visible}
          type={errorModal.type}
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => setErrorModal((prev) => ({ ...prev, visible: false }))}
          onConfirm={undefined}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BG_OVERLAY },
  container: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: 'rgba(8,20,60,0.72)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(99,179,237,0.22)',
  },
  headerTitle: {
    fontFamily: FONTS.bold, fontSize: 20, color: '#fff', letterSpacing: 2,
    textShadowColor: `${COLORS.accent}88`, textShadowRadius: 6,
  },
  headerSubtitle: { fontFamily: FONTS.medium, fontSize: 10, color: 'rgba(191,215,255,0.65)', marginTop: 2 },
  headerLevelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.18)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.45)',
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
  },
  headerLevelText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold, letterSpacing: 0.8 },

  mapContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
  fullMap: { flex: 1 },
  mapFrame: { flex: 1 },
  mapFrameInner: { flex: 1 },
  navFloatingMap: {
    position: 'absolute',
    right: 16,
    elevation: 20,
    zIndex: 9999,
  },
  navMapButtons: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 8,
  },
  navMapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  navMapBtnActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  hidden: { opacity: 0 },

  topOverlay: { position: 'absolute', top: 12, left: 0, right: 0 },
  toolColumn: { position: 'absolute', top: 60, right: 14, gap: 10, alignItems: 'center' },
  toolSpacer: { height: 4 },
  locateWrap: { position: 'absolute', right: 14, bottom: 28 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  loadingText: { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: 'rgba(191,215,255,0.7)', marginTop: SPACING.sm },
  errorText: { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: 'rgba(191,215,255,0.7)', marginTop: SPACING.sm, textAlign: 'center' },

  routeBanner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    elevation: 6, zIndex: 50,
  },
  routeBannerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeBannerDist: { fontFamily: FONTS.bold, fontSize: 13, color: '#059669' },
  routeBannerDivider: { width: 1, height: 12, backgroundColor: COLORS.border, marginHorizontal: 4 },
  routeBannerTime: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textMuted },
  routeBannerClose: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: COLORS.accent, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.accentDark,
  },
  routeBannerCloseText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFFFFF' },
});
