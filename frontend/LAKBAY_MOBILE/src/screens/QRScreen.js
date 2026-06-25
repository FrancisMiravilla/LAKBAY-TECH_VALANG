import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet, Text, View, TouchableOpacity, StatusBar,
  ScrollView, Animated, Easing, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS } from '../constants/theme';
import { validateQR } from '../api/qrService';

export default function QRScreen({ navigation }) {
  const [scanAnim] = useState(() => new Animated.Value(0));
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scanLock = useRef(false); // prevents multiple simultaneous scans

  useEffect(() => {
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQRScanned = async (qrCode) => {
    if (scanLock.current || isLoading) return;
    scanLock.current = true;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const result = await validateQR(qrCode);
      navigation.navigate('QRScanned', {
        spot: result.spot,
        already_scanned: result.already_scanned,
        unlock_type: result.unlock_type,
        bonus_creature: result.bonus_creature,
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setErrorMsg('Invalid QR code. Please scan a LAKBAY marker.');
      } else if (status === 401) {
        setErrorMsg('Session expired. Please log in again.');
      } else {
        setErrorMsg('Could not validate QR. Check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
      // Release lock after a short delay so camera doesn't re-fire immediately
      setTimeout(() => { scanLock.current = false; }, 2000);
    }
  };

  const translateY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });

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
          <Text style={styles.headerSubLogo}>SCAN &amp; DISCOVER</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.introSection}>
          <Text style={styles.introText}>
            Point your camera at a QR code to unlock{' '}
            <Text style={styles.highlightText}>cultural stories</Text> and heritage information about{' '}
            <Text style={styles.highlightTextYellow}>Zamboanga City.</Text>
          </Text>
        </View>

        {/* Camera Viewport */}
        <View style={styles.qrViewportContainer}>
          <View style={styles.qrViewport}>
            {permission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => { if (data) handleQRScanned(data); }}
              />
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

            <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
            <View style={[styles.bracket, styles.topLeftBracket]} />
            <View style={[styles.bracket, styles.topRightBracket]} />
            <View style={[styles.bracket, styles.bottomLeftBracket]} />
            <View style={[styles.bracket, styles.bottomRightBracket]} />
            <View style={styles.scannerOutline} />

            <View style={styles.hudContainerTopLeft}>
              <View style={styles.hudDotActive} />
              <Text style={styles.hudTextActive}>QR ACTIVE</Text>
            </View>
            <View style={styles.hudContainerTopRight}>
              <View style={styles.hudDotReady} />
              <Text style={styles.hudTextReady}>
                {permission?.granted ? 'CAMERA READY' : 'NO CAMERA'}
              </Text>
            </View>
            <View style={styles.hudBottomBar}>
              <Text style={styles.hudBottomText}>
                {isLoading ? 'VALIDATING...' : permission?.granted ? 'AUTO SCAN ON' : 'CAMERA INACTIVE'}
              </Text>
            </View>

            {/* Loading overlay */}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Validating QR...</Text>
              </View>
            )}
          </View>

          {/* Error message */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity onPress={() => setErrorMsg('')}>
                <Text style={styles.errorDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionHeader}>How to scan:</Text>
          <Text style={styles.instructionBody}>
            Scan the QR code posted at the cultural spot. Make sure you are physically at the location to unlock rewards.
          </Text>
        </View>

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

        <View style={styles.tipsContainer}>
          <View style={styles.tipItem}>
            <Text style={styles.tipEmoji}>🗺️</Text>
            <Text style={styles.tipText}>Go to Cultural Hotspots on the map to find QR markers</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipText}>Each spot has a unique trivia challenge</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipEmoji}>🎓</Text>
            <Text style={styles.tipText}>Complete all spots to earn the Explorer certificate</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
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
  backButton: { padding: 8, width: 40, alignItems: 'flex-start' },
  backButtonText: { color: '#FFF', fontSize: 24, fontFamily: FONTS.bold, fontWeight: 'bold' },
  headerTitleContainer: { alignItems: 'center', justifyContent: 'center' },
  headerLogo: { color: '#FFF', fontSize: 18, fontFamily: FONTS.black, fontWeight: '900', letterSpacing: 4 },
  headerSubLogo: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: 1.5, marginTop: 1 },
  headerSpacer: { width: 40 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 24 },
  introSection: { marginBottom: 20 },
  introText: { color: '#FFF', fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22, textAlign: 'center' },
  highlightText: { color: COLORS.accentDark, fontFamily: FONTS.bold, fontWeight: '700' },
  highlightTextYellow: { color: COLORS.gold, fontFamily: FONTS.bold, fontWeight: '700' },
  qrViewportContainer: { alignItems: 'center', marginBottom: 24 },
  qrViewport: {
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
    position: 'absolute', left: 0, right: 0, height: 3,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8,
  },
  bracket: { position: 'absolute', width: 20, height: 20, borderColor: '#FFF' },
  topLeftBracket: { top: 15, left: 15, borderTopWidth: 3, borderLeftWidth: 3 },
  topRightBracket: { top: 15, right: 15, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeftBracket: { bottom: 15, left: 15, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRightBracket: { bottom: 15, right: 15, borderBottomWidth: 3, borderRightWidth: 3 },
  scannerOutline: { width: 130, height: 130, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 8 },
  hudContainerTopLeft: {
    position: 'absolute', top: 15, left: 45, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
  },
  hudDotActive: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF2A7A', marginRight: 6 },
  hudTextActive: { color: '#FFF', fontSize: 9, fontFamily: FONTS.black, fontWeight: '800' },
  hudContainerTopRight: {
    position: 'absolute', top: 15, right: 45, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
  },
  hudDotReady: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  hudTextReady: { color: '#FFF', fontSize: 9, fontFamily: FONTS.black, fontWeight: '800' },
  hudBottomBar: {
    position: 'absolute', bottom: 15, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 15,
  },
  hudBottomText: { color: '#FFF', fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { color: '#FFF', fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    width: '100%',
  },
  errorText: { color: '#FCA5A5', fontSize: 12, fontFamily: FONTS.semiBold, flex: 1 },
  errorDismiss: { color: '#FCA5A5', fontSize: 14, marginLeft: 10, fontWeight: '700' },
  instructionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16,
  },
  instructionHeader: { color: COLORS.gold, fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', marginBottom: 6 },
  instructionBody: { color: COLORS.textSub, fontSize: 12, fontFamily: FONTS.regular, lineHeight: 18 },
  guidelinesSection: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, marginBottom: 20,
  },
  guidelineRow: { flexDirection: 'row', alignItems: 'center' },
  bulletPoint: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold, marginRight: 8 },
  guidelineText: { color: COLORS.textSub, fontSize: 11, fontFamily: FONTS.regular, fontWeight: '500' },
  tipsContainer: { gap: 12, marginBottom: 20 },
  tipItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tipEmoji: { fontSize: 20, marginRight: 16 },
  tipText: { flex: 1, color: '#FFF', fontSize: 11, fontFamily: FONTS.semiBold, fontWeight: '600', lineHeight: 16 },
  cameraFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0F091E', justifyContent: 'center', alignItems: 'center', padding: 20 },
  cameraFallbackText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
  permissionDeniedContainer: { alignItems: 'center', justifyContent: 'center' },
  permissionDeniedText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  permissionButton: { backgroundColor: COLORS.accentDark, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  permissionButtonText: { color: '#FFF', fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700' },
});
