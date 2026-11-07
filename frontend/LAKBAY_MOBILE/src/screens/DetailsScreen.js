import React, { useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Image, ImageBackground, Dimensions,
} from 'react-native';
import { COLORS, FONTS, BG_OVERLAY, GOLD_TEXT, SHADOW } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import LucideIcon from '../components/LucideIcon';
import { Ionicons } from '@expo/vector-icons';

// Destination detail (reference/home.png, right): photo hero with floating side
// actions, info chips, an Explore thumbnail, About with Read More, Start Quest.

const { width: W } = Dimensions.get('window');
const HERO_W = W - 24;
const HERO_H = Math.round(HERO_W * 1.05);
const SLIDE_W = HERO_W - 6; // inside the 3 px white border
const FALLBACK = require('../assets/zamboanga.jpg');

const FEATURE_CONFIG = {
  qr:    { label: 'QR Scan',    color: COLORS.teal,   lucide: 'search', route: 'QR' },
  ar:    { label: 'AR Exhibit', color: COLORS.accent, lucide: 'camera', route: 'MindAR' },
  catch: { label: 'Catch',      color: COLORS.gold,   lucide: 'trophy', route: 'Catch' },
};

function InfoChip({ icon, label, color = COLORS.textSub }) {
  return (
    <View style={styles.chip}>
      <LucideIcon name={icon} size={14} color={color} />
      <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function DetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const heroRef = useRef(null);
  const [aboutY, setAboutY] = useState(0);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const userLevel = route?.params?.userLevel ?? null;

  const destination = route?.params?.destination || {
    title: 'Fort Pilar',
    location: 'Zamboanga City, Philippines',
    xp_reward: 50, required_level: 1,
    description: 'A 17th-century Spanish military defense fortress and a major religious landmark.',
  };

  const featureTypes = destination.feature_types || [];
  const primaryType  = featureTypes[0] || 'qr';
  const ftCfg        = FEATURE_CONFIG[primaryType] || FEATURE_CONFIG.qr;
  const xpReward     = destination.xp_reward || 50;
  const level        = destination.required_level || 1;
  const isLocked     = userLevel != null && level > userLevel;

  const images = (destination.images || []).filter(Boolean);
  if (images.length === 0 && destination.image) images.push(destination.image);
  const slides = images.length > 0 ? images : [null];

  const goToSlide = (i) => {
    const next = (i + slides.length) % slides.length;
    heroRef.current?.scrollTo({ x: next * SLIDE_W, animated: true });
    setPage(next);
  };

  const openDirections = () => {
    if (destination.id) navigation.navigate('Map', { focusSpotId: destination.id });
    else navigation.navigate('Map');
  };

  const startQuest = () => {
    if (destination.sponsored) {
      openDirections();
      return;
    }
    navigation.navigate(ftCfg.route);
  };

  const extraSections = [
    { title: 'Historical Background', text: destination.historical_background },
    { title: 'Cultural Significance', text: destination.cultural_significance },
    { title: 'Fun Fact', text: destination.fun_fact },
  ].filter((s) => s.text);
  const hasMore = extraSections.length > 0 || (destination.description || '').length > 180;

  return (
    <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.root} resizeMode="cover">
      <View style={styles.bgOverlay} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* ── Hero carousel ── */}
          <View style={styles.heroWrap}>
            <ScrollView
              ref={heroRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / SLIDE_W))}
              style={styles.hero}
            >
              {slides.map((uri, i) => (
                <Image key={i} source={uri ? { uri } : FALLBACK} style={styles.heroImg} resizeMode="cover" />
              ))}
            </ScrollView>
            <View style={styles.heroDim} pointerEvents="none" />

            <View style={styles.heroTop} pointerEvents="box-none">
              <TouchableOpacity style={styles.glassBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
                <Ionicons name="chevron-back" size={20} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.xpChip}>
                <LucideIcon name="star" size={14} color={COLORS.gold} />
                <Text style={styles.xpChipText}>+{xpReward} XP</Text>
              </View>
            </View>

            <View style={styles.heroBottom} pointerEvents="none">
              <View style={styles.locRow}>
                <LucideIcon name="pin" size={14} color="#FFFFFF" />
                <Text style={styles.locText} numberOfLines={1}>{destination.location || 'Zamboanga City'}</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>{destination.title}</Text>
              {slides.length > 1 && (
                <View style={styles.dots}>
                  {slides.map((_, i) => (
                    <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>

            {/* Floating side actions */}
            <View style={styles.sideRail}>
              <TouchableOpacity
                style={[styles.sideBtn, styles.sideBtnActive]}
                onPress={() => scrollRef.current?.scrollTo({ y: aboutY, animated: true })}
                accessibilityLabel="About this place"
              >
                <Ionicons name="information" size={20} color={COLORS.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sideBtn} onPress={openDirections} accessibilityLabel="Directions">
                <Ionicons name="navigate-outline" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sideBtn}
                onPress={() => goToSlide(page + 1)}
                disabled={slides.length < 2}
                accessibilityLabel="Next photo"
              >
                <Ionicons name="images-outline" size={18} color={slides.length < 2 ? 'rgba(255,255,255,0.4)' : '#FFF'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Info chips + Explore thumbnail ── */}
          <VintaCard style={styles.sheetFrame} contentStyle={styles.sheet}>
            <View style={styles.infoRow}>
              <View style={styles.chipGrid}>
                {(featureTypes.length ? featureTypes : [primaryType]).map((ft) => {
                  const c = FEATURE_CONFIG[ft] || FEATURE_CONFIG.qr;
                  return <InfoChip key={ft} icon={c.lucide} label={c.label} color={c.color} />;
                })}
                <InfoChip icon="zap" label={`+${xpReward} XP`} color={GOLD_TEXT} />
                <InfoChip icon={isLocked ? 'lock' : 'shield'} label={`Level ${level}`} color={isLocked ? '#EF4444' : COLORS.teal} />
                {destination.is_featured && <InfoChip icon="star" label="Featured" color={GOLD_TEXT} />}
                {destination.sponsored && <InfoChip icon="megaphone" label="Sponsored" color={GOLD_TEXT} />}
              </View>

              {slides.length > 1 && (
                <TouchableOpacity style={styles.thumb} activeOpacity={0.85} onPress={() => goToSlide(page + 1)}>
                  <Image source={{ uri: slides[(page + 1) % slides.length] }} style={styles.thumbImg} resizeMode="cover" />
                  <View style={styles.thumbPill}>
                    <Text style={styles.thumbPillText}>Explore</Text>
                  </View>
                  <View style={styles.thumbCount}>
                    <Ionicons name="images" size={12} color="#FFF" />
                    <Text style={styles.thumbCountText}>{slides.length}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* ── About ── */}
            <View onLayout={(e) => setAboutY(e.nativeEvent.layout.y + HERO_H)}>
              <Text style={styles.aboutTitle}>About Destination</Text>
              <Text style={styles.aboutText} numberOfLines={expanded ? undefined : 4}>
                {destination.description || 'Discover this amazing spot in Zamboanga City. Complete the quest to learn more!'}
              </Text>
              {expanded && extraSections.map((sec) => (
                <View key={sec.title} style={{ marginTop: 12 }}>
                  <Text style={styles.extraTitle}>{sec.title}</Text>
                  <Text style={styles.aboutText}>{sec.text}</Text>
                </View>
              ))}
              {hasMore && (
                <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={8}>
                  <Text style={styles.readMore}>{expanded ? 'Show Less' : 'Read More'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </VintaCard>
        </ScrollView>

        {/* ── Bottom actions ── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, isLocked && styles.primaryBtnMuted]}
            onPress={startQuest}
            disabled={isLocked}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>
              {isLocked ? `Unlocks at Level ${level}` : destination.sponsored ? 'Visit This Place' : 'Start Quest'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundBtn} onPress={openDirections} activeOpacity={0.88} accessibilityLabel="Get directions">
            <Ionicons name="map-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const GLASS = 'rgba(12,36,97,0.45)';

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#060D25' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BG_OVERLAY },
  safe:      { flex: 1 },
  scroll:    { paddingBottom: 24 },

  // Hero
  heroWrap: {
    marginHorizontal: 12, marginTop: 6, height: HERO_H,
    borderRadius: 32, overflow: 'hidden',
    borderWidth: 3, borderColor: '#FFFFFF',
    backgroundColor: COLORS.navy,
  },
  hero: { width: SLIDE_W, height: HERO_H },
  heroImg: { width: SLIDE_W, height: HERO_H },
  heroDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,18,49,0.25)' },
  heroTop: {
    position: 'absolute', top: 14, left: 14, right: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  glassBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GLASS, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  xpChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GLASS, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9,
  },
  xpChipText: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF' },
  heroBottom: { position: 'absolute', left: 18, right: 70, bottom: 18 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  locText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#FFFFFF' },
  heroTitle: {
    fontFamily: FONTS.bold, fontSize: 32, lineHeight: 36, color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8,
  },
  dots: { flexDirection: 'row', gap: 5, marginTop: 10 },
  dot: { width: 14, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 26, backgroundColor: '#FFFFFF' },

  sideRail: {
    position: 'absolute', right: 10, bottom: 18, gap: 10,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 30, padding: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  sideBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center',
  },
  sideBtnActive: { backgroundColor: '#FFFFFF' },

  // Sheet
  sheetFrame: { marginHorizontal: 12, marginTop: 14 },
  sheet: { padding: 16 },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  chipGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7,
  },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textSub },
  thumb: { width: 104, height: 118, borderRadius: 18, overflow: 'hidden', backgroundColor: COLORS.bg },
  thumbImg: { width: '100%', height: '100%' },
  thumbPill: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  thumbPillText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.accent },
  thumbCount: {
    position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(6,18,49,0.6)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
  },
  thumbCountText: { fontFamily: FONTS.bold, fontSize: 11, color: '#FFFFFF' },

  aboutTitle: { fontFamily: FONTS.bold, fontSize: 19, color: COLORS.navy, marginBottom: 6 },
  extraTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.navy, marginBottom: 3 },
  aboutText: { fontFamily: FONTS.medium, fontSize: 14, lineHeight: 21, color: COLORS.textMuted },
  readMore: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.accent, marginTop: 6 },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 10 },
  primaryBtn: {
    flex: 1, height: 58, borderRadius: 29,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 4, borderBottomColor: COLORS.accentDark,
    ...SHADOW.accent,
  },
  primaryBtnMuted: { opacity: 0.5 },
  primaryBtnText: { fontFamily: FONTS.bold, fontSize: 17, color: '#FFFFFF' },
  roundBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 4, borderBottomColor: COLORS.accentDark,
    ...SHADOW.accent,
  },
});
