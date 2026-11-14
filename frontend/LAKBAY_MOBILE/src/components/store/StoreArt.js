import React from 'react';
import { Svg, Defs, LinearGradient, RadialGradient, Stop, Circle, Ellipse, Path, G } from 'react-native-svg';

// Cartoon art for the Store: the LAKBAY coin, coin piles that grow with the
// pack size, and the light rays and sparkles behind them.

const sparklePath = (cx, cy, r) =>
  `M${cx} ${cy - r} Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy} Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r} ` +
  `Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy} Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`;

export function CoinIcon({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="coinFace" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE27A" />
          <Stop offset="1" stopColor="#F5A623" />
        </LinearGradient>
      </Defs>
      <Circle cx="20" cy="21.5" r="17" fill="#C9761A" />
      <Circle cx="20" cy="19.5" r="17" fill="url(#coinFace)" stroke="#B4650F" strokeWidth="1.6" />
      <Circle cx="20" cy="19.5" r="12" fill="none" stroke="#E08A16" strokeWidth="2" />
      <Path d={sparklePath(20, 19.5, 7.5)} fill="#FFFFFF" opacity={0.95} />
      <Path d="M9 12 Q13 6 20 5.5" stroke="#FFF6CF" strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// One coin seen from the side (top face plus rim), drawn at (x, y) = top centre.
const COIN_RX = 15;
const COIN_RY = 5.5;
const COIN_T = 4;

function StackCoin({ x, y }) {
  return (
    <G>
      <Path
        d={`M${x - COIN_RX} ${y} L${x - COIN_RX} ${y + COIN_T} A${COIN_RX} ${COIN_RY} 0 0 0 ${x + COIN_RX} ${y + COIN_T} L${x + COIN_RX} ${y} Z`}
        fill="#D9881C"
        stroke="#A85F10"
        strokeWidth="1"
      />
      <Ellipse cx={x} cy={y} rx={COIN_RX} ry={COIN_RY} fill="url(#stackFace)" stroke="#B4650F" strokeWidth="1" />
      <Ellipse cx={x} cy={y} rx={COIN_RX * 0.62} ry={COIN_RY * 0.55} fill="none" stroke="#E08A16" strokeWidth="1" />
    </G>
  );
}

function Stack({ x, base, count }) {
  return (
    <G>
      {Array.from({ length: count }, (_, i) => (
        <StackCoin key={i} x={x + (i % 2 ? 0.8 : -0.8)} y={base - i * COIN_T} />
      ))}
    </G>
  );
}

// tier 1..4: bigger packs get more and taller stacks.
const PILES = {
  1: [{ x: 50, h: 4 }],
  2: [{ x: 38, h: 4 }, { x: 62, h: 6 }],
  3: [{ x: 30, h: 4 }, { x: 70, h: 5 }, { x: 50, h: 8 }],
  4: [{ x: 24, h: 5 }, { x: 76, h: 6 }, { x: 40, h: 9 }, { x: 60, h: 11 }],
};

export function CoinPile({ size = 120, tier = 1 }) {
  const stacks = PILES[Math.max(1, Math.min(4, tier))];
  const base = 78;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="stackFace" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE27A" />
          <Stop offset="1" stopColor="#F7B733" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="50" cy={base + 9} rx="40" ry="7" fill="#000" opacity={0.15} />
      {stacks.map((s, i) => <Stack key={i} x={s.x} base={base} count={s.h} />)}
      {tier >= 2 && (
        <G>
          <Ellipse cx="16" cy={base + 6} rx="9" ry="3.4" fill="url(#stackFace)" stroke="#B4650F" strokeWidth="1" transform={`rotate(-12 16 ${base + 6})`} />
          <Ellipse cx="85" cy={base + 5} rx="9" ry="3.4" fill="url(#stackFace)" stroke="#B4650F" strokeWidth="1" transform={`rotate(10 85 ${base + 5})`} />
        </G>
      )}
    </Svg>
  );
}

// Soft glow with light rays behind a pack's illustration.
export function RaysGlow({ size = 160 }) {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = a0 + Math.PI / 22;
    const R = 50;
    return `M50 50 L${50 + R * Math.cos(a0)} ${50 + R * Math.sin(a0)} L${50 + R * Math.cos(a1)} ${50 + R * Math.sin(a1)} Z`;
  }).join(' ');
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="rayFade" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Path d={rays} fill="url(#rayFade)" />
      <Circle cx="50" cy="50" r="40" fill="url(#glow)" />
    </Svg>
  );
}

export function Sparkles({ width, height }) {
  const pts = [
    [0.14, 0.18, 5], [0.86, 0.12, 4], [0.9, 0.62, 5.5], [0.1, 0.7, 3.5], [0.74, 0.86, 3],
  ];
  return (
    <Svg width={width} height={height} pointerEvents="none">
      {pts.map(([x, y, r], i) => (
        <Path key={i} d={sparklePath(x * width, y * height, r)} fill="#FFFFFF" opacity={0.95} />
      ))}
    </Svg>
  );
}
