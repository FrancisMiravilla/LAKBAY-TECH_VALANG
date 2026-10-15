import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  Box, Contrast, LoaderCircle, LocateFixed, Map as MapIcon, MapPin, Minus, Moon, Plus,
  QrCode, RotateCw, Search, Star, Sun, Trophy, X,
} from 'lucide-react';
import qrService from '../api/qrService';
import { promotionService } from '../api/promotionService';
import barangayData from './zamboanga-city-barangays.json';
import {
  CAMERA, DEFAULT_ZOOM, MAP_FONT, MAP_STYLES, SPOT_TYPES, SPOT_TYPE_ORDER,
  TYPE_ICON_PATHS, ZAMBOANGA_BBOX, ZAMBOANGA_CENTER,
} from './mapConfig';
import { isInsideZamboanga, parseCoordinates, pointInPolygon, polygonLabelPoint } from './geo';
import './LakbayMap.css';

// Web version of the mobile Explore map (LAKBAY_MOBILE/src/screens/MapScreen.tsx):
// same pins, clusters, category chips, search, barangays, theme and 3D tilt.

const CHIP_ICONS = { qr: QrCode, ar: Box, catch: Trophy, promotion: Star };

const THEME_CYCLE = {
  system: { next: 'dark', Icon: Contrast, label: 'Map theme: follow dashboard' },
  dark: { next: 'light', Icon: Moon, label: 'Map theme: dark' },
  light: { next: 'system', Icon: Sun, label: 'Map theme: light' },
};

const BARANGAY_LAYERS = ['lakbay-barangay-fill', 'lakbay-barangay-line', 'lakbay-barangay-label'];

// ─── Data helpers ────────────────────────────────────────────────────────────
const num = (v, fallback) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const asList = (data) => (Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);

const parseTypes = (v) => {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  return list.map((t) => String(t).trim().toLowerCase()).filter((t) => SPOT_TYPE_ORDER.includes(t));
};

function toMapSpot(raw) {
  const latitude = num(raw.latitude, NaN);
  const longitude = num(raw.longitude, NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const types = parseTypes(raw.feature_types);
  const featureTypes = types.length ? types : ['qr'];
  return {
    id: `spot-${raw.id}`,
    sourceId: raw.id,
    kind: 'spot',
    name: raw.name || 'Unnamed spot',
    description: raw.description || '',
    location_name: raw.location_name || '',
    latitude,
    longitude,
    feature_types: featureTypes,
    primary_type: featureTypes[0],
    required_level: Math.max(1, num(raw.required_level, 1)),
    model_3d: qrService.getMediaUrl(raw.model_3d),
    image: null,
  };
}

function toMapPromo(raw) {
  const latitude = num(raw.latitude, NaN);
  const longitude = num(raw.longitude, NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    id: `promo-${raw.id}`,
    sourceId: raw.id,
    kind: 'promotion',
    name: raw.spot_name || 'Promotion',
    description: raw.description || '',
    location_name: 'User Promotion',
    latitude,
    longitude,
    feature_types: ['promotion'],
    primary_type: 'promotion',
    required_level: 1,
    model_3d: qrService.getMediaUrl(raw.model_3d_file),
    image: qrService.getMediaUrl(raw.image_file),
  };
}

// Same matching the mobile Catch screen uses: icon named in the spot's name, then in its
// description, else the first icon.
function matchCatchModel(spot, icons) {
  if (!icons.length) return null;
  const name = spot.name.toLowerCase();
  const desc = spot.description.toLowerCase();
  const hit = icons.find((i) => name.includes(i.name.toLowerCase()))
    || icons.find((i) => desc.includes(i.name.toLowerCase()))
    || icons[0];
  return hit.model;
}

function buildSpotFeatures(spots) {
  return {
    type: 'FeatureCollection',
    features: spots.map((spot) => {
      const typeLabel = SPOT_TYPES[spot.primary_type].shortLabel.split(' ')[0].toUpperCase();
      const model = spot.primary_type === 'catch' && spot.model_3d ? spot.model_3d : '';
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [spot.longitude, spot.latitude] },
        properties: {
          id: spot.id,
          color: SPOT_TYPES[spot.primary_type].color,
          label: spot.required_level > 1 ? `${typeLabel} · L${spot.required_level}` : typeLabel,
          icon: `lakbay-pin-${spot.primary_type}`,
          model,
          hasModel: model !== '',
        },
      };
    }),
  };
}

