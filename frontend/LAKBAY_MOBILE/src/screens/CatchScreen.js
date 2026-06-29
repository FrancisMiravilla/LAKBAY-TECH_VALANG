import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getCatchIcons, ORIGIN } from '../api/qrService';

// Fallback accent colours used when the backend doesn't supply one
const FALLBACK_COLORS = ['#E91E8C', '#38BDF8', '#FBBF24', '#10B981'];

function normalizeIcon(raw, idx) {
  const color = raw.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  const modelPath = raw.model_3d || null;
  return {
    id:          raw.id,
    name:        raw.name        || 'Unknown',
    tagline:     raw.tagline     || '',
    about:       raw.about       || '',
    significance: raw.significance || raw.cultural_significance || '',
    color,
    glow: color + '55',
    model_3d: modelPath
      ? (modelPath.startsWith('http') || modelPath.startsWith('data:')
          ? modelPath
          : `${ORIGIN}${modelPath}`)
      : null,
  };
}

export default function CatchScreen({ navigation }) {
  const [icons, setIcons]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getCatchIcons()
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setIcons(list.map(normalizeIcon));
      })
      .catch(() => setError('Could not load cultural icons.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={COLORS.gold} style={{ marginRight: 6 }} />
          <View>
            <Text style={styles.logoTitle}>LAKBAY</Text>
            <Text style={styles.logoSub}>ZAMBOANGA CITY</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Sub Header */}
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>CATCH</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading cultural icons…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={42} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => {
            setLoading(true); setError(null);
            getCatchIcons()
              .then(data => setIcons((Array.isArray(data) ? data : (data.results || [])).map(normalizeIcon)))
              .catch(() => setError('Could not load cultural icons.'))
              .finally(() => setLoading(false));
          }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressTopRow}>
              <Text style={styles.progressLabel}>Collection Progress</Text>
              <Text style={styles.progressValue}>
                <Text style={styles.progressCaught}>0</Text>
                {' '}/ {icons.length}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '0%' }]} />
            </View>
          </View>

          {/* Section heading */}
          <View style={styles.sectionRow}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Choose a Cultural Icon</Text>
          </View>
          <Text style={styles.sectionSub}>
            Tap any icon to learn about its history and cultural significance.
          </Text>

          {/* 2×2 Icon Grid */}
          {icons.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="images-outline" size={36} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No cultural icons available yet.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {icons.map(icon => (
                <TouchableOpacity
                  key={icon.id}
                  style={[styles.iconCard, { borderColor: icon.color + '55' }]}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('CatchDetails', { icon })}
                >
                  {/* Glow blob */}
                  <View style={[styles.cardGlow, { backgroundColor: icon.glow }]} />

                  {/* Model placeholder ring */}
                  <View style={[styles.modelRing, { borderColor: icon.color + '88', backgroundColor: icon.color + '18' }]}>
                    {icon.model_3d
                      ? <Ionicons name="cube-outline" size={28} color={icon.color} />
                      : <Ionicons name="help-circle-outline" size={28} color={icon.color} />}
                  </View>

                  <Text style={[styles.iconName, { color: icon.color }]}>{icon.name}</Text>
                  <Text style={styles.iconTagline} numberOfLines={2}>{icon.tagline}</Text>

                  {/* Arrow */}
                  <View style={[styles.arrowBtn, { backgroundColor: icon.color + '22', borderColor: icon.color + '44' }]}>
                    <Ionicons name="arrow-forward" size={14} color={icon.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, height: 60, backgroundColor: '#C8175A',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoTitle: { fontFamily: FONTS.pixel, fontSize: 9, color: '#FFF', letterSpacing: 1, lineHeight: 16 },
  logoSub: { fontFamily: FONTS.medium, fontSize: 8, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  headerBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center',
  },

  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 48, backgroundColor: '#1A0A30',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
  subHeaderTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFF', letterSpacing: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
  errorText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.accent },
  retryText: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFF' },

  scroll: { padding: 16, paddingBottom: 40 },

  progressCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFF' },
  progressValue: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.textMuted },
  progressCaught: { color: COLORS.gold },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 3 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  accentBar: { width: 3, height: 18, backgroundColor: COLORS.accent, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 17, color: '#FFF' },
  sectionSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginBottom: 20, lineHeight: 18 },

  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  iconCard: {
    width: '47.5%', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: 16, borderWidth: 1,
    overflow: 'hidden', position: 'relative',
  },
  cardGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 100, height: 100, borderRadius: 50, opacity: 0.4,
  },

  modelRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },

  iconName: { fontFamily: FONTS.bold, fontSize: 16, marginBottom: 4 },
  iconTagline: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSub, lineHeight: 16, marginBottom: 14 },

  arrowBtn: {
    alignSelf: 'flex-start', width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
});
