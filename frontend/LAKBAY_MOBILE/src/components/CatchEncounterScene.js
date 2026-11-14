import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Svg, Defs, LinearGradient, RadialGradient, Stop, Rect, Path, Ellipse, Circle, G } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// Painted coastal meadow shown behind the model once the treasure is opened.
// The horizon sits above the model's feet so it stands on the grass.
const HZ = H * 0.33;
const SEA_TOP = HZ - H * 0.028;

// Deterministic scatter (same layout every render, no Math.random).
const rand = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const scatter = (count, seed, minY) => Array.from({ length: count }, (_, i) => {
  const t = rand(seed + i * 2.3);
  const y = minY + (H - minY) * Math.pow(t, 0.8);
  const depth = (y - HZ) / (H - HZ);
  return { x: rand(seed + i * 5.7) * W, y, s: 0.5 + depth * 1.6 };
});

const tuftPath = ({ x, y, s }) =>
  `M${x} ${y}q${-2 * s} ${-7 * s} ${-6 * s} ${-11 * s}` +
  `M${x} ${y}q${0.4 * s} ${-8 * s} ${1 * s} ${-14 * s}` +
  `M${x} ${y}q${2.5 * s} ${-6 * s} ${6 * s} ${-10 * s}`;

const DARK_TUFTS = scatter(46, 3, HZ + 10).map(tuftPath).join('');
const LIGHT_TUFTS = scatter(34, 41, HZ + 18).map(tuftPath).join('');
const FLOWERS = scatter(26, 77, HZ + 24);

const hillPath = (baseY, peaks) => {
  let d = `M0 ${baseY}`;
  peaks.forEach(([x, y]) => { d += ` L${x * W} ${y}`; });
  return `${d} L${W} ${baseY} Z`;
};

const FAR_RANGE = hillPath(SEA_TOP, [
  [0, H * 0.21], [0.12, H * 0.175], [0.22, H * 0.2], [0.34, H * 0.16], [0.46, H * 0.225], [0.55, SEA_TOP],
]);
const NEAR_HILL = `M0 ${HZ} L0 ${H * 0.27} Q${W * 0.18} ${H * 0.245} ${W * 0.38} ${H * 0.3} Q${W * 0.46} ${H * 0.32} ${W * 0.52} ${HZ} Z`;
const RIGHT_HILL = `M${W * 0.62} ${HZ} Q${W * 0.82} ${H * 0.285} ${W} ${H * 0.29} L${W} ${HZ} Z`;

const treeClump = (cx, baseY, r) => [
  [cx - r * 1.1, baseY - r * 0.7, r * 0.85],
  [cx, baseY - r * 1.2, r],
  [cx + r * 1.05, baseY - r * 0.75, r * 0.8],
  [cx + r * 0.4, baseY - r * 0.35, r * 0.9],
  [cx - r * 0.5, baseY - r * 0.3, r * 0.85],
];

const TREES = [
  ...treeClump(W * 0.06, HZ + 4, W * 0.07),
  ...treeClump(W * 0.24, HZ + 2, W * 0.05),
  ...treeClump(W * 0.8, HZ + 4, W * 0.065),
  ...treeClump(W * 0.97, HZ + 6, W * 0.08),
];

// Small vinta on the sea: hull plus two striped sails.
const VINTA_X = W * 0.6;
const VINTA_Y = SEA_TOP + H * 0.017;
const VINTA_U = W * 0.004;
const VINTA_COLORS = ['#E63946', '#F4C430', '#2A9D8F', '#1D4ED8'];
const vintaSail = (x0, w, h) => VINTA_COLORS.map((c, k) => {
  const y0 = VINTA_Y - h + (h / VINTA_COLORS.length) * k;
  const y1 = y0 + h / VINTA_COLORS.length;
  return { c, d: `M${x0} ${y0} L${x0 + w} ${y0 + (h / 6) * (k / 4)} L${x0 + w} ${y1} L${x0} ${y1} Z` };
});
const VINTA_SAILS = [
  ...vintaSail(VINTA_X - 9 * VINTA_U, 8 * VINTA_U, 18 * VINTA_U),
  ...vintaSail(VINTA_X + 1 * VINTA_U, 6 * VINTA_U, 13 * VINTA_U),
];