const BARANGAYS = barangayData;
const LABEL_POINTS = BARANGAYS.features.map((f) => ({
  psgc: f.properties.psgc_code,
  name: f.properties.name,
  point: polygonLabelPoint(f.geometry),
}));

function buildBarangayLabels(spots) {
  const counts = {};
  for (const spot of spots) {
    const hit = BARANGAYS.features.find((f) => pointInPolygon([spot.longitude, spot.latitude], f.geometry));
    if (hit) counts[hit.properties.psgc_code] = (counts[hit.properties.psgc_code] ?? 0) + 1;
  }
  return {
    type: 'FeatureCollection',
    features: LABEL_POINTS.map(({ psgc, name, point }) => {
      const count = counts[psgc] ?? 0;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: point },
        properties: { name, count, countText: count === 0 ? '' : `${count} spot${count === 1 ? '' : 's'}` },
      };
    }),
  };
}

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ─── Pin artwork (rendered once into map images, like the mobile native symbols) ─
function pinSvg(type) {
  const iconColor = type === 'catch' ? '#0C2461' : '#FFFFFF';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 44 44">
<circle cx="22" cy="22" r="18" fill="${SPOT_TYPES[type].color}" stroke="#FFFFFF" stroke-width="3"/>
<svg x="13" y="13" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" color="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${TYPE_ICON_PATHS[type]}</svg>
</svg>`;
}

let pinImagesPromise = null;
function loadPinImages() {
  if (!pinImagesPromise) {
    pinImagesPromise = Promise.all(SPOT_TYPE_ORDER.map((type) => new Promise((resolve, reject) => {
      const img = new Image(88, 88);
      img.onload = () => resolve([`lakbay-pin-${type}`, img]);
      img.onerror = reject;
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg(type))}`;
    })));
  }
  return pinImagesPromise;
}

