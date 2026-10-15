import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import { SPOT_TYPES, SPOT_TYPE_ORDER, type SpotType } from '../../constants/mapConfig';

interface CategoryChipsProps {
  counts: Record<SpotType, number>;
  active: SpotType | null;
  onToggle: (type: SpotType) => void;
}

function CategoryChipsBase({ counts, active, onToggle }: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {SPOT_TYPE_ORDER.map((type) => {
        const cfg = SPOT_TYPES[type];
        const isActive = active === type;
        const dimmed = active !== null && !isActive;
        return (
          <TouchableOpacity
            key={type}
            onPress={() => onToggle(type)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${cfg.shortLabel}: ${counts[type]} in view`}
            style={[
              styles.chip,
              isActive && { backgroundColor: cfg.color, borderColor: cfg.color },
              dimmed && styles.dimmed,
            ]}
          >
            <View style={[styles.dot, { backgroundColor: isActive ? '#fff' : cfg.color }]}>
              <Ionicons name={cfg.icon} size={10} color={isActive ? cfg.color : '#fff'} />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{cfg.shortLabel}</Text>
            <View style={[styles.count, isActive && styles.countActive]}>
              <Text style={[styles.countText, isActive && styles.countTextActive]}>{counts[type]}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export const CategoryChips = memo(CategoryChipsBase);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 14, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    elevation: 4,
  },
  dimmed: { opacity: 0.55 },
  dot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.navy },
  labelActive: { color: '#FFFFFF' },
  count: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countActive: { backgroundColor: 'rgba(0,0,0,0.18)' },
  countText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.navy },
  countTextActive: { color: '#FFFFFF' },
});
