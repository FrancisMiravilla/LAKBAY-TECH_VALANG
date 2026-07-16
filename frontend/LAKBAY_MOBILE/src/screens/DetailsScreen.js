import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Alert, Image, Dimensions } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';

const CATEGORY_COLORS = {
  Historical: COLORS.accent,
  Beaches:    '#38BDF8',
  Culture:    COLORS.teal,
  Nature:     '#34D399',
  default:    COLORS.gold,
};

// Per-category rich info
const CATEGORY_INFO = {
  Historical: {
    overview: `A cornerstone of Zamboanga City's 400-year history. This landmark witnessed the Spanish colonial era, Islamic influence, and the resilient spirit of the Zamboangueño people. Walking its grounds is a living lesson in Philippine heritage.`,
    highlights: [
      { icon: 'business-outline',      label: 'Spanish Colonial Era' },
      { icon: 'book-outline',          label: 'Cultural Museum' },
      { icon: 'camera-outline',        label: 'Iconic Photo Spot' },
      { icon: 'heart-outline',         label: 'Religious Shrine' },
    ],
    funFact: '⚔️  Fort Pilar was built in 1635 by the Spanish to defend against Dutch and Moro raids — it has stood for nearly 400 years.',
  },
  Beaches: {
    overview: `One of the Philippines' most extraordinary natural wonders. Santa Cruz Island is renowned for its rare blush-pink coral sand — a color found in only a handful of beaches worldwide. The island sits within a protected marine sanctuary, making it a haven for snorkeling and nature lovers.`,
    highlights: [
      { icon: 'sunny-outline',         label: 'Pink Sand Beach' },
      { icon: 'fish-outline',          label: 'Marine Sanctuary' },
      { icon: 'boat-outline',          label: 'Island Hopping' },
      { icon: 'water-outline',         label: 'Snorkeling' },
    ],
    funFact: '🌸  The pink hue comes from crushed red organ-pipe coral mixed with white sand — a rare geological phenomenon.',
  },
  Culture: {
    overview: `Zamboanga City is a tapestry of three rich cultures — Chavacano, Tausug, and Yakan — each with its own language, traditions, and artforms. From hand-woven textiles to floating villages, every corner tells a story of heritage, resilience, and community pride.`,
    highlights: [
      { icon: 'color-palette-outline', label: 'Traditional Weaving' },
      { icon: 'people-outline',        label: 'Indigenous Peoples' },
      { icon: 'musical-notes-outline', label: 'Folk Music & Dance' },
      { icon: 'restaurant-outline',    label: 'Chavacano Cuisine' },
    ],
    funFact: '🗣️  Chavacano is the only Spanish-based creole language in Asia — spoken natively by Zamboangueños for over 400 years.',
  },
  Nature: {
    overview: `Beyond its city life, Zamboanga is blessed with breathtaking natural scenery — from cascading highland waterfalls to lush parks. These natural spaces offer both adventure and tranquility, deeply intertwined with the local communities that call them home.`,
    highlights: [
      { icon: 'leaf-outline',          label: 'Lush Scenery' },
      { icon: 'trail-sign-outline',    label: 'Scenic Trails' },
      { icon: 'camera-outline',        label: 'Photography' },
      { icon: 'compass-outline',       label: 'Adventure Spots' },
    ],
    funFact: '🌿  Zamboanga City is sometimes called the "City of Flowers" for its abundant bougainvillea blooms that line its streets.',
  },
};

const VISIT_TIPS = [
  { icon: 'time-outline',       label: 'Best Time',   value: 'Oct – Apr (Dry Season)' },
  { icon: 'people-outline',     label: 'For',         value: 'Families, Solo, Groups'  },
  { icon: 'language-outline',   label: 'Language',    value: 'Chavacano · Filipino · English' },
];

