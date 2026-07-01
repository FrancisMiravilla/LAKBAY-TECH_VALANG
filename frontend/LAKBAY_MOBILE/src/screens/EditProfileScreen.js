import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../api/authService';

const CHARACTERS = [
  { id: 'mando', name: 'Kuya Mando', image: require('../assets/characters/lila.jpg'), zoom: 1.15 },
  { id: 'bela', name: 'Ate Bela', image: require('../assets/characters/new.jpg'), zoom: 1.15 },
  { id: 'lila', name: 'Ate Lila', image: require('../assets/characters/ricky.jpg'), zoom: 1.4 },
  { id: 'dante', name: 'Bossing Dante', image: require('../assets/characters/dante.jpg'), zoom: 1.4 },
  { id: 'sonya', name: 'Ate Sonya', image: require('../assets/characters/sonya.jpg'), zoom: 1 },
];

export default function EditProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [character, setCharacter] = useState('mando');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await authService.getProfile();
      setFullName(data.full_name || '');
      setInGameName(data.in_game_name || '');
      setCharacter(data.chosen_character || 'mando');
    } catch (e) {
      console.log('Error fetching profile for edit', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim() || !inGameName.trim()) {
      Alert.alert('Validation Error', 'Full Name and Explorer Name cannot be empty.');
      return;
    }
    
    setSaving(true);
    try {
      await authService.updateProfile({
        full_name: fullName.trim(),
        in_game_name: inGameName.trim(),
        chosen_character: character,
      });
      navigation.goBack();
    } catch (e) {
      console.log('Error updating profile', e);
      let errorMsg = 'Failed to update profile.';
      if (e.in_game_name) {
          errorMsg = e.in_game_name[0];
      }
      Alert.alert('Update Failed', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
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

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    height: 60,
    backgroundColor: COLORS.navy,
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
    fontSize: 18,
    color: '#fff',
  },
  content: { padding: 24 },
  formGroup: { marginBottom: 24 },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inputWrap: {
    backgroundColor: COLORS.bgCard,
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
