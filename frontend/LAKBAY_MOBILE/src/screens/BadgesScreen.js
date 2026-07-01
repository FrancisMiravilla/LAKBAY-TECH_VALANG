import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import VintaStripe from '../components/VintaStripe';
import { authService } from '../api/authService';
import { getMyScans, getSpots } from '../api/qrService';

const BADGES = [
  { emoji: '⛵', label: 'Vinta',       color: COLORS.accent },
  { emoji: '🦀', label: 'Curacha',    color: '#E05A47'     },
  { emoji: '🎨', label: 'Yakan Weave', color: COLORS.gold  },
  { emoji: '🏰', label: 'Lantaka',    color: '#9333EA'     },
  { emoji: '⛪', label: 'Fort Pilar', color: '#2563EB'     },
];

export default function BadgesScreen() {
  const [profile, setProfile] = useState(null);
  const [scans, setScans] = useState([]);
  const [totalSpots, setTotalSpots] = useState(12);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchData = async () => {
        try {
          const [p, s, spotsData] = await Promise.all([
            authService.getProfile(),
            getMyScans(),
            getSpots().catch(() => []) // Fallback in case spots fail
          ]);
          if (isActive) {
            setProfile(p);
            setScans(s?.scans || []);
            if (spotsData?.length > 0) {
              setTotalSpots(spotsData.length);
            }
          }
        } catch (err) {
          console.error('Error fetching badges data:', err);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchData();
      return () => { isActive = false; };
    }, [])
  );

  const xp = profile?.xp || 0;
  // Level calculation: 100 XP per level
  const level = Math.floor(xp / 100) + 1;
  const nextLevelXp = level * 100;
  
  const scansCount = scans.length;
  // Assume AR done if unlock_type is AR or if we eventually track it. 
  // For now, let's just count how many scans have 'ar' unlock type if applicable, or default to 0.
  const arDone = scans.filter(s => s.unlock_type === 'ar').length;

  const pctQR = totalSpots > 0 ? scansCount / totalSpots : 0;
  const pctAR = arDone / 5; // Assuming 5 AR experiences total for now
  
  const STATS = [
    { value: xp.toLocaleString(), label: 'XP Earned', color: COLORS.gold },
    { value: scansCount.toString(), label: 'QR Scanned', color: COLORS.teal },
    { value: arDone.toString(), label: 'AR Done', color: COLORS.accent },
  ];

  const PROGRESS = [
    { icon: '🔍', title: 'QR Visited', sub: `${scansCount}/${totalSpots} locations scanned`, pct: pctQR, color: COLORS.teal },
    { icon: '📸', title: 'AR Completed', sub: `${arDone}/5 museum AR experiences`, pct: pctAR, color: COLORS.accent },
    { icon: '🏆', title: 'Catch Progress', sub: `0/4 cultural symbols caught`, pct: 0, color: COLORS.gold },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Level {level} Explorer</Text>
      </View>
      <VintaStripe height={4} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Stats Grid (XP etc) ── */}
        <View style={styles.statsRow}>
          {STATS.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Progress Cards ── */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Activity Progress</Text>
          {PROGRESS.map(p => (
            <View key={p.title} style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View
                  style={[
                    styles.progressIcon,
                    {
                      backgroundColor: p.color + '22',
                      borderColor: p.color + '44',
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text style={styles.progressIconEmoji}>{p.icon}</Text>
                </View>
                <View style={styles.progressTextBox}>
                  <Text style={styles.progressTitle}>{p.title}</Text>
                  <Text style={styles.progressSub}>{p.sub}</Text>
                </View>
                <Text style={[styles.progressPct, { color: p.color }]}>
                  {Math.round(p.pct * 100)}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.round(p.pct * 100))}%`,
                      backgroundColor: p.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* ── Badges Collected ── */}
        <View style={styles.badgesSection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Collected Badges</Text>
            <TouchableOpacity onPress={() => alert('View All Badges')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.badgesGrid}>
            {BADGES.map(b => (
              <View key={b.label} style={styles.badgeItem}>
                <View
                  style={[
                    styles.badgeRing,
                    { borderColor: b.color, shadowColor: b.color },
                  ]}
                >
                  <View style={styles.badgeCircle}>
                    <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                  </View>
                </View>
                <Text style={styles.badgeLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  scroll: { paddingVertical: 16 },

  /* ── Stats ── */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  statValue: {
    fontFamily: FONTS.black,
    fontSize: 22,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  /* ── Progress ── */
  progressSection: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 14,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewAll: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.gold,
  },
  progressCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  progressIconEmoji: { fontSize: 18 },
  progressTextBox: { flex: 1 },
  progressTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.text,
  },
  progressSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  progressPct: {
    fontFamily: FONTS.black,
    fontSize: 15,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.accentBorder,
    marginHorizontal: 16,
    marginBottom: 20,
  },

  /* ── Badges ── */
  badgesSection: { paddingHorizontal: 16, marginBottom: 20 },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  badgeItem: { alignItems: 'center', width: 78, marginBottom: 10 },
  badgeRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 8,
  },
  badgeCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: { fontSize: 28 },
  badgeLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.textSub,
    textAlign: 'center',
  },
});
