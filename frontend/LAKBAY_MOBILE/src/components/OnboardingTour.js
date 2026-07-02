import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

const OVERLAY_COLOR = 'rgba(6,18,49,0.86)';
const PAD = 10;

/**
 * Spotlight-style walkthrough. Each step either highlights a live UI element
 * (via `targetRef`, measured with measureInWindow) or a manually computed
 * rect (via `getRect(insets, screenW, screenH)`) for elements outside this
 * screen's tree (e.g. the bottom tab bar). Steps with neither render as a
 * centered card with a full dim overlay.
 */
export default function OnboardingTour({ visible, steps, onFinish }) {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [cardHeight, setCardHeight] = useState(220);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const { width: screenW, height: screenH } = Dimensions.get('window');

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    if (visible) setStepIndex(0);
  }, [visible]);

  useEffect(() => {
    if (!visible || !step) return;
    cardAnim.setValue(0);
    const measure = () => {
      if (step.targetRef?.current) {
        step.targetRef.current.measureInWindow((x, y, width, height) => {
          setRect({ x, y, width, height });
          animateIn();
        });
      } else if (step.getRect) {
        setRect(step.getRect(insets, screenW, screenH));
        animateIn();
      } else {
        setRect(null);
        animateIn();
      }
    };
    const t = setTimeout(measure, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stepIndex]);

  const animateIn = () => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  };

  if (!visible || !step) return null;

  const handleNext = () => (isLast ? onFinish?.() : setStepIndex((i) => i + 1));
  const handleSkip = () => onFinish?.();

  let spot = null;
  if (rect) {
    spot = {
      x: Math.max(rect.x - PAD, 0),
      y: Math.max(rect.y - PAD, 0),
      width: rect.width + PAD * 2,
      height: rect.height + PAD * 2,
    };
  }

  const cardWidth = Math.min(320, screenW - 40);
  let cardStyle = null;
  if (spot) {
    const spaceBelow = screenH - (spot.y + spot.height);
    const spaceAbove = spot.y;
    const placeBelow = spaceBelow >= 190 || spaceBelow >= spaceAbove;
    let left = spot.x + spot.width / 2 - cardWidth / 2;
    left = Math.max(20, Math.min(left, screenW - cardWidth - 20));
    let top = placeBelow
      ? spot.y + spot.height + 18
      : Math.max(insets.top + 20, spot.y - 18 - cardHeight);
    top = Math.min(top, screenH - cardHeight - 20);
    cardStyle = { top, left };
  }

  const accent = step.color || COLORS.accent;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={StyleSheet.absoluteFill}>
        {spot ? (
          <>
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: spot.y }]} />
            <View style={[styles.dim, { top: spot.y + spot.height, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.dim, { top: spot.y, left: 0, width: spot.x, height: spot.height }]} />
            <View style={[styles.dim, { top: spot.y, left: spot.x + spot.width, right: 0, height: spot.height }]} />
            <View
              pointerEvents="none"
              style={[
                styles.spotlightBorder,
                { top: spot.y, left: spot.x, width: spot.width, height: spot.height, borderColor: accent, shadowColor: accent },
              ]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFill]} />
        )}

        <Animated.View
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          style={[
            styles.card,
            { width: cardWidth },
            cardStyle || styles.cardCentered,
            {
              opacity: cardAnim,
              transform: [
                { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              ],
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
            <Ionicons name={step.icon || 'sparkles'} size={22} color={accent} />
          </View>

          <Text style={styles.stepCounter}>STEP {stepIndex + 1} OF {steps.length}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.text}>{step.text}</Text>

          <View style={styles.dots}>
            {steps.map((s, i) => (
              <View
                key={s.key}
                style={[styles.dot, i === stepIndex && { backgroundColor: accent, width: 18 }]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            {!isLast && (
              <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip Tour</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: accent }, isLast && { flex: 1 }]}
              activeOpacity={0.88}
            >
              <Text style={styles.nextText}>{isLast ? (step.ctaLabel || "Let's Go!") : 'Next'}</Text>
              <Ionicons name={isLast ? 'rocket' : 'arrow-forward'} size={15} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: OVERLAY_COLOR },
  spotlightBorder: {
    position: 'absolute',
    borderRadius: RADIUS.md,
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 8,
  },
  card: {
    position: 'absolute',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    ...SHADOW.accent,
  },
  cardCentered: {
    alignSelf: 'center',
    left: undefined,
    top: '38%',
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  stepCounter: {
    fontFamily: FONTS.bold, fontSize: 9, color: COLORS.textMuted,
    letterSpacing: 2, marginBottom: 6,
  },
  title: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text, marginBottom: 8 },
  text: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSub, lineHeight: 19, marginBottom: 16 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 4 },
  skipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textMuted },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.sm, paddingVertical: 12, paddingHorizontal: 18,
  },
  nextText: { fontFamily: FONTS.bold, fontSize: 13, color: '#fff' },
});