function CatchEncounterScene() {
  return (
    <Svg style={StyleSheet.absoluteFill} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7FB5E0" />
          <Stop offset="0.7" stopColor="#BFDDF0" />
          <Stop offset="1" stopColor="#E8F3F2" />
        </LinearGradient>
        <LinearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5E9EC4" />
          <Stop offset="1" stopColor="#8CC0D8" />
        </LinearGradient>
        <LinearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#93BE6E" />
          <Stop offset="0.35" stopColor="#6E9F55" />
          <Stop offset="1" stopColor="#3C6B3E" />
        </LinearGradient>
        <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0" />
          <Stop offset="1" stopColor="#0B1A10" stopOpacity="0.45" />
        </LinearGradient>
        <RadialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFF8DC" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#FFF8DC" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width={W} height={HZ} fill="url(#sky)" />
      <Circle cx={W * 0.82} cy={H * 0.09} r={W * 0.16} fill="url(#sun)" />
      <G fill="#FFFFFF" opacity={0.85}>
        <Ellipse cx={W * 0.2} cy={H * 0.08} rx={W * 0.13} ry={H * 0.018} />
        <Ellipse cx={W * 0.29} cy={H * 0.07} rx={W * 0.08} ry={H * 0.02} />
        <Ellipse cx={W * 0.66} cy={H * 0.15} rx={W * 0.11} ry={H * 0.014} />
        <Ellipse cx={W * 0.73} cy={H * 0.142} rx={W * 0.06} ry={H * 0.016} />
      </G>

      <Rect x="0" y={SEA_TOP} width={W} height={HZ - SEA_TOP} fill="url(#sea)" />
      <Path d={FAR_RANGE} fill="#8AA6BE" opacity={0.9} />
      <Path d={`M${VINTA_X - W * 0.03} ${VINTA_Y} L${VINTA_X + W * 0.035} ${VINTA_Y} L${VINTA_X + W * 0.025} ${VINTA_Y + 4} L${VINTA_X - W * 0.022} ${VINTA_Y + 4} Z`} fill="#5B3A1E" />
      {VINTA_SAILS.map((s, i) => <Path key={i} d={s.d} fill={s.c} />)}

      <Path d={NEAR_HILL} fill="#6F9A6A" />
      <Path d={RIGHT_HILL} fill="#7AA371" />

      <Rect x="0" y={HZ} width={W} height={H - HZ} fill="url(#grass)" />
      <Ellipse cx={W * 0.3} cy={H * 0.47} rx={W * 0.55} ry={H * 0.05} fill="#A3CB7C" opacity={0.35} />
      <Ellipse cx={W * 0.78} cy={H * 0.6} rx={W * 0.5} ry={H * 0.06} fill="#4F7F45" opacity={0.3} />

      <G fill="#3F6E41">
        {TREES.map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} />)}
      </G>
      <G fill="#568A50" opacity={0.8}>
        {TREES.map(([x, y, r], i) => <Circle key={i} cx={x - r * 0.25} cy={y - r * 0.3} r={r * 0.55} />)}
      </G>

      <Path d={DARK_TUFTS} stroke="#2F5A33" strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Path d={LIGHT_TUFTS} stroke="#A8CF7E" strokeWidth={1.3} strokeLinecap="round" fill="none" opacity={0.85} />
      {FLOWERS.map(({ x, y, s }, i) => (
        <Circle key={i} cx={x} cy={y - 2 * s} r={1.3 * s} fill={i % 3 ? '#FFFFFF' : '#FDE68A'} opacity={0.9} />
      ))}

      <Rect x="0" y={H * 0.62} width={W} height={H * 0.38} fill="url(#shade)" />
    </Svg>
  );
}

export default React.memo(CatchEncounterScene);
