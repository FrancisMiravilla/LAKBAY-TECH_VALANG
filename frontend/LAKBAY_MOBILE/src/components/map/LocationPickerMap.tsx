import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, FONTS } from '../../constants/theme';
import { CAMERA, ZAMBOANGA_CENTER, type LngLat } from '../../constants/mapConfig';
import { useMapSpots } from '../../hooks/useMapSpots';
import { Map, MapOverlay, useMap, type MapTheme } from './Map';
import { BarangayLayer, barangayAt } from './BarangayLayer';
import { MapMarker, MapUserLocation } from './MapLayers';
import { FeatureButton, ZoomControls } from './MapControls';
import { MapSearchBar, type SearchResult } from './MapSearchBar';
import { SpotsLayer, buildSpotFeatures } from './SpotsLayer';

export interface PickedLocation {
  lat: number;
  lng: number;
}

interface LocationPickerMapProps {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
}

function FlyTo({ target }: { target: { coordinate: LngLat; zoom: number; key: number } | null }) {
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

/**
 * The Explore map (same style, spots, barangays and search) used to pin a location:
 * tap the map or pick a search result to drop the red pin.
 */
export function LocationPickerMap({ value, onChange }: LocationPickerMapProps) {
  const { spots, profile } = useMapSpots();
  const userLevel = Math.floor((profile?.xp ?? 0) / 100) + 1;
  const spotShape = useMemo(() => buildSpotFeatures(spots, userLevel), [spots, userLevel]);

  const [theme, setTheme] = useState<MapTheme>('system');
  const [barangaysOn, setBarangaysOn] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ coordinate: LngLat; zoom: number; key: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const featurePressRef = useRef(false);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const initialCenter = useRef<LngLat>(value ? [value.lng, value.lat] : ZAMBOANGA_CENTER).current;
  const pin: LngLat | null = value ? [value.lng, value.lat] : null;
  const barangay = pin ? barangayAt(pin) : null;

  const handleMapPress = useCallback(
    (feature: GeoJSON.Feature<GeoJSON.Point>) => {
      if (featurePressRef.current) {
        featurePressRef.current = false;
        return;
      }
      const [lng, lat] = feature.geometry.coordinates;
      onChange({ lat, lng });
    },
    [onChange],
  );

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      setSearchOpen(false);
      const coordinate: LngLat = result.kind === 'spot'
        ? [result.spot.longitude, result.spot.latitude]
        : result.coordinate;
      setFlyTarget({ coordinate, zoom: 16, key: Date.now() });
      if (result.kind === 'place') onChange({ lat: coordinate[1], lng: coordinate[0] });
    },
    [onChange],
  );

  // Same flow as the Map screen's locate button: fly to the user and show the blue dot.
  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setNotice('Location permission is needed to find you on the map.');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setNotice('Turn on Location services (GPS) on your phone.');
        return;
      }
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 60000 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
      setShowUser(true);
      setFlyTarget({ coordinate: [pos.coords.longitude, pos.coords.latitude], zoom: CAMERA.locateZoom, key: Date.now() });
    } catch {
      setNotice('Could not get your location. Try again outside.');
    } finally {
      setLocating(false);
    }
  }, []);

  const cycleTheme = useCallback(
    () => setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system')),
    [],
  );

  return (
    <Map center={initialCenter} zoom={value ? 16 : 12} theme={theme} onPress={handleMapPress}>
      {barangaysOn && <BarangayLayer spots={spots} />}
      <SpotsLayer shape={spotShape} selectedId={null} onSpotPress={() => {}} featurePressRef={featurePressRef} />
      {showUser && <MapUserLocation />}
      {pin && <MapMarker id="lakbay-picked-location" coordinate={pin} label="Your spot" icon="location" color="#EF4444" />}
      <FlyTo target={flyTarget} />

      <MapOverlay id="picker-top">
        <View style={styles.top} pointerEvents="box-none">
          {searchOpen ? (
            <MapSearchBar spots={spots} onSelect={handleSearchSelect} onClose={() => setSearchOpen(false)} />
          ) : (
            <View style={styles.hint} pointerEvents="none">
              <Ionicons
                name={notice ? 'alert-circle' : pin ? 'location' : 'hand-left-outline'}
                size={14}
                color={notice ? '#D97706' : pin ? '#EF4444' : COLORS.accent}
              />
              <Text style={styles.hintText} numberOfLines={2}>
                {notice ?? pin
                  ? barangay ? `Barangay ${barangay}` : 'Outside Zamboanga City barangays'
                  : 'Tap the map or search to pin your spot'}
              </Text>
            </View>
          )}
        </View>
      </MapOverlay>

      {!searchOpen && (
        <MapOverlay id="picker-tools">
          <View style={styles.tools} pointerEvents="box-none">
            <FeatureButton icon="search" onPress={() => setSearchOpen(true)} accessibilityLabel="Search" />
            <FeatureButton
              icon={theme === 'dark' ? 'moon' : theme === 'light' ? 'sunny' : 'contrast'}
              active={theme !== 'system'}
              activeColor="#38BDF8"
              onPress={cycleTheme}
              accessibilityLabel="Map theme"
            />
            <FeatureButton
              icon="map-outline"
              active={barangaysOn}
              activeColor="#38BDF8"
              onPress={() => setBarangaysOn((v) => !v)}
              accessibilityLabel="Barangay boundaries"
            />
            <ZoomControls />
            <FeatureButton
              icon="locate"
              loading={locating}
              onPress={handleLocate}
              accessibilityLabel="Go to my location"
            />
          </View>
        </MapOverlay>
      )}
    </Map>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 12, left: 0, right: 0 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 6,
  },
  hintText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.navy, flexShrink: 1 },
  tools: { position: 'absolute', top: 64, right: 14, gap: 10, alignItems: 'center' },
});
