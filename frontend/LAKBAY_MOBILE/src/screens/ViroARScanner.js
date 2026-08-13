import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, StatusBar, InteractionManager, Alert, Modal, Animated, Easing, Image, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SCREEN_W } = Dimensions.get('window');

// Build model-viewer HTML for reward modal
const buildRewardViewerHTML = (modelUrl) => {
  if (!modelUrl) return null;
  const safe = String(modelUrl).replace(/["'<>&]/g, c => ({ '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100%;height:100%;background:transparent;overflow:hidden;}model-viewer{width:100%;height:100%;--progress-bar-color:transparent;}</style></head><body><model-viewer src="${safe}" auto-rotate camera-controls bounds="tight" exposure="1.3" shadow-intensity="0" style="width:100%;height:100%"></model-viewer></body></html>`;
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
import { getARTargets, ORIGIN } from '../api/qrService';

// Resolve a model path into an absolute https URL Viro can load.
const resolveModelUrl = (m) => {
  if (!m) return null;
  if (m.startsWith('data:')) return m;
  if (m.startsWith('http')) return m.replace('http://', 'https://');
  return `${ORIGIN}${m}`;
};

// =========================================================================
// 1. MANUAL SCALED MODEL (PINCH TO ZOOM & DRAG)
// =========================================================================
const ManualScaledModel = ({ source, onLoadStart, onLoadEnd, onError }) => {
  const [scale, setScale] = useState(0.05); // Start small
  const [position, setPosition] = useState([0, 0, -2]); // Start 2 meters away from camera
  const [meshOffset, setMeshOffset] = useState([0, 0, 0]);

  // Reset scale and position when scanning a new artwork
  React.useEffect(() => {
    setScale(0.05);
    setPosition([0, 0, -2]);
    setMeshOffset([0, 0, 0]);
  }, [source?.uri]);

  const handlePinch = (pinchState, scaleFactor, source) => {
    if (pinchState === 3) { // 3 means the pinch gesture ended
      setScale(scale * scaleFactor);
    }
  };

  const handleDrag = (dragToPos, source) => {
    // Allows the user to literally drag the model with their finger into the perfect spot
    setPosition([dragToPos[0], dragToPos[1], dragToPos[2]]);
  };

  const handleBoundingBoxUpdate = (evt) => {
    // Only calculate once when the box is first valid
    if (meshOffset[0] !== 0 || meshOffset[1] !== 0 || meshOffset[2] !== 0) return;
    
    const boundingBox = evt.boundingBox;
    if (!boundingBox) return;
    
    const [min, max] = boundingBox;
    const centerX = (max[0] + min[0]) / 2;
    const centerY = (max[1] + min[1]) / 2;
    const centerZ = (max[2] + min[2]) / 2;
    
    // Set the offset to explicitly pull the mesh origin back to its true visual center
    setMeshOffset([-centerX, -centerY, -centerZ]);
  };

  return (
    <ViroNode 
      position={position} 
      scale={[scale, scale, scale]} 
      onPinch={handlePinch}
      onDrag={handleDrag}
    >
      {/* This inner node spins in place. Because its child is centered inside it, the spin is a perfect rotation on its axis. */}
      <ViroNode animation={{ name: 'rotate', run: true, loop: true }}>
        <Viro3DObject
          source={source}
          type="GLB"
          position={meshOffset}
          onLoadStart={onLoadStart}
          onLoadEnd={onLoadEnd}
          onError={onError}
          onBoundingBoxUpdate={handleBoundingBoxUpdate}
        />
      </ViroNode>
    </ViroNode>
  );
};

// =========================================================================
// 2. DYNAMIC AR TARGETS LOGIC
// =========================================================================
// Targets will be registered dynamically via API call in the main component.

// =========================================================================
// 2. DEFINE THE 3D AR SCENE (WHAT HAPPENS WHEN PAINTING IS DETECTED)
// =========================================================================
const MuseumARScene = (props) => {
  return (
    <ViroARScene>
      {/* Lighting for the 3D models. Viro light intensity is in lumens
          (default ~1000); PBR models render nearly black if under-lit, so keep
          these bright and add a front directional fill so the model is visible
          regardless of which way the painting faces. */}
      <ViroAmbientLight color="#FFFFFF" intensity={1000} />
      <ViroDirectionalLight color="#FFFFFF" direction={[0, 0, -1]} intensity={1200} />
      <ViroSpotLight innerAngle={5} outerAngle={90} direction={[0, -1, -.2]} position={[0, 3, 1]} color="#ffffff" intensity={1000} castsShadow={true} />

      {/* DYNAMIC TRACKERS */}
      {(props.sceneNavigator.viroAppProps.arTargets || []).map(target => (
        <ViroARImageMarker
          key={target.id}
          target={`target_${target.id}`}
          onAnchorFound={() => props.sceneNavigator.viroAppProps.onTargetFound(target)}
          onAnchorRemoved={() => props.sceneNavigator.viroAppProps.onTargetLost()}
        />
      ))}

      {/* Show the detected model fixed to the center of the camera screen like a HUD */}
      {props.sceneNavigator.viroAppProps.detectedSpot?.local_model ? (
        <ViroARCamera>
          <ManualScaledModel
            source={{ uri: props.sceneNavigator.viroAppProps.detectedSpot.local_model }}
            onLoadStart={() => console.log('[AR] model load START:', props.sceneNavigator.viroAppProps.detectedSpot.name)}
            onLoadEnd={() => { console.log('[AR] model load END (success):', props.sceneNavigator.viroAppProps.detectedSpot.name); props.sceneNavigator.viroAppProps.onModelLoadEnd?.(props.sceneNavigator.viroAppProps.detectedSpot.id); }}
            onError={(event) => { const msg = JSON.stringify(event?.nativeEvent); console.log('[AR] model load ERROR:', props.sceneNavigator.viroAppProps.detectedSpot.name, msg); props.sceneNavigator.viroAppProps.onModelError?.(msg); }}
          />
        </ViroARCamera>
      ) : null}

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
      body: 'Start by going to the first museum building (S1). Each building holds a unique set of hidden mythical models waiting to be discovered.',
      note: null,
    },
    {
      icon: 'eye',
      iconColor: COLORS.gold,
      iconBg: 'rgba(251,191,36,0.15)',
      stepLabel: 'STEP 2 OF 3',
      title: 'Find the 10 Mythical Models',
      body: 'Inside the building, use your AR camera to scan artworks and exhibits. There are 10 mythical models hidden throughout — each one guarded by a unique marker.',
      note: 'If you scan an artwork and nothing happens, it is not part of the mythical models.',
    },
    {
      icon: 'trophy',
      iconColor: COLORS.teal,
      iconBg: 'rgba(16,185,129,0.15)',
      stepLabel: 'STEP 3 OF 3',
      title: 'Collect & Track Progress',
      body: 'Every mythical model you find is automatically collected and saved. Head to the Progress tab anytime to see how many you have found across all buildings!',
      note: null,
    },
  ];
  const [rewardModalData, setRewardModalData] = useState(null);
  const glowAnim = React.useRef(new Animated.Value(0)).current;

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

        // Viro's Android loader fails on remote model URLs ("Failed to load
        // model"), so pre-download each .glb to local cache and hand Viro a
        // file:// path. Falls back to the remote URL if the download fails.
        await Promise.all(usable.map(async (t) => {
          if (!t.model_3d) return;
          try {
            const asset = Asset.fromURI(resolveModelUrl(t.model_3d));
            await asset.downloadAsync();
            t.local_model = asset.localUri || asset.uri;
            console.log('[AR] model cached locally:', t.name, t.local_model);
          } catch (e) {
            console.log('[AR] model download FAILED:', t.name, String(e));
          }
        }));

        console.log('[AR] targets loaded:', usable.map(t => ({ name: t.name, hasModel: !!t.model_3d, local: t.local_model || null })));
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
    if (!target.model_3d) {
      Alert.alert("Notice", "This item is not included in the 10 mythical models.");
      return;
    }

    setRewardModalData({ name: target.name, emoji: '🐉', model_3d: target.model_3d ? resolveModelUrl(target.model_3d) : null });

    // Save to SecureStore for the Badges tab
    try {
      const SecureStore = require('expo-secure-store');
      const existing = await SecureStore.getItemAsync('collected_models');
      let models = existing ? JSON.parse(existing) : [];
      if (!models.find(m => m.id === target.id)) {
        models.push({ id: target.id, name: target.name, emoji: '🐉', color: COLORS.accent, model_3d: target.model_3d ? resolveModelUrl(target.model_3d) : null });
        await SecureStore.setItemAsync('collected_models', JSON.stringify(models));
      }
    } catch (e) {
      console.error("Error saving collected model", e);
    }

    setDetectedSpot({
      id: target.id,
      name: target.name,
      description: target.description || "You've uncovered a hidden AR experience inside the museum! Point your camera to see it.",
      model_3d: target.model_3d ? resolveModelUrl(target.model_3d) : null,
      local_model: target.local_model || (target.model_3d ? resolveModelUrl(target.model_3d) : null)
    });
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
                icon: { name: detectedSpot.name, about: detectedSpot.description, model_3d: detectedSpot.model_3d },
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
        <View style={{ width: 24 }} />
      </View>

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
              detectedSpot: detectedSpot
            }}
            style={{ flex: 1 }}
            autofocus={true}
          />
        )}
      </View>

      {/* React Native UI Overlay (Pops up when painting is detected) */}
      {detectedSpot && (
        <View style={styles.overlayUI}>
          <View style={styles.infoCard}>
            <View style={styles.badge}>
              <Ionicons name="sparkles" size={14} color={COLORS.gold} />
              <Text style={styles.badgeText}>Artwork Detected</Text>
            </View>
            <Text style={styles.title}>{detectedSpot.name}</Text>
            <Text style={styles.desc}>{detectedSpot.description}</Text>

            {/* 3D model load status (diagnostic) */}
            <View style={styles.modelStatusRow}>
              <Ionicons
                name={modelStatus.state === 'loaded' ? 'cube' : modelStatus.state === 'loading' ? 'hourglass-outline' : modelStatus.state === 'error' ? 'alert-circle' : 'ellipse-outline'}
                size={13}
                color={modelStatus.state === 'loaded' ? COLORS.teal : modelStatus.state === 'error' ? COLORS.danger : COLORS.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.modelStatusText}>
                {modelStatus.state === 'loading' ? '3D model: loading…'
                  : modelStatus.state === 'loaded' ? '3D model: loaded ✓'
                  : modelStatus.state === 'error' ? `3D model failed: ${modelStatus.message}`
                  : 'No 3D model for this art'}
              </Text>
            </View>

            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('CatchDetails', { icon: { name: detectedSpot.name, about: detectedSpot.description, model_3d: detectedSpot.model_3d }})}>
              <Text style={styles.btnText}>View Full Details</Text>
            </TouchableOpacity>
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
            i % 2 === 0 ? rwStyles.orbGold : rwStyles.orbPurple,
          ]}
        />
      ))}

      <Animated.View style={[rwStyles.card, { opacity: opacAnim, transform: [{ scale: scaleAnim }] }]}>

        {/* Header banner */}
        <View style={rwStyles.cardHeader}>
          <View style={rwStyles.headerGlow} />
          <View style={rwStyles.rarityRow}>
            <Ionicons name="diamond" size={12} color="#A855F7" />
            <Text style={rwStyles.rarityText}>MYTHICAL FOUND</Text>
            <Ionicons name="diamond" size={12} color="#A855F7" />
          </View>
          <Animated.Text style={[rwStyles.rewardTitle, { transform: [{ translateY: titleBounce }] }]}>
            ✨ Reward Unlocked!
          </Animated.Text>
        </View>

        {/* 3D model viewer OR fallback icon */}
        <View style={rwStyles.modelFrame}>
          {/* Glow ring */}
          <Animated.View style={[
            rwStyles.modelGlow,
            { opacity: glowAnim.interpolate({ inputRange: [0,1], outputRange: [0.3, 0.8] }),
              transform: [{ scale: glowAnim.interpolate({ inputRange: [0,1], outputRange: [1, 1.15] }) }] }
          ]} />

          <View style={rwStyles.modelCard}>
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
                <Text style={{ fontSize: 52 }}>🐉</Text>
              </View>
            )}
            {/* Shimmer sweep */}
            <Animated.View
              pointerEvents="none"
              style={[rwStyles.shimmer, { transform: [{ translateX: shimmerX }] }]}
            />
          </View>

          {/* Stars below viewer */}
          <View style={rwStyles.starsRow}>
            {[...Array(5)].map((_, i) => (
              <Ionicons key={i} name="star" size={14} color="#A855F7" style={{ marginHorizontal: 2 }} />
            ))}
          </View>
        </View>

        {/* Model name */}
        <Text style={rwStyles.modelName}>{data.name}</Text>

        {/* XP + collection row */}
        <View style={rwStyles.rewardRow}>
          <View style={rwStyles.rewardPill}>
            <Ionicons name="flash" size={14} color={COLORS.gold} />
            <Text style={rwStyles.rewardPillText}>+150 XP</Text>
          </View>
          <View style={[rwStyles.rewardPill, rwStyles.rewardPillGreen]}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.teal} />
            <Text style={[rwStyles.rewardPillText, { color: COLORS.teal }]}>Collected!</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={rwStyles.btnRow}>
          <TouchableOpacity style={rwStyles.btnSecondary} onPress={onClose}>
            <Text style={rwStyles.btnSecondaryText}>Continue</Text>
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
    height: 200,
    borderRadius: 20,
    backgroundColor: 'rgba(168,85,247,0.18)',
  },
  modelCard: {
    width: SCREEN_W - 100,
    height: 190,
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
  }
});
