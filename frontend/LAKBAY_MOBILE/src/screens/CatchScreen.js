import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ScrollView, ActivityIndicator,
  Animated, Dimensions, Modal, Platform, ImageBackground,
  PanResponder, Easing,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SHADOW, BG_OVERLAY, GOLD_TEXT, onWhite } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import { useApp } from '../context/AppContext';
import { getCatchIcons, getSpots, ORIGIN, logActivity } from '../api/qrService';
import { authService } from '../api/authService';
import ErrorModal from '../components/ErrorModal';
import VintaStripe from '../components/VintaStripe';
import { ARNavCards, ARGroundPath, ARRoundButtons } from '../components/ARGuidance';
import GuideBubble from '../components/GuideBubble';
import { catchXpFor } from '../constants/rewards';
import { Svg, Polygon, Path, Circle, G, Defs, LinearGradient, Stop, Line, Rect, ClipPath } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────
const CATCH_RADIUS_METERS = 50;      // proximity sheet unlocks within 50 m of a spot
const SIGHT_RADIUS_METERS = 10;      // the treasure chest comes into view (small) within 10 m
const OPEN_RADIUS_METERS = 5;        // close enough to open the chest (and catch) within 5 m
const FULL_SIZE_METERS = 2;          // the chest reaches full size this close
const FAR_MODEL_SCALE = 0.3;         // model size at the edge of sight
const CAMERA_HFOV_DEG = 60;          // approx. horizontal field of view of a phone camera
const ANCHOR_FREEZE_METERS = 6;      // closer than this, GPS bearing is noise: keep the last anchor
const MAX_GPS_ACCURACY_METERS = 50;  // ignore GPS fixes less precise than this (they point the arrow randomly)
const PANEL_CLEARANCE = 210;         // keep the ground path above the bottom panel

