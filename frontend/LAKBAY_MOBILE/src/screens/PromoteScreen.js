import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { submitPromotion } from '../api/promotionService';

const { height: SCREEN_H } = Dimensions.get('window');

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your_mapbox_token_here';

const MAP_PICKER_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
  <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>
  <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css" type="text/css">
  <style>
    body { margin: 0; padding: 0; width: 100%; height: 100%; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    /* Center crosshair */
    .crosshair {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 40px; height: 40px;
      pointer-events: none;
      z-index: 10;
    }
    .crosshair::before, .crosshair::after {
      content: ''; position: absolute; background: #EF4444;
    }
    .crosshair::before { top: 19px; left: 0; width: 40px; height: 2px; }
    .crosshair::after { top: 0; left: 19px; width: 2px; height: 40px; }

    /* Make Geocoder search bar wider */
    .mapboxgl-ctrl-geocoder {
      width: calc(100vw - 32px) !important;
      max-width: calc(100vw - 32px) !important;
      min-width: 250px !important;
      margin: 16px !important;
    }
    .mapboxgl-ctrl-top-left {
      width: 100%;
    }
  </style>
</head>
<body>
<div id="map"></div>
<div class="crosshair"></div>
<script>
  mapboxgl.accessToken = '${MAPBOX_TOKEN}';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [122.0790, 6.9214], // Default Zamboanga
    zoom: 12
  });
  
  var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: false
  });
  map.addControl(geocoder, 'top-left');
  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

  // Send center coordinates whenever map moves
  function sendCenter() {
    var center = map.getCenter();
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'LOCATION_UPDATED',
      lat: center.lat,
      lng: center.lng
    }));
  }
  
  map.on('move', sendCenter);
  map.on('moveend', sendCenter);
  
  // Send initial
  map.on('load', sendCenter);
</script>
</body>
</html>
`;


export default function PromoteScreen({ route, navigation }) {
  const passedSpotName = route?.params?.spotName || '';

  const [spotName, setSpotName] = useState(passedSpotName);
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [glbUri, setGlbUri] = useState(null);
  const [glbName, setGlbName] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Location State
  const [location, setLocation] = useState(null); // { lat, lng }
  const [tempLocation, setTempLocation] = useState(null); // tracking while map moves
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const isEditable = !passedSpotName;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const pickGlb = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.name.endsWith('.glb') || asset.name.endsWith('.gltf')) {
        setGlbUri(asset.uri);
        setGlbName(asset.name);
      } else {
        Alert.alert('Invalid file', 'Please select a .glb or .gltf 3D model.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!spotName.trim()) return Alert.alert('Missing Info', 'Please provide a spot name.');
    if (!description.trim()) return Alert.alert('Missing Info', 'Please provide a description.');
    if (!location) return Alert.alert('Missing Info', 'Please pin a location on the map.');
    
    setSubmitting(true);
    try {
      await submitPromotion(spotName.trim(), description.trim(), imageUri, glbUri, location.lat, location.lng);
      Alert.alert('Success', 'Your promotion has been submitted for review!', [
        { 
          text: 'OK', 
          onPress: () => {
            if (isEditable) {
              setSpotName('');
              setDescription('');
              setImageUri(null);
              setGlbUri(null);
              setGlbName(null);
              setLocation(null);
            } else {
              navigation.goBack();
            }
          }
        }
      ]);
    } catch (e) {
      console.log('Submit error', e);
      Alert.alert('Error', 'Failed to submit promotion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMapMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'LOCATION_UPDATED') {
        setTempLocation({ lat: msg.lat, lng: msg.lng });
      }
    } catch (e) {}
  };

  const confirmLocation = () => {
    if (tempLocation) {
      setLocation(tempLocation);
    }
    setMapModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {navigation.canGoBack() && !isEditable ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <Text style={styles.headerTitle}>Promote a Spot</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Location / Business Name</Text>
        <TextInput 
          style={isEditable ? styles.inputEditable : styles.inputDisabled} 
          value={spotName} 
          onChangeText={setSpotName}
          editable={isEditable} 
          placeholder={isEditable ? "Enter the name of your spot" : ""}
          placeholderTextColor={COLORS.textMuted}
        />
        
        <Text style={styles.label}>Pin Location on Map</Text>
        <TouchableOpacity 
          style={styles.locationBtn} 
          onPress={() => setMapModalVisible(true)}
        >
          <View style={styles.locationBtnContent}>
            <Ionicons name="location-sharp" size={24} color={location ? COLORS.accent : COLORS.textSub} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.locationBtnText}>
                {location ? "Location Pinned" : "Tap to Pin Location"}
              </Text>
              {location && (
                <Text style={styles.locationSubText}>
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Why should people visit?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Share your experience or promotion details..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Attach Photo (Optional)</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color={COLORS.textSub} />
              <Text style={styles.uploadText}>Tap to select an image</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Attach 3D Model (.glb) (Optional)</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={pickGlb}>
          {glbName ? (
            <>
              <Ionicons name="cube" size={32} color={COLORS.teal} />
              <Text style={[styles.uploadText, { color: COLORS.teal, marginTop: 8 }]}>{glbName}</Text>
            </>
          ) : (
            <>
              <Ionicons name="cube-outline" size={32} color={COLORS.textSub} />
              <Text style={styles.uploadText}>Tap to select a .glb file</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit for Review'}</Text>
        </TouchableOpacity>
        <Text style={styles.infoText}>Once approved by an admin, you can pay coins to publish it.</Text>
      </ScrollView>

      {/* Map Picker Modal */}
      <Modal visible={mapModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgCard }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalBackBtn} onPress={() => setMapModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Drag Map to Pin</Text>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmLocation}>
              <Text style={styles.modalConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <WebView
              source={{ html: MAP_PICKER_HTML, baseUrl: 'https://localhost' }}
              style={{ flex: 1 }}
              onMessage={handleMapMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
            />
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  content: { padding: 20 },
  label: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text, marginBottom: 8, marginTop: 16 },
  inputDisabled: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, color: COLORS.textSub, fontFamily: FONTS.regular,
  },
  inputEditable: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.accent,
    borderRadius: RADIUS.md, padding: 12, color: COLORS.text, fontFamily: FONTS.regular,
  },
  locationBtn: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12,
  },
  locationBtnContent: {
    flexDirection: 'row', alignItems: 'center',
  },
  locationBtnText: {
    fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text,
  },
  locationSubText: {
    fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSub, marginTop: 2,
  },
  textArea: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, color: COLORS.text, fontFamily: FONTS.regular,
    height: 100, textAlignVertical: 'top',
  },
  uploadBox: {
    height: 120, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderStyle: 'dashed', borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  uploadText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSub, marginTop: 8 },
  previewImg: { width: '100%', height: '100%' },
  submitBtn: {
    backgroundColor: COLORS.accent, padding: 16, borderRadius: RADIUS.md,
    alignItems: 'center', marginTop: 30,
  },
  submitText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  infoText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSub, textAlign: 'center', marginTop: 12 },
  
  // Modal styles
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  modalBackBtn: { padding: 4 },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  modalConfirmBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  modalConfirmText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
});
