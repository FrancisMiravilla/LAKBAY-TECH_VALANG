import { useState, useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@google/model-viewer';
import qrService from './api/qrService';
import { authService } from './api/authService';
import LakbayMap from './map/LakbayMap';
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
  Globe,
  Radio,
  CheckCircle2,
  Lock,
  X,
} from 'lucide-react';
import './LandingPage.css';
import lakbayLogo from './assets/lakbay_icon_glyph.png';

// ── Models Data ─────────────────────────────────────────────────────────────
const MODELS = [
  {
    id: 'vinta',
    title: 'Zamboanga Vinta Boat',
    short: 'Vinta',
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
    short: 'Curacha',
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
    short: 'Yakan Weave',
    subtitle: 'Sacred Indigenous Textile',
    category: 'Indigenous Artifact',
    badge: 'Living Tradition',
    src: '/models/cloth_final.glb',
    desc: 'Authentic Seputangan and Tennun fabric handwoven on backstrap looms by master indigenous weavers at the Yakan Village of Upper Calarian.',
    details: 'Complex geometric motifs reflecting nature, Islamic geometry, and ancestral storytelling traditions.',
  },
  {
    id: 'lantaka',
    title: 'Lantaka',
    short: 'Lantaka',
    subtitle: 'Bronze Swivel Cannon',
    category: 'Moro Heritage Artifact',
    badge: 'Historic Artifact',
    src: '/models/resort_building_final.glb',
    desc: 'The bronze swivel cannon cast by Moro metalsmiths, once mounted on sea vessels and coastal defenses to guard the waters of Zamboanga and Mindanao.',
    details: 'Cast-bronze barrel with ornamental motifs, prized as a symbol of wealth, status, and defense in Moro communities.',
  },
];

// The hero ring holds every model twice so the orbit always looks full.
const RING_SLOTS = MODELS.length * 2;
const SLOT_DEG = 360 / RING_SLOTS;
const AUTO_ADVANCE_MS = 6000;

const modelForStep = (step) => (((step % RING_SLOTS) + RING_SLOTS) % RING_SLOTS) % MODELS.length;

