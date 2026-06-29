import { useState, useMemo, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  MapPin,
  QrCode,
  HelpCircle,
  Sparkles,
  Landmark,
  Anchor,
  Users as UsersIcon,
  Award,
  FileText,
  Search,
  Bell,
  Plus,
  Trash2,
  Edit,
  Star,
  ArrowUpRight,
  Map,
  X,
  Download,
  Power,
  CheckCircle,
  TrendingUp,
  Sun,
  Moon,
  Maximize,
  Minimize,
  Eye,
  Target,
  Camera,
  Crosshair,
  Compass,
  Shield,
  LogOut
} from 'lucide-react'

import './App.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { authService } from './api/authService';
import qrService from './api/qrService';
import QRCodeLib from 'qrcode';

const generateNotificationId = () => Date.now();

// Real QR Code Component — encodes the actual qr_code_string
const QRCodeCanvas = ({ value }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [value]);

  if (!value) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
      No QR string
    </div>
  );

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: '4px' }} />;
};

// ── Feature-type constants ─────────────────────────────────────────────────
// featureTypes: array of 'qr' | 'ar' | 'catch'

// Initial Feature Places Mock Data
const INITIAL_SPOTS = [
  { id: 1, name: 'Great Santa Cruz Island', location: 'Zamboanga Channel, Zamboanga City', status: 'QR', visits: 24500, category: 'beach', rating: 4.8, aboutPlace: 'Famous for its unique pink coralline sand and crystal clear waters. A protected marine sanctuary perfect for snorkeling and lagoon tours.', experience: 'Snorkeling, swimming, and nature photography', trivia: 'Did you know the pink sand comes from pulverized red organ-pipe coral?', bestTime: 'March to May', forWho: 'Families, Solo, Groups', language: 'Chavacano, English, Tagalog' },
  { id: 2, name: 'Fort Pilar Shrine & Museum', location: 'Valderosa St, Zamboanga City', status: 'QR', visits: 48200, category: 'historical', rating: 4.7, aboutPlace: 'A 17th-century Spanish military defense fortress and a major religious landmark housing the shrine of Our Lady of the Pillar.', experience: 'Historical tours, cultural exhibits', trivia: 'Did you know it was built in 1635?', bestTime: 'Anytime', forWho: 'Families, Groups', language: 'Chavacano, English' },
  { id: 3, name: 'Yakan Weaving Village', location: 'Upper Calarian, Zamboanga City', status: 'QR', visits: 15400, category: 'cultural', rating: 4.9, aboutPlace: 'Home to the indigenous Yakan weavers. Watch them create beautiful, intricate geometric cloths by hand using traditional backstrap looms.', experience: 'Handloom weaving, cultural immersion', trivia: 'Did you know each pattern tells a unique story?', bestTime: 'Morning', forWho: 'Groups', language: 'Yakan, Tagalog' },
  { id: 4, name: 'Merloquet Falls', location: 'Barangay Sibulao, Zamboanga City', status: 'QR', visits: 12100, category: 'nature', rating: 4.6, aboutPlace: 'A stunning two-tiered waterfall with a scenic staircase-like rock wall over which the water cascades into a refreshing shallow pool.', experience: 'Nature hike, swimming under the falls', trivia: 'Did you know the water flow creates a natural hydro-massage?', bestTime: 'Rainy Season', forWho: 'Groups, Solo', language: 'Tagalog, Cebuano' },
  { id: 5, name: 'Paseo del Mar', location: 'Valderosa St, Zamboanga City', status: 'QR', visits: 55000, category: 'cultural', rating: 4.5, aboutPlace: 'A popular waterfront park offering beautiful sea views, local dining options, street food, and vibrant cultural shows at night.', experience: 'Dining, sunset viewing, cultural shows', trivia: 'Did you know it is the best place to catch the Vinta sunset?', bestTime: 'Late Afternoon to Evening', forWho: 'Families, Groups', language: 'Chavacano, Tagalog' },
  { id: 6, name: 'Pasonanca Tree House', location: 'Pasonanca Park, Zamboanga City', status: 'AR', visits: 9800, category: 'historical', rating: 4.4, aboutPlace: 'Built in 1960, this historic treehouse in Pasonanca Park allows visitors to climb up and experience staying in a nature-surrounded cottage.', experience: 'Park exploration, nature stay', trivia: 'Did you know the tree house can be booked for overnight stays?', bestTime: 'Morning to Afternoon', forWho: 'Families, Solo', language: 'Chavacano, English' },
  { id: 7, name: 'Taluksangay Mosque', location: 'Barangay Taluksangay, Zamboanga City', status: 'QR', visits: 8200, category: 'cultural', rating: 4.8, aboutPlace: 'Built in 1885, it is the oldest mosque in the Zamboanga Peninsula, featuring iconic red domes and serving as the historical center of Islam in the area.', experience: 'Cultural appreciation, architecture', trivia: 'Did you know it was the first mosque to have a resident Imam in the peninsula?', bestTime: 'Daytime', forWho: 'Groups', language: 'Sama, Tagalog' }
];

// ── Map Pins – each pin can have one or more featureTypes ─────────────────
const INITIAL_MAP_PINS = [
  // QR Spots (tourist spots with QR codes)
  { id: 1,  name: 'Great Santa Cruz Island',   coordinates: [122.0682, 6.8711], featureTypes: ['qr'],        description: 'Famous pink-sand island, protected marine sanctuary.' },
  { id: 2,  name: 'Fort Pilar Shrine & Museum', coordinates: [122.0818, 6.9015], featureTypes: ['qr'],        description: '17th-century Spanish fortress and religious landmark.' },
  { id: 3,  name: 'Yakan Weaving Village',      coordinates: [122.0494, 6.9272], featureTypes: ['qr'],        description: 'Indigenous Yakan weavers with traditional backstrap looms.' },
  { id: 4,  name: 'Merloquet Falls',            coordinates: [122.2133, 7.2144], featureTypes: ['qr'],        description: 'Two-tiered cascading waterfall in the highlands.' },
  { id: 5,  name: 'Paseo del Mar',              coordinates: [122.0835, 6.9025], featureTypes: ['qr'],        description: 'Waterfront park with cultural shows and sea views.' },
  { id: 6,  name: 'Pasonanca Tree House',       coordinates: [122.0716, 6.9463], featureTypes: ['qr'],        description: 'Historic 1960 treehouse inside Pasonanca Park.' },
  { id: 7,  name: 'Taluksangay Mosque',         coordinates: [122.1311, 6.9452], featureTypes: ['qr'],        description: 'Oldest mosque in the Zamboanga Peninsula (1885).' },
  // AR Spots (museum / exhibit locations)
  { id: 8,  name: 'Zamboanga City Museum',      coordinates: [122.0821, 6.9032], featureTypes: ['ar'],        description: 'Main AR exhibit hub. Scan artifacts to unlock cultural stories.' },
  // Catch Spots (creature / symbol encounter zones)
  { id: 9,  name: 'Curacha Catch Zone',         coordinates: [122.0790, 6.9100], featureTypes: ['catch'],     description: 'Encounter the Curacha – Zamboanga\'s legendary spanner crab spirit.' },
  { id: 10, name: 'Vinta Catch Zone',           coordinates: [122.0720, 6.8950], featureTypes: ['catch'],     description: 'Spot the iconic Vinta sailboat creature along the strait.' },
  { id: 11, name: 'Lantaka Catch Zone',         coordinates: [122.0830, 6.9010], featureTypes: ['catch'],     description: 'Find the Lantaka cannon spirit guarding Fort Pilar.' },
  { id: 12, name: 'Yakan Weave Spirit Zone',    coordinates: [122.0510, 6.9260], featureTypes: ['catch'],     description: 'Capture the mystical spirit woven into Yakan textiles.' },
];

// Helper: primary feature type determines marker color
const PIN_TYPE_CONFIG = {
  qr:    { color: '#E91E8C', glow: 'rgba(233,30,140,0.55)', label: 'QR Scan' },
  ar:    { color: '#10B981', glow: 'rgba(16,185,129,0.55)',  label: 'AR Exhibit' },
  catch: { color: '#FBBF24', glow: 'rgba(251,191,36,0.55)', label: 'Catch Zone' },
};

// Initial QR Codes Mock Data
const INITIAL_QRCODES = [
  { id: 1, exhibitName: 'Great Santa Cruz Island', scanCount: 1450, status: 'Active', hook: 'A pink sand paradise!', historicalBackground: 'Used as an outpost during the colonial period.', culturalSignificance: 'A preserved natural treasure for the locals.', funFact: 'The pink sand comes from crushed red organ pipe corals.' },
  { id: 2, exhibitName: 'Fort Pilar Shrine & Museum', scanCount: 3120, status: 'Active', hook: 'Defenders of the city!', historicalBackground: 'Built in 1635 by the Spanish forces.', culturalSignificance: 'A major religious and historical landmark.', funFact: 'It was originally called Real Fuerza de San José.' },
  { id: 3, exhibitName: 'Yakan Weaving Village', scanCount: 890, status: 'Active', hook: 'Mastery in every thread.', historicalBackground: 'Home to the indigenous Yakan tribe.', culturalSignificance: 'Preserves the intricate backstrap loom weaving tradition.', funFact: 'No two Yakan patterns are exactly the same.' },
  { id: 4, exhibitName: 'Merloquet Falls', scanCount: 640, status: 'Active', hook: 'Nature’s water stairs.', historicalBackground: 'Discovered as a hidden gem in the highlands.', culturalSignificance: 'A testament to Zamboanga’s rich natural wonders.', funFact: 'The water flow creates a natural hydro-massage.' },
  { id: 5, exhibitName: 'Paseo del Mar', scanCount: 4200, status: 'Active', hook: 'Sunset by the strait.', historicalBackground: 'Developed as a premier waterfront park.', culturalSignificance: 'The cultural heartbeat of local night life.', funFact: 'Best place to catch the colorful Vinta sails.' },
  { id: 6, exhibitName: 'Pasonanca Tree House', scanCount: 530, status: 'Disabled', hook: 'A home up high.', historicalBackground: 'Built in 1960 in the heart of Pasonanca Park.', culturalSignificance: 'Symbol of Zamboanga’s eco-tourism.', funFact: 'It can be booked for overnight stays!' },
  { id: 7, exhibitName: 'Taluksangay Mosque', scanCount: 410, status: 'Active', hook: 'A beacon of faith.', historicalBackground: 'Built in 1885, oldest mosque in the peninsula.', culturalSignificance: 'Historical center of Islam in Zamboanga.', funFact: 'First mosque to have a resident Imam here.' }
];

// Initial Users Data
const INITIAL_USERS = [
  { id: 1, name: 'Santiago Perez', email: 'santiago@example.com', spotsVisited: 5, catches: 12, arCompleted: 3, badgesEarned: 4, status: 'Active' },
  { id: 2, name: 'Jamaluddin Alih', email: 'jamal@example.com', spotsVisited: 7, catches: 20, arCompleted: 5, badgesEarned: 7, status: 'Active' },
  { id: 3, name: 'Manuel Climaco', email: 'manuel@example.com', spotsVisited: 3, catches: 6, arCompleted: 1, badgesEarned: 2, status: 'Active' },
  { id: 4, name: 'Fatima Tan', email: 'fatima@example.com', spotsVisited: 4, catches: 8, arCompleted: 2, badgesEarned: 3, status: 'Suspended' },
  { id: 5, name: 'Ronaldo Santos', email: 'ronaldo@example.com', spotsVisited: 6, catches: 15, arCompleted: 4, badgesEarned: 5, status: 'Active' },
  { id: 6, name: 'Christina Joy', email: 'joy@example.com', spotsVisited: 2, catches: 4, arCompleted: 1, badgesEarned: 1, status: 'Active' }
];

