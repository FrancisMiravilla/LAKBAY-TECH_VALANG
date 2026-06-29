import React, { useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, StatusBar,
  ScrollView, Image, Animated, Easing, Dimensions, LinearGradient,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING, SIZES } from '../constants/theme';
import { ORIGIN } from '../api/qrService';

const { width: SCREEN_W } = Dimensions.get('window');

const formatImageUrl = (img) => {
  if (!img) return null;
  if (img.startsWith('http://localhost:8000') || img.startsWith('http://127.0.0.1:8000')) {
    return img.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, ORIGIN);
  }
  if (img.startsWith('/media')) return `${ORIGIN}${img}`;
  return img;
};

const CARD_SECTIONS = [
  { key: 'historical', icon: 'time-outline',     color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',   border: 'rgba(251,191,36,0.28)' },
  { key: 'cultural',   icon: 'sparkles-outline', color: '#A78BFA', bg: 'rgba(167,139,250,0.10)',  border: 'rgba(167,139,250,0.28)' },
  { key: 'funFact',    icon: 'bulb-outline',      color: '#10B981', bg: 'rgba(16,185,129,0.10)',   border: 'rgba(16,185,129,0.28)' },
];

export default function QRScannedScreen({ navigation, route }) {
  const spot = route?.params?.spot;
  const already_scanned = route?.params?.already_scanned ?? false;

  const combinedImages = spot
    ? [spot.image, spot.image2, spot.image3].filter(Boolean).map(formatImageUrl)
    : [];

  if (!spot) { navigation.goBack(); return null; }

  // ── Animations ──
  const unlockScale   = useRef(new Animated.Value(0)).current;
  const unlockOpacity = useRef(new Animated.Value(0)).current;
  const headerY       = useRef(new Animated.Value(-40)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const imageScale    = useRef(new Animated.Value(0.88)).current;
  const imageOpacity  = useRef(new Animated.Value(0)).current;
  const card1Y        = useRef(new Animated.Value(50)).current;
  const card1Opacity  = useRef(new Animated.Value(0)).current;
  const card2Y        = useRef(new Animated.Value(60)).current;
  const card2Opacity  = useRef(new Animated.Value(0)).current;
  const card3Y        = useRef(new Animated.Value(70)).current;
  const card3Opacity  = useRef(new Animated.Value(0)).current;
  const btnY          = useRef(new Animated.Value(30)).current;
  const btnOpacity    = useRef(new Animated.Value(0)).current;
  const pulse         = useRef(new Animated.Value(1)).current;
  const ringScale     = useRef(new Animated.Value(0.6)).current;
  const ringOpacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    // Pulse loop for the unlock badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();

    (async () => {
      // Unlock badge pop-in
      Animated.parallel([
        Animated.spring(unlockScale,   { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(unlockOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(ringScale,     { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(ringOpacity,   { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();

      await delay(150);

      // Header slides in
      Animated.parallel([
        Animated.timing(headerY,       { toValue: 0, duration: 380, useNativeDriver: true }),
        Animated.timing(headerOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();

      await delay(200);

      // Hero image pops in
      Animated.parallel([
        Animated.timing(imageScale,   { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.15)), useNativeDriver: true }),
        Animated.timing(imageOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();

      await delay(180);

      // Info cards cascade in
      for (const [slideAnim, opacityAnim] of [
        [card1Y, card1Opacity],
        [card2Y, card2Opacity],
        [card3Y, card3Opacity],
      ]) {
        Animated.parallel([
          Animated.timing(slideAnim,   { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 330, useNativeDriver: true }),
        ]).start();
        await delay(100);
      }

      // Button
      Animated.parallel([
        Animated.timing(btnY,       { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    })();
  }, []);

  const cardAnims = [
    [card1Y, card1Opacity],
    [card2Y, card2Opacity],
    [card3Y, card3Opacity],
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Glow ring behind unlock badge ── */}
      <Animated.View
        pointerEvents="none"
        style={[styles.glowRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
      />

      {/* ── App Header ── */}
      <Animated.View style={[styles.appHeader, { transform: [{ translateY: headerY }], opacity: headerOpacity }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerBadge}>
            <Ionicons name="scan" size={12} color={COLORS.accent} style={{ marginRight: 5 }} />
            <Text style={styles.headerBadgeText}>QR SCAN</Text>
          </View>
          <Text style={styles.headerTitle}>Discovery Unlocked</Text>
        </View>

        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Already scanned banner ── */}
        {already_scanned && (
          <View style={styles.alreadyBanner}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.teal} />
            <Text style={styles.alreadyBannerText}>Already scanned — revisiting this spot</Text>
          </View>
        )}

        {/* ── Unlock hero badge ── */}
        <Animated.View style={[styles.unlockBadgeWrapper, { transform: [{ scale: unlockScale }], opacity: unlockOpacity }]}>
          <View style={styles.unlockBadgeOuter}>
            <Animated.View style={[styles.unlockBadgeInner, { transform: [{ scale: pulse }] }]}>
              <Ionicons name="checkmark" size={42} color={COLORS.accent} />
            </Animated.View>
          </View>
          <View style={styles.unlockXPChip}>
            <Ionicons name="star" size={11} color={COLORS.gold} />
            <Text style={styles.unlockXPText}>+50 XP</Text>
          </View>
        </Animated.View>

        {/* ── Spot name & location ── */}
        <View style={styles.spotMeta}>
          <Text style={styles.spotName}>{spot.name}</Text>
          {spot.hook ? <Text style={styles.spotHook}>"{spot.hook}"</Text> : null}
          {spot.location_name ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={13} color={COLORS.accent} />
              <Text style={styles.locationText}>{spot.location_name}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Image slider ── */}
        <Animated.View style={[styles.imageWrapper, { transform: [{ scale: imageScale }], opacity: imageOpacity }]}>
          {combinedImages.length > 0 ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SCREEN_W - 32}
                decelerationRate="fast"
                style={{ width: '100%', height: '100%' }}
                contentContainerStyle={{ paddingRight: 0 }}
              >
                {combinedImages.map((imgUrl, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: imgUrl }}
                    style={{ width: SCREEN_W - 32, height: '100%', borderRadius: RADIUS.lg }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {/* Dot indicators */}
              {combinedImages.length > 1 && (
                <View style={styles.dotRow}>
                  {combinedImages.map((_, i) => (
                    <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderEmoji}>🏛️</Text>
              <Text style={styles.placeholderText}>{spot.name}</Text>
            </View>
          )}
          <View style={styles.imageScrim} />

          {/* Top-right scan success badge */}
          <View style={styles.scanSuccessBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#fff" />
            <Text style={styles.scanSuccessText}>SCANNED</Text>
          </View>
        </Animated.View>

        {/* ── Info cards ── */}
        {CARD_SECTIONS.map((section, idx) => {
          const data = spot[section.key];
          if (!data?.body) return null;
          const [translateY, opacity] = cardAnims[idx];
          return (
            <Animated.View
              key={section.key}
              style={[
                styles.infoCard,
                { backgroundColor: section.bg, borderColor: section.border },
                { transform: [{ translateY }], opacity },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoIconCircle, { backgroundColor: section.color + '22' }]}>
                  <Ionicons name={section.icon} size={14} color={section.color} />
                </View>
                <Text style={[styles.infoCardLabel, { color: section.color }]}>{data.label}</Text>
                <View style={[styles.infoCardLine, { backgroundColor: section.color + '40' }]} />
              </View>
              <Text style={styles.infoCardBody}>{data.body}</Text>
            </Animated.View>
          );
        })}

        {/* ── Continue / Quiz button ── */}
        <Animated.View style={[styles.btnWrapper, { transform: [{ translateY: btnY }], opacity: btnOpacity }]}>
          <TouchableOpacity
            style={styles.continueBtn}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('QuizScreen', { spotId: spot.id, spotName: spot.name })}
          >
            <View style={styles.continueBtnInner}>
              <Ionicons name="game-controller" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.continueBtnText}>Take the Quiz</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToMapBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backToMapText}>← Back to Scanner</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Ambient glow ring
  glowRing: {
    position: 'absolute',
    top: -60,
    left: SCREEN_W / 2 - 160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(233,30,140,0.12)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
  },

  // ── Header ──
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accentBorder,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.accentBorder,
    marginBottom: 3,
  },
  headerBadgeText: {
    fontFamily: FONTS.bold, fontSize: 9,
    color: COLORS.accent, letterSpacing: 1.5,
  },
  headerTitle: {
    fontFamily: FONTS.bold, fontSize: 14,
    color: '#fff', letterSpacing: 0.5,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // ── Already scanned ──
  alreadyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 18,
  },
  alreadyBannerText: {
    fontFamily: FONTS.semiBold, fontSize: 12.5,
    color: COLORS.teal,
  },

  // ── Unlock badge ──
  unlockBadgeWrapper: {
    alignItems: 'center', marginBottom: 20,
  },
  unlockBadgeOuter: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: COLORS.accentBorder,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 22, elevation: 10,
  },
  unlockBadgeInner: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: 'rgba(233,30,140,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  unlockEmoji: { fontSize: 36 },
  unlockXPChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, backgroundColor: COLORS.goldSoft,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.goldGlow,
  },
  unlockXPText: {
    fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold,
  },

  // ── Spot meta ──
  spotMeta: { alignItems: 'center', marginBottom: 18 },
  spotName: {
    fontFamily: FONTS.bold, fontSize: 24,
    color: '#fff', textAlign: 'center', lineHeight: 30, marginBottom: 6,
  },
  spotHook: {
    fontFamily: FONTS.medium, fontSize: 13,
    color: COLORS.accent, fontStyle: 'italic', marginBottom: 8,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  locationText: {
    fontFamily: FONTS.medium, fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
  },

  // ── Image slider ──
  imageWrapper: {
    height: 220, borderRadius: RADIUS.lg, overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.accentBorder,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 18, elevation: 8,
  },
  imagePlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
  },
  placeholderEmoji: { fontSize: 48, marginBottom: 8 },
  placeholderText: {
    fontFamily: FONTS.semiBold, fontSize: 13,
    color: COLORS.textSub, textAlign: 'center',
  },
  imageScrim: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 70,
    backgroundColor: 'rgba(13,5,32,0.55)',
  },
  dotRow: {
    position: 'absolute', bottom: 12,
    flexDirection: 'row', alignSelf: 'center', gap: 5,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 18, backgroundColor: COLORS.accent,
  },
  scanSuccessBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16,185,129,0.85)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  scanSuccessText: {
    fontFamily: FONTS.bold, fontSize: 10,
    color: '#fff', letterSpacing: 1,
  },

  // ── Info cards ──
  infoCard: {
    borderRadius: RADIUS.md, padding: 16,
    marginBottom: 12, borderWidth: 1,
  },
  infoCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, gap: 8,
  },
  infoIconCircle: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  infoCardLabel: {
    fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1.4,
  },
  infoCardLine: {
    flex: 1, height: 1,
  },
  infoCardBody: {
    fontFamily: FONTS.regular,
    fontSize: 13.5, color: 'rgba(255,255,255,0.82)',
    lineHeight: 21,
  },

  // ── Buttons ──
  btnWrapper: { marginTop: 8, gap: 12 },
  continueBtn: {
    borderRadius: RADIUS.pill, overflow: 'hidden',
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 18, elevation: 10,
  },
  continueBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 24,
  },
  continueBtnText: {
    fontFamily: FONTS.bold, fontSize: 16,
    color: '#fff', letterSpacing: 0.5,
  },
  backToMapBtn: {
    alignItems: 'center', paddingVertical: 10,
  },
  backToMapText: {
    fontFamily: FONTS.medium, fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
});
