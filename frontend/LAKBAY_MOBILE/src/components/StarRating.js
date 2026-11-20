import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, COLORS } from '../constants/theme';

const STAR_GOLD = '#F59E0B';
export const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing!'];

// Read-only stars for an average (half stars allowed) or a single review.
export function Stars({ value = 0, size = 14, color = STAR_GOLD, emptyColor = 'rgba(100,116,139,0.45)' }) {
  return (
    <View style={styles.row} accessibilityLabel={`${value || 0} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const name = value >= n ? 'star' : value >= n - 0.5 ? 'star-half' : 'star-outline';
        return <Ionicons key={n} name={name} size={size} color={name === 'star-outline' ? emptyColor : color} />;
      })}
    </View>
  );
}

// Tappable 1-5 stars for the rating form.
export function StarPicker({ value, onChange, size = 38 }) {
  return (
    <View style={[styles.row, { gap: 6 }]} accessibilityRole="adjustable" accessibilityLabel={`Rating: ${value || 0} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          hitSlop={6}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
        >
          <Ionicons name={value >= n ? 'star' : 'star-outline'} size={size} color={value >= n ? STAR_GOLD : COLORS.textFaint} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Compact "★ 4.5 (12)" pill for cards over photos.
export function RatingPill({ average, count, dark = true, style }) {
  const has = count > 0 && average != null;
  return (
    <View style={[styles.pill, dark ? styles.pillDark : styles.pillLight, style]}>
      <Ionicons name="star" size={12} color={STAR_GOLD} />
      <Text style={[styles.pillText, { color: dark ? '#FFFFFF' : COLORS.navy }]}>
        {has ? Number(average).toFixed(1) : 'New'}
      </Text>
      {has && <Text style={[styles.pillCount, { color: dark ? 'rgba(255,255,255,0.75)' : COLORS.textMuted }]}>({count})</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
  },
  pillDark: { backgroundColor: 'rgba(6,18,49,0.55)' },
  pillLight: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border },
  pillText: { fontFamily: FONTS.bold, fontSize: 12 },
  pillCount: { fontFamily: FONTS.medium, fontSize: 11 },
});
