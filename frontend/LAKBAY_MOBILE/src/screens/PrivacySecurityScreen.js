import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TouchableOpacity, StatusBar, ActivityIndicator, ImageBackground,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, BG_OVERLAY, GOLD_TEXT } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import VintaStripe from '../components/VintaStripe';
import ErrorModal from '../components/ErrorModal';
import PasswordField from '../components/PasswordField';
import { authService } from '../api/authService';

const MIN_PASSWORD = 8;

const PRIVACY_POINTS = [
  { icon: 'person-outline', text: 'LAKBAY keeps your name, email, home location and explorer profile so you can log in and keep your progress.' },
  { icon: 'lock-closed-outline', text: 'Your password is stored scrambled. No one, including the LAKBAY team, can read it. That is why it can be changed but never shown.' },
  { icon: 'location-outline', text: 'Your phone location is used to show nearby places, the Catch hunt and directions (through Mapbox). LAKBAY does not keep a history of where you have been.' },
  { icon: 'camera-outline', text: 'The camera is used only to scan QR codes and artworks. Photos and video are not saved or uploaded.' },
  { icon: 'trophy-outline', text: 'Other players see only your explorer name, character and XP on the leaderboard, never your real name or email.' },
];

export default function PrivacySecurityScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ visible: false, type: 'error', title: '', message: '' });

  useEffect(() => {
    authService.getProfile().then(setProfile).catch(() => {});
  }, []);

  const changePassword = async () => {
    const next = {};
    if (!current) next.current = 'Enter your current password.';
    if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    else if (password === current) next.password = 'Choose a password different from the current one.';
    if (confirm !== password) next.confirm = 'The two passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length || saving) return;
    setSaving(true);
    try {
      await authService.changePassword(current, password);
      setCurrent('');
      setPassword('');
      setConfirm('');
      setModal({ visible: true, type: 'success', title: 'Password Changed', message: 'Use your new password the next time you log in.' });
    } catch (error) {
      if (error?.field === 'current_password') setErrors({ current: error.detail });
      else if (error?.field === 'new_password') setErrors({ password: error.detail });
      else {
        setModal({
          visible: true, type: 'error', title: 'Could Not Change Password',
          message: error?.detail || 'The LAKBAY server may still be waking up. Please try again in a few seconds.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.bgImage} resizeMode="cover">
      <View style={styles.bgOverlay} />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy & Security</Text>
          <View style={{ width: 40 }} />
        </View>
        <VintaStripe height={3} />

        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={24}
        >
          <VintaCard contentStyle={styles.card}>
            <Text style={styles.cardTitle}>Account</Text>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={styles.emailRow}>
              <Text style={styles.email} numberOfLines={1}>{profile?.email || '—'}</Text>
              {profile?.email_verified && (
                <View style={styles.verified}>
                  <Ionicons name="checkmark-circle" size={14} color="#047857" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </VintaCard>

          <VintaCard style={styles.gap} contentStyle={styles.card}>
            <Text style={styles.cardTitle}>Change Password</Text>
            <PasswordField label="CURRENT PASSWORD" value={current} onChangeText={setCurrent} error={errors.current} autoComplete="current-password" />
            <PasswordField label="NEW PASSWORD" value={password} onChangeText={setPassword} error={errors.password} autoComplete="new-password" />
            <PasswordField label="CONFIRM NEW PASSWORD" value={confirm} onChangeText={setConfirm} error={errors.confirm} autoComplete="new-password" />

            <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={changePassword} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Change Password</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgot}
              onPress={() => navigation.navigate('ForgotPassword', { email: profile?.email || '' })}
            >
              <Text style={styles.link}>Forgot your current password? Reset it by email</Text>
            </TouchableOpacity>
          </VintaCard>

          <VintaCard style={styles.gap} contentStyle={styles.card}>
            <Text style={styles.cardTitle}>How LAKBAY Uses Your Data</Text>
            {PRIVACY_POINTS.map((p) => (
              <View key={p.icon} style={styles.point}>
                <Ionicons name={p.icon} size={18} color={COLORS.accent} style={styles.pointIcon} />
                <Text style={styles.pointText}>{p.text}</Text>
              </View>
            ))}
          </VintaCard>
        </KeyboardAwareScrollView>

        <ErrorModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onClose={() => setModal((m) => ({ ...m, visible: false }))}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BG_OVERLAY },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    height: 60, backgroundColor: 'rgba(8, 20, 60, 0.70)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  gap: { marginTop: 16 },
  card: { padding: 20 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.navy, marginBottom: 14 },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.textSub, letterSpacing: 1, marginBottom: 6 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  email: { flexShrink: 1, fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.navy },
  verified: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, backgroundColor: '#D1FAE5',
  },
  verifiedText: { fontFamily: FONTS.bold, fontSize: 11, color: '#047857' },
  btn: {
    height: 50, borderRadius: RADIUS.sm, backgroundColor: COLORS.accent, marginTop: 4,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.accentDark,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFFFFF', letterSpacing: 0.5 },
  forgot: { alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  link: { fontFamily: FONTS.bold, fontSize: 12, color: GOLD_TEXT, textAlign: 'center' },
  point: { flexDirection: 'row', marginBottom: 12 },
  pointIcon: { marginRight: 10, marginTop: 1 },
  pointText: { flex: 1, fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSub, lineHeight: 19 },
});
