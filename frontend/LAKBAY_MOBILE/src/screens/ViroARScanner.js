import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, StatusBar, InteractionManager, Alert, Modal, Animated, Easing, Image, Dimensions, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Build model-viewer HTML for reward modal
const buildRewardViewerHTML = (modelUrl) => {
  if (!modelUrl) return null;
  const safe = String(modelUrl).replace(/["'<>&]/g, c => ({ '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100%;height:100%;background:transparent;overflow:hidden;}model-viewer{width:100%;height:100%;--progress-bar-color:transparent;}</style></head><body><model-viewer src="${safe}" auto-rotate camera-controls bounds="tight" min-camera-orbit="auto auto 40%" camera-orbit="auto 75deg 80%" exposure="1.3" shadow-intensity="0" style="width:100%;height:100%"></model-viewer></body></html>`;
};
import {
  ViroARSceneNavigator,
  ViroARScene,
  ViroARImageMarker,
  ViroARTrackingTargets,
  Viro3DObject,
  ViroText,
  ViroNode,
  ViroAnimations,
  ViroAmbientLight,
  ViroSpotLight,
  ViroDirectionalLight,
  ViroARCamera,
  isARSupportedOnDevice,
  requestRequiredPermissions,
} from '@reactvision/react-viro';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { getARTargets, ORIGIN, logActivity } from '../api/qrService';
import { authService } from '../api/authService';
import ARGuideCenterPopup from '../components/ARGuideCenterPopup';

// Resolve a model path into an absolute https URL Viro can load.
const resolveModelUrl = (m) => {
  if (!m) return null;
  if (m.startsWith('data:')) return m;
  if (m.startsWith('http')) return m.replace('http://', 'https://');
  return `${ORIGIN}${m}`;
};

export const RARITY_THEME = {
  common: {
    label: 'COMMON',
    title: 'Common Cultural Discovery',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.18)',
    border: '#10B981',
    icon: 'sparkles',
    xp: 50,
    emoji: '🏺',
  },
  rare: {
    label: 'RARE',
    title: 'Rare Regional Relic',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.18)',
    border: '#3B82F6',
    icon: 'star',
    xp: 100,
    emoji: '⚔️',
  },
  mythical: {
    label: 'MYTHICAL',
    title: 'Mythical Spirit Legend',
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.18)',
    border: '#A855F7',
    icon: 'diamond',
    xp: 150,
    emoji: '🐉',
  },
  legendary: {
    label: 'LEGENDARY',
    title: 'Legendary Masterpiece',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.22)',
    border: '#F59E0B',
    icon: 'trophy',
    xp: 250,
    emoji: '👑',
  },
};

// =========================================================================
// 1. STEADY 3D MODEL VIEWER (MATCHING CATCH FEATURE ARCHITECTURE)
// =========================================================================
const buildSteadyViewerHTML = (modelUrl) => {
  if (!modelUrl) return null;
  const safe = String(modelUrl).replace(/["'<>&]/g, c => ({ '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js" crossorigin="anonymous"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
      touch-action: none !important;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    model-viewer {
      width: 100%;
      height: 100%;
      background: transparent;
      touch-action: none !important;
      --progress-bar-color: transparent;
    }
  </style>
</head>
<body>
  <model-viewer
    id="steadyViewer"
    src="${safe}"
    auto-rotate
    auto-rotate-delay="0"
    rotation-per-second="25deg"
    camera-controls
    touch-action="none"
    interpolation-decay="150"
    interaction-prompt="none"
    min-camera-orbit="auto auto 15%"
    max-camera-orbit="auto auto 400%"
    camera-orbit="0deg 75deg 105%"
    exposure="1.2"
    shadow-intensity="1.5"
    style="width: 100%; height: 100%; background: transparent; touch-action: none;"
  ></model-viewer>
  <script>
    window.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        var mv = document.getElementById('steadyViewer');
        if (!mv) return;
        if (data.type === 'ZOOM_IN') {
          mv.zoom(1.3);
        } else if (data.type === 'ZOOM_OUT') {
          mv.zoom(0.75);
        } else if (data.type === 'RESET_VIEW') {
          mv.cameraOrbit = '0deg 75deg 105%';
        }
      } catch (err) {}
    });
  </script>
