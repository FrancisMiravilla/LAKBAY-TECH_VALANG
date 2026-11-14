import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GUIDE_IMAGE } from './guideVoice';
import { COLORS, FONTS } from '../constants/theme';

// Reopens the guide's spoken lore story on the QR discovery and Catch lore screens.
export default function GuideStoryButton({ onPress, style }) {
  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel="Hear the guide tell the story"
    >
      <View style={styles.face}>
        <Image source={GUIDE_IMAGE} style={styles.faceImg} resizeMode="cover" />
      </View>
      <Text style={styles.label}>{"Hear the guide's story"}</Text>
      <View style={styles.play}>
        <Ionicons name="play" size={13} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  face: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#FDF3D8', borderWidth: 2, borderColor: COLORS.gold,
  },
  faceImg: { width: 40, height: 52 },
  label: { flex: 1, marginLeft: 12, fontFamily: FONTS.bold, fontSize: 14, color: COLORS.navy },
  play: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center',
  },
});
