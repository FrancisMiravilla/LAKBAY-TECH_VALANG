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
  Globe,
  Download,
  Power,
  CheckCircle,
  TrendingUp,
  Sun,
  Moon,
  Maximize,
  Minimize,
  Eye,
  Camera,
  Crosshair
} from 'lucide-react'
import './App.css'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const generateNotificationId = () => Date.now();


// Mock QR Code Component
const MockQR = ({ value }) => {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ shapeRendering: 'crispEdges' }}>
      <rect width="100" height="100" fill="white" />
      {/* 3 Main Corner Squares (QR Finders) */}
      <rect x="5" y="5" width="22" height="22" fill="black" />
      <rect x="8" y="8" width="16" height="16" fill="white" />
      <rect x="11" y="11" width="10" height="10" fill="black" />
      
      <rect x="73" y="5" width="22" height="22" fill="black" />
      <rect x="76" y="8" width="16" height="16" fill="white" />
      <rect x="79" y="11" width="10" height="10" fill="black" />
      
      <rect x="5" y="73" width="22" height="22" fill="black" />
      <rect x="8" y="76" width="16" height="16" fill="white" />
      <rect x="11" y="79" width="10" height="10" fill="black" />
      
      {/* Small alignment block */}
      <rect x="75" y="75" width="10" height="10" fill="black" />
      <rect x="78" y="78" width="4" height="4" fill="white" />
      
      {/* Random data pattern */}
      {Array.from({ length: 12 }).map((_, r) => {
        return Array.from({ length: 12 }).map((_, c) => {
          const x = 32 + c * 4.2;
          const y = 32 + r * 4.2;
          
          // Seeded pseudo-randomness based on coordinate and value
          const code = (r * 7 + c * 13 + (value ? value.charCodeAt(0) : 0)) % 7;
          const isFilled = code === 1 || code === 3 || code === 5;
          
          if (isFilled && x < 95 && y < 95) {
            return <rect key={`${r}-${c}`} x={x} y={y} width="4.2" height="4.2" fill="black" />;
          }
          return null;
        });
      })}
      
      {/* Edge timings and random bars */}
      <rect x="32" y="10" width="15" height="4.2" fill="black" />
      <rect x="42" y="20" width="8" height="4.2" fill="black" />
      <rect x="10" y="32" width="4.2" height="15" fill="black" />
      <rect x="20" y="42" width="4.2" height="8" fill="black" />
    </svg>
  );
};

// ── Feature-type constants ─────────────────────────────────────────────────
// featureTypes: array of 'qr' | 'ar' | 'catch'

