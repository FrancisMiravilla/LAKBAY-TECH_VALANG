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

export default function CreateAccountScreen({ navigation }) {
  const [fullName, setFullName]       = useState('');
  const [location, setLocation]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errorModal, setErrorModal]   = useState({ visible: false, type: 'error', title: '', message: '' });
  const [heroFade]  = useState(() => new Animated.Value(0));
  const [heroSlide] = useState(() => new Animated.Value(20));

  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const passwordHint = password.length > 0 && (password.length < 8 || !/\d/.test(password) || !/[^a-zA-Z0-9]/.test(password));
  const passwordMatch = confirmPass.length > 0 && password !== confirmPass;

  // Mirrors the backend rule: anyone inside Zamboanga City is a "Local".
  const isLocal = location.trim().toLowerCase().includes('zamboanga');
  const visitorType = isLocal ? 'Local' : 'Tourist';

  const handleCreate = async () => {
    if (!fullName || !location || !email || !password || !confirmPass) {
      showErr('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPass) {
      showErr('Password Mismatch', 'Your passwords do not match.');
      return;
    }
    if (!agreed) {
      showErr('Terms Required', 'Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const tempInGameName = `Explorer_${Date.now()}`;
      await authService.register(email, password, fullName, tempInGameName, 'DefaultCharacter', location);
      await SecureStore.setItemAsync('offline_fullName', fullName);
      setLoading(false);
      navigation.replace('CharacterSelect');
    } catch (error) {
      setLoading(false);
      const errorData = error.response?.data || error;
      let errorMessage = 'An error occurred. Please try again.';
      if (errorData) {
        if (errorData.email) errorMessage = `Email: ${errorData.email[0]}`;
        else if (errorData.password) errorMessage = `Password: ${errorData.password[0]}`;
        else if (errorData.detail) errorMessage = errorData.detail;
      }
      showErr('Registration Error', errorMessage);
    }
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
            <Text style={styles.heroEyebrow}>✦  START YOUR JOURNEY  ✦</Text>
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

          <Text style={styles.stepLabel}>STEP 1 OF 2</Text>
          <Text style={styles.heading}>Create Your Journey</Text>
          <Text style={styles.subHeading}>Begin Exploring The City Of Flowers With Us</Text>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Juan dela Cruz"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="City / Municipality (e.g. Zamboanga City)"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {location.trim().length > 0 && (
            <View style={[styles.visitorBadge, isLocal ? styles.visitorLocal : styles.visitorTourist]}>
              <Ionicons
                name={isLocal ? 'home' : 'airplane'}
                size={14}
                color={isLocal ? COLORS.teal : COLORS.accent}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.visitorText}>
                You'll join as a <Text style={styles.visitorTextBold}>{visitorType}</Text>
                {isLocal ? ' — welcome home, Zamboangueño!' : ' — enjoy exploring Zamboanga!'}
              </Text>
            </View>
          )}

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
              placeholder="Min. 8 characters"
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

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputWrap, passwordMatch && styles.inputWrapError]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={passwordMatch ? COLORS.danger : COLORS.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showConfirm}
              value={confirmPass}
              onChangeText={setConfirmPass}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <Ionicons
                name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {(passwordHint || passwordMatch) && (
            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.danger} style={{ marginRight: 6 }} />
              <Text style={styles.hintText}>
                {passwordMatch
                  ? 'Passwords do not match.'
                  : 'Password must be at least 8 characters with a number and special character.'}
              </Text>
            </View>
          )}

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.termsRow}
            activeOpacity={0.8}
            onPress={() => setAgreed(!agreed)}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
              {agreed && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => showErr('Terms of Service', 'Full terms will be available in the final release.', 'info')}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => showErr('Privacy Policy', 'Full privacy policy will be available in the final release.', 'info')}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.createBtn, (!agreed || loading) && styles.createBtnDisabled]}
            activeOpacity={0.88}
            onPress={handleCreate}
            disabled={!agreed || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.createBtnText}>Create Account</Text>
            }
          </TouchableOpacity>

          {/* Sign in link */}
          <View style={styles.signinRow}>
            <Text style={styles.signinPrompt}>Already Have an Account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signinLink}>Sign In</Text>
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

  stepLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 2.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  heading: {
    fontFamily: FONTS.pixel,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 26,
  },
  subHeading: {
    fontFamily: FONTS.regular, fontSize: 13,
    color: COLORS.textMuted, textAlign: 'center',
    marginBottom: 24, lineHeight: 20,
  },

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
  inputWrapError: { borderColor: COLORS.danger + '88' },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 14,
    color: COLORS.text,
  },
  eyeBtn: { padding: 4 },

  visitorBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.sm, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    marginTop: -8, marginBottom: 16,
  },
  visitorLocal:   { backgroundColor: COLORS.tealSoft, borderColor: COLORS.teal + '55' },
  visitorTourist: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accentBorder },
  visitorText: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 12,
    color: COLORS.textSub, lineHeight: 16,
  },
  visitorTextBold: { fontFamily: FONTS.bold, color: COLORS.text },

  hintBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.danger + '55',
    padding: 12, marginTop: -8, marginBottom: 16,
  },
  hintText: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 11,
    color: COLORS.danger, lineHeight: 16,
  },

  // ── Terms Checkbox ─────────────────────────────────────────────────
  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 24,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  termsText: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 12,
    color: COLORS.textMuted, lineHeight: 19,
  },
  termsLink: { color: COLORS.accent, fontFamily: FONTS.semiBold },

  // ── Buttons ────────────────────────────────────────────────────────
  createBtn: {
    height: 54, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    ...SHADOW.accent,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: {
    fontFamily: FONTS.bold, fontSize: 16, color: '#fff', letterSpacing: 1,
  },

  signinRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 24,
  },
  signinPrompt: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  signinLink: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.accent },
});
