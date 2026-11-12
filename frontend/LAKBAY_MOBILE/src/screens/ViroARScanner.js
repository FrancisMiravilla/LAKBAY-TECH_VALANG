import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, StatusBar, InteractionManager, Alert, Modal, Animated, Easing, Dimensions, ScrollView, Image } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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
  ViroQuad,
  ViroMaterials,
  isARSupportedOnDevice,
  requestRequiredPermissions,
} from '@reactvision/react-viro';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, GOLD_TEXT, onWhite } from '../constants/theme';
import VintaCard from '../components/VintaCard';

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { getGlbBounds } from '../utils/glbBounds';
import { getARTargets, ORIGIN, logActivity, syncCollections } from '../api/qrService';
import { authService } from '../api/authService';
import ARGuideCenterPopup from '../components/ARGuideCenterPopup';
import HintCompass from '../components/HintCompass';
import MiniCompass from '../components/MiniCompass';
import { RARITY_XP, rarityXp } from '../constants/rewards';
import UnrecognizedArtNotice from '../components/UnrecognizedArtNotice';
import GuideSpeechModal from '../components/GuideSpeechModal';
import BuildingPickerModal from '../components/BuildingPickerModal';
import { galleryTourSteps } from '../constants/museumGalleries';
import ARArtworkGuide from '../components/ARArtworkGuide';

// Resolve a model path into an absolute https URL Viro can load.
const resolveModelUrl = (m) => {
  if (!m) return null;
  if (m.startsWith('data:')) return m;
  if (m.startsWith('http')) return m.replace('http://', 'https://');
  return `${ORIGIN}${m}`;
};

// ── Fitting the 3D model onto the recognized artwork ──────────────────────────
// Every tracking image is registered as `markerWidth` meters wide. ARCore works
// out the painting's distance from that width, so content sized to
// markerWidth x (image aspect) covers the painting exactly as the camera sees
// it, whatever the painting's real size.
const ARTWORK_FIT = {
  markerWidth: 0.5,
  // Lays the model's X/Y onto the painting (Y = painting's top) with its front
  // (+Z) facing out of the wall toward the viewer.
  planeRotation: [-90, 0, 0],
  // Extra turn for a model that doesn't face +Z. Change one axis at a time,
  // e.g. [0, 180, 0] if it shows its back, [90, 0, 0] if it lies flat.
  modelRotation: [0, 0, 0],
  // Cover plane behind the model, as a multiple of the painting's size.
  coverMargin: 1.08,
  coverColor: '#15171C',
  // Gap (m) between the cover plane and the back of the model.
  lift: 0.002,
};

ViroMaterials.createMaterials({
  artworkCover: { diffuseColor: ARTWORK_FIT.coverColor, lightingModel: 'Constant' },
});

const getImageAspect = (uri) => new Promise((resolve) => {
  Image.getSize(uri, (w, h) => resolve(w > 0 && h > 0 ? h / w : null), () => resolve(null));
});

// Returns how to place the model on the painting, or null to keep the floating viewer.
const computeArtworkFit = async (target, localModel) => {
  if (!target?.image || !localModel || !localModel.startsWith('file://')) return null;
  const [aspect, bounds] = await Promise.all([
    getImageAspect(target.image),
    getGlbBounds(localModel, ARTWORK_FIT.modelRotation),
  ]);
  if (!aspect || !bounds) return null;
  const sizeX = bounds.max[0] - bounds.min[0];
  const sizeY = bounds.max[1] - bounds.min[1];
  if (!(sizeX > 0 && sizeY > 0)) return null;
  const width = ARTWORK_FIT.markerWidth;
  const height = width * aspect;
  const scale = Math.min(width / sizeX, height / sizeY);
  const centerX = (bounds.max[0] + bounds.min[0]) / 2;
  const centerY = (bounds.max[1] + bounds.min[1]) / 2;
  return {
    width,
    height,
    scale,
    position: [-centerX * scale, -centerY * scale, ARTWORK_FIT.lift - bounds.min[2] * scale],
  };
};