</body>
</html>`;
};

// =========================================================================
// 2. DEFINE THE 3D AR SCENE (IMAGE MARKER DETECTION)
// =========================================================================
const MuseumARScene = (props) => {
  return (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" intensity={1000} />
      <ViroDirectionalLight color="#FFFFFF" direction={[0, 0, -1]} intensity={1200} />

      {/* Dynamic Optical Image Markers for Museum Artworks */}
      {(props.sceneNavigator.viroAppProps.arTargets || []).map(target => (
        <ViroARImageMarker
          key={target.id}
          target={`target_${target.id}`}
          onAnchorFound={() => props.sceneNavigator.viroAppProps.onTargetFound(target)}
          onAnchorRemoved={() => props.sceneNavigator.viroAppProps.onTargetLost()}
        />
      ))}
    </ViroARScene>
  );
};

// =========================================================================
// 3. OPTIONAL ANIMATIONS FOR AR OBJECTS
// =========================================================================
ViroAnimations.registerAnimations({
  rotate: {
    properties: { rotateY: "+=90" },
    duration: 2500, // 2.5s for 90 degrees
  },
});

// =========================================================================
// 4. THE MAIN SCREEN UI
// =========================================================================
export default function ViroARScanner({ navigation }) {
  const [detectedSpot, setDetectedSpot] = useState(null);
  const [modelScale, setModelScale] = useState(0.25);
  const [modelPosition, setModelPosition] = useState([0, -0.05, -1.2]);
  // On-screen 3D model status so we can see load progress/errors without the
  // native console: 'none' | 'loading' | 'loaded' | 'error'
  const [modelStatus, setModelStatus] = useState({ state: 'none', message: '' });
  const loadedModelsRef = React.useRef(new Set());
  const [arTargets, setArTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  // 'checking' | 'ready' | 'unsupported' | 'permission-denied'
  const [arStatus, setArStatus] = useState('checking');
  // Defer mounting the AR GL surface until the screen transition + layout
  // have settled. Mounting ViroARSceneNavigator too early races the native
  // GL surface setup and shows a black camera on some devices (e.g. Samsung).
  const [sceneMountReady, setSceneMountReady] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(true);
  const [modalStep, setModalStep] = useState(0);

  const instructionSteps = [
    {
      icon: 'location',
      iconColor: COLORS.accent,
      iconBg: 'rgba(26,86,219,0.15)',
      stepLabel: 'STEP 1 OF 3',
      title: 'Head to the Building',
      body: 'Start by visiting the museum building (S1, S2, or S3). Each building holds up to 10 artwork models waiting to be discovered.',
      note: null,
    },
    {
      icon: 'eye',
      iconColor: COLORS.gold,
      iconBg: 'rgba(251,191,36,0.15)',
      stepLabel: 'STEP 2 OF 3',
      title: 'Scan the 10 Artwork Exhibits',
      body: 'Inside the building, point your AR camera at paintings and exhibits. Artworks range across 4 rarities: Common, Rare, Mythical, and Legendary.',
      note: 'If you need assistance finding a piece, tap the Exhibit Clues button on the top right.',
    },
    {
      icon: 'trophy',
      iconColor: COLORS.teal,
      iconBg: 'rgba(16,185,129,0.15)',
      stepLabel: 'STEP 3 OF 3',
      title: 'Collect & View 3D Models',
      body: 'Every artwork you scan is saved to your permanent collection with its rarity badge and slot number. Visit your Collection in the Badges tab anytime!',
      note: null,
    },
  ];
  const [rewardModalData, setRewardModalData] = useState(null);
  const [showGuideCenterPopup, setShowGuideCenterPopup] = useState(false);
  const [activeGuideTarget, setActiveGuideTarget] = useState(null);
  const [showHintModal, setShowHintModal] = useState(false);
  const glowAnim = React.useRef(new Animated.Value(0)).current;
  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const lastTargetIdRef = React.useRef(null);
  const steadyWebViewRef = React.useRef(null);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -14, duration: 1400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,   duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  React.useEffect(() => {
    if (rewardModalData) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [rewardModalData]);

  // Hint auto-popup: If tourist hasn't found art in 12s, popup the 3D Character Guide in the center
  React.useEffect(() => {
    if (!sceneMountReady || arStatus !== 'ready' || loading || arTargets.length === 0) return;
    
    const targetsWithHints = arTargets.filter(t => t.hint && t.hint.trim().length > 0);
    if (targetsWithHints.length === 0) return;

    const timer = setTimeout(() => {
      if (!detectedSpot && !rewardModalData) {
        const chosen = targetsWithHints[Math.floor(Math.random() * targetsWithHints.length)];
        setActiveGuideTarget(chosen);
        setShowGuideCenterPopup(true);
      }
    }, 12000);

    return () => clearTimeout(timer);
  }, [sceneMountReady, arStatus, loading, arTargets, detectedSpot, rewardModalData]);

  React.useEffect(() => {
    (async () => {
      try {
        const permissions = await requestRequiredPermissions(['camera']);
        if (!permissions.camera) {
          setArStatus('permission-denied');
          return;
        }
        const support = await isARSupportedOnDevice();
        setArStatus(support.isARSupported ? 'ready' : 'unsupported');
      } catch (err) {
        console.error(err);
        setArStatus('unsupported');
      }
    })();
  }, []);

  // Once AR is confirmed ready, wait for the navigation transition and any
  // pending interactions to finish, then a short settle delay, before mounting
  // the AR scene. This avoids the black-camera GL race on some Android devices.
  React.useEffect(() => {
    if (arStatus !== 'ready' || loading) return;
    let timer;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setSceneMountReady(true), 350);
    });
    return () => {
      task.cancel?.();
      if (timer) clearTimeout(timer);
    };
  }, [arStatus, loading]);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await getARTargets();
        const targets = Array.isArray(data) ? data : (data.results || []);
        const targetMap = {};
        targets.forEach(t => {
          if (t.image) {
            targetMap[`target_${t.id}`] = {
              source: { uri: t.image },
              orientation: "Up",
              physicalWidth: 0.5,
            };
          }
        });
        if (Object.keys(targetMap).length > 0) {
          ViroARTrackingTargets.createTargets(targetMap);
        }
        const usable = targets.filter(t => t.image);

        // Viro's Android loader requires local file:// paths ("Failed to load
        // model" when given remote URLs). Pre-download each .glb via FileSystem.
        await Promise.all(usable.map(async (t) => {
          if (!t.model_3d) return;
          try {
            const remoteUrl = resolveModelUrl(t.model_3d);
            const remoteFileName = remoteUrl.split('/').pop()?.split('?')[0] || `model_${t.id}.glb`;
            const localDest = `${FileSystem.cacheDirectory}ar_${t.id}_${remoteFileName}`;
            const info = await FileSystem.getInfoAsync(localDest);
            if (info.exists && info.size > 0) {
              t.local_model = localDest;
              console.log('[AR] model found in cache:', t.name, localDest);
            } else {
              const res = await FileSystem.downloadAsync(remoteUrl, localDest);
              if (res.status === 200) {
                t.local_model = res.uri;
                console.log('[AR] model downloaded to local cache:', t.name, res.uri);
              } else {
                t.local_model = res.uri || remoteUrl;
              }
            }
          } catch (e) {
            console.log('[AR] model FileSystem download failed:', t.name, String(e));
            t.local_model = resolveModelUrl(t.model_3d);
          }
        }));

        console.log('[AR] targets loaded:', usable.map(t => ({ name: t.name, hasModel: !!t.model_3d, rarity: t.rarity, slot: t.slot_number, local: t.local_model || null })));
        setArTargets(usable);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    })();
  }, []);

  // Called natively when ViroARImageMarker sees a painting
  const handleTargetFound = async (target) => {
    if (!target) return;
    // Ignore duplicate events while this artwork is already detected on screen
    if (detectedSpot && detectedSpot.id === target.id) return;
    lastTargetIdRef.current = target.id;

    const rarityKey = (target.rarity || 'common').toLowerCase();
    const rarityTheme = RARITY_THEME[rarityKey] || RARITY_THEME.common;
    const earnedXP = rarityTheme.xp || 150;

    // Save to SecureStore for the Badges tab and award XP
    let wasAlreadyCollected = false;
    try {
      const SecureStore = require('expo-secure-store');
      const existing = await SecureStore.getItemAsync('collected_models');
      let models = existing ? JSON.parse(existing) : [];
      const existingIdx = models.findIndex(m => m.id === target.id);
      if (existingIdx === -1) {
        models.push({
          id: target.id,
          name: target.name,
          building: target.building || 'S1',
          rarity: target.rarity || 'common',
          slot_number: target.slot_number || 1,
          spot_name: target.spot_name || '',
          hint: target.hint || '',
          emoji: rarityTheme.emoji || '🎨',
          color: rarityTheme.color,
          model_3d: target.model_3d ? resolveModelUrl(target.model_3d) : null,
          source: 'ar',
        });
        await SecureStore.setItemAsync('collected_models', JSON.stringify(models));
        // Tag the cache with the current user's ID so stale data from other users is ignored
        try {
          const profile = await authService.getProfile();
          if (profile?.id) {
            await SecureStore.setItemAsync('collected_models_uid', String(profile.id));
          }
        } catch (_) {}

        // Award XP live to user profile
        authService.adjustXP(earnedXP).catch(err => console.warn('Failed to award AR XP:', err));

        // Log to backend for admin recent activity feed
        logActivity('ar', `discovered "${target.name || 'Museum Artwork'}" in AR Exhibit`);
      } else {
        wasAlreadyCollected = true;
      }
    } catch (e) {
      console.error("Error saving collected model", e);
    }

    let localModelPath = target.local_model;
    if (target.model_3d && (!localModelPath || localModelPath.startsWith('http'))) {
      try {
        const remoteUrl = resolveModelUrl(target.model_3d);
        const remoteFileName = remoteUrl.split('/').pop()?.split('?')[0] || `model_${target.id}.glb`;
        const localDest = `${FileSystem.cacheDirectory}ar_${target.id}_${remoteFileName}`;
        const info = await FileSystem.getInfoAsync(localDest);
        if (info.exists && info.size > 0) {
          localModelPath = localDest;
        } else {
          const res = await FileSystem.downloadAsync(remoteUrl, localDest);
          if (res.status === 200) {
            localModelPath = res.uri;
          }
        }
      } catch (err) {
        console.warn('[AR] on-demand target model download error:', err);
      }
    }

    setRewardModalData({
      id: target.id,
      name: target.name,
      building: target.building || 'S1',
      rarity: target.rarity || 'common',
      slot_number: target.slot_number || 1,
      spot_name: target.spot_name || '',
      hint: target.hint || '',
      emoji: rarityTheme.emoji || '🎨',
      earnedXP: earnedXP,
      model_3d: target.model_3d ? resolveModelUrl(target.model_3d) : null,
      already_collected: wasAlreadyCollected,
    });

    setDetectedSpot({
      id: target.id,
      name: target.name,
      building: target.building || 'S1',
      rarity: target.rarity || 'common',
      slot_number: target.slot_number || 1,
      spot_name: target.spot_name || '',
      hint: target.hint || '',
      description: target.description || "You've uncovered a hidden AR experience inside the building! Point your camera to see it.",
      model_3d: target.model_3d ? resolveModelUrl(target.model_3d) : null,
      local_model: localModelPath || target.local_model || (target.model_3d ? resolveModelUrl(target.model_3d) : null)
    });

    // Dismiss any active 3D hint popup when target is found
    setShowGuideCenterPopup(false);
    setModelScale(0.25);
    setModelPosition([0, -0.05, -1.2]);

    if (target.model_3d) {
      if (loadedModelsRef.current.has(target.id)) {
        setModelStatus({ state: 'loaded', message: '' });
      } else {
        setModelStatus({ state: 'loading', message: '' });
      }
    } else {
      setModelStatus({ state: 'none', message: '' });
    }
  };

  const handleModelLoadEnd = (targetId) => {
    loadedModelsRef.current.add(targetId);
    setModelStatus({ state: 'loaded', message: '' });
  };
  const handleModelError = (message) => setModelStatus({ state: 'error', message: String(message || 'unknown error') });

  // Called when the painting leaves the camera view
  const handleTargetLost = () => {
    // Optionally clear it, but leaving it helps the user tap the "View Details" button
    // setDetectedSpot(null); 
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <Modal
        visible={!!rewardModalData}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <RewardModal
          data={rewardModalData}
          glowAnim={glowAnim}
          onClose={() => setRewardModalData(null)}
          onViewDetails={() => {
            setRewardModalData(null);
            if (detectedSpot) {
              navigation.navigate('CatchDetails', {
                icon: {
                  name: detectedSpot.name,
                  about: detectedSpot.description,
                  model_3d: detectedSpot.model_3d,
                  rarity: detectedSpot.rarity || 'common',
                  building: detectedSpot.building || 'S1',
                  slot_number: detectedSpot.slot_number || 1,
                  spot_name: detectedSpot.spot_name || '',
                },
                isAR: true,
              });
            }
          }}
        />
      </Modal>

      <Modal
        visible={showInstructionModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image source={require('../assets/buildings.jpg')} style={styles.modalImage} resizeMode="cover" />

            {/* Step dot indicators */}
            <View style={styles.stepDotsRow}>
              {instructionSteps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    i === modalStep ? styles.stepDotActive : styles.stepDotInactive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.modalTextContainer}>
              {/* Step label */}
              <Text style={[styles.stepLabel, { color: instructionSteps[modalStep].iconColor }]}>
                {instructionSteps[modalStep].stepLabel}
              </Text>

              {/* Icon */}
              <View style={[styles.stepIconCircle, { backgroundColor: instructionSteps[modalStep].iconBg }]}>
                <Ionicons name={instructionSteps[modalStep].icon} size={28} color={instructionSteps[modalStep].iconColor} />
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>{instructionSteps[modalStep].title}</Text>

              {/* Body */}
              <Text style={styles.modalMessage}>{instructionSteps[modalStep].body}</Text>

              {/* Optional note */}
              {instructionSteps[modalStep].note ? (
                <View style={styles.noteBox}>
                  <Ionicons name="information-circle" size={16} color={COLORS.gold} style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.noteText}>{instructionSteps[modalStep].note}</Text>
                </View>
              ) : null}

              {/* Navigation buttons */}
              <View style={styles.modalNavRow}>
                {modalStep > 0 ? (
                  <TouchableOpacity
                    style={styles.modalBtnSecondary}
                    onPress={() => setModalStep(modalStep - 1)}
                  >
                    <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.modalBtnSecondaryText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1 }} />
                )}

                {modalStep < instructionSteps.length - 1 ? (
                  <TouchableOpacity
                    style={styles.modalBtn}
                    onPress={() => setModalStep(modalStep + 1)}
                  >
                    <Text style={styles.modalBtnText}>Next</Text>
                    <Ionicons name="chevron-forward" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: COLORS.teal }]}
                    onPress={() => { setShowInstructionModal(false); setModalStep(0); }}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.modalBtnText}>Proceed</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR Scanner</Text>
        <TouchableOpacity
          onPress={() => {
            const targetsWithHints = arTargets.filter(t => t.hint && t.hint.trim().length > 0);
            if (targetsWithHints.length > 0) {
              setActiveGuideTarget(targetsWithHints[0]);
            }
            setShowGuideCenterPopup(true);
          }}
          style={styles.hintHeaderBtn}
        >
          <Ionicons name="bulb" size={18} color={COLORS.gold} />
          <Text style={styles.hintHeaderBtnText}>3D Clue</Text>
        </TouchableOpacity>
      </View>

      {/* 3D Guide Character Hologram Pop-out (Center of Screen) */}
      <ARGuideCenterPopup
        visible={showGuideCenterPopup}
        onClose={() => setShowGuideCenterPopup(false)}
        arTargets={arTargets}
        activeTarget={activeGuideTarget}
        onOpenFullList={() => {
          setShowGuideCenterPopup(false);
          setShowHintModal(true);
        }}
        rarityThemes={RARITY_THEME}
      />

      {/* Viro React AR Camera View */}
      <View style={styles.cameraContainer}>
        {arStatus === 'checking' || (arStatus === 'ready' && (loading || !sceneMountReady)) ? (
          <ActivityIndicator size="large" color="#FFF" style={{ marginTop: '50%' }} />
        ) : arStatus === 'permission-denied' ? (
          <View style={styles.fallbackContainer}>
            <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.6)" />
            <Text style={styles.fallbackText}>Camera access is required for AR scanning. Please enable it in your device settings.</Text>
          </View>
        ) : arStatus === 'unsupported' ? (
          <View style={styles.fallbackContainer}>
            <Ionicons name="alert-circle-outline" size={40} color="rgba(255,255,255,0.6)" />
            <Text style={styles.fallbackText}>AR scanning isn't supported on this device. Try updating Google Play Services for AR, or use the QR scan feature instead.</Text>
          </View>
        ) : (
          <ViroARSceneNavigator
            initialScene={{ scene: MuseumARScene }}
            viroAppProps={{
              arTargets: arTargets,
              onTargetFound: handleTargetFound,
              onTargetLost: handleTargetLost,
              onModelLoadEnd: handleModelLoadEnd,
              onModelError: handleModelError,
              detectedSpot: detectedSpot,
              modelScale: modelScale,
              onModelScaleChange: setModelScale,
              modelPosition: modelPosition,
              onModelPositionChange: setModelPosition,
            }}
            style={{ flex: 1 }}
            autofocus={true}
          />
        )}
      </View>

      {/* MODAL: LOCATION HINTS LIST */}
      <Modal
        visible={showHintModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.hintModalOverlay}>
          <View style={styles.hintModalContent}>
            <View style={styles.hintModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.hintModalIcon}>
                  <Ionicons name="bulb" size={22} color={COLORS.gold} />
                </View>
                <View>
                  <Text style={styles.hintModalTitle}>Exhibit Location Clues</Text>
                  <Text style={styles.hintModalSub}>Find all 10 artwork models per building (S1, S2, S3)</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowHintModal(false)} style={styles.hintModalCloseBtn}>
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.hintModalScroll} contentContainerStyle={{ paddingBottom: 24 }}>
              {arTargets.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>No AR target exhibits registered for this spot yet.</Text>
                </View>
              ) : (
                arTargets.map((t, idx) => {
                  const rTheme = RARITY_THEME[(t.rarity || 'common').toLowerCase()] || RARITY_THEME.common;
                  return (
                    <View key={t.id || idx} style={[styles.hintItemCard, { borderColor: rTheme.color + '44' }]}>
                      <View style={styles.hintItemHeader}>
                        <View style={[styles.hintSlotBadge, { backgroundColor: rTheme.bg, borderColor: rTheme.color }]}>
                          <Text style={[styles.hintSlotText, { color: rTheme.color }]}>Building {t.building || 'S1'} · Slot #{t.slot_number || (idx + 1)}</Text>
                        </View>
                        <View style={[styles.hintRarityPill, { backgroundColor: rTheme.color + '22', borderColor: rTheme.color + '66' }]}>
                          <Text style={[styles.hintRarityText, { color: rTheme.color }]}>{rTheme.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.hintTargetName}>{t.name}</Text>
                      <View style={styles.hintQuoteBox}>
                        <Ionicons name="compass-outline" size={16} color={COLORS.gold} style={{ marginRight: 6, marginTop: 1 }} />
                        <Text style={styles.hintQuoteText}>{t.hint || 'Explore the room and point your camera at paintings and sculptures.'}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Steady Floating 3D Model (Catch Feature Architecture + Full Multi-Touch & Zoom) ── */}
      {detectedSpot && (
        <Animated.View style={[styles.steadyModelWrap, { transform: [{ translateY: floatAnim }] }]}>
          {/* Ambient Glow (Placed BEHIND WebView with pointerEvents="none" so it NEVER blocks touches) */}
          <View
            pointerEvents="none"
            style={[
              styles.steadyModelGlow,
              {
                backgroundColor: (RARITY_THEME[detectedSpot.rarity?.toLowerCase()] || RARITY_THEME.common).color + '30',
                shadowColor: (RARITY_THEME[detectedSpot.rarity?.toLowerCase()] || RARITY_THEME.common).color,
              }
            ]}
          />

          {detectedSpot.model_3d ? (
            <WebView
              ref={steadyWebViewRef}
              source={{ html: buildSteadyViewerHTML(detectedSpot.model_3d) }}
              style={styles.steadyModelWebview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              backgroundColor="transparent"
              allowsTransparency={true}
            />
          ) : (
            <View style={[styles.steadyModelFallback, { borderColor: (RARITY_THEME[detectedSpot.rarity?.toLowerCase()] || RARITY_THEME.common).color }]}>
              <Ionicons name="cube-outline" size={64} color="#FFF" />
            </View>
          )}

          {/* Quick Floating Zoom Buttons on the right edge */}
          {detectedSpot.model_3d && (
            <View style={styles.floatingZoomRow}>
              <TouchableOpacity
                style={styles.floatingZoomBtn}
                activeOpacity={0.7}
                onPress={() => {
                  steadyWebViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_IN' }));
                }}
              >
                <Ionicons name="add" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.floatingZoomBtn}
                activeOpacity={0.7}
                onPress={() => {
                  steadyWebViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_OUT' }));
                }}
              >
                <Ionicons name="remove" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.floatingZoomBtn, { backgroundColor: 'rgba(0,0,0,0.65)' }]}
                activeOpacity={0.7}
                onPress={() => {
                  steadyWebViewRef.current?.postMessage(JSON.stringify({ type: 'RESET_VIEW' }));
                }}
              >
                <Ionicons name="refresh" size={14} color={COLORS.gold} />
              </TouchableOpacity>
            </View>
          )}

          {/* Interactive Touch Hint Badge */}
          <View pointerEvents="none" style={styles.touchHintBadge}>
            <Ionicons name="hand-left-outline" size={11} color="rgba(255,255,255,0.85)" style={{ marginRight: 4 }} />
            <Text style={styles.touchHintText}>Drag to rotate 360° · Pinch to zoom</Text>
          </View>
        </Animated.View>
      )}

      {/* React Native UI Overlay (Pops up when painting is detected) */}
      {detectedSpot && (
        <View style={styles.overlayUI}>
          <View style={styles.infoCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={14} color={COLORS.gold} />
                <Text style={styles.badgeText}>Artwork Detected</Text>
              </View>
              {(() => {
                const rTheme = RARITY_THEME[(detectedSpot.rarity || 'common').toLowerCase()] || RARITY_THEME.common;
                return (
                  <View style={[styles.detectedRarityBadge, { backgroundColor: rTheme.bg, borderColor: rTheme.color }]}>
                    <Text style={[styles.detectedRarityText, { color: rTheme.color }]}>{rTheme.label} · Building {detectedSpot.building || 'S1'} · Slot #{detectedSpot.slot_number || 1}</Text>
                  </View>
                );
              })()}
            </View>
            <Text style={styles.title}>{detectedSpot.name}</Text>
            <Text style={styles.desc} numberOfLines={2}>{detectedSpot.description}</Text>

            {/* Action Buttons: Scan Another vs View Details */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.btnScanNext}
                onPress={() => setDetectedSpot(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="scan-outline" size={16} color="rgba(255,255,255,0.85)" style={{ marginRight: 6 }} />
                <Text style={styles.btnScanNextText}>Scan Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnDetails,
                  { backgroundColor: (RARITY_THEME[detectedSpot.rarity?.toLowerCase()] || RARITY_THEME.common).color }
                ]}
                onPress={() => navigation.navigate('CatchDetails', {
                  icon: {
                    name: detectedSpot.name,
                    about: detectedSpot.description,
                    model_3d: detectedSpot.model_3d,
                    rarity: detectedSpot.rarity || 'common',
                    building: detectedSpot.building || 'S1',
                    slot_number: detectedSpot.slot_number || 1,
                    spot_name: detectedSpot.spot_name || '',
                  },
                  isAR: true
                })}
                activeOpacity={0.85}
              >
                <Ionicons name="information-circle-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnDetailsText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Gamified Reward Modal Component ─────────────────────────────────────────
function RewardModal({ data, glowAnim, onClose, onViewDetails }) {
  const scaleAnim  = useRef(new Animated.Value(0.6)).current;
  const opacAnim   = useRef(new Animated.Value(0)).current;
  const shimmer    = useRef(new Animated.Value(0)).current;
  const titleBounce = useRef(new Animated.Value(0)).current;

  // Floating particle orbs
  const orbs = useRef(
    Array.from({ length: 6 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      op: new Animated.Value(0),
      sc: new Animated.Value(0.3),
    }))
  ).current;

  useEffect(() => {
    if (!data) return;

    // Card pop-in
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
      Animated.timing(opacAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Title bounce
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(titleBounce, { toValue: -8, duration: 180, useNativeDriver: true }),
        Animated.spring(titleBounce,  { toValue: 0,  friction: 4, useNativeDriver: true }),
      ]).start();
    }, 400);

    // Shimmer on model card
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Floating orbs
    const POSITIONS = [
      { tx: -80, ty: -120 }, { tx: 80, ty: -100 }, { tx: -110, ty: 20 },
      { tx: 110, ty: 10  }, { tx: -60, ty: 130  }, { tx: 60,  ty: 120 },
    ];
    orbs.forEach((orb, i) => {
      const pos = POSITIONS[i];
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(orb.op, { toValue: 1,   duration: 400, useNativeDriver: true }),
          Animated.timing(orb.sc, { toValue: 1,   duration: 500, useNativeDriver: true }),
          Animated.timing(orb.x,  { toValue: pos.tx, duration: 1800 + i * 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(orb.y,  { toValue: pos.ty, duration: 1800 + i * 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start(() => {
          Animated.timing(orb.op, { toValue: 0, duration: 600, useNativeDriver: true }).start();
        });
      }, i * 80);
    });

    return () => {
      scaleAnim.setValue(0.6);
      opacAnim.setValue(0);
      shimmer.setValue(0);
      titleBounce.setValue(0);
      orbs.forEach(o => { o.x.setValue(0); o.y.setValue(0); o.op.setValue(0); o.sc.setValue(0.3); });
    };
  }, [data]);

  if (!data) return null;

  const rarityKey = (data.rarity || 'common').toLowerCase();
  const rTheme = RARITY_THEME[rarityKey] || RARITY_THEME.common;
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-(SCREEN_W), SCREEN_W] });
  const rewardHTML = data.model_3d ? buildRewardViewerHTML(data.model_3d) : null;

  return (
    <View style={rwStyles.overlay}>
      {/* Particle orbs */}
      {orbs.map((orb, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            rwStyles.orb,
            { opacity: orb.op, transform: [{ translateX: orb.x }, { translateY: orb.y }, { scale: orb.sc }] },
            { backgroundColor: i % 2 === 0 ? rTheme.color : COLORS.gold },
          ]}
        />
      ))}

      <Animated.View style={[rwStyles.card, { borderColor: rTheme.color + '99', shadowColor: rTheme.color, opacity: opacAnim, transform: [{ scale: scaleAnim }] }]}>

        {/* Header banner */}
        <View style={[rwStyles.cardHeader, { borderBottomColor: rTheme.color + '44' }]}>
          <View style={[rwStyles.headerGlow, { backgroundColor: rTheme.color + '44' }]} />
          <View style={rwStyles.rarityRow}>
            <Ionicons name={rTheme.icon} size={13} color={rTheme.color} />
            <Text style={[rwStyles.rarityText, { color: rTheme.color }]}>
              {data.already_collected ? 'ALREADY IN COLLECTION' : `${rTheme.label} DISCOVERY`}
            </Text>
            <Ionicons name={rTheme.icon} size={13} color={rTheme.color} />
          </View>
          <Animated.Text style={[rwStyles.rewardTitle, { transform: [{ translateY: titleBounce }] }]}>
            {data.already_collected ? '🎨 Art Already Collected!' : '✨ Art Discovered!'}
          </Animated.Text>
          <Text style={rwStyles.slotBanner}>
            Slot #{data.slot_number || 1} of 10 · Building {data.building || 'S1'}
          </Text>
        </View>

        {/* 3D model viewer OR fallback icon */}
        <View style={rwStyles.modelFrame}>
          {/* Glow ring */}
          <Animated.View style={[
            rwStyles.modelGlow,
            { backgroundColor: rTheme.color + '26',
              opacity: glowAnim.interpolate({ inputRange: [0,1], outputRange: [0.3, 0.8] }),
              transform: [{ scale: glowAnim.interpolate({ inputRange: [0,1], outputRange: [1, 1.15] }) }] }
          ]} />

          <View style={[rwStyles.modelCard, { borderColor: rTheme.color + '66' }]}>
            {rewardHTML ? (
              <WebView
                source={{ html: rewardHTML }}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                javaScriptEnabled
                originWhitelist={['https://*']}
                scrollEnabled={false}
              />
            ) : (
              <View style={rwStyles.noModelFallback}>
                <Text style={{ fontSize: 52 }}>{rTheme.emoji || '🎨'}</Text>
              </View>
            )}
            {/* Shimmer sweep */}
            <Animated.View
              pointerEvents="none"
              style={[rwStyles.shimmer, { transform: [{ translateX: shimmerX }] }]}
            />
          </View>

          {/* Stars / icons below viewer */}
          <View style={rwStyles.starsRow}>
            {[...Array(5)].map((_, i) => (
              <Ionicons key={i} name="star" size={14} color={rTheme.color} style={{ marginHorizontal: 2 }} />
            ))}
          </View>
        </View>

        {/* Model name */}
        <Text style={rwStyles.modelName}>{data.name}</Text>

        {/* XP + collection row */}
        <View style={rwStyles.rewardRow}>
          {data.already_collected ? (
            <View style={[rwStyles.rewardPill, rwStyles.rewardPillGreen, { flex: 1, justifyContent: 'center' }]}>
              <Ionicons name="checkmark-done-circle" size={15} color={COLORS.teal} style={{ marginRight: 4 }} />
              <Text style={[rwStyles.rewardPillText, { color: COLORS.teal }]}>
                Already In Collection (No Duplicate XP)
              </Text>
            </View>
          ) : (
            <>
              <View style={[rwStyles.rewardPill, { borderColor: rTheme.color + '66', backgroundColor: rTheme.color + '22' }]}>
                <Ionicons name="flash" size={14} color={rTheme.color} />
                <Text style={[rwStyles.rewardPillText, { color: rTheme.color }]}>+{data.earnedXP || rTheme.xp} XP</Text>
              </View>
              <View style={[rwStyles.rewardPill, rwStyles.rewardPillGreen]}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.teal} />
                <Text style={[rwStyles.rewardPillText, { color: COLORS.teal }]}>Collected!</Text>
              </View>
            </>
          )}
        </View>

        {/* Buttons */}
        <View style={rwStyles.btnRow}>
          <TouchableOpacity style={rwStyles.btnSecondary} onPress={onClose}>
            <Text style={rwStyles.btnSecondaryText}>Hop Next</Text>
          </TouchableOpacity>
          <TouchableOpacity style={rwStyles.btnPrimary} onPress={onViewDetails}>
            <Ionicons name="book-outline" size={15} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={rwStyles.btnPrimaryText}>View Lore</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </View>
  );
}

const rwStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  orbGold:   { backgroundColor: COLORS.gold },
  orbPurple: { backgroundColor: '#A855F7' },

  card: {
    width: SCREEN_W - 48,
    backgroundColor: '#0D0D24',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.5)',
    overflow: 'hidden',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },

  // Header
  cardHeader: {
    backgroundColor: '#13132E',
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: -30,
    width: 180,
    height: 80,
    borderRadius: 90,
    backgroundColor: 'rgba(168,85,247,0.25)',
  },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rarityText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#A855F7',
    letterSpacing: 2,
  },
  rewardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.gold,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(251,191,36,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  slotBanner: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Model viewer
  modelFrame: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 4,
  },
  modelGlow: {
    position: 'absolute',
    top: 12,
    width: SCREEN_W - 100,
    height: 225,
    borderRadius: 20,
    backgroundColor: 'rgba(168,85,247,0.18)',
  },
  modelCard: {
    width: SCREEN_W - 100,
    height: 215,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.45)',
    backgroundColor: '#0A0A1A',
  },
  noModelFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },

  // Name
  modelName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(168,85,247,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  // Reward pills
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 18,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  rewardPillGreen: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  rewardPillText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.gold,
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  btnSecondaryText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  btnPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFF',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  fallbackText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  steadyModelWrap: {
    position: 'absolute',
    top: SCREEN_H * 0.16,
    alignSelf: 'center',
    width: Math.min(SCREEN_W * 0.8, 320),
    height: Math.min(SCREEN_W * 0.8, 320),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  steadyModelWebview: {
    width: Math.min(SCREEN_W * 0.8, 320),
    height: Math.min(SCREEN_W * 0.8, 320),
    backgroundColor: 'transparent',
  },
  steadyModelGlow: {
    position: 'absolute',
    width: Math.min(SCREEN_W * 0.8, 320) * 0.65,
    height: Math.min(SCREEN_W * 0.8, 320) * 0.65,
    borderRadius: (Math.min(SCREEN_W * 0.8, 320) * 0.65) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 28,
    elevation: 12,
    zIndex: -1,
  },
  steadyModelFallback: {
    width: Math.min(SCREEN_W * 0.8, 320) * 0.65,
    height: Math.min(SCREEN_W * 0.8, 320) * 0.65,
    borderRadius: (Math.min(SCREEN_W * 0.8, 320) * 0.65) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  floatingZoomRow: {
    position: 'absolute',
    right: 4,
    top: 10,
    flexDirection: 'column',
    gap: 8,
    zIndex: 25,
  },
  floatingZoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  touchHintBadge: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  touchHintText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btnScanNext: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnScanNextText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFF',
  },
  btnDetails: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDetailsText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFF',
  },
  overlayUI: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: COLORS.gold,
    fontFamily: FONTS.bold,
    fontSize: 10,
    marginLeft: 4,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#FFF',
    marginBottom: 8,
  },
  desc: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 12,
  },
  testBanner: {
    position: 'absolute',
    top: 92,
    left: 12,
    right: 12,
    zIndex: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  testNeutral: { backgroundColor: 'rgba(0,0,0,0.6)' },
  testOk: { backgroundColor: 'rgba(16,150,120,0.85)' },
  testErr: { backgroundColor: 'rgba(200,60,60,0.9)' },
  testBannerText: { color: '#fff', fontFamily: FONTS.regular, fontSize: 12 },
  modelStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modelStatusText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  btn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: FONTS.bold,
    color: '#FFF',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.lg,
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: 180,
  },
  stepDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  stepDotActive: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  stepDotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  stepLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  stepIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
    marginTop: 4,
  },
  modalBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  modalBtnSecondaryText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  modalTextContainer: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: RADIUS.sm,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    width: '100%',
  },
  noteText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFF',
  },
  hintHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  hintHeaderBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.gold,
  },
  hintBanner: {
    position: 'absolute',
    top: 98,
    left: 14,
    right: 14,
    zIndex: 50,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  hintBannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hintBannerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintBannerSlot: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  hintBannerText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#FFF',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  hintBannerClose: {
    padding: 4,
  },
  hintModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  hintModalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    maxHeight: '80%',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  hintModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14,
  },
  hintModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: '#FFF',
  },
  hintModalSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  hintModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintModalScroll: {
    marginTop: 4,
  },
  noHintsText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  hintItemCard: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  hintItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hintSlotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  hintSlotText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  hintRarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  hintRarityText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  hintTargetName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFF',
    marginBottom: 8,
  },
  hintQuoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 10,
  },
  hintQuoteText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  detectedRarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  detectedRarityText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
