import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Simulated exhibit data (replace with real API / navigation params) ──────
const EXHIBIT = {
  name: 'Yakan Traditional Loom',
  location: 'Fort Pilar Museum · 0.3m',
  historical: {
    label: 'HISTORICAL INFORMATION',
    body: 'The Yakan people of Basilan have woven intricate geometric textiles since the 14th century, each pattern carrying deep ancestral symbolism.',
    highlight: '14th century',
  },
  cultural: {
    label: 'CULTURAL SIGNIFICANCE',
    body: 'Yakan weaving signifies identity and social standing. The pis siyabit headcloth is worn in ceremonies and treasured as a heirloom.',
    highlight: 'pis siyabit',
  },
};

export default function ARScannedScreen({ navigation, route }) {
  const exhibit = route?.params?.exhibit ?? EXHIBIT;

  // Camera
  const [permission, requestPermission] = useCameraPermissions();

  // Scan-line animation (still running in bg for immersion)
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Overlay entrance animation
  const overlaySlide = useRef(new Animated.Value(60)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Detected badge pulse
  const badgePulse = useRef(new Animated.Value(1)).current;

  // Corner bracket glow
  const bracketGlow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Scan line loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();

    // Overlay slides up
    Animated.parallel([
      Animated.timing(overlaySlide, { toValue: 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Badge pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(badgePulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // Bracket glow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(bracketGlow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(bracketGlow, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const scanLineY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_H * 0.55] });

  const renderHighlight = (text, highlight) => {
    if (!highlight) return <Text style={styles.infoBody}>{text}</Text>;
    const parts = text.split(highlight);
    return (
      <Text style={styles.infoBody}>
        {parts[0]}
        <Text style={styles.infoHighlight}>{highlight}</Text>
        {parts[1]}
      </Text>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* ── Full-screen Camera Background ── */}
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
      ) : (
        <View style={styles.cameraFallback} />
      )}

      {/* Dark vignette overlay to keep UI readable */}
      <View style={styles.vignette} />

      {/* ── Scan Line (still active, immersion) ── */}
      <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />

      {/* ── Location badge top ── */}
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <Text style={styles.topTitle}>AR Mode</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <View style={{ width: 44 }} />
        </View>

        {/* Location chip */}
        <View style={styles.locationChip}>
          <View style={styles.locationDot} />
          <Text style={styles.locationText}>{exhibit.location}</Text>
        </View>
      </SafeAreaView>

      {/* ── AR Target Frame (center of screen) ── */}
      <View style={styles.targetFrame} pointerEvents="none">
        {/* Corner brackets */}
        <Animated.View style={[styles.bracket, styles.tl, { opacity: bracketGlow }]} />
        <Animated.View style={[styles.bracket, styles.tr, { opacity: bracketGlow }]} />
        <Animated.View style={[styles.bracket, styles.bl, { opacity: bracketGlow }]} />
        <Animated.View style={[styles.bracket, styles.br, { opacity: bracketGlow }]} />

        {/* Crosshair center */}
        <View style={styles.crosshair}>
          <View style={styles.crossH} />
          <View style={styles.crossV} />
        </View>

        {/* Exhibit name tag (attached to frame bottom) */}
        <View style={styles.exhibitTag}>
          <Text style={styles.exhibitTagText}>{exhibit.name}</Text>
        </View>
      </View>

      {/* ── EXHIBIT DETECTED badge ── */}
      <View style={styles.detectedBadgeWrapper} pointerEvents="none">
        <Animated.View style={[styles.detectedBadge, { transform: [{ scale: badgePulse }] }]}>
          <View style={styles.detectedDot} />
          <Text style={styles.detectedText}>EXHIBIT DETECTED</Text>
        </Animated.View>
      </View>

      {/* ── Floating Info Overlay ── */}
      <Animated.View
        style={[
          styles.overlayContainer,
          { transform: [{ translateY: overlaySlide }], opacity: overlayOpacity },
        ]}
      >
        {/* Info cards row */}
        <View style={styles.infoRow}>
          {/* Historical */}
          <View style={[styles.infoCard, styles.infoCardLeft]}>
            <Text style={[styles.infoLabel, { color: COLORS.gold }]}>{exhibit.historical.label}</Text>
            {renderHighlight(exhibit.historical.body, exhibit.historical.highlight)}
          </View>

          {/* Cultural */}
          <View style={[styles.infoCard, styles.infoCardRight]}>
            <Text style={[styles.infoLabel, { color: '#A78BFA' }]}>{exhibit.cultural.label}</Text>
            {renderHighlight(exhibit.cultural.body, exhibit.cultural.highlight)}
          </View>
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const FRAME_SIZE = 170;
const BRACKET_SIZE = 26;
const BRACKET_THICK = 3;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Camera / BG ──
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0520',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,0,18,0.38)',
  },

  // ── Scan line ──
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },

  // ── Top bar ──
  safeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  backArrow: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: FONTS.bold,
  },
  topCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  topTitle: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233,30,140,0.25)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(233,30,140,0.5)',
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  liveText: {
    color: COLORS.accent,
    fontSize: 9,
    fontFamily: FONTS.black,
    fontWeight: '800',
  },

  // ── Location chip ──
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 6,
  },
  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
  },
  locationText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
  },

  // ── Target frame ──
  targetFrame: {
    position: 'absolute',
    top: SCREEN_H * 0.22,
    left: (SCREEN_W - FRAME_SIZE) / 2,
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bracket: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    borderColor: COLORS.accent,
  },
  tl: { top: 0, left: 0, borderTopWidth: BRACKET_THICK, borderLeftWidth: BRACKET_THICK },
  tr: { top: 0, right: 0, borderTopWidth: BRACKET_THICK, borderRightWidth: BRACKET_THICK },
  bl: { bottom: 0, left: 0, borderBottomWidth: BRACKET_THICK, borderLeftWidth: BRACKET_THICK },
  br: { bottom: 0, right: 0, borderBottomWidth: BRACKET_THICK, borderRightWidth: BRACKET_THICK },
  crosshair: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossH: {
    position: 'absolute',
    width: 20,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  crossV: {
    position: 'absolute',
    width: 1.5,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  exhibitTag: {
    position: 'absolute',
    bottom: -30,
    backgroundColor: 'rgba(13,5,32,0.8)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  exhibitTagText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },

  // ── Detected badge ──
  detectedBadgeWrapper: {
    position: 'absolute',
    top: SCREEN_H * 0.22 + FRAME_SIZE + 46,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(233,30,140,0.22)',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  detectedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  detectedText: {
    color: COLORS.accent,
    fontSize: 11,
    fontFamily: FONTS.black,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // ── Floating overlay (bottom) ──
  overlayContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  infoCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
  },
  infoCardLeft: {
    backgroundColor: 'rgba(13,5,32,0.82)',
    borderColor: 'rgba(251,191,36,0.25)',
  },
  infoCardRight: {
    backgroundColor: 'rgba(13,5,32,0.82)',
    borderColor: 'rgba(167,139,250,0.25)',
  },
  infoLabel: {
    fontSize: 9,
    fontFamily: FONTS.black,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  infoBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontFamily: FONTS.regular,
    lineHeight: 17,
  },
  infoHighlight: {
    color: COLORS.gold,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },

  // ── Continue button ──
  continueBtn: {
    borderRadius: RADIUS.pill,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  continueBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
