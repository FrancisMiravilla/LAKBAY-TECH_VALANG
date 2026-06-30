import React, { useState } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TextInput,
  TouchableOpacity, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { authService } from '../api/authService';
import ErrorModal from '../components/ErrorModal';

export default function CreateAccountScreen({ navigation }) {
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errorModal, setErrorModal]   = useState({ visible: false, type: 'error', title: '', message: '' });
  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });

  const passwordHint = password.length > 0 && (password.length < 8 || !/\d/.test(password) || !/[^a-zA-Z0-9]/.test(password));
  const passwordMatch = confirmPass.length > 0 && password !== confirmPass;

const handleCreate = async () => {
  if (!fullName || !email || !password || !confirmPass) {
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
    await authService.register(email, password, fullName, tempInGameName, 'DefaultCharacter');
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
    console.log('Register error:', errorData);
    showErr('Registration Error', errorMessage);
  }

};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.accent} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* ── Pink Header Banner ─────────────────────────────────── */}
        <View style={styles.heroBanner}>
          <View style={styles.blobTL} />
          <View style={styles.blobBR} />

          <Text style={styles.stepLabel}>STEP 1 OF 2</Text>

          <View style={styles.logoRing}>
            <Text style={styles.logoIcon}>⛵</Text>
          </View>

          <Text style={styles.logoTitle}>LAKBAY</Text>
          <Text style={styles.logoSub}>ZAMBOANGA CITY</Text>
        </View>

        {/* ── Form Card ──────────────────────────────────────────── */}
        <View style={styles.card}>

          {/* Heading */}
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
            <Ionicons name="shield-checkmark-outline" size={16} color={passwordMatch ? COLORS.danger : COLORS.textMuted} style={styles.inputIcon} />
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

          {/* Password hint */}
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
              <Text style={styles.signinLink}>Sign - In</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* ── Error Modal ── */}
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
  stepLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  heroBanner: {
    height: 220,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  blobTL: {
    position: 'absolute', top: -40, left: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobBR: {
    position: 'absolute', bottom: -30, right: 20,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(26,86,219,0.35)',
  },
  logoRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon:  { fontSize: 28 },
  logoTitle: {
    fontFamily: FONTS.pixel, fontSize: 14, color: '#fff',
    letterSpacing: 3, marginBottom: 2,
  },
  logoSub: {
    fontFamily: FONTS.medium, fontSize: 10, color: 'rgba(255,255,255,0.70)',
    letterSpacing: 3, marginTop: 2,
  },

  // ── Card ───────────────────────────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
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
  inputWrapError: {
    borderColor: COLORS.danger + '88',
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 14,
    color: COLORS.text,
  },
  eyeBtn: { padding: 4 },

  // ── Password hint ──────────────────────────────────────────────────
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
  checkboxActive: {
    backgroundColor: COLORS.accent, borderColor: COLORS.accent,
  },
  termsText: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 12,
    color: COLORS.textMuted, lineHeight: 19,
  },
  termsLink: {
    color: COLORS.accent, fontFamily: FONTS.semiBold,
  },

  // ── Buttons ────────────────────────────────────────────────────────
  createBtn: {
    height: 54, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    ...SHADOW.accent,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontFamily: FONTS.bold, fontSize: 16, color: '#fff', letterSpacing: 1,
  },

  signinRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 24,
  },
  signinPrompt: {
    fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted,
  },
  signinLink: {
    fontFamily: FONTS.bold, fontSize: 13, color: COLORS.accent,
  },
});
