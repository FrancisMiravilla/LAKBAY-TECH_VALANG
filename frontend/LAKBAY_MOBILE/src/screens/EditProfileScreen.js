import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, ImageBackground, StatusBar } from 'react-native';
import { COLORS, FONTS, RADIUS, BG_OVERLAY } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import VintaStripe from '../components/VintaStripe';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../api/authService';
import DecoratedAvatar, { ProfileBackdrop } from '../components/DecoratedAvatar';
import AvatarStylePicker from '../components/AvatarStylePicker';

import { useAppDialog } from '../components/useAppDialog';
const CHARACTERS = [
  { id: 'mando', name: 'Kuya Mando', image: require('../assets/characters/lila.jpg'), zoom: 1.15 },
  { id: 'bela', name: 'Ate Bela', image: require('../assets/characters/new.jpg'), zoom: 1.15 },
  { id: 'lila', name: 'Ate Lila', image: require('../assets/characters/ricky.jpg'), zoom: 1.4 },
  { id: 'dante', name: 'Bossing Dante', image: require('../assets/characters/dante.jpg'), zoom: 1.4 },
  { id: 'sonya', name: 'Ate Sonya', image: require('../assets/characters/sonya.jpg'), zoom: 1 },
];

export default function EditProfileScreen({ navigation }) {
  const { dialog, showAlert } = useAppDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [character, setCharacter] = useState('mando');
  // Avatar decorations: catalog + equipped from the server, `look` is the unsaved choice.
  const [cosmetics, setCosmetics] = useState(null);
  const [look, setLook] = useState({ hat: '', frame: '', pin: '', backdrop: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
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
  };

  const handleSave = async () => {
    if (!fullName.trim() || !inGameName.trim()) {
      showAlert('Validation Error', 'Full Name and Explorer Name cannot be empty.');
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
      let errorMsg = 'Failed to update profile.';
      if (e.in_game_name) {
          errorMsg = e.in_game_name[0];
      }
      showAlert('Update Failed', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.bgImage} resizeMode="cover">
        <View style={styles.bgOverlay} />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.bgImage} resizeMode="cover">
    <View style={styles.bgOverlay} />
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      <VintaStripe height={3} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Live preview of companion + avatar style */}
        <View style={styles.preview}>
          <ProfileBackdrop id={look.backdrop} style={StyleSheet.absoluteFill} />
          <View style={styles.previewDim} />
          <DecoratedAvatar character={character} size={100} hat={look.hat} frame={look.frame} pin={look.pin} />
          <Text style={styles.previewName} numberOfLines={1}>{inGameName.trim() || 'Explorer'}</Text>
          {cosmetics && (
            <Text style={styles.previewXp}>{cosmetics.xp.toLocaleString()} XP · earn more to unlock styles</Text>
          )}
        </View>

        <VintaCard contentStyle={styles.formCard}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>FULL NAME</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>EXPLORER NAME</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={inGameName}
              onChangeText={setInGameName}
              placeholder="Enter your explorer name"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>CHOOSE COMPANION</Text>
          <View style={styles.charGrid}>
            {CHARACTERS.map(c => {
              const isSelected = character === c.id;
              return (
                <TouchableOpacity 
                  key={c.id} 
                  style={[styles.charCard, isSelected && styles.charCardSelected]} 
                  onPress={() => setCharacter(c.id)}
                >
                  <View style={[styles.charImageWrap, isSelected && { borderColor: COLORS.accent, borderWidth: 2 }]}>
                    <Image 
                      source={c.image} 
                      style={[styles.charImage, { transform: [{ scale: c.zoom }] }]} 
                      resizeMode="cover" 
                    />
                  </View>
                  <Text style={[styles.charName, isSelected && { color: COLORS.accent, fontFamily: FONTS.bold }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>AVATAR STYLE</Text>
          {cosmetics ? (
            <AvatarStylePicker catalog={cosmetics.catalog} value={look} onChange={setLook} character={character} />
          ) : (
            <Text style={styles.styleUnavailable}>Avatar styles could not load. Check your connection and reopen Edit Profile.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
        </VintaCard>

        <View style={{ height: 40 }} />
      </ScrollView>
      {dialog}
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 230, borderRadius: 28, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  previewDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,18,49,0.25)' },
  previewName: {
    fontFamily: FONTS.bold, fontSize: 20, color: '#FFFFFF', marginTop: 8, maxWidth: '85%',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  previewXp: {
    fontFamily: FONTS.medium, fontSize: 12, color: '#FFFFFF', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  styleUnavailable: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  bgImage: { flex: 1 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BG_OVERLAY },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    height: 60,
    backgroundColor: 'rgba(8, 20, 60, 0.70)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40, height: 40, justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#fff',
  },
  content: { padding: 16 },
  formCard: { padding: 20, paddingTop: 24 },
  formGroup: { marginBottom: 24 },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textSub,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inputWrap: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
  },
  input: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.text,
  },
  charGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  charCard: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 16,
  },
  charCardSelected: {
    opacity: 1,
  },
  charImageWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.bgSurface,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  charImage: { width: '100%', height: '100%' },
  charName: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    height: 54,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#fff',
  }
});
