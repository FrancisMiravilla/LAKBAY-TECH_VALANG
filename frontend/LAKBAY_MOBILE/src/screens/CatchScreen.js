import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ScrollView, ActivityIndicator,
  Animated, Dimensions, Modal, Platform, ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import { useApp } from '../context/AppContext';
import { getCatchIcons, getSpots, ORIGIN } from '../api/qrService';
import { authService } from '../api/authService';
import ErrorModal from '../components/ErrorModal';
import VintaStripe from '../components/VintaStripe';
import { Svg, Polygon, Path, Circle, G, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────
const CATCH_RADIUS_METERS = 50;      // proximity sheet unlocks within 50 m of a spot
const ARRIVE_RADIUS_METERS = 10;     // reveal the 3D model when within 10 m
const MAX_GPS_ACCURACY_METERS = 50;  // ignore GPS fixes less precise than this (they point the arrow randomly)
const FALLBACK_COLORS = ['#E91E8C', '#38BDF8', '#FBBF24', '#10B981'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Mini 3D model HTML for ProximitySheet ────────────────────────────────────
function buildMiniViewerHTML(modelUrl, color) {
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
    rotation-per-second="30deg"
    camera-orbit="0deg 80deg auto"
    exposure="1.2"
    shadow-intensity="0"
    style="width:100%;height:100%;background:transparent;"
    camera-controls="false"
    interaction-prompt="none"
  ></model-viewer>
</body>
</html>`;
}

// ─── AR HUD: Scanning Line ────────────────────────────────────────────────────
function ScanLine({ color }) {
  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.72] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        arHudStyles.scanLine,
        { borderColor: color, shadowColor: color, transform: [{ translateY }] },
      ]}
    />
  );
}

// ─── AR HUD: Corner Brackets ──────────────────────────────────────────────────
function CornerBrackets({ color }) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.88, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const c = color;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, arHudStyles.bracketsWrap, { transform: [{ scale: scaleAnim }] }]}
    >
      {/* Top-left */}
      <View style={[arHudStyles.corner, arHudStyles.cornerTL, { borderColor: c }]} />
      {/* Top-right */}
      <View style={[arHudStyles.corner, arHudStyles.cornerTR, { borderColor: c }]} />
      {/* Bottom-left */}
      <View style={[arHudStyles.corner, arHudStyles.cornerBL, { borderColor: c }]} />
      {/* Bottom-right */}
      <View style={[arHudStyles.corner, arHudStyles.cornerBR, { borderColor: c }]} />
    </Animated.View>
  );
}

// ─── AR HUD: Radar Rings ─────────────────────────────────────────────────────
function RadarRing({ color, delay = 0 }) {
  const ringAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const start = () =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(ringAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    start();
  }, []);
  const scale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.2] });
  const opacity = ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 0.4, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        arHudStyles.radarRing,
        { borderColor: color, opacity, transform: [{ scale }] },
      ]}
    />
  );
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
      {PARTICLES.map((p, i) => {
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
            key={i}
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
      })}
    </>
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

// ─── AR Direction Arrow ───────────────────────────────────────────────────────
/**
 * relativeBearing: angle in degrees where
 *   0  = target is straight ahead (camera facing it)
 *   90 = target is to the right
 *   180 = target is behind
 *   270 = target is to the left
 * The arrow always points UP at 0°, so rotating by relativeBearing
 * makes it point toward the target relative to where the camera is aimed.
 */
// ─── AR Direction Arrow (Cyber-Holographic 3D) ───────────────────────────────
function DirectionArrow({ relativeBearing, distanceM, color = '#10B981', deviceHeading, targetBearing }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const spinAnim   = useRef(new Animated.Value(0)).current;
  const rotAnim    = useRef(new Animated.Value(relativeBearing)).current;
  const prevRel    = useRef(relativeBearing);

  useEffect(() => {
    // Floating bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 1200, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0,   duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Trailing chevrons cascade
    Animated.loop(
      Animated.sequence([
        Animated.timing(chevronAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(chevronAnim, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    ).start();

    // Reticle slow spin
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 20000, useNativeDriver: true })
    ).start();
  }, []);

  // Smooth shortest-arc rotation
  useEffect(() => {
    let delta = relativeBearing - prevRel.current;
    if (delta > 180)  delta -= 360;
    if (delta < -180) delta += 360;
    const next = prevRel.current + delta;
    prevRel.current = next;
    Animated.timing(rotAnim, { toValue: next, duration: 140, useNativeDriver: true }).start();
  }, [relativeBearing]);

  const rotation = rotAnim.interpolate({
    inputRange: [-360, 0, 360, 720],
    outputRange: ['-360deg', '0deg', '360deg', '720deg'],
    extrapolate: 'extend',
  });

  const reticleSpin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isAligned = relativeBearing < 22 || relativeBearing > 338;
  const isTurnLeft = relativeBearing >= 180 && relativeBearing <= 338;
  const turnDeg = isTurnLeft ? Math.round(360 - relativeBearing) : Math.round(relativeBearing);

  // Dynamic Theme Colors
  const mainColor  = isAligned ? '#10B981' : (color || '#1A56DB');
  const glowColor  = isAligned ? '#34D399' : '#60A5FA';
  const shadeColor = isAligned ? '#065F46' : '#1E3A8A';
  const darkCore   = isAligned ? '#022C22' : '#0F172A';

  const ch1Opacity = chevronAnim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [0.2, 0.9, 0.4, 0.1] });
  const ch2Opacity = chevronAnim.interpolate({ inputRange: [0, 0.2, 0.6, 1], outputRange: [0.1, 0.3, 0.9, 0.2] });
  const ch1Translate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const ch2Translate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <View style={arrowStyles.container}>
      {/* ── Reticle HUD Base (on ground plane) ── */}
      <View style={arrowStyles.reticleBase}>
        <RadarRing color={mainColor} delay={0} />
        <RadarRing color={mainColor} delay={1000} />

        <Animated.View style={[arrowStyles.reticleSvgWrap, { transform: [{ rotate: reticleSpin }] }]}>
          <Svg width="180" height="180" viewBox="0 0 200 200">
            {/* Outer segmented ring */}
            <Circle
              cx="100" cy="100" r="92"
              fill="none"
              stroke={mainColor}
              strokeWidth="1.5"
              strokeDasharray="10 8"
              opacity="0.4"
            />
            {/* Secondary thin ring */}
            <Circle
              cx="100" cy="100" r="76"
              fill="none"
              stroke="#FFF"
              strokeWidth="1"
              strokeDasharray="4 6"
              opacity="0.25"
            />
            {/* Inner target ring */}
            <Circle
              cx="100" cy="100" r="50"
              fill="none"
              stroke={mainColor}
              strokeWidth="1.2"
              opacity="0.35"
            />
            {/* Crosshair ticks */}
            <Line x1="100" y1="4" x2="100" y2="18" stroke={mainColor} strokeWidth="3" opacity="0.8" />
            <Line x1="100" y1="182" x2="100" y2="196" stroke={mainColor} strokeWidth="2" opacity="0.5" />
            <Line x1="4" y1="100" x2="18" y2="100" stroke={mainColor} strokeWidth="2" opacity="0.5" />
            <Line x1="182" y1="100" x2="196" y2="100" stroke={mainColor} strokeWidth="2" opacity="0.5" />
          </Svg>
        </Animated.View>
      </View>

      {/* ── 3D Isometric Hologram Arrow (Hovering above reticle) ── */}
      <Animated.View style={[arrowStyles.arrow3DStage, { transform: [{ translateY: bounceAnim }] }]}>
        <Animated.View style={[arrowStyles.arrowRotator, { transform: [{ rotateX: '55deg' }, { rotateZ: rotation }] }]}>
          {/* Depth / Shadow Extrusion Layers */}
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                arrowStyles.depthLayer,
                {
                  top: (i + 1) * 3,
                  opacity: (6 - i) * 0.15,
                }
              ]}
            >
              <Svg width="140" height="140" viewBox="0 0 140 140">
                <Path
                  d="M 70,12 L 20,86 L 46,74 L 70,98 L 94,74 L 120,86 Z"
                  fill={shadeColor}
                  stroke={darkCore}
                  strokeWidth="1.5"
                />
              </Svg>
            </View>
          ))}

          {/* Main Glowing 3D Crystal Arrow Face */}
          <Svg width="140" height="140" viewBox="0 0 140 140" style={arrowStyles.mainArrowSvg}>
            <Defs>
              <LinearGradient id="leftFacetCatch" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <Stop offset="30%" stopColor={glowColor} stopOpacity="0.9" />
                <Stop offset="100%" stopColor={mainColor} stopOpacity="0.8" />
              </LinearGradient>
              <LinearGradient id="rightFacetCatch" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={glowColor} stopOpacity="0.8" />
                <Stop offset="70%" stopColor={shadeColor} stopOpacity="0.9" />
                <Stop offset="100%" stopColor={darkCore} stopOpacity="0.95" />
              </LinearGradient>
              <LinearGradient id="coreGlowCatch" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="100%" stopColor={mainColor} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Left Facet */}
            <Path
              d="M 70,12 L 20,86 L 46,74 L 70,98 Z"
              fill="url(#leftFacetCatch)"
              stroke={mainColor}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Right Facet */}
            <Path
              d="M 70,12 L 120,86 L 94,74 L 70,98 Z"
              fill="url(#rightFacetCatch)"
              stroke={mainColor}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Glowing Spine */}
            <Line
              x1="70" y1="14" x2="70" y2="96"
              stroke="url(#coreGlowCatch)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Tip Energy Beacon */}
            <Circle cx="70" cy="14" r="4.5" fill="#FFFFFF" />
            <Circle cx="70" cy="14" r="8" fill="none" stroke={glowColor} strokeWidth="1.5" opacity="0.8" />
          </Svg>

          {/* Trailing Speed Chevrons */}
          <Animated.View style={[arrowStyles.chevronWrap, { opacity: ch1Opacity, transform: [{ translateY: ch1Translate }] }]}>
            <Svg width="140" height="140" viewBox="0 0 140 140">
              <Path
                d="M 38,98 L 70,82 L 102,98 L 70,90 Z"
                fill={glowColor}
                opacity="0.85"
              />
            </Svg>
          </Animated.View>

          <Animated.View style={[arrowStyles.chevronWrap, { opacity: ch2Opacity, transform: [{ translateY: ch2Translate }] }]}>
            <Svg width="140" height="140" viewBox="0 0 140 140">
              <Path
                d="M 46,112 L 70,98 L 94,112 L 70,105 Z"
                fill={mainColor}
                opacity="0.6"
              />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* ── Status HUD Badge ── */}
      {isAligned ? (
        <View style={[arrowStyles.statusBadge, { backgroundColor: 'rgba(16,185,129,0.22)', borderColor: '#10B981' }]}>
          <View style={arrowStyles.lockIcon}>
            <Ionicons name="scan-circle" size={14} color="#10B981" />
          </View>
          <Text style={[arrowStyles.statusBadgeText, { color: '#10B981' }]}>TARGET LOCKED</Text>
          <View style={arrowStyles.lockDot} />
        </View>
      ) : (
        <View style={[arrowStyles.turnBadge, { backgroundColor: 'rgba(6, 14, 42, 0.85)', borderColor: 'rgba(255,255,255,0.25)' }]}>
          <Ionicons
            name={isTurnLeft ? 'arrow-undo' : 'arrow-redo'}
            size={13}
            color={mainColor}
            style={{ marginRight: 5 }}
          />
          <Text style={arrowStyles.turnText}>
            {isTurnLeft ? `TURN LEFT ${turnDeg}°` : `TURN RIGHT ${turnDeg}°`}
          </Text>
        </View>
      )}

      {/* ── Distance & Bearing Info Pill ── */}
      <View style={arrowStyles.infoRow}>
        <View style={[arrowStyles.distPill, { backgroundColor: 'rgba(6, 14, 42, 0.88)', borderColor: mainColor + '66' }]}>
          <View style={[arrowStyles.distIconBox, { backgroundColor: mainColor + '22' }]}>
            <Ionicons name="walk" size={13} color={mainColor} />
          </View>
          <Text style={[arrowStyles.distValText, { color: '#FFFFFF' }]}>
            {distanceM !== null
              ? (distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${Math.round(distanceM)}m`)
              : '---'}
          </Text>
          <Text style={arrowStyles.distSubText}>REMAINING</Text>
        </View>

        {deviceHeading !== null && (
          <View style={[arrowStyles.headingPill, { backgroundColor: 'rgba(6, 14, 42, 0.88)', borderColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="compass" size={13} color={mainColor} style={{ marginRight: 4 }} />
            <Text style={arrowStyles.headingText}>{Math.round(targetBearing)}°</Text>
            <Text style={arrowStyles.bearingSub}>BRG</Text>
          </View>
        )}
      </View>
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

// ─── AR Camera Overlay ───────────────────────────────────────────────────────
function ARCatchOverlay({ icon, spot, userLocation, onContinue, onClose }) {
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
          setDeviceHeading(h);
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

  const arriveThreshold = ARRIVE_RADIUS_METERS; // 10m
  const showArrow = distanceM !== null && distanceM > arriveThreshold;

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

  useEffect(() => {
    if (!showArrow) {
      Animated.spring(celebPopAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [showArrow]);

  const modelTitle = icon.name || spot?.name || 'Cultural Model';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      {/* ── Live Camera feed ── */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* ── HUD: Scanning line ── */}
      <ScanLine color={icon.color} />

      {/* ── HUD: Corner brackets ── */}
      <CornerBrackets color={icon.color} />

      {/* ── HUD: Floating ambient particles ── */}
      <FloatingParticles color={icon.color} />

      {/* ── Dark vignette top ── */}
      <View style={arStyles.topGradient} />
      {!showArrow && <View style={arStyles.bottomVignette} />}

      {/* ── HUD: Live status bar ── */}
      <ARStatusBar color={icon.color} distanceM={distanceM} showArrow={showArrow} accuracy={userLocation?.accuracy} />

      {/* ── Close button ── */}
      <TouchableOpacity style={arStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
        <View style={arStyles.closeBtnCircle}>
          <Ionicons name="close" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* ── Top label (when guiding) ── */}
      {showArrow && (
        <View style={arStyles.topLabel}>
          <View style={[arStyles.typeBadge, { backgroundColor: icon.color + '33', borderColor: icon.color + '88' }]}>
            <Ionicons name="locate-outline" size={11} color={icon.color} style={{ marginRight: 5 }} />
            <Text style={[arStyles.typeBadgeText, { color: icon.color }]}>CATCH ZONE ACTIVE</Text>
          </View>
          <Text style={arStyles.arTitle}>{icon.name}</Text>
          <Text style={arStyles.arSubtitle}>
            Follow the arrow to find the model!
          </Text>
        </View>
      )}

      {/* ── Directional Path Arrow (only when distance > 10m) ── */}
      {showArrow && (
        <DirectionArrow
          relativeBearing={relativeBearing}
          targetBearing={targetBearing}
          deviceHeading={deviceHeading}
          distanceM={distanceM}
          color={icon.color}
        />
      )}

      {/* ── Celebration Banner & Confetti (when model reached ≤ 10m) ── */}
      {!showArrow && (
        <>
          <ConfettiCannon />
          <Animated.View style={[arStyles.celebrationCard, { transform: [{ scale: celebPopAnim }] }]}>
            <View style={arStyles.celebrationGlow} />
            <View style={arStyles.celebrationHeader}>
              <Ionicons name="sparkles" size={15} color="#FBBF24" />
              <Text style={arStyles.celebrationKicker}>MODEL FOUND!</Text>
              <Ionicons name="sparkles" size={15} color="#FBBF24" />
            </View>
            <Text style={arStyles.celebrationCongrats}>CONGRATS!</Text>
            <Text style={arStyles.celebrationTitle}>
              You have caught <Text style={arStyles.celebrationSpotName}>"{modelTitle}"</Text>
            </Text>
            <View style={arStyles.celebrationXpPill}>
              <Ionicons name="flash" size={12} color="#FBBF24" />
              <Text style={arStyles.celebrationXpText}>+150 XP DISCOVERY BONUS</Text>
            </View>
          </Animated.View>
        </>
      )}

      {/* ── Floating 3D model (when ≤ 10m) ── */}
      {!showArrow && (
        <Animated.View style={[arStyles.modelWrap, { transform: [{ translateY: floatAnim }] }]}>
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

      {/* Bottom panel */}
      <View style={arStyles.bottomPanel}>
        <Text style={arStyles.catchName}>{icon.name}</Text>
        <Text style={arStyles.catchTagline}>{icon.tagline}</Text>

        {showArrow ? (
          /* When guiding: show a "navigate" hint */
          <View style={[arStyles.navigateHint, { borderColor: icon.color + '55', backgroundColor: icon.color + '15' }]}>
            <Ionicons name="compass-outline" size={18} color={icon.color} style={{ marginRight: 8 }} />
            <Text style={[arStyles.navigateHintText, { color: icon.color }]}>
              Walk toward the arrow · {Math.round(distanceM)}m remaining
            </Text>
          </View>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
            <TouchableOpacity
              style={[arStyles.continueBtn, { backgroundColor: icon.color }]}
              onPress={onContinue}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={arStyles.continueBtnText}>Catch & View Lore</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Proximity Alert Sheet ────────────────────────────────────────────────────
function ProximitySheet({ spot, icon, distanceM, isAlreadyCaught, onCatch, onDismiss }) {
  const activeModel = (spot && spot.model_3d) 
    ? (spot.model_3d.startsWith('http') || spot.model_3d.startsWith('data:') ? spot.model_3d : `${ORIGIN}${spot.model_3d}`) 
    : icon.model_3d;

  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }).start();
    // Gentle shake on icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 6, duration: 120, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 120, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 3, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    ).start();
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
          { paddingBottom: insets.bottom + 20, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Drag handle */}
        <View style={proximityStyles.handle} />

        {/* ── Model Preview Ring (replaces generic fish icon) ── */}
        <Animated.View
          style={[
            proximityStyles.iconRing,
            {
              borderColor: icon.color + '99',
              backgroundColor: icon.color + '18',
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          {activeModel ? (
            /* Show mini spinning 3D model */
            <WebView
              source={{ html: buildMiniViewerHTML(activeModel, icon.color) }}
              style={proximityStyles.miniWebview}
              javaScriptEnabled
              originWhitelist={['*']}
              scrollEnabled={false}
              backgroundColor="transparent"
              allowsTransparency
              pointerEvents="none"
            />
          ) : (
            /* Fallback: use a styled emoji or fish icon */
            <View style={proximityStyles.fallbackIconWrap}>
              <Text style={proximityStyles.fallbackEmoji}>🐟</Text>
            </View>
          )}
        </Animated.View>

        {/* Glowing label under the model preview */}
        <View style={[proximityStyles.modelLabel, { backgroundColor: isAlreadyCaught ? 'rgba(16,185,129,0.15)' : icon.color + '20', borderColor: isAlreadyCaught ? '#10B981' : icon.color + '44' }]}>
          <Ionicons name={isAlreadyCaught ? 'checkmark-circle' : 'cube-outline'} size={10} color={isAlreadyCaught ? '#10B981' : icon.color} style={{ marginRight: 4 }} />
          <Text style={[proximityStyles.modelLabelText, { color: isAlreadyCaught ? '#10B981' : icon.color }]}>
            {isAlreadyCaught ? 'ALREADY CAUGHT' : `${icon.name} · 3D Model`}
          </Text>
        </View>

        {/* Distance badge */}
        <View style={[proximityStyles.distanceBadge, { backgroundColor: '#22C55E22', borderColor: '#22C55E88' }]}>
          <Ionicons name="location" size={12} color="#22C55E" style={{ marginRight: 4 }} />
          <Text style={proximityStyles.distanceText}>{Math.round(distanceM)}m away</Text>
        </View>

        <Text style={proximityStyles.sheetTitle}>
          {isAlreadyCaught ? `${icon.name}\nAlready Caught!` : `${icon.name} is\nnearby!`}
        </Text>
        <Text style={proximityStyles.sheetLocation}>📍 {spot.location_name || spot.name}</Text>
        <Text style={proximityStyles.sheetDesc}>
          {isAlreadyCaught
            ? "You have already caught and mastered this cultural model in your Journey collection. You can still inspect it in AR anytime."
            : "You're close enough to catch this cultural icon. Open your camera and experience it in AR!"}
        </Text>

        <TouchableOpacity
          style={[proximityStyles.catchBtn, { backgroundColor: isAlreadyCaught ? '#10B981' : icon.color }]}
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

  // ── Load data & collected models ───────────────────────────────────────────
  useEffect(() => {
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

  const handleARContinue = useCallback(async () => {
    setArVisible(false);
    if (arIcon) {
      // Save caught icon to SecureStore so BadgesScreen can show it in Collection
      try {
        const existingStr = await SecureStore.getItemAsync('caught_icons');
        let caught = existingStr ? JSON.parse(existingStr) : [];
        const alreadyCaught = caught.some(c => String(c.id) === String(arIcon.id));
        if (!alreadyCaught) {
          caught.push({
            id: arIcon.id,
            name: arIcon.name,
            model_3d: arIcon.model_3d || null,
            color: arIcon.color || '#A855F7',
            tagline: arIcon.tagline || '',
          });
          await SecureStore.setItemAsync('caught_icons', JSON.stringify(caught));
          // Tag the cache with the current user's ID so stale data from other users is ignored
          try {
            const profile = await authService.getProfile();
            if (profile?.id) {
              await SecureStore.setItemAsync('caught_icons_uid', String(profile.id));
            }
          } catch (_) {}
        }
      } catch (e) {
        console.warn('[CatchScreen] Failed to save caught icon:', e);
      }

      addNotification({
        type: 'catch',
        icon: '✨',
        title: 'Catch Complete!',
        sub: `${arIcon.name} captured successfully — +80 XP`,
      });
      navigation.navigate('CatchDetails', { icon: arIcon, spot: arSpot });
    }
  }, [arIcon, arSpot, navigation, addNotification]);

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
            <View style={styles.infoBanner}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="radar-outline" size={20} color={COLORS.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoBannerEyebrow}>PROXIMITY RADAR ACTIVE</Text>
                <Text style={styles.infoBannerText}>
                  Walk within <Text style={styles.infoBannerBold}>{CATCH_RADIUS_METERS}m</Text> of a landmark to engage AR Catch Mode and collect 3D cultural icons!
                </Text>
              </View>
            </View>

            {/* ── Collection Progress Card ── */}
            <View style={styles.progressCard}>
              <View style={styles.progressTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="medal-outline" size={16} color={COLORS.gold} />
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
                    ? '🎉 Master Collector Trophy Achieved!'
                    : `Collect ${totalCatchIcons - caughtCount} more icons to complete the set (+80 XP each)`}
                </Text>
              </View>
            </View>

            {/* ── Catch Spots Radar Preview ── */}
            {catchSpots.length > 0 && (
              <View style={styles.spotsCard}>
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
                        <View style={[styles.spotDotWrap, { backgroundColor: inRange ? 'rgba(34,197,94,0.20)' : 'rgba(255,255,255,0.06)' }]}>
                          <View style={[styles.spotDot, { backgroundColor: inRange ? '#22C55E' : COLORS.accent }]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.spotName}>{spot.name}</Text>
                          <Text style={styles.spotLoc} numberOfLines={1}>{spot.location_name || 'Zamboanga City'}</Text>
                        </View>
                        {dist !== null && (
                          <Text style={[styles.spotDist, inRange && { color: '#22C55E' }]}>
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
              </View>
            )}

            {/* ── Field Guide / How to Catch ── */}
            <View style={styles.guideCard}>
              <View style={styles.sectionRow}>
                <View style={[styles.accentBar, { backgroundColor: COLORS.gold }]} />
                <Text style={styles.sectionTitle}>Expedition Protocol</Text>
              </View>
              <Text style={styles.sectionSub}>
                Follow these 4 tactical steps to capture Zamboanga's rare cultural artifacts.
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
                      <Ionicons name={step.icon} size={20} color={step.color} />
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
            </View>

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
    backgroundColor: 'rgba(4, 10, 38, 0.85)',
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
    fontFamily: FONTS.pixel,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 18,
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
    fontFamily: FONTS.pixel,
    fontSize: 10,
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

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 20, 60, 0.62)',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    gap: 14,
    ...SHADOW.accent,
  },
  infoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBannerEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoBannerText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191,215,255,0.85)',
    lineHeight: 18,
  },
  infoBannerBold: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },

  spotsCard: {
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    padding: 18,
    marginBottom: 16,
    ...SHADOW.accent,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.15)',
  },
  spotRowActive: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: 'rgba(34,197,94,0.45)',
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
    fontSize: 13,
    color: '#FFFFFF',
  },
  spotLoc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(191,215,255,0.70)',
    marginTop: 2,
  },
  spotDist: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: 'rgba(191,215,255,0.75)',
  },
  inRangeBadge: {
    backgroundColor: '#22C55E',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inRangeBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#08143C',
    letterSpacing: 0.5,
  },

  progressCard: {
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    ...SHADOW.accent,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 1.5,
  },
  progressCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  progressCaught: {
    fontFamily: FONTS.black,
    fontSize: 12,
    color: COLORS.gold,
  },
  progressTotal: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.70)',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    fontSize: 11,
    color: 'rgba(191,215,255,0.75)',
  },

  guideCard: {
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    ...SHADOW.accent,
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
    fontSize: 15,
    color: '#FFFFFF',
  },
  sectionSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191,215,255,0.75)',
    marginBottom: 16,
    lineHeight: 18,
  },
  guideStepRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.15)',
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
    fontSize: 13,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  guideStepDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(191,215,255,0.70)',
    lineHeight: 16,
  },
});

// ─── Proximity Sheet Styles ───────────────────────────────────────────────────
const proximityStyles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 20 },
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
  fallbackEmoji: { fontSize: 52 },
  modelLabel: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  modelLabelText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginBottom: 16,
  },
  distanceText: { fontFamily: FONTS.bold, fontSize: 12, color: '#22C55E' },
  sheetTitle: { fontFamily: FONTS.bold, fontSize: 26, color: '#FFF', textAlign: 'center', lineHeight: 34, marginBottom: 6 },
  sheetLocation: { fontFamily: FONTS.medium, fontSize: 13, color: '#94A3B8', marginBottom: 14 },
  sheetDesc: { fontFamily: FONTS.regular, fontSize: 13, color: '#CBD5E1', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  catchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 56, borderRadius: 16,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
    marginBottom: 12,
  },
  catchBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 0.3 },
  dismissBtn: { paddingVertical: 10 },
  dismissText: { fontFamily: FONTS.medium, fontSize: 14, color: '#64748B' },
});

