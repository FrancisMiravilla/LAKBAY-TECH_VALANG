import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../api/authService';
import { ORIGIN } from '../api/qrService';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { ARNavCards, ARGroundPath, ARRoundButtons } from './ARGuidance';
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

const resolveModelUrl = (m) => {
  if (!m) return null;
  if (m.startsWith('data:')) return m;
  if (m.startsWith('http')) return m;
  return `${ORIGIN}${m}`;
};

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
  bottomPanelOffset = 0,
  showCelebration = true,
  controlsBottom = 40,
  mapHidden = false,
  onToggleMap,
}) {
  // Check if we are passing by a nearby spot or at the destination spot
  const activeSpot = nearbySpot || spot;
  const isEncounteringNearby = !!nearbySpot && (!spot || nearbySpot.id !== spot.id);

  // Media for the popup. Passing by: only that spot's own 3D model, else its photo
  // (never the destination's model). Arrived: the destination's model.
  const resolveMedia = (raw) => {
    if (!raw) return null;
    const str = String(raw);
    return str.startsWith('http') || str.startsWith('data:') ? str.replace(/^http:\/\//, 'https://') : `${ORIGIN}${str}`;
  };
  const activeModel = isEncounteringNearby
    ? resolveMedia(nearbySpot.model_3d)
    : resolveMedia(spot?.model_3d || icon?.model_3d);
  const activeImage = isEncounteringNearby && !activeModel ? resolveMedia(nearbySpot.image) : null;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const celebPopAnim = useRef(new Animated.Value(0)).current;

  // Dismiss state for the model popup modal — resets each time a new model appears
  const [modalDismissed, setModalDismissed] = useState(false);
  useEffect(() => {
    if (show3DModel) setModalDismissed(false);
  }, [show3DModel]);

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

  // Show the popup (3D model, or photo for model-less nearby spots) when passing by a
  // nearby spot or within 10 m of the destination.
  const show3DModel = !!(activeModel || activeImage) && (isEncounteringNearby || hasArrived);
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

      // Auto-save discovered model to SecureStore so BadgesScreen shows it.
      // Photo-only popups (e.g. a promotion without a model) are not collectibles.
      if (!activeModel) return;
      (async () => {
        try {
          const itemToSave = activeSpot || icon;
          if (!itemToSave) return;
          const existingStr = await SecureStore.getItemAsync('caught_icons');
          let caught = existingStr ? JSON.parse(existingStr) : [];
          const itemName = itemToSave.name || icon?.name || spot?.name;
          const alreadyCaught = caught.some(c =>
            String(c.id) === String(itemToSave.id) ||
            (c.name && itemName && c.name.toLowerCase() === itemName.toLowerCase())
          );
          if (!alreadyCaught) {
            const raw = itemToSave.model_3d || activeModel;
            const newEntry = {
              id: itemToSave.id || (spot ? 'spot-icon-' + spot.id : Date.now()),
              name: itemName || 'Cultural Model',
              model_3d: resolveModelUrl(raw),
              color: icon?.color || '#10B981',
              tagline: itemToSave.location_name || itemToSave.description || icon?.tagline || '',
              date_caught: new Date().toISOString(),
            };
            caught.push(newEntry);
            await SecureStore.setItemAsync('caught_icons', JSON.stringify(caught));

            try {
              const profile = await authService.getProfile();
              if (profile?.id) {
                await SecureStore.setItemAsync('caught_icons_uid', String(profile.id));
              }
            } catch (_) {}

            try {
              await authService.adjustXP(150);
            } catch (_) {}
          }
        } catch (e) {
          console.warn('[ARNavigationOverlay] Failed to auto-save caught model:', e);
        }
      })();
    }
  }, [show3DModel, activeSpot, spot, icon, activeModel]);

  const displayTitle = isEncounteringNearby
    ? nearbySpot.name
    : (spot?.name || icon?.name || 'Destination');

  const displayTagline = isEncounteringNearby
    ? (nearbySpot.location_name || 'Discovered Nearby')
    : (spot?.location_name || icon?.tagline || '');

  const displayColor = icon?.color || '#10B981';

  // Walking guidance (reference/arrow.png) whenever the arrow is up and no popup covers it.
  const guiding = showArrow && (!show3DModel || modalDismissed);
  const roundButtons = [{ icon: 'close', label: 'Exit navigation', onPress: onClose }];
  if (onToggleMap) {
    roundButtons.push({ icon: mapHidden ? 'map' : 'map-outline', label: mapHidden ? 'Show map' : 'Hide map', onPress: onToggleMap });
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      {/* ── Live Camera feed ── */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {guiding ? (
        <>
          <ARGroundPath relativeBearing={relativeBearing} bottom={Math.max(0, controlsBottom - 40)} />
          <ARNavCards
            relativeBearing={relativeBearing}
            distanceM={distanceM}
            destination={displayTitle}
            hasHeading={deviceHeading !== null}
          />
        </>
      ) : (
        <>
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

        {/* Right: close X (the round buttons replace it in the map's navigation) */}
        {!hideBottomPanel && (
          <TouchableOpacity style={[arStyles.closeBtn, { borderColor: 'rgba(255,255,255,0.25)' }]} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ════════════════════════════════════════
          TOP LABEL — only shown while navigating (no model)
      ════════════════════════════════════════ */}
      {!show3DModel && (
        <View style={arStyles.topLabel}>
          <Text style={arStyles.arTitle} numberOfLines={1}>{displayTitle}</Text>
          {distanceM !== null && (
            <View style={arStyles.subtitleRow}>
              <Ionicons name="navigate" size={12} color="#FBBF24" style={{ marginRight: 5 }} />
              <Text style={arStyles.arSubtitle}>
                {distanceM >= 1000
                  ? `${(distanceM / 1000).toFixed(1)} km remaining`
                  : `${Math.round(distanceM)} m remaining`}
              </Text>
            </View>
          )}
        </View>
      )}

        </>
      )}

      {hideBottomPanel && <ARRoundButtons buttons={roundButtons} bottom={controlsBottom} />}

      {/* ── Celebration Confetti (when 3D model appears) ── */}
      {show3DModel && showCelebration && <ConfettiCannon />}

      {/* ════════════════════════════════════════
          COMPACT MODEL POPUP — centered on screen
      ════════════════════════════════════════ */}
      {show3DModel && !modalDismissed && (
        <Animated.View style={[arStyles.modelModal, { transform: [{ scale: celebPopAnim }] }]}>
          {/* Accent top bar */}
          <View style={[arStyles.modelModalAccent, { backgroundColor: displayColor }]} />

          {/* Header: badge only */}
          <View style={arStyles.modelModalHeader}>
            <View style={[arStyles.modelModalBadge, { backgroundColor: displayColor + '25', borderColor: displayColor + '88' }]}>
              <Ionicons name={isEncounteringNearby ? 'sparkles' : 'location'} size={10} color={displayColor} />
              <Text style={[arStyles.modelModalBadgeText, { color: displayColor }]}>
                {isEncounteringNearby ? 'PASSING BY' : 'ARRIVED'}
              </Text>
            </View>
          </View>

          {/* Row: 3D viewer + text side by side */}
          <View style={arStyles.modelModalBody}>
            {/* Mini 3D viewer, or the spot's photo when it has no model */}
            <Animated.View style={[arStyles.modelModalViewer, { transform: [{ translateY: floatAnim }] }]}>
              {activeModel ? (
                <WebView
                  source={{ html: buildARViewerHTML(activeModel) }}
                  style={arStyles.modelModalWebview}
                  javaScriptEnabled
                  originWhitelist={['*']}
                  scrollEnabled={false}
                  backgroundColor="transparent"
                  allowsTransparency
                />
              ) : (
                <Image source={{ uri: activeImage }} style={arStyles.modelModalPhoto} resizeMode="cover" />
              )}
              <View style={[arStyles.modelModalGlow, { backgroundColor: displayColor + '30', shadowColor: displayColor }]} />
            </Animated.View>

            {/* Text side */}
            <View style={arStyles.modelModalTextCol}>
              <Text style={arStyles.modelModalTitle} numberOfLines={2}>{displayTitle}</Text>
              <Text style={arStyles.modelModalSubtitle}>
                {isEncounteringNearby
                  ? `Passing by — ${Math.round(nearbyDistanceM || 20)}m away`
                  : 'You have arrived!'}
              </Text>
              {!!displayTagline && (
                <View style={arStyles.modelModalLocationRow}>
                  <Ionicons name="location-outline" size={11} color={displayColor} />
                  <Text style={[arStyles.modelModalLocation, { color: displayColor }]} numberOfLines={2}>
                    {displayTagline}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Got it button */}
          <TouchableOpacity
            style={[arStyles.modelModalGotIt, { backgroundColor: displayColor }]}
            onPress={() => setModalDismissed(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={15} color="#fff" />
            <Text style={arStyles.modelModalGotItText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      )}



      {/* ════════════════════════════════════════
          BOTTOM PANEL
      ════════════════════════════════════════ */}
      {!hideBottomPanel && (
        <View
          style={[
            arStyles.bottomPanel,
            // Lifted above a floating map: becomes a floating card itself.
            bottomPanelOffset > 0 && { bottom: bottomPanelOffset, left: 16, right: 16, borderRadius: 24, paddingBottom: 16 },
          ]}
        >
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
    fontSize: 22,
    color: '#FFF',
    marginBottom: 6,
    lineHeight: 22,
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

  // ── Unified model modal (pops up when 3D model is in range) ──
  modelModal: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    left: 24,
    right: 24,
    backgroundColor: 'rgba(6, 10, 32, 0.96)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 30,
  },
  modelModalAccent: {
    height: 3,
    width: '100%',
  },
  modelModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  modelModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  modelModalBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  modelModalXpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  modelModalXpText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FBBF24',
  },
  // Horizontal row: mini viewer + text column
  modelModalBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 12,
  },
  modelModalViewer: {
    width: W * 0.30,
    height: W * 0.30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelModalPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  modelModalWebview: {
    width: W * 0.30,
    height: W * 0.30,
    backgroundColor: 'transparent',
  },
  modelModalGlow: {
    position: 'absolute',
    bottom: -8,
    width: W * 0.20,
    height: 16,
    borderRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  modelModalTextCol: {
    flex: 1,
    gap: 4,
  },
  modelModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  modelModalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(191,215,255,0.75)',
    lineHeight: 16,
  },
  modelModalLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  modelModalLocation: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    lineHeight: 15,
  },
  // Got it dismiss button
  modelModalGotIt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modelModalGotItText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },


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
    lineHeight: 22,
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
    fontSize: 14,
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