// ── FAQs Data ───────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'Do I need a high-end smartphone to run the LAKBAY app?',
    a: 'Not at all. The 3D artifacts and geofencing engine are highly optimized to run smoothly on mainstream Android and iOS smartphones without requiring expensive LiDAR sensors.',
  },
  {
    q: 'Can I use LAKBAY without an active internet connection?',
    a: 'No. LAKBAY does not cater to an offline platform. You need an active internet connection (cellular data or Wi-Fi) to explore spots, validate QR codes, load 3D models, and track your explorer progress in real time.',
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

const MARQUEE_PLACES = [
  'Fort Pilar National Museum',
  'Zamboanga City Hall',
  'Paseo del Mar & Vintas',
  'Yakan Weaving Village',
  'Pettit Barracks',
  'Plaza Pershing',
  'Santa Cruz Pink Sand Island',
  'Pasonanca Natural Park',
];

// ── Interactive Mapbox Component (same data as the admin Interactive Map) ──
// Places and Catch models come from the public map endpoint; published
// promotions load inside LakbayMap. The showcase pins only appear if the
// server can't be reached.
const SHOWCASE_SPOTS = [
  { id: 'fort-pilar', name: 'Fort Pilar National Museum', description: 'AR exhibits inside the 1635 Spanish fort.', location_name: 'Zone IV', latitude: 6.9038, longitude: 122.0825, feature_types: ['ar'], required_level: 1 },
  { id: 'city-hall', name: 'Zamboanga City Hall', description: 'Scan the marker to unlock its story.', location_name: 'Zone IV', latitude: 6.9062, longitude: 122.0758, feature_types: ['qr'], required_level: 1 },
  { id: 'paseo', name: 'Paseo del Mar & Vintas', description: 'Waterfront park famous for colourful vinta sails.', location_name: 'Zone IV', latitude: 6.9015, longitude: 122.081, feature_types: ['qr'], required_level: 1 },
];

function MapSection() {
  const [spots, setSpots] = useState([]);
  const [catchIcons, setCatchIcons] = useState([]);

  useEffect(() => {
    let cancelled = false;
    qrService.getPublicMap()
      .then(({ data }) => {
        if (cancelled) return;
        setSpots(Array.isArray(data?.spots) ? data.spots : []);
        setCatchIcons(Array.isArray(data?.catch_icons) ? data.catch_icons : []);
      })
      .catch(() => {
        if (!cancelled) setSpots(SHOWCASE_SPOTS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="lp-map-container">
      <LakbayMap spots={spots} catchIcons={catchIcons} />
    </div>
  );
}

// ── Wave-shaped hill the hero model stands on ─────────────────────────────
function DunePedestal({ id = 'hero' }) {
  const main = `lpDuneMain-${id}`;
  const side = `lpDuneSide-${id}`;
  const grain = `lpGrain-${id}`;
  return (
    <svg className="lp-dunes" viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={main} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B8DEF" />
          <stop offset="0.55" stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#0C2461" />
        </linearGradient>
        <linearGradient id={side} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F5FC4" />
          <stop offset="1" stopColor="#08143C" />
        </linearGradient>
        <filter id={grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="grain">
            <feFuncA type="table" tableValues="0 0.18" />
          </feComponentTransfer>
          <feComposite in="grain" in2="SourceGraphic" operator="in" result="grainIn" />
          <feBlend in="SourceGraphic" in2="grainIn" mode="multiply" />
        </filter>
      </defs>
      <path d="M0 260 L0 190 C90 150 170 168 250 186 C330 204 360 210 420 214 L420 260 Z" fill={`url(#${side})`} filter={`url(#${grain})`} />
      <path d="M780 260 L780 214 C850 206 900 186 980 170 C1060 154 1130 166 1200 186 L1200 260 Z" fill={`url(#${side})`} filter={`url(#${grain})`} />
      <path
        d="M230 260 C300 232 380 214 440 170 C490 132 520 70 600 62 C680 70 710 132 760 170 C820 214 900 232 970 260 Z"
        fill={`url(#${main})`}
        filter={`url(#${grain})`}
      />
      <path d="M520 104 C560 84 640 84 680 104" stroke="#DBEAFE" strokeOpacity="0.45" strokeWidth="2" fill="none" />
    </svg>
  );
}

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// ── Orbiting tiles: an ellipse of model thumbnails turning behind the hero ──
function OrbitRing({ step, onPick, onHoverChange }) {
  const ringRef = useRef(null);
  const tileRefs = useRef([]);
  const targetRef = useRef(-step * SLOT_DEG);

  useEffect(() => {
    targetRef.current = -step * SLOT_DEG;
  }, [step]);

  useEffect(() => {
    const reduceMotion = prefersReducedMotion();
    let angle = targetRef.current;
    let frame = 0;
    let rx = 0;
    let ry = 0;
    const measure = () => {
      const hero = ringRef.current?.parentElement;
      if (!hero) return;
      const w = hero.clientWidth;
      const h = hero.clientHeight;
      rx = Math.min(w * (w < 720 ? 0.56 : 0.46), 660);
      ry = h * (w < 720 ? 0.34 : 0.42);
    };
    measure();
    window.addEventListener('resize', measure);

    const draw = (time) => {
      angle = reduceMotion ? targetRef.current : angle + (targetRef.current - angle) * 0.06;
      tileRefs.current.forEach((tile, slot) => {
        if (!tile) return;
        const deg = slot * SLOT_DEG + angle;
        const rad = (deg * Math.PI) / 180;
        const depth = Math.cos(rad);
        const bob = reduceMotion ? 0 : Math.sin(time / 900 + slot * 1.3) * 6;
        const x = Math.sin(rad) * rx;
        const y = -depth * ry + bob;
        const scale = 0.78 + 0.22 * Math.max(depth, 0);
        tile.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(deg * 0.55).toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        tile.style.opacity = depth < -0.45 ? '0' : depth > 0.93 ? '0.35' : '1';
        tile.style.pointerEvents = depth < -0.45 ? 'none' : 'auto';
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const topSlot = ((step % RING_SLOTS) + RING_SLOTS) % RING_SLOTS;

  return (
    <div
      ref={ringRef}
      className="lp-orbit"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      {Array.from({ length: RING_SLOTS }, (_, slot) => {
        const model = MODELS[slot % MODELS.length];
        return (
          <button
            key={slot}
            ref={(el) => { tileRefs.current[slot] = el; }}
            type="button"
            className={`lp-orbit-tile ${slot === topSlot ? 'is-active' : ''}`}
            onClick={() => onPick(slot)}
            aria-label={`Show ${model.title}`}
            tabIndex={slot < MODELS.length ? 0 : -1}
          >
            <model-viewer
              src={model.src}
              alt=""
              camera-orbit="35deg 72deg auto"
              interaction-prompt="none"
              disable-zoom
              disable-pan
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent', pointerEvents: 'none' }}
            />
          </button>
        );
      })}
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
  const [ringStep, setRingStep] = useState(0);
  const [isRingPaused, setIsRingPaused] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const ringPausedRef = useRef(false);

  const [isSlowLogin, setIsSlowLogin] = useState(false);

  const activeModelIndex = modelForStep(ringStep);
  const activeModel = MODELS[activeModelIndex];

  useEffect(() => {
    authService.warmUp();
  }, []);

  useEffect(() => {
    if (!isLoggingIn) return;
    const timer = setTimeout(() => setIsSlowLogin(true), 4000);
    return () => {
      clearTimeout(timer);
      setIsSlowLogin(false);
    };
  }, [isLoggingIn]);

  useEffect(() => {
    ringPausedRef.current = isRingPaused || isLoginModalOpen;
  }, [isRingPaused, isLoginModalOpen]);

  useEffect(() => {
    const reduceMotion = prefersReducedMotion();
    if (reduceMotion) return undefined;
    const timer = setInterval(() => {
      if (!ringPausedRef.current && !document.hidden) setRingStep((s) => s + 1);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, []);

  // Turn the ring the short way round so the chosen slot lands at the top.
  const goToSlot = (slot) => {
    setRingStep((step) => {
      const current = ((step % RING_SLOTS) + RING_SLOTS) % RING_SLOTS;
      let delta = slot - current;
      if (delta > RING_SLOTS / 2) delta -= RING_SLOTS;
      if (delta < -RING_SLOTS / 2) delta += RING_SLOTS;
      return step + delta;
    });
  };

  const goToModel = (modelIdx) => {
    setRingStep((step) => {
      let best = step;
      let bestDist = Infinity;
      for (let delta = -RING_SLOTS / 2; delta <= RING_SLOTS / 2; delta += 1) {
        if (modelForStep(step + delta) === modelIdx && Math.abs(delta) < bestDist) {
          best = step + delta;
          bestDist = Math.abs(delta);
        }
      }
      return best;
    });
  };

  const handleOpenAdminModal = (role = 'admin') => {
    setSelectedRole(role);
    setIsLoginModalOpen(true);
    if (onGoToAdmin) onGoToAdmin();
  };

  return (
    <div className="lp-page">
      {/* ── Hero: framed stage with the orbiting 3D artifacts ── */}
      <section className="lp-hero" aria-label="LAKBAY 3D artifacts">
        <div className="lp-hero-glow" />

        <header className="lp-topbar">
          <a href="#" className="lp-brand">
            <img src={lakbayLogo} alt="LAKBAY Logo" className="lp-brand-logo" />
            <span className="lp-brand-name">lakbay</span>
          </a>

          <nav className="lp-pill-nav" aria-label="Sections">
            <a href="#models">3D Artifacts</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#map">Digital Twin</a>
            <a href="#ecosystem">Ecosystem</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="lp-topbar-actions">
            <button
              type="button"
              className="lp-chip-btn lp-chip-btn--ghost"
              onClick={() => handleOpenAdminModal('tourist_guide')}
            >
              Tour Guide Portal
            </button>
            <button
              type="button"
              className="lp-chip-btn"
              onClick={() => handleOpenAdminModal('admin')}
            >
              <ShieldCheck size={15} />
              <span>Admin Portal</span>
            </button>
          </div>
        </header>

        <div className="lp-hero-kicker">
          <Sparkles size={13} />
          <span>CULTURAL HERITAGE &amp; AUGMENTED REALITY</span>
        </div>

        <OrbitRing step={ringStep} onPick={goToSlot} onHoverChange={setIsRingPaused} />

        <DunePedestal />

        <div className="lp-hero-stage">
          <div key={activeModel.id} className="lp-hero-model">
            <model-viewer
              src={activeModel.src}
              alt={activeModel.title}
              auto-rotate="true"
              rotation-per-second="18deg"
              camera-controls="true"
              disable-zoom
              interaction-prompt="none"
              shadow-intensity="1.4"
              exposure="1.05"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
            <span className="lp-hero-model-name">{activeModel.short}</span>
          </div>

          <a href="#models" className="lp-hero-tag" aria-label={`Inspect ${activeModel.title}`}>
            <span className="lp-hero-tag-num">#{String(activeModelIndex + 1).padStart(2, '0')}</span>
            <Box size={18} />
          </a>
        </div>

        <div className="lp-hero-bottom">
          <p className="lp-hero-desc">
            Step into the digital layer of Zamboanga City. LAKBAY merges Mapbox GPS,
            3D AR visualization, and interactive cultural quests into one seamless
            exploration app.
          </p>

          <h1 className="lp-hero-title">
            Your Heritage, <span className="lp-title-accent">Fully Unlocked.</span>
          </h1>

          <div className="lp-hero-side">
            <div className="lp-hero-cta-group">
              <a href="#ecosystem" className="lp-cta-solid">
                <Smartphone size={17} />
                <span>Explore Ecosystem</span>
              </a>
              <a href="#models" className="lp-cta-line">
                <span>Inspect 3D Artifacts</span>
                <ArrowRight size={16} />
              </a>
            </div>
            <div className="lp-hero-micro">
              <span><CheckCircle2 size={14} /> National Museum Coordinates</span>
              <span><CheckCircle2 size={14} /> Zero-Latency 3D WebGL</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee Ribbon ── */}
      <section className="lp-marquee" aria-label="Featured places">
        <div className="lp-marquee-track">
          {[1, 2].map((i) => (
            <div key={i} className="lp-marquee-content" aria-hidden={i === 2}>
              {MARQUEE_PLACES.map((place) => (
                <span key={place} className="lp-marquee-item">
                  {place}
                  <span className="lp-marquee-star">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Impact Metrics ── */}
      <section className="lp-panel lp-panel--dark lp-metrics">
        <div className="lp-metric">
          <div className="lp-metric-number">30+</div>
          <p className="lp-metric-label">Landmarks &amp; Cultural Spots</p>
        </div>
        <div className="lp-metric">
          <div className="lp-metric-number">1,000+</div>
          <p className="lp-metric-label">Interactive Cultural Quests</p>
        </div>
        <div className="lp-metric">
          <div className="lp-metric-number">4</div>
          <p className="lp-metric-label">Full-Scale 3D Artifacts</p>
        </div>
        <div className="lp-metric">
          <div className="lp-metric-number lp-metric-accent">360°</div>
          <p className="lp-metric-label">Spatial &amp; AR Walkthroughs</p>
        </div>
      </section>

      {/* ── Heritage Showcase ── */}
      <section className="lp-panel lp-panel--light lp-heritage">
        <div className="lp-heritage-text">
          <span className="lp-kicker">
            <Globe size={13} />
            CULTURAL TOURISM RESILIENCE
          </span>
          <h2 className="lp-heading">
            Built exclusively for{' '}
            <span className="lp-title-accent">Zamboanga City &amp; Western Mindanao.</span>
          </h2>
          <p className="lp-body">
            We are bridging the gap between physical historical heritage and digital
            innovation. LAKBAY transforms the historic architecture, cultural arts,
            and sacred landmarks of Zamboanga City into a highly interactive, accessible,
            and connected spatial experience.
          </p>
          <div className="lp-heritage-highlights">
            <div className="lp-highlight">
              <span className="lp-highlight-num">01</span>
              <div>
                <h4>Preserving Oral &amp; Visual Lore</h4>
                <p>Validated trivia reviewed by licensed cultural tour guides and educators.</p>
              </div>
            </div>
            <div className="lp-highlight">
              <span className="lp-highlight-num">02</span>
              <div>
                <h4>Gamified Explorer Rewards</h4>
                <p>Daily streaks, explorer levels, and treasury coins for local merchant perks.</p>
              </div>
            </div>
          </div>
        </div>

        <figure className="lp-heritage-photo">
          <img src="/zamboanga.jpg" alt="Zamboanga City Vinta Heritage" />
          <figcaption>⛵ Colorful Vintas of Paseo del Mar, Zamboanga City</figcaption>
        </figure>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="lp-panel lp-panel--dark lp-steps">
        <div className="lp-section-head">
          <h2 className="lp-heading">How It Works</h2>
          <p className="lp-body">
            Your physical journey, perfectly synced with your digital expedition log.
          </p>
        </div>

        <div className="lp-steps-row">
          <article className="lp-step-tile">
            <span className="lp-step-icon"><Smartphone size={26} /></span>
            <h3>1. Open the Scanner</h3>
            <p>
              Launch the LAKBAY mobile app and activate your camera to scan real-world target
              exhibits, museum markers, and QR plaques.
            </p>
          </article>
          <article className="lp-step-tile">
            <span className="lp-step-icon"><Radio size={26} /></span>
            <h3>2. Enter a Geofence</h3>
            <p>
              Walk into designated heritage zones across Zamboanga to trigger location-based
              tales, proximity puzzles, and audio notes.
            </p>
          </article>
          <article className="lp-step-tile">
            <span className="lp-step-icon lp-step-icon--accent"><Sparkles size={26} /></span>
            <h3>3. Unlock 3D Discoveries</h3>
            <p>
              Gain EXP, collect rare artifacts, answer historical quizzes, and inspect 3D
              sculptures from any angle directly in AR.
            </p>
          </article>
        </div>
      </section>

      {/* ── 3D Models Showcase ── */}
      <section id="models" className="lp-panel lp-panel--light lp-models">
        <div className="lp-section-head">
          <span className="lp-kicker">
            <Box size={13} />
            INTERACTIVE AR ARTIFACTS
          </span>
          <h2 className="lp-heading">
            True Spatial <span className="lp-title-accent">Understanding.</span>
          </h2>
          <p className="lp-body">
            Don't just read about Zamboanga heritage—experience it. LAKBAY renders high-fidelity
            3D models directly through the app. Rotate, zoom, and inspect cultural artifacts in 360°.
          </p>
        </div>

        <div className="lp-model-showcase">
          <div className="lp-model-stage">
            <div className="lp-model-pills">
              <span>{activeModel.category}</span>
              <span className="is-gold">{activeModel.badge}</span>
            </div>

            <model-viewer
              src={activeModel.src}
              alt={activeModel.title}
              auto-rotate="true"
              camera-controls="true"
              shadow-intensity="1.5"
              exposure="1.0"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />

            <div className="lp-spin-prompt">
              <RotateCw size={14} />
              <span>Fully Interactive — Click &amp; Drag to Rotate 360° • Pinch / Scroll to Zoom</span>
            </div>
          </div>

          <div className="lp-model-info">
            <span className="lp-model-id">CATALOG ARTIFACT #{activeModelIndex + 1}</span>
            <h3 className="lp-model-title">{activeModel.title}</h3>
            <p className="lp-model-subtitle">{activeModel.subtitle}</p>
            <p className="lp-body">{activeModel.desc}</p>

            <dl className="lp-model-meta">
              <div>
                <dt>Artifact Class:</dt>
                <dd>{activeModel.category}</dd>
              </div>
              <div>
                <dt>Curator Notes:</dt>
                <dd>{activeModel.details}</dd>
              </div>
              <div>
                <dt>Interactive Mode:</dt>
                <dd className="is-live">WebGL 3D &amp; Native Mobile AR</dd>
              </div>
            </dl>

            <div className="lp-model-select-label">Select 3D Artifact:</div>
            <div className="lp-model-select">
              {MODELS.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={activeModelIndex === idx ? 'is-active' : ''}
                  onClick={() => goToModel(idx)}
                >
                  <span className="lp-select-num">{idx + 1}</span>
                  <span className="lp-select-text">
                    <span className="lp-select-name">{item.title}</span>
                    <span className="lp-select-cat">{item.category}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-model-cards">
          {MODELS.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              className={`lp-model-card ${activeModelIndex === idx ? 'is-active' : ''}`}
              onClick={() => goToModel(idx)}
            >
              <span className="lp-model-card-view">
                <model-viewer
                  src={m.src}
                  alt={m.title}
                  auto-rotate="true"
                  interaction-prompt="none"
                  style={{ width: '100%', height: '100%', backgroundColor: 'transparent', pointerEvents: 'none' }}
                />
              </span>
              <span className="lp-model-card-body">
                <span className="lp-model-card-cat">{m.category}</span>
                <span className="lp-model-card-title">{m.title}</span>
                <span className="lp-model-card-desc">{m.subtitle}</span>
                <span className="lp-model-card-link">
                  Inspect 3D Artifact <ArrowRight size={13} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Digital Twin Map ── */}
      <section id="map" className="lp-panel lp-panel--dark lp-map-panel">
        <div className="lp-section-head">
          <span className="lp-kicker">
            <MapPin size={13} />
            HIGH-PRECISION GEOFENCING
          </span>
          <h2 className="lp-heading">The Digital Twin.</h2>
          <p className="lp-body">
            Navigate a living 3D replica of Zamboanga City. Experience real-time GPS
            pathfinding, cultural spot highlights, and active geofence boundaries powered by Mapbox.
          </p>
        </div>

        <MapSection />
      </section>

      {/* ── Two Interfaces. One Ecosystem. ── */}
      <section id="ecosystem" className="lp-panel lp-panel--light lp-ecosystem">
        <div className="lp-section-head">
          <h2 className="lp-heading">
            Two Interfaces. <span className="lp-title-accent">One Connected Ecosystem.</span>
          </h2>
          <p className="lp-body">
            Unified infrastructure designed for on-the-ground exploration and cloud administrative command.
          </p>
        </div>

        <div className="lp-eco-grid">
          <div className="lp-eco-card lp-eco-card--mobile">
            <div className="lp-eco-copy">
              <span className="lp-eco-tag">
                <Smartphone size={16} />
                FOR TOURISTS, STUDENTS &amp; EXPLORERS
              </span>
              <h3 className="lp-eco-title">The Mobile Application</h3>
              <p className="lp-eco-desc">
                Turn your smartphone into a magic lens. Built with React Native &amp; Expo for
                immersive cultural discovery, live navigation, and interactive trivia.
              </p>

              <ul className="lp-eco-features">
                <li>
                  <span className="lp-feat-icon"><Compass size={18} /></span>
                  <div>
                    <h4>Live Mapbox Geolocation</h4>
                    <p>Turn-by-turn routing to historical sites and museum wings across Zamboanga.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-feat-icon"><Sparkles size={18} /></span>
                  <div>
                    <h4>Steady AR Exhibit Scanners</h4>
                    <p>Touch-enabled 360° swipe rotation, multi-touch pinch zoom, and artifact inspect HUD.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-feat-icon"><Award size={18} /></span>
                  <div>
                    <h4>Gamified Expedition Log</h4>
                    <p>Collect rare mythical badges, maintain daily streaks, and climb community rankings.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="lp-phone">
              <div className="lp-phone-notch" />
              <img src="/mobilepicture.jpg" alt="LAKBAY Mobile Interactive Map" />
            </div>
          </div>

          <div className="lp-eco-card lp-eco-card--web">
            <div className="lp-eco-copy">
              <span className="lp-eco-tag">
                <ShieldCheck size={16} />
                FOR ADMINISTRATORS &amp; TOUR GUIDES
              </span>
              <h3 className="lp-eco-title">The Staff Web Portal</h3>
              <p className="lp-eco-desc">
                A unified desktop command center for monitoring historical data, verifying
                educational trivia, and managing merchant promotions from anywhere.
              </p>

              <ul className="lp-eco-features">
                <li>
                  <span className="lp-feat-icon"><Layers size={18} /></span>
                  <div>
                    <h4>Cultural Spot &amp; 3D Target Management</h4>
                    <p>Upload lightweight .glb models, set coordinates, and curate historical descriptions.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-feat-icon"><CheckCircle2 size={18} /></span>
                  <div>
                    <h4>Tour Guide Trivia Moderation</h4>
                    <p>Certified local guides review and calibrate AI trivia questions for authentic accuracy.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-feat-icon"><Globe size={18} /></span>
                  <div>
                    <h4>Live Real-Time Analytics</h4>
                    <p>Monitor visitor traffic, scan density heatmaps, and merchant coin promotions.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bento Features ── */}
      <section className="lp-bento">
        <div className="lp-panel lp-panel--dark lp-bento-main">
          <MapPin className="lp-bento-watermark" size={240} strokeWidth={1} aria-hidden="true" />
          <span className="lp-kicker">PROXIMITY ENGINE</span>
          <h3 className="lp-heading">
            Walk inside. <br />
            Unlock the landmark.
          </h3>
          <p className="lp-body">
            No manual check-ins needed. LAKBAY utilizes calibrated GPS geofences. Cross
            the perimeter of Fort Pilar or City Hall, and your device automatically unlocks
            exclusive historical trivia and 3D artifacts.
          </p>
        </div>

        <div className="lp-panel lp-panel--gold lp-bento-aside">
          <Award size={34} />
          <span className="lp-kicker">EXPLORER GUILD</span>
          <h3 className="lp-bento-title">Climb the Leaderboard</h3>
          <p className="lp-body">
            Complete cultural quests, maintain daily login streaks, and earn EXP to advance
            from Novice Scout to Grand Curator.
          </p>

          <div className="lp-rank-card">
            <div className="lp-rank-row">
              <span>CURRENT RANK:</span>
              <strong>VINTA NAVIGATOR (Lv. 4)</strong>
            </div>
            <div className="lp-progress">
              <div className="lp-progress-fill" style={{ width: '80%' }} />
            </div>
            <div className="lp-rank-row lp-rank-foot">
              <span>1,450 / 1,800 EXP</span>
              <strong>+350 EXP Next Tier</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── Frequently Asked Questions ── */}
      <section id="faq" className="lp-panel lp-panel--light lp-faq">
        <div className="lp-section-head lp-faq-head">
          <h2 className="lp-heading">Frequently Asked Questions</h2>
          <p className="lp-body">
            Everything you need to know about experiencing and managing LAKBAY.
          </p>
        </div>

        <div className="lp-faq-list">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} className={`lp-faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="lp-faq-question"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={20} className="lp-faq-chevron" />
                </button>
                {isOpen && <div className="lp-faq-answer">{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="lp-panel lp-panel--dark lp-cta">
        <DunePedestal id="cta" />
        <div className="lp-cta-inner">
          <h2 className="lp-cta-title">Ready to explore the digital heritage of Zamboanga?</h2>
          <p className="lp-body">
            The ultimate cultural mapping, spatial 3D visualization, and quest system is live.
          </p>
          <div className="lp-cta-buttons">
            <button
              type="button"
              className="lp-cta-solid lp-cta-solid--light"
              onClick={() => handleOpenAdminModal('admin')}
            >
              <ShieldCheck size={18} />
              <span>Launch Admin Portal</span>
            </button>
            <button
              type="button"
              className="lp-cta-line lp-cta-line--light"
              onClick={() => handleOpenAdminModal('tourist_guide')}
            >
              <span>Tour Guide Login →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
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
                  ? isSlowLogin
                    ? 'Waking up server, this can take up to a minute...'
                    : 'Authenticating...'
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
