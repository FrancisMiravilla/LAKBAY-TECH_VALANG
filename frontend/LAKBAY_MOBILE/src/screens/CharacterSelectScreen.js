import React, { useState, useRef } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, TextInput,
  TouchableOpacity, FlatList, StatusBar,
  ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { authService } from '../api/authService';
import ErrorModal from '../components/ErrorModal';

const { width: SCREEN_W } = Dimensions.get('window');

const CHARACTERS = [
  {
    id: 'mando',
    name: 'Kuya Mando',
    title: 'The Trailblazer',
    image: require('../assets/characters/lila.jpg'), // Male with yellow suitcase
    color: COLORS.accent,
    desc: 'Bold & fearless',
    zoom: 1.15,
  },
  {
    id: 'bela',
    name: 'Ate Bela',
    title: 'The Wanderer',
    image: require('../assets/characters/new.jpg'), // New provided character image
    color: '#FBBF24',
    desc: 'Curious & free',
    zoom: 1.15,
  },
  {
    id: 'lila',
    name: 'Ate Lila',
    title: 'The Navigator',
    image: require('../assets/characters/ricky.jpg'), // Female with pink hair
    color: '#A78BFA',
    desc: 'Wise & precise',
    zoom: 1.4,
  },
  {
    id: 'dante',
    name: 'Bossing Dante',
    title: 'The Adventurer',
    image: require('../assets/characters/dante.jpg'), // Male in blue shirt
    color: '#38BDF8',
    desc: 'Leader & brave',
    zoom: 1.4,
  },
  {
    id: 'sonya',
    name: 'Ate Sonya',
    title: 'The Discoverer',
    image: require('../assets/characters/sonya.jpg'), // Female in hijab
    color: COLORS.teal,
    desc: 'Creative & bold',
  },
];

export default function CharacterSelectScreen({ navigation }) {
  const [explorerName, setExplorerName] = useState('');
  const [currentIndex, setCurrentIndex]  = useState(0);
  const [loading, setLoading]            = useState(false);
  const flatListRef = useRef(null);
  const [errorModal, setErrorModal]      = useState({ visible: false, type: 'error', title: '', message: '' });
  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });

  const selected = CHARACTERS[currentIndex];

  const goTo = (index) => {
    if (index < 0 || index >= CHARACTERS.length) return;
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const handleConfirm = async () => {
    if (!explorerName.trim()) {
      showErr('Explorer Name Required', 'Please enter your explorer name to continue.');
      return;
    }
    setLoading(true);
    try {
      await authService.characterSetup(selected.id, explorerName.trim());
      navigation.replace('MainTabs', { showOnboarding: true });
    } catch (error) {
      const errorData = error.response?.data || error;
      let msg = 'Something went wrong.';
      if (errorData.in_game_name) msg = errorData.in_game_name[0];
      showErr('Setup Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const renderCharacter = ({ item }) => (
    <View style={styles.slide}>
      <View style={[styles.charCard, { borderColor: item.color + '55' }]}>
        <View style={[styles.cardGlow, { backgroundColor: item.color + '10' }]} />

        <View style={[styles.avatarRing, { borderColor: item.color, backgroundColor: item.color + '20', overflow: 'hidden' }]}>
          <Image 
            source={item.image} 
            style={{ 
              width: '100%', 
              height: '100%',
              transform: [{ scale: item.zoom || 1 }]
            }} 
            resizeMode="cover" 
          />
        </View>

        <Text style={[styles.charName, { color: item.color }]}>{item.name}</Text>
        <Text style={styles.charTitle}>{item.title}</Text>

        <View style={[styles.divider, { backgroundColor: item.color + '50' }]} />

        <Text style={styles.charDesc}>"{item.desc}"</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.accent} />

      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />
        <Text style={styles.headerStep}>STEP 2 OF 2</Text>
        <Text style={styles.headerTitle}>Choose Your Guide</Text>
        <Text style={styles.headerSub}>Who leads your adventure through Zamboanga?</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
              setCurrentIndex(index);
            }}
            getItemLayout={(_, index) => ({
              length: SCREEN_W,
              offset: SCREEN_W * index,
              index,
            })}
            scrollEventThrottle={16}
          />

          {/* Arrows */}
          <TouchableOpacity
            style={[styles.arrow, styles.arrowLeft, currentIndex === 0 && styles.arrowDisabled]}
            onPress={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.arrow, styles.arrowRight, currentIndex === CHARACTERS.length - 1 && styles.arrowDisabled]}
            onPress={() => goTo(currentIndex + 1)}
            disabled={currentIndex === CHARACTERS.length - 1}
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
                i === currentIndex && { backgroundColor: selected.color, width: 20, borderRadius: 4 },
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Explorer Name + Button ────────────────────────────────── */}
        <View style={styles.bottom}>
          <Text style={styles.label}>YOUR EXPLORER NAME</Text>
          <View style={[styles.inputWrap, { borderColor: selected.color + '55' }]}>
            <Ionicons name="person-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your explorer name..."
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              value={explorerName}
              onChangeText={setExplorerName}
            />
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
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.startBtnText}>Start Adventure</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Error Modal ── */}
      <ErrorModal
        visible={errorModal.visible}
        type={errorModal.type}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    backgroundColor: COLORS.accent,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  headerBlob1: {
    position: 'absolute', top: -30, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerBlob2: {
    position: 'absolute', bottom: -20, right: 20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  headerStep: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 8,
    lineHeight: 22,
  },
  headerSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 0.2,
  },

  // ── Carousel ────────────────────────────────────────────────────────
  carouselWrap: {
    height: 380,
    position: 'relative',
    marginTop: 20,
  },
  slide: {
    width: SCREEN_W,
    height: 380,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  charCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOW.card,
  },
  cardGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: RADIUS.lg,
  },
  avatarRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  charEmoji: { fontSize: 48 },
  charName: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  charTitle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 14,
  },
  divider: {
    width: 36,
    height: 1.5,
    borderRadius: 2,
    marginBottom: 14,
  },
  charDesc: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // ── Arrows ──────────────────────────────────────────────────────────
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  arrowLeft:     { left: 8 },
  arrowRight:    { right: 8 },
  arrowDisabled: { opacity: 0.2 },

  // ── Dots ────────────────────────────────────────────────────────────
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },

  // ── Bottom section ───────────────────────────────────────────────────
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  startBtn: {
    height: 54,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.accent,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 1,
  },
});
