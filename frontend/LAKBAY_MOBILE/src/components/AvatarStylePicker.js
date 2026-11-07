import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOW } from '../constants/theme';
import LucideIcon from './LucideIcon';
import DecoratedAvatar, { ProfileBackdrop } from './DecoratedAvatar';
import { HATS, PINS } from '../constants/cosmetics';

// Hat / frame / pin / backdrop picker used in Edit Profile. Items unlock with
// XP tiers (catalog from GET /api/auth/cosmetics/); the server re-checks on save.

const TABS = [
  { slot: 'hat',      label: 'Hats',      icon: 'crown' },
  { slot: 'frame',    label: 'Frames',    icon: 'target' },
  { slot: 'pin',      label: 'Pins',      icon: 'medal' },
  { slot: 'backdrop', label: 'Backdrops', icon: 'palm' },
];
const TIER_NAMES = {
  1: 'Coastal Scout', 2: 'Vinta Helmsman', 3: 'Strait Navigator',
  4: 'Harbor Sentinel', 5: 'Archipelago Voyager', 6: 'Admiral of the Western Seas',
};

function ItemPreview({ slot, id, character }) {
  if (slot === 'backdrop') return <ProfileBackdrop id={id} style={styles.backdropThumb} />;
  if (slot === 'frame') return <DecoratedAvatar character={character} size={46} frame={id} />;
  if (slot === 'hat') {
    return HATS[id]
      ? <DecoratedAvatar character={character} size={40} hat={id} />
      : <Ionicons name="ban-outline" size={30} color={COLORS.textFaint} />;
  }
  return PINS[id] ? (
    <View style={[styles.pinThumb, { backgroundColor: PINS[id].bg }]}>
      <LucideIcon name={PINS[id].icon} size={24} color="#FFFFFF" />
    </View>
  ) : (
    <Ionicons name="ban-outline" size={30} color={COLORS.textFaint} />
  );
}

export default function AvatarStylePicker({ catalog, value, onChange, character }) {
  const [tab, setTab] = useState('hat');
  const items = useMemo(() => (catalog || []).filter((i) => i.slot === tab), [catalog, tab]);

  return (
    <View>
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = t.slot === tab;
          return (
            <TouchableOpacity key={t.slot} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.slot)}>
              <LucideIcon name={t.icon} size={14} color={active ? '#FFFFFF' : COLORS.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.grid}>
        {items.map((item) => {
          const selected = value[tab] === item.id;
          return (
            <TouchableOpacity
              key={item.id || 'none'}
              style={[styles.item, selected && styles.itemSelected, !item.unlocked && styles.itemLocked]}
              activeOpacity={0.85}
              disabled={!item.unlocked}
              onPress={() => onChange({ ...value, [tab]: item.id })}
            >
              <View style={styles.itemArt}>
                <ItemPreview slot={tab} id={item.id} character={character} />
              </View>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              {item.unlocked ? (
                selected ? <Text style={styles.itemEquipped}>Equipped</Text> : <Text style={styles.itemHint}>Tap to use</Text>
              ) : (
                <>
                  <View style={styles.lockRow}>
                    <LucideIcon name="lock" size={11} color={COLORS.textMuted} />
                    <Text style={styles.itemHint} numberOfLines={1}>{item.min_xp} XP</Text>
                  </View>
                  <Text style={styles.tierText} numberOfLines={1}>{TIER_NAMES[item.tier]}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, padding: 4, backgroundColor: COLORS.bg, borderRadius: 24, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 20 },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textMuted },
  tabTextActive: { color: '#FFFFFF' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  item: {
    width: '31.5%', minHeight: 132, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, backgroundColor: '#FFFFFF',
  },
  itemSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  itemLocked: { opacity: 0.55 },
  itemArt: { height: 66, alignItems: 'center', justifyContent: 'center' },
  backdropThumb: { width: 64, height: 46, borderRadius: 10, overflow: 'hidden' },
  pinThumb: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF', ...SHADOW.card,
  },
  itemName: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.navy, textAlign: 'center', marginTop: 4 },
  itemEquipped: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.accent, marginTop: 2 },
  itemHint: { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  tierText: { fontFamily: FONTS.regular, fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
});
