import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TextInput, Image,
  TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { authService } from '../api/authService';
import ErrorModal from '../components/ErrorModal';
import VintaStripe from '../components/VintaStripe';

export default function LoginScreen({ navigation }) {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [streakClaimed, setStreakClaimed] = useState(false);
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
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result && result.access) {
        navigation.replace('MainTabs');
      }
    } catch (error) {
      setLoading(false);
      showErr('Login Failed', 'Check your email and password.');
    }
  };

  const handleGoogle = () => {
    showErr('Google Sign-In', 'Google authentication will be integrated with the backend.', 'info');
  };

  const handleClaimStreak = () => {
    if (streakClaimed) return;
    setStreakClaimed(true);
    showErr('🔥 Streak Claimed!', 'You earned +50 XP for your 12-day login streak!', 'success');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* ── Hero Banner ─────────────────────────────────── */}
        <Animated.View
          style={[styles.heroBanner, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}
        >
          <View style={styles.heroGlowOuter} />
          <View style={styles.heroGlowInner} />

          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>✦  CITY OF COLORS  ✦</Text>
            <Image
              source={require('../assets/lakbay_icon_glyph.png')}
              resizeMode="contain"
              style={styles.logoImg}
            />
            <Text style={styles.logoTitle}>LAKBAY</Text>
            <Text style={styles.logoSub}>ZAMBOANGA CITY</Text>
            <View style={styles.pills}>
              {['Heritage', 'Culture', 'Adventure'].map((p) => (
                <View key={p} style={styles.pill}>
                  <Text style={styles.pillText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <VintaStripe height={6} />

        {/* ── Form Card ──────────────────────────────────────────── */}
        <View style={styles.card}>

          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subHeading}>Your journey in the City of Flowers awaits.</Text>

          {/* Daily Streak Banner */}
          <TouchableOpacity
            style={[styles.streakBanner, streakClaimed && styles.streakBannerClaimed]}
            activeOpacity={0.85}
            onPress={handleClaimStreak}
          >
            <View style={styles.streakIconWrap}>
              <Ionicons name="flame" size={22} color="#fff" />
            </View>
            <View style={styles.streakText}>
              <Text style={styles.streakTitle}>Daily Streak: 12 Days!</Text>
              <Text style={styles.streakDesc}>
                {streakClaimed ? '✅ +50 XP claimed for today' : 'Claim 50 XP for logging in today'}
              </Text>
            </View>
            <View style={[styles.claimBtn, streakClaimed && styles.claimBtnDone]}>
              <Text style={styles.claimBtnText}>{streakClaimed ? 'Done' : 'Claim'}</Text>
            </View>
          </TouchableOpacity>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons
                name={showPass ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => showErr('Reset Password', 'A reset link will be sent to your email.', 'info')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.signInBtn}
            activeOpacity={0.88}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.signInText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.85} onPress={handleGoogle}>
            <Text style={styles.googleLogo}>G</Text>
            <Text style={styles.googleText}>Google</Text>
          </TouchableOpacity>

          {/* Sign up link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
              <Text style={styles.signupLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      <ErrorModal
        visible={errorModal.visible}
        type={errorModal.type}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll:    { flexGrow: 1 },

  // ── Hero Banner ────────────────────────────────────────────────────
  heroBanner: {
    backgroundColor: COLORS.navy,
    paddingTop: 36,
    paddingBottom: 32,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlowOuter: {
    position: 'absolute',
    top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: COLORS.accentGlow,
  },
  heroGlowInner: {
    position: 'absolute',
    bottom: -20, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: COLORS.accentSoft,
  },
  heroContent: { alignItems: 'center', zIndex: 2 },
  heroEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 2.5,
    marginBottom: 16,
  },
  logoImg: { width: 96, height: 96, marginBottom: 8 },
  logoTitle: {
    fontFamily: FONTS.pixel, fontSize: 16, color: '#fff',
    letterSpacing: 3, marginBottom: 4,
  },
  logoSub: {
    fontFamily: FONTS.medium, fontSize: 10, color: 'rgba(255,255,255,0.70)',
    letterSpacing: 3, marginBottom: 18,
  },
  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 5,
  },
  pillText: {
    fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(255,255,255,0.90)',
    letterSpacing: 0.5,
  },

  // ── Card ───────────────────────────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },

  heading: {
    fontFamily: FONTS.pixel,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 28,
  },
  subHeading: {
    fontFamily: FONTS.regular, fontSize: 13,
    color: COLORS.textMuted, textAlign: 'center',
    marginBottom: 24, lineHeight: 20,
  },

  // ── Streak ─────────────────────────────────────────────────────────
  streakBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.30)',
    padding: 12, marginBottom: 24, gap: 12,
  },
  streakBannerClaimed: { borderColor: COLORS.teal + '55' },
  streakIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  streakText: { flex: 1 },
  streakTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  streakDesc: {
    fontFamily: FONTS.regular, fontSize: 11,
    color: COLORS.textMuted, marginTop: 2, lineHeight: 16,
  },
  claimBtn: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.gold,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  claimBtnDone: { borderColor: COLORS.teal },
  claimBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },

  // ── Form Fields ────────────────────────────────────────────────────
  label: {
    fontFamily: FONTS.semiBold, fontSize: 13,
    color: COLORS.textSub, marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 52,
    marginBottom: 16,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 14,
    color: COLORS.text,
  },
  eyeBtn: { padding: 4 },

  forgotRow: { alignItems: 'flex-end', marginTop: -8, marginBottom: 24 },
  forgotText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.accent },

  // ── Buttons ────────────────────────────────────────────────────────
  signInBtn: {
    height: 54, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    ...SHADOW.accent,
  },
  signInText: {
    fontFamily: FONTS.bold, fontSize: 16, color: '#fff', letterSpacing: 1,
  },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 20, gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    fontFamily: FONTS.medium, fontSize: 10,
    color: COLORS.textMuted, letterSpacing: 1,
  },

  googleBtn: {
    height: 54, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
  },
  googleLogo: { fontSize: 20, fontFamily: FONTS.black, color: '#4285F4' },
  googleText: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },

  signupRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 24,
  },
  signupPrompt: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  signupLink: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.accent },
});
