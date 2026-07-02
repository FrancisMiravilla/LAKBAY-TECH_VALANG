import React, { useEffect, useRef } from 'react';
import {
  ImageBackground, Image, StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Animated, Easing, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import VintaStripe from '../components/VintaStripe';

const { height: SCREEN_H } = Dimensions.get('window');

const FEATURES = [
  { icon: 'map-outline',      label: 'Explore Heritage' },
  { icon: 'qr-code-outline',  label: 'Scan & Earn XP'   },
  { icon: 'trophy-outline',   label: 'Collect Badges'   },
];

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Entrance animations
  const fade      = useRef(new Animated.Value(0)).current;
  const slideUp   = useRef(new Animated.Value(40)).current;
  const badgePop  = useRef(new Animated.Value(0.6)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,    { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(badgePop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();

    // Looping glow behind the emblem
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });
  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      <ImageBackground
        source={require('../assets/zamboanga.jpg')}
        style={styles.bg}
        resizeMode="cover"
      >
        {/* Dark cinematic gradient so text stays readable */}
        <LinearGradient
          colors={[
            'rgba(12,36,97,0.35)',
            'rgba(12,36,97,0.55)',
            'rgba(6,18,49,0.94)',
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Top badge ─────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.topRow,
            { paddingTop: insets.top + 14, opacity: fade, transform: [{ scale: badgePop }] },
          ]}
        >
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrowText}>✦  CITY OF FLOWERS  ✦</Text>
          </View>
        </Animated.View>

        {/* ── Hero emblem ───────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <Animated.View
            style={[
              styles.glow,
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />
          <Animated.Image
            source={require('../assets/lakbay_icon_glyph.png')}
            resizeMode="contain"
            style={[styles.logoImg, { transform: [{ scale: badgePop }] }]}
          />
        </View>

        {/* ── Bottom content sheet ──────────────────────────────── */}
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 24, opacity: fade, transform: [{ translateY: slideUp }] },
          ]}
        >
          <Text style={styles.welcome}>WELCOME TO</Text>
          <Text style={styles.title}>LAKBAY</Text>

          <VintaStripe height={5} />

          <Text style={styles.slogan}>
            Your quest through Zamboanga begins here —{'\n'}
            <Text style={styles.sloganAccent}>explore, scan, and level up</Text> the City of Flowers.
          </Text>

          {/* Feature chips */}
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureChip}>
                <Ionicons name={f.icon} size={18} color={COLORS.gold} />
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CreateAccount')}
          >
            <Text style={styles.primaryText}>Start Your Adventure</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Secondary */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryText}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#061231' },
  bg:        { flex: 1, justifyContent: 'space-between' },

  // ── Top ─────────────────────────────────────────────────────────
  topRow: { alignItems: 'center' },
  eyebrowPill: {
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.45)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  eyebrowText: {
    fontFamily: FONTS.bold, fontSize: 10, color: COLORS.gold, letterSpacing: 2.5,
  },

  // ── Hero emblem ─────────────────────────────────────────────────
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SCREEN_H * 0.02,
  },
  glow: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: COLORS.gold,
  },
  logoImg: { width: 132, height: 132 },

  // ── Bottom sheet ────────────────────────────────────────────────
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  welcome: {
    fontFamily: FONTS.semiBold, fontSize: 13,
    color: 'rgba(255,255,255,0.75)', letterSpacing: 4, marginBottom: 4,
  },
  title: {
    fontFamily: FONTS.pixel, fontSize: 30, color: '#fff',
    letterSpacing: 4, marginBottom: 14, textAlign: 'center',
    textShadowColor: 'rgba(251,191,36,0.55)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  slogan: {
    fontFamily: FONTS.regular, fontSize: 15,
    color: 'rgba(255,255,255,0.88)', textAlign: 'center',
    lineHeight: 22, marginTop: 16, marginBottom: 22,
  },
  sloganAccent: { fontFamily: FONTS.bold, color: COLORS.gold },

  // ── Feature chips ───────────────────────────────────────────────
  features: {
    flexDirection: 'row', justifyContent: 'center',
    flexWrap: 'wrap', gap: 8, marginBottom: 26,
  },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  featureText: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: '#fff', letterSpacing: 0.3,
  },

  // ── Buttons ─────────────────────────────────────────────────────
  primaryBtn: {
    width: '100%', height: 56, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 12,
    ...SHADOW.accent,
  },
  primaryText: {
    fontFamily: FONTS.bold, fontSize: 16, color: '#fff', letterSpacing: 0.8,
  },
  secondaryBtn: {
    width: '100%', height: 52, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff', letterSpacing: 0.3,
  },
});
