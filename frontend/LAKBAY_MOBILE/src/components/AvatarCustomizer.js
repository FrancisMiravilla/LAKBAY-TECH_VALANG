import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, GUIDE_FONTS } from '../constants/theme';
import { HATS, PINS } from '../constants/cosmetics';
import LucideIcon from './LucideIcon';
import DecoratedAvatar, { ProfileBackdrop } from './DecoratedAvatar';
import { ChamferFrame, CREATION, PopPressable, RiseIn } from './CreationKit';

// Pixel-beach avatar creator pieces, shared by character creation (sign-up) and
// Edit Profile so both look and behave the same.

export const CHARACTERS = [
  { id: 'mando', name: 'Kuya Mando', title: 'The Trailblazer', image: require('../assets/characters/lila.jpg'), tint: '#FCD9B0' },
  { id: 'bela', name: 'Ate Bela', title: 'The Wanderer', image: require('../assets/characters/new.jpg'), tint: '#B7D0FA' },
  { id: 'lila', name: 'Ate Lila', title: 'The Navigator', image: require('../assets/characters/ricky.jpg'), tint: '#DCE3B4' },
  { id: 'dante', name: 'Bossing Dante', title: 'The Adventurer', image: require('../assets/characters/dante.jpg'), tint: '#B5DCEB' },
  { id: 'sonya', name: 'Ate Sonya', title: 'The Discoverer', image: require('../assets/characters/sonya.jpg'), tint: '#A9C6DE' },
];

export const SLOTS = [
  { slot: 'hat', label: 'Hat', icon: 'crown' },
  { slot: 'frame', label: 'Frame', icon: 'target' },
  { slot: 'pin', label: 'Pin', icon: 'medal' },
  { slot: 'backdrop', label: 'Backdrop', icon: 'palm' },
];

// Used when the cosmetics catalog can't be loaded: the free starter items.
export const STARTER_CATALOG = [
  { slot: 'hat', id: '', name: 'No Hat', min_xp: 0, unlocked: true },
  { slot: 'hat', id: 'cap', name: 'Explorer Cap', min_xp: 0, unlocked: true },
  { slot: 'frame', id: '', name: 'Simple Ring', min_xp: 0, unlocked: true },
  { slot: 'frame', id: 'vinta', name: 'Vinta Stripes', min_xp: 0, unlocked: true },
  { slot: 'pin', id: '', name: 'No Pin', min_xp: 0, unlocked: true },
  { slot: 'pin', id: 'compass', name: 'Compass Pin', min_xp: 0, unlocked: true },
  { slot: 'backdrop', id: '', name: 'Vinta Sails', min_xp: 0, unlocked: true },
];

export const DEFAULT_LOOK = { hat: '', frame: '', pin: '', backdrop: '' };

