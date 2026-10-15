import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, GOLD_TEXT, onWhite } from '../constants/theme';
import VintaCard from './VintaCard';

const GUIDE_IMAGE = require('../assets/guide_character.png');

/**
 * Hint pop-up: the LAKBAY tour guide stands at the top and "says" the clue
 * in a speech bubble pointing up at him.
 */
export default function ARGuideCenterPopup({
  visible = false,
  onClose,
  arTargets = [],
  activeTarget = null,
  onOpenFullList,
  rarityThemes = {},
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const validTargets = arTargets.filter((t) => t.hint && t.hint.trim().length > 0);

  // Jump to the clue that triggered the pop-up when it opens; reset when it closes.
  useEffect(() => {
    if (visible && activeTarget && validTargets.length > 0) {
      const idx = validTargets.findIndex((t) => t.id === activeTarget.id);
      if (idx !== -1) setCurrentIndex(idx);
    }
    if (!visible) setCurrentIndex(0);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pop-in animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Gentle bob so the guide feels alive while he talks
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, floatAnim]);

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
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.popupWrap, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <VintaCard contentStyle={styles.popupCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerBadge}>
                <Ionicons name="bulb" size={11} color={GOLD_TEXT} />
                <Text style={styles.headerBadgeText}>GUIDE HINT</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7} accessibilityLabel="Close hint">
                <Ionicons name="close" size={18} color={COLORS.textSub} />
              </TouchableOpacity>
            </View>

            {/* The tour guide, standing above his speech bubble */}
            <View style={styles.guideStage}>
              <View style={styles.guideShadow} />
              <Animated.Image
                source={GUIDE_IMAGE}
                style={[styles.guideImage, { transform: [{ translateY: floatAnim }] }]}
                resizeMode="contain"
                accessibilityLabel="LAKBAY tour guide"
              />
            </View>

            {/* Speech bubble — tail points up at the guide */}
            <View style={styles.bubble}>
              <View style={styles.bubbleTail} />

              <View style={styles.bubbleHeader}>
                <View style={styles.speakerRow}>
                  <Ionicons name="chatbubble-ellipses" size={15} color={COLORS.accent} />
                  <Text style={styles.speakerName}>Your LAKBAY Guide says:</Text>
                </View>
                {currentTarget && (
                  <View style={[styles.rarityPill, { backgroundColor: rTheme.bg, borderColor: rTheme.border }]}>
                    <Text style={[styles.rarityText, { color: onWhite(rTheme.color) }]}>{rTheme.label}</Text>
                  </View>
                )}
              </View>

              {currentTarget ? (
                <>
                  <Text style={styles.targetSlotText}>
                    🏛️ Building {currentTarget.building || 'S1'} · Slot #{currentTarget.slot_number || 1}
                  </Text>
                  <Text style={styles.targetNameText} numberOfLines={1}>{currentTarget.name}</Text>

                  <Text style={styles.hintText}>
                    &ldquo;{currentTarget.hint || 'Explore the gallery and aim your camera at the cultural paintings and historical artifacts.'}&rdquo;
                  </Text>

                  <View style={styles.controlsRow}>
                    <View style={styles.cycleGroup}>
                      <TouchableOpacity
                        onPress={handlePrevHint}
                        disabled={validTargets.length <= 1}
                        style={[styles.cycleBtn, validTargets.length <= 1 && styles.cycleBtnDisabled]}
                        activeOpacity={0.7}
                        accessibilityLabel="Previous clue"
                      >
                        <Ionicons name="chevron-back" size={15} color={COLORS.navy} />
                      </TouchableOpacity>
                      <Text style={styles.cycleText}>Clue {currentIndex + 1} of {validTargets.length || 1}</Text>
                      <TouchableOpacity
                        onPress={handleNextHint}
                        disabled={validTargets.length <= 1}
                        style={[styles.cycleBtn, validTargets.length <= 1 && styles.cycleBtnDisabled]}
                        activeOpacity={0.7}
                        accessibilityLabel="Next clue"
                      >
                        <Ionicons name="chevron-forward" size={15} color={COLORS.navy} />
                      </TouchableOpacity>
                    </View>

                    {onOpenFullList && (
                      <TouchableOpacity onPress={onOpenFullList} style={styles.allTargetsBtn} activeOpacity={0.8}>
                        <Ionicons name="grid-outline" size={12} color={GOLD_TEXT} style={{ marginRight: 4 }} />
                        <Text style={styles.allTargetsText}>All Targets</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.noCluesText}>No registered clues for this exhibit building yet.</Text>
              )}
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={onClose} activeOpacity={0.85}>
              <Ionicons name="scan-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Got It! Search Now</Text>
            </TouchableOpacity>
          </VintaCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

const BUBBLE_BG = COLORS.bgCardAlt;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 24, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  popupWrap: { width: '100%', maxWidth: 380 },
  popupCard: { paddingTop: 14, paddingBottom: 18, paddingHorizontal: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.55)',
  },
  headerBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: GOLD_TEXT, letterSpacing: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Guide character ──
  guideStage: { height: 176, alignItems: 'center', justifyContent: 'flex-end', marginTop: -4 },
  guideShadow: {
    position: 'absolute',
    bottom: 2,
    width: 96,
    height: 14,
    borderRadius: 48,
    backgroundColor: 'rgba(12, 36, 97, 0.18)',
  },
  guideImage: { width: 150, height: 172 },

  // ── Speech bubble ──
  bubble: {
    backgroundColor: BUBBLE_BG,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 10,
  },
  bubbleTail: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    width: 16,
    height: 16,
    backgroundColor: BUBBLE_BG,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    borderColor: COLORS.border,
    transform: [{ rotate: '45deg' }],
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
  },
  speakerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speakerName: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.accent },
  rarityPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  rarityText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 },
  targetSlotText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#0284C7',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetNameText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.navy, marginBottom: 6 },
  hintText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSub,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cycleGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cycleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleBtnDisabled: { opacity: 0.35 },
  cycleText: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.textMuted, paddingHorizontal: 2 },
  allTargetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.55)',
  },
  allTargetsText: { fontFamily: FONTS.bold, fontSize: 11, color: GOLD_TEXT },
  noCluesText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 10 },

  actionBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFF' },
});
