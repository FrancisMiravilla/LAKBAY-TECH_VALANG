import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/theme';

// The LAKBAY guide's voice: says a line aloud (expo-speech) while the words
// type out. Shared by GuideSpeechModal and the Home onboarding tour.

export const GUIDE_IMAGE = require('../assets/guide_character.png');

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

export function useGuideVoice() {
  const [typed, setTyped] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [voiceMissing, setVoiceMissing] = useState(false);
  const timerRef = useRef(null);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    try { Speech?.stop(); } catch { /* not available */ }
    setSpeaking(false);
  }, []);

  const say = useCallback((message) => {
    stop();
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
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { typed, speaking, voiceMissing, say, stop };
}

export function Waveform({ speaking, color = COLORS.navy }) {
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
        <Animated.View key={i} style={[styles.waveBar, { height: h, backgroundColor: color, transform: [{ scaleY: anims[i] }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 28, overflow: 'hidden' },
  waveBar: { width: 3, borderRadius: 2, opacity: 0.7 },
});
