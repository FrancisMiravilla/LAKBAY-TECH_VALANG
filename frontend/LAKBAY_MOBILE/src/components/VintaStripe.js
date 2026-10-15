import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VINTA_COLORS } from '../constants/theme';

const SEGMENTS = VINTA_COLORS;

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
