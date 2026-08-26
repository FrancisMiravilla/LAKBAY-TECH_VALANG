import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, ScrollView, Alert, Dimensions, Animated, ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { submitPromotion } from '../api/promotionService';
import VintaStripe from '../components/VintaStripe';

const { width: SCREEN_W } = Dimensions.get('window');

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your_mapbox_token_here';

const getMapPickerHTML = (lng, lat) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
  <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>
  <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css" type="text/css">
  <style>
    body { margin: 0; padding: 0; width: 100%; height: 100%; background: #080F23; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    .crosshair {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 40px; height: 40px;
      pointer-events: none; z-index: 10;
    }
    .crosshair::before, .crosshair::after {
      content: ''; position: absolute; background: #38BDF8;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.8);
    }
    .crosshair::before { top: 19px; left: 0; width: 40px; height: 2px; }
    .crosshair::after  { top: 0; left: 19px; width: 2px; height: 40px; }
    .mapboxgl-ctrl-geocoder {
      width: calc(100vw - 32px) !important;
      max-width: calc(100vw - 32px) !important;
      min-width: 250px !important;
      margin: 16px !important;
      background: rgba(8, 20, 60, 0.92) !important;
      border: 1px solid rgba(99, 179, 237, 0.3) !important;
      color: #fff !important;
    }
    .mapboxgl-ctrl-geocoder input { color: #fff !important; }
    .mapboxgl-ctrl-top-left { width: 100%; }
  </style>
</head>
<body>
<div id="map"></div>
<div class="crosshair"></div>
<script>
  mapboxgl.accessToken = '${MAPBOX_TOKEN}';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [${lng}, ${lat}],
    zoom: 12
  });
  function nominatimGeocoder(query) {
    return fetch('https://nominatim.openstreetmap.org/search?format=geojson&email=contact@lakbay.ph&q=' + encodeURIComponent(query))
      .then(r => r.json())
      .then(data => data.features.map(f => {
        f.place_name = f.properties.display_name;
        f.text = f.properties.name || f.properties.display_name.split(',')[0];
        f.center = f.geometry.coordinates;
        return f;
      }))
      .catch(e => { console.error(e); return []; });
  }
  var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl,
    marker: false, externalGeocoder: nominatimGeocoder
  });
  map.addControl(geocoder, 'top-left');
  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
  function sendLocation(lng, lat) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'LOCATION_UPDATED', lat: lat, lng: lng })
    );
  }
  map.on('move',    () => { var c = map.getCenter(); sendLocation(c.lng, c.lat); });
  map.on('moveend', () => { var c = map.getCenter(); sendLocation(c.lng, c.lat); });
  map.on('click',   e  => map.panTo(e.lngLat));
  geocoder.on('result', e => { var c = e.result.center; sendLocation(c[0], c[1]); });
  map.on('load', () => sendLocation(${lng}, ${lat}));
