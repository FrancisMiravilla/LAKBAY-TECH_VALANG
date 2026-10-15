import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator, Animated, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SIZES, SPACING, GOLD_TEXT, onWhite } from '../../constants/theme';
import VintaCard from '../VintaCard';
import { SPOT_TYPES } from '../../constants/mapConfig';
import type { MapSpot } from '../../hooks/useMapSpots';

const HTML_ESCAPE: Record<string, string> = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
const escapeAttr = (s: string) => s.replace(/["'<>&]/g, (c) => HTML_ESCAPE[c]);

function build3DViewerHTML(modelUrl: string): string | null {
  try {
    const parsed = new URL(modelUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  } catch {
    return null;
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: radial-gradient(circle at center, #2A3B5C 0%, #0F172A 100%); }
    model-viewer { width: 100%; height: 100%; --progress-bar-color: transparent; }
  </style>
</head>
<body>
  <model-viewer src="${escapeAttr(modelUrl)}" auto-rotate camera-controls exposure="1" shadow-intensity="1" bounds="tight" style="width:100%;height:100%"></model-viewer>
</body>
</html>`;
}

export interface RouteInfo {
  distKm: string;
  mins: number;
}

interface SpotDetailCardProps {
  spot: MapSpot;
  userLevel: number;
  userXp: number;
  routing: boolean;
  routeInfo: RouteInfo | null;
  translateY: Animated.Value;
  bottomInset: number;
  onClose: () => void;
  onDirections: () => void;
}

function SpotDetailCardBase({
  spot, userLevel, userXp, routing, routeInfo, translateY, bottomInset, onClose, onDirections,
}: SpotDetailCardProps) {
  const badge = SPOT_TYPES[spot.primary_type];
  const isQr = spot.feature_types.includes('qr');
  const isCatch = spot.feature_types.includes('catch');
  const isPromotion = spot.feature_types.includes('promotion');
  const reqLvl = spot.required_level;
  const isLocked = reqLvl > userLevel;

  const viewerHtml = useMemo(
    () => ((isCatch || isPromotion) && spot.model_3d ? build3DViewerHTML(spot.model_3d) : null),
    [isCatch, isPromotion, spot.model_3d],
  );

  // Swipe down to close.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 40) onClose();
        },
      }),
    [onClose],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.sheet, { transform: [{ translateY }] }]}
    >
      <VintaCard sheet contentStyle={[styles.sheetInner, { paddingBottom: bottomInset + 16 }]}>
      <View style={styles.dragHandle} />

      <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Close">
        <View style={styles.closeCircle}>
          <Ionicons name="close" size={16} color={COLORS.textSub} />
        </View>
      </TouchableOpacity>

      <View style={styles.badgeRow}>
        <View style={[styles.typeBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <View style={[styles.typeDot, { backgroundColor: badge.color }]} />
          <Ionicons name={badge.icon} size={11} color={onWhite(badge.color)} style={{ marginRight: 4 }} />
          <Text style={[styles.typeBadgeText, { color: onWhite(badge.color) }]}>{badge.label}</Text>
        </View>

        {(isQr || isCatch || reqLvl > 1) && (
          <>
            {isLocked ? (
              <View style={styles.lockedPill}>
                <Ionicons name="lock-closed" size={10} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={styles.lockedPillText}>LOCKED · LVL {reqLvl}</Text>
              </View>
            ) : (
              <View style={styles.unlockedPill}>
                <Ionicons name="checkmark-circle" size={10} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.unlockedPillText}>UNLOCKED · LVL {reqLvl}</Text>
              </View>
            )}
            <View style={styles.xpPill}>
              <Ionicons name="sparkles" size={10} color={GOLD_TEXT} style={{ marginRight: 4 }} />
              <Text style={styles.xpPillText}>+{spot.xp_reward} XP</Text>
            </View>
          </>
        )}
      </View>

      <Text style={styles.name}>{spot.name}</Text>

      {!!spot.location_name && (
        <View style={styles.infoRow}>
          <Ionicons name="location-sharp" size={13} color="#0284C7" />
          <Text style={styles.infoText}>{spot.location_name}</Text>
        </View>
      )}
      <View style={styles.infoRow}>
        <Ionicons name="navigate-circle-outline" size={13} color="#0284C7" />
        <Text style={styles.infoTextMuted} selectable>
          {spot.latitude.toFixed(5)}, {spot.longitude.toFixed(5)}
        </Text>
      </View>

      {isLocked && (
        <View style={styles.lockedAlert}>
          <View style={styles.lockedAlertTop}>
            <Ionicons name="lock-closed" size={15} color="#DC2626" />
            <Text style={styles.lockedAlertTitle}>SPOT IS LEVEL LOCKED</Text>
          </View>
          <Text style={styles.lockedAlertText}>
            This {isCatch && isQr ? 'quest location' : isCatch ? 'Catch zone' : isQr ? 'QR scan spot' : 'cultural landmark'} is locked! In order for you to unlock and experience this location, reach{' '}
            <Text style={styles.lockedAlertHighlight}>Explorer Level {reqLvl}</Text>{' '}
            by collecting XP in other quests and activities.
          </Text>
          <Text style={styles.lockedAlertXpHint}>
            Your Current Rank: <Text style={styles.lockedAlertUserLvl}>Level {userLevel}</Text> ({userXp % 100}/100 XP)
          </Text>
        </View>
      )}

      {viewerHtml ? (
        <View style={styles.media}>
          <WebView
            source={{ html: viewerHtml }}
            style={styles.mediaWebview}
            javaScriptEnabled
            originWhitelist={['*']}
            scrollEnabled={false}
            mixedContentMode="always"
            androidLayerType="hardware"
          />
        </View>
      ) : isPromotion && spot.image ? (
        <View style={styles.media}>
          <Image source={{ uri: spot.image }} style={styles.mediaImage} resizeMode="cover" />
        </View>
      ) : null}

      <View style={styles.divider} />

      {!!spot.description && <Text style={styles.desc} numberOfLines={2}>{spot.description}</Text>}

      <TouchableOpacity
        style={[styles.directionsBtn, routing && styles.directionsBtnLoading]}
        onPress={onDirections}
        disabled={routing}
        activeOpacity={0.85}
      >
        {routing ? (
          <>
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.directionsBtnText}>Finding Route…</Text>
          </>
        ) : routeInfo ? (
          <>
            <Ionicons name="camera" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.directionsBtnText}>Travel Now · {routeInfo.distKm} km</Text>
          </>
        ) : (
          <>
            <Ionicons name="navigate-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.directionsBtnText}>Get Directions</Text>
          </>
        )}
      </TouchableOpacity>
      </VintaCard>
    </Animated.View>
  );
}

export const SpotDetailCard = memo(SpotDetailCardBase);

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  sheetInner: {
    paddingHorizontal: SPACING.lg, paddingTop: 12,
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 14,
  },
  close: { position: 'absolute', top: 20, right: 20, zIndex: 2 },
  closeCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10, paddingRight: 40 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1,
  },
  typeDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  typeBadgeText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  lockedPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.55)',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  lockedPillText: { fontFamily: FONTS.bold, fontSize: 10, color: '#EF4444', letterSpacing: 0.5 },
  unlockedPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(16,185,129,0.5)',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  unlockedPillText: { fontFamily: FONTS.bold, fontSize: 10, color: '#059669', letterSpacing: 0.5 },
  xpPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.18)', borderColor: 'rgba(251,191,36,0.5)',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  xpPillText: { fontFamily: FONTS.bold, fontSize: 10, color: GOLD_TEXT, letterSpacing: 0.5 },
  name: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.navy, marginBottom: 5, paddingRight: 36, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  infoText: { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: '#0284C7', flexShrink: 1 },
  infoTextMuted: { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: COLORS.textMuted },
  lockedAlert: {
    backgroundColor: '#FEF2F2', borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 6, marginBottom: 6,
  },
  lockedAlertTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  lockedAlertTitle: { fontFamily: FONTS.bold, fontSize: 12, color: '#DC2626', letterSpacing: 0.5 },
  lockedAlertText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSub, lineHeight: 18, marginBottom: 6 },
  lockedAlertHighlight: { fontFamily: FONTS.bold, color: COLORS.accent },
  lockedAlertXpHint: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textMuted },
  lockedAlertUserLvl: { fontFamily: FONTS.bold, color: GOLD_TEXT },
  media: { width: '100%', height: 180, marginTop: 8, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: '#0F172A' },
  mediaWebview: { flex: 1, backgroundColor: 'transparent' },
  mediaImage: { width: '100%', height: '100%' },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 10 },
  desc: { fontFamily: FONTS.regular, fontSize: SIZES.fontSm, color: COLORS.textSub, lineHeight: 20, marginBottom: 14 },
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 14,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  directionsBtnLoading: { backgroundColor: 'rgba(26,86,219,0.5)' },
  directionsBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF' },
});
