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
import { getCatchIcons, getSpots, ORIGIN } from '../api/qrService';
import ErrorModal from '../components/ErrorModal';

const { width: W, height: H } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────
const CATCH_RADIUS_METERS = 100; // user must be within 100m
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

// ─── AR Camera Overlay ───────────────────────────────────────────────────────
function ARCatchOverlay({ icon, onContinue, onClose }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    // Float loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -14, duration: 1400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
    // Pulse button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      {/* Camera background */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Dark gradient overlay at top */}
      <View style={arStyles.topGradient} />

      {/* Close button */}
      <TouchableOpacity style={arStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
        <View style={arStyles.closeBtnCircle}>
          <Ionicons name="close" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Top label */}
      <View style={arStyles.topLabel}>
        <View style={[arStyles.typeBadge, { backgroundColor: icon.color + '33', borderColor: icon.color + '88' }]}>
          <Ionicons name="fish-outline" size={11} color={icon.color} style={{ marginRight: 5 }} />
          <Text style={[arStyles.typeBadgeText, { color: icon.color }]}>CATCH ZONE ACTIVE</Text>
        </View>
        <Text style={arStyles.arTitle}>{icon.name}</Text>
        <Text style={arStyles.arSubtitle}>Point your camera and catch it!</Text>
      </View>

      {/* Floating 3D model */}
      <Animated.View style={[arStyles.modelWrap, { transform: [{ translateY: floatAnim }] }]}>
        {icon.model_3d ? (
          <WebView
            source={{ html: buildARViewerHTML(icon.model_3d) }}
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

      {/* Bottom panel */}
      <View style={arStyles.bottomPanel}>
        <Text style={arStyles.catchName}>{icon.name}</Text>
        <Text style={arStyles.catchTagline}>{icon.tagline}</Text>

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
      </View>
    </Animated.View>
  );
}

// ─── Proximity Alert Sheet ────────────────────────────────────────────────────
function ProximitySheet({ spot, icon, distanceM, onCatch, onDismiss }) {
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

        {/* Icon with glow */}
        <Animated.View style={[proximityStyles.iconRing, { borderColor: icon.color + '99', backgroundColor: icon.color + '18', transform: [{ translateX: shakeAnim }] }]}>
          <Ionicons name="fish" size={48} color={icon.color} />
        </Animated.View>

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
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getCatchIcons(), getSpots()])
      .then(([iconData, spotData]) => {
        const iconList = (Array.isArray(iconData) ? iconData : (iconData.results || [])).map(normalizeIcon);
        const spotList = (Array.isArray(spotData) ? spotData : (spotData.results || [])).filter(
          s => s.latitude && s.longitude && s.feature_types?.includes('catch')
        );
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
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 8000 },
        (loc) => {
          if (!active) return;
          const { latitude, longitude } = loc.coords;
          setUserLocation({ lat: latitude, lng: longitude });
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
    if (!userLocation || catchSpots.length === 0 || icons.length === 0) return;

    for (const spot of catchSpots) {
      if (proximityDismissed.has(spot.id)) continue;
      const dist = haversineDistance(userLocation.lat, userLocation.lng, spot.latitude, spot.longitude);
      if (dist <= CATCH_RADIUS_METERS) {
        // Find a matching icon (by name match or fallback to first)
        const matchedIcon =
          icons.find(i => spot.name?.toLowerCase().includes(i.name.toLowerCase())) ||
          icons.find(i => spot.description?.toLowerCase().includes(i.name.toLowerCase())) ||
          icons[0];

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
  }, [userLocation, catchSpots, icons, proximityDismissed]);

  // ── Open AR camera ──────────────────────────────────────────────────────────
  const openAR = useCallback(async (icon) => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        showErr('Camera Required', 'Please allow camera access to use AR catch.', 'warning');
        return;
      }
    }
    setArIcon(icon);
    setArVisible(true);
    setNearbySpot(null);
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
      navigation.navigate('CatchDetails', { icon: arIcon });
    }
  }, [arIcon, navigation]);

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
          <Text style={styles.gpsPillText}>{userLocation ? 'GPS ON' : 'GPS...'}</Text>
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
                const spotList = (Array.isArray(spotData) ? spotData : (spotData.results || [])).filter(s => s.latitude && s.longitude && s.feature_types?.includes('catch'));
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
                  <View key={spot.id} style={[styles.spotRow, inRange && styles.spotRowActive]}>
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
                        <Text style={styles.inRangeBadgeText}>IN RANGE</Text>
                      </View>
                    )}
                  </View>
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
                {' '}/ {icons.length}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '0%' }]} />
            </View>
          </View>

          {/* Section heading */}
          <View style={styles.sectionRow}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Cultural Icons</Text>
          </View>
          <Text style={styles.sectionSub}>
            Visit catch zones to unlock AR experiences and learn about these icons.
          </Text>

          {/* 2×2 Icon Grid */}
          {icons.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="images-outline" size={36} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No cultural icons available yet.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {icons.map(icon => (
                <TouchableOpacity
                  key={icon.id}
                  style={[styles.iconCard, { borderColor: icon.color + '55' }]}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('CatchDetails', { icon })}
                >
                  <View style={[styles.cardGlow, { backgroundColor: icon.glow }]} />
                  <View style={[styles.modelRing, { borderColor: icon.color + '88', backgroundColor: icon.color + '18' }]}>
                    {icon.model_3d
                      ? <Ionicons name="cube-outline" size={28} color={icon.color} />
                      : <Ionicons name="fish-outline" size={28} color={icon.color} />}
                  </View>
                  <Text style={[styles.iconName, { color: icon.color }]}>{icon.name}</Text>
                  <Text style={styles.iconTagline} numberOfLines={2}>{icon.tagline}</Text>
                  <View style={[styles.arrowBtn, { backgroundColor: icon.color + '22', borderColor: icon.color + '44' }]}>
                    <Ionicons name="arrow-forward" size={14} color={icon.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Proximity Bottom Sheet ── */}
      {nearbySpot && (
        <ProximitySheet
          spot={nearbySpot.spot}
          icon={nearbySpot.icon}
          distanceM={nearbySpot.distanceM}
          onCatch={() => openAR(nearbySpot.icon)}
          onDismiss={handleProximityDismiss}
        />
      )}

      {/* ── AR Fullscreen Overlay ── */}
      <Modal visible={arVisible} animationType="fade" statusBarTranslucent onRequestClose={() => setArVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {arIcon && (
            <ARCatchOverlay
              icon={arIcon}
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
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 24 },
  iconRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 8,
  },
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
});
