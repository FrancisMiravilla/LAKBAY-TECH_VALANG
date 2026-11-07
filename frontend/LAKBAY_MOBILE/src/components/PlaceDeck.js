import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, ImageBackground, Image, TouchableOpacity, Animated, PanResponder, Dimensions, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import LucideIcon from './LucideIcon';

// Stacked, tilted card deck for "Places to Experience" (reference/home.png, middle).
// Swipe the front card left/right to flip through places; tap it to open.
//
// Smoothness: the drag and every transition run on the native driver, and cards
// are keyed by place so the card behind keeps its loaded photo when it moves to
// the front (nothing remounts or re-downloads mid-swipe).

const { width: W } = Dimensions.get('window');
const CARD_W = W - 64;
const CARD_H = CARD_W * 1.12;
const SWIPE_OUT = W * 0.28;
const FLY_MS = 220;
const FALLBACK = require('../assets/zamboanga.jpg');

function GlassTile({ icon, label, value }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileIcon}>
        <LucideIcon name={icon} size={15} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.tileValue} numberOfLines={1}>{value}</Text>
      </View>
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
      <View style={styles.cardDim} />
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={[styles.typeChip, { borderColor: place.color }]}>
            <LucideIcon name={place.typeIcon} size={11} color={place.color} />
            <Text style={[styles.typeChipText, { color: place.color }]}>{place.typeLabel}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{place.title}</Text>
        </View>
        <View style={styles.arrowBtn}>
          <Ionicons name={place.locked ? 'lock-closed' : 'arrow-up'} size={18} color="#FFFFFF" style={place.locked ? null : styles.arrowTilt} />
        </View>
      </View>

      <View style={styles.tileGrid}>
        {place.tiles.map((t) => (
          <GlassTile key={t.label} {...t} />
        ))}
      </View>
    </ImageBackground>
  );
});

function PlaceDeck({ places, onOpen }) {
  const [index, setIndex] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const countRef = useRef(places.length);
  countRef.current = places.length;

  // Only jump back to the first card when the set of places really changes
  // (a new filter), not when Home re-fetches the same places.
  const keySig = useMemo(() => places.map((p) => p.key).join('|'), [places]);
  useEffect(() => {
    setIndex(0);
    x.setValue(0);
  }, [keySig, x]);

  // Warm the image cache so photos are ready before their card comes up.
  useEffect(() => {
    places.forEach((p) => { if (p.image) Image.prefetch(p.image).catch(() => {}); });
  }, [keySig]); // eslint-disable-line react-hooks/exhaustive-deps

  const settle = () => Animated.spring(x, { toValue: 0, useNativeDriver: true, friction: 7, tension: 80 }).start();

  // dir -1 = next (card leaves to the left), +1 = previous.
  const step = (dir) => {
    const count = countRef.current;
    if (count < 2 || busy.current) {
      settle();
      return;
    }
    busy.current = true;
    Animated.timing(x, { toValue: dir * W, duration: FLY_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      setIndex((i) => (i + (dir < 0 ? 1 : -1) + count) % count);
    });
  };

  // Reset the drag only after the cards have swapped, before the frame is drawn,
  // so the old card never flashes back into place.
  useLayoutEffect(() => {
    x.setValue(0);
    busy.current = false;
  }, [index, x]);
  const stepRef = useRef(step);
  stepRef.current = step;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !busy.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => x.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_OUT || g.vx < -0.6) stepRef.current(-1);
        else if (g.dx > SWIPE_OUT || g.vx > 0.6) stepRef.current(1);
        else settle();
      },
      onPanResponderTerminate: settle,
    })
  ).current;

  if (places.length === 0) return null;

  const count = places.length;
  const front = places[index % count];
  const back = count > 1 ? places[(index + 1) % count] : null;

  // Front card follows the finger; the back card eases into the front pose as the
  // front one leaves, so the hand-off after a swipe has no visible jump.
  const frontRotate = x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-18deg', '-5deg', '8deg'] });
  const progress = x.interpolate({ inputRange: [-W, 0, W], outputRange: [1, 0, 1] });
  const backRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['7deg', '-5deg'] });
  const backShiftX = progress.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });
  const backShiftY = progress.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });
  const backOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <View>
      <View style={styles.stage}>
        {back && (
          <Animated.View
            key={back.key}
            pointerEvents="none"
            style={[
              styles.cardSlot,
              { opacity: backOpacity, transform: [{ translateX: backShiftX }, { translateY: backShiftY }, { rotate: backRotate }] },
            ]}
          >
            {/* Same wrapper as the front card so React keeps this card (and its photo) when it moves up. */}
            <TouchableOpacity activeOpacity={0.92} disabled>
              <PlaceCard place={back} />
            </TouchableOpacity>
          </Animated.View>
        )}
        <Animated.View
          key={front.key}
          style={[styles.cardSlot, { transform: [{ translateX: x }, { rotate: frontRotate }] }]}
          {...responder.panHandlers}
        >
          <TouchableOpacity activeOpacity={0.92} onPress={() => onOpen(front)}>
            <PlaceCard place={front} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {count > 1 && (
        <View style={styles.dotsRow}>
          <TouchableOpacity onPress={() => step(1)} hitSlop={10} accessibilityLabel="Previous place">
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <Text style={styles.counter}>{(index % count) + 1} / {count}</Text>
          <TouchableOpacity onPress={() => step(-1)} hitSlop={10} accessibilityLabel="Next place">
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default memo(PlaceDeck);

const GLASS = 'rgba(12,36,97,0.42)';

const styles = StyleSheet.create({
  stage: { height: CARD_H + 36, alignItems: 'center', justifyContent: 'center' },
  cardSlot: { position: 'absolute', width: CARD_W, height: CARD_H },

  card: {
    width: CARD_W,
    height: CARD_H,
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cardImage: { borderRadius: 27 },
  cardDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,18,49,0.28)' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(6,18,49,0.55)', borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6,
  },
  typeChipText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1 },
  cardTitle: {
    fontFamily: FONTS.bold, fontSize: 28, lineHeight: 31, color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  arrowBtn: {
    width: 44, height: 44, borderRadius: 22, marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  arrowTilt: { transform: [{ rotate: '45deg' }] },

  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  tile: {
    width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GLASS, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 8, paddingVertical: 8,
  },
  tileIcon: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: { fontFamily: FONTS.medium, fontSize: 10, color: 'rgba(255,255,255,0.75)' },
  tileValue: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF', lineHeight: 17 },

  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 4 },
  counter: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold, minWidth: 44, textAlign: 'center' },
});
