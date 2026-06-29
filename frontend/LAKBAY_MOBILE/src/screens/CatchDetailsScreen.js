import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

export default function CatchDetailsScreen({ route, navigation }) {
  const { icon } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C8175A" />

      {/* Header */}
      <View style={[styles.headerBg, { backgroundColor: icon.color }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{icon.name}</Text>
            <Text style={styles.headerSub}>{icon.type.toUpperCase()}</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Main Card */}
        <View style={styles.cardContainer}>
          <View style={[styles.cardGlow, { shadowColor: icon.color, backgroundColor: icon.color }]} />
          <View style={[styles.mainCard, { borderColor: icon.color }]}>

            {/* Identity Row */}
            <View style={styles.identityRow}>
              <View style={[styles.avatarCircle, { backgroundColor: icon.color + '33', borderColor: icon.color }]}>
                <Text style={styles.avatarEmoji}>{icon.emoji}</Text>
              </View>
              <View style={styles.identityTextWrap}>
                <Text style={styles.cardTitle}>{icon.name}</Text>
                <Text style={styles.cardTagline}>{icon.tagline}</Text>
                <View style={[styles.typeBadge, { backgroundColor: icon.color + '22', borderColor: icon.color + '55' }]}>
                  <Text style={[styles.typeBadgeText, { color: icon.color }]}>{icon.type}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ABOUT */}
            <Text style={[styles.sectionTitle, { color: icon.color }]}>ABOUT</Text>
            <Text style={styles.bodyText}>{icon.about}</Text>

            <View style={styles.divider} />

            {/* CULTURAL SIGNIFICANCE */}
            <Text style={[styles.sectionTitle, { color: icon.color }]}>CULTURAL SIGNIFICANCE</Text>
            <Text style={styles.bodyText}>{icon.significance}</Text>

            <View style={styles.divider} />

            {/* BASIC FACTS */}
            <Text style={[styles.sectionTitle, { color: icon.color }]}>BASIC FACTS</Text>
            <View style={styles.factsGrid}>
              {icon.facts.map(fact => (
                <View key={fact.label} style={[styles.factCard, { borderColor: icon.color + '33' }]}>
                  <Text style={[styles.factLabel, { color: icon.color }]}>{fact.label.toUpperCase()}</Text>
                  <Text style={styles.factValue}>{fact.value}</Text>
                </View>
              ))}
            </View>

          </View>
        </View>

      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: icon.color }, SHADOW.accent]}
          onPress={() => navigation.navigate('QuizScreen')}
        >
          <Text style={styles.continueBtnText}>Continue to Quiz</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  headerBg: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 36,
    marginBottom: -28,
    zIndex: 0,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: '#FFF', letterSpacing: 1 },
  headerSub: { fontFamily: FONTS.semiBold, fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: 2, marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 110 },

  cardContainer: { position: 'relative', marginTop: 10, zIndex: 1 },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24, top: -2, bottom: -2, left: -2, right: -2,
    opacity: 0.45,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 20, elevation: 10,
  },
  mainCard: {
    backgroundColor: '#1C1434', borderRadius: 22,
    padding: 20, borderWidth: 1,
  },

  identityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  avatarCircle: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  avatarEmoji: { fontSize: 34 },
  identityTextWrap: { flex: 1 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 22, color: '#FFF', marginBottom: 4 },
  cardTagline: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSub, marginBottom: 8, lineHeight: 17 },
  typeBadge: {
    alignSelf: 'flex-start', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill,
  },
  typeBadgeText: { fontFamily: FONTS.bold, fontSize: 10 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 18 },

  sectionTitle: { fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 1.5, marginBottom: 10 },
  bodyText: { fontFamily: FONTS.regular, fontSize: 13, color: '#E2E8F0', lineHeight: 22 },

  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  factCard: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.sm, borderWidth: 1, padding: 12,
  },
  factLabel: { fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 1, marginBottom: 6 },
  factValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFF' },

  bottomNav: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  continueBtn: {
    flexDirection: 'row', height: 58, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
  },
  continueBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
});
