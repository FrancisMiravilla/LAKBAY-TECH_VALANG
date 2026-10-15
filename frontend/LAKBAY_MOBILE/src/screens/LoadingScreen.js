import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW, BG_OVERLAY, GOLD_TEXT } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import VintaStripe from '../components/VintaStripe';

const { width: SCREEN_W } = Dimensions.get('window');

const LOADING_STEPS = [
  { min: 0,  max: 25, text: 'INITIALIZING MAP COORDINATES...' },
  { min: 25, max: 55, text: 'LOADING HERITAGE SITES & AR ARTIFACTS...' },
  { min: 55, max: 85, text: 'SYNCING EXPLORER QUESTS & XP RANKS...' },
  { min: 85, max: 99, text: 'PREPARING YOUR ZAMBOANGA ADVENTURE...' },
  { min: 100, max: 100, text: 'READY! WELCOME EXPLORER!' },
];

export default function LoadingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [percent, setPercent] = useState(0);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const logoPop      = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoPop, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress counter listener
    const listenerId = progressAnim.addListener(({ value }) => {
      setPercent(Math.min(100, Math.floor(value)));
    });

    // Staged loading progress animation (total ~2.4s)
    Animated.sequence([
      Animated.timing(progressAnim, {
        toValue: 35,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 70,
        duration: 700,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 92,
        duration: 500,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Small pause at 100% before navigating
      setTimeout(() => {
        navigation.replace('Welcome');
      }, 350);
    });

    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [navigation]);

  // Interpolated widths & opacities
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const currentStep = LOADING_STEPS.find(
    (step) => percent >= step.min && percent <= step.max
  ) || LOADING_STEPS[0];

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bg}
      resizeMode="cover"
    >
      {/* Dark overlay with glassmorphism tint */}
      <View style={styles.bgOverlay} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}>
        {/* ── Top Tag ── */}
        {/* ── Center Emblem & Brand (flex: 1 anchored) ── */}
        <View style={styles.centerWrap}>
          <Animated.Image
            source={require('../assets/lakbay_icon_glyph.png')}
            resizeMode="contain"
            style={[styles.logoImg, { transform: [{ scale: logoPop }] }]}
          />

          <Animated.View style={[styles.brandWrap, { opacity: fadeAnim }]}>
            <Text style={styles.appTitle}>LAKBAY</Text>
            <VintaStripe height={4} />
            <Text style={styles.appSubtitle}>CITY OF FLOWERS</Text>
          </Animated.View>
        </View>

        {/* ── Bottom Gamified Loading HUD ── */}
        <Animated.View style={{ opacity: fadeAnim }}>
        <VintaCard contentStyle={styles.loadingHud}>
          {/* Header Row: "LOADING..." + "0-100%" */}
          <View style={styles.hudHeaderRow}>
            <View style={styles.loadingLabelWrap}>
              <Text style={styles.loadingPixelText}>LOADING...</Text>
            </View>
            <View style={styles.percentBadge}>
              <Text style={styles.percentText}>{percent}%</Text>
            </View>
          </View>

          {/* ── Gamified Progress Bar Track ── */}
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width: progressWidth }]}>
              <LinearGradient
                colors={['#10B981', '#3B82F6', '#FBBF24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Highlight shimmer line */}
              <View style={styles.barHighlight} />
            </Animated.View>
          </View>

          {/* ── Bottom Step Status (fixed height to prevent layout jumps) ── */}
          <View style={styles.statusWrap}>
            <Text style={styles.statusText} numberOfLines={1}>
              {currentStep.text}
            </Text>
          </View>

        </VintaCard>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_OVERLAY,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // ── Top Tag ────────────────────────────────────────────────────────────────

  // ── Center Emblem ──────────────────────────────────────────────────────────
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  brandWrap: {
    alignItems: 'center',
    width: '100%',
  },
  appTitle: {
    fontFamily: FONTS.bold,
    fontSize: 48,
    lineHeight: 52,
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(251, 191, 36, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  appSubtitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: 'rgba(191, 215, 255, 0.85)',
    letterSpacing: 4,
    marginTop: 10,
  },

  // ── Bottom Loading HUD ─────────────────────────────────────────────────────
  loadingHud: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 108,
  },
  hudHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    height: 24,
  },
  loadingLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingPixelText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: GOLD_TEXT,
    letterSpacing: 1.5,
  },
  percentBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.55)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: GOLD_TEXT,
    letterSpacing: 1,
    textAlign: 'center',
  },

  // ── Progress Bar ───────────────────────────────────────────────────────────
  barTrack: {
    width: '100%',
    height: 14,
    backgroundColor: COLORS.bg,
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },

  // ── Status Text ────────────────────────────────────────────────────────────
  statusWrap: {
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
});
