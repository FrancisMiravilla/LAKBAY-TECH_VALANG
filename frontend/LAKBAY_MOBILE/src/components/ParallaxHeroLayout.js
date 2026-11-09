import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Image, Animated, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOW } from '../constants/theme';
import { useVintaRefresh, VintaRefreshIndicator } from './VintaRefresh';

// Tab-page shell (Home, Promote): a photo hero holding a welcome message, then
// one rounded content card that scrolls up over it with a parallax effect.
// The top bar floats over the photo and turns navy (with a thin vinta strip)
// once the card reaches it.

const { height: SH } = Dimensions.get('window');
export const HEADER_HEIGHT = 48;
const HERO_HEIGHT = Math.round(SH * 0.46);
const SHEET_OVERLAP = 28; // how far the content card rises over the hero photo
const SHEET_BG = COLORS.bgCardAlt;
const SAIL_COLORS = ['#2B3990', '#E8559A', '#F6C431', '#E2412B', '#1F7A3D', '#F39A3D', '#2B3990'];
const DEFAULT_IMAGE = require('../assets/home_hero_vinta.jpg');

export default function ParallaxHeroLayout({
  hero,
  header,
  headerTitle,
  overlay,
  children,
  image = DEFAULT_IMAGE,
  bottomSpace = 0,
  scrollRef,
  onScrollY,
  scrollProps,
  onRefresh,
}) {
  const { refreshing, refreshControl } = useVintaRefresh(onRefresh);
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [heroFade] = useState(() => new Animated.Value(0));
  const [heroSlide] = useState(() => new Animated.Value(24));
  const onScrollYRef = useRef(onScrollY);
  onScrollYRef.current = onScrollY;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [heroFade, heroSlide]);

  // Parallax: the photo drifts at half the scroll speed (and stretches on
  // pull-down) while the content card slides up over it.
  const anim = useMemo(() => {
    const clamp = (inputRange, outputRange) => scrollY.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
    return {
      heroTranslate: clamp([-HERO_HEIGHT, 0, HERO_HEIGHT], [HERO_HEIGHT / 2, 0, -HERO_HEIGHT / 2]),
      heroScale: clamp([-HERO_HEIGHT, 0], [2, 1]),
      welcomeOpacity: Animated.multiply(heroFade, clamp([0, HERO_HEIGHT * 0.5], [1, 0])),
      welcomeTranslate: Animated.add(heroSlide, clamp([0, HERO_HEIGHT], [0, HERO_HEIGHT * 0.4])),
      headerBgOpacity: clamp([HERO_HEIGHT - 160, HERO_HEIGHT - 90], [0, 1]),
    };
  }, [scrollY, heroFade, heroSlide]);

  const onScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e) => {
        const y = e.nativeEvent.contentOffset.y;
        onScrollYRef.current?.(y);
      },
    },
  ), [scrollY]);

  const scrollView = (
    <Animated.ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={onRefresh ? refreshControl : undefined}
      {...scrollProps}
    >
      <View style={[styles.heroSpace, { paddingTop: insets.top + HEADER_HEIGHT }]}>
        <Animated.View style={{ opacity: anim.welcomeOpacity, transform: [{ translateY: anim.welcomeTranslate }] }}>
          {hero}
        </Animated.View>
      </View>

      <View style={[styles.sheet, { paddingBottom: bottomSpace, minHeight: SH - insets.top - HEADER_HEIGHT }]}>
        <View style={styles.sheetHandle} />
        {children}
      </View>
    </Animated.ScrollView>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View
        pointerEvents="none"
        style={[styles.hero, { transform: [{ translateY: anim.heroTranslate }, { scale: anim.heroScale }] }]}
      >
        <Image source={image} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(8,20,60,0.55)', 'rgba(8,20,60,0.10)', 'rgba(8,20,60,0.45)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.scrollArea}>
      {scrollView}
      </View>

      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}>
        <Animated.View pointerEvents="none" style={[styles.headerBg, { opacity: anim.headerBgOpacity }]}>
          <View style={styles.sailStripes}>
            {SAIL_COLORS.map((c, i) => <View key={i} style={[styles.sailStripe, { backgroundColor: c }]} />)}
          </View>
        </Animated.View>
        {header}
        {!!headerTitle && (
          <Animated.Text
            pointerEvents="none"
            numberOfLines={1}
            style={[styles.headerTitle, { top: insets.top, opacity: anim.headerBgOpacity }]}
          >
            {headerTitle}
          </Animated.Text>
        )}
      </View>

      {!!onRefresh && <VintaRefreshIndicator visible={refreshing} />}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SHEET_BG },
  scrollArea: { flex: 1 },

  hero: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: HERO_HEIGHT, overflow: 'hidden', backgroundColor: COLORS.navy,
  },
  heroImage: { width: '100%', height: '100%' },
  heroSpace: { height: HERO_HEIGHT - SHEET_OVERLAP, justifyContent: 'center' },

  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 4,
    ...SHADOW.card,
  },
  sheetHandle: {
    alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(12,36,97,0.15)', marginTop: 10,
  },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.navy },
  sailStripes: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, flexDirection: 'row' },
  sailStripe: { flex: 1 },
  headerTitle: {
    position: 'absolute', left: 72, right: 72, height: HEADER_HEIGHT,
    textAlign: 'center', textAlignVertical: 'center', lineHeight: HEADER_HEIGHT,
    fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF',
  },
});
