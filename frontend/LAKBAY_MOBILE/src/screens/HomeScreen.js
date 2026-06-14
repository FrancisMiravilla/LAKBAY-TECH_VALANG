import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Animated, Alert } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';

let Mapbox = null;
try {
  const MapboxModule = require('@rnmapbox/maps');
  Mapbox = MapboxModule.default || MapboxModule;
  if (Mapbox && process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);
  }
} catch {
  console.log('Mapbox is not supported on this platform/environment');
}


const HOTSPOTS = [
  {
    emoji: '⛪',
    label: 'Fort Pilar',
    sub: 'Historical',
    color: COLORS.accent,
    nav: { title: 'Fort Pilar', location: 'Zamboanga City', rating: '4.8', price: 'Free', category: 'Historical' },
  },
  {
    emoji: '🏝️',
    label: 'Santa Cruz',
    sub: 'Beach',
    color: '#38BDF8',
    nav: { title: 'Santa Cruz Island', location: 'Zamboanga City', rating: '4.9', price: '500', category: 'Beaches' },
  },
  {
    emoji: '🎨',
    label: 'Yakan Village',
    sub: 'Culture',
    color: COLORS.teal,
    nav: { title: 'Yakan Weaving Village', location: 'Zamboanga City', rating: '4.7', price: 'Free', category: 'Culture' },
  },
  {
    emoji: '🕌',
    label: 'Rio Hondo',
    sub: 'Culture',
    color: COLORS.gold,
    nav: { title: 'Rio Hondo', location: 'Zamboanga City', rating: '4.5', price: 'Free', category: 'Culture' },
  },
];

const QA_CARDS = [
  { emoji: '📷', badge: 'AR',    title: 'Augmented Reality', color: COLORS.accent, shadow: SHADOW.accent, route: 'AR', icon: 'camera', message: "This feature works only in Zamboanga City's museum" },
  { emoji: '🔍', badge: 'QR',    title: 'Scan & Discover',   color: COLORS.teal,   shadow: SHADOW.card,   route: 'QR', icon: 'scan', message: "This feature works only on tourist spots" },
  { emoji: '🏆', badge: 'CATCH', title: 'Collect & Win',     color: COLORS.gold,   shadow: SHADOW.gold,   route: 'Catch', icon: 'trophy', message: "This only works 4 symbols to catch which are the curacha, vinta, weave, and the lantaka" },
];

