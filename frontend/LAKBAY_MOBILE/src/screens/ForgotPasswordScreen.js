import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TextInput, Image,
  TouchableOpacity, StatusBar, ActivityIndicator, ImageBackground,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, CARD_BORDER_WIDTH, BG_OVERLAY, GOLD_TEXT } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import VintaStripe from '../components/VintaStripe';
import ErrorModal from '../components/ErrorModal';
import PasswordField from '../components/PasswordField';
import { authService } from '../api/authService';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;
const MIN_PASSWORD = 8;

// Pasting the whole email line ("Your code is 123456") still finds the code.
const extractCode = (text) => {
  const group = String(text).match(/\d{6}/);
  if (group) return group[0];
  return String(text).replace(/\D/g, '').slice(0, CODE_LENGTH);
};

const serverAsleep = (error) => !error?.detail && !error?.response;

// Two steps: ask for the account's email, then enter the emailed code with a
// new password. Also reached from Privacy & Security when a logged-in player
// has forgotten their current password.
export default function ForgotPasswordScreen({ navigation, route }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [modal, setModal] = useState({ visible: false, type: 'error', title: '', message: '', done: false });

  const show = (title, message, type = 'error', done = false) => setModal({ visible: true, type, title, message, done });

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setErrors({ email: 'Enter the email address you signed up with.' });
      return;
    }
    if (loading || cooldown > 0) return;
    setErrors({});
    setLoading(true);
    try {
      const res = await authService.forgotPassword(address);
      setCooldown(res?.retry_after || RESEND_SECONDS);
      setStep('reset');
    } catch (error) {
      if (serverAsleep(error)) show('Server Not Responding', 'The LAKBAY server may still be waking up. Please try again in a few seconds.', 'warning');
      else show('Could Not Send Code', error?.detail || 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    const next = {};
    if (code.length !== CODE_LENGTH) next.code = 'Enter the 6-digit code from your email.';
    if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (confirm !== password) next.confirm = 'The two passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length || loading) return;
    setLoading(true);
    try {
      await authService.resetPassword(email.trim(), code, password);
      // Every session was signed out on the server, so clear this phone too.
      await authService.logout();
      show('Password Changed', 'Log in with your new password.', 'success', true);
    } catch (error) {
      if (serverAsleep(error)) show('Server Not Responding', 'The LAKBAY server may still be waking up. Please try again in a few seconds.', 'warning');
      else if (error?.field === 'new_password') setErrors({ password: error.detail });
      else setErrors({ code: error?.detail || 'Please check the code and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    const finished = modal.done;
    setModal((m) => ({ ...m, visible: false }));
    if (finished) navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.bgImage} resizeMode="cover">
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
          <View style={styles.hero}>
            <View style={styles.logoRing}>
              <Image source={require('../assets/lakbay_icon_glyph.png')} resizeMode="contain" style={styles.logoImg} />
            </View>
            <Text style={styles.logoTitle}>LAKBAY</Text>
            <Text style={styles.logoSub}>ZAMBOANGA CITY EXPEDITION</Text>
          </View>

          <VintaStripe height={4} />

          <VintaCard style={styles.cardBorder} contentStyle={styles.card}>
            <View style={styles.icon}>
              <Ionicons name={step === 'email' ? 'key-outline' : 'mail-unread-outline'} size={28} color={COLORS.accent} />
            </View>

            {step === 'email' ? (
              <>
                <Text style={styles.heading}>Forgot Your Password?</Text>
                <Text style={styles.body}>
                  Enter the email you signed up with and we will send you a 6-digit code to choose a new password.
                </Text>

                <View style={styles.group}>
                  <Text style={styles.label}>EMAIL</Text>
                  <View style={[styles.inputWrap, !!errors.email && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      accessibilityLabel="Email"
                      onSubmitEditing={sendCode}
                    />
                  </View>
                  {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}
                </View>

                <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={sendCode} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.heading}>Choose a New Password</Text>
                <Text style={styles.body}>If {email.trim()} has a LAKBAY account, a 6-digit code is on its way. Check Spam too.</Text>

                <View style={[styles.codeWrap, !!errors.code && styles.inputError]}>
                  <TextInput
                    style={styles.codeInput}
                    value={code}
                    onChangeText={(t) => setCode(extractCode(t))}
                    placeholder="••••••"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={40}
                    accessibilityLabel="Reset code"
                  />
                </View>
                {!!errors.code && <Text style={[styles.error, { alignSelf: 'stretch' }]}>{errors.code}</Text>}

                <View style={{ height: 14 }} />
                <PasswordField label="NEW PASSWORD" value={password} onChangeText={setPassword} error={errors.password} autoComplete="new-password" />
                <PasswordField label="CONFIRM NEW PASSWORD" value={confirm} onChangeText={setConfirm} error={errors.confirm} autoComplete="new-password" />

                <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={reset} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Change Password</Text>}
                </TouchableOpacity>

                <View style={styles.row}>
                  <Text style={styles.muted}>{"Didn't get it? "}</Text>
                  <TouchableOpacity onPress={sendCode} disabled={cooldown > 0 || loading}>
                    <Text style={[styles.link, (cooldown > 0 || loading) && styles.linkDisabled]}>
                      {cooldown > 0 ? `resend in ${cooldown}s` : 'resend code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.row} onPress={() => navigation.goBack()}>
              <Text style={styles.link}>Back</Text>
            </TouchableOpacity>
          </VintaCard>
        </KeyboardAwareScrollView>

        <ErrorModal visible={modal.visible} type={modal.type} title={modal.title} message={modal.message} onClose={closeModal} />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BG_OVERLAY },
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flexGrow: 1, paddingBottom: 24 },
  hero: { alignItems: 'center', paddingTop: 30, paddingBottom: 12 },
  logoRing: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#08143C',
    borderWidth: 2, borderColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  logoImg: { width: 44, height: 44 },
  logoTitle: { fontFamily: FONTS.bold, fontSize: 30, color: '#FFFFFF', letterSpacing: 5, lineHeight: 34 },
  logoSub: {
    fontFamily: FONTS.semiBold, fontSize: 11, color: 'rgba(191, 215, 255, 0.70)',
    letterSpacing: 2.5, lineHeight: 14,
  },
  cardBorder: {
    borderRadius: RADIUS.lg, padding: CARD_BORDER_WIDTH, marginHorizontal: 16, marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg - CARD_BORDER_WIDTH,
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 18, alignItems: 'center',
  },
  icon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.bgCardAlt,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  heading: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.navy, marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  group: { alignSelf: 'stretch', marginBottom: 4 },
  label: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.textSub, letterSpacing: 1, marginBottom: 6 },
  inputWrap: {
    height: 48, paddingHorizontal: 14, justifyContent: 'center',
    backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  inputError: { borderColor: '#DC2626' },
  input: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.navy, paddingVertical: 0 },
  error: { fontFamily: FONTS.medium, fontSize: 12, color: '#B91C1C', marginTop: 5, lineHeight: 16 },
  codeWrap: {
    alignSelf: 'stretch', backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, height: 60, justifyContent: 'center',
  },
  codeInput: {
    fontFamily: FONTS.bold, fontSize: 28, color: COLORS.navy, textAlign: 'center', letterSpacing: 10, paddingVertical: 0,
  },
  btn: {
    alignSelf: 'stretch', height: 50, borderRadius: RADIUS.sm, backgroundColor: COLORS.accent, marginTop: 12,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.accentDark,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFFFFF', letterSpacing: 0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  muted: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  link: { fontFamily: FONTS.bold, fontSize: 12, color: GOLD_TEXT },
  linkDisabled: { color: COLORS.textFaint },
});
