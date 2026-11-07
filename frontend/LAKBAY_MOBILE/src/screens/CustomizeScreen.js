import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BG_OVERLAY, GOLD_TEXT, SHADOW } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import VintaStripe from '../components/VintaStripe';
import LucideIcon from '../components/LucideIcon';
import DecoratedAvatar, { ProfileBackdrop } from '../components/DecoratedAvatar';
import { HATS, PINS } from '../constants/cosmetics';
import { authService } from '../api/authService';

// Avatar customization: pick a hat, frame, pin and profile backdrop. Items
// unlock with XP tiers; the server checks the unlock again when saving.

const TABS = [
  { slot: 'hat',      label: 'Hats',      icon: 'crown' },
  { slot: 'frame',    label: 'Frames',    icon: 'target' },
  { slot: 'pin',      label: 'Pins',      icon: 'medal' },
  { slot: 'backdrop', label: 'Backdrops', icon: 'palm' },
];
const TIER_NAMES = {
  1: 'Coastal Scout', 2: 'Vinta Helmsman', 3: 'Strait Navigator',
  4: 'Harbor Sentinel', 5: 'Archipelago Voyager', 6: 'Admiral of the Western Seas',
};

function ItemPreview({ slot, id, character }) {
  if (slot === 'backdrop') {
    return <ProfileBackdrop id={id} style={styles.previewBackdrop} />;
  }
  if (slot === 'frame') {
    return <DecoratedAvatar character={character} size={46} frame={id} />;
  }
  if (slot === 'hat') {
    return HATS[id] ? <DecoratedAvatar character={character} size={40} hat={id} /> : <Ionicons name="ban-outline" size={30} color={COLORS.textFaint} />;
  }
  return PINS[id] ? (
    <View style={[styles.pinPreview, { backgroundColor: PINS[id].bg }]}>
      <LucideIcon name={PINS[id].icon} size={24} color="#FFFFFF" />
    </View>
  ) : (
    <Ionicons name="ban-outline" size={30} color={COLORS.textFaint} />
  );
}

