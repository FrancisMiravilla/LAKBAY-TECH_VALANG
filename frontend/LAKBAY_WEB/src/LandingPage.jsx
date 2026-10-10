import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@google/model-viewer';
import {
  Compass,
  Smartphone,
  MapPin,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  RotateCw,
  Box,
  Layers,
  Award,
  Download,
  ExternalLink,
  Flame,
  Globe,
  Radio,
  CheckCircle2,
  Lock,
  X,
  Play
} from 'lucide-react';
import './LandingPage.css';
import lakbayLogo from './assets/lakbay_icon_glyph.png';

// ── Models Data ─────────────────────────────────────────────────────────────
const MODELS = [
  {
    id: 'vinta',
    title: 'Zamboanga Vinta Boat',
    subtitle: 'Iconic Multi-Colored Sail Vessel',
    category: 'Maritime Heritage',
    badge: 'Legendary Exhibit',
    src: '/models/vinta_boat_final.glb',
    desc: 'The signature traditional outrigger boat with vibrant vertical sails that symbolizes the seafaring soul and maritime heritage of Western Mindanao.',
    details: 'Hand-carved wooden hull with vibrant asymmetric sail textiles woven in traditional geometric patterns.',
  },
  {
    id: 'curacha',
    title: 'Alavar Curacha',
    subtitle: 'Zamboanga Spanner Crab',
    category: 'Cultural Gastronomy',
    badge: 'Iconic Delicacy',
    src: '/models/alavar_curacha.glb',
    desc: 'The revered deep-sea spanner crab unique to Sulu and Zamboanga waters, crowned in authentic secret-recipe Alavar coconut sauce.',
    details: 'Digital 3D capture of Zamboanga City’s premier culinary masterpiece, featured in cultural food festivals.',
  },
  {
    id: 'cloth',
    title: 'Traditional Yakan Weave',
    subtitle: 'Sacred Indigenous Textile',
    category: 'Indigenous Artifact',
    badge: 'Living Tradition',
    src: '/models/cloth_final.glb',
    desc: 'Authentic Seputangan and Tennun fabric handwoven on backstrap looms by master indigenous weavers at the Yakan Village of Upper Calarian.',
    details: 'Complex geometric motifs reflecting nature, Islamic geometry, and ancestral storytelling traditions.',
  },
  {
    id: 'building',
    title: 'Heritage Architecture',
    subtitle: 'Western Mindanao Cultural Landmark',
    category: 'Architectural Heritage',
    badge: 'Historic Structure',
    src: '/models/resort_building_final.glb',
    desc: 'Historic coastal and fortress architecture embodying Spanish colonial, American period, and traditional Moro spatial designs.',
    details: 'High-detail architectural model capturing the preservation of Zamboanga historic structures and pavilion outposts.',
  },
];

// ── FAQs Data ───────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'Do I need a high-end smartphone to run the LAKBAY app?',
    a: 'Not at all. The 3D artifacts and geofencing engine are highly optimized to run smoothly on mainstream Android and iOS smartphones without requiring expensive LiDAR sensors.',
  },
  {
    q: 'Can I use LAKBAY without an active internet connection?',
    a: 'Yes! The mobile app includes offline caching for unlocked landmarks, caught 3D models, and explorer badges, allowing tourists to explore even with intermittent cellular reception.',
  },
  {
    q: 'How does the AR Exhibit and 3D Scanning feature work?',
    a: 'When you arrive at registered spots like Fort Pilar or City Hall, open the AR Scanner to align the camera with target sculptures or QR markers. A full-scale 3D model immediately springs to life in steady augmented reality.',
  },
  {
    q: 'Who has access to the Staff and Tour Guide Portal?',
    a: 'The portal features role-based access. System Administrators manage landmarks, 3D targets, and merchant promotions, while Certified Tour Guides review, validate, and moderate cultural trivia questions.',
  },
];

