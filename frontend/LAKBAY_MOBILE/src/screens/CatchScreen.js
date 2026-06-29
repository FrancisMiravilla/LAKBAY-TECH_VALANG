import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const ICONS = [
  {
    id: 'curacha',
    name: 'Curacha',
    emoji: '🦀',
    tagline: 'The Spanner Crab of Zamboanga',
    type: 'Marine Creature',
    color: '#E91E8C',
    glow: 'rgba(233,30,140,0.35)',
    about:
      'The Curacha (Ranina ranina), also known as the spanner crab, is a large sea crab unique to the warm coastal waters surrounding Zamboanga City. Distinguished by its bright orange shell and flat, paddle-like claws, it is prized across the Philippines for its exceptionally rich, buttery meat. It is most famously served drenched in Alavar sauce — a secret blend of coconut milk, spices, and aromatic herbs perfected over generations at the legendary Alavar Restaurant, founded in 1948.',
    significance:
      'The Curacha is more than a seafood delicacy — it is a proud symbol of Zamboangueño identity and coastal culinary heritage. Served at family fiestas, local celebrations, and tourist dining tables alike, it brings people together to experience the true flavor of the City of Flowers.',
    facts: [
      { label: 'Type', value: 'Marine Crustacean' },
      { label: 'Scientific Name', value: 'Ranina ranina' },
      { label: 'Season', value: 'Year-round' },
      { label: 'Best Served', value: 'With Alavar Sauce' },
    ],
  },
  {
    id: 'vinta',
    name: 'Vinta',
    emoji: '⛵',
    tagline: 'The Sailboat of the Seas',
    type: 'Traditional Watercraft',
    color: '#38BDF8',
    glow: 'rgba(56,189,248,0.35)',
    about:
      'The Vinta is a colorful traditional outrigger boat used by the Tausug, Sama, and Badjao peoples of the Zamboanga Peninsula and Sulu Archipelago. Known for its vibrant, geometric sails called "layag," the Vinta is both a functional fishing vessel and a celebrated symbol of maritime freedom and artistry.',
    significance:
      'The Vinta represents the seafaring heritage and artistic expression of the indigenous Muslim coastal communities. Its iconic multicolored sails are featured throughout Zamboanga City\'s festivals, logos, and cultural events — a living emblem of the city\'s identity on the water.',
    facts: [
      { label: 'Type', value: 'Traditional Watercraft' },
      { label: 'People', value: 'Tausug / Sama / Badjao' },
      { label: 'Sail Name', value: 'Layag' },
      { label: 'Festival', value: 'Vinta Festival' },
    ],
  },
  {
    id: 'lantaka',
    name: 'Lantaka',
    emoji: '⚔️',
    tagline: 'The Cannon of the Moro Warriors',
    type: 'Historical Weapon',
    color: '#FBBF24',
    glow: 'rgba(251,191,36,0.35)',
    about:
      'The Lantaka is a traditional bronze or brass swivel cannon historically used by the Moro warriors of Mindanao and Sulu. Ranging from small portable versions to large ship-mounted artillery, Lantakas were crafted by skilled metalworkers and served as symbols of power, sovereignty, and military prestige.',
    significance:
      'The Lantaka represents the military heritage and sovereignty of the Moro peoples. Prominently displayed at Fort Pilar, the 17th-century Spanish fortress of Zamboanga City, the Lantaka stands as a testament to the city\'s complex history of resistance, conflict, and cultural pride.',
    facts: [
      { label: 'Type', value: 'Traditional Cannon' },
      { label: 'Material', value: 'Bronze or Brass' },
      { label: 'Origin', value: 'Moro / Mindanao' },
      { label: 'Found At', value: 'Fort Pilar Museum' },
    ],
  },
  {
    id: 'yakan',
    name: 'Yakan Weave',
    emoji: '🎨',
    tagline: 'The Art Woven by the Yakan People',
    type: 'Indigenous Textile',
    color: '#10B981',
    glow: 'rgba(16,185,129,0.35)',
    about:
      'The Yakan Weave is a traditional textile created by the Yakan indigenous people of Basilan and Zamboanga Peninsula. Using a backstrap loom, weavers create bold geometric patterns in vibrant colors — each piece taking days or weeks to complete. No two patterns are exactly the same.',
    significance:
      'The Yakan Weave is a living art form that preserves Yakan identity, beliefs, and social structure. Each pattern is passed down through generations by female weavers, representing family lineage and spiritual protection. The Yakan Weaving Village in Zamboanga City keeps this tradition alive for visitors.',
    facts: [
      { label: 'Type', value: 'Traditional Textile' },
      { label: 'People', value: 'Yakan Indigenous' },
      { label: 'Technique', value: 'Backstrap Loom' },
      { label: 'Colors', value: 'Red, Yellow, Green, Black' },
    ],
  },
];

export default function CatchScreen({ navigation }) {
  const [caught] = useState(['curacha']);

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressLabel}>Collection Progress</Text>
            <Text style={styles.progressValue}>
              <Text style={styles.progressCaught}>{caught.length}</Text>
              {' '}/ {ICONS.length}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.round((caught.length / ICONS.length) * 100)}%` }]} />
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
        <View style={styles.grid}>
          {ICONS.map(icon => {
            const isCaught = caught.includes(icon.id);
            return (
              <TouchableOpacity
                key={icon.id}
                style={[styles.iconCard, { borderColor: icon.color + '55' }]}
                activeOpacity={0.82}
                onPress={() => navigation.navigate('CatchDetails', { icon })}
              >
                {/* Glow blob */}
                <View style={[styles.cardGlow, { backgroundColor: icon.glow }]} />

                {/* Caught badge */}
                {isCaught && (
                  <View style={[styles.caughtBadge, { backgroundColor: icon.color }]}>
                    <Ionicons name="checkmark" size={9} color="#FFF" />
                    <Text style={styles.caughtBadgeText}>Caught</Text>
                  </View>
                )}

                {/* Emoji */}
                <View style={[styles.emojiRing, { borderColor: icon.color + '88', backgroundColor: icon.color + '18' }]}>
                  <Text style={styles.emojiText}>{icon.emoji}</Text>
                </View>

                <Text style={[styles.iconName, { color: icon.color }]}>{icon.name}</Text>
                <Text style={styles.iconType}>{icon.type}</Text>
                <Text style={styles.iconTagline} numberOfLines={2}>{icon.tagline}</Text>

                {/* Arrow */}
                <View style={[styles.arrowBtn, { backgroundColor: icon.color + '22', borderColor: icon.color + '44' }]}>
                  <Ionicons name="arrow-forward" size={14} color={icon.color} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
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
  sectionSub: {
    fontFamily: FONTS.regular, fontSize: 12,
    color: COLORS.textMuted, marginBottom: 20, lineHeight: 18,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  iconCard: {
    width: '47.5%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 100, height: 100, borderRadius: 50,
    opacity: 0.4,
  },
  caughtBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  caughtBadgeText: { fontFamily: FONTS.bold, fontSize: 8, color: '#FFF' },

  emojiRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  emojiText: { fontSize: 26 },

  iconName: { fontFamily: FONTS.bold, fontSize: 16, marginBottom: 2 },
  iconType: { fontFamily: FONTS.semiBold, fontSize: 10, color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  iconTagline: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSub, lineHeight: 16, marginBottom: 14 },

  arrowBtn: {
    alignSelf: 'flex-start',
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
});
