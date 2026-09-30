import React, { useState, useRef } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TextInput,
  TouchableOpacity, FlatList, StatusBar,
  ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, Image,
  ImageBackground, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { authService } from '../api/authService';
import ErrorModal from '../components/ErrorModal';
import VintaStripe from '../components/VintaStripe';

const { width: SCREEN_W } = Dimensions.get('window');

const CHARACTERS = [
  {
    id: 'mando',
    name: 'Kuya Mando',
    title: 'The Trailblazer',
    image: require('../assets/characters/lila.jpg'),
    color: COLORS.accent,
    desc: 'Bold & fearless across every trail',
    specialty: 'Historic Fortresses',
    perk: '+10% Heritage XP',
    badge: 'LEADER',
    zoom: 1.15,
  },
  {
    id: 'bela',
    name: 'Ate Bela',
    title: 'The Wanderer',
    image: require('../assets/characters/new.jpg'),
    color: '#FBBF24',
    desc: 'Curious & free among vibrant colors',
    specialty: 'Cultural Festivals',
    perk: '+10% Festival XP',
    badge: 'EXPLORER',
    zoom: 1.15,
  },
  {
    id: 'lila',
    name: 'Ate Lila',
    title: 'The Navigator',
    image: require('../assets/characters/ricky.jpg'),
    color: '#A78BFA',
    desc: 'Wise & precise in every direction',
    specialty: 'Island Coastlines',
    perk: '+10% Map Discovery XP',
    badge: 'NAVIGATOR',
    zoom: 1.4,
  },
  {
    id: 'dante',
    name: 'Bossing Dante',
    title: 'The Adventurer',
    image: require('../assets/characters/dante.jpg'),
    color: '#38BDF8',
    desc: 'Leader & brave through every tide',
    specialty: 'Urban Landmarks',
    perk: '+10% City Quests XP',
    badge: 'VETERAN',
    zoom: 1.4,
  },
  {
    id: 'sonya',
    name: 'Ate Sonya',
    title: 'The Discoverer',
    image: require('../assets/characters/sonya.jpg'),
    color: COLORS.teal,
    desc: 'Creative & bold with ancient heritage',
    specialty: 'Museum AR Exhibits',
    perk: '+10% AR Scans XP',
    badge: 'CURATOR',
    zoom: 1.05,
  },
];

const RANDOM_CALLSIGNS = [
  'HermosaScout',
  'VintaRider',
  'PilarExplorer',
  'YakanVoyager',
  'ChavacanoSeeker',
  'CurachaHunter',
  'ZamboangaPioneer',
  'FortressTracker',
];

