import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { COLORS, FONTS, RADIUS, GOLD_TEXT, onWhite } from '../constants/theme';
import Leaderboard from '../components/Leaderboard';
import { useVintaRefresh, VintaRefreshIndicator } from '../components/VintaRefresh';
import LucideIcon from '../components/LucideIcon';
import { useTabBarSpace } from '../navigation/tabBarLayout';
import { authService } from '../api/authService';
import { getMyScans, getSpots, getARTargets, getCatchIcons, getMilestones, ORIGIN } from '../api/qrService';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';

const APP_GLYPH = require('../assets/lakbay_icon_glyph.png');
const SAIL_COLORS = ['#2B3990', '#E8559A', '#F6C431', '#E2412B', '#1F7A3D', '#F39A3D', '#2B3990'];

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

// ─── Default Option 2: Maritime & Vinta Expedition Milestones ──────────────────
export const DEFAULT_MILESTONES = [
  { tier: 1, name: 'Coastal Scout', tagline: 'Testing the tides along R.T. Lim Boulevard.', min_xp: 0, max_xp: 150, icon: 'compass', color: '#1A56DB' },
  { tier: 2, name: 'Vinta Helmsman', tagline: 'Hoisting the multicolored sails of discovery.', min_xp: 151, max_xp: 400, icon: 'navigation', color: '#38BDF8' },
  { tier: 3, name: 'Strait Navigator', tagline: 'Mapping the historical trade routes of Mindanao.', min_xp: 401, max_xp: 800, icon: 'map', color: '#10B981' },
  { tier: 4, name: 'Harbor Sentinel', tagline: 'Guarding the maritime gateway to Paseo del Mar.', min_xp: 801, max_xp: 1400, icon: 'shield', color: '#FBBF24' },
  { tier: 5, name: 'Archipelago Voyager', tagline: 'Braving all landmark currents and hidden stories.', min_xp: 1401, max_xp: 2200, icon: 'anchor', color: '#9B59B6' },
  { tier: 6, name: 'Admiral of the Western Seas', tagline: 'Commands the full maritime legacy of Zamboanga.', min_xp: 2201, max_xp: null, icon: 'crown', color: '#FF6B00' },
];

