import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, Image, Animated, Easing, ImageBackground,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { authService } from '../api/authService';
import { getMyScans, getSpots, getARTargets } from '../api/qrService';
import VintaStripe from '../components/VintaStripe';

// ─── Rank helpers ─────────────────────────────────────────────────────────────
const getRank = (xp) => {
  if (xp >= 2201) return { title: 'Admiral of the Western Seas', icon: '👑', color: '#FF6B00', glow: 'rgba(255,107,0,0.35)' };
  if (xp >= 1401) return { title: 'Archipelago Voyager',        icon: '⚓', color: '#9B59B6', glow: 'rgba(155,89,182,0.35)' };
  if (xp >= 801)  return { title: 'Harbor Sentinel',            icon: '🛡️', color: '#FBBF24', glow: 'rgba(251,191,36,0.35)' };
  if (xp >= 401)  return { title: 'Strait Navigator',           icon: '🗺️', color: '#10B981', glow: 'rgba(16,185,129,0.35)' };
  if (xp >= 151)  return { title: 'Vinta Helmsman',             icon: '⛵', color: '#38BDF8', glow: 'rgba(56,189,248,0.35)' };
  return                 { title: 'Coastal Scout',              icon: '🧭', color: COLORS.accent, glow: 'rgba(26,86,219,0.35)' };
};

const getCharacterDetails = (charId) => {
  const id = String(charId || '').toLowerCase().trim();
  switch (id) {
    case 'mando': return { name: 'Kuya Mando',    image: require('../assets/characters/lila.jpg'),  zoom: 1.15 };
    case 'bela':  return { name: 'Ate Bela',       image: require('../assets/characters/new.jpg'),   zoom: 1.15 };
    case 'lila':  return { name: 'Ate Lila',       image: require('../assets/characters/ricky.jpg'), zoom: 1.4  };
    case 'dante': return { name: 'Bossing Dante',  image: require('../assets/characters/dante.jpg'), zoom: 1.4  };
    case 'sonya': return { name: 'Ate Sonya',      image: require('../assets/characters/sonya.jpg'), zoom: 1    };
    default:      return { name: 'Kuya Mando',     image: require('../assets/characters/lila.jpg'),  zoom: 1.15 };
  }
};

// ─── Animated XP Arc ─────────────────────────────────────────────────────────
function XPArc({ progressPct, size, rank }) {
  const animVal   = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: progressPct,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [progressPct]);

  const strokeW   = 10;
  const center    = size / 2;
  const radius    = center - strokeW / 2;
  const circ      = 2 * Math.PI * radius;
  const offset    = circ - progressPct * circ;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Glow halo */}
      <Animated.View style={{
        transform: [{ scale: pulseAnim }],
        position: 'absolute',
        width: size + 20, height: size + 20,
        borderRadius: (size + 20) / 2,
        backgroundColor: rank.glow,
        opacity: 0.4,
        top: -10, left: -10,
      }} />
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="xpArc" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0"   stopColor={COLORS.gold}   stopOpacity="1" />
            <Stop offset="0.5" stopColor="#FF8C00"        stopOpacity="1" />
            <Stop offset="1"   stopColor={COLORS.gold}   stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="trackArc" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="rgba(99,179,237,0.35)" stopOpacity="0.4" />
            <Stop offset="1" stopColor="rgba(99,179,237,0.15)"  stopOpacity="0.2" />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={radius} stroke="url(#trackArc)" strokeWidth={strokeW} fill="transparent" />
        <Circle
          cx={center} cy={center} r={radius}
          stroke="url(#xpArc)"
          strokeWidth={strokeW}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          rotation="-90"
          originX={center}
          originY={center}
        />
      </Svg>
    </View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label, color }) {
  return (
    <View style={statStyles.pill}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + '18', borderColor: color + '40' }]}>
        <Text style={statStyles.icon}>{icon}</Text>
      </View>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  pill:     { flex: 1, alignItems: 'center', gap: 4 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  icon:     { fontSize: 16 },
  value:    { fontFamily: FONTS.black, fontSize: 20 },
  label:    { fontFamily: FONTS.medium, fontSize: 9, color: 'rgba(191,215,255,0.70)', letterSpacing: 0.3, textAlign: 'center' },
});

