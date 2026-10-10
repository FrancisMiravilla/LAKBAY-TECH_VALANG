import { useState, useEffect, useRef } from 'react';
import './LandingPage.css';
import lakbayLogo from './assets/lakbay_icon_glyph.png';
import zcBg from './assets/zc2.webp';

// ── Floating orb component ─────────────────────────────────────────────────
function Orb({ style }) {
  return <div className="lp-orb" style={style} aria-hidden="true" />;
}

// ── Animated counter ───────────────────────────────────────────────────────
function Counter({ to, suffix = '', duration = 1800 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = to / (duration / 16);
          const timer = setInterval(() => {
            start = Math.min(start + step, to);
            setValue(Math.floor(start));
            if (start >= to) clearInterval(timer);
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{value.toLocaleString()}{suffix}</span>;
}

// ── Feature card ───────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color, delay }) {
  return (
    <article
      className="lp-feature-card"
      style={{ '--card-accent': color, animationDelay: delay }}
    >
      <div className="lp-feature-icon" style={{ background: `${color}18`, border: `1.5px solid ${color}40` }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
      </div>
      <h3 className="lp-feature-title">{title}</h3>
      <p className="lp-feature-desc">{desc}</p>
    </article>
  );
}

// ── Step item ──────────────────────────────────────────────────────────────
function Step({ num, title, desc, isLast }) {
  return (
    <div className="lp-step">
      <div className="lp-step-left">
        <div className="lp-step-num">{num}</div>
        {!isLast && <div className="lp-step-line" />}
      </div>
      <div className="lp-step-body">
        <h4 className="lp-step-title">{title}</h4>
        <p className="lp-step-desc">{desc}</p>
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
  const [scrolled, setScrolled] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(initialLoginOpen);
  const [selectedRole, setSelectedRole] = useState('admin'); // 'admin' | 'tourist_guide'

  const handleOpenAdminModal = (role = 'admin') => {
    setSelectedRole(role);
    setIsLoginModalOpen(true);
    if (onGoToAdmin) onGoToAdmin();
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp-root">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <header className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a href="#" className="lp-nav-brand">
            <img src={lakbayLogo} alt="LAKBAY" className="lp-nav-logo" />
            <span className="lp-nav-wordmark">LAKBAY</span>
          </a>

          <nav className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#stats">Stats</a>
          </nav>

          <button className="lp-btn lp-btn-ghost" onClick={() => handleOpenAdminModal('admin')}>
            Portal Access →
          </button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        {/* Background image */}
        <div className="lp-hero-bg" style={{ backgroundImage: `url(${zcBg})` }} />
        <div className="lp-hero-overlay" />

        {/* Decorative orbs */}
        <Orb style={{ width: 420, height: 420, top: '-80px', right: '-60px', background: 'radial-gradient(circle, rgba(26,86,219,0.35) 0%, transparent 70%)' }} />
        <Orb style={{ width: 300, height: 300, bottom: '60px', left: '-40px', background: 'radial-gradient(circle, rgba(251,191,36,0.25) 0%, transparent 70%)' }} />

        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot" />
            Zamboanga Cultural Tourism
          </div>

          <h1 className="lp-hero-headline">
            Explore Zamboanga<br />
            <span className="lp-hero-gradient">Like Never Before</span>
          </h1>

          <p className="lp-hero-sub">
            LAKBAY is an immersive gamified tourism app that guides you through
            Zamboanga City's cultural heritage using QR scanning, Augmented
            Reality, and collectible creature encounters.
          </p>

          <div className="lp-hero-actions">
            <a href="#download" className="lp-btn lp-btn-primary">
              <span>📲</span> Download the App
            </a>
            <a href="#features" className="lp-btn lp-btn-outline">
              Explore Features
            </a>
          </div>

          <div className="lp-hero-tags">
            <span className="lp-hero-tag">🏖️ Pink Sand Beaches</span>
            <span className="lp-hero-tag">🕌 Historic Forts</span>
            <span className="lp-hero-tag">🎨 Yakan Culture</span>
            <span className="lp-hero-tag">⛵ Vinta Boats</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-label">What's Inside</div>
          <h2 className="lp-section-title">Three Ways to Explore</h2>
          <p className="lp-section-sub">
            Each feature is designed to deepen your connection with the rich
            culture and history of Zamboanga City.
          </p>

          <div className="lp-features-grid">
            <FeatureCard
              icon="🔍"
              title="QR Discovery"
              color="#1A56DB"
              delay="0ms"
              desc="Scan QR codes placed at Zamboanga's cultural landmarks to unlock rich historical content, trivia, and XP rewards. The more you explore, the higher your explorer level."
            />
            <FeatureCard
              icon="📷"
              title="AR Experience"
              color="#10B981"
              delay="80ms"
              desc="Point your camera at AR targets inside the National Museum to bring cultural artifacts, historical figures, and Zamboanga's stories to life in 3D Augmented Reality."
            />
            <FeatureCard
              icon="🏆"
              title="Catch Zones"
              color="#FBBF24"
              delay="160ms"
              desc="Venture into designated Catch Zones and encounter mythical cultural creatures unique to Zamboanga — from the legendary Curacha crab spirit to the Yakan Weave Spirit."
            />
            <FeatureCard
              icon="🗺️"
              title="Interactive Map"
              color="#8B5CF6"
              delay="240ms"
              desc="Navigate Zamboanga City with a live interactive map showing every quest spot, AR target, and Catch Zone — with real-time GPS routing and proximity alerts."
            />
            <FeatureCard
              icon="⚡"
              title="XP & Levels"
              color="#F59E0B"
              delay="320ms"
              desc="Earn experience points with every scan, catch, and completed AR challenge. Level up your Explorer Rank to unlock exclusive high-tier cultural spots across the city."
            />
            <FeatureCard
              icon="🎖️"
              title="Badges & Milestones"
              color="#EC4899"
              delay="400ms"
              desc="Collect milestone badges as you progress — from City Explorer to Fort Guardian. Each badge reflects a unique achievement in your cultural tourism journey."
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="how" className="lp-section lp-section--alt">
        <div className="lp-section-inner lp-how-inner">
          <div className="lp-how-steps">
            <div className="lp-section-label">Getting Started</div>
            <h2 className="lp-section-title">How It Works</h2>
            <p className="lp-section-sub" style={{ marginBottom: 40 }}>
              Up and running in minutes — no technical expertise required.
            </p>

            <Step
              num="01"
              title="Download the App"
              desc="Install LAKBAY on your Android device. Sign up with your email and set up your Explorer profile."
            />
            <Step
              num="02"
              title="Visit a Quest Spot"
              desc="Head to any of Zamboanga City's cultural landmarks marked on the in-app map. Look for the LAKBAY QR code placard."
            />
            <Step
              num="03"
              title="Scan, Catch &amp; Explore"
              desc="Scan QR codes to unlock stories, enter Catch Zones to collect creatures, or activate AR to see history come alive."
            />
            <Step
              num="04"
              title="Earn XP &amp; Level Up"
              desc="Every action earns XP. Level up to unlock exclusive higher-tier spots, rare creatures, and special milestone badges."
              isLast
            />
          </div>

          <div className="lp-how-visual">
            <div className="lp-info-card">
              <div className="lp-info-card-header">
                <img src={lakbayLogo} alt="" className="lp-info-logo" />
                <div>
                  <div className="lp-info-card-title">LAKBAY</div>
                  <div className="lp-info-card-sub">Cultural Tourism App</div>
                </div>
              </div>
              <div className="lp-info-divider" />
              <ul className="lp-info-list">
                <li><span className="lp-info-dot lp-info-dot--blue" />10+ Cultural Landmark Spots</li>
                <li><span className="lp-info-dot lp-info-dot--green" />Augmented Reality Museum</li>
                <li><span className="lp-info-dot lp-info-dot--gold" />Collectible Creature Zones</li>
                <li><span className="lp-info-dot lp-info-dot--purple" />Live GPS Navigation</li>
                <li><span className="lp-info-dot lp-info-dot--pink" />XP &amp; Milestone System</li>
                <li><span className="lp-info-dot lp-info-dot--blue" />Daily Streak Rewards</li>
              </ul>
              <div className="lp-info-divider" />
              <div className="lp-info-platform">
                <span className="lp-platform-tag">Android 10+</span>
                <span className="lp-platform-tag">Free to Download</span>
                <span className="lp-platform-tag">Zamboanga City</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────── */}
      <section id="stats" className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-label">By The Numbers</div>
          <h2 className="lp-section-title">LAKBAY at a Glance</h2>

          <div className="lp-stats-grid">
            <div className="lp-stat-card">
              <div className="lp-stat-value"><Counter to={10} suffix="+" /></div>
              <div className="lp-stat-label">Cultural Spots</div>
              <div className="lp-stat-sub">Active QR quest locations</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-value"><Counter to={3} /></div>
              <div className="lp-stat-label">Core Features</div>
              <div className="lp-stat-sub">QR, AR, and Catch Zones</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-value"><Counter to={4} suffix="+" /></div>
              <div className="lp-stat-label">Catch Zones</div>
              <div className="lp-stat-sub">Creature encounter locations</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-value"><Counter to={100} suffix="%" /></div>
              <div className="lp-stat-label">Free to Download</div>
              <div className="lp-stat-sub">No hidden costs or paywalls</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD CTA ────────────────────────────────────────────── */}
      <section id="download" className="lp-section lp-cta-section">
        <Orb style={{ width: 500, height: 500, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(26,86,219,0.2) 0%, transparent 70%)' }} />
        <div className="lp-section-inner lp-cta-inner">
          <img src={lakbayLogo} alt="LAKBAY" className="lp-cta-logo" />
          <h2 className="lp-section-title">Ready to Start Your Journey?</h2>
          <p className="lp-section-sub" style={{ maxWidth: 520 }}>
            Download LAKBAY and begin your cultural adventure through the
            heritage sites, landmarks, and hidden gems of Zamboanga City.
          </p>

          <div className="lp-cta-actions">
            <button className="lp-btn lp-btn-primary lp-btn-lg" disabled title="Coming soon — app not yet hosted">
              <span>📲</span> Download for Android
              <span className="lp-btn-badge">Coming Soon</span>
            </button>
          </div>

          <p className="lp-cta-note">
            Hosting in progress. The download will be available once the app is published.
          </p>

          <div className="lp-cta-divider" />
          <p className="lp-cta-admin">
            Authorized staff member?{' '}
            <button className="lp-text-link" onClick={() => handleOpenAdminModal('admin')}>
              Administrator Login
            </button>
            {' · '}
            <button className="lp-text-link" onClick={() => handleOpenAdminModal('tourist_guide')}>
              Tour Guide Portal →
            </button>
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src={lakbayLogo} alt="LAKBAY" className="lp-footer-logo" />
            <div>
              <div className="lp-footer-wordmark">LAKBAY</div>
              <div className="lp-footer-tagline">Zamboanga Cultural Tourism Platform</div>
            </div>
          </div>
          <div className="lp-footer-note">
            © {new Date().getFullYear()} LAKBAY — BSIT Capstone Project. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ── STAFF LOGIN POP-UP MODAL (ADMIN & TOUR GUIDE) ─────────────────── */}
      {isLoginModalOpen && (
        <div
          className="lp-modal-backdrop"
          onClick={() => setIsLoginModalOpen(false)}
        >
          <div
            className={`lp-login-modal ${selectedRole === 'tourist_guide' ? 'lp-login-modal--guide' : ''}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={`lp-login-glow-bar ${selectedRole === 'tourist_guide' ? 'lp-login-glow-bar--guide' : ''}`} />

            <button
              className="lp-login-close-btn"
              onClick={() => setIsLoginModalOpen(false)}
              aria-label="Close Staff Portal login modal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="lp-login-header">
              <div className="lp-login-logo-wrap">
                <img src={lakbayLogo} alt="LAKBAY" className="lp-login-logo" />
              </div>
              <h2 className="lp-login-title">
                LAKBAY <span className={`lp-login-title-accent ${selectedRole === 'tourist_guide' ? 'lp-login-title-accent--guide' : ''}`}>
                  {selectedRole === 'tourist_guide' ? 'GUIDE' : 'ADMIN'}
                </span>
              </h2>
              <p className="lp-login-subtitle">
                {selectedRole === 'tourist_guide'
                  ? 'Cultural Validation & Tour Guide Portal'
                  : 'Zamboanga Cultural System Administration'}
              </p>
            </div>

            {/* ── ROLE CATEGORY SELECTOR ── */}
            <div className="lp-role-selector">
              <button
                type="button"
                className={`lp-role-tab ${selectedRole === 'admin' ? 'lp-role-tab--active' : ''}`}
                onClick={() => setSelectedRole('admin')}
              >
                <div className="lp-role-tab-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
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
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                </div>
                <div className="lp-role-tab-info">
                  <span className="lp-role-tab-title">Tour Guide</span>
                  <span className="lp-role-tab-sub">Quiz & Verification</span>
                </div>
              </button>
            </div>

            {/* ── ROLE SCOPE BADGE & DESCRIPTION ── */}
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
                  Educational & cultural validation hub: review, edit, approve, or reject AI-generated quizzes and verify local lore.
                </p>
              </div>
            )}

            {loginError && (
              <div className="lp-login-error">
                {loginError}
              </div>
            )}

            <form onSubmit={onLogin} className="lp-login-form">
              <div className="lp-form-group">
                <label className="lp-form-label">
                  {selectedRole === 'admin' ? 'Administrator Email' : 'Tour Guide Email'}
                </label>
                <div className="lp-input-wrap">
                  <svg className="lp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    type="email"
                    className="lp-form-input"
                    placeholder={selectedRole === 'admin' ? 'admin@lakbay.ph' : 'guide@lakbay.ph'}
                    value={loginCredentials?.email || ''}
                    onChange={(e) => setLoginCredentials && setLoginCredentials({ ...loginCredentials, email: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="lp-form-group">
                <label className="lp-form-label">Password</label>
                <div className="lp-input-wrap">
                  <svg className="lp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="password"
                    className="lp-form-input"
                    placeholder="Enter your password"
                    value={loginCredentials?.password || ''}
                    onChange={(e) => setLoginCredentials && setLoginCredentials({ ...loginCredentials, password: e.target.value })}
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
