import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { getSpots } from '../api/qrService';
import { COLORS, FONTS, SIZES, RADIUS, SPACING } from '../constants/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const CARD_HEIGHT = 220;

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
    }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:100%;height:100%;background:#0D0520;overflow:hidden;}
    #map{width:100%;height:100%;}
    .leaflet-container{background:#0D0520;}
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
    .leaflet-popup-content-wrapper{
      background:rgba(13,5,32,0.95);border:1px solid rgba(233,30,140,0.3);
      border-radius:10px;color:#fff;font-family:sans-serif;
    }
    .leaflet-popup-tip{background:rgba(13,5,32,0.95);}
    .leaflet-popup-close-button{color:#fff!important;}
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  var TYPE_COLOR={qr:'#1A56DB',ar:'#10B981',catch:'#FBBF24'};
  var spots=${JSON.stringify(markers)};
  var selectedId=null;
  var pinEls={};

  var map=L.map('map',{center:[6.9214,122.0790],zoom:12,zoomControl:true});

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
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
        if(selectedId!==null && pinEls[selectedId]) pinEls[selectedId].classList.remove('selected');
        selectedId=spot.id;
        el.classList.add('selected');
        window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
          JSON.stringify({type:'SPOT_SELECTED',spot:spot})
        );
      });
  });

  window.addEventListener('message',function(e){
    try{
      var msg=JSON.parse(e.data);
      if(msg.type==='FLY_TO') map.flyTo([msg.lat,msg.lng],15);
      if(msg.type==='DESELECT'){
        if(selectedId!==null && pinEls[selectedId]) pinEls[selectedId].classList.remove('selected');
        selectedId=null;
      }
    }catch(err){}
  });
})();
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const webviewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(CARD_HEIGHT)).current;

  useEffect(() => {
    getSpots()
      .then(data => setSpots(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => setError('Could not load map spots. Check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  const leafletHTML = useMemo(() => buildLeafletHTML(spots), [spots]);

  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SPOT_SELECTED') {
        setSelectedSpot(msg.spot);
        Animated.spring(slideAnim, {
          toValue: 0, useNativeDriver: true, tension: 65, friction: 10,
        }).start();
      }
    } catch {}
  };

  const dismissCard = () => {
    Animated.timing(slideAnim, {
      toValue: CARD_HEIGHT, duration: 240, useNativeDriver: true,
    }).start(() => setSelectedSpot(null));
    webviewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'DESELECT'})}));true;`
    );
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
      </View>

      {/* ── Bottom Sheet Card ── */}
      {selectedSpot && (
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
          <View style={styles.spotTypeBadge}>
            <Ionicons name="scan-outline" size={10} color={COLORS.accent} style={{ marginRight: 4 }} />
            <Text style={styles.spotTypeBadgeText}>QR SPOT</Text>
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

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          {!!selectedSpot.description && (
            <Text style={styles.spotDesc} numberOfLines={3}>{selectedSpot.description}</Text>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.fontLg,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.fontSm,
    color: COLORS.textSub,
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.bg,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.fontSm,
    color: COLORS.textSub,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(13,5,32,0.90)',
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 7,
  },
  legendText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.text,
  },
  legendCount: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'right',
  },
  legendDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 6,
  },

  // ── Bottom Sheet ──
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#130929',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(233,30,140,0.25)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardClose: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  cardCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  spotTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(233,30,140,0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(233,30,140,0.35)',
    marginBottom: 10,
  },
  spotTypeBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  spotName: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 6,
    paddingRight: 36,
    lineHeight: 26,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  spotLocation: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.fontSm,
    color: COLORS.accent,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  spotDesc: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.fontSm,
    color: COLORS.textSub,
    lineHeight: 20,
  },
});
