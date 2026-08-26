import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet, Text, View, TouchableOpacity, StatusBar,
  ScrollView, Animated, Easing, ActivityIndicator, ImageBackground, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { validateQR } from '../api/qrService';
import VintaStripe from '../components/VintaStripe';

const { width: SCREEN_W } = Dimensions.get('window');

export default function QRScreen({ navigation }) {
  const [scanAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [alreadyScannedModal, setAlreadyScannedModal] = useState(null);
  const [lockedModal, setLockedModal] = useState(null);
  const scanLock = useRef(false);

  useEffect(() => {
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Laser scanner loop animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Pulse animation for HUD reticle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQRScanned = async (qrCode) => {
    if (scanLock.current || isLoading || alreadyScannedModal || lockedModal) return;
    scanLock.current = true;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const result = await validateQR(qrCode);
      if (result.already_scanned) {
        setAlreadyScannedModal({
          spot: result.spot,
          already_scanned: true,
          unlock_type: result.unlock_type,
          bonus_creature: result.bonus_creature,
        });
      } else {
        navigation.navigate('QRScanned', {
          spot: result.spot,
          already_scanned: false,
          unlock_type: result.unlock_type,
          bonus_creature: result.bonus_creature,
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 403 && data?.locked) {
        setLockedModal({
          spotName: data.spot_name || 'This Landmark Spot',
          requiredLevel: data.required_level || 1,
          userLevel: data.user_level || 1,
          error: data.error,
        });
      } else if (status === 404) {
        setErrorMsg('Invalid QR code. Please scan an authentic LAKBAY marker.');
      } else if (status === 401) {
        setErrorMsg('Session expired. Please log in again.');
      } else {
        setErrorMsg('Could not validate QR. Check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => { scanLock.current = false; }, 2000);
    }
  };

  const translateY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 230] });

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerLogo}>LAKBAY</Text>
            <Text style={styles.headerSubLogo}>SCAN &amp; DISCOVER</Text>
          </View>
          <View style={styles.headerRightPlaceholder}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveText}>READY</Text>
          </View>
        </View>
        <VintaStripe height={3} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* ── Mission Objective Card ── */}
          <View style={styles.missionCard}>
            <View style={styles.missionGlowOrb} />
            <View style={styles.missionTopRow}>
              <View style={styles.missionBadge}>
                <Ionicons name="scan" size={12} color={COLORS.teal} />
                <Text style={styles.missionBadgeText}>FIELD SCANNER</Text>
              </View>
              <View style={styles.xpRewardBadge}>
                <Ionicons name="flash" size={11} color={COLORS.gold} />
                <Text style={styles.xpRewardText}>+50 XP</Text>
              </View>
            </View>

            <Text style={styles.missionTitle}>UNCOVER HERITAGE LORE</Text>
            <Text style={styles.missionDesc}>
              Point your scanner at QR markers around tourist spots to unlock{' '}
              <Text style={styles.highlightTeal}>cultural stories</Text> and historical secrets of{' '}
              <Text style={styles.highlightGold}>Zamboanga City.</Text>
            </Text>
          </View>

          {/* ── Tactical HUD Camera Viewport ── */}
          <View style={styles.scannerWrapper}>
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
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : (
                    <View style={styles.permissionDeniedContainer}>
                      <Ionicons name="camera-outline" size={44} color="rgba(191,215,255,0.6)" style={{ marginBottom: 10 }} />
                      <Text style={styles.permissionDeniedTitle}>Camera Access Required</Text>
                      <Text style={styles.permissionDeniedSub}>Enable camera permission to scan QR markers</Text>
                      <TouchableOpacity
                        style={styles.permissionButton}
                        onPress={requestPermission}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.permissionButtonText}>ENABLE CAMERA</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Laser Scanning Beam */}
              {permission?.granted && (
                <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]}>
                  <View style={styles.scanBeamGlow} />
                </Animated.View>
              )}

              {/* Sci-Fi Target Reticle */}
              <Animated.View style={[styles.reticleContainer, { transform: [{ scale: pulseAnim }] }]} pointerEvents="none">
                <View style={styles.reticleCrosshairH} />
                <View style={styles.reticleCrosshairV} />
                <View style={styles.reticleCenterRing} />
              </Animated.View>

              {/* High-Tech Corner Brackets */}
              <View style={[styles.bracket, styles.topLeftBracket]} />
              <View style={[styles.bracket, styles.topRightBracket]} />
              <View style={[styles.bracket, styles.bottomLeftBracket]} />
              <View style={[styles.bracket, styles.bottomRightBracket]} />

              {/* HUD Top Left */}
              <View style={styles.hudTopLeft} pointerEvents="none">
                <View style={styles.hudDotActive} />
                <Text style={styles.hudTextActive}>QR SENSOR ACTIVE</Text>
              </View>

              {/* HUD Top Right */}
              <View style={styles.hudTopRight} pointerEvents="none">
                <Text style={styles.hudTextCoords}>6°54′N 122°4′E</Text>
              </View>

              {/* HUD Bottom Status Bar */}
              <View style={styles.hudBottomBar} pointerEvents="none">
                <View style={styles.hudBottomDot} />
                <Text style={styles.hudBottomText}>
                  {isLoading
                    ? 'VALIDATING MARKER...'
                    : permission?.granted
                      ? 'ALIGN QR CODE WITHIN FRAME'
                      : 'CAMERA OFFLINE'}
                </Text>
              </View>

              {/* Loading Overlay */}
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.gold} />
                  <Text style={styles.loadingTitle}>TRANSMITTING DATA...</Text>
                  <Text style={styles.loadingSub}>Verifying marker coordinates</Text>
                </View>
              )}
            </View>

            {/* Error Notification Banner */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
                <TouchableOpacity onPress={() => setErrorMsg('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* ── Tactical Protocol / Instructions ── */}
          <View style={styles.instructionCard}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="compass-outline" size={16} color={COLORS.teal} />
              <Text style={styles.instructionHeader}>SCANNING PROTOCOL</Text>
            </View>
            <Text style={styles.instructionBody}>
              Scan the official QR code marker posted at the cultural landmark. Make sure you are physically at the location to unlock XP and log your discovery.
            </Text>

            <View style={styles.stepRow}>
              <View style={styles.stepItem}>
                <View style={[styles.stepNumWrap, { borderColor: COLORS.teal + '66' }]}>
                  <Text style={[styles.stepNum, { color: COLORS.teal }]}>1</Text>
                </View>
                <Text style={styles.stepText}>Locate Marker</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.stepItem}>
                <View style={[styles.stepNumWrap, { borderColor: COLORS.accent + '66' }]}>
                  <Text style={[styles.stepNum, { color: COLORS.accent }]}>2</Text>
                </View>
                <Text style={styles.stepText}>Hold Steady</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.stepItem}>
                <View style={[styles.stepNumWrap, { borderColor: COLORS.gold + '66' }]}>
                  <Text style={[styles.stepNum, { color: COLORS.gold }]}>3</Text>
                </View>
                <Text style={styles.stepText}>Unlock Lore</Text>
              </View>
            </View>
          </View>

          {/* ── Field Tips & Intel ── */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeaderRow}>
              <Text style={styles.tipsSectionTitle}>FIELD INTEL &amp; TIPS</Text>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipIconWrap}>
                <Text style={styles.tipEmoji}>🗺️</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Cultural Hotspots</Text>
                <Text style={styles.tipText}>Check the Field Map to navigate directly to registered QR markers.</Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipIconWrap}>
                <Text style={styles.tipEmoji}>🧠</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Trivia Challenges</Text>
                <Text style={styles.tipText}>Each spot unlocks historical trivia to test your knowledge.</Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipIconWrap}>
                <Text style={styles.tipEmoji}>🎓</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Explorer Certification</Text>
                <Text style={styles.tipText}>Complete all heritage spots to earn your Explorer Certificate.</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 36 }} />
        </ScrollView>

        {/* ── Already Scanned / Collected Modal ── */}
        <Modal
          visible={!!alreadyScannedModal}
          transparent={true}
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalGlowOrb} />
              <View style={styles.modalIconWrap}>
                <Ionicons name="checkmark-done-circle" size={48} color={COLORS.teal} />
              </View>

              <Text style={styles.modalTitle}>ALREADY DISCOVERED!</Text>
              <Text style={styles.modalSub}>
                You have already scanned and unlocked{' '}
                <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold }}>
                  {alreadyScannedModal?.spot?.name || 'this location'}
                </Text>
                . XP and discovery badges have already been awarded to your explorer profile.
              </Text>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalBtnSecondary}
                  onPress={() => setAlreadyScannedModal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnSecondaryText}>Scan Another</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBtnPrimary}
                  onPress={() => {
                    const data = alreadyScannedModal;
                    setAlreadyScannedModal(null);
                    navigation.navigate('QRScanned', {
                      spot: data.spot,
                      already_scanned: true,
                      unlock_type: data.unlock_type,
                      bonus_creature: data.bonus_creature,
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnPrimaryText}>View Lore Anyway</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Spot Level Locked Modal ── */}
        <Modal
          visible={!!lockedModal}
          transparent={true}
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { borderColor: 'rgba(239, 68, 68, 0.45)' }]}>
              <View style={[styles.modalGlowOrb, { backgroundColor: 'rgba(239, 68, 68, 0.18)' }]} />
              <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderColor: 'rgba(239, 68, 68, 0.40)' }]}>
                <Ionicons name="lock-closed" size={40} color="#EF4444" />
              </View>

              <Text style={[styles.modalTitle, { color: '#EF4444' }]}>SPOT IS LEVEL LOCKED!</Text>

              <View style={styles.lockedPillRow}>
                <View style={styles.lockedReqPill}>
                  <Text style={styles.lockedReqPillText}>LVL {lockedModal?.requiredLevel || 1} REQUIRED</Text>
                </View>
                <View style={styles.lockedUserPill}>
                  <Text style={styles.lockedUserPillText}>YOUR LEVEL: LVL {lockedModal?.userLevel || 1}</Text>
                </View>
              </View>

              <Text style={styles.modalSub}>
                <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold }}>
                  {lockedModal?.spotName || 'This landmark spot'}
                </Text>{' '}
                is locked! In order for you to unlock, reach{' '}
                <Text style={{ color: COLORS.gold, fontFamily: FONTS.bold }}>
                  Explorer Level {lockedModal?.requiredLevel || 1}
                </Text>{' '}
                by collecting more XP in other features (AR Exhibits, Catch & Win, or lower-level QR spots).
              </Text>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.modalBtnPrimary, { backgroundColor: COLORS.accent }]}
                  onPress={() => setLockedModal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalBtnPrimaryText, { color: '#FFFFFF' }]}>Keep Exploring</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 38, 0.85)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    height: 64,
    backgroundColor: 'rgba(8, 20, 60, 0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 179, 237, 0.20)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    fontFamily: FONTS.pixel,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 18,
  },
  headerSubLogo: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(191,215,255,0.70)',
    letterSpacing: 2,
    marginTop: 1,
  },
  headerRightPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
  },
  liveText: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: COLORS.teal,
    letterSpacing: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },

  // ── Mission Objective Card ───────────────────────────────────────────
  missionCard: {
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    padding: 18,
    marginBottom: 18,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOW.accent,
  },
  missionGlowOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(26,86,219,0.22)',
  },
  missionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  missionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  missionBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.teal,
    letterSpacing: 1.5,
  },
  xpRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.40)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  xpRewardText: {
    fontFamily: FONTS.black,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  missionTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1,
    lineHeight: 20,
    marginBottom: 8,
  },
  missionDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191,215,255,0.85)',
    lineHeight: 19,
  },
  highlightTeal: {
    color: COLORS.teal,
    fontFamily: FONTS.bold,
  },
  highlightGold: {
    color: COLORS.gold,
    fontFamily: FONTS.bold,
  },

  // ── Scanner Viewport ────────────────────────────────────────────────
  scannerWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrViewport: {
    width: '100%',
    height: 270,
    backgroundColor: '#070C1E',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 179, 237, 0.35)',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.accent,
  },
  scanLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: COLORS.teal,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  scanBeamGlow: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderRadius: 9,
  },

  // Reticle HUD
  reticleContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  reticleCenterRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderStyle: 'dashed',
  },
  reticleCrosshairH: {
    position: 'absolute',
    width: 130,
    height: 1,
    backgroundColor: 'rgba(99,179,237,0.30)',
  },
  reticleCrosshairV: {
    position: 'absolute',
    height: 130,
    width: 1,
    backgroundColor: 'rgba(99,179,237,0.30)',
  },

  // Brackets
  bracket: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: COLORS.teal,
  },
  topLeftBracket: {
    top: 20,
    left: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  topRightBracket: {
    top: 20,
    right: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  bottomLeftBracket: {
    bottom: 20,
    left: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  bottomRightBracket: {
    bottom: 20,
    right: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },

  hudTopLeft: {
    position: 'absolute',
    top: 14,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(8,20,60,0.85)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.25)',
  },
  hudDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
  },
  hudTextActive: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: FONTS.bold,
    letterSpacing: 1,
  },
  hudTopRight: {
    position: 'absolute',
    top: 14,
    right: 16,
    backgroundColor: 'rgba(8,20,60,0.85)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.25)',
  },
  hudTextCoords: {
    color: 'rgba(191,215,255,0.85)',
    fontSize: 8,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.8,
  },
  hudBottomBar: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(8,20,60,0.88)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.30)',
  },
  hudBottomDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.accent,
  },
  hudBottomText: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 9,
    fontFamily: FONTS.bold,
    letterSpacing: 1,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,10,38,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONTS.pixel,
    letterSpacing: 1,
    marginTop: 6,
  },
  loadingSub: {
    color: 'rgba(191,215,255,0.70)',
    fontSize: 11,
    fontFamily: FONTS.regular,
  },

  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080F23',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionDeniedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  permissionDeniedTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  permissionDeniedSub: {
    color: 'rgba(191,215,255,0.65)',
    fontSize: 11,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: RADIUS.pill,
    ...SHADOW.accent,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 1,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.40)',
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    width: '100%',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontFamily: FONTS.medium,
    flex: 1,
  },

  // ── Instructions Card ────────────────────────────────────────────────
  instructionCard: {
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    padding: 18,
    marginBottom: 18,
    ...SHADOW.accent,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  instructionHeader: {
    color: COLORS.teal,
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 1.5,
  },
  instructionBody: {
    color: 'rgba(191,215,255,0.80)',
    fontSize: 12,
    fontFamily: FONTS.regular,
    lineHeight: 18,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(26,86,219,0.10)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.20)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  stepNumWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    backgroundColor: 'rgba(8,20,60,0.80)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  stepText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  stepDivider: {
    width: 14,
    height: 1,
    backgroundColor: 'rgba(99,179,237,0.30)',
    marginBottom: 18,
  },

  // ── Field Intel Section ──────────────────────────────────────────────
  tipsSection: {
    gap: 10,
  },
  tipsHeaderRow: {
    marginBottom: 4,
  },
  tipsSectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 20, 60, 0.58)',
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.20)',
    gap: 12,
  },
  tipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26,86,219,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.30)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipEmoji: {
    fontSize: 18,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  tipText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(191,215,255,0.75)',
    lineHeight: 16,
  },

  // ── Already Scanned Modal ────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,10,38,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'rgba(8, 20, 60, 0.92)',
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(16,185,129,0.45)',
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...SHADOW.accent,
  },
  modalGlowOrb: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  modalIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(16,185,129,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(16,185,129,0.40)',
  },
  modalTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 12,
    color: COLORS.teal,
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  lockedPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  lockedReqPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
    borderColor: 'rgba(239, 68, 68, 0.50)',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lockedReqPillText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  lockedUserPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.20)',
    borderColor: 'rgba(245, 158, 11, 0.50)',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lockedUserPillText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  modalSub: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'rgba(191,215,255,0.80)',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 22,
  },
  modalActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  modalBtnPrimary: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.accent,
  },
  modalBtnPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#08143C',
    letterSpacing: 0.5,
  },
});
