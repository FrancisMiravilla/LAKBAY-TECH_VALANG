import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

const GUIDE_IMAGE = require('../assets/guide_character.png');
const TYPE_MS = 22;

// The LAKBAY guide "saying" a line: the guide on the left, a speech bubble on
// the right whose text types itself out. Text only, no audio.
// If `text` changes after it has finished typing (e.g. a live distance), the
// new text is shown straight away instead of retyping.
export default function GuideBubble({ text, size = 84, style }) {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (doneRef.current) {
      setShown(text.length);
      return undefined;
    }
    const id = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(id);
          doneRef.current = true;
          return n;
        }
        return n + 1;
      });
    }, TYPE_MS);
    return () => clearInterval(id);
  }, [text]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return (
    <View style={[styles.row, style]}>
      <Animated.Image
        source={GUIDE_IMAGE}
        style={{ width: size, height: size * 1.2, transform: [{ translateY: bob }] }}
        resizeMode="contain"
      />
      <View style={styles.bubble}>
        <View style={styles.tail} />
        <Text style={styles.text}>
          {text.slice(0, shown)}
          {/* Keeps the bubble at its final size while the text types in */}
          <Text style={styles.ghost}>{text.slice(shown)}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.gold,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  tail: {
    position: 'absolute',
    left: -8,
    bottom: 14,
    width: 14,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.gold,
    transform: [{ rotate: '45deg' }],
  },
  text: { fontFamily: FONTS.medium, fontSize: 15, lineHeight: 22, color: COLORS.navy },
  ghost: { color: 'transparent' },
});
