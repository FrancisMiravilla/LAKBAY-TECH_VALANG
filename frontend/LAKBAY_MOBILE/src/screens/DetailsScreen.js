import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  StatusBar, Alert, Image, ImageBackground,
} from 'react-native';
import { FONTS, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

// ── Feature type config ───────────────────────────────────────────────────────
const FEATURE_CONFIG = {
  qr:    { label: 'QR SCAN',    color: '#10B981', icon: 'qr-code-outline', emoji: '🔍' },
  ar:    { label: 'AR EXHIBIT', color: '#1A56DB', icon: 'camera-outline',  emoji: '📷' },
  catch: { label: 'CATCH',      color: '#FBBF24', icon: 'trophy-outline',  emoji: '🏆' },
};

export default function DetailsScreen({ route, navigation }) {
  const [imgError, setImgError] = useState(false);

  const destination = route?.params?.destination || {
    title: 'Fort Pilar',
    location: 'Zamboanga City, Philippines',
    rating: '4.8', xp_reward: 50, required_level: 1,
    description: 'A 17th-century Spanish military defense fortress and a major religious landmark.',
  };

  const featureTypes = destination.feature_types || [];
  const primaryType  = featureTypes[0] || 'qr';
  const ftCfg        = FEATURE_CONFIG[primaryType] || FEATURE_CONFIG.qr;
  const accent       = ftCfg.color;
  const xpReward     = destination.xp_reward || 50;

  const images  = (destination.images || []).filter(Boolean);
  const heroUri = images[0] || destination.image || null;


  return (
    <ImageBackground
      source={heroUri && !imgError ? { uri: heroUri } : null}
      style={styles.root}
      blurRadius={heroUri && !imgError ? 22 : 0}
      onError={() => setImgError(true)}
    >
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerLabel}>QUEST DETAILS</Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert('Share', `Share ${destination.title} with friends!`)}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Hero Card ────────────────────────────────────── */}
          <View style={styles.heroCard}>
            {heroUri && !imgError ? (
              <Image
                source={{ uri: heroUri }}
                style={styles.heroImg}
                resizeMode="cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <View style={[styles.heroFallback, { backgroundColor: accent + '22' }]}>
                <Text style={styles.heroEmoji}>{ftCfg.emoji}</Text>
              </View>
            )}

            {/* Bottom gradient */}
            <View style={styles.heroGradient} />

            {/* Feature badge — top left */}
            <View style={[styles.featureBadge, { backgroundColor: accent + '22', borderColor: accent + '88' }]}>
              <View style={[styles.featureDot, { backgroundColor: accent }]} />
              <Text style={[styles.featureBadgeText, { color: accent }]}>
                {ftCfg.emoji}  {ftCfg.label}
              </Text>
            </View>

            {/* XP badge — top right */}
            <View style={styles.xpBadge}>
              <Ionicons name="sparkles" size={11} color="#FBBF24" />
              <Text style={styles.xpBadgeText}>+{xpReward} XP</Text>
            </View>

            {/* Title block inside hero */}
            <View style={styles.heroBottom}>
              <Text style={styles.heroTitle}>{destination.title}</Text>
              {destination.location ? (
                <View style={styles.heroLocRow}>
                  <Ionicons name="location-outline" size={12} color={accent} />
                  <Text style={[styles.heroLoc, { color: accent }]} numberOfLines={1}>
                    {destination.location}
                  </Text>
                </View>
              ) : null}
              {featureTypes.length > 0 && (
                <View style={styles.featureTagsRow}>
                  {featureTypes.slice(0, 3).map((ft) => {
                    const c = (FEATURE_CONFIG[ft] || FEATURE_CONFIG.qr).color;
                    const l = (FEATURE_CONFIG[ft] || FEATURE_CONFIG.qr).label;
                    return (
                      <View key={ft} style={[styles.featureTag, { borderColor: c + '66', backgroundColor: c + '18' }]}>
                        <Text style={[styles.featureTagText, { color: c }]}>{l}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* ── Stats Row ──────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#FBBF24" />
              <Text style={styles.statValue}>{destination.rating || '4.8'}</Text>
              <Text style={styles.statLabel}>RATING</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statItem}>
              <Ionicons name="flash" size={16} color={accent} />
              <Text style={[styles.statValue, { color: accent }]}>+{xpReward}</Text>
              <Text style={styles.statLabel}>XP REWARD</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                Lv {destination.required_level || 1}
              </Text>
              <Text style={styles.statLabel}>REQUIRED</Text>
            </View>
          </View>

          <View style={styles.body}>


            {/* ── About This Spot ─────────────────────────────── */}
            <View style={styles.secHeader}>
              <View style={[styles.secAccent, { backgroundColor: accent }]} />
              <Text style={styles.secTitle}>ABOUT THIS SPOT</Text>
            </View>
            <View style={[styles.descCard, { borderColor: accent + '25' }]}>
              <Text style={styles.descText}>{destination.description || 'Discover this amazing spot in Zamboanga City. Complete the quest to learn more!'}</Text>
            </View>

            {/* ── Gallery Strip ──────────────────────────────── */}
            {images.length > 1 && (
              <>
                <View style={styles.secHeader}>
                  <View style={[styles.secAccent, { backgroundColor: accent }]} />
                  <Text style={styles.secTitle}>GALLERY</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
                >
                  {images.map((uri, idx) => (
                    <Image
                      key={idx}
                      source={{ uri }}
                      style={styles.galleryImg}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              </>
            )}

          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}


const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#060D25' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,10,32,0.55)' },

  safe:      { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,179,237,0.15)',
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerLabel: {
    fontFamily: FONTS.bold, fontSize: 10,
    color: 'rgba(191,215,255,0.60)', letterSpacing: 2.5,
  },

  scroll: { paddingBottom: 24 },

  // ── Hero Card ────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(99,179,237,0.22)',
    height: 260, backgroundColor: 'rgba(8,20,56,0.85)',
  },
  heroImg:     { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroFallback:{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  heroEmoji:   { fontSize: 60 },
  heroGradient:{
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
    backgroundColor: 'rgba(4,10,32,0.72)',
  },


  featureBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  featureDot:       { width: 6, height: 6, borderRadius: 3 },
  featureBadgeText: { fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.8 },

  xpBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.60)',
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  xpBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: '#FBBF24', letterSpacing: 0.5 },

  heroBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  heroTitle: {
    fontFamily: FONTS.pixel, fontSize: 11, color: '#FFFFFF',
    lineHeight: 20, marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  heroLocRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  heroLoc:       { fontFamily: FONTS.semiBold, fontSize: 11 },
  featureTagsRow:{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  featureTag: {
    borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  featureTagText: { fontFamily: FONTS.bold, fontSize: 8, letterSpacing: 0.8 },

  // ── Stats Row ────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: 'rgba(8,20,56,0.92)',
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(99,179,237,0.18)',
    paddingVertical: 14,
  },
  statItem:  { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF' },
  statLabel: { fontFamily: FONTS.bold, fontSize: 7, color: '#64748B', letterSpacing: 1.2 },
  statDiv:   { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },

  body: { paddingHorizontal: 16 },

  // ── Section headers ──────────────────────────────────────────────────
  secHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 22, marginBottom: 10,
  },
  secAccent: { width: 3, height: 14, borderRadius: 2 },
  secTitle:  {
    fontFamily: FONTS.bold, fontSize: 9,
    color: 'rgba(191,215,255,0.60)', letterSpacing: 2,
  },


  // ── Description Card ─────────────────────────────────────────────────
  descCard: {
    backgroundColor: 'rgba(8,20,56,0.82)',
    borderRadius: RADIUS.md, borderWidth: 1,
    padding: 16,
  },
  descText: {
    fontFamily: FONTS.medium, fontSize: 13,
    color: '#E2E8F0', lineHeight: 22,
  },



  // ── Gallery ──────────────────────────────────────────────────────────
  galleryImg: {
    width: 160, height: 100, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(8,20,56,0.60)',
  },



});

