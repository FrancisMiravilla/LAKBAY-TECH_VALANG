import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { COLORS, FONTS, GUIDE_FONTS } from '../constants/theme';

// Building blocks for the character-creation flow: a sunny pixel-beach page,
// cut-corner ("chamfered") frames, a glitching step title, and the rise-in /
// pop animations used on every option.

const { width: SCREEN_W } = Dimensions.get('window');

export const CREATION = {
  sand: '#FBF6E2',
  sandDeep: '#F1E6C4',
  card: '#EADFB8',
  ink: '#1E1B16',
  muted: '#8C8370',
  blue: COLORS.accent,
  blueDark: COLORS.accentDark,
  green: '#22C55E',
};

// ── Cut-corner frame ─────────────────────────────────────────────────────────
// The corners are masked with the page colour, so it must sit on `bg`.
export function ChamferFrame({
  width, height, cut = 10, bg = CREATION.sand, fill = 'transparent',
  stroke, strokeWidth = 2, style, children,
}) {
  const s = strokeWidth / 2;
  const w = width;
  const h = height;
  const octagon = `${cut},${s} ${w - cut},${s} ${w - s},${cut} ${w - s},${h - cut} ${w - cut},${h - s} ${cut},${h - s} ${s},${h - cut} ${s},${cut}`;
  return (
    <View style={[{ width, height }, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill, overflow: 'hidden' }]}>{children}</View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={w} height={h}>
          <Polygon points={`0,0 ${cut},0 0,${cut}`} fill={bg} />
          <Polygon points={`${w},0 ${w - cut},0 ${w},${cut}`} fill={bg} />
          <Polygon points={`0,${h} ${cut},${h} 0,${h - cut}`} fill={bg} />
          <Polygon points={`${w},${h} ${w - cut},${h} ${w},${h - cut}`} fill={bg} />
          {stroke ? <Polygon points={octagon} fill="none" stroke={stroke} strokeWidth={strokeWidth} /> : null}
        </Svg>
      </View>
    </View>
  );
}

// ── Pressable that dips on touch and springs back ────────────────────────────
export function PopPressable({ onPress, disabled, style, children, accessibilityLabel }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v, bouncy) => (bouncy
    ? Animated.spring(scale, { toValue: v, friction: 4, tension: 160, useNativeDriver: true })
    : Animated.timing(scale, { toValue: v, duration: 90, useNativeDriver: true })
  ).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => to(0.94)}
      onPressOut={() => to(1, true)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ── Options arrive scattered and settle into place, one after another ────────
const SCATTER = [26, -18, 34, -10, 20, -24, 14];
export function RiseIn({ index = 0, delay = 0, style, children }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(t, {
      toValue: 1, delay: delay + index * 70, friction: 7, tension: 70, useNativeDriver: true,
    }).start();
  }, [t, index, delay]);
  const from = SCATTER[index % SCATTER.length];
  return (
    <Animated.View
      style={[style, {
        opacity: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
        ],
      }]}
    >
      {children}
    </Animated.View>
  );
}

// ── Step title that glitches from one heading into the next ──────────────────
export function GlitchTitle({ kicker, title }) {
  const [shown, setShown] = useState({ kicker, title });
  const t = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (shown.kicker === kicker && shown.title === title) return;
    Animated.timing(t, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true })
      .start(() => {
        setShown({ kicker, title });
        Animated.timing(t, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      });
  }, [kicker, title]); // eslint-disable-line react-hooks/exhaustive-deps

  const shift = t.interpolate({ inputRange: [0, 1], outputRange: [9, 0] });
  const ghostOpacity = t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0.3, 0] });
  const negShift = Animated.multiply(shift, -1);

  return (
    <View style={styles.titleWrap}>
      <Animated.Text style={[styles.kicker, { opacity: t }]}>{shown.kicker}</Animated.Text>
      <View>
        <Animated.Text style={[styles.title, styles.ghost, { color: CREATION.blue, opacity: ghostOpacity, transform: [{ translateX: shift }] }]}>
          {shown.title}
        </Animated.Text>
        <Animated.Text style={[styles.title, styles.ghost, { color: '#F97316', opacity: ghostOpacity, transform: [{ translateX: negShift }] }]}>
          {shown.title}
        </Animated.Text>
        <Animated.Text style={[styles.title, { opacity: t }]}>{shown.title}</Animated.Text>
      </View>
    </View>
  );
}

