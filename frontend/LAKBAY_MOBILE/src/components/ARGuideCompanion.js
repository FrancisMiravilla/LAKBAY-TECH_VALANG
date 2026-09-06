import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// HTML template for embedding Google <model-viewer> inside a transparent WebView
const buildGuideViewerHTML = (modelUrl) => {
  if (!modelUrl) return null;
  const safe = String(modelUrl).replace(/["'<>&]/g, (c) => ({
    '"': '&quot;',
    "'": '&#39;',
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
  }[c]));

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js" crossorigin="anonymous"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:100%;height:100%;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;}
    model-viewer{
      width:100%;
      height:100%;
      --progress-bar-color:transparent;
      background:transparent;
    }
  </style>
</head>
<body>
  <model-viewer
    src="${safe}"
    auto-rotate
    rotation-per-second="25deg"
    camera-controls
    disable-zoom
    disable-pan
    interaction-prompt="none"
    bounds="tight"
    camera-orbit="0deg 75deg 110%"
    min-camera-orbit="auto auto 60%"
    max-camera-orbit="auto auto 200%"
    exposure="1.2"
    shadow-intensity="0"
    style="width:100%;height:100%"
  ></model-viewer>
</body>
</html>`;
};

export default function ARGuideCompanion({
  arTargets = [],
  modelUrl = null,
  activeClue = null,
  onOpenFullModal,
  rarityThemes = {},
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedModelUri, setResolvedModelUri] = useState(modelUrl);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  // Filter targets that have hints
  const validTargets = arTargets.filter((t) => t.hint && t.hint.trim().length > 0);

  // Load bundled 3D model asset (Cool guy low poly.glb)
  useEffect(() => {
    let isMounted = true;
    async function loadGuideAsset() {
      if (modelUrl) {
        setResolvedModelUri(modelUrl);
        return;
      }
      try {
        const asset = Asset.fromModule(require('../assets/models/cool_guy_low_poly.glb'));
        await asset.downloadAsync();
        if (isMounted) {
          setResolvedModelUri(asset.localUri || asset.uri);
        }
      } catch (err) {
        console.log('[ARGuideCompanion] Local model load error:', err);
      }
    }
    loadGuideAsset();
    return () => {
      isMounted = false;
    };
  }, [modelUrl]);

  // Bobbing float animation for 3D model container
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  // Pulse animation for radar ring
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // When parent passes a new activeClue (e.g. from 12s auto-timer), pop open the speech bubble
  useEffect(() => {
    if (activeClue) {
      const idx = validTargets.findIndex((t) => t.id === activeClue.id);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
      setIsExpanded(true);
    }
  }, [activeClue]);

  // Animate speech bubble expansion
  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, expandAnim]);

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleNextHint = () => {
    if (validTargets.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validTargets.length);
  };

  const handlePrevHint = () => {
    if (validTargets.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + validTargets.length) % validTargets.length);
  };

  const currentTarget = validTargets[currentIndex] || arTargets[0] || null;
  const rarityKey = (currentTarget?.rarity || 'common').toLowerCase();
  const rTheme = rarityThemes[rarityKey] || {
    label: 'COMMON',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.18)',
    border: '#10B981',
    emoji: '🏺',
  };

  const bubbleScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const bubbleOpacity = expandAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.5, 1],
  });

  const bubbleTranslateX = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* ── Speech Bubble (Expands to the left of the 3D Avatar) ── */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.speechBubble,
            {
              opacity: bubbleOpacity,
              transform: [{ scale: bubbleScale }, { translateX: bubbleTranslateX }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.bubbleHeader}>
            <View style={styles.bubbleTitleRow}>
              <View style={styles.guideTag}>
                <Ionicons name="sparkles" size={11} color={COLORS.gold} />
                <Text style={styles.guideTagText}>3D SCOUT</Text>
              </View>
              <Text style={styles.bubbleTitle} numberOfLines={1}>
                {currentTarget ? `Building ${currentTarget.building || 'S1'} · Slot #${currentTarget.slot_number || 1}` : 'Museum Clues'}
              </Text>
            </View>

            <TouchableOpacity onPress={handleToggleExpand} style={styles.bubbleCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          {/* Target Info */}
          {currentTarget ? (
            <>
              <View style={styles.targetRow}>
                <Text style={styles.targetName} numberOfLines={1}>{currentTarget.name}</Text>
                <View style={[styles.rarityBadge, { backgroundColor: rTheme.bg, borderColor: rTheme.border }]}>
                  <Text style={[styles.rarityText, { color: rTheme.color }]}>{rTheme.label}</Text>
                </View>
              </View>

              {/* Clue Text */}
              <View style={styles.clueBox}>
                <Ionicons name="compass-outline" size={16} color={COLORS.gold} style={{ marginRight: 6, marginTop: 1 }} />
                <Text style={styles.clueText}>
                  {currentTarget.hint ? `"${currentTarget.hint}"` : '"Explore the room and point your camera at paintings and exhibits."'}
                </Text>
              </View>

              {/* Navigation & Controls */}
              <View style={styles.bubbleFooter}>
                <View style={styles.cycleControls}>
                  <TouchableOpacity
                    onPress={handlePrevHint}
                    disabled={validTargets.length <= 1}
                    style={[styles.cycleBtn, validTargets.length <= 1 && styles.cycleBtnDisabled]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={14} color="#FFF" />
                  </TouchableOpacity>

                  <Text style={styles.cycleCountText}>
                    {currentIndex + 1} / {validTargets.length || 1}
                  </Text>

                  <TouchableOpacity
                    onPress={handleNextHint}
                    disabled={validTargets.length <= 1}
                    style={[styles.cycleBtn, validTargets.length <= 1 && styles.cycleBtnDisabled]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-forward" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {onOpenFullModal && (
                  <TouchableOpacity onPress={onOpenFullModal} style={styles.allCluesBtn} activeOpacity={0.8}>
                    <Ionicons name="list" size={12} color={COLORS.gold} style={{ marginRight: 4 }} />
                    <Text style={styles.allCluesBtnText}>All Clues</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <View style={{ paddingVertical: 10, alignItems: 'center' }}>
              <Text style={styles.noCluesText}>No registered AR hints found for this building yet.</Text>
            </View>
          )}

          {/* Speech triangle pointer pointing to the 3D model */}
          <View style={styles.speechPointer} />
        </Animated.View>
      )}

      {/* ── 3D Model Guide Avatar (Docked Top-Right) ── */}
      <Animated.View style={[styles.avatarWrapper, { transform: [{ translateY: floatAnim }] }]}>
        {/* Pulsing Radar Ring Behind Avatar */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.radarRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.25],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />

        {/* 3D Model Floating Bubble Button */}
        <TouchableOpacity
          style={[styles.avatarButton, isExpanded && styles.avatarButtonActive]}
          onPress={handleToggleExpand}
          activeOpacity={0.85}
        >
          {/* Inner 3D Model Viewer or Character Fallback */}
          <View style={styles.modelContainer}>
            {resolvedModelUri ? (
              <WebView
                source={{ html: buildGuideViewerHTML(resolvedModelUri) }}
                style={styles.modelWebView}
                javaScriptEnabled
                originWhitelist={['*']}
                scrollEnabled={false}
                backgroundColor="transparent"
                allowsTransparency
              />
            ) : (
              <View style={styles.fallbackAvatar}>
                <Image
                  source={require('../assets/characters/dante.jpg')}
                  style={styles.fallbackAvatarImg}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>

          {/* Floating Badge Indicator */}
          <View style={styles.badgeIndicator}>
            <Ionicons name={isExpanded ? 'chatbubble' : 'bulb'} size={11} color="#0F172A" />
          </View>
        </TouchableOpacity>

        {/* Small "3D Guide" Label Below Avatar */}
        <View style={styles.guideLabelPill}>
          <View style={styles.onlineDot} />
          <Text style={styles.guideLabelText}>3D GUIDE</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    right: 12,
    zIndex: 90,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  // ── Speech Bubble ──
  speechBubble: {
    width: SCREEN_W * 0.68,
    maxWidth: 270,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.6)',
    padding: 12,
    marginRight: 10,
    marginTop: 4,
    shadowColor: COLORS.gold,
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bubbleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  guideTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  guideTagText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  bubbleTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  bubbleCloseBtn: {
    padding: 2,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 6,
  },
  targetName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFF',
    flex: 1,
  },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  rarityText: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  clueBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  clueText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cycleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cycleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleBtnDisabled: {
    opacity: 0.3,
  },
  cycleCountText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 4,
  },
  allCluesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  allCluesBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.gold,
  },
  noCluesText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  speechPointer: {
    position: 'absolute',
    top: 24,
    right: -7,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(251, 191, 36, 0.8)',
  },

  // ── 3D Avatar Button ──
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  avatarButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarButtonActive: {
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
  },
  modelContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: '#0B1120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatarImg: {
    width: '100%',
    height: '100%',
  },
  badgeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
    elevation: 4,
  },
  guideLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  guideLabelText: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: COLORS.gold,
    letterSpacing: 0.6,
  },
});