const STARTER_LOOKS = [
  { hat: 'cap', frame: 'vinta', pin: 'compass', tile: '#2E7D7A' },
  { hat: 'cap', frame: '', pin: '', tile: '#F6D27A' },
  { hat: '', frame: 'vinta', pin: 'compass', tile: '#F8C8DC' },
  { hat: 'cap', frame: 'vinta', pin: '', tile: '#7FD3E8' },
  { hat: '', frame: '', pin: 'compass', tile: '#F4B6C8' },
  { hat: 'cap', frame: '', pin: 'compass', tile: '#5EC4B6' },
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const unlockedBySlot = (catalog) => {
  const map = {};
  SLOTS.forEach(({ slot }) => { map[slot] = catalog.filter((i) => i.slot === slot && i.unlocked).map((i) => i.id); });
  return map;
};

// A random look built only from unlocked items.
export const randomLook = (catalog) => {
  const unlocked = unlockedBySlot(catalog);
  const from = (slot) => pick(unlocked[slot]?.length ? unlocked[slot] : ['']);
  return { hat: from('hat'), frame: from('frame'), pin: from('pin'), backdrop: from('backdrop') };
};

// Thumbnail for one cosmetic item.
export function ItemThumb({ slot, id, character, size = 40 }) {
  if (slot === 'backdrop') return <ProfileBackdrop id={id} style={{ width: size * 1.3, height: size * 1.3, borderRadius: 6 }} />;
  if (slot === 'frame') return <DecoratedAvatar character={character} size={size} frame={id} reserveHatSpace={false} />;
  if (slot === 'hat') {
    return HATS[id]
      ? <DecoratedAvatar character={character} size={size * 0.85} hat={id} />
      : <Ionicons name="ban-outline" size={size * 0.7} color={CREATION.muted} />;
  }
  return PINS[id] ? (
    <View style={[styles.pinThumb, { width: size * 0.9, height: size * 0.9, borderRadius: size, backgroundColor: PINS[id].bg }]}>
      <LucideIcon name={PINS[id].icon} size={size * 0.5} color="#FFFFFF" />
    </View>
  ) : (
    <Ionicons name="ban-outline" size={size * 0.7} color={CREATION.muted} />
  );
}

// Live avatar preview on the chosen backdrop; bounces whenever the look changes.
export function AvatarPreview({ character, look, width, height, avatarSize, children }) {
  const bounce = useRef(new Animated.Value(1)).current;
  const key = `${character}|${look.hat}|${look.frame}|${look.pin}|${look.backdrop}`;
  useEffect(() => {
    bounce.setValue(0.92);
    Animated.spring(bounce, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [key, bounce]);
  return (
    <ChamferFrame width={width} height={height} cut={14} fill={CREATION.card}>
      <ProfileBackdrop id={look.backdrop} style={styles.previewBackdrop}>
        <View style={styles.previewShade} />
        <Animated.View style={{ transform: [{ scale: bounce }] }}>
          <DecoratedAvatar character={character} size={avatarSize} hat={look.hat} frame={look.frame} pin={look.pin} />
        </Animated.View>
        {children}
      </ProfileBackdrop>
    </ChamferFrame>
  );
}

// Guide picker in the creator style, for screens that just switch the guide
// (character creation has its own animated first step).
export function GuidePicker({ value, onChange, width }) {
  const tileW = Math.floor((width - 24) / 3);
  const tileH = Math.round(tileW * 1.1);
  return (
    <View style={styles.guideGrid}>
      {CHARACTERS.map((c, i) => {
        const selected = value === c.id;
        return (
          <RiseIn key={c.id} index={i}>
            <PopPressable onPress={() => onChange(c.id)} accessibilityLabel={`Choose ${c.name}`}>
              <View style={{ width: tileW, alignItems: 'center' }}>
                <ChamferFrame
                  width={tileW}
                  height={tileH}
                  cut={11}
                  fill={c.tint}
                  stroke={selected ? CREATION.blue : undefined}
                  strokeWidth={3}
                >
                  <Image source={c.image} style={styles.guideImg} resizeMode="cover" />
                  {selected && (
                    <View style={styles.guideCheck}>
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    </View>
                  )}
                </ChamferFrame>
                <Text style={[styles.guideName, selected && { color: CREATION.blue }]} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.guideTitle} numberOfLines={1}>{c.title}</Text>
              </View>
            </PopPressable>
          </RiseIn>
        );
      })}
    </View>
  );
}

/**
 * Category grid (Hat / Frame / Pin / Backdrop) that opens an item grid.
 * `panel` (null or a slot) is controlled so a screen's back button can close it.
 * Tiles are sized from the measured panel width so three always fit per row.
 */
export function CustomizePanel({ catalog, look, onLookChange, character, panel, onPanelChange, onReset, resetLabel = 'Reset ↺' }) {
  const [panelW, setPanelW] = useState(null);
  const anim = useRef(new Animated.Value(1)).current;
  const prevPanel = useRef(panel);
  useEffect(() => {
    if (prevPanel.current === panel) return;
    prevPanel.current = panel;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [panel, anim]);

  const slide = { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [panel ? 40 : -40, 0] }) }] };
  const measure = (e) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== panelW) setPanelW(w);
  };
  const innerW = panelW ?? 300;

  if (!panel) {
    const cellW = Math.floor((innerW - 10) / 2);
    return (
      <Animated.View style={slide}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>CUSTOMIZE</Text>
          {onReset && (
            <PopPressable onPress={onReset} accessibilityLabel="Reset look">
              <Text style={styles.panelLink}>{resetLabel}</Text>
            </PopPressable>
          )}
        </View>
        <View style={styles.catGrid} onLayout={measure}>
          {SLOTS.map((s, i) => {
            const count = catalog.filter((c) => c.slot === s.slot).length;
            const changed = look[s.slot] !== '';
            return (
              <RiseIn key={s.slot} index={i}>
                <PopPressable onPress={() => onPanelChange(s.slot)} accessibilityLabel={`Choose ${s.label}`}>
                  <View style={[styles.catCell, { width: cellW }]}>
                    {changed && <View style={styles.catDot} />}
                    <View style={styles.catThumb}>
                      <ItemThumb
                        slot={s.slot}
                        id={look[s.slot] || (s.slot === 'backdrop' ? '' : catalog.find((c) => c.slot === s.slot && c.id)?.id || '')}
                        character={character}
                        size={34}
                      />
                    </View>
                    <Text style={styles.catLabel}>{s.label.toUpperCase()} ({count})</Text>
                  </View>
                </PopPressable>
              </RiseIn>
            );
          })}
        </View>
      </Animated.View>
    );
  }

  const items = catalog.filter((c) => c.slot === panel);
  const cell = Math.floor((innerW - 16) / 3);
  const slotLabel = SLOTS.find((s) => s.slot === panel)?.label || '';
  return (
    <Animated.View style={slide}>
      <PopPressable onPress={() => onPanelChange(null)} accessibilityLabel="Back to categories">
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>← {slotLabel.toUpperCase()}S ({items.length})</Text>
        </View>
      </PopPressable>
      <View style={styles.itemGrid} onLayout={measure}>
        {items.map((it, i) => {
          const selected = look[panel] === it.id;
          return (
            <RiseIn key={`${panel}-${it.id || 'none'}`} index={i}>
              <PopPressable
                disabled={!it.unlocked}
                onPress={() => onLookChange({ ...look, [panel]: it.id })}
                accessibilityLabel={it.unlocked ? it.name : `${it.name}, unlocks at ${it.min_xp} XP`}
              >
                <ChamferFrame
                  width={cell}
                  height={cell + 18}
                  cut={9}
                  bg="#FFFDF4"
                  fill={selected ? '#EEF2FF' : '#F7F0D8'}
                  stroke={selected ? CREATION.blue : undefined}
                  strokeWidth={2.5}
                >
                  <View style={[styles.itemInner, !it.unlocked && { opacity: 0.4 }]}>
                    <ItemThumb slot={panel} id={it.id} character={character} size={34} />
                    <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                  </View>
                  {!it.unlocked && (
                    <View style={styles.lockBadge}>
                      <LucideIcon name="lock" size={10} color="#FFFFFF" />
                      <Text style={styles.lockText}>{it.min_xp} XP</Text>
                    </View>
                  )}
                </ChamferFrame>
              </PopPressable>
            </RiseIn>
          );
        })}
      </View>
    </Animated.View>
  );
}

