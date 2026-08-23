import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Animated, Alert, Image, ImageBackground } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import VintaStripe from '../components/VintaStripe';
import OnboardingTour from '../components/OnboardingTour';
import { WebView } from 'react-native-webview';
import { useApp } from '../context/AppContext';

import { getSpots, ORIGIN } from '../api/qrService';
import { getPublishedPromotions } from '../api/promotionService';

const formatImageUrl = (img) => {
  if (!img) return null;
  if (img.startsWith('http://localhost:8000') || img.startsWith('http://127.0.0.1:8000')) {
    return img.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, ORIGIN);
  }
  if (img.startsWith('/media')) return `${ORIGIN}${img}`;
  return img;
};

function buildMiniMapHTML(spots) {
  const markers = spots
    .filter(s => s.latitude && s.longitude)
    .map(s => ({
      lat: s.latitude,
      lng: s.longitude,
      type: (s.feature_types && s.feature_types[0]) || 'qr',
    }));

  // Fallback coords if backend has no spots
  if (markers.length === 0) {
    markers.push(
      { lat: 6.8653, lng: 122.0625, type: 'qr' },
      { lat: 6.9039, lng: 122.0761, type: 'ar' },
      { lat: 6.9015, lng: 122.0805, type: 'catch' },
      { lat: 6.9452, lng: 122.0298, type: 'qr' },
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
    html,body{width:100%;height:100%;background:#EEF3FF;overflow:hidden;}
    #map{width:100%;height:100%;filter:saturate(1.15);}
    .pin{width:16px;height:16px;border-radius:50%;
      border:2px solid rgba(255,255,255,0.95);
      display:flex;align-items:center;justify-content:center;}
    .pin::after{content:'';width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.95);}
    .pin-qr{background:#1A56DB;box-shadow:0 0 10px rgba(26,86,219,0.7),0 0 0 4px rgba(26,86,219,0.18);}
    .pin-ar{background:#10B981;box-shadow:0 0 10px rgba(16,185,129,0.7),0 0 0 4px rgba(16,185,129,0.18);}
    .pin-catch{background:#FBBF24;box-shadow:0 0 10px rgba(251,191,36,0.7),0 0 0 4px rgba(251,191,36,0.18);}
  </style>
</head>
<body>
<div id="map"></div>
<script>
mapboxgl.accessToken = '${MAPBOX_TOKEN}';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [122.07, 6.885],
  zoom: 11,
  interactive: false
});
var markers = ${JSON.stringify(markers)};
markers.forEach(function(m){
  var el=document.createElement('div');el.className='pin pin-'+m.type;
  new mapboxgl.Marker({element: el}).setLngLat([m.lng, m.lat]).addTo(map);
});
</script>
</body>
</html>`;
}


const PROMO_STATS = [
  { value: '350+', label: 'Years of History' },
  { value: '3',    label: 'Cultures United' },
  { value: '12+',  label: 'Heritage Sites' },
];

const DESTINATIONS = [
  {
    emoji: '⛪',
    label: 'Fort Pilar',
    tag: 'Historical Landmark',
    color: COLORS.accent,
    tagColor: COLORS.accent,
    desc: 'A 17th-century Spanish fortress and beloved shrine of Our Lady of the Pillar — the soul of Zamboanga City.',
    nav: { title: 'Fort Pilar', location: 'Zamboanga City', rating: '4.8', price: 'Free', category: 'Historical' },
  },
  {
    emoji: '🏝️',
    label: 'Santa Cruz Island',
    tag: 'Pink Sand Beach',
    color: '#38BDF8',
    tagColor: '#38BDF8',
    desc: 'One of the Philippines\' rarest beaches — its blush-pink coral sand and turquoise waters are truly one of a kind.',
    nav: { title: 'Santa Cruz Island', location: 'Zamboanga City', rating: '4.9', price: '₱500', category: 'Beaches' },
  },
  {
    emoji: '🎨',
    label: 'Yakan Weaving Village',
    tag: 'Living Culture',
    color: COLORS.teal,
    tagColor: COLORS.teal,
    desc: 'Watch Yakan artisans weave intricate geometric textiles by hand — a living tradition passed down across generations.',
    nav: { title: 'Yakan Weaving Village', location: 'Zamboanga City', rating: '4.7', price: 'Free', category: 'Culture' },
  },
  {
    emoji: '🕌',
    label: 'Rio Hondo',
    tag: 'Heritage Village',
    color: COLORS.gold,
    tagColor: COLORS.gold,
    desc: 'A floating village on stilts above the sea — home to the Sama-Bajau people whose seafaring culture spans centuries.',
    nav: { title: 'Rio Hondo', location: 'Zamboanga City', rating: '4.5', price: 'Free', category: 'Culture' },
  },
  {
    emoji: '💐',
    label: 'Paseo del Mar',
    tag: 'Cultural Promenade',
    color: '#A78BFA',
    tagColor: '#A78BFA',
    desc: 'A vibrant waterfront boulevard where local life, Chavacano flair, street food, and stunning sea sunsets meet.',
    nav: { title: 'Paseo del Mar', location: 'Zamboanga City', rating: '4.6', price: 'Free', category: 'Culture' },
  },
];

const QA_CARDS = [
  { emoji: '📷', badge: 'AR',    title: 'Augmented Reality', color: COLORS.accent, shadow: SHADOW.accent, route: 'MindAR', icon: 'camera', message: "You need to find 10 mythical models in each building where it has 3 buildings 10 for each." },
  { emoji: '🔍', badge: 'QR',    title: 'Scan & Discover',   color: COLORS.teal,   shadow: SHADOW.card,   route: 'QR', icon: 'scan', message: "This feature works only on tourist spots" },
  { emoji: '🏆', badge: 'CATCH', title: 'Collect & Win',     color: COLORS.gold,   shadow: SHADOW.gold,   route: 'Catch', icon: 'trophy', message: "This only works 4 symbols to catch which are the curacha, vinta, weave, and the lantaka" },
];

const TOUR_STEPS = [
  {
    key: 'notif',
    icon: 'notifications-outline',
    color: COLORS.gold,
    title: 'Stay In The Loop',
    text: 'Tap the bell anytime to see trip alerts, XP rewards, and badge unlocks.',
    refKey: 'bellRef',
  },
  {
    key: 'map',
    icon: 'map-outline',
    color: COLORS.accent,
    title: 'Explore The Map',
    text: "This live map shows every heritage site in Zamboanga City. Tap it to open the full interactive map and start planning your route.",
    refKey: 'mapCardRef',
  },
  {
    key: 'quick',
    icon: 'flash-outline',
    color: COLORS.teal,
    title: 'Quick Access Quests',
    text: 'Scan QR codes at tourist spots, catch hidden cultural symbols, and unlock AR exhibits at the museum — every action earns you XP!',
    refKey: 'qaRowRef',
  },
  {
    key: 'tabs',
    icon: 'trophy-outline',
    color: COLORS.gold,
    title: 'Track Your Journey',
    text: "Visit the Badges tab to see what you've unlocked, or Profile to check your level, XP bar, and explorer identity.",
    getRect: (insets, w, h) => {
      const tabBarHeight = 70 + insets.bottom;
      return { x: 8, y: h - tabBarHeight + 4, width: w - 16, height: tabBarHeight - 8 };
    },
  },
  {
    key: 'done',
    icon: 'rocket-outline',
    color: COLORS.accent,
    title: "You're All Set!",
    text: 'Time to start exploring Zamboanga City. Good luck, explorer!',
    ctaLabel: "Let's Go!",
  },
];

export default function HomeScreen({ navigation, route }) {
  const [heroFade]  = useState(() => new Animated.Value(0));
  const [heroSlide] = useState(() => new Animated.Value(20));
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQa, setSelectedQa] = useState(null);
  const [spots, setSpots] = useState([]); // used for map
  const [featuredPlaces, setFeaturedPlaces] = useState([]); // used for places to experience
  const [promotedPlaces, setPromotedPlaces] = useState([]); // used for places promoted by users
  const [showTour, setShowTour] = useState(false);
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
        const data = await getSpots();
        const allSpots = Array.isArray(data) ? data : (data.results || []);
        setSpots(allSpots);
        setFeaturedPlaces(allSpots.filter(s => s.is_featured));
        
        if (prevSpotCountRef.current > 0 && allSpots.length > prevSpotCountRef.current) {
          addNotification({
            type: 'admin',
            icon: '📍',
            title: 'New Place Added!',
            sub: 'The admin just posted a new place to experience. Check it out on the map!',
          });
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
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New accounts land here straight from Character Select — greet them with
  // a feature-by-feature walkthrough of the app.
  useEffect(() => {
    if (route?.params?.showOnboarding) {
      const t = setTimeout(() => setShowTour(true), 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

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

          {/* Gamified Section Header */}
          <View style={styles.sectionTitleRow}>
            <View style={styles.accentBar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mapSectionEyebrow}>🗺  FIELD MAP</Text>
              <Text style={styles.sectionTitle}>Explore Zamboanga</Text>
            </View>
            {/* LIVE badge */}
            <View style={styles.mapLiveBadge}>
              <View style={styles.mapLiveDot} />
              <Text style={styles.mapLiveText}>LIVE</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Map')} style={styles.mapViewAllBtn}>
              <Ionicons name="chevron-forward" size={13} color={COLORS.accent} />
            </TouchableOpacity>
          </View>

          {/* Map Card — Gamified HUD */}
          <TouchableOpacity
            ref={mapCardRef}
            style={styles.mapCard}
            activeOpacity={0.92}
            onPress={() => navigation.navigate('Map')}
          >
            {/* Actual map */}
            <WebView
              source={{ html: buildMiniMapHTML(spots), baseUrl: 'https://localhost' }}
              style={styles.map}
              javaScriptEnabled={true}
              domStorageEnabled={true}
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

            {/* Radar ring decoration */}
            <View style={styles.mapRadarRing1} pointerEvents="none" />
            <View style={styles.mapRadarRing2} pointerEvents="none" />

            {/* Top dark fade */}
            <View style={styles.mapTopFade} pointerEvents="none" />

            {/* Spot count HUD chips — bottom-left */}
            <View style={styles.mapHudChips} pointerEvents="none">
              {[
                { label: 'QR', color: COLORS.accent, count: spots.filter(s => s.feature_types?.includes('qr')).length || '?' },
                { label: 'AR', color: COLORS.teal,   count: spots.filter(s => s.feature_types?.includes('ar')).length || '?' },
                { label: 'CATCH', color: COLORS.gold, count: spots.filter(s => s.feature_types?.includes('catch')).length || '?' },
              ].map(chip => (
                <View key={chip.label} style={[styles.mapHudChip, { borderColor: chip.color + '88', backgroundColor: chip.color + '22' }]}>
                  <View style={[styles.mapHudChipDot, { backgroundColor: chip.color }]} />
                  <Text style={[styles.mapHudChipCount, { color: chip.color }]}>{chip.count}</Text>
                  <Text style={styles.mapHudChipLabel}>{chip.label}</Text>
                </View>
              ))}
            </View>

            {/* Bottom dark fade */}
            <View style={styles.mapBottomFade} pointerEvents="none" />

            {/* CTA pill */}
            <View style={styles.mapTapPill} pointerEvents="none">
              <Ionicons name="navigate" size={14} color="#FFF" />
              <Text style={styles.mapTapText}>OPEN WORLD MAP</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* ── Welcome Zamboanga Promo ──────────────────────────── */}
          <View style={styles.promoSection}>

            {/* Welcome Banner */}
            <View style={styles.welcomeBanner}>
              {/* Decorative orbs */}
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
                      <Text style={styles.statValue}>{s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* ── Quest Board Section Header ───────────────────── */}
            <View style={styles.questBoardHeader}>
              <View style={styles.questBoardLeft}>
                <View style={styles.accentBar} />
                <View>
                  <Text style={styles.questBoardEyebrow}>⚔  ACTIVE QUESTS</Text>
                  <Text style={styles.questBoardTitle}>Places to Experience</Text>
                </View>
              </View>
              <View style={styles.questCountPill}>
                <Text style={styles.questCountText}>
                  {(promotedPlaces.length + featuredPlaces.length) || '—'} Quests
                </Text>
              </View>
            </View>

            {/* Promoted Places — Quest Cards */}
            {promotedPlaces.map((p) => (
              <TouchableOpacity
                key={`promo-${p.id}`}
                style={[styles.questCard, styles.questCardGold]}
                activeOpacity={0.88}
                onPress={() => {
                  navigation.navigate('Details', { destination: { title: p.spot_name, location: 'Promoted Place', description: p.description, images: [formatImageUrl(p.image_file)] } });
                }}
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

            {/* Featured Places — Quest Cards */}
            {featuredPlaces.map((d) => {
              const primaryType = d.feature_types && d.feature_types.length > 0 ? d.feature_types[0] : 'qr';

              let questEmoji = '🔍';
              let questTypeLabel = 'QR DISCOVERY';
              let questColor = COLORS.teal;
              let questXp = '+75 XP';
              let questDiff = '★★☆';
              let questDiffLabel = 'Medium';
              let borderStyle = styles.questCardTeal;

              if (primaryType === 'ar') {
                questEmoji = '📷';
                questTypeLabel = 'AR EXPERIENCE';
                questColor = COLORS.accent;
                questXp = '+100 XP';
                questDiff = '★★★';
                questDiffLabel = 'Hard';
                borderStyle = styles.questCardBlue;
              } else if (primaryType === 'catch') {
                questEmoji = '🏆';
                questTypeLabel = 'COLLECT & WIN';
                questColor = COLORS.gold;
                questXp = '+120 XP';
                questDiff = '★★★';
                questDiffLabel = 'Legendary';
                borderStyle = styles.questCardGold;
              }

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
                      <Text style={[styles.questLocationText, { color: questColor }]} numberOfLines={1}>
                        {d.location_name || 'Zamboanga City'}
                      </Text>
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
        </View>

        {/* ── Quick Access ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Quick Access</Text>
          </View>
          <View ref={qaRowRef} style={styles.qaRow}>
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

      <OnboardingTour
        visible={showTour}
        steps={tourSteps}
        onFinish={() => setShowTour(false)}
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
    backgroundColor: COLORS.navy,
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
    fontFamily: FONTS.pixel,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 18,
  },
  logoSub: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(191,215,255,0.75)',
    letterSpacing: 2,
    marginTop: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
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
    fontFamily: FONTS.pixel,
    fontSize: 18,
    color: COLORS.text,
    letterSpacing: 1,
    lineHeight: 32,
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
    height: 240,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    ...SHADOW.accent,
  },
  map: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  mapTopFade: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 56,
    backgroundColor: 'rgba(12,36,97,0.16)',
  },
  mapBottomFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 70,
    backgroundColor: 'rgba(12,36,97,0.10)',
  },
  mapLocationBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    ...SHADOW.card,
  },
  mapLocationBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.text,
  },
  mapLegend: {
    position: 'absolute',
    top: 12,
    right: 48,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
    ...SHADOW.card,
  },
  mapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mapLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  mapLegendText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: COLORS.textSub,
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
    borderColor: 'rgba(255,255,255,0.15)',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.navy,
  },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
    marginRight: 5,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.card,
  },
  mapCompassLabel: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontSize: 8,
  },
  mapCompassArrow: {
    color: COLORS.accent,
    fontSize: 11,
    marginTop: -2,
  },
  mapScaleLabel: {
    position: 'absolute',
    bottom: 58,
    left: 12,
    color: '#FFF',
    fontSize: 9,
    fontFamily: FONTS.semiBold,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mapTapPill: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
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

  // ── Map Gamified HUD extras ───────────────────────────────────────
  mapSectionEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: COLORS.teal,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 1,
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
    width: 6,
    height: 6,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapHudCoords: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(12,36,97,0.75)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.35)',
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  mapHudCoordsText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: 'rgba(191,215,255,0.90)',
    letterSpacing: 0.8,
  },
  mapRadarRing1: {
    position: 'absolute',
    bottom: 54,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(26,86,219,0.25)',
  },
  mapRadarRing2: {
    position: 'absolute',
    bottom: 70,
    right: 32,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(26,86,219,0.18)',
  },
  mapHudChips: {
    position: 'absolute',
    bottom: 58,
    left: 12,
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
  },
  mapHudChipDot: {
    width: 5,
    height: 5,
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

  // ── Welcome Zamboanga Promo ───────────────────────────────────────
  promoSection: {
    marginTop: 4,
  },
  welcomeBanner: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    overflow: 'hidden',
    marginBottom: 20,
    ...SHADOW.accent,
  },
  welcomeOrb1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.accentSoft,
  },
  welcomeOrb2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(251,191,36,0.10)',
  },
  welcomeContent: {
    padding: 20,
  },
  welcomeEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  welcomeCity: {
    fontFamily: FONTS.pixel,
    fontSize: 11,
    color: COLORS.text,
    letterSpacing: 1,
    lineHeight: 22,
    marginBottom: 10,
  },
  welcomeTagline: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSub,
    lineHeight: 19,
    marginBottom: 18,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    alignItems: 'center',
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
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  promoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  promoTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.text,
  },
  destinationCard: {
    flexDirection: 'column',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOW.card,
  },
  destImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  destImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  destBody: {
    padding: 16,
  },
  destTagBadge: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  destTagText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  destName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 6,
  },
  destDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSub,
    lineHeight: 18,
    marginBottom: 10,
  },
  destFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  destCta: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // ── Quest Board Header ────────────────────────────────────────────
  questBoardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  questBoardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questBoardEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  questBoardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.text,
  },
  questCountPill: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  questCountText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 0.5,
  },

  // ── Quest Card Base ───────────────────────────────────────────────
  questCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 18,
    ...SHADOW.card,
  },
  questCardTeal: {
    borderColor: COLORS.teal + '55',
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 10,
    elevation: 5,
  },
  questCardBlue: {
    borderColor: COLORS.accent + '55',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  questCardGold: {
    borderColor: COLORS.gold + '55',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },

  // ── Quest Card Image Area ─────────────────────────────────────────
  questCardImage: {
    width: '100%',
    height: 175,
    justifyContent: 'space-between',
  },
  questImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,15,35,0.52)',
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  questTypeLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  questXpBadge: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  questXpText: {
    fontFamily: FONTS.black,
    fontSize: 11,
    letterSpacing: 0.5,
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
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
    marginBottom: 6,
  },
  questDiffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questDiffStar: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  questDiffLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Quest Card Body ───────────────────────────────────────────────
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
    color: COLORS.textSub,
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
    color: COLORS.textMuted,
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

  // ── Quest Card Glow Bar (bottom accent) ───────────────────────────
  questCardGlowBar: {
    height: 3,
    width: '100%',
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
    fontFamily: FONTS.pixel,
    fontSize: 8,
    color: COLORS.textSub,
    lineHeight: 14,
  },
  qaAccentLine: {
    height: 2,
    borderRadius: 1,
    marginTop: 12,
    width: '40%',
  },
});