export default function CharacterSelectScreen({ navigation }) {
  const [explorerName, setExplorerName] = useState('');
  const [currentIndex, setCurrentIndex]  = useState(0);
  const [loading, setLoading]            = useState(false);
  const flatListRef = useRef(null);
  const [errorModal, setErrorModal]      = useState({ visible: false, type: 'error', title: '', message: '' });

  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });

  const selected = CHARACTERS[currentIndex] || CHARACTERS[0];

  const goTo = (index) => {
    if (index < 0 || index >= CHARACTERS.length) return;
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const handleRandomCallsign = () => {
    const randomPick = RANDOM_CALLSIGNS[Math.floor(Math.random() * RANDOM_CALLSIGNS.length)];
    const randomNum = Math.floor(10 + Math.random() * 90);
    setExplorerName(`${randomPick}_${randomNum}`);
  };

  const handleConfirm = async () => {
    if (!explorerName.trim()) {
      showErr('Explorer Callsign Required', 'Please enter your in-game name or tap 🎲 to roll a callsign.');
      return;
    }
    setLoading(true);
    try {
      await authService.characterSetup(selected.id, explorerName.trim());
      await SecureStore.setItemAsync('offline_character', selected.id);
      await SecureStore.setItemAsync('offline_explorerName', explorerName.trim());
      navigation.replace('MainTabs', { showOnboarding: true });
    } catch (error) {
      const errorData = error.response?.data || error;
      let msg = 'Something went wrong during setup.';
      if (errorData.in_game_name) msg = errorData.in_game_name[0];
      showErr('Setup Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const renderCharacter = ({ item }) => (
    <View style={styles.slide}>
      <View style={[styles.charCard, { borderColor: item.color + '88' }]}>
        {/* Subtle Ambient Glow */}
        <View style={[styles.cardGlow, { backgroundColor: item.color + '12' }]} />

        {/* Companion Tag */}
        <View style={[styles.guideBadge, { backgroundColor: item.color + '22', borderColor: item.color + '66' }]}>
          <Ionicons name="sparkles" size={10} color={item.color} />
          <Text style={[styles.guideBadgeText, { color: item.color }]}>
            {item.badge} · COMPANION GUIDE
          </Text>
        </View>

        {/* Character Avatar with Glowing Frame */}
        <View style={[styles.avatarOuterRing, { borderColor: item.color + '55' }]}>
          <View style={[styles.avatarRing, { borderColor: item.color }]}>
            <Image
              source={item.image}
              style={{
                width: '100%',
                height: '100%',
                transform: [{ scale: item.zoom || 1 }],
              }}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Character Names */}
        <Text style={[styles.charName, { color: item.color }]}>{item.name}</Text>
        <Text style={styles.charTitle}>{item.title}</Text>

        {/* Gamified RPG Perks & Specialty */}
        <View style={styles.perkContainer}>
          <View style={styles.perkRow}>
            <View style={styles.perkChip}>
              <Ionicons name="compass-outline" size={12} color={item.color} />
              <Text style={styles.perkChipLabel}>Focus: <Text style={{ color: '#FFFFFF', fontFamily: FONTS.semiBold }}>{item.specialty}</Text></Text>
            </View>
            <View style={[styles.perkChip, { borderColor: COLORS.gold + '44' }]}>
              <Ionicons name="flash-outline" size={12} color={COLORS.gold} />
              <Text style={[styles.perkChipLabel, { color: COLORS.gold }]}>{item.perk}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.charDesc}>"{item.desc}"</Text>
      </View>
    </View>
  );

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            {/* ── Header ────────────────────────────────────────────────── */}
            <View style={styles.header}>
              <View style={styles.eyebrowBadge}>
                <Ionicons name="shield-checkmark" size={11} color={COLORS.gold} />
                <Text style={styles.headerStep}>STAGE 2 OF 2 · GUILD COMPANION</Text>
              </View>

              <Text style={styles.headerTitle}>Choose Your Guide</Text>
              <Text style={styles.headerSub}>Who leads your expedition through Zamboanga?</Text>
            </View>

            <VintaStripe height={4} />

            {/* ── Companion Quick Select Strip ───────────────────────────── */}
            <View style={styles.quickBar}>
              <Text style={styles.quickBarLabel}>ALL GUIDES (TAP TO SELECT):</Text>
              <View style={styles.quickRow}>
                {CHARACTERS.map((char, idx) => {
                  const isCur = idx === currentIndex;
                  return (
                    <TouchableOpacity
                      key={char.id}
                      style={[
                        styles.quickAvatarWrap,
                        isCur && { borderColor: char.color, transform: [{ scale: 1.1 }] },
                      ]}
                      onPress={() => goTo(idx)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={char.image}
                        style={styles.quickAvatarImg}
                        resizeMode="cover"
                      />
                      {isCur && (
                        <View style={[styles.quickActiveDot, { backgroundColor: char.color }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Carousel ──────────────────────────────────────────────── */}
            <View style={styles.carouselWrap}>
              <FlatList
                ref={flatListRef}
                data={CHARACTERS}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={renderCharacter}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                  if (index >= 0 && index < CHARACTERS.length) {
                    setCurrentIndex(index);
                  }
                }}
                getItemLayout={(_, index) => ({
                  length: SCREEN_W,
                  offset: SCREEN_W * index,
                  index,
                })}
                scrollEventThrottle={16}
              />

              {/* Navigation Arrows */}
              <TouchableOpacity
                style={[styles.arrow, styles.arrowLeft, currentIndex === 0 && styles.arrowDisabled]}
                onPress={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.arrow, styles.arrowRight, currentIndex === CHARACTERS.length - 1 && styles.arrowDisabled]}
                onPress={() => goTo(currentIndex + 1)}
                disabled={currentIndex === CHARACTERS.length - 1}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* ── Dot indicators ────────────────────────────────────────── */}
            <View style={styles.dots}>
              {CHARACTERS.map((char, i) => (
                <TouchableOpacity key={char.id} onPress={() => goTo(i)}>
                  <View style={[
                    styles.dot,
                    i === currentIndex && { backgroundColor: selected.color, width: 22, borderRadius: 4 },
                  ]} />
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Callsign Section & Launch Button ───────────────────────── */}
            <View style={styles.bottomCard}>
              <View style={styles.callsignHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="shield-outline" size={13} color={COLORS.gold} />
                  <Text style={styles.label}>YOUR EXPLORER CALLSIGN</Text>
                </View>

                {/* Dice Button for Quick Fun Names */}
                <TouchableOpacity
                  style={styles.randomBtn}
                  onPress={handleRandomCallsign}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13 }}>🎲</Text>
                  <Text style={styles.randomBtnText}>Roll Name</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputWrap, { borderColor: selected.color + '88' }]}>
                <Ionicons name="person-circle-outline" size={18} color={selected.color} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Captain_Hermosa"
                  placeholderTextColor="rgba(191, 215, 255, 0.40)"
                  autoCapitalize="words"
                  value={explorerName}
                  onChangeText={setExplorerName}
                  maxLength={24}
                />
                {explorerName.trim().length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{explorerName.trim().length}/24</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.startBtn,
                  { backgroundColor: selected.color },
                  (!explorerName.trim() || loading) && styles.startBtnDisabled,
                ]}
                activeOpacity={0.88}
                onPress={handleConfirm}
                disabled={loading || !explorerName.trim()}
              >
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#08143C" />
                    <Text style={styles.startBtnText}>Embarking on Expedition...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="rocket-outline" size={17} color="#08143C" />
                    <Text style={styles.startBtnText}>Embark On Expedition</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <ErrorModal
          visible={errorModal.visible}
          type={errorModal.type}
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => setErrorModal(prev => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 38, 0.88)',
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flexGrow: 1, paddingBottom: 20 },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.40)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  headerStep: {
    fontFamily: FONTS.pixel,
    fontSize: 7,
    color: COLORS.gold,
    letterSpacing: 1,
    lineHeight: 11,
  },
  headerTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
    lineHeight: 22,
    textAlign: 'center',
  },
  headerSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191, 215, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── Quick Select Bar ────────────────────────────────────────────────
  quickBar: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  quickBarLabel: {
    fontFamily: FONTS.pixel,
    fontSize: 6.5,
    color: 'rgba(191, 215, 255, 0.55)',
    letterSpacing: 1,
    marginBottom: 8,
    lineHeight: 10,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  quickAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#1E3A8A',
    backgroundColor: '#0C2054',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAvatarImg: {
    width: '100%',
    height: '100%',
  },
  quickActiveDot: {
    position: 'absolute',
    bottom: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Carousel ────────────────────────────────────────────────────────
  carouselWrap: {
    height: 380,
    position: 'relative',
    marginTop: 8,
  },
  slide: {
    width: SCREEN_W,
    height: 380,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  charCard: {
    flex: 1,
    backgroundColor: '#08143C',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  guideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  guideBadgeText: {
    fontFamily: FONTS.pixel,
    fontSize: 6.5,
    letterSpacing: 0.8,
    lineHeight: 10,
  },
  avatarOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#0C2054',
  },
  avatarRing: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  charName: {
    fontFamily: FONTS.pixel,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 3,
    lineHeight: 19,
  },
  charTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: 'rgba(191, 215, 255, 0.70)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 10,
  },
  perkContainer: {
    width: '100%',
    marginBottom: 8,
  },
  perkRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  perkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0C2054',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  perkChipLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10.5,
    color: 'rgba(191, 215, 255, 0.85)',
  },
  charDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191, 215, 255, 0.80)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // ── Arrows ──────────────────────────────────────────────────────────
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(8, 20, 60, 0.80)',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  arrowLeft:     { left: 6 },
  arrowRight:    { right: 6 },
  arrowDisabled: { opacity: 0.25 },

  // ── Dots ────────────────────────────────────────────────────────────
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E3A8A',
  },

  // ── Bottom Card ──────────────────────────────────────────────────────
  bottomCard: {
    backgroundColor: '#08143C',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    marginHorizontal: 16,
    padding: 16,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  callsignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontFamily: FONTS.pixel,
    fontSize: 7.5,
    color: COLORS.gold,
    letterSpacing: 0.8,
    lineHeight: 11,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0C2054',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  randomBtnText: {
    fontFamily: FONTS.pixel,
    fontSize: 6.5,
    color: '#38BDF8',
    lineHeight: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C2054',
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: 'rgba(191, 215, 255, 0.60)',
  },
  startBtn: {
    height: 50,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  startBtnDisabled: { opacity: 0.45 },
  startBtnText: {
    fontFamily: FONTS.pixel,
    fontSize: 9,
    color: '#08143C',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
});
