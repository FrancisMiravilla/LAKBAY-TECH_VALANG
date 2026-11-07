import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GUIDE_FONTS } from '../constants/theme';

// Home top: a short welcome floating over the Vinta backdrop. The guide's spoken
// greeting lives in GuideGreetingModal, shown right after login.

export default function GuideWelcome() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Welcome to Zamboanga City</Text>
      <Text style={styles.title}>Mabuhay!</Text>
      <Text style={styles.line}>
        Discover Asia&apos;s Latin City — colorful vintas, centuries-old forts and the warm smiles of Zamboanga.
      </Text>
    </View>
  );
}

const TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 };

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 18 },
  kicker: { fontFamily: GUIDE_FONTS.semiBold, fontSize: 16, color: '#FFFFFF', textAlign: 'center', ...TEXT_SHADOW },
  title: { fontFamily: GUIDE_FONTS.display, fontSize: 48, lineHeight: 60, color: '#FFFFFF', textAlign: 'center', marginTop: 4, ...TEXT_SHADOW },
  line: { fontFamily: GUIDE_FONTS.medium, fontSize: 16, lineHeight: 24, color: '#FFFFFF', textAlign: 'center', marginTop: 8, ...TEXT_SHADOW },
});
