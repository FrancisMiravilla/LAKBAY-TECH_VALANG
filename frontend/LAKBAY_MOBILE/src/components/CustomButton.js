import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

export default function CustomButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const bgColor = {
    primary:   COLORS.accent,
    secondary: COLORS.gold,
    outline:   'transparent',
    ghost:     'transparent',
  }[variant];

  const textColor = {
    primary:   '#FFF',
    secondary: '#000',
    outline:   COLORS.accent,
    ghost:     COLORS.textSub,
  }[variant];

  const borderColor = variant === 'outline' ? COLORS.accent : 'transparent';
  const shadow = variant === 'primary' ? SHADOW.accent : variant === 'secondary' ? SHADOW.gold : {};

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: bgColor, borderColor, borderWidth: variant === 'outline' ? 1.5 : 0 },
          shadow,
          (disabled || loading) && styles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'secondary' ? '#000' : '#FFF'} />
        ) : (
          <Text style={[styles.text, { color: textColor, fontFamily: FONTS.bold }, textStyle]}>
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.45,
  },
});
