import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TextInput, Image,
  TouchableOpacity, StatusBar, ActivityIndicator, Animated,
  ImageBackground,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { authService } from '../api/authService';
import { streakService } from '../api/streakService';
import ErrorModal from '../components/ErrorModal';
import VintaStripe from '../components/VintaStripe';

export default function LoginScreen({ navigation }) {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, type: 'error', title: '', message: '' });
  const [heroFade]  = useState(() => new Animated.Value(0));
  const [heroSlide] = useState(() => new Animated.Value(20));

  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showErr('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await authService.login(email.trim(), password);
      if (result && result.access) {
        // Record today's login streak
        await streakService.recordLoginStreak();
        navigation.replace('MainTabs', { showDailyStreak: true });
      }
    } catch (error) {
      setLoading(false);
      showErr('Login Failed', 'Check your explorer email and password.');
    }
  };

  const handleGoogle = () => {
    showErr('Google Sign-In', 'Google authentication will be integrated with the backend.', 'info');
  };

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          enableOnAndroid
          extraScrollHeight={24}
        >
          {/* ── Hero Banner ─────────────────────────────────── */}
          <Animated.View
            style={[styles.heroBanner, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}
          >
            <View style={styles.heroContent}>
              <View style={styles.eyebrowBadge}>
                <Ionicons name="compass" size={11} color={COLORS.gold} />
                <Text style={styles.heroEyebrow}>EXPEDITION ACCESS PORTAL</Text>
              </View>

              <View style={styles.logoRing}>
                <Image
                  source={require('../assets/lakbay_icon_glyph.png')}
                  resizeMode="contain"
                  style={styles.logoImg}
                />
              </View>

              <Text style={styles.logoTitle}>LAKBAY</Text>
              <Text style={styles.logoSub}>ZAMBOANGA CITY EXPEDITION</Text>

              {/* Gamified quest chips */}
              <View style={styles.pills}>
                <View style={styles.pill}>
                  <Text style={styles.pillEmoji}>🗺️</Text>
                  <Text style={styles.pillText}>Quests</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillEmoji}>🧊</Text>
                  <Text style={styles.pillText}>3D AR</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillEmoji}>🏆</Text>
                  <Text style={styles.pillText}>Badges</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <VintaStripe height={4} />

          {/* ── Form Card ──────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>AUTHENTICATION</Text>
              </View>
              <Text style={styles.heading}>Explorer Sign In</Text>
              <Text style={styles.subHeading}>
                Enter your credentials to resume your journey & earn daily XP.
              </Text>
            </View>

            {/* Daily Streak Incentive Banner */}
            <View style={styles.streakBanner}>
              <View style={styles.streakIconWrap}>
                <Text style={{ fontSize: 18 }}>⚡</Text>
              </View>
              <View style={styles.streakText}>
                <Text style={styles.streakTitle}>Daily Expedition Streak</Text>
                <Text style={styles.streakDesc}>
                  Sign in daily to claim bonus XP and maintain your explorer rank!
                </Text>
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="mail-outline" size={13} color={COLORS.teal} />
                <Text style={styles.label}>Email Address</Text>
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="explorer@lakbay.ph"
                  placeholderTextColor="rgba(191, 215, 255, 0.40)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="lock-closed-outline" size={13} color={COLORS.teal} />
                <Text style={styles.label}>Master Password</Text>
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(191, 215, 255, 0.40)"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPass ? 'eye-outline' : 'eye-off-outline'}
                    size={17}
                    color="rgba(191, 215, 255, 0.70)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => showErr('Reset Password', 'A reset link will be sent to your email.', 'info')}
            >
              <Ionicons name="key-outline" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
              <Text style={styles.forgotText}>Recover credentials?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.signInBtn}
              activeOpacity={0.88}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#08143C" />
                  <Text style={styles.signInText}>Authenticating...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="rocket-outline" size={16} color="#08143C" />
                  <Text style={styles.signInText}>Sign In to Adventure</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>✦ OR CONNECT VIA ✦</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity style={styles.googleBtn} activeOpacity={0.85} onPress={handleGoogle}>
              <Text style={styles.googleLogo}>G</Text>
              <Text style={styles.googleText}>Sign in with Google</Text>
            </TouchableOpacity>

            {/* Sign up link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupPrompt}>New explorer in Zamboanga? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
                <Text style={styles.signupLink}>Recruit Account →</Text>
              </TouchableOpacity>
            </View>

          </View>
          <View style={{ height: 32 }} />
        </KeyboardAwareScrollView>

        <ErrorModal
          visible={errorModal.visible}
          type={errorModal.type}
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => setErrorModal(prev => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 38, 0.88)',
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll:    { flexGrow: 1, paddingBottom: 24 },

  // ── Hero Banner ────────────────────────────────────────────────────
  heroBanner: {
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
  },
  heroContent: { alignItems: 'center', zIndex: 2 },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.40)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  heroEyebrow: {
    fontFamily: FONTS.pixel,
    fontSize: 7.5,
    color: COLORS.gold,
    letterSpacing: 1,
    lineHeight: 11,
  },
  logoRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#08143C',
    borderWidth: 2,
    borderColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImg: { width: 54, height: 54 },
  logoTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 3,
    lineHeight: 26,
    marginBottom: 3,
  },
  logoSub: {
    fontFamily: FONTS.pixel,
    fontSize: 7.5,
    color: 'rgba(191, 215, 255, 0.70)',
    letterSpacing: 1.5,
    lineHeight: 12,
    marginBottom: 14,
  },
  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#08143C',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  pillEmoji: { fontSize: 11 },
  pillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: 'rgba(191, 215, 255, 0.90)',
    letterSpacing: 0.5,
  },

  // ── Card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#08143C',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardBadge: {
    backgroundColor: 'rgba(26, 86, 219, 0.20)',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  cardBadgeText: {
    fontFamily: FONTS.pixel,
    fontSize: 7,
    color: '#38BDF8',
    letterSpacing: 0.8,
    lineHeight: 11,
  },
  heading: {
    fontFamily: FONTS.pixel,
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  subHeading: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191, 215, 255, 0.70)',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },

  // ── Streak Banner ──────────────────────────────────────────────────
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C2054',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    padding: 10,
    marginBottom: 18,
    gap: 10,
  },
  streakIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.40)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakText: { flex: 1 },
  streakTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 7.5,
    color: COLORS.gold,
    lineHeight: 12,
  },
  streakDesc: {
    fontFamily: FONTS.regular,
    fontSize: 10.5,
    color: 'rgba(191, 215, 255, 0.75)',
    marginTop: 2,
    lineHeight: 14,
  },

  // ── Form Fields ────────────────────────────────────────────────────
  fieldGroup: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: 'rgba(191, 215, 255, 0.90)',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C2054',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  eyeBtn: { padding: 6 },

  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  forgotText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#38BDF8',
  },

  // ── Buttons ────────────────────────────────────────────────────────
  signInBtn: {
    height: 50,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  signInText: {
    fontFamily: FONTS.pixel,
    fontSize: 9,
    color: '#08143C',
    letterSpacing: 0.5,
    lineHeight: 14,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E3A8A',
  },
  dividerText: {
    fontFamily: FONTS.pixel,
    fontSize: 6.5,
    color: 'rgba(191, 215, 255, 0.50)',
    letterSpacing: 0.8,
    lineHeight: 10,
  },

  googleBtn: {
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: '#0C2054',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleLogo: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#4285F4',
  },
  googleText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupPrompt: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191, 215, 255, 0.70)',
  },
  signupLink: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.gold,
  },
});
