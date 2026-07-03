import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { 
  ViroARSceneNavigator, 
  ViroARScene, 
  ViroARImageMarker, 
  ViroARTrackingTargets, 
  ViroBox, 
  ViroText, 
  ViroNode, 
  ViroAnimations,
  ViroAmbientLight,
  ViroSpotLight
} from '@reactvision/react-viro';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

// =========================================================================
// 1. REGISTER YOUR MUSEUM PAINTINGS (IMAGE TARGETS) HERE
// =========================================================================
ViroARTrackingTargets.createTargets({
  "painting_yakan": {
    // You can use a local file, or a URI from your web admin!
    source: { uri: "https://lakbay.app/placeholder-yakan.jpg" }, 
    orientation: "Up",
    physicalWidth: 0.5, // The real-world width of the painting in meters (50cm)
  },
  "painting_vinta": {
    source: { uri: "https://lakbay.app/placeholder-vinta.jpg" },
    orientation: "Up",
    physicalWidth: 0.5,
  }
});

// =========================================================================
// 2. DEFINE THE 3D AR SCENE (WHAT HAPPENS WHEN PAINTING IS DETECTED)
// =========================================================================
const MuseumARScene = (props) => {
  return (
    <ViroARScene>
      {/* Lighting for the 3D models */}
      <ViroAmbientLight color="#FFFFFF" intensity={100} />
      <ViroSpotLight innerAngle={5} outerAngle={90} direction={[0, -1, -.2]} position={[0, 3, 1]} color="#ffffff" castsShadow={true} />

      {/* TRACKER: Yakan Painting */}
      <ViroARImageMarker 
        target={"painting_yakan"} 
        onAnchorFound={() => props.sceneNavigator.viroAppProps.onTargetFound('Yakan Weaving Artwork')}
        onAnchorRemoved={() => props.sceneNavigator.viroAppProps.onTargetLost()}
      >
        <ViroNode position={[0, 0, 0]}>
           {/* Replace this ViroText/ViroBox with an actual 3D model (Viro3DObject) later! */}
           <ViroText text="Yakan Weaving Detected!" scale={[0.1, 0.1, 0.1]} position={[0, 0.15, 0]} style={{color: '#FFFFFF'}} />
           <ViroBox scale={[0.1, 0.1, 0.1]} materials={["grid"]} animation={{name: "rotate", run: true, loop: true}} />
        </ViroNode>
      </ViroARImageMarker>

      {/* TRACKER: Vinta Painting */}
      <ViroARImageMarker 
        target={"painting_vinta"} 
        onAnchorFound={() => props.sceneNavigator.viroAppProps.onTargetFound('Vinta Sail Painting')}
        onAnchorRemoved={() => props.sceneNavigator.viroAppProps.onTargetLost()}
      >
        <ViroNode position={[0, 0, 0]}>
           <ViroText text="Vinta Painting Detected!" scale={[0.1, 0.1, 0.1]} position={[0, 0.15, 0]} style={{color: '#FFFFFF'}} />
           <ViroBox scale={[0.1, 0.1, 0.1]} materials={["grid"]} animation={{name: "rotate", run: true, loop: true}} />
        </ViroNode>
      </ViroARImageMarker>

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

  // Called natively when ViroARImageMarker sees a painting
  const handleTargetFound = (name) => {
    setDetectedSpot({
      name: name,
      description: "You've uncovered a hidden AR experience inside the museum! Point your camera to see it."
    });
  };

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

      {/* Viro React AR Camera View */}
      <View style={styles.cameraContainer}>
        <ViroARSceneNavigator
          initialScene={{ scene: MuseumARScene }}
          viroAppProps={{
            onTargetFound: handleTargetFound,
            onTargetLost: handleTargetLost
          }}
          style={{ flex: 1 }}
          autofocus={true}
        />
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
            
            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('CatchDetails', { icon: { name: detectedSpot.name }})}>
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
    marginBottom: 16,
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
