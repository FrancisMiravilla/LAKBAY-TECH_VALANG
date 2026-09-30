import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TextInput, Image,
  TouchableOpacity, StatusBar, ActivityIndicator, Animated,
  ImageBackground,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { authService } from '../api/authService';
import ErrorModal from '../components/ErrorModal';
import VintaStripe from '../components/VintaStripe';

export default function CreateAccountScreen({ navigation }) {
  const [firstName, setFirstName]         = useState('');
  const [lastName, setLastName]           = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [location, setLocation]           = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPass, setConfirmPass]     = useState('');
  const [showPass, setShowPass]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [agreed, setAgreed]               = useState(false);
  const [loading, setLoading]             = useState(false);
  const [errorModal, setErrorModal]       = useState({ visible: false, type: 'error', title: '', message: '' });
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
  const passwordValid = password.length >= 8 && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password);

  const classifyLocal = (loc) => {
    const text = loc.trim().toLowerCase();
    if (!text.includes('zamboanga')) return false;
    const nonCity = ['del sur', 'del norte', 'sibugay', 'peninsula'];
    if (nonCity.some(m => text.includes(m))) return text.includes('zamboanga city');
    return true;
  };
  const isLocal = classifyLocal(location);
  const visitorType = isLocal ? 'Local Explorer' : 'Visiting Tourist';

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !location || !email || !password || !confirmPass) {
      showErr('Missing Fields', 'Please complete all explorer identity fields.');
      return;
    }
    if (password !== confirmPass) {
      showErr('Password Mismatch', 'Your passwords do not match.');
      return;
    }
    if (!agreed) {
      showErr('Guild Rules Required', 'Please accept the Expedition Guild Rules to proceed.');
      return;
    }

    setLoading(true);
    try {
      const tempInGameName = `Explorer_${Date.now()}`;
      const mi = middleInitial.trim().replace(/\.$/, '').toUpperCase();
      const fullName = [firstName.trim(), mi ? `${mi}.` : '', lastName.trim()].filter(Boolean).join(' ');
      await authService.register(
        email.trim(), password,
        { firstName: firstName.trim(), lastName: lastName.trim(), middleInitial: mi },
        tempInGameName, 'DefaultCharacter', location.trim(),
      );
      await SecureStore.setItemAsync('offline_fullName', fullName);
      setLoading(false);
      navigation.replace('CharacterSelect');
    } catch (error) {
      setLoading(false);
      const errorData = error.response?.data || error;
      let errorMessage = 'An error occurred during registration.';
      if (errorData) {
        if (errorData.email) errorMessage = `Email: ${errorData.email[0]}`;
        else if (errorData.first_name) errorMessage = `First name: ${errorData.first_name[0]}`;
        else if (errorData.last_name) errorMessage = `Last name: ${errorData.last_name[0]}`;
        else if (errorData.password) errorMessage = `Password: ${errorData.password[0]}`;
        else if (errorData.detail) errorMessage = errorData.detail;
      }
      showErr('Registration Error', errorMessage);
    }
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
                <Ionicons name="sparkles" size={11} color={COLORS.gold} />
                <Text style={styles.heroEyebrow}>EXPEDITION RECRUITMENT</Text>
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

              {/* 2-Stage Quest Stepper */}
              <View style={styles.stepperWrap}>
                <View style={[styles.stepChip, styles.stepChipActive]}>
                  <View style={styles.stepNumActive}>
                    <Text style={styles.stepNumTextActive}>1</Text>
                  </View>
                  <Text style={styles.stepLabelActive}>Explorer Profile</Text>
                </View>

                <View style={styles.stepperLine} />

                <View style={styles.stepChip}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>2</Text>
                  </View>
                  <Text style={styles.stepLabel}>Choose Guide</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <VintaStripe height={4} />

          {/* ── Form Card ──────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>STAGE 1 : RECRUIT IDENTIFICATION</Text>
              </View>
              <Text style={styles.heading}>Create Explorer Profile</Text>
              <Text style={styles.subHeading}>
                Establish your identity to explore landmarks, scan AR artifacts, and earn badges.
              </Text>
            </View>

            {/* First Name */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="person-outline" size={13} color={COLORS.teal} />
                <Text style={styles.label}>First Name</Text>
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Juan"
                  placeholderTextColor="rgba(191, 215, 255, 0.40)"
                  autoCapitalize="words"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>

            {/* Last Name + Middle Initial */}
            <View style={[styles.nameRow, styles.fieldGroup]}>
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <Ionicons name="person-outline" size={13} color={COLORS.teal} />
                  <Text style={styles.label}>Last Name</Text>
                </View>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Dela Cruz"
                    placeholderTextColor="rgba(191, 215, 255, 0.40)"
                    autoCapitalize="words"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <View style={{ width: 88 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>M.I.</Text>
                  <Text style={styles.optionalLabel}>(opt)</Text>
                </View>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    placeholder="D."
                    placeholderTextColor="rgba(191, 215, 255, 0.40)"
                    autoCapitalize="characters"
                    maxLength={2}
                    value={middleInitial}
                    onChangeText={setMiddleInitial}
                  />
                </View>
              </View>
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="location-outline" size={13} color={COLORS.teal} />
                <Text style={styles.label}>Origin City / Municipality</Text>
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Zamboanga City"
                  placeholderTextColor="rgba(191, 215, 255, 0.40)"
                  autoCapitalize="words"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            {/* Live Guild Classification Badge */}
            {location.trim().length > 0 && (
              <View style={[styles.guildBadge, isLocal ? styles.guildLocal : styles.guildTourist]}>
                <View style={styles.guildIconWrap}>
                  <Ionicons
                    name={isLocal ? 'home' : 'airplane'}
                    size={14}
                    color={isLocal ? COLORS.teal : '#38BDF8'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guildTitle, { color: isLocal ? COLORS.teal : '#38BDF8' }]}>
                    Guild: {visitorType}
                  </Text>
                  <Text style={styles.guildDesc}>
                    {isLocal
                      ? 'Welcome home, Zamboangueño Scout! Ready to rediscover your city.'
                      : 'Welcome traveler! Prepare to explore Asia\'s Latin City.'}
                  </Text>
                </View>
              </View>
            )}

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
                {passwordValid && (
                  <View style={styles.validCheck}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.teal} />
                    <Text style={styles.validText}>Secure</Text>
                  </View>
                )}
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Min. 8 characters with number & symbol"
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

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.teal} />
                <Text style={styles.label}>Confirm Master Password</Text>
                {confirmPass.length > 0 && !passwordMatch && (
                  <View style={styles.validCheck}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.teal} />
                    <Text style={styles.validText}>Matched</Text>
                  </View>
                )}
              </View>
              <View style={[styles.inputWrap, passwordMatch && styles.inputWrapError]}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Re-enter password"
                  placeholderTextColor="rgba(191, 215, 255, 0.40)"
                  secureTextEntry={!showConfirm}
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                    size={17}
                    color="rgba(191, 215, 255, 0.70)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Password Hint */}
            {(passwordHint || passwordMatch) && (
              <View style={styles.hintBox}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
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
                {agreed && <Ionicons name="checkmark" size={13} color="#08143C" />}
              </View>
              <Text style={styles.termsText}>
                I accept the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => showErr('Guild Rules', 'Full terms of service will be available in the release.', 'info')}
                >
                  Expedition Rules
                </Text>
                {' '}&{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => showErr('Privacy Guild', 'Privacy protections follow Republic Act 10173.', 'info')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.createBtn, (!agreed || loading) && styles.createBtnDisabled]}
              activeOpacity={0.88}
              onPress={handleCreate}
              disabled={!agreed || loading}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#08143C" />
                  <Text style={styles.createBtnText}>Enlisting Explorer...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.createBtnText}>Proceed to Guide Selection</Text>
                  <Ionicons name="arrow-forward" size={15} color="#08143C" />
                </View>
              )}
            </TouchableOpacity>

            {/* Sign in link */}
            <View style={styles.signinRow}>
              <Text style={styles.signinPrompt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signinLink}>Sign In →</Text>
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
    paddingBottom: 20,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
  logoImg: { width: 50, height: 50 },
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

  // ── Stepper ────────────────────────────────────────────────────────
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#08143C',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  stepChipActive: {
    backgroundColor: 'rgba(26, 86, 219, 0.35)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  stepNumActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumTextActive: {
    fontFamily: FONTS.pixel,
    fontSize: 7,
    color: '#08143C',
    lineHeight: 9,
  },
  stepLabelActive: {
    fontFamily: FONTS.pixel,
    fontSize: 7,
    color: '#FFFFFF',
    lineHeight: 10,
  },
  stepperLine: {
    width: 16,
    height: 1.5,
    backgroundColor: '#1E3A8A',
  },
  stepNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: {
    fontFamily: FONTS.pixel,
    fontSize: 7,
    color: 'rgba(191, 215, 255, 0.50)',
    lineHeight: 9,
  },
  stepLabel: {
    fontFamily: FONTS.pixel,
    fontSize: 7,
    color: 'rgba(191, 215, 255, 0.50)',
    lineHeight: 10,
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
    fontSize: 6.5,
    color: '#38BDF8',
    letterSpacing: 0.8,
    lineHeight: 10,
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

  // ── Form Fields ────────────────────────────────────────────────────
  fieldGroup: { marginBottom: 14 },
  nameRow: { flexDirection: 'row', gap: 10 },
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
  optionalLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: 'rgba(191, 215, 255, 0.45)',
  },
  validCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  validText: {
    fontFamily: FONTS.pixel,
    fontSize: 6.5,
    color: COLORS.teal,
    lineHeight: 9,
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
  inputWrapError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  eyeBtn: { padding: 6 },

  // ── Guild Badge ────────────────────────────────────────────────────
  guildBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: 14,
    borderWidth: 1,
  },
  guildLocal: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.40)',
  },
  guildTourist: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.40)',
  },
  guildIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guildTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 7.5,
    lineHeight: 12,
  },
  guildDesc: {
    fontFamily: FONTS.regular,
    fontSize: 10.5,
    color: 'rgba(191, 215, 255, 0.80)',
    marginTop: 2,
    lineHeight: 14,
  },

  // ── Hints & Terms ──────────────────────────────────────────────────
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 14,
  },
  hintText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#FCA5A5',
    lineHeight: 15,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    backgroundColor: '#0C2054',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.gold,
    borderColor: '#FDE68A',
  },
  termsText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 11.5,
    color: 'rgba(191, 215, 255, 0.75)',
    lineHeight: 16,
  },
  termsLink: {
    color: '#38BDF8',
    fontFamily: FONTS.bold,
  },

  // ── Button ─────────────────────────────────────────────────────────
  createBtn: {
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
  createBtnDisabled: {
    opacity: 0.45,
  },
  createBtnText: {
    fontFamily: FONTS.pixel,
    fontSize: 8.5,
    color: '#08143C',
    letterSpacing: 0.5,
    lineHeight: 13,
  },

  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signinPrompt: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191, 215, 255, 0.70)',
  },
  signinLink: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.gold,
  },
});
