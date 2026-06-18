import React, { useState } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TextInput,
  TouchableOpacity, ScrollView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

const CHARACTERS = [
  {
    id: 'mando',
    name: 'Kuya Mando',
    title: 'The Trailblazer',
    emoji: '🧑‍🎒',
    color: COLORS.accent,
    desc: 'Bold & fearless',
  },
  {
    id: 'bela',
    name: 'Ate Bela',
    title: 'The Wanderer',
    emoji: '👩‍🎒',
    color: '#FBBF24',
    desc: 'Curious & free',
  },
  {
    id: 'ricky',
    name: 'Kuya Ricky',
    title: 'The Scout',
    emoji: '🧔‍♂️',
    color: '#FB923C',
    desc: 'Sharp & swift',
  },
  {
    id: 'lila',
    name: 'Ate Lila',
    title: 'The Navigator',
    emoji: '🧕',
    color: '#A78BFA',
    desc: 'Wise & precise',
  },
  {
    id: 'dante',
    name: 'Bossing Dante',
    title: 'The Adventurer',
    emoji: '👴',
    color: '#38BDF8',
    desc: 'Leader & brave',
  },
  {
    id: 'sonya',
    name: 'Ate Sonya',
    title: 'The Discoverer',
    emoji: '👩‍🦱',
    color: COLORS.teal,
    desc: 'Creative & bold',
  },
];

export default function CharacterSelectScreen({ route, navigation }) {
  const [explorerName, setExplorerName] = useState('');
  const [selectedId, setSelectedId]     = useState('mando');
  const [loading, setLoading]           = useState(false);

  // Get the JWT token passed from the registration screen
  const token = route.params?.token;

  const selected = CHARACTERS.find(c => c.id === selectedId);

  const handleStart = async () => {
    if (!explorerName.trim()) {
      Alert.alert('Explorer Name Required', 'Please enter your explorer name to continue.');
      return;
    }
    setLoading(true);
    
    try {
      // If we don't have a token, skip the API call (useful for UI testing)
      if (!token) {
        setTimeout(() => {
          setLoading(false);
          navigation.replace('MainTabs');
        }, 1000);
        return;
      }

      const response = await fetch('https://whole-crabs-wink.loca.lt/api/auth/character-setup/', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({
          in_game_name: explorerName,
          chosen_character: selected.name
        })
      });
      
      const data = await response.json();
      setLoading(false);
      
      if (response.ok) {
        // Success! Character selected and saved to backend profile
        navigation.replace('MainTabs');
      } else {
        // Backend returned an error (e.g., in-game name already taken)
        const errorMsg = data.in_game_name ? data.in_game_name[0] : 'Failed to save character setup.';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('App Error', String(error.message || error));
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.accent} />

      {/* ── Pink Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />
        <Text style={styles.headerTitle}>Choose Your Explorer</Text>
        <Text style={styles.headerSub}>Pick your adventure character</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Explorer Name Input ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EXPLORER NAME</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your explorer name..."
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              value={explorerName}
              onChangeText={setExplorerName}
            />
          </View>
        </View>

        {/* ── Character Grid ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECT CHARACTER</Text>

          <View style={styles.grid}>
            {CHARACTERS.map((char) => {
              const isSelected = char.id === selectedId;
              return (
                <TouchableOpacity
                  key={char.id}
                  style={[
                    styles.charCard,
                    isSelected && {
                      borderColor: char.color,
                      backgroundColor: char.color + '18',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedId(char.id)}
                >
                  {/* Selected checkmark badge */}
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: COLORS.gold }]}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  )}

                  {/* Character avatar */}
                  <View style={[
                    styles.avatarRing,
                    { borderColor: isSelected ? char.color : 'transparent',
                      backgroundColor: isSelected ? char.color + '22' : COLORS.bgSurface }
                  ]}>
                    <Text style={styles.charEmoji}>{char.emoji}</Text>
                  </View>

                  {/* Name + title */}
                  <Text style={[
                    styles.charName,
                    isSelected && { color: char.color }
                  ]}>
                    {char.name}
                  </Text>
                  <Text style={[
                    styles.charTitle,
                    isSelected && { color: char.color + 'CC' }
                  ]}>
                    {char.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Selected Status Bar ─────────────────────────────────── */}
        {selected && (
          <View style={[styles.selectedBar, { borderColor: selected.color + '55' }]}>
            <View style={[styles.selectedDot, { backgroundColor: selected.color }]} />
            <Text style={styles.selectedBarText}>Selected: </Text>
            <Text style={[styles.selectedBarName, { color: selected.color }]}>
              {explorerName.trim() || selected.name}
            </Text>
            <Text style={styles.selectedBarDivider}> · </Text>
            <Text style={[styles.selectedBarRole, { color: selected.color }]}>
              {selected.title}
            </Text>
          </View>
        )}

        {/* ── Start Adventure Button ──────────────────────────────── */}
        <TouchableOpacity
          style={[styles.startBtn, !explorerName.trim() && styles.startBtnDisabled]}
          activeOpacity={0.88}
          onPress={handleStart}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.startBtnText}>Start Adventure</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    backgroundColor: COLORS.accent,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  headerBlob1: {
    position: 'absolute', top: -30, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerBlob2: {
    position: 'absolute', bottom: -20, right: 20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  headerTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  headerSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 0.3,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },

  // ── Section ───────────────────────────────────────────────────────
  section: { marginBottom: 24 },
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // ── Explorer Name Input ───────────────────────────────────────────
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 14,
    color: COLORS.text,
  },

  // ── Character Grid ────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  charCard: {
    width: '47.5%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    ...SHADOW.card,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  charEmoji: {
    fontSize: 40,
  },
  charName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 3,
  },
  charTitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // ── Selected Bar ──────────────────────────────────────────────────
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  selectedBarText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  selectedBarName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  selectedBarDivider: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  selectedBarRole: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },

  // ── Start Button ──────────────────────────────────────────────────
  startBtn: {
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.accent,
  },
  startBtnDisabled: {
    opacity: 0.55,
  },
  startBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 1,
  },
});
