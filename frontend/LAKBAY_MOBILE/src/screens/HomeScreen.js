import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  StatusBar, Animated, Image, ImageBackground, Dimensions,
} from 'react-native';
import { COLORS, FONTS, SHADOW, BG_OVERLAY, GOLD_TEXT, GUIDE_FONTS, onWhite } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import LucideIcon from '../components/LucideIcon';
import PlaceDeck from '../components/PlaceDeck';
import GuideWelcome from '../components/GuideWelcome';
import GuideSpeechModal from '../components/GuideSpeechModal';
import { SPOT_TYPES } from '../constants/mapConfig';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import DailyStreakModal from '../components/DailyStreakModal';
import VintaStripe from '../components/VintaStripe';
import { useTabBarSpace } from '../navigation/tabBarLayout';
import OnboardingTour from '../components/OnboardingTour';
import { WebView } from 'react-native-webview';
import { useApp } from '../context/AppContext';
import { getSpots, ORIGIN } from '../api/qrService';
import { getPublishedPromotions, getPromotions, getWallet } from '../api/promotionService';
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

const TOUR_STEPS = [
  { key: 'notif', icon: 'notifications-outline', color: COLORS.gold,   title: 'Stay In The Loop',    text: 'Tap the bell anytime to see trip alerts, XP rewards, and badge unlocks.', refKey: 'bellRef' },
  { key: 'map',   icon: 'map-outline',            color: COLORS.accent, title: 'Explore The Map',     text: 'This live map shows every heritage site in Zamboanga City. Tap it to open the full interactive map and start planning your route.', refKey: 'mapCardRef' },
  { key: 'quick', icon: 'flash-outline',          color: COLORS.teal,   title: 'Choose Your Quest',   text: 'Pick a quest: scan QR codes at tourist spots, catch hidden cultural symbols, and unlock AR exhibits at the museum — every action earns you XP!', refKey: 'qaRowRef' },
  { key: 'tabs',  icon: 'trophy-outline',         color: COLORS.gold,   title: 'Track Your Journey',  text: "Visit the Badges tab to see what you've unlocked, or Profile to check your level, XP bar, and explorer identity.", getRect: (insets, w, h) => { const tabBarHeight = 70 + insets.bottom; return { x: 8, y: h - tabBarHeight + 4, width: w - 16, height: tabBarHeight - 8 }; } },
  { key: 'done',  icon: 'rocket-outline',         color: COLORS.accent, title: "You're All Set!",      text: 'Time to start exploring Zamboanga City. Good luck, explorer!', ctaLabel: "Let's Go!" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation, route }) {
  const tabBarSpace = useTabBarSpace();
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
  const [coins, setCoins] = useState(null);
  const [showTour, setShowTour] = useState(false);
  // Guide greeting right after login; the streak reward waits until it closes.
  const greetingPending = useRef(!!route?.params?.justLoggedIn);
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
        tiles: [
          { icon: 'megaphone', label: 'Listing', value: 'Sponsored' },
          { icon: 'pin', label: 'Location', value: p.is_place ? 'Place' : 'Business' },
          { icon: 'compass', label: 'Activity', value: 'Visit & Discover' },
          { icon: 'star', label: 'Status', value: 'Featured' },
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
        tiles: [
          { icon: t.icon, label: 'Quest', value: (d.feature_types || [primaryType]).map((f) => f.toUpperCase()).join(' · ') },
          { icon: 'zap', label: 'Reward', value: `+${d.xp_reward || 50} XP` },
          { icon: isLocked ? 'lock' : 'shield', label: 'Level', value: isLocked ? `Locked · Lv ${d.required_level}` : `Lv ${d.required_level || 1}` },
          { icon: 'pin', label: 'Location', value: d.location_name || 'Zamboanga City' },
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
    fetchSpotsAndPromotions();
    const interval = setInterval(fetchSpotsAndPromotions, 15000);

    // Check login streak and show modal if eligible
    const checkStreak = async () => {
      try {
        const streakInfo = await streakService.recordLoginStreak();
        setStreakData(streakInfo);
        if (streakInfo.canClaim) {
          if (greetingPending.current) {
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

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

      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── Top bar: notifications + XP / coins ── */}
        <View style={styles.header}>
          <TouchableOpacity
            ref={bellRef}
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#FFF" />
            {notifs.some(n => !n.read) && <View style={styles.unreadBadge} />}
          </TouchableOpacity>
          <View style={styles.statsPill}>
            <LucideIcon name="zap" size={15} color={COLORS.gold} />
            <Text style={styles.statsPillText}>{userXp.toLocaleString()}</Text>
            <View style={styles.statsPillDivider} />
            <Ionicons name="logo-bitcoin" size={15} color={COLORS.gold} />
            <Text style={styles.statsPillText}>{(coins ?? 0).toLocaleString()}</Text>
          </View>
        </View>
        <VintaStripe height={4} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]}
        >
          {/* ── Guide welcome ── */}
          <Animated.View style={{ opacity: heroFade, transform: [{ translateY: heroSlide }] }}>
            <GuideWelcome />
          </Animated.View>

          {/* ── Choose Your Quest (category tiles) ── */}
          <View style={styles.section}>
            <View style={styles.placesHeader}>
              <View style={styles.categoryTitleRow}>
                <Text style={styles.guideSectionTitle}>Choose Your Quest</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{spots.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Map')} hitSlop={8} style={styles.viewAllRow}>
                <Text style={[styles.seeAllText, { fontFamily: GUIDE_FONTS.semiBold, fontSize: 13 }]}>View all</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.gold} />
              </TouchableOpacity>
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
                    <View style={styles.flameBtn}>
                      <LucideIcon name="flame" size={20} color="#F97316" />
                    </View>
                  </View>
                  <View style={styles.featureBody}>
                    <Image source={GUIDE_IMAGE} style={styles.featureGuide} resizeMode="contain" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureKicker}>{featuredSpot.is_featured ? 'Featured Quest' : 'Quest Unlocked'}</Text>
                      <Text style={styles.featureTitle} numberOfLines={2}>{featuredSpot.name}</Text>
                      <Text style={styles.featureDesc} numberOfLines={3}>
                        {featuredSpot.description || 'Visit this spot to discover its story and earn XP.'}
                      </Text>
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
              <Text style={[styles.guideSectionTitle, { flex: 1 }]}>Explore Zamboanga</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Map')} hitSlop={8} style={styles.viewAllRow}>
                <Text style={[styles.seeAllText, { fontFamily: GUIDE_FONTS.semiBold, fontSize: 13 }]}>Open map</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.gold} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              ref={mapCardRef}
              activeOpacity={0.92}
              onPress={() => navigation.navigate('Map')}
              style={styles.mapCard}
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

              <View style={styles.mapTopRow} pointerEvents="none">
                <View style={styles.mapGlassChip}>
                  <LucideIcon name="pin" size={14} color="#FFFFFF" />
                  <Text style={styles.mapGlassText}>Zamboanga City</Text>
                </View>
                <View style={styles.mapGlassRound}>
                  <LucideIcon name="compass" size={18} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.mapPanel} pointerEvents="none">
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapPanelTitle}>{spots.length} heritage spots near you</Text>
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
            <View style={styles.section}>
              <View style={styles.placesHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.eyebrowRow}>
                    <LucideIcon name="swords" size={11} color={COLORS.teal} />
                    <Text style={styles.sectionEyebrow}>ACTIVE QUESTS</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Places to Experience</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Map')} hitSlop={8}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
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
                        {tab.label} · {tab.count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {deckPlaces.length === 0 ? (
                <VintaCard style={styles.categoryEmptyFrame} contentStyle={styles.categoryEmptyCard}>
                  <Ionicons name="compass-outline" size={38} color={COLORS.textFaint} />
                  <Text style={styles.categoryEmptyTitle}>No Quests Found</Text>
                  <Text style={styles.categoryEmptySub}>
                    There are currently no active spots in this category. Check back soon for new expeditions!
                  </Text>
                </VintaCard>
              ) : (
                <PlaceDeck
                  places={deckPlaces}
                  onOpen={openPlace}
                />
              )}
            </View>
          )}

        </ScrollView>

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
    backgroundColor: BG_OVERLAY,
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
  statsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  statsPillText: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 14, color: '#FFFFFF' },
  statsPillDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  guideSectionTitle: { fontFamily: GUIDE_FONTS.bold, fontSize: 19, color: '#FFFFFF' },
  categoryTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: {
    minWidth: 30, height: 26, borderRadius: 13, paddingHorizontal: 8,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 13, color: '#FFFFFF' },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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
  flameBtn: {
    marginLeft: 'auto', width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  featureBody: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  featureGuide: { width: 112, height: 140, marginLeft: -8, marginBottom: -14 },
  featureDots: { flexDirection: 'row', justifyContent: 'flex-end', gap: 5, marginTop: 10 },
  featureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(12,36,97,0.2)' },
  featureDotActive: { width: 18, backgroundColor: '#D97706' },
  featureKicker: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 12, color: '#D97706' },
  featureTitle: { fontFamily: GUIDE_FONTS.bold, fontSize: 22, lineHeight: 27, color: COLORS.navy, marginTop: 2 },
  featureDesc: { fontFamily: GUIDE_FONTS.regular, fontSize: 12, lineHeight: 18, color: COLORS.textSub, marginTop: 4 },
  mapCard: {
    height: 250, borderRadius: 28, overflow: 'hidden',
    borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#DDE7F5',
    ...SHADOW.card,
  },
  mapTopRow: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  mapGlassChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(12,36,97,0.72)', borderRadius: 18,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  mapGlassText: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 12, color: '#FFFFFF' },
  mapGlassRound: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(12,36,97,0.72)', alignItems: 'center', justifyContent: 'center',
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
  seeAllText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold, marginBottom: 2 },
  placeChips: { gap: 8, paddingBottom: 6, paddingRight: 8 },
  placeChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border,
  },
  placeChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  placeChipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textSub },
  placeChipTextActive: { color: '#FFFFFF', fontFamily: FONTS.bold },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
