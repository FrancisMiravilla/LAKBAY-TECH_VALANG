import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import { SPOT_TYPES, ZAMBOANGA_BBOX, type LngLat } from '../../constants/mapConfig';
import type { MapSpot } from '../../hooks/useMapSpots';
import { isInsideZamboanga, parseCoordinates } from '../../utils/geo';

export type SearchResult =
  | { kind: 'spot'; key: string; spot: MapSpot }
  | { kind: 'place'; key: string; name: string; subtitle: string; coordinate: LngLat; outside: boolean };

interface GeocodeFeature {
  id: string;
  text: string;
  place_name: string;
  center: LngLat;
}

const DEBOUNCE_MS = 350;
const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

const isGeocodeFeature = (v: unknown): v is GeocodeFeature => {
  if (typeof v !== 'object' || v === null) return false;
  const f = v as Record<string, unknown>;
  return typeof f.id === 'string' && typeof f.place_name === 'string' && Array.isArray(f.center);
};

interface MapSearchBarProps {
  spots: MapSpot[];
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}

function MapSearchBarBase({ spots, onSelect, onClose }: MapSearchBarProps) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const coordinate = useMemo(() => parseCoordinates(trimmed), [trimmed]);

  // Own spots first: instant, offline, no API call.
  const spotResults = useMemo<SearchResult[]>(() => {
    if (trimmed.length < 2 || coordinate) return [];
    const q = trimmed.toLowerCase();
    return spots
      .filter((s) => s.name.toLowerCase().includes(q) || s.location_name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((spot) => ({ kind: 'spot', key: spot.id, spot }));
  }, [spots, trimmed, coordinate]);

  useEffect(() => {
    abortRef.current?.abort();
    if (trimmed.length < 3 || coordinate || !TOKEN) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json` +
          `?bbox=${ZAMBOANGA_BBOX.join(',')}&limit=5&country=ph&access_token=${TOKEN}`;
        const res = await fetch(url, { signal: controller.signal });
        const json: unknown = await res.json();
        const features =
          typeof json === 'object' && json !== null && Array.isArray((json as { features?: unknown }).features)
            ? ((json as { features: unknown[] }).features.filter(isGeocodeFeature))
            : [];
        setPlaces(
          features.map((f) => ({
            kind: 'place',
            key: f.id,
            name: f.text,
            subtitle: f.place_name,
            coordinate: f.center,
            outside: false,
          })),
        );
      } catch {
        if (!controller.signal.aborted) setPlaces([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, coordinate]);

  const results = useMemo<SearchResult[]>(() => {
    if (coordinate) {
      const outside = !isInsideZamboanga(coordinate);
      return [{
        kind: 'place',
        key: 'coordinate',
        name: `${coordinate[1].toFixed(5)}, ${coordinate[0].toFixed(5)}`,
        subtitle: outside ? 'Outside Zamboanga City' : 'Pasted coordinates',
        coordinate,
        outside,
      }];
    }
    return [...spotResults, ...places];
  }, [coordinate, spotResults, places]);

  const pick = (result: SearchResult) => {
    Keyboard.dismiss();
    onSelect(result);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search spots, places or 6.92, 122.08"
          placeholderTextColor={COLORS.textFaint}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={COLORS.accent} />}
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Close search">
          <Ionicons name="close" size={20} color={COLORS.navy} />
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={(r) => r.key}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSpot = item.kind === 'spot';
            const color = isSpot ? SPOT_TYPES[item.spot.primary_type].color : item.outside ? '#EF4444' : '#38BDF8';
            return (
              <TouchableOpacity style={styles.row} onPress={() => pick(item)}>
                <View style={[styles.rowIcon, { backgroundColor: color }]}>
                  <Ionicons
                    name={isSpot ? SPOT_TYPES[item.spot.primary_type].icon : item.outside ? 'alert' : 'location-outline'}
                    size={13}
                    color="#fff"
                  />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{isSpot ? item.spot.name : item.name}</Text>
                  <Text style={[styles.rowSub, !isSpot && item.outside && styles.rowSubWarn]} numberOfLines={1}>
                    {isSpot ? `LAKBAY spot · ${item.spot.location_name || SPOT_TYPES[item.spot.primary_type].shortLabel}` : item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

export const MapSearchBar = memo(MapSearchBarBase);

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 14 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    elevation: 8,
  },
  input: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text, paddingVertical: 0 },
  list: {
    marginTop: 6,
    maxHeight: 280,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  rowIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.navy },
  rowSub: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  rowSubWarn: { color: '#DC2626', fontFamily: FONTS.semiBold },
});
