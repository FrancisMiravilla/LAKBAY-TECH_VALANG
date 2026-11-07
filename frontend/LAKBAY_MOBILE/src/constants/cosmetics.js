import React from 'react';
import { Svg, Path, Circle, Rect, Ellipse, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, VINTA_COLORS } from './theme';

// How each avatar decoration looks. Which ids exist and when they unlock comes
// from the backend (accounts/cosmetics.py, GET /api/auth/cosmetics/); this file
// only draws them. Ids not listed here simply render nothing.

// ─── Hats (drawn in a 100 × 64 box, brim at the bottom) ──────────────────────
function Cap() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 64">
      <Path d="M18 52 Q20 14 52 12 Q80 14 82 46 Z" fill={COLORS.navy} />
      <Path d="M30 22 Q50 10 70 22" stroke={COLORS.gold} strokeWidth="4" fill="none" strokeLinecap="round" />
      <Path d="M14 50 Q56 40 98 54 Q60 62 14 56 Z" fill={COLORS.accentDark} />
      <Circle cx="51" cy="13" r="4" fill={COLORS.gold} />
    </Svg>
  );
}

function Salakot() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 64">
      <Path d="M2 50 Q50 2 98 50 Q50 60 2 50 Z" fill="#C8A165" stroke="#8A6A3A" strokeWidth="2" />
      <G stroke="#8A6A3A" strokeWidth="1.5" opacity="0.7">
        <Path d="M50 8 L22 50" />
        <Path d="M50 8 L36 54" />
        <Path d="M50 8 L50 56" />
        <Path d="M50 8 L64 54" />
        <Path d="M50 8 L78 50" />
        <Path d="M14 42 Q50 30 86 42" fill="none" />
        <Path d="M26 30 Q50 20 74 30" fill="none" />
      </G>
      <Circle cx="50" cy="8" r="5" fill="#8A6A3A" />
    </Svg>
  );
}

function Safari() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 64">
      <Ellipse cx="50" cy="52" rx="46" ry="9" fill="#B9A06B" />
      <Path d="M20 52 Q22 12 50 10 Q78 12 80 52 Z" fill="#E2CF9C" />
      <Rect x="20" y="40" width="60" height="7" fill={COLORS.teal} />
      <Path d="M36 18 Q50 12 64 18" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round" />
    </Svg>
  );
}

function Captain() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 64">
      <Path d="M14 30 Q50 6 86 30 L80 44 L20 44 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
      <Rect x="20" y="40" width="60" height="9" fill={COLORS.navy} />
      <Path d="M18 48 Q50 64 82 48 L78 54 Q50 66 22 54 Z" fill="#111827" />
      <Path d="M24 45 L76 45" stroke={COLORS.gold} strokeWidth="2" />
      <Circle cx="50" cy="31" r="7" fill={COLORS.gold} />
      <Path d="M50 26 V36 M46 33 Q50 38 54 33" stroke={COLORS.navy} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function Crown() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 64">
      <Defs>
        <LinearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#D97706" />
        </LinearGradient>
      </Defs>
      <Path d="M14 54 L10 16 L32 34 L50 8 L68 34 L90 16 L86 54 Z" fill="url(#crownGold)" stroke="#92400E" strokeWidth="2" strokeLinejoin="round" />
      <Rect x="14" y="48" width="72" height="8" rx="2" fill="#B45309" />
      <Circle cx="50" cy="38" r="5" fill="#DC2626" />
      <Circle cx="30" cy="44" r="3.5" fill={COLORS.accent} />
      <Circle cx="70" cy="44" r="3.5" fill={COLORS.teal} />
      <Circle cx="10" cy="16" r="3" fill="#FDE68A" />
      <Circle cx="50" cy="8" r="3.5" fill="#FDE68A" />
      <Circle cx="90" cy="16" r="3" fill="#FDE68A" />
    </Svg>
  );
}

export const HATS = { cap: Cap, salakot: Salakot, safari: Safari, captain: Captain, crown: Crown };

// ─── Frames (ring around the portrait) ───────────────────────────────────────
// `segments` paints the ring in alternating colors; `dots` adds a bead/flower row.
export const FRAMES = {
  '':      { segments: ['#FFFFFF'] },
  vinta:   { segments: VINTA_COLORS.slice(0, 5) },
  teal:    { segments: [COLORS.teal, '#38BDF8'], dots: '#FFFFFF' },
  gold:    { segments: ['#FBBF24', '#D97706'], outline: '#92400E' },
  garland: { segments: ['#16A34A'], dots: '#FFFFFF', dotCenter: '#FBBF24' },
  royal:   { segments: ['#7C3AED', '#FBBF24'], outline: '#4C1D95', dots: '#FDE68A' },
};

// ─── Pins (badge at the bottom-right; LucideIcon keys) ───────────────────────
export const PINS = {
  compass:  { icon: 'compass',  bg: COLORS.accent },
  anchor:   { icon: 'anchor',   bg: COLORS.navy },
  sailboat: { icon: 'sailboat', bg: '#0891B2' },
  landmark: { icon: 'landmark', bg: '#B45309' },
  gem:      { icon: 'gem',      bg: '#7C3AED' },
};

// ─── Profile backdrops (behind the profile header / leaderboard card) ────────
export const BACKDROPS = {
  '':        { image: require('../../reference/VINTA.jpeg') },
  zamboanga: { image: require('../assets/zamboanga.jpg') },
  museum:    { image: require('../assets/buildings.jpg') },
  sunset:    { gradient: ['#F97316', '#DB2777', '#4C1D95'] },
  night:     { gradient: ['#0C2461', '#1E3A8A', '#0E7490'] },
};
