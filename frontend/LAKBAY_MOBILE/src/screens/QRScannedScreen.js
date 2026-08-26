import React, { useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, StatusBar,
  ScrollView, Image, Animated, Easing, Dimensions, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { ORIGIN } from '../api/qrService';
import { useApp } from '../context/AppContext';
import VintaStripe from '../components/VintaStripe';

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
    gradient: ['rgba(37,99,235,0.22)', 'rgba(37,99,235,0.06)'],
    border: 'rgba(96,165,250,0.35)',
  },
  {
    key: 'historical',
    label: 'HISTORY',
    icon: 'time-outline',
    color: '#FBBF24',
    gradient: ['rgba(245,158,11,0.22)', 'rgba(245,158,11,0.06)'],
    border: 'rgba(251,191,36,0.35)',
  },
  {
    key: 'cultural',
    label: 'CULTURE',
    icon: 'sparkles-outline',
    color: '#A855F7',
    gradient: ['rgba(168,85,247,0.22)', 'rgba(168,85,247,0.06)'],
    border: 'rgba(168,85,247,0.35)',
  },
  {
    key: 'funFact',
    label: 'FUN FACT',
    icon: 'bulb-outline',
    color: '#10B981',
    gradient: ['rgba(16,185,129,0.22)', 'rgba(16,185,129,0.06)'],
    border: 'rgba(16,185,129,0.35)',
  },
];

export default function QRScannedScreen({ navigation, route }) {
  const spot = route?.params?.spot;
  const already_scanned = route?.params?.already_scanned ?? false;
  const { addNotification } = useApp();

  const combinedImages = spot
    ? [spot.image, spot.image2, spot.image3].filter(Boolean).map(formatImageUrl)
    : [];

  if (!spot) { navigation.goBack(); return null; }

  // ── Animations ──
  const headerOpacity  = useRef(new Animated.Value(0)).current;
  const heroScale      = useRef(new Animated.Value(0.94)).current;
  const heroOpacity    = useRef(new Animated.Value(0)).current;
  const badgeScale     = useRef(new Animated.Value(0)).current;
  const badgeOpacity   = useRef(new Animated.Value(0)).current;
  const pulse          = useRef(new Animated.Value(1)).current;
  const contentY       = useRef(new Animated.Value(40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const btnY           = useRef(new Animated.Value(30)).current;
  const btnOpacity     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const xpReward = spot.xp_reward || 50;
    if (spot && !already_scanned) {
      addNotification({
        type: 'scan',
        icon: '📷',
        title: 'QR Scanned!',
        sub: `You unlocked ${spot.name} — +${xpReward} XP`,
      });
    }

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
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── Header ── */}
        <Animated.View style={[styles.appHeader, { opacity: headerOpacity }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerBadge}>
              <Ionicons name="scan" size={11} color={COLORS.teal} style={{ marginRight: 5 }} />
              <Text style={styles.headerBadgeText}>QR DISCOVERY</Text>
            </View>
            <Text style={styles.headerTitle}>Discovery Unlocked</Text>
          </View>

          <View style={{ width: 38 }} />
        </Animated.View>
        <VintaStripe height={3} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Already scanned banner ── */}
          {already_scanned && (
            <View style={styles.alreadyBanner}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
              <Text style={styles.alreadyBannerText}>Already scanned — revisiting this heritage spot</Text>
            </View>
          )}

          {/* ── Hero image carousel / display ── */}
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
                  >
                  </Image>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.heroPlaceholder}>
                <Text style={{ fontSize: 56 }}>🏛️</Text>
              </View>
            )}

            {/* Dark gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(4,10,38,0.92)']}
              style={styles.heroGradient}
            />

            {/* Status badge */}
            <View style={styles.scannedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={COLORS.teal} />
              <Text style={styles.scannedBadgeText}>LOGGED</Text>
            </View>

            {/* Dot indicators */}
            {combinedImages.length > 1 && (
              <View style={styles.dotRow}>
                {combinedImages.map((_, i) => (
                  <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
                ))}
              </View>
            )}

            {/* Name & Location overlay on hero */}
            <View style={styles.heroMeta}>
              <Text style={styles.heroSpotName} numberOfLines={2}>{spot.name}</Text>
              {spot.location_name ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-sharp" size={13} color={COLORS.teal} />
                  <Text style={styles.locationText}>{spot.location_name}</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {/* ── XP reward chip + Hook ── */}
          <Animated.View style={[styles.metaRow, { transform: [{ scale: badgeScale }], opacity: badgeOpacity }]}>
            <Animated.View style={[styles.xpChip, { transform: [{ scale: pulse }] }]}>
              <Ionicons name="flash" size={13} color={COLORS.gold} />
              <Text style={styles.xpText}>+{spot.xp_reward || 50} XP EARNED</Text>
            </Animated.View>
            {spot.hook ? (
              <Text style={styles.hookText}>"{spot.hook}"</Text>
            ) : null}
          </Animated.View>

          {/* ── Lore Info Cards ── */}
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

          {/* ── Bottom Action CTAs ── */}
          <Animated.View style={[styles.btnWrapper, { transform: [{ translateY: btnY }], opacity: btnOpacity }]}>
            <TouchableOpacity
              style={styles.quizBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('QuizScreen', { spotId: spot.id, spotName: spot.name })}
            >
              <LinearGradient
                colors={[COLORS.accent, '#1E40AF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.quizBtnGradient}
              >
                <Ionicons name="game-controller" size={18} color="#FFFFFF" />
                <Text style={styles.quizBtnText}>Take Spot Trivia Quiz</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.75)" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.backLinkText}>← Return to Scanner</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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

  // ── Header ──
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(8, 20, 60, 0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 179, 237, 0.20)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    marginBottom: 2,
  },
  headerBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 8.5,
    color: COLORS.teal,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // ── Already Scanned Banner ──
  alreadyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  alreadyBannerText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.teal,
  },

  // ── Hero ──
  heroWrapper: {
    height: 240,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    ...SHADOW.accent,
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  scannedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(8,20,60,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.40)',
  },
  scannedBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.teal,
    letterSpacing: 1,
  },
  dotRow: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 18,
    backgroundColor: COLORS.teal,
  },
  heroMeta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  heroSpotName: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'rgba(191,215,255,0.85)',
  },

  // ── XP & Hook ──
  metaRow: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 8,
  },
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  xpText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  hookText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: 'rgba(191,215,255,0.70)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // ── Info Cards ──
  infoCard: {
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    backgroundColor: 'rgba(8, 20, 60, 0.58)',
  },
  infoCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  infoCardDivider: {
    flex: 1,
    height: 1,
  },
  infoCardBody: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
  },

  // ── CTA Buttons ──
  btnWrapper: {
    marginTop: 8,
    gap: 12,
  },
  quizBtn: {
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    ...SHADOW.accent,
  },
  quizBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    gap: 8,
  },
  quizBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  backLinkText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'rgba(191,215,255,0.50)',
  },
});