// Net throw: swipe up from the net to throw it at the drifting model.
const NET_SIZE = 168;
const NET_TOP = H - 215 - NET_SIZE;
const NET_CY = NET_TOP + NET_SIZE / 2;
const MODEL_CY = H * 0.22 + W * 0.375;
const MODEL_DRIFT = W * 0.2;          // how far the model sways left/right while you aim
const NET_HIT_RADIUS = W * 0.2;       // horizontal tolerance for a hit
const THROW_MIN_SPEED = 0.7;          // px/ms upward swipe speed needed to reach the model
const NET_FLIGHT_MS = 480;
const FALLBACK_COLORS = ['#E91E8C', '#38BDF8', '#FBBF24', '#10B981'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const resolveModelUrl = (m) => {
  if (!m) return null;
  if (m.startsWith('data:')) return m;
  if (m.startsWith('http')) return m;
  return `${ORIGIN}${m}`;
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute bearing (0–360°) from point A to point B.
 * 0° = North, 90° = East, etc.
 */
function computeBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function normalizeIcon(raw, idx) {
  const color = raw.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  const modelPath = raw.model_3d || null;
  return {
    id: raw.id,
    name: raw.name || 'Unknown',
    tagline: raw.tagline || '',
    about: raw.about || '',
    significance: raw.significance || raw.cultural_significance || '',
    color,
    glow: color + '55',
    model_3d: modelPath
      ? modelPath.startsWith('http') || modelPath.startsWith('data:')
        ? modelPath
        : `${ORIGIN}${modelPath}`
      : null,
  };
}

// ─── 3D Viewer HTML (AR overlay) ─────────────────────────────────────────────
function buildARViewerHTML(modelUrl) {
  const safe = String(modelUrl).replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:100%;height:100%;background:transparent;overflow:hidden;}
    model-viewer{
      width:100%;height:100%;
      --progress-bar-color:transparent;
      background:transparent;
    }
  </style>
</head>
<body>
  <model-viewer
    src="${safe}"
    auto-rotate
    auto-rotate-delay="0"
    rotation-per-second="25deg"
    camera-controls
    bounds="tight"
    camera-orbit="0deg 75deg auto"
    exposure="1.2"
    shadow-intensity="1.5"
    style="width:100%;height:100%;background:transparent;"
  ></model-viewer>
</body>
</html>`;
}


// ─── AR HUD: Floating Particles ──────────────────────────────────────────────
function FloatingParticles({ color }) {
  const PARTICLES = [
    { x: W * 0.15, y: H * 0.3,  size: 4, dur: 2600, delay: 0 },
    { x: W * 0.8,  y: H * 0.2,  size: 3, dur: 3100, delay: 400 },
    { x: W * 0.7,  y: H * 0.55, size: 5, dur: 2900, delay: 800 },
    { x: W * 0.1,  y: H * 0.6,  size: 3, dur: 3400, delay: 200 },
    { x: W * 0.5,  y: H * 0.15, size: 4, dur: 2700, delay: 600 },
    { x: W * 0.88, y: H * 0.45, size: 3, dur: 3000, delay: 100 },
  ];
  return (
    <>
      {PARTICLES.map((p, i) => <Particle key={i} p={p} color={color} />)}
    </>
  );
}

// One particle per component so its animation hooks run at the top level.
function Particle({ p, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(anim, { toValue: 1, duration: p.dur, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: p.dur, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.8, 0.1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        arHudStyles.particle,
        {
          left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: p.size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

// ─── AR HUD: Top Status Bar ───────────────────────────────────────────────────
function ARStatusBar({ color, distanceM, showArrow, accuracy }) {
  const blinkAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={[arHudStyles.statusBar, { borderColor: color + '40' }]}>
      {/* Live dot */}
      <Animated.View style={[arHudStyles.liveDot, { backgroundColor: color, opacity: blinkAnim }]} />
      <Text style={[arHudStyles.statusText, { color: color }]}>AR LIVE</Text>
      <View style={arHudStyles.statusDivider} />
      <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.6)" style={{ marginRight: 4 }} />
      <Text style={arHudStyles.statusSub}>
        {distanceM !== null
          ? `${Math.round(distanceM)}m${accuracy ? ` ±${Math.round(accuracy)}` : ''}`
          : '---'}
      </Text>
      <View style={arHudStyles.statusDivider} />
      <Ionicons name={showArrow ? 'navigate-outline' : 'eye-outline'} size={11} color="rgba(255,255,255,0.6)" style={{ marginRight: 4 }} />
      <Text style={arHudStyles.statusSub}>{showArrow ? 'NAVIGATING' : 'SCANNING'}</Text>
    </View>
  );
}

// ─── Celebration Confetti System ─────────────────────────────────────────────
const CONFETTI_COLORS = ['#FBBF24', '#10B981', '#38BDF8', '#EC4899', '#A855F7', '#EF4444', '#F97316', '#FFFFFF'];

function ConfettiPiece({ index }) {
  const animY = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;
  const animRot = useRef(new Animated.Value(0)).current;

  const startX = useRef(Math.random() * W).current;
  const endX = useRef(startX + (Math.random() - 0.5) * 180).current;
  const sizeW = useRef(6 + Math.random() * 8).current;
  const sizeH = useRef(10 + Math.random() * 12).current;
  const isCircle = useRef(index % 4 === 0).current;
  const color = useRef(CONFETTI_COLORS[index % CONFETTI_COLORS.length]).current;
  const duration = useRef(2400 + Math.random() * 1800).current;
  const delay = useRef(Math.random() * 800).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(animY, { toValue: H * 0.95, duration, useNativeDriver: true }),
          Animated.timing(animX, { toValue: endX - startX, duration, useNativeDriver: true }),
          Animated.timing(animRot, { toValue: 720 + Math.random() * 360, duration, useNativeDriver: true }),
        ]),
        Animated.timing(animY, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(animX, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(animRot, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotateZ = animRot.interpolate({
    inputRange: [0, 720],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -20,
        left: startX,
        width: isCircle ? sizeW : sizeW,
        height: isCircle ? sizeW : sizeH,
        borderRadius: isCircle ? sizeW / 2 : 2,
        backgroundColor: color,
        opacity: 0.9,
        transform: [
          { translateY: animY },
          { translateX: animX },
          { rotateZ },
        ],
        zIndex: 50,
      }}
    />
  );
}

function ConfettiCannon() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[...Array(38)].map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </View>
  );
}

// ─── Treasure Chest (cartoon chest: red-brown planks, gold trim, big padlock) ─
const CHEST_W = W * 0.46;
const CHEST_LID_H = CHEST_W * 0.40;
const CHEST_BASE_H = CHEST_W * 0.50;
const CHEST_OPEN_MS = 700;
const LOCK_W = CHEST_W * 0.2;
const LOCK_H = LOCK_W * 1.45;
// The chest sits just under where the model floats, so the model rises out of it.
const CHEST_TOP = H * 0.22 + W * 0.75 - CHEST_LID_H * 0.5;
const BEAM_H = W * 0.62;

const GOLD = '#F6B820';
const GOLD_DARK = '#B9770E';
const OUTLINE = '#3B1A0A';

function ChestLid() {
  const dome = 'M6 80 L6 42 Q6 6 42 6 L158 6 Q194 6 194 42 L194 80 Z';
  return (
    <Svg width={CHEST_W} height={CHEST_LID_H} viewBox="0 0 200 80">
      <Defs>
        <LinearGradient id="lidWood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D2602E" />
          <Stop offset="1" stopColor="#93361A" />
        </LinearGradient>
        <ClipPath id="lidClip"><Path d={dome} /></ClipPath>
      </Defs>
      <Path d={dome} fill="url(#lidWood)" />
      <G clipPath="url(#lidClip)">
        {/* planks */}
        <Line x1="0" y1="30" x2="200" y2="30" stroke="#7A2A10" strokeWidth="3" />
        <Line x1="0" y1="54" x2="200" y2="54" stroke="#7A2A10" strokeWidth="3" />
        <Path d="M30 20 Q70 12 110 14" stroke="rgba(255,255,255,0.28)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* gold side frames, centre band and bottom rim */}
        <Rect x="0" y="0" width="26" height="80" fill={GOLD} />
        <Rect x="174" y="0" width="26" height="80" fill={GOLD} />
        <Rect x="91" y="0" width="18" height="80" fill={GOLD} />
        <Rect x="0" y="68" width="200" height="12" fill={GOLD} />
        <Rect x="10" y="0" width="5" height="68" fill="rgba(255,255,255,0.45)" />
        <Rect x="95" y="0" width="4" height="68" fill="rgba(255,255,255,0.45)" />
        <Line x1="26" y1="0" x2="26" y2="68" stroke={GOLD_DARK} strokeWidth="2" />
        <Line x1="174" y1="0" x2="174" y2="68" stroke={GOLD_DARK} strokeWidth="2" />
      </G>
      <Path d={dome} fill="none" stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round" />
    </Svg>
  );
}

function ChestBase() {
  const body = 'M6 0 L194 0 L194 86 L6 86 Z';
  return (
    <Svg width={CHEST_W} height={CHEST_BASE_H} viewBox="0 0 200 100">
      <Defs>
        <LinearGradient id="baseWood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A9542A" />
          <Stop offset="1" stopColor="#6E2D12" />
        </LinearGradient>
        <ClipPath id="baseClip"><Path d={body} /></ClipPath>
      </Defs>
      <Path d={body} fill="url(#baseWood)" />
      <G clipPath="url(#baseClip)">
        <Line x1="0" y1="34" x2="200" y2="34" stroke="#5A230C" strokeWidth="3" />
        <Line x1="0" y1="60" x2="200" y2="60" stroke="#5A230C" strokeWidth="3" />
        <Rect x="0" y="0" width="26" height="86" fill={GOLD} />
        <Rect x="174" y="0" width="26" height="86" fill={GOLD} />
        <Rect x="0" y="0" width="200" height="10" fill={GOLD} />
        <Rect x="10" y="10" width="5" height="76" fill="rgba(255,255,255,0.45)" />
        <Line x1="26" y1="10" x2="26" y2="86" stroke={GOLD_DARK} strokeWidth="2" />
        <Line x1="174" y1="10" x2="174" y2="86" stroke={GOLD_DARK} strokeWidth="2" />
      </G>
      <Path d={body} fill="none" stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round" />
      {/* gold plinth */}
      <Path d="M2 84 L198 84 Q198 98 190 98 L10 98 Q2 98 2 84 Z" fill={GOLD} stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round" />
      <Line x1="10" y1="89" x2="190" y2="89" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function ChestLock() {
  return (
    <Svg width={LOCK_W} height={LOCK_H} viewBox="0 0 40 58">
      <Path d="M4 6 Q4 2 8 2 L32 2 Q36 2 36 6 L36 34 Q36 40 30 40 L10 40 Q4 40 4 34 Z" fill={GOLD} stroke={OUTLINE} strokeWidth="3" />
      <Path d="M9 6 L9 30" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeLinecap="round" />
      <Circle cx="20" cy="16" r="6" fill="#1E0C03" />
      <Path d="M17 19 L23 19 L24 30 L16 30 Z" fill="#1E0C03" />
      <Path d="M12 40 L28 40 L28 48 L20 56 L12 48 Z" fill={GOLD} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      <Circle cx="20" cy="47" r="3.2" fill="#FFE08A" stroke={GOLD_DARK} strokeWidth="1.2" />
    </Svg>
  );
}

// phase: chest (closed) | opening | revealed. `ready` = close enough to open.
function TreasureChest({ phase, ready, offsetX, sizeScale, onOpen }) {
  const popAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const lidAnim = useRef(new Animated.Value(0)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;
  const raysAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const shakeLoop = useRef(null);

  useEffect(() => {
    Animated.spring(popAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
  }, []);

  // Closed: an occasional wobble; once in range it rattles more eagerly.
  useEffect(() => {
    shakeLoop.current?.stop();
    if (phase !== 'chest') return undefined;
    const hit = (to, d) => Animated.timing(shakeAnim, { toValue: to, duration: d, useNativeDriver: true });
    shakeLoop.current = Animated.loop(
      Animated.sequence(ready
        ? [hit(1, 60), hit(-1, 60), hit(1, 60), hit(-1, 60), hit(0, 60), Animated.delay(700)]
        : [hit(0.5, 120), hit(-0.5, 120), hit(0, 120), Animated.delay(1800)]),
    );
    shakeLoop.current.start();
    return () => shakeLoop.current?.stop();
  }, [phase, ready]);

  useEffect(() => {
    if (phase === 'opening') {
      shakeAnim.stopAnimation();
      shakeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(lidAnim, { toValue: 1, duration: CHEST_OPEN_MS, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.timing(burstAnim, { toValue: 1, duration: CHEST_OPEN_MS + 300, useNativeDriver: true }),
      ]).start();
      Animated.loop(Animated.timing(raysAnim, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [phase]);

  const open = phase !== 'chest';
  const shakeRotate = shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] });
  const lidRotate = lidAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-118deg'] });
  const burstScale = burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 2.2] });
  const burstOpacity = burstAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0.6] });
  const raysRotate = raysAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const beamOpacity = Animated.multiply(burstAnim, glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        chestStyles.wrap,
        { transform: [{ translateX: offsetX ?? 0 }, { scale: Animated.multiply(popAnim, sizeScale ?? 1) }, { rotateZ: shakeRotate }] },
      ]}
    >
      {/* Light pouring up out of the open chest (behind the model) */}
      {open && (
        <Animated.View pointerEvents="none" style={[chestStyles.beam, { opacity: beamOpacity }]}>
          <Svg width={CHEST_W * 0.7} height={BEAM_H}>
            <Defs>
              <LinearGradient id="beamGrad" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor="#FFF4C2" stopOpacity="0.95" />
                <Stop offset="0.5" stopColor="#FDE68A" stopOpacity="0.45" />
                <Stop offset="1" stopColor="#FDE68A" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Path d={`M${CHEST_W * 0.2} ${BEAM_H} L0 0 L${CHEST_W * 0.7} 0 L${CHEST_W * 0.5} ${BEAM_H} Z`} fill="url(#beamGrad)" />
          </Svg>
        </Animated.View>
      )}
      <Animated.View pointerEvents="none" style={[chestStyles.rays, { opacity: burstOpacity, transform: [{ rotateZ: raysRotate }, { scale: burstScale }] }]}>
        <Svg width={CHEST_W} height={CHEST_W} viewBox="0 0 200 200">
          {[...Array(12)].map((_, i) => (
            <Polygon
              key={i}
              points="100,100 94,0 106,0"
              fill="#FDE68A"
              opacity={i % 2 ? 0.55 : 0.9}
              transform={`rotate(${i * 30} 100 100)`}
            />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[chestStyles.glow, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]} />

      <TouchableOpacity activeOpacity={0.9} disabled={!onOpen} onPress={onOpen} style={chestStyles.body}>
        <View style={chestStyles.interior} />
        <Animated.View style={[chestStyles.lid, { transform: [{ perspective: 600 }, { rotateX: lidRotate }] }]}>
          <ChestLid />
        </Animated.View>
        <ChestBase />
        <View style={chestStyles.lock} pointerEvents="none">
          <ChestLock />
        </View>
      </TouchableOpacity>

      {/* "Tap me" ring while it is ready to open */}
      {phase === 'chest' && ready && <TapHalo />}
    </Animated.View>
  );
}

function TapHalo() {
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        chestStyles.halo,
        {
          opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }],
        },
      ]}
    />
  );
}

// ─── Throwable catch net (cartoon rope net, styled after reference/net.png) ──
const NET_CELLS = 6;
const NET_CORNERS = { tl: [7, 38], tr: [56, 7], br: [86, 50], bl: [37, 82] };

function netPoint(i, j) {
  const u = i / NET_CELLS;
  const v = j / NET_CELLS;
  const { tl, tr, br, bl } = NET_CORNERS;
  const x = (1 - u) * (1 - v) * tl[0] + u * (1 - v) * tr[0] + u * v * br[0] + (1 - u) * v * bl[0];
  const y = (1 - u) * (1 - v) * tl[1] + u * (1 - v) * tr[1] + u * v * br[1] + (1 - u) * v * bl[1];
  const wob = (i > 0 && i < NET_CELLS && j > 0 && j < NET_CELLS) ? 1.2 : 0;
  return [x + wob * Math.sin(i * 2.1 + j), y + wob * Math.cos(j * 1.7 + i)];
}

function ropePath(points) {
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let k = 1; k < points.length; k++) {
    const [ax, ay] = points[k - 1];
    const [bx, by] = points[k];
    const sag = k % 2 ? 1.6 : -1.6;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const cx = (ax + bx) / 2 + (-(by - ay) / len) * sag;
    const cy = (ay + by) / 2 + ((bx - ax) / len) * sag;
    d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  return d;
}

function tailPath([x, y], [dx, dy], flip) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy * flip;
  const py = ux * flip;
  return `M${x.toFixed(1)} ${y.toFixed(1)} q${(ux * 3 + px * 2).toFixed(1)} ${(uy * 3 + py * 2).toFixed(1)} ${(ux * 6).toFixed(1)} ${(uy * 6).toFixed(1)} t${(ux * 3 - px * 2.5).toFixed(1)} ${(uy * 3 - py * 2.5).toFixed(1)}`;
}

const NET_ROPES = (() => {
  const ropes = [];
  for (let j = 0; j <= NET_CELLS; j++) {
    ropes.push(ropePath(Array.from({ length: NET_CELLS + 1 }, (_, i) => netPoint(i, j))));
  }
  for (let i = 0; i <= NET_CELLS; i++) {
    ropes.push(ropePath(Array.from({ length: NET_CELLS + 1 }, (_, j) => netPoint(i, j))));
  }
  const right = [NET_CORNERS.tr[0] - NET_CORNERS.tl[0], NET_CORNERS.tr[1] - NET_CORNERS.tl[1]];
  const down = [NET_CORNERS.bl[0] - NET_CORNERS.tl[0], NET_CORNERS.bl[1] - NET_CORNERS.tl[1]];
  for (let k = 1; k <= NET_CELLS; k++) {
    ropes.push(tailPath(netPoint(NET_CELLS, k), right, k % 2 ? 1 : -1));
    ropes.push(tailPath(netPoint(k, NET_CELLS), down, k % 2 ? -1 : 1));
  }
  return ropes;
})();

const NET_KNOTS = (() => {
  const knots = [];
  for (let i = 0; i <= NET_CELLS; i++) {
    for (let j = 0; j <= NET_CELLS; j++) knots.push(netPoint(i, j));
  }
  return knots;
})();

const NET_WEIGHTS = [NET_CORNERS.tl, NET_CORNERS.tr, NET_CORNERS.br, NET_CORNERS.bl];

const circlePath = ([x, y], r) =>
  `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

const NET_ROPES_D = NET_ROPES.join(' ');
const NET_KNOTS_D = NET_KNOTS.map((p) => circlePath(p, 2.5)).join('');
const NET_SHINES_D = NET_KNOTS.map(([x, y]) => circlePath([x - 0.7, y - 0.8], 0.8)).join('');
const NET_WEIGHTS_D = NET_WEIGHTS.map((p) => circlePath(p, 5)).join('');
const NET_WEIGHT_SHINES_D = NET_WEIGHTS.map(([x, y]) => circlePath([x - 1.5, y - 1.6], 1.5)).join('');

const ThrowNet = React.memo(function ThrowNet({ color }) {
  return (
    <Svg width={NET_SIZE} height={NET_SIZE} viewBox="0 0 100 100">
      <G fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Path d={NET_ROPES_D} stroke="#4A2A10" strokeWidth="4.4" />
        <Path d={NET_ROPES_D} stroke="#F4C77A" strokeWidth="2.6" />
      </G>
      <Path d={NET_KNOTS_D} fill="#E9A94E" stroke="#4A2A10" strokeWidth="1.1" />
      <Path d={NET_SHINES_D} fill="#FFF3D6" />
      <Path d={NET_WEIGHTS_D} fill={color || '#FBBF24'} stroke="#4A2A10" strokeWidth="1.6" />
      <Path d={NET_WEIGHT_SHINES_D} fill="rgba(255,255,255,0.8)" />
    </Svg>
  );
});

// ─── AR Camera Overlay ───────────────────────────────────────────────────────
function ARCatchOverlay({ icon, spot, userLocation, alreadyCaught, onModelFound, onContinue, onClose }) {
  const activeModel = (spot && spot.model_3d) 
    ? (spot.model_3d.startsWith('http') || spot.model_3d.startsWith('data:') ? spot.model_3d : `${ORIGIN}${spot.model_3d}`) 
    : icon.model_3d;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const celebPopAnim = useRef(new Animated.Value(0)).current;

  // ── Live compass heading ──────────────────────────────────────────────────
  const [deviceHeading, setDeviceHeading] = useState(null);
  const headingSub = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        headingSub.current = await Location.watchHeadingAsync((hdg) => {
          if (!active) return;
          const h = hdg.trueHeading >= 0 ? hdg.trueHeading : hdg.magHeading;
          setDeviceHeading((prev) => {
            if (prev === null) return h;
            const diff = Math.abs(((h - prev + 540) % 360) - 180);
            return diff >= 2 ? h : prev;
          });
        });
      } catch (_) {
        // Heading not available on this device
      }
    })();
    return () => {
      active = false;
      headingSub.current?.remove();
    };
  }, []);

  // ── GPS bearing & distance ────────────────────────────────────────────────
  const targetBearing = userLocation && spot
    ? computeBearing(userLocation.lat, userLocation.lng, spot.latitude, spot.longitude)
    : 0;
  const distanceM = userLocation && spot
    ? haversineDistance(userLocation.lat, userLocation.lng, spot.latitude, spot.longitude)
    : null;

  const relativeBearing = deviceHeading !== null
    ? ((targetBearing - deviceHeading) + 360) % 360
    : targetBearing;

  const showArrow = distanceM !== null && distanceM > SIGHT_RADIUS_METERS;
  const inOpenRange = distanceM !== null && distanceM <= OPEN_RADIUS_METERS;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -14, duration: 1400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,   duration: 1400, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Reveal sequence: the closed chest appears within 10 m and grows as the player
  // approaches; within 5 m the player
  // may tap it to open (or turn away and leave it); the model then rises out.
  // Phases are latched so GPS jitter around the edges doesn't replay or hide them.
  const [revealPhase, setRevealPhase] = useState('none'); // none | chest | opening | revealed
  const [canOpen, setCanOpen] = useState(false);
  const modelRiseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showArrow && revealPhase === 'none') setRevealPhase('chest');
  }, [showArrow, revealPhase]);

  useEffect(() => {
    if (inOpenRange && !canOpen) setCanOpen(true);
  }, [inOpenRange, canOpen]);

  const openChest = () => {
    if (revealPhase === 'chest' && canOpen) setRevealPhase('opening');
  };

  useEffect(() => {
    if (revealPhase === 'opening') {
      const t = setTimeout(() => setRevealPhase('revealed'), CHEST_OPEN_MS);
      return () => clearTimeout(t);
    }
    if (revealPhase === 'revealed') {
      Animated.spring(modelRiseAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
    }
  }, [revealPhase]);

  const arrived = revealPhase !== 'none';
  const revealed = revealPhase === 'revealed';
  // The model starts inside the chest and rises to float above it.
  const modelScale = modelRiseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] });
  const modelRiseY = modelRiseAnim.interpolate({ inputRange: [0, 1], outputRange: [CHEST_TOP + CHEST_LID_H - MODEL_CY, 0] });

  // Distance sizing: small at 10 m, growing to full size as the player walks in.
  const distanceScale = useRef(new Animated.Value(FAR_MODEL_SCALE)).current;

  useEffect(() => {
    if (distanceM === null) return;
    const lin = Math.max(0, Math.min(1, (SIGHT_RADIUS_METERS - distanceM) / (SIGHT_RADIUS_METERS - FULL_SIZE_METERS)));
    // Eased: stays small from afar, then grows quickly over the last few metres.
    const t = Math.pow(lin, 1.6);
    Animated.timing(distanceScale, {
      toValue: FAR_MODEL_SCALE + (1 - FAR_MODEL_SCALE) * t,
      duration: 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [distanceM]);

  // World anchoring: the model sits in the spot's real direction, so turning the
  // phone moves it across the screen. The GPS bearing is smoothed, and frozen when
  // very close, so it doesn't jump around with location noise.
  const [anchorBearing, setAnchorBearing] = useState(null);
  useEffect(() => {
    if (!userLocation || !spot || distanceM === null) return;
    setAnchorBearing((prev) => {
      if (prev === null) return targetBearing;
      if (distanceM < ANCHOR_FREEZE_METERS) return prev;
      const diff = ((targetBearing - prev + 540) % 360) - 180;
      return (prev + diff * 0.3 + 360) % 360;
    });
  }, [userLocation?.lat, userLocation?.lng]);

  const modelRel = deviceHeading !== null && anchorBearing !== null
    ? ((anchorBearing - deviceHeading + 540) % 360) - 180
    : 0;
  const halfFov = CAMERA_HFOV_DEG / 2;
  const modelInView = Math.abs(modelRel) <= halfFov;
  const bearingTarget = Math.max(-1.6, Math.min(1.6, modelRel / halfFov)) * (W / 2);

  const bearingAnim = useRef(new Animated.Value(0)).current;
  const bearingX = useRef(0);
  useEffect(() => {
    const id = bearingAnim.addListener(({ value }) => { bearingX.current = value; });
    return () => bearingAnim.removeListener(id);
  }, []);

  const modelTitle = icon.name || spot?.name || 'Cultural Model';
  const [celebDismissed, setCelebDismissed] = useState(false);

  // ── Catch mini-game: the model is only caught when a thrown net lands on it ──
  const ownedAtOpen = useRef(!!alreadyCaught).current;
  // Already-caught models can be caught again with the net (no extra XP).
  const [catchPhase, setCatchPhase] = useState('idle'); // idle | aiming | flying | capturing | caught
  const [throwMsg, setThrowMsg] = useState(null);
  const phaseRef = useRef(catchPhase);
  phaseRef.current = catchPhase;

  // Freeze the anchor while the net holds the model so the two stay together.
  const anchorLocked = catchPhase === 'capturing' || catchPhase === 'caught';
  useEffect(() => {
    if (anchorLocked) return;
    Animated.timing(bearingAnim, { toValue: bearingTarget, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [bearingTarget, anchorLocked]);

  const driftAnim = useRef(new Animated.Value(0)).current;
  const driftX = useRef(0);
  const driftLoop = useRef(null);
  const captureAnim = useRef(new Animated.Value(0)).current;

  const netPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const netScale = useRef(new Animated.Value(1)).current;
  const netSpin = useRef(new Animated.Value(0)).current;
  const netShake = useRef(new Animated.Value(0)).current;
  const netOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = driftAnim.addListener(({ value }) => { driftX.current = value; });
    return () => driftAnim.removeListener(id);
  }, []);

  useEffect(() => {
    const moving = catchPhase === 'aiming' || catchPhase === 'flying';
    if (moving && !driftLoop.current) {
      const ease = Easing.inOut(Easing.sin);
      driftLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(driftAnim, { toValue: MODEL_DRIFT, duration: 1400, easing: ease, useNativeDriver: true }),
          Animated.timing(driftAnim, { toValue: -MODEL_DRIFT, duration: 2800, easing: ease, useNativeDriver: true }),
          Animated.timing(driftAnim, { toValue: 0, duration: 1400, easing: ease, useNativeDriver: true }),
        ])
      );
      driftLoop.current.start();
    } else if (!moving && driftLoop.current) {
      driftLoop.current.stop();
      driftLoop.current = null;
      if (catchPhase === 'idle') {
        Animated.timing(driftAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      }
    }
  }, [catchPhase]);

  useEffect(() => () => driftLoop.current?.stop(), []);

  useEffect(() => {
    if (!throwMsg) return;
    const t = setTimeout(() => setThrowMsg(null), 1500);
    return () => clearTimeout(t);
  }, [throwMsg]);

  const resetNet = () => {
    netPos.setValue({ x: 0, y: 0 });
    netScale.setValue(1);
    netSpin.setValue(0);
    netShake.setValue(0);
    netOpacity.setValue(1);
  };

  const startAiming = () => {
    resetNet();
    setCatchPhase('aiming');
  };

  const cancelAiming = () => {
    resetNet();
    setCatchPhase('idle');
  };

  const captureModel = () => {
    setCatchPhase('capturing');
    const shake = (to) => Animated.timing(netShake, { toValue: to, duration: 110, useNativeDriver: true });
    Animated.parallel([
      Animated.timing(netScale, { toValue: 2.1, duration: 260, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.timing(captureAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start(() => {
      Animated.sequence([
        shake(1), shake(-1), shake(1), shake(0),
        Animated.delay(250),
        shake(1), shake(-1), shake(0),
      ]).start(() => {
        setCatchPhase('caught');
        Animated.spring(celebPopAnim, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }).start();
        if (!ownedAtOpen) onModelFound?.(icon, spot);
      });
    });
  };

  const missThrow = (msg, fromY) => {
    setThrowMsg(msg);
    Animated.parallel([
      Animated.timing(netPos.y, { toValue: fromY + 160, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(netOpacity, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start(() => {
      resetNet();
      setCatchPhase('aiming');
    });
  };

  const throwNet = (g) => {
    const startX = g.dx;
    const startY = Math.min(40, g.dy);
    if (g.dy > -30 || g.vy > -0.15) {
      Animated.spring(netPos, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      setThrowMsg('Swipe UP to throw the net!');
      return;
    }
    const speed = -g.vy;
    const fullDy = MODEL_CY - NET_CY;
    const reaches = speed >= THROW_MIN_SPEED;
    const landY = reaches ? fullDy : fullDy * Math.max(0.35, (speed / THROW_MIN_SPEED) * 0.8);
    const slope = speed > 0.05 ? g.vx / speed : g.dx / -g.dy;
    const landX = Math.max(-W / 2, Math.min(W / 2, startX + slope * (startY - landY)));

    setCatchPhase('flying');
    Animated.parallel([
      Animated.timing(netPos, { toValue: { x: landX, y: landY }, duration: NET_FLIGHT_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(netScale, { toValue: 0.75, duration: NET_FLIGHT_MS, useNativeDriver: true }),
      Animated.timing(netSpin, { toValue: 1, duration: NET_FLIGHT_MS, useNativeDriver: true }),
    ]).start(() => {
      const modelX = driftX.current + bearingX.current;
      if (reaches && Math.abs(landX - modelX) <= NET_HIT_RADIUS) {
        driftLoop.current?.stop();
        driftLoop.current = null;
        bearingAnim.stopAnimation();
        Animated.timing(netPos.x, { toValue: modelX, duration: 120, useNativeDriver: true }).start(captureModel);
      } else {
        missThrow(reaches ? 'Missed! Aim for the model.' : 'Too weak! Swipe up faster.', landY);
      }
    });
  };

  const throwRef = useRef(throwNet);
  throwRef.current = throwNet;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === 'aiming',
      onMoveShouldSetPanResponder: () => phaseRef.current === 'aiming',
      onPanResponderMove: (_, g) => {
        netPos.setValue({ x: g.dx, y: Math.min(40, g.dy) });
      },
      onPanResponderRelease: (_, g) => throwRef.current(g),
      onPanResponderTerminate: () => {
        Animated.spring(netPos, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    })
  ).current;

  const netVisible = ['aiming', 'flying', 'capturing', 'caught'].includes(catchPhase);
  const netRotate = netSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });
  const netShakeRotate = netShake.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });
  const capturedScale = captureAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      {/* ── Live Camera feed ── */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {arrived ? (
        <>
          <FloatingParticles color={icon.color} />
          <View style={arStyles.bottomVignette} />

          {revealPhase === 'chest' ? (
            <>
              {/* ── Same walking guidance as far away: lime path + turn/distance cards ── */}
              <ARGroundPath relativeBearing={relativeBearing} bottom={PANEL_CLEARANCE} />
              <ARNavCards
                relativeBearing={relativeBearing}
                distanceM={distanceM}
                destination={icon.name}
                hasHeading={deviceHeading !== null}
              />
            </>
          ) : (
            <>
              <View style={arStyles.topGradient} />
              <ARStatusBar color={icon.color} distanceM={distanceM} showArrow={false} accuracy={userLocation?.accuracy} />
            </>
          )}

          {/* ── Close button (below the guidance cards while they show) ── */}
          <TouchableOpacity
            style={[arStyles.closeBtn, revealPhase === 'chest' && { top: 150 }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <View style={arStyles.closeBtnCircle}>
              <Ionicons name="close" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* ── Walking guidance (> 10 m): glass cards, ground path, round buttons ── */}
          <ARGroundPath relativeBearing={relativeBearing} />
          <ARNavCards
            relativeBearing={relativeBearing}
            distanceM={distanceM}
            destination={icon.name}
            hasHeading={deviceHeading !== null}
          />
          <ARRoundButtons buttons={[{ icon: 'close', label: 'Stop catching', onPress: onClose }]} />
        </>
      )}

      {/* ── Celebration Banner & Confetti (after the net catches the model) ── */}
      {catchPhase === 'caught' && (
        <>
          <ConfettiCannon />
          {!celebDismissed && (
            <View style={arStyles.celebrationCenter} pointerEvents="box-none">
              <Animated.View style={{ transform: [{ scale: celebPopAnim }] }}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => setCelebDismissed(true)}>
                  <VintaCard style={arStyles.celebrationCard} contentStyle={arStyles.celebrationInner}>
                    <Text style={arStyles.celebrationKicker}>{ownedAtOpen ? 'You caught it again!' : 'You caught'}</Text>
                    <Text style={arStyles.celebrationName} numberOfLines={2}>{modelTitle}</Text>
                    {!!spot?.location_name && (
                      <Text style={arStyles.celebrationPlace} numberOfLines={1}>{spot.location_name}</Text>
                    )}
                    <View style={arStyles.celebrationDivider} />
                    <Text style={arStyles.celebrationXp}>{ownedAtOpen ? 'Already in your collection' : `+${catchXpFor(spot)} XP`}</Text>
                    <Text style={arStyles.celebrationHint}>Tap to close</Text>
                  </VintaCard>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </>
      )}

      {/* ── Treasure chest (≤ 10m): seen small from afar; tap it within 5m to open ── */}
      {arrived && (
        <TreasureChest
          phase={revealPhase}
          ready={canOpen && modelInView}
          offsetX={bearingAnim}
          sizeScale={distanceScale}
          onOpen={revealPhase === 'chest' && canOpen ? openChest : null}
        />
      )}

      {/* ── Edge pointer when the model is outside the camera view ── */}
      {arrived && !modelInView && catchPhase !== 'caught' && catchPhase !== 'capturing' && (
        <View
          pointerEvents="none"
          style={[arStyles.edgePointer, modelRel < 0 ? { left: 12 } : { right: 12 }]}
        >
          <Ionicons name={modelRel < 0 ? 'chevron-back' : 'chevron-forward'} size={30} color="#fff" />
          <Text style={arStyles.edgePointerText}>{modelRel < 0 ? 'Turn left' : 'Turn right'}</Text>
        </View>
      )}

      {/* ── Floating 3D model, mounted with the chest so it loads while hidden ── */}
      {arrived && (
        <Animated.View
          pointerEvents={revealed && catchPhase === 'idle' ? 'auto' : 'none'}
          style={[
            arStyles.modelWrap,
            {
              opacity: modelRiseAnim.interpolate({ inputRange: [0, 0.25], outputRange: [0, 1], extrapolate: 'clamp' }),
              transform: [
                { translateX: bearingAnim },
                { translateX: driftAnim },
                { translateY: floatAnim },
                { translateY: modelRiseY },
                { scale: modelScale },
                { scale: distanceScale },
                { scale: capturedScale },
              ],
            },
          ]}
        >
          {/* Glow around the model as it comes out of the treasure */}
          <Animated.View
            pointerEvents="none"
            style={[
              arStyles.modelAura,
              { backgroundColor: icon.color + '55', shadowColor: icon.color, transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Animated.View pointerEvents="none" style={[arStyles.modelAuraCore, { transform: [{ scale: pulseAnim }] }]} />
          {activeModel ? (
            <WebView
              source={{ html: buildARViewerHTML(activeModel) }}
              style={arStyles.modelWebview}
              javaScriptEnabled
              originWhitelist={['*']}
              scrollEnabled={false}
              backgroundColor="transparent"
              allowsTransparency
            />
          ) : (
            <View style={[arStyles.modelFallback, { borderColor: icon.color + '66' }]}>
              <Ionicons name="fish" size={72} color={icon.color} style={{ opacity: 0.9 }} />
            </View>
          )}
          <View style={[arStyles.modelGlow, { backgroundColor: icon.color + '30', shadowColor: icon.color }]} />
        </Animated.View>
      )}


      {/* ── Swipe-up zone and the net, above everything but the guide panel (whose buttons must stay tappable) ── */}
      {catchPhase === 'aiming' && <View style={arStyles.throwZone} {...panResponder.panHandlers} />}
      {netVisible && (
        <Animated.View
          pointerEvents="none"
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
          style={[
            arStyles.net,
            {
              opacity: netOpacity,
              transform: [
                { translateX: netPos.x },
                { translateY: netPos.y },
                { scale: netScale },
                { rotate: netRotate },
                { rotate: netShakeRotate },
              ],
            },
          ]}
        >
          <ThrowNet color={icon.color} />
        </Animated.View>
      )}
      {!!throwMsg && (
        <View style={arStyles.throwToast} pointerEvents="none">
          <Text style={arStyles.throwToastText}>{throwMsg}</Text>
        </View>
      )}

      {/* Bottom panel (after arrival): the guide talks the player through each step */}
      {arrived && (() => {
        const leave = (
          <TouchableOpacity onPress={onClose} style={arStyles.guideLink} activeOpacity={0.8}>
            <Text style={arStyles.guideLinkText}>Leave It</Text>
          </TouchableOpacity>
        );
        let guide = null; // { key, text, actions }
        if (revealPhase === 'opening') {
          guide = { key: 'opening', text: 'Here it comes... the treasure is opening!' };
        } else if (!revealed && !canOpen) {
          const more = distanceM !== null ? Math.max(1, Math.round(distanceM - OPEN_RADIUS_METERS)) : null;
          guide = {
            key: 'walk',
            text: more !== null
              ? `A treasure chest! Follow the arrow and walk about ${more}m closer so you can open it.`
              : 'A treasure chest! Follow the arrow and walk closer so you can open it.',
            actions: leave,
          };
        } else if (!revealed) {
          guide = {
            key: 'ready',
            text: "You're close enough! Tap the treasure to open it, or turn your camera away if you're not interested.",
            actions: leave,
          };
        } else if (catchPhase === 'aiming' || catchPhase === 'flying') {
          guide = {
            key: 'aim',
            text: `${icon.name} came out! Swipe up on the net to throw it and catch it.`,
            actions: (
              <TouchableOpacity onPress={cancelAiming} disabled={catchPhase !== 'aiming'} style={arStyles.guideLink} activeOpacity={0.8}>
                <Text style={arStyles.guideLinkText}>Not now</Text>
              </TouchableOpacity>
            ),
          };
        } else if (catchPhase === 'idle') {
          guide = {
            key: 'idle',
            text: ownedAtOpen
              ? `You already have ${icon.name}, but you can try catching it again using the net!`
              : `Try catching ${icon.name} using the net!`,
            actions: (
              <View style={arStyles.catchCard}>
                <Text style={arStyles.catchCardTitle} numberOfLines={1}>Catch {icon.name}</Text>
                <View style={arStyles.choiceRow}>
                  <TouchableOpacity style={arStyles.catchCardLeave} onPress={onClose} activeOpacity={0.85}>
                    <Text style={arStyles.catchCardLeaveText}>Leave It</Text>
                  </TouchableOpacity>
                  <Animated.View style={{ flex: 1, transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity style={[arStyles.continueBtn, { backgroundColor: icon.color }]} onPress={startAiming} activeOpacity={0.85}>
                      <Ionicons name="aperture" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={arStyles.continueBtnText}>Catch It!</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            ),
          };
        } else if (catchPhase === 'capturing') {
          guide = { key: 'capturing', text: 'Got it! Hold on, the net is closing...' };
        }

        if (guide) {
          return (
            <View style={arStyles.guidePanel} pointerEvents="box-none">
              <GuideBubble key={guide.key} size={70} text={guide.text} />
              {guide.actions ? <View style={arStyles.guideActions}>{guide.actions}</View> : null}
            </View>
          );
        }
        return (
          <View style={arStyles.bottomPanel}>
            <Text style={arStyles.catchName}>{icon.name}</Text>
            <Text style={arStyles.catchTagline}>{icon.tagline}</Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
              <TouchableOpacity
                style={[arStyles.continueBtn, { backgroundColor: icon.color }]}
                onPress={onContinue}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={arStyles.continueBtnText}>View Lore</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        );
      })()}

    </Animated.View>
  );
}

// ─── Proximity Alert Sheet ────────────────────────────────────────────────────
function ProximitySheet({ icon, distanceM, isAlreadyCaught, onCatch, onDismiss }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }).start();
  }, []);

  const dismiss = () => {
    Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }).start(onDismiss);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Scrim */}
      <TouchableOpacity style={proximityStyles.scrim} activeOpacity={1} onPress={dismiss} />

      <Animated.View
        style={[
          proximityStyles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <VintaCard sheet contentStyle={[proximityStyles.sheetInner, { paddingBottom: insets.bottom + 20 }]}>
        {/* Drag handle */}
        <View style={proximityStyles.handle} />

        {/* The guide tells the player what is nearby */}
        <GuideBubble
          style={proximityStyles.guide}
          text={isAlreadyCaught
            ? `You already caught ${icon.name}! It's about ${Math.round(distanceM)}m away. Want to see it again in AR?`
            : `${icon.name} is nearby and ready to catch! It's about ${Math.round(distanceM)}m from you. Let's go get it!`}
        />

        <TouchableOpacity
          style={[proximityStyles.catchBtn, { backgroundColor: isAlreadyCaught ? '#059669' : COLORS.accent }]}
          onPress={onCatch}
          activeOpacity={0.85}
        >
          <Ionicons name={isAlreadyCaught ? 'eye' : 'camera'} size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={proximityStyles.catchBtnText}>
            {isAlreadyCaught ? 'View Model in AR' : "Let's Catch It!"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={dismiss} style={proximityStyles.dismissBtn}>
          <Text style={proximityStyles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
        </VintaCard>
      </Animated.View>
    </View>
  );
}

// ─── Main CatchScreen ─────────────────────────────────────────────────────────
export default function CatchScreen({ navigation }) {
  const [icons, setIcons] = useState([]);
  const [catchSpots, setCatchSpots] = useState([]);
  const { notifs, addNotification } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorModal, setErrorModal] = useState({ visible: false, type: 'error', title: '', message: '' });
  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });

  // GPS & proximity
  const [userLocation, setUserLocation] = useState(null);
  const [nearbySpot, setNearbySpot] = useState(null);   // { spot, icon, distanceM }
  const [proximityDismissed, setProximityDismissed] = useState(new Set());
  const locationSub = useRef(null);

  // AR overlay
  const [arVisible, setArVisible] = useState(false);
  const [arIcon, setArIcon] = useState(null);
  const [arSpot, setArSpot] = useState(null);   // spot object for bearing computation
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [collectedModelIds, setCollectedModelIds] = useState(new Set());
  const [caughtIcons, setCaughtIcons] = useState([]);

  // ── Load caught icons & sync with SecureStore ─────────────────────────────
  useFocusEffect(
    useCallback(() => {
      SecureStore.getItemAsync('caught_icons')
        .then(str => {
          if (str) {
            try {
              const arr = JSON.parse(str);
              setCaughtIcons(arr);
              const ids = new Set(arr.map(m => String(m.id || m.name)));
              setCollectedModelIds(ids);
            } catch {}
          }
        })
        .catch(() => {});
    }, [])
  );

  // ── Load spots and icons from API ──────────────────────────────────────────
  useEffect(() => {
    Promise.all([getCatchIcons(), getSpots()])
      .then(([iconData, spotData]) => {
        const iconList = (Array.isArray(iconData) ? iconData : (iconData.results || [])).map(normalizeIcon);
        const spotList = (Array.isArray(spotData) ? spotData : (spotData.results || [])).filter(s => {
          if (!s.latitude || !s.longitude) return false;
          if (Array.isArray(s.feature_types)) {
            return s.feature_types.some(f => f.toLowerCase().includes('catch'));
          } else if (typeof s.feature_types === 'string') {
            return s.feature_types.toLowerCase().includes('catch');
          }
          return false;
        });
        setIcons(iconList);
        setCatchSpots(spotList);
      })
      .catch(() => setError('Could not load catch data.'))
      .finally(() => setLoading(false));
  }, []);

  // ── GPS proximity watcher ───────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 1,
          timeInterval: 1500,
        },
        (loc) => {
          if (!active) return;
          const { latitude, longitude, accuracy } = loc.coords;
          // Discard unreliable fixes — a low-accuracy reading makes the guide arrow
          // point in a random direction (the "17 m away, pointing at my house" bug).
          if (accuracy != null && accuracy > MAX_GPS_ACCURACY_METERS) return;
          setUserLocation(prev => {
            if (!prev) return { lat: latitude, lng: longitude, accuracy: accuracy ?? null };
            // Light low-pass smoothing to damp GPS jitter that spins the arrow while
            // standing still. Weighted toward the new reading so walking still tracks.
            const w = 0.5;
            return {
              lat: prev.lat + w * (latitude - prev.lat),
              lng: prev.lng + w * (longitude - prev.lng),
              accuracy: accuracy ?? prev.accuracy,
            };
          });
        }
      );
    })();
    return () => {
      active = false;
      locationSub.current?.remove();
    };
  }, []);

  // ── Check proximity whenever location or spots change ───────────────────────
  useEffect(() => {
    if (!userLocation || catchSpots.length === 0 || arVisible) return;

    for (const spot of catchSpots) {
      if (proximityDismissed.has(spot.id)) continue;
      const dist = haversineDistance(userLocation.lat, userLocation.lng, spot.latitude, spot.longitude);
      if (dist <= CATCH_RADIUS_METERS) {
        let matchedIcon = null;

        // If the spot has its own model and/or tagline (hook), construct icon from spot
        if (spot.hook || spot.model_3d) {
          matchedIcon = {
            id: 'spot-icon-' + spot.id,
            name: spot.hook || spot.name,
            tagline: spot.hook ? spot.name : (spot.description || ''),
            model_3d: spot.model_3d || (icons[0]?.model_3d ?? null),
            color: '#A855F7',
            glow: 'rgba(168,85,247,0.35)',
            about: spot.description || '',
            significance: spot.cultural_significance || '',
            history: spot.historical_background || '',
            fun_fact: spot.fun_fact || '',
          };
        } else if (icons.length > 0) {
          matchedIcon =
            icons.find(i => spot.name && i.name && spot.name.toLowerCase().includes(i.name.toLowerCase())) ||
            icons.find(i => spot.description && i.name && spot.description.toLowerCase().includes(i.name.toLowerCase())) ||
            icons[0];
        }

        if (matchedIcon) {
          setNearbySpot({ spot, icon: matchedIcon, distanceM: dist });
          return;
        }
      }
    }
    // No spot in range — clear if previously shown
    setNearbySpot(prev => {
      if (!prev) return null;
      const dist = haversineDistance(userLocation.lat, userLocation.lng, prev.spot.latitude, prev.spot.longitude);
      return dist <= CATCH_RADIUS_METERS ? prev : null;
    });
  }, [userLocation, catchSpots, icons, proximityDismissed, arVisible]);

  // ── Open AR camera ──────────────────────────────────────────────────────────
  const openAR = useCallback(async (icon, spot) => {
    try {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          showErr('Camera Required', 'Please allow camera access to use AR catch.', 'warning');
          return;
        }
      }
      setArIcon(icon);
      setArSpot(spot);
      setArVisible(true);
      setNearbySpot(null);
    } catch (e) {
      showErr('Camera Error', e?.message || String(e));
    }
  }, [cameraPermission, requestCameraPermission]);

  const handleProximityDismiss = useCallback(() => {
    if (nearbySpot) {
      setProximityDismissed(prev => new Set([...prev, nearbySpot.spot.id]));
    }
    setNearbySpot(null);
  }, [nearbySpot]);

  const handleModelFound = useCallback(async (iconToSave, spotToSave) => {
    const targetIcon = iconToSave || arIcon;
    const targetSpot = spotToSave || arSpot;
    if (!targetIcon) return;
    try {
      const existingStr = await SecureStore.getItemAsync('caught_icons');
      let caught = existingStr ? JSON.parse(existingStr) : [];
      const alreadyCaught = caught.some(c => 
        String(c.id) === String(targetIcon.id) || 
        (c.name && targetIcon.name && c.name.toLowerCase() === targetIcon.name.toLowerCase()) ||
        (targetSpot && c.name && targetSpot.name && c.name.toLowerCase() === targetSpot.name.toLowerCase())
      );
      if (!alreadyCaught) {
        const rawModel = targetIcon.model_3d || targetSpot?.model_3d || null;
        const catchXp = catchXpFor(targetSpot);
        const newEntry = {
          id: targetIcon.id || (targetSpot ? 'spot-icon-' + targetSpot.id : Date.now()),
          name: targetIcon.name || targetSpot?.name || 'Cultural Model',
          model_3d: resolveModelUrl(rawModel),
          color: targetIcon.color || '#A855F7',
          tagline: targetIcon.tagline || targetSpot?.description || '',
          date_caught: new Date().toISOString(),
        };
        caught.push(newEntry);
        await SecureStore.setItemAsync('caught_icons', JSON.stringify(caught));
        
        setCaughtIcons(caught);
        setCollectedModelIds(new Set(caught.map(m => String(m.id || m.name))));

        try {
          const profile = await authService.getProfile();
          if (profile?.id) {
            await SecureStore.setItemAsync('caught_icons_uid', String(profile.id));
          }
        } catch (_) {}

        try {
          await authService.adjustXP(catchXp);
        } catch (_) {}

        // Log to backend for admin recent activity feed
        logActivity('catch', `caught "${newEntry.name}" in AR`);

        addNotification({
          type: 'catch',
          icon: 'sparkles',
          title: 'Model Caught!',
          sub: `${newEntry.name} caught and added to your Badges collection! +${catchXp} XP`,
        });
      }
    } catch (e) {
      console.warn('[CatchScreen] Failed to auto-save caught icon:', e);
    }
  }, [arIcon, arSpot, addNotification]);

  const handleARContinue = useCallback(async () => {
    setArVisible(false);
    if (arIcon) {
      await handleModelFound(arIcon, arSpot);
      navigation.navigate('CatchDetails', { icon: arIcon, spot: arSpot });
    }
  }, [arIcon, arSpot, navigation, handleModelFound]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const totalCatchIcons = icons.length > 0 ? icons.length : 4;
  const caughtCount = caughtIcons.length;
  const progressPct = totalCatchIcons > 0 ? (caughtCount / totalCatchIcons) * 100 : 0;

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={18} color={COLORS.gold} style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.logoTitle}>LAKBAY</Text>
              <Text style={styles.logoSub}>ZAMBOANGA CITY</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={20} color="#FFF" />
            {notifs.some(n => !n.read) && <View style={styles.unreadBadge} />}
          </TouchableOpacity>
        </View>
        <VintaStripe height={3} />

        {/* ── Sub Header / Tactical HUD ── */}
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.subHeaderTitleWrap}>
            <Ionicons name="trophy" size={13} color={COLORS.gold} />
            <Text style={styles.subHeaderTitle}>COLLECT &amp; WIN</Text>
          </View>
          {/* GPS Status pill */}
          <View style={[styles.gpsPill, userLocation ? styles.gpsPillActive : styles.gpsPillInactive]}>
            <View style={[styles.gpsDot, { backgroundColor: userLocation ? '#22C55E' : '#94A3B8' }]} />
            <Text style={styles.gpsPillText}>
              {userLocation
                ? (userLocation.accuracy ? `GPS ±${Math.round(userLocation.accuracy)}m` : 'GPS LOCKED')
                : 'GPS SEARCHING...'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>Calibrating Cultural GPS Radar…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={44} color="rgba(191,215,255,0.6)" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => {
              setLoading(true); setError(null);
              Promise.all([getCatchIcons(), getSpots()])
                .then(([iconData, spotData]) => {
                  const iconList = (Array.isArray(iconData) ? iconData : (iconData.results || [])).map(normalizeIcon);
                  const spotList = (Array.isArray(spotData) ? spotData : (spotData.results || [])).filter(s => {
                    if (!s.latitude || !s.longitude) return false;
                    if (Array.isArray(s.feature_types)) {
                      return s.feature_types.some(f => f.toLowerCase().includes('catch'));
                    } else if (typeof s.feature_types === 'string') {
                      return s.feature_types.toLowerCase().includes('catch');
                    }
                    return false;
                  });
                  setIcons(iconList);
                  setCatchSpots(spotList);
                })
                .catch(() => setError('Could not load catch data.'))
                .finally(() => setLoading(false));
            }}>
              <Text style={styles.retryText}>RETRY EXPEDITION</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

            {/* ── Mission Proximity Radar Banner ── */}
            <VintaCard style={styles.cardFrame} contentStyle={styles.infoBanner}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="radar-outline" size={20} color={GOLD_TEXT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoBannerEyebrow}>PROXIMITY RADAR ACTIVE</Text>
                <Text style={styles.infoBannerText}>
                  Walk within <Text style={styles.infoBannerBold}>{CATCH_RADIUS_METERS}m</Text> of a landmark to engage AR Catch Mode and collect 3D cultural icons!
                </Text>
              </View>
            </VintaCard>

            {/* ── Collection Progress Card ── */}
            <VintaCard style={styles.cardFrame} contentStyle={styles.progressCard}>
              <View style={styles.progressTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="medal-outline" size={16} color={GOLD_TEXT} />
                  <Text style={styles.progressLabel}>CATCH COLLECTION</Text>
                </View>
                <View style={styles.progressCountBadge}>
                  <Text style={styles.progressCaught}>{caughtCount}</Text>
                  <Text style={styles.progressTotal}> / {totalCatchIcons} ICONS</Text>
                </View>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
              <View style={styles.progressFooter}>
                <Text style={styles.progressSubText}>
                  {caughtCount === totalCatchIcons
                    ? 'Master Collector Trophy Achieved!'
                    : `Collect ${totalCatchIcons - caughtCount} more icons to complete the set (+80 XP each)`}
                </Text>
              </View>
            </VintaCard>

            {/* ── Catch Spots Radar Preview ── */}
            {catchSpots.length > 0 && (
              <VintaCard style={styles.cardFrame} contentStyle={styles.spotsCard}>
                <View style={styles.sectionRow}>
                  <View style={styles.accentBar} />
                  <Text style={styles.sectionTitle}>Nearby Catch Targets</Text>
                </View>

                <View style={{ gap: 10, marginTop: 10 }}>
                  {catchSpots.map(spot => {
                    const dist = userLocation
                      ? haversineDistance(userLocation.lat, userLocation.lng, spot.latitude, spot.longitude)
                      : null;
                    const inRange = dist !== null && dist <= CATCH_RADIUS_METERS;
                    return (
                      <TouchableOpacity 
                        key={spot.id} 
                        style={[styles.spotRow, inRange && styles.spotRowActive]}
                        activeOpacity={inRange ? 0.75 : 1}
                        onPress={() => {
                          if (inRange) {
                            let matchedIcon = null;
                            if (icons.length > 0) {
                              matchedIcon =
                                icons.find(i => spot.name && i.name && spot.name.toLowerCase().includes(i.name.toLowerCase())) ||
                                icons.find(i => spot.description && i.name && spot.description.toLowerCase().includes(i.name.toLowerCase())) ||
                                icons[0];
                            }
                            
                            if (!matchedIcon && spot.model_3d) {
                              matchedIcon = {
                                id: 'spot-icon-' + spot.id,
                                name: spot.name || 'Unknown',
                                model_3d: spot.model_3d,
                                color: '#F59E0B',
                                glow: '#F59E0B55'
                              };
                            }

                            if (matchedIcon) {
                              openAR(matchedIcon, spot);
                            } else {
                              showErr('No Icon', 'Could not load a 3D model for this spot.', 'warning');
                            }
                          }
                        }}
                      >
                        <View style={[styles.spotDotWrap, { backgroundColor: inRange ? 'rgba(34,197,94,0.18)' : COLORS.borderLight }]}>
                          <View style={[styles.spotDot, { backgroundColor: inRange ? '#22C55E' : COLORS.accent }]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.spotName}>{spot.name}</Text>
                          <Text style={styles.spotLoc} numberOfLines={1}>{spot.location_name || 'Zamboanga City'}</Text>
                        </View>
                        {dist !== null && (
                          <Text style={[styles.spotDist, inRange && { color: '#16A34A' }]}>
                            {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
                          </Text>
                        )}
                        {inRange && (
                          <View style={styles.inRangeBadge}>
                            <Text style={styles.inRangeBadgeText}>TAP TO CATCH</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </VintaCard>
            )}

            {/* ── Field Guide / How to Catch ── */}
            <VintaCard style={styles.cardFrame} contentStyle={styles.guideCard}>
              <View style={styles.sectionRow}>
                <View style={[styles.accentBar, { backgroundColor: COLORS.gold }]} />
                <Text style={styles.sectionTitle}>Expedition Protocol</Text>
              </View>
              <Text style={styles.sectionSub}>
                Follow these 4 tactical steps to capture Zamboanga’s rare cultural artifacts.
              </Text>

              <View style={{ gap: 10 }}>
                {[
                  { icon: 'map-outline',      num: '1', color: COLORS.accent, title: 'Locate Target Zones', desc: 'Scan the live map radar to find designated spawn zones.' },
                  { icon: 'walk-outline',     num: '2', color: COLORS.teal,   title: 'Approach Within 30m', desc: 'Navigate until your proximity sensor turns green.' },
                  { icon: 'camera-outline',   num: '3', color: COLORS.gold,   title: 'Engage AR Camera',    desc: 'Align your phone to project and capture the 3D model.' },
                  { icon: 'library-outline',  num: '4', color: '#A855F7',     title: 'Claim Lore & +80 XP', desc: 'Unlock historical background, lore, and collector badges.' },
                ].map((step, idx) => (
                  <View key={idx} style={styles.guideStepRow}>
                    <View style={[styles.guideStepIconWrap, { backgroundColor: step.color + '22', borderColor: step.color + '55' }]}>
                      <Ionicons name={step.icon} size={20} color={onWhite(step.color)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guideStepTitle}>
                        {step.num}. {step.title}
                      </Text>
                      <Text style={styles.guideStepDesc}>
                        {step.desc}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </VintaCard>

          </ScrollView>
        )}

        {/* ── Proximity Bottom Sheet ── */}
        {nearbySpot && (
          <ProximitySheet
            spot={nearbySpot.spot}
            icon={nearbySpot.icon}
            distanceM={nearbySpot.distanceM}
            isAlreadyCaught={
              collectedModelIds.has(String(nearbySpot.spot.id)) ||
              collectedModelIds.has(String(nearbySpot.icon.name)) ||
              collectedModelIds.has(String(nearbySpot.icon.id)) ||
              collectedModelIds.has(String(nearbySpot.spot.name))
            }
            onCatch={() => openAR(nearbySpot.icon, nearbySpot.spot)}
            onDismiss={handleProximityDismiss}
          />
        )}

        {/* ── AR Fullscreen Overlay ── */}
        <Modal visible={arVisible} animationType="fade" statusBarTranslucent onRequestClose={() => setArVisible(false)}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {arIcon && (
              <ARCatchOverlay
                icon={arIcon}
                spot={arSpot}
                userLocation={userLocation}
                alreadyCaught={
                  collectedModelIds.has(String(arIcon.id)) ||
                  collectedModelIds.has(String(arIcon.name)) ||
                  (!!arSpot && (collectedModelIds.has(String(arSpot.id)) || collectedModelIds.has(String(arSpot.name))))
                }
                onModelFound={handleModelFound}
                onContinue={handleARContinue}
                onClose={() => setArVisible(false)}
              />
            )}
          </View>
        </Modal>

        {/* ── Error Modal ── */}
        <ErrorModal
          visible={errorModal.visible}
          type={errorModal.type}
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => setErrorModal(prev => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_OVERLAY,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: 'rgba(8, 20, 60, 0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 179, 237, 0.20)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 22,
  },
  logoSub: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(191,215,255,0.70)',
    letterSpacing: 2,
    marginTop: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.navy,
  },

  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: 'rgba(8, 20, 60, 0.50)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 179, 237, 0.15)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  subHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  gpsPillActive: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderColor: 'rgba(34,197,94,0.45)',
  },
  gpsPillInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  gpsPillText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: 'rgba(191,215,255,0.85)',
    marginTop: 8,
  },
  errorText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: 'rgba(191,215,255,0.75)',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    ...SHADOW.accent,
  },
  retryText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  cardFrame: {
    marginBottom: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  infoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBannerEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: GOLD_TEXT,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoBannerText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSub,
    lineHeight: 18,
  },
  infoBannerBold: {
    fontFamily: FONTS.bold,
    color: COLORS.navy,
  },

  spotsCard: {
    padding: 18,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  spotRowActive: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(34,197,94,0.55)',
  },
  spotDotWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  spotName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.navy,
  },
  spotLoc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  spotDist: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textSub,
  },
  inRangeBadge: {
    backgroundColor: '#22C55E',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inRangeBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  progressCard: {
    padding: 18,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: GOLD_TEXT,
    letterSpacing: 1.5,
  },
  progressCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  progressCaught: {
    fontFamily: FONTS.black,
    fontSize: 14,
    color: GOLD_TEXT,
  },
  progressTotal: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(15,23,42,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 4,
  },
  progressFooter: {
    marginTop: 8,
  },
  progressSubText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
  },

  guideCard: {
    padding: 18,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  accentBar: {
    width: 3,
    height: 18,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.navy,
  },
  sectionSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSub,
    marginBottom: 16,
    lineHeight: 18,
  },
  guideStepRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    gap: 14,
  },
  guideStepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideStepTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.navy,
    marginBottom: 2,
  },
  guideStepDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
});