export const RARITY_THEME = {
  common: {
    label: 'COMMON',
    title: 'Common Cultural Discovery',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.18)',
    border: '#10B981',
    icon: 'sparkles',
    xp: RARITY_XP.common,
    emoji: 'amphora',
  },
  rare: {
    label: 'RARE',
    title: 'Rare Regional Relic',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.18)',
    border: '#3B82F6',
    icon: 'star',
    xp: RARITY_XP.rare,
    emoji: 'swords',
  },
  mythical: {
    label: 'MYTHICAL',
    title: 'Mythical Spirit Legend',
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.18)',
    border: '#A855F7',
    icon: 'diamond',
    xp: RARITY_XP.mythical,
    emoji: 'gem',
  },
  legendary: {
    label: 'LEGENDARY',
    title: 'Legendary Masterpiece',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.22)',
    border: '#F59E0B',
    icon: 'trophy',
    xp: RARITY_XP.legendary,
    emoji: 'crown',
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
  const app = props.sceneNavigator.viroAppProps;
  const detected = app.detectedSpot;
  return (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" intensity={1000} />
      <ViroDirectionalLight color="#FFFFFF" direction={[0, 0, -1]} intensity={1200} />

      {/* Dynamic Optical Image Markers for Museum Artworks */}
      {(app.arTargets || []).map(target => {
        const fit = detected && detected.id === target.id ? detected.fit : null;
        return (
          <ViroARImageMarker
            key={target.id}
            target={`target_${target.id}`}
            onAnchorFound={() => app.onTargetFound(target)}
            onAnchorRemoved={() => app.onTargetLost()}
          >
            {fit && (
              <ViroNode rotation={ARTWORK_FIT.planeRotation}>
                <ViroQuad
                  width={fit.width * ARTWORK_FIT.coverMargin}
                  height={fit.height * ARTWORK_FIT.coverMargin}
                  materials={['artworkCover']}
                />
                <ViroNode
                  position={fit.position}
                  scale={[fit.scale, fit.scale, fit.scale]}
                  rotation={ARTWORK_FIT.modelRotation}
                >
                  <Viro3DObject
                    source={{ uri: detected.local_model }}
                    type="GLB"
                    onLoadEnd={() => app.onModelLoadEnd(target.id)}
                    onError={(e) => app.onModelError(e?.nativeEvent?.error)}
                  />
                </ViroNode>
              </ViroNode>
            )}
          </ViroARImageMarker>
        );
      })}
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

  // AR intro, spoken by the LAKBAY guide (GuideSpeechModal).
  const guideSteps = [
    {
      title: 'Head to the Building',
      text: 'First, head to the National Museum building: S2, S3 or S4. Each building hides up to 10 artwork models waiting for you.',
    },
    {
      title: 'Scan the Artworks',
      text: 'Inside, point your camera at the paintings and exhibits. Artworks come in four rarities: Common, Rare, Mythical and Legendary. Stuck? Tap the 3D Clue button at the top and I will give you a hint.',
    },
    {
      title: 'Collect the 3D Models',
      text: 'Every artwork you scan is saved to your collection with its rarity and slot number. See them anytime in My Journey. Good luck, explorer!',
    },
  ];
  // After the intro: pick a building, then the guide narrates its galleries.
  const [showBuildingPicker, setShowBuildingPicker] = useState(false);
  const [galleryBuilding, setGalleryBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const galleryInProgress = showInstructionModal || showBuildingPicker || !!galleryBuilding;
  const hintedTargets = () => {
    const withHints = arTargets.filter(t => t.hint && t.hint.trim().length > 0);
    const inBuilding = withHints.filter(t => t.building === selectedBuilding);
    return inBuilding.length > 0 ? inBuilding : withHints;
  };
  const [showGuideCenterPopup, setShowGuideCenterPopup] = useState(false);
  const [activeGuideTarget, setActiveGuideTarget] = useState(null);
  const [showHintModal, setShowHintModal] = useState(false);
  const [compassTarget, setCompassTarget] = useState(null);
  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const lastTargetIdRef = React.useRef(null);
  const handlingTargetRef = React.useRef(null);
  const steadyWebViewRef = React.useRef(null);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -14, duration: 1400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,   duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Clue auto-popup: once the player has finished the intro steps, if no artwork
  // is found within 10 s the guide pops up with a clue (once per visit).
  const autoClueShownRef = React.useRef(false);
  React.useEffect(() => {
    if (galleryInProgress || autoClueShownRef.current) return;
    if (!sceneMountReady || arStatus !== 'ready' || loading || arTargets.length === 0) return;
    if (detectedSpot || showGuideCenterPopup || showHintModal) return;

    const targetsWithHints = hintedTargets();
    if (targetsWithHints.length === 0) return;

    const timer = setTimeout(() => {
      autoClueShownRef.current = true;
      const chosen = targetsWithHints[Math.floor(Math.random() * targetsWithHints.length)];
      setActiveGuideTarget(chosen);
      setShowGuideCenterPopup(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [galleryInProgress, selectedBuilding, sceneMountReady, arStatus, loading, arTargets, detectedSpot, showGuideCenterPopup, showHintModal]);

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

  // Restore this account's AR collection first so re-found artworks give no repeat XP.
  React.useEffect(() => { syncCollections(); }, []);

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
              physicalWidth: ARTWORK_FIT.markerWidth,
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
    // Found the artwork the compass was guiding to: stop guiding.
    setCompassTarget((current) => (current && current.id === target.id ? null : current));
    // Ignore duplicate events while this artwork is already detected on screen
    if (detectedSpot && detectedSpot.id === target.id) return;
    if (handlingTargetRef.current === target.id) return;
    handlingTargetRef.current = target.id;
    try {
      await processFoundTarget(target);
    } finally {
      handlingTargetRef.current = null;
    }
  };

  const processFoundTarget = async (target) => {
    lastTargetIdRef.current = target.id;

    const rarityKey = (target.rarity || 'common').toLowerCase();
    const rarityTheme = RARITY_THEME[rarityKey] || RARITY_THEME.common;
    const earnedXP = rarityXp(rarityKey);

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
          building: target.building || 'S2',
          rarity: target.rarity || 'common',
          slot_number: target.slot_number || 1,
          spot_name: target.spot_name || '',
          hint: target.hint || '',
          emoji: rarityTheme.emoji || 'palette',
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

    const fit = target.model_3d ? await computeArtworkFit(target, localModelPath) : null;
    console.log('[AR] artwork fit:', target.name, fit);

    setDetectedSpot({
      id: target.id,
      name: target.name,
      building: target.building || 'S2',
      rarity: target.rarity || 'common',
      slot_number: target.slot_number || 1,
      spot_name: target.spot_name || '',
      hint: target.hint || '',
      description: target.description || '',
      model_3d: target.model_3d ? resolveModelUrl(target.model_3d) : null,
      local_model: localModelPath || target.local_model || (target.model_3d ? resolveModelUrl(target.model_3d) : null),
      fit,
      earnedXP,
      already_collected: wasAlreadyCollected,
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
      
      <GuideSpeechModal
        visible={showInstructionModal}
        steps={guideSteps}
        finalLabel="Next"
        onClose={() => { setShowInstructionModal(false); setShowBuildingPicker(true); }}
      />

      <BuildingPickerModal
        visible={showBuildingPicker}
        onPick={(id) => { setShowBuildingPicker(false); setSelectedBuilding(id); setGalleryBuilding(id); }}
        onSkip={() => setShowBuildingPicker(false)}
      />

      <GuideSpeechModal
        visible={!!galleryBuilding}
        steps={galleryBuilding ? galleryTourSteps(galleryBuilding) : []}
        finalLabel="Start Scanning"
        onClose={() => setGalleryBuilding(null)}
        onSkip={() => setGalleryBuilding(null)}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR Scanner</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowBuildingPicker(true)}
            style={styles.galleryHeaderBtn}
            accessibilityLabel="Hear the gallery overviews"
          >
            <Ionicons name="library" size={18} color={COLORS.gold} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const targetsWithHints = hintedTargets();
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
        onGuide={(target) => {
          setShowGuideCenterPopup(false);
          setCompassTarget(target);
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
          <VintaCard sheet style={styles.hintModalFrame} contentStyle={styles.hintModalContent}>
            <View style={styles.hintModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.hintModalIcon}>
                  <Ionicons name="bulb" size={22} color={GOLD_TEXT} />
                </View>
                <View>
                  <Text style={styles.hintModalTitle}>Exhibit Location Clues</Text>
                  <Text style={styles.hintModalSub}>Find all 10 artwork models per building (S2, S3, S4)</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowHintModal(false)} style={styles.hintModalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.hintModalScroll} contentContainerStyle={{ paddingBottom: 24 }}>
              {arTargets.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textMuted, textAlign: 'center', fontFamily: FONTS.regular }}>No AR target exhibits registered for this spot yet.</Text>
                </View>
              ) : (
                arTargets.map((t, idx) => {
                  const rTheme = RARITY_THEME[(t.rarity || 'common').toLowerCase()] || RARITY_THEME.common;
                  return (
                    <View key={t.id || idx} style={[styles.hintItemCard, { borderColor: rTheme.color + '44' }]}>
                      <View style={styles.hintItemHeader}>
                        <View style={[styles.hintSlotBadge, { backgroundColor: rTheme.bg, borderColor: rTheme.color }]}>
                          <Text style={[styles.hintSlotText, { color: onWhite(rTheme.color) }]}>Building {t.building || 'S2'} · Slot #{t.slot_number || (idx + 1)}</Text>
                        </View>
                        <View style={[styles.hintRarityPill, { backgroundColor: rTheme.color + '22', borderColor: rTheme.color + '66' }]}>
                          <Text style={[styles.hintRarityText, { color: onWhite(rTheme.color) }]}>{rTheme.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.hintTargetName}>{t.name}</Text>
                      <View style={styles.hintQuoteBox}>
                        <Ionicons name="compass-outline" size={16} color={GOLD_TEXT} style={{ marginRight: 6, marginTop: 1 }} />
                        <Text style={styles.hintQuoteText}>{t.hint || 'Explore the room and point your camera at paintings and sculptures.'}</Text>
                      </View>
                      {!!t.hint && (
                        <TouchableOpacity
                          style={styles.hintGuideBtn}
                          onPress={() => { setShowHintModal(false); setCompassTarget(t); }}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="compass" size={15} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.hintGuideBtnText}>Guide me with compass</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </VintaCard>
        </View>
      </Modal>

      {/* ── Small always-on compass (upper left) so N/E/S/W in clues make sense ── */}
      {arStatus === 'ready' && !compassTarget && <MiniCompass style={styles.miniCompass} />}

      {/* ── Guide notice when the camera rests on something that isn't one of the 10 ── */}
      <UnrecognizedArtNotice
        building={selectedBuilding}
        active={
          arStatus === 'ready' && sceneMountReady && !loading && arTargets.length > 0 &&
          !galleryInProgress && !detectedSpot &&
          !showGuideCenterPopup && !showHintModal
        }
      />

      {/* ── Compass guide toward the side of the building named in the hint ── */}
      {compassTarget && !detectedSpot && (
        <HintCompass target={compassTarget} onClose={() => setCompassTarget(null)} />
      )}

      {/* ── Steady Floating 3D Model (Catch Feature Architecture + Full Multi-Touch & Zoom) ── */}
      {detectedSpot && (!detectedSpot.fit || modelStatus.state === 'error') && (
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

      {/* Guide reads out the recognized artwork over the camera */}
      {detectedSpot && (
        <ARArtworkGuide
          art={detectedSpot}
          rarityTheme={RARITY_THEME[(detectedSpot.rarity || 'common').toLowerCase()] || RARITY_THEME.common}
          onScanAnother={() => setDetectedSpot(null)}
        />
      )}
    </SafeAreaView>
  );
}



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
  hintGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },
  hintGuideBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFF' },
  miniCompass: { position: 'absolute', top: 108, left: 16, zIndex: 9 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  galleryHeaderBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)',
    alignItems: 'center', justifyContent: 'center',
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
  hintModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 24, 0.70)',
    justifyContent: 'flex-end',
  },
  hintModalFrame: {
    maxHeight: '80%',
  },
  hintModalContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    flexShrink: 1,
  },
  hintModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 14,
  },
  hintModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.navy,
  },
  hintModalSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  hintModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintModalScroll: {
    marginTop: 4,
  },
  hintItemCard: {
    backgroundColor: COLORS.bgCardAlt,
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
    color: COLORS.navy,
    marginBottom: 8,
  },
  hintQuoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 10,
  },
  hintQuoteText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSub,
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