export default function DetailsScreen({ route, navigation }) {
  const destination = route?.params?.destination || {
    title: 'Fort Pilar', location: 'Zamboanga City, Philippines',
    rating: '4.8', price: 'Free', category: 'Historical',
  };

  const catColor = CATEGORY_COLORS[destination.category] || CATEGORY_COLORS.default;
  const baseInfo = CATEGORY_INFO[destination.category]   || CATEGORY_INFO.Culture;
  
  const info = {
    ...baseInfo,
    overview: destination.description || baseInfo.overview,
    funFact: destination.fun_fact || destination.funFact || baseInfo.funFact,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation && navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Destination Info</Text>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => Alert.alert('Share', `Share ${destination.title} with friends!`)}
        >
          <Ionicons name="share-social-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero Banner ────────────────────────────────────────────── */}
        <View style={styles.banner}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.bgSurface }]} />
          <View style={[styles.heroBlobTop,    { backgroundColor: catColor }]} />
          <View style={[styles.heroBlobBottom, { backgroundColor: COLORS.bg }]} />

          <View style={styles.bannerContent}>
            {destination.images && destination.images.filter(img => img).length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={SCREEN_W - 40} decelerationRate="fast" style={{ width: SCREEN_W, flexGrow: 0, marginBottom: 20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
                {destination.images.filter(img => img).map((imgUrl, idx) => (
                  <Image key={idx} source={{ uri: imgUrl }} style={{ width: SCREEN_W - 40, height: 220, borderRadius: RADIUS.md, marginRight: idx === destination.images.filter(img => img).length - 1 ? 0 : 16, backgroundColor: COLORS.card }} resizeMode="cover" />
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.emojiGlowRing, { borderColor: catColor + '55', shadowColor: catColor }]}>
                <View style={[styles.emojiInnerRing, { backgroundColor: catColor + '22' }]}>
                  <Text style={styles.bannerEmoji}>🌴</Text>
                </View>
              </View>
            )}
            <Text style={styles.bannerTitle}>{destination.title}</Text>
            <View style={[styles.categoryPill, { borderColor: catColor, backgroundColor: catColor + '22' }]}>
              <Text style={[styles.categoryPillText, { color: catColor }]}>{destination.category}</Text>
            </View>
          </View>

          {/* Rating badge */}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={COLORS.gold} style={{ marginRight: 4 }} />
            <Text style={styles.ratingText}>{destination.rating}</Text>
          </View>
        </View>

        {/* ── Content ───────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Location + Entry Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={13} color={COLORS.gold} />
              <Text style={styles.metaChipText}>{destination.location}</Text>
            </View>
            {destination.price && (
              <View style={styles.metaChip}>
                <Ionicons name="ticket-outline" size={13} color={COLORS.teal} />
                <Text style={[styles.metaChipText, { color: COLORS.teal }]}>
                  {destination.price === 'Free' ? 'Free Entry' : `Entry: ${destination.price}`}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.titleText}>{destination.title}</Text>

          {/* Overview */}
          <Text style={styles.sectionTitle}>About this Place</Text>
          <Text style={styles.desc}>{info.overview}</Text>

          {/* Promote Button */}
          <TouchableOpacity 
            style={styles.promoteBtn}
            onPress={() => navigation.navigate('Promote', { spotName: destination.title })}
          >
            <Ionicons name="megaphone-outline" size={20} color="#FFF" />
            <Text style={styles.promoteBtnText}>Promote this Spot!</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, height: 58,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1, borderBottomColor: COLORS.accentBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  shareBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },

  scroll: { paddingBottom: 40 },

  // ── Hero Banner ──────────────────────────────────────────────────────
  banner: {
    height: 300, position: 'relative',
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  heroBlobTop: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110, opacity: 0.2,
  },
  heroBlobBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, opacity: 0.85,
  },
  bannerContent: { alignItems: 'center', paddingHorizontal: 24 },
  emojiGlowRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  emojiInnerRing: {
    width: 92, height: 92, borderRadius: 46,
    justifyContent: 'center', alignItems: 'center',
  },
  bannerEmoji:   { fontSize: 44 },
  bannerTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  categoryPill: {
    borderRadius: RADIUS.pill, borderWidth: 1,
    paddingVertical: 4, paddingHorizontal: 14,
  },
  categoryPillText: { fontFamily: FONTS.semiBold, fontSize: 11, letterSpacing: 0.5 },
  ratingBadge: {
    position: 'absolute', bottom: 16, right: 16,
    backgroundColor: COLORS.bgCard, flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border,
  },
  ratingText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },

  // ── Content ──────────────────────────────────────────────────────────
  content: { paddingHorizontal: 20, paddingTop: 20 },

  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 5, paddingHorizontal: 12,
  },
  metaChipText: {
    fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.gold,
  },

  titleText: {
    fontFamily: FONTS.pixel,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 20,
    lineHeight: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text,
    marginTop: 24, marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  desc: {
    fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSub, lineHeight: 22,
  },
  promoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.teal, padding: 16, borderRadius: RADIUS.md, marginTop: 24,
    elevation: 3, shadowColor: COLORS.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  promoteBtnText: {
    fontFamily: FONTS.bold, fontSize: 15, color: '#FFF',
  },

  // ── Highlights Grid ──────────────────────────────────────────────────
  highlightsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  highlightCard: {
    width: '47%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  highlightIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  highlightLabel: {
    fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.text, textAlign: 'center',
  },

  // ── Fun Fact ─────────────────────────────────────────────────────────
  funFactCard: {
    marginTop: 20,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    padding: 16,
  },
  funFactLabel: {
    fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },
  funFactText: {
    fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSub, lineHeight: 20,
  },

  // ── Visit Tips ───────────────────────────────────────────────────────
  visitTipsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  visitTipRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  visitTipBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  visitTipLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  visitTipLabel: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textMuted,
  },
  visitTipValue: {
    fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text,
    flexShrink: 1, textAlign: 'right', maxWidth: '55%',
  },

  // ── Cultural Note ────────────────────────────────────────────────────
  culturalNote: {
    marginTop: 20,
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    padding: 14,
  },
  culturalNoteText: {
    fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSub, lineHeight: 19,
  },
});
