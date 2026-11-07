import React from 'react';
import { StyleSheet, View, Image, ImageBackground } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import LucideIcon from './LucideIcon';
import { getCharacterDetails } from '../constants/characters';
import { HATS, FRAMES, PINS, BACKDROPS } from '../constants/cosmetics';

// Character portrait with the player's decorations layered on: frame ring,
// hat on the top edge of the circle, and a badge pin at the bottom-right.
// Decorations attach to the circle (not the face), so one design fits every character.

const SEGMENTS = 24;
const DOTS = 12;

function arc(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function FrameRing({ outer, ring, frame }) {
  const cfg = FRAMES[frame] || FRAMES[''];
  const c = outer / 2;
  const r = c - ring / 2;
  const step = (Math.PI * 2) / SEGMENTS;
  return (
    <Svg width={outer} height={outer} style={StyleSheet.absoluteFill}>
      {cfg.outline && <Circle cx={c} cy={c} r={c - 0.75} stroke={cfg.outline} strokeWidth={1.5} fill="none" />}
      {cfg.segments.length === 1 ? (
        <Circle cx={c} cy={c} r={r} stroke={cfg.segments[0]} strokeWidth={ring} fill="none" />
      ) : (
        Array.from({ length: SEGMENTS }).map((_, i) => (
          <Path
            key={i}
            d={arc(c, c, r, -Math.PI / 2 + i * step, -Math.PI / 2 + (i + 1) * step + 0.01)}
            stroke={cfg.segments[i % cfg.segments.length]}
            strokeWidth={ring}
            fill="none"
          />
        ))
      )}
      {cfg.dots &&
        Array.from({ length: DOTS }).map((_, i) => {
          const a = (i / DOTS) * Math.PI * 2;
          const x = c + r * Math.cos(a);
          const y = c + r * Math.sin(a);
          return (
            <React.Fragment key={i}>
              <Circle cx={x} cy={y} r={ring * 0.32} fill={cfg.dots} />
              {cfg.dotCenter && <Circle cx={x} cy={y} r={ring * 0.13} fill={cfg.dotCenter} />}
            </React.Fragment>
          );
        })}
    </Svg>
  );
}

export default function DecoratedAvatar({ character, size = 80, hat = '', frame = '', pin = '', reserveHatSpace = true, style }) {
  const details = getCharacterDetails(character);
  const ring = Math.max(3, Math.round(size * 0.08));
  const outer = size + ring * 2;
  const Hat = HATS[hat];
  const hatW = outer * 0.92;
  const hatH = hatW * 0.64;
  const hatLift = Hat ? hatH * 0.62 : 0;
  const hatSpace = reserveHatSpace ? hatLift : 0;
  const pinCfg = PINS[pin];
  const pinSize = Math.max(18, Math.round(size * 0.34));

  return (
    <View style={[{ width: outer, height: outer + hatSpace }, style]}>
      <View style={{ position: 'absolute', top: hatSpace, width: outer, height: outer }}>
        <FrameRing outer={outer} ring={ring} frame={frame} />
        <View style={[styles.clip, { top: ring, left: ring, width: size, height: size, borderRadius: size / 2 }]}>
          <Image
            source={details.image}
            style={{ width: '100%', height: '100%', transform: [{ scale: details.zoom || 1 }] }}
            resizeMode="cover"
          />
        </View>
        {pinCfg && (
          <View
            style={[
              styles.pin,
              { width: pinSize, height: pinSize, borderRadius: pinSize / 2, backgroundColor: pinCfg.bg, right: -2, bottom: -2 },
            ]}
          >
            <LucideIcon name={pinCfg.icon} size={pinSize * 0.56} color="#FFFFFF" strokeWidth={2.4} />
          </View>
        )}
      </View>
      {Hat && (
        <View pointerEvents="none" style={{ position: 'absolute', top: hatSpace - hatLift, left: (outer - hatW) / 2, width: hatW, height: hatH }}>
          <Hat />
        </View>
      )}
    </View>
  );
}

// Profile backdrop: a photo or a gradient that fills its parent.
export function ProfileBackdrop({ id = '', style, children }) {
  const cfg = BACKDROPS[id] || BACKDROPS[''];
  if (cfg.gradient) {
    return (
      <LinearGradient colors={cfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
        {children}
      </LinearGradient>
    );
  }
  return (
    <ImageBackground source={cfg.image} style={style} resizeMode="cover">
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', overflow: 'hidden', backgroundColor: '#E2E8F0' },
  pin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
