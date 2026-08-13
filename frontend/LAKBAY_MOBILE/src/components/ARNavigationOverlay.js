import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Polygon } from 'react-native-svg';
import { ORIGIN } from '../api/qrService';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
const FALLBACK_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];


const { width: W, height: H } = Dimensions.get('window');
const ARRIVE_RADIUS_METERS = 12;

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
  <script type="module"
    src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
    integrity="sha384-NxrHiuPcsJaRbXc9EoFTt5OZ6WPVqKeDgcnykGs3spXmq0J7hbbGGlyUkrGuoJoA"
    crossorigin="anonymous">
  </script>
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
    camera-controls
    bounds="tight"
    camera-orbit="0deg 75deg auto"
    exposure="1"
    shadow-intensity="1"
    style="width:100%;height:100%"
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
  <script type="module"
    src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
    integrity="sha384-NxrHiuPcsJaRbXc9EoFTt5OZ6WPVqKeDgcnykGs3spXmq0J7hbbGGlyUkrGuoJoA"
    crossorigin="anonymous">
  </script>
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

// ─── AR Direction Arrow ───────────────────────────────────────────────────────
function DirectionArrow({ relativeBearing, distanceM, color, deviceHeading, targetBearing }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const rotAnim    = useRef(new Animated.Value(relativeBearing)).current;
  const prevRel    = useRef(relativeBearing);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -8, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0,  duration: 500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Smooth shortest-arc rotation
  useEffect(() => {
    let delta = relativeBearing - prevRel.current;
    if (delta > 180)  delta -= 360;
    if (delta < -180) delta += 360;
    const next = prevRel.current + delta;
    prevRel.current = next;
    Animated.timing(rotAnim, { toValue: next, duration: 120, useNativeDriver: true }).start();
  }, [relativeBearing]);

  const rotation = rotAnim.interpolate({
    inputRange: [-360, 0, 360, 720],
    outputRange: ['-360deg', '0deg', '360deg', '720deg'],
    extrapolate: 'extend',
  });

  const isAligned = relativeBearing < 25 || relativeBearing > 335;

  const arrowColor  = isAligned ? '#22C55E' : (color || '#FF7A00');
  const shadowColor = isAligned ? '#15803D' : '#CC5A00';
  const deepShadow  = isAligned ? '#14532D' : '#994300';

  const ARROW_POLYGON = '50,10 90,50 70,50 70,100 30,100 30,50 10,50';

  return (
    <View style={arrowStyles.container}>
      <Animated.View style={{ alignItems: 'center', justifyContent: 'center', width: 140, height: 140, transform: [{ translateY: bounceAnim }] }}>
        {[...Array(15)].map((_, i) => {
          const isTop = i === 0;
          const layerColor = isTop ? arrowColor : (i > 10 ? deepShadow : shadowColor);
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                top: i * 2.5,
                transform: [{ rotateX: '60deg' }, { rotateZ: rotation }],
              }}
            >
              <Svg width="120" height="120" viewBox="0 0 100 100">
                <Polygon points={ARROW_POLYGON} fill={layerColor} stroke={layerColor} strokeWidth="1" strokeLinejoin="round" />
              </Svg>
            </Animated.View>
          );
        })}
      </Animated.View>

      {isAligned && (
        <View style={[arrowStyles.alignedBadge, { backgroundColor: '#22C55E22', borderColor: '#22C55E88' }]}>
          <Ionicons name="checkmark-circle" size={12} color="#22C55E" style={{ marginRight: 4 }} />
          <Text style={arrowStyles.alignedText}>FACING TARGET</Text>
        </View>
      )}

      <View style={arrowStyles.infoRow}>
        <View style={[arrowStyles.distLabel, { backgroundColor: arrowColor + '22', borderColor: arrowColor + '66' }]}>
          <Ionicons name="walk-outline" size={11} color={arrowColor} style={{ marginRight: 4 }} />
          <Text style={[arrowStyles.distLabelText, { color: arrowColor }]}>
            {Math.round(distanceM)}m away
          </Text>
        </View>
        {deviceHeading !== null && (
          <View style={[arrowStyles.headingPill, { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="compass-outline" size={11} color="rgba(255,255,255,0.7)" style={{ marginRight: 3 }} />
            <Text style={arrowStyles.headingText}>{Math.round(targetBearing)}°</Text>
          </View>
        )}
      </View>
    </View>
  );
}



// ─── AR Camera Overlay ───────────────────────────────────────────────────────
export default function ARNavigationOverlay({ icon, spot, userLocation, onContinue, onClose, hideBottomPanel = false }) {
  const activeModel = (spot && spot.model_3d) 
    ? (spot.model_3d.startsWith('http') || spot.model_3d.startsWith('data:') ? spot.model_3d : `${ORIGIN}${spot.model_3d}`) 
    : icon.model_3d;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Live compass heading ──────────────────────────────────────────────────
  const [deviceHeading, setDeviceHeading] = useState(null);
  const headingSub = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        headingSub.current = await Location.watchHeadingAsync((hdg) => {
          if (!active) return;
          // Use magHeading (raw) or trueHeading when available
          const h = hdg.trueHeading >= 0 ? hdg.trueHeading : hdg.magHeading;
          setDeviceHeading(h);
        });
      } catch (_) {
        // Heading not available on this device — arrow falls back to North-relative
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

  // relativeBearing: 0 = target straight ahead, 90 = target to the right, etc.
  const relativeBearing = deviceHeading !== null
    ? ((targetBearing - deviceHeading) + 360) % 360
    : targetBearing; // fallback: North-relative if compass unavailable

  // GPS is only precise to ±accuracy metres. If the target sits inside that error
  // circle the bearing is just noise (it can even point back the way you came), so
  // stop drawing a false-precision arrow and reveal the model to look around instead.
  const gpsAccuracy = userLocation?.accuracy ?? 15;
  const arriveThreshold = Math.max(ARRIVE_RADIUS_METERS, gpsAccuracy);
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

      {/* ════════════════════════════════════════
          TOP BAR  — status + close
      ════════════════════════════════════════ */}
      <View style={arStyles.topBar}>
        {/* Left: mode badge */}
        <View style={[arStyles.modeBadge, { borderColor: icon.color + '88', backgroundColor: icon.color + '22' }]}>
          <View style={[arStyles.modeDot, { backgroundColor: icon.color }]} />
          <Text style={[arStyles.modeText, { color: icon.color }]}>
            {showArrow ? 'NAVIGATING' : 'AR LIVE'}
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
        <View style={[arStyles.rarityBadge, { borderColor: icon.color + '99', backgroundColor: icon.color + '25' }]}>
          <Ionicons name="diamond" size={9} color={icon.color} />
          <Text style={[arStyles.rarityText, { color: icon.color }]}>MYTHICAL SPOT</Text>
          <Ionicons name="diamond" size={9} color={icon.color} />
        </View>
        <Text style={arStyles.arTitle}>{icon.name}</Text>
        <View style={arStyles.subtitleRow}>
          <Ionicons
            name={showArrow ? 'arrow-up-circle' : 'radio-button-on'}
            size={12}
            color={showArrow ? '#FBBF24' : '#22C55E'}
            style={{ marginRight: 5 }}
          />
          <Text style={arStyles.arSubtitle}>
            {showArrow ? 'Follow the arrow to reach the spot' : "You're here — look around!"}
          </Text>
        </View>
      </View>

      {/* ── Directional Arrow ── */}
      {showArrow && (
        <DirectionArrow
          relativeBearing={relativeBearing}
          targetBearing={targetBearing}
          deviceHeading={deviceHeading}
          distanceM={distanceM}
          color={icon.color}
        />
      )}

      {/* ── Floating 3D model (at spot) ── */}
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
});



// ─── Direction Arrow Styles ───────────────────────────────────────────────────
const arrowStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: H * 0.28,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  distLabel: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  distLabelText: { fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 0.4 },
  alignedBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  alignedText: { fontFamily: FONTS.bold, fontSize: 10, color: '#22C55E', letterSpacing: 1 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, gap: 8,
  },
  headingPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  headingText: { fontFamily: FONTS.bold, fontSize: 11, color: 'rgba(255,255,255,0.75)' },
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
