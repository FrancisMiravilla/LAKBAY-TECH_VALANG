import React, { useMemo, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, StatusBar, ImageBackground, ScrollView, TextInput,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, BG_OVERLAY } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import VintaStripe from '../components/VintaStripe';
import { HELP_SECTIONS } from '../constants/helpFaq';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SHORTCUTS = [
  { icon: 'lock-closed-outline', label: 'Privacy & Security', route: 'PrivacySecurity' },
  { icon: 'create-outline', label: 'Edit Profile & Avatar', route: 'EditProfile' },
  { icon: 'megaphone-outline', label: 'My Promotions', route: 'MyPromotions' },
];

function Question({ item, open, onToggle }) {
  return (
    <View style={styles.qWrap}>
      <TouchableOpacity style={styles.qRow} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.qText}>{item.q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
      {open && <Text style={styles.aText}>{item.a}</Text>}
    </View>
  );
}

export default function HelpSupportScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState(null);

  const sections = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return HELP_SECTIONS;
    return HELP_SECTIONS
      .map((s) => ({
        ...s,
        items: s.items.filter((it) => {
          const hay = `${it.q} ${it.a} ${s.title}`.toLowerCase();
          return words.every((w) => hay.includes(w));
        }),
      }))
      .filter((s) => s.items.length);
  }, [query]);

  const searching = query.trim().length > 0;

  const toggle = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenKey((k) => (k === key ? null : key));
  };

  return (
    <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.bgImage} resizeMode="cover">
      <View style={styles.bgOverlay} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>
        <VintaStripe height={3} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search questions (e.g. XP, coins, password)"
              placeholderTextColor={COLORS.textFaint}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searching && (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {sections.length === 0 && (
            <VintaCard contentStyle={styles.card}>
              <Text style={styles.emptyTitle}>No matching questions</Text>
              <Text style={styles.emptyText}>Try a shorter word, like “QR”, “AR”, “catch”, “coins” or “level”.</Text>
            </VintaCard>
          )}

          {sections.map((s, si) => (
            <VintaCard key={s.key} style={si > 0 && styles.gap} contentStyle={styles.card}>
              <View style={styles.sectionHead}>
                <View style={styles.sectionIcon}>
                  <Ionicons name={s.icon} size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.cardTitle}>{s.title}</Text>
              </View>
              {s.items.map((it, i) => {
                const key = `${s.key}-${i}`;
                return (
                  <View key={key}>
                    {i > 0 && <View style={styles.divider} />}
                    <Question item={it} open={searching || openKey === key} onToggle={() => toggle(key)} />
                  </View>
                );
              })}
            </VintaCard>
          ))}

          <VintaCard style={styles.gap} contentStyle={styles.card}>
            <Text style={styles.cardTitle}>Quick Links</Text>
            {SHORTCUTS.map((l, i) => (
              <View key={l.route}>
                {i > 0 && <View style={styles.divider} />}
                <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate(l.route)} activeOpacity={0.7}>
                  <Ionicons name={l.icon} size={18} color={COLORS.accent} />
                  <Text style={styles.linkText}>{l.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textFaint} />
                </TouchableOpacity>
              </View>
            ))}
          </VintaCard>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BG_OVERLAY },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    height: 60, backgroundColor: 'rgba(8, 20, 60, 0.70)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.pill,
    paddingHorizontal: 14, height: 46, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.navy, paddingVertical: 0 },
  gap: { marginTop: 16 },
  card: { padding: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sectionIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.accentSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.navy },
  qWrap: { paddingVertical: 4 },
  qRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  qText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.navy, lineHeight: 20 },
  aText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSub, lineHeight: 20, paddingBottom: 10 },
  divider: { height: 1, backgroundColor: COLORS.borderLight },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.navy, marginBottom: 4 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSub, lineHeight: 19 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  linkText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.navy },
});