// Milestone icon names from the CMS → LucideIcon keys.
export const getMilestoneIcon = (iconName) => {
  switch (iconName) {
    case 'navigation': return 'sailboat';
    case 'map': return 'map';
    case 'shield': return 'shield';
    case 'anchor': return 'anchor';
    case 'crown': return 'crown';
    case 'award': return 'medal';
    case 'compass':
    default: return 'compass';
  }
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

// ─── Building blocks (clean white cards, reference: LevelUp dashboard) ───────
function Card({ style, children }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function CardHeader({ icon, iconColor = COLORS.accent, title, right }) {
  return (
    <View style={styles.cardHeader}>
      <LucideIcon name={icon} size={20} color={iconColor} />
      <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  );
}

function CountBubble({ value, color = COLORS.accent }) {
  return (
    <View style={[styles.countBubble, { backgroundColor: color }]}>
      <Text style={styles.countBubbleText}>{value}</Text>
    </View>
  );
}

function Chip({ text, color }) {
  return (
    <View style={[styles.chip, color && { backgroundColor: color + '1A' }]}>
      <Text style={[styles.chipText, color && { color: onWhite(color) }]}>{text}</Text>
    </View>
  );
}

// One row of a list card: status circle · title + meta · chip on the right.
function ListRow({ done, doneIcon = 'check', color, title, badge, meta, metaColor, extra, chip, last }) {
  return (
    <View style={[styles.listRow, !last && styles.listRowDivider]}>
      <View style={[styles.statusCircle, done && { backgroundColor: color, borderColor: color }]}>
        {done ? <LucideIcon name={doneIcon} size={13} color="#FFFFFF" strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle}>{title}</Text>
          {badge}
        </View>
        {extra}
        <Text style={styles.listMeta}>
          <Text style={{ color: metaColor ? onWhite(metaColor) : COLORS.textMuted }}>{meta[0]}</Text>
          {meta[1] ? <Text>{`  •  ${meta[1]}`}</Text> : null}
        </Text>
      </View>
      {chip}
    </View>
  );
}

function LevelProgressBar({ pct, color }) {
  const w = `${Math.max(0, Math.min(100, Math.round(pct * 100)))}%`;
  return (
    <View style={styles.levelTrack}>
      <View style={[styles.levelTrackBg, { backgroundColor: color + '22' }]} />
      <View style={[styles.levelFill, { width: w, backgroundColor: color }]} />
      <View style={[styles.levelThumb, { left: w, borderColor: color }]} />
    </View>
  );
}

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BadgesScreen() {
  const tabBarSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();
  const [profile, setProfile]                   = useState(null);
  const [scans, setScans]                       = useState([]);
  const [totalSpots, setTotalSpots]             = useState(12);
  const [loading, setLoading]                   = useState(true);
  const [collectedModels, setCollectedModels]   = useState([]);
  const [caughtIcons, setCaughtIcons]           = useState([]);
  const [milestones, setMilestones]             = useState(DEFAULT_MILESTONES);
  const [activeTab, setActiveTab]               = useState('progress');

  const aliveRef = useRef(true);
  const fetchData = useCallback(async () => {
    try {
      const [p, s, spotsData, collectedModelsStr, arTargetsData, caughtIconsStr, storedUid, storedCatchUid, milestonesData, catchIconsData] = await Promise.all([
        authService.getProfile().catch(() => null),
        getMyScans().catch(() => ({ scans: [] })),
        getSpots().catch(() => []),
        SecureStore.getItemAsync('collected_models').catch(() => null),
        getARTargets().catch(() => []),
        SecureStore.getItemAsync('caught_icons').catch(() => null),
        SecureStore.getItemAsync('collected_models_uid').catch(() => null),
        SecureStore.getItemAsync('caught_icons_uid').catch(() => null),
        getMilestones().catch(() => DEFAULT_MILESTONES),
        getCatchIcons().catch(() => []),
      ]);
      if (aliveRef.current) {
        setProfile(p);
        setScans(s?.scans || []);
        if (spotsData?.length > 0) setTotalSpots(spotsData.length);
        if (Array.isArray(milestonesData) && milestonesData.length > 0) {
          setMilestones(milestonesData.sort((a, b) => (a.tier || 0) - (b.tier || 0)));
        } else if (milestonesData?.results && Array.isArray(milestonesData.results)) {
          setMilestones(milestonesData.results.sort((a, b) => (a.tier || 0) - (b.tier || 0)));
        }

        const currentUid = String(p?.id || '');

        // ── AR collected models ──
        if (storedUid && currentUid && storedUid !== currentUid) {
          await SecureStore.deleteItemAsync('collected_models');
          await SecureStore.deleteItemAsync('collected_models_uid');
          setCollectedModels([]);
        } else if (collectedModelsStr) {
          try {
            let storedModels = JSON.parse(collectedModelsStr);
            const targets = Array.isArray(arTargetsData) ? arTargetsData : (arTargetsData?.results || []);
            storedModels = storedModels.map(m => {
              const t = targets.find(t => t.id === m.id || t.name === m.name);
              if (t && t.model_3d) m.model_3d = resolveModelUrl(t.model_3d);
              else if (m.model_3d) m.model_3d = resolveModelUrl(m.model_3d);
              return m;
            });
            setCollectedModels(storedModels);
            if (!storedUid && currentUid) {
              SecureStore.setItemAsync('collected_models_uid', currentUid).catch(() => {});
            }
          } catch {
            setCollectedModels([]);
          }
        } else {
          setCollectedModels([]);
        }

        // ── Caught icons (Catch & Win) ──
        if (storedCatchUid && currentUid && storedCatchUid !== currentUid) {
          await SecureStore.deleteItemAsync('caught_icons');
          await SecureStore.deleteItemAsync('caught_icons_uid');
          setCaughtIcons([]);
        } else if (caughtIconsStr) {
          try {
            let parsedCaught = JSON.parse(caughtIconsStr);
            const allCatchIcons = Array.isArray(catchIconsData) ? catchIconsData : (catchIconsData?.results || []);
            const allSpots = Array.isArray(spotsData) ? spotsData : (spotsData?.results || []);

            parsedCaught = parsedCaught.map(c => {
              let model = c.model_3d;
              if (!model) {
                const matchIcon = allCatchIcons.find(i => i.id === c.id || (i.name && c.name && i.name.toLowerCase() === c.name.toLowerCase()));
                if (matchIcon && matchIcon.model_3d) model = matchIcon.model_3d;
                const matchSpot = allSpots.find(s => s.id === c.id || (s.name && c.name && s.name.toLowerCase() === c.name.toLowerCase()));
                if (matchSpot && matchSpot.model_3d) model = matchSpot.model_3d;
              }
              return {
                ...c,
                model_3d: resolveModelUrl(model),
              };
            });
            setCaughtIcons(parsedCaught);
            if (!storedCatchUid && currentUid) {
              SecureStore.setItemAsync('caught_icons_uid', currentUid).catch(() => {});
            }
          } catch {
            setCaughtIcons([]);
          }
        } else {
          setCaughtIcons([]);
        }
      }
    } catch (err) {
      console.error('Error fetching badges data:', err);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      aliveRef.current = true;
      fetchData();
      return () => { aliveRef.current = false; };
    }, [fetchData])
  );
  const [boardKey, setBoardKey] = useState(0);
  const { refreshing, refreshControl } = useVintaRefresh(() => {
    setBoardKey((k) => k + 1);
    return fetchData();
  });

  const xp             = profile?.xp || 0;
  const level          = Math.floor(xp / 100) + 1;
  const currentLevelXp = xp % 100;
  const progressPct    = currentLevelXp / 100;

  const activeMilestones = milestones && milestones.length > 0 ? milestones : DEFAULT_MILESTONES;

  // Determine current milestone tier (where min_xp <= xp <= max_xp)
  const currentMilestone = activeMilestones.find(m => 
    xp >= m.min_xp && (m.max_xp === null || m.max_xp === undefined || xp <= m.max_xp)
  ) || (xp < (activeMilestones[0]?.min_xp || 0) ? activeMilestones[0] : activeMilestones[activeMilestones.length - 1]);

  // Determine next milestone tier (first tier whose min_xp > xp)
  const nextMilestone = activeMilestones.find(m => (m.min_xp > 0 && xp < m.min_xp) || (m.max_xp !== null && xp < m.max_xp && m !== currentMilestone)) || null;

  const milestoneColor = currentMilestone.color || '#1A56DB';
  const milestoneIcon = getMilestoneIcon(currentMilestone.icon);

  const rank = {
    title: currentMilestone.name,
    icon: milestoneIcon,
    color: milestoneColor,
    glow: milestoneColor + '55',
    tier: currentMilestone.tier,
    tagline: currentMilestone.tagline
  };

  const scansCount     = scans.length;
  const arDone         = collectedModels.length;
  const collectedCount = caughtIcons.length;
  const pctQR          = totalSpots > 0 ? scansCount / totalSpots : 0;
  const pctAR          = Math.min(1, arDone / 5);

  const STATS = [
    { icon: 'zap',    value: xp.toLocaleString(),               label: 'XP Earned',   color: COLORS.gold    },
    { icon: 'search', value: scansCount.toString(),              label: 'QR Scanned',  color: COLORS.teal    },
    { icon: 'camera', value: arDone.toString(),                  label: 'AR Explored', color: COLORS.accent  },
    { icon: 'medal',  value: collectedCount.toString(),          label: 'Collected',   color: '#E05A47'      },
  ];

  const QUESTS = [
    { icon: 'search', title: 'QR Explorer',   questLabel: 'QUEST', sub: `${scansCount} / ${totalSpots} locations scanned`,           pct: pctQR,                       color: COLORS.teal   },
    { icon: 'camera', title: 'AR Adventurer', questLabel: 'QUEST', sub: `${arDone} / 5 museum AR experiences`,                       pct: pctAR,                       color: COLORS.accent },
    { icon: 'trophy', title: 'Collector',     questLabel: 'QUEST', sub: `${collectedCount} / 4 cultural symbols caught`,              pct: Math.min(1, collectedCount / 4), color: COLORS.gold   },
  ];

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Syncing your journey...</Text>
      </View>
    );
  }

  const name = profile?.in_game_name || profile?.first_name || 'Explorer';
  const nextColor = nextMilestone ? (nextMilestone.color || '#1A56DB') : COLORS.gold;
  const xpToNext = nextMilestone
    ? (nextMilestone.min_xp > xp ? nextMilestone.min_xp - xp : (nextMilestone.max_xp ? nextMilestone.max_xp - xp : 0))
    : 0;
  const activeQuests = QUESTS.filter((q) => q.pct < 1).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── App bar: navy with a thin vinta strip (same as Home / Promote) ── */}
      <View style={[styles.appBar, { paddingTop: insets.top, height: insets.top + 56 }]}>
        <Image source={APP_GLYPH} style={styles.appGlyph} resizeMode="contain" />
        <Text style={styles.appTitle}>My Journey</Text>
        <View style={styles.sailStripes}>
          {SAIL_COLORS.map((c, i) => <View key={i} style={[styles.sailStripe, { backgroundColor: c }]} />)}
        </View>
      </View>

      <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]}
        refreshControl={refreshControl}
      >

        {/* ── Greeting ── */}
        <View style={styles.greetRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetTitle} numberOfLines={1}>Hello, {name}</Text>
            <Text style={styles.greetSub}>Here&apos;s your expedition so far.</Text>
          </View>
          <View style={styles.xpPill}>
            <View style={styles.xpPillIcon}>
              <LucideIcon name="zap" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.xpPillText}>{compact(xp)}</Text>
          </View>
        </View>

        {/* ── Current level ── */}
        <View style={[styles.levelCard, { borderColor: rank.color + '66', shadowColor: rank.color }]}>
          <View style={styles.levelTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.levelChipRow}>
                <View style={[styles.rankChip, { backgroundColor: onWhite(rank.color) }]}>
                  <Text style={styles.rankChipText}>TIER {rank.tier}</Text>
                </View>
                <Text style={styles.levelSmall}>Lvl. {level}</Text>
              </View>
              <Text style={styles.levelTitle} numberOfLines={2}>{rank.title}</Text>
              {rank.tagline ? <Text style={styles.levelTagline} numberOfLines={2}>{rank.tagline}</Text> : null}
            </View>
            <HexBadge size={76} borderColor={rank.color} glowColor={rank.color + '22'}>
              <LucideIcon name={rank.icon} size={30} color={onWhite(rank.color)} />
            </HexBadge>
          </View>

          <View style={styles.levelLabels}>
            <Text style={styles.levelLabel}>Level Progress</Text>
            <Text style={[styles.levelXp, { color: onWhite(rank.color) }]}>{currentLevelXp} / 100 XP</Text>
          </View>
          <LevelProgressBar pct={progressPct} color={rank.color} />
          <View style={styles.levelLabels}>
            <Text style={styles.levelEnd}>Level {level}</Text>
            <Text style={styles.levelEnd}>Level {level + 1}</Text>
          </View>
        </View>

        {/* ── Next rank ── */}
        <Card>
          <View style={styles.nextTop}>
            <LucideIcon name={nextMilestone ? getMilestoneIcon(nextMilestone.icon) : 'crown'} size={22} color={onWhite(nextColor)} />
            <Text style={styles.nextLabel}>Next Rank</Text>
            <View style={styles.nextValueBox}>
              <Text style={styles.nextValue}>{nextMilestone ? `${xpToNext.toLocaleString()} XP` : 'MAX'}</Text>
            </View>
          </View>
          <View style={styles.nextBody}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextTitle}>
                {nextMilestone ? `Tier ${nextMilestone.tier}: ${nextMilestone.name}` : 'Max Expedition Rank Achieved!'}
              </Text>
              <Text style={styles.nextSub}>
                {nextMilestone ? `${xpToNext.toLocaleString()} XP to go. Keep exploring!` : 'You hold the highest rank in LAKBAY.'}
              </Text>
            </View>
          </View>
          <View style={styles.tierSegments}>
            {activeMilestones.map((m, i) => {
              const earned = xp >= m.min_xp;
              const c = m.color || '#1A56DB';
              return <View key={m.id || i} style={[styles.tierSegment, { backgroundColor: earned ? c : c + '26' }]} />;
            })}
          </View>
        </Card>

        {/* ── Stats ── */}
        <Card style={styles.statsCard}>
          {STATS.map((st, i) => (
            <View key={st.label} style={[styles.statCell, i > 0 && styles.statCellDivider]}>
              <LucideIcon name={st.icon} size={18} color={onWhite(st.color)} />
              <Text style={[styles.statValue, { color: onWhite(st.color) }]}>{st.value}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>{st.label}</Text>
            </View>
          ))}
        </Card>

        {/* ── Tabs and their content share one card ── */}
        <Card style={styles.tabCard}>
        <View style={styles.tabBar}>
          {[
            { key: 'progress',    label: 'Quests',      icon: 'swords' },
            { key: 'collection',  label: 'Collection',  icon: 'puzzle' },
            { key: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <LucideIcon name={tab.icon} size={14} color={activeTab === tab.key ? '#FFFFFF' : COLORS.textMuted} />
              <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Quests tab ── */}
        {activeTab === 'progress' && (
          <>
            <View style={styles.tabSection}>
              <CardHeader icon="circle-check" title="Active Quests" right={<CountBubble value={activeQuests} />} />
              {QUESTS.map((q, i) => {
                const done = q.pct >= 1;
                return (
                  <ListRow
                    key={q.title}
                    done={done}
                    color={COLORS.teal}
                    title={q.title}
                    meta={[q.questLabel, q.sub]}
                    metaColor={q.color}
                    chip={<Chip text={done ? 'Done' : `${Math.round(q.pct * 100)}%`} color={done ? COLORS.teal : null} />}
                    last={i === QUESTS.length - 1}
                  />
                );
              })}
            </View>

            <View style={[styles.tabSection, styles.tabSectionDivided]}>
              <CardHeader
                icon="medal"
                iconColor={onWhite(milestoneColor)}
                title="XP Milestone Tiers"
                right={<Chip text={`Tier ${currentMilestone.tier}`} color={milestoneColor} />}
              />
              {activeMilestones.map((m, i) => {
                const isCurrent = m.id ? m.id === currentMilestone.id : m.tier === currentMilestone.tier;
                const isEarned = xp >= m.min_xp;
                const c = m.color || '#1A56DB';
                const range = `${m.min_xp} – ${m.max_xp !== null && m.max_xp !== undefined ? `${m.max_xp} XP` : '∞ XP'}`;
                return (
                  <ListRow
                    key={m.id || i}
                    done={isEarned}
                    doneIcon={getMilestoneIcon(m.icon)}
                    color={c}
                    title={`Tier ${m.tier}: ${m.name}`}
                    badge={isCurrent ? <Chip text="CURRENT" color={c} /> : null}
                    extra={m.tagline ? <Text style={styles.listTagline}>{`"${m.tagline}"`}</Text> : null}
                    meta={[range]}
                    chip={isEarned ? <Chip text="Earned!" color={c} /> : <Chip text={`-${(m.min_xp - xp).toLocaleString()} XP`} />}
                    last={i === activeMilestones.length - 1}
                  />
                );
              })}
            </View>
          </>
        )}

        {/* ── Leaderboard tab (reloads every time it is opened) ── */}
        {activeTab === 'leaderboard' && (
          <View style={styles.tabSection}>
            <Leaderboard refreshKey={boardKey} />
          </View>
        )}

        {/* ── Collection tab ── */}
        {activeTab === 'collection' && (
          <>
            <View style={styles.tabSection}>
              <CardHeader icon="trophy" iconColor={GOLD_TEXT} title="Catch & Win" right={<Chip text={`${caughtIcons.length} / 4`} color={COLORS.gold} />} />
              {caughtIcons.length > 0 ? (
                <View style={styles.badgesGrid}>
                  {caughtIcons.map((b, idx) => {
                    const iconColor = b.color || '#A855F7';
                    return (
                      <View key={String(b.id) + idx} style={styles.badgeItem}>
                        <HexBadge size={84} borderColor={iconColor} glowColor={iconColor + '33'}>
                          {b.model_3d ? (
                            <View pointerEvents="none" style={styles.modelWrap}>
                              <WebView
                                source={{ html: build3DViewerHTML(b.model_3d) }}
                                style={styles.modelView}
                                javaScriptEnabled
                                originWhitelist={['*']}
                                scrollEnabled={false}
                              />
                            </View>
                          ) : (
                            <LucideIcon name="amphora" size={30} color={onWhite(iconColor)} />
                          )}
                        </HexBadge>
                        <View style={[styles.rarityStrip, { backgroundColor: iconColor }]} />
                        <Text style={styles.badgeLabel} numberOfLines={1}>{b.name}</Text>
                        <View style={styles.badgeRarityRow}>
                          <LucideIcon name="sparkle" size={10} color={onWhite(iconColor)} />
                          <Text style={[styles.badgeRarity, { color: onWhite(iconColor) }]}>CAUGHT</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <LucideIcon name="target" size={40} color={COLORS.textMuted} style={styles.emptyStateIcon} />
                  <Text style={styles.emptyStateTitle}>No icons caught yet</Text>
                  <Text style={styles.emptyStateSub}>
                    Visit the 4 cultural icon spots around Zamboanga City to catch them!
                  </Text>
                  <View style={styles.emptyHint}>
                    <LucideIcon name="lightbulb" size={14} color={GOLD_TEXT} />
                    <Text style={styles.emptyHintText}>Go to Catch &amp; Win to start collecting</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.tabSection, styles.tabSectionDivided]}>
              <CardHeader icon="camera" title="AR Exhibit" right={<Chip text={`${collectedModels.length} Scanned`} color={COLORS.accent} />} />
              {collectedModels.length > 0 ? (
                <View style={styles.badgesGrid}>
                  {collectedModels.map((b, idx) => {
                    const rarityStr = (b.rarity || 'common').toUpperCase();
                    const rarityColor = b.color || (rarityStr === 'LEGENDARY' ? '#F59E0B' : rarityStr === 'MYTHICAL' ? '#A855F7' : rarityStr === 'RARE' ? '#3B82F6' : '#10B981');
                    return (
                      <View key={b.id || b.name || idx} style={styles.badgeItem}>
                        <HexBadge size={84} borderColor={rarityColor} glowColor={rarityColor + '33'}>
                          {b.model_3d ? (
                            <View pointerEvents="none" style={styles.modelWrap}>
                              <WebView
                                source={{ html: build3DViewerHTML(b.model_3d) }}
                                style={styles.modelView}
                                javaScriptEnabled
                                originWhitelist={['*']}
                                scrollEnabled={false}
                              />
                            </View>
                          ) : (
                            <LucideIcon name={b.emoji} fallback="palette" size={30} color={onWhite(rarityColor)} />
                          )}
                        </HexBadge>
                        <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]} />
                        <Text style={styles.badgeLabel} numberOfLines={1}>{b.name}</Text>
                        <View style={styles.badgeRarityRow}>
                          <LucideIcon name="sparkle" size={10} color={onWhite(rarityColor)} />
                          <Text style={[styles.badgeRarity, { color: onWhite(rarityColor) }]}>{rarityStr}</Text>
                        </View>
                        <Text style={styles.badgeSlot}>
                          Building {b.building || 'S2'} · Slot #{b.slot_number || 1}/10
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <LucideIcon name="map" size={40} color={COLORS.textMuted} style={styles.emptyStateIcon} />
                  <Text style={styles.emptyStateTitle}>No AR models yet</Text>
                  <Text style={styles.emptyStateSub}>
                    Scan AR markers at the National Museum exhibits to collect 3D models!
                  </Text>
                  <View style={styles.emptyHint}>
                    <LucideIcon name="lightbulb" size={14} color={GOLD_TEXT} />
                    <Text style={styles.emptyHintText}>Scan AR markers at museums to unlock models</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
        </Card>
      </ScrollView>
      </View>
      <VintaRefreshIndicator visible={refreshing} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const PAGE_BG = '#FFFFFF';
const LINE = '#E6ECF5';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONTS.medium, color: COLORS.textSub, marginTop: 12 },

  // App bar
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.navy,
  },
  appGlyph: { width: 30, height: 30 },
  appTitle: { fontFamily: FONTS.bold, fontSize: 22, color: '#FFFFFF' },
  sailStripes: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, flexDirection: 'row' },
  sailStripe: { flex: 1 },

  scroll: { paddingHorizontal: 20, paddingTop: 18, gap: 18 },

  // Greeting
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.navy, lineHeight: 28 },
  greetSub: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSub, marginTop: 2 },
  xpPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: '#FCD34D', backgroundColor: '#FFFBEB',
    borderRadius: 24, paddingLeft: 6, paddingRight: 14, paddingVertical: 5,
  },
  xpPillIcon: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center',
  },
  xpPillText: { fontFamily: FONTS.semiBold, fontSize: 15, color: GOLD_TEXT },

  // Generic card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, borderWidth: 1, borderColor: LINE,
    padding: 18,
    shadowColor: '#0C2461', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cardTitle: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 17, color: COLORS.navy },
  countBubble: {
    minWidth: 36, height: 36, borderRadius: 18, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  countBubbleText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFFFFF' },
  chip: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.textMuted },

  // List rows
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  listRowDivider: { borderBottomWidth: 1, borderBottomColor: LINE },
  statusCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#94A3B8',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  listTitle: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.navy, lineHeight: 20 },
  listTagline: { fontFamily: FONTS.regular, fontStyle: 'italic', fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  listMeta: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  // Level card
  levelCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1.5, padding: 18,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4,
  },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelChipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  rankChipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#FFFFFF', letterSpacing: 1.2 },
  levelSmall: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSub },
  levelTitle: { fontFamily: FONTS.semiBold, fontSize: 19, color: COLORS.navy, marginTop: 10, lineHeight: 24 },
  levelTagline: { fontFamily: FONTS.regular, fontStyle: 'italic', fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  levelLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  levelLabel: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSub },
  levelXp: { fontFamily: FONTS.semiBold, fontSize: 13 },
  levelEnd: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSub, marginTop: -4 },
  levelTrack: { height: 18, justifyContent: 'center', marginTop: 8 },
  levelTrackBg: { position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4 },
  levelFill: { position: 'absolute', left: 0, height: 8, borderRadius: 4 },
  levelThumb: {
    position: 'absolute', width: 18, height: 18, borderRadius: 9, marginLeft: -9,
    backgroundColor: '#FFFFFF', borderWidth: 3,
  },

  // Next rank card
  nextTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextLabel: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.navy },
  nextValueBox: {
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  nextValue: { fontFamily: FONTS.bold, fontSize: 17, color: GOLD_TEXT, letterSpacing: 0.5 },
  nextBody: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  nextTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.navy },
  nextSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  tierSegments: { flexDirection: 'row', gap: 6, marginTop: 16 },
  tierSegment: { flex: 1, height: 8, borderRadius: 4 },

  // Stats
  statsCard: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 6 },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statCellDivider: { borderLeftWidth: 1, borderLeftColor: LINE },
  statValue: { fontFamily: FONTS.bold, fontSize: 18, lineHeight: 22 },
  statLabel: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textMuted },

  // Tabs (sit at the top of the card that holds their content)
  tabCard: { paddingTop: 12 },
  tabSection: { paddingTop: 16 },
  tabSectionDivided: { marginTop: 16, borderTopWidth: 1, borderTopColor: LINE },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.pill, padding: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: RADIUS.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  tabBtnActive: {
    backgroundColor: COLORS.accent,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
  },
  tabBtnText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textMuted, lineHeight: 16 },
  tabBtnTextActive: { color: '#FFFFFF', fontFamily: FONTS.bold },

  // Collection grid
  badgesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 16, paddingTop: 12,
  },
  badgeItem: { alignItems: 'center', width: 92 },
  modelWrap: { width: 58, height: 58, borderRadius: 29, overflow: 'hidden' },
  modelView: { flex: 1, backgroundColor: 'transparent' },
  rarityStrip: { height: 3, width: 44, borderRadius: 2, marginTop: 6, marginBottom: 4 },
  badgeLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.navy, textAlign: 'center', lineHeight: 15 },
  badgeRarityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  badgeRarity: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1, marginTop: 2, lineHeight: 13 },
  badgeSlot: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 1 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 8 },
  emptyStateIcon: { marginBottom: 10 },
  emptyStateTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.navy, marginBottom: 6, lineHeight: 20 },
  emptyStateSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSub, textAlign: 'center', lineHeight: 18 },
  emptyHint: {
    marginTop: 14, backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)', borderRadius: RADIUS.pill,
    paddingHorizontal: 14, paddingVertical: 7,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  emptyHintText: { fontFamily: FONTS.bold, fontSize: 12, color: GOLD_TEXT, textAlign: 'center', lineHeight: 15 },
});
