import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

export default function QRScannedScreen({ navigation, route }) {
  const spot = route?.params?.spot;
  const already_scanned = route?.params?.already_scanned ?? false;

  // Safety: if navigated without data, go back
  if (!spot) {
    navigation.goBack();
    return null;
  }

  // Card entrance animations
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.92)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const card1Slide = useRef(new Animated.Value(40)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card2Slide = useRef(new Animated.Value(60)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card3Slide = useRef(new Animated.Value(80)).current;
  const card3Opacity = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(30)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      // Header
      Animated.parallel([
        Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      await delay(120);

      // Image
      Animated.parallel([
        Animated.timing(imageScale, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        Animated.timing(imageOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();

      await delay(200);

      // Card 1
      Animated.parallel([
        Animated.timing(card1Slide, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(card1Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();

      await delay(120);

      // Card 2
      Animated.parallel([
        Animated.timing(card2Slide, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(card2Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();

      await delay(100);

      // Card 3
      Animated.parallel([
        Animated.timing(card3Slide, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(card3Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();

      await delay(100);

      // Button
      Animated.parallel([
        Animated.timing(btnSlide, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── App Header ── */}
      <Animated.View style={[styles.appHeader, { transform: [{ translateY: headerSlide }], opacity: headerOpacity }]}>
        {/* Left: back + logo */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.pageTitle}>QR SCAN MODE</Text>
        </View>

        {/* Right spacer */}
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Already scanned banner ── */}
        {already_scanned && (
          <View style={styles.alreadyScannedBanner}>
            <Text style={styles.alreadyScannedText}>✓ You've already scanned this spot</Text>
          </View>
        )}

        {/* ── Location chip & Hook ── */}
        <View style={styles.locationChipRow}>
          <View style={styles.locationChip}>
            <View style={styles.locationDot} />
            <Text style={styles.locationText}>{spot.name}</Text>
          </View>
          {spot.hook ? (
            <Text style={styles.hookText}>"{spot.hook}"</Text>
          ) : null}
        </View>

        {/* ── Hero image ── */}
        <Animated.View
          style={[
            styles.imageWrapper,
            { transform: [{ scale: imageScale }], opacity: imageOpacity },
          ]}
        >
          {spot.image ? (
            <Image source={{ uri: spot.image }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderEmoji}>🏛️</Text>
              <Text style={styles.imagePlaceholderText}>{spot.name}</Text>
            </View>
          )}
          {/* Gradient scrim at bottom */}
          <View style={styles.imageScrim} />
        </Animated.View>

        {/* ── Historical Info Card ── */}
        <Animated.View
          style={[
            styles.infoCard,
            styles.infoCardGold,
            { transform: [{ translateY: card1Slide }], opacity: card1Opacity },
          ]}
        >
          <View style={styles.infoCardHeader}>
            <View style={[styles.infoAccentBar, { backgroundColor: COLORS.gold }]} />
            <Text style={[styles.infoCardLabel, { color: COLORS.gold }]}>{spot.historical.label}</Text>
          </View>
          <Text style={styles.infoCardBody}>{spot.historical.body}</Text>
        </Animated.View>

        {/* ── Cultural Significance Card ── */}
        <Animated.View
          style={[
            styles.infoCard,
            styles.infoCardPurple,
            { transform: [{ translateY: card2Slide }], opacity: card2Opacity },
          ]}
        >
          <View style={styles.infoCardHeader}>
            <View style={[styles.infoAccentBar, { backgroundColor: '#A78BFA' }]} />
            <Text style={[styles.infoCardLabel, { color: '#A78BFA' }]}>{spot.cultural.label}</Text>
          </View>
          <Text style={styles.infoCardBody}>{spot.cultural.body}</Text>
        </Animated.View>

        {/* ── Fun Fact Card ── */}
        <Animated.View
          style={[
            styles.infoCard,
            styles.infoCardTeal,
            { transform: [{ translateY: card3Slide }], opacity: card3Opacity },
          ]}
        >
          <View style={styles.infoCardHeader}>
            <View style={[styles.infoAccentBar, { backgroundColor: '#14B8A6' }]} />
            <Text style={[styles.infoCardLabel, { color: '#14B8A6' }]}>{spot.funFact.label}</Text>
          </View>
          <Text style={styles.infoCardBody}>{spot.funFact.body}</Text>
        </Animated.View>

        {/* ── Continue Button ── */}
        <Animated.View style={[{ transform: [{ translateY: btnSlide }], opacity: btnOpacity }, styles.continueBtnWrapper]}>
          <TouchableOpacity
            style={styles.continueBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('QuizScreen', { spotId: spot.id, spotName: spot.name })}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
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

  // ── App header ──
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accentBorder,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: FONTS.bold,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  pageTitle: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FONTS.black,
    fontWeight: '900',
    letterSpacing: 2.5,
  },

  // ── Scroll content ──
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },

  // ── Already scanned banner ──
  alreadyScannedBanner: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  alreadyScannedText: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
  },

  // ── Location chip ──
  locationChipRow: {
    marginBottom: 12,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  locationText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
  },
  hookText: {
    color: COLORS.accentPink || '#E91E8C',
    fontSize: 13,
    fontFamily: FONTS.medium,
    fontStyle: 'italic',
    marginTop: 8,
    marginLeft: 4,
  },

  // ── Hero image ──
  imageWrapper: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 16,
    height: 210,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
  },
  imagePlaceholderEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  imagePlaceholderText: {
    color: COLORS.textSub,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
  imageScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(13,5,32,0.55)',
  },

  // ── Info cards ──
  infoCard: {
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  infoCardGold: {
    backgroundColor: 'rgba(251,191,36,0.07)',
    borderColor: 'rgba(251,191,36,0.22)',
  },
  infoCardPurple: {
    backgroundColor: 'rgba(167,139,250,0.07)',
    borderColor: 'rgba(167,139,250,0.22)',
  },
  infoCardTeal: {
    backgroundColor: 'rgba(20,184,166,0.07)',
    borderColor: 'rgba(20,184,166,0.22)',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  infoAccentBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  infoCardLabel: {
    fontSize: 10,
    fontFamily: FONTS.black,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  infoCardBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12.5,
    fontFamily: FONTS.regular,
    lineHeight: 20,
    textAlign: 'center',
  },

  // ── Continue button ──
  continueBtnWrapper: {
    marginTop: 6,
  },
  continueBtn: {
    borderRadius: RADIUS.pill,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
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
