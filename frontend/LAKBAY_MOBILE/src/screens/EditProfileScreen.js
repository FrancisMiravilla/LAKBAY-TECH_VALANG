import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, BackHandler, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, GUIDE_FONTS } from '../constants/theme';
import { authService } from '../api/authService';
import LucideIcon from '../components/LucideIcon';
import { useAppDialog } from '../components/useAppDialog';
import {
  BeachBackdrop, ChamferButton, ChamferFrame, CREATION, GlitchTitle, PopPressable, RiseIn,
} from '../components/CreationKit';
import {
  AvatarPreview, CustomizePanel, DEFAULT_LOOK, GuidePicker, STARTER_CATALOG, StarterLooks,
  customizerStyles, randomLook,
} from '../components/AvatarCustomizer';

// Edit Profile in the same pixel-beach style as character creation:
// live preview, details, guide, then the same customize panel.

const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 16;

const explorerNameError = (value) => {
  const n = value.trim();
  if (n.length < 3) return 'Use at least 3 characters.';
  if (n.length > 20) return 'Keep it to 20 characters or less.';
  if (!/^[A-Za-z0-9_ ]+$/.test(n)) return 'Letters, numbers, spaces and _ only.';
  return null;
};

function Field({ label, value, onChangeText, placeholder, error, width, autoCapitalize = 'words', maxLength }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ChamferFrame width={width} height={52} cut={10} fill="#FFFFFF" stroke={error ? '#EF4444' : CREATION.blue} strokeWidth={2}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B8AE96"
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
        />
      </ChamferFrame>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

export default function EditProfileScreen({ navigation }) {
  const { dialog, showAlert } = useAppDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [character, setCharacter] = useState('mando');
  // Avatar decorations: catalog + equipped from the server, `look` is the unsaved choice.
  const [cosmetics, setCosmetics] = useState(null);
  const [look, setLook] = useState(DEFAULT_LOOK);
  const [panel, setPanel] = useState(null);

  const catalog = cosmetics?.catalog?.length ? cosmetics.catalog : STARTER_CATALOG;
  const contentW = SCREEN_W - PAD * 2;
  const nameError = inGameName ? explorerNameError(inGameName) : 'Enter your explorer name.';
  const fullNameError = fullName.trim() ? null : 'Enter your full name.';

  useEffect(() => {
    (async () => {
      try {
        const [data, cos] = await Promise.all([
          authService.getProfile(),
          authService.getCosmetics().catch(() => null),
        ]);
        setFullName(data.full_name || '');
        setInGameName(data.in_game_name || '');
        setCharacter(data.chosen_character || 'mando');
        if (cos) {
          setCosmetics(cos);
          setLook(cos.equipped);
        }
      } catch (e) {
        console.log('Error fetching profile for edit', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Android back closes an open item list first, like character creation.
  const onBack = useCallback(() => {
    if (panel) { setPanel(null); return true; }
    return false;
  }, [panel]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [onBack]);

  const handleSave = async () => {
    if (fullNameError || nameError) {
      showAlert('Check Your Details', fullNameError || nameError);
      return;
    }
    setSaving(true);
    try {
      await authService.updateProfile({
        full_name: fullName.trim(),
        in_game_name: inGameName.trim(),
        chosen_character: character,
      });
      const lookChanged = cosmetics && Object.keys(look).some((k) => look[k] !== cosmetics.equipped[k]);
      if (lookChanged) {
        try {
          await authService.saveCosmetics(look);
        } catch (err) {
          showAlert('Avatar Not Saved', err?.response?.data?.error || 'Your details were saved, but the avatar style could not be.');
          return;
        }
      }
      navigation.goBack();
    } catch (e) {
      console.log('Error updating profile', e);
      const taken = e?.in_game_name || e?.response?.data?.in_game_name;
      showAlert('Update Failed', taken ? String(taken[0] || taken) : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        <PopPressable onPress={() => (onBack() ? null : navigation.goBack())} accessibilityLabel="Back">
          <ChamferFrame width={36} height={36} cut={8} fill="#FFFDF4" stroke={CREATION.muted} strokeWidth={1.5}>
            <View style={styles.centerFill}><Ionicons name="arrow-back" size={16} color={CREATION.ink} /></View>
          </ChamferFrame>
        </PopPressable>
      </View>
      <Text style={styles.wordmark}>LAKBAY</Text>
      <View style={styles.headerSide} />
    </View>
  );

  return (
    <BeachBackdrop>
      <StatusBar barStyle="dark-content" backgroundColor={CREATION.sand} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {header}
        <GlitchTitle kicker="Make it yours" title="Edit Profile" />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={CREATION.blue} size="large" />
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <RiseIn index={0}>
                <AvatarPreview character={character} look={look} width={contentW} height={210} avatarSize={112}>
                  <Text style={styles.previewName} numberOfLines={1}>{inGameName.trim() || 'Explorer'}</Text>
                  {!!cosmetics && (
                    <Text style={styles.previewXp}>{cosmetics.xp.toLocaleString()} XP · earn more to unlock styles</Text>
                  )}
                </AvatarPreview>
              </RiseIn>

              <RiseIn index={1} style={styles.btnRow}>
                <ChamferButton
                  variant="outline"
                  label="Randomize"
                  width={(contentW - 10) / 2}
                  onPress={() => setLook(randomLook(catalog))}
                  icon={<LucideIcon name="dices" size={16} color={CREATION.blue} />}
                />
                <ChamferButton
                  label={saving ? 'Saving…' : 'Save'}
                  width={(contentW - 10) / 2}
                  disabled={saving}
                  onPress={handleSave}
                  icon={<Ionicons name="checkmark" size={17} color="#FFFFFF" />}
                />
              </RiseIn>

              <Text style={styles.sectionTitle}>EXPLORER DETAILS</Text>
              <View style={customizerStyles.panelCard}>
                <Field
                  label="Full name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  error={fullNameError}
                  width={contentW - 26}
                />
                <Field
                  label="Explorer name"
                  value={inGameName}
                  onChangeText={setInGameName}
                  placeholder="Your explorer name"
                  error={nameError}
                  width={contentW - 26}
                  autoCapitalize="none"
                  maxLength={20}
                />
                <Text style={styles.hint}>Your explorer name is how others see you on the leaderboard.</Text>
              </View>

              <Text style={styles.sectionTitle}>YOUR GUIDE</Text>
              <View style={customizerStyles.panelCard}>
                <GuidePicker value={character} onChange={setCharacter} width={contentW - 26} />
              </View>

              <Text style={styles.sectionTitle}>AVATAR STYLE</Text>
              {!cosmetics && (
                <Text style={styles.hint}>Only the starter styles are shown. Reopen Edit Profile online to see everything you unlocked.</Text>
              )}
              <View style={customizerStyles.panelCard}>
                <CustomizePanel
                  catalog={catalog}
                  look={look}
                  onLookChange={setLook}
                  character={character}
                  panel={panel}
                  onPanelChange={setPanel}
                  onReset={cosmetics ? () => setLook(cosmetics.equipped) : () => setLook(DEFAULT_LOOK)}
                  resetLabel={cosmetics ? 'Undo ↺' : 'Reset ↺'}
                />
              </View>
              <StarterLooks catalog={catalog} character={character} onPick={(l) => setLook((cur) => ({ ...cur, ...l }))} />

              <RiseIn index={2} style={{ marginTop: 22 }}>
                <ChamferButton
                  label={saving ? 'Saving…' : 'Save Changes'}
                  width={contentW}
                  height={54}
                  disabled={saving}
                  onPress={handleSave}
                  icon={<LucideIcon name="sailboat" size={18} color="#FFFFFF" />}
                />
              </RiseIn>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
      {dialog}
    </BeachBackdrop>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingTop: 6 },
  headerSide: { width: 64, height: 36, justifyContent: 'center' },
  wordmark: { flex: 1, textAlign: 'center', fontFamily: GUIDE_FONTS.display, fontSize: 18, color: CREATION.blue, letterSpacing: 3 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: PAD, paddingBottom: 120 },

  previewName: {
    fontFamily: FONTS.bold, fontSize: 18, color: CREATION.ink, marginTop: 8, maxWidth: '85%', textAlign: 'center',
  },
  previewXp: { fontFamily: FONTS.medium, fontSize: 11.5, color: CREATION.ink, marginTop: 2, opacity: 0.8 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'center' },

  sectionTitle: {
    fontFamily: GUIDE_FONTS.display, fontSize: 13, color: CREATION.ink, letterSpacing: 0.5, marginTop: 22,
  },
  field: { marginBottom: 12 },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 12, color: CREATION.muted, marginBottom: 6, letterSpacing: 0.4 },
  input: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: CREATION.ink, paddingHorizontal: 14 },
  fieldError: { fontFamily: FONTS.medium, fontSize: 11.5, color: '#DC2626', marginTop: 4 },
  hint: { fontFamily: FONTS.regular, fontSize: 12, color: CREATION.muted, marginTop: 4 },
});
