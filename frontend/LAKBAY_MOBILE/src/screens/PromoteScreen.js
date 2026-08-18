import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, ScrollView, Alert, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
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
    body { margin: 0; padding: 0; width: 100%; height: 100%; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    .crosshair {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 40px; height: 40px;
      pointer-events: none; z-index: 10;
    }
    .crosshair::before, .crosshair::after {
      content: ''; position: absolute; background: #EF4444;
    }
    .crosshair::before { top: 19px; left: 0; width: 40px; height: 2px; }
    .crosshair::after  { top: 0; left: 19px; width: 2px; height: 40px; }
    .mapboxgl-ctrl-geocoder {
      width: calc(100vw - 32px) !important;
      max-width: calc(100vw - 32px) !important;
      min-width: 250px !important;
      margin: 16px !important;
    }
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
    style: 'mapbox://styles/mapbox/light-v11',
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
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  item:        { alignItems: 'center', gap: 5 },
  circle:      { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgCard },
  circleActive:{ borderColor: COLORS.accent, backgroundColor: COLORS.accent + '18' },
  circleDone:  { borderColor: COLORS.teal, backgroundColor: COLORS.teal },
  num:         { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.textMuted },
  numActive:   { color: COLORS.accent },
  line:        { flex: 1, height: 2, backgroundColor: COLORS.borderLight, marginHorizontal: 8, marginBottom: 20 },
  lineDone:    { backgroundColor: COLORS.teal },
  label:       { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.3 },
  labelActive: { color: COLORS.accent, fontFamily: FONTS.bold },
});

// ─── Field label ─────────────────────────────────────────────────────────────
function FieldLabel({ icon, text, optional }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 20, gap: 7 }}>
      <View style={[fStyles.iconWrap]}>
        <Ionicons name={icon} size={14} color={COLORS.accent} />
      </View>
      <Text style={fStyles.text}>{text}</Text>
      {optional && <View style={fStyles.pill}><Text style={fStyles.pillText}>Optional</Text></View>}
    </View>
  );
}