// ── Cream beach page with sand specks and blocky pixel waves ─────────────────
const BLOCK = 14;
const WAVE_PATTERN = [0, 1, 1, 2, 1, 0, 0, 1, 2, 2, 1, 0, 1, 0];

function WaveLayer({ color, base, offset, drift, bottom }) {
  const cols = Math.ceil((SCREEN_W + BLOCK * 4) / BLOCK);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!drift) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(x, { toValue: drift, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(x, { toValue: -drift, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [x, drift]);
  return (
    <Animated.View style={[styles.waveRow, { bottom, left: -BLOCK * 2, transform: [{ translateX: x }] }]}>
      {Array.from({ length: cols }, (_, i) => (
        <View
          key={i}
          style={{ width: BLOCK, height: base + WAVE_PATTERN[(i + offset) % WAVE_PATTERN.length] * (BLOCK * 0.6), backgroundColor: color }}
        />
      ))}
    </Animated.View>
  );
}

export const WAVE_HEIGHT = 92;

export function BeachBackdrop({ children }) {
  const specks = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    left: `${(i * 37 + 11) % 96}%`,
    top: `${(i * 53 + 7) % 78}%`,
    size: 4 + (i % 3) * 2,
    color: i % 2 ? '#F2D9B5' : '#EBD0C2',
  })), []);
  return (
    <View style={styles.page}>
      {specks.map((s, i) => (
        <View key={i} style={{ position: 'absolute', left: s.left, top: s.top, width: s.size, height: s.size, backgroundColor: s.color, opacity: 0.7 }} />
      ))}
      <View pointerEvents="none" style={styles.waves}>
        <WaveLayer color="#F3DFC0" base={70} offset={3} bottom={0} />
        <WaveLayer color="#7DD3FC" base={56} offset={0} drift={6} bottom={0} />
        <WaveLayer color="#38BDF8" base={38} offset={6} drift={-8} bottom={0} />
        <WaveLayer color="#0EA5E9" base={18} offset={9} bottom={0} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: CREATION.sand, overflow: 'hidden' },
  waves: { position: 'absolute', left: 0, right: 0, bottom: 0, height: WAVE_HEIGHT },
  waveRow: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end' },
  titleWrap: { alignItems: 'center', marginTop: 6, marginBottom: 14 },
  kicker: { fontFamily: FONTS.medium, fontSize: 12, color: CREATION.muted, marginBottom: 2 },
  title: {
    fontFamily: GUIDE_FONTS.display, fontSize: 26, color: CREATION.ink, letterSpacing: 0.5,
    textTransform: 'uppercase', textAlign: 'center',
  },
  ghost: { position: 'absolute', left: 0, right: 0 },
});

export function ChamferButton({ label, icon, onPress, variant = 'solid', width, height = 48, disabled, bg = CREATION.sand }) {
  const solid = variant === 'solid';
  return (
    <PopPressable onPress={onPress} disabled={disabled} accessibilityLabel={label} style={{ opacity: disabled ? 0.45 : 1 }}>
      <ChamferFrame
        width={width}
        height={height}
        cut={9}
        bg={bg}
        fill={solid ? CREATION.blue : 'rgba(255,255,255,0.6)'}
        stroke={solid ? CREATION.blueDark : CREATION.blue}
        strokeWidth={2}
      >
        <View style={btn.inner}>
          {icon}
          <Text style={[btn.text, { color: solid ? '#FFFFFF' : CREATION.blue }]} numberOfLines={1}>{label}</Text>
        </View>
      </ChamferFrame>
    </PopPressable>
  );
}

const btn = StyleSheet.create({
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  text: { fontFamily: FONTS.bold, fontSize: 14 },
});
