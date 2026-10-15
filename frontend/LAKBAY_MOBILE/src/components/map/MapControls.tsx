import React, { memo, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CAMERA, type IoniconName } from '../../constants/mapConfig';
import { useMap } from './Map';

const BUTTON_SIZE = 48;

// ─── Round feature button (filled when its feature is active) ───────────────
interface FeatureButtonProps {
  icon: IoniconName;
  active?: boolean;
  activeColor?: string;
  onPress: () => void;
  accessibilityLabel: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const FeatureButton = memo(function FeatureButton({
  icon, active = false, activeColor = COLORS.gold, onPress, accessibilityLabel, loading = false, style,
}: FeatureButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      style={[
        styles.button,
        active && { backgroundColor: activeColor, borderColor: activeColor, shadowColor: activeColor },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={active ? '#FFFFFF' : COLORS.accent} />
      ) : (
        <Ionicons name={icon} size={21} color={active ? '#FFFFFF' : COLORS.navy} />
      )}
    </TouchableOpacity>
  );
});

// ─── Zoom +/− card ───────────────────────────────────────────────────────────
export const ZoomControls = memo(function ZoomControls({ style }: { style?: StyleProp<ViewStyle> }) {
  const { cameraRef, mapRef } = useMap();

  const zoomBy = useCallback(
    async (delta: number) => {
      const current = await mapRef.current?.getZoom().catch(() => undefined);
      if (current === undefined) return;
      cameraRef.current?.setCamera({
        zoomLevel: Math.min(20, Math.max(3, current + delta)),
        animationDuration: CAMERA.zoomStepDuration,
        animationMode: 'easeTo',
      });
    },
    [cameraRef, mapRef],
  );

  return (
    <View style={[styles.zoomCard, style]}>
      <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(1)} accessibilityLabel="Zoom in">
        <Ionicons name="add" size={22} color={COLORS.navy} />
      </TouchableOpacity>
      <View style={styles.zoomDivider} />
      <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(-1)} accessibilityLabel="Zoom out">
        <Ionicons name="remove" size={22} color={COLORS.navy} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  zoomCard: {
    width: BUTTON_SIZE,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    elevation: 6,
  },
  zoomBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  zoomDivider: { height: 1, backgroundColor: COLORS.borderLight },
});
