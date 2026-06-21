import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS, FONTS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#181D38' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#181D38' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A0AEC0' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#E91E8C' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A0AEC0' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1e284a' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38BDF8' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2D376D' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#181D38' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A0AEC0' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0E1225' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A0AEC0' }]
  }
];

export default function MapScreen() {
  const initialRegion = {
    latitude: 6.9214,
    longitude: 122.0790,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tourist Map</Text>
        <Text style={styles.headerSubtitle}>Discover Zamboanga's Cultural Heritage</Text>
      </View>
      
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          customMapStyle={mapStyle}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* Example Pins */}
          <Marker coordinate={{ latitude: 6.9015, longitude: 122.0805 }} title="Fort Pilar" description="Historical Landmark">
            <View style={[styles.marker, { backgroundColor: COLORS.accent }]}>
              <Ionicons name="location" size={16} color="white" />
            </View>
          </Marker>

          <Marker coordinate={{ latitude: 6.8667, longitude: 122.0625 }} title="Santa Cruz Island" description="CATCH Spot">
            <View style={[styles.marker, { backgroundColor: COLORS.gold }]}>
              <Ionicons name="location" size={16} color="white" />
            </View>
          </Marker>

          <Marker coordinate={{ latitude: 6.9452, longitude: 122.0298 }} title="Yakan Weaving Village" description="Living Culture">
            <View style={[styles.marker, { backgroundColor: COLORS.teal }]}>
              <Ionicons name="location" size={16} color="white" />
            </View>
          </Marker>
        </MapView>
        
        {/* Floating Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.legendText}>AR Spot</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.gold }]} />
            <Text style={styles.legendText}>CATCH Spot</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.teal }]} />
            <Text style={styles.legendText}>QR Spot</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#FFF',
  },
  headerSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#0A0A10',
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#FFF',
    marginTop: 16,
  },
  placeholderDesc: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  legendContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: 'rgba(24, 29, 56, 0.9)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#FFF',
  }
});
