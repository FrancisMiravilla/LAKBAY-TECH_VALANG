import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import VintaStripe from '../components/VintaStripe';
import { authService } from '../api/authService';
import { getMyScans, getSpots, getARTargets, ORIGIN } from '../api/qrService';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';

const resolveModelUrl = (m) => {
  if (!m) return null;
  if (m.startsWith('data:')) return m;
  if (m.startsWith('http')) return m;
  return `${ORIGIN}${m}`;
};

const HTML_ESCAPE = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
const escapeAttr = (s) => String(s).replace(/["'<>&]/g, (c) => HTML_ESCAPE[c]);

function build3DViewerHTML(modelUrl) {
  if (!modelUrl) return null;
  let safe;
  try {
    safe = escapeAttr(modelUrl);
  } catch {
    return null;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }
    model-viewer { width: 100%; height: 100%; --progress-bar-color: transparent; }
  </style>
</head>
<body>
  <model-viewer src="${safe}" auto-rotate rotation-per-second="30deg" interaction-prompt="none" bounds="tight" exposure="1" shadow-intensity="1" style="width:100%;height:100%"></model-viewer>
</body>
</html>`;
}


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
  const [collectedModels, setCollectedModels] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchData = async () => {
        try {
          const [p, s, spotsData, collectedModelsStr, arTargetsData] = await Promise.all([
            authService.getProfile(),
            getMyScans(),
            getSpots().catch(() => []),
            SecureStore.getItemAsync('collected_models').catch(() => null),
            getARTargets().catch(() => [])
          ]);
          if (isActive) {
            setProfile(p);
            setScans(s?.scans || []);
            if (spotsData?.length > 0) {
              setTotalSpots(spotsData.length);
            }
            if (collectedModelsStr) {
               let storedModels = JSON.parse(collectedModelsStr);
               const targets = Array.isArray(arTargetsData) ? arTargetsData : (arTargetsData?.results || []);
               
               storedModels = storedModels.map(m => {
                   const t = targets.find(t => t.id === m.id);
                   if (t && t.model_3d) {
                       m.model_3d = resolveModelUrl(t.model_3d);
                   }
                   return m;
               });
               setCollectedModels(storedModels);
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
  const currentLevelXp = xp % 100; // XP inside current level (e.g. 50/100)
  const progressPct = currentLevelXp / 100;

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

  // Circular Progress Math
  const size = 140;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct * circumference);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Level {level} Explorer</Text>
      </View>
      <VintaStripe height={4} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.mainProgressWrapper}>
          <View style={styles.progressCircleContainer}>
            <Svg width={size} height={size}>
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={COLORS.gold} stopOpacity="1" />
                  <Stop offset="1" stopColor="#F59E0B" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={COLORS.border}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="url(#grad)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                rotation="-90"
                originX={center}
                originY={center}
              />
            </Svg>
            <View style={styles.progressCircleInner}>
              <Text style={[styles.levelLabel, { color: COLORS.textMuted }]}>LEVEL</Text>
              <Text style={[styles.levelNumber, { color: COLORS.text }]}>{level}</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: COLORS.textMuted }]}>{currentLevelXp} / 100 XP to Level {level + 1}</Text>
        </View>

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

        {/* ── Models Collected ── */}
        <View style={styles.badgesSection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Collected Models</Text>
            <TouchableOpacity onPress={() => alert('View All Models')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.badgesGrid}>
            {collectedModels.length > 0 ? (
              collectedModels.map(b => (
                <View key={b.id || b.name} style={styles.badgeItem}>
                  <View
                    style={[
                      styles.badgeRing,
                      { borderColor: b.color || COLORS.accent, shadowColor: b.color || COLORS.accent, overflow: 'hidden', padding: 0, backgroundColor: COLORS.bgCard },
                    ]}
                  >
                    {b.model_3d ? (
                      <View pointerEvents="none" style={{ flex: 1, width: 70, height: 70, borderRadius: 35, overflow: 'hidden' }}>
                        <WebView
                          source={{ html: build3DViewerHTML(b.model_3d) }}
                          style={{ flex: 1, width: 70, height: 70, backgroundColor: 'transparent' }}
                          javaScriptEnabled
                          originWhitelist={['*']}
                          scrollEnabled={false}
                        />
                      </View>
                    ) : (
                      <View style={styles.badgeCircle}>
                        <Text style={styles.badgeEmoji}>{b.emoji || '🐉'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.badgeLabel}>{b.name}</Text>
                </View>
              ))
            ) : (
              <Text style={{ fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 }}>You haven't collected any models yet.</Text>
            )}
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
    height: 70,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#fff',
    letterSpacing: 1,
  },
  mainProgressWrapper: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  progressCircleContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  progressCircleInner: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: -4,
  },
  levelNumber: {
    fontFamily: FONTS.black,
    fontSize: 48,
    color: '#fff',
  },
  headerSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.gold,
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
