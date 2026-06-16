import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView, Animated, Easing } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS } from '../constants/theme';

export default function ARScreen({ navigation }) {
  const [scanAnim] = useState(() => new Animated.Value(0));
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // Automatically request permission on mount
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ])
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSimulateScan = () => {
    navigation.navigate('ARScanned', {
      exhibit: {
        name: 'Yakan Traditional Loom',
        location: 'Fort Pilar Museum · 0.3m',
        historical: {
          label: 'HISTORICAL INFORMATION',
          body: 'The Yakan people of Basilan have woven intricate geometric textiles since the 14th century, each pattern carrying deep ancestral symbolism.',
          highlight: '14th century',
        },
        cultural: {
          label: 'CULTURAL SIGNIFICANCE',
          body: 'Yakan weaving signifies identity and social standing. The pis siyabit headcloth is worn in ceremonies and treasured as a heirloom.',
          highlight: 'pis siyabit',
        },
      },
    });
  };

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200]
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.accentDark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerLogo}>LAKBAY</Text>
          <Text style={styles.headerSubLogo}>AUGMENTED REALITY</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Intro Text */}
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            Point your camera at museum exhibits to unlock{' '}
            <Text style={styles.highlightText}>cultural stories</Text> and heritage information about{' '}
            <Text style={styles.highlightTextYellow}>Zamboanga City.</Text>
          </Text>
        </View>

        {/* Simulated AR Viewport */}
        <View style={styles.arViewportContainer}>
          <View style={styles.arViewport}>
            {/* Holographic camera view or fallback */}
            {permission && permission.granted ? (
              <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
            ) : (
              <View style={styles.cameraFallback}>
                {permission === null ? (
                  <Text style={styles.cameraFallbackText}>Initializing camera...</Text>
                ) : (
                  <View style={styles.permissionDeniedContainer}>
                    <Text style={styles.permissionDeniedText}>Camera access required</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                      <Text style={styles.permissionButtonText}>Enable Camera</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Holographic scanner line */}
            <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />

            {/* Corner Brackets */}
            <View style={[styles.bracket, styles.topLeftBracket]} />
            <View style={[styles.bracket, styles.topRightBracket]} />
            <View style={[styles.bracket, styles.bottomLeftBracket]} />
            <View style={[styles.bracket, styles.bottomRightBracket]} />

            {/* HUD Status top-left */}
            <View style={styles.hudContainerTopLeft}>
              <View style={styles.hudDotActive} />
              <Text style={styles.hudTextActive}>AR ACTIVE</Text>
            </View>

            {/* HUD Status top-right */}
            <View style={styles.hudContainerTopRight}>
              <View style={styles.hudDotReady} />
              <Text style={styles.hudTextReady}>
                {permission && permission.granted ? 'CAMERA READY' : 'NO CAMERA'}
              </Text>
            </View>

            {/* Center target indicator */}
            <View style={styles.targetReticle}>
              <View style={styles.targetReticleInner} />
            </View>

            {/* Status searching at the bottom */}
            <View style={styles.hudBottomBar}>
              <Text style={styles.hudBottomText}>
                {permission && permission.granted ? 'Searching for exhibits...' : 'Camera inactive'}
              </Text>
            </View>
          </View>

          {/* Trigger Scan Button */}
          <TouchableOpacity style={styles.scanTriggerButton} onPress={handleSimulateScan}>
            <Text style={styles.scanTriggerText}>📸 Tap to Simulate AR Scan</Text>
          </TouchableOpacity>
        </View>

        {/* How to scan instruction card */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionHeader}>How to scan:</Text>
          <Text style={styles.instructionBody}>
            Point your camera directly at a museum exhibit or artifact. Hold still and let the AR system detect and recognize it automatically.
          </Text>
        </View>

        {/* Guidelines Row */}
        <View style={styles.guidelinesSection}>
          <View style={styles.guidelineRow}>
            <View style={styles.bulletPoint} />
            <Text style={styles.guidelineText}>Well-lit areas work best</Text>
          </View>
          <View style={styles.guidelineRow}>
            <View style={styles.bulletPoint} />
            <Text style={styles.guidelineText}>Hold steady for 2 seconds</Text>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipItem}>
            <Text style={styles.tipEmoji}>🏛️</Text>
            <Text style={styles.tipText}>Look for exhibits with the AR marker tag displayed nearby</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipText}>Each artifact reveals a unique piece of Zamboanga's heritage</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipEmoji}>🎖️</Text>
            <Text style={styles.tipText}>Scan all exhibits in a museum to earn a Collector badge</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    height: 60,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accentBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    width: 40,
    alignItems: 'flex-start',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: FONTS.bold,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: FONTS.black,
    fontWeight: '900',
    letterSpacing: 4,
  },
  headerSubLogo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  introSection: {
    marginBottom: 20,
  },
  introText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FONTS.regular,
    lineHeight: 22,
    textAlign: 'center',
  },
  highlightText: {
    color: COLORS.accentDark,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  highlightTextYellow: {
    color: COLORS.gold,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  arViewportContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  arViewport: {
    width: '100%',
    height: 250,
    backgroundColor: '#0F091E',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.accentDark,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accentDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'cyan',
    shadowColor: 'cyan',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  bracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFF',
  },
  topLeftBracket: {
    top: 15,
    left: 15,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRightBracket: {
    top: 15,
    right: 15,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeftBracket: {
    bottom: 15,
    left: 15,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRightBracket: {
    bottom: 15,
    right: 15,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  hudContainerTopLeft: {
    position: 'absolute',
    top: 15,
    left: 45,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  hudDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF2A7A',
    marginRight: 6,
  },
  hudTextActive: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: FONTS.black,
    fontWeight: '800',
  },
  hudContainerTopRight: {
    position: 'absolute',
    top: 15,
    right: 45,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  hudDotReady: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  hudTextReady: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: FONTS.black,
    fontWeight: '800',
  },
  targetReticle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetReticleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF',
    opacity: 0.7,
  },
  hudBottomBar: {
    position: 'absolute',
    bottom: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 15,
  },
  hudBottomText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  scanTriggerButton: {
    marginTop: 16,
    backgroundColor: COLORS.accentDark,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    shadowColor: COLORS.accentDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanTriggerText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  instructionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  instructionHeader: {
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    marginBottom: 6,
  },
  instructionBody: {
    color: COLORS.textSub,
    fontSize: 12,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
  guidelinesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 20,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginRight: 8,
  },
  guidelineText: {
    color: COLORS.textSub,
    fontSize: 11,
    fontFamily: FONTS.regular,
    fontWeight: '500',
  },
  tipsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tipEmoji: {
    fontSize: 20,
    marginRight: 16,
  },
  tipText: {
    flex: 1,
    color: '#FFF',
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    lineHeight: 16,
  },
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F091E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraFallbackText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
  },
  permissionDeniedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionDeniedText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: COLORS.accentDark,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