// ─── Layers (re-added after every style change) ──────────────────────────────
function installLayers(map, images, state) {
  const { pinShape, labelShape, barangaysOn, tiltOn, selectedKey, dark } = state;
  if (map.getSource('lakbay-spots')) return;

  images.forEach(([name, img]) => {
    if (!map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 });
  });

  const tint = dark ? '#38BDF8' : '#1A56DB';
  const barangayVisibility = barangaysOn ? 'visible' : 'none';
  map.addSource('lakbay-barangays', { type: 'geojson', data: BARANGAYS });
  map.addLayer({ id: 'lakbay-barangay-fill', type: 'fill', source: 'lakbay-barangays', layout: { visibility: barangayVisibility }, paint: { 'fill-color': tint, 'fill-opacity': 0.12 } });
  map.addLayer({
    id: 'lakbay-barangay-line', type: 'line', source: 'lakbay-barangays', layout: { visibility: barangayVisibility },
    paint: { 'line-color': tint, 'line-opacity': 0.7, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 16, 2] },
  });
  map.addSource('lakbay-barangay-labels', { type: 'geojson', data: labelShape });
  map.addLayer({
    id: 'lakbay-barangay-label', type: 'symbol', source: 'lakbay-barangay-labels', minzoom: 11.5,
    layout: {
      visibility: barangayVisibility,
      'text-field': ['format', ['get', 'name'], { 'font-scale': 1 }, '\n', {}, ['get', 'countText'], { 'font-scale': 0.85, 'text-color': '#F59E0B' }],
      'text-font': MAP_FONT,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11.5, 9, 15, 13],
      'text-max-width': 8,
      'text-optional': true,
    },
    paint: { 'text-color': dark ? '#E2E8F0' : '#0C2461', 'text-halo-color': dark ? 'rgba(4,10,38,0.85)' : 'rgba(255,255,255,0.9)', 'text-halo-width': 1.5 },
  });

  if (map.getSource('composite')) {
    map.addLayer({
      id: 'lakbay-3d-buildings', type: 'fill-extrusion', source: 'composite', 'source-layer': 'building',
      filter: ['==', ['get', 'extrude'], 'true'], minzoom: 14,
      layout: { visibility: tiltOn ? 'visible' : 'none' },
      paint: {
        'fill-extrusion-color': dark ? '#1E293B' : '#CBD5E1',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.7,
      },
    });
  }

  map.addSource('lakbay-spots', { type: 'geojson', data: pinShape, cluster: true, clusterRadius: 44, clusterMaxZoom: 12 });
  map.addLayer({
    id: 'lakbay-spot-clusters', type: 'circle', source: 'lakbay-spots', filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#0C2461',
      'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 15, 26],
      'circle-stroke-color': '#FBBF24',
      'circle-stroke-width': 2.5,
      'circle-opacity': 0.92,
    },
  });
  map.addLayer({
    id: 'lakbay-spot-cluster-count', type: 'symbol', source: 'lakbay-spots', filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': MAP_FONT, 'text-size': 13, 'text-allow-overlap': true, 'text-ignore-placement': true },
    paint: { 'text-color': '#FBBF24' },
  });
  map.addLayer({
    id: 'lakbay-spot-selected', type: 'circle', source: 'lakbay-spots',
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedKey]],
    paint: { 'circle-color': '#FFFFFF', 'circle-opacity': 0.45, 'circle-radius': 26 },
  });
  map.addLayer({
    id: 'lakbay-spot-pins', type: 'symbol', source: 'lakbay-spots', filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': ['get', 'icon'],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.75, 15, 1, 18, 1.15],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-pitch-alignment': 'viewport',
    },
  });
  map.addLayer({
    id: 'lakbay-spot-labels', type: 'symbol', source: 'lakbay-spots', filter: ['!', ['has', 'point_count']], minzoom: 13,
    layout: { 'text-field': ['get', 'label'], 'text-font': MAP_FONT, 'text-size': 10, 'text-offset': [0, 2.1], 'text-anchor': 'top', 'text-optional': true },
    paint: { 'text-color': '#FFFFFF', 'text-halo-color': ['get', 'color'], 'text-halo-width': 2 },
  });
}

