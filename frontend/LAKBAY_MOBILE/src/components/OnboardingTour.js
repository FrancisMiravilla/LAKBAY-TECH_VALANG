import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Image, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GUIDE_FONTS } from '../constants/theme';
import { GUIDE_IMAGE, Waveform, useGuideVoice } from './guideVoice';

const OVERLAY_COLOR = 'rgba(2,8,28,0.82)';
const PAD = 8;             // breathing room around the highlighted element
const GAP = 14;            // space between the highlight and the guide card
const SIDE = 16;           // card margin from the screen edges
const GUIDE_W = 88;        // guide portrait width beside the bubble
const GUIDE_GAP = 8;
const SCROLL_TOP = 110;    // where a scrolled-to target should land
const SETTLE_MS = 380;     // wait for the scroll to finish before measuring again

/**
 * The LAKBAY guide walks a new player through the Home screen. The screen dims,
 * the current element is cut out of the dim, and the guide speaks the step
 * from a speech bubble that points at it.
 *
 * steps: [{ key, title, text, targetRef?, scrollable?, getRect?(insets, w, h), radius? }]
 *  - targetRef: a live view measured with measureInWindow; `scrollable` ones
 *    live inside `scrollRef` and are scrolled into view first
 *  - getRect: a computed rect for things outside the screen tree (tab bar)
 *  - neither: the guide talks from the middle of the screen
 */
