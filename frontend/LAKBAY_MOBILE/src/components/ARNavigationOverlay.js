import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Polygon, Path, Circle, G, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { ORIGIN } from '../api/qrService';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
const FALLBACK_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];


const { width: W, height: H } = Dimensions.get('window');
const ARRIVE_RADIUS_METERS = 10;

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
      {PARTICLES.map((p, i) => (
        <Particle key={i} p={p} color={color} />
      ))}
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
        {/* Sonar pulses */}
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
              <LinearGradient id="leftFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <Stop offset="30%" stopColor={glowColor} stopOpacity="0.9" />
                <Stop offset="100%" stopColor={mainColor} stopOpacity="0.8" />
              </LinearGradient>
              <LinearGradient id="rightFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={glowColor} stopOpacity="0.8" />
                <Stop offset="70%" stopColor={shadeColor} stopOpacity="0.9" />
                <Stop offset="100%" stopColor={darkCore} stopOpacity="0.95" />
              </LinearGradient>
              <LinearGradient id="coreGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="100%" stopColor={mainColor} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Left Facet */}
            <Path
              d="M 70,12 L 20,86 L 46,74 L 70,98 Z"
              fill="url(#leftFacet)"
              stroke={mainColor}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Right Facet */}
            <Path
              d="M 70,12 L 120,86 L 94,74 L 70,98 Z"
              fill="url(#rightFacet)"
              stroke={mainColor}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Glowing Spine / Neon Center Line */}
            <Line
              x1="70" y1="14" x2="70" y2="96"
              stroke="url(#coreGlow)"
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
export default function ARNavigationOverlay({
  icon,
  spot,
  nearbySpot,
  userLocation,
  onContinue,
  onInspectSpot,
  onClose,
  hideBottomPanel = false,
}) {
  // Check if we are passing by a nearby spot or at the destination spot
  const activeSpot = nearbySpot || spot;
  const isEncounteringNearby = !!nearbySpot && (!spot || nearbySpot.id !== spot.id);

  // Compute model URL for display
  const rawModel = activeSpot?.model_3d || spot?.model_3d || icon?.model_3d;
  const activeModel = rawModel
    ? (String(rawModel).startsWith('http') || String(rawModel).startsWith('data:')
        ? String(rawModel).replace(/^http:\/\//, 'https://')
        : `${ORIGIN}${rawModel}`)
    : null;

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

  const nearbyDistanceM = userLocation && nearbySpot
    ? haversineDistance(userLocation.lat, userLocation.lng, nearbySpot.latitude, nearbySpot.longitude)
    : null;

  // relativeBearing: 0 = target straight ahead, 90 = target to the right, etc.
  const relativeBearing = deviceHeading !== null
    ? ((targetBearing - deviceHeading) + 360) % 360
    : targetBearing;

  const arriveThreshold = ARRIVE_RADIUS_METERS; // 10m
  const hasArrived = distanceM !== null && distanceM <= arriveThreshold;

  // Show 3D model if: 1) Passing by a nearby spot (<= 10m), OR 2) Within 10m of target
  const show3DModel = !!activeModel && (isEncounteringNearby || hasArrived);
  const showArrow = !hasArrived;

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
    if (show3DModel) {
      Animated.spring(celebPopAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [show3DModel]);

  const displayTitle = isEncounteringNearby
    ? nearbySpot.name
    : (spot?.name || icon?.name || 'Destination');

  const displayTagline = isEncounteringNearby
    ? (nearbySpot.location_name || 'Discovered Nearby')
    : (spot?.location_name || icon?.tagline || '');

  const displayColor = icon?.color || '#10B981';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      {/* ── Live Camera feed ── */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* ── HUD: Scanning line ── */}
      <ScanLine color={displayColor} />

      {/* ── HUD: Corner brackets ── */}
      <CornerBrackets color={displayColor} />

      {/* ── HUD: Floating ambient particles ── */}
      <FloatingParticles color={displayColor} />

      {/* ── Dark vignette top ── */}
      <View style={arStyles.topGradient} />
      <View style={arStyles.bottomVignette} />

      {/* ════════════════════════════════════════
          TOP BAR  — status + close
      ════════════════════════════════════════ */}
      <View style={arStyles.topBar}>
        {/* Left: mode badge */}
        <View style={[arStyles.modeBadge, { borderColor: displayColor + '88', backgroundColor: displayColor + '22' }]}>
          <View style={[arStyles.modeDot, { backgroundColor: displayColor }]} />
          <Text style={[arStyles.modeText, { color: displayColor }]}>
            {isEncounteringNearby ? 'DISCOVERY' : hasArrived ? 'ARRIVED' : 'AR LIVE'}
          </Text>
        </View>

        {/* Centre: distance readout */}
        {distanceM !== null && (
          <View style={arStyles.distReadout}>
            <Ionicons name="navigate" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={arStyles.distReadoutText}>
              {distanceM >= 1000
                ? (distanceM / 1000).toFixed(1) + ' km'
                : Math.round(distanceM) + ' m'}
            </Text>
          </View>
        )}

        {/* Right: close X */}
        <TouchableOpacity style={[arStyles.closeBtn, { borderColor: 'rgba(255,255,255,0.25)' }]} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ════════════════════════════════════════
          TOP LABEL  — spot name + subtitle
      ════════════════════════════════════════ */}
      <View style={arStyles.topLabel}>
        <View style={[arStyles.rarityBadge, { borderColor: displayColor + '99', backgroundColor: displayColor + '25' }]}>
          <Ionicons name={isEncounteringNearby ? 'sparkles' : 'diamond'} size={9} color={displayColor} />
          <Text style={[arStyles.rarityText, { color: displayColor }]}>
            {isEncounteringNearby ? 'NEARBY ENCOUNTER' : 'CULTURAL SPOT'}
          </Text>
          <Ionicons name={isEncounteringNearby ? 'sparkles' : 'diamond'} size={9} color={displayColor} />
        </View>
        <Text style={arStyles.arTitle} numberOfLines={1}>{displayTitle}</Text>
        <View style={arStyles.subtitleRow}>
          <Ionicons
            name={show3DModel ? 'cube' : showArrow ? 'arrow-up-circle' : 'radio-button-on'}
            size={12}
            color={show3DModel ? '#10B981' : '#FBBF24'}
            style={{ marginRight: 5 }}
          />
          <Text style={arStyles.arSubtitle}>
            {show3DModel
              ? (isEncounteringNearby ? `Passing ${displayTitle} (${Math.round(nearbyDistanceM || 20)}m)` : "3D Model in Sight — Look around!")
              : (showArrow ? 'Follow the navigation reticle' : "You're here — look around!")}
          </Text>
        </View>
      </View>

      {/* ── Celebration Confetti & Banner (when 3D model appears) ── */}
      {show3DModel && (
        <>
          <ConfettiCannon />
          <Animated.View style={[arStyles.celebrationCard, { transform: [{ scale: celebPopAnim }] }]}>
            <View style={arStyles.celebrationGlow} />
            <View style={arStyles.celebrationHeader}>
              <Ionicons name="sparkles" size={14} color="#FBBF24" />
              <Text style={arStyles.celebrationKicker}>
                {isEncounteringNearby ? 'NEARBY SPOT DISCOVERED!' : 'DESTINATION REACHED!'}
              </Text>
              <Ionicons name="sparkles" size={14} color="#FBBF24" />
            </View>
            <Text style={arStyles.celebrationCongrats}>CONGRATS!</Text>
            <Text style={arStyles.celebrationTitle}>
              You have caught <Text style={arStyles.celebrationSpotName}>"{displayTitle}"</Text>
            </Text>
            <View style={arStyles.celebrationXpPill}>
              <Ionicons name="flash" size={11} color="#FBBF24" />
              <Text style={arStyles.celebrationXpText}>+150 XP DISCOVERY BONUS</Text>
            </View>
          </Animated.View>
        </>
      )}

      {/* ── Floating 3D model (When passing nearby spot or at destination) ── */}
      {show3DModel && (
        <Animated.View style={[arStyles.modelWrap, { transform: [{ translateY: floatAnim }] }]}>
          <WebView
            source={{ html: buildARViewerHTML(activeModel) }}
            style={arStyles.modelWebview}
            javaScriptEnabled
            originWhitelist={['*']}
            scrollEnabled={false}
            backgroundColor="transparent"
            allowsTransparency
          />
          <View style={[arStyles.modelGlow, { backgroundColor: displayColor + '30', shadowColor: displayColor }]} />
        </Animated.View>
      )}

      {/* ── Directional Arrow (when navigating and not obstructed by arrived model) ── */}
      {showArrow && (
        <DirectionArrow
          relativeBearing={relativeBearing}
          targetBearing={targetBearing}
          deviceHeading={deviceHeading}
          distanceM={distanceM}
          color={displayColor}
        />
      )}

      {/* ════════════════════════════════════════
          BOTTOM PANEL
      ════════════════════════════════════════ */}
      {!hideBottomPanel && (
        <View style={arStyles.bottomPanel}>
          {/* Handle bar */}
          <View style={arStyles.panelHandle} />

          {/* Spot header */}
          <View style={arStyles.panelHeader}>
            <View style={[arStyles.panelIconBadge, { backgroundColor: icon.color + '22', borderColor: icon.color + '55' }]}>
              <Ionicons name="location" size={16} color={icon.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={arStyles.catchName}>{icon.name}</Text>
              {!!icon.tagline && (
                <Text style={arStyles.catchTagline} numberOfLines={1}>{icon.tagline}</Text>
              )}
            </View>
            {/* XP chip */}
            <View style={arStyles.xpChip}>
              <Ionicons name="flash" size={11} color="#FBBF24" />
              <Text style={arStyles.xpText}>+150 XP</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={arStyles.panelDivider} />

          {showArrow ? (
            /* ── NAVIGATE MODE ── */
            <View style={arStyles.navBlock}>
              {/* Progress bar */}
              <View style={arStyles.progressRow}>
                <Ionicons name="flag" size={12} color={icon.color} style={{ marginRight: 6 }} />
                <Text style={[arStyles.progressLabel, { color: icon.color }]}>
                  {Math.round(distanceM)}m remaining
                </Text>
              </View>
              <View style={arStyles.progressTrack}>
                <Animated.View
                  style={[
                    arStyles.progressFill,
                    { backgroundColor: icon.color, width: `${Math.min(100, Math.max(5, 100 - (distanceM / 500) * 100))}%` },
                  ]}
                />
              </View>
              <View style={[arStyles.navHint, { borderColor: icon.color + '44', backgroundColor: icon.color + '12' }]}>
                <Ionicons name="compass" size={16} color={icon.color} style={{ marginRight: 8 }} />
                <Text style={[arStyles.navHintText, { color: icon.color }]}>
                  Walk toward the arrow above
                </Text>
              </View>
            </View>
          ) : (
            /* ── ARRIVED MODE ── */
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[arStyles.continueBtn, { backgroundColor: icon.color, shadowColor: icon.color }]}
                onPress={onContinue}
                activeOpacity={0.85}
              >
                <Ionicons name="book" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={arStyles.continueBtnText}>View Lore & Info</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const arStyles = StyleSheet.create({
  // ── Vigniettes ──
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },
  bottomVignette: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.42,
    backgroundColor: 'rgba(0,0,0,0.22)',
    pointerEvents: 'none',
  },

  // ── Top bar ──
  topBar: {
    position: 'absolute',
    top: 48,
    left: 16, right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  modeDot: {
    width: 7, height: 7, borderRadius: 4,
  },
  modeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  distReadout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  distReadoutText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Top label ──
  topLabel: {
    position: 'absolute',
    top: 100,
    left: 20, right: 20,
    zIndex: 10,
  },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  rarityText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 2,
  },
  arTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },

  // ── 3D model ──
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

  // ── Bottom panel ──
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(6,6,20,0.88)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  panelHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  panelIconBadge: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  catchName: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: '#FFF',
    marginBottom: 1,
  },
  catchTagline: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  xpText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FBBF24',
  },
  panelDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },

  // Navigate mode
  navBlock: { gap: 10 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  navHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  navHintText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },

  // Continue button
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  continueBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFF',
    letterSpacing: 0.3,
  },

  // Celebration pop-up card
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
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  celebrationXpText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FBBF24',
    letterSpacing: 0.8,
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
