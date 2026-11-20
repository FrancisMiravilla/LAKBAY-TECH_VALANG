import React, { memo, useMemo, useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, GUIDE_FONTS, SHADOW } from '../constants/theme';
import LucideIcon from './LucideIcon';
import { RatingPill } from './StarRating';

// "Local Favorites": published promotions in a bento grid. Each group of three is
// one tall tile beside two stacked ones, alternating sides; a leftover pair sits
// side by side and a single leftover tile spans the row.

const FALLBACK = require('../assets/zamboanga.jpg');
const SMALL_H = 150;
const GAP = 10;
const BIG_H = SMALL_H * 2 + GAP;
const PREVIEW = 6;

const Tile = memo(function Tile({ item, big, height, onOpen }) {
  return (
    <TouchableOpacity
      style={[styles.tile, { height }]}
      activeOpacity={0.9}
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.kindLabel}`}
    >
      <ImageBackground
        source={item.image ? { uri: item.image } : FALLBACK}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.tileImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(6,18,49,0.35)', 'rgba(6,18,49,0)', 'rgba(6,18,49,0.82)']}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.kindPill}>
        <Text style={styles.kindText}>{item.kindLabel}</Text>
      </View>
      <View style={styles.tileBottom}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, big && styles.nameBig]} numberOfLines={1}>{item.title}</Text>
          <RatingPill average={item.ratingAvg} count={item.ratingCount} />
        </View>
        <View style={styles.locRow}>
          <LucideIcon name="pin" size={12} color="rgba(255,255,255,0.85)" />
          <Text style={styles.loc} numberOfLines={1}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

function chunk(items) {
  const groups = [];
  for (let i = 0; i < items.length; i += 3) groups.push(items.slice(i, i + 3));
  return groups;
}

function PromoBentoGrid({ items, onOpen }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, PREVIEW);
  const groups = useMemo(() => chunk(visible), [visible]);

  if (items.length === 0) return null;

  return (
    <View>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Local Favorites</Text>
          <Text style={styles.subtitle}>Places and businesses promoted by locals</Text>
        </View>
        {items.length > PREVIEW && (
          <TouchableOpacity style={styles.viewAll} onPress={() => setShowAll((v) => !v)} activeOpacity={0.85}>
            <Text style={styles.viewAllText}>{showAll ? 'Show Less' : 'View All'}</Text>
            <Ionicons name={showAll ? 'chevron-up' : 'arrow-forward'} size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}
      </View>

      {groups.map((g, gi) => {
        if (g.length === 1) {
          return (
            <View key={g[0].key} style={styles.row}>
              <View style={{ flex: 1 }}><Tile item={g[0]} big height={SMALL_H + 30} onOpen={onOpen} /></View>
            </View>
          );
        }
        if (g.length === 2) {
          return (
            <View key={g[0].key} style={styles.row}>
              {g.map((it) => (
                <View key={it.key} style={{ flex: 1 }}><Tile item={it} height={SMALL_H + 30} onOpen={onOpen} /></View>
              ))}
            </View>
          );
        }
        const bigLeft = gi % 2 === 0;
        const big = (
          <View key="big" style={styles.bigCol}><Tile item={g[0]} big height={BIG_H} onOpen={onOpen} /></View>
        );
        const smalls = (
          <View key="small" style={styles.smallCol}>
            <Tile item={g[1]} height={SMALL_H} onOpen={onOpen} />
            <Tile item={g[2]} height={SMALL_H} onOpen={onOpen} />
          </View>
        );
        return (
          <View key={g[0].key} style={styles.row}>
            {bigLeft ? [big, smalls] : [smalls, big]}
          </View>
        );
      })}
    </View>
  );
}

export default memo(PromoBentoGrid);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  title: { fontFamily: GUIDE_FONTS.bold, fontSize: 19, color: COLORS.navy },
  subtitle: { fontFamily: FONTS.medium, fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 },
  viewAll: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.accentSoft, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  viewAllText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.accent },

  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  bigCol: { flex: 1.55 },
  smallCol: { flex: 1, gap: GAP },

  tile: {
    borderRadius: 22, overflow: 'hidden', backgroundColor: COLORS.navy,
    justifyContent: 'space-between',
    ...SHADOW.card,
  },
  tileImage: { borderRadius: 22 },
  kindPill: {
    alignSelf: 'flex-start', margin: 10,
    backgroundColor: 'rgba(12,36,97,0.72)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 4,
  },
  kindText: { fontFamily: FONTS.semiBold, fontSize: 10.5, color: '#FFFFFF', letterSpacing: 0.6 },
  tileBottom: { paddingHorizontal: 12, paddingBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    flex: 1, fontFamily: FONTS.semiBold, fontSize: 15, color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5,
  },
  nameBig: { fontSize: 18 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  loc: { flex: 1, fontFamily: FONTS.medium, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' },
});
