import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TextInput, Image,
  TouchableOpacity, StatusBar, ActivityIndicator, Animated,
  ImageBackground,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW, CARD_BORDER_WIDTH, BG_OVERLAY, GOLD_TEXT } from '../constants/theme';
import VintaCard from '../components/VintaCard';
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
  const [viewportH, setViewportH]   = useState(0);
  const [contentH, setContentH]     = useState(0);

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
      const status = error.response?.status;
      if (status === 400 || status === 401) {
        showErr('Login Failed', 'Check your explorer email and password.');
      } else if (!error.response) {
        // No reply: the free-tier server may still be waking up, or the phone is offline.
        showErr(
          'Server Not Responding',
          'The LAKBAY server may still be waking up. Please wait a few seconds and try again.',
          'warning',
        );
      } else {
        showErr('Login Failed', `The server had a problem (error ${status}). Please try again.`);
      }
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
          scrollEnabled={contentH > viewportH + 1}
          onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setContentH(h)}
        >
          {/* ── Hero Banner ─────────────────────────────────── */}
          <Animated.View
            style={[styles.heroBanner, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}
          >
            <View style={styles.heroContent}>
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
          <VintaCard style={styles.cardBorder} contentStyle={styles.card}>
            <View style={styles.cardHeader}>
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
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPass ? 'eye-outline' : 'eye-off-outline'}
                    size={17}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => showErr('Reset Password', 'A reset link will be sent to your email.', 'info')}
            >
              <Ionicons name="key-outline" size={12} color={COLORS.accent} style={{ marginRight: 4 }} />
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
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.signInText}>Authenticating...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="rocket-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.signInText}>Sign In to Adventure</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONNECT VIA</Text>
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
                <Text style={styles.signupLink}>Sign Up →</Text>
              </TouchableOpacity>
            </View>

          </VintaCard>
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
    backgroundColor: BG_OVERLAY,
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll:    { flexGrow: 1, paddingBottom: 12 },

  // ── Hero Banner ────────────────────────────────────────────────────
  heroBanner: {
    paddingTop: 6,
    paddingBottom: 12,
    alignItems: 'center',
  },
  heroContent: { alignItems: 'center', zIndex: 2 },
  logoRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#08143C',
    borderWidth: 2,
    borderColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImg: { width: 44, height: 44 },
  logoTitle: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: 5,
    lineHeight: 34,
  },
  logoSub: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: 'rgba(191, 215, 255, 0.70)',
    letterSpacing: 2.5,
    lineHeight: 14,
    marginBottom: 10,
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
  cardBorder: {
    borderRadius: RADIUS.lg,
    padding: CARD_BORDER_WIDTH,
    marginHorizontal: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg - CARD_BORDER_WIDTH,
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 18,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.navy,
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 24,
  },
  subHeading: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },

  // ── Streak Banner ──────────────────────────────────────────────────
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    padding: 10,
    marginBottom: 14,
    gap: 10,
  },
  streakIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakText: { flex: 1 },
  streakTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.accent,
    lineHeight: 16,
  },
  streakDesc: {
    fontFamily: FONTS.regular,
    fontSize: 10.5,
    color: COLORS.textSub,
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
    color: COLORS.textSub,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
  },
  eyeBtn: { padding: 6 },

  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 14,
  },
  forgotText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.accent,
  },

  // ── Buttons ────────────────────────────────────────────────────────
  signInBtn: {
    height: 50,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accentDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  signInText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 18,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  dividerText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.textFaint,
    letterSpacing: 1.5,
    lineHeight: 13,
  },

  googleBtn: {
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  signupPrompt: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  signupLink: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: GOLD_TEXT,
  },
});