// Initial Trivia Data
const INITIAL_TRIVIA = [
  { id: 1, spotName: 'Great Santa Cruz Island', question: 'Why is the sand on Great Santa Cruz Island pink?', answer: 'It comes from pulverized red organ-pipe coral mixed with white sand.' },
  { id: 2, spotName: 'Fort Pilar Shrine & Museum', question: 'In what year was Fort Pilar built by Spanish forces?', answer: 'It was built in the year 1635.' },
  { id: 3, spotName: 'Yakan Weaving Village', question: 'What is the signature weaving technique of Yakans?', answer: 'The backstrap loom weaving technique featuring bold geometric designs.' }
];

// Initial Creatures and Symbols
const INITIAL_CREATURES = [
  { id: 1, name: 'Chavacano Vinta', type: 'Cultural Symbol', rarity: 'rare', catchesCount: 180 },
  { id: 2, name: 'Yakan Handloom', type: 'Cultural Symbol', rarity: 'common', catchesCount: 420 },
  { id: 3, name: 'Fort Pilar Guardian', type: 'Historical Spirit', rarity: 'legendary', catchesCount: 24 },
  { id: 4, name: 'Hermosa Pearl Oyster', type: 'Nature Symbol', rarity: 'rare', catchesCount: 110 },
  { id: 5, name: 'Pink Sand Jellyfish', type: 'Marine Creature', rarity: 'epic', catchesCount: 65 }
];

// Initial Museum Exhibits
const INITIAL_EXHIBITS = [
  { id: 1, name: 'Chavacano Ethnocommunity Collection', gallery: 'Gallery A (First Floor)', status: 'On Display' },
  { id: 2, name: '17th Century Spanish Armors', gallery: 'Gallery B (South Wing)', status: 'On Display' },
  { id: 3, name: 'Mindanao Marine Life Specimens', gallery: 'Gallery C (East Wing)', status: 'Maintenance' },
  { id: 4, name: 'Sama-Bajao Traditional Houseboat model', gallery: 'Courtyard Display', status: 'On Display' }
];

// Initial Badges Mock Data
const INITIAL_BADGES = [
  { id: 1, name: 'City Explorer', desc: 'Scan at least 3 QR codes in Zamboanga landmarks', reqQR: 3, reqAR: 0, reqCatch: 0, iconName: 'map' },
  { id: 2, name: 'Vinta Sailor', desc: 'Scan Paseo del Mar QR code and capture Vinta in AR', reqQR: 1, reqAR: 1, reqCatch: 0, iconName: 'compass' },
  { id: 3, name: 'Chavacano Native', desc: 'Solve 3 trivia questions correctly', reqQR: 0, reqAR: 0, reqCatch: 3, iconName: 'award' },
  { id: 4, name: 'Fort Guardian', desc: 'Visit the Fort Pilar Shrine & Museum', reqQR: 1, reqAR: 1, reqCatch: 0, iconName: 'shield' }
];

// Initial Activity Feed
const INITIAL_ACTIVITIES = [
  { id: 1, type: 'scan', text: 'Santiago Perez scanned QR Code at Fort Pilar Shrine', time: '2m ago' },
  { id: 2, type: 'catch', text: 'Jamaluddin Alih caught "Chavacano Vinta" in AR at Paseo del Mar', time: '8m ago' },
  { id: 3, type: 'ar', text: 'Manuel Climaco completed AR Visit at Great Santa Cruz Island', time: '15m ago' },
  { id: 4, type: 'badge', text: 'Fatima Tan unlocked the "City Explorer" Badge', time: '24m ago' },
  { id: 5, type: 'scan', text: 'Ronaldo Santos scanned QR Code at Yakan Weaving Village', time: '1h ago' },
  { id: 6, type: 'catch', text: 'Santiago Perez caught "Pink Sand Jellyfish" in AR', time: '2h ago' }
];

const normalizeSpot = (s) => ({
  id: s.id,
  name: s.name,
  location: s.location_name,
  latitude: s.latitude,
  longitude: s.longitude,
  aboutPlace: s.description,
  historical_background: s.historical_background,
  cultural_significance: s.cultural_significance,
  fun_fact: s.fun_fact,
  trivia: s.fun_fact,
  status: 'QR',
  category: 'cultural',
  rating: 5.0,
  visits: 0,
  experience: '',
  bestTime: '',
  forWho: '',
  language: '',
});

