import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import type { IoniconName } from '../constants/mapConfig';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

const TOAST_STYLE: Record<ToastType, { icon: IoniconName; color: string }> = {
  success: { icon: 'checkmark-circle', color: COLORS.teal },
  error: { icon: 'close-circle', color: COLORS.danger },
  warning: { icon: 'warning', color: COLORS.gold },
  info: { icon: 'information-circle', color: '#38BDF8' },
};

interface ToastState {
  message: string;
  type: ToastType;
  key: number;
}

/** Lightweight toast: `const { toast, showToast } = useToast();` then render `{toast}`. */
export function useToast(duration = 2600) {
  const [state, setState] = useState<ToastState | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setState({ message, type, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!state) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 9 }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setState(null));
    }, duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, anim, duration]);

  const toast = state ? (
    <Animated.View
      key={state.key}
      pointerEvents="none"
      style={[
        styles.toast,
        { borderColor: TOAST_STYLE[state.type].color },
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <Ionicons name={TOAST_STYLE[state.type].icon} size={18} color={TOAST_STYLE[state.type].color} />
      <Text style={styles.text} numberOfLines={2}>{state.message}</Text>
    </Animated.View>
  ) : null;

  return { toast, showToast };
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    elevation: 30,
    zIndex: 100,
  },
  text: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.navy },
});