// ─── Search (own spots → Mapbox places in Zamboanga → pasted coordinates) ────
function MapSearch({ spots, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const trimmed = query.trim();
  const coordinate = useMemo(() => parseCoordinates(trimmed), [trimmed]);

  const spotResults = useMemo(() => {
    if (trimmed.length < 2 || coordinate) return [];
    const q = trimmed.toLowerCase();
    return spots
      .filter((s) => s.name.toLowerCase().includes(q) || s.location_name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((spot) => ({ kind: 'spot', key: spot.id, spot }));
  }, [spots, trimmed, coordinate]);

  // Barangays come from the local boundary file, so they always match (Mapbox rarely indexes them).
  const barangayResults = useMemo(() => {
    if (trimmed.length < 2 || coordinate) return [];
    const q = trimmed.toLowerCase();
    return LABEL_POINTS
      .filter((b) => b.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q))
      .slice(0, 4)
      .map((b) => ({
        kind: 'place', key: `brgy-${b.psgc}`, name: `Barangay ${b.name}`, subtitle: 'Barangay · Zamboanga City',
        coordinate: b.point, outside: false, zoom: CAMERA.selectZoom - 1,
      }));
  }, [trimmed, coordinate]);

  const canGeocode = trimmed.length >= 3 && !coordinate && Boolean(mapboxgl.accessToken);

  useEffect(() => {
    if (!canGeocode) return undefined;
    const token = mapboxgl.accessToken;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json`
          + `?bbox=${ZAMBOANGA_BBOX.join(',')}&limit=5&country=ph&access_token=${token}`;
        const res = await fetch(url, { signal: controller.signal });
        const json = await res.json();
        setPlaces(asList(json.features).map((f) => ({
          kind: 'place', key: f.id, name: f.text, subtitle: f.place_name, coordinate: f.center, outside: false,
        })));
      } catch {
        if (!controller.signal.aborted) setPlaces([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, canGeocode]);

  const results = useMemo(() => {
    if (coordinate) {
      const outside = !isInsideZamboanga(coordinate);
      return [{
        kind: 'place', key: 'coordinate',
        name: `${coordinate[1].toFixed(5)}, ${coordinate[0].toFixed(5)}`,
        subtitle: outside ? 'Outside Zamboanga City' : 'Pasted coordinates',
        coordinate, outside,
      }];
    }
    return [...spotResults, ...barangayResults, ...(canGeocode ? places : [])];
  }, [coordinate, spotResults, barangayResults, places, canGeocode]);

  return (
    <div className="lk-search">
      <div className="lk-search-bar">
        <Search size={17} color="#64748B" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && results[0]) onSelect(results[0]);
          }}
          placeholder="Search spots, barangays, places or 6.92, 122.08"
        />
        {canGeocode && loading && <LoaderCircle size={16} className="lk-spin" color="#1A56DB" />}
        <button type="button" className="lk-icon-btn" onClick={onClose} aria-label="Close search"><X size={18} /></button>
      </div>
      {results.length > 0 && (
        <ul className="lk-search-list">
          {results.map((r) => {
            const isSpot = r.kind === 'spot';
            const color = isSpot ? SPOT_TYPES[r.spot.primary_type].color : r.outside ? '#EF4444' : '#38BDF8';
            const Icon = isSpot ? CHIP_ICONS[r.spot.primary_type] : MapPin;
            return (
              <li key={r.key}>
                <button type="button" className="lk-search-row" onClick={() => onSelect(r)}>
                  <span className="lk-search-icon" style={{ background: color }}><Icon size={12} color="#fff" /></span>
                  <span className="lk-search-text">
                    <strong>{isSpot ? r.spot.name : r.name}</strong>
                    <small className={!isSpot && r.outside ? 'lk-warn' : ''}>
                      {isSpot ? `LAKBAY spot · ${r.spot.location_name || SPOT_TYPES[r.spot.primary_type].shortLabel}` : r.subtitle}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ToolButton({ icon: Icon, active = false, activeColor = '#FBBF24', onClick, label, loading = false }) {
  return (
    <button
      type="button"
      className={`lk-tool ${active ? 'is-active' : ''}`}
      style={active ? { background: activeColor, borderColor: activeColor } : undefined}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {loading ? <LoaderCircle size={19} className="lk-spin" /> : <Icon size={19} />}
    </button>
  );
}

// ─── Map ─────────────────────────────────────────────────────────────────────
/**
 * @param {object[]} spots          admin spots (normalized by App.jsx)
 * @param {object[]} catchIcons     Catch icons, used as fallback models for Catch spots
 * @param {'light'|'dark'} appTheme dashboard theme ("system" map theme follows it)
 * @param {number|null} selectedSpotId
 * @param {(id: number|null) => void} onSelectSpot
 * @param {[number, number]|null} pickedLocation  picker mode: current [lng, lat] pin
 * @param {(coord: [number, number]) => void} onPickLocation  picker mode: map click, pin drag or search result
 */
export default function LakbayMap({
  spots, catchIcons = [], appTheme = 'light', selectedSpotId = null, onSelectSpot,
  pickedLocation = null, onPickLocation,
}) {
  const pickerMode = typeof onPickLocation === 'function';
  const pickRef = useRef(onPickLocation);
  useLayoutEffect(() => {
    pickRef.current = onPickLocation;
  });
  const pickMarkerRef = useRef(null);
  const centerOnPickRef = useRef(pickedLocation != null);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const imagesRef = useRef([]);
  const styleUrlRef = useRef(null);
  const modelMarkersRef = useRef([]);
  const searchMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const popupRef = useRef(null);
  const headingRef = useRef(0);

  const [mapReady, setMapReady] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [mapTheme, setMapTheme] = useState('system');
  const [barangaysOn, setBarangaysOn] = useState(false);
  const [tiltOn, setTiltOn] = useState(false);
  const [rotateOn, setRotateOn] = useState(false);
  const [activeType, setActiveType] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [promoKey, setPromoKey] = useState(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState('');

  const dark = mapTheme === 'system' ? appTheme === 'dark' : mapTheme === 'dark';

  useEffect(() => {
    promotionService.getPublishedPromotions().then((data) => setPromotions(asList(data))).catch(() => setPromotions([]));
  }, []);

  const mapSpots = useMemo(() => {
    const icons = asList(catchIcons)
      .map((i) => ({ name: i.name || '', model: qrService.getMediaUrl(i.model_3d) || '' }))
      .filter((i) => i.name && i.model);
    return [...spots.map(toMapSpot), ...promotions.map(toMapPromo)]
      .filter(Boolean)
      .map((s) => (s.primary_type === 'catch' && !s.model_3d ? { ...s, model_3d: matchCatchModel(s, icons) } : s));
  }, [spots, promotions, catchIcons]);

  const filteredSpots = useMemo(
    () => (activeType ? mapSpots.filter((s) => s.feature_types.includes(activeType)) : mapSpots),
    [mapSpots, activeType],
  );
  const spotShape = useMemo(() => buildSpotFeatures(filteredSpots), [filteredSpots]);
  // Catch spots with a model get their own 3D marker, so they stay out of the clustered source.
  const pinShape = useMemo(() => ({ type: 'FeatureCollection', features: spotShape.features.filter((f) => !f.properties.hasModel) }), [spotShape]);
  const modelFeatures = useMemo(() => spotShape.features.filter((f) => f.properties.hasModel), [spotShape]);
  const labelShape = useMemo(() => buildBarangayLabels(mapSpots), [mapSpots]);

  const visibleCounts = useMemo(() => {
    const counts = { qr: 0, ar: 0, catch: 0, promotion: 0 };
    for (const spot of mapSpots) {
      if (bounds && !bounds.contains([spot.longitude, spot.latitude])) continue;
      for (const type of SPOT_TYPE_ORDER) if (spot.feature_types.includes(type)) counts[type] += 1;
    }
    return counts;
  }, [mapSpots, bounds]);

  const selectedKey = promoKey ?? (selectedSpotId != null ? `spot-${selectedSpotId}` : '');

  // Latest values for map callbacks registered once.
  const stateRef = useRef({});
  useLayoutEffect(() => {
    stateRef.current = { pinShape, labelShape, barangaysOn, tiltOn, selectedKey, dark, mapSpots };
  });

  const selectSpot = useCallback((id) => {
    const spot = stateRef.current.mapSpots.find((s) => s.id === id);
    if (!spot) return;
    if (spot.kind === 'promotion') {
      setPromoKey(spot.id);
      onSelectSpot?.(null);
    } else {
      setPromoKey(null);
      onSelectSpot?.(spot.sourceId);
    }
  }, [onSelectSpot]);
  const selectRef = useRef(selectSpot);
  useLayoutEffect(() => {
    selectRef.current = selectSpot;
  });

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let map = null;
    let observer = null;
    if (!mapboxgl.accessToken) mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
    loadPinImages().then((images) => {
      if (cancelled || !containerRef.current) return;
      imagesRef.current = images;
      const styleUrl = stateRef.current.dark ? MAP_STYLES.dark : MAP_STYLES.light;
      styleUrlRef.current = styleUrl;
      map = new mapboxgl.Map({ container: containerRef.current, style: styleUrl, center: ZAMBOANGA_CENTER, zoom: DEFAULT_ZOOM });
      mapRef.current = map;

      map.on('style.load', () => {
        installLayers(map, imagesRef.current, stateRef.current);
        setMapReady(true);
      });
      map.on('moveend', () => setBounds(map.getBounds()));
      map.on('load', () => setBounds(map.getBounds()));

      map.on('click', 'lakbay-spot-clusters', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        map.getSource('lakbay-spots').getClusterExpansionZoom(feature.properties.cluster_id, (err, zoom) => {
          if (err) return;
          map.easeTo({ center: feature.geometry.coordinates, zoom: zoom + 0.5, duration: 600 });
        });
      });
      map.on('click', 'lakbay-spot-pins', (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) selectRef.current(id);
      });
      map.on('click', (e) => {
        if (!pickRef.current) return;
        const layers = ['lakbay-spot-clusters', 'lakbay-spot-pins'].filter((id) => map.getLayer(id));
        if (layers.length && map.queryRenderedFeatures(e.point, { layers }).length) return;
        pickRef.current([e.lngLat.lng, e.lngLat.lat]);
      });
      ['lakbay-spot-clusters', 'lakbay-spot-pins'].forEach((layer) => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      });

      observer = new ResizeObserver(() => map.resize());
      observer.observe(containerRef.current);
    }).catch((err) => console.error('Map pin images failed to load', err));

    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Theme → swap style (layers are re-added on style.load).
  useEffect(() => {
    const map = mapRef.current;
    const url = dark ? MAP_STYLES.dark : MAP_STYLES.light;
    if (!map || !mapReady || styleUrlRef.current === url) return;
    styleUrlRef.current = url;
    map.setStyle(url, { diff: false });
  }, [dark, mapReady]);

  // Live data / toggles on the current style.
  useEffect(() => {
    mapRef.current?.getSource('lakbay-spots')?.setData(pinShape);
  }, [pinShape, mapReady]);

  useEffect(() => {
    mapRef.current?.getSource('lakbay-barangay-labels')?.setData(labelShape);
  }, [labelShape, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    BARANGAY_LAYERS.forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', barangaysOn ? 'visible' : 'none'));
  }, [barangaysOn, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer('lakbay-spot-selected')) {
      map.setFilter('lakbay-spot-selected', ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedKey]]);
    }
  }, [selectedKey, mapReady]);

  // 3D tilt + extruded buildings.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer('lakbay-3d-buildings')) map.setLayoutProperty('lakbay-3d-buildings', 'visibility', tiltOn ? 'visible' : 'none');
    map.easeTo({ pitch: tiltOn ? CAMERA.tiltPitch : 0, duration: CAMERA.tiltDuration });
  }, [tiltOn, mapReady]);

  // Auto-rotate: +90° every 2 s; reset heading when stopped.
  useEffect(() => {
    const map = mapRef.current;
    if (!rotateOn || !map) return undefined;
    const step = () => {
      headingRef.current = (headingRef.current + CAMERA.rotateStepDegrees) % 360;
      map.rotateTo(headingRef.current, { duration: CAMERA.rotateIntervalMs, easing: (t) => t });
    };
    step();
    const id = setInterval(step, CAMERA.rotateIntervalMs);
    return () => {
      clearInterval(id);
      headingRef.current = 0;
      map.rotateTo(0, { duration: CAMERA.tiltDuration });
    };
  }, [rotateOn]);

  // Catch spots: circle pin with the spot's own 3D model spinning inside.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return undefined;
    const markers = modelFeatures.map((f) => {
      const el = document.createElement('div');
      el.className = 'lk-model-pin';
      el.dataset.id = f.properties.id;
      const circle = document.createElement('div');
      circle.className = 'lk-model-circle';
      circle.style.background = f.properties.color;
      const mv = document.createElement('model-viewer');
      mv.setAttribute('src', f.properties.model);
      ['auto-rotate', 'disable-zoom', 'disable-pan', 'disable-tap'].forEach((a) => mv.setAttribute(a, ''));
      mv.setAttribute('rotation-per-second', '40deg');
      mv.setAttribute('interaction-prompt', 'none');
      mv.setAttribute('bounds', 'tight');
      mv.setAttribute('exposure', '1.1');
      mv.setAttribute('shadow-intensity', '0');
      circle.appendChild(mv);
      el.appendChild(circle);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectRef.current(f.properties.id);
      });
      return new mapboxgl.Marker({ element: el }).setLngLat(f.geometry.coordinates).addTo(map);
    });
    modelMarkersRef.current = markers;
    return () => markers.forEach((m) => m.remove());
  }, [modelFeatures, mapReady]);

  useEffect(() => {
    modelMarkersRef.current.forEach((m) => {
      const el = m.getElement();
      el.classList.toggle('is-selected', el.dataset.id === selectedKey);
    });
  }, [selectedKey, modelFeatures]);

  // Fly to the selected spot (from the map or the list beside it).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedKey) return;
    const spot = mapSpots.find((s) => s.id === selectedKey);
    if (!spot) return;
    map.flyTo({ center: [spot.longitude, spot.latitude], zoom: Math.max(map.getZoom(), CAMERA.selectZoom), duration: CAMERA.flyDuration });
  }, [selectedKey, mapReady, mapSpots]);

  // Picker mode: draggable pin at the chosen location.
  const pickedLng = pickedLocation?.[0];
  const pickedLat = pickedLocation?.[1];
  const hasPick = Number.isFinite(pickedLng) && Number.isFinite(pickedLat);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !pickerMode) return;
    if (!hasPick) {
      pickMarkerRef.current?.remove();
      pickMarkerRef.current = null;
      return;
    }
    if (!pickMarkerRef.current) {
      pickMarkerRef.current = new mapboxgl.Marker({ color: '#EF4444', draggable: true })
        .setLngLat([pickedLng, pickedLat])
        .addTo(map);
      pickMarkerRef.current.on('dragend', () => {
        const { lng, lat } = pickMarkerRef.current.getLngLat();
        pickRef.current?.([lng, lat]);
      });
      if (centerOnPickRef.current) {
        centerOnPickRef.current = false;
        map.jumpTo({ center: [pickedLng, pickedLat], zoom: Math.max(map.getZoom(), CAMERA.selectZoom) });
      }
    } else {
      pickMarkerRef.current.setLngLat([pickedLng, pickedLat]);
    }
  }, [pickerMode, hasPick, pickedLng, pickedLat, mapReady]);

  useEffect(() => () => pickMarkerRef.current?.remove(), []);

  // Promotions have no admin detail panel, so show a popup for them.
  useEffect(() => {
    popupRef.current?.remove();
    popupRef.current = null;
    const map = mapRef.current;
    if (!map || !promoKey) return;
    const promo = mapSpots.find((s) => s.id === promoKey);
    if (!promo) return;
    const img = promo.image ? `<img src="${escapeHtml(promo.image)}" alt="" class="lk-popup-img"/>` : '';
    popupRef.current = new mapboxgl.Popup({ offset: 24, maxWidth: '260px' })
      .setLngLat([promo.longitude, promo.latitude])
      .setHTML(`<div class="lk-popup">${img}<span class="lk-popup-tag">PROMOTION</span><strong>${escapeHtml(promo.name)}</strong><p>${escapeHtml(promo.description || 'No description.')}</p></div>`)
      .addTo(map);
    popupRef.current.on('close', () => setPromoKey((k) => (k === promo.id ? null : k)));
  }, [promoKey, mapSpots]);

  const handleSearchSelect = (result) => {
    setSearchOpen(false);
    if (result.kind === 'spot') {
      selectSpot(result.spot.id);
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    if (pickerMode) {
      onPickLocation(result.coordinate);
      map.flyTo({ center: result.coordinate, zoom: result.zoom ?? CAMERA.locateZoom, duration: CAMERA.flyDuration });
      return;
    }
    searchMarkerRef.current?.remove();
    searchMarkerRef.current = new mapboxgl.Marker({ color: '#EF4444' })
      .setLngLat(result.coordinate)
      .setPopup(new mapboxgl.Popup({ offset: 30 }).setText(result.name))
      .addTo(map);
    map.flyTo({ center: result.coordinate, zoom: result.zoom ?? CAMERA.locateZoom, duration: CAMERA.flyDuration });
  };

  const handleLocate = () => {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) {
      setNotice('Location is not available in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coord = [pos.coords.longitude, pos.coords.latitude];
        if (!userMarkerRef.current) {
          const el = document.createElement('div');
          el.className = 'lk-user-dot';
          userMarkerRef.current = new mapboxgl.Marker({ element: el });
        }
        userMarkerRef.current.setLngLat(coord).addTo(map);
        map.flyTo({ center: coord, zoom: CAMERA.locateZoom, duration: CAMERA.flyDuration });
      },
      () => {
        setLocating(false);
        setNotice('Could not get your location. Allow location access in the browser.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const ThemeIcon = THEME_CYCLE[mapTheme].Icon;

  return (
    <div className="lk-map">
      <div ref={containerRef} className="lk-map-canvas" />

      <div className="lk-top">
        {searchOpen ? (
          <MapSearch spots={mapSpots} onSelect={handleSearchSelect} onClose={() => setSearchOpen(false)} />
        ) : (
          <div className="lk-chips">
            {SPOT_TYPE_ORDER.map((type) => {
              const cfg = SPOT_TYPES[type];
              const Icon = CHIP_ICONS[type];
              const isActive = activeType === type;
              const dimmed = activeType !== null && !isActive;
              return (
                <button
                  key={type}
                  type="button"
                  className={`lk-chip ${dimmed ? 'is-dimmed' : ''}`}
                  style={isActive ? { background: cfg.color, borderColor: cfg.color, color: '#fff' } : undefined}
                  onClick={() => setActiveType((prev) => (prev === type ? null : type))}
                  aria-pressed={isActive}
                  title={`${cfg.shortLabel}: ${visibleCounts[type]} in view`}
                >
                  <span className="lk-chip-dot" style={{ background: isActive ? '#fff' : cfg.color }}>
                    <Icon size={11} color={isActive ? cfg.color : '#fff'} />
                  </span>
                  {cfg.shortLabel}
                  <span className={`lk-chip-count ${isActive ? 'is-active' : ''}`}>{visibleCounts[type]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!searchOpen && (
        <div className="lk-tools">
          <div className="lk-zoom">
            <button type="button" onClick={() => mapRef.current?.zoomIn({ duration: CAMERA.zoomStepDuration })} aria-label="Zoom in" title="Zoom in"><Plus size={19} /></button>
            <span />
            <button type="button" onClick={() => mapRef.current?.zoomOut({ duration: CAMERA.zoomStepDuration })} aria-label="Zoom out" title="Zoom out"><Minus size={19} /></button>
          </div>
          <div className="lk-tool-gap" />
          <ToolButton icon={Search} onClick={() => setSearchOpen(true)} label="Search" />
          <ToolButton icon={ThemeIcon} active={mapTheme !== 'system'} activeColor="#38BDF8" onClick={() => setMapTheme((t) => THEME_CYCLE[t].next)} label={THEME_CYCLE[mapTheme].label} />
          <ToolButton icon={MapIcon} active={barangaysOn} activeColor="#38BDF8" onClick={() => setBarangaysOn((v) => !v)} label="Barangay boundaries" />
          <ToolButton icon={Box} active={tiltOn} activeColor="#10B981" onClick={() => { setTiltOn((v) => !v); setRotateOn(false); }} label="3D tilt" />
          {tiltOn && <ToolButton icon={RotateCw} active={rotateOn} activeColor="#10B981" onClick={() => setRotateOn((v) => !v)} label="Auto-rotate" />}
        </div>
      )}

      <div className="lk-locate">
        <ToolButton icon={LocateFixed} loading={locating} activeColor="#10B981" onClick={handleLocate} label="Go to my location" />
      </div>

      {pickerMode && !searchOpen && (
        <div className="lk-pick-hint">{hasPick ? 'Drag the red pin or click to move it' : 'Click the map or search to pin the location'}</div>
      )}

      {notice && <div className="lk-notice">{notice}</div>}
    </div>
  );
}