export default function HomeScreen({ navigation }) {
  const [heroFade]  = useState(() => new Animated.Value(0));
  const [heroSlide] = useState(() => new Animated.Value(20));
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQa, setSelectedQa] = useState(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={COLORS.gold} style={{ marginRight: 6 }} />
          <View>
            <Text style={styles.logoTitle}>LAKBAY</Text>
            <Text style={styles.logoSub}>ZAMBOANGA CITY</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Hero Banner ───────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.heroBanner,
            { opacity: heroFade, transform: [{ translateY: heroSlide }] },
          ]}
        >
          {/* Simulated radial glow — outer orb */}
          <View style={styles.heroGlowOuter} />
          {/* Inner brighter orb */}
          <View style={styles.heroGlowInner} />

          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>✦  CITY OF COLORS  ✦</Text>
            <Text style={styles.heroTitle}>DISCOVER{'\n'}ZAMBOANGA</Text>
            <Text style={styles.heroDesc}>
              Explore heritage, culture and hidden gems through immersive AR
              experiences and guided trails.
            </Text>
            <View style={styles.pills}>
              {['Heritage', 'Culture', 'Adventure'].map((p) => (
                <View key={p} style={styles.pill}>
                  <Text style={styles.pillText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Explore Section ──────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Explore Zamboanga</Text>
            <TouchableOpacity onPress={() => alert('View All Map Details')}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          {/* Map Card */}
          <View style={styles.mapCard}>
            {Mapbox ? (
              <Mapbox.MapView
                testID="mapbox-map"
                style={styles.map}
                styleURL={Mapbox.StyleURL.Dark}
                logoEnabled={false}
                attributionEnabled={false}
              >
                <Mapbox.Camera zoomLevel={11} centerCoordinate={[122.0700, 6.8850]} />
                <Mapbox.MarkerView coordinate={[122.0625, 6.8653]} testID="marker-santa-cruz">
                  <View style={styles.mapNodeContainer}>
                    <View style={styles.nodePulse} />
                    <Text style={styles.mapNodeText}>🏝️ Santa Cruz</Text>
                  </View>
                </Mapbox.MarkerView>
                <Mapbox.MarkerView coordinate={[122.0761, 6.9039]} testID="marker-city-center">
                  <View style={styles.mapNodeContainer}>
                    <View style={styles.nodePulseActive} />
                    <Text style={styles.mapNodeText}>🏢 City Center</Text>
                  </View>
                </Mapbox.MarkerView>
              </Mapbox.MapView>
            ) : (
              <View style={styles.mapGridMock} testID="mockup-map">
                <View style={[styles.mapNode, { top: '25%', left: '65%' }]}>
                  <View style={styles.nodePulse} />
                  <Text style={styles.mapNodeText}>🏝️ Santa Cruz</Text>
                </View>
                <View style={[styles.mapNode, { top: '55%', left: '30%' }]}>
                  <View style={styles.nodePulseActive} />
                  <Text style={styles.mapNodeText}>🏢 City Center</Text>
                </View>
                <View style={styles.mapCompass}>
                  <Text style={styles.mapCompassLabel}>N</Text>
                  <Text style={styles.mapCompassArrow}>↑</Text>
                </View>
                <Text style={styles.mapScaleLabel}>📏 10 km</Text>
              </View>
            )}

            {/* Tap overlay */}
            <TouchableOpacity
              style={styles.mapTapOverlay}
              onPress={() => alert('Launching Interactive AR Map...')}
            >
              <Text style={styles.mapTapIcon}>🗺️</Text>
              <Text style={styles.mapTapText}>Tap to Explore Interactive Map</Text>
            </TouchableOpacity>
          </View>

          {/* Cultural Hotspots */}
          <View style={styles.hotspotsSection}>
            <Text style={styles.subSectionTitle}>Cultural Hotspots</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hotspotsRow}
            >
              {HOTSPOTS.map((h) => (
                <TouchableOpacity
                  key={h.label}
                  style={styles.hotspotCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('Details', { destination: h.nav })
                  }
                >
                  {/* Top color accent strip */}
                  <View
                    style={[styles.hotspotAccent, { backgroundColor: h.color }]}
                  />
                  <Text style={styles.hotspotEmoji}>{h.emoji}</Text>
                  <Text style={styles.hotspotName}>{h.label}</Text>
                  <Text style={styles.hotspotSub}>{h.sub}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ── Quick Access ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Quick Access</Text>
          </View>
          <View style={styles.qaRow}>
            {QA_CARDS.map((qa) => (
              <TouchableOpacity
                key={qa.badge}
                style={[styles.qaCard, qa.shadow]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedQa(qa);
                  setModalVisible(true);
                }}
              >
                <View style={styles.qaTopRow}>
                  <View
                    style={[
                      styles.qaIconCircle,
                      {
                        backgroundColor: qa.color + '22',
                        borderColor: qa.color + '44',
                      },
                    ]}
                  >
                    <Text style={styles.qaIconText}>{qa.emoji}</Text>
                  </View>
                  <Text style={[styles.qaBadge, { color: qa.color }]}>
                    {qa.badge}
                  </Text>
                </View>
                <Text style={styles.qaTitle}>{qa.title}</Text>
                <View
                  style={[styles.qaAccentLine, { backgroundColor: qa.color }]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <CustomModal
        visible={modalVisible}
        title="Notice"
        message={selectedQa?.message}
        icon={selectedQa?.icon}
        color={selectedQa?.color}
        onClose={() => setModalVisible(false)}
        onProceed={() => {
          setModalVisible(false);
          if (selectedQa) {
            navigation.navigate(selectedQa.route);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 68,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accentBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  headerLogo: {
    fontSize: 24,
  },
  logoTitle: {
    fontFamily: FONTS.black,
    fontSize: 20,
    color: COLORS.text,
    letterSpacing: 4,
    lineHeight: 22,
  },
  logoSub: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 17,
  },

  scroll: {
    paddingBottom: 40,
  },

  // ── Hero Banner ───────────────────────────────────────────────────
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    minHeight: 200,
    ...SHADOW.accent,
  },
  // Outer glow orb — upper-right, large + soft
  heroGlowOuter: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.accentSoft,
  },
  // Inner glow orb — tighter, more opaque
  heroGlowInner: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.45,
  },
  heroContent: {
    padding: 24,
  },
  heroEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: FONTS.black,
    fontSize: 30,
    color: COLORS.text,
    letterSpacing: 1,
    lineHeight: 34,
    marginBottom: 12,
  },
  heroDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSub,
    lineHeight: 20,
    marginBottom: 16,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  pillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.text,
  },

  // ── Section ───────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  accentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  viewAll: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.gold,
  },
  subSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
  },

  // ── Map ───────────────────────────────────────────────────────────
  mapCard: {
    height: 220,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.accentDark,
    overflow: 'hidden',
    marginBottom: 20,
    ...SHADOW.accent,
  },
  map: {
    flex: 1,
  },
  mapGridMock: {
    flex: 1,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  mapNode: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.88)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  mapNodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.88)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  nodePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
    marginRight: 5,
  },
  nodePulseActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginRight: 5,
  },
  mapNodeText: {
    fontFamily: FONTS.bold,
    color: '#FFF',
    fontSize: 9,
  },
  mapCompass: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapCompassLabel: {
    fontFamily: FONTS.bold,
    color: '#FFF',
    fontSize: 8,
  },
  mapCompassArrow: {
    color: COLORS.accent,
    fontSize: 10,
    marginTop: -2,
  },
  mapScaleLabel: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontFamily: FONTS.regular,
  },
  mapTapOverlay: {
    height: 44,
    backgroundColor: 'rgba(233,30,140,0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapTapIcon: {
    fontSize: 16,
  },
  mapTapText: {
    fontFamily: FONTS.bold,
    color: '#FFF',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // ── Cultural Hotspots ─────────────────────────────────────────────
  hotspotsSection: {
    marginTop: 4,
  },
  hotspotsRow: {
    gap: 12,
    paddingRight: 16,
  },
  hotspotCard: {
    width: 130,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    padding: 14,
    alignItems: 'center',
    ...SHADOW.card,
  },
  hotspotAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  hotspotEmoji: {
    fontSize: 32,
    marginTop: 10,
    marginBottom: 8,
  },
  hotspotName: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  hotspotSub: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // ── Quick Access ──────────────────────────────────────────────────
  qaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  qaCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    minHeight: 120,
  },
  qaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qaIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaIconText: {
    fontSize: 20,
  },
  qaBadge: {
    fontFamily: FONTS.black,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  qaTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.textSub,
    lineHeight: 15,
  },
  qaAccentLine: {
    height: 2,
    borderRadius: 1,
    marginTop: 12,
    width: '40%',
  },
});