export default function OnboardingTour({ visible, steps, onFinish, scrollRef, scrollYRef }) {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState(null);
  const [cardH, setCardH] = useState(0);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const dirRef = useRef(1);
  const { typed, speaking, voiceMissing, say, stop } = useGuideVoice();

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    if (visible) {
      dirRef.current = 1;
      setStepIndex(0);
    }
    else stop();
  }, [visible, stop]);

  const measureTarget = useCallback((ref) => new Promise((resolve) => {
    if (!ref?.current?.measureInWindow) {
      resolve(null);
      return;
    }
    ref.current.measureInWindow((x, y, width, height) => {
      resolve(width || height ? { x, y, width, height } : null);
    });
  }), []);

  // Find (scrolling to it if needed) the current step's element, then speak.
  useEffect(() => {
    if (!visible || !step || !screen) return undefined;
    let cancelled = false;
    setReady(false);
    cardAnim.setValue(0);
    stop();

    const run = async () => {
      await new Promise((r) => setTimeout(r, 60));
      let r = null;
      if (step.targetRef) {
        r = await measureTarget(step.targetRef);
        if (!r) {
          // The section isn't rendered (e.g. no places yet): skip this step.
          if (!cancelled) setStepIndex((i) => Math.max(0, Math.min(i + dirRef.current, steps.length - 1)));
          return;
        }
        const bottomLimit = screen.h - insets.bottom - 230;
        const offscreen = r.y < insets.top + 60 || r.y + r.height > bottomLimit;
        if (step.scrollable && scrollRef?.current && offscreen) {
          const y = Math.max(0, (scrollYRef?.current || 0) + r.y - (insets.top + SCROLL_TOP));
          scrollRef.current.scrollTo({ y, animated: true });
          await new Promise((res) => setTimeout(res, SETTLE_MS));
          r = (await measureTarget(step.targetRef)) || r;
        }
      } else if (step.getRect) {
        r = step.getRect(insets, screen.w, screen.h);
      }
      if (cancelled) return;
      setRect(r);
      setReady(true);
      Animated.timing(cardAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }).start();
      setTimeout(() => { if (!cancelled) say(step.text); }, 250);
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stepIndex, screen]);

  if (!visible || !step) return null;

  const finish = () => {
    stop();
    onFinish?.();
  };
  const next = () => {
    dirRef.current = 1;
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  };
  const back = () => {
    dirRef.current = -1;
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const W = screen?.w || 0;
  const H = screen?.h || 0;

  // Highlight box, kept inside the screen.
  let spot = null;
  if (rect && screen) {
    const x = Math.max(rect.x - PAD, 4);
    const y = Math.max(rect.y - PAD, 4);
    spot = {
      x,
      y,
      width: Math.min(rect.width + PAD * 2, W - x - 4),
      height: Math.min(rect.height + PAD * 2, H - y - 4),
      radius: step.radius ?? 18,
    };
  }

  // Card sits on the side of the highlight with more room; the guide stands on
  // the opposite side from the target so the bubble's tail can reach it.
  const cardW = W - SIDE * 2;
  const bubbleW = cardW - GUIDE_W - GUIDE_GAP;
  let cardTop = null;
  let tailUp = true;
  let guideRight = false;
  let tailLeft = bubbleW / 2 - 11;
  if (spot) {
    const below = H - (spot.y + spot.height) - insets.bottom;
    const above = spot.y - insets.top;
    tailUp = below >= cardH + GAP || below >= above;
    cardTop = tailUp
      ? Math.min(spot.y + spot.height + GAP, H - insets.bottom - cardH - 8)
      : Math.max(insets.top + 8, spot.y - GAP - cardH);
    const targetCx = spot.x + spot.width / 2;
    guideRight = targetCx < W / 2;
    const bubbleX = SIDE + (guideRight ? 0 : GUIDE_W + GUIDE_GAP);
    tailLeft = Math.max(14, Math.min(targetCx - bubbleX - 11, bubbleW - 36));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={finish}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (!screen || screen.w !== width || screen.h !== height) setScreen({ w: width, h: height });
        }}
      >
        {spot && ready ? (
          <>
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: spot.y }]} />
            <View style={[styles.dim, { top: spot.y + spot.height, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.dim, { top: spot.y, left: 0, width: spot.x, height: spot.height }]} />
            <View style={[styles.dim, { top: spot.y, left: spot.x + spot.width, right: 0, height: spot.height }]} />
            <View
              pointerEvents="none"
              style={[styles.ring, { top: spot.y, left: spot.x, width: spot.width, height: spot.height, borderRadius: spot.radius }]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFill]} />
        )}

        {ready && (
          <Animated.View
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (Math.abs(h - cardH) > 1) setCardH(h);
            }}
            style={[
              styles.card,
              { width: cardW, left: SIDE },
              spot ? { top: cardTop } : { top: Math.max(insets.top + 40, H / 2 - cardH / 2) },
              {
                opacity: cardAnim,
                transform: [
                  { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                  { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [tailUp ? 10 : -10, 0] }) },
                ],
              },
            ]}
          >
            <View style={[styles.cardRow, guideRight && styles.cardRowReverse]}>
              <Image
                source={GUIDE_IMAGE}
                style={[styles.guide, guideRight ? { marginLeft: GUIDE_GAP } : { marginRight: GUIDE_GAP }]}
                resizeMode="contain"
                accessibilityLabel="LAKBAY tour guide"
              />
              <View style={styles.bubble}>
                {spot && <View style={[styles.tail, tailUp ? styles.tailUp : styles.tailDown, { left: tailLeft }]} />}
                <View style={styles.bubbleHead}>
                  <Text style={styles.stepLabel}>STEP {stepIndex + 1} OF {steps.length}</Text>
                  <View style={styles.dots}>
                    {steps.map((s, i) => (
                      <View key={s.key} style={[styles.dot, i === stepIndex && styles.dotActive]} />
                    ))}
                  </View>
                </View>
                <Text style={styles.title}>{step.title}</Text>
                <View>
                  {/* The full text reserves the height so the card doesn't grow while typing. */}
                  <Text style={[styles.text, styles.ghost]}>{step.text}</Text>
                  <Text style={[styles.text, styles.typed]}>{typed}</Text>
                </View>
                <View style={styles.voiceRow}>
                  <Waveform speaking={speaking} />
                  <TouchableOpacity
                    style={styles.replayBtn}
                    onPress={() => (speaking ? stop() : say(step.text))}
                    activeOpacity={0.85}
                    accessibilityLabel={speaking ? 'Stop the guide' : 'Hear the guide again'}
                  >
                    <Ionicons name={speaking ? 'stop' : 'play'} size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {voiceMissing && <Text style={styles.voiceNote}>Voice needs the latest app build.</Text>}
              </View>
            </View>

            <View style={styles.actions}>
              {!isLast ? (
                <TouchableOpacity onPress={finish} style={styles.skipBtn} hitSlop={8}>
                  <Text style={styles.skipText}>Skip tour</Text>
                </TouchableOpacity>
              ) : <View style={styles.skipBtn} />}
              {stepIndex > 0 && (
                <TouchableOpacity onPress={back} style={styles.backBtn} activeOpacity={0.85} accessibilityLabel="Previous step">
                  <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={next} style={styles.nextBtn} activeOpacity={0.88}>
                <Text style={styles.nextText}>{isLast ? (step.ctaLabel || "Let's Go!") : 'Next'}</Text>
                <Ionicons name={isLast ? 'rocket' : 'chevron-forward'} size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: OVERLAY_COLOR },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  card: { position: 'absolute' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-end' },
  cardRowReverse: { flexDirection: 'row-reverse' },
  guide: { width: GUIDE_W, height: 112 },
  bubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  tail: {
    position: 'absolute',
    width: 22,
    height: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  tailUp: { top: -9 },
  tailDown: { bottom: -9 },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  stepLabel: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 10, letterSpacing: 1, color: COLORS.accent },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  dotActive: { width: 14, backgroundColor: COLORS.accent },
  title: { fontFamily: GUIDE_FONTS.bold, fontSize: 16, lineHeight: 21, color: COLORS.navy, marginBottom: 2 },
  text: { fontFamily: GUIDE_FONTS.medium, fontSize: 13.5, lineHeight: 19, color: COLORS.textSub },
  ghost: { opacity: 0 },
  typed: { position: 'absolute', top: 0, left: 0, right: 0 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  replayBtn: {
    width: 30, height: 30, borderRadius: 15, marginLeft: 8,
    backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center',
  },
  voiceNote: { fontFamily: GUIDE_FONTS.regular, fontSize: 10.5, color: COLORS.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  skipBtn: { flex: 1, paddingVertical: 8 },
  skipText: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    height: 44, paddingHorizontal: 22, borderRadius: 22,
    backgroundColor: COLORS.accent, borderBottomWidth: 3, borderBottomColor: COLORS.accentDark,
  },
  nextText: { fontFamily: GUIDE_FONTS.bold, fontSize: 15, color: '#FFFFFF' },
});
