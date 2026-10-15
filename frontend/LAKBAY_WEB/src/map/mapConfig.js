// Mirrors LAKBAY_MOBILE/src/constants/mapConfig.ts so both maps look the same.

// Mapbox order is [longitude, latitude].
export const ZAMBOANGA_CENTER = [122.079, 6.9214];
export const DEFAULT_ZOOM = 12;

// Real extent of the 98 barangays in zamboanga-city-barangays.json: [minLng, minLat, maxLng, maxLat]
export const ZAMBOANGA_BBOX = [121.89, 6.85, 122.4, 7.52];

export const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

// Glyph stack available in both streets-v12 and dark-v11.
export const MAP_FONT = ['DIN Pro Medium', 'Arial Unicode MS Regular'];

export const SPOT_TYPES = {
  qr:        { label: 'QR SPOT',    shortLabel: 'QR Scan',    color: '#1A56DB' },
  ar:        { label: 'AR EXHIBIT', shortLabel: 'AR Exhibit', color: '#10B981' },
  catch:     { label: 'CATCH ZONE', shortLabel: 'Catch Zone', color: '#FBBF24' },
  promotion: { label: 'PROMOTION',  shortLabel: 'Promotion',  color: '#EC4899' },
};

export const SPOT_TYPE_ORDER = ['qr', 'ar', 'catch', 'promotion'];

export const CAMERA = {
  flyDuration: 1000,
  zoomStepDuration: 300,
  tiltPitch: 60,
  tiltDuration: 1000,
  rotateStepDegrees: 90,
  rotateIntervalMs: 2000,
  locateZoom: 16,
  selectZoom: 15,
};

// Icon glyphs (24×24 viewBox), drawn white inside the coloured pin.
export const TYPE_ICON_PATHS = {
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" fill="currentColor" stroke="none"/><rect x="18" y="18" width="3" height="3" fill="currentColor" stroke="none"/><rect x="14" y="18" width="3" height="3" fill="currentColor" stroke="none"/>',
  ar: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/>',
  catch: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/>',
  promotion: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" fill="currentColor"/>',
};
