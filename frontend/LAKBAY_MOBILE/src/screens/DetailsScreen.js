import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import CustomButton from '../components/CustomButton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

const CATEGORY_COLORS = {
  Historical: COLORS.accent,
  Beaches:    '#38BDF8',
  Culture:    COLORS.teal,
  Nature:     '#34D399',
  default:    COLORS.gold,
};

const HIGHLIGHTS = [
  { emoji: '⛵', text: 'Local Heritage' },
  { emoji: '🏊', text: 'Swimming'       },
  { emoji: '📸', text: 'Photo Spots'    },
  { emoji: '🍲', text: 'Local Cuisine'  },
];

export default function DetailsScreen({ route, navigation }) {
  const destination = route?.params?.destination || {
    title: 'Fort Pilar', location: 'Zamboanga City, Philippines',
    rating: '4.8', price: 'Free', category: 'Historical',
  };

  const catColor = CATEGORY_COLORS[destination.category] || CATEGORY_COLORS.default;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation && navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero Banner */}
        <View style={styles.banner}>
          {/* Deep bg */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.bgSurface }]} />
          {/* Glow blob top-right */}
          <View style={[styles.heroBlobTop, { backgroundColor: catColor }]} />
          {/* Fade-out bottom overlay */}
          <View style={[styles.heroBlobBottom, { backgroundColor: COLORS.bg }]} />
          {/* Emoji ring + title */}
          <View style={styles.bannerContent}>
            <View style={[styles.emojiGlowRing, { borderColor: catColor + '55', shadowColor: catColor }]}>
              <View style={[styles.emojiInnerRing, { backgroundColor: catColor + '22' }]}>
                <Text style={styles.bannerEmoji}>🌴</Text>
              </View>
            </View>
            <Text style={styles.bannerTitle}>{destination.title}</Text>
            <View style={[styles.categoryPill, { borderColor: catColor, backgroundColor: catColor + '22' }]}>
              <Text style={[styles.categoryPillText, { color: catColor }]}>{destination.category}</Text>
            </View>
          </View>
          {/* Rating badge */}
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {destination.rating}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.metaRow}>
            <Text style={styles.locationText}>📍 {destination.location}</Text>
          </View>
          <Text style={styles.titleText}>{destination.title}</Text>

          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.desc}>
            Experience the breathtaking views, heritage, and pristine natural beauty of {destination.title}.{' '}
            Perfect for travelers seeking a mix of relaxation, scenic trails, cultural interactions,{' '}
            and a warm, inviting local atmosphere in Zamboanga City.
          </Text>

          <Text style={styles.sectionTitle}>Key Highlights</Text>
          <View style={styles.highlightsRow}>
            {HIGHLIGHTS.map(h => (
              <View key={h.text} style={styles.highlightPill}>
                <Text style={styles.highlightEmoji}>{h.emoji}</Text>
                <Text style={styles.highlightText}>{h.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Booking Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.priceLabel}>Entry / Cost</Text>
          <Text style={styles.priceText}>
            {destination.price === 'Free' ? '🆓 Free' : `₱${destination.price}`}
          </Text>
        </View>
        <CustomButton
          title="Book Adventure"
          variant="primary"
          style={styles.bookBtn}
          onPress={() => alert(`Booking initiated for ${destination.title}!`)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

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
  backArrow: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  headerSpacer: { width: 36 },

  scroll: { paddingBottom: 110 },

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
    fontFamily: FONTS.black, fontSize: 24, color: COLORS.text,
    textAlign: 'center', marginBottom: 10,
  },
  categoryPill: {
    borderRadius: RADIUS.pill, borderWidth: 1,
    paddingVertical: 4, paddingHorizontal: 14,
  },
  categoryPillText: { fontFamily: FONTS.semiBold, fontSize: 11, letterSpacing: 0.5 },
  ratingBadge: {
    position: 'absolute', bottom: 16, right: 16,
    backgroundColor: COLORS.bgCard,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border,
  },
  ratingText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },

  content: { padding: 24 },
  metaRow: { marginBottom: 4 },
  locationText: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.gold, marginBottom: 4,
  },
  titleText: {
    fontFamily: FONTS.black, fontSize: 26, color: COLORS.text, marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, marginTop: 20, marginBottom: 10,
  },
  desc: {
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSub, lineHeight: 22,
  },
  highlightsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  highlightPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  highlightEmoji: { fontSize: 14 },
  highlightText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
    backgroundColor: COLORS.bgSurface,
    borderTopWidth: 1, borderTopColor: COLORS.accentBorder,
    paddingHorizontal: 24, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    ...SHADOW.card,
  },
  priceLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  priceText: { fontFamily: FONTS.black, fontSize: 22, color: COLORS.gold },
  bookBtn: { flex: 1, marginLeft: 20, height: 48 },
});
