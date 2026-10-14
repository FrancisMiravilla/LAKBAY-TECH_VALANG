import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];
export type LngLat = [number, number];

export type SpotType = 'qr' | 'ar' | 'catch' | 'promotion';

// Mapbox order is [longitude, latitude].
export const ZAMBOANGA_CENTER: LngLat = [122.079, 6.9214];
export const DEFAULT_ZOOM = 12;

// Real extent of the 98 barangays in assets/data/zamboanga-city-barangays.json.
// [minLng, minLat, maxLng, maxLat]
export const ZAMBOANGA_BBOX: [number, number, number, number] = [121.89, 6.85, 122.4, 7.52];

export const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const;

// Glyph stack available in both streets-v12 and dark-v11.
export const MAP_FONT = ['DIN Pro Medium', 'Arial Unicode MS Regular'];

export const LOCKED_COLOR = '#EF4444';

export interface SpotTypeConfig {
  label: string;
  shortLabel: string;
  icon: IoniconName;
  color: string;
  bg: string;
  border: string;
}

export const SPOT_TYPES: Record<SpotType, SpotTypeConfig> = {
  qr: {
    label: 'QR SPOT', shortLabel: 'QR Scan', icon: 'qr-code-outline',
    color: '#1A56DB', bg: 'rgba(56,189,248,0.18)', border: 'rgba(56,189,248,0.45)',
  },
  ar: {
    label: 'AR EXHIBIT', shortLabel: 'AR Exhibit', icon: 'cube-outline',
    color: '#10B981', bg: 'rgba(16,185,129,0.18)', border: 'rgba(52,211,153,0.45)',
  },
  catch: {
    label: 'CATCH ZONE', shortLabel: 'Catch Zone', icon: 'trophy-outline',
    color: '#FBBF24', bg: 'rgba(251,191,36,0.18)', border: 'rgba(251,191,36,0.45)',
  },
  promotion: {
    label: 'PROMOTION', shortLabel: 'Promotion', icon: 'star-outline',
    color: '#EC4899', bg: 'rgba(236,72,153,0.18)', border: 'rgba(244,114,182,0.45)',
  },
};

export const SPOT_TYPE_ORDER: SpotType[] = ['qr', 'ar', 'catch', 'promotion'];

export const PROXIMITY_RADIUS_M = 50;

export const CAMERA = {
  flyDuration: 1000,
  zoomStepDuration: 300,
  tiltPitch: 60,
  tiltDuration: 1000,
  rotateStepDegrees: 90,
  rotateIntervalMs: 2000,
  locateZoom: 16,
  navZoom: 18,
} as const;
