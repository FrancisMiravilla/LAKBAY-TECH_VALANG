import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

export default function CatchDetailsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C8175A" />
      
      {/* ── Header Area (Pink) ── */}
      <View style={styles.headerBg}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Curacha</Text>
            <Text style={styles.headerSub}>CULTURAL ICON</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="share-social-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Glow Card ── */}
        <View style={styles.cardContainer}>
          <View style={styles.glowBg} />
          <View style={styles.mainCard}>
            
            {/* Top Identity Row */}
            <View style={styles.identityRow}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>🦀</Text>
                </View>
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={10} color="#FFF" />
                </View>
              </View>
              
              <View style={styles.identityTextWrap}>
                <Text style={styles.cardTitle}>Curacha</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color="#A0AEC0" />
                  <Text style={styles.locationText}>Alavar Restaurant, Zamboanga</Text>
                </View>
                <View style={styles.starsRow}>
                  <Ionicons name="star" size={12} color="#F5A623" />
                  <Ionicons name="star" size={12} color="#F5A623" />
                  <Ionicons name="star" size={12} color="#F5A623" />
                  <Ionicons name="star" size={12} color="#F5A623" />
                  <Ionicons name="star-half" size={12} color="#F5A623" />
                  <Text style={styles.ratingText}>4.9</Text>
                </View>
              </View>
            </View>

            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <View style={styles.badgePink}>
                <Ionicons name="star" size={10} color="#FFF" />
                <Text style={styles.badgePinkText}>Cultural Symbol</Text>
              </View>
              <View style={styles.badgeGreen}>
                <Text style={styles.badgeGreenText}>Zamboanga City</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ABOUT Section */}
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <Text style={styles.bodyText}>
              The <Text style={styles.highlight}>Curacha</Text> (Ranina ranina), also known as the 
              spanner crab, is a large sea crab unique to the 
              warm coastal waters surrounding <Text style={styles.highlight}>Zamboanga City</Text>. 
              Distinguished by its bright orange shell and flat, 
              paddle-like claws, it is prized across the Philippines 
              for its exceptionally <Text style={styles.highlight}>rich, buttery meat</Text>. It is most 
              famously served drenched in <Text style={styles.highlight}>Alavar sauce</Text> — a 
              secret blend of coconut milk, spices, and aromatic 
              herbs perfected over generations at the legendary 
              Alavar Restaurant, founded in 1948.
            </Text>

            <View style={styles.divider} />

            {/* CULTURAL SIGNIFICANCE Section */}
            <Text style={styles.sectionTitle}>CULTURAL SIGNIFICANCE</Text>
            <Text style={styles.bodyText}>
              The Curacha is more than a seafood delicacy — it is 
              a proud symbol of <Text style={styles.highlight}>Zamboangueño identity</Text> and 
              coastal culinary heritage. Served at family fiestas, 
              local celebrations, and tourist dining tables alike, it 
              brings people together to experience the true flavor 
              of the City of Flowers.
            </Text>

          </View>
        </View>

      </ScrollView>

      {/* ── Bottom Nav / Actions ── */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.continueBtn} onPress={() => navigation.navigate('QuizScreen')}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0920', // Deep dark blue/purple background
  },
  headerBg: {
    backgroundColor: '#C8175A',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 40,
    marginBottom: -30, // overlap with the card
    zIndex: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  iconBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#FFF',
    letterSpacing: 1,
  },
  headerSub: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 100, // padding for bottom nav
  },
  cardContainer: {
    position: 'relative',
    marginTop: 10,
    zIndex: 1,
  },
  glowBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E91E8C',
    borderRadius: 24,
    top: -2, bottom: -2, left: -2, right: -2,
    opacity: 0.5,
    shadowColor: '#E91E8C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  mainCard: {
    backgroundColor: '#1C1434',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E91E8C',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 16,
  },
  avatarCircle: {
    width: 60, height: 60,
    borderRadius: 30,
    backgroundColor: '#C8175A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E91E8C',
  },
  avatarEmoji: {
    fontSize: 30,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    width: 20, height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1434',
  },
  identityTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#FFF',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#A0AEC0',
    marginLeft: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#A0AEC0',
    marginLeft: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  badgePink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E91E8C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  badgePinkText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FFF',
  },
  badgeGreen: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  badgeGreenText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#F5A623',
    letterSpacing: 1,
    marginBottom: 10,
  },
  bodyText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 22,
  },
  highlight: {
    color: '#F5A623',
    fontFamily: FONTS.semiBold,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  continueBtn: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#E91E8C',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.accent,
  },
  continueBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 1,
  },
});
