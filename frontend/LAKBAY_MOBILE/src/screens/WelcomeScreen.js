import React, { useEffect, useRef, useState } from 'react';
import {
  ImageBackground, StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Animated, Easing, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import VintaStripe from '../components/VintaStripe';

// Landing (reference/home.png, left): full-bleed photo, big title near the
// bottom, and a "Swipe to Explore" slider that starts sign-up.

const KNOB = 58;
const TRACK_PAD = 6;

function SwipeToExplore({ onComplete }) {
  const [trackW, setTrackW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const maxRef = useRef(0);
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;
  maxRef.current = Math.max(0, trackW - KNOB - TRACK_PAD * 2);

  const reset = () => Animated.spring(x, { toValue: 0, useNativeDriver: false, friction: 7 }).start();

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderMove: (_, g) => x.setValue(Math.max(0, Math.min(maxRef.current, g.dx))),
      onPanResponderRelease: (_, g) => {
        if (maxRef.current > 0 && g.dx >= maxRef.current * 0.7) {
          Animated.timing(x, { toValue: maxRef.current, duration: 120, useNativeDriver: false }).start(() => {
            doneRef.current();
            setTimeout(() => x.setValue(0), 400);
          });
        } else {
          reset();
        }
      },
      onPanResponderTerminate: reset,
    })
  ).current;

  const labelOpacity = x.interpolate({
    inputRange: [0, Math.max(1, maxRef.current * 0.6)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.track} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
      <Animated.Text style={[styles.trackLabel, { opacity: labelOpacity }]}>Swipe to Explore</Animated.Text>
      <TouchableOpacity style={styles.trackEnd} onPress={onComplete} accessibilityLabel="Start exploring">
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.55)" style={{ marginRight: -8 }} />
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      <Animated.View style={[styles.knob, { transform: [{ translateX: x }] }]} {...responder.panHandlers}>
        <Ionicons name="compass-outline" size={28} color={COLORS.accent} />
      </Animated.View>
    </View>
  );
}

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const fade    = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,    { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fade, slideUp]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={['rgba(6,18,49,0.10)', 'rgba(6,18,49,0.25)', 'rgba(4,10,38,0.85)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.brandRow, { paddingTop: insets.top + 12 }]}>
          <Animated.Image
            source={require('../assets/lakbay_icon_glyph.png')}
            resizeMode="contain"
            style={[styles.logoImg, { opacity: fade }]}
          />
          <Animated.Text style={[styles.brand, { opacity: fade }]}>LAKBAY</Animated.Text>
        </View>

        <Animated.View
          style={[styles.bottom, { paddingBottom: insets.bottom + 22, opacity: fade, transform: [{ translateY: slideUp }] }]}
        >
          <Text style={styles.title}>Discover Zamboanga{'\n'}One Quest at a Time</Text>
          <View style={styles.stripe}>
            <VintaStripe height={4} />
          </View>

          <SwipeToExplore onComplete={() => navigation.navigate('CreateAccount')} />

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
            <Text style={styles.loginText}>
              I already have an account · <Text style={styles.loginAccent}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#061231' },
  bg: { flex: 1, justifyContent: 'space-between' },

  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoImg: { width: 34, height: 34 },
  brand: { fontFamily: FONTS.bold, fontSize: 18, color: '#FFFFFF', letterSpacing: 4 },

  bottom: { paddingHorizontal: 22, alignItems: 'center' },
  title: {
    fontFamily: FONTS.bold, fontSize: 36, lineHeight: 40, color: '#FFFFFF', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  stripe: { width: 120, marginTop: 14, marginBottom: 26 },

  track: {
    alignSelf: 'stretch', height: KNOB + TRACK_PAD * 2, borderRadius: (KNOB + TRACK_PAD * 2) / 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', padding: TRACK_PAD,
  },
  trackLabel: {
    position: 'absolute', alignSelf: 'center',
    fontFamily: FONTS.semiBold, fontSize: 16, color: '#FFFFFF', letterSpacing: 0.4,
  },
  trackEnd: {
    position: 'absolute', right: TRACK_PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2,
    backgroundColor: 'rgba(12,36,97,0.55)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  knob: {
    width: KNOB, height: KNOB, borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },

  loginLink: { marginTop: 18, paddingVertical: 6 },
  loginText: { fontFamily: FONTS.medium, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  loginAccent: { fontFamily: FONTS.bold, color: COLORS.gold },
});