export default function CustomizeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({ hat: '', frame: '', pin: '', backdrop: '' });
  const [tab, setTab] = useState('hat');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setMessage(null);
    try {
      const [p, c] = await Promise.all([authService.getProfile().catch(() => null), authService.getCosmetics()]);
      setProfile(p);
      setData(c);
      setDraft(c.equipped);
    } catch (_) {
      setMessage({ error: true, text: 'Could not load your items. Check your connection and try again.' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => (data?.catalog || []).filter((i) => i.slot === tab), [data, tab]);
  const changed = data && Object.keys(draft).some((k) => draft[k] !== data.equipped[k]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await authService.saveCosmetics(draft);
      setData(res);
      setDraft(res.equipped);
      setMessage({ error: false, text: 'Look saved! Other explorers see it on the Leaderboard.' });
    } catch (e) {
      setMessage({ error: true, text: e?.response?.data?.error || 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const character = profile?.chosen_character;

  return (
    <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.root} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customize Avatar</Text>
          <View style={{ width: 40 }} />
        </View>
        <VintaStripe height={3} />

        {!data ? (
          <View style={styles.centered}>
            {message ? (
              <>
                <Text style={styles.errorText}>{message.text}</Text>
                <TouchableOpacity style={styles.saveBtn} onPress={load}>
                  <Text style={styles.saveText}>Try Again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <ActivityIndicator color={COLORS.gold} size="large" />
            )}
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Live preview */}
              <View style={styles.previewCard}>
                <ProfileBackdrop id={draft.backdrop} style={StyleSheet.absoluteFill} />
                <View style={styles.previewDim} />
                <DecoratedAvatar character={character} size={110} hat={draft.hat} frame={draft.frame} pin={draft.pin} />
                <Text style={styles.previewName}>{profile?.in_game_name || 'Explorer'}</Text>
                <View style={styles.xpChip}>
                  <LucideIcon name="zap" size={13} color={GOLD_TEXT} />
                  <Text style={styles.xpChipText}>{data.xp.toLocaleString()} XP</Text>
                </View>
              </View>

              {/* Slot tabs */}
              <View style={styles.tabs}>
                {TABS.map((t) => {
                  const active = t.slot === tab;
                  return (
                    <TouchableOpacity key={t.slot} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.slot)}>
                      <LucideIcon name={t.icon} size={14} color={active ? '#FFFFFF' : COLORS.textMuted} />
                      <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Items */}
              <VintaCard contentStyle={styles.grid}>
                {items.map((item) => {
                  const selected = draft[tab] === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id || 'none'}
                      style={[styles.item, selected && styles.itemSelected, !item.unlocked && styles.itemLocked]}
                      activeOpacity={0.85}
                      disabled={!item.unlocked}
                      onPress={() => setDraft((d) => ({ ...d, [tab]: item.id }))}
                    >
                      <View style={styles.itemArt}>
                        <ItemPreview slot={tab} id={item.id} character={character} />
                      </View>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      {item.unlocked ? (
                        selected ? <Text style={styles.itemEquipped}>Equipped</Text> : <Text style={styles.itemHint}>Tap to use</Text>
                      ) : (
                        <View style={styles.lockRow}>
                          <LucideIcon name="lock" size={11} color={COLORS.textMuted} />
                          <Text style={styles.itemHint} numberOfLines={1}>{item.min_xp} XP</Text>
                        </View>
                      )}
                      {!item.unlocked && <Text style={styles.tierText} numberOfLines={1}>{TIER_NAMES[item.tier]}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </VintaCard>

              {message && (
                <Text style={[styles.message, message.error && styles.messageError]}>{message.text}</Text>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.saveBtn, (!changed || saving) && styles.saveBtnMuted]}
                onPress={save}
                disabled={!changed || saving}
                activeOpacity={0.88}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save Look</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BG_OVERLAY },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 58, backgroundColor: 'rgba(8,20,60,0.70)',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#FFFFFF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  errorText: { fontFamily: FONTS.medium, fontSize: 14, color: '#FFFFFF', textAlign: 'center' },

  scroll: { padding: 16, paddingBottom: 24 },
  previewCard: {
    height: 250, borderRadius: 28, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', ...SHADOW.card,
  },
  previewDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,18,49,0.25)' },
  previewBackdrop: { width: 64, height: 46, borderRadius: 10, overflow: 'hidden' },
  previewName: {
    fontFamily: FONTS.bold, fontSize: 20, color: '#FFFFFF', marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  xpChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
    backgroundColor: '#FEF3C7', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4,
  },
  xpChipText: { fontFamily: FONTS.bold, fontSize: 12, color: GOLD_TEXT },

  tabs: {
    flexDirection: 'row', gap: 6, marginVertical: 14, padding: 4,
    backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 24,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 20 },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textMuted },
  tabTextActive: { color: '#FFFFFF' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, padding: 10 },
  item: {
    width: '31.5%', minHeight: 132, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, backgroundColor: '#FFFFFF',
  },
  itemSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  itemLocked: { opacity: 0.55 },
  itemArt: { height: 66, alignItems: 'center', justifyContent: 'center' },
  pinPreview: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF', ...SHADOW.card,
  },
  itemName: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.navy, textAlign: 'center', marginTop: 4 },
  itemEquipped: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.accent, marginTop: 2 },
  itemHint: { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  tierText: { fontFamily: FONTS.regular, fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },

  message: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFFFFF', textAlign: 'center', marginTop: 12 },
  messageError: { color: '#FCA5A5' },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18 },
  saveBtn: {
    alignSelf: 'stretch', height: 54, borderRadius: 27, paddingHorizontal: 24,
    backgroundColor: COLORS.accent, borderBottomWidth: 4, borderBottomColor: COLORS.accentDark,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnMuted: { opacity: 0.45 },
  saveText: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF' },
});