// ─── Proximity Sheet Styles ───────────────────────────────────────────────────
const proximityStyles = StyleSheet.create({
  guide: { width: '100%', marginTop: 6, marginBottom: 6 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  sheetInner: {
    paddingHorizontal: 24, paddingTop: 12,
    alignItems: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 20 },
  iconRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 8,
  },
  miniWebview: {
    width: 110, height: 110,
    backgroundColor: 'transparent',
  },
  fallbackIconWrap: {
    width: 110, height: 110,
    justifyContent: 'center', alignItems: 'center',
  },
  modelLabel: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  modelLabelText: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.5 },
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginBottom: 16,
  },
  distanceText: { fontFamily: FONTS.bold, fontSize: 12, color: '#16A34A' },
  sheetTitle: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.navy, textAlign: 'center', lineHeight: 34, marginBottom: 6 },
  sheetLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  sheetLocation: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 14 },
  sheetDesc: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  catchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 56, borderRadius: 16,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
    marginBottom: 12,
  },
  catchBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 0.3 },
  dismissBtn: { paddingVertical: 10 },
  dismissText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted },
});

// ─── AR Overlay Styles ────────────────────────────────────────────────────────
const chestStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: CHEST_TOP,
    alignSelf: 'center',
    width: CHEST_W,
    alignItems: 'center',
  },
  body: { width: CHEST_W, alignItems: 'center' },
  beam: {
    position: 'absolute',
    top: CHEST_LID_H - BEAM_H + 8,
    width: CHEST_W * 0.7,
    height: BEAM_H,
  },
  rays: {
    position: 'absolute',
    top: CHEST_LID_H - CHEST_W / 2,
    width: CHEST_W,
    height: CHEST_W,
  },
  glow: {
    position: 'absolute',
    top: CHEST_LID_H - CHEST_W * 0.2,
    width: CHEST_W * 0.4,
    height: CHEST_W * 0.4,
    borderRadius: CHEST_W * 0.2,
    backgroundColor: '#FEF3C7',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 12,
  },
  interior: {
    position: 'absolute',
    top: CHEST_LID_H - 12,
    left: 8,
    right: 8,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#FFE7A3',
  },
  lid: {
    width: CHEST_W,
    height: CHEST_LID_H,
    marginBottom: -2,
    transformOrigin: 'bottom',
    zIndex: 2,
  },
  lock: {
    position: 'absolute',
    top: CHEST_LID_H - LOCK_H * 0.42,
    left: CHEST_W / 2 - LOCK_W / 2,
    zIndex: 3,
  },
  halo: {
    position: 'absolute',
    top: -CHEST_W * 0.1,
    width: CHEST_W * 1.2,
    height: CHEST_W * 1.2,
    borderRadius: CHEST_W * 0.6,
    borderWidth: 3,
    borderColor: '#FDE68A',
  },
});