</script>
</body>
</html>
`;

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Details'  },
  { num: 2, label: 'Location' },
  { num: 3, label: 'Media'    },
];

function StepIndicator({ current }) {
  return (
    <View style={stepStyles.row}>
      {STEPS.map((s, i) => {
        const done    = s.num < current;
        const active  = s.num === current;
        return (
          <React.Fragment key={s.num}>
            <View style={stepStyles.item}>
              <View style={[
                stepStyles.circle,
                done   && stepStyles.circleDone,
                active && stepStyles.circleActive,
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={14} color="#fff" />
                  : <Text style={[stepStyles.num, active && stepStyles.numActive]}>{s.num}</Text>
                }
              </View>
              <Text style={[stepStyles.label, active && stepStyles.labelActive]}>{s.label}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[stepStyles.line, done && stepStyles.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  item:         { alignItems: 'center', gap: 5 },
  circle:       { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(99, 179, 237, 0.3)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(8, 20, 60, 0.60)' },
  circleActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(26, 86, 219, 0.35)', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  circleDone:   { borderColor: COLORS.teal, backgroundColor: COLORS.teal },
  num:          { fontFamily: FONTS.bold, fontSize: 13, color: 'rgba(191,215,255,0.7)' },
  numActive:    { color: '#FFFFFF' },
  line:         { flex: 1, height: 2, backgroundColor: 'rgba(99, 179, 237, 0.20)', marginHorizontal: 8, marginBottom: 18 },
  lineDone:     { backgroundColor: COLORS.teal },
  label:        { fontFamily: FONTS.medium, fontSize: 10, color: 'rgba(191,215,255,0.60)', letterSpacing: 0.5 },
  labelActive:  { color: '#FFFFFF', fontFamily: FONTS.bold },
});

// ─── Field label ─────────────────────────────────────────────────────────────
function FieldLabel({ icon, text, optional }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 16, gap: 8 }}>
      <View style={fStyles.iconWrap}>
        <Ionicons name={icon} size={13} color={COLORS.teal} />
      </View>
      <Text style={fStyles.text}>{text}</Text>
      {optional && <View style={fStyles.pill}><Text style={fStyles.pillText}>Optional</Text></View>}
    </View>
  );
}

const fStyles = StyleSheet.create({
  iconWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  text:     { fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFFFFF', flex: 1 },
  pill:     { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontFamily: FONTS.medium, fontSize: 9, color: 'rgba(191,215,255,0.70)' },
});

// ─── Upload Box ───────────────────────────────────────────────────────────────
function UploadBox({ onPress, icon, filledIcon, label, filledLabel, filled, filledColor, children }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1.0,  useNativeDriver: true }).start();

  return (
    <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.9}>
      <Animated.View style={[
        uploadStyles.box,
        filled && { borderColor: (filledColor || COLORS.teal) + '88', borderStyle: 'solid', backgroundColor: (filledColor || COLORS.teal) + '15' },
        { transform: [{ scale: scaleAnim }] },
      ]}>
        {children || (
          <>
            <View style={[uploadStyles.iconRing, filled && { borderColor: (filledColor || COLORS.teal) + '88', backgroundColor: (filledColor || COLORS.teal) + '22' }]}>
              <Ionicons name={filled ? filledIcon : icon} size={24} color={filled ? (filledColor || COLORS.teal) : 'rgba(191,215,255,0.6)'} />
            </View>
            <Text style={[uploadStyles.label, filled && { color: filledColor || COLORS.teal }]}>
              {filled ? filledLabel : label}
            </Text>
            {!filled && <Text style={uploadStyles.hint}>Tap to browse files</Text>}
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const uploadStyles = StyleSheet.create({
  box: {
    height: 120, backgroundColor: 'rgba(8, 20, 60, 0.50)',
    borderWidth: 1.5, borderColor: 'rgba(99, 179, 237, 0.3)', borderStyle: 'dashed',
    borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', gap: 6,
  },
  iconRing: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFFFFF' },
  hint:  { fontFamily: FONTS.regular,  fontSize: 11, color: 'rgba(191,215,255,0.55)' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PromoteScreen({ route, navigation }) {
  const passedSpotName = route?.params?.spotName || '';

  const [spotName,    setSpotName]    = useState(passedSpotName);
  const [description, setDescription] = useState('');
  const [imageUri,    setImageUri]    = useState(null);
  const [glbUri,      setGlbUri]      = useState(null);
  const [glbName,     setGlbName]     = useState(null);
  const [isPlace,     setIsPlace]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  const [location,         setLocation]         = useState(null);
  const [tempLocation,     setTempLocation]     = useState(null);
  const [mapModalVisible,  setMapModalVisible]  = useState(false);

  const isEditable = !passedSpotName;

  // Derive current step for stepper
  const currentStep = !spotName.trim() || !description.trim() ? 1 : !location ? 2 : 3;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
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
    if (!spotName.trim())   return Alert.alert('Missing Info', 'Please provide a spot name.');
    if (!description.trim()) return Alert.alert('Missing Info', 'Please provide a description.');
    if (!location)          return Alert.alert('Missing Info', 'Please pin a location on the map.');

    setSubmitting(true);
    try {
      await submitPromotion(spotName.trim(), description.trim(), imageUri, glbUri, location.lat, location.lng, isPlace);
      Alert.alert('Submitted! 🎉', 'Your promotion has been submitted for review!', [
        {
          text: 'OK',
          onPress: () => {
            if (isEditable) {
              setSpotName(''); setDescription(''); setImageUri(null);
              setGlbUri(null); setGlbName(null); setLocation(null); setIsPlace(false);
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (e) {
      let errMsg = 'Failed to submit promotion.';
      if (e.response?.data)  errMsg = JSON.stringify(e.response.data);
      else if (e.message)    errMsg = e.message;
      Alert.alert('Error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMapMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'LOCATION_UPDATED') setTempLocation({ lat: msg.lat, lng: msg.lng });
    } catch (e) {}
  };

  const confirmLocation = () => {
    if (tempLocation) setLocation(tempLocation);
    setMapModalVisible(false);
  };

  const locationPinned = !!location;

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
          {navigation.canGoBack() && !isEditable ? (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>PROMOTE A SPOT</Text>
            <Text style={styles.headerSub}>SHARE ZAMBOANGA'S GEMS</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <VintaStripe height={3} />

        {/* ── Step Indicator ── */}
        <View style={styles.stepWrapper}>
          <StepIndicator current={currentStep} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Info Banner ── */}
          <View style={styles.infoBanner}>
            <Ionicons name="sparkles" size={18} color={COLORS.gold} />
            <Text style={styles.infoBannerText}>
              Fill in the spot details below. Once approved by our team, explorer rewards and map pins will be activated!
            </Text>
          </View>

          {/* ── Section: Details ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionNum}><Text style={styles.sectionNumText}>1</Text></View>
              <Text style={styles.sectionCardTitle}>Spot Details</Text>
            </View>

            <FieldLabel icon="storefront-outline" text="Location / Business Name" />
            <TextInput
              style={isEditable ? styles.inputEditable : styles.inputDisabled}
              value={spotName}
              onChangeText={setSpotName}
              editable={isEditable}
              placeholder={isEditable ? 'e.g. Fort Pilar, Zamboanga' : ''}
              placeholderTextColor="rgba(191,215,255,0.4)"
            />

            <FieldLabel icon="chatbubble-ellipses-outline" text="Why should explorers visit?" />
            <TextInput
              style={styles.textArea}
              placeholder="Share cultural highlights, must-try food, promotions..."
              placeholderTextColor="rgba(191,215,255,0.4)"
              multiline
              value={description}
              onChangeText={setDescription}
            />

            {/* Is Place toggle */}
            <TouchableOpacity
              style={[styles.toggleRow, isPlace && styles.toggleRowActive]}
              onPress={() => setIsPlace(!isPlace)}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleIcon, isPlace && styles.toggleIconActive]}>
                <Ionicons name={isPlace ? 'location' : 'location-outline'} size={18} color={isPlace ? '#fff' : 'rgba(191,215,255,0.7)'} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.toggleLabel, isPlace && { color: COLORS.teal }]}>Mark as Heritage Landmark</Text>
                <Text style={styles.toggleSub}>Will appear as a primary quest pin on the World Map</Text>
              </View>
              <View style={[styles.toggleSwitch, isPlace && styles.toggleSwitchOn]}>
                <View style={[styles.toggleThumb, isPlace && styles.toggleThumbOn]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Section: Location ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionNum, locationPinned && styles.sectionNumDone]}>
                {locationPinned
                  ? <Ionicons name="checkmark" size={14} color="#fff" />
                  : <Text style={styles.sectionNumText}>2</Text>
                }
              </View>
              <Text style={styles.sectionCardTitle}>Pin Coordinates</Text>
            </View>

            <TouchableOpacity
              style={[styles.mapTrigger, locationPinned && styles.mapTriggerPinned]}
              onPress={() => setMapModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.mapTriggerIconWrap, locationPinned && { backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: 'rgba(56, 189, 248, 0.5)' }]}>
                <Ionicons name="map" size={24} color={locationPinned ? '#38BDF8' : COLORS.textMuted} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.mapTriggerTitle, locationPinned && { color: '#38BDF8' }]}>
                  {locationPinned ? '📍 GPS Position Locked' : 'Open Tactical Map to Pin'}
                </Text>
                {locationPinned ? (
                  <Text style={styles.mapCoords}>{location.lat.toFixed(5)}°N,  {location.lng.toFixed(5)}°E</Text>
                ) : (
                  <Text style={styles.mapHint}>Drag the crosshair to set the landmark location</Text>
                )}
              </View>
              <View style={[styles.mapChevron, locationPinned && { backgroundColor: '#38BDF8' }]}>
                <Ionicons name="chevron-forward" size={16} color={locationPinned ? '#08143C' : 'rgba(191,215,255,0.7)'} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Section: Media ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionNum, (imageUri || glbName) && styles.sectionNumDone]}>
                {(imageUri || glbName)
                  ? <Ionicons name="checkmark" size={14} color="#fff" />
                  : <Text style={styles.sectionNumText}>3</Text>
                }
              </View>
              <Text style={styles.sectionCardTitle}>Expedition Media</Text>
              <View style={styles.optionalPill}><Text style={styles.optionalPillText}>Optional</Text></View>
            </View>

            <Text style={styles.mediaHintText}>Attach photos or 3D models to make your landmark standout.</Text>

            {/* Photo Upload */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.mediaSubLabel}>📷  Cover Photo</Text>
              <UploadBox
                onPress={pickImage}
                icon="camera-outline"
                filledIcon="camera"
                label="Select a Photo"
                filledLabel="Photo Attached"
                filled={!!imageUri}
                filledColor={COLORS.accent}
              >
                {imageUri ? (
                  <View style={{ width: '100%', height: '100%' }}>
                    <Image source={{ uri: imageUri }} style={styles.previewImg} />
                    <View style={styles.imgOverlay}>
                      <Ionicons name="pencil" size={14} color="#fff" />
                      <Text style={styles.imgOverlayText}>Change</Text>
                    </View>
                  </View>
                ) : null}
              </UploadBox>
            </View>

            {/* 3D Model Upload */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.mediaSubLabel}>🧊  3D AR Model (.glb / .gltf)</Text>
              <UploadBox
                onPress={pickGlb}
                icon="cube-outline"
                filledIcon="cube"
                label="Upload 3D Model"
                filledLabel={glbName}
                filled={!!glbName}
                filledColor={COLORS.teal}
              />
            </View>
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="hourglass-outline" size={20} color="#08143C" />
                <Text style={styles.submitText}>Transmitting Data...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="paper-plane" size={18} color="#08143C" />
                <Text style={styles.submitText}>Submit for Review</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color="rgba(191,215,255,0.6)" />
            <Text style={styles.footerNoteText}>Verified by LAKBAY admins before appearing live on the map</Text>
          </View>

          <View style={{ height: 36 }} />
        </ScrollView>

        {/* ── Map Picker Overlay ── */}
        {mapModalVisible && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 10, backgroundColor: 'rgba(4,10,38,0.95)' }]}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setMapModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalTitle}>Set Target Coordinates</Text>
                  <Text style={styles.modalSub}>Center the crosshair over your spot</Text>
                </View>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmLocation}>
                  <Ionicons name="checkmark" size={16} color="#08143C" />
                  <Text style={styles.modalConfirmText}>Lock In</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <WebView
                  source={{ html: getMapPickerHTML(location?.lng || 122.0790, location?.lat || 6.9214), baseUrl: 'https://localhost' }}
                  style={{ flex: 1 }}
                  onMessage={handleMapMessage}
                  javaScriptEnabled
                  domStorageEnabled
                  originWhitelist={['*']}
                />
              </View>
            </SafeAreaView>
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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

  // Header
  header: {
    height: 64,
    backgroundColor: 'rgba(8, 20, 60, 0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 179, 237, 0.20)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.pixel, fontSize: 10,
    color: '#FFFFFF', letterSpacing: 2, lineHeight: 18,
  },
  headerSub: {
    fontFamily: FONTS.medium, fontSize: 9,
    color: 'rgba(191,215,255,0.70)', letterSpacing: 1.5, marginTop: 1, textAlign: 'center',
  },

  // Step
  stepWrapper: {
    backgroundColor: 'rgba(8, 20, 60, 0.40)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 179, 237, 0.15)',
  },

  content: { padding: 16 },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 16,
    ...SHADOW.accent,
  },
  infoBannerText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191,215,255,0.85)',
    flex: 1,
    lineHeight: 18,
  },

  // Section card
  sectionCard: {
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    padding: 16,
    marginBottom: 14,
    ...SHADOW.accent,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(99, 179, 237, 0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  sectionNumDone: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  sectionNumText: {
    fontFamily: FONTS.bold, fontSize: 11, color: '#FFFFFF',
  },
  sectionCardTitle: {
    fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF', flex: 1,
  },
  optionalPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  optionalPillText: {
    fontFamily: FONTS.medium, fontSize: 9, color: 'rgba(191,215,255,0.70)',
  },

  // Inputs
  inputEditable: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(99, 179, 237, 0.35)',
    borderRadius: RADIUS.sm, padding: 12,
    color: '#FFFFFF', fontFamily: FONTS.regular, fontSize: 13,
  },
  inputDisabled: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: RADIUS.sm, padding: 12,
    color: 'rgba(191,215,255,0.60)', fontFamily: FONTS.regular, fontSize: 13,
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(99, 179, 237, 0.35)',
    borderRadius: RADIUS.sm, padding: 12,
    color: '#FFFFFF', fontFamily: FONTS.regular, fontSize: 13,
    height: 100, textAlignVertical: 'top',
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(99, 179, 237, 0.20)',
  },
  toggleRowActive: {
    borderColor: 'rgba(16, 185, 129, 0.45)',
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  toggleIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  toggleIconActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  toggleLabel: {
    fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFFFFF',
  },
  toggleSub: {
    fontFamily: FONTS.regular, fontSize: 10,
    color: 'rgba(191,215,255,0.65)', marginTop: 2,
  },
  toggleSwitch: {
    width: 42, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleSwitchOn: { backgroundColor: COLORS.teal },
  toggleThumb: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#fff',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // Map trigger
  mapTrigger: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: 'rgba(99, 179, 237, 0.3)',
    borderStyle: 'dashed',
  },
  mapTriggerPinned: {
    borderStyle: 'solid',
    borderColor: 'rgba(56, 189, 248, 0.45)',
    backgroundColor: 'rgba(56, 189, 248, 0.10)',
  },
  mapTriggerIconWrap: {
    width: 46, height: 46, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  mapTriggerTitle: {
    fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF',
  },
  mapCoords: {
    fontFamily: FONTS.regular, fontSize: 12,
    color: '#38BDF8', marginTop: 2, letterSpacing: 0.3,
  },
  mapHint: {
    fontFamily: FONTS.regular, fontSize: 11,
    color: 'rgba(191,215,255,0.65)', marginTop: 2,
  },
  mapChevron: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Media
  mediaHintText: {
    fontFamily: FONTS.regular, fontSize: 11,
    color: 'rgba(191,215,255,0.65)', marginTop: 6, lineHeight: 16,
  },
  mediaSubLabel: {
    fontFamily: FONTS.semiBold, fontSize: 12,
    color: '#FFFFFF', marginBottom: 8,
  },
  previewImg: { width: '100%', height: '100%' },
  imgOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(4,10,38,0.7)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, gap: 6,
  },
  imgOverlayText: {
    fontFamily: FONTS.semiBold, fontSize: 11, color: '#fff',
  },

  // Submit
  submitBtn: {
    backgroundColor: COLORS.gold,
    padding: 16, borderRadius: RADIUS.pill,
    alignItems: 'center', marginTop: 8,
    ...SHADOW.accent,
  },
  submitText: {
    fontFamily: FONTS.bold, fontSize: 14, color: '#08143C', letterSpacing: 0.5,
  },

  footerNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 12,
  },
  footerNoteText: {
    fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(191,215,255,0.60)',
  },

  // Map modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(99, 179, 237, 0.20)',
    backgroundColor: 'rgba(8, 20, 60, 0.90)',
  },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF',
  },
  modalSub: {
    fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(191,215,255,0.70)', marginTop: 1,
  },
  modalConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.teal,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  modalConfirmText: {
    fontFamily: FONTS.bold, fontSize: 12, color: '#08143C',
  },
});
