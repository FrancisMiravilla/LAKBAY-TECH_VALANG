import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { COLORS, FONTS, RADIUS, BG_OVERLAY, GOLD_TEXT, onWhite } from '../constants/theme';
import VintaCard from '../components/VintaCard';

const { width: SCREEN_W } = Dimensions.get('window');

// ── HTML Escape helpers ──────────────────────────────────────────────────────
const HTML_ESCAPE = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
const escapeAttr = (s) => String(s).replace(/["'<>&]/g, (c) => HTML_ESCAPE[c]);

// ── 3-D Viewer HTML ──────────────────────────────────────────────────────────
function build3DViewerHTML(modelUrl) {
  if (!modelUrl) return null;
  const safe = escapeAttr(modelUrl);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:100%; height:100%; background:transparent; overflow:hidden; }
    model-viewer { width:100%; height:100%; --progress-bar-color:transparent; }
  </style>
</head>
<body>
  <model-viewer
    src="${safe}"
    auto-rotate
    camera-controls
    bounds="tight"
    exposure="1.2"
    shadow-intensity="1"
    style="width:100%;height:100%;background:transparent;"
  ></model-viewer>
</body>
</html>`;
}

// ── Rarity config (matches backend RARITY_CHOICES & RARITY_THEME in ViroARScanner) ───
const RARITY_CONFIG = {
  common: {
    label: 'COMMON',
    color: '#10B981',
    glow: 'rgba(16,185,129,0.30)',
    stars: 1,
    icon: 'sparkles',
  },
  rare: {
    label: 'RARE',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.32)',
    stars: 3,
    icon: 'star',
  },
  mythical: {
    label: 'MYTHICAL',
    color: '#A855F7',
    glow: 'rgba(168,85,247,0.35)',
    stars: 4,
    icon: 'diamond',
  },
  legendary: {
    label: 'LEGENDARY',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.38)',
    stars: 5,
    icon: 'trophy',
  },
};

// ── Tab definitions (used by Catch feature only) ──────────────────────────
const TABS = [
  { key: 'about',   icon: 'book',   label: 'Lore'     },
  { key: 'history', icon: 'time',   label: 'History'  },
  { key: 'culture', icon: 'globe',  label: 'Culture'  },
  { key: 'funfact', icon: 'bulb',   label: 'Fun Fact' },
];

// ── No-model placeholder ─────────────────────────────────────────────────────
function NoModel({ color = '#A855F7' }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={styles.noModelBox}>
      <Animated.View style={[styles.noModelOrb, { opacity: pulse }]} />
      <Ionicons name="cube-outline" size={52} color={color} style={{ opacity: 0.7 }} />
      <Text style={styles.noModelText}>3D model not available yet</Text>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function CatchDetailsScreen({ route, navigation }) {
  const { icon, spot, isAR = false } = route.params || {};

  // ── Derive rarity dynamically from the icon/AR target's rarity field ──────
  const rarityKey = ((icon?.rarity || spot?.rarity || 'common')).toLowerCase();
  const RARITY = RARITY_CONFIG[rarityKey] || RARITY_CONFIG.common;

  const activeModel = spot?.model_3d || icon?.model_3d;
  const viewerHTML  = useMemo(() => activeModel ? build3DViewerHTML(activeModel) : null, [activeModel]);

  // Animations
  const headerSlide   = useRef(new Animated.Value(-40)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const xpSlide       = useRef(new Animated.Value(30)).current;
  const xpOpacity     = useRef(new Animated.Value(0)).current;
  const glowAnim      = useRef(new Animated.Value(0)).current;
  const shimmer       = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState('about');
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerSlide,   { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(xpSlide,   { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 250);

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const switchTab = (key) => {
    setActiveTab(key);
    Animated.sequence([
      Animated.timing(tabAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(tabAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const shimmerX    = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_W, SCREEN_W] });
  const tabScale    = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });

  const tabContent = (() => {
    if (spot) {
      switch (activeTab) {
        case 'about':   return spot?.description           || 'No lore available for this mythical model.';
        case 'history': return spot?.historical_background || 'Historical records are still being uncovered...';
        case 'culture': return spot?.cultural_significance || 'Cultural meaning not yet documented.';
        case 'funfact': return spot?.fun_fact              || 'More secrets will be revealed as you explore further.';
      }
    }
    switch (activeTab) {
      case 'about':   return icon?.about        || icon?.description || 'No information available.';
      case 'history': return icon?.history      || icon?.historical_background || 'Historical records are still being uncovered...';
      case 'culture': return icon?.significance || icon?.cultural_significance || 'Cultural meaning not yet documented.';
      case 'funfact': return icon?.fun_fact     || 'More secrets will be revealed as you explore further.';
      default:        return 'No information available.';
    }
  })();

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />

      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── HERO SECTION ── */}
          <View style={styles.hero}>
            <SafeAreaView edges={['top']} style={styles.heroTopSafe}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={22} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.heroBadgeRow}>
                <View style={[styles.rarityBadge, { backgroundColor: RARITY.glow, borderColor: RARITY.color }]}>
                <Ionicons name={RARITY.icon || 'diamond'} size={11} color={RARITY.color} />
                <Text style={[styles.rarityLabel, { color: RARITY.color }]}>{RARITY.label}</Text>
              </View>
              </View>
            </View>
          </SafeAreaView>

          {/* 3-D Model Card */}
          <Animated.View
            style={[styles.modelCardOuter, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}
          >
            <Animated.View
              style={[styles.modelGlowRing, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
            />
            <VintaCard style={styles.modelFrame} contentStyle={styles.modelCard}>
              {viewerHTML ? (
                <WebView
                  source={{ html: viewerHTML }}
                  style={styles.webview}
                  javaScriptEnabled
                  originWhitelist={['https://*']}
                  allowsFullscreenVideo
                  scrollEnabled={false}
                />
              ) : (
                <NoModel color={RARITY.color} />
              )}
              <Animated.View
                pointerEvents="none"
                style={[styles.shimmerBar, { transform: [{ translateX: shimmerX }] }]}
              />
            </VintaCard>

            <View style={styles.starsRow}>
              {Array.from({ length: RARITY.stars }).map((_, i) => (
                <Ionicons key={i} name="star" size={14} color={RARITY.color} style={{ marginHorizontal: 2 }} />
              ))}
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: headerOpacity, alignItems: 'center', paddingHorizontal: 24 }}>
            <Text style={styles.modelName}>{spot?.hook || icon?.name || spot?.name || 'Cultural Model'}</Text>
            <Text style={styles.modelTagline}>{spot?.hook ? (spot?.name || '') : (icon?.tagline || spot?.location_name || '')}</Text>
          </Animated.View>

          {/* XP reward banner */}
          <Animated.View
            style={[styles.xpBannerWrap, { opacity: xpOpacity, transform: [{ translateY: xpSlide }] }]}
          >
            <VintaCard contentStyle={styles.xpBanner}>
            <View style={styles.xpLeft}>
              <Ionicons name="flash" size={16} color={GOLD_TEXT} />
              <Text style={styles.xpText}>+150 XP Earned</Text>
            </View>
            <View style={styles.xpDivider} />
            <View style={styles.xpRight}>
              <Ionicons name="trophy" size={14} color="#059669" />
              <Text style={styles.xpCollectedText}>Model Collected!</Text>
            </View>
            </VintaCard>
          </Animated.View>
        </View>

        {/* ── CONTENT SECTION — AR: description only; Catch: lore tabs ── */}
        {isAR ? (
          /* ── AR: Single Description Card ── */
          <View style={styles.tabsSection}>
            <VintaCard contentStyle={styles.arDescCard}>
              <View style={styles.arDescLabelRow}>
                <Ionicons name="document-text" size={15} color={onWhite(RARITY.color)} />
                <Text style={[styles.loreLabel, { color: onWhite(RARITY.color) }]}>DESCRIPTION</Text>
              </View>
              <Text style={styles.loreBody}>
                {icon?.about || icon?.description || 'No description available for this artwork.'}
              </Text>
            </VintaCard>
          </View>
        ) : (
          /* ── Catch: 4-tab lore system ── */
          <View style={styles.tabsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, isActive && styles.tabActive]}
                    onPress={() => switchTab(tab.key)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={14}
                      color={isActive ? '#FFF' : 'rgba(255,255,255,0.7)'}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                    {isActive && <View style={styles.tabUnderline} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Animated.View style={[styles.loreWrap, { transform: [{ scale: tabScale }] }]}>
              <VintaCard contentStyle={styles.loreCard}>
              <View style={styles.loreLabelRow}>
                <Ionicons
                  name={TABS.find(t => t.key === activeTab)?.icon}
                  size={15}
                  color={onWhite(RARITY.color)}
                />
                <Text style={[styles.loreLabel, { color: onWhite(RARITY.color) }]}>
                  {TABS.find(t => t.key === activeTab)?.label?.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.loreBody}>{tabContent}</Text>
              </VintaCard>
            </Animated.View>
          </View>
        )}

        {/* ── STATS ROW ── */}
        {isAR ? (
          /* AR: dynamic rarity + building/slot */
          <View style={styles.statsRow}>
            <VintaCard style={styles.statFrame} contentStyle={styles.statCard}>
              <Ionicons name={RARITY.icon || 'ribbon'} size={18} color={onWhite(RARITY.color)} />
              <Text style={[styles.statValue, { color: onWhite(RARITY.color) }]}>{RARITY.label}</Text>
              <Text style={styles.statLabel}>Rarity</Text>
            </VintaCard>
            <VintaCard style={styles.statFrame} contentStyle={styles.statCard}>
              <Ionicons name="business" size={18} color={COLORS.accent} />
              <Text style={styles.statValue}>
                {icon?.building || 'S1'} · #{icon?.slot_number || 1}
              </Text>
              <Text style={styles.statLabel}>Building · Slot</Text>
            </VintaCard>
          </View>
        ) : (
          /* Catch: original static stats */
          <View style={styles.statsRow}>
            <VintaCard style={styles.statFrame} contentStyle={styles.statCard}>
              <Ionicons name="ribbon" size={18} color={GOLD_TEXT} />
              <Text style={styles.statValue}>{RARITY.label}</Text>
              <Text style={styles.statLabel}>Rarity</Text>
            </VintaCard>
            <VintaCard style={styles.statFrame} contentStyle={styles.statCard}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={styles.statValue}>Collected</Text>
              <Text style={styles.statLabel}>Status</Text>
            </VintaCard>
          </View>
        )}

        {/* ── FOOTER CTA ── */}
        {isAR ? (
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="sparkles" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.ctaBtnText}>Hop onto Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.85}
            onPress={() => {
              navigation.navigate('QuizScreen', {
                icon: icon ? { ...icon, color: RARITY.color } : null,
                spotId: spot?.id ?? null,
                spotName: spot?.name || icon?.name || 'Cultural Icon',
                feature: 'catch',
              });
            }}
          >
            <Ionicons name="help-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.ctaBtnText}>Take the Quiz</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  </ImageBackground>
);
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_OVERLAY,
  },
  root: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: 40 },

  // ── Hero ──
  hero: {
    backgroundColor: 'rgba(8, 20, 60, 0.55)',
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
  },
  heroTopSafe: { paddingHorizontal: 16 },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeRow: { flexDirection: 'row', gap: 8 },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  rarityLabel: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1.2 },

  // ── 3-D card ──
  modelCardOuter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modelGlowRing: {
    position: 'absolute',
    width: SCREEN_W - 40,
    height: 260,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(251,191,36,0.14)',
  },
  modelFrame: {
    width: SCREEN_W - 40,
    height: 240,
  },
  modelCard: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },

  // ── Name ──
  modelName: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 4,
    textShadowColor: 'rgba(168,85,247,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  modelTagline: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 2,
  },

  // ── XP Banner ──
  xpBannerWrap: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  xpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 16,
  },
  xpLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpText: { fontFamily: FONTS.bold, fontSize: 14, color: GOLD_TEXT },
  xpDivider: { width: 1, height: 20, backgroundColor: COLORS.borderLight },
  xpRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpCollectedText: { fontFamily: FONTS.bold, fontSize: 13, color: '#059669' },

  // ── Tabs ──
  tabsSection: { marginTop: 24, paddingHorizontal: 20 },
  tabsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(8, 20, 60, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.18)',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tabLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  tabLabelActive: { color: '#FFF' },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },

  // ── Lore card ──
  loreWrap: {
    marginTop: 14,
  },
  loreCard: {
    padding: 22,
  },
  loreLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  loreLabel: { fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 1.8 },

  // ── AR Description Card (replaces tabs when isAR=true) ──
  arDescCard: {
    padding: 22,
  },
  arDescLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  loreBody: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSub,
    lineHeight: 24,
  },

  // ── Stats row ──
  statsRow: { flexDirection: 'row', marginTop: 20, marginHorizontal: 20, gap: 10 },
  statCard: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  statFrame: {
    flex: 1,
    borderRadius: RADIUS.md,
  },
  statValue: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.navy },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5 },

  // ── CTA ──
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 24,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFF', letterSpacing: 0.5 },

  // ── No model ──
  noModelBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    position: 'relative',
  },
  noModelOrb: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(251,191,36,0.15)',
  },
  noModelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
});
