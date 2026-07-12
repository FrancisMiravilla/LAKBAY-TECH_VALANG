import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ScrollView, ActivityIndicator,
  Animated, Dimensions, Modal, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useApp } from '../context/AppContext';
import { getCatchIcons, getSpots, ORIGIN } from '../api/qrService';
import ErrorModal from '../components/ErrorModal';

const { width: W, height: H } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────
const CATCH_RADIUS_METERS = 30;      // proximity sheet unlocks within 30 m of a spot
const ARRIVE_RADIUS_METERS = 12;     // reveal the 3D model — you're basically on the spot
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
function DirectionArrow({ relativeBearing, distanceM, color, deviceHeading, targetBearing }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  // Animated rotation value — updated smoothly on each heading change
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

  // Smooth the rotation: take shortest arc to avoid 350°→10° spinning backwards
  useEffect(() => {
    let delta = relativeBearing - prevRel.current;
    if (delta > 180)  delta -= 360;
    if (delta < -180) delta += 360;
    const next = prevRel.current + delta;
    prevRel.current = next;
    Animated.timing(rotAnim, {
      toValue: next,
      duration: 120,       // snappy but smooth
      useNativeDriver: true,
    }).start();
  }, [relativeBearing]);

  const rotation = rotAnim.interpolate({
    inputRange: [-360, 0, 360, 720],
    outputRange: ['-360deg', '0deg', '360deg', '720deg'],
    extrapolate: 'extend',
  });

  // Is the target roughly straight ahead? (within ±25°)
  const isAligned = relativeBearing < 25 || relativeBearing > 335;

  return (
    <View style={arrowStyles.container}>
      {/* Radar rings behind arrow */}
      <RadarRing color={color} delay={0} />
      <RadarRing color={color} delay={700} />

      {/* Outer pulsing ring */}
      <Animated.View
        style={[
          arrowStyles.outerRing,
          {
            borderColor: isAligned ? '#22C55E' : color + 'AA',
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Arrow circle */}
      <View
        style={[
          arrowStyles.arrowCircle,
          {
            backgroundColor: isAligned ? '#22C55E18' : color + '22',
            borderColor:     isAligned ? '#22C55ECC' : color + '99',
          },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }, { translateY: bounceAnim }] }}>
          <Ionicons
            name="arrow-up"
            size={38}
            color={isAligned ? '#22C55E' : color}
          />
        </Animated.View>
      </View>

      {/* Aligned flash label */}
      {isAligned && (
        <View style={[arrowStyles.alignedBadge, { backgroundColor: '#22C55E22', borderColor: '#22C55E88' }]}>
          <Ionicons name="checkmark-circle" size={12} color="#22C55E" style={{ marginRight: 4 }} />
          <Text style={arrowStyles.alignedText}>FACING TARGET</Text>
        </View>
      )}

      {/* Distance + heading row */}
      <View style={arrowStyles.infoRow}>
        <View style={[arrowStyles.distLabel, { backgroundColor: color + '22', borderColor: color + '66' }]}>
          <Ionicons name="walk-outline" size={11} color={color} style={{ marginRight: 4 }} />
          <Text style={[arrowStyles.distLabelText, { color }]}>
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
function ARCatchOverlay({ icon, spot, userLocation, onContinue, onClose }) {
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

      {/* ── HUD: Scanning line (always on) ── */}
      <ScanLine color={icon.color} />

      {/* ── HUD: Corner brackets ── */}
      <CornerBrackets color={icon.color} />

      {/* ── HUD: Floating ambient particles ── */}
      <FloatingParticles color={icon.color} />

      {/* ── Dark vignette top ── */}
      <View style={arStyles.topGradient} />
      {/* ── Dark vignette bottom half — only when NOT in arrow mode ── */}
      {!showArrow && <View style={arStyles.bottomVignette} />}

      {/* ── HUD: Live status bar ── */}
      <ARStatusBar color={icon.color} distanceM={distanceM} showArrow={showArrow} accuracy={gpsAccuracy} />

      {/* ── Close button ── */}
      <TouchableOpacity style={arStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
        <View style={arStyles.closeBtnCircle}>
          <Ionicons name="close" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* ── Top label ── */}
      <View style={arStyles.topLabel}>
        <View style={[arStyles.typeBadge, { backgroundColor: icon.color + '33', borderColor: icon.color + '88' }]}>
          <Ionicons name="locate-outline" size={11} color={icon.color} style={{ marginRight: 5 }} />
          <Text style={[arStyles.typeBadgeText, { color: icon.color }]}>CATCH ZONE ACTIVE</Text>
        </View>
        <Text style={arStyles.arTitle}>{icon.name}</Text>
        <Text style={arStyles.arSubtitle}>
          {showArrow
            ? 'Follow the arrow to find the model!'
            : "You're on the spot — look around to catch it!"}
        </Text>
      </View>

      {/* ── Directional Path Arrow (only when not at exact spot) ── */}
      {showArrow && (
        <DirectionArrow
          relativeBearing={relativeBearing}
          targetBearing={targetBearing}
          deviceHeading={deviceHeading}
          distanceM={distanceM}
          color={icon.color}
        />
      )}

      {/* ── Floating 3D model — only show when user is at spot (≤ 5m) ── */}
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
          {/* Glow ring under model */}
          <View style={[arStyles.modelGlow, { backgroundColor: icon.color + '30', shadowColor: icon.color }]} />
        </Animated.View>
      )}

      {/* Bottom panel */}
      <View style={arStyles.bottomPanel}>
        <Text style={arStyles.catchName}>{icon.name}</Text>
        <Text style={arStyles.catchTagline}>{icon.tagline}</Text>

        {showArrow ? (
          /* When guiding: show a "navigate" hint instead of continue */
          <View style={[arStyles.navigateHint, { borderColor: icon.color + '55', backgroundColor: icon.color + '15' }]}>
            <Ionicons name="compass-outline" size={18} color={icon.color} style={{ marginRight: 8 }} />
            <Text style={[arStyles.navigateHintText, { color: icon.color }]}>
              Walk toward the arrow · {Math.round(distanceM)}m remaining
            </Text>
          </View>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[arStyles.continueBtn, { backgroundColor: icon.color }]}
              onPress={onContinue}
              activeOpacity={0.85}
            >
              <Ionicons name="book-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={arStyles.continueBtnText}>Continue for Information</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Proximity Alert Sheet ────────────────────────────────────────────────────
function ProximitySheet({ spot, icon, distanceM, onCatch, onDismiss }) {
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
        <View style={[proximityStyles.modelLabel, { backgroundColor: icon.color + '20', borderColor: icon.color + '44' }]}>
          <Ionicons name="cube-outline" size={10} color={icon.color} style={{ marginRight: 4 }} />
          <Text style={[proximityStyles.modelLabelText, { color: icon.color }]}>
            {icon.name} · 3D Model
          </Text>
        </View>

        {/* Distance badge */}
        <View style={[proximityStyles.distanceBadge, { backgroundColor: '#22C55E22', borderColor: '#22C55E88' }]}>
          <Ionicons name="location" size={12} color="#22C55E" style={{ marginRight: 4 }} />
          <Text style={proximityStyles.distanceText}>{Math.round(distanceM)}m away</Text>
        </View>

        <Text style={proximityStyles.sheetTitle}>
          {icon.name} is{'\n'}nearby!
        </Text>
        <Text style={proximityStyles.sheetLocation}>📍 {spot.location_name || spot.name}</Text>
        <Text style={proximityStyles.sheetDesc}>
          You're close enough to catch this cultural icon. Open your camera and experience it in AR!
        </Text>

        <TouchableOpacity
          style={[proximityStyles.catchBtn, { backgroundColor: icon.color }]}
          onPress={onCatch}
          activeOpacity={0.85}
        >
          <Ionicons name="camera" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={proximityStyles.catchBtnText}>Let's Catch It!</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={dismiss} style={proximityStyles.dismissBtn}>
          <Text style={proximityStyles.dismissText}>Maybe later</Text>
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

  // ── Load data ───────────────────────────────────────────────────────────────
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

  const handleARContinue = useCallback(() => {
    setArVisible(false);
    if (arIcon) {
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
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={COLORS.gold} style={{ marginRight: 6 }} />
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

      {/* Sub Header */}
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>CATCH</Text>
        {/* GPS Status pill */}
        <View style={[styles.gpsPill, userLocation ? styles.gpsPillActive : styles.gpsPillInactive]}>
          <View style={[styles.gpsDot, { backgroundColor: userLocation ? '#22C55E' : '#94A3B8' }]} />
          <Text style={styles.gpsPillText}>
            {userLocation
              ? (userLocation.accuracy ? `GPS ±${Math.round(userLocation.accuracy)}m` : 'GPS ON')
              : 'GPS...'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading cultural icons…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={42} color={COLORS.textMuted} />
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
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* GPS Proximity Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="location" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
            <Text style={styles.infoBannerText}>
              Walk within <Text style={styles.infoBannerBold}>{CATCH_RADIUS_METERS}m</Text> of a catch spot to unlock AR catch mode.
            </Text>
          </View>

          {/* Catch Spots Map Preview */}
          {catchSpots.length > 0 && (
            <View style={styles.spotsCard}>
              <View style={styles.sectionRow}>
                <View style={styles.accentBar} />
                <Text style={styles.sectionTitle}>Nearby Catch Zones</Text>
              </View>
              {catchSpots.map(spot => {
                const dist = userLocation
                  ? haversineDistance(userLocation.lat, userLocation.lng, spot.latitude, spot.longitude)
                  : null;
                const inRange = dist !== null && dist <= CATCH_RADIUS_METERS;
                return (
                  <TouchableOpacity 
                    key={spot.id} 
                    style={[styles.spotRow, inRange && styles.spotRowActive]}
                    activeOpacity={inRange ? 0.7 : 1}
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
                    <View style={[styles.spotDot, { backgroundColor: inRange ? '#22C55E' : '#64748B' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.spotName}>{spot.name}</Text>
                      <Text style={styles.spotLoc}>{spot.location_name}</Text>
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
          )}

          {/* Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressTopRow}>
              <Text style={styles.progressLabel}>Collection Progress</Text>
              <Text style={styles.progressValue}>
                <Text style={styles.progressCaught}>0</Text>
                {' '}/ {icons.filter(icon => icon.name.toLowerCase() !== 'curacha').length}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '0%' }]} />
            </View>
          </View>

          {/* Section heading */}
          <View style={styles.sectionRow}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>How to Catch</Text>
          </View>
          <Text style={styles.sectionSub}>
            Follow these steps to build your collection of Zamboanga's cultural heritage.
          </Text>

          {/* Guide Steps */}
          <View style={{ marginTop: 10, gap: 12, marginBottom: 20 }}>
            {[
              { icon: 'map-outline', title: '1. Find Catch Zones', desc: 'Explore the map to discover areas where cultural icons spawn.' },
              { icon: 'walk-outline', title: '2. Get Close', desc: 'Walk to the location until you are within catching range (30 meters).' },
              { icon: 'camera-outline', title: '3. Capture in AR', desc: 'Tap the prompt to open your camera and capture the icon in Augmented Reality!' },
              { icon: 'library-outline', title: '4. Collect & Learn', desc: 'Build your collection and learn the history and significance of each icon.' },
            ].map((step, idx) => (
              <View key={idx} style={{
                flexDirection: 'row',
                backgroundColor: COLORS.bgCard,
                borderRadius: RADIUS.md,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: 'center',
                gap: 16,
                ...SHADOW.card
              }}>
                <View style={{
                  width: 48, height: 48,
                  borderRadius: 24,
                  backgroundColor: COLORS.accent + '15',
                  justifyContent: 'center', alignItems: 'center'
                }}>
                  <Ionicons name={step.icon} size={24} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, marginBottom: 4 }}>
                    {step.title}
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSub, lineHeight: 18 }}>
                    {step.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Proximity Bottom Sheet ── */}
      {nearbySpot && (
        <ProximitySheet
          spot={nearbySpot.spot}
          icon={nearbySpot.icon}
          distanceM={nearbySpot.distanceM}
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
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, height: 60, backgroundColor: COLORS.navy,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoTitle: { fontFamily: FONTS.pixel, fontSize: 9, color: '#FFF', letterSpacing: 1, lineHeight: 16 },
  logoSub: { fontFamily: FONTS.medium, fontSize: 8, color: 'rgba(255,255,255,0.65)', letterSpacing: 1 },
  headerBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 48, backgroundColor: COLORS.navyMid,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
  subHeaderTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFF', letterSpacing: 1 },
  gpsPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  gpsPillActive: { backgroundColor: '#22C55E18', borderColor: '#22C55E66' },
  gpsPillInactive: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' },
  gpsDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  gpsPillText: { fontFamily: FONTS.bold, fontSize: 10, color: '#FFF', letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
  errorText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.accent },
  retryText: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFF' },

  scroll: { padding: 16, paddingBottom: 40 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderRadius: RADIUS.sm,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoBannerText: { flex: 1, fontFamily: FONTS.regular, fontSize: 12, color: '#1E40AF', lineHeight: 18 },
  infoBannerBold: { fontFamily: FONTS.bold },

  spotsCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 16, ...SHADOW.card,
  },
  spotRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  spotRowActive: { backgroundColor: '#22C55E0A', borderRadius: 8, paddingHorizontal: 8 },
  spotDot: { width: 8, height: 8, borderRadius: 4 },
  spotName: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text },
  spotLoc: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  spotDist: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.textMuted },
  inRangeBadge: {
    backgroundColor: '#22C55E22', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#22C55E66',
  },
  inRangeBadgeText: { fontFamily: FONTS.bold, fontSize: 9, color: '#22C55E', letterSpacing: 0.5 },

  progressCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card,
  },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text },
  progressValue: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.textMuted },
  progressCaught: { color: COLORS.accent },
  progressBarBg: { height: 6, backgroundColor: COLORS.bgSurface, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  accentBar: { width: 3, height: 18, backgroundColor: COLORS.accent, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  sectionSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginBottom: 20, lineHeight: 18 },

  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  iconCard: {
    width: '47.5%', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: 16, borderWidth: 1,
    overflow: 'hidden', position: 'relative', ...SHADOW.card,
  },
  cardGlow: { position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: 50, opacity: 0.25 },
  modelRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  iconName: { fontFamily: FONTS.bold, fontSize: 16, marginBottom: 4 },
  iconTagline: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, lineHeight: 16, marginBottom: 14 },
  arrowBtn: {
    alignSelf: 'flex-start', width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
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
  navigateHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 16, borderWidth: 1,
  },
  navigateHintText: { fontFamily: FONTS.semiBold, fontSize: 14, letterSpacing: 0.2 },
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
  outerRing: {
    position: 'absolute',
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  arrowCircle: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 12,
  },
  distLabel: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  distLabelText: { fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 0.4 },

  // "FACING TARGET" badge shown when aligned
  alignedBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  alignedText: { fontFamily: FONTS.bold, fontSize: 10, color: '#22C55E', letterSpacing: 1 },

  // Row containing distance pill + heading pill
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, gap: 8,
  },

  // Compass heading pill
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
