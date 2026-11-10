import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import GuideBubble from './GuideBubble';
import { useGuideVoice } from './guideVoice';

// Viro only reports registered artworks, so "not one of the 10" is inferred:
// the player has held the phone on the same spot (compass heading steady) for
// STEADY_MS while nothing was recognised. The guide then says so aloud.

const STEADY_MS = 4000;
const STEADY_DEGREES = 12;
const SHOW_MS = 6000;
const COOLDOWN_MS = 12000;

const angleDiff = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

export default function UnrecognizedArtNotice({ active, building, style }) {
  const [visible, setVisible] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const aimRef = useRef({ heading: null, since: 0 });
  const lastShownRef = useRef(0);
  const hideTimerRef = useRef(null);
  const { say, stop } = useGuideVoice();

  const message = `Hmm, I can't read this one. It's not one of the 10 models in ${building ? `Building ${building}` : 'this building'}. Try another artwork!`;

  useEffect(() => {
    if (!active) {
      clearTimeout(hideTimerRef.current);
      setVisible(false);
      stop();
      aimRef.current = { heading: null, since: 0 };
      return undefined;
    }
    let sub = null;
    let alive = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !alive) return;
        sub = await Location.watchHeadingAsync((h) => {
          const heading = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          const now = Date.now();
          const aim = aimRef.current;
          if (aim.heading === null || angleDiff(aim.heading, heading) > STEADY_DEGREES) {
            aimRef.current = { heading, since: now };
            return;
          }
          if (now - aim.since < STEADY_MS || now - lastShownRef.current < COOLDOWN_MS) return;
          lastShownRef.current = now;
          aimRef.current = { heading, since: now };
          setVisible(true);
        });
        if (!alive) sub?.remove();
      } catch {
        // No compass: the notice simply never shows.
      }
    })();
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [active, stop]);

  useEffect(() => {
    Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: true }).start();
    if (!visible) return undefined;
    say(message);
    hideTimerRef.current = setTimeout(() => setVisible(false), SHOW_MS);
    return () => clearTimeout(hideTimerRef.current);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style, { opacity: fade }]}>
      <GuideBubble key={lastShownRef.current} size={64} text={message} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, bottom: 120, zIndex: 20 },
});
