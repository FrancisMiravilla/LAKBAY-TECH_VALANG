import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, StatusBar, InteractionManager } from 'react-native';
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
// 1. DYNAMIC AR TARGETS LOGIC
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

      {/* DIAGNOSTIC: known-good test model, fixed ~0.6m in front of the start
          pose. Renders independently of any marker so we can tell whether Viro
          can load a GLB at all in this build. */}
      {props.sceneNavigator.viroAppProps.testModelUri ? (
        <Viro3DObject
          source={{ uri: props.sceneNavigator.viroAppProps.testModelUri }}
          type="GLB"
          scale={[0.15, 0.15, 0.15]}
          position={[0, 0, -0.6]}
          animation={{ name: 'rotate', run: true, loop: true }}
          onLoadEnd={() => props.sceneNavigator.viroAppProps.onTestLoadEnd?.()}
          onError={(event) => props.sceneNavigator.viroAppProps.onTestError?.(JSON.stringify(event?.nativeEvent))}
        />
      ) : null}

      {/* DYNAMIC TRACKERS */}
      {(props.sceneNavigator.viroAppProps.arTargets || []).map(target => (
        <ViroARImageMarker
          key={target.id}
          target={`target_${target.id}`}
          onAnchorFound={() => props.sceneNavigator.viroAppProps.onTargetFound(target)}
          onAnchorRemoved={() => props.sceneNavigator.viroAppProps.onTargetLost()}
        >
          {/* Show the admin-uploaded 3D model over the art when one exists.
              Otherwise render nothing here — the 2D info card is the feedback. */}
          {target.model_3d ? (
            <ViroNode position={[0, 0, 0]}>
              <ViroText text={target.name} scale={[0.1, 0.1, 0.1]} position={[0, 0.18, 0]} style={{ color: '#FFFFFF' }} />
              <Viro3DObject
                source={{ uri: target.local_model || resolveModelUrl(target.model_3d) }}
                type="GLB"
                scale={[0.1, 0.1, 0.1]}
                position={[0, 0, 0.05]}
                animation={{ name: 'rotate', run: true, loop: true }}
                onLoadStart={() => console.log('[AR] model load START:', target.name, target.local_model || resolveModelUrl(target.model_3d))}
                onLoadEnd={() => { console.log('[AR] model load END (success):', target.name); props.sceneNavigator.viroAppProps.onModelLoadEnd?.(); }}
                onError={(event) => { const msg = JSON.stringify(event?.nativeEvent); console.log('[AR] model load ERROR:', target.name, msg); props.sceneNavigator.viroAppProps.onModelError?.(msg); }}
              />
            </ViroNode>
          ) : null}
        </ViroARImageMarker>
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
    duration: 500, // 500ms
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
  // DIAGNOSTIC: a known-good tiny GLB (Khronos Box, no textures/extensions).
  // If this loads but the real art model doesn't, the art model is the problem;
  // if even this fails, Viro's GLB loader isn't working in this build.
  const [testModel, setTestModel] = useState({ uri: null, state: 'idle', message: '' });
  const [arTargets, setArTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  // 'checking' | 'ready' | 'unsupported' | 'permission-denied'
  const [arStatus, setArStatus] = useState('checking');
  // Defer mounting the AR GL surface until the screen transition + layout
  // have settled. Mounting ViroARSceneNavigator too early races the native
  // GL surface setup and shows a black camera on some devices (e.g. Samsung).
  const [sceneMountReady, setSceneMountReady] = useState(false);

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

  // Download a known-good test GLB once so Viro loads it from a local file.
  React.useEffect(() => {
    (async () => {
      try {
        const asset = Asset.fromURI('https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Box/glTF-Binary/Box.glb');
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        console.log('[AR-TEST] test model cached:', uri);
        setTestModel({ uri, state: 'loading', message: '' });
      } catch (e) {
        console.log('[AR-TEST] test model download FAILED:', String(e));
        setTestModel({ uri: null, state: 'error', message: 'download failed: ' + String(e) });
      }
    })();
  }, []);

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
  const handleTargetFound = (target) => {
    setDetectedSpot({
      name: target.name,
      description: target.description || "You've uncovered a hidden AR experience inside the museum! Point your camera to see it."
    });
    setModelStatus({ state: target.model_3d ? 'loading' : 'none', message: '' });
  };

  const handleModelLoadEnd = () => setModelStatus({ state: 'loaded', message: '' });
  const handleModelError = (message) => setModelStatus({ state: 'error', message: String(message || 'unknown error') });

  const handleTestLoadEnd = () => { console.log('[AR-TEST] test model LOADED ✓'); setTestModel(prev => ({ ...prev, state: 'loaded' })); };
  const handleTestError = (message) => { console.log('[AR-TEST] test model ERROR:', message); setTestModel(prev => ({ ...prev, state: 'error', message: String(message || 'error') })); };


  // Called when the painting leaves the camera view
  const handleTargetLost = () => {
    // Optionally clear it, but leaving it helps the user tap the "View Details" button
    // setDetectedSpot(null); 
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR Scanner</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* DIAGNOSTIC banner: can Viro load a known-good GLB at all? */}
      <View style={[styles.testBanner, testModel.state === 'loaded' ? styles.testOk : testModel.state === 'error' ? styles.testErr : styles.testNeutral]}>
        <Text style={styles.testBannerText} numberOfLines={2}>
          {testModel.state === 'loaded' ? 'Test model: LOADED ✓ (Viro GLB works — a rotating box should be visible)'
            : testModel.state === 'error' ? `Test model: FAILED — ${testModel.message}`
            : testModel.state === 'loading' ? 'Test model: loading…'
            : 'Test model: preparing…'}
        </Text>
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
              testModelUri: testModel.uri,
              onTestLoadEnd: handleTestLoadEnd,
              onTestError: handleTestError
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

            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('CatchDetails', { icon: { name: detectedSpot.name, about: detectedSpot.description }})}>
              <Text style={styles.btnText}>View Full Details</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  }
});