const arStyles = StyleSheet.create({
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  bottomVignette: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.38,
    backgroundColor: 'rgba(0,0,0,0.18)',
    pointerEvents: 'none',
  },
  closeBtn: { position: 'absolute', top: 52, right: 20, zIndex: 10 },
  closeBtnCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  topLabel: { position: 'absolute', top: 52, left: 20, right: 70, zIndex: 10 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  typeBadgeText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1 },
  arTitle: { fontFamily: FONTS.bold, fontSize: 22, color: '#FFF', marginBottom: 4 },
  arSubtitle: { fontFamily: FONTS.regular, fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  edgePointer: {
    position: 'absolute',
    top: H * 0.22 + W * 0.3,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  edgePointerText: { fontFamily: FONTS.bold, fontSize: 11, color: '#fff', marginTop: 2 },
  modelWrap: {
    position: 'absolute',
    top: H * 0.22,
    alignSelf: 'center',
    width: W * 0.75,
    height: W * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelWebview: {
    width: W * 0.75,
    height: W * 0.75,
    backgroundColor: 'transparent',
  },
  modelFallback: {
    width: W * 0.6,
    height: W * 0.6,
    borderRadius: W * 0.3,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modelAura: {
    position: 'absolute',
    width: W * 0.55,
    height: W * 0.55,
    borderRadius: W * 0.275,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 10,
  },
  modelAuraCore: {
    position: 'absolute',
    width: W * 0.3,
    height: W * 0.3,
    borderRadius: W * 0.15,
    backgroundColor: 'rgba(255,244,194,0.55)',
  },
  guidePanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 30,
  },
  guideActions: { alignItems: 'center', marginTop: 6 },
  catchCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  catchCardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.navy, textAlign: 'center' },
  catchCardLeave: {
    paddingHorizontal: 18, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  catchCardLeaveText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.navy },
  guideLink: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  guideLinkText: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFFFFF' },
  promptTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#FDE68A', textAlign: 'center' },
  promptSub: { fontFamily: FONTS.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  modelGlow: {
    position: 'absolute',
    bottom: -20,
    width: W * 0.45,
    height: 30,
    borderRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },

  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 44,
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  catchName: { fontFamily: FONTS.bold, fontSize: 22, color: '#FFF', marginBottom: 6 },
  catchTagline: { fontFamily: FONTS.regular, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 22, textAlign: 'center' },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  continueBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFF', letterSpacing: 0.3 },
  choiceRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 },
  leaveBtn: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  leaveBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFF' },
  cancelThrow: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 4 },
  cancelThrowText: { fontFamily: FONTS.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' },
  throwZone: { position: 'absolute', left: 0, right: 0, top: H * 0.4, bottom: 0 },
  net: { position: 'absolute', left: W / 2 - NET_SIZE / 2, top: NET_TOP, width: NET_SIZE, height: NET_SIZE },
  throwToast: {
    position: 'absolute', top: NET_TOP - 56, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  throwToastText: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFF' },
  celebrationCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
  },
  celebrationCard: {
    width: W * 0.62,
  },
  celebrationInner: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  celebrationKicker: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  celebrationName: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    lineHeight: 26,
    color: COLORS.navy,
    textAlign: 'center',
    marginTop: 2,
  },
  celebrationPlace: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  celebrationDivider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  celebrationXp: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: GOLD_TEXT,
  },
  celebrationHint: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});

// ─── AR HUD Styles ────────────────────────────────────────────────────────────
const arHudStyles = StyleSheet.create({
  // Vertical scanning line
  scanLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    borderTopWidth: 1.5,
    opacity: 0.65,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 5,
  },

  // Corner brackets wrapper — fills the entire screen so corners snap to edges
  bracketsWrap: {
    zIndex: 6,
    justifyContent: 'space-between',
  },
  corner: {
    position: 'absolute',
    width: 36, height: 36,
    borderWidth: 0,
  },
  cornerTL: {
    top: H * 0.12, left: 20,
    borderTopWidth: 3, borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: H * 0.12, right: 20,
    borderTopWidth: 3, borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: H * 0.25, left: 20,
    borderBottomWidth: 3, borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: H * 0.25, right: 20,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },

  // Radar ring (used inside DirectionArrow container)
  radarRing: {
    position: 'absolute',
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },

  // Floating particle dot
  particle: {
    position: 'absolute',
    zIndex: 4,
  },

  // Live AR status bar (top-right corner)
  statusBar: {
    position: 'absolute',
    top: 56,
    right: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 12,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 1 },
  statusSub: { fontFamily: FONTS.medium, fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  statusDivider: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },
});
