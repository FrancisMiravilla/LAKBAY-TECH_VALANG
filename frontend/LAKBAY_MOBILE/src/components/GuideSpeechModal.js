import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GUIDE_FONTS } from '../constants/theme';

// The screen dims and the LAKBAY tour guide pops up in the centre and says each
// step aloud while the words type out in his speech bubble. Used for the
// post-login greeting (one step) and the AR scanner intro (three steps).
// steps: [{ label?, title?, text }]

const GUIDE_IMAGE = require('../assets/guide_character.png');
const BARS = [8, 14, 20, 12, 24, 16, 10, 22, 26, 14, 10, 22, 18, 12, 24, 18, 10, 16];
const TYPE_MS = 32;        // typing without voice
const SPOKEN_TYPE_MS = 62; // roughly the pace of the spoken voice

// expo-speech is a native module: an app build made before it was added has no
// ExpoSpeech, so load it defensively and fall back to typing only.
let Speech = null;
try {
  Speech = require('expo-speech');
} catch {
  Speech = null;
}

function Waveform({ speaking }) {
  const anims = useRef(BARS.map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    if (!speaking) {
      anims.forEach((a) => Animated.timing(a, { toValue: 0.35, duration: 200, useNativeDriver: true }).start());
      return undefined;
    }
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(a, { toValue: 1, duration: 220 + (i % 5) * 60, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.25, duration: 220 + (i % 4) * 70, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [speaking, anims]);

  return (
    <View style={styles.wave}>
      {BARS.map((h, i) => (
        <Animated.View key={i} style={[styles.waveBar, { height: h, transform: [{ scaleY: anims[i] }] }]} />
      ))}
    </View>
  );
}

export default function GuideSpeechModal({ visible, steps = [], finalLabel = "Let's Explore!", onClose }) {
  const [step, setStep] = useState(0);
  const current = steps[step] || steps[0] || { text: '' };
  const message = current.text;
  const isLast = step >= steps.length - 1;
  const [typed, setTyped] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [voiceMissing, setVoiceMissing] = useState(false);
  const timerRef = useRef(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const stopAll = useCallback(() => {
    clearInterval(timerRef.current);
    try { Speech?.stop(); } catch { /* not available */ }
    setSpeaking(false);
  }, []);

  const play = useCallback(() => {
    stopAll();
    let i = 0;
    let voiceDone = true;
    let typingDone = false;
    const finish = () => { if (voiceDone && typingDone) setSpeaking(false); };

    setTyped('');
    setSpeaking(true);

    if (Speech?.speak) {
      try {
        voiceDone = false;
        Speech.speak(message, {
          language: 'en-US',
          rate: 0.95,
          pitch: 1.05,
          onDone: () => { voiceDone = true; finish(); },
          onStopped: () => { voiceDone = true; finish(); },
          onError: () => { voiceDone = true; finish(); },
        });
      } catch {
        voiceDone = true;
        setVoiceMissing(true);
      }
    } else {
      setVoiceMissing(true);
    }

    timerRef.current = setInterval(() => {
      i += 1;
      setTyped(message.slice(0, i));
      if (i >= message.length) {
        clearInterval(timerRef.current);
        typingDone = true;
        finish();
      }
    }, voiceDone ? TYPE_MS : SPOKEN_TYPE_MS);
  }, [message, stopAll]);

  // Pop in and float while visible; always start from the first step.
  useEffect(() => {
    if (!visible) return undefined;
    setStep(0);
    popAnim.setValue(0);
    Animated.spring(popAnim, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      stopAll();
    };
  }, [visible, stopAll, popAnim, floatAnim]);

  // Say the current step (on open and whenever the player moves between steps).
  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(play, 400);
    return () => clearTimeout(t);
  }, [visible, step, play]);

  const close = () => {
    stopAll();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.stage,
            { opacity: popAnim, transform: [{ scale: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] },
          ]}
        >
          <Animated.Image
            source={GUIDE_IMAGE}
            style={[styles.guide, steps.length > 1 && styles.guideSmall, { transform: [{ translateY: floatAnim }] }]}
            resizeMode="contain"
            accessibilityLabel="LAKBAY tour guide"
          />

          <View style={styles.bubble}>
            <View style={styles.bubbleTail} />
            {steps.length > 1 && (
              <View style={styles.stepHead}>
                <Text style={styles.stepLabel}>{current.label || `STEP ${step + 1} OF ${steps.length}`}</Text>
                <View style={styles.dots}>
                  {steps.map((_, i) => (
                    <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
                  ))}
                </View>
              </View>
            )}
            {!!current.title && <Text style={styles.stepTitle}>{current.title}</Text>}
            <Text style={styles.bubbleText}>{typed || ' '}</Text>
            <View style={styles.bubbleFooter}>
              <Waveform speaking={speaking} />
              <TouchableOpacity
                style={styles.replayBtn}
                onPress={() => (speaking ? stopAll() : play())}
                activeOpacity={0.85}
                accessibilityLabel={speaking ? 'Stop the guide' : 'Hear the guide again'}
              >
                <Ionicons name={speaking ? 'stop' : 'play'} size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {voiceMissing && (
              <Text style={styles.voiceNote}>Voice needs the latest app build.</Text>
            )}
          </View>

          <View style={styles.navRow}>
            {step > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)} activeOpacity={0.85}>
                <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.goBtn}
              onPress={() => (isLast ? close() : setStep((s) => s + 1))}
              activeOpacity={0.88}
            >
              <Text style={styles.goText}>{isLast ? finalLabel : 'Next'}</Text>
              {!isLast && <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(2,8,28,0.82)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  stage: { width: '100%', alignItems: 'center' },
  guide: { width: 210, height: 240 },
  guideSmall: { width: 160, height: 180 },

  bubble: {
    alignSelf: 'stretch', marginTop: 10,
    backgroundColor: '#FFFFFF', borderRadius: 24,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
  },
  bubbleTail: {
    position: 'absolute', top: -10, alignSelf: 'center',
    width: 22, height: 22, backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }], borderRadius: 4,
  },
  bubbleText: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 16, lineHeight: 23, color: COLORS.navy, minHeight: 92 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 28, overflow: 'hidden' },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: COLORS.navy, opacity: 0.7 },
  replayBtn: {
    width: 38, height: 38, borderRadius: 19, marginLeft: 10,
    backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center',
  },
  voiceNote: { fontFamily: GUIDE_FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 6 },

  stepHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  stepLabel: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 11, letterSpacing: 1, color: COLORS.accent },
  stepTitle: { fontFamily: GUIDE_FONTS.bold, fontSize: 18, lineHeight: 23, color: COLORS.navy, marginBottom: 4 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { width: 18, backgroundColor: COLORS.accent },
  navRow: { alignSelf: 'stretch', flexDirection: 'row', gap: 10, marginTop: 18 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2,
    height: 54, paddingHorizontal: 18, borderRadius: 27,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  backText: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 15, color: '#FFFFFF' },
  goBtn: {
    flex: 1, flexDirection: 'row', gap: 4, height: 54, borderRadius: 27,
    backgroundColor: COLORS.accent, borderBottomWidth: 4, borderBottomColor: COLORS.accentDark,
    alignItems: 'center', justifyContent: 'center',
  },
  goText: { fontFamily: GUIDE_FONTS.bold, fontSize: 17, color: '#FFFFFF' },
});