// Initial Cultural Spots Mock Data
const INITIAL_SPOTS = [
  { id: 1, name: 'Great Santa Cruz Island', location: 'Zamboanga Channel, Zamboanga City', qrStatus: 'Active', triviaCount: 8, visits: 24500, category: 'beach', rating: 4.8, description: 'Famous for its unique pink coralline sand and crystal clear waters. A protected marine sanctuary perfect for snorkeling and lagoon tours.' },
  { id: 2, name: 'Fort Pilar Shrine & Museum', location: 'Valderosa St, Zamboanga City', qrStatus: 'Active', triviaCount: 12, visits: 48200, category: 'historical', rating: 4.7, description: 'A 17th-century Spanish military defense fortress and a major religious landmark housing the shrine of Our Lady of the Pillar.' },
  { id: 3, name: 'Yakan Weaving Village', location: 'Upper Calarian, Zamboanga City', qrStatus: 'Active', triviaCount: 6, visits: 15400, category: 'cultural', rating: 4.9, description: 'Home to the indigenous Yakan weavers. Watch them create beautiful, intricate geometric cloths by hand using traditional backstrap looms.' },
  { id: 4, name: 'Merloquet Falls', location: 'Barangay Sibulao, Zamboanga City', qrStatus: 'Active', triviaCount: 5, visits: 12100, category: 'nature', rating: 4.6, description: 'A stunning two-tiered waterfall with a scenic staircase-like rock wall over which the water cascades into a refreshing shallow pool.' },
  { id: 5, name: 'Paseo del Mar', location: 'Valderosa St, Zamboanga City', qrStatus: 'Active', triviaCount: 7, visits: 55000, category: 'cultural', rating: 4.5, description: 'A popular waterfront park offering beautiful sea views, local dining options, street food, and vibrant cultural shows at night.' },
  { id: 6, name: 'Pasonanca Tree House', location: 'Pasonanca Park, Zamboanga City', qrStatus: 'Inactive', triviaCount: 4, visits: 9800, category: 'historical', rating: 4.4, description: 'Built in 1960, this historic treehouse in Pasonanca Park allows visitors to climb up and experience staying in a nature-surrounded cottage.' },
  { id: 7, name: 'Taluksangay Mosque', location: 'Barangay Taluksangay, Zamboanga City', qrStatus: 'Active', triviaCount: 9, visits: 8200, category: 'cultural', rating: 4.8, description: 'Built in 1885, it is the oldest mosque in the Zamboanga Peninsula, featuring iconic red domes and serving as the historical center of Islam in the area.' }
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
  { id: 1, spotName: 'Great Santa Cruz Island', scanCount: 1450, status: 'Active' },
  { id: 2, spotName: 'Fort Pilar Shrine & Museum', scanCount: 3120, status: 'Active' },
  { id: 3, spotName: 'Yakan Weaving Village', scanCount: 890, status: 'Active' },
  { id: 4, spotName: 'Merloquet Falls', scanCount: 640, status: 'Active' },
  { id: 5, spotName: 'Paseo del Mar', scanCount: 4200, status: 'Active' },
  { id: 6, spotName: 'Pasonanca Tree House', scanCount: 530, status: 'Disabled' },
  { id: 7, spotName: 'Taluksangay Mosque', scanCount: 410, status: 'Active' }
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
  { id: 1, name: 'City Explorer', desc: 'Scan at least 3 QR codes in Zamboanga landmarks', iconName: 'map' },
  { id: 2, name: 'Vinta Sailor', desc: 'Scan Paseo del Mar QR code and capture Vinta in AR', iconName: 'compass' },
  { id: 3, name: 'Chavacano Native', desc: 'Solve 3 trivia questions correctly', iconName: 'award' },
  { id: 4, name: 'Fort Guardian', desc: 'Visit the Fort Pilar Shrine & Museum', iconName: 'shield' }
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
  const [spots, setSpots] = useState(INITIAL_SPOTS);
  const [selectedPinId, setSelectedPinId] = useState(1);
  const [qrcodes, setQrcodes] = useState(INITIAL_QRCODES);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Map Pins State
  const [mapPins, setMapPins] = useState(INITIAL_MAP_PINS);
  const [selectedMapPinId, setSelectedMapPinId] = useState(8); // default: Museum AR
  const [isAddMapPinModalOpen, setIsAddMapPinModalOpen] = useState(false);
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

  // Mapbox Refs & Configs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerElemsRef = useRef({}); // { pinId: { el, iconEl, badgeEl, cfg } }

  // Check if Mapbox token is still a placeholder
  const isTokenPlaceholder = useMemo(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    return !token || token.includes('placeholder_token_replace_me') || token === '';
  }, []);

  // Initialize Mapbox map — only rebuilds on tab/theme/pins change, NOT on pin selection
  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;

    markerElemsRef.current = {}; // reset refs on rebuild

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/navigation-night-v1' : 'mapbox://styles/mapbox/navigation-day-v1',
      center: [122.0790, 6.9214],
      zoom: 11.5,
      pitch: 30,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

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

      new mapboxgl.Marker(el)
        .setLngLat(pin.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 28, maxWidth: '240px' }).setHTML(popupHtml))
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
      mapRef.current.flyTo({
        center: pin.coordinates,
        zoom: 14,
        essential: true,
        pitch: 45,
      });
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

  // Handle Mapbox resize when fullscreen changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.resize();
      }, 150);
    }
  }, [isMapFullscreen]);

  const [users, setUsers] = useState(INITIAL_USERS);
  const [trivia, setTrivia] = useState(INITIAL_TRIVIA);
  const [creatures] = useState(INITIAL_CREATURES);
  const [exhibits] = useState(INITIAL_EXHIBITS);
  const [badges] = useState(INITIAL_BADGES);
  const [activities] = useState(INITIAL_ACTIVITIES);

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
    location: '',
    qrStatus: 'Active',
    category: 'cultural',
    rating: '5.0',
    description: '',
    triviaCount: 0,
    visits: 0
  });

  const [isEditSpotModalOpen, setIsEditSpotModalOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);

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
    return users.filter(user => {
      return user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
             user.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    });
  }, [users, userSearchQuery]);

  // Handlers
  const handleAddSpot = (e) => {
    e.preventDefault();
    if (!newSpot.name || !newSpot.location) return;

    const spotToAdd = {
      id: Date.now(),
      name: newSpot.name,
      location: newSpot.location,
      qrStatus: newSpot.qrStatus,
      category: newSpot.category || 'cultural',
      rating: parseFloat(newSpot.rating) || 5.0,
      description: newSpot.description || '',
      triviaCount: parseInt(newSpot.triviaCount) || 0,
      visits: parseInt(newSpot.visits) || 0
    };

    setSpots([...spots, spotToAdd]);
    
    // Also auto-generate a QR Code Card for the new spot
    const newQR = {
      id: Date.now(),
      spotName: spotToAdd.name,
      scanCount: 0,
      status: spotToAdd.qrStatus === 'Active' ? 'Active' : 'Disabled'
    };
    setQrcodes([...qrcodes, newQR]);

    setIsAddSpotModalOpen(false);
    // Reset Spot
    setNewSpot({
      name: '',
      location: '',
      qrStatus: 'Active',
      category: 'cultural',
      rating: '5.0',
      description: '',
      triviaCount: 0,
      visits: 0
    });

    setNotifications([
      { id: Date.now(), text: `Spot "${spotToAdd.name}" and QR Code initialized.`, time: 'Just now' },
      ...notifications
    ]);
  };

  const handleEditSpotSubmit = (e) => {
    e.preventDefault();
    if (!editingSpot.name || !editingSpot.location) return;

    setSpots(spots.map(spot => {
      if (spot.id === editingSpot.id) {
        return editingSpot;
      }
      return spot;
    }));

    // Update spotName in QR Codes if changed
    setQrcodes(qrcodes.map(q => {
      const originalSpot = spots.find(s => s.id === editingSpot.id);
      if (q.spotName === originalSpot?.name) {
        return { ...q, spotName: editingSpot.name, status: editingSpot.qrStatus === 'Active' ? 'Active' : 'Disabled' };
      }
      return q;
    }));

    setIsEditSpotModalOpen(false);
    setEditingSpot(null);
  };

  const handleDeleteSpot = (id) => {
    const spotToDelete = spots.find(s => s.id === id);
    if (confirm(`Are you sure you want to delete "${spotToDelete?.name}"?`)) {
      setSpots(spots.filter(spot => spot.id !== id));
      // Also delete its QR code card
      setQrcodes(qrcodes.filter(q => q.spotName !== spotToDelete?.name));
      
      setNotifications([
        { id: generateNotificationId(), text: `Spot "${spotToDelete?.name}" removed from registry.`, time: 'Just now' },
        ...notifications
      ]);
    }
  };

  const toggleQrStatus = (id) => {
    setQrcodes(qrcodes.map(q => {
      if (q.id === id) {
        const nextStatus = q.status === 'Active' ? 'Disabled' : 'Active';
        // Also sync back to spots
        setSpots(spots.map(s => {
          if (s.name === q.spotName) {
            return { ...s, qrStatus: nextStatus === 'Active' ? 'Active' : 'Inactive' };
          }
          return s;
        }));
        return { ...q, status: nextStatus };
      }
      return q;
    }));
  };

  const downloadQR = (spotName) => {
    alert(`Mock Download Triggered: LAKBAY_${spotName.replace(/\s+/g, '_')}_QR.png has been generated and saved.`);
  };

  const toggleUserStatus = (id) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

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
            Cultural Spots
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

          <span className="menu-section-title">Gamification & Heritage</span>
          <div 
            className={`menu-item ${activeTab === 'trivia' ? 'active' : ''}`}
            onClick={() => setActiveTab('trivia')}
          >
            <HelpCircle className="menu-icon" />
            Trivia
          </div>
          <div 
            className={`menu-item ${activeTab === 'creatures' ? 'active' : ''}`}
            onClick={() => setActiveTab('creatures')}
          >
            <Sparkles className="menu-icon" />
            Creatures and Symbols
          </div>
          <div 
            className={`menu-item ${activeTab === 'museum' ? 'active' : ''}`}
            onClick={() => setActiveTab('museum')}
          >
            <Landmark className="menu-icon" />
            Museum Exhibits
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
          <div className="user-avatar">ZC</div>
          <div className="user-info">
            <span className="user-name">Zambo Admin</span>
            <span className="user-role">Super Administrator</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* HEADER */}
        <header className="main-header">
          <div className="header-title-container">
            <h1 className="header-title">
              {activeTab === 'overview' && 'LAKBAY Dashboard'}
              {activeTab === 'spots' && 'Cultural Spots'}
              {activeTab === 'qrcodes' && 'QR Codes'}
              {activeTab === 'map' && 'Interactive Map'}
              {activeTab === 'trivia' && 'Cultural Trivia'}
              {activeTab === 'creatures' && 'Creatures and Symbols'}
              {activeTab === 'museum' && 'Museum Exhibits'}
              {activeTab === 'users' && 'User Directory'}
              {activeTab === 'badges' && 'Gamification Badges'}
              {activeTab === 'reports' && 'Analytics & Reports'}
            </h1>
            <span className="header-subtitle">
              {activeTab === 'overview' && 'Zamboanga City cultural app performance & analytics'}
              {activeTab === 'spots' && 'Manage geographic positions and historical details of Zamboanga'}
              {activeTab === 'qrcodes' && 'Manage and download system spot QR codes'}
              {activeTab === 'map' && 'Geospatial visualization and geofencing of tourist spots'}
              {activeTab === 'trivia' && 'Preserve and update local Chabacano trivia questions'}
              {activeTab === 'creatures' && 'Manage AR interactive cultural icons & spirits'}
              {activeTab === 'museum' && 'Track Fort Pilar exhibits and gallery status'}
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
                  placeholder="Search cultural spots..." 
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
                      <span style={{fontSize: '12px', color: '#A0AEC0', textAlign: 'center', padding: '12px 0'}}>No alerts</span>
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
              <button 
                className="btn btn-primary"
                onClick={() => setIsAddSpotModalOpen(true)}
              >
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

                <div className="stat-card">
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
                    <Sparkles size={24} />
                  </div>
                </div>

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
                    <Map size={24} />
                  </div>
                </div>
              </section>

              {/* Chart & Recent Activity Grid */}
              <section className="dashboard-grid">
                {/* Bar Chart: Most Visited Cultural Spots */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3 className="card-title">
                      <TrendingUp className="card-title-icon" size={18} />
                      Most Visited Cultural Spots
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

                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#A0AEC0'}}>
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

          {/* TAB CONTENT: 2. CULTURAL SPOTS */}
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
                      <th>QR Status</th>
                      <th>Trivia Count</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSpots.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{textAlign: 'center', padding: '32px 0', color: '#A0AEC0'}}>
                          No cultural spots match the filters or search query.
                        </td>
                      </tr>
                    ) : (
                      filteredSpots.map(spot => (
                        <tr key={spot.id}>
                          <td style={{fontWeight: 700, color: 'white'}}>{spot.name}</td>
                          <td>{spot.location}</td>
                          <td>
                            <span className={`badge ${spot.qrStatus === 'Active' ? 'active-status' : 'inactive-status'}`}>
                              {spot.qrStatus}
                            </span>
                          </td>
                          <td style={{fontFamily: 'monospace', fontWeight: 600, textAlign: 'center'}}>{spot.triviaCount} questions</td>
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
                  onClick={() => setIsAddSpotModalOpen(true)}
                >
                  <Plus size={16} />
                  Add QR Code
                </button>
              </div>

              {/* QR Cards Grid */}
              <div className="qr-grid">
                {qrcodes.map(qr => {
                  const spotDetails = spots.find(s => s.name === qr.spotName);
                  return (
                    <div key={qr.id} className="qr-card">
                      {spotDetails && (
                        <div className="qr-card-meta">
                          <span className={`badge ${spotDetails.category || 'cultural'}`}>
                            {spotDetails.category || 'cultural'}
                          </span>
                          <span className="qr-card-rating">
                            <Star size={12} fill="currentColor" style={{ color: 'var(--accent-gold)', marginRight: '2px' }} />
                            {spotDetails.rating || '5.0'}
                          </span>
                        </div>
                      )}

                      <div className="qr-image-container">
                        <MockQR value={qr.spotName} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center' }}>
                        <h4 className="qr-spot-name">{qr.spotName}</h4>
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

                        {spotDetails?.description && (
                          <p className="qr-spot-desc" title={spotDetails.description}>
                            {spotDetails.description}
                          </p>
                        )}
                      </div>

                      <div className="qr-actions">
                        <button 
                          className="btn btn-secondary"
                          style={{flex: 1, padding: '8px 12px', fontSize: '11px'}}
                          onClick={() => downloadQR(qr.spotName)}
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

          {/* TAB CONTENT: 4. TRIVIA */}
          {activeTab === 'trivia' && (
            <section className="content-card" style={{gap: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 className="card-title">
                  <HelpCircle className="card-title-icon" size={18} />
                  Zamboanga Historical & Cultural Trivia
                </h3>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    const q = prompt("Enter new Trivia Question:");
                    if (!q) return;
                    const a = prompt("Enter Answer:");
                    const spot = prompt("Enter Related Spot Name:");
                    if (q && a) {
                      setTrivia([...trivia, { id: Date.now(), spotName: spot || 'General Zamboanga', question: q, answer: a }]);
                      // Also increment trivia count for the spot
                      setSpots(spots.map(s => {
                        if (s.name.toLowerCase() === (spot || '').toLowerCase()) {
                          return { ...s, triviaCount: s.triviaCount + 1 };
                        }
                        return s;
                      }));
                    }
                  }}
                >
                  <Plus size={16} />
                  Add Trivia
                </button>
              </div>

              {/* Trivia list */}
              <div className="reviews-list">
                {trivia.map(tr => (
                  <div key={tr.id} className="review-item" style={{gap: '8px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px'}}>
                      <span style={{fontWeight: 700, color: '#E91E8C', fontSize: '12px'}}>{tr.spotName}</span>
                      <button 
                        className="icon-action-btn delete" 
                        style={{width: '24px', height: '24px'}}
                        onClick={() => setTrivia(trivia.filter(t => t.id !== tr.id))}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div style={{fontSize: '14px', fontWeight: 600, color: 'white', marginTop: '4px'}}>
                      Q: {tr.question}
                    </div>
                    <div style={{fontSize: '13px', color: '#A0AEC0', paddingLeft: '8px', borderLeft: '2px solid var(--accent-gold)'}}>
                      A: {tr.answer}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB CONTENT: 5. CREATURES & SYMBOLS */}
          {activeTab === 'creatures' && (
            <section className="content-card" style={{gap: '24px'}}>
              <h3 className="card-title">
                <Sparkles className="card-title-icon" size={18} />
                Preserved Creatures & Cultural Symbols (AR Catches)
              </h3>

              <div className="creature-grid">
                {creatures.map(cr => (
                  <div key={cr.id} className="creature-card">
                    <span className={`creature-rarity ${cr.rarity}`}>{cr.rarity}</span>
                    <div className="creature-icon-container">
                      <Anchor size={22} />
                    </div>
                    <div>
                      <h4 className="creature-name">{cr.name}</h4>
                      <span className="creature-type">{cr.type}</span>
                    </div>
                    <div className="creature-catches">
                      <CheckCircle size={14} color="#FBBF24" />
                      <span>{cr.catchesCount} Times Caught</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB CONTENT: 6. MUSEUM EXHIBITS */}
          {activeTab === 'museum' && (
            <section className="content-card" style={{gap: '24px'}}>
              <h3 className="card-title">
                <Landmark className="card-title-icon" size={18} />
                Fort Pilar National Museum Exhibits
              </h3>

              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Exhibit Title</th>
                      <th>Gallery Room</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exhibits.map(ex => (
                      <tr key={ex.id}>
                        <td style={{fontWeight: 700, color: 'white'}}>{ex.name}</td>
                        <td>{ex.gallery}</td>
                        <td>
                          <span className={`badge ${ex.status === 'On Display' ? 'active-status' : 'inactive-status'}`}>
                            {ex.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      <th>Name</th>
                      <th>Email</th>
                      <th>Spots Visited</th>
                      <th>Catches</th>
                      <th>AR Completed</th>
                      <th>Badges Earned</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{textAlign: 'center', padding: '32px 0', color: '#A0AEC0'}}>
                          No registered users match the search terms.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td style={{fontWeight: 700, color: 'white'}}>{user.name}</td>
                          <td style={{color: '#A0AEC0'}}>{user.email}</td>
                          <td style={{textAlign: 'center', fontWeight: 600}}>{user.spotsVisited}</td>
                          <td style={{textAlign: 'center', fontWeight: 600}}>{user.catches}</td>
                          <td style={{textAlign: 'center', fontWeight: 600}}>{user.arCompleted}</td>
                          <td style={{textAlign: 'center', fontWeight: 600, color: 'var(--accent-gold)'}}>{user.badgesEarned}</td>
                          <td>
                            <span className={`badge ${user.status === 'Active' ? 'active-status' : 'inactive-status'}`}>
                              {user.status}
                            </span>
                          </td>
                          <td>
                            <button 
                              className={`btn ${user.status === 'Active' ? 'btn-secondary' : 'btn-primary'}`}
                              style={{padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap'}}
                              onClick={() => toggleUserStatus(user.id)}
                            >
                              {user.status === 'Active' ? 'Suspend' : 'Activate'}
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
              <h3 className="card-title">
                <Award className="card-title-icon" size={18} />
                User Achievement Badges Configuration
              </h3>

              <div className="badges-grid">
                {badges.map(bd => (
                  <div key={bd.id} className="badge-card">
                    <div className="badge-icon-wrapper">
                      <Award size={28} />
                    </div>
                    <div className="badge-info">
                      <h4 className="badge-title">{bd.name}</h4>
                      <span className="badge-desc">{bd.desc}</span>
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
                  <h4 style={{fontSize: '15px', color: 'white', marginBottom: '10px'}}>Total Tourism Check-ins</h4>
                  <p style={{fontSize: '12px', color: '#A0AEC0', marginBottom: '16px'}}>Generate a full list of all spots visited and active user durations in CSV format.</p>
                  <button className="btn btn-primary" onClick={() => alert('CSV check-ins compiled!')}>Compile Check-ins</button>
                </div>

                <div style={{flex: 1, minWidth: '240px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px'}}>
                  <h4 style={{fontSize: '15px', color: 'white', marginBottom: '10px'}}>Preservation Metrics (Catches)</h4>
                  <p style={{fontSize: '12px', color: '#A0AEC0', marginBottom: '16px'}}>Export data on Yakan symbols captured, Chavacano trivia unlocked, and badge distribution.</p>
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
                      style={{ padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }}
                    >
                      {isMapFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                  </div>
                </div>

                {/* Mapbox canvas */}
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

                  {isTokenPlaceholder && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(24,29,56,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', zIndex: 10 }}>
                      <Globe size={40} color="var(--accent-pink)" style={{ marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }} />
                      <h4 style={{ color: 'white', marginBottom: '8px', fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700 }}>Mapbox Access Token Required</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: 1.5 }}>
                        Replace the placeholder in <code>frontend/LAKBAY_WEB/.env</code> with a valid Mapbox token, then restart the Vite server.
                      </p>
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

        </div>
      </main>

      {/* ADD SPOT MODAL */}
      {isAddSpotModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Add New Cultural Spot</h3>
              <button className="close-btn" onClick={() => setIsAddSpotModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSpot}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Spot Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Paseo del Mar"
                    value={newSpot.name}
                    onChange={(e) => setNewSpot({...newSpot, name: e.target.value})}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Valderosa St, Zamboanga City"
                    value={newSpot.location}
                    onChange={(e) => setNewSpot({...newSpot, location: e.target.value})}
                    required 
                  />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select"
                      value={newSpot.category}
                      onChange={(e) => setNewSpot({...newSpot, category: e.target.value})}
                    >
                      <option value="cultural">Cultural</option>
                      <option value="historical">Historical</option>
                      <option value="nature">Nature</option>
                      <option value="beach">Beach</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rating (1.0 - 5.0)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      className="form-input"
                      value={newSpot.rating}
                      onChange={(e) => setNewSpot({...newSpot, rating: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="Describe the cultural spot and its significance..."
                    value={newSpot.description}
                    onChange={(e) => setNewSpot({...newSpot, description: e.target.value})}
                    required
                  />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '16px'}}>
                  <div className="form-group">
                    <label className="form-label">QR Status</label>
                    <select 
                      className="form-select"
                      value={newSpot.qrStatus}
                      onChange={(e) => setNewSpot({...newSpot, qrStatus: e.target.value})}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trivia Count</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={newSpot.triviaCount}
                      onChange={(e) => setNewSpot({...newSpot, triviaCount: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Est. App Visits</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 5000"
                      value={newSpot.visits}
                      onChange={(e) => setNewSpot({...newSpot, visits: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddSpotModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Spot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD MAP PIN MODAL ── */}
      {isAddMapPinModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Add Spot to Map</h3>
              <button className="close-btn" onClick={() => setIsAddMapPinModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMapPin}>
              <div className="modal-body">

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
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input type="number" step="any" className="form-input" placeholder="e.g. 6.9032" required
                      value={newMapPin.lat} onChange={e => setNewMapPin({ ...newMapPin, lat: e.target.value })} />
                  </div>
                  <div className="form-group">
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
              <h3 className="modal-title">Edit Cultural Spot</h3>
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
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingSpot.name}
                    onChange={(e) => setEditingSpot({...editingSpot, name: e.target.value})}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingSpot.location}
                    onChange={(e) => setEditingSpot({...editingSpot, location: e.target.value})}
                    required 
                  />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select"
                      value={editingSpot.category || 'cultural'}
                      onChange={(e) => setEditingSpot({...editingSpot, category: e.target.value})}
                    >
                      <option value="cultural">Cultural</option>
                      <option value="historical">Historical</option>
                      <option value="nature">Nature</option>
                      <option value="beach">Beach</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rating (1.0 - 5.0)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      className="form-input"
                      value={editingSpot.rating || 5.0}
                      onChange={(e) => setEditingSpot({...editingSpot, rating: parseFloat(e.target.value) || 5.0})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="Describe the cultural spot and its significance..."
                    value={editingSpot.description || ''}
                    onChange={(e) => setEditingSpot({...editingSpot, description: e.target.value})}
                    required
                  />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '16px'}}>
                  <div className="form-group">
                    <label className="form-label">QR Status</label>
                    <select 
                      className="form-select"
                      value={editingSpot.qrStatus}
                      onChange={(e) => setEditingSpot({...editingSpot, qrStatus: e.target.value})}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trivia Count</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={editingSpot.triviaCount}
                      onChange={(e) => setEditingSpot({...editingSpot, triviaCount: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Est. App Visits</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={editingSpot.visits || 0}
                      onChange={(e) => setEditingSpot({...editingSpot, visits: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setIsEditSpotModalOpen(false);
                    setEditingSpot(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
