import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { GUIDE_IMAGE, Waveform, useGuideVoice } from './guideVoice';
import { COLORS, GUIDE_FONTS } from '../constants/theme';
import { MUSEUM_BUILDINGS } from '../constants/museumGalleries';

// After the AR intro the guide asks which museum building the player is in,
// then GuideSpeechModal narrates that building's gallery overviews.

const QUESTION = 'Which building are you in? Pick one and I will tell you about its galleries.';

export default function BuildingPickerModal({ visible, onPick, onSkip }) {
  const { typed, speaking, say, stop } = useGuideVoice();

  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(() => say(QUESTION), 350);
    return () => { clearTimeout(t); stop(); };
  }, [visible, say, stop]);

  const pick = (id) => { stop(); onPick(id); };
  const skip = () => { stop(); onSkip(); };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={skip}>
      <View style={styles.backdrop}>
        <Image source={GUIDE_IMAGE} style={styles.guide} resizeMode="contain" accessibilityLabel="LAKBAY tour guide" />
        <View style={styles.bubble}>
          <View style={styles.bubbleTail} />
          <Text style={styles.label}>MUSEUM GALLERIES</Text>
          <Text style={styles.text}>{typed || ' '}</Text>
          <Waveform speaking={speaking} />
          <View style={styles.options}>
            {MUSEUM_BUILDINGS.map((b) => (
              <TouchableOpacity key={b.id} style={styles.option} onPress={() => pick(b.id)} activeOpacity={0.85}>
                <Text style={styles.optionId}>{b.id}</Text>
                <Text style={styles.optionSub} numberOfLines={3}>
                  {b.galleries.map((g) => g.title).join(' · ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7} accessibilityLabel="Skip the gallery overview">
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(2,8,28,0.82)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  guide: { width: 150, height: 170 },
  bubble: {
    alignSelf: 'stretch', marginTop: 10,
    backgroundColor: '#FFFFFF', borderRadius: 24,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16,
  },
  bubbleTail: {
    position: 'absolute', top: -10, alignSelf: 'center',
    width: 22, height: 22, backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }], borderRadius: 4,
  },
  label: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 11, letterSpacing: 1, color: COLORS.accent, marginBottom: 4 },
  text: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 16, lineHeight: 23, color: COLORS.navy, minHeight: 46 },
  options: { flexDirection: 'row', gap: 8, marginTop: 12 },
  option: {
    flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8,
    backgroundColor: COLORS.navy, borderBottomWidth: 4, borderBottomColor: COLORS.accentDark,
    alignItems: 'center',
  },
  optionId: { fontFamily: GUIDE_FONTS.bold, fontSize: 22, color: '#FFFFFF' },
  optionSub: { fontFamily: GUIDE_FONTS.regular, fontSize: 10, lineHeight: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
  skipBtn: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 16 },
  skipText: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 14, color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },
});
