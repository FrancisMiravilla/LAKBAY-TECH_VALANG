import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, RefreshControl, StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { COLORS } from '../constants/theme';

// Pull-to-refresh with a sailing vinta instead of the stock spinner.
// The native RefreshControl handles the pull gesture (its spinner is hidden);
// <VintaRefreshIndicator> sails down from the top to the middle while loading.

const SAIL_COLORS = ['#2B3990', '#E8559A', '#F6C431', '#E2412B', '#1F7A3D', '#F39A3D'];
const MIN_SHOW_MS = 1500; // keep the boat on screen long enough to be seen
// Start/finish just above the top edge of the screen.
const DROP_FROM = -(Dimensions.get('window').height / 2 + 90);

function VintaBoat({ size = 40 }) {
  // Sail: the vinta's tilted, near-rectangular sail with vertical colour panels.
  const sail = '30,9 55,15 51,39 30,37';
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <ClipPath id="vintaSail">
          <Polygon points={sail} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#vintaSail)">
        {SAIL_COLORS.map((c, i) => (
          <Rect key={c} x={30 + i * 4.3} y={6} width={4.4} height={36} fill={c} />
        ))}
      </G>
      <Polygon points={sail} fill="none" stroke="#0C2461" strokeWidth={1.2} strokeLinejoin="round" />
      <Line x1={30} y1={7} x2={30} y2={45} stroke="#5B3A1A" strokeWidth={2.2} strokeLinecap="round" />
      {/* Hull with the upswept bow and stern */}
      <Path d="M6 42 Q32 52 58 41 Q54 47 46 49 L18 49 Q10 47 6 42 Z" fill="#8B5A2B" />
      <Path d="M6 42 Q32 52 58 41" stroke="#F6C431" strokeWidth={1.4} fill="none" />
      {/* Outrigger */}
      <Line x1={12} y1={46} x2={52} y2={46} stroke="#5B3A1A" strokeWidth={1.2} />
    </Svg>
  );
}

function Waves({ width }) {
  const step = 14;
  let d = `M0 6`;
  for (let x = 0; x < width + step * 2; x += step) {
    d += ` Q${x + step / 2} 0 ${x + step} 6`;
  }
  return (
    <Svg width={width + step * 2} height={10}>
      <Path d={d} stroke={COLORS.teal} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// Smooth sine sampling: one linear 0→1 loop drives every motion, so there is
// no pause or easing seam where a back-and-forth animation would turn around.
const SAMPLES = 24;
const PHASE = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
const sine = (amp, shift = 0) => PHASE.map((t) => amp * Math.sin(2 * Math.PI * t + shift));

// Centred over the screen (or over the area it is placed in).
export function VintaRefreshIndicator({ visible }) {
  const show = useRef(new Animated.Value(0)).current;
  const cycle = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Sail down from above the screen and settle in the middle.
      show.setValue(0);
      Animated.spring(show, { toValue: 1, friction: 8, tension: 38, useNativeDriver: true }).start();
    } else {
      // Sail back up and out of view.
      Animated.timing(show, { toValue: 0, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: true })
        .start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible, show]);

  useEffect(() => {
    if (!mounted) return undefined;
    cycle.setValue(0);
    wave.setValue(0);
    const sailing = Animated.loop(
      Animated.timing(cycle, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }),
    );
    const rolling = Animated.loop(
      Animated.timing(wave, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
    );
    sailing.start();
    rolling.start();
    return () => { sailing.stop(); rolling.stop(); };
  }, [mounted, cycle, wave]);

  if (!mounted) return null;

  // Rock, bob and sway run on the same cycle, a quarter turn apart, like a hull
  // riding over a swell.
  const rotate = cycle.interpolate({ inputRange: PHASE, outputRange: sine(8).map((d) => `${d}deg`) });
  const bob = cycle.interpolate({ inputRange: PHASE, outputRange: sine(3, Math.PI / 2) });
  const sway = cycle.interpolate({ inputRange: PHASE, outputRange: sine(2.5) });
  const waveX = wave.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <View pointerEvents="none" style={styles.center}>
      <Animated.View
        style={{
          opacity: show.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            { translateY: show.interpolate({ inputRange: [0, 1], outputRange: [DROP_FROM, 0] }) },
            { scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1], extrapolate: 'clamp' }) },
          ],
        }}
      >
        <View style={styles.bubble}>
          <Animated.View style={{ transform: [{ translateX: sway }, { translateY: bob }, { rotate }] }}>
            <VintaBoat size={52} />
          </Animated.View>
          <View style={styles.waveClip}>
            <Animated.View style={{ transform: [{ translateX: waveX }] }}>
              <Waves width={56} />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// Wire a screen's reload function to pull-to-refresh.
// Returns the RefreshControl to pass to the ScrollView and the `refreshing` flag
// for <VintaRefreshIndicator visible={refreshing} />.
export function useVintaRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const started = Date.now();
    try {
      await onRefreshRef.current?.();
    } catch {
      // the screen's own loader reports errors
    } finally {
      const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - started));
      setTimeout(() => setRefreshing(false), wait);
    }
  }, []);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      // Hide the stock spinner on both platforms; the vinta replaces it.
      tintColor="transparent"
      colors={['transparent']}
      progressBackgroundColor="transparent"
      progressViewOffset={-1000}
    />
  );

  return { refreshing, refreshControl };
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 50, elevation: 50,
  },
  bubble: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F6C431',
    shadowColor: '#0C2461', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 6,
  },
  waveClip: { position: 'absolute', bottom: 12, width: 56, height: 10, overflow: 'hidden' },
});
