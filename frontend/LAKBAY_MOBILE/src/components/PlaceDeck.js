import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, ImageBackground, Image, TouchableOpacity, Animated, PanResponder, Dimensions, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import LucideIcon from './LucideIcon';

// "Places to Experience": a straight stacked deck. The next two places peek out
// above the front card; swipe the front card left/right to flip, tap to open.
//
// Smoothness: the drag and every transition run on the native driver, and cards
// are keyed by place so a card keeps its loaded photo as it moves up the stack.

const { width: W } = Dimensions.get('window');
const CARD_W = W - 40;
const CARD_H = Math.round(CARD_W * 0.98);
const PEEK = 14;
const SWIPE_OUT = W * 0.28;
const FLY_MS = 220;
const FALLBACK = require('../assets/zamboanga.jpg');
const ACTION = '#F59E0B';

// Pose of a card `depth` places behind the front one.
const scaleAt = (depth) => 1 - depth * 0.08;
const liftAt = (depth) => -((1 - scaleAt(depth)) * CARD_H / 2 + depth * PEEK);

function Pill({ icon, label }) {
  return (
    <View style={styles.pill}>
      <LucideIcon name={icon} size={13} color={COLORS.navy} />
      <Text style={styles.pillText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const PlaceCard = memo(function PlaceCard({ place }) {
  return (
    <ImageBackground
      source={place.image ? { uri: place.image } : FALLBACK}
      style={styles.card}
      imageStyle={styles.cardImage}
      resizeMode="cover"
      fadeDuration={0}
    >
      <LinearGradient
        colors={['rgba(6,18,49,0.25)', 'rgba(6,18,49,0)', 'rgba(6,18,49,0.72)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.pillRow}>
        {place.chips.map((c) => <Pill key={c.label} {...c} />)}
      </View>

      <View style={styles.cardBottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{place.title}</Text>
          {!!place.subtitle && (
            <View style={styles.subRow}>
              <LucideIcon name="pin" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.subText} numberOfLines={1}>{place.subtitle}</Text>
            </View>
          )}
        </View>
        <View style={[styles.goBtn, place.locked && styles.goBtnLocked]}>
          <Ionicons
            name={place.locked ? 'lock-closed' : 'arrow-up'}
            size={20}
            color="#FFFFFF"
            style={place.locked ? null : styles.arrowTilt}
          />
        </View>
      </View>
    </ImageBackground>
  );
});

function PlaceDeck({ places, onOpen }) {
  // Each swipe gets a fresh drag value, swapped in together with the new index,
  // so no card ever has to be snapped back on screen (that snap was the stutter).
  const [deck, setDeck] = useState(() => ({ index: 0, x: new Animated.Value(0) }));
  const { index, x } = deck;
  const xRef = useRef(x);
  xRef.current = x;
  const busy = useRef(false);
  const countRef = useRef(places.length);
  countRef.current = places.length;
  const [swiped, setSwiped] = useState(false);

  // Only jump back to the first card when the set of places really changes
  // (a new filter), not when Home re-fetches the same places.
  const keySig = useMemo(() => places.map((p) => p.key).join('|'), [places]);
  const firstSig = useRef(true);
  useEffect(() => {
    if (firstSig.current) { firstSig.current = false; return; }
    busy.current = false;
    setDeck({ index: 0, x: new Animated.Value(0) });
  }, [keySig]);

  // Warm the image cache so photos are ready before their card comes up.
  useEffect(() => {
    places.forEach((p) => { if (p.image) Image.prefetch(p.image).catch(() => {}); });
  }, [keySig]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe hint: the front card nudges left and back once, showing the next card.
  useEffect(() => {
    if (swiped || places.length < 2) return undefined;
    const t = setTimeout(() => {
      if (busy.current) return;
      busy.current = true;
      const v = xRef.current;
      Animated.sequence([
        Animated.timing(v, { toValue: -46, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(v, { toValue: 0, friction: 6, tension: 70, useNativeDriver: true }),
      ]).start(() => { busy.current = false; });
    }, 900);
    return () => clearTimeout(t);
  }, [keySig, swiped]); // eslint-disable-line react-hooks/exhaustive-deps

  const settle = () => {
    Animated.spring(xRef.current, { toValue: 0, useNativeDriver: true, friction: 7, tension: 80 }).start();
  };

  // Throw the front card out (either direction) and bring the next one forward.
  const next = (dir, velocity = 0) => {
    const count = countRef.current;
    if (count < 2 || busy.current) { settle(); return; }
    busy.current = true;
    setSwiped(true);
    const speed = Math.min(Math.abs(velocity), 3);
    Animated.timing(xRef.current, {
      toValue: dir * W * 1.1,
      duration: FLY_MS - speed * 40,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      busy.current = false;
      setDeck((d) => ({ index: (d.index + 1) % count, x: new Animated.Value(0) }));
    });
  };

  // Bring the previous card back in from the left; the stack eases back behind it.
  const prev = () => {
    const count = countRef.current;
    if (count < 2 || busy.current) return;
    busy.current = true;
    setSwiped(true);
    const v = new Animated.Value(-W * 1.1);
    setDeck((d) => ({ index: (d.index - 1 + count) % count, x: v }));
    requestAnimationFrame(() => {
      Animated.spring(v, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true })
        .start(() => { busy.current = false; });
    });
  };

  const nextRef = useRef(next);
  nextRef.current = next;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !busy.current && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onMoveShouldSetPanResponderCapture: (_, g) => !busy.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => xRef.current.stopAnimation(),
      onPanResponderMove: (_, g) => xRef.current.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_OUT || g.vx < -0.5) nextRef.current(-1, g.vx);
        else if (g.dx > SWIPE_OUT || g.vx > 0.5) nextRef.current(1, g.vx);
        else settle();
      },
      onPanResponderTerminate: () => settle(),
    })
  ).current;

  if (places.length === 0) return null;

  const count = places.length;
  const depthCount = Math.min(count, 3);
  // Back to front, so the front card is drawn last (on top).
  const stack = [];
  for (let d = depthCount - 1; d >= 0; d -= 1) stack.push({ depth: d, place: places[(index + d) % count] });

  // As the front card leaves, every card behind it moves one step forward.
  const progress = x.interpolate({ inputRange: [-W, 0, W], outputRange: [1, 0, 1], extrapolate: 'clamp' });
  const frontRotate = x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-12deg', '0deg', '12deg'] });

  return (
    <View>
      <View style={[styles.stage, { paddingTop: (depthCount - 1) * PEEK + 4 }]}>
        {stack.map(({ depth, place }) => {
          const isFront = depth === 0;
          const transform = isFront
            ? [{ translateX: x }, { rotate: frontRotate }]
            : [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [liftAt(depth), liftAt(depth - 1)] }) },
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [scaleAt(depth), scaleAt(depth - 1)] }) },
              ];
          return (
            <Animated.View
              key={place.key}
              pointerEvents={isFront ? 'auto' : 'none'}
              style={[styles.cardSlot, { transform }]}
              {...(isFront ? responder.panHandlers : null)}
            >
              <TouchableOpacity activeOpacity={0.92} disabled={!isFront} onPress={() => onOpen(place)}>
                <PlaceCard place={place} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        {/* Keeps the stage tall enough for the absolutely placed cards. */}
        <View style={{ height: CARD_H }} />
      </View>

      {count > 1 && (
        <View style={styles.dotsRow}>
          <TouchableOpacity onPress={prev} hitSlop={10} accessibilityLabel="Previous place">
            <Ionicons name="chevron-back" size={18} color={COLORS.navy} />
          </TouchableOpacity>
          {swiped ? (
            <Text style={styles.counter}>{(index % count) + 1} / {count}</Text>
          ) : (
            <View style={styles.hint}>
              <Ionicons name="hand-left-outline" size={14} color={COLORS.navy} />
              <Text style={styles.hintText}>Swipe</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => next(-1)} hitSlop={10} accessibilityLabel="Next place">
            <Ionicons name="chevron-forward" size={18} color={COLORS.navy} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default memo(PlaceDeck);

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'flex-end' },
  cardSlot: { position: 'absolute', bottom: 0, width: CARD_W, height: CARD_H },

  card: {
    width: CARD_W,
    height: CARD_H,
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  cardImage: { borderRadius: 28 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, maxWidth: CARD_W * 0.5,
  },
  pillText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.navy },

  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  cardTitle: {
    fontFamily: FONTS.semiBold, fontSize: 24, lineHeight: 29, color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  subText: { fontFamily: FONTS.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)', flexShrink: 1 },
  goBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: ACTION, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
  },
  goBtnLocked: { backgroundColor: 'rgba(100,116,139,0.95)' },
  arrowTilt: { transform: [{ rotate: '45deg' }] },

  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 10 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 44, justifyContent: 'center' },
  hintText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.navy },
  counter: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.navy, minWidth: 44, textAlign: 'center' },
});
