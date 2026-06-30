import React from 'react';
import { View, StyleSheet } from 'react-native';

const SEGMENTS = [
  '#DC2626',  // red
  '#FBBF24',  // gold
  '#16A34A',  // green
  '#1A56DB',  // blue
  '#EA580C',  // orange
  '#FFFFFF',  // white
];

export default function VintaStripe({ height = 4 }) {
  return (
    <View style={[styles.stripe, { height }]}>
      {SEGMENTS.map((color, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stripe: {
    flexDirection: 'row',
    width: '100%',
  },
  segment: {
    flex: 1,
  },
});
