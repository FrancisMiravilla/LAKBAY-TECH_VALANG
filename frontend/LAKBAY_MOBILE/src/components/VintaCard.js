import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CARD_BORDER_WIDTH, RADIUS, VINTA_COLORS } from '../constants/theme';

const SHEET_RADIUS = 28;

/**
 * White card framed by a smooth Vinta-color gradient border.
 *   style        — outer frame (margins, flex, width, borderRadius)
 *   contentStyle — inner white card (padding, alignment)
 *   sheet        — bottom-sheet variant: border on top and sides only, top corners rounded
 *
 * @param {{
 *   children?: import('react').ReactNode,
 *   style?: import('react-native').StyleProp<import('react-native').ViewStyle>,
 *   contentStyle?: import('react-native').StyleProp<import('react-native').ViewStyle>,
 *   borderWidth?: number,
 *   sheet?: boolean,
 * }} props
 */
export default function VintaCard({
  children, style, contentStyle, borderWidth = CARD_BORDER_WIDTH, sheet = false,
}) {
  const outerRadius = StyleSheet.flatten(style)?.borderRadius ?? (sheet ? SHEET_RADIUS : RADIUS.lg);
  const innerRadius = Math.max(outerRadius - borderWidth, 0);

  const frameShape = sheet
    ? {
        paddingTop: borderWidth,
        paddingHorizontal: borderWidth,
        borderTopLeftRadius: outerRadius,
        borderTopRightRadius: outerRadius,
      }
    : { padding: borderWidth, borderRadius: outerRadius };
  const cardShape = sheet
    ? { borderTopLeftRadius: innerRadius, borderTopRightRadius: innerRadius }
    : { borderRadius: innerRadius };

  return (
    <LinearGradient
      colors={VINTA_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.frame, frameShape, style]}
    >
      <View style={[styles.card, cardShape, contentStyle]}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  frame: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});