// ── Interactive Mapbox Component ───────────────────────────────────────────
function MapSection() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    try {
      mapboxgl.accessToken = token;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [122.079, 6.912],
        zoom: 14.2,
        pitch: 50,
        bearing: -15,
        interactive: true,
      });

      map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');

      // Fort Pilar Marker
      const pilarEl = document.createElement('div');
      pilarEl.className = 'lp-custom-marker';
      pilarEl.innerHTML = `
        <div class="lp-marker-pulse"></div>
        <div class="lp-marker-pill">
          <span>🏛️ Fort Pilar National Museum</span>
        </div>
      `;
      new mapboxgl.Marker(pilarEl).setLngLat([122.0825, 6.9038]).addTo(map.current);

      // City Hall Marker
      const hallEl = document.createElement('div');
      hallEl.className = 'lp-custom-marker';
      hallEl.innerHTML = `
        <div class="lp-marker-pulse"></div>
        <div class="lp-marker-pill">
          <span>🏛️ Zamboanga City Hall</span>
        </div>
      `;
      new mapboxgl.Marker(hallEl).setLngLat([122.0758, 6.9062]).addTo(map.current);

      // Paseo del Mar Marker
      const paseoEl = document.createElement('div');
      paseoEl.className = 'lp-custom-marker';
      paseoEl.innerHTML = `
        <div class="lp-marker-pulse"></div>
        <div class="lp-marker-pill">
          <span>⛵ Paseo del Mar & Vintas</span>
        </div>
      `;
      new mapboxgl.Marker(paseoEl).setLngLat([122.081, 6.9015]).addTo(map.current);
    } catch (e) {
      console.warn('Mapbox initialization:', e);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [token]);

  return (
    <div className="lp-map-container">
      <div ref={mapContainer} className="lp-map-canvas" />
      <div className="lp-map-status-pill">
        <span className="lp-status-dot"></span>
        GPS Cultural Tracking: <strong>Active</strong>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function LandingPage({
  onLogin,
  loginCredentials,
  setLoginCredentials,
  isLoggingIn,
  loginError,
  initialLoginOpen = false,
  onGoToAdmin,
}) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(initialLoginOpen);
  const [selectedRole, setSelectedRole] = useState('admin'); // 'admin' | 'tourist_guide'
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  const activeModel = MODELS[activeModelIndex];

  const handleOpenAdminModal = (role = 'admin') => {
    setSelectedRole(role);
    setIsLoginModalOpen(true);
    if (onGoToAdmin) onGoToAdmin();
  };

  return (
    <div className="lp-page">
      {/* ── Top Navigation Bar ── */}
      <header className="lp-navbar">
        <div className="lp-nav-inner">
          <a href="#" className="lp-brand">
            <img src={lakbayLogo} alt="LAKBAY Logo" className="lp-brand-logo" />
            <span className="lp-brand-name">LAKBAY</span>
          </a>

          <nav className="lp-nav-links">
            <a href="#models">3D Artifacts</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#map">Digital Twin</a>
            <a href="#ecosystem">Ecosystem</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="lp-nav-actions">
            <button
              className="lp-link-guide"
              onClick={() => handleOpenAdminModal('tourist_guide')}
            >
              Tour Guide Portal
            </button>
            <button
              className="lp-btn-primary lp-btn-sm"
              onClick={() => handleOpenAdminModal('admin')}
            >
              <ShieldCheck size={16} />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg-gradient" />
        <div className="lp-hero-inner">
          <div className="lp-hero-content">
            <div className="lp-badge">
              <Sparkles size={14} className="text-amber-500" />
              <span>CULTURAL HERITAGE &amp; AUGMENTED REALITY</span>
            </div>

            <h1 className="lp-hero-title">
              Your Heritage, <br />
              <span className="lp-title-accent">Fully Unlocked.</span>
            </h1>

            <p className="lp-hero-desc">
              Step into the digital layer of Zamboanga City. LAKBAY merges Mapbox GPS,
              3D AR visualization, and interactive cultural quests into one seamless
              exploration app.
            </p>

            <div className="lp-hero-cta-group">
              <a href="#ecosystem" className="lp-btn-primary lp-btn-lg">
                <Smartphone size={20} />
                <span>Explore Ecosystem</span>
              </a>

              <a href="#models" className="lp-btn-secondary lp-btn-lg">
                <span>Inspect 3D Artifacts</span>
                <ArrowRight size={18} />
              </a>
            </div>

            <div className="lp-hero-micro">
              <div className="lp-micro-item">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>National Museum Coordinates</span>
              </div>
              <div className="lp-micro-item">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Zero-Latency 3D WebGL</span>
              </div>
            </div>
          </div>

          {/* 3D Angled Phone Mockup */}
          <div className="lp-phone-wrapper">
            <div className="lp-phone-glow" />
            <div className="lp-phone-frame">
              {/* Speaker / Camera Notch */}
              <div className="lp-phone-notch" />
              {/* Screen Image */}
              <img
                src="/mobilepicture.jpg"
                alt="LAKBAY Mobile Interactive Map"
                className="lp-phone-screen-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee Ribbon ── */}
      <section className="lp-marquee-section">
        <div className="lp-marquee-track">
          {[1, 2].map((i) => (
            <div key={i} className="lp-marquee-content">
              <span>Fort Pilar National Museum</span>
              <span className="lp-marquee-star">✦</span>
              <span>Zamboanga City Hall</span>
              <span className="lp-marquee-star">✦</span>
              <span>Paseo del Mar &amp; Vintas</span>
              <span className="lp-marquee-star">✦</span>
              <span>Yakan Weaving Village</span>
              <span className="lp-marquee-star">✦</span>
              <span>Pettit Barracks</span>
              <span className="lp-marquee-star">✦</span>
              <span>Plaza Pershing</span>
              <span className="lp-marquee-star">✦</span>
              <span>Santa Cruz Pink Sand Island</span>
              <span className="lp-marquee-star">✦</span>
              <span>Pasonanca Natural Park</span>
              <span className="lp-marquee-star">✦</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Impact Metrics (Dark Section) ── */}
      <section className="lp-metrics-section">
        <div className="lp-metrics-grid">
          <div className="lp-metric-card">
            <div className="lp-metric-number">30+</div>
            <p className="lp-metric-label">Landmarks &amp; Cultural Spots</p>
          </div>
          <div className="lp-metric-card">
            <div className="lp-metric-number">1,000+</div>
            <p className="lp-metric-label">Interactive Cultural Quests</p>
          </div>
          <div className="lp-metric-card">
            <div className="lp-metric-number">4</div>
            <p className="lp-metric-label">Full-Scale 3D Artifacts</p>
          </div>
          <div className="lp-metric-card">
            <div className="lp-metric-number lp-metric-accent">360°</div>
            <p className="lp-metric-label">Spatial &amp; AR Walkthroughs</p>
          </div>
        </div>
      </section>

      {/* ── Heritage Showcase (Zamboanga Photo) ── */}
      <section className="lp-heritage-section">
        <div className="lp-heritage-inner">
          <div className="lp-heritage-text">
            <div className="lp-badge">
              <Globe size={14} className="text-amber-500" />
              <span>CULTURAL TOURISM RESILIENCE</span>
            </div>
            <h2 className="lp-section-title">
              Built exclusively for <br />
              <span className="lp-title-accent">Zamboanga City &amp; Western Mindanao.</span>
            </h2>
            <p className="lp-section-desc">
              We are bridging the gap between physical historical heritage and digital
              innovation. LAKBAY transforms the historic architecture, cultural arts,
              and sacred landmarks of Zamboanga City into a highly interactive, accessible,
              and connected spatial experience.
            </p>
            <div className="lp-heritage-highlights">
              <div className="lp-highlight-item">
                <span className="lp-highlight-num">01</span>
                <div>
                  <h4>Preserving Oral &amp; Visual Lore</h4>
                  <p>Validated trivia reviewed by licensed cultural tour guides and educators.</p>
                </div>
              </div>
              <div className="lp-highlight-item">
                <span className="lp-highlight-num">02</span>
                <div>
                  <h4>Gamified Explorer Rewards</h4>
                  <p>Daily streaks, explorer levels, and treasury coins for local merchant perks.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-heritage-image-wrapper">
            <div className="lp-heritage-offset-box" />
            <img
              src="/zamboanga.jpg"
              alt="Zamboanga City Vinta Heritage"
              className="lp-heritage-img"
            />
            <div className="lp-heritage-caption">
              <span>⛵ Colorful Vintas of Paseo del Mar, Zamboanga City</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works (3 Steps) ── */}
      <section id="how-it-works" className="lp-steps-section">
        <div className="lp-section-header">
          <h2 className="lp-section-title">How It Works</h2>
          <p className="lp-section-subtitle">
            Your physical journey, perfectly synced with your digital expedition log.
          </p>
        </div>

        <div className="lp-steps-grid">
          <div className="lp-step-connector" />

          <div className="lp-step-card">
            <div className="lp-step-icon-wrap">
              <Smartphone size={28} />
            </div>
            <h3 className="lp-step-title">1. Open the Scanner</h3>
            <p className="lp-step-desc">
              Launch the LAKBAY mobile app and activate your camera to scan real-world target
              exhibits, museum markers, and QR plaques.
            </p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-icon-wrap">
              <Radio size={28} />
            </div>
            <h3 className="lp-step-title">2. Enter a Geofence</h3>
            <p className="lp-step-desc">
              Walk into designated heritage zones across Zamboanga to trigger location-based
              tales, proximity puzzles, and audio notes.
            </p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-icon-wrap lp-step-icon-accent">
              <Sparkles size={28} />
            </div>
            <h3 className="lp-step-title">3. Unlock 3D Discoveries</h3>
            <p className="lp-step-desc">
              Gain EXP, collect rare artifacts, answer historical quizzes, and inspect 3D
              sculptures from any angle directly in AR.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4 3D Models Showcase ── */}
      <section id="models" className="lp-models-section">
        <div className="lp-section-header">
          <div className="lp-badge">
            <Box size={14} className="text-amber-500" />
            <span>INTERACTIVE AR ARTIFACTS</span>
          </div>
          <h2 className="lp-section-title">
            True Spatial <span className="lp-title-accent">Understanding.</span>
          </h2>
          <p className="lp-section-subtitle">
            Don't just read about Zamboanga heritage—experience it. LAKBAY renders high-fidelity
            3D models directly in your browser. Rotate, zoom, and inspect cultural artifacts in 360°.
          </p>
        </div>

        {/* Active Featured 3D Viewer */}
        <div className="lp-model-showcase-box">
          <div className="lp-model-viewer-frame">
            <div className="lp-model-badge-row">
              <span className="lp-model-category-pill">{activeModel.category}</span>
              <span className="lp-model-tag-pill">{activeModel.badge}</span>
            </div>

            <div className="lp-model-canvas-wrap">
              <model-viewer
                src={activeModel.src}
                alt={activeModel.title}
                auto-rotate="true"
                camera-controls="true"
                shadow-intensity="1.5"
                exposure="1.0"
                style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
              />
            </div>

            <div className="lp-spin-prompt">
              <RotateCw size={14} className="animate-spin text-amber-500" />
              <span>Fully Interactive — Click &amp; Drag to Rotate 360° • Pinch / Scroll to Zoom</span>
            </div>
          </div>

          {/* Model Description & Details Card */}
          <div className="lp-model-info-side">
            <div className="lp-model-info-header">
              <span className="lp-model-id-label">CATALOG ARTIFACT #{activeModelIndex + 1}</span>
              <h3 className="lp-model-active-title">{activeModel.title}</h3>
              <p className="lp-model-active-subtitle">{activeModel.subtitle}</p>
            </div>

            <p className="lp-model-active-desc">{activeModel.desc}</p>

            <div className="lp-model-meta-card">
              <div className="lp-meta-row">
                <span className="lp-meta-label">Artifact Class:</span>
                <span className="lp-meta-val">{activeModel.category}</span>
              </div>
              <div className="lp-meta-row">
                <span className="lp-meta-label">Curator Notes:</span>
                <span className="lp-meta-val">{activeModel.details}</span>
              </div>
              <div className="lp-meta-row">
                <span className="lp-meta-label">Interactive Mode:</span>
                <span className="lp-meta-val text-emerald-600 font-bold">WebGL 3D &amp; Native Mobile AR</span>
              </div>
            </div>

            {/* Quick 4-Model Switcher Tabs */}
            <div className="lp-model-tabs-label">Select 3D Artifact:</div>
            <div className="lp-model-selector-grid">
              {MODELS.map((item, idx) => (
                <button
                  key={item.id}
                  className={`lp-model-select-btn ${activeModelIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveModelIndex(idx)}
                >
                  <span className="lp-select-num">{idx + 1}</span>
                  <div className="lp-select-text">
                    <span className="lp-select-name">{item.title}</span>
                    <span className="lp-select-cat">{item.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4 Models Grid Cards */}
        <div className="lp-models-quad-grid">
          {MODELS.map((m, idx) => (
            <div
              key={m.id}
              className={`lp-quad-card ${activeModelIndex === idx ? 'lp-quad-card-active' : ''}`}
              onClick={() => setActiveModelIndex(idx)}
            >
              <div className="lp-quad-thumb-viewer">
                <model-viewer
                  src={m.src}
                  alt={m.title}
                  auto-rotate="true"
                  style={{ width: '100%', height: '180px', backgroundColor: 'transparent' }}
                  interaction-prompt="none"
                />
              </div>
              <div className="lp-quad-card-body">
                <span className="lp-quad-cat">{m.category}</span>
                <h4 className="lp-quad-title">{m.title}</h4>
                <p className="lp-quad-desc">{m.subtitle}</p>
                <button className="lp-quad-inspect-btn">
                  <span>Inspect 3D Artifact</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Digital Twin Mapbox Section ── */}
      <section id="map" className="lp-map-section">
        <div className="lp-section-header">
          <div className="lp-badge">
            <MapPin size={14} className="text-amber-500" />
            <span>HIGH-PRECISION GEOFENCING</span>
          </div>
          <h2 className="lp-section-title">The Digital Twin.</h2>
          <p className="lp-section-subtitle">
            Navigate a living 3D replica of Zamboanga City. Experience real-time GPS
            pathfinding, cultural spot highlights, and active geofence boundaries powered by Mapbox.
          </p>
        </div>

        <MapSection />
      </section>

      {/* ── Two Interfaces. One Ecosystem. ── */}
      <section id="ecosystem" className="lp-ecosystem-section">
        <div className="lp-section-header">
          <h2 className="lp-section-title">
            Two Interfaces. <br />
            <span className="lp-title-accent">One Connected Ecosystem.</span>
          </h2>
          <p className="lp-section-subtitle">
            Unified infrastructure designed for on-the-ground exploration and cloud administrative command.
          </p>
        </div>

        <div className="lp-ecosystem-grid">
          {/* Mobile Card */}
          <div className="lp-eco-column">
            <div className="lp-eco-header">
              <div className="lp-eco-icon-tag lp-eco-icon-tag--mobile">
                <Smartphone size={24} />
                <span>FOR TOURISTS, STUDENTS &amp; EXPLORERS</span>
              </div>
              <h3 className="lp-eco-title">The Mobile Application</h3>
              <p className="lp-eco-desc">
                Turn your smartphone into a magic lens. Built with React Native &amp; Expo for
                immersive cultural discovery, live navigation, and interactive trivia.
              </p>
            </div>

            <ul className="lp-eco-features">
              <li>
                <div className="lp-feat-icon">
                  <Compass size={20} />
                </div>
                <div>
                  <h4>Live Mapbox Geolocation</h4>
                  <p>Turn-by-turn routing to historical sites and museum wings across Zamboanga.</p>
                </div>
              </li>
              <li>
                <div className="lp-feat-icon">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4>Steady AR Exhibit Scanners</h4>
                  <p>Touch-enabled 360° swipe rotation, multi-touch pinch zoom, and artifact inspect HUD.</p>
                </div>
              </li>
              <li>
                <div className="lp-feat-icon">
                  <Award size={20} />
                </div>
                <div>
                  <h4>Gamified Expedition Log</h4>
                  <p>Collect rare mythical badges, maintain daily streaks, and climb community rankings.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Web Dashboard Card */}
          <div className="lp-eco-column">
            <div className="lp-eco-header">
              <div className="lp-eco-icon-tag lp-eco-icon-tag--web">
                <ShieldCheck size={24} />
                <span>FOR ADMINISTRATORS &amp; TOUR GUIDES</span>
              </div>
              <h3 className="lp-eco-title">The Staff Web Portal</h3>
              <p className="lp-eco-desc">
                A unified desktop command center for monitoring historical data, verifying
                educational trivia, and managing merchant promotions from anywhere.
              </p>
            </div>

            <ul className="lp-eco-features">
              <li>
                <div className="lp-feat-icon">
                  <Layers size={20} />
                </div>
                <div>
                  <h4>Cultural Spot &amp; 3D Target Management</h4>
                  <p>Upload lightweight .glb models, set coordinates, and curate historical descriptions.</p>
                </div>
              </li>
              <li>
                <div className="lp-feat-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4>Tour Guide Trivia Moderation</h4>
                  <p>Certified local guides review and calibrate AI trivia questions for authentic accuracy.</p>
                </div>
              </li>
              <li>
                <div className="lp-feat-icon">
                  <Globe size={20} />
                </div>
                <div>
                  <h4>Live Real-Time Analytics</h4>
                  <p>Monitor visitor traffic, scan density heatmaps, and merchant coin promotions.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Bento Features ── */}
      <section className="lp-bento-section">
        <div className="lp-bento-grid">
          {/* Card 1: Proximity Engine */}
          <div className="lp-bento-card lp-bento-main">
            <div className="lp-bento-watermark">
              <MapPin size={240} strokeWidth={1} />
            </div>
            <span className="lp-bento-tag">PROXIMITY ENGINE</span>
            <h3 className="lp-bento-title">
              Walk inside. <br />
              Unlock the landmark.
            </h3>
            <p className="lp-bento-desc">
              No manual check-ins needed. LAKBAY utilizes calibrated GPS geofences. Cross
              the perimeter of Fort Pilar or City Hall, and your device automatically unlocks
              exclusive historical trivia and 3D artifacts.
            </p>
          </div>

          {/* Card 2: Leaderboard */}
          <div className="lp-bento-card lp-bento-aside">
            <Award size={36} className="text-amber-400 mb-4" />
            <span className="lp-bento-tag text-amber-300">EXPLORER GUILD</span>
            <h3 className="lp-bento-title-sm">Climb the Leaderboard</h3>
            <p className="lp-bento-desc-sm">
              Complete cultural quests, maintain daily login streaks, and earn EXP to advance
              from Novice Scout to Grand Curator.
            </p>

            <div className="lp-bento-stat-box">
              <div className="lp-stat-row">
                <span className="lp-stat-label">CURRENT RANK:</span>
                <span className="lp-stat-val text-amber-300 font-bold">VINTA NAVIGATOR (Lv. 4)</span>
              </div>
              <div className="lp-progress-bar">
                <div className="lp-progress-fill" style={{ width: '80%' }} />
              </div>
              <div className="lp-stat-footer">
                <span>1,450 / 1,800 EXP</span>
                <span className="text-amber-300 font-bold">+350 EXP Next Tier</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Frequently Asked Questions ── */}
      <section id="faq" className="lp-faq-section">
        <div className="lp-section-header">
          <h2 className="lp-section-title">Frequently Asked Questions</h2>
          <p className="lp-section-subtitle">
            Everything you need to know about experiencing and managing LAKBAY.
          </p>
        </div>

        <div className="lp-faq-list">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className={`lp-faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  className="lp-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={20}
                    className={`lp-faq-chevron ${isOpen ? 'rotate' : ''}`}
                  />
                </button>
                {isOpen && <div className="lp-faq-answer">{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="lp-cta-banner">
        <div className="lp-cta-inner">
          <h2 className="lp-cta-title">Ready to explore the digital heritage of Zamboanga?</h2>
          <p className="lp-cta-desc">
            The ultimate cultural mapping, spatial 3D visualization, and quest system is live.
          </p>
          <div className="lp-cta-buttons">
            <button
              className="lp-btn-cta-light"
              onClick={() => handleOpenAdminModal('admin')}
            >
              <ShieldCheck size={18} />
              <span>Launch Admin Portal</span>
            </button>
            <button
              className="lp-btn-cta-outline"
              onClick={() => handleOpenAdminModal('tourist_guide')}
            >
              <span>Tour Guide Login →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-left">
            <img src={lakbayLogo} alt="LAKBAY Logo" className="lp-footer-logo" />
            <div>
              <span className="lp-footer-brand">LAKBAY Zamboanga</span>
              <p className="lp-footer-sub">
                Official Augmented Reality Cultural Tourism Platform
              </p>
            </div>
          </div>

          <div className="lp-footer-right">
            <span>© {new Date().getFullYear()} LAKBAY. Western Mindanao State University.</span>
            <span className="lp-footer-pipe">|</span>
            <span>National Museum of the Philippines – Zamboanga</span>
          </div>
        </div>
      </footer>

      {/* ── Login Modal (Preserved for Administrators & Tour Guides) ── */}
      {isLoginModalOpen && (
        <div className="lp-modal-backdrop" onClick={() => setIsLoginModalOpen(false)}>
          <div
            className={`lp-login-modal ${selectedRole === 'tourist_guide' ? 'lp-login-modal--guide' : ''}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`lp-login-glow-bar ${selectedRole === 'tourist_guide' ? 'lp-login-glow-bar--guide' : ''}`}
            />

            <button
              className="lp-login-close-btn"
              onClick={() => setIsLoginModalOpen(false)}
              aria-label="Close Staff Portal login modal"
            >
              <X size={18} />
            </button>

            <div className="lp-login-header">
              <div className="lp-login-logo-wrap">
                <img src={lakbayLogo} alt="LAKBAY" className="lp-login-logo" />
              </div>
              <h2 className="lp-login-title">
                LAKBAY{' '}
                <span
                  className={`lp-login-title-accent ${selectedRole === 'tourist_guide' ? 'lp-login-title-accent--guide' : ''}`}
                >
                  {selectedRole === 'tourist_guide' ? 'GUIDE' : 'ADMIN'}
                </span>
              </h2>
              <p className="lp-login-subtitle">
                {selectedRole === 'tourist_guide'
                  ? 'Cultural Validation & Tour Guide Portal'
                  : 'Zamboanga Cultural System Administration'}
              </p>
            </div>

            {/* Role Tab Selector */}
            <div className="lp-role-selector">
              <button
                type="button"
                className={`lp-role-tab ${selectedRole === 'admin' ? 'lp-role-tab--active' : ''}`}
                onClick={() => setSelectedRole('admin')}
              >
                <div className="lp-role-tab-icon">
                  <ShieldCheck size={20} />
                </div>
                <div className="lp-role-tab-info">
                  <span className="lp-role-tab-title">Administrator</span>
                  <span className="lp-role-tab-sub">System Operations</span>
                </div>
              </button>

              <button
                type="button"
                className={`lp-role-tab lp-role-tab--guide ${selectedRole === 'tourist_guide' ? 'lp-role-tab--active' : ''}`}
                onClick={() => setSelectedRole('tourist_guide')}
              >
                <div className="lp-role-tab-icon">
                  <Compass size={20} />
                </div>
                <div className="lp-role-tab-info">
                  <span className="lp-role-tab-title">Tour Guide</span>
                  <span className="lp-role-tab-sub">Quiz &amp; Verification</span>
                </div>
              </button>
            </div>

            {/* Scope Badge */}
            {selectedRole === 'admin' ? (
              <div className="lp-role-desc-box">
                <span className="lp-role-desc-badge">ADMIN ACCESS</span>
                <p className="lp-role-desc-text">
                  Manage cultural spots, 3D AR targets, QR markers, users, merchant promotions, and live platform analytics.
                </p>
              </div>
            ) : (
              <div className="lp-role-desc-box lp-role-desc-box--guide">
                <span className="lp-role-desc-badge">GUIDE ACCESS</span>
                <p className="lp-role-desc-text">
                  Educational &amp; cultural validation hub: review, edit, approve, or reject AI-generated quizzes and verify local lore.
                </p>
              </div>
            )}

            {loginError && <div className="lp-login-error">{loginError}</div>}

            <form onSubmit={onLogin} className="lp-login-form">
              <div className="lp-form-group">
                <label className="lp-form-label">
                  {selectedRole === 'admin' ? 'Administrator Email' : 'Tour Guide Email'}
                </label>
                <div className="lp-input-wrap">
                  <Lock size={16} className="lp-input-icon" />
                  <input
                    type="email"
                    className="lp-form-input"
                    placeholder={selectedRole === 'admin' ? 'admin@lakbay.ph' : 'guide@lakbay.ph'}
                    value={loginCredentials?.email || ''}
                    onChange={(e) =>
                      setLoginCredentials &&
                      setLoginCredentials({ ...loginCredentials, email: e.target.value })
                    }
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="lp-form-group">
                <label className="lp-form-label">Password</label>
                <div className="lp-input-wrap">
                  <Lock size={16} className="lp-input-icon" />
                  <input
                    type="password"
                    className="lp-form-input"
                    placeholder="Enter your password"
                    value={loginCredentials?.password || ''}
                    onChange={(e) =>
                      setLoginCredentials &&
                      setLoginCredentials({ ...loginCredentials, password: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`lp-btn lp-btn-primary lp-login-submit-btn ${selectedRole === 'tourist_guide' ? 'lp-login-submit-btn--guide' : ''}`}
                disabled={isLoggingIn}
              >
                {isLoggingIn
                  ? 'Authenticating...'
                  : selectedRole === 'admin'
                  ? 'Sign in as Administrator →'
                  : 'Sign in as Tour Guide →'}
              </button>
            </form>

            <div className="lp-login-footer">
              <p className="lp-login-footer-text">
                LAKBAY Staff Portal — Dedicated access for Administrators &amp; Certified Tour Guides
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
