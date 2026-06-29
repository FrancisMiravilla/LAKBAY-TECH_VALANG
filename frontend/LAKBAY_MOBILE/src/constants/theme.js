// Palette mirrors the web admin (LAKBAY_WEB) light theme:
//   --body-bg   #EEF3FF  →  bg / background
//   --card-bg   #FFFFFF  →  bgCard / surface
//   --card-border #C3D8FF →  border / accentBorder
//   --sidebar-bg #0C2461 →  navy (headers / tab bar)
//   --accent-blue #1A56DB → accent / primary

export const COLORS = {
  // ── Backgrounds ────────────────────────────────────────────────
  bg:           '#EEF3FF',           // web --body-bg
  bgSurface:    '#E0EAFF',
  bgCard:       '#FFFFFF',           // web --card-bg
  bgCardAlt:    '#F5F8FF',

  // ── Navy (headers, tab bar, status bar) ────────────────────────
  navy:         '#0C2461',           // web --sidebar-bg
  navyMid:      '#1A3A7A',

  // ── Philippine Flag Blue — primary accent ──────────────────────
  accent:       '#1A56DB',           // web --accent-blue
  accentDark:   '#1344B3',
  accentSoft:   'rgba(26,86,219,0.10)',
  accentGlow:   'rgba(26,86,219,0.22)',
  accentBorder: '#C3D8FF',           // web --card-border

  // ── Gold — achievements / rewards ──────────────────────────────
  gold:         '#FBBF24',
  goldSoft:     'rgba(251,191,36,0.15)',
  goldGlow:     'rgba(251,191,36,0.30)',

  // ── Semantic ───────────────────────────────────────────────────
  teal:         '#10B981',
  tealSoft:     'rgba(16,185,129,0.12)',
  danger:       '#EF4444',
  success:      '#10B981',

  // ── Borders ───────────────────────────────────────────────────
  border:       '#C3D8FF',           // web --card-border
  borderLight:  '#E0EAFF',

  // ── Text (dark on light bg) ────────────────────────────────────
  text:         '#1E293B',           // web --text-title
  textSub:      '#334155',           // web --text-primary
  textMuted:    '#64748B',           // web --text-secondary
  textFaint:    '#94A3B8',           // web --text-muted

  // ── Legacy aliases (keep old references working) ───────────────
  primary:      '#1A56DB',
  secondary:    '#FBBF24',
  background:   '#EEF3FF',
  surface:      '#FFFFFF',
  textPrimary:  '#1E293B',
  textSecondary:'#64748B',
  error:        '#EF4444',
};

export const RADIUS = {
  xs:   8,
  sm:   12,
  md:   18,
  lg:   24,
  xl:   32,
  pill: 100,
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const SIZES = {
  fontXs:         11,
  fontSm:         12,
  fontRegular:    14,
  fontMd:         16,
  fontLg:         20,
  fontXl:         26,
  fontXxl:        32,
  // legacy
  fontSmall:      12,
  fontMedium:     18,
  fontLarge:      24,
  fontExtraLarge: 32,
  base:           8,
};

export const SHADOW = {
  accent: {
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  gold: {
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  card: {
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const FONTS = {
  pixel:   'PressStart2P_400Regular',
  light:   'Rajdhani_300Light',
  regular: 'Rajdhani_400Regular',
  medium:  'Rajdhani_500Medium',
  semiBold:'Rajdhani_600SemiBold',
  bold:    'Rajdhani_700Bold',
  black:   'Rajdhani_700Bold',
};
