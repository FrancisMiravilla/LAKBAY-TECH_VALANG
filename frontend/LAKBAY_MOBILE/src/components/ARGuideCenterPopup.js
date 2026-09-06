import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// HTML template for embedding Google <model-viewer> inside a transparent WebView
const buildCenterModelViewerHTML = (modelUrl) => {
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
    rotation-per-second="20deg"
    camera-controls
    disable-zoom
    disable-pan
    interaction-prompt="none"
    bounds="tight"
    camera-orbit="0deg 75deg 105%"
    min-camera-orbit="auto auto 60%"
    max-camera-orbit="auto auto 200%"
    exposure="1.25"
    shadow-intensity="1"
    style="width:100%;height:100%"
  ></model-viewer>
</body>
</html>`;
};

export default function ARGuideCenterPopup({
  visible = false,
  onClose,
  arTargets = [],
  activeTarget = null,
  modelUrl = null,
  onOpenFullList,
  rarityThemes = {},
}) {
  const [resolvedModelUri, setResolvedModelUri] = useState(modelUrl);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseRingAnim = useRef(new Animated.Value(1)).current;
  const rotatePedestalAnim = useRef(new Animated.Value(0)).current;

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
        console.log('[ARGuideCenterPopup] Local model load error:', err);
      }
    }
    loadGuideAsset();
    return () => {
      isMounted = false;
    };
  }, [modelUrl]);

  // Set active target index when modal opens with a specific target
  useEffect(() => {
    if (activeTarget && validTargets.length > 0) {
      const idx = validTargets.findIndex((t) => t.id === activeTarget.id);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [activeTarget, validTargets]);

  // Modal open/close animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Subtle floating bob animation for the 3D model character
  useEffect(() => {
    if (!visible) return;
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [visible, floatAnim]);

  // Pulsing hologram rings
  useEffect(() => {
    if (!visible) return;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRingAnim, {
          toValue: 1.4,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseRingAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [visible, pulseRingAnim]);

  // Pedestal rotation effect
  useEffect(() => {
    if (!visible) return;
    const rotateLoop = Animated.loop(
      Animated.timing(rotatePedestalAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();
    return () => rotateLoop.stop();
  }, [visible, rotatePedestalAnim]);

  const handleNextHint = () => {
    if (validTargets.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validTargets.length);
  };

  const handlePrevHint = () => {
    if (validTargets.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + validTargets.length) % validTargets.length);
  };

  const currentTarget = validTargets[currentIndex] || activeTarget || arTargets[0] || null;
  const rarityKey = (currentTarget?.rarity || 'common').toLowerCase();
  const rTheme = rarityThemes[rarityKey] || {
    label: 'COMMON',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.18)',
    border: '#10B981',
    emoji: '🏺',
  };

  const pedestalRotation = rotatePedestalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.popupContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Hologram Transmission Header */}
          <View style={styles.transmissionHeader}>
            <View style={styles.holoBadge}>
              <View style={styles.holoDot} />
              <Text style={styles.holoBadgeText}>3D SCOUT HINT TRANSMISSION</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeCircleBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Center 3D Model Character & Holographic Pedestal */}
          <View style={styles.modelSection}>
            {/* Holographic Pedestal Base */}
            <View style={styles.pedestalWrapper}>
              <Animated.View
                style={[
                  styles.pedestalOuterRing,
                  {
                    transform: [{ scale: pulseRingAnim }],
                    opacity: pulseRingAnim.interpolate({
                      inputRange: [1, 1.4],
                      outputRange: [0.7, 0],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pedestalInnerRing,
                  { transform: [{ rotate: pedestalRotation }] },
                ]}
              />
              <View style={styles.pedestalGlow} />
            </View>

            {/* 3D Character Viewport (Floating slightly above pedestal) */}
            <Animated.View style={[styles.modelBox, { transform: [{ translateY: floatAnim }] }]}>
              {resolvedModelUri ? (
                <WebView
                  source={{ html: buildCenterModelViewerHTML(resolvedModelUri) }}
                  style={styles.modelWebView}
                  javaScriptEnabled
                  originWhitelist={['*']}
                  scrollEnabled={false}
                  backgroundColor="transparent"
                  allowsTransparency
                />
              ) : (
                <View style={styles.fallbackBox}>
                  <Image
                    source={require('../assets/characters/dante.jpg')}
                    style={styles.fallbackImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </Animated.View>
          </View>

          {/* Dialogue Speech Card Spoken by the 3D Character */}
          <View style={styles.dialogueCard}>
            {/* Speaker Tag & Clue Target Title */}
            <View style={styles.dialogueHeader}>
              <View style={styles.speakerRow}>
                <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.gold} />
                <Text style={styles.speakerName}>Scout Dante says:</Text>
              </View>

              {currentTarget && (
                <View style={[styles.rarityPill, { backgroundColor: rTheme.bg, borderColor: rTheme.border }]}>
                  <Text style={[styles.rarityText, { color: rTheme.color }]}>{rTheme.label}</Text>
                </View>
              )}
            </View>

            {currentTarget ? (
              <>
                {/* Target Slot Info */}
                <View style={styles.targetInfoRow}>
                  <Text style={styles.targetSlotText}>
                    🏛️ Building {currentTarget.building || 'S1'} · Slot #{currentTarget.slot_number || 1}
                  </Text>
                  <Text style={styles.targetNameText} numberOfLines={1}>
                    {currentTarget.name}
                  </Text>
                </View>

                {/* Spoken Hint Text */}
                <View style={styles.hintQuoteBox}>
                  <Ionicons name="compass" size={18} color={COLORS.gold} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.hintQuoteText}>
                    {currentTarget.hint ? `"${currentTarget.hint}"` : '"Explore the gallery and aim your camera at the cultural paintings and historical artifacts."'}
                  </Text>
                </View>

                {/* Navigation and Cycle Buttons */}
                <View style={styles.cardControlsRow}>
                  <View style={styles.cycleGroup}>
                    <TouchableOpacity
                      onPress={handlePrevHint}
                      disabled={validTargets.length <= 1}
                      style={[styles.cycleBtn, validTargets.length <= 1 && styles.cycleBtnDisabled]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={16} color="#FFF" />
                    </TouchableOpacity>

                    <Text style={styles.cycleIndicatorText}>
                      Clue {currentIndex + 1} of {validTargets.length || 1}
                    </Text>

                    <TouchableOpacity
                      onPress={handleNextHint}
                      disabled={validTargets.length <= 1}
                      style={[styles.cycleBtn, validTargets.length <= 1 && styles.cycleBtnDisabled]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  {onOpenFullList && (
                    <TouchableOpacity onPress={onOpenFullList} style={styles.allTargetsBtn} activeOpacity={0.8}>
                      <Ionicons name="grid-outline" size={13} color={COLORS.gold} style={{ marginRight: 4 }} />
                      <Text style={styles.allTargetsBtnText}>All Targets</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Text style={styles.noCluesText}>No registered clues for this exhibit building yet.</Text>
              </View>
            )}

            {/* Action Button: Search Now / Dismiss */}
            <TouchableOpacity style={styles.actionDismissBtn} onPress={onClose} activeOpacity={0.85}>
              <Ionicons name="scan-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionDismissBtnText}>Got It! Search Now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 24, 0.84)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  popupContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 18,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  transmissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  holoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  holoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  holoBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 0.8,
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── 3D Model Viewport & Pedestal ──
  modelSection: {
    width: '100%',
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  modelBox: {
    width: 220,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modelWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  fallbackBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
  },
  pedestalWrapper: {
    position: 'absolute',
    bottom: 8,
    width: 160,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalOuterRing: {
    position: 'absolute',
    width: 150,
    height: 32,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  pedestalInnerRing: {
    position: 'absolute',
    width: 120,
    height: 24,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    borderStyle: 'dashed',
  },
  pedestalGlow: {
    position: 'absolute',
    width: 90,
    height: 18,
    borderRadius: 45,
    backgroundColor: 'rgba(251, 191, 36, 0.35)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Dialogue Speech Card ──
  dialogueCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 14,
    marginTop: 4,
  },
  dialogueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speakerName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.gold,
  },
  rarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  rarityText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  targetInfoRow: {
    marginBottom: 8,
  },
  targetSlotText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#38BDF8',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetNameText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFF',
  },
  hintQuoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  hintQuoteText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: '#F8FAFC',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cycleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cycleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleBtnDisabled: {
    opacity: 0.3,
  },
  cycleIndicatorText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 2,
  },
  allTargetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  allTargetsBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.gold,
  },
  noCluesText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  actionDismissBtn: {
    backgroundColor: COLORS.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionDismissBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFF',
  },
});
