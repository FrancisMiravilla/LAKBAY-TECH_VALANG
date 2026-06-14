import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

export default function GlassCard({ children, style, glowColor, noPadding }) {
  const glow = glowColor || COLORS.accent;
  return (
    <View style={[
      styles.card,
      {
        shadowColor: glow,
        borderColor: glow === COLORS.accent ? COLORS.accentBorder : 'rgba(255,255,255,0.08)',
      },
      !noPadding && styles.padding,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
  },
  padding: {
    padding: 16,
  },
});