// Horizontal strip of ready-made looks built from unlocked starter items.
export function StarterLooks({ catalog, character, onPick }) {
  const looks = useMemo(() => {
    const unlocked = unlockedBySlot(catalog);
    return STARTER_LOOKS.filter((l) => ['hat', 'frame', 'pin'].every((slot) => unlocked[slot]?.includes(l[slot])));
  }, [catalog]);
  if (looks.length === 0) return null;
  return (
    <View style={styles.premade}>
      <Text style={styles.premadeTitle}>Starter looks</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
        {looks.map((l, i) => (
          <RiseIn key={i} index={i} delay={150}>
            <PopPressable onPress={() => onPick({ hat: l.hat, frame: l.frame, pin: l.pin })} accessibilityLabel={`Starter look ${i + 1}`}>
              <ChamferFrame width={64} height={64} cut={10} fill={l.tile}>
                <View style={styles.premadeInner}>
                  <DecoratedAvatar character={character} size={30} hat={l.hat} frame={l.frame} pin={l.pin} />
                </View>
              </ChamferFrame>
            </PopPressable>
          </RiseIn>
        ))}
      </ScrollView>
    </View>
  );
}

export const customizerStyles = StyleSheet.create({
  // The cream card that holds a CustomizePanel.
  panelCard: {
    marginTop: 16, padding: 12, backgroundColor: '#FFFDF4',
    borderWidth: 1, borderColor: CREATION.sandDeep, borderRadius: 4,
  },
});

const styles = StyleSheet.create({
  previewBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(234, 223, 184, 0.35)' },

  guideGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 12, rowGap: 12 },
  guideImg: { width: '100%', height: '100%' },
  guideCheck: {
    position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: CREATION.blue, alignItems: 'center', justifyContent: 'center',
  },
  guideName: { fontFamily: FONTS.bold, fontSize: 12.5, color: CREATION.ink, textAlign: 'center', marginTop: 6 },
  guideTitle: { fontFamily: FONTS.regular, fontSize: 10.5, color: CREATION.muted, textAlign: 'center' },

  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  panelTitle: { fontFamily: GUIDE_FONTS.display, fontSize: 13, color: CREATION.ink, letterSpacing: 0.5 },
  panelLink: { fontFamily: FONTS.semiBold, fontSize: 12, color: CREATION.blue },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  catCell: { alignItems: 'center', paddingVertical: 12, backgroundColor: '#F7F0D8', borderRadius: 4 },
  catThumb: { height: 50, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontFamily: FONTS.bold, fontSize: 11, color: CREATION.muted, marginTop: 6, letterSpacing: 0.4 },
  catDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, backgroundColor: CREATION.green },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  itemInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  itemName: { fontFamily: FONTS.medium, fontSize: 10, color: CREATION.ink, marginTop: 6, textAlign: 'center' },
  lockBadge: {
    position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(30,27,22,0.75)', paddingHorizontal: 5, paddingVertical: 2,
  },
  lockText: { fontFamily: FONTS.bold, fontSize: 9, color: '#FFFFFF' },
  pinThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

  premade: { marginTop: 16 },
  premadeTitle: { fontFamily: FONTS.bold, fontSize: 12, color: CREATION.ink, marginBottom: 8 },
  premadeInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
