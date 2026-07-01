import React, { useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, StatusBar,
  ScrollView, Image, Animated, Easing, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
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
  {
    key: 'description',
    label: 'ABOUT',
    icon: 'information-circle-outline',
    color: '#60A5FA',
    gradient: ['rgba(37,99,235,0.20)', 'rgba(37,99,235,0.06)'],
    border: 'rgba(96,165,250,0.30)',
  },
  {
    key: 'historical',
    label: 'HISTORY',
    icon: 'time-outline',
    color: '#FBBF24',
    gradient: ['rgba(180,130,0,0.20)', 'rgba(180,130,0,0.06)'],
    border: 'rgba(251,191,36,0.30)',
  },
  {
    key: 'cultural',
    label: 'CULTURE',
    icon: 'sparkles-outline',
    color: '#C084FC',
    gradient: ['rgba(147,51,234,0.20)', 'rgba(147,51,234,0.06)'],
    border: 'rgba(192,132,252,0.30)',
  },
  {
    key: 'funFact',
    label: 'FUN FACT',
    icon: 'bulb-outline',
    color: '#34D399',
    gradient: ['rgba(5,150,105,0.20)', 'rgba(5,150,105,0.06)'],
    border: 'rgba(52,211,153,0.30)',
  },
];

export default function QRScannedScreen({ navigation, route }) {
  const spot = route?.params?.spot;
  const already_scanned = route?.params?.already_scanned ?? false;

  const combinedImages = spot
    ? [spot.image, spot.image2, spot.image3].filter(Boolean).map(formatImageUrl)
    : [];

  if (!spot) { navigation.goBack(); return null; }

  // ── Animations ──
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const heroScale     = useRef(new Animated.Value(0.94)).current;
  const heroOpacity   = useRef(new Animated.Value(0)).current;
  const badgeScale    = useRef(new Animated.Value(0)).current;
  const badgeOpacity  = useRef(new Animated.Value(0)).current;
  const pulse         = useRef(new Animated.Value(1)).current;
  const contentY      = useRef(new Animated.Value(40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const btnY          = useRef(new Animated.Value(30)).current;
  const btnOpacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 950, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();

    (async () => {
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(heroScale,     { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
        Animated.timing(heroOpacity,   { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      await delay(200);

      Animated.parallel([
        Animated.spring(badgeScale,   { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      await delay(250);

      Animated.parallel([
        Animated.timing(contentY,       { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();

      await delay(200);

      Animated.parallel([
        Animated.timing(btnY,       { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0118" />

      {/* ── Header ── */}
      <Animated.View style={[styles.appHeader, { opacity: headerOpacity }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerBadge}>
            <Ionicons name="scan" size={11} color="#E91E8C" style={{ marginRight: 5 }} />
            <Text style={styles.headerBadgeText}>QR SCAN</Text>
          </View>
          <Text style={styles.headerTitle}>Discovery Unlocked</Text>
        </View>

        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Already scanned banner ── */}
        {already_scanned && (
          <View style={styles.alreadyBanner}>
            <Ionicons name="checkmark-circle" size={15} color="#34D399" />
            <Text style={styles.alreadyBannerText}>Already scanned — revisiting this spot</Text>
          </View>
        )}

        {/* ── Hero image ── */}
        <Animated.View style={[styles.heroWrapper, { transform: [{ scale: heroScale }], opacity: heroOpacity }]}>
          {combinedImages.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SCREEN_W - 32}
              decelerationRate="fast"
              style={{ width: '100%', height: '100%' }}
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
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={{ fontSize: 56 }}>🏛️</Text>
            </View>
          )}

          {/* Gradient overlay on bottom of image */}
          <LinearGradient
            colors={['transparent', 'rgba(10,1,24,0.85)']}
            style={styles.heroGradient}
          />

          {/* Scanned badge */}
          <View style={styles.scannedBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#34D399" />
            <Text style={styles.scannedBadgeText}>SCANNED</Text>
          </View>

          {/* Dot indicators for multiple images */}
          {combinedImages.length > 1 && (
            <View style={styles.dotRow}>
              {combinedImages.map((_, i) => (
                <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* Name overlay on hero */}
          <View style={styles.heroMeta}>
            <Text style={styles.heroSpotName} numberOfLines={2}>{spot.name}</Text>
            {spot.location_name ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={12} color="#E91E8C" />
                <Text style={styles.locationText}>{spot.location_name}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* ── XP badge + hook ── */}
        <Animated.View style={[styles.metaRow, { transform: [{ scale: badgeScale }], opacity: badgeOpacity }]}>
          <Animated.View style={[styles.xpChip, { transform: [{ scale: pulse }] }]}>
            <Ionicons name="star" size={13} color="#FBBF24" />
            <Text style={styles.xpText}>+50 XP EARNED</Text>
          </Animated.View>
          {spot.hook ? (
            <Text style={styles.hookText}>"{spot.hook}"</Text>
          ) : null}
        </Animated.View>

        {/* ── Info cards ── */}
        <Animated.View style={{ transform: [{ translateY: contentY }], opacity: contentOpacity }}>
          {CARD_SECTIONS.map((section) => {
            const data = spot[section.key];
            const body = typeof data === 'object' && data !== null ? data.body : data;
            if (!body) return null;
            return (
              <View key={section.key} style={[styles.infoCard, { borderColor: section.border }]}>
                <LinearGradient colors={section.gradient} style={styles.infoCardGradient} />
                <View style={styles.infoCardHeader}>
                  <View style={[styles.infoIconCircle, { backgroundColor: section.color + '22' }]}>
                    <Ionicons name={section.icon} size={15} color={section.color} />
                  </View>
                  <Text style={[styles.infoCardLabel, { color: section.color }]}>{section.label}</Text>
                  <View style={[styles.infoCardDivider, { backgroundColor: section.color + '35' }]} />
                </View>
                <Text style={styles.infoCardBody}>{body}</Text>
              </View>
            );
          })}
        </Animated.View>

        {/* ── CTA ── */}
        <Animated.View style={[styles.btnWrapper, { transform: [{ translateY: btnY }], opacity: btnOpacity }]}>
          <TouchableOpacity
            style={styles.quizBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('QuizScreen', { spotId: spot.id, spotName: spot.name })}
          >
            <LinearGradient
              colors={['#E91E8C', '#9C27B0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.quizBtnGradient}
            >
              <Ionicons name="game-controller" size={20} color="#fff" />
              <Text style={styles.quizBtnText}>Take the Quiz</Text>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.75)" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>← Back to Scanner</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0118' },

  // ── Header ──
  appHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 60, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(233,30,140,0.15)',
    backgroundColor: '#0A0118',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(233,30,140,0.12)',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(233,30,140,0.25)',
    marginBottom: 3,
  },
  headerBadgeText: { fontFamily: FONTS.bold, fontSize: 9, color: '#E91E8C', letterSpacing: 1.5 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff', letterSpacing: 0.4 },

  // ── Scroll ──
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },

  // ── Already scanned ──
  alreadyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 14,
  },
  alreadyBannerText: { fontFamily: FONTS.semiBold, fontSize: 12.5, color: '#34D399' },

  // ── Hero ──
  heroWrapper: {
    height: 240, borderRadius: RADIUS.lg, overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(233,30,140,0.20)',
    shadowColor: '#E91E8C',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.30, shadowRadius: 22, elevation: 10,
  },
  heroPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 },
  scannedBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(5,46,22,0.88)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)',
  },
  scannedBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: '#34D399', letterSpacing: 1 },
  dotRow: {
    position: 'absolute', bottom: 54, flexDirection: 'row', alignSelf: 'center', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 18, backgroundColor: '#E91E8C' },
  heroMeta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
  },
  heroSpotName: {
    fontFamily: FONTS.bold, fontSize: 22, color: '#FFFFFF',
    lineHeight: 28, marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: FONTS.medium, fontSize: 12, color: 'rgba(255,255,255,0.75)' },

  // ── XP / hook ──
  metaRow: { alignItems: 'center', marginBottom: 22, gap: 10 },
  xpChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(251,191,36,0.12)',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(251,191,36,0.30)',
  },
  xpText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FBBF24', letterSpacing: 1 },
  hookText: {
    fontFamily: FONTS.medium, fontSize: 13.5, color: 'rgba(255,255,255,0.60)',
    fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 16,
  },

  // ── Info cards ──
  infoCard: {
    borderRadius: 16, marginBottom: 14,
    borderWidth: 1, overflow: 'hidden',
    padding: 18,
  },
  infoCardGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  infoCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  infoIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  infoCardLabel: {
    fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1.8,
  },
  infoCardDivider: { flex: 1, height: 1 },
  infoCardBody: {
    fontFamily: FONTS.regular, fontSize: 14.5,
    color: 'rgba(255,255,255,0.90)',
    lineHeight: 23,
    letterSpacing: 0.2,
  },

  // ── CTA ──
  btnWrapper: { marginTop: 10, gap: 14 },
  quizBtn: {
    borderRadius: 32, overflow: 'hidden',
    shadowColor: '#E91E8C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 20, elevation: 12,
  },
  quizBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, paddingHorizontal: 28, gap: 10,
  },
  quizBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff', letterSpacing: 0.4 },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.38)' },
});
