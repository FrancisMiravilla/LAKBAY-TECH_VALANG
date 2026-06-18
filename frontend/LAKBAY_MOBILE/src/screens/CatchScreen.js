import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';

const INITIAL_COLLECTION = [
  { id: 'curacha',  name: 'Curacha',       emoji: '🦀', location: 'Fort Pilar Museum',      caught: true,  color: '#E91E8C' },
  { id: 'vinta',    name: 'Vinta',         emoji: '⛵', location: 'Paseo del Mar',          caught: false, color: '#4A5568' },
  { id: 'lantaka',  name: 'Lantaka',       emoji: '🏰', location: 'Fort Pilar Grounds',     caught: false, color: '#4A5568' },
  { id: 'yakan',    name: 'Yakan Weaver',  emoji: '🎨', location: 'Yakan Weaving Village',  caught: false, color: '#4A5568' },
];

export default function CatchScreen({ navigation }) {
  const [collection, setCollection] = useState(INITIAL_COLLECTION);
  const caughtCount = collection.filter(c => c.caught).length;
  const total = collection.length;
  const pct = caughtCount / total;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={COLORS.gold} style={{ marginRight: 6 }} />
          <View>
            <Text style={styles.logoTitle}>LAKBAY</Text>
            <Text style={styles.logoSub}>ZAMBOANGA CITY</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="notifications-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Sub Header */}
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>CATCH</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Collection Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressLabel}>Collection progress</Text>
            <Text style={styles.progressValue}>
              <Text style={styles.progressCaught}>{caughtCount}</Text> / {total}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.round(pct * 100)}%` }]} />
          </View>
        </View>

        {/* Map View */}
        <View style={styles.mapCard}>
          {/* Mock Map Background using gradients / colors */}
          <View style={styles.mapBg}>
            <View style={styles.mapGridLineV1} />
            <View style={styles.mapGridLineV2} />
            <View style={styles.mapGridLineH1} />
            <View style={styles.mapGridLineH2} />
            
            {/* Mock terrain arc */}
            <View style={styles.terrainArc} />
            <View style={styles.terrainCircle1} />
            <View style={styles.terrainCircle2} />
            
            <View style={styles.compassMock}>
              <Text style={styles.compassN}>N</Text>
              <Text style={styles.compassArrow}>↑</Text>
            </View>

            {/* Mock Nodes */}
            <TouchableOpacity 
              style={[styles.mapNode, { bottom: '25%', left: '15%' }]}
              onPress={() => navigation.navigate('CatchDetails')}
              activeOpacity={0.8}
            >
              <View style={[styles.nodePin, { backgroundColor: '#E91E8C', shadowColor: '#E91E8C', shadowOpacity: 0.8, shadowRadius: 10 }]}>
                <Text style={styles.nodeEmoji}>🦀</Text>
              </View>
              <Text style={styles.nodeLabel}>Curacha</Text>
              <Text style={styles.nodeSubLabel}>ZAMBOANGA CITY</Text>
            </TouchableOpacity>

            <View style={[styles.mapNode, { top: '30%', left: '45%' }]}>
              <View style={[styles.nodePin, { backgroundColor: '#4A5568' }]}>
                <Text style={styles.nodeEmoji}>⛵</Text>
              </View>
              <Text style={styles.nodeLabel}>Vinta</Text>
            </View>

            <View style={[styles.mapNode, { top: '30%', right: '15%' }]}>
              <View style={[styles.nodePin, { backgroundColor: '#4A5568' }]}>
                <Text style={styles.nodeEmoji}>🏰</Text>
              </View>
              <Text style={styles.nodeLabel}>Lantaka</Text>
            </View>

            <View style={[styles.mapNode, { bottom: '25%', right: '15%' }]}>
              <View style={[styles.nodePin, { backgroundColor: '#4A5568' }]}>
                <Text style={styles.nodeEmoji}>🎨</Text>
              </View>
              <Text style={styles.nodeLabel}>Yakan</Text>
            </View>

            <Text style={styles.mapScaleLabel}>📏 5 km</Text>
          </View>
        </View>

        {/* Your Collection */}
        <Text style={styles.sectionTitle}>Your collection</Text>
        <View style={styles.collectionGrid}>
          {collection.map(item => (
            <View key={item.id} style={styles.collectionCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconRing, { borderColor: item.color, shadowColor: item.color, backgroundColor: item.color + '22' }]}>
                  <Text style={styles.cardIconEmoji}>{item.emoji}</Text>
                </View>
                <View style={[styles.statusBadge, item.caught ? styles.statusCaught : styles.statusNotCaught]}>
                  <Text style={[styles.statusText, item.caught && { color: '#10B981' }]}>
                    {item.caught ? 'Caught' : 'Not caught'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>{item.location}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 32, marginBottom: 40 }}>
          <CustomButton 
            title="Start Capturing" 
            onPress={() => alert('Starting AR Capture Mode...')} 
            variant="primary" 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  /* ── Headers ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    backgroundColor: '#C8175A', // Gradient mock
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoTitle: { fontFamily: FONTS.pixel, fontSize: 9, color: '#FFF', letterSpacing: 1, lineHeight: 16 },
  logoSub: { fontFamily: FONTS.medium, fontSize: 8, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  headerBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center'
  },
  
  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 48, backgroundColor: '#1A0A30',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
  subHeaderTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFF', letterSpacing: 1 },

  scroll: { padding: 16 },

  /* ── Progress Card ── */
  progressCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border
  },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFF' },
  progressValue: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.textMuted },
  progressCaught: { color: COLORS.gold },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 3 },

  /* ── Map Card ── */
  mapCard: {
    height: 220,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: COLORS.accent,
    marginBottom: 24
  },
  mapBg: { flex: 1, backgroundColor: '#1A202C', position: 'relative' },
  mapGridLineV1: { position: 'absolute', left: '33%', width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  mapGridLineV2: { position: 'absolute', left: '66%', width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  mapGridLineH1: { position: 'absolute', top: '33%', height: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  mapGridLineH2: { position: 'absolute', top: '66%', height: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  terrainArc: { position: 'absolute', bottom: -50, left: -50, width: 500, height: 200, borderRadius: 250, backgroundColor: '#2D3748', opacity: 0.5 },
  terrainCircle1: { position: 'absolute', top: '20%', left: '5%', width: 40, height: 40, borderRadius: 20, backgroundColor: '#2D3748', opacity: 0.3 },
  terrainCircle2: { position: 'absolute', bottom: '10%', right: '5%', width: 60, height: 30, borderRadius: 30, backgroundColor: '#2D3748', opacity: 0.3 },
  
  compassMock: { position: 'absolute', top: 10, right: 10, alignItems: 'center' },
  compassN: { color: '#A0AEC0', fontSize: 8, fontFamily: FONTS.bold },
  compassArrow: { color: '#E91E8C', fontSize: 12, marginTop: -2 },

  mapNode: { position: 'absolute', alignItems: 'center' },
  nodePin: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  nodeEmoji: { fontSize: 14 },
  nodeLabel: { fontFamily: FONTS.semiBold, fontSize: 9, color: '#E2E8F0' },
  nodeSubLabel: { fontFamily: FONTS.regular, fontSize: 7, color: '#A0AEC0', marginTop: 1 },
  mapScaleLabel: { position: 'absolute', bottom: 10, left: 10, color: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: FONTS.regular },

  /* ── Collection ── */
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', marginBottom: 16 },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  collectionCard: {
    width: '48%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    padding: 12,
    borderWidth: 1, borderColor: COLORS.border
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardIconRing: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  cardIconEmoji: { fontSize: 18 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1 },
  statusCaught: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  statusNotCaught: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)' },
  statusText: { fontFamily: FONTS.semiBold, fontSize: 9, color: COLORS.textMuted },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFF', marginBottom: 2 },
  cardSub: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textMuted },
});
