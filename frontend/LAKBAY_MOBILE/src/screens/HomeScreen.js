import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Animated, Image,
} from 'react-native';
import { COLORS, FONTS, SHADOW, GOLD_TEXT, GUIDE_FONTS, onWhite } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import LucideIcon from '../components/LucideIcon';
import PlaceDeck from '../components/PlaceDeck';
import GuideWelcome from '../components/GuideWelcome';
import GuideSpeechModal from '../components/GuideSpeechModal';
import { SPOT_TYPES } from '../constants/mapConfig';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import DailyStreakModal from '../components/DailyStreakModal';
import { useTabBarSpace, TAB_BAR_HEIGHT, TAB_BAR_GAP, TAB_BAR_SIDE_MARGIN } from '../navigation/tabBarLayout';
import OnboardingTour from '../components/OnboardingTour';
import ParallaxHeroLayout from '../components/ParallaxHeroLayout';
import { WebView } from 'react-native-webview';
import { useApp } from '../context/AppContext';
import { getSpots, ORIGIN } from '../api/qrService';
import { getPublishedPromotions, getPromotions, getWallet } from '../api/promotionService';
import { authService } from '../api/authService';
import { streakService } from '../api/streakService';


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
    html,body{width:100%;height:100%;background:#DDE7F5;overflow:hidden;}
    #map{width:100%;height:100%;}
    .pin{width:18px;height:18px;border-radius:50%;border:3px solid #FFFFFF;box-shadow:0 2px 6px rgba(12,36,97,0.45);}
    .pin-qr{background:${SPOT_TYPES.qr.color};}
    .pin-ar{background:${SPOT_TYPES.ar.color};}
    .pin-catch{background:${SPOT_TYPES.catch.color};}
    .pin.is-locked{background:#94A3B8!important;}
  </style>
</head>
<body>
<div id="map"></div>
<script>
mapboxgl.accessToken = '${MAPBOX_TOKEN}';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [122.07, 6.885],
  zoom: 11.3,
  interactive: false,
  attributionControl: false
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
const GUIDE_IMAGE = require('../assets/guide_character.png');

const MAP_LEGEND = [
  { key: 'qr', label: 'QR' },
  { key: 'ar', label: 'AR' },
  { key: 'catch', label: 'Catch' },
];

// Quest tiles: the three game features; each opens its feature notice first.
const CATEGORY_TILES = [
  { key: 'ar',      label: 'AR Museum',  icon: 'camera',    color: COLORS.accent, bg: '#EAF1FF', qa: 'AR' },
  { key: 'qr',      label: 'QR Discover', icon: 'search',   color: COLORS.teal,   bg: '#E7F8F1', qa: 'QR' },
  { key: 'catch',   label: 'Catch & Win', icon: 'trophy',   color: '#D97706',     bg: '#FEF6E0', qa: 'CATCH' },
];

const QA_CARDS = [
  { lucide: 'camera', badge: 'AR',    title: 'Augmented\nReality', color: COLORS.accent, shadow: SHADOW.accent, route: 'MindAR',  icon: 'camera',  message: 'You need to find 10 mythical models in each building where it has 3 buildings 10 for each.' },
  { lucide: 'search', badge: 'QR',    title: 'Scan &\nDiscover',  color: COLORS.teal,   shadow: SHADOW.card,   route: 'QR',      icon: 'scan',    message: 'This feature works only on tourist spots.' },
  { lucide: 'trophy', badge: 'CATCH', title: 'Collect\n& Win',    color: COLORS.gold,   shadow: SHADOW.gold,   route: 'Catch',   icon: 'trophy',  message: 'This only works 4 symbols to catch which are the curacha, vinta, weave, and the lantaka.' },
];

// Home walkthrough, spoken by the guide. Refs are attached in the component;
// `scrollable` targets live in the Home ScrollView and are scrolled into view.
const TOUR_STEPS = [
  { key: 'notif', title: 'Your notice board', refKey: 'bellRef', radius: 26,
    text: "Mabuhay, explorer! This bell is your notice board. Trip alerts, XP rewards and new badges show up here." },
  { key: 'stats', title: 'XP and coins', refKey: 'statsRef', radius: 26,
    text: 'Here are your XP and coins. Earn XP to level up and unlock more places. Coins come from the Store.' },
  { key: 'quests', title: 'Choose your quest', refKey: 'qaRowRef', scrollable: true,
    text: 'Pick a quest! AR Museum for the National Museum exhibits, QR Discover to scan codes at tourist spots, and Catch & Win to hunt cultural symbols around the city.' },
  { key: 'map', title: 'Explore Zamboanga', refKey: 'mapCardRef', scrollable: true,
    text: 'This map shows the heritage spots of Zamboanga City. Tap it to open the full map and get directions.' },
  { key: 'places', title: 'Places to experience', refKey: 'placesRef', scrollable: true,
    text: 'Swipe through these places to choose your next stop. Tap one to read its story before you go.' },
  { key: 'tabs', title: 'Your menu', radius: TAB_BAR_HEIGHT / 2 + 8,
    text: 'Down here: Explore is home, Promote lets you feature a place, the Store sells coins, Badges shows your journey and the leaderboard, and Profile is you.',
    getRect: (insets, w, h) => {
      const bottom = Math.max(insets.bottom, 8) + TAB_BAR_GAP;
      return { x: TAB_BAR_SIDE_MARGIN, y: h - bottom - TAB_BAR_HEIGHT, width: w - TAB_BAR_SIDE_MARGIN * 2, height: TAB_BAR_HEIGHT };
    } },
  { key: 'done', title: "You're all set!", ctaLabel: "Let's Go!",
    text: "That's the tour! Head to a tourist spot, scan your first QR code and start earning XP. I'll be with you every step." },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation, route }) {
  const tabBarSpace = useTabBarSpace();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQa, setSelectedQa] = useState(null);
  const [spots, setSpots] = useState([]);
  const [profile, setProfile] = useState(null);
  const userXp = profile?.xp || 0;
  const userLevel = Math.floor(userXp / 100) + 1;
  const [featuredPlaces, setFeaturedPlaces] = useState([]);
  const [promotedPlaces, setPromotedPlaces] = useState([]);
  const [coins, setCoins] = useState(null);
  const [showTour, setShowTour] = useState(false);
  // Guide greeting right after login; the streak reward waits until it closes.
  const greetingPending = useRef(!!route?.params?.justLoggedIn);
  const tourPending = useRef(!!route?.params?.showOnboarding);
  const streakAfterGreeting = useRef(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [streakData, setStreakData] = useState({ streak: 1, claimedToday: false, canClaim: false });
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [claimingStreak, setClaimingStreak] = useState(false);
  const { notifs, addNotification } = useApp();
  const prevSpotCountRef = useRef(0);
  const notifiedPromosRef = useRef(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categoryTabs = useMemo(() => [
    { id: 'all', label: 'All', icon: 'sparkles', count: spots.length + promotedPlaces.length, color: COLORS.accent },
    { id: 'qr', label: 'QR', icon: 'qr-code-outline', count: spots.filter(s => s.feature_types?.includes('qr')).length, color: COLORS.teal },
    { id: 'catch', label: 'Catch', icon: 'trophy-outline', count: spots.filter(s => s.feature_types?.includes('catch')).length, color: COLORS.gold },
    { id: 'ar', label: 'AR', icon: 'cube-outline', count: spots.filter(s => s.feature_types?.includes('ar')).length, color: '#A855F7' },
    ...(promotedPlaces.length > 0 ? [{ id: 'sponsored', label: 'Sponsored', icon: 'megaphone-outline', count: promotedPlaces.length, color: '#F59E0B' }] : []),
  ], [spots, promotedPlaces]);

  const displayedPlaces = useMemo(() => {
    if (selectedCategory === 'sponsored') return [];
    if (selectedCategory === 'qr') return spots.filter(s => s.feature_types?.includes('qr'));
    if (selectedCategory === 'catch') return spots.filter(s => s.feature_types?.includes('catch'));
    if (selectedCategory === 'ar') return spots.filter(s => s.feature_types?.includes('ar'));
    return [...spots].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
  }, [spots, selectedCategory]);

  const displayedSponsored = useMemo(
    () => (selectedCategory === 'all' || selectedCategory === 'sponsored' ? promotedPlaces : []),
    [selectedCategory, promotedPlaces]
  );

  // Rebuilt only when the pins change, so the 15 s refresh doesn't reload the map.
  const miniMapHtml = useMemo(() => buildMiniMapHTML(spots, userLevel), [spots, userLevel]);
  const miniMapSource = useMemo(() => ({ html: miniMapHtml, baseUrl: 'https://localhost' }), [miniMapHtml]);

  const openPlace = useCallback(
    (place) => navigation.navigate('Details', { destination: place.destination, userLevel }),
    [navigation, userLevel]
  );

  // Featured quest card rotates every 5 s: admin-featured spots the player can
  // enter; if fewer than two, every open spot (featured first) so it still cycles.
  const featuredList = useMemo(() => {
    const open = spots.filter((s) => !s.required_level || s.required_level <= userLevel);
    const featured = open.filter((s) => s.is_featured);
    if (featured.length >= 2) return featured;
    const rest = open.filter((s) => !s.is_featured);
    const list = [...featured, ...rest];
    return list.length ? list : spots.slice(0, 1);
  }, [spots, userLevel]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featureFade = useRef(new Animated.Value(1)).current;
  const featuredSpot = featuredList.length ? featuredList[featuredIndex % featuredList.length] : null;

  useEffect(() => {
    if (featuredList.length < 2) return undefined;
    const id = setInterval(() => {
      Animated.timing(featureFade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setFeaturedIndex((i) => (i + 1) % featuredList.length);
        Animated.timing(featureFade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(id);
  }, [featuredList.length, featureFade]);

  // Cards for the Places to Experience deck (sponsored first, then spots).
  const deckPlaces = useMemo(() => {
    const TYPE = {
      qr:    { label: 'QR DISCOVERY',  icon: 'search', color: COLORS.teal },
      ar:    { label: 'AR EXPERIENCE', icon: 'camera', color: '#7EA6FF' },
      catch: { label: 'COLLECT & WIN', icon: 'trophy', color: COLORS.gold },
    };
    const sponsored = displayedSponsored.map((p) => {
      const image = formatImageUrl(p.image_file);
      return {
        key: `promo-${p.id}`,
        title: p.spot_name,
        image,
        typeLabel: 'SPONSORED',
        typeIcon: 'megaphone',
        color: COLORS.gold,
        locked: false,
        subtitle: 'Promoted Place',
        chips: [
          { icon: 'megaphone', label: 'Sponsored' },
          { icon: 'star', label: p.is_place ? 'Place' : 'Business' },
        ],
        destination: {
          title: p.spot_name,
          location: 'Promoted Place',
          description: p.description,
          images: [image],
          latitude: p.latitude,
          longitude: p.longitude,
          sponsored: true,
        },
      };
    });
    const places = displayedPlaces.map((d) => {
      const primaryType = d.feature_types?.[0] || 'qr';
      const t = TYPE[primaryType] || TYPE.qr;
      const isLocked = !!d.required_level && d.required_level > userLevel;
      const images = [d.image, d.image2, d.image3].filter(Boolean).map(formatImageUrl);
      return {
        key: `spot-${d.id}`,
        title: d.name,
        image: images[0] || null,
        typeLabel: t.label,
        typeIcon: t.icon,
        color: t.color,
        locked: isLocked,
        subtitle: d.location_name || 'Zamboanga City',
        chips: [
          { icon: t.icon, label: (d.feature_types || [primaryType]).map((f) => f.toUpperCase()).join(' · ') },
          { icon: 'zap', label: `+${d.xp_reward || 50} XP` },
          ...(isLocked ? [{ icon: 'lock', label: `Lv ${d.required_level}` }] : []),
        ],
        destination: {
          id: d.id,
          title: d.name,
          location: d.location_name,
          description: d.description,
          historical_background: d.historical_background,
          cultural_significance: d.cultural_significance,
          fun_fact: d.fun_fact,
          image: images[0] || null,
          images,
          feature_types: d.feature_types || [],
          required_level: d.required_level,
          xp_reward: d.xp_reward,
          is_featured: d.is_featured,
          latitude: d.latitude,
          longitude: d.longitude,
        },
      };
    });
    return [...sponsored, ...places];
  }, [displayedSponsored, displayedPlaces, userLevel]);

  const bellRef    = useRef(null);
  const statsRef   = useRef(null);
  const mapCardRef = useRef(null);
  const qaRowRef   = useRef(null);
  const placesRef  = useRef(null);
  const scrollRef  = useRef(null);
  const scrollYRef = useRef(0);
  const refs = { bellRef, statsRef, mapCardRef, qaRowRef, placesRef };
  const tourSteps = TOUR_STEPS.map((s) => (s.refKey ? { ...s, targetRef: refs[s.refKey] } : s));
  const reloadRef = useRef(null);

  useEffect(() => {
    const fetchSpotsAndPromotions = async () => {
      try {
        const [data, profileData] = await Promise.all([
          getSpots(),
          authService.getProfile().catch(() => null),
        ]);
        if (profileData) setProfile(profileData);
        getWallet().then((w) => setCoins(w?.balance ?? 0)).catch(() => {});
        const allSpots = Array.isArray(data) ? data : (data.results || []);
        setSpots(allSpots);
        setFeaturedPlaces(allSpots.filter(s => s.is_featured));
        if (prevSpotCountRef.current > 0 && allSpots.length > prevSpotCountRef.current) {
          addNotification({ type: 'admin', icon: 'pin', title: 'New Place Added!', sub: 'The admin just posted a new place to experience. Check it out on the map!' });
        }
        prevSpotCountRef.current = allSpots.length;
        const promoData = await getPublishedPromotions();
        const publishedPromos = Array.isArray(promoData) ? promoData : (promoData.results || []);
        setPromotedPlaces(publishedPromos.filter(p => p.is_place));

        // Check for user promotions approved by admin
        getPromotions().then(userPromos => {
          const list = Array.isArray(userPromos) ? userPromos : (userPromos?.results || []);
          list.forEach(p => {
            if (p.status === 'APPROVED_PENDING_PAYMENT') {
              const notifId = `promo-approved-${p.id}`;
              if (!notifiedPromosRef.current.has(notifId)) {
                notifiedPromosRef.current.add(notifId);
                addNotification({
                  id: notifId,
                  type: 'promo',
                  icon: 'party',
                  title: 'Promotion Approved!',
                  sub: `"${p.spot_name}" was approved by admin! Tap to pay with coins & publish.`,
                  screen: 'MyPromotions',
                });
              }
            }
          });
        }).catch(() => {});
      } catch (e) {
        console.log('Home fetch error', e);
      }
    };
    reloadRef.current = fetchSpotsAndPromotions;
    fetchSpotsAndPromotions();
    const interval = setInterval(fetchSpotsAndPromotions, 15000);

    // Check login streak and show modal if eligible
    const checkStreak = async () => {
      try {
        const streakInfo = await streakService.recordLoginStreak();
        setStreakData(streakInfo);
        if (streakInfo.canClaim) {
          if (greetingPending.current || tourPending.current) {
            streakAfterGreeting.current = true;
          } else {
            setTimeout(() => {
              setStreakModalVisible(true);
            }, 700);
          }
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
          icon: 'flame',
          title: 'Daily Streak Bonus!',
          sub: `You claimed +10 XP for Day ${streakData.streak} login streak!`,
        });
      }
    } catch (e) {
      setClaimingStreak(false);
    }
  };

  // Show the guide once the profile (IGN) is in, or after 3 s if it is slow.
  useEffect(() => {
    if (!greetingPending.current) return undefined;
    const open = () => {
      if (!greetingPending.current) return;
      greetingPending.current = false;
      setGreetingVisible(true);
    };
    if (profile) {
      const t = setTimeout(open, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(open, 3000);
    return () => clearTimeout(t);
  }, [profile]);

  const closeGreeting = () => {
    setGreetingVisible(false);
    if (streakAfterGreeting.current) {
      streakAfterGreeting.current = false;
      setTimeout(() => setStreakModalVisible(true), 400);
    }
  };

  const finishTour = () => {
    setShowTour(false);
    tourPending.current = false;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    if (streakAfterGreeting.current) {
      streakAfterGreeting.current = false;
      setTimeout(() => setStreakModalVisible(true), 500);
    }
  };

  useEffect(() => {
    if (route?.params?.showOnboarding) {
      const t = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerButtons = (
    <>
      <TouchableOpacity
        ref={bellRef}
        style={styles.headerBtn}
        onPress={() => navigation.navigate('Notifications')}
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={20} color="#FFF" />
        {notifs.some(n => !n.read) && <View style={styles.unreadBadge} />}
      </TouchableOpacity>
      <View ref={statsRef} collapsable={false} style={styles.statsPill}>
        <LucideIcon name="zap" size={15} color={COLORS.gold} />
        <Text style={styles.statsPillText}>{userXp.toLocaleString()}</Text>
        <View style={styles.statsPillDivider} />
        <Ionicons name="logo-bitcoin" size={15} color={COLORS.gold} />
        <Text style={styles.statsPillText}>{(coins ?? 0).toLocaleString()}</Text>
      </View>
    </>
  );

  return (
    <ParallaxHeroLayout
      hero={<GuideWelcome />}
      header={headerButtons}
      bottomSpace={tabBarSpace}
      scrollRef={scrollRef}
      onScrollY={(y) => { scrollYRef.current = y; }}
      onRefresh={() => reloadRef.current?.()}
      overlay={(
        <>
        <CustomModal
          visible={modalVisible}
          title={selectedQa ? selectedQa.title.replace('\n', ' ') : 'Feature Notice'}
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

        <GuideSpeechModal
          visible={greetingVisible}
          steps={[{
            text: `Mabuhay, ${profile?.in_game_name || 'Explorer'}! I'm your LAKBAY guide. Scan, catch and explore Zamboanga's heritage — I'll be with you every step.`,
          }]}
          onClose={closeGreeting}
        />

        <OnboardingTour
          visible={showTour}
          steps={tourSteps}
          onFinish={finishTour}
          scrollRef={scrollRef}
          scrollYRef={scrollYRef}
        />
        </>
      )}
    >

          {/* ── Choose Your Quest (category tiles) ── */}
          <View style={styles.section}>
            <View style={styles.placesHeader}>
              <Text style={styles.guideSectionTitle}>Choose Your Quest</Text>
            </View>

            <View ref={qaRowRef} collapsable={false} style={styles.catRow}>
              {CATEGORY_TILES.map((tile) => (
                <TouchableOpacity
                  key={tile.key}
                  style={[styles.catTile, { backgroundColor: tile.bg, borderColor: tile.color + '55' }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    const qa = QA_CARDS.find((q) => q.badge === tile.qa);
                    if (qa) { setSelectedQa(qa); setModalVisible(true); }
                    else navigation.navigate(tile.route);
                  }}
                >
                  <View style={[styles.catIcon, { backgroundColor: tile.color }]}>
                    <LucideIcon name={tile.icon} size={24} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.catLabel, { color: onWhite(tile.color) }]} numberOfLines={1}>{tile.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Featured quest card ── */}
          {featuredSpot && (
            <View style={styles.section}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  const place = deckPlaces.find((p) => p.key === `spot-${featuredSpot.id}`);
                  if (place) navigation.navigate('Details', { destination: place.destination, userLevel });
                }}
              >
                <VintaCard contentStyle={styles.featureCard}>
                  <Animated.View style={{ opacity: featureFade }}>
                  <View style={styles.featureTop}>
                    <View style={styles.featureChip}>
                      <LucideIcon name="zap" size={13} color={GOLD_TEXT} />
                      <Text style={styles.featureChipText}>+{featuredSpot.xp_reward || 50}</Text>
                    </View>
                    <View style={styles.featureChip}>
                      <LucideIcon name="shield" size={13} color={COLORS.teal} />
                      <Text style={styles.featureChipText}>Lv {featuredSpot.required_level || 1}</Text>
                    </View>
                  </View>
                  <View style={styles.featureBody}>
                    <Image source={GUIDE_IMAGE} style={styles.featureGuide} resizeMode="contain" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureKicker}>{featuredSpot.is_featured ? 'Featured Quest' : 'Quest Unlocked'}</Text>
                      <Text style={styles.featureTitle} numberOfLines={2}>{featuredSpot.name}</Text>
                    </View>
                  </View>
                  </Animated.View>
                  {featuredList.length > 1 && (
                    <View style={styles.featureDots}>
                      {featuredList.map((s, i) => (
                        <View
                          key={s.id}
                          style={[styles.featureDot, i === featuredIndex % featuredList.length && styles.featureDotActive]}
                        />
                      ))}
                    </View>
                  )}
                </VintaCard>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Explore Zamboanga (map preview) ── */}
          <View style={styles.section}>
            <View style={styles.placesHeader}>
              <Text style={styles.guideSectionTitle}>Explore Zamboanga</Text>
            </View>

            <TouchableOpacity
              ref={mapCardRef}
              activeOpacity={0.92}
              onPress={() => navigation.navigate('Map')}
              style={styles.mapCard}
            >
              <WebView
                source={miniMapSource}
                style={styles.map}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                scrollEnabled={false}
                mixedContentMode="always"
                pointerEvents="none"
              />

              <View style={styles.mapPanel} pointerEvents="none">
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapPanelTitle}>{spots.length} heritage spots</Text>
                  <View style={styles.mapLegend}>
                    {MAP_LEGEND.map((t) => (
                      <View key={t.key} style={styles.mapLegendItem}>
                        <View style={[styles.mapLegendDot, { backgroundColor: SPOT_TYPES[t.key].color }]} />
                        <Text style={styles.mapLegendText}>
                          {spots.filter((s) => s.feature_types?.includes(t.key)).length} {t.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.mapGoBtn}>
                  <Ionicons name="navigate" size={20} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Places to Experience (stacked card deck) ── */}
          {(promotedPlaces.length > 0 || spots.length > 0) && (
            <View ref={placesRef} collapsable={false} style={styles.section}>
              <View style={styles.placesHeader}>
                <Text style={styles.guideSectionTitle}>Places to Experience</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.placeChips}
              >
                {categoryTabs.map((tab) => {
                  const isActive = selectedCategory === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={[styles.placeChip, isActive && styles.placeChipActive]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedCategory(tab.id)}
                    >
                      <Text style={[styles.placeChipText, isActive && styles.placeChipTextActive]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {deckPlaces.length === 0 ? (
                <VintaCard style={styles.categoryEmptyFrame} contentStyle={styles.categoryEmptyCard}>
                  <Ionicons name="compass-outline" size={38} color={COLORS.textFaint} />
                  <Text style={styles.categoryEmptyTitle}>No Quests Found</Text>
                  <Text style={styles.categoryEmptySub}>Check back soon.</Text>
                </VintaCard>
              ) : (
                <PlaceDeck
                  places={deckPlaces}
                  onOpen={openPlace}
                />
              )}
            </View>
          )}
    </ParallaxHeroLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(12,36,97,0.72)',
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
  statsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(12,36,97,0.72)', borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  statsPillText: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 14, color: '#FFFFFF' },
  statsPillDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  guideSectionTitle: { fontFamily: GUIDE_FONTS.bold, fontSize: 19, color: COLORS.navy },
  catRow: { flexDirection: 'row', gap: 10 },
  catTile: {
    flex: 1, height: 108, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  catIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 12 },
  featureCard: { padding: 14, backgroundColor: '#FFF8E6' },
  featureTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  featureChipText: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 12, color: COLORS.navy },
  featureBody: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  featureGuide: { width: 112, height: 140, marginLeft: -8, marginBottom: -14 },
  featureDots: { flexDirection: 'row', justifyContent: 'flex-end', gap: 5, marginTop: 10 },
  featureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(12,36,97,0.2)' },
  featureDotActive: { width: 18, backgroundColor: '#D97706' },
  featureKicker: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 12, color: '#D97706' },
  featureTitle: { fontFamily: GUIDE_FONTS.bold, fontSize: 22, lineHeight: 27, color: COLORS.navy, marginTop: 2 },
  mapCard: {
    height: 250, borderRadius: 28, overflow: 'hidden',
    borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#DDE7F5',
    ...SHADOW.card,
  },
  mapPanel: {
    position: 'absolute', left: 10, right: 10, bottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 22,
    paddingVertical: 12, paddingLeft: 16, paddingRight: 10,
    ...SHADOW.card,
  },
  mapPanelTitle: { fontFamily: GUIDE_FONTS.bold, fontSize: 15, color: COLORS.navy },
  mapLegend: { flexDirection: 'row', gap: 12, marginTop: 6 },
  mapLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mapLegendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#FFFFFF', elevation: 1 },
  mapLegendText: { fontFamily: GUIDE_FONTS.medium, fontSize: 12, color: COLORS.textSub },
  mapGoBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 3, borderBottomColor: COLORS.accentDark,
  },
  placesHeader: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  placeChips: { gap: 8, paddingBottom: 6, paddingRight: 8 },
  placeChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border,
  },
  placeChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  placeChipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textSub },
  placeChipTextActive: { color: '#FFFFFF', fontFamily: FONTS.bold },

  map: {
    flex: 1,
    backgroundColor: '#DDE7F5',
  },


  // ── Quest Board ─────────────────────────────────────────────────────────

  // ── Quest Card ───────────────────────────────────────────────────
  categoryEmptyFrame: {
    marginVertical: 10,
  },
  categoryEmptyCard: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.navy,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  categoryEmptySub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
});