// ─── Menu Item ────────────────────────────────────────────────────────────────
function MenuItem({ item, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scaleAnim, { toValue: 1.0,  useNativeDriver: true }).start();

  const isDestructive = item.id === 'logout';

  return (
    <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={0.9}>
      <Animated.View style={[
        menuStyles.row,
        isDestructive && menuStyles.rowDestructive,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <View style={[
          menuStyles.iconBox,
          { backgroundColor: (item.color || COLORS.accent) + '18', borderColor: (item.color || COLORS.accent) + '40' },
        ]}>
          <Text style={menuStyles.icon}>{item.icon}</Text>
        </View>
        <Text style={[menuStyles.label, item.color && { color: item.color }]}>{item.label}</Text>
        {item.badge && (
          <View style={menuStyles.badge}>
            <Text style={menuStyles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <View style={[menuStyles.chevronBox, isDestructive && menuStyles.chevronBoxDestructive]}>
          <Ionicons name="chevron-forward" size={14} color={item.color || 'rgba(191,215,255,0.7)'} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
const menuStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    padding: 14, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(99, 179, 237, 0.22)',
    ...SHADOW.accent,
  },
  rowDestructive: { borderColor: 'rgba(239,68,68,0.40)', backgroundColor: 'rgba(239,68,68,0.12)' },
  iconBox: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  icon:  { fontSize: 18 },
  label: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 14, color: '#FFFFFF' },
  badge: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 2, marginRight: 10,
  },
  badgeText: { fontFamily: FONTS.bold, fontSize: 10, color: '#fff' },
  chevronBox: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  chevronBoxDestructive: { backgroundColor: 'rgba(239,68,68,0.20)', borderColor: 'rgba(239,68,68,0.40)' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MENU_OPTIONS = [
  { id: 'edit',       icon: '✏️', label: 'Edit Profile'       },
  { id: 'promotions', icon: '📢', label: 'My Promotions'      },
  { id: 'notif',      icon: '🔔', label: 'Notifications'      },
  { id: 'priv',       icon: '🔒', label: 'Privacy & Security' },
  { id: 'help',       icon: '❓', label: 'Help & Support'     },
];

export default function ProfileScreen({ navigation }) {
  const [profile,         setProfile]        = useState(null);
  const [scans,           setScans]          = useState([]);
  const [totalSpots,      setTotalSpots]     = useState(12);
  const [collectedModels, setCollectedModels] = useState([]);
  const [caughtIcons,     setCaughtIcons]     = useState([]);
  const [loading,         setLoading]        = useState(true);

  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [data, scansData, spotsData, collectedModelsStr, caughtIconsStr, storedUid, storedCatchUid] = await Promise.all([
        authService.getProfile(),
        (async () => { try { const s = await (await import('../api/qrService')).getMyScans(); return s; } catch { return null; } })(),
        (async () => { try { const sp = await getSpots(); return sp; } catch { return []; } })(),
        SecureStore.getItemAsync('collected_models').catch(() => null),
        SecureStore.getItemAsync('caught_icons').catch(() => null),
        SecureStore.getItemAsync('collected_models_uid').catch(() => null),
        SecureStore.getItemAsync('caught_icons_uid').catch(() => null),
      ]);
      setProfile(data);
      setScans(scansData?.scans || []);
      if (spotsData?.length > 0) setTotalSpots(spotsData.length);

      const currentUid = String(data?.id || '');

      if (storedUid && currentUid && storedUid !== currentUid) {
        await SecureStore.deleteItemAsync('collected_models');
        await SecureStore.deleteItemAsync('collected_models_uid');
        setCollectedModels([]);
      } else if (collectedModelsStr) {
        try {
          setCollectedModels(JSON.parse(collectedModelsStr));
          if (!storedUid && currentUid) {
            SecureStore.setItemAsync('collected_models_uid', currentUid).catch(() => {});
          }
        } catch {
          setCollectedModels([]);
        }
      } else {
        setCollectedModels([]);
      }

      if (storedCatchUid && currentUid && storedCatchUid !== currentUid) {
        await SecureStore.deleteItemAsync('caught_icons');
        await SecureStore.deleteItemAsync('caught_icons_uid');
        setCaughtIcons([]);
      } else if (caughtIconsStr) {
        try {
          setCaughtIcons(JSON.parse(caughtIconsStr));
          if (!storedCatchUid && currentUid) {
            SecureStore.setItemAsync('caught_icons_uid', currentUid).catch(() => {});
          }
        } catch {
          setCaughtIcons([]);
        }
      } else {
        setCaughtIcons([]);
      }
    } catch (e) {
      console.log('Error fetching profile', e);
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('offline_fullName');
            await SecureStore.deleteItemAsync('offline_email');
            await SecureStore.deleteItemAsync('offline_explorerName');
            await SecureStore.deleteItemAsync('offline_character');
            await SecureStore.deleteItemAsync('collected_models');
            await SecureStore.deleteItemAsync('collected_models_uid');
            await SecureStore.deleteItemAsync('caught_icons');
            await SecureStore.deleteItemAsync('caught_icons_uid');
            navigation.replace('Login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleMenuPress = (id) => {
    if (id === 'logout')          handleLogout();
    else if (id === 'edit')       navigation.navigate('EditProfile');
    else if (id === 'promotions') navigation.navigate('MyPromotions');
    else if (id === 'notif')      navigation.navigate('Notifications');
  };

  // Derived stats
  const xp           = profile?.xp || 0;
  const level        = Math.floor(xp / 100) + 1;
  const levelXp      = xp % 100;
  const progressPct  = levelXp / 100;
  const rank         = getRank(xp);
  const scansCount   = scans.length;
  const arDone       = collectedModels.length;
  const charDetails  = getCharacterDetails(profile?.chosen_character || profile?.character);

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>EXPLORER PROFILE</Text>
            <Text style={styles.headerSub}>ZAMBOANGA ADVENTURE IDENTITY</Text>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        <VintaStripe height={3} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {loading ? (
            <View style={{ paddingTop: 60, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={COLORS.gold} />
              <Text style={{ fontFamily: FONTS.medium, color: 'rgba(191,215,255,0.85)' }}>Loading your profile...</Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              {/* ── Hero Card ── */}
              <View style={styles.heroCard}>
                {/* Background XP glow blob */}
                <View style={[styles.heroBlobBg, { backgroundColor: rank.glow }]} />

                {/* Avatar + XP Ring */}
                <View style={styles.avatarWrapper}>
                  <XPArc size={160} progressPct={progressPct} rank={rank} />
                  {/* Avatar sits inside the arc */}
                  <View style={styles.avatarInner}>
                    <View style={styles.avatarImgClip}>
                      <Image
                        source={charDetails.image}
                        style={{ width: '100%', height: '100%', transform: [{ scale: charDetails.zoom || 1 }] }}
                        resizeMode="cover"
                      />
                    </View>
                    {/* Rank badge on avatar */}
                    <View style={[styles.rankBadge, { backgroundColor: rank.color, borderColor: rank.color + 'AA' }]}>
                      <Text style={styles.rankBadgeIcon}>{rank.icon}</Text>
                    </View>
                  </View>
                </View>

                {/* Name & rank info */}
                <Text style={styles.userName}>{profile?.full_name || '—'}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View style={[styles.rankPill, { borderColor: rank.color + '66', backgroundColor: rank.color + '22' }]}>
                    <Text style={[styles.rankPillText, { color: rank.color }]}>{rank.icon}  {rank.title}</Text>
                  </View>
                  <View style={styles.levelPill}>
                    <Text style={styles.levelPillText}>LVL {level}</Text>
                  </View>
                </View>

                {/* Explorer tag */}
                <View style={styles.explorerTag}>
                  <Text style={styles.explorerTagText}>✦  {profile?.in_game_name || 'Zamboanga Explorer'}  ✦</Text>
                </View>

                {/* Companion chip */}
                <View style={styles.companionChip}>
                  <View style={styles.companionImgClip}>
                    <Image source={charDetails.image} style={{ width: '100%', height: '100%', transform: [{ scale: charDetails.zoom || 1 }] }} resizeMode="cover" />
                  </View>
                  <Text style={styles.companionText}>Companion: <Text style={{ color: COLORS.accent, fontFamily: FONTS.bold }}>{charDetails.name}</Text></Text>
                </View>

                {/* XP progress bar */}
                <View style={styles.xpBarSection}>
                  <View style={styles.xpBarRow}>
                    <Text style={styles.xpBarLabel}>⚡ {xp.toLocaleString()} XP</Text>
                    <Text style={styles.xpBarLabel}>{levelXp} / 100 to LVL {level + 1}</Text>
                  </View>
                  <View style={styles.xpBarBg}>
                    <View style={[styles.xpBarFill, { width: `${Math.round(progressPct * 100)}%` }]} />
                    <View style={styles.xpBarShine} />
                  </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <StatPill icon="🔍" value={scansCount.toString()}  label="QR Scanned"  color={COLORS.teal}   />
                  <View style={styles.statDivider} />
                  <StatPill icon="📸" value={arDone.toString()}       label="AR Explored" color={COLORS.accent} />
                  <View style={styles.statDivider} />
                  <StatPill icon="⚡" value={xp.toLocaleString()}     label="Total XP"    color={COLORS.gold}   />
                </View>
              </View>

              {/* ── Achievement Teaser ── */}
              <TouchableOpacity
                style={styles.achievementTeaser}
                onPress={() => navigation.navigate('Badges')}
                activeOpacity={0.85}
              >
                <View style={styles.achievementLeft}>
                  <Text style={styles.achievementEmoji}>🏆</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.achievementTitle}>Quests, Badges &amp; Collections</Text>
                    <Text style={styles.achievementSub}>View your 3D models &amp; discovery certificates</Text>
                  </View>
                </View>
                <View style={styles.achievementChevron}>
                  <Ionicons name="chevron-forward" size={15} color={COLORS.gold} />
                </View>
              </TouchableOpacity>

              {/* ── Menu ── */}
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>ACCOUNT &amp; SETTINGS</Text>
                <View style={styles.menuGroup}>
                  {MENU_OPTIONS.map((item, i) => (
                    <React.Fragment key={item.id}>
                      <MenuItem item={item} onPress={() => handleMenuPress(item.id)} />
                      {i < MENU_OPTIONS.length - 1 && <View style={styles.menuSpacer} />}
                    </React.Fragment>
                  ))}
                </View>

                {/* Log out */}
                <View style={{ marginTop: 12 }}>
                  <MenuItem
                    item={{ id: 'logout', icon: '🚪', label: 'Log Out', color: '#EF4444' }}
                    onPress={handleLogout}
                  />
                </View>
              </View>

              {/* Version / branding footer */}
              <View style={styles.footer}>
                <Text style={styles.footerLogo}>⛵  LAKBAY</Text>
                <Text style={styles.footerVersion}>v1.0.0 · Zamboanga City</Text>
              </View>

            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 38, 0.85)',
  },
  container: { flex: 1, backgroundColor: 'transparent' },

  // Header
  header: {
    height: 64,
    backgroundColor: 'rgba(8, 20, 60, 0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 179, 237, 0.20)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 18,
  },
  headerSub: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(191,215,255,0.70)',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },

  scroll: { paddingBottom: 20 },

  // Hero Card
  heroCard: {
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    marginHorizontal: 16, marginTop: 18,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: 'rgba(99, 179, 237, 0.25)',
    paddingBottom: 22,
    paddingTop: 24,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOW.accent,
  },
  heroBlobBg: {
    position: 'absolute',
    top: -40, width: 300, height: 300, borderRadius: 150,
    opacity: 0.18,
  },

  // Avatar
  avatarWrapper: {
    width: 160, height: 160,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarInner: {
    position: 'absolute',
    width: 120, height: 120,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImgClip: {
    width: 110, height: 110, borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(99, 179, 237, 0.40)',
    backgroundColor: 'rgba(8, 20, 60, 0.80)',
  },
  rankBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  rankBadgeIcon: { fontSize: 13 },

  // Name / rank
  userName: {
    fontFamily: FONTS.bold, fontSize: 20,
    color: '#FFFFFF', letterSpacing: 0.5,
    marginBottom: 6,
  },
  rankPill: {
    borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  rankPillText: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.5 },
  levelPill: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  levelPillText: { fontFamily: FONTS.bold, fontSize: 11, color: '#fff', letterSpacing: 0.5 },

  // Explorer tag
  explorerTag: {
    marginTop: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16, paddingVertical: 5,
  },
  explorerTagText: {
    fontFamily: FONTS.semiBold, fontSize: 11,
    color: COLORS.gold, letterSpacing: 1.2,
  },

  // Companion chip
  companionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: 'rgba(99, 179, 237, 0.20)',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  companionImgClip: {
    width: 22, height: 22, borderRadius: 11,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(99, 179, 237, 0.40)',
  },
  companionText: { fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(191,215,255,0.80)' },

  // XP bar
  xpBarSection: { width: '88%', marginTop: 16, gap: 6 },
  xpBarRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  xpBarLabel: { fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(191,215,255,0.75)' },
  xpBarBg: {
    height: 10, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(99, 179, 237, 0.20)',
  },
  xpBarFill: {
    height: '100%', borderRadius: 5,
    backgroundColor: COLORS.gold,
  },
  xpBarShine: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: '45%', borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row', width: '92%',
    marginTop: 18, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(99, 179, 237, 0.15)',
    alignItems: 'center',
  },
  statDivider: {
    width: 1, height: 32,
    backgroundColor: 'rgba(99, 179, 237, 0.18)',
    marginHorizontal: 6,
  },

  // Achievement teaser
  achievementTeaser: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: 'rgba(8, 20, 60, 0.65)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    padding: 14,
    flexDirection: 'row', alignItems: 'center',
    ...SHADOW.accent,
  },
  achievementLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  achievementEmoji: { fontSize: 28 },
  achievementTitle: { fontFamily: FONTS.bold, fontSize: 13, color: '#fff', letterSpacing: 0.3 },
  achievementSub:   { fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(191,215,255,0.70)', marginTop: 2 },
  achievementChevron: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.40)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Menu
  menuSection: { paddingHorizontal: 16, marginTop: 18 },
  menuSectionTitle: {
    fontFamily: FONTS.bold, fontSize: 10,
    color: COLORS.teal, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 10,
  },
  menuGroup: { gap: 8 },
  menuSpacer: { height: 0 },

  // Footer
  footer: { alignItems: 'center', marginTop: 24, gap: 3 },
  footerLogo: { fontFamily: FONTS.pixel, fontSize: 9, color: 'rgba(191,215,255,0.6)', letterSpacing: 2 },
  footerVersion: { fontFamily: FONTS.regular, fontSize: 10, color: 'rgba(191,215,255,0.4)' },
});