const fStyles = StyleSheet.create({
  iconWrap: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  text:     { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text, flex: 1 },
  pill:     { backgroundColor: COLORS.bgSurface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.textMuted },
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
        filled && { borderColor: (filledColor || COLORS.teal) + '88', borderStyle: 'solid', backgroundColor: (filledColor || COLORS.teal) + '08' },
        { transform: [{ scale: scaleAnim }] },
      ]}>
        {children || (
          <>
            <View style={[uploadStyles.iconRing, filled && { borderColor: (filledColor || COLORS.teal) + '55', backgroundColor: (filledColor || COLORS.teal) + '18' }]}>
              <Ionicons name={filled ? filledIcon : icon} size={26} color={filled ? (filledColor || COLORS.teal) : COLORS.textMuted} />
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
    height: 120, backgroundColor: COLORS.bgCard,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', gap: 6,
  },
  iconRing: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1.5,
    borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bgSurface,
  },
  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textSub },
  hint:  { fontFamily: FONTS.regular,  fontSize: 11, color: COLORS.textFaint },
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
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {navigation.canGoBack() && !isEditable ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Promote a Spot</Text>
          <Text style={styles.headerSub}>Share Zamboanga's hidden gems</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
      <VintaStripe height={5} />

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
          <Ionicons name="information-circle" size={18} color={COLORS.accent} />
          <Text style={styles.infoBannerText}>
            Fill in the details below. Once approved by an admin, pay coins to publish it on the map.
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
            placeholderTextColor={COLORS.textMuted}
          />

          <FieldLabel icon="chatbubble-ellipses-outline" text="Why should people visit?" />
          <TextInput
            style={styles.textArea}
            placeholder="Share your experience, what's special about this spot, promotions..."
            placeholderTextColor={COLORS.textMuted}
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
              <Ionicons name={isPlace ? 'location' : 'location-outline'} size={18} color={isPlace ? '#fff' : COLORS.textMuted} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.toggleLabel, isPlace && { color: COLORS.accent }]}>Mark as a Place</Text>
              <Text style={styles.toggleSub}>Will appear in the Explore & Map tabs</Text>
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
            <Text style={styles.sectionCardTitle}>Pin Location</Text>
          </View>

          <TouchableOpacity
            style={[styles.mapTrigger, locationPinned && styles.mapTriggerPinned]}
            onPress={() => setMapModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.mapTriggerIconWrap, locationPinned && { backgroundColor: COLORS.accent + '18', borderColor: COLORS.accent + '55' }]}>
              <Ionicons name="map" size={26} color={locationPinned ? COLORS.accent : COLORS.textMuted} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.mapTriggerTitle, locationPinned && { color: COLORS.accent }]}>
                {locationPinned ? '📍 Location Pinned' : 'Open Map to Pin'}
              </Text>
              {locationPinned ? (
                <Text style={styles.mapCoords}>{location.lat.toFixed(5)},  {location.lng.toFixed(5)}</Text>
              ) : (
                <Text style={styles.mapHint}>Drag the map to pick the exact spot</Text>
              )}
            </View>
            <View style={[styles.mapChevron, locationPinned && { backgroundColor: COLORS.accent }]}>
              <Ionicons name="chevron-forward" size={16} color={locationPinned ? '#fff' : COLORS.textMuted} />
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
            <Text style={styles.sectionCardTitle}>Attach Media</Text>
            <View style={styles.optionalPill}><Text style={styles.optionalPillText}>Optional</Text></View>
          </View>

          <Text style={styles.mediaHintText}>Add a photo or 3D model to make your promotion stand out.</Text>

          {/* Photo Upload */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.mediaSubLabel}>📷  Cover Photo</Text>
            <UploadBox
              onPress={pickImage}
              icon="camera-outline"
              filledIcon="camera"
              label="Select a Photo"
              filledLabel="Photo selected"
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
            <Text style={styles.mediaSubLabel}>🧊  3D Model (.glb / .gltf)</Text>
            <UploadBox
              onPress={pickGlb}
              icon="cube-outline"
              filledIcon="cube"
              label="Select a 3D Model"
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
              <Ionicons name="hourglass-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>Submitting...</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="paper-plane" size={20} color="#fff" />
              <Text style={styles.submitText}>Submit for Review</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.footerNoteText}>Reviewed by admins before going live on the map</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Map Picker Overlay ── */}
      {mapModalVisible && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 10, backgroundColor: COLORS.bgCard }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setMapModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Drag Map to Pin</Text>
                <Text style={styles.modalSub}>Center the crosshair on your spot</Text>
              </View>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmLocation}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.modalConfirmText}>Confirm</Text>
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
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    height: 72,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold, fontSize: 18,
    color: '#fff', letterSpacing: 0.4,
  },
  headerSub: {
    fontFamily: FONTS.regular, fontSize: 11,
    color: 'rgba(255,255,255,0.55)', marginTop: 1, textAlign: 'center',
  },

  // Step
  stepWrapper: {
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  content: { padding: 16 },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.accent,
    flex: 1,
    lineHeight: 17,
  },

  // Section card
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionNumDone: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  sectionNumText: {
    fontFamily: FONTS.bold, fontSize: 12, color: COLORS.textMuted,
  },
  sectionCardTitle: {
    fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, flex: 1,
  },
  optionalPill: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  optionalPillText: {
    fontFamily: FONTS.medium, fontSize: 10, color: COLORS.textMuted,
  },

  // Inputs
  inputEditable: {
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1.5, borderColor: COLORS.accent + '55',
    borderRadius: RADIUS.sm, padding: 12,
    color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14,
  },
  inputDisabled: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, padding: 12,
    color: COLORS.textSub, fontFamily: FONTS.regular, fontSize: 14,
  },
  textArea: {
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, padding: 12,
    color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14,
    height: 110, textAlignVertical: 'top',
  },

  // Toggle row (is place)
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 18, padding: 14,
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  toggleRowActive: {
    borderColor: COLORS.accent + '55',
    backgroundColor: COLORS.accentSoft,
  },
  toggleIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  toggleIconActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  toggleLabel: {
    fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text,
  },
  toggleSub: {
    fontFamily: FONTS.regular, fontSize: 11,
    color: COLORS.textMuted, marginTop: 2,
  },
  toggleSwitch: {
    width: 42, height: 24, borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleSwitchOn: { backgroundColor: COLORS.accent },
  toggleThumb: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // Map trigger
  mapTrigger: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, padding: 14,
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  mapTriggerPinned: {
    borderStyle: 'solid',
    borderColor: COLORS.accent + '55',
    backgroundColor: COLORS.accentSoft,
  },
  mapTriggerIconWrap: {
    width: 46, height: 46, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  mapTriggerTitle: {
    fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text,
  },
  mapCoords: {
    fontFamily: FONTS.regular, fontSize: 12,
    color: COLORS.accent, marginTop: 2, letterSpacing: 0.3,
  },
  mapHint: {
    fontFamily: FONTS.regular, fontSize: 12,
    color: COLORS.textMuted, marginTop: 2,
  },
  mapChevron: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },

  // Media
  mediaHintText: {
    fontFamily: FONTS.regular, fontSize: 12,
    color: COLORS.textMuted, marginTop: 6, lineHeight: 17,
  },
  mediaSubLabel: {
    fontFamily: FONTS.semiBold, fontSize: 13,
    color: COLORS.textSub, marginBottom: 8,
  },
  previewImg: { width: '100%', height: '100%' },
  imgOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, gap: 6,
  },
  imgOverlayText: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: '#fff',
  },

  // Submit
  submitBtn: {
    backgroundColor: COLORS.navy,
    padding: 16, borderRadius: RADIUS.md,
    alignItems: 'center', marginTop: 8,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12,
    elevation: 6,
  },
  submitText: {
    fontFamily: FONTS.bold, fontSize: 16, color: '#fff', letterSpacing: 0.5,
  },

  footerNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 12,
  },
  footerNoteText: {
    fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted,
  },

  // Map modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text,
  },
  modalSub: {
    fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 1,
  },
  modalConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: RADIUS.sm,
  },
  modalConfirmText: {
    fontFamily: FONTS.bold, fontSize: 14, color: '#fff',
  },
});
