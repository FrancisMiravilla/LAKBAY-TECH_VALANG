import { useState, useMemo, useEffect, useRef } from 'react'
import lakbayLogo from './assets/lakbay_icon_glyph.png'
import {
  LayoutDashboard,
  MapPin,
  QrCode,
  HelpCircle,
  Sparkles,
  Landmark,
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
  LogOut,
  ArrowLeft,
  Image as ImageIcon
} from 'lucide-react'

import './App.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { authService } from './api/authService';
import '@google/model-viewer';
import qrService from './api/qrService';
import QRCodeLib from 'qrcode';
import ErrorModal from './ErrorModal';

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
  qr:    { color: '#1A56DB', glow: 'rgba(26,86,219,0.55)', label: 'QR Scan' },
  ar:    { color: '#10B981', glow: 'rgba(16,185,129,0.55)',  label: 'AR Exhibit' },
  catch: { color: '#FBBF24', glow: 'rgba(251,191,36,0.55)', label: 'Catch Zone' },
};

// Inline SVG glyphs for map marker pins (mirrors the mobile app's markers)
const PIN_ICON_SVG = {
  ar: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" fill="#fff" stroke="none"/><rect x="18" y="18" width="3" height="3" fill="#fff" stroke="none"/><rect x="14" y="18" width="3" height="3" fill="#fff" stroke="none"/></svg>',
  catch: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 5H4a1 1 0 0 0-1 1 5 5 0 0 0 4 4.9M17 5h3a1 1 0 0 1 1 1 5 5 0 0 1-4 4.9"/></svg>',
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
  location_name: s.location_name,
  latitude: s.latitude,
  longitude: s.longitude,
  aboutPlace: s.description,
  description: s.description,
  historical_background: s.historical_background,
  cultural_significance: s.cultural_significance,
  fun_fact: s.fun_fact,
  feature_types: s.feature_types || [],
  model_3d: s.model_3d || null,
  images: [s.image, s.image2, s.image3].filter(img => img).map(img => {
    if (img.startsWith('/media')) return `http://localhost:8000${img}`;
    return img;
  }),
  is_featured: s.is_featured,
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
  const [theme, setTheme] = useState('light');

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [theme]);
  
  // Data States
  const [spots, setSpots] = useState([]);
  const [selectedPinId, setSelectedPinId] = useState(1);
  const [qrcodes, setQrcodes] = useState([]);
  const [catchIcons, setCatchIcons] = useState([]);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Modals & Forms
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
    featureTypes: ['qr'],
    images: ['', '', ''],
    model_3d: null,
    images: ['', '', ''],
    is_featured: false,
  });

  const [isEditSpotModalOpen, setIsEditSpotModalOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);

  const [selectedMapPinId, setSelectedMapPinId] = useState(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSearching, setModalSearching] = useState(false);

  // Selected Spot for Interactive Map
  const selectedSpot = useMemo(() => {
    return spots.find(s => s.id === selectedPinId);
  }, [spots, selectedPinId]);

  const selectedMapPin = useMemo(() => spots.find(p => p.id === selectedMapPinId), [spots, selectedMapPinId]);

  // Map Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerElemsRef = useRef({}); // { pinId: { el, circle, badgeEl, cfg, baseSize, selSize } }

  // Modal mini-map refs
  const modalMapContainerRef = useRef(null);
  const modalMapRef = useRef(null);
  const modalMarkerRef = useRef(null);

  const editModalMapContainerRef = useRef(null);
  const editModalMapRef = useRef(null);
  const editModalMarkerRef = useRef(null);

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

    spots.forEach(pin => {
      const primaryType = pin.feature_types && pin.feature_types.length > 0 ? pin.feature_types[0] : 'qr';
      const cfg = PIN_TYPE_CONFIG[primaryType] || PIN_TYPE_CONFIG.qr;
      const isSelected = selectedMapPinId === pin.id;
      const hasModel = primaryType === 'catch' && !!pin.model_3d;
      const baseSize = hasModel ? 46 : 34;
      const selSize = hasModel ? 54 : 42;
      const size = isSelected ? selSize : baseSize;

      // Outer positioning wrapper (kept overflow-visible so the badge below isn't clipped)
      const el = document.createElement('div');
      el.className = 'custom-map-marker';
      el.title = pin.name;
      el.style.cssText = `width: ${size}px; height: ${size}px; position: relative; cursor: pointer;`;

      // Clipped, colored circle holding either the type icon or a live 3D model
      const circle = document.createElement('div');
      circle.className = 'pin-circle';
      circle.style.cssText = `
        width: 100%; height: 100%; border-radius: 50%; overflow: hidden;
        background-color: ${cfg.color};
        border: 3px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.85)'};
        box-shadow: 0 0 ${isSelected ? 20 : 10}px ${cfg.glow}, 0 0 0 ${isSelected ? '5px' : '0px'} ${cfg.glow};
        display: flex; align-items: center; justify-content: center;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      `;
      el.appendChild(circle);

      if (hasModel) {
        const mv = document.createElement('model-viewer');
        mv.setAttribute('src', qrService.getMediaUrl(pin.model_3d));
        mv.setAttribute('auto-rotate', '');
        mv.setAttribute('rotation-per-second', '28deg');
        mv.setAttribute('disable-zoom', '');
        mv.setAttribute('interaction-prompt', 'none');
        mv.setAttribute('exposure', '1.1');
        mv.style.cssText = 'width:100%;height:100%;background:transparent;pointer-events:none;';
        circle.appendChild(mv);
      } else {
        const iconWrap = document.createElement('div');
        iconWrap.innerHTML = PIN_ICON_SVG[primaryType] || PIN_ICON_SVG.qr;
        iconWrap.style.cssText = 'width:58%;height:58%;display:flex;align-items:center;justify-content:center;pointer-events:none;';
        circle.appendChild(iconWrap);
      }

      // Type badge below marker
      const badgeEl = document.createElement('div');
      badgeEl.className = 'pin-badge';
      badgeEl.innerText = primaryType.toUpperCase();
      badgeEl.style.cssText = `
        position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 4px;
        background: ${cfg.color}; color: #fff; font-size: 7px; font-weight: 800;
        letter-spacing: 0.5px; padding: 1px 4px; border-radius: 3px;
        white-space: nowrap; pointer-events: none; opacity: ${isSelected ? 1 : 0.85};
      `;
      el.appendChild(badgeEl);

      // Store refs for highlight updates
      markerElemsRef.current[pin.id] = { el, circle, badgeEl, cfg, baseSize, selSize };

      el.addEventListener('click', () => setSelectedMapPinId(pin.id));

      // Rich popup
      const typeLabels = (pin.feature_types || []).map(t => `<span style="background:${PIN_TYPE_CONFIG[t]?.color};color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:3px;margin-right:4px">${PIN_TYPE_CONFIG[t]?.label}</span>`).join('');
      const popupHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:4px 0;min-width:180px">
          <div style="margin-bottom:6px">${typeLabels}</div>
          <strong style="font-size:13px;color:#1a1a2e;display:block;margin-bottom:4px">${pin.name}</strong>
          <p style="font-size:11px;color:#555;margin:0 0 6px 0;line-height:1.5">${pin.description || 'No description available.'}</p>
          <p style="font-size:10px;color:#999;margin:0">📍 ${parseFloat(pin.latitude || 0).toFixed(4)}° N, ${parseFloat(pin.longitude || 0).toFixed(4)}° E</p>
        </div>`;

      const divIcon = L.divIcon({
        html: el,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 8)],
      });
      const coord = [parseFloat(pin.latitude) || 0, parseFloat(pin.longitude) || 0];
      const marker = L.marker(coord, {
        icon: divIcon
      })
        .bindPopup(popupHtml, { maxWidth: 240 })
        .addTo(map);
    });

    return () => { map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, theme, spots, selectedMapPinId]);

  // Update marker highlight styles WITHOUT rebuilding the map
  useEffect(() => {
    Object.entries(markerElemsRef.current).forEach(([idStr, { el, circle, badgeEl, cfg, baseSize, selSize }]) => {
      const isSelected = parseInt(idStr) === selectedMapPinId;
      const size = isSelected ? selSize : baseSize;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.zIndex = isSelected ? 1000 : 1;
      circle.style.border = `3px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.85)'}`;
      circle.style.boxShadow = `0 0 ${isSelected ? 20 : 10}px ${cfg.glow}, 0 0 0 ${isSelected ? '5px' : '0px'} ${cfg.glow}`;
      badgeEl.style.opacity = isSelected ? '1' : '0.85';
    });
  }, [selectedMapPinId]);

  // Handle flyTo when selectedMapPinId changes
  useEffect(() => {
    if (!mapRef.current || activeTab !== 'map') return;
    try {
      const pin = spots.find(p => p.id === selectedMapPinId);
      if (pin && pin.latitude) {
        mapRef.current.flyTo([parseFloat(pin.latitude), parseFloat(pin.longitude)], 14);
      }
    } catch (err) {
      console.warn("Leaflet flyTo skipped due to rendering state:", err);
    }
  }, [selectedMapPinId, spots, activeTab]);


  const toggleNewSpotType = (type) => {
    setNewSpot(prev => {
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

  const toggleEditingSpotType = (type) => {
    setEditingSpot(prev => {
      const types = prev.feature_types || [];
      const has = types.includes(type);
      if (has && types.length === 1) return prev; // keep at least one
      return {
        ...prev,
        feature_types: has
          ? types.filter(t => t !== type)
          : [...types, type],
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
    if (!isAddSpotModalOpen) {
      if (modalMapRef.current) {
        modalMapRef.current.remove();
        modalMapRef.current = null;
        modalMarkerRef.current = null;
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
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setNewSpot(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));

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
  }, [isAddSpotModalOpen, theme]);

  // Initialize modal map when Edit Spot modal opens
  useEffect(() => {
    if (!isEditSpotModalOpen) {
      if (editModalMapRef.current) {
        editModalMapRef.current.remove();
        editModalMapRef.current = null;
        editModalMarkerRef.current = null;
      }
      return;
    }

    // Wait for the DOM to render the container
    const timer = setTimeout(() => {
      if (!editModalMapContainerRef.current || editModalMapRef.current || !editingSpot) return;

      const tileUrl = theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      const initialLat = parseFloat(editingSpot.latitude) || 6.9214;
      const initialLng = parseFloat(editingSpot.longitude) || 122.0790;
      const hasCoords = !!editingSpot.latitude && !!editingSpot.longitude;

      const map = L.map(editModalMapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: hasCoords ? 15 : 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      if (hasCoords) {
        editModalMarkerRef.current = L.circleMarker([initialLat, initialLng], {
          radius: 8,
          color: '#e91e8c',
          fillColor: '#e91e8c',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map);
      }

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setEditingSpot(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));

        if (editModalMarkerRef.current) editModalMarkerRef.current.remove();
        editModalMarkerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          color: '#e91e8c',
          fillColor: '#e91e8c',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map);
      });

      editModalMapRef.current = map;
    }, 50);

    return () => clearTimeout(timer);
  }, [isEditSpotModalOpen, theme]);

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
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        modalMapRef.current.flyTo([parsedLat, parsedLon], 15);
        setNewSpot(prev => ({ ...prev, latitude: parsedLat.toFixed(6), longitude: parsedLon.toFixed(6) }));
        if (modalMarkerRef.current) modalMarkerRef.current.remove();
        modalMarkerRef.current = L.circleMarker([parsedLat, parsedLon], {
          radius: 8,
          color: '#6c63ff',
          fillColor: '#6c63ff',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(modalMapRef.current);
      } else {
        showError('Location not found. Try a different search term.', 'Location Not Found', 'warning');
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
  const [isEditTriviaModalOpen, setIsEditTriviaModalOpen] = useState(false);
  const [editingTrivia, setEditingTrivia] = useState(null);
  
  // AI Quiz Generator States
  const [generateQuizCount, setGenerateQuizCount] = useState(5);
  const [isGenerateQuizModalOpen, setIsGenerateQuizModalOpen] = useState(false);
  const [generateQuizStep, setGenerateQuizStep] = useState(1);
  const [generateQuizType, setGenerateQuizType] = useState('spot'); // 'spot' or 'icon'
  const [generateQuizContentId, setGenerateQuizContentId] = useState('');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // Review Quiz States
  const [pendingQuizzes, setPendingQuizzes] = useState([]);
  const [isReviewQuizModalOpen, setIsReviewQuizModalOpen] = useState(false);
  const [reviewingQuiz, setReviewingQuiz] = useState(null);
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

  // ── Global Error Modal ──────────────────────────────────────────────────────
  const [errorModal, setErrorModal] = useState({ visible: false, type: 'error', title: '', message: '' });
  const showError = (message, title = 'Error', type = 'error') =>
    setErrorModal({ visible: true, type, title, message });
  const closeErrorModal = () => setErrorModal(prev => ({ ...prev, visible: false }));

  // Restore session from localStorage on page load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    authService.getProfile()
      .then((user) => {
        if (user.is_staff) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          if (user.role === 'tourist_guide') setActiveTab('trivia_review');
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
        showError('Access denied. Only staff accounts can log into the admin panel.', 'Access Denied', 'error');
        return;
      }

      setCurrentUser(user);
      setIsAuthenticated(true);
      if (user.role === 'tourist_guide') setActiveTab('trivia_review');
    } catch (error) {
      showError('Invalid credentials. Please check your email and password.', 'Login Failed', 'error');
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
    qrService.getSpots().then(({ data }) => {
      const items = Array.isArray(data) ? data : (data.results || []);
      setSpots(items.map(normalizeSpot));
    }).catch(console.error);

    if (currentUser && currentUser.role !== 'tourist_guide') {
      qrService.getMarkers().then(({ data }) => {
        const items = Array.isArray(data) ? data : (data.results || []);
        setQrcodes(items.map(normalizeMarker));
      }).catch(console.error);
      
      qrService.getUsers().then(({ data }) => {
        const items = Array.isArray(data) ? data : (data.results || []);
        setUsers(items);
      }).catch(console.error);
    }

    qrService.getCatchIcons().then(({ data }) => {
      const items = Array.isArray(data) ? data : (data.results || []);
      setCatchIcons(items);
    }).catch(console.error);
    
    qrService.getTriviaQuestions().then(({ data }) => {
      const items = Array.isArray(data) ? data : (data.results || []);
      setTriviaQuestions(items);
    }).catch(console.error);

    qrService.getARTargets().then(({ data }) => {
      const items = Array.isArray(data) ? data : (data.results || []);
      setArTargets(items);
    }).catch(console.error);

    // Fetch pending quizzes for Review Module
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'tourist_guide')) {
      qrService.getPendingQuizzes().then(({ data }) => {
        setPendingQuizzes(data || []);
      }).catch(console.error);
    }
  }, [isAuthenticated, currentUser]);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Vinta boat registration V-206 pending verification.', time: '10m ago' },
    { id: 2, text: 'Daily app metrics update compiled successfully.', time: '1h ago' }
  ]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);


  const [isAddCatchIconModalOpen, setIsAddCatchIconModalOpen] = useState(false);
  const [isAddARTargetModalOpen, setIsAddARTargetModalOpen] = useState(false);
  const [arTargets, setArTargets] = useState([]);
  const [newARTarget, setNewARTarget] = useState({ name: '', description: '', image: null });
  const [isEditCatchIconModalOpen, setIsEditCatchIconModalOpen] = useState(false);
  const [editingCatchIcon, setEditingCatchIcon] = useState(null);
  const [selectedCatchForView, setSelectedCatchForView] = useState(null);
  const [newCatchIcon, setNewCatchIcon] = useState({
    name: '', emoji: '👾', tagline: '', type_name: 'Catch Model', color: '#38BDF8',
    about: '', significance: '', facts: [], model_3d: ''
  });

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

  const handleImageFileChange = (e, index, isEdit) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      if (isEdit) {
        setEditingSpot(prev => {
          const newImages = [...(prev.images || ['', '', ''])];
          newImages[index] = base64String;
          return { ...prev, images: newImages };
        });
      } else {
        setNewSpot(prev => {
          const newImages = [...(prev.images || ['', '', ''])];
          newImages[index] = base64String;
          return { ...prev, images: newImages };
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleModelFileChange = (e, isEdit) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      if (isEdit) {
        setEditingSpot(prev => ({ ...prev, model_3d: base64String }));
      } else {
        setNewSpot(prev => ({ ...prev, model_3d: base64String }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleARTargetImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewARTarget(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };


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
        feature_types: newSpot.featureTypes,
        image: newSpot.images[0] || null,
        image2: newSpot.images[1] || null,
        image3: newSpot.images[2] || null,
        model_3d: newSpot.model_3d || null,
        is_featured: newSpot.is_featured,
      });
      setSpots(prev => [...prev, normalizeSpot(data)]);
      setIsAddSpotModalOpen(false);
      setNewSpot({ name: '', location_name: '', latitude: '', longitude: '', description: '', historical_background: '', cultural_significance: '', fun_fact: '', featureTypes: ['qr'], images: ['', '', ''], model_3d: null, is_featured: false });
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
        location_name: editingSpot.location || editingSpot.location_name,
        latitude: editingSpot.latitude || 0,
        longitude: editingSpot.longitude || 0,
        description: editingSpot.description || editingSpot.aboutPlace || '',
        historical_background: editingSpot.historical_background || '',
        cultural_significance: editingSpot.cultural_significance || '',
        fun_fact: editingSpot.fun_fact || '',
        feature_types: editingSpot.feature_types || [],
        ...(editingSpot.images?.[0]?.startsWith('data:') && { image: editingSpot.images[0] }),
        ...(editingSpot.images?.[1]?.startsWith('data:') && { image2: editingSpot.images[1] }),
        ...(editingSpot.images?.[2]?.startsWith('data:') && { image3: editingSpot.images[2] }),
        ...(editingSpot.model_3d?.startsWith('data:') && { model_3d: editingSpot.model_3d }),
        is_featured: editingSpot.is_featured || false,
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
    if (!confirm(`Are you sure you want to delete "${spotToDelete?.name}"? This will also remove any linked QR codes.`)) return;
    try {
      await qrService.deleteSpot(id);
      setSpots(prev => prev.filter(s => s.id !== id));
      setQrcodes(prev => prev.filter(q => q.spot?.id !== id && q.spot_id !== id));
      setNotifications(prev => [
        { id: generateNotificationId(), text: `Spot "${spotToDelete?.name}" removed.`, time: 'Just now' },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      showError('Failed to delete spot. Please try again.', 'Delete Failed', 'error');
    }
  };

  const handleDeleteQr = async (qr) => {
    if (!confirm(`Delete QR code for "${qr.exhibitName}"? This cannot be undone.`)) return;
    try {
      await qrService.deleteMarker(qr.id);
      setQrcodes(prev => prev.filter(q => q.id !== qr.id));
      setNotifications(prev => [
        { id: generateNotificationId(), text: `QR code for "${qr.exhibitName}" deleted.`, time: 'Just now' },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      showError('Failed to delete QR code. Please try again.', 'Delete Failed', 'error');
    }
  };

  const toggleQrStatus = async (id) => {
    const marker = qrcodes.find(q => q.id === id);
    const nextActive = marker.status !== 'Active';
    try {
      await qrService.toggleMarker(id, nextActive);
      setQrcodes(prev => prev.map(q => q.id === id ? { ...q, status: nextActive ? 'Active' : 'Inactive' } : q));
    } catch (err) { console.error(err); }
  };

  // ─── Catch Handlers ──────────────────────────────────────────────────────────
  const handleCatchFileChange = (e, isEditing) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (isEditing) {
        setEditingCatchIcon({ ...editingCatchIcon, model_3d: event.target.result });
      } else {
        setNewCatchIcon({ ...newCatchIcon, model_3d: event.target.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCatchSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newCatchIcon };
      if (!payload.emoji) payload.emoji = '👾';
      if (!payload.type_name) payload.type_name = 'Catch Model';
      
      const res = await qrService.createCatchIcon(payload);
      setCatchIcons(prev => [...prev, res.data]);
      setNotifications(prev => [
        { id: generateNotificationId(), text: `Catch Icon "${payload.name}" added.`, time: 'Just now' },
        ...prev,
      ]);
      setNewCatchIcon({ name: '', emoji: '👾', tagline: '', type_name: 'Catch Model', color: '#38BDF8', about: '', significance: '', facts: [], model_3d: '' });
      setIsAddCatchIconModalOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleAddARTarget = async (e) => {
    e.preventDefault();
    try {
      const res = await qrService.createARTarget(newARTarget);
      setArTargets([...arTargets, res.data]);
      setNotifications(prev => [
        { id: generateNotificationId(), text: `AR Target "${newARTarget.name}" added.`, time: 'Just now' },
        ...prev,
      ]);
      setNewARTarget({ name: '', description: '', image: null });
      setIsAddARTargetModalOpen(false);
    } catch (err) {
      console.error(err);
      showError('Failed to add AR Target. Please try again.', 'Error', 'error');
    }
  };

  const handleCatchEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await qrService.updateCatchIcon(editingCatchIcon.id, editingCatchIcon);
      setCatchIcons(prev => prev.map(c => (c.id === editingCatchIcon.id ? res.data : c)));
      setNotifications(prev => [
        { id: generateNotificationId(), text: `Catch Icon "${editingCatchIcon.name}" updated.`, time: 'Just now' },
        ...prev,
      ]);
      setEditingCatchIcon(null);
      setIsEditCatchIconModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleDeleteCatch = async (id) => {
    const iconToDelete = catchIcons.find(c => c.id === id);
    if (!confirm(`Delete "${iconToDelete?.name}"?`)) return;
    try {
      await qrService.deleteCatchIcon(id);
      setCatchIcons(prev => prev.filter(c => c.id !== id));
      setNotifications(prev => [
        { id: generateNotificationId(), text: `Catch Icon "${iconToDelete?.name}" removed.`, time: 'Just now' },
        ...prev,
      ]);
    } catch (err) { console.error(err); }
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

  const handleGenerateAIQuiz = async () => {
    if (!generateQuizContentId) return;
    setIsGeneratingQuiz(true);
    try {
      const { data } = await qrService.generateAITrivia(generateQuizType, generateQuizContentId, generateQuizCount);
      showError(`Successfully generated pending quizzes. They must be reviewed before appearing on mobile.`, 'Success', 'info');
      // Refresh pending quizzes
      qrService.getPendingQuizzes().then(res => setPendingQuizzes(res.data || [])).catch(console.error);
      setIsGenerateQuizModalOpen(false);
      setGenerateQuizStep(1);
    } catch (err) {
      showError('Failed to generate AI quiz. Please try again.', 'Error', 'error');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSingleReviewAction = async (action, questionId) => {
    if (!reviewingQuiz || !reviewingQuiz.questions) return;
    
    const question = reviewingQuiz.questions.find(q => q.id === questionId);
    if (!question) return;

    try {
      const payload = {
        action,
        question: question.question,
        choices: question.choices,
        correct_index: question.correct_index,
        explanation: question.explanation
      };
      
      await qrService.reviewQuizAction(question.id, payload);
      
      // Remove this question from the pending list
      setPendingQuizzes(prev => prev.filter(q => q.id !== question.id));
      
      // Update the modal's batch list
      const remainingQuestions = reviewingQuiz.questions.filter(q => q.id !== question.id);
      
      if (action === 'approve' && question.spot_name) {
         qrService.getTriviaQuestions().then(res => setTriviaQuestions(res.data || []));
      } else if (action === 'reject') {
         // Add notification for the admin
         setNotifications(prev => [{ 
            id: Date.now(), 
            text: `Tourist Guide rejected a question for ${question.spot_name || question.icon_name}.`, 
            time: 'Just now' 
         }, ...prev]);
      }
      
      // Close modal if no questions left in this batch
      if (remainingQuestions.length === 0) {
        setIsReviewQuizModalOpen(false);
        setReviewingQuiz(null);
      } else {
        setReviewingQuiz({ ...reviewingQuiz, questions: remainingQuestions });
      }
    } catch (err) {
      console.error(err);
      showError('Failed to process review action.', 'Error', 'error');
    }
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
      <>
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="sidebar-logo-container" style={{ margin: '0 auto 16px', width: '56px', height: '56px', background: 'transparent' }}>
                <img src={lakbayLogo} alt="LAKBAY" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h1 className="brand-text" style={{ fontSize: '28px', justifyContent: 'center' }}>
                LAKBAY
                <span className="brand-subtitle">
                  {!isAuthenticated ? 'PORTAL' : currentUser?.role === 'tourist_guide' ? 'GUIDE PANEL' : 'ADMIN PANEL'}
                </span>
              </h1>
              <p className="login-subtitle">Sign in to manage the Zamboanga Cultural System</p>
            </div>
            
            <form onSubmit={handleLogin} className="login-form">
              
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

        {/* ── Error Modal (login page) ── */}
        <ErrorModal
          visible={errorModal.visible}
          type={errorModal.type}
          title={errorModal.title}
          message={errorModal.message}
          onClose={closeErrorModal}
        />
      </>
    );
  }

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-container" style={{ background: 'transparent' }}>
            <img src={lakbayLogo} alt="LAKBAY" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="brand-text">
            LAKBAY
            <span className="brand-subtitle">ZAMBOANGA</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          {currentUser?.role !== 'tourist_guide' && (
            <>
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
            </>
          )}



          {currentUser?.role !== 'tourist_guide' && (
            <div
              className={`menu-item ${activeTab === 'trivia' ? 'active' : ''}`}
              onClick={() => setActiveTab('trivia')}
            >
              <HelpCircle className="menu-icon" />
              Trivia Generator
            </div>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'tourist_guide') && (
            <div
              className={`menu-item ${activeTab === 'trivia_review' ? 'active' : ''}`}
              onClick={() => setActiveTab('trivia_review')}
            >
              <Target className="menu-icon" />
              Review Quizzes
            </div>
          )}

          {currentUser?.role !== 'tourist_guide' && (
            <>
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
            </>
          )}
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
                    <span style={{fontSize: '11px', color: 'var(--accent-blue)', cursor: 'pointer'}} onClick={() => setNotifications([])}>Clear all</span>
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
                    {filteredSpots.filter(s => s.is_featured).length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)'}}>
                          No feature places match the filters or search query.
                        </td>
                      </tr>
                    ) : (
                      filteredSpots.filter(s => s.is_featured).map(spot => (
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
                          <TrendingUp size={14} color="var(--accent-blue)" />
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

                        <button
                          className="icon-action-btn delete"
                          title="Delete QR Code"
                          onClick={() => handleDeleteQr(qr)}
                          style={{ padding: '8px', flexShrink: 0 }}
                        >
                          <Trash2 size={14} />
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
                      <th>Location</th>
                      <th>Type</th>
                      <th>XP</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)'}}>
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
                          <td style={{color: 'var(--text-secondary)'}}>{user.location || '—'}</td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                textTransform: 'capitalize',
                                fontWeight: 700,
                                color: user.visitor_type === 'local' ? '#0E7C5A' : '#1A56DB',
                                background: user.visitor_type === 'local' ? 'rgba(16,185,129,0.12)' : 'rgba(26,86,219,0.12)',
                                border: `1px solid ${user.visitor_type === 'local' ? 'rgba(16,185,129,0.35)' : 'rgba(26,86,219,0.35)'}`,
                              }}
                            >
                              {user.visitor_type === 'local' ? 'Local' : 'Tourist'}
                            </span>
                          </td>
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
            <>
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

                    <button className="btn btn-primary" onClick={() => setIsAddSpotModalOpen(true)}>
                      <Plus size={16} />
                      Add New Spot
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
                        {(selectedMapPin.feature_types || []).map(t => (
                          <span key={t} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: PIN_TYPE_CONFIG[t]?.color, color: '#fff' }}>
                            {PIN_TYPE_CONFIG[t]?.label}
                          </span>
                        ))}
                      </div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-title)', fontWeight: 700 }}>{selectedMapPin.name}</h4>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5' }}>{selectedMapPin.description}</p>
                      <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                        📍 {parseFloat(selectedMapPin.latitude || 0).toFixed(4)}° N, {parseFloat(selectedMapPin.longitude || 0).toFixed(4)}° E
                      </p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px', flex: 1, fontSize: '11px' }}
                          onClick={() => { setEditingSpot(selectedMapPin); setIsEditSpotModalOpen(true); }}>
                          <Edit size={12} /> Edit
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--accent-pink)' }}
                          onClick={async () => {
                            if (window.confirm(`Delete ${selectedMapPin.name}?`)) {
                              try {
                                await qrService.deleteSpot(selectedMapPin.id);
                                setSpots(prev => prev.filter(s => s.id !== selectedMapPin.id));
                                setSelectedMapPinId(null);
                              } catch (err) { console.error(err); }
                            }
                          }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {!isMapFullscreen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                    <span>Click any pin to view details · {spots.length} spots registered</span>
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
                        {(selectedMapPin.feature_types || []).map(t => (
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
                          {parseFloat(selectedMapPin.latitude || 0).toFixed(5)}° N, {parseFloat(selectedMapPin.longitude || 0).toFixed(5)}° E
                        </p>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.65, margin: 0 }}>
                        {selectedMapPin.description || 'No description available for this spot.'}
                      </p>

                      {/* Feature-specific info rows */}
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                        {(selectedMapPin.feature_types || []).includes('qr') && (
                          <div style={{ padding: '10px 12px', borderBottom: (selectedMapPin.feature_types || []).length > 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <QrCode size={16} color={PIN_TYPE_CONFIG.qr.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <div>
                              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: PIN_TYPE_CONFIG.qr.color }}>QR Scan Spot</p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Tourists scan the QR code at this location to unlock cultural stories and earn XP.</p>
                            </div>
                          </div>
                        )}
                        {(selectedMapPin.feature_types || []).includes('ar') && (
                          <div style={{ padding: '10px 12px', borderBottom: (selectedMapPin.feature_types || []).filter(t => t !== 'ar').length > 0 ? '1px solid var(--card-border)' : 'none', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <Eye size={16} color={PIN_TYPE_CONFIG.ar.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <div>
                              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: PIN_TYPE_CONFIG.ar.color }}>AR Exhibit Zone</p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Point the camera at artifacts here to trigger AR overlays with historical and cultural information.</p>
                            </div>
                          </div>
                        )}
                        {(selectedMapPin.feature_types || []).includes('catch') && (
                          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <Crosshair size={16} color={PIN_TYPE_CONFIG.catch.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <div>
                              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: PIN_TYPE_CONFIG.catch.color }}>Creature Catch Zone</p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>A mythical creature or cultural symbol can be encountered and captured in this area.</p>
                              {selectedMapPin.model_3d && (
                                <div style={{ marginTop: '10px', width: '100%', height: '180px', background: 'radial-gradient(circle at center, #2A3B5C 0%, #0F172A 100%)', borderRadius: '8px', overflow: 'hidden' }}>
                                  <model-viewer
                                    src={qrService.getMediaUrl(selectedMapPin.model_3d)}
                                    auto-rotate camera-controls
                                    bounds="tight"
                                    style={{ width: '100%', height: '100%' }}
                                    exposure="1"
                                  />
                                </div>
                              )}
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
                          title="Edit Spot"
                          onClick={() => {
                            setEditingSpot(selectedMapPin);
                            setIsEditSpotModalOpen(true);
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '8px 10px', fontSize: '12px' }}
                          title="Remove Spot"
                          onClick={async () => {
                            if (window.confirm(`Remove spot "${selectedMapPin.name}" from the map?`)) {
                              try {
                                await qrService.deleteSpot(selectedMapPin.id);
                                setSpots(prev => prev.filter(p => p.id !== selectedMapPin.id));
                                setSelectedMapPinId(null);
                                setNotifications(prev => [{ id: Date.now(), text: `Spot "${selectedMapPin.name}" deleted.`, time: 'Just now' }, ...prev]);
                              } catch (err) { console.error(err); }
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
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{spots.length} spots</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                      {spots.map(pin => {
                        const primaryType = pin.feature_types && pin.feature_types.length > 0 ? pin.feature_types[0] : 'qr';
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
                              <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>{(pin.feature_types || []).map(t => PIN_TYPE_CONFIG[t]?.label).join(' · ')}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>

            </>
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

                {/* AR Targets Section */}
                <div className="content-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="content-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">
                      <ImageIcon className="card-title-icon" size={18} />
                      MindAR Targets (Museum Paintings)
                    </h3>
                    <button className="btn btn-primary" onClick={() => setIsAddARTargetModalOpen(true)}>
                      <Plus size={14} /> Add Painting
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
                    {arTargets.map(target => (
                      <div key={target.id} style={{ border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px', backgroundColor: 'var(--body-bg)' }}>
                        <div style={{ height: '140px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {target.image ? (
                            <img src={typeof target.image === 'string' ? target.image : URL.createObjectURL(target.image)} alt={target.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <ImageIcon size={32} color="var(--text-muted)" />
                          )}
                        </div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--text-title)' }}>{target.name}</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{target.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB CONTENT: CATCH PROGRESS */}
          {activeTab === 'catch' && (
            <div className="tab-content fade-in">

              {selectedCatchForView ? (
                /* ── Detail View ── */
                <div>
                  {/* Toolbar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => setSelectedCatchForView(null)}>
                      <ArrowLeft size={15} /> Back to Icons
                    </button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => { setEditingCatchIcon(selectedCatchForView); setIsEditCatchIconModalOpen(true); }}>
                        <Edit size={14} /> Edit
                      </button>
                      <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        onClick={() => { handleDeleteCatch(selectedCatchForView.id); setSelectedCatchForView(null); }}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Detail card */}
                  <div className="content-card" style={{ maxWidth: '700px', margin: '0 auto', gap: '0', padding: '0', overflow: 'hidden' }}>

                    {/* 3D Model centred */}
                    <div style={{ width: '100%', height: '360px', backgroundColor: 'var(--body-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {selectedCatchForView.model_3d ? (
                        <model-viewer
                          src={qrService.getMediaUrl(selectedCatchForView.model_3d)}
                          auto-rotate camera-controls
                          style={{ width: '100%', height: '100%' }}
                          exposure="1"
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <Target size={52} color="var(--text-muted)" />
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No 3D model uploaded</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '28px 32px 32px' }}>
                      {/* Name + tagline centred */}
                      <h2 style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 800, color: 'var(--text-title)', marginBottom: '6px', letterSpacing: '-0.5px' }}>
                        {selectedCatchForView.name}
                      </h2>
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
                        {selectedCatchForView.tagline}
                      </p>

                      <div style={{ height: '1px', background: 'var(--card-border)', marginBottom: '24px' }} />

                      {/* About */}
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>About</p>
                      <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.75, marginBottom: '28px' }}>
                        {selectedCatchForView.about || <span style={{ color: 'var(--text-muted)' }}>No description provided.</span>}
                      </p>

                      <div style={{ height: '1px', background: 'var(--card-border)', marginBottom: '24px' }} />

                      {/* Cultural Significance */}
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>Cultural Significance</p>
                      <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.75 }}>
                        {selectedCatchForView.significance || <span style={{ color: 'var(--text-muted)' }}>No significance noted.</span>}
                      </p>
                    </div>
                  </div>
                </div>

              ) : (
                /* ── Card Grid View ── */
                <>
                  <div className="section-header">
                    <h2>Catch Models (Cultural Icons)</h2>
                    <button className="btn btn-primary" onClick={() => setIsAddCatchIconModalOpen(true)}>
                      <Plus size={16} /> Add Catch Icon
                    </button>
                  </div>

                  {catchIcons.length === 0 ? (
                    <div className="content-card" style={{ alignItems: 'center', padding: '60px 20px', textAlign: 'center', marginTop: '20px' }}>
                      <Target size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No cultural icons yet. Click <strong>Add Catch Icon</strong> to create the first one.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', marginTop: '20px' }}>
                      {catchIcons.map(icon => (
                        <div key={icon.id} className="content-card"
                          style={{ padding: 0, gap: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                          onClick={() => setSelectedCatchForView(icon)}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>

                          {/* 3D preview or colour placeholder */}
                          <div style={{ height: '190px', backgroundColor: 'var(--body-bg)', overflow: 'hidden', position: 'relative' }}>
                            {icon.model_3d ? (
                              <model-viewer
                                src={qrService.getMediaUrl(icon.model_3d)}
                                auto-rotate
                                style={{ width: '100%', height: '100%' }}
                                exposure="1"
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `linear-gradient(135deg, ${icon.color || '#1A56DB'}22, ${icon.color || '#1A56DB'}55)` }}>
                                <Target size={44} color={icon.color || 'var(--accent-blue)'} style={{ opacity: 0.7 }} />
                              </div>
                            )}
                          </div>

                          {/* Name + tagline + actions */}
                          <div style={{ padding: '16px 18px 14px' }}>
                            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', color: 'var(--text-title)', marginBottom: '3px' }}>{icon.name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>{icon.tagline}</p>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}
                              onClick={e => e.stopPropagation()}>
                              <button className="icon-action-btn" title="Edit"
                                onClick={() => { setEditingCatchIcon(icon); setIsEditCatchIconModalOpen(true); }}>
                                <Edit size={13} />
                              </button>
                              <button className="icon-action-btn delete" title="Delete"
                                onClick={() => handleDeleteCatch(icon.id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
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
                  <button className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setIsGenerateQuizModalOpen(true)}>
                    <Target size={16} />
                    Generate AI Quiz
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

          {/* TAB CONTENT: TRIVIA REVIEW (TOURIST GUIDE) */}
          {activeTab === 'trivia_review' && (
            <section className="content-card" style={{ gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">
                  <Target className="card-title-icon" size={18} />
                  Pending Quiz Reviews
                </h3>
                <span className="badge" style={{ backgroundColor: 'var(--accent-pink)', color: '#fff' }}>
                  {pendingQuizzes.length} Questions Pending
                </span>
              </div>

              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Type</th>
                      <th>Content Target</th>
                      <th>Questions in Batch</th>
                      <th>Generated By</th>
                      <th style={{ width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const grouped = pendingQuizzes.reduce((acc, q) => {
                        const targetName = q.spot_name || q.icon_name || 'Unknown';
                        if (!acc[targetName]) acc[targetName] = { type: q.spot_name ? 'QR / AR Spot' : 'Catch Icon', questions: [], targetName, generated_by_name: q.generated_by_name };
                        acc[targetName].questions.push(q);
                        return acc;
                      }, {});
                      const groups = Object.values(grouped);
                      
                      if (groups.length === 0) {
                        return (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                              No pending quizzes to review!
                            </td>
                          </tr>
                        );
                      }

                      return groups.map((g, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className="badge" style={{ fontSize: '10px', backgroundColor: g.type === 'QR / AR Spot' ? 'var(--accent-gold)' : '#38BDF8', color: '#111' }}>
                              {g.type}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {g.targetName}
                          </td>
                          <td style={{ color: 'var(--text-title)' }}>
                            {g.questions.length} Questions
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                            {g.generated_by_name || 'System'}
                          </td>
                          <td>
                            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => {
                              setReviewingQuiz(g);
                              setIsReviewQuizModalOpen(true);
                            }}>
                              Review Batch
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* MODAL: ADD AR TARGET */}
      {isAddARTargetModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Add AR Painting (MindAR)</h3>
              <button className="close-btn" onClick={() => setIsAddARTargetModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddARTarget}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Painting Name</label>
                  <input type="text" className="form-input" required 
                    value={newARTarget.name} onChange={e => setNewARTarget({...newARTarget, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Info to Display</label>
                  <textarea className="form-textarea" required
                    value={newARTarget.description} onChange={e => setNewARTarget({...newARTarget, description: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Upload Target Image (For MindAR Compilation)</label>
                  <label style={{
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '140px', border: newARTarget.image ? '2px solid var(--accent-color)' : '2px dashed var(--card-border)', borderRadius: '10px',
                    backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', overflow: 'hidden', marginTop: '8px'
                  }}>
                    <input type="file" accept="image/*" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                      onChange={handleARTargetImageChange} required={!newARTarget.image} />
                    {newARTarget.image ? (
                      <>
                        <img src={typeof newARTarget.image === 'string' ? newARTarget.image : URL.createObjectURL(newARTarget.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, opacity: 0.4 }} alt="" />
                        <span style={{ position: 'relative', zIndex: 5, color: '#fff', fontSize: '14px', fontWeight: 'bold', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Change Image</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '0 10px' }}>
                        Drag and drop target image here<br/>or click to browse
                      </span>
                    )}
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddARTargetModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Target</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATCH ICON */}
      {isAddCatchIconModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{width: '90vw', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
            <div className="modal-header">
              <h3 className="modal-title">Add Catch Icon</h3>
              <button className="close-btn" onClick={() => setIsAddCatchIconModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleCatchSubmit} style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
              <div className="modal-body" style={{overflowY: 'auto', flex: 1, padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                {/* Left Side - 3D Model Drag & Drop */}
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <label className="form-label" style={{marginBottom: '10px'}}>3D Model Preview</label>
                  <label style={{
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flex: 1, border: newCatchIcon.model_3d ? '2px solid var(--accent-color)' : '2px dashed var(--card-border)', borderRadius: '10px',
                    backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', overflow: 'hidden', minHeight: '350px'
                  }}>
                    <input type="file" accept=".glb,.gltf" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                      onChange={(e) => handleCatchFileChange(e, false)} required={!newCatchIcon.model_3d} />
                    
                    {newCatchIcon.model_3d ? (
                      <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5}}>
                        <model-viewer 
                          src={newCatchIcon.model_3d}
                          auto-rotate 
                          camera-controls 
                          bounds="tight"
                          style={{width: '100%', height: '100%', backgroundColor: 'transparent'}}
                          exposure="1"
                        ></model-viewer>
                        <div style={{position: 'absolute', bottom: '10px', left: 0, width: '100%', textAlign: 'center'}}>
                          <span style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>Change Model</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', pointerEvents: 'none'}}>
                        <Target size={32} color="var(--text-muted)" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>Drag and drop .glb file<br/>or click to upload</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Right Side - Input Fields */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label className="form-label">Name</label>
                    <input type="text" className="form-input" value={newCatchIcon.name} onChange={e => setNewCatchIcon({...newCatchIcon, name: e.target.value})} required />
                  </div>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label className="form-label">Tagline</label>
                    <input type="text" className="form-input" value={newCatchIcon.tagline} onChange={e => setNewCatchIcon({...newCatchIcon, tagline: e.target.value})} required />
                  </div>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label className="form-label">About</label>
                    <textarea className="form-input" rows="4" value={newCatchIcon.about} onChange={e => setNewCatchIcon({...newCatchIcon, about: e.target.value})} required style={{resize: 'vertical', minHeight: '100px'}}></textarea>
                  </div>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label className="form-label">Cultural Significance</label>
                    <textarea className="form-input" rows="4" value={newCatchIcon.significance} onChange={e => setNewCatchIcon({...newCatchIcon, significance: e.target.value})} required style={{resize: 'vertical', minHeight: '100px'}}></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddCatchIconModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Icon</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Catch Icon Modal */}
      {isEditCatchIconModalOpen && editingCatchIcon && (
        <div className="modal-overlay">
          <div className="modal-card" style={{width: '90vw', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Catch Icon</h3>
              <button className="close-btn" onClick={() => { setIsEditCatchIconModalOpen(false); setEditingCatchIcon(null); }}><X size={20}/></button>
            </div>
            <form onSubmit={handleCatchEditSubmit} style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
              <div className="modal-body" style={{overflowY: 'auto', flex: 1, padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                
                {/* Left Side - 3D Model Drag & Drop */}
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <label className="form-label" style={{marginBottom: '10px'}}>3D Model Preview</label>
                  <label style={{
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flex: 1, border: editingCatchIcon.model_3d ? '2px solid var(--accent-color)' : '2px dashed var(--card-border)', borderRadius: '10px',
                    backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', overflow: 'hidden', minHeight: '350px'
                  }}>
                    <input type="file" accept=".glb,.gltf" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                      onChange={(e) => handleCatchFileChange(e, true)} />
                    
                    {editingCatchIcon.model_3d ? (
                      <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5}}>
                        <model-viewer 
                          src={editingCatchIcon.model_3d.startsWith('data:') ? editingCatchIcon.model_3d : qrService.getMediaUrl(editingCatchIcon.model_3d)}
                          auto-rotate 
                          camera-controls 
                          bounds="tight"
                          style={{width: '100%', height: '100%', backgroundColor: 'transparent'}}
                          exposure="1"
                        ></model-viewer>
                        <div style={{position: 'absolute', bottom: '10px', left: 0, width: '100%', textAlign: 'center'}}>
                          <span style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>Change Model</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', pointerEvents: 'none'}}>
                        <Target size={32} color="var(--text-muted)" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>Drag and drop .glb file<br/>or click to upload</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Right Side - Input Fields */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label className="form-label">Name</label>
                    <input type="text" className="form-input" value={editingCatchIcon.name} onChange={e => setEditingCatchIcon({...editingCatchIcon, name: e.target.value})} required />
                  </div>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label className="form-label">Tagline</label>
                    <input type="text" className="form-input" value={editingCatchIcon.tagline} onChange={e => setEditingCatchIcon({...editingCatchIcon, tagline: e.target.value})} required />
                  </div>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label className="form-label">About</label>
                    <textarea className="form-input" rows="4" value={editingCatchIcon.about} onChange={e => setEditingCatchIcon({...editingCatchIcon, about: e.target.value})} required style={{resize: 'vertical', minHeight: '100px'}}></textarea>
                  </div>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label className="form-label">Cultural Significance</label>
                    <textarea className="form-input" rows="4" value={editingCatchIcon.significance} onChange={e => setEditingCatchIcon({...editingCatchIcon, significance: e.target.value})} required style={{resize: 'vertical', minHeight: '100px'}}></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsEditCatchIconModalOpen(false); setEditingCatchIcon(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALS */}
      {isAddSpotModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: '90vw', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Feature Place</h3>
              <button className="close-btn" onClick={() => setIsAddSpotModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSpot} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Search Location on Map</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <MapPin size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="text" className="form-input" style={{ paddingLeft: '38px' }} placeholder="Search e.g. Zamboanga City Hall"
                        value={modalSearchQuery} onChange={(e) => setModalSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleModalSearch())} />
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={handleModalSearch} disabled={modalSearching} style={{ minWidth: '80px', display: 'flex', justifyContent: 'center' }}>
                      {modalSearching ? <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--text-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Search'}
                    </button>
                  </div>
                  <div style={{ width: '100%', height: '220px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--card-border)', position: 'relative', zIndex: 1 }}>
                    <div ref={modalMapContainerRef} style={{ width: '100%', height: '100%' }} />
                    <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(26,26,46,0.85)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: '#fff', zIndex: 1000, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      Click on the map to pin a location
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                </div>

                <div className="form-group">
                  <label className="form-label">Fun Fact</label>
                  <textarea className="form-textarea" placeholder="Did you know..."
                    value={newSpot.fun_fact} onChange={(e) => setNewSpot({...newSpot, fun_fact: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Destination Images (Upload Files) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(minimum 3 pictures)</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {[0,1,2].map(idx => (
                      <label key={idx} style={{
                        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        height: '100px', border: newSpot.images[idx] ? '2px solid var(--accent-color)' : '2px dashed var(--card-border)', borderRadius: '10px',
                        backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', overflow: 'hidden'
                      }}>
                        <input type="file" accept="image/*" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                          onChange={(e) => handleImageFileChange(e, idx, false)} required={!newSpot.images[idx]} />
                        {newSpot.images[idx] ? (
                          <>
                            <img src={newSpot.images[idx]} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, opacity: 0.4 }} alt="" />
                            <span style={{ position: 'relative', zIndex: 5, color: '#fff', fontSize: '12px', fontWeight: 'bold', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Change Image</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '0 10px' }}>Drag and drop<br/>or click</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Feature Type(s) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(select at least one)</span></label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      {Object.entries(PIN_TYPE_CONFIG).map(([type, cfg]) => {
                        const checked = newSpot.featureTypes?.includes(type);
                        return (
                          <button type="button" key={type}
                            onClick={() => toggleNewSpotType(type)}
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

                  {newSpot.featureTypes?.includes('catch') && (
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <label className="form-label" style={{ color: PIN_TYPE_CONFIG.catch.color }}>3D Model <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(.glb only)</span></label>
                      <label style={{
                        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        height: '100%', minHeight: '60px', marginTop: '8px',
                        border: newSpot.model_3d ? `2px solid ${PIN_TYPE_CONFIG.catch.color}` : '2px dashed var(--card-border)',
                        borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', overflow: 'hidden'
                      }}>
                        <input type="file" accept=".glb" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                          onChange={(e) => handleModelFileChange(e, false)} />
                        {newSpot.model_3d ? (
                          <span style={{ color: PIN_TYPE_CONFIG.catch.color, fontSize: '13px', fontWeight: 'bold' }}>Model Selected ✓</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Click to upload</span>
                        )}
                      </label>
                    </div>
                  )}

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gridColumn: newSpot.featureTypes?.includes('catch') ? '1 / -1' : 'auto' }}>
                    <label className="form-label">Visibility Options</label>
                    <div style={{ marginTop: '8px', padding: '16px', border: '1px solid var(--card-border)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="checkbox" id="isFeatured" style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        checked={newSpot.is_featured} onChange={(e) => setNewSpot({...newSpot, is_featured: e.target.checked})} />
                      <label htmlFor="isFeatured" style={{ cursor: 'pointer', margin: 0, fontWeight: 600, fontSize: '13px', color: 'var(--text-title)' }}>
                        Add to Featured Places
                      </label>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      If checked, this spot will appear in the "Places to Experience" section on Mobile and the Featured Places sidebar.
                    </p>
                  </div>
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



      {/* EDIT SPOT MODAL */}
      {isEditSpotModalOpen && editingSpot && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: '90vw', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Feature Place</h3>
              <button className="close-btn" onClick={() => {
                setIsEditSpotModalOpen(false);
                setEditingSpot(null);
              }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSpotSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Update Location on Map</label>
                  <div style={{ width: '100%', height: '220px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--card-border)', position: 'relative', zIndex: 1 }}>
                    <div ref={editModalMapContainerRef} style={{ width: '100%', height: '100%' }} />
                    <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(26,26,46,0.85)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: '#fff', zIndex: 1000, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      Click on the map to update coordinates
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Spot Name</label>
                    <input type="text" className="form-input" value={editingSpot.name}
                      onChange={(e) => setEditingSpot({...editingSpot, name: e.target.value})} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input type="text" className="form-input" value={editingSpot.location || editingSpot.location_name || ''}
                      onChange={(e) => setEditingSpot({...editingSpot, location_name: e.target.value, location: e.target.value})} required />
                  </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
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
                  <textarea className="form-textarea" value={editingSpot.description || editingSpot.aboutPlace || ''}
                    onChange={(e) => setEditingSpot({...editingSpot, description: e.target.value, aboutPlace: e.target.value})} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                </div>

                <div className="form-group">
                  <label className="form-label">Fun Fact</label>
                  <textarea className="form-textarea" value={editingSpot.fun_fact || ''}
                    onChange={(e) => setEditingSpot({...editingSpot, fun_fact: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Destination Images (Upload Files) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Upload new to replace)</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {[0,1,2].map(idx => {
                      const hasImage = !!editingSpot.images?.[idx];
                      const imgSrc = hasImage ? editingSpot.images[idx] : null;
                      return (
                        <label key={idx} style={{
                          position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          height: '100px', border: hasImage ? '2px solid var(--accent-color)' : '2px dashed var(--card-border)', borderRadius: '10px',
                          backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', overflow: 'hidden'
                        }}>
                          <input type="file" accept="image/*" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                            onChange={(e) => handleImageFileChange(e, idx, true)} />
                          {hasImage ? (
                            <>
                              <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, opacity: 0.4 }} alt="" />
                              <span style={{ position: 'relative', zIndex: 5, color: '#fff', fontSize: '12px', fontWeight: 'bold', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Change</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '0 10px' }}>Drag and drop<br/>or click</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Feature Type(s) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(select at least one)</span></label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      {Object.entries(PIN_TYPE_CONFIG).map(([type, cfg]) => {
                        const checked = editingSpot.feature_types?.includes(type);
                        return (
                          <button type="button" key={type}
                            onClick={() => toggleEditingSpotType(type)}
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

                  {editingSpot.feature_types?.includes('catch') && (
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <label className="form-label" style={{ color: PIN_TYPE_CONFIG.catch.color }}>3D Model <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(.glb only)</span></label>
                      <label style={{
                        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        height: '100%', minHeight: '60px', marginTop: '8px',
                        border: editingSpot.model_3d ? `2px solid ${PIN_TYPE_CONFIG.catch.color}` : '2px dashed var(--card-border)',
                        borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', overflow: 'hidden'
                      }}>
                        <input type="file" accept=".glb" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                          onChange={(e) => handleModelFileChange(e, true)} />
                        {editingSpot.model_3d ? (
                          <span style={{ color: PIN_TYPE_CONFIG.catch.color, fontSize: '13px', fontWeight: 'bold' }}>Model Selected ✓</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Click to upload</span>
                        )}
                      </label>
                    </div>
                  )}

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gridColumn: editingSpot.feature_types?.includes('catch') ? '1 / -1' : 'auto' }}>
                    <label className="form-label">Visibility Options</label>
                    <div style={{ marginTop: '8px', padding: '16px', border: '1px solid var(--card-border)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="checkbox" id="editIsFeatured" style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        checked={editingSpot.is_featured} onChange={(e) => setEditingSpot({...editingSpot, is_featured: e.target.checked})} />
                      <label htmlFor="editIsFeatured" style={{ cursor: 'pointer', margin: 0, fontWeight: 600, fontSize: '13px', color: 'var(--text-title)' }}>
                        Add to Featured Places
                      </label>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      If checked, this spot will appear in the "Places to Experience" section on Mobile and the Featured Places sidebar.
                    </p>
                  </div>
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
                    {spots.filter(s => s.feature_types?.includes('qr') || !s.feature_types?.includes('ar')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                    {spots.filter(s => s.feature_types?.includes('qr') || !s.feature_types?.includes('ar')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: parseInt(editingTrivia.correct_index) === idx ? 'var(--accent-blue)' : '#E2E8F0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
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
            </form>
          </div>
        </div>
      )}

      {/* GENERATE AI QUIZ MODAL (3-STEP) */}
      {isGenerateQuizModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">
                <Target size={18} style={{ marginRight: '8px' }} />
                Generate AI Quiz
              </h3>
              <button className="close-btn" onClick={() => { setIsGenerateQuizModalOpen(false); setGenerateQuizStep(1); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ minHeight: '200px' }}>
              
              {/* STEP 1: Choose Type */}
              {generateQuizStep === 1 && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <h4 style={{ marginBottom: '20px', color: 'var(--text-title)' }}>Step 1: Choose Content Type</h4>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <button 
                      className="btn" 
                      style={{ padding: '20px', background: generateQuizType === 'spot' ? 'var(--accent-blue)' : 'var(--card-bg)', color: generateQuizType === 'spot' ? '#fff' : 'var(--text-primary)', border: '2px solid var(--accent-blue)' }}
                      onClick={() => setGenerateQuizType('spot')}
                    >
                      <MapPin size={32} style={{ margin: '0 auto 8px' }} />
                      <br/>QR / AR Spot
                    </button>
                    <button 
                      className="btn" 
                      style={{ padding: '20px', background: generateQuizType === 'icon' ? 'var(--accent-pink)' : 'var(--card-bg)', color: generateQuizType === 'icon' ? '#fff' : 'var(--text-primary)', border: '2px solid var(--accent-pink)' }}
                      onClick={() => setGenerateQuizType('icon')}
                    >
                      <Target size={32} style={{ margin: '0 auto 8px' }} />
                      <br/>Catch Icon
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Choose Content */}
              {generateQuizStep === 2 && (
                <div style={{ padding: '10px' }}>
                  <h4 style={{ marginBottom: '16px', color: 'var(--text-title)' }}>Step 2: Select Content</h4>
                  <select 
                    className="form-select" 
                    value={generateQuizContentId} 
                    onChange={(e) => setGenerateQuizContentId(e.target.value)}
                  >
                    <option value="">— Select {generateQuizType === 'spot' ? 'a Spot' : 'an Icon'} —</option>
                    {generateQuizType === 'spot' && spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    {generateQuizType === 'icon' && catchIcons.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* STEP 3: Generate */}
              {generateQuizStep === 3 && (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                  <h4 style={{ marginBottom: '16px', color: 'var(--text-title)' }}>Step 3: Generate AI Quiz</h4>
                  
                  <div className="form-group" style={{ textAlign: 'left', marginBottom: '24px' }}>
                    <label className="form-label">Number of Questions to Generate</label>
                    <select 
                      className="form-select" 
                      value={generateQuizCount} 
                      onChange={(e) => setGenerateQuizCount(parseInt(e.target.value))}
                    >
                      <option value="1">1 Question</option>
                      <option value="3">3 Questions</option>
                      <option value="5">5 Questions</option>
                      <option value="10">10 Questions</option>
                    </select>
                  </div>
                  
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px' }}>
                    Groq AI will read the information for the selected content and generate <strong>{generateQuizCount}</strong> factual multiple-choice questions. 
                    <br/><br/>
                    <strong>Note:</strong> The generated questions will be sent to the Tourist Guides for review. They will NOT appear in the mobile app until they are approved.
                  </p>
                </div>
              )}

            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              {generateQuizStep > 1 ? (
                <button type="button" className="btn btn-secondary" onClick={() => setGenerateQuizStep(prev => prev - 1)}>Back</button>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={() => setIsGenerateQuizModalOpen(false)}>Cancel</button>
              )}

              {generateQuizStep < 3 ? (
                <button type="button" className="btn btn-primary" onClick={() => {
                  if (generateQuizStep === 2 && !generateQuizContentId) return showError('Please select a target content first.', 'Missing Selection', 'error');
                  setGenerateQuizStep(prev => prev + 1);
                }}>Next</button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handleGenerateAIQuiz} disabled={isGeneratingQuiz || !generateQuizContentId} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isGeneratingQuiz ? <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Target size={16} />}
                  {isGeneratingQuiz ? 'Generating...' : 'Generate AI Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REVIEW QUIZ BATCH MODAL */}
      {isReviewQuizModalOpen && reviewingQuiz && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: '90vw', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Target size={18} style={{ marginRight: '8px' }} />
                Review AI Quiz Batch
              </h3>
              <button className="close-btn" onClick={() => { setIsReviewQuizModalOpen(false); setReviewingQuiz(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
              <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Target Content</div>
                <div style={{ fontWeight: 600, color: 'var(--text-title)' }}>{reviewingQuiz.targetName}</div>
              </div>

              {reviewingQuiz.questions.map((q, index) => (
                <div key={q.id} style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: index < reviewingQuiz.questions.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <h4 style={{ color: 'var(--text-title)', marginBottom: '12px', fontSize: '14px' }}>Question {index + 1}</h4>
                  
                  <div className="form-group">
                    <textarea className="form-textarea" value={q.question}
                      onChange={(e) => {
                        const newBatch = { ...reviewingQuiz };
                        newBatch.questions[index].question = e.target.value;
                        setReviewingQuiz(newBatch);
                      }} required />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    {['a', 'b', 'c', 'd'].map((letter, idx) => (
                      <div className="form-group" key={letter} style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: parseInt(q.correct_index) === idx ? 'var(--accent-blue)' : '#E2E8F0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, color: parseInt(q.correct_index) === idx ? '#fff' : '#333' }}>
                            {letter.toUpperCase()}
                          </span>
                          Choice {letter.toUpperCase()}
                          {parseInt(q.correct_index) === idx && <span style={{ fontSize: '10px', color: 'var(--accent-pink)', fontWeight: 700 }}>✓ CORRECT</span>}
                        </label>
                        <input type="text" className="form-input" value={q.choices[idx]}
                          onChange={(e) => {
                            const newBatch = { ...reviewingQuiz };
                            newBatch.questions[index].choices[idx] = e.target.value;
                            setReviewingQuiz(newBatch);
                          }} required />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Correct Answer</label>
                      <select className="form-select" value={q.correct_index}
                        onChange={(e) => {
                          const newBatch = { ...reviewingQuiz };
                          newBatch.questions[index].correct_index = e.target.value;
                          setReviewingQuiz(newBatch);
                        }}>
                        <option value="0">A — {q.choices[0] || '(empty)'}</option>
                        <option value="1">B — {q.choices[1] || '(empty)'}</option>
                        <option value="2">C — {q.choices[2] || '(empty)'}</option>
                        <option value="3">D — {q.choices[3] || '(empty)'}</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Explanation (shown to user)</label>
                      <textarea className="form-textarea" style={{ minHeight: '60px' }} value={q.explanation}
                        onChange={(e) => {
                          const newBatch = { ...reviewingQuiz };
                          newBatch.questions[index].explanation = e.target.value;
                          setReviewingQuiz(newBatch);
                        }} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => handleSingleReviewAction('reject', q.id)} style={{ background: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5', padding: '6px 12px', fontSize: '13px' }}>
                      <X size={14} style={{ marginRight: '4px' }} /> Reject
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => handleSingleReviewAction('approve', q.id)} style={{ background: '#10B981', borderColor: '#10B981', padding: '6px 12px', fontSize: '13px' }}>
                      <Target size={14} style={{ marginRight: '4px' }} /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
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

      {/* ── Global Error Modal ─────────────────────────────────────────── */}
      <ErrorModal
        visible={errorModal.visible}
        type={errorModal.type}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeErrorModal}
      />

    </div>
  )
}

export default App
