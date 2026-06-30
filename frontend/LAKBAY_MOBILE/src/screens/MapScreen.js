import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet, View, Text, ActivityIndicator, TouchableOpacity,
  Animated, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getSpots } from '../api/qrService';
import { COLORS, FONTS, SIZES, RADIUS, SPACING, SHADOW } from '../constants/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const CARD_HEIGHT = 240;

// ─── Leaflet HTML Builder ───────────────────────────────────────────────────
function buildLeafletHTML(spots) {
  const markers = spots
    .filter(s => s.latitude && s.longitude)
    .map(s => ({
      id: s.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      location_name: s.location_name || '',
      description: s.description || '',
      feature_types: s.feature_types || [],
      model_3d: s.model_3d || null,
    }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:100%;height:100%;background:#EEF3FF;overflow:hidden;}
    #map{width:100%;height:100%;}
    .leaflet-container{background:#EEF3FF;}
    .pin{
      width:18px;height:18px;border-radius:50%;
      border:2.5px solid rgba(255,255,255,0.85);
      cursor:pointer;
      transition:transform 0.15s;
    }
    .pin-qr   { background:#1A56DB; box-shadow:0 0 10px rgba(26,86,219,0.7),0 0 0 4px rgba(26,86,219,0.2); }
    .pin-ar   { background:#10B981; box-shadow:0 0 10px rgba(16,185,129,0.7),0 0 0 4px rgba(16,185,129,0.2); }
    .pin-catch{ background:#FBBF24; box-shadow:0 0 10px rgba(251,191,36,0.7),0 0 0 4px rgba(251,191,36,0.2); }
    .pin.selected{
      background:#fff!important;
      box-shadow:0 0 18px rgba(255,255,255,0.6),0 0 0 6px rgba(255,255,255,0.15)!important;
      transform:scale(1.35);
    }
    /* user location pulse */
    .user-dot{
      width:16px;height:16px;border-radius:50%;
      background:#3B82F6;
      border:3px solid #fff;
      box-shadow:0 0 0 6px rgba(59,130,246,0.25);
      animation:pulse 2s ease-in-out infinite;
    }
    @keyframes pulse{
      0%,100%{box-shadow:0 0 0 6px rgba(59,130,246,0.25);}
      50%{box-shadow:0 0 0 12px rgba(59,130,246,0.08);}
    }
    /* hide default routing UI */
    .leaflet-routing-container{display:none!important;}
    /* style the route line */
    .leaflet-interactive[stroke="#0033ff"]{stroke:#3B82F6!important;stroke-width:5;}
    .leaflet-popup-content-wrapper{
      background:#FFFFFF;border:1px solid #C3D8FF;
      border-radius:10px;color:#1E293B;font-family:sans-serif;
      box-shadow:0 4px 16px rgba(26,86,219,0.12);
    }
    .leaflet-popup-tip{background:#FFFFFF;}
    .leaflet-popup-close-button{color:#64748B!important;}
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  var spots=${JSON.stringify(markers)};
  var selectedId=null;
  var pinEls={};
  var routingControl=null;
  var userMarker=null;

  var map=L.map('map',{center:[6.9214,122.0790],zoom:12,zoomControl:true});

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; OpenStreetMap &copy; CARTO',
    subdomains:'abcd',maxZoom:20,
  }).addTo(map);

  spots.forEach(function(spot){
    var primaryType=(spot.feature_types&&spot.feature_types[0])||'qr';
    var el=document.createElement('div');
    el.className='pin pin-'+primaryType;
    pinEls[spot.id]=el;

    var icon=L.divIcon({html:el,className:'',iconSize:[18,18],iconAnchor:[9,9],popupAnchor:[0,-14]});

    L.marker([spot.latitude,spot.longitude],{icon:icon})
      .addTo(map)
      .on('click',function(){
        if(selectedId!==null&&pinEls[selectedId]) pinEls[selectedId].classList.remove('selected');
        selectedId=spot.id;
        el.classList.add('selected');
        window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
          JSON.stringify({type:'SPOT_SELECTED',spot:spot})
        );
      });
  });

  // Show user location dot
  function showUserLocation(lat,lng){
    if(userMarker) map.removeLayer(userMarker);
    var el=document.createElement('div');
    el.className='user-dot';
    var icon=L.divIcon({html:el,className:'',iconSize:[16,16],iconAnchor:[8,8]});
    userMarker=L.marker([lat,lng],{icon:icon,zIndexOffset:1000}).addTo(map);
  }

  // Draw route using OSRM (free, no API key needed)
  function drawRoute(fromLat,fromLng,toLat,toLng){
    if(routingControl){
      map.removeControl(routingControl);
      routingControl=null;
    }
    showUserLocation(fromLat,fromLng);

    routingControl=L.Routing.control({
      waypoints:[
        L.latLng(fromLat,fromLng),
        L.latLng(toLat,toLng),
      ],
      router: L.Routing.osrmv1({
        serviceUrl:'https://router.project-osrm.org/route/v1',
      }),
      lineOptions:{
        styles:[{color:'#3B82F6',weight:5,opacity:0.85}],
        extendToWaypoints:true,
        missingRouteTolerance:0,
      },
      show:false,
      addWaypoints:false,
      draggableWaypoints:false,
      fitSelectedRoutes:true,
      showAlternatives:false,
      createMarker:function(){return null;}, // suppress default start/end markers
    }).addTo(map);

    routingControl.on('routesfound',function(e){
      var r=e.routes[0].summary;
      var distKm=(r.totalDistance/1000).toFixed(1);
      var mins=Math.ceil(r.totalTime/60);
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
        JSON.stringify({type:'ROUTE_INFO',distKm:distKm,mins:mins})
      );
    });

    routingControl.on('routingerror',function(){
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
        JSON.stringify({type:'ROUTE_ERROR'})
      );
    });
  }

  function clearRoute(){
    if(routingControl){ map.removeControl(routingControl); routingControl=null; }
    if(userMarker){ map.removeLayer(userMarker); userMarker=null; }
  }

  window.addEventListener('message',function(e){
    try{
      var msg=JSON.parse(e.data);
      if(msg.type==='FLY_TO') map.flyTo([msg.lat,msg.lng],15);
      if(msg.type==='DESELECT'){
        if(selectedId!==null&&pinEls[selectedId]) pinEls[selectedId].classList.remove('selected');
        selectedId=null;
      }
      if(msg.type==='DRAW_ROUTE'){
        drawRoute(msg.fromLat,msg.fromLng,msg.toLat,msg.toLng);
      }
      if(msg.type==='CLEAR_ROUTE'){
        clearRoute();
      }
      if(msg.type==='SHOW_USER'){
        showUserLocation(msg.lat,msg.lng);
        map.flyTo([msg.lat,msg.lng],14);
      }
    }catch(err){}
  });
})();
</script>
</body>
</html>`;
}

// ─── Main Screen ────────────────────────────────────────────────────────────
const HTML_ESCAPE = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
const escapeAttr = (s) => String(s).replace(/["'<>&]/g, (c) => HTML_ESCAPE[c]);

function build3DViewerHTML(modelUrl) {
  let safe;
  try {
    const parsed = new URL(modelUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    safe = escapeAttr(modelUrl);
  } catch {
    return null;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: radial-gradient(circle at center, #2A3B5C 0%, #0F172A 100%); }
    model-viewer { width: 100%; height: 100%; --progress-bar-color: transparent; }
  </style>
</head>
<body>
  <model-viewer src="${safe}" auto-rotate camera-controls exposure="1" shadow-intensity="1" bounds="tight" style="width:100%;height:100%"></model-viewer>
</body>
</html>`;
}

export default function MapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);   // { distKm, mins }
  const [routing, setRouting] = useState(false);       // routing in progress
  const webviewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(CARD_HEIGHT)).current;
  const routeBannerAnim = useRef(new Animated.Value(-80)).current;

  // ── Load spots ────────────────────────────────────────────────────────────
  useEffect(() => {
    getSpots()
      .then(data => setSpots(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => setError('Could not load map spots. Check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Request location permission on mount ──────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  const leafletHTML = useMemo(() => buildLeafletHTML(spots), [spots]);

  // ── WebView message handler ───────────────────────────────────────────────
  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SPOT_SELECTED') {
        setRouteInfo(null);
        setRouting(false);
        setSelectedSpot(msg.spot);
        Animated.spring(slideAnim, {
          toValue: 0, useNativeDriver: true, tension: 65, friction: 10,
        }).start();
      }
      if (msg.type === 'ROUTE_INFO') {
        setRouting(false);
        setRouteInfo({ distKm: msg.distKm, mins: msg.mins });
        // show route banner
        Animated.spring(routeBannerAnim, {
          toValue: 0, useNativeDriver: true, tension: 60, friction: 10,
        }).start();
      }
      if (msg.type === 'ROUTE_ERROR') {
        setRouting(false);
        Alert.alert('Directions unavailable', 'Could not calculate a route to this spot. Make sure you have an internet connection.');
      }
    } catch {}
  };

  // ── Dismiss bottom card ───────────────────────────────────────────────────
  const dismissCard = () => {
    Animated.timing(slideAnim, {
      toValue: CARD_HEIGHT, duration: 240, useNativeDriver: true,
    }).start(() => {
      setSelectedSpot(null);
      setRouteInfo(null);
    });
    webviewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'DESELECT'})}));true;`
    );
    handleClearRoute();
  };

  // ── Get Directions ────────────────────────────────────────────────────────
  const handleGetDirections = async () => {
    if (!selectedSpot) return;

    let loc = userLocation;

    // Re-fetch location if not available
    if (!loc) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Please enable location permissions to get directions.');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      loc = { lat: result.coords.latitude, lng: result.coords.longitude };
      setUserLocation(loc);
    }

    setRouting(true);
    setRouteInfo(null);

    webviewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message',{
        data: JSON.stringify({
          type: 'DRAW_ROUTE',
          fromLat: ${loc.lat},
          fromLng: ${loc.lng},
          toLat: ${selectedSpot.latitude},
          toLng: ${selectedSpot.longitude},
        })
      }));
      true;
    `);
  };

  // ── Clear Route ───────────────────────────────────────────────────────────
  const handleClearRoute = () => {
    setRouteInfo(null);
    setRouting(false);
    Animated.timing(routeBannerAnim, {
      toValue: -80, duration: 200, useNativeDriver: true,
    }).start();
    webviewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'CLEAR_ROUTE'})}));true;`
    );
  };

  // ── Show my location button ───────────────────────────────────────────────
  const handleMyLocation = async () => {
    let loc = userLocation;
    if (!loc) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Please enable location permissions.');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      loc = { lat: result.coords.latitude, lng: result.coords.longitude };
      setUserLocation(loc);
    }
    webviewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message',{
        data: JSON.stringify({ type: 'SHOW_USER', lat: ${loc.lat}, lng: ${loc.lng} })
      }));
      true;
    `);
  };

  // ── Badge config by type ──────────────────────────────────────────────────
  const getBadgeConfig = (type) => {
    const configs = {
      ar:    { label: 'AR EXHIBIT',  icon: 'cube-outline',  color: '#10B981', bg: '#ECFDF5', border: '#6EE7B7' },
      catch: { label: 'CATCH ZONE',  icon: 'fish-outline',  color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
      qr:    { label: 'QR SPOT',     icon: 'scan-outline',  color: COLORS.accent, bg: COLORS.accentSoft, border: COLORS.accentBorder },
    };
    return configs[type] || configs['qr'];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tourist Map</Text>
        <Text style={styles.headerSubtitle}>Discover Zamboanga's Cultural Heritage</Text>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={COLORS.accent} size="large" />
            <Text style={styles.loadingText}>Loading map spots…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="warning-outline" size={40} color={COLORS.accent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={{ html: leafletHTML, baseUrl: 'https://localhost' }}
            style={styles.webview}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            scrollEnabled={false}
            mixedContentMode="always"
            allowUniversalAccessFromFileURLs={true}
          />
        )}

        {/* Legend */}
        {!loading && !error && (
          <View style={styles.legend}>
            {[
              { color: '#1A56DB', label: 'QR Scan' },
              { color: '#10B981', label: 'AR Exhibit' },
              { color: '#FBBF24', label: 'Catch Zone' },
            ].map(item => (
              <View key={item.label} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: item.color, shadowColor: item.color, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
            <View style={styles.legendDivider} />
            <Text style={styles.legendCount}>{spots.filter(s => s.latitude && s.longitude).length} spots</Text>
          </View>
        )}

        {/* My Location FAB */}
        {!loading && !error && (
          <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation} activeOpacity={0.8}>
            <Ionicons name="locate" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        )}

        {/* Route Info Banner (slides down from top of map) */}
        <Animated.View style={[styles.routeBanner, { transform: [{ translateY: routeBannerAnim }] }]}>
          <View style={styles.routeBannerInner}>
            <View style={styles.routeBannerLeft}>
              <Ionicons name="navigate" size={16} color="#3B82F6" />
              <Text style={styles.routeBannerDist}>{routeInfo?.distKm} km</Text>
              <View style={styles.routeBannerDivider} />
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <Text style={styles.routeBannerTime}>{routeInfo?.mins} min</Text>
            </View>
            <TouchableOpacity onPress={handleClearRoute} style={styles.routeBannerClose}>
              <Text style={styles.routeBannerCloseText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* ── Bottom Sheet Card ── */}
      {selectedSpot && (() => {
        const primaryType = (selectedSpot.feature_types && selectedSpot.feature_types[0]) || 'qr';
        const badge = getBadgeConfig(primaryType);
        return (
          <Animated.View
            style={[
              styles.bottomSheet,
              { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Close button */}
            <TouchableOpacity style={styles.cardClose} onPress={dismissCard} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <View style={styles.cardCloseCircle}>
                <Ionicons name="close" size={16} color={COLORS.text} />
              </View>
            </TouchableOpacity>

            {/* Badge */}
            <View style={[styles.spotTypeBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Ionicons name={badge.icon} size={10} color={badge.color} style={{ marginRight: 4 }} />
              <Text style={[styles.spotTypeBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>

            {/* Name */}
            <Text style={styles.spotName}>{selectedSpot.name}</Text>

            {/* Location */}
            {!!selectedSpot.location_name && (
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={13} color={COLORS.accent} />
                <Text style={styles.spotLocation}>{selectedSpot.location_name}</Text>
              </View>
            )}

            {/* 3D Model for Catch Zones */}
            {selectedSpot.feature_types?.includes('catch') && selectedSpot.model_3d && (
              <View style={{ width: '100%', height: 180, marginTop: 12, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: '#0F172A' }}>
                <WebView
                  source={{ html: build3DViewerHTML(selectedSpot.model_3d.replace('http://', 'https://').startsWith('http') ? selectedSpot.model_3d.replace('http://', 'https://') : `${ORIGIN}${selectedSpot.model_3d}`) }}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  javaScriptEnabled
                  originWhitelist={['*']}
                  scrollEnabled={false}
                  mixedContentMode="always"
                  androidLayerType="hardware"
                />
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Description */}
            {!!selectedSpot.description && (
              <Text style={styles.spotDesc} numberOfLines={2}>{selectedSpot.description}</Text>
            )}

            {/* ── Get Directions Button ── */}
            <TouchableOpacity
              style={[styles.directionsBtn, routing && styles.directionsBtnLoading]}
              onPress={handleGetDirections}
              disabled={routing}
              activeOpacity={0.85}
            >
              {routing ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.directionsBtnText}>Finding Route…</Text>
                </>
              ) : routeInfo ? (
                <>
                  <Ionicons name="navigate" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.directionsBtnText}>{routeInfo.distKm} km · {routeInfo.mins} min</Text>
                </>
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.directionsBtnText}>Get Directions</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        );
      })()}
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: SIZES.fontLg, color: COLORS.text },
  headerSubtitle: { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: COLORS.textSub, marginTop: 4 },
  mapContainer: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: COLORS.bg },
  webview: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  loadingText: { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: SPACING.sm },
  errorText: { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: COLORS.textSub, marginTop: SPACING.sm, textAlign: 'center' },

  // Legend
  legend: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.sm,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#C3D8FF',
    shadowColor: '#1A56DB', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 6, elevation: 4,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 7 },
  legendText: { fontFamily: FONTS.medium, fontSize: 11, color: '#1E293B' },
  legendCount: { fontFamily: FONTS.regular, fontSize: 10, color: '#64748B', marginTop: 2, textAlign: 'right' },
  legendDivider: { height: 1, backgroundColor: '#C3D8FF', marginVertical: 6 },

  // My Location FAB
  myLocationBtn: {
    position: 'absolute', bottom: 16, right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#C3D8FF',
    shadowColor: '#1A56DB', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },

  // Route Banner
  routeBanner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#DBEAFE',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  routeBannerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeBannerDist: { fontFamily: FONTS.bold, fontSize: 15, color: '#3B82F6' },
  routeBannerDivider: { width: 1, height: 14, backgroundColor: '#CBD5E1', marginHorizontal: 4 },
  routeBannerTime: { fontFamily: FONTS.medium, fontSize: 13, color: '#64748B' },
  routeBannerClose: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: '#EFF6FF', borderRadius: 8,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  routeBannerCloseText: { fontFamily: FONTS.bold, fontSize: 12, color: '#3B82F6' },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#C3D8FF',
    shadowColor: '#1A56DB', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 18, elevation: 20,
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#C3D8FF', alignSelf: 'center', marginBottom: 16 },
  cardClose: { position: 'absolute', top: 20, right: 20 },
  cardCloseCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#EEF3FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#C3D8FF',
  },
  spotTypeBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, marginBottom: 10,
  },
  spotTypeBadgeText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1 },
  spotName: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 6, paddingRight: 36, lineHeight: 26 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  spotLocation: { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: COLORS.accent, flexShrink: 1 },
  divider: { height: 1, backgroundColor: '#C3D8FF', marginBottom: 10 },
  spotDesc: { fontFamily: FONTS.regular, fontSize: SIZES.fontSm, color: COLORS.textSub, lineHeight: 20, marginBottom: 14 },

  // Directions Button
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14, paddingVertical: 14,
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  directionsBtnLoading: { backgroundColor: '#93C5FD' },
  directionsBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFFFFF' },
});