const normalizeMarker = (m) => ({
  id: m.id,
  exhibitName: m.spot?.name || '',
  spot_id: m.spot?.id,
  scanCount: m.scan_count,
  status: m.is_active ? 'Active' : 'Disabled',
  qr_code_string: m.qr_code_string,
  unlock_type: m.unlock_type,
  bonus_creature: m.bonus_creature || '',
  historicalBackground: m.spot?.historical_background || '',
  culturalSignificance: m.spot?.cultural_significance || '',
  funFact: m.spot?.fun_fact || '',
  hook: '',
});

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState('dark');
  
  // Apply theme class to document
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);
  
  // Data States
  const [spots, setSpots] = useState([]);
  const [selectedPinId, setSelectedPinId] = useState(1);
  const [qrcodes, setQrcodes] = useState([]);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Map Pins State
  const [mapPins, setMapPins] = useState(INITIAL_MAP_PINS);
  const [selectedMapPinId, setSelectedMapPinId] = useState(null); // default: Museum AR
  const [isAddMapPinModalOpen, setIsAddMapPinModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSearching, setModalSearching] = useState(false);
  const [newMapPin, setNewMapPin] = useState({
    name: '',
    description: '',
    lat: '',
    lng: '',
    featureTypes: ['qr'],
  });

  const selectedMapPin = useMemo(() => mapPins.find(p => p.id === selectedMapPinId), [mapPins, selectedMapPinId]);

  // Selected Spot for Interactive Map
  const selectedSpot = useMemo(() => {
    return spots.find(s => s.id === selectedPinId);
  }, [spots, selectedPinId]);

  // Map Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerElemsRef = useRef({}); // { pinId: { el, iconEl, badgeEl, cfg } }

  // Modal mini-map refs
  const modalMapContainerRef = useRef(null);
  const modalMapRef = useRef(null);
  const modalMarkerRef = useRef(null);
  const modalCircleRef = useRef(null);

  // Initialize Leaflet map — only rebuilds on tab/theme/pins change, NOT on pin selection
  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;

    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const map = L.map(mapContainerRef.current, {
      center: [6.9214, 122.0790],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    mapPins.forEach(pin => {
      const primaryType = pin.featureTypes[0];
      const cfg = PIN_TYPE_CONFIG[primaryType] || PIN_TYPE_CONFIG.qr;
      const isSelected = selectedMapPinId === pin.id;

      // Outer marker element
      const el = document.createElement('div');
      el.className = 'custom-map-marker';
      el.title = pin.name;
      el.style.cssText = `
        width: ${isSelected ? '22px' : '18px'};
        height: ${isSelected ? '22px' : '18px'};
        border-radius: 50%;
        background-color: ${isSelected ? '#fff' : cfg.color};
        border: 2.5px solid ${isSelected ? cfg.color : 'rgba(255,255,255,0.85)'};
        cursor: pointer;
        box-shadow: 0 0 ${isSelected ? 18 : 10}px ${cfg.glow}, 0 0 0 ${isSelected ? '5px' : '0px'} ${cfg.glow};
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease;
        position: relative;
      `;

      // Inner icon
      const iconEl = document.createElement('div');
      iconEl.className = 'pin-icon';
      iconEl.style.cssText = `width: 9px; height: 9px; border-radius: 50%; background: ${isSelected ? cfg.color : 'rgba(255,255,255,0.9)'};`;
      if (primaryType === 'ar') { iconEl.style.borderRadius = '0 50% 0 50%'; iconEl.style.transform = 'rotate(45deg)'; }
      else if (primaryType === 'catch') { iconEl.style.width = '7px'; iconEl.style.height = '7px'; iconEl.style.boxShadow = `0 0 4px ${isSelected ? cfg.color : '#fff'}`; }
      el.appendChild(iconEl);

      // Type badge below marker
      const badgeEl = document.createElement('div');
      badgeEl.className = 'pin-badge';
      badgeEl.innerText = primaryType.toUpperCase();
      badgeEl.style.cssText = `
        position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 3px;
        background: ${cfg.color}; color: #fff; font-size: 7px; font-weight: 800;
        letter-spacing: 0.5px; padding: 1px 4px; border-radius: 3px;
        white-space: nowrap; pointer-events: none; opacity: ${isSelected ? 1 : 0.85};
      `;
      el.appendChild(badgeEl);

      // Store refs for highlight updates
      markerElemsRef.current[pin.id] = { el, iconEl, badgeEl, cfg, primaryType };

      el.addEventListener('click', () => setSelectedMapPinId(pin.id));

      // Rich popup
      const typeLabels = pin.featureTypes.map(t => `<span style="background:${PIN_TYPE_CONFIG[t]?.color};color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:3px;margin-right:4px">${PIN_TYPE_CONFIG[t]?.label}</span>`).join('');
      const popupHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:4px 0;min-width:180px">
          <div style="margin-bottom:6px">${typeLabels}</div>
          <strong style="font-size:13px;color:#1a1a2e;display:block;margin-bottom:4px">${pin.name}</strong>
          <p style="font-size:11px;color:#555;margin:0 0 6px 0;line-height:1.5">${pin.description || 'No description available.'}</p>
          <p style="font-size:10px;color:#999;margin:0">📍 ${pin.coordinates[1].toFixed(4)}° N, ${pin.coordinates[0].toFixed(4)}° E</p>
        </div>`;

      const divIcon = L.divIcon({
        html: el,
        className: '',
        iconSize: [22, 30],
        iconAnchor: [11, 11],
        popupAnchor: [0, -14],
      });

      L.marker([pin.coordinates[1], pin.coordinates[0]], { icon: divIcon })
        .bindPopup(popupHtml, { maxWidth: 240 })
        .addTo(map);
    });

    return () => { map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, theme, mapPins]);

  // Update marker highlight styles WITHOUT rebuilding the map
  useEffect(() => {
    Object.entries(markerElemsRef.current).forEach(([idStr, { el, iconEl, badgeEl, cfg, primaryType }]) => {
      const isSelected = parseInt(idStr) === selectedMapPinId;
      el.style.width = isSelected ? '22px' : '18px';
      el.style.height = isSelected ? '22px' : '18px';
      el.style.backgroundColor = isSelected ? '#fff' : cfg.color;
      el.style.border = `2.5px solid ${isSelected ? cfg.color : 'rgba(255,255,255,0.85)'}`;
      el.style.boxShadow = `0 0 ${isSelected ? 18 : 10}px ${cfg.glow}, 0 0 0 ${isSelected ? '5px' : '0px'} ${cfg.glow}`;
      iconEl.style.background = isSelected ? cfg.color : 'rgba(255,255,255,0.9)';
      if (primaryType === 'catch') iconEl.style.boxShadow = `0 0 4px ${isSelected ? cfg.color : '#fff'}`;
      badgeEl.style.opacity = isSelected ? '1' : '0.85';
    });
  }, [selectedMapPinId]);

  // Handle flyTo when selectedMapPinId changes
  useEffect(() => {
    if (!mapRef.current) return;
    const pin = mapPins.find(p => p.id === selectedMapPinId);
    if (pin?.coordinates) {
      mapRef.current.flyTo([pin.coordinates[1], pin.coordinates[0]], 14);
    }
  }, [selectedMapPinId, mapPins]);

  // handleAddMapPin
  const handleAddMapPin = (e) => {
    e.preventDefault();
    const lat = parseFloat(newMapPin.lat);
    const lng = parseFloat(newMapPin.lng);
    if (!newMapPin.name || isNaN(lat) || isNaN(lng)) return;
    if (newMapPin.featureTypes.length === 0) return;

    const pin = {
      id: Date.now(),
      name: newMapPin.name,
      description: newMapPin.description,
      coordinates: [lng, lat],
      featureTypes: newMapPin.featureTypes,
    };
    setMapPins(prev => [...prev, pin]);
    setSelectedMapPinId(pin.id);
    setIsAddMapPinModalOpen(false);
    setNewMapPin({ name: '', description: '', lat: '', lng: '', featureTypes: ['qr'] });
    setNotifications(prev => [
      { id: Date.now(), text: `Map pin "${pin.name}" (${pin.featureTypes.join('/')}) added to the map.`, time: 'Just now' },
      ...prev,
    ]);
  };

  const toggleNewPinType = (type) => {
    setNewMapPin(prev => {
      const has = prev.featureTypes.includes(type);
      if (has && prev.featureTypes.length === 1) return prev; // keep at least one
      return {
        ...prev,
        featureTypes: has
          ? prev.featureTypes.filter(t => t !== type)
          : [...prev.featureTypes, type],
      };
    });
  };

  // Handle map resize when fullscreen changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 150);
    }
  }, [isMapFullscreen]);

  // Initialize modal map when Add Spot modal opens
  useEffect(() => {
    if (!isAddMapPinModalOpen) {
      if (modalMapRef.current) {
        modalMapRef.current.remove();
        modalMapRef.current = null;
        modalMarkerRef.current = null;
        modalCircleRef.current = null;
      }
      return;
    }

    // Wait for the DOM to render the container
    const timer = setTimeout(() => {
      if (!modalMapContainerRef.current || modalMapRef.current) return;

      const tileUrl = theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      const map = L.map(modalMapContainerRef.current, {
        center: [6.9214, 122.0790],
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setNewMapPin(prev => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }));

        if (modalMarkerRef.current) modalMarkerRef.current.remove();
        modalMarkerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          color: '#6c63ff',
          fillColor: '#6c63ff',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map);
      });

      modalMapRef.current = map;
    }, 50);

    return () => clearTimeout(timer);
  }, [isAddMapPinModalOpen, theme]);

  const handleModalSearch = async () => {
    if (!modalSearchQuery.trim() || !modalMapRef.current) return;
    setModalSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(modalSearchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        modalMapRef.current.flyTo([parseFloat(lat), parseFloat(lon)], 15);
      }
    } catch {
      // silently ignore search errors
    } finally {
      setModalSearching(false);
    }
  };

  const [users, setUsers] = useState([]);
  const [trivia, setTrivia] = useState(INITIAL_TRIVIA);
  const [triviaQuestions, setTriviaQuestions] = useState([]);
  const [triviaSpotFilter, setTriviaSpotFilter] = useState('');
  const [isAddTriviaModalOpen, setIsAddTriviaModalOpen] = useState(false);
  const [isEditTriviaModalOpen, setIsEditTriviaModalOpen] = useState(false);
  const [editingTrivia, setEditingTrivia] = useState(null);
  const [newTrivia, setNewTrivia] = useState({ spot_id: '', question: '', choice_a: '', choice_b: '', choice_c: '', choice_d: '', correct_index: '0' });
  const [creatures] = useState(INITIAL_CREATURES);
  const [exhibits] = useState(INITIAL_EXHIBITS);
  const [badges, setBadges] = useState(INITIAL_BADGES);
  const [isAddBadgeModalOpen, setIsAddBadgeModalOpen] = useState(false);
  const [newBadge, setNewBadge] = useState({
    name: '',
    desc: '',
    reqQR: 0,
    reqAR: 0,
    reqCatch: 0,
    iconName: 'award'
  });

  const handleAddBadge = (e) => {
    e.preventDefault();
    setBadges([
      ...badges,
      {
        id: Date.now(),
        name: newBadge.name,
        desc: newBadge.desc || `Earned by completing: ${newBadge.reqQR} QR, ${newBadge.reqAR} AR, ${newBadge.reqCatch} Catches`,
        reqQR: Number(newBadge.reqQR),
        reqAR: Number(newBadge.reqAR),
        reqCatch: Number(newBadge.reqCatch),
        iconName: newBadge.iconName
      }
    ]);
    setIsAddBadgeModalOpen(false);
    setNewBadge({ name: '', desc: '', reqQR: 0, reqAR: 0, reqCatch: 0, iconName: 'award' });
  };
  const [activities] = useState(INITIAL_ACTIVITIES);
  
  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Restore session from localStorage on page load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    authService.getProfile()
      .then((user) => {
        if (user.is_staff) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          authService.logout();
        }
      })
      .catch(() => {
        authService.logout();
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      await authService.login(loginCredentials.email, loginCredentials.password);
      const user = await authService.getProfile();

      if (!user.is_staff) {
        authService.logout();
        setLoginError('Access denied. Staff accounts only.');
        return;
      }

      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      setLoginError('Invalid credentials. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    qrService.getSpots().then(({ data }) => setSpots(data.map(normalizeSpot))).catch(console.error);
    qrService.getMarkers().then(({ data }) => setQrcodes(data.map(normalizeMarker))).catch(console.error);
    qrService.getTriviaQuestions().then(({ data }) => setTriviaQuestions(data)).catch(console.error);
    qrService.getUsers().then(({ data }) => setUsers(data)).catch(console.error);
  }, [isAuthenticated]);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Vinta boat registration V-206 pending verification.', time: '10m ago' },
    { id: 2, text: 'Daily app metrics update compiled successfully.', time: '1h ago' }
  ]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Modals
  const [isAddSpotModalOpen, setIsAddSpotModalOpen] = useState(false);
  const [newSpot, setNewSpot] = useState({
    name: '',
    location_name: '',
    latitude: '',
    longitude: '',
    description: '',
    historical_background: '',
    cultural_significance: '',
    fun_fact: '',
  });

  const [isEditSpotModalOpen, setIsEditSpotModalOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);

  const [isAddQrModalOpen, setIsAddQrModalOpen] = useState(false);
  const [newQr, setNewQr] = useState({
    spot_id: '',
    qr_code_string: '',
    unlock_type: 'cultural_story',
    bonus_creature: '',
    is_active: true,
  });

  const [isEditQrModalOpen, setIsEditQrModalOpen] = useState(false);
  const [editingQr, setEditingQr] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Stats Calculations
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalQRScans = qrcodes.reduce((sum, q) => sum + q.scanCount, 0);
    const totalCatches = creatures.reduce((sum, c) => sum + c.catchesCount, 0);
    // Let's compute total AR visits as the sum of spots visits that are active (excluding Paseo) or mock it
    const totalARVisits = spots.reduce((sum, s) => sum + s.visits, 0);

    return {
      totalUsers,
      totalQRScans,
      totalCatches,
      totalARVisits
    };
  }, [users, qrcodes, creatures, spots]);

  // Filtered Spots list based on Search
  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      return spot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             spot.location.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [spots, searchQuery]);

  // Filtered Users list based on Search
  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase();
    return users.filter(u =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.in_game_name || '').toLowerCase().includes(q)
    );
  }, [users, userSearchQuery]);

  // Handlers
  const handleAddSpot = async (e) => {
    e.preventDefault();
    if (!newSpot.name || !newSpot.location_name) return;
    try {
      const { data } = await qrService.createSpot({
        name: newSpot.name,
        location_name: newSpot.location_name,
        latitude: parseFloat(newSpot.latitude) || 0,
        longitude: parseFloat(newSpot.longitude) || 0,
        description: newSpot.description,
        historical_background: newSpot.historical_background,
        cultural_significance: newSpot.cultural_significance,
        fun_fact: newSpot.fun_fact,
      });
      setSpots(prev => [...prev, normalizeSpot(data)]);
      setIsAddSpotModalOpen(false);
      setNewSpot({ name: '', location_name: '', latitude: '', longitude: '', description: '', historical_background: '', cultural_significance: '', fun_fact: '' });
      setNotifications(prev => [{ id: Date.now(), text: `Spot "${data.name}" created.`, time: 'Just now' }, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSpotSubmit = async (e) => {
    e.preventDefault();
    if (!editingSpot.name || !editingSpot.location) return;
    try {
      const { data } = await qrService.updateSpot(editingSpot.id, {
        name: editingSpot.name,
        location_name: editingSpot.location,
        latitude: editingSpot.latitude || 0,
        longitude: editingSpot.longitude || 0,
        description: editingSpot.aboutPlace || '',
        historical_background: editingSpot.historical_background || '',
        cultural_significance: editingSpot.cultural_significance || '',
        fun_fact: editingSpot.fun_fact || '',
      });
      setSpots(prev => prev.map(s => s.id === data.id ? normalizeSpot(data) : s));
      setQrcodes(prev => prev.map(q => q.spot_id === data.id ? { ...q, exhibitName: data.name } : q));
      setIsEditSpotModalOpen(false);
      setEditingSpot(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddQr = async (e) => {
    e.preventDefault();
    if (!newQr.spot_id || !newQr.qr_code_string) return;
    try {
      const { data } = await qrService.createMarker({
        spot_id: parseInt(newQr.spot_id),
        qr_code_string: newQr.qr_code_string,
        unlock_type: newQr.unlock_type,
        bonus_creature: newQr.bonus_creature,
        is_active: newQr.is_active,
      });
      setQrcodes(prev => [...prev, normalizeMarker(data)]);
      setIsAddQrModalOpen(false);
      setNewQr({ spot_id: '', qr_code_string: '', unlock_type: 'cultural_story', bonus_creature: '', is_active: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditQrSubmit = async (e) => {
    e.preventDefault();
    if (!editingQr.spot_id || !editingQr.qr_code_string) return;
    try {
      const { data } = await qrService.updateMarker(editingQr.id, {
        spot_id: editingQr.spot_id,
        qr_code_string: editingQr.qr_code_string,
        unlock_type: editingQr.unlock_type,
        bonus_creature: editingQr.bonus_creature,
        is_active: editingQr.status === 'Active',
      });
      setQrcodes(prev => prev.map(q => q.id === data.id ? normalizeMarker(data) : q));
      setIsEditQrModalOpen(false);
      setEditingQr(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSpot = async (id) => {
    const spotToDelete = spots.find(s => s.id === id);
    if (!confirm(`Are you sure you want to delete "${spotToDelete?.name}"?`)) return;
    try {
      await qrService.deleteSpot(id);
      setSpots(prev => prev.filter(s => s.id !== id));
      setQrcodes(prev => prev.filter(q => q.spot_id !== id));
      setNotifications(prev => [
        { id: generateNotificationId(), text: `Spot "${spotToDelete?.name}" removed.`, time: 'Just now' },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleQrStatus = async (id) => {
    const marker = qrcodes.find(q => q.id === id);
    const nextActive = marker.status !== 'Active';
    try {
      await qrService.toggleMarker(id, nextActive);
      setQrcodes(prev => prev.map(q => q.id === id ? { ...q, status: nextActive ? 'Active' : 'Disabled' } : q));
    } catch (err) {
      console.error(err);
    }
  };

  const downloadQR = async (qrCodeString, spotName) => {
    if (!qrCodeString) return;
    try {
      const dataUrl = await QRCodeLib.toDataURL(qrCodeString, { width: 512, margin: 3 });
      const link = document.createElement('a');
      link.download = `LAKBAY_${spotName.replace(/\s+/g, '_')}_QR.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const triviaFormToPayload = (form) => ({
    spot_id: parseInt(form.spot_id),
    question: form.question,
    choices: [form.choice_a, form.choice_b, form.choice_c, form.choice_d],
    correct_index: parseInt(form.correct_index),
  });

  const handleAddTrivia = async (e) => {
    e.preventDefault();
    try {
      const { data } = await qrService.createTriviaQuestion(triviaFormToPayload(newTrivia));
      setTriviaQuestions(prev => [...prev, data]);
      setIsAddTriviaModalOpen(false);
      setNewTrivia({ spot_id: '', question: '', choice_a: '', choice_b: '', choice_c: '', choice_d: '', correct_index: '0' });
    } catch (err) { console.error(err); }
  };

  const handleEditTriviaSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await qrService.updateTriviaQuestion(editingTrivia.id, triviaFormToPayload(editingTrivia));
      setTriviaQuestions(prev => prev.map(q => q.id === data.id ? data : q));
      setIsEditTriviaModalOpen(false);
      setEditingTrivia(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteTrivia = async (id) => {
    if (!confirm('Delete this trivia question?')) return;
    try {
      await qrService.deleteTriviaQuestion(id);
      setTriviaQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) { console.error(err); }
  };

  const openEditTrivia = (q) => {
    setEditingTrivia({
      id: q.id,
      spot_id: String(spots.find(s => s.name === q.spot_name)?.id || ''),
      question: q.question,
      choice_a: q.choices[0] || '',
      choice_b: q.choices[1] || '',
      choice_c: q.choices[2] || '',
      choice_d: q.choices[3] || '',
      correct_index: String(q.correct_index),
    });
    setIsEditTriviaModalOpen(true);
  };

  const filteredTriviaQuestions = triviaSpotFilter
    ? triviaQuestions.filter(q => q.spot_name === spots.find(s => s.id === parseInt(triviaSpotFilter))?.name)
    : triviaQuestions;

  const toggleUserStatus = async (id) => {
    try {
      const { data } = await qrService.toggleUserStatus(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: data.is_active } : u));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="sidebar-logo-container" style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}>
              <Anchor className="sidebar-logo-icon" size={24} />
            </div>
            <h1 className="brand-text" style={{ fontSize: '28px', justifyContent: 'center' }}>
              LAKBAY
              <span className="brand-subtitle">ADMIN PANEL</span>
            </h1>
            <p className="login-subtitle">Sign in to manage the Zamboanga Cultural System</p>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            {loginError && <div className="login-error">{loginError}</div>}
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="Enter your email"
                value={loginCredentials.email}
                onChange={(e) => setLoginCredentials({...loginCredentials, email: e.target.value})}
                required 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter your password"
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials({...loginCredentials, password: e.target.value})}
                required 
              />
            </div>
            
            <button type="submit" className="btn btn-primary login-btn" disabled={isLoggingIn}>
              {isLoggingIn ? 'Authenticating...' : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-container">
            <Anchor className="sidebar-logo-icon" size={20} />
          </div>
          <div className="brand-text">
            LAKBAY
            <span className="brand-subtitle">ZAMBOANGA</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <span className="menu-section-title">Core Panels</span>
          <div 
            className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard className="menu-icon" />
            Dashboard
          </div>
          <div 
            className={`menu-item ${activeTab === 'spots' ? 'active' : ''}`}
            onClick={() => setActiveTab('spots')}
          >
            <MapPin className="menu-icon" />
            Feature Places
          </div>
          <div 
            className={`menu-item ${activeTab === 'qrcodes' ? 'active' : ''}`}
            onClick={() => setActiveTab('qrcodes')}
          >
            <QrCode className="menu-icon" />
            QR Codes
          </div>
          <div 
            className={`menu-item ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <Map className="menu-icon" />
            Interactive Map
          </div>
          <div 
            className={`menu-item ${activeTab === 'ar' ? 'active' : ''}`}
            onClick={() => setActiveTab('ar')}
          >
            <Eye className="menu-icon" />
            AR
          </div>
          <div 
            className={`menu-item ${activeTab === 'catch' ? 'active' : ''}`}
            onClick={() => setActiveTab('catch')}
          >
            <Target className="menu-icon" />
            CATCH
          </div>



          <div
            className={`menu-item ${activeTab === 'trivia' ? 'active' : ''}`}
            onClick={() => setActiveTab('trivia')}
          >
            <HelpCircle className="menu-icon" />
            Trivia Questions
          </div>

          <span className="menu-section-title">Operations</span>
          <div 
            className={`menu-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <UsersIcon className="menu-icon" />
            Users
          </div>
          <div 
            className={`menu-item ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            <Award className="menu-icon" />
            Badges
          </div>
          <div 
            className={`menu-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText className="menu-icon" />
            Reports
          </div>
        </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-row">
          <div className="user-avatar">
            {(currentUser?.name || currentUser?.username || currentUser?.email || 'G')
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">
              {currentUser?.name || currentUser?.username || currentUser?.email || 'Guest User'}
            </span>
            <span className="user-role">
              {currentUser?.is_staff ? 'Super Administrator' : 'User'}
            </span>
          </div>
        </div>

        <button className="sidebar-logout-btn" onClick={() => setShowLogoutModal(true)}>
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* HEADER */}
        <header className="main-header">
          <div className="header-title-container">
            <h1 className="header-title">
              {activeTab === 'overview' && 'LAKBAY Dashboard'}
              {activeTab === 'spots' && 'Feature Places'}
              {activeTab === 'qrcodes' && 'QR Codes'}
              {activeTab === 'map' && 'Interactive Map'}
              {activeTab === 'ar' && 'AR Progress'}
              {activeTab === 'catch' && 'CATCH Progress'}

              {activeTab === 'trivia' && 'Trivia Questions'}
              {activeTab === 'users' && 'User Directory'}
              {activeTab === 'badges' && 'Gamification Badges'}
              {activeTab === 'reports' && 'Analytics & Reports'}
            </h1>
            <span className="header-subtitle">
              {activeTab === 'overview' && 'Zamboanga City cultural app performance & analytics'}
              {activeTab === 'spots' && 'Manage geographic positions and historical details of Zamboanga'}
              {activeTab === 'qrcodes' && 'Manage and download system spot QR codes'}
              {activeTab === 'map' && 'Geospatial visualization and geofencing of tourist spots'}
              {activeTab === 'ar' && 'Track AR museum exhibit interactions and visits'}
              {activeTab === 'catch' && 'Monitor the capture rate of cultural icons'}

              {activeTab === 'trivia' && 'Manage the randomized question pool for each cultural spot'}
              {activeTab === 'users' && 'Manage user achievements, checks, and registration status'}
              {activeTab === 'badges' && 'Configure and inspect user achievement badges'}
              {activeTab === 'reports' && 'Export records and review monthly performance summaries'}
            </span>
          </div>

          <div className="header-actions">
            {/* Context Search Input */}
            {activeTab === 'users' ? (
              <div className="search-bar">
                <Search size={16} className="text-secondary" />
                <input 
                  type="text" 
                  placeholder="Search registered users..." 
                  className="search-input"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
                {userSearchQuery && (
                  <X size={16} className="text-secondary" style={{cursor: 'pointer'}} onClick={() => setUserSearchQuery('')} />
                )}
              </div>
            ) : (
              <div className="search-bar">
                <Search size={16} className="text-secondary" />
                <input 
                  type="text" 
                  placeholder="Search feature places..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <X size={16} className="text-secondary" style={{cursor: 'pointer'}} onClick={() => setSearchQuery('')} />
                )}
              </div>
            )}

            {/* Notification Bell */}
            <div style={{position: 'relative'}}>
              <button 
                className="header-btn" 
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <Bell size={18} />
                {notifications.length > 0 && <span className="badge-dot"></span>}
              </button>

              {showNotificationDropdown && (
                <div style={{
                  position: 'absolute', 
                  right: 0, 
                  top: '50px', 
                  backgroundColor: '#1E254C', 
                  border: '1px solid #2D376D', 
                  borderRadius: '12px', 
                  width: '320px', 
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  zIndex: 150,
                  padding: '16px'
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #2D376D', paddingBottom: '8px'}}>
                    <span style={{fontWeight: 700, fontSize: '13px'}}>Notifications</span>
                    <span style={{fontSize: '11px', color: '#E91E8C', cursor: 'pointer'}} onClick={() => setNotifications([])}>Clear all</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {notifications.length === 0 ? (
                      <span style={{fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0'}}>No alerts</span>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px'}}>
                          <span style={{fontSize: '12px', color: '#F7FAFC'}}>{n.text}</span>
                          <span style={{fontSize: '10px', color: '#718096'}}>{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button 
              className="header-btn" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Context Add Button */}
            {activeTab === 'spots' && (
              <button className="btn btn-primary" onClick={() => setIsAddSpotModalOpen(true)}>
                <Plus size={16} />
                Add New Spot
              </button>
            )}
            {activeTab === 'trivia' && (
              <button className="btn btn-primary" onClick={() => setIsAddTriviaModalOpen(true)}>
                <Plus size={16} />
                Add Question
              </button>
            )}
          </div>
        </header>

        {/* PAGE BODY */}
        <div className="page-body">
          
          {/* TAB CONTENT: 1. DASHBOARD */}
          {activeTab === 'overview' && (
            <>
              {/* Four Stat Cards at the Top */}
              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Total Users</span>
                    <span className="stat-value gold">{stats.totalUsers}</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      +15% active
                    </span>
                  </div>
                  <div className="stat-icon-wrapper yellow">
                    <UsersIcon size={24} />
                  </div>
                </div>

                <div className="stat-card" style={{cursor: 'pointer'}} onClick={() => setActiveTab('qrcodes')}>
                  <div className="stat-info">
                    <span className="stat-label">Total QR Scans</span>
                    <span className="stat-value gold">{stats.totalQRScans.toLocaleString()}</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      +8.2% scans
                    </span>
                  </div>
                  <div className="stat-icon-wrapper yellow">
                    <QrCode size={24} />
                  </div>
                </div>

                <div className="stat-card" style={{cursor: 'pointer'}} onClick={() => setActiveTab('catch')}>
                  <div className="stat-info">
                    <span className="stat-label">Total Catches</span>
                    <span className="stat-value gold">{stats.totalCatches}</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      +12 items unlocked
                    </span>
                  </div>
                  <div className="stat-icon-wrapper yellow">
                    <Sparkles size={24} />
                  </div>
                </div>

                <div className="stat-card" style={{cursor: 'pointer'}} onClick={() => setActiveTab('ar')}>
                  <div className="stat-info">
                    <span className="stat-label">Total AR Visits</span>
                    <span className="stat-value gold">{stats.totalARVisits.toLocaleString()}</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      +21.5% experiences
                    </span>
                  </div>
                  <div className="stat-icon-wrapper yellow">
                    <Map size={24} />
                  </div>
                </div>
              </section>

              {/* Chart & Recent Activity Grid */}
              <section className="dashboard-grid">
                {/* Bar Chart: Most Visited Feature Places */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3 className="card-title">
                      <TrendingUp className="card-title-icon" size={18} />
                      Most Visited Feature Places
                    </h3>
                  </div>

                  {/* SVG Bar Chart */}
                  <div className="chart-wrapper">
                    {/* Background Grid Lines */}
                    <div className="chart-grid-line" style={{bottom: '0%'}}></div>
                    <div className="chart-grid-line" style={{bottom: '25%'}}></div>
                    <div className="chart-grid-line" style={{bottom: '50%'}}></div>
                    <div className="chart-grid-line" style={{bottom: '75%'}}></div>
                    
                    {/* Bars based on spots visits */}
                    {spots.slice(0, 5).map((spot) => {
                      // Normalize percentage height against highest visit spot (Paseo has 55000)
                      const pctHeight = Math.max(8, (spot.visits / 55000) * 100);
                      return (
                        <div key={spot.id} className="chart-bar-item">
                          <div className="chart-tooltip">{spot.visits.toLocaleString()} visits</div>
                          <div className="chart-bar" style={{height: `${pctHeight}%`}}></div>
                          <span className="chart-bar-label" title={spot.name}>{spot.name.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)'}}>
                    <span>Visits counted via app check-ins</span>
                    <span>Magenta Pink accents represent high-traffic spots</span>
                  </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3 className="card-title">
                      <FileText className="card-title-icon" size={18} />
                      Recent Activity Feed
                    </h3>
                  </div>

                  <div className="activity-feed">
                    {activities.map(act => (
                      <div key={act.id} className="activity-item">
                        <div className={`activity-icon-wrapper ${act.type}`}>
                          {act.type === 'scan' && <QrCode size={16} />}
                          {act.type === 'catch' && <Sparkles size={16} />}
                          {act.type === 'ar' && <Map size={16} />}
                          {act.type === 'badge' && <Award size={16} />}
                        </div>
                        <div className="activity-details">
                          <span className="activity-text">{act.text}</span>
                          <span className="activity-time">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* TAB CONTENT: 2. FEATURE PLACES */}
          {activeTab === 'spots' && (
            <section className="content-card" style={{gap: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px'}}>
                <h3 className="card-title">
                  <MapPin className="card-title-icon" size={18} />
                  Zamboanga Spots Database
                </h3>
                <button 
                  className="btn btn-primary"
                  onClick={() => setIsAddSpotModalOpen(true)}
                >
                  <Plus size={16} />
                  Add New Spot
                </button>
              </div>

              {/* Data Table */}
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Spot Name</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSpots.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)'}}>
                          No feature places match the filters or search query.
                        </td>
                      </tr>
                    ) : (
                      filteredSpots.map(spot => (
                        <tr key={spot.id}>
                          <td style={{fontWeight: 700, color: 'var(--text-title)'}}>{spot.name}</td>
                          <td>{spot.location}</td>
                          <td>
                            <span className="badge active-status">
                              {spot.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="icon-action-btn"
                                title="Edit Spot"
                                onClick={() => {
                                  setEditingSpot(spot);
                                  setIsEditSpotModalOpen(true);
                                }}
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                className="icon-action-btn delete"
                                title="Remove Spot"
                                onClick={() => handleDeleteSpot(spot.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB CONTENT: 3. QR CODES */}
          {activeTab === 'qrcodes' && (
            <section className="content-card" style={{gap: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px'}}>
                <h3 className="card-title">
                  <QrCode className="card-title-icon" size={18} />
                  QR Code Cards Grid
                </h3>
                <button 
                  className="btn btn-primary"
                  onClick={() => setIsAddQrModalOpen(true)}
                >
                  <Plus size={16} />
                  Add QR Code
                </button>
              </div>

              {/* QR Cards Grid */}
              <div className="qr-grid">
                {qrcodes.map(qr => {
                  const spotDetails = spots.find(s => s.name === qr.exhibitName);
                  return (
                    <div key={qr.id} className="qr-card">
                      <div className="qr-card-meta">
                        <div style={{display: 'flex', gap: '8px'}}>
                          {spotDetails && (
                            <span className={`badge ${spotDetails.category || 'cultural'}`}>
                              {spotDetails.category || 'cultural'}
                            </span>
                          )}
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          {spotDetails && (
                            <span className="qr-card-rating">
                              <Star size={12} fill="currentColor" style={{ color: 'var(--accent-gold)', marginRight: '2px' }} />
                              {spotDetails.rating || '5.0'}
                            </span>
                          )}
                          <button 
                            className="icon-action-btn"
                            title="Edit QR Code"
                            onClick={() => {
                              setEditingQr(qr);
                              setIsEditQrModalOpen(true);
                            }}
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="qr-image-container">
                        <QRCodeCanvas value={qr.qr_code_string} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center' }}>
                        <h4 className="qr-spot-name">{qr.exhibitName}</h4>
                        {spotDetails && (
                          <span className="qr-spot-location">
                            <MapPin size={11} color="var(--accent-pink)" />
                            {spotDetails.location}
                          </span>
                        )}
                        
                        <div className="qr-scan-count" style={{ marginTop: '4px' }}>
                          <TrendingUp size={14} color="#E91E8C" />
                          <span>{qr.scanCount.toLocaleString()} Scans</span>
                        </div>

                        {spotDetails?.aboutPlace && (
                          <p className="qr-spot-desc" title={spotDetails.aboutPlace}>
                            {spotDetails.aboutPlace}
                          </p>
                        )}
                      </div>

                      <div className="qr-actions">
                        <button 
                          className="btn btn-secondary"
                          style={{flex: 1, padding: '8px 12px', fontSize: '11px'}}
                          onClick={() => downloadQR(qr.qr_code_string, qr.exhibitName)}
                        >
                          <Download size={12} style={{marginRight: '4px'}} />
                          Download
                        </button>
                        
                        <button 
                          className={`btn ${qr.status === 'Active' ? 'btn-secondary' : 'btn-primary'}`}
                          style={{flex: 1, padding: '8px 12px', fontSize: '11px', color: qr.status === 'Active' ? '#EF4444' : 'white', borderColor: qr.status === 'Active' ? 'rgba(239, 68, 68, 0.2)' : 'transparent'}}
                          onClick={() => toggleQrStatus(qr.id)}
                        >
                          <Power size={12} style={{marginRight: '4px'}} />
                          {qr.status === 'Active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}



          {/* TAB CONTENT: 7. USERS */}
          {activeTab === 'users' && (
            <section className="content-card" style={{gap: '24px'}}>
              <h3 className="card-title">
                <UsersIcon className="card-title-icon" size={18} />
                Registered LAKBAY App Users
              </h3>

              {/* Users Table */}
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Explorer Name</th>
                      <th>Character</th>
                      <th>XP</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)'}}>
                          {users.length === 0 ? 'Loading users...' : 'No users match the search.'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td style={{fontWeight: 700, color: 'var(--text-title)'}}>{user.full_name}</td>
                          <td style={{color: 'var(--text-secondary)'}}>{user.email}</td>
                          <td style={{color: 'var(--text-secondary)'}}>{user.in_game_name || '—'}</td>
                          <td style={{color: 'var(--text-secondary)', textTransform: 'capitalize'}}>{user.chosen_character || '—'}</td>
                          <td style={{textAlign: 'center', fontWeight: 600, color: 'var(--accent-gold)'}}>{user.xp}</td>
                          <td style={{color: 'var(--text-secondary)', fontSize: '12px'}}>{user.date_joined}</td>
                          <td>
                            <span className={`badge ${user.is_active ? 'active-status' : 'inactive-status'}`}>
                              {user.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`btn ${user.is_active ? 'btn-secondary' : 'btn-primary'}`}
                              style={{padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap'}}
                              onClick={() => toggleUserStatus(user.id)}
                            >
                              {user.is_active ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB CONTENT: 8. BADGES */}
          {activeTab === 'badges' && (
            <section className="content-card" style={{gap: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'}}>
                <h3 className="card-title">
                  <Award className="card-title-icon" size={18} />
                  User Achievement Badges Configuration
                </h3>
                <button 
                  className="btn btn-primary"
                  onClick={() => setIsAddBadgeModalOpen(true)}
                >
                  <Plus size={16} />
                  Add New Badge
                </button>
              </div>

              <div className="badges-grid">
                {badges.map(bd => (
                  <div key={bd.id} className="badge-card">
                    <div className="badge-icon-wrapper">
                      {bd.iconName === 'map' ? <Map size={28} /> :
                       bd.iconName === 'compass' ? <Compass size={28} /> :
                       bd.iconName === 'shield' ? <Shield size={28} /> :
                       <Award size={28} />}
                    </div>
                    <div className="badge-info">
                      <h4 className="badge-title">{bd.name}</h4>
                      <span className="badge-desc">{bd.desc}</span>
                      <div style={{marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                        {bd.reqQR > 0 && <span className="badge" style={{backgroundColor: 'var(--accent-gold)', color: 'black', fontSize: '10px'}}>QR: {bd.reqQR}</span>}
                        {bd.reqAR > 0 && <span className="badge" style={{backgroundColor: 'var(--accent-pink)', color: 'white', fontSize: '10px'}}>AR: {bd.reqAR}</span>}
                        {bd.reqCatch > 0 && <span className="badge" style={{backgroundColor: '#14B8A6', color: 'white', fontSize: '10px'}}>Catch: {bd.reqCatch}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB CONTENT: 9. REPORTS */}
          {activeTab === 'reports' && (
            <section className="content-card" style={{gap: '24px'}}>
              <h3 className="card-title">
                <FileText className="card-title-icon" size={18} />
                Preservation & Tourism System Reports
              </h3>

              <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
                <div style={{flex: 1, minWidth: '240px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px'}}>
                  <h4 style={{fontSize: '15px', color: 'var(--text-title)', marginBottom: '10px'}}>Total Tourism Check-ins</h4>
                  <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px'}}>Generate a full list of all spots visited and active user durations in CSV format.</p>
                  <button className="btn btn-primary" onClick={() => alert('CSV check-ins compiled!')}>Compile Check-ins</button>
                </div>

                <div style={{flex: 1, minWidth: '240px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px'}}>
                  <h4 style={{fontSize: '15px', color: 'var(--text-title)', marginBottom: '10px'}}>Preservation Metrics (Catches)</h4>
                  <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px'}}>Export data on Yakan symbols captured, Chavacano trivia unlocked, and badge distribution.</p>
                  <button className="btn btn-primary" onClick={() => alert('PDF report exported!')}>Export PDF Report</button>
                </div>
              </div>
            </section>
          )}

          {/* TAB CONTENT: 10. INTERACTIVE MAP */}
          {activeTab === 'map' && (
            <section className="dashboard-grid" style={{ gridTemplateColumns: isMapFullscreen ? '1fr' : '2fr 1.1fr', gap: '28px' }}>

              {/* ── Map Canvas Card ── */}
              <div className={`content-card ${isMapFullscreen ? 'fullscreen-map-card' : ''}`} style={{ minHeight: isMapFullscreen ? '100vh' : '500px' }}>
                <div className="content-card-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 className="card-title">
                    <Map className="card-title-icon" size={18} />
                    Zamboanga City — Feature Map {isMapFullscreen && '(Fullscreen)'}
                  </h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {Object.entries(PIN_TYPE_CONFIG).map(([type, cfg]) => (
                        <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cfg.color, boxShadow: `0 0 6px ${cfg.glow}` }} />
                          {cfg.label}
                        </span>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => setIsAddMapPinModalOpen(true)}
                    >
                      <Plus size={13} /> Add Spot to Map
                    </button>
                    <button
                      className="header-btn"
                      onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                      title={isMapFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
                      style={{ padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                    >
                      {isMapFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                  </div>
                </div>

                {/* Map canvas */}
                <div style={{ position: 'relative', width: '100%', height: isMapFullscreen ? 'calc(100vh - 90px)' : '420px', borderRadius: isMapFullscreen ? '0' : '12px', overflow: 'hidden', border: isMapFullscreen ? 'none' : '1px solid var(--card-border)', marginTop: '16px' }}>
                  <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                  {/* Floating pin detail when fullscreen */}
                  {isMapFullscreen && selectedMapPin && (
                    <div className="floating-map-details-card">
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {selectedMapPin.featureTypes.map(t => (
                          <span key={t} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: PIN_TYPE_CONFIG[t]?.color, color: '#fff' }}>
                            {PIN_TYPE_CONFIG[t]?.label}
                          </span>
                        ))}
                      </div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-title)', fontWeight: 700 }}>{selectedMapPin.name}</h4>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5' }}>{selectedMapPin.description}</p>
                      <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                        📍 {selectedMapPin.coordinates[1].toFixed(4)}° N, {selectedMapPin.coordinates[0].toFixed(4)}° E
                      </p>
                      <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px', width: '100%' }}
                        onClick={() => alert(`Geofencing triggered at ${selectedMapPin.name}.`)}>
                        Trigger Geofence
                      </button>
                    </div>
                  )}

                </div>

                {!isMapFullscreen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                    <span>Click any pin to view details · {mapPins.length} spots registered</span>
                    <span>6.9214° N, 122.0790° E</span>
                  </div>
                )}
              </div>

              {/* ── Right Panel — Pin Detail + List ── */}
              {!isMapFullscreen && (
                <div className="content-card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

                  {/* Selected Pin Detail */}
                  {selectedMapPin ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--card-border)' }}>

                      {/* Feature type badges */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {selectedMapPin.featureTypes.map(t => (
                          <span key={t} style={{ fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', backgroundColor: PIN_TYPE_CONFIG[t]?.color + '22', color: PIN_TYPE_CONFIG[t]?.color, border: `1px solid ${PIN_TYPE_CONFIG[t]?.color}55`, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {t === 'qr' && <QrCode size={11} />}
                            {t === 'ar' && <Eye size={11} />}
                            {t === 'catch' && <Crosshair size={11} />}
                            {PIN_TYPE_CONFIG[t]?.label}
                          </span>
                        ))}
                      </div>

                      {/* Name */}
                      <div>
                        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: 'var(--text-title)', margin: '0 0 4px 0', lineHeight: 1.2 }}>{selectedMapPin.name}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={11} color="var(--accent-pink)" />
                          {selectedMapPin.coordinates[1].toFixed(5)}° N, {selectedMapPin.coordinates[0].toFixed(5)}° E
                        </p>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.65, margin: 0 }}>
                        {selectedMapPin.description || 'No description available for this spot.'}
                      </p>

                      {/* Feature-specific info rows */}
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                        {selectedMapPin.featureTypes.includes('qr') && (
                          <div style={{ padding: '10px 12px', borderBottom: selectedMapPin.featureTypes.length > 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <QrCode size={16} color={PIN_TYPE_CONFIG.qr.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <div>
                              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: PIN_TYPE_CONFIG.qr.color }}>QR Scan Spot</p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Tourists scan the QR code at this location to unlock cultural stories and earn XP.</p>
                            </div>
                          </div>
                        )}
                        {selectedMapPin.featureTypes.includes('ar') && (
                          <div style={{ padding: '10px 12px', borderBottom: selectedMapPin.featureTypes.filter(t => t !== 'ar').length > 0 ? '1px solid var(--card-border)' : 'none', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <Eye size={16} color={PIN_TYPE_CONFIG.ar.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <div>
                              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: PIN_TYPE_CONFIG.ar.color }}>AR Exhibit Zone</p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Point the camera at artifacts here to trigger AR overlays with historical and cultural information.</p>
                            </div>
                          </div>
                        )}
                        {selectedMapPin.featureTypes.includes('catch') && (
                          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <Crosshair size={16} color={PIN_TYPE_CONFIG.catch.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <div>
                              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: PIN_TYPE_CONFIG.catch.color }}>Creature Catch Zone</p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>A mythical creature or cultural symbol can be encountered and captured in this area.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }}
                          onClick={() => alert(`Geofencing triggered at ${selectedMapPin.name}. Notifying nearby app users...`)}
                        >
                          Trigger Geofence
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '8px 10px', fontSize: '12px' }}
                          title="Remove pin"
                          onClick={() => {
                            if (confirm(`Remove pin "${selectedMapPin.name}" from the map?`)) {
                              setMapPins(prev => prev.filter(p => p.id !== selectedMapPin.id));
                              setSelectedMapPinId(mapPins.find(p => p.id !== selectedMapPin.id)?.id ?? null);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0', borderBottom: '1px solid var(--card-border)' }}>
                      <MapPin size={36} color="var(--card-border)" style={{ marginBottom: '10px' }} />
                      <p style={{ fontSize: '13px', margin: '0 0 4px 0', fontWeight: 600 }}>No spot selected</p>
                      <p style={{ fontSize: '11px', margin: 0 }}>Click any pin on the map to view its details</p>
                    </div>
                  )}

                  {/* Pin List */}
                  <div style={{ marginTop: '16px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>All Map Pins</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mapPins.length} spots</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                      {mapPins.map(pin => {
                        const primaryType = pin.featureTypes[0];
                        const cfg = PIN_TYPE_CONFIG[primaryType] || PIN_TYPE_CONFIG.qr;
                        const isActive = pin.id === selectedMapPinId;
                        return (
                          <button
                            key={pin.id}
                            onClick={() => setSelectedMapPinId(pin.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '9px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                              backgroundColor: isActive ? cfg.color + '18' : 'transparent',
                              outline: isActive ? `1.5px solid ${cfg.color}55` : '1px solid transparent',
                              transition: 'background 0.15s',
                            }}
                          >
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0, boxShadow: `0 0 6px ${cfg.glow}` }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '12px', fontWeight: isActive ? 700 : 500, color: isActive ? cfg.color : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pin.name}</p>
                              <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>{pin.featureTypes.map(t => PIN_TYPE_CONFIG[t]?.label).join(' · ')}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TAB CONTENT: AR PROGRESS */}
          {activeTab === 'ar' && (
            <div className="tab-content fade-in">
              <div className="section-header">
                <h2>AR Museum Visits</h2>
                <div className="header-actions">
                  <button className="btn btn-secondary">
                    <Download size={16} style={{marginRight: '8px'}} />
                    Export AR Report
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Total AR Visits</span>
                    <span className="stat-value gold">{stats.totalARVisits.toLocaleString()}</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      +21.5% experiences
                    </span>
                  </div>
                  <div className="stat-icon-wrapper yellow">
                    <Eye size={24} />
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Avg. Engagement Time</span>
                    <span className="stat-value gold">12m 30s</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      +2m vs last month
                    </span>
                  </div>
                  <div className="stat-icon-wrapper purple">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Completion Rate</span>
                    <span className="stat-value gold">62%</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      Finished exhibits
                    </span>
                  </div>
                  <div className="stat-icon-wrapper blue">
                    <CheckCircle size={24} />
                  </div>
                </div>
              </section>

              {/* Dashboard Grid for AR */}
              <section className="dashboard-grid" style={{marginTop: '20px'}}>
                {/* Bar Chart */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3 className="card-title">
                      <TrendingUp className="card-title-icon" size={18} />
                      Top AR Experiences
                    </h3>
                  </div>
                  <div className="chart-wrapper">
                    <div className="chart-grid-line" style={{bottom: '0%'}}></div>
                    <div className="chart-grid-line" style={{bottom: '25%'}}></div>
                    <div className="chart-grid-line" style={{bottom: '50%'}}></div>
                    <div className="chart-grid-line" style={{bottom: '75%'}}></div>
                    
                    {/* Hardcoded AR Bars */}
                    <div className="chart-bar-item">
                      <div className="chart-tooltip">4,215 visits</div>
                      <div className="chart-bar" style={{height: '95%'}}></div>
                      <span className="chart-bar-label">Fort Pilar</span>
                    </div>
                    <div className="chart-bar-item">
                      <div className="chart-tooltip">2,840 visits</div>
                      <div className="chart-bar" style={{height: '65%'}}></div>
                      <span className="chart-bar-label">Yakan</span>
                    </div>
                    <div className="chart-bar-item">
                      <div className="chart-tooltip">1,887 visits</div>
                      <div className="chart-bar" style={{height: '45%'}}></div>
                      <span className="chart-bar-label">Vinta</span>
                    </div>
                    <div className="chart-bar-item">
                      <div className="chart-tooltip">1,200 visits</div>
                      <div className="chart-bar" style={{height: '30%'}}></div>
                      <span className="chart-bar-label">Weaving</span>
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)'}}>
                    <span>Visits based on camera interactions</span>
                    <span>Pink accents represent popular AR views</span>
                  </div>
                </div>

                {/* Table Card */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3 className="card-title">
                      <Eye className="card-title-icon" size={18} />
                      Exhibit Details
                    </h3>
                  </div>
                  <div className="table-wrapper" style={{marginTop: '16px', border: 'none', background: 'transparent'}}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Exhibit</th>
                          <th>Visits</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Fort Pilar Main Shrine</td>
                          <td>4,215</td>
                          <td><span className="badge active">Highly Active</span></td>
                        </tr>
                        <tr>
                          <td>Yakan Weaving Gallery</td>
                          <td>2,840</td>
                          <td><span className="badge active">Moderate</span></td>
                        </tr>
                        <tr>
                          <td>Vinta History Room</td>
                          <td>1,887</td>
                          <td><span className="badge active">Growing</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB CONTENT: CATCH PROGRESS */}
          {activeTab === 'catch' && (
            <div className="tab-content fade-in">
              <div className="section-header">
                <h2>Cultural Icons Caught</h2>
                <div className="header-actions">
                  <button className="btn btn-secondary">
                    <Download size={16} style={{marginRight: '8px'}} />
                    Export Catch Data
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Total Catches</span>
                    <span className="stat-value gold">{stats.totalCatches}</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      +12 items unlocked
                    </span>
                  </div>
                  <div className="stat-icon-wrapper yellow">
                    <Target size={24} />
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Epic Icons Found</span>
                    <span className="stat-value gold">85</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      Rare items found
                    </span>
                  </div>
                  <div className="stat-icon-wrapper purple">
                    <Star size={24} />
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Unlock Rate</span>
                    <span className="stat-value gold">42%</span>
                    <span className="stat-trend trend-up">
                      <ArrowUpRight size={14} />
                      Of total catalog
                    </span>
                  </div>
                  <div className="stat-icon-wrapper blue">
                    <TrendingUp size={24} />
                  </div>
                </div>
              </section>

              {/* Dashboard Grid for Catch */}
              <section className="dashboard-grid" style={{marginTop: '20px'}}>
                {/* Bar Chart */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3 className="card-title">
                      <TrendingUp className="card-title-icon" size={18} />
                      Most Caught Icons
                    </h3>
                  </div>
                  <div className="chart-wrapper">
                    <div className="chart-grid-line" style={{bottom: '0%'}}></div>
                    <div className="chart-grid-line" style={{bottom: '25%'}}></div>
                    <div className="chart-grid-line" style={{bottom: '50%'}}></div>
                    <div className="chart-grid-line" style={{bottom: '75%'}}></div>
                    
                    {/* Hardcoded Catch Bars */}
                    <div className="chart-bar-item">
                      <div className="chart-tooltip">133 catches</div>
                      <div className="chart-bar" style={{height: '95%'}}></div>
                      <span className="chart-bar-label">Curacha</span>
                    </div>
                    <div className="chart-bar-item">
                      <div className="chart-tooltip">124 catches</div>
                      <div className="chart-bar" style={{height: '85%'}}></div>
                      <span className="chart-bar-label">Yakan Weaving</span>
                    </div>
                    <div className="chart-bar-item">
                      <div className="chart-tooltip">85 catches</div>
                      <div className="chart-bar" style={{height: '60%'}}></div>
                      <span className="chart-bar-label">Lantaka</span>
                    </div>
                    <div className="chart-bar-item">
                      <div className="chart-tooltip">40 catches</div>
                      <div className="chart-bar" style={{height: '25%'}}></div>
                      <span className="chart-bar-label">Vinta</span>
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)'}}>
                    <span>Total successful catches</span>
                    <span>Pink accents represent popular icons</span>
                  </div>
                </div>

                {/* Table Card */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3 className="card-title">
                      <Target className="card-title-icon" size={18} />
                      Icon Details
                    </h3>
                  </div>
                  <div className="table-wrapper" style={{marginTop: '16px', border: 'none', background: 'transparent'}}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Icon</th>
                          <th>Rarity</th>
                          <th>Catches</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Golden Vinta</td>
                          <td><span className="badge" style={{backgroundColor: 'var(--accent-gold)', color: '#000'}}>Epic</span></td>
                          <td>85</td>
                        </tr>
                        <tr>
                          <td>Chabacano Scroll</td>
                          <td><span className="badge" style={{backgroundColor: '#A78BFA', color: '#FFF'}}>Rare</span></td>
                          <td>124</td>
                        </tr>
                        <tr>
                          <td>Yakan Fabric</td>
                          <td><span className="badge" style={{backgroundColor: '#14B8A6', color: '#FFF'}}>Common</span></td>
                          <td>133</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB CONTENT: TRIVIA QUESTIONS */}
          {activeTab === 'trivia' && (
            <section className="content-card" style={{ gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h3 className="card-title">
                  <HelpCircle className="card-title-icon" size={18} />
                  Trivia Question Bank
                </h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <select
                    className="form-select"
                    style={{ padding: '8px 12px', fontSize: '12px', minWidth: '200px' }}
                    value={triviaSpotFilter}
                    onChange={(e) => setTriviaSpotFilter(e.target.value)}
                  >
                    <option value="">All Spots ({triviaQuestions.length} questions)</option>
                    {spots.map(s => {
                      const count = triviaQuestions.filter(q => q.spot_name === s.name).length;
                      return <option key={s.id} value={s.id}>{s.name} ({count})</option>;
                    })}
                  </select>
                  <button className="btn btn-primary" onClick={() => setIsAddTriviaModalOpen(true)}>
                    <Plus size={16} />
                    Add Question
                  </button>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '160px' }}>Spot</th>
                      <th>Question</th>
                      <th style={{ width: '90px' }}>Choices</th>
                      <th>Correct Answer</th>
                      <th style={{ width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTriviaQuestions.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                          {triviaSpotFilter ? 'No questions for this spot yet. Add one!' : 'No trivia questions yet. Add some to get started.'}
                        </td>
                      </tr>
                    ) : (
                      filteredTriviaQuestions.map(q => (
                        <tr key={q.id}>
                          <td>
                            <span className="badge active-status" style={{ fontSize: '10px' }}>{q.spot_name}</span>
                          </td>
                          <td style={{ fontWeight: 500, color: 'var(--text-title)', maxWidth: '300px' }}>
                            <span title={q.question}>
                              {q.question.length > 80 ? q.question.slice(0, 80) + '…' : q.question}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            {q.choices?.length || 0} options
                          </td>
                          <td style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '12px' }}>
                            {['A', 'B', 'C', 'D'][q.correct_index]} — {q.choices?.[q.correct_index]?.slice(0, 40)}{q.choices?.[q.correct_index]?.length > 40 ? '…' : ''}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="icon-action-btn" title="Edit" onClick={() => openEditTrivia(q)}>
                                <Edit size={14} />
                              </button>
                              <button className="icon-action-btn delete" title="Delete" onClick={() => handleDeleteTrivia(q.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {triviaQuestions.length > 0 && (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {spots.map(s => {
                    const count = triviaQuestions.filter(q => q.spot_name === s.name).length;
                    if (count === 0) return null;
                    const color = count >= 10 ? '#10B981' : count >= 5 ? 'var(--accent-gold)' : 'var(--accent-pink)';
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${color}44`, backgroundColor: `${color}11` }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{s.name}</span>
                        <span style={{ fontSize: '11px', color, fontWeight: 700 }}>{count}q</span>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 'auto' }}>
                    Green = 10+ questions · Gold = 5–9 · Pink = &lt;5
                  </div>
                </div>
              )}
            </section>
          )}

        </div>
      </main>

      {/* ADD SPOT MODAL */}
      {isAddSpotModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Add New Feature Place</h3>
              <button className="close-btn" onClick={() => setIsAddSpotModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSpot}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Spot Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Paseo del Mar"
                    value={newSpot.name} onChange={(e) => setNewSpot({...newSpot, name: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input type="text" className="form-input" placeholder="e.g. Valderosa St, Zamboanga City"
                    value={newSpot.location_name} onChange={(e) => setNewSpot({...newSpot, location_name: e.target.value})} required />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input type="number" step="any" className="form-input" placeholder="e.g. 6.9015"
                      value={newSpot.latitude} onChange={(e) => setNewSpot({...newSpot, latitude: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input type="number" step="any" className="form-input" placeholder="e.g. 122.0818"
                      value={newSpot.longitude} onChange={(e) => setNewSpot({...newSpot, longitude: e.target.value})} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" placeholder="Describe the feature place and its significance..."
                    value={newSpot.description} onChange={(e) => setNewSpot({...newSpot, description: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Historical Background</label>
                  <textarea className="form-textarea" placeholder="Historical facts and background..."
                    value={newSpot.historical_background} onChange={(e) => setNewSpot({...newSpot, historical_background: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Cultural Significance</label>
                  <textarea className="form-textarea" placeholder="Why it matters culturally..."
                    value={newSpot.cultural_significance} onChange={(e) => setNewSpot({...newSpot, cultural_significance: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Fun Fact</label>
                  <textarea className="form-textarea" placeholder="Did you know..."
                    value={newSpot.fun_fact} onChange={(e) => setNewSpot({...newSpot, fun_fact: e.target.value})} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddSpotModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Spot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD MAP PIN MODAL ── */}
      {isAddMapPinModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Spot to Map</h3>
              <button className="close-btn" onClick={() => setIsAddMapPinModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMapPin} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                {/* ── Left: Mini Map ── */}
                <div style={{ position: 'relative', flex: '0 0 420px', borderRight: '1px solid var(--card-border)' }}>
                  <div ref={modalMapContainerRef} style={{ width: '100%', height: '100%' }} />

                  {/* Search bar overlay */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 800, display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search a place..."
                      value={modalSearchQuery}
                      onChange={e => setModalSearchQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleModalSearch(); } }}
                      style={{ flex: 1, fontSize: '12px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(8,10,21,0.88)', backdropFilter: 'blur(8px)' }}
                    />
                    <button
                      type="button"
                      onClick={handleModalSearch}
                      disabled={modalSearching}
                      style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(8,10,21,0.88)', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}
                    >
                      {modalSearching ? <span style={{ fontSize: '11px' }}>...</span> : <Search size={14} />}
                    </button>
                  </div>

                  {/* Coordinate pill */}
                  <div style={{
                    position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(8,10,21,0.82)', backdropFilter: 'blur(6px)',
                    color: 'var(--text-secondary)', fontSize: '11px', padding: '5px 12px',
                    borderRadius: '20px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 400,
                    border: '1px solid var(--card-border)',
                  }}>
                    {newMapPin.lat && newMapPin.lng
                      ? `📍 ${parseFloat(newMapPin.lat).toFixed(4)}° N, ${parseFloat(newMapPin.lng).toFixed(4)}° E`
                      : 'Click the map to place a pin'}
                  </div>
                </div>

                {/* ── Right: Form Fields ── */}
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  <div className="form-group">
                    <label className="form-label">Spot / Location Name</label>
                    <input type="text" className="form-input" placeholder="e.g. Zamboanga City Museum" required
                      value={newMapPin.name} onChange={e => setNewMapPin({ ...newMapPin, name: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" placeholder="Brief description of this spot..."
                      value={newMapPin.description} onChange={e => setNewMapPin({ ...newMapPin, description: e.target.value })} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Latitude</label>
                      <input type="number" step="any" className="form-input" placeholder="e.g. 6.9032" required
                        value={newMapPin.lat} onChange={e => setNewMapPin({ ...newMapPin, lat: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Longitude</label>
                      <input type="number" step="any" className="form-input" placeholder="e.g. 122.0821" required
                        value={newMapPin.lng} onChange={e => setNewMapPin({ ...newMapPin, lng: e.target.value })} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Feature Type(s) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(select at least one)</span></label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      {Object.entries(PIN_TYPE_CONFIG).map(([type, cfg]) => {
                        const checked = newMapPin.featureTypes.includes(type);
                        return (
                          <button type="button" key={type}
                            onClick={() => toggleNewPinType(type)}
                            style={{
                              flex: 1, padding: '10px 8px', borderRadius: '10px', border: `2px solid ${checked ? cfg.color : 'var(--card-border)'}`,
                              backgroundColor: checked ? cfg.color + '22' : 'transparent',
                              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                              transition: 'all 0.15s',
                            }}
                          >
                            {type === 'qr' && <QrCode size={20} color={checked ? cfg.color : 'var(--text-muted)'} />}
                            {type === 'ar' && <Eye size={20} color={checked ? cfg.color : 'var(--text-muted)'} />}
                            {type === 'catch' && <Crosshair size={20} color={checked ? cfg.color : 'var(--text-muted)'} />}
                            <span style={{ fontSize: '11px', fontWeight: 700, color: checked ? cfg.color : 'var(--text-muted)' }}>{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddMapPinModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add to Map</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SPOT MODAL */}
      {isEditSpotModalOpen && editingSpot && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Edit Feature Place</h3>
              <button className="close-btn" onClick={() => {
                setIsEditSpotModalOpen(false);
                setEditingSpot(null);
              }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSpotSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Spot Name</label>
                  <input type="text" className="form-input" value={editingSpot.name}
                    onChange={(e) => setEditingSpot({...editingSpot, name: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input type="text" className="form-input" value={editingSpot.location || ''}
                    onChange={(e) => setEditingSpot({...editingSpot, location: e.target.value})} required />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input type="number" step="any" className="form-input" value={editingSpot.latitude || ''}
                      onChange={(e) => setEditingSpot({...editingSpot, latitude: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input type="number" step="any" className="form-input" value={editingSpot.longitude || ''}
                      onChange={(e) => setEditingSpot({...editingSpot, longitude: e.target.value})} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={editingSpot.aboutPlace || ''}
                    onChange={(e) => setEditingSpot({...editingSpot, aboutPlace: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Historical Background</label>
                  <textarea className="form-textarea" value={editingSpot.historical_background || ''}
                    onChange={(e) => setEditingSpot({...editingSpot, historical_background: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Cultural Significance</label>
                  <textarea className="form-textarea" value={editingSpot.cultural_significance || ''}
                    onChange={(e) => setEditingSpot({...editingSpot, cultural_significance: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Fun Fact</label>
                  <textarea className="form-textarea" value={editingSpot.fun_fact || ''}
                    onChange={(e) => setEditingSpot({...editingSpot, fun_fact: e.target.value})} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary"
                  onClick={() => { setIsEditSpotModalOpen(false); setEditingSpot(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD QR MODAL --- */}
      {isAddQrModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title"><Plus size={18} style={{marginRight: '8px'}} /> Add New QR Marker</h3>
              <button className="icon-action-btn" onClick={() => setIsAddQrModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddQr}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Cultural Spot</label>
                  <select className="form-select" value={newQr.spot_id}
                    onChange={(e) => setNewQr({...newQr, spot_id: e.target.value})} required>
                    <option value="">— Select a spot —</option>
                    {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">QR Code String</label>
                  <input type="text" className="form-input" placeholder="e.g. LAKBAY-FORTPILAR-001"
                    value={newQr.qr_code_string} onChange={(e) => setNewQr({...newQr, qr_code_string: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Unlock Type</label>
                  <select className="form-select" value={newQr.unlock_type}
                    onChange={(e) => setNewQr({...newQr, unlock_type: e.target.value})}>
                    <option value="cultural_story">Cultural Story</option>
                    <option value="ar_creature">AR Creature</option>
                    <option value="hidden_game">Hidden Game Content</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Bonus Creature (optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. Curacha Spirit"
                    value={newQr.bonus_creature} onChange={(e) => setNewQr({...newQr, bonus_creature: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={newQr.is_active ? 'true' : 'false'}
                    onChange={(e) => setNewQr({...newQr, is_active: e.target.value === 'true'})}>
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddQrModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save QR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT QR MODAL --- */}
      {isEditQrModalOpen && editingQr && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title"><Edit size={18} style={{marginRight: '8px'}} /> Edit QR Marker</h3>
              <button className="icon-action-btn" onClick={() => { setIsEditQrModalOpen(false); setEditingQr(null); }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditQrSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Cultural Spot</label>
                  <select className="form-select" value={editingQr.spot_id || ''}
                    onChange={(e) => setEditingQr({...editingQr, spot_id: parseInt(e.target.value)})} required>
                    <option value="">— Select a spot —</option>
                    {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">QR Code String</label>
                  <input type="text" className="form-input" value={editingQr.qr_code_string || ''}
                    onChange={(e) => setEditingQr({...editingQr, qr_code_string: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Unlock Type</label>
                  <select className="form-select" value={editingQr.unlock_type || 'cultural_story'}
                    onChange={(e) => setEditingQr({...editingQr, unlock_type: e.target.value})}>
                    <option value="cultural_story">Cultural Story</option>
                    <option value="ar_creature">AR Creature</option>
                    <option value="hidden_game">Hidden Game Content</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Bonus Creature (optional)</label>
                  <input type="text" className="form-input" value={editingQr.bonus_creature || ''}
                    onChange={(e) => setEditingQr({...editingQr, bonus_creature: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={editingQr.status === 'Active' ? 'true' : 'false'}
                    onChange={(e) => setEditingQr({...editingQr, status: e.target.value === 'true' ? 'Active' : 'Disabled'})}>
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary"
                  onClick={() => { setIsEditQrModalOpen(false); setEditingQr(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BADGE MODAL */}
      {isAddBadgeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Create New Badge</h3>
              <button className="close-btn" onClick={() => setIsAddBadgeModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddBadge}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Badge Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Master Explorer"
                    value={newBadge.name}
                    onChange={(e) => setNewBadge({...newBadge, name: e.target.value})}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Badge Description (Optional)</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Describe how to earn this badge... (Auto-generated if left blank)"
                    value={newBadge.desc}
                    onChange={(e) => setNewBadge({...newBadge, desc: e.target.value})}
                    rows={3}
                  />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'}}>
                  <div className="form-group">
                    <label className="form-label">Req. QR Scans</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0"
                      value={newBadge.reqQR}
                      onChange={(e) => setNewBadge({...newBadge, reqQR: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Req. AR Visits</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0"
                      value={newBadge.reqAR}
                      onChange={(e) => setNewBadge({...newBadge, reqAR: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Req. Catches</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0"
                      value={newBadge.reqCatch}
                      onChange={(e) => setNewBadge({...newBadge, reqCatch: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Badge Icon Type</label>
                  <select 
                    className="form-input" 
                    value={newBadge.iconName}
                    onChange={(e) => setNewBadge({...newBadge, iconName: e.target.value})}
                  >
                    <option value="award">Award (Default)</option>
                    <option value="map">Map</option>
                    <option value="compass">Compass</option>
                    <option value="shield">Shield</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsAddBadgeModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TRIVIA MODAL */}
      {isAddTriviaModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title"><HelpCircle size={18} style={{ marginRight: '8px' }} /> Add Trivia Question</h3>
              <button className="close-btn" onClick={() => setIsAddTriviaModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTrivia}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Cultural Spot</label>
                  <select className="form-select" value={newTrivia.spot_id}
                    onChange={(e) => setNewTrivia({ ...newTrivia, spot_id: e.target.value })} required>
                    <option value="">— Select a spot —</option>
                    {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Question</label>
                  <textarea className="form-textarea" placeholder="e.g. In what year was Fort Pilar built?"
                    value={newTrivia.question} onChange={(e) => setNewTrivia({ ...newTrivia, question: e.target.value })} required />
                </div>
                {['a', 'b', 'c', 'd'].map((letter, idx) => (
                  <div className="form-group" key={letter}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: parseInt(newTrivia.correct_index) === idx ? 'var(--accent-pink)' : 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                        {letter.toUpperCase()}
                      </span>
                      Choice {letter.toUpperCase()}
                      {parseInt(newTrivia.correct_index) === idx && <span style={{ fontSize: '10px', color: 'var(--accent-pink)', fontWeight: 700 }}>✓ CORRECT</span>}
                    </label>
                    <input type="text" className="form-input" placeholder={`Choice ${letter.toUpperCase()}...`}
                      value={newTrivia[`choice_${letter}`]}
                      onChange={(e) => setNewTrivia({ ...newTrivia, [`choice_${letter}`]: e.target.value })} required />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Correct Answer</label>
                  <select className="form-select" value={newTrivia.correct_index}
                    onChange={(e) => setNewTrivia({ ...newTrivia, correct_index: e.target.value })}>
                    <option value="0">A — {newTrivia.choice_a || '(empty)'}</option>
                    <option value="1">B — {newTrivia.choice_b || '(empty)'}</option>
                    <option value="2">C — {newTrivia.choice_c || '(empty)'}</option>
                    <option value="3">D — {newTrivia.choice_d || '(empty)'}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddTriviaModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRIVIA MODAL */}
      {isEditTriviaModalOpen && editingTrivia && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title"><Edit size={18} style={{ marginRight: '8px' }} /> Edit Trivia Question</h3>
              <button className="close-btn" onClick={() => { setIsEditTriviaModalOpen(false); setEditingTrivia(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditTriviaSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Cultural Spot</label>
                  <select className="form-select" value={editingTrivia.spot_id}
                    onChange={(e) => setEditingTrivia({ ...editingTrivia, spot_id: e.target.value })} required>
                    <option value="">— Select a spot —</option>
                    {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Question</label>
                  <textarea className="form-textarea" value={editingTrivia.question}
                    onChange={(e) => setEditingTrivia({ ...editingTrivia, question: e.target.value })} required />
                </div>
                {['a', 'b', 'c', 'd'].map((letter, idx) => (
                  <div className="form-group" key={letter}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: parseInt(editingTrivia.correct_index) === idx ? 'var(--accent-pink)' : 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                        {letter.toUpperCase()}
                      </span>
                      Choice {letter.toUpperCase()}
                      {parseInt(editingTrivia.correct_index) === idx && <span style={{ fontSize: '10px', color: 'var(--accent-pink)', fontWeight: 700 }}>✓ CORRECT</span>}
                    </label>
                    <input type="text" className="form-input" value={editingTrivia[`choice_${letter}`]}
                      onChange={(e) => setEditingTrivia({ ...editingTrivia, [`choice_${letter}`]: e.target.value })} required />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Correct Answer</label>
                  <select className="form-select" value={editingTrivia.correct_index}
                    onChange={(e) => setEditingTrivia({ ...editingTrivia, correct_index: e.target.value })}>
                    <option value="0">A — {editingTrivia.choice_a || '(empty)'}</option>
                    <option value="1">B — {editingTrivia.choice_b || '(empty)'}</option>
                    <option value="2">C — {editingTrivia.choice_c || '(empty)'}</option>
                    <option value="3">D — {editingTrivia.choice_d || '(empty)'}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsEditTriviaModalOpen(false); setEditingTrivia(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal-card" onClick={e => e.stopPropagation()}>
            <div className="logout-modal-icon">
              <LogOut size={28} />
            </div>
            <h3 className="logout-modal-title">Sign Out?</h3>
            <p className="logout-modal-body">
              You'll be returned to the login screen. Any unsaved changes will be lost.
            </p>
            <div className="logout-modal-actions">
              <button
                className="logout-modal-btn logout-modal-btn--cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="logout-modal-btn logout-modal-btn--confirm"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
