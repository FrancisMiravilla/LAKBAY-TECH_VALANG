import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FONTS } from '../constants/theme';

// Shared AR walking-guidance HUD (reference/arrow.png): glass info cards on top,
// a lime path painted on the ground with chevrons, and round glass buttons.

const { width: W, height: H } = Dimensions.get('window');

export const AR_LIME = '#DDF47A';
const LIME_DARK = '#1F2A0A';
const GLASS = 'rgba(70,74,70,0.55)';
const GLASS_BORDER = 'rgba(255,255,255,0.22)';

const CHEVRONS = 4;

export function formatDistance(m) {
  if (m == null) return '--';
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${Math.round(m)}m`;
}

// relativeBearing: 0 = target straight ahead, 90 = right, 180 = behind, 270 = left
export function turnFor(relativeBearing) {
  const r = ((relativeBearing % 360) + 360) % 360;
  if (r < 22 || r > 338) return { icon: 'arrow-up', label: 'Go straight' };
  if (r <= 135) return { icon: 'arrow-redo', label: 'Turn right' };
  if (r >= 225) return { icon: 'arrow-undo', label: 'Turn left' };
  return { icon: 'refresh', label: 'Turn around' };
}

// ─── Top glass cards ─────────────────────────────────────────────────────────
export function ARNavCards({ relativeBearing, distanceM, destination, hasHeading = true, style }) {
  const turn = turnFor(relativeBearing);
  return (
    <View style={[styles.cardsRow, style]} pointerEvents="none">
      <View style={[styles.glassCard, styles.turnCard]}>
        <View style={styles.turnTile}>
          <Ionicons name={turn.icon} size={30} color={LIME_DARK} />
        </View>
        <View style={styles.turnTextCol}>
          <Text style={styles.turnLabel} numberOfLines={1}>{turn.label}</Text>
          <Text style={styles.cardSub} numberOfLines={2}>
            {hasHeading ? `toward ${destination || 'your destination'}` : 'Compass unavailable'}
          </Text>
        </View>
      </View>
      <View style={[styles.glassCard, styles.distCard]}>
        <Text style={styles.distValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatDistance(distanceM)}
        </Text>
        <Text style={styles.cardSub}>Distance{'\n'}remaining</Text>
      </View>
    </View>
  );
}

// ─── Ground path with chevrons ───────────────────────────────────────────────
// Drawn in plain 2D: ground points (metres) are projected through a simple pinhole
// camera, so no 3D view transforms are needed (Android drops tall rotateX views).
const CAM_HEIGHT = 1.5;          // phone height above the ground (m)
const FOCAL = W * 0.9;           // px per metre at 1 m
const HORIZON_Y = H * 0.4;       // where the ground meets the sky on screen
const PATH_START = 1.3;          // first visible ground point ahead of the user (m)
const PATH_LEN = 14;             // path length along the ground (m)
const PATH_HALF_W = 0.55;        // half the path width (m)
const TURN_LEN = 5;              // metres over which the path bends toward the target
const MAX_BEND = (80 * Math.PI) / 180;
const SAMPLES = 36;

function project(x, z, lift) {
  return { x: W / 2 + (FOCAL * x) / z, y: HORIZON_Y + (FOCAL * CAM_HEIGHT) / z - lift };
}

// Centre line: starts straight ahead, then bends toward the target (clamped to ±80°).
function buildCentreLine(relativeBearing) {
  let rel = ((relativeBearing % 360) + 360) % 360;
  if (rel > 180) rel -= 360;
  const bend = Math.max(-MAX_BEND, Math.min(MAX_BEND, (rel * Math.PI) / 180));
  const pts = [];
  let x = 0;
  let z = PATH_START;
  const ds = PATH_LEN / SAMPLES;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = Math.min(1, (i * ds) / TURN_LEN);
    const phi = bend * t * t * (3 - 2 * t);
    pts.push({ x, z, phi });
    x += Math.sin(phi) * ds;
    z += Math.cos(phi) * ds;
  }
  return pts;
}

function toPath(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
}

function bandPath(line, lift) {
  const left = line.map((p) => project(p.x - Math.cos(p.phi) * PATH_HALF_W, p.z + Math.sin(p.phi) * PATH_HALF_W, lift));
  const right = line.map((p) => project(p.x + Math.cos(p.phi) * PATH_HALF_W, p.z - Math.sin(p.phi) * PATH_HALF_W, lift));
  return toPath([...left, ...right.reverse()]);
}

// Chevron lying flat on the ground at centre-line point p, tip pointing along the path.
function chevronPath(p, lift) {
  const fx = Math.sin(p.phi);
  const fz = Math.cos(p.phi);
  const rx = Math.cos(p.phi);
  const rz = -Math.sin(p.phi);
  const at = (f, r) => project(p.x + fx * f + rx * r, p.z + fz * f + rz * r, lift);
  return toPath([at(0.45, 0), at(-0.2, 0.42), at(-0.05, 0), at(-0.2, -0.42)]);
}

export function ARGroundPath({ relativeBearing, bottom = 0 }) {
  const flowAnim = useRef(new Animated.Value(0)).current;
  const [smoothRel, setSmoothRel] = useState(relativeBearing);
  const smoothRef = useRef(relativeBearing);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(flowAnim, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [flowAnim]);

  // Ease toward the new bearing along the shortest arc so compass jitter doesn't snap the path.
  useEffect(() => {
    let frame;
    const step = () => {
      let delta = relativeBearing - smoothRef.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      if (Math.abs(delta) < 0.5) {
        smoothRef.current = relativeBearing;
        setSmoothRel(relativeBearing);
        return;
      }
      smoothRef.current = (smoothRef.current + delta * 0.25 + 360) % 360;
      setSmoothRel(smoothRef.current);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [relativeBearing]);

  const line = buildCentreLine(smoothRel);
  const band = bandPath(line, bottom);
  const nearY = project(0, PATH_START, bottom).y;
  const chevronIdx = [3, 9, 15, 22];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="arPathFade" x1="0" y1={nearY} x2="0" y2={HORIZON_Y - bottom} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={AR_LIME} stopOpacity="0.45" />
            <Stop offset="0.75" stopColor={AR_LIME} stopOpacity="0.2" />
            <Stop offset="1" stopColor={AR_LIME} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={band} fill="url(#arPathFade)" />
      </Svg>
      {chevronIdx.map((idx, i) => {
        // i = 0 is nearest the user; the bright pulse travels away from them.
        const phase = i / CHEVRONS;
        const opacity = flowAnim.interpolate({
          inputRange: [0, phase, Math.min(1, phase + 0.25), 1],
          outputRange: [0.5, 0.5, 1, 0.5],
        });
        return (
          <Animated.View key={idx} style={[StyleSheet.absoluteFill, { opacity }]}>
            <Svg width={W} height={H}>
              <Path
                d={chevronPath(line[idx], bottom)}
                fill={AR_LIME}
                stroke={AR_LIME}
                strokeWidth={6 - i}
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Round glass buttons ─────────────────────────────────────────────────────
export function ARRoundButtons({ buttons, bottom = 40 }) {
  return (
    <View style={[styles.roundRow, { bottom }]} pointerEvents="box-none">
      {buttons.map((b) => (
        <TouchableOpacity
          key={b.icon}
          style={styles.roundBtn}
          onPress={b.onPress}
          activeOpacity={0.8}
          accessibilityLabel={b.label}
        >
          <Ionicons name={b.icon} size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardsRow: {
    position: 'absolute',
    top: 52,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
    zIndex: 20,
  },
  glassCard: {
    backgroundColor: GLASS,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 10,
  },
  turnCard: { flex: 1.45, flexDirection: 'row', alignItems: 'center' },
  turnTile: {
    width: 54,
    height: 78,
    borderRadius: 18,
    backgroundColor: AR_LIME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnTextCol: { flex: 1, marginLeft: 10 },
  turnLabel: { fontFamily: FONTS.bold, fontSize: 22, color: '#FFFFFF', lineHeight: 26 },
  cardSub: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 16, marginTop: 2 },
  distCard: { flex: 1, justifyContent: 'center', paddingHorizontal: 14 },
  distValue: { fontFamily: FONTS.bold, fontSize: 30, color: '#FFFFFF', lineHeight: 34 },


  roundRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    zIndex: 30,
  },
  roundBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
