import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';

const SETTINGS_OPTIONS = [
  { id: 'edit',   icon: '✏️', label: 'Edit Profile' },
  { id: 'notif',  icon: '🔔', label: 'Notifications' },
  { id: 'priv',   icon: '🔒', label: 'Privacy & Security' },
  { id: 'help',   icon: '❓', label: 'Help & Support' },
  { id: 'logout', icon: '🚪', label: 'Log Out', color: '#EF4444' },
];

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Make sure to use your correct IP address here
      const response = await fetch('http://192.168.1.11:8000/api/auth/profile/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (e) {
      console.log('Error fetching profile', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // Basic local logout
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    navigation.replace('Login'); // Or whatever the initial screen is
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Avatar Card ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRingOuter}>
            <View style={styles.avatarRingInner}>
              <View style={styles.avatarBg}>
                <Text style={styles.avatarEmoji}>🧔</Text>
              </View>
            </View>
          </View>
          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginTop: 10 }} />
          ) : (
            <>
              <Text style={styles.userName}>{profile?.full_name || 'Loading...'}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.roleText}>✦ {profile?.in_game_name || 'Zamboanga Explorer'} ✦</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Settings List ── */}
        <View style={styles.settingsSection}>
          {SETTINGS_OPTIONS.map(opt => (
            <TouchableOpacity 
              key={opt.id} 
              style={styles.settingItem} 
              activeOpacity={0.7}
              onPress={opt.id === 'logout' ? handleLogout : undefined}
            >
              <View style={styles.settingIconWrap}>
                <Text style={styles.settingIcon}>{opt.icon}</Text>
              </View>
              <Text style={[styles.settingLabel, opt.color && { color: opt.color }]}>
                {opt.label}
              </Text>
              <Text style={styles.settingChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  /* ── Header ── */
  header: {
    height: 60,
    backgroundColor: COLORS.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accentBorder,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: { paddingBottom: 40 },

  /* ── Avatar ── */
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarRingOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    borderColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 14,
  },
  avatarRingInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: { fontSize: 48 },
  userName: {
    fontFamily: FONTS.black,
    fontSize: 20,
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rolePill: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.goldGlow,
    backgroundColor: COLORS.goldSoft,
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  roleText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.gold,
    letterSpacing: 1,
  },

  /* ── Settings ── */
  settingsSection: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: 16,
    borderRadius: RADIUS.sm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 16,
  },
  settingLabel: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  settingChevron: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textMuted,
  },
});
