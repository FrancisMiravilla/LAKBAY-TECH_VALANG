import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle, Line, Path, G, Text as SvgText } from 'react-native-svg';
import { FONTS } from '../constants/theme';
import { AR_LIME } from './ARGuidance';
import { parseHintDirection, cardinalFor } from '../utils/hintDirection';

// Compass guide for finding a museum artwork from its hint ("western part of S2").
// The dial turns with the phone so N/E/S/W always match the real world, and the
// lime pointer marks the side of the building the hint talks about.

const DIAL = 132;
const R = DIAL / 2;
const ON_TARGET_DEG = 25;

function rotateTo(anim, prevRef, next) {
  let delta = next - prevRef.current;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  prevRef.current += delta;
  Animated.timing(anim, { toValue: prevRef.current, duration: 180, useNativeDriver: true }).start();
}

export default function HintCompass({ target, onClose }) {
  const direction = parseHintDirection(target?.hint);
  const [heading, setHeading] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const dialAnim = useRef(new Animated.Value(0)).current;
  const dialPrev = useRef(0);

  useEffect(() => {
    let sub;
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !active) return;
        sub = await Location.watchHeadingAsync((h) => {
          if (!active) return;
          setHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading);
        });
      } catch (_) {
        // No magnetometer: the card still shows the hint direction in words.
      }
    })();
    return () => {
      active = false;
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    if (heading !== null) rotateTo(dialAnim, dialPrev, -heading);
  }, [heading, dialAnim]);

  const dialRotate = dialAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['-360deg', '0deg', '360deg'],
    extrapolate: 'extend',
  });

  let rel = null;
  if (direction && heading !== null) {
    rel = ((direction.bearing - heading) % 360 + 360) % 360;
    if (rel > 180) rel -= 360;
  }
  const onTarget = rel !== null && Math.abs(rel) <= ON_TARGET_DEG;

  let instruction;
  if (!direction) instruction = 'This clue has no compass direction. Follow the hint and scan the artworks around you.';
  else if (heading === null) instruction = `Head to the ${direction.label.toLowerCase()} side of Building ${target.building || 'S2'}.`;
  else if (onTarget) instruction = `You're facing ${direction.label}. Walk this way and scan the artworks here.`;
  else if (Math.abs(rel) > 150) instruction = `Turn around to face ${direction.label}.`;
  else instruction = `Turn ${rel > 0 ? 'right' : 'left'} ${Math.round(Math.abs(rel))}° to face ${direction.label}.`;

  if (collapsed) {
    return (
      <TouchableOpacity style={styles.pill} onPress={() => setCollapsed(false)} activeOpacity={0.85} accessibilityLabel="Show compass guide">
        <Ionicons name="compass" size={18} color={onTarget ? AR_LIME : '#FFFFFF'} />
        <Text style={styles.pillText}>{direction ? `${direction.short} · ${onTarget ? 'on track' : 'guide'}` : 'Compass'}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="compass" size={14} color={AR_LIME} />
        <Text style={styles.kicker} numberOfLines={1}>
          COMPASS GUIDE · BUILDING {target.building || 'S2'} · SLOT #{target.slot_number || 1}
        </Text>
        <TouchableOpacity onPress={() => setCollapsed(true)} hitSlop={8} accessibilityLabel="Minimise compass">
          <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} hitSlop={8} style={{ marginLeft: 10 }} accessibilityLabel="Stop compass guide">
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.dialWrap}>
          <Animated.View style={{ transform: [{ rotate: dialRotate }] }}>
            <Svg width={DIAL} height={DIAL}>
              <Circle cx={R} cy={R} r={R - 2} fill="rgba(15,23,42,0.55)" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
              {Array.from({ length: 36 }).map((_, i) => (
                <Line
                  key={i}
                  x1={R}
                  y1={6}
                  x2={R}
                  y2={i % 9 === 0 ? 16 : 11}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={i % 9 === 0 ? 2 : 1}
                  transform={`rotate(${i * 10} ${R} ${R})`}
                />
              ))}
              {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([l, a]) => (
                <SvgText
                  key={l}
                  x={R}
                  y={30}
                  fill={l === 'N' ? '#F87171' : '#FFFFFF'}
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(${a} ${R} ${R})`}
                >
                  {l}
                </SvgText>
              ))}
              {direction && (
                <G transform={`rotate(${direction.bearing} ${R} ${R})`}>
                  <Path
                    d={`M${R} 36 L${R + 13} ${R - 4} L${R} ${R - 12} L${R - 13} ${R - 4} Z`}
                    fill={AR_LIME}
                    stroke="#1F2A0A"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </G>
              )}
              <Circle cx={R} cy={R} r="5" fill="#FFFFFF" />
            </Svg>
          </Animated.View>
          {/* Fixed marker = the way the phone is pointing */}
          <View style={styles.facingMark} pointerEvents="none">
            <Ionicons name="caret-down" size={18} color={onTarget ? AR_LIME : '#FFFFFF'} />
          </View>
        </View>

        <View style={styles.textCol}>
          {direction ? (
            <>
              <Text style={styles.targetDir}>{direction.label}</Text>
              <Text style={styles.facing}>
                {heading === null ? 'Compass unavailable' : `Facing ${cardinalFor(heading)} · ${Math.round(heading)}°`}
              </Text>
            </>
          ) : (
            <Text style={styles.facing}>
              {heading === null ? 'Compass unavailable' : `Facing ${cardinalFor(heading)} · ${Math.round(heading)}°`}
            </Text>
          )}
          <View style={[styles.status, onTarget && styles.statusOn]}>
            <Text style={[styles.statusText, onTarget && styles.statusTextOn]}>{instruction}</Text>
          </View>
        </View>
      </View>

      {!!target.hint && (
        <Text style={styles.hint} numberOfLines={2}>“{target.hint}”</Text>
      )}
    </View>
  );
}

const GLASS = 'rgba(30,34,40,0.72)';

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 28,
    backgroundColor: GLASS,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    zIndex: 40,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  kicker: { flex: 1, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, color: AR_LIME, marginLeft: 6 },
  body: { flexDirection: 'row', alignItems: 'center' },
  dialWrap: { width: DIAL, height: DIAL + 10, alignItems: 'center', justifyContent: 'flex-end' },
  facingMark: { position: 'absolute', top: -4, alignSelf: 'center' },
  textCol: { flex: 1, marginLeft: 12 },
  targetDir: { fontFamily: FONTS.bold, fontSize: 26, color: '#FFFFFF', lineHeight: 30 },
  facing: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  status: { borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', padding: 8 },
  statusOn: { backgroundColor: AR_LIME },
  statusText: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFFFFF', lineHeight: 16 },
  statusTextOn: { color: '#1F2A0A' },
  hint: { fontFamily: FONTS.regular, fontStyle: 'italic', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 8 },
  pill: {
    position: 'absolute',
    left: 12,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GLASS,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    zIndex: 40,
  },
  pillText: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF' },
});
