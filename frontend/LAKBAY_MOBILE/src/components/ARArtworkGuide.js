import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { GUIDE_IMAGE, useGuideVoice, Waveform } from './guideVoice';

const { height: SCREEN_H } = Dimensions.get('window');

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export const artworkGuideScript = (art, rarityLabel) => {
  const parts = [`You found ${clean(art.name) || 'an artwork'}!`];
  if (art.already_collected) {
    parts.push('This one is already in your collection.');
  } else {
    parts.push(`It's a ${rarityLabel.toLowerCase()} artwork, so you earn ${art.earnedXP} XP.`);
  }
  if (clean(art.spot_name)) parts.push(`It belongs to ${clean(art.spot_name)}.`);
  if (clean(art.description)) parts.push(clean(art.description));
  return parts.join(' ');
};

// Shown over the camera when an artwork is recognized: the guide reads out the
// title and every detail while the 3D model stays visible on the painting.
export default function ARArtworkGuide({ art, rarityTheme, onScanAnother }) {
  const [collapsed, setCollapsed] = useState(false);
  const script = useMemo(() => artworkGuideScript(art, rarityTheme.label), [art, rarityTheme.label]);
  const { typed, speaking, say, stop } = useGuideVoice();

  useEffect(() => {
    setCollapsed(false);
    say(script);
    return stop;
  }, [script, say, stop]);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Image source={GUIDE_IMAGE} style={styles.guide} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <View style={[styles.rarityPill, { backgroundColor: rarityTheme.color + '26', borderColor: rarityTheme.color }]}>
              <Text style={[styles.rarityText, { color: rarityTheme.color }]} numberOfLines={1}>
                {rarityTheme.label} · Building {art.building || 'S2'} · Slot #{art.slot_number || 1}
              </Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>{art.name}</Text>
            {!art.already_collected && (
              <Text style={styles.xp}>+{art.earnedXP} XP</Text>
            )}
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => (speaking ? stop() : say(script))}
              accessibilityLabel={speaking ? 'Stop the guide' : 'Hear the guide again'}
            >
              <Ionicons name={speaking ? 'stop' : 'volume-high'} size={16} color={COLORS.gold} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setCollapsed((c) => !c)}
              accessibilityLabel={collapsed ? 'Show details' : 'Hide details'}
            >
              <Ionicons name={collapsed ? 'chevron-up' : 'chevron-down'} size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {!collapsed && (
          <>
            {speaking && <View style={styles.wave}><Waveform speaking color={COLORS.gold} /></View>}
            <ScrollView style={styles.textScroll} nestedScrollEnabled>
              <Text style={styles.speech}>
                {typed}
                <Text style={styles.ghost}>{script.slice(typed.length)}</Text>
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.scanBtn} onPress={onScanAnother} activeOpacity={0.85}>
              <Ionicons name="scan-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.scanText}>Scan Another</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, bottom: 24, zIndex: 20 },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guide: { width: 52, height: 62 },
  rarityPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  rarityText: { fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.4 },
  title: { fontFamily: FONTS.bold, fontSize: 17, color: '#FFF' },
  xp: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold, marginTop: 2 },
  headerBtns: { gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  wave: { marginTop: 8, alignItems: 'flex-start' },
  textScroll: { maxHeight: SCREEN_H * 0.22, marginTop: 8 },
  speech: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.92)' },
  ghost: { color: 'transparent' },
  scanBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scanText: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFF' },
});
