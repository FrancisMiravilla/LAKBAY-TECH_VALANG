import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Svg, Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { FONTS } from '../constants/theme';
import { cardinalFor } from '../utils/hintDirection';

// Small always-on compass for the AR scanner, so a clue like "the east part of
// S1" can be matched to the real world. The dial turns with the phone; the gold
// marker at the top is the way the camera is facing.

const SIZE = 64;
const R = SIZE / 2;

export default function MiniCompass({ style }) {
  const [heading, setHeading] = useState(null);
  const dial = useRef(new Animated.Value(0)).current;
  const prev = useRef(0);

  useEffect(() => {
    let sub;
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !active) return;
        sub = await Location.watchHeadingAsync((h) => {
          if (!active) return;
          const next = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          setHeading((prev) => (prev === null || Math.abs(((next - prev + 540) % 360) - 180) >= 2 ? next : prev));
        });
      } catch (_) {
        // no magnetometer: the compass stays hidden
      }
    })();
    return () => {
      active = false;
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    if (heading === null) return;
    // Turn the shortest way round so the dial never spins a full circle.
    let delta = -heading - prev.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    prev.current += delta;
    Animated.timing(dial, { toValue: prev.current, duration: 180, useNativeDriver: true }).start();
  }, [heading, dial]);

  if (heading === null) return null;

  const rotate = dial.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      <View style={styles.face}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={R} cy={R} r={R - 1.5} fill="rgba(8,20,60,0.72)" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <Line
                key={a}
                x1={R}
                y1={4}
                x2={R}
                y2={a % 90 === 0 ? 9 : 7}
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={1}
                transform={`rotate(${a} ${R} ${R})`}
              />
            ))}
            {/* North needle */}
            <Path d={`M${R} ${R - 15} L${R + 4} ${R} L${R - 4} ${R} Z`} fill="#EF4444" />
            <Path d={`M${R} ${R + 15} L${R + 4} ${R} L${R - 4} ${R} Z`} fill="rgba(255,255,255,0.75)" />
            {[['N', 0, '#FCA5A5'], ['E', 90, '#FFFFFF'], ['S', 180, '#FFFFFF'], ['W', 270, '#FFFFFF']].map(([l, a, c]) => {
              const rad = (a * Math.PI) / 180;
              return (
                <SvgText
                  key={l}
                  x={R + Math.sin(rad) * (R - 15)}
                  y={R - Math.cos(rad) * (R - 15) + 3.5}
                  fill={c}
                  fontSize={10}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {l}
                </SvgText>
              );
            })}
          </Svg>
        </Animated.View>
        {/* Facing marker */}
        <View style={styles.marker} />
      </View>
      <View style={styles.label}>
        <Text style={styles.labelText}>Facing {cardinalFor(heading)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  face: { width: SIZE, height: SIZE },
  marker: {
    position: 'absolute',
    top: -5,
    left: R - 5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FBBF24',
  },
  label: {
    marginTop: 4,
    backgroundColor: 'rgba(8,20,60,0.72)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  labelText: { fontFamily: FONTS.semiBold, fontSize: 10, color: '#FFFFFF' },
});