// ─── AR Overlay Styles ────────────────────────────────────────────────────────
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
  celebrationCard: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 70,
    backgroundColor: 'rgba(8, 20, 56, 0.94)',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.65)',
    zIndex: 25,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  celebrationGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FBBF24',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  celebrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  celebrationKicker: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FBBF24',
    letterSpacing: 1.5,
  },
  celebrationCongrats: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  celebrationTitle: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 2,
    lineHeight: 18,
  },
  celebrationSpotName: {
    fontFamily: FONTS.bold,
    color: '#FBBF24',
  },
  celebrationXpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
    marginTop: 8,
  },
  celebrationXpText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FBBF24',
    letterSpacing: 1,
  },
});

// ─── Direction Arrow Styles ───────────────────────────────────────────────────
const arrowStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: H * 0.22,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    width: 260,
    height: 280,
  },
  reticleBase: {
    position: 'absolute',
    top: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
    transform: [{ rotateX: '65deg' }],
  },
  reticleSvgWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow3DStage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 150,
  },
  arrowRotator: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depthLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainArrowSvg: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },
  chevronWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    marginTop: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  lockIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  turnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    marginTop: 10,
  },
  turnText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#E2E8F0',
    letterSpacing: 1.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  distPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    gap: 6,
  },
  distIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distValText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  distSubText: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: '#94A3B8',
    letterSpacing: 1,
  },
  headingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    gap: 4,
  },
  headingText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#FFF',
  },
  bearingSub: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: '#94A3B8',
    letterSpacing: 0.5,
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
