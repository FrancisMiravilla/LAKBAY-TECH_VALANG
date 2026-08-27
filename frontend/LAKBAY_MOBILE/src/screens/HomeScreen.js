import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  StatusBar, Animated, Image, ImageBackground, Dimensions,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import DailyStreakModal from '../components/DailyStreakModal';
import VintaStripe from '../components/VintaStripe';
import OnboardingTour from '../components/OnboardingTour';
import { WebView } from 'react-native-webview';
import { useApp } from '../context/AppContext';
import { getSpots, ORIGIN } from '../api/qrService';
import { getPublishedPromotions } from '../api/promotionService';
import { authService } from '../api/authService';
import { streakService } from '../api/streakService';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatImageUrl = (img) => {
  if (!img) return null;
  if (img.startsWith('http://localhost:8000') || img.startsWith('http://127.0.0.1:8000')) {
    return img.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, ORIGIN);
  }
  if (img.startsWith('/media')) return `${ORIGIN}${img}`;
  return img;
};

// ── Mini Map HTML ─────────────────────────────────────────────────────────────
function buildMiniMapHTML(spots, userLevel = 1) {
  const markers = spots
    .filter(s => s.latitude && s.longitude)
    .map(s => ({
      lat: s.latitude,
      lng: s.longitude,
      type: (s.feature_types && s.feature_types[0]) || 'qr',
      is_locked: (s.required_level || 1) > userLevel,
    }));

  if (markers.length === 0) {
    markers.push(
      { lat: 6.8653, lng: 122.0625, type: 'qr', is_locked: false },
      { lat: 6.9039, lng: 122.0761, type: 'ar', is_locked: false },
      { lat: 6.9015, lng: 122.0805, type: 'catch', is_locked: false },
      { lat: 6.9452, lng: 122.0298, type: 'qr', is_locked: false },
    );
  }

  const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your_mapbox_token_here';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:100%;height:100%;background:#080F23;overflow:hidden;}
    #map{width:100%;height:100%;filter:saturate(1.2) brightness(0.85);}
    .pin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;}
    .pin::after{content:'';width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.95);}
    .pin-qr{background:#1A56DB;box-shadow:0 0 12px rgba(26,86,219,0.8),0 0 0 4px rgba(26,86,219,0.2);}
    .pin-ar{background:#10B981;box-shadow:0 0 12px rgba(16,185,129,0.8),0 0 0 4px rgba(16,185,129,0.2);}
    .pin-catch{background:#FBBF24;box-shadow:0 0 12px rgba(251,191,36,0.8),0 0 0 4px rgba(251,191,36,0.2);}
    .pin.is-locked{background:#EF4444!important;box-shadow:0 0 12px rgba(239,68,68,0.8),0 0 0 4px rgba(239,68,68,0.25)!important;}
  </style>
</head>
<body>
<div id="map"></div>
<script>
mapboxgl.accessToken = '${MAPBOX_TOKEN}';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [122.07, 6.885],
  zoom: 11,
  interactive: false
});
var markers = ${JSON.stringify(markers)};
markers.forEach(function(m){
  var el=document.createElement('div');
  el.className='pin pin-'+m.type + (m.is_locked ? ' is-locked' : '');
  new mapboxgl.Marker({element: el}).setLngLat([m.lng, m.lat]).addTo(map);
});
</script>
</body>
</html>`;
}

// ── Static Data ───────────────────────────────────────────────────────────────
const PROMO_STATS = [
  { value: '350+', label: 'Years of History', icon: '🏛️' },
  { value: '3',    label: 'Cultures United',  icon: '🌐' },
  { value: '12+',  label: 'Heritage Sites',   icon: '📍' },
];

const QA_CARDS = [
  { emoji: '📷', badge: 'AR',    title: 'Augmented\nReality', color: COLORS.accent, shadow: SHADOW.accent, route: 'MindAR',  icon: 'camera',  message: 'You need to find 10 mythical models in each building where it has 3 buildings 10 for each.' },
  { emoji: '🔍', badge: 'QR',    title: 'Scan &\nDiscover',  color: COLORS.teal,   shadow: SHADOW.card,   route: 'QR',      icon: 'scan',    message: 'This feature works only on tourist spots.' },
  { emoji: '🏆', badge: 'CATCH', title: 'Collect\n& Win',    color: COLORS.gold,   shadow: SHADOW.gold,   route: 'Catch',   icon: 'trophy',  message: 'This only works 4 symbols to catch which are the curacha, vinta, weave, and the lantaka.' },
];

const TOUR_STEPS = [
  { key: 'notif', icon: 'notifications-outline', color: COLORS.gold,   title: 'Stay In The Loop',    text: 'Tap the bell anytime to see trip alerts, XP rewards, and badge unlocks.', refKey: 'bellRef' },
  { key: 'map',   icon: 'map-outline',            color: COLORS.accent, title: 'Explore The Map',     text: 'This live map shows every heritage site in Zamboanga City. Tap it to open the full interactive map and start planning your route.', refKey: 'mapCardRef' },
  { key: 'quick', icon: 'flash-outline',          color: COLORS.teal,   title: 'Quick Access Quests', text: 'Scan QR codes at tourist spots, catch hidden cultural symbols, and unlock AR exhibits at the museum — every action earns you XP!', refKey: 'qaRowRef' },
  { key: 'tabs',  icon: 'trophy-outline',         color: COLORS.gold,   title: 'Track Your Journey',  text: "Visit the Badges tab to see what you've unlocked, or Profile to check your level, XP bar, and explorer identity.", getRect: (insets, w, h) => { const tabBarHeight = 70 + insets.bottom; return { x: 8, y: h - tabBarHeight + 4, width: w - 16, height: tabBarHeight - 8 }; } },
  { key: 'done',  icon: 'rocket-outline',         color: COLORS.accent, title: "You're All Set!",      text: 'Time to start exploring Zamboanga City. Good luck, explorer!', ctaLabel: "Let's Go!" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation, route }) {
  const [heroFade]  = useState(() => new Animated.Value(0));
  const [heroSlide] = useState(() => new Animated.Value(24));
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQa, setSelectedQa] = useState(null);
  const [spots, setSpots] = useState([]);
  const [profile, setProfile] = useState(null);
  const userXp = profile?.xp || 0;
  const userLevel = Math.floor(userXp / 100) + 1;
  const [featuredPlaces, setFeaturedPlaces] = useState([]);
  const [promotedPlaces, setPromotedPlaces] = useState([]);
  const [showTour, setShowTour] = useState(false);
  const [streakData, setStreakData] = useState({ streak: 1, claimedToday: false, canClaim: false });
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [claimingStreak, setClaimingStreak] = useState(false);
  const { notifs, addNotification } = useApp();
  const prevSpotCountRef = useRef(0);

  const bellRef    = useRef(null);
  const mapCardRef = useRef(null);
  const qaRowRef   = useRef(null);
  const refs = { bellRef, mapCardRef, qaRowRef };
  const tourSteps = TOUR_STEPS.map((s) => (s.refKey ? { ...s, targetRef: refs[s.refKey] } : s));

  useEffect(() => {
    const fetchSpotsAndPromotions = async () => {
      try {
        const [data, profileData] = await Promise.all([
          getSpots(),
          authService.getProfile().catch(() => null),
        ]);
        if (profileData) setProfile(profileData);
        const allSpots = Array.isArray(data) ? data : (data.results || []);
        setSpots(allSpots);
        setFeaturedPlaces(allSpots.filter(s => s.is_featured));
        if (prevSpotCountRef.current > 0 && allSpots.length > prevSpotCountRef.current) {
          addNotification({ type: 'admin', icon: '📍', title: 'New Place Added!', sub: 'The admin just posted a new place to experience. Check it out on the map!' });
        }
        prevSpotCountRef.current = allSpots.length;
        const promoData = await getPublishedPromotions();
        const publishedPromos = Array.isArray(promoData) ? promoData : (promoData.results || []);
        setPromotedPlaces(publishedPromos.filter(p => p.is_place));
      } catch (e) {
        console.log('Home fetch error', e);
      }
    };
    fetchSpotsAndPromotions();
    const interval = setInterval(fetchSpotsAndPromotions, 15000);

    // Check login streak and show modal if eligible
    const checkStreak = async () => {
      try {
        const streakInfo = await streakService.recordLoginStreak();
        setStreakData(streakInfo);
        if (streakInfo.canClaim) {
          setTimeout(() => {
            setStreakModalVisible(true);
          }, 700);
        }
      } catch (err) {
        console.log('Streak check error:', err);
      }
    };
    checkStreak();

    return () => clearInterval(interval);
  }, []);

  const handleClaimStreak = async () => {
    setClaimingStreak(true);
    try {
      const res = await streakService.claimStreakReward(streakData.streak);
      setClaimingStreak(false);
      if (res.success) {
        setStreakData(prev => ({ ...prev, claimedToday: true, canClaim: false }));
        setProfile(prev => prev ? { ...prev, xp: (prev.xp || 0) + 10 } : prev);
        addNotification({
          type: 'xp',
          icon: '🔥',
          title: 'Daily Streak Bonus!',
          sub: `You claimed +10 XP for Day ${streakData.streak} login streak!`,
        });
      }
    } catch (e) {
      setClaimingStreak(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (route?.params?.showOnboarding) {
      const t = setTimeout(() => setShowTour(true), 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Dark overlay for readability */}
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={18} color={COLORS.gold} style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.logoTitle}>LAKBAY</Text>
              <Text style={styles.logoSub}>ZAMBOANGA CITY</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              ref={bellRef}
              style={styles.headerBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color="#FFF" />
              {notifs.some(n => !n.read) && <View style={styles.unreadBadge} />}
            </TouchableOpacity>
          </View>
        </View>
        <VintaStripe height={4} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >

          {/* ── Hero Banner ── */}
          <Animated.View
            style={[styles.heroBanner, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}
          >
            <View style={styles.heroGlass}>
              {/* Decorative glow orbs */}
              <View style={styles.heroOrb1} />
              <View style={styles.heroOrb2} />

              <View style={styles.heroContent}>
                <View style={styles.heroEyebrowRow}>
                  <View style={styles.heroEyebrowDot} />
                  <Text style={styles.heroEyebrow}>CITY OF COLORS  ✦  ZAMBOANGA</Text>
                </View>

                <Text style={styles.heroTitle}>DISCOVER{'\n'}ZAMBOANGA</Text>

                <Text style={styles.heroDesc}>
                  Explore heritage, culture and hidden gems through immersive AR experiences and guided trails.
                </Text>

                <View style={styles.pills}>
                  {[
                    { label: 'Heritage', icon: '🏛️', color: COLORS.accent },
                    { label: 'Culture',  icon: '🎨', color: COLORS.teal   },
                    { label: 'Adventure',icon: '⚡', color: COLORS.gold   },
                  ].map((p) => (
                    <View key={p.label} style={[styles.pill, { borderColor: p.color + '55', backgroundColor: p.color + '18' }]}>
                      <Text style={styles.pillIcon}>{p.icon}</Text>
                      <Text style={[styles.pillText, { color: p.color }]}>{p.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Bottom XP tease strip */}
              <View style={styles.heroXpStrip}>
                <Ionicons name="flash" size={13} color={COLORS.gold} />
                <Text style={styles.heroXpText}>Earn XP by exploring real-world cultural sites</Text>
                <View style={styles.heroXpBadge}>
                  <Text style={styles.heroXpBadgeText}>START →</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ── Quick Access ── */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.accentBar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionEyebrow}>⚔  ACTIVE QUESTS</Text>
                <Text style={styles.sectionTitle}>Quick Access</Text>
              </View>
            </View>

            <View ref={qaRowRef} style={styles.qaRow}>
              {QA_CARDS.map((qa) => (
                <TouchableOpacity
                  key={qa.badge}
                  style={[styles.qaCard, { borderColor: qa.color + '44' }]}
                  activeOpacity={0.82}
                  onPress={() => { setSelectedQa(qa); setModalVisible(true); }}
                >
                  {/* Top glow */}
                  <View style={[styles.qaGlow, { backgroundColor: qa.color + '25' }]} />

                  <View style={styles.qaIconWrap}>
                    <View style={[styles.qaIconCircle, { backgroundColor: qa.color + '22', borderColor: qa.color + '55' }]}>
                      <Text style={styles.qaIconText}>{qa.emoji}</Text>
                    </View>
                  </View>

                  <View style={[styles.qaBadgePill, { backgroundColor: qa.color + '22', borderColor: qa.color + '55' }]}>
                    <Text style={[styles.qaBadge, { color: qa.color }]}>{qa.badge}</Text>
                  </View>

                  <Text style={styles.qaTitle}>{qa.title}</Text>
                  <View style={[styles.qaAccentLine, { backgroundColor: qa.color }]} />

                  <View style={[styles.qaArrow, { backgroundColor: qa.color + '18', borderColor: qa.color + '44' }]}>
                    <Ionicons name="arrow-forward" size={10} color={qa.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Explore Map ── */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.accentBar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionEyebrow}>🗺  FIELD MAP</Text>
                <Text style={styles.sectionTitle}>Explore Zamboanga</Text>
              </View>
              <View style={styles.mapLiveBadge}>
                <View style={styles.mapLiveDot} />
                <Text style={styles.mapLiveText}>LIVE</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Map')} style={styles.mapViewAllBtn}>
                <Ionicons name="chevron-forward" size={13} color={COLORS.accent} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              ref={mapCardRef}
              style={styles.mapCard}
              activeOpacity={0.92}
              onPress={() => navigation.navigate('Map')}
            >
              <WebView
                source={{ html: buildMiniMapHTML(spots, userLevel), baseUrl: 'https://localhost' }}
                style={styles.map}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                scrollEnabled={false}
                mixedContentMode="always"
                pointerEvents="none"
              />

              {/* HUD top-left: coordinates */}
              <View style={styles.mapHudCoords} pointerEvents="none">
                <Text style={styles.mapHudCoordsText}>6°54′N  122°4′E</Text>
              </View>

              {/* HUD top-right: compass */}
              <View style={styles.mapCompass} pointerEvents="none">
                <Text style={styles.mapCompassLabel}>N</Text>
                <Text style={styles.mapCompassArrow}>↑</Text>
              </View>

              {/* Radar rings */}
              <View style={styles.mapRadarRing1} pointerEvents="none" />
              <View style={styles.mapRadarRing2} pointerEvents="none" />

              {/* Top dark fade */}
              <View style={styles.mapTopFade} pointerEvents="none" />

              {/* Spot count chips */}
              <View style={styles.mapHudChips} pointerEvents="none">
                {[
                  { label: 'QR',    color: COLORS.accent, count: spots.filter(s => s.feature_types?.includes('qr')).length    || '?' },
                  { label: 'AR',    color: COLORS.teal,   count: spots.filter(s => s.feature_types?.includes('ar')).length    || '?' },
                  { label: 'CATCH', color: COLORS.gold,   count: spots.filter(s => s.feature_types?.includes('catch')).length || '?' },
                ].map(chip => (
                  <View key={chip.label} style={[styles.mapHudChip, { borderColor: chip.color + '88', backgroundColor: chip.color + '22' }]}>
                    <View style={[styles.mapHudChipDot, { backgroundColor: chip.color }]} />
                    <Text style={[styles.mapHudChipCount, { color: chip.color }]}>{chip.count}</Text>
                    <Text style={styles.mapHudChipLabel}>{chip.label}</Text>
                  </View>
                ))}
              </View>

              {/* Bottom fade */}
              <View style={styles.mapBottomFade} pointerEvents="none" />

              {/* CTA pill */}
              <View style={styles.mapTapPill} pointerEvents="none">
                <Ionicons name="navigate" size={14} color="#FFF" />
                <Text style={styles.mapTapText}>OPEN WORLD MAP</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Welcome Zamboanga Banner ── */}
          <View style={styles.section}>
            <View style={styles.welcomeGlass}>
              {/* Background pattern orbs */}
              <View style={styles.welcomeOrb1} />
              <View style={styles.welcomeOrb2} />

              <View style={styles.welcomeContent}>
                <Text style={styles.welcomeEyebrow}>✦  BIENVENIDOS A  ✦</Text>
                <Text style={styles.welcomeCity}>ZAMBOANGA CITY</Text>
                <Text style={styles.welcomeTagline}>
                  "Asia's Latin City" — where Spanish roots, Islamic heritage, and indigenous Chavacano culture weave into one unforgettable experience.
                </Text>

                {/* Stat chips */}
                <View style={styles.statRow}>
                  {PROMO_STATS.map((s) => (
                    <View key={s.label} style={styles.statChip}>
                      <Text style={styles.statIcon}>{s.icon}</Text>
                      <Text style={styles.statValue}>{s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* ── Places to Experience ── */}
          {(promotedPlaces.length > 0 || featuredPlaces.length > 0) && (
            <View style={styles.section}>
              <View style={[styles.sectionTitleRow, { marginBottom: 10 }]}>
                <View style={styles.accentBar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionEyebrow}>⚔  ACTIVE QUESTS</Text>
                  <Text style={styles.sectionTitle}>Places to Experience</Text>
                </View>
                <View style={styles.questCountPill}>
                  <Text style={styles.questCountText}>
                    {(promotedPlaces.length + featuredPlaces.length)} Quests
                  </Text>
                </View>
              </View>

              {/* Promoted Places */}
              {promotedPlaces.map((p) => (
                <TouchableOpacity
                  key={`promo-${p.id}`}
                  style={[styles.questCard, styles.questCardGold]}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('Details', { destination: { title: p.spot_name, location: 'Promoted Place', description: p.description, images: [formatImageUrl(p.image_file)] } })}
                >
                  <ImageBackground
                    source={{ uri: formatImageUrl(p.image_file) }}
                    style={styles.questCardImage}
                    imageStyle={{ borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg }}
                    resizeMode="cover"
                  >
                    <View style={styles.questImageOverlay} />
                    <View style={styles.questCardTopRow}>
                      <View style={[styles.questTypeBadge, { backgroundColor: 'rgba(251,191,36,0.18)', borderColor: COLORS.gold }]}>
                        <View style={[styles.questTypeDot, { backgroundColor: COLORS.gold }]} />
                        <Text style={[styles.questTypeLabel, { color: COLORS.gold }]}>📣  SPONSORED</Text>
                      </View>
                    </View>
                    <View style={styles.questCardImageBottom}>
                      <Text style={styles.questCardName} numberOfLines={1}>{p.spot_name}</Text>
                    </View>
                  </ImageBackground>
                  <View style={styles.questCardBody}>
                    <Text style={styles.questCardDesc} numberOfLines={2}>{p.description}</Text>
                    <View style={styles.questCardFooter}>
                      <View style={styles.questObjective}>
                        <Ionicons name="flag-outline" size={11} color={COLORS.textMuted} />
                        <Text style={styles.questObjectiveText}>Visit & Discover</Text>
                      </View>
                      <View style={[styles.questCtaBtn, { backgroundColor: COLORS.gold }]}>
                        <Text style={styles.questCtaText}>START QUEST →</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.questCardGlowBar, { backgroundColor: COLORS.gold }]} />
                </TouchableOpacity>
              ))}

              {/* Featured Places */}
              {featuredPlaces.map((d) => {
                const primaryType = d.feature_types && d.feature_types.length > 0 ? d.feature_types[0] : 'qr';
                let questEmoji = '🔍', questTypeLabel = 'QR DISCOVERY', questColor = COLORS.teal, borderStyle = styles.questCardTeal;
                if (primaryType === 'ar') { questEmoji = '📷'; questTypeLabel = 'AR EXPERIENCE'; questColor = COLORS.accent; borderStyle = styles.questCardBlue; }
                else if (primaryType === 'catch') { questEmoji = '🏆'; questTypeLabel = 'COLLECT & WIN'; questColor = COLORS.gold; borderStyle = styles.questCardGold; }
                const imageUri = formatImageUrl(d.image);
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.questCard, borderStyle]}
                    activeOpacity={0.88}
                    onPress={() => {
                      const combinedImages = [d.image, d.image2, d.image3].filter(img => img).map(formatImageUrl);
                      navigation.navigate('Details', { destination: { title: d.name, location: d.location_name, description: d.description, historical_background: d.historical_background, cultural_significance: d.cultural_significance, fun_fact: d.fun_fact, image: imageUri, images: combinedImages } });
                    }}
                  >
                    <ImageBackground
                      source={{ uri: imageUri }}
                      style={styles.questCardImage}
                      imageStyle={{ borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg }}
                      resizeMode="cover"
                    >
                      <View style={styles.questImageOverlay} />
                      <View style={styles.questCardTopRow}>
                        <View style={[styles.questTypeBadge, { backgroundColor: questColor + '22', borderColor: questColor + '88' }]}>
                          <View style={[styles.questTypeDot, { backgroundColor: questColor }]} />
                          <Text style={[styles.questTypeLabel, { color: questColor }]}>{questEmoji}  {questTypeLabel}</Text>
                        </View>
                      </View>
                      <View style={styles.questCardImageBottom}>
                        <Text style={styles.questCardName} numberOfLines={1}>{d.name}</Text>
                      </View>
                    </ImageBackground>
                    <View style={styles.questCardBody}>
                      <View style={styles.questLocationRow}>
                        <Ionicons name="location-outline" size={11} color={questColor} />
                        <Text style={[styles.questLocationText, { color: questColor }]} numberOfLines={1}>{d.location_name || 'Zamboanga City'}</Text>
                      </View>
                      <Text style={styles.questCardDesc} numberOfLines={2}>{d.description}</Text>
                      {d.feature_types && d.feature_types.length > 1 && (
                        <View style={styles.questTagsRow}>
                          {d.feature_types.slice(0, 3).map((ft) => {
                            const ftColor = ft === 'qr' ? COLORS.teal : ft === 'ar' ? COLORS.accent : COLORS.gold;
                            const ftLabel = ft === 'qr' ? 'QR' : ft === 'ar' ? 'AR' : 'CATCH';
                            return (
                              <View key={ft} style={[styles.questMiniTag, { borderColor: ftColor + '66', backgroundColor: ftColor + '18' }]}>
                                <Text style={[styles.questMiniTagText, { color: ftColor }]}>{ftLabel}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      <View style={styles.questCardFooter}>
                        <View style={styles.questObjective}>
                          <Ionicons name="flag-outline" size={11} color={COLORS.textMuted} />
                          <Text style={styles.questObjectiveText}>Explore & Earn</Text>
                        </View>
                        <View style={[styles.questCtaBtn, { backgroundColor: questColor }]}>
                          <Text style={styles.questCtaText}>START QUEST →</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.questCardGlowBar, { backgroundColor: questColor }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 32 }} />
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
            if (selectedQa) navigation.navigate(selectedQa.route);
          }}
        />

        <DailyStreakModal
          visible={streakModalVisible}
          streak={streakData.streak}
          claimed={streakData.claimedToday}
          loading={claimingStreak}
          onClaim={handleClaimStreak}
          onClose={() => setStreakModalVisible(false)}
        />

        <OnboardingTour
          visible={showTour}
          steps={tourSteps}
          onFinish={() => setShowTour(false)}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Background
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 38, 0.82)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: 'rgba(8, 20, 60, 0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 179, 237, 0.20)',
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
  logoTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 18,
  },
  logoSub: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(191,215,255,0.70)',
    letterSpacing: 2,
    marginTop: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4, right: 4,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.navy,
  },

  scroll: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  accentBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  sectionEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: COLORS.teal,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },

  // ── Hero Banner ──────────────────────────────────────────────────────
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 4,
  },
  heroGlass: {
    backgroundColor: 'rgba(8, 20, 60, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  heroOrb1: {
    position: 'absolute',
    top: -50, right: -50,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(26,86,219,0.20)',
  },
  heroOrb2: {
    position: 'absolute',
    bottom: -30, left: -30,
    width: 150, height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(251,191,36,0.10)',
  },
  heroContent: {
    padding: 24,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heroEyebrowDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
  },
  heroEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: COLORS.teal,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 1,
    lineHeight: 34,
    marginBottom: 12,
    textShadowColor: 'rgba(26,86,219,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  heroDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(191,215,255,0.85)',
    lineHeight: 20,
    marginBottom: 18,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillIcon: {
    fontSize: 12,
  },
  pillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },
  heroXpStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99,179,237,0.15)',
    backgroundColor: 'rgba(26,86,219,0.12)',
  },
  heroXpText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(191,215,255,0.80)',
  },
  heroXpBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  heroXpBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // ── Quick Access ──────────────────────────────────────────────────────
  qaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qaCard: {
    flex: 1,
    backgroundColor: 'rgba(8, 20, 60, 0.62)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 14,
    minHeight: 130,
    overflow: 'hidden',
    position: 'relative',
  },
  qaGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 40,
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
  },
  qaIconWrap: {
    marginBottom: 10,
  },
  qaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaIconText: {
    fontSize: 20,
  },
  qaBadgePill: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  qaBadge: {
    fontFamily: FONTS.black,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  qaTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 7,
    color: 'rgba(191,215,255,0.90)',
    lineHeight: 13,
    marginBottom: 10,
  },
  qaAccentLine: {
    height: 2,
    borderRadius: 1,
    width: '40%',
    marginBottom: 8,
  },
  qaArrow: {
    alignSelf: 'flex-end',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Map ────────────────────────────────────────────────────────────────
  mapCard: {
    height: 240,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.30)',
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
    ...SHADOW.accent,
  },
  map: {
    flex: 1,
    backgroundColor: '#080F23',
  },
  mapTopFade: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 56,
    backgroundColor: 'rgba(8,20,60,0.20)',
  },
  mapBottomFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 72,
    backgroundColor: 'rgba(8,20,60,0.15)',
  },
  mapHudCoords: {
    position: 'absolute',
    top: 12, left: 12,
    backgroundColor: 'rgba(8,20,60,0.80)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.40)',
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  mapHudCoordsText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: 'rgba(191,215,255,0.90)',
    letterSpacing: 0.8,
  },
  mapCompass: {
    position: 'absolute',
    right: 12, top: 12,
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(8,20,60,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.40)',
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
    fontSize: 11,
    marginTop: -2,
  },
  mapRadarRing1: {
    position: 'absolute',
    bottom: 58, right: 16,
    width: 60, height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(26,86,219,0.30)',
  },
  mapRadarRing2: {
    position: 'absolute',
    bottom: 73, right: 31,
    width: 30, height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(26,86,219,0.20)',
  },
  mapHudChips: {
    position: 'absolute',
    bottom: 60, left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  mapHudChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(8,20,60,0.70)',
  },
  mapHudChipDot: {
    width: 5, height: 5,
    borderRadius: 3,
  },
  mapHudChipCount: {
    fontFamily: FONTS.black,
    fontSize: 11,
  },
  mapHudChipLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.8,
  },
  mapTapPill: {
    position: 'absolute',
    left: 12, right: 12, bottom: 12,
    height: 42,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...SHADOW.accent,
  },
  mapTapText: {
    fontFamily: FONTS.bold,
    color: '#FFF',
    fontSize: 12,
    letterSpacing: 1,
  },
  mapLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.40)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginRight: 6,
  },
  mapLiveDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  mapLiveText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#EF4444',
    letterSpacing: 1.5,
  },
  mapViewAllBtn: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(26,86,219,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Welcome Glass Banner ───────────────────────────────────────────────
  welcomeGlass: {
    backgroundColor: 'rgba(8, 20, 60, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.22)',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 4,
  },
  welcomeOrb1: {
    position: 'absolute',
    top: -50, right: -50,
    width: 180, height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(26,86,219,0.15)',
  },
  welcomeOrb2: {
    position: 'absolute',
    bottom: -40, left: -40,
    width: 130, height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(251,191,36,0.10)',
  },
  welcomeContent: {
    padding: 22,
  },
  welcomeEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  welcomeCity: {
    fontFamily: FONTS.pixel,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1,
    lineHeight: 22,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(251,191,36,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  welcomeTagline: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191,215,255,0.80)',
    lineHeight: 19,
    marginBottom: 20,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(26,86,219,0.12)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.22)',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: FONTS.black,
    fontSize: 18,
    color: COLORS.accent,
    lineHeight: 22,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: 'rgba(191,215,255,0.70)',
    textAlign: 'center',
    marginTop: 1,
    letterSpacing: 0.3,
  },

  // ── Quest Board ─────────────────────────────────────────────────────────
  questCountPill: {
    backgroundColor: 'rgba(26,86,219,0.20)',
    borderRadius: RADIUS.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.35)',
  },
  questCountText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 0.5,
  },

  // ── Quest Card ──────────────────────────────────────────────────────────
  questCard: {
    backgroundColor: 'rgba(8, 20, 60, 0.78)',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 18,
  },
  questCardTeal: {
    borderColor: COLORS.teal + '55',
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  questCardBlue: {
    borderColor: COLORS.accent + '55',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  questCardGold: {
    borderColor: COLORS.gold + '55',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  questCardImage: {
    width: '100%',
    height: 175,
    justifyContent: 'space-between',
  },
  questImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,10,38,0.58)',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  questCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  questTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  questTypeDot: {
    width: 6, height: 6,
    borderRadius: 3,
  },
  questTypeLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  questCardImageBottom: {
    padding: 12,
  },
  questCardName: {
    fontFamily: FONTS.pixel,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    marginBottom: 6,
  },
  questCardBody: {
    padding: 14,
  },
  questLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  questLocationText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  questCardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191,215,255,0.80)',
    lineHeight: 18,
    marginBottom: 10,
  },
  questTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  questMiniTag: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  questMiniTagText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  questCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questObjective: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  questObjectiveText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: 'rgba(191,215,255,0.60)',
    letterSpacing: 0.2,
  },
  questCtaBtn: {
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  questCtaText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#0C2461',
    letterSpacing: 0.8,
  },
  questCardGlowBar: {
    height: 3,
    width: '100%',
  },
});
