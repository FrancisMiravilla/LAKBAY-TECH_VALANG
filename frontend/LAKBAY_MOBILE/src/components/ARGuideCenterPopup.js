import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, GOLD_TEXT, onWhite } from '../constants/theme';
import GuideBubble from './GuideBubble';

/**
 * Clue pop-up: the LAKBAY guide says where an artwork is, in his speech bubble,
 * over the camera. A small card underneath lets the player flip through clues,
 * open the full list, or get the compass to that side of the building.
 */
export default function ARGuideCenterPopup({
  visible = false,
  onClose,
  arTargets = [],
  activeTarget = null,
  onOpenFullList,
  onGuide,
  rarityThemes = {},
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const validTargets = arTargets.filter((t) => t.hint && t.hint.trim().length > 0);

  // Jump to the clue that triggered the pop-up when it opens; reset when it closes.
  useEffect(() => {
    if (visible && activeTarget && validTargets.length > 0) {
      const idx = validTargets.findIndex((t) => t.id === activeTarget.id);
      if (idx !== -1) setCurrentIndex(idx);
    }
    if (!visible) setCurrentIndex(0);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(0);
      Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  const many = validTargets.length > 1;
  const step = (d) => many && setCurrentIndex((i) => (i + d + validTargets.length) % validTargets.length);

  const target = validTargets[currentIndex] || activeTarget || arTargets[0] || null;
  const rTheme = rarityThemes[(target?.rarity || 'common').toLowerCase()] || {
    label: 'COMMON', color: '#10B981', bg: 'rgba(16, 185, 129, 0.18)', border: '#10B981',
  };

  const line = target
    ? `Need a clue? Look for ${target.name} in Building ${target.building || 'S1'}. ${target.hint || 'Explore the gallery and aim your camera at the paintings and artifacts.'}`
    : "I don't have any clues for this building yet. Try pointing your camera at the paintings and exhibits!";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.stage,
            {
              opacity: slideAnim,
              transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close clue">
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <GuideBubble key={target?.id ?? 'none'} size={96} text={line} />

          {target && (
            <View style={styles.card}>
              <View style={styles.metaRow}>
                <View style={[styles.rarityPill, { backgroundColor: rTheme.bg, borderColor: rTheme.border }]}>
                  <Text style={[styles.rarityText, { color: onWhite(rTheme.color) }]}>{rTheme.label}</Text>
                </View>
                <Text style={styles.slotText} numberOfLines={1}>
                  Building {target.building || 'S1'} · Slot #{target.slot_number || 1}
                </Text>
              </View>

              <View style={styles.navRow}>
                <TouchableOpacity onPress={() => step(-1)} disabled={!many} style={[styles.cycleBtn, !many && styles.off]} accessibilityLabel="Previous clue">
                  <Ionicons name="chevron-back" size={16} color={COLORS.navy} />
                </TouchableOpacity>
                <Text style={styles.cycleText}>Clue {currentIndex + 1} of {validTargets.length || 1}</Text>
                <TouchableOpacity onPress={() => step(1)} disabled={!many} style={[styles.cycleBtn, !many && styles.off]} accessibilityLabel="Next clue">
                  <Ionicons name="chevron-forward" size={16} color={COLORS.navy} />
                </TouchableOpacity>
                {onOpenFullList && (
                  <TouchableOpacity onPress={onOpenFullList} style={styles.allBtn} activeOpacity={0.8}>
                    <Ionicons name="grid-outline" size={12} color={GOLD_TEXT} style={{ marginRight: 4 }} />
                    <Text style={styles.allText}>All clues</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.ghostBtn]} onPress={onClose} activeOpacity={0.85}>
                  <Text style={[styles.actionText, styles.ghostText]}>I&apos;ll search</Text>
                </TouchableOpacity>
                {onGuide && (
                  <TouchableOpacity style={[styles.actionBtn, { flex: 1.2 }]} onPress={() => onGuide(target)} activeOpacity={0.85}>
                    <Ionicons name="compass" size={17} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionText}>Guide Me</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', padding: 14, paddingBottom: 34 },
  stage: { width: '100%' },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    gap: 10,
    marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rarityPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  rarityText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 },
  slotText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textSub },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cycleBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  off: { opacity: 0.35 },
  cycleText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 2 },
  allBtn: {
    marginLeft: 'auto',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.14)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
  },
  allText: { fontFamily: FONTS.bold, fontSize: 11, color: GOLD_TEXT },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, height: 48, borderRadius: 24,
    backgroundColor: COLORS.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  actionText: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFF' },
  ghostBtn: { backgroundColor: '#F1F5F9' },
  ghostText: { color: COLORS.navy },
});
