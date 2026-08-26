import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, View, Text, ActivityIndicator, TouchableOpacity,
  Animated, Dimensions, PanResponder, Image, ImageBackground, StatusBar, Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getSpots, ORIGIN } from '../api/qrService';
import { getPublishedPromotions } from '../api/promotionService';
import { authService } from '../api/authService';
import { COLORS, FONTS, SIZES, RADIUS, SPACING, SHADOW } from '../constants/theme';
import ErrorModal from '../components/ErrorModal';
import { useCameraPermissions } from 'expo-camera';
import ARNavigationOverlay from '../components/ARNavigationOverlay';

const { height: SCREEN_H } = Dimensions.get('window');
const CARD_HEIGHT = 240;
const NAV_MAP_HEIGHT = SCREEN_H * 0.55;
const NAV_MINIMIZED_Y = NAV_MAP_HEIGHT - 240;

// ─── Mapbox HTML Builder ───────────────────────────────────────────────────
function buildMapboxHTML(spots, userLevel = 1) {
  const markers = spots
    .filter(s => s.latitude && s.longitude)
    .map(s => {
      const isQr = (s.feature_types || []).includes('qr');
      const reqLvl = s.required_level || 1;
      const isLocked = isQr && (reqLvl > userLevel);
      return {
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        location_name: s.location_name || '',
        description: s.description || '',
        feature_types: s.feature_types || [],
        required_level: reqLvl,
        xp_reward: s.xp_reward || 50,
        is_locked: isLocked,
        is_qr: isQr,
        model_3d: s.model_3d ? String(s.model_3d).replace(/^http:\/\//, 'https://') : null,
        image: s.image ? String(s.image).replace(/^http:\/\//, 'https://') : null,
      };
    });

  const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your_mapbox_token_here';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
  <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>
  <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css" type="text/css">
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
    .pin-promotion .pin-circle{ background:#EC4899; box-shadow:0 0 10px rgba(236,72,153,0.7),0 0 0 4px rgba(236,72,153,0.2); }
    .pin.is-locked .pin-circle{
      border-color:#EF4444!important;
      box-shadow:0 0 10px rgba(239,68,68,0.7),0 0 0 3px rgba(239,68,68,0.25)!important;
      filter:grayscale(0.35);
    }
    .pin-lock-badge{
      position:absolute; top:-6px; right:-6px;
      background:#EF4444; border:1.5px solid #fff; color:#fff;
      font-size:8px; font-weight:900; border-radius:8px;
      padding:1px 3px; display:flex; align-items:center; justify-content:center;
      z-index:5; box-shadow:0 2px 4px rgba(0,0,0,0.5);
    }
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

  function nominatimGeocoder(query) {
    return fetch('https://nominatim.openstreetmap.org/search?format=geojson&email=contact@lakbay.ph&q=' + encodeURIComponent(query))
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        return data.features.map(function(f) {
          f.place_name = f.properties.display_name;
          f.text = f.properties.name || f.properties.display_name.split(',')[0];
          f.center = f.geometry.coordinates;
          return f;
        });
      })
      .catch(function(e) {
        console.error(e);
        return [];
      });
  }

  var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: false,
    externalGeocoder: nominatimGeocoder
  });
  map.addControl(geocoder, 'top-left');

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  var TYPE_COLOR={qr:'#1A56DB',ar:'#10B981',catch:'#FBBF24',promotion:'#EC4899'};
  var TYPE_LABEL={qr:'QR',ar:'AR',catch:'CATCH',promotion:'PROMO'};
  var ICON_SVG={
    ar:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg>',
    qr:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" fill="#fff" stroke="none"/><rect x="18" y="18" width="3" height="3" fill="#fff" stroke="none"/><rect x="14" y="18" width="3" height="3" fill="#fff" stroke="none"/></svg>',
    catch:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 5H4a1 1 0 0 0-1 1 5 5 0 0 0 4 4.9M17 5h3a1 1 0 0 1 1 1 5 5 0 0 1-4 4.9"/></svg>',
    promotion:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  };

  spots.forEach(function(spot){
    var primaryType=(spot.feature_types&&spot.feature_types[0])||'qr';
    var hasModel=(primaryType==='catch'||primaryType==='promotion')&&!!spot.model_3d;
    var hasPic=(primaryType==='promotion')&&!!spot.image&&!hasModel;
    var baseSize=hasModel?46:(hasPic?40:36);

    var el=document.createElement('div');
    el.className='pin pin-'+primaryType + (spot.is_locked ? ' is-locked' : '');
    el.style.width=baseSize+'px';
    el.style.height=baseSize+'px';
    pinEls[spot.id]=el;

    var circle=document.createElement('div');
    circle.className='pin-circle';
    el.appendChild(circle);

    if (spot.is_locked) {
      var lockBadge = document.createElement('div');
      lockBadge.className = 'pin-lock-badge';
      lockBadge.innerText = '🔒';
      el.appendChild(lockBadge);
    }

    if(hasModel){
      var mv=document.createElement('model-viewer');
      mv.setAttribute('src',spot.model_3d);
      mv.setAttribute('auto-rotate','');
      mv.setAttribute('rotation-per-second','28deg');
      mv.setAttribute('disable-zoom','');
      mv.setAttribute('interaction-prompt','none');
      mv.setAttribute('exposure','1.1');
      circle.appendChild(mv);
    } else if (hasPic) {
      var img = document.createElement('img');
      img.src = spot.image;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      circle.appendChild(img);
    } else {
      circle.innerHTML=ICON_SVG[primaryType]||ICON_SVG.qr;
    }

    var label=document.createElement('div');
    label.className='pin-label';
    if (spot.is_locked) {
      label.innerText='🔒 LVL ' + (spot.required_level || 1);
      label.style.background='#EF4444';
    } else if (spot.is_qr) {
      label.innerText=(TYPE_LABEL[primaryType]||'QR') + ' · L' + (spot.required_level || 1);
      label.style.background=TYPE_COLOR[primaryType]||TYPE_COLOR.qr;
    } else {
      label.innerText=TYPE_LABEL[primaryType]||'PIN';
      label.style.background=TYPE_COLOR[primaryType]||'#1A56DB';
    }
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
        map.flyTo({ center: [msg.lng, msg.lat], zoom: 18, pitch: 60, bearing: currentHeading, speed: 1.5, padding: { bottom: ${NAV_MINIMIZED_Y} } });
        
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
  const [profile, setProfile] = useState(null);
  const userXp = profile?.xp || 0;
  const userLevel = Math.floor(userXp / 100) + 1;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);   // { distKm, mins }
  const [routing, setRouting] = useState(false);       // routing in progress
  const [arNavVisible, setArNavVisible] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [proximitySpot, setProximitySpot] = useState(null); // spot user is near
  const proximityDismissed = useRef(new Set());             // ids dismissed this session
  const proximityAnim = useRef(new Animated.Value(120)).current; // slides up from bottom
  const locationSub = useRef(null);
  const headingSub = useRef(null);
  const webviewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(CARD_HEIGHT)).current;
  const routeBannerAnim = useRef(new Animated.Value(-80)).current;
  const [errorModal, setErrorModal] = useState({ visible: false, type: 'error', title: '', message: '' });
  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });

  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) {
          // Swipe up
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }).start();
          if (isNavigating) {
            webviewRef.current?.injectJavaScript(`map.easeTo({ padding: { bottom: 0 }, duration: 400 }); true;`);
          }
        } else if (gestureState.dy > 30) {
          // Swipe down
          if (isNavigating) {
            Animated.spring(slideAnim, { toValue: NAV_MINIMIZED_Y, useNativeDriver: true, tension: 65, friction: 10 }).start();
            webviewRef.current?.injectJavaScript(`map.easeTo({ padding: { bottom: ${NAV_MINIMIZED_Y} }, duration: 400 }); true;`);
          } else {
            Animated.spring(slideAnim, { toValue: CARD_HEIGHT, useNativeDriver: true, tension: 65, friction: 10 }).start();
            webviewRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'DESELECT'})}));true;`);
          }
        }
      }
    }),
    [isNavigating, slideAnim]
  );

  // ── Haversine distance (metres) ───────────────────────────────────────────
  const haversineMetres = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const PROXIMITY_RADIUS_M = 50; // metres — tweak as needed

  const showProximityPopup = (spot) => {
    setProximitySpot(spot);
    Animated.spring(proximityAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 10,
    }).start();
  };

  const hideProximityPopup = (dismiss = false) => {
    Animated.timing(proximityAnim, {
      toValue: 120, duration: 220, useNativeDriver: true,
    }).start(() => setProximitySpot(null));
    if (dismiss && proximitySpot) {
      proximityDismissed.current.add(proximitySpot.id);
    }
  };

  // ── Load spots & user profile ─────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getSpots(),
      getPublishedPromotions().catch(() => []),
      authService.getProfile().catch(() => null),
    ])
      .then(([spotsData, promosData, profileData]) => {
        if (profileData) setProfile(profileData);
        const parsedSpots = Array.isArray(spotsData) ? spotsData : (spotsData.results || []);
        const parsedPromos = Array.isArray(promosData) ? promosData : (promosData.results || []);
        
        const mappedPromos = parsedPromos.map(p => ({
          ...p,
          name: p.spot_name,
          location_name: 'User Promotion',
          feature_types: ['promotion'],
          required_level: 1,
          xp_reward: 50,
          model_3d: p.model_3d_file ? (p.model_3d_file.startsWith('http') ? p.model_3d_file : ORIGIN + p.model_3d_file) : null,
          image: p.image_file ? (p.image_file.startsWith('http') ? p.image_file : ORIGIN + p.image_file) : null
        }));
        
        setSpots([...parsedSpots, ...mappedPromos]);
      })
      .catch(() => setError('Could not load map spots. Check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Request location permission on mount and watch GPS position ──────────
  useEffect(() => {
    let watcher = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy };
        setUserLocation(coords);

        // Immediately show user location pin on map
        webviewRef.current?.injectJavaScript(`
          window.dispatchEvent(new MessageEvent('message',{
            data: JSON.stringify({ type: 'SHOW_USER', lat: ${coords.lat}, lng: ${coords.lng} })
          }));
          true;
        `);

        // Continuously update user pin on map as user walks/moves
        watcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 2 },
          (newLoc) => {
            const newCoords = { lat: newLoc.coords.latitude, lng: newLoc.coords.longitude, accuracy: newLoc.coords.accuracy };
            setUserLocation(newCoords);
            if (!isNavigating) {
              webviewRef.current?.injectJavaScript(`
                window.dispatchEvent(new MessageEvent('message',{
                  data: JSON.stringify({ type: 'UPDATE_LOCATION', lat: ${newCoords.lat}, lng: ${newCoords.lng} })
                }));
                true;
              `);
            }

            // ── Proximity check ──────────────────────────────────────
            setSpots(currentSpots => {
              const nearby = currentSpots.find(s =>
                s.latitude && s.longitude &&
                !proximityDismissed.current.has(s.id) &&
                haversineMetres(newCoords.lat, newCoords.lng, parseFloat(s.latitude), parseFloat(s.longitude)) <= PROXIMITY_RADIUS_M
              );
              setProximitySpot(prev => {
                if (nearby && (!prev || prev.id !== nearby.id)) {
                  // Entered radius of a new spot — show popup
                  Animated.spring(proximityAnim, {
                    toValue: 0, useNativeDriver: true, tension: 65, friction: 10,
                  }).start();
                  return nearby;
                } else if (!nearby && prev) {
                  // Left radius — auto-dismiss
                  Animated.timing(proximityAnim, {
                    toValue: 120, duration: 220, useNativeDriver: true,
                  }).start();
                  return null;
                }
                return prev;
              });
              return currentSpots; // no mutation
            });
          }
        );
      } catch (err) {
        console.warn('GPS location tracking error:', err);
      }
    })();

    return () => {
      if (watcher) watcher.remove();
    };
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

  const mapboxHTML = useMemo(() => buildMapboxHTML(spots, userLevel), [spots, userLevel]);

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
      slideAnim.setValue(NAV_MAP_HEIGHT); // Instantly set to bottom of screen to avoid flying from CARD_HEIGHT
      webviewRef.current?.injectJavaScript(`
        window.dispatchEvent(new MessageEvent('message',{
          data: JSON.stringify({ type: 'START_NAVIGATION', lat: ${userLocation.lat}, lng: ${userLocation.lng} })
        }));
        true;
      `);
      Animated.spring(slideAnim, {
        toValue: NAV_MINIMIZED_Y, useNativeDriver: true, tension: 65, friction: 10
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
      promotion:{ label: 'PROMOTION', icon: 'star-outline',  color: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8' },
      qr:    { label: 'QR SPOT',     icon: 'scan-outline',  color: COLORS.accent, bg: COLORS.accentSoft, border: COLORS.accentBorder },
    };
    return configs[type] || configs['qr'];
  };

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.container} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>INTERACTIVE MAP</Text>
            <Text style={styles.headerSubtitle}>Discover Zamboanga's Cultural Heritage</Text>
          </View>
          <View style={styles.headerLevelChip}>
            <Ionicons name="shield-checkmark" size={13} color={COLORS.gold} />
            <Text style={styles.headerLevelText}>LVL {userLevel}</Text>
          </View>
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
              <ActivityIndicator color={COLORS.gold} size="large" />
              <Text style={styles.loadingText}>Loading map spots…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Ionicons name="warning-outline" size={40} color={COLORS.gold} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <Animated.View
              pointerEvents="auto"
              style={isNavigating ? [styles.mapAsBottomSheet, { transform: [{ translateY: slideAnim }] }] : styles.fullMapContainer}
              {...(isNavigating ? panResponder.panHandlers : {})}
            >
              {isNavigating && (
                <View style={styles.dragHandleContainer}>
                  <View style={styles.dragHandle} />
                </View>
              )}
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
            </Animated.View>
          )}

          {/* ── Legend (glass card) ── */}
          {!loading && !error && (
            <View style={styles.legend}>
              {[
                { color: '#1A56DB', label: 'QR Scan',   icon: 'qr-code-outline' },
                { color: '#10B981', label: 'AR Exhibit', icon: 'cube-outline' },
                { color: '#FBBF24', label: 'Catch Zone', icon: 'trophy-outline' },
                { color: '#EC4899', label: 'Promotion',  icon: 'star-outline' },
              ].map(item => (
                <View key={item.label} style={styles.legendRow}>
                  <View style={[styles.legendIconDot, { backgroundColor: item.color, shadowColor: item.color, shadowOpacity: 0.9, shadowRadius: 5, elevation: 4 }]}>
                    <Ionicons name={item.icon} size={9} color="#fff" />
                  </View>
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
              <View style={styles.legendDivider} />
              <Text style={styles.legendCount}>{spots.filter(s => s.latitude && s.longitude).length} spots</Text>
            </View>
          )}

          {/* ── My Location FAB ── */}
          {!loading && !error && (
            <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation} activeOpacity={0.8}>
              <Ionicons name="locate" size={20} color={COLORS.teal} />
            </TouchableOpacity>
          )}

          {/* ── Route Info Banner ── */}
          <Animated.View style={[styles.routeBanner, { transform: [{ translateY: routeBannerAnim }] }]}>
            <View style={styles.routeBannerInner}>
              <View style={styles.routeBannerLeft}>
                <Ionicons name="navigate" size={16} color={COLORS.teal} />
                <Text style={styles.routeBannerDist}>{routeInfo?.distKm} km</Text>
                <View style={styles.routeBannerDivider} />
                <Ionicons name="time-outline" size={14} color="rgba(191,215,255,0.7)" />
                <Text style={styles.routeBannerTime}>{routeInfo?.mins} min</Text>
              </View>
              <TouchableOpacity onPress={handleClearRoute} style={styles.routeBannerClose}>
                <Text style={styles.routeBannerCloseText}>{isNavigating ? 'Exit' : 'Clear'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

      {/* ── Bottom Sheet Card ── */}

      {selectedSpot && !isNavigating && (() => {
        const primaryType = (selectedSpot.feature_types && selectedSpot.feature_types[0]) || 'qr';
        const badge = getBadgeConfig(primaryType);
        const isQr = (selectedSpot.feature_types || []).includes('qr');
        const reqLvl = selectedSpot.required_level || 1;
        const isLocked = isQr && (reqLvl > userLevel);
        const xpReward = selectedSpot.xp_reward || 50;

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

            {/* Badge & Status Row */}
            <View style={styles.badgeRow}>
              <View style={[styles.spotTypeBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Ionicons name={badge.icon} size={10} color={badge.color} style={{ marginRight: 4 }} />
                <Text style={[styles.spotTypeBadgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>

              {isQr && (
                <>
                  {isLocked ? (
                    <View style={styles.lockedBadgePill}>
                      <Ionicons name="lock-closed" size={10} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.lockedBadgeText}>LOCKED · LVL {reqLvl}</Text>
                    </View>
                  ) : (
                    <View style={styles.unlockedBadgePill}>
                      <Ionicons name="checkmark-circle" size={10} color={COLORS.teal} style={{ marginRight: 4 }} />
                      <Text style={styles.unlockedBadgeText}>UNLOCKED · LVL {reqLvl}</Text>
                    </View>
                  )}

                  <View style={styles.xpRewardPill}>
                    <Ionicons name="sparkles" size={10} color={COLORS.gold} style={{ marginRight: 4 }} />
                    <Text style={styles.xpRewardPillText}>+{xpReward} XP</Text>
                  </View>
                </>
              )}
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

            {/* ── Level Lock Alert Banner ── */}
            {isLocked && (
              <View style={styles.lockedAlertCard}>
                <View style={styles.lockedAlertTop}>
                  <Ionicons name="lock-closed" size={15} color="#EF4444" />
                  <Text style={styles.lockedAlertTitle}>SPOT IS LEVEL LOCKED</Text>
                </View>
                <Text style={styles.lockedAlertText}>
                  This QR scan spot is locked! In order for you to unlock and scan this location, reach{' '}
                  <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>Explorer Level {reqLvl}</Text>{' '}
                  by collecting XP in other features.
                </Text>
                <View style={styles.lockedAlertFooter}>
                  <Text style={styles.lockedAlertXpHint}>
                    Your Level: <Text style={{ color: '#D97706', fontWeight: 'bold' }}>Level {userLevel}</Text> ({userXp % 100}/100 XP)
                  </Text>
                </View>
              </View>
            )}

            {/* Media rendering (3D Model or Image) */}
            {(selectedSpot.feature_types?.includes('catch') || selectedSpot.feature_types?.includes('promotion')) && selectedSpot.model_3d ? (
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
            ) : selectedSpot.feature_types?.includes('promotion') && selectedSpot.image ? (
              <View style={{ width: '100%', height: 180, marginTop: 12, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.card }}>
                <Image 
                  source={{ uri: selectedSpot.image.replace('http://', 'https://').startsWith('http') ? selectedSpot.image.replace('http://', 'https://') : `${ORIGIN}${selectedSpot.image}` }} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="cover" 
                />
              </View>
            ) : null}

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

      {/* ── Proximity Modal (centered) ── */}
      {proximitySpot && (() => {
        const pType = (proximitySpot.feature_types && proximitySpot.feature_types[0]) || 'qr';
        const pBadge = getBadgeConfig(pType);
        const typeEmoji = pType === 'ar' ? '📷' : pType === 'catch' ? '🏆' : pType === 'promotion' ? '📣' : '🔍';
        return (
          <Modal
            transparent
            animationType="fade"
            visible={!!proximitySpot}
            onRequestClose={() => hideProximityPopup(true)}
          >
            <View style={styles.proximityModalOverlay}>
              <View style={styles.proximityPopup}>
                {/* Colored top accent line */}
                <View style={[styles.proximityAccentBar, { backgroundColor: pBadge.color }]} />

                <View style={styles.proximityInner}>
                  {/* Icon circle */}
                  <View style={[styles.proximityIconCircle, { backgroundColor: pBadge.bg, borderColor: pBadge.border }]}>
                    <Text style={styles.proximityIconEmoji}>{typeEmoji}</Text>
                  </View>

                  <View style={styles.proximityContent}>
                    {/* Badge label */}
                    <View style={[styles.proximityBadge, { backgroundColor: pBadge.bg, borderColor: pBadge.border }]}>
                      <Ionicons name={pBadge.icon} size={8} color={pBadge.color} />
                      <Text style={[styles.proximityBadgeText, { color: pBadge.color }]}>{pBadge.label}</Text>
                    </View>

                    {/* Spot name */}
                    <Text style={styles.proximitySpotName} numberOfLines={1}>{proximitySpot.name}</Text>

                    {/* Teaser */}
                    <Text style={styles.proximityDesc} numberOfLines={2}>
                      You're nearby! Tap below to view this spot's details.
                    </Text>

                    {/* Actions row */}
                    <View style={styles.proximityActionsRow}>
                      <TouchableOpacity
                        style={[styles.proximityGotItBtn, { backgroundColor: pBadge.color }]}
                        activeOpacity={0.85}
                        onPress={() => hideProximityPopup(true)}
                      >
                        <Text style={styles.proximityGotItText}>Got it!</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.proximityViewBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          hideProximityPopup(true);
                          setSelectedSpot(proximitySpot);
                          Animated.spring(slideAnim, {
                            toValue: 0, useNativeDriver: true, tension: 65, friction: 10,
                          }).start();
                        }}
                      >
                        <Ionicons name="eye-outline" size={12} color={pBadge.color} />
                        <Text style={[styles.proximityViewText, { color: pBadge.color }]}>See Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}
    </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bgImage:   { flex: 1 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,10,38,0.82)' },
  container: { flex: 1, backgroundColor: 'transparent' },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(8,20,60,0.72)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,179,237,0.22)',
  },
  headerTitle: {
    fontFamily: FONTS.pixel || FONTS.bold,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 1.2,
    textShadowColor: COLORS.accent + '88',
    textShadowRadius: 6,
  },
  headerSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: 'rgba(191,215,255,0.65)',
    marginTop: 2,
  },
  headerLevelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerLevelText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.gold,
    letterSpacing: 0.8,
  },

  // ── Map ───────────────────────────────────────────────────────────────────
  mapContainer:    { flex: 1, position: 'relative', overflow: 'hidden' },
  fullMapContainer:{ flex: 1, backgroundColor: 'transparent' },
  webview:         { flex: 1, backgroundColor: 'transparent' },

  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(8,20,60,0.92)',
    paddingTop: 12,
    paddingBottom: 8,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99,179,237,0.25)',
  },
  mapAsBottomSheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: NAV_MAP_HEIGHT,
    backgroundColor: 'rgba(8,20,60,0.95)',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99,179,237,0.3)',
    elevation: 20,
    zIndex: 9999,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  miniMapContainer: {
    position: 'absolute',
    bottom: CARD_HEIGHT + 20,
    right: 20,
    width: 140, height: 180,
    backgroundColor: 'rgba(8,20,60,0.85)',
    opacity: 0.99,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(99,179,237,0.3)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 99,
    zIndex: 9999,
  },
  miniMapWebview: { flex: 1, backgroundColor: 'transparent' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  loadingText: { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: 'rgba(191,215,255,0.7)', marginTop: SPACING.sm },
  errorText:   { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: 'rgba(191,215,255,0.7)', marginTop: SPACING.sm, textAlign: 'center' },

  // ── Legend (glass card, top-right) ────────────────────────────────────────
  legend: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: 'rgba(8,20,60,0.82)',
    borderRadius: RADIUS.md,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(99,179,237,0.28)',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  legendRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  legendIconDot:{ width: 16, height: 16, borderRadius: 8, marginRight: 7, justifyContent: 'center', alignItems: 'center' },
  legendText:   { fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(191,215,255,0.9)' },
  legendCount:  { fontFamily: FONTS.regular, fontSize: 10, color: 'rgba(191,215,255,0.5)', marginTop: 2, textAlign: 'right' },
  legendDivider:{ height: 1, backgroundColor: 'rgba(99,179,237,0.25)', marginVertical: 5 },

  // ── My Location FAB ───────────────────────────────────────────────────────
  myLocationBtn: {
    position: 'absolute', bottom: 16, right: 16,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(8,20,60,0.85)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(99,179,237,0.4)',
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },

  // ── Route Banner ──────────────────────────────────────────────────────────
  routeBanner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(8,20,60,0.95)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(99,179,237,0.25)',
    shadowColor: COLORS.teal, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  routeBannerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeBannerDist:  { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.teal },
  routeBannerDivider: { width: 1, height: 12, backgroundColor: 'rgba(99,179,237,0.3)', marginHorizontal: 4 },
  routeBannerTime:    { fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(191,215,255,0.7)' },
  routeBannerClose: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(99,179,237,0.15)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(99,179,237,0.35)',
  },
  routeBannerCloseText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.teal },

  // ── Bottom Sheet (glass card) ─────────────────────────────────────────────
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(8,20,60,0.96)',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: SPACING.lg, paddingTop: 12,
    borderTopWidth: 1.5, borderTopColor: 'rgba(99,179,237,0.3)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 24,
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(99,179,237,0.5)',
    alignSelf: 'center', marginBottom: 14,
  },
  cardClose: { position: 'absolute', top: 20, right: 20 },
  cardCloseCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(99,179,237,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(99,179,237,0.35)',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  spotTypeBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1,
  },
  spotTypeBadgeText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  lockedBadgePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.45)',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  lockedBadgeText:   { fontFamily: FONTS.bold, fontSize: 10, color: '#EF4444', letterSpacing: 0.5 },
  unlockedBadgePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  unlockedBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: '#10B981', letterSpacing: 0.5 },
  xpRewardPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  xpRewardPillText: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.gold, letterSpacing: 0.5 },
  lockedAlertCard: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12,
  },
  lockedAlertTop:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  lockedAlertTitle:  { fontFamily: FONTS.bold, fontSize: 12, color: '#EF4444', letterSpacing: 0.5 },
  lockedAlertText:   { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(191,215,255,0.8)', lineHeight: 17, marginBottom: 6 },
  lockedAlertFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockedAlertXpHint: { fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(191,215,255,0.6)' },
  spotName:          { fontFamily: FONTS.bold, fontSize: 16, color: '#fff', marginBottom: 5, paddingRight: 36, lineHeight: 22 },
  locationRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  spotLocation:      { fontFamily: FONTS.medium, fontSize: SIZES.fontSm, color: COLORS.teal, flexShrink: 1 },
  divider:           { height: 1, backgroundColor: 'rgba(99,179,237,0.2)', marginBottom: 10 },
  spotDesc:          { fontFamily: FONTS.regular, fontSize: SIZES.fontSm, color: 'rgba(191,215,255,0.7)', lineHeight: 20, marginBottom: 14 },

  // ── Directions Button ─────────────────────────────────────────────────────
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 14, paddingVertical: 14,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  directionsBtnLoading: { backgroundColor: 'rgba(26,86,219,0.5)' },
  directionsBtnText:    { fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF' },

  // ── Proximity Modal (centered) ────────────────────────────────────────────
  proximityModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(4,10,38,0.70)',
    paddingHorizontal: 24,
  },
  proximityPopup: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(8,20,60,0.97)',
    borderRadius: RADIUS.lg, overflow: 'hidden',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 30,
    borderWidth: 1.5, borderColor: 'rgba(99,179,237,0.35)',
  },
  proximityAccentBar:  { height: 3, width: '100%' },
  proximityInner:      { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  proximityIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  proximityIconEmoji: { fontSize: 20 },
  proximityContent:   { flex: 1 },
  proximityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    borderRadius: RADIUS.pill, borderWidth: 1,
    paddingVertical: 2, paddingHorizontal: 7, marginBottom: 5,
  },
  proximityBadgeText: { fontFamily: FONTS.bold, fontSize: 8, letterSpacing: 0.8 },
  proximitySpotName: {
    fontFamily: FONTS.bold,
    fontSize: 13, color: '#fff', lineHeight: 18, marginBottom: 4,
  },
  proximityDesc: {
    fontFamily: FONTS.regular, fontSize: 10,
    color: 'rgba(191,215,255,0.65)', lineHeight: 15, marginBottom: 10,
  },
  proximityActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proximityGotItBtn: { borderRadius: RADIUS.pill, paddingVertical: 6, paddingHorizontal: 14 },
  proximityGotItText: { fontFamily: FONTS.bold, fontSize: 10, color: '#fff', letterSpacing: 0.4 },
  proximityViewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: RADIUS.pill, borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.35)',
  },
  proximityViewText: { fontFamily: FONTS.semiBold, fontSize: 10, letterSpacing: 0.3 },
});


