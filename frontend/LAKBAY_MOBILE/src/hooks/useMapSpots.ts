import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getSpots, ORIGIN } from '../api/qrService';
import { getPublishedPromotions } from '../api/promotionService';
import { authService } from '../api/authService';
import type { SpotType } from '../constants/mapConfig';

// Field names stay snake_case because ARNavigationOverlay reads them directly.
export interface MapSpot {
  id: string;
  source_id: number;
  kind: 'spot' | 'promotion';
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  location_name: string;
  feature_types: SpotType[];
  primary_type: SpotType;
  required_level: number;
  xp_reward: number;
  model_3d: string | null;
  image: string | null;
}

export interface MapProfile {
  xp: number;
}

type RawRecord = Record<string, unknown>;

const SPOT_TYPES: readonly SpotType[] = ['qr', 'ar', 'catch', 'promotion'];

const isRecord = (v: unknown): v is RawRecord => typeof v === 'object' && v !== null;

const asList = (data: unknown): RawRecord[] => {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data) && Array.isArray(data.results)) return data.results.filter(isRecord);
  return [];
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

export const resolveMediaUrl = (v: unknown): string | null => {
  const raw = str(v);
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('http')) return raw.replace(/^http:\/\//, 'https://');
  return `${ORIGIN}${raw}`;
};

const parseFeatureTypes = (v: unknown): SpotType[] => {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  return list
    .map((t) => String(t).trim().toLowerCase())
    .filter((t): t is SpotType => (SPOT_TYPES as readonly string[]).includes(t));
};

function normalizeSpot(raw: RawRecord): MapSpot | null {
  const latitude = num(raw.latitude, NaN);
  const longitude = num(raw.longitude, NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const types = parseFeatureTypes(raw.feature_types);
  const featureTypes: SpotType[] = types.length ? types : ['qr'];
  const sourceId = num(raw.id, 0);
  return {
    id: `spot-${sourceId}`,
    source_id: sourceId,
    kind: 'spot',
    name: str(raw.name) || 'Unnamed spot',
    description: str(raw.description),
    latitude,
    longitude,
    location_name: str(raw.location_name),
    feature_types: featureTypes,
    primary_type: featureTypes[0],
    required_level: Math.max(1, num(raw.required_level, 1)),
    xp_reward: num(raw.xp_reward, 50),
    model_3d: resolveMediaUrl(raw.model_3d),
    image: resolveMediaUrl(raw.image),
  };
}

function normalizePromotion(raw: RawRecord): MapSpot | null {
  const latitude = num(raw.latitude, NaN);
  const longitude = num(raw.longitude, NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const sourceId = num(raw.id, 0);
  return {
    id: `promo-${sourceId}`,
    source_id: sourceId,
    kind: 'promotion',
    name: str(raw.spot_name) || 'Promotion',
    description: str(raw.description),
    latitude,
    longitude,
    location_name: 'User Promotion',
    feature_types: ['promotion'],
    primary_type: 'promotion',
    required_level: 1,
    xp_reward: 50,
    model_3d: resolveMediaUrl(raw.model_3d_file),
    image: resolveMediaUrl(raw.image_file),
  };
}

export function useMapSpots() {
  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [profile, setProfile] = useState<MapProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    try {
      const [spotsData, promosData, profileData]: unknown[] = await Promise.all([
        getSpots(),
        getPublishedPromotions().catch(() => []),
        authService.getProfile().catch(() => null),
      ]);
      const next = [
        ...asList(spotsData).map(normalizeSpot),
        ...asList(promosData).map(normalizePromotion),
      ].filter((s): s is MapSpot => s !== null);
      setSpots(next);
      if (isRecord(profileData)) setProfile({ xp: num(profileData.xp, 0) });
      setError(null);
      hasLoaded.current = true;
    } catch {
      // Keep showing the last good data on a failed refresh.
      if (!hasLoaded.current) setError('Could not load map spots. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever the screen gains focus instead of polling: spots change rarely,
  // while the user's level changes after quests on other screens.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { spots, profile, loading, error, refresh: load };
}
