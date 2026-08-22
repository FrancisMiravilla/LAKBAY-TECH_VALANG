import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import VintaStripe from '../components/VintaStripe';
import { authService } from '../api/authService';
import { getMyScans, getSpots, getARTargets, ORIGIN } from '../api/qrService';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  try { safe = escapeAttr(modelUrl); } catch { return null; }
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

// ─── Rank System ──────────────────────────────────────────────────────────────
const getRank = (level) => {
  if (level >= 20) return { title: 'Legendary', icon: '👑', color: '#FF6B00', glow: 'rgba(255,107,0,0.4)' };
  if (level >= 15) return { title: 'Master',    icon: '💎', color: '#9B59B6', glow: 'rgba(155,89,182,0.4)' };
  if (level >= 10) return { title: 'Expert',    icon: '⚡', color: '#FBBF24', glow: 'rgba(251,191,36,0.4)' };
  if (level >= 5)  return { title: 'Adventurer',icon: '🗺️', color: '#10B981', glow: 'rgba(16,185,129,0.4)' };
  return              { title: 'Explorer',   icon: '🧭', color: '#1A56DB', glow: 'rgba(26,86,219,0.4)' };
};

// ─── Hexagon Badge SVG ────────────────────────────────────────────────────────
function HexBadge({ size = 80, borderColor, glowColor, children }) {
  const s = size;
  const pts = [
    [s * 0.5, 0],
    [s, s * 0.25],
    [s, s * 0.75],
    [s * 0.5, s],
    [0, s * 0.75],
    [0, s * 0.25],
  ].map(([x, y]) => `${x},${y}`).join(' ');

  const inner = s * 0.88;
  const off = (s - inner) / 2;
  const innerPts = [
    [inner * 0.5, 0],
    [inner, inner * 0.25],
    [inner, inner * 0.75],
    [inner * 0.5, inner],
    [0, inner * 0.75],
    [0, inner * 0.25],
  ].map(([x, y]) => `${x + off},${y + off}`).join(' ');

  const fillColor = glowColor || (borderColor + '22');

  return (
    <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={s} height={s} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={`hg_${s}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={borderColor} stopOpacity="1" />
            <Stop offset="1" stopColor={borderColor} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        <Polygon points={pts} fill={fillColor} />
        <Polygon points={pts} fill="none" stroke={`url(#hg_${s})`} strokeWidth="2.5" />
        <Polygon points={innerPts} fill="none" stroke={borderColor} strokeWidth="0.8" strokeOpacity="0.4" />
      </Svg>
      <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
}

// ─── Animated XP Ring ─────────────────────────────────────────────────────────
function XPRing({ size, progressPct, level, rank, currentLevelXp }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct * circumference);

  return (
    <View style={{ alignItems: 'center', marginBottom: 8 }}>
      <Animated.View style={{
        transform: [{ scale: pulseAnim }],
        width: size + 24,
        height: size + 24,
        borderRadius: (size + 24) / 2,
        backgroundColor: rank.glow,
        position: 'absolute',
        top: -12,
        left: -12,
        opacity: 0.35,
      }} />

      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={COLORS.gold} stopOpacity="1" />
              <Stop offset="0.5" stopColor="#FF8C00" stopOpacity="1" />
              <Stop offset="1" stopColor="#FBBF24" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={COLORS.accentBorder} stopOpacity="0.3" />
              <Stop offset="1" stopColor={COLORS.border} stopOpacity="0.15" />
            </LinearGradient>
          </Defs>
          <Circle cx={center} cy={center} r={radius} stroke="url(#trackGrad)" strokeWidth={strokeWidth} fill="transparent" />
          <Circle
            cx={center} cy={center} r={radius}
            stroke="url(#xpGrad)"
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
        <View style={styles.ringInner}>
          <Text style={styles.rankIcon}>{rank.icon}</Text>
          <Text style={[styles.levelLabel, { color: COLORS.textMuted }]}>LEVEL</Text>
          <Text style={[styles.levelNumber, { color: rank.color }]}>{level}</Text>
          <Text style={[styles.rankTitle, { color: rank.color }]}>{rank.title}</Text>
        </View>
      </View>

      <Text style={styles.xpSubtext}>{currentLevelXp} / 100 XP to next level</Text>
    </View>
  );
}

// ─── Milestoned Progress Bar ──────────────────────────────────────────────────
function MilestonedBar({ pct, color }) {
  const milestones = [0.25, 0.5, 0.75, 1.0];
  return (
    <View style={{ position: 'relative' }}>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.round(pct * 100))}%`, backgroundColor: color }]} />
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' }}>
        {milestones.map((m, i) => {
          const achieved = pct >= m;
          return (
            <View key={i} style={{
              position: 'absolute',
              left: `${m * 100}%`,
              width: 10, height: 10,
              borderRadius: 5,
              backgroundColor: achieved ? color : COLORS.bgSurface,
              borderWidth: 2,
              borderColor: achieved ? color : COLORS.border,
              marginLeft: -5,
            }} />
          );
        })}
      </View>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0,  duration: 150, useNativeDriver: true }),
    ]).start();
  };
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ flex: 1 }}>
      <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.statTopBar, { backgroundColor: color }]} />
        <View style={styles.statCardBody}>
          <Text style={styles.statIcon}>{icon}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Quest Card ───────────────────────────────────────────────────────────────
function QuestCard({ icon, title, sub, pct, color, questLabel }) {
  const isComplete = pct >= 1.0;
  return (
    <View style={[styles.questCard, isComplete && styles.questCardComplete]}>
      {isComplete && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>✓ COMPLETED</Text>
        </View>
      )}
      <View style={styles.questHeader}>
        <View style={[styles.questIconWrap, { backgroundColor: color + '20', borderColor: color + '55' }]}>
          <Text style={styles.questIcon}>{icon}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.questTitle}>{title}</Text>
            {questLabel && (
              <View style={[styles.questTypePill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                <Text style={[styles.questTypeText, { color }]}>{questLabel}</Text>
              </View>
            )}
          </View>
          <Text style={styles.questSub}>{sub}</Text>
        </View>
        <Text style={[styles.questPct, { color: isComplete ? COLORS.teal : color }]}>
          {isComplete ? '🏅' : `${Math.round(pct * 100)}%`}
        </Text>
      </View>
      <View style={{ marginTop: 12 }}>
        <MilestonedBar pct={pct} color={color} />
      </View>
    </View>
  );
}

// ─── Locked Badge ────────────────────────────────────────────────────────────
function LockedBadge() {
  return (
    <View style={styles.lockedBadgeWrap}>
      <HexBadge size={76} borderColor={COLORS.border} glowColor="rgba(100,116,139,0.2)">
        <Text style={{ fontSize: 26, opacity: 0.5 }}>🔒</Text>
      </HexBadge>
      <Text style={styles.lockedLabel}>Locked</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BadgesScreen() {
  const [profile, setProfile]                   = useState(null);
  const [scans, setScans]                       = useState([]);
  const [totalSpots, setTotalSpots]             = useState(12);
  const [loading, setLoading]                   = useState(true);
  const [collectedModels, setCollectedModels]   = useState([]);
  const [activeTab, setActiveTab]               = useState('progress');

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
            getARTargets().catch(() => []),
          ]);
          if (isActive) {
            setProfile(p);
            setScans(s?.scans || []);
            if (spotsData?.length > 0) setTotalSpots(spotsData.length);
            if (collectedModelsStr) {
              let storedModels = JSON.parse(collectedModelsStr);
              const targets = Array.isArray(arTargetsData) ? arTargetsData : (arTargetsData?.results || []);
              storedModels = storedModels.map(m => {
                const t = targets.find(t => t.id === m.id);
                if (t && t.model_3d) m.model_3d = resolveModelUrl(t.model_3d);
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

  const xp             = profile?.xp || 0;
  const level          = Math.floor(xp / 100) + 1;
  const currentLevelXp = xp % 100;
  const progressPct    = currentLevelXp / 100;
  const rank           = getRank(level);

  const scansCount = scans.length;
  const arDone     = scans.filter(s => s.unlock_type === 'ar').length;
  const pctQR      = totalSpots > 0 ? scansCount / totalSpots : 0;
  const pctAR      = arDone / 5;

  const STATS = [
    { icon: '⚡', value: xp.toLocaleString(),               label: 'XP Earned',   color: COLORS.gold    },
    { icon: '🔍', value: scansCount.toString(),              label: 'QR Scanned',  color: COLORS.teal    },
    { icon: '📸', value: arDone.toString(),                  label: 'AR Explored', color: COLORS.accent  },
    { icon: '🏅', value: collectedModels.length.toString(),  label: 'Collected',   color: '#E05A47'      },
  ];

  const QUESTS = [
    { icon: '🔍', title: 'QR Explorer',   questLabel: 'QUEST', sub: `${scansCount} / ${totalSpots} locations scanned`,           pct: pctQR,                         color: COLORS.teal   },
    { icon: '📸', title: 'AR Adventurer', questLabel: 'QUEST', sub: `${arDone} / 5 museum AR experiences`,                       pct: pctAR,                         color: COLORS.accent },
    { icon: '🏆', title: 'Collector',     questLabel: 'QUEST', sub: `${collectedModels.length} / 4 cultural symbols caught`,      pct: collectedModels.length / 4,    color: COLORS.gold   },
  ];

  const MILESTONES = [
    { xpNeeded: 100,  reward: '🗺️ Explorer Badge', color: '#1A56DB' },
    { xpNeeded: 500,  reward: '⚡ Expert Title',    color: '#FBBF24' },
    { xpNeeded: 1000, reward: '💎 Master Crown',    color: '#9B59B6' },
    { xpNeeded: 2000, reward: '👑 Legendary Rank',  color: '#FF6B00' },
  ];
  const nextMilestone = MILESTONES.find(m => xp < m.xpNeeded) || MILESTONES[MILESTONES.length - 1];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 12 }}>Loading your journey...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Journey</Text>
          <Text style={styles.headerSub}>Track your Zamboanga explorations</Text>
        </View>
        <View style={[styles.rankPill, { borderColor: rank.color + '88', backgroundColor: rank.color + '18' }]}>
          <Text style={styles.rankPillIcon}>{rank.icon}</Text>
          <Text style={[styles.rankPillText, { color: rank.color }]}>{rank.title}</Text>
        </View>
      </View>
      <VintaStripe height={5} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── XP Hero ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroBg} />
          <XPRing size={160} progressPct={progressPct} level={level} rank={rank} currentLevelXp={currentLevelXp} />
          <View style={[styles.milestoneRibbon, { borderColor: nextMilestone.color + '55', backgroundColor: nextMilestone.color + '12' }]}>
            <Text style={styles.milestoneRibbonIcon}>🎯</Text>
            <Text style={[styles.milestoneRibbonText, { color: nextMilestone.color }]}>
              {xp >= nextMilestone.xpNeeded
                ? 'All milestones reached!'
                : `${nextMilestone.xpNeeded - xp} XP until ${nextMilestone.reward}`}
            </Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {STATS.map(s => (
              <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} color={s.color} />
            ))}
          </View>
        </View>

        {/* ── Tab Switcher ── */}
        <View style={styles.tabBar}>
          {[
            { key: 'progress',   label: '⚔️  Quests'     },
            { key: 'collection', label: '🧩  Collection' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Quests Tab ── */}
        {activeTab === 'progress' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Quests</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{QUESTS.filter(q => q.pct < 1).length} active</Text>
              </View>
            </View>
            {QUESTS.map(q => (
              <QuestCard key={q.title} {...q} />
            ))}

            {/* XP Milestones */}
            <View style={styles.milestoneSection}>
              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>XP Milestones</Text>
              {MILESTONES.map((m, i) => {
                const achieved = xp >= m.xpNeeded;
                return (
                  <View key={i} style={[styles.milestoneRow, i === MILESTONES.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.milestoneDot, { backgroundColor: achieved ? m.color : COLORS.bgSurface, borderColor: achieved ? m.color : COLORS.border }]}>
                      {achieved && <Text style={{ fontSize: 10 }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <Text style={[styles.milestoneReward, { color: achieved ? m.color : COLORS.textSub }]}>{m.reward}</Text>
                      <Text style={styles.milestoneXp}>{m.xpNeeded.toLocaleString()} XP required</Text>
                    </View>
                    {achieved ? (
                      <View style={[styles.achievedPill, { backgroundColor: m.color + '22', borderColor: m.color + '66' }]}>
                        <Text style={[styles.achievedText, { color: m.color }]}>Earned!</Text>
                      </View>
                    ) : (
                      <Text style={styles.milestoneGap}>-{(m.xpNeeded - xp).toLocaleString()} XP</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Collection Tab ── */}
        {activeTab === 'collection' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Collected Models</Text>
              <View style={[styles.sectionBadge, { backgroundColor: COLORS.goldSoft, borderColor: COLORS.gold + '55' }]}>
                <Text style={[styles.sectionBadgeText, { color: COLORS.gold }]}>{collectedModels.length} Collected</Text>
              </View>
            </View>

            {collectedModels.length > 0 ? (
              <View style={styles.badgesGrid}>
                {collectedModels.map((b, idx) => {
                  const rarityStr = (b.rarity || 'common').toUpperCase();
                  const rarityColor = b.color || (rarityStr === 'LEGENDARY' ? '#F59E0B' : rarityStr === 'MYTHICAL' ? '#A855F7' : rarityStr === 'RARE' ? '#3B82F6' : '#10B981');
                  return (
                  <View key={b.id || b.name || idx} style={styles.badgeItem}>
                    <HexBadge size={84} borderColor={rarityColor} glowColor={rarityColor + '33'}>
                      {b.model_3d ? (
                        <View pointerEvents="none" style={{ width: 58, height: 58, borderRadius: 29, overflow: 'hidden' }}>
                          <WebView
                            source={{ html: build3DViewerHTML(b.model_3d) }}
                            style={{ flex: 1, backgroundColor: 'transparent' }}
                            javaScriptEnabled
                            originWhitelist={['*']}
                            scrollEnabled={false}
                          />
                        </View>
                      ) : (
                        <Text style={styles.badgeEmoji}>{b.emoji || '🏺'}</Text>
                      )}
                    </HexBadge>
                    <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]} />
                    <Text style={styles.badgeLabel} numberOfLines={1}>{b.name}</Text>
                    <Text style={[styles.badgeRarity, { color: rarityColor }]}>✦ {rarityStr}</Text>
                    <Text style={{ fontSize: 9, fontFamily: FONTS.medium, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                      Building {b.building || 'S1'} · Slot #{b.slot_number || 1}/10
                    </Text>
                  </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>🗺️</Text>
                <Text style={styles.emptyStateTitle}>No models yet</Text>
                <Text style={styles.emptyStateSub}>
                  Explore Zamboanga's cultural sites and scan AR markers to collect 3D models!
                </Text>
                <View style={styles.emptyHint}>
                  <Text style={styles.emptyHintText}>💡 Scan AR markers at museums to unlock models</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    height: 72,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 21,
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  rankPillIcon: { fontSize: 14 },
  rankPillText: { fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 0.5 },

  scroll: { paddingBottom: 20 },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  heroBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 200,
    backgroundColor: COLORS.bgCardAlt,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  ringInner: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: 0, bottom: 0, left: 0, right: 0,
  },
  rankIcon: { fontSize: 20, marginBottom: -2 },
  levelLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 3,
  },
  levelNumber: {
    fontFamily: FONTS.black,
    fontSize: 50,
    lineHeight: 56,
  },
  rankTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: -4,
  },
  xpSubtext: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 14,
    letterSpacing: 0.4,
  },
  milestoneRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
    marginTop: 12,
  },
  milestoneRibbonIcon: { fontSize: 14 },
  milestoneRibbonText: { fontFamily: FONTS.semiBold, fontSize: 12, letterSpacing: 0.3 },

  // Stats
  statsSection: { paddingHorizontal: 16, marginBottom: 18, marginTop: 8 },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statTopBar: { height: 4 },
  statCardBody: { paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  statIcon: { fontSize: 18, marginBottom: 3 },
  statValue: { fontFamily: FONTS.black, fontSize: 20, lineHeight: 24 },
  statLabel: { fontFamily: FONTS.medium, fontSize: 9, color: COLORS.textMuted, textAlign: 'center', marginTop: 3, letterSpacing: 0.3 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.md,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.navy,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  tabBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  tabBtnTextActive: { color: '#fff' },

  // Section
  section: { paddingHorizontal: 16, gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  sectionBadge: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sectionBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.accent,
    letterSpacing: 0.3,
  },

  // Quest Card
  questCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  questCardComplete: {
    borderColor: COLORS.teal + '55',
    backgroundColor: COLORS.teal + '08',
  },
  completedBadge: {
    position: 'absolute',
    top: 10, right: 10,
    backgroundColor: COLORS.teal + '22',
    borderWidth: 1,
    borderColor: COLORS.teal + '66',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completedBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.teal,
    letterSpacing: 1,
  },
  questHeader: { flexDirection: 'row', alignItems: 'center' },
  questIconWrap: {
    width: 44, height: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questIcon: { fontSize: 22 },
  questTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  questTypePill: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  questTypeText: { fontFamily: FONTS.bold, fontSize: 8, letterSpacing: 1 },
  questSub: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  questPct: { fontFamily: FONTS.black, fontSize: 16 },

  // Progress bar
  progressBarBg: {
    height: 10,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  progressBarFill: { height: '100%', borderRadius: 5 },

  // Milestone track
  milestoneSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 4,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  milestoneDot: {
    width: 24, height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneReward: { fontFamily: FONTS.semiBold, fontSize: 13 },
  milestoneXp: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  achievedPill: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  achievedText: { fontFamily: FONTS.bold, fontSize: 10 },
  milestoneGap: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textFaint },

  // Badges grid
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 8,
  },
  badgeItem: { alignItems: 'center', width: 90 },
  rarityStrip: { height: 3, width: 50, borderRadius: 2, marginTop: 6, marginBottom: 4 },
  badgeEmoji: { fontSize: 32 },
  badgeLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textSub,
    textAlign: 'center',
  },
  badgeRarity: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  lockedBadgeWrap: { alignItems: 'center', width: 90 },
  lockedLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textFaint,
    marginTop: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateEmoji: { fontSize: 56, marginBottom: 16 },
  emptyStateTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyStateSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyHint: {
    marginTop: 20,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.gold + '55',
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyHintText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.gold,
    textAlign: 'center',
  },
});
