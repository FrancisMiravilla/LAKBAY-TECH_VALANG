import React, { useEffect, useRef, useState } from 'react';
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
import { authService } from '../api/authService';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

// Pasting the whole email line ("Your code is 123456") still finds the code.
const extractCode = (text) => {
  const group = String(text).match(/\d{6}/);
  if (group) return group[0];
  return String(text).replace(/\D/g, '').slice(0, CODE_LENGTH);
};

export default function VerifyEmailScreen({ navigation, route }) {
  const email = route.params?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(route.params?.justSent === false ? 0 : RESEND_SECONDS);
  const [notice, setNotice] = useState('');
  const [errorModal, setErrorModal] = useState({ visible: false, type: 'error', title: '', message: '' });
  const submittedRef = useRef('');

  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (value = code) => {
    if (value.length !== CODE_LENGTH || loading) return;
    submittedRef.current = value;
    setLoading(true);
    setNotice('');
    try {
      await authService.verifyEmail(email, value);
      setLoading(false);
      navigation.replace('CharacterSelect');
    } catch (error) {
      setLoading(false);
      if (error?.code === 'already_verified') {
        showErr('Already Verified', 'This email is already verified. Please log in.', 'info');
        return;
      }
      if (!error?.detail && !error?.response) {
        showErr('Server Not Responding', 'The LAKBAY server may still be waking up. Please try again in a few seconds.', 'warning');
        return;
      }
      showErr('Code Not Accepted', error?.detail || 'Please check the code and try again.');
    }
  };

  const onChangeCode = (text) => {
    const next = extractCode(text);
    setCode(next);
    if (next.length === CODE_LENGTH && next !== submittedRef.current) verify(next);
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await authService.resendVerificationCode(email);
      setCooldown(res?.retry_after || RESEND_SECONDS);
      setCode('');
      submittedRef.current = '';
      setNotice(`A new code was sent to ${email}.`);
    } catch (error) {
      if (error?.retry_after) setCooldown(error.retry_after);
      showErr('Could Not Resend', error?.detail || 'Please try again in a moment.');
    } finally {
      setResending(false);
    }
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
            <View style={styles.mailIcon}>
              <Ionicons name="mail-unread-outline" size={30} color={COLORS.accent} />
            </View>
            <Text style={styles.heading}>Check Your Email</Text>
            <Text style={styles.body}>We sent a 6-digit code to</Text>
            <Text style={styles.email} numberOfLines={1}>{email}</Text>
            <Text style={styles.body}>
              Open the email from LAKBAY, copy the code, and paste it below.
            </Text>

            <View style={styles.codeWrap}>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={onChangeCode}
                placeholder="••••••"
                placeholderTextColor="#CBD5E1"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={40}
                autoFocus
                editable={!loading}
                accessibilityLabel="Verification code"
              />
            </View>
            <Text style={styles.hint}>Tip: long-press the box and tap Paste.</Text>

            {!!notice && <Text style={styles.notice}>{notice}</Text>}

            <TouchableOpacity
              style={[styles.verifyBtn, (code.length !== CODE_LENGTH || loading) && styles.verifyBtnDisabled]}
              onPress={() => verify()}
              disabled={code.length !== CODE_LENGTH || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyText}>Verify Email</Text>
              )}
            </TouchableOpacity>

            <View style={styles.row}>
              <Text style={styles.muted}>{"Didn't get it? Check Spam, or "}</Text>
              <TouchableOpacity onPress={resend} disabled={cooldown > 0 || resending}>
                <Text style={[styles.link, (cooldown > 0 || resending) && styles.linkDisabled]}>
                  {resending ? 'sending…' : cooldown > 0 ? `resend in ${cooldown}s` : 'resend code'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.row} onPress={() => navigation.replace('Login')}>
              <Text style={styles.link}>Back to Log In</Text>
            </TouchableOpacity>
          </VintaCard>
        </KeyboardAwareScrollView>

        <ErrorModal
          visible={errorModal.visible}
          type={errorModal.type}
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => {
            setErrorModal((prev) => ({ ...prev, visible: false }));
            if (errorModal.title === 'Already Verified') navigation.replace('Login');
          }}
        />
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
  mailIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.bgCardAlt,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  heading: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.navy, marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  email: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.navy, marginVertical: 4, maxWidth: '100%' },
  codeWrap: {
    alignSelf: 'stretch', marginTop: 18, backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, height: 60, justifyContent: 'center',
  },
  codeInput: {
    fontFamily: FONTS.bold, fontSize: 28, color: COLORS.navy, textAlign: 'center', letterSpacing: 10, paddingVertical: 0,
  },
  hint: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textFaint, marginTop: 6 },
  notice: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.teal, marginTop: 10, textAlign: 'center' },
  verifyBtn: {
    alignSelf: 'stretch', height: 50, borderRadius: RADIUS.sm, backgroundColor: COLORS.accent, marginTop: 16,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.accentDark,
  },
  verifyBtnDisabled: { opacity: 0.45 },
  verifyText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFFFFF', letterSpacing: 0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  muted: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  link: { fontFamily: FONTS.bold, fontSize: 12, color: GOLD_TEXT },
  linkDisabled: { color: COLORS.textFaint },
});
