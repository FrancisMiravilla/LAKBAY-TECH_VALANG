import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, View, Text, ActivityIndicator, TouchableOpacity,
  Animated, Dimensions, PanResponder
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getSpots, ORIGIN } from '../api/qrService';
import { COLORS, FONTS, SIZES, RADIUS, SPACING, SHADOW } from '../constants/theme';
import ErrorModal from '../components/ErrorModal';
import { useCameraPermissions } from 'expo-camera';
import ARNavigationOverlay from '../components/ARNavigationOverlay';

const { height: SCREEN_H } = Dimensions.get('window');
const CARD_HEIGHT = 240;

// ─── Mapbox HTML Builder ───────────────────────────────────────────────────
function buildMapboxHTML(spots) {
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
      model_3d: s.model_3d ? String(s.model_3d).replace(/^http:\/\//, 'https://') : null,
    }));

  const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your_mapbox_token_here';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:100%;height:100%;background:transparent;overflow:hidden;}
    #map{width:100%;height:100%;background:transparent;}
    .pin{
      position:relative;
      cursor:pointer;
      transition:width 0.15s,height 0.15s;
    }
    .pin-circle{
      width:100%;height:100%;border-radius:50%;overflow:hidden;
      border:2.5px solid rgba(255,255,255,0.9);
      display:flex;align-items:center;justify-content:center;
      transition:transform 0.15s,box-shadow 0.15s;
    }
    .pin-circle svg{ width:58%;height:58%; }
    .pin-qr    .pin-circle{ background:#1A56DB; box-shadow:0 0 10px rgba(26,86,219,0.7),0 0 0 4px rgba(26,86,219,0.2); }
    .pin-ar    .pin-circle{ background:#10B981; box-shadow:0 0 10px rgba(16,185,129,0.7),0 0 0 4px rgba(16,185,129,0.2); }
    .pin-catch .pin-circle{ background:#FBBF24; box-shadow:0 0 10px rgba(251,191,36,0.7),0 0 0 4px rgba(251,191,36,0.2); }
    .pin-catch model-viewer{ width:100%;height:100%;background:transparent;pointer-events:none; --poster-color:transparent; }
    .pin.selected .pin-circle{
      border-color:#fff;
      box-shadow:0 0 18px rgba(255,255,255,0.7),0 0 0 6px rgba(255,255,255,0.18)!important;
      transform:scale(1.18);
    }
    .pin-label{
      position:absolute; top:100%; left:50%; transform:translateX(-50%); margin-top:4px;
      font-family:sans-serif; font-size:7px; font-weight:800; letter-spacing:0.5px;
      color:#fff; padding:1px 5px; border-radius:5px; white-space:nowrap; pointer-events:none;
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
    .nav-arrow {
      width: 48px; height: 48px;
      display: flex; align-items: center; justify-content: center;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
    }
    .nav-arrow svg { width: 100%; height: 100%; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  mapboxgl.accessToken = '${MAPBOX_TOKEN}';
  var spots=${JSON.stringify(markers)};
  var selectedId=null;
  var pinEls={};
  var userMarker=null;
  var routeLineId = 'route-line';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [122.0790, 6.9214],
    zoom: 12
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  var TYPE_COLOR={qr:'#1A56DB',ar:'#10B981',catch:'#FBBF24'};
  var TYPE_LABEL={qr:'QR',ar:'AR',catch:'CATCH'};
  var ICON_SVG={
    ar:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg>',
    qr:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" fill="#fff" stroke="none"/><rect x="18" y="18" width="3" height="3" fill="#fff" stroke="none"/><rect x="14" y="18" width="3" height="3" fill="#fff" stroke="none"/></svg>',
    catch:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 5H4a1 1 0 0 0-1 1 5 5 0 0 0 4 4.9M17 5h3a1 1 0 0 1 1 1 5 5 0 0 1-4 4.9"/></svg>',
  };

  spots.forEach(function(spot){
    var primaryType=(spot.feature_types&&spot.feature_types[0])||'qr';
    var hasModel=primaryType==='catch'&&!!spot.model_3d;
    var baseSize=hasModel?46:36;

    var el=document.createElement('div');
    el.className='pin pin-'+primaryType;
    el.style.width=baseSize+'px';
    el.style.height=baseSize+'px';
    pinEls[spot.id]=el;

    var circle=document.createElement('div');
    circle.className='pin-circle';
    el.appendChild(circle);

    if(hasModel){
      var mv=document.createElement('model-viewer');
      mv.setAttribute('src',spot.model_3d);
      mv.setAttribute('auto-rotate','');
      mv.setAttribute('rotation-per-second','28deg');
      mv.setAttribute('disable-zoom','');
      mv.setAttribute('interaction-prompt','none');
      mv.setAttribute('exposure','1.1');
      circle.appendChild(mv);
    } else {
      circle.innerHTML=ICON_SVG[primaryType]||ICON_SVG.qr;
    }

    var label=document.createElement('div');
    label.className='pin-label';
    label.innerText=TYPE_LABEL[primaryType]||'QR';
    label.style.background=TYPE_COLOR[primaryType]||TYPE_COLOR.qr;
    el.appendChild(label);

    var marker = new mapboxgl.Marker({element: el, anchor: 'bottom'})
      .setLngLat([spot.longitude, spot.latitude])
      .addTo(map);
      
    el.addEventListener('click', function(){
      if(selectedId!==null&&pinEls[selectedId]) pinEls[selectedId].classList.remove('selected');
      selectedId=spot.id;
      el.classList.add('selected');
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
        JSON.stringify({type:'SPOT_SELECTED',spot:spot})
      );
    });
  });

  // Show user location dot
  var currentHeading = 0;
  var isNavigating = false;

  function showUserLocation(lat, lng, heading, isNav){
    if(userMarker) {
      userMarker.setLngLat([lng, lat]);
      if(isNav && userMarker.getElement().className === 'nav-arrow') {
        userMarker.setRotation(heading || 0);
      } else if (!isNav && userMarker.getElement().className === 'user-dot') {
        // do nothing
      } else {
        userMarker.remove();
        userMarker = null;
      }
    }
    
    if(!userMarker) {
      var el = document.createElement('div');
      if (isNav) {
        el.className = 'nav-arrow';
        el.innerHTML = '<svg viewBox="0 0 100 100"><polygon points="50,15 85,85 50,70 15,85" fill="#3B82F6" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"/></svg>';
      } else {
        el.className = 'user-dot';
      }
      userMarker = new mapboxgl.Marker({element: el, rotationAlignment: isNav ? 'map' : 'auto', pitchAlignment: isNav ? 'map' : 'auto'})
        .setLngLat([lng, lat])
        .addTo(map);
      if (isNav) userMarker.setRotation(heading || 0);
    }
  }

  // Draw route using Mapbox Directions API
  function drawRoute(fromLat,fromLng,toLat,toLng){
    clearRoute();
    showUserLocation(fromLat,fromLng, currentHeading, isNavigating);

    var url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + fromLng + ',' + fromLat + ';' + toLng + ',' + toLat + '?geometries=geojson&access_token=' + mapboxgl.accessToken;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if(data.routes && data.routes.length > 0){
          var route = data.routes[0];
          var geojson = {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          };

          if (map.getSource('route')) {
            map.getSource('route').setData(geojson);
          } else {
            map.addSource('route', {
              type: 'geojson',
              data: geojson
            });
            map.addLayer({
              id: routeLineId,
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#3B82F6',
                'line-width': 5,
                'line-opacity': 0.85
              }
            });
          }

          // Fit bounds
          var coordinates = route.geometry.coordinates;
          var bounds = coordinates.reduce(function(bounds, coord) {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
          map.fitBounds(bounds, { padding: 40 });

          var distKm = (route.distance / 1000).toFixed(1);
          var mins = Math.ceil(route.duration / 60);
          window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
            JSON.stringify({type:'ROUTE_INFO',distKm:distKm,mins:mins})
          );
        } else {
          window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
            JSON.stringify({type:'ROUTE_ERROR'})
          );
        }
      })
      .catch(err => {
        window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
          JSON.stringify({type:'ROUTE_ERROR'})
        );
      });
  }

  function clearRoute(){
    if(map.getLayer(routeLineId)) map.removeLayer(routeLineId);
    if(map.getSource('route')) map.removeSource('route');
    if(userMarker){ userMarker.remove(); userMarker=null; }
  }

  window.addEventListener('message',function(e){
    try{
      var msg=JSON.parse(e.data);
      if(msg.type==='FLY_TO') map.flyTo({center: [msg.lng, msg.lat], zoom: 15});
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
        showUserLocation(msg.lat,msg.lng, 0, false);
        map.flyTo({center: [msg.lng, msg.lat], zoom: 14});
      }
      if(msg.type==='START_NAVIGATION'){
        isNavigating = true;
        currentHeading = msg.heading || 0;
        showUserLocation(msg.lat, msg.lng, currentHeading, true);
        map.flyTo({ center: [msg.lng, msg.lat], zoom: 18, pitch: 60, bearing: currentHeading, speed: 1.5 });
        
        [100, 300, 600, 1000].forEach(t => setTimeout(() => {
          map.resize();
          window.dispatchEvent(new Event('resize'));
        }, t));
      }
      if(msg.type==='STOP_NAVIGATION'){
        isNavigating = false;
        map.easeTo({ pitch: 0, bearing: 0 });
        if(userMarker) {
           var lngLat = userMarker.getLngLat();
           showUserLocation(lngLat.lat, lngLat.lng, 0, false);
        }
        
        [100, 300, 600, 1000].forEach(t => setTimeout(() => {
          map.resize();
          window.dispatchEvent(new Event('resize'));
        }, t));
      }
      if(msg.type==='UPDATE_LOCATION'){
        if (isNavigating) {
          showUserLocation(msg.lat, msg.lng, currentHeading, true);
          map.easeTo({ center: [msg.lng, msg.lat], duration: 1000 });
        } else {
          showUserLocation(msg.lat, msg.lng, 0, false);
        }
      }
      if(msg.type==='UPDATE_HEADING'){
        currentHeading = msg.heading;
        if(isNavigating && userMarker){
          userMarker.setRotation(currentHeading);
          map.easeTo({ bearing: currentHeading, duration: 200 });
        }
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
  const [arNavVisible, setArNavVisible] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const locationSub = useRef(null);
  const headingSub = useRef(null);
  const webviewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(CARD_HEIGHT)).current;
  const routeBannerAnim = useRef(new Animated.Value(-80)).current;
  const [errorModal, setErrorModal] = useState({ visible: false, type: 'error', title: '', message: '' });
  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });

  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) {
          // Swipe up
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }).start();
        } else if (gestureState.dy > 30) {
          // Swipe down
          if (isNavigating) {
            Animated.spring(slideAnim, { toValue: CARD_HEIGHT - 60, useNativeDriver: true, tension: 65, friction: 10 }).start();
          } else {
            Animated.spring(slideAnim, { toValue: CARD_HEIGHT, useNativeDriver: true, tension: 65, friction: 10 }).start();
            webviewRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'DESELECT'})}));true;`);
          }
        }
      }
    })
  ).current;

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
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy });
    })();
  }, []);

  // ── Navigation Tracking ───────────────────────────────────────────────────
  useEffect(() => {
    if (isNavigating) {
      (async () => {
        locationSub.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 }, (loc) => {
          webviewRef.current?.injectJavaScript(`
            window.dispatchEvent(new MessageEvent('message',{
              data: JSON.stringify({ type: 'UPDATE_LOCATION', lat: ${loc.coords.latitude}, lng: ${loc.coords.longitude} })
            }));
            true;
          `);
        });
        headingSub.current = await Location.watchHeadingAsync((hdg) => {
          const h = hdg.trueHeading >= 0 ? hdg.trueHeading : hdg.magHeading;
          webviewRef.current?.injectJavaScript(`
            window.dispatchEvent(new MessageEvent('message',{
              data: JSON.stringify({ type: 'UPDATE_HEADING', heading: ${h} })
            }));
            true;
          `);
        });
      })();
    } else {
      locationSub.current?.remove();
      headingSub.current?.remove();
    }
    return () => {
      locationSub.current?.remove();
      headingSub.current?.remove();
    };
  }, [isNavigating]);

  const mapboxHTML = useMemo(() => buildMapboxHTML(spots), [spots]);

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
        showErr('Directions Unavailable', 'Could not calculate a route to this spot. Make sure you have an internet connection.', 'warning');
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

    if (routeInfo) {
      if (!cameraPerm?.granted) {
        const p = await requestCameraPerm();
        if (!p.granted) {
          showErr('Camera Required', 'Camera permission is needed for AR Navigation.');
          return;
        }
      }

      setIsNavigating(true);
      webviewRef.current?.injectJavaScript(`
        window.dispatchEvent(new MessageEvent('message',{
          data: JSON.stringify({ type: 'START_NAVIGATION', lat: ${userLocation.lat}, lng: ${userLocation.lng} })
        }));
        true;
      `);
      Animated.spring(slideAnim, {
        toValue: CARD_HEIGHT - 60, useNativeDriver: true, tension: 65, friction: 10
      }).start();
      return;
    }

    let loc = userLocation;

    // Re-fetch location if not available
    if (!loc) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showErr('Location Required', 'Please enable location permissions to get directions.', 'warning');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      loc = { lat: result.coords.latitude, lng: result.coords.longitude, accuracy: result.coords.accuracy };
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
    setIsNavigating(false);
    Animated.timing(routeBannerAnim, {
      toValue: -80, duration: 200, useNativeDriver: true,
    }).start();
    webviewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'STOP_NAVIGATION'})}));
      window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'CLEAR_ROUTE'})}));
      true;
    `);
  };

  // ── Show my location button ───────────────────────────────────────────────
  const handleMyLocation = async () => {
    let loc = userLocation;
    if (!loc) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showErr('Location Required', 'Please enable location permissions.', 'warning');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      loc = { lat: result.coords.latitude, lng: result.coords.longitude, accuracy: result.coords.accuracy };
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
      catch: { label: 'CATCH ZONE',  icon: 'trophy-outline',color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
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
        {isNavigating && cameraPerm?.granted && (
          <ARNavigationOverlay
            icon={{
              id: selectedSpot.id,
              name: selectedSpot.name,
              tagline: selectedSpot.description || '',
              about: '',
              significance: '',
              color: getBadgeConfig(selectedSpot.feature_types?.[0] || 'qr').color,
              glow: getBadgeConfig(selectedSpot.feature_types?.[0] || 'qr').color + '55',
              model_3d: selectedSpot.model_3d
                ? String(selectedSpot.model_3d).replace(/^http:\/\//, 'https://')
                : null
            }}
            spot={selectedSpot}
            userLocation={userLocation}
            hideBottomPanel={true}
            onClose={() => {
              setIsNavigating(false);
            }}
          />
        )}
        
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
          <View pointerEvents="auto" style={isNavigating ? styles.miniMapContainer : styles.fullMapContainer}>
            <WebView
              ref={webviewRef}
              source={{ html: mapboxHTML, baseUrl: 'https://localhost' }}
              style={styles.webview}
              onMessage={handleMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
              scrollEnabled={false}
              mixedContentMode="always"
              allowUniversalAccessFromFileURLs={true}
            />
          </View>
        )}

        {/* Legend */}
        {!loading && !error && (
          <View style={styles.legend}>
            {[
              { color: '#1A56DB', label: 'QR Scan', icon: 'qr-code-outline' },
              { color: '#10B981', label: 'AR Exhibit', icon: 'cube-outline' },
              { color: '#FBBF24', label: 'Catch Zone', icon: 'trophy-outline' },
            ].map(item => (
              <View key={item.label} style={styles.legendRow}>
                <View style={[styles.legendIconDot, { backgroundColor: item.color, shadowColor: item.color, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 }]}>
                  <Ionicons name={item.icon} size={9} color="#fff" />
                </View>
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
              <Text style={styles.routeBannerCloseText}>{isNavigating ? 'Exit' : 'Clear'}</Text>
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
            {...panResponder.panHandlers}
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
                  <Ionicons name="camera" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.directionsBtnText}>Travel Now</Text>
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

      {/* ── Error Modal ── */}
      <ErrorModal
        visible={errorModal.visible}
        type={errorModal.type}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal(prev => ({ ...prev, visible: false }))}
      />
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
  fullMapContainer: { flex: 1, backgroundColor: COLORS.bg },
  webview: { flex: 1, backgroundColor: 'transparent', opacity: 0.99 },
  miniMapContainer: {
    position: 'absolute',
    bottom: CARD_HEIGHT + 20,
    right: 20,
    width: 140,
    height: 180,
    backgroundColor: '#EEF3FF',
    opacity: 0.99,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 99,
    zIndex: 9999
  },
  miniMapWebview: { flex: 1, backgroundColor: '#EEF3FF' },
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
  legendIconDot: { width: 16, height: 16, borderRadius: 8, marginRight: 7, justifyContent: 'center', alignItems: 'center' },
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
