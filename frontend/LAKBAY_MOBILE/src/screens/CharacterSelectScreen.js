import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, BackHandler, Dimensions, Easing, Image, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { FONTS, GUIDE_FONTS } from '../constants/theme';
import { HATS, PINS } from '../constants/cosmetics';
import { authService } from '../api/authService';
import ErrorModal from '../components/ErrorModal';
import LucideIcon from '../components/LucideIcon';
import DecoratedAvatar, { ProfileBackdrop } from '../components/DecoratedAvatar';
import {
  BeachBackdrop, ChamferButton, ChamferFrame, CREATION, GlitchTitle, PopPressable, RiseIn,
} from '../components/CreationKit';

// Character creation: Guide → Customize (skippable) → In-game name → Finish.
// Visual reference: a pixel-beach character creator — options rise in one by
// one, the picked one glides to the centre while the rest fly off, and the
// step title glitches into the next.

const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 16;

const CHARACTERS = [
  { id: 'mando', name: 'Kuya Mando', title: 'The Trailblazer', image: require('../assets/characters/lila.jpg'), tint: '#FCD9B0' },
  { id: 'bela', name: 'Ate Bela', title: 'The Wanderer', image: require('../assets/characters/new.jpg'), tint: '#B7D0FA' },
  { id: 'lila', name: 'Ate Lila', title: 'The Navigator', image: require('../assets/characters/ricky.jpg'), tint: '#DCE3B4' },
  { id: 'dante', name: 'Bossing Dante', title: 'The Adventurer', image: require('../assets/characters/dante.jpg'), tint: '#B5DCEB' },
  { id: 'sonya', name: 'Ate Sonya', title: 'The Discoverer', image: require('../assets/characters/sonya.jpg'), tint: '#A9C6DE' },
];

const RANDOM_CALLSIGNS = [
  'HermosaScout', 'VintaRider', 'PilarExplorer', 'YakanVoyager',
  'ChavacanoSeeker', 'CurachaHunter', 'ZamboangaPioneer', 'FortressTracker',
];

const STEPS = [
  { kicker: 'Select your', title: 'Guide' },
  { kicker: 'Make it yours', title: 'Customize' },
  { kicker: 'What should we call you?', title: 'Explorer Name' },
  { kicker: 'All set, explorer', title: 'Set Sail' },
];

const SLOTS = [
  { slot: 'hat', label: 'Hat', icon: 'crown' },
  { slot: 'frame', label: 'Frame', icon: 'target' },
  { slot: 'pin', label: 'Pin', icon: 'medal' },
  { slot: 'backdrop', label: 'Backdrop', icon: 'palm' },
];

// Used when the cosmetics catalog can't be loaded: the free starter items.
const STARTER_CATALOG = [
  { slot: 'hat', id: '', name: 'No Hat', min_xp: 0, unlocked: true },
  { slot: 'hat', id: 'cap', name: 'Explorer Cap', min_xp: 0, unlocked: true },
  { slot: 'frame', id: '', name: 'Simple Ring', min_xp: 0, unlocked: true },
  { slot: 'frame', id: 'vinta', name: 'Vinta Stripes', min_xp: 0, unlocked: true },
  { slot: 'pin', id: '', name: 'No Pin', min_xp: 0, unlocked: true },
  { slot: 'pin', id: 'compass', name: 'Compass Pin', min_xp: 0, unlocked: true },
  { slot: 'backdrop', id: '', name: 'Vinta Sails', min_xp: 0, unlocked: true },
];

const DEFAULT_LOOK = { hat: '', frame: '', pin: '', backdrop: '' };

const STARTER_LOOKS = [
  { hat: 'cap', frame: 'vinta', pin: 'compass', tile: '#2E7D7A' },
  { hat: 'cap', frame: '', pin: '', tile: '#F6D27A' },
  { hat: '', frame: 'vinta', pin: 'compass', tile: '#F8C8DC' },
  { hat: 'cap', frame: 'vinta', pin: '', tile: '#7FD3E8' },
  { hat: '', frame: '', pin: 'compass', tile: '#F4B6C8' },
  { hat: 'cap', frame: '', pin: 'compass', tile: '#5EC4B6' },
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 tile: rises in, pops on touch; when another is picked it flies off,
// and the picked one glides to the centre of the grid.
// ─────────────────────────────────────────────────────────────────────────────
function GuideTile({ char, index, width, height, phase, grid, onPick, offsetTop = 0 }) {
  const [layout, setLayout] = useState(null);
  const fly = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === 'idle') { fly.setValue(0); return; }
    Animated.timing(fly, {
      toValue: 1,
      duration: phase === 'chosen' ? 460 : 340,
      delay: phase === 'chosen' ? 60 : index * 35,
      easing: phase === 'chosen' ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [phase, fly, index]);

  let transform = [];
  let opacity = 1;
  if (phase === 'chosen' && layout && grid) {
    const dx = grid.width / 2 - (layout.x + layout.width / 2);
    const dy = grid.height / 2 - (layout.y + layout.height / 2);
    transform = [
      { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
      { translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
      { scale: fly.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
    ];
  } else if (phase === 'leaving') {
    const dir = index % 2 ? 1 : -1;
    transform = [
      { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, dir * 60] }) },
      { translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [0, 90 + index * 12] }) },
      { scale: fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) },
    ];
    opacity = fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  }

  return (
    <Animated.View
      onLayout={(e) => setLayout(e.nativeEvent.layout)}
      style={[styles.guideCell, { width, marginTop: offsetTop, zIndex: phase === 'chosen' ? 5 : 1, opacity, transform }]}
    >
      <RiseIn index={index}>
        <PopPressable onPress={() => onPick(index)} disabled={phase !== 'idle'} accessibilityLabel={`Choose ${char.name}`}>
          <ChamferFrame width={width} height={height} cut={12} fill={char.tint}>
            <Image source={char.image} style={styles.guideImg} resizeMode="cover" />
          </ChamferFrame>
          <Text style={styles.guideName} numberOfLines={1}>{char.name}</Text>
          <Text style={styles.guideTitle} numberOfLines={1}>{char.title}</Text>
        </PopPressable>
      </RiseIn>
    </Animated.View>
  );
}

// Thumbnail for one cosmetic item.
function ItemThumb({ slot, id, character, size = 40 }) {
  if (slot === 'backdrop') return <ProfileBackdrop id={id} style={{ width: size * 1.3, height: size * 1.3, borderRadius: 6 }} />;
  if (slot === 'frame') return <DecoratedAvatar character={character} size={size} frame={id} reserveHatSpace={false} />;
  if (slot === 'hat') {
    return HATS[id]
      ? <DecoratedAvatar character={character} size={size * 0.85} hat={id} />
      : <Ionicons name="ban-outline" size={size * 0.7} color={CREATION.muted} />;
  }
  return PINS[id] ? (
    <View style={[styles.pinThumb, { width: size * 0.9, height: size * 0.9, borderRadius: size, backgroundColor: PINS[id].bg }]}>
      <LucideIcon name={PINS[id].icon} size={size * 0.5} color="#FFFFFF" />
    </View>
  ) : (
    <Ionicons name="ban-outline" size={size * 0.7} color={CREATION.muted} />
  );
}

// Live avatar preview; bounces whenever the look changes.
function AvatarPreview({ character, look, width, height, avatarSize }) {
  const bounce = useRef(new Animated.Value(1)).current;
  const key = `${character}|${look.hat}|${look.frame}|${look.pin}|${look.backdrop}`;
  useEffect(() => {
    bounce.setValue(0.92);
    Animated.spring(bounce, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [key, bounce]);
  return (
    <ChamferFrame width={width} height={height} cut={14} fill={CREATION.card}>
      <ProfileBackdrop id={look.backdrop} style={styles.previewBackdrop}>
        <View style={styles.previewShade} />
        <Animated.View style={{ transform: [{ scale: bounce }] }}>
          <DecoratedAvatar character={character} size={avatarSize} hat={look.hat} frame={look.frame} pin={look.pin} />
        </Animated.View>
      </ProfileBackdrop>
    </ChamferFrame>
  );
}

export default function CharacterSelectScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [guideIdx, setGuideIdx] = useState(null);
  const [pickPhase, setPickPhase] = useState(null); // index being animated out
  const [grid, setGrid] = useState(null);
  const [catalog, setCatalog] = useState(STARTER_CATALOG);
  const [look, setLook] = useState(DEFAULT_LOOK);
  const [panel, setPanel] = useState(null); // null = category grid, else a slot id
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, type: 'error', title: '', message: '' });
  const panelAnim = useRef(new Animated.Value(1)).current;

  const showErr = (title, message, type = 'error') => setErrorModal({ visible: true, type, title, message });
  const guide = CHARACTERS[guideIdx ?? 0];

  useEffect(() => {
    authService.getCosmetics()
      .then((data) => { if (Array.isArray(data?.catalog) && data.catalog.length) setCatalog(data.catalog); })
      .catch(() => {});
  }, []);

  const goBack = useCallback(() => {
    if (step === 0) return false;
    if (step === 1 && panel) { setPanel(null); return true; }
    setStep((s) => s - 1);
    if (step === 1) { setPickPhase(null); }
    return true;
  }, [step, panel]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => sub.remove();
  }, [goBack]);

  // ── Step 1: pick a guide ────────────────────────────────────────────────────
  const onPickGuide = (index) => {
    setGuideIdx(index);
    setPickPhase(index);
    setTimeout(() => { setStep(1); setPanel(null); }, 620);
  };

  // ── Step 2: customize ──────────────────────────────────────────────────────
  const unlockedBySlot = useMemo(() => {
    const map = {};
    SLOTS.forEach(({ slot }) => { map[slot] = catalog.filter((i) => i.slot === slot && i.unlocked).map((i) => i.id); });
    return map;
  }, [catalog]);

  const starterLooks = useMemo(() => STARTER_LOOKS.filter((l) => ['hat', 'frame', 'pin']
    .every((slot) => unlockedBySlot[slot]?.includes(l[slot]))), [unlockedBySlot]);

  const randomize = () => setLook({
    hat: pick(unlockedBySlot.hat?.length ? unlockedBySlot.hat : ['']),
    frame: pick(unlockedBySlot.frame?.length ? unlockedBySlot.frame : ['']),
    pin: pick(unlockedBySlot.pin?.length ? unlockedBySlot.pin : ['']),
    backdrop: pick(unlockedBySlot.backdrop?.length ? unlockedBySlot.backdrop : ['']),
  });

  const openPanel = (slot) => {
    panelAnim.setValue(0);
    setPanel(slot);
    Animated.timing(panelAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const closePanel = () => {
    panelAnim.setValue(0);
    setPanel(null);
    Animated.timing(panelAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  // ── Step 3: name ───────────────────────────────────────────────────────────
  const rollName = () => setName(`${pick(RANDOM_CALLSIGNS)}_${Math.floor(10 + Math.random() * 90)}`);
  const nameError = (() => {
    const n = name.trim();
    if (n.length < 3) return 'Use at least 3 characters.';
    if (n.length > 20) return 'Keep it to 20 characters or less.';
    if (!/^[A-Za-z0-9_ ]+$/.test(n)) return 'Letters, numbers, spaces and _ only.';
    return null;
  })();

  // ── Step 4: finish ─────────────────────────────────────────────────────────
  const finish = async () => {
    setLoading(true);
    try {
      await authService.characterSetup(guide.id, name.trim());
      const changed = Object.keys(DEFAULT_LOOK).some((k) => look[k] !== DEFAULT_LOOK[k]);
      if (changed) {
        try { await authService.saveCosmetics(look); } catch (_) { /* can be set later in Edit Profile */ }
      }
      await SecureStore.setItemAsync('offline_character', guide.id);
      await SecureStore.setItemAsync('offline_explorerName', name.trim());
      navigation.replace('MainTabs', { showOnboarding: true });
    } catch (error) {
      const data = error?.response?.data || error || {};
      if (data.in_game_name) {
        setStep(2);
        showErr('Name Taken', String(data.in_game_name[0] || data.in_game_name));
      } else if (!data.detail && !error?.response && error?.message) {
        showErr('Server Not Responding', 'The LAKBAY server may still be waking up. Please try again in a few seconds.', 'warning');
      } else {
        showErr('Setup Error', data.detail || 'Something went wrong during setup. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const contentW = SCREEN_W - PAD * 2;
  const tileW = Math.floor((contentW - 24) / 3);
  const tileH = Math.round(tileW * 1.28);

  // ── Renderers ──────────────────────────────────────────────────────────────
  const renderGuides = () => (
    <View
      style={styles.guideGrid}
      onLayout={(e) => setGrid(e.nativeEvent.layout)}
    >
      {CHARACTERS.map((char, i) => (
        <GuideTile
          key={char.id}
          char={char}
          index={i}
          width={tileW}
          height={tileH}
          grid={grid}
          offsetTop={i === 1 || i === 4 ? 18 : 0}
          phase={pickPhase === null ? 'idle' : pickPhase === i ? 'chosen' : 'leaving'}
          onPick={onPickGuide}
        />
      ))}
    </View>
  );

  const renderPanel = () => {
    const slide = { opacity: panelAnim, transform: [{ translateX: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [panel ? 40 : -40, 0] }) }] };
    if (!panel) {
      const cellW = (contentW - 24 - 10) / 2;
      return (
        <Animated.View style={slide}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>CUSTOMIZE</Text>
            <PopPressable onPress={() => setLook(DEFAULT_LOOK)} accessibilityLabel="Reset look">
              <Text style={styles.panelLink}>Reset ↺</Text>
            </PopPressable>
          </View>
          <View style={styles.catGrid}>
            {SLOTS.map((s, i) => {
              const count = catalog.filter((c) => c.slot === s.slot).length;
              const changed = look[s.slot] !== '';
              return (
                <RiseIn key={s.slot} index={i}>
                  <PopPressable onPress={() => openPanel(s.slot)} accessibilityLabel={`Choose ${s.label}`}>
                    <View style={[styles.catCell, { width: cellW }]}>
                      {changed && <View style={styles.catDot} />}
                      <View style={styles.catThumb}>
                        <ItemThumb slot={s.slot} id={look[s.slot] || (s.slot === 'backdrop' ? '' : catalog.find((c) => c.slot === s.slot && c.id)?.id || '')} character={guide.id} size={34} />
                      </View>
                      <Text style={styles.catLabel}>{s.label.toUpperCase()} ({count})</Text>
                    </View>
                  </PopPressable>
                </RiseIn>
              );
            })}
          </View>
        </Animated.View>
      );
    }
    const items = catalog.filter((c) => c.slot === panel);
    const cell = Math.floor((contentW - 24 - 16) / 3);
    const slotLabel = SLOTS.find((s) => s.slot === panel)?.label || '';
    return (
      <Animated.View style={slide}>
        <PopPressable onPress={closePanel} accessibilityLabel="Back to categories">
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>← {slotLabel.toUpperCase()}S ({items.length})</Text>
          </View>
        </PopPressable>
        <View style={styles.itemGrid}>
          {items.map((it, i) => {
            const selected = look[panel] === it.id;
            return (
              <RiseIn key={`${panel}-${it.id || 'none'}`} index={i}>
                <PopPressable
                  disabled={!it.unlocked}
                  onPress={() => setLook((l) => ({ ...l, [panel]: it.id }))}
                  accessibilityLabel={it.unlocked ? it.name : `${it.name}, unlocks at ${it.min_xp} XP`}
                >
                  <ChamferFrame
                    width={cell}
                    height={cell + 18}
                    cut={9}
                    bg="#FFFDF4"
                    fill={selected ? '#EEF2FF' : '#F7F0D8'}
                    stroke={selected ? CREATION.blue : undefined}
                    strokeWidth={2.5}
                  >
                    <View style={[styles.itemInner, !it.unlocked && { opacity: 0.4 }]}>
                      <ItemThumb slot={panel} id={it.id} character={guide.id} size={34} />
                      <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                    </View>
                    {!it.unlocked && (
                      <View style={styles.lockBadge}>
                        <LucideIcon name="lock" size={10} color="#FFFFFF" />
                        <Text style={styles.lockText}>{it.min_xp} XP</Text>
                      </View>
                    )}
                  </ChamferFrame>
                </PopPressable>
              </RiseIn>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  const renderCustomize = () => (
    <View>
      <RiseIn index={0}>
        <AvatarPreview character={guide.id} look={look} width={contentW} height={200} avatarSize={112} />
      </RiseIn>
      <RiseIn index={1} style={styles.btnRow}>
        <ChamferButton
          variant="outline"
          label="Randomize"
          width={(contentW - 10) / 2}
          onPress={randomize}
          icon={<LucideIcon name="dices" size={16} color={CREATION.blue} />}
        />
        <ChamferButton
          label="Next"
          width={(contentW - 10) / 2}
          onPress={() => setStep(2)}
          icon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
        />
      </RiseIn>
      <View style={styles.panelCard}>{renderPanel()}</View>
      {starterLooks.length > 0 && (
        <View style={styles.premade}>
          <Text style={styles.premadeTitle}>Starter looks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
            {starterLooks.map((l, i) => (
              <RiseIn key={i} index={i} delay={150}>
                <PopPressable onPress={() => setLook((cur) => ({ ...cur, hat: l.hat, frame: l.frame, pin: l.pin }))} accessibilityLabel={`Starter look ${i + 1}`}>
                  <ChamferFrame width={64} height={64} cut={10} fill={l.tile}>
                    <View style={styles.premadeInner}>
                      <DecoratedAvatar character={guide.id} size={30} hat={l.hat} frame={l.frame} pin={l.pin} />
                    </View>
                  </ChamferFrame>
                </PopPressable>
              </RiseIn>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderName = () => (
    <View style={{ alignItems: 'center' }}>
      <RiseIn index={0}>
        <AvatarPreview character={guide.id} look={look} width={contentW} height={170} avatarSize={92} />
      </RiseIn>
      <RiseIn index={1} style={{ marginTop: 18 }}>
        <ChamferFrame width={contentW} height={56} cut={10} fill="#FFFFFF" stroke={nameError && name ? '#EF4444' : CREATION.blue} strokeWidth={2}>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Your explorer name"
            placeholderTextColor="#B8AE96"
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => { if (!nameError) setStep(3); }}
          />
        </ChamferFrame>
      </RiseIn>
      <Text style={[styles.nameHint, nameError && name ? { color: '#DC2626' } : null]}>
        {name && nameError ? nameError : 'This is how other explorers see you on the leaderboard.'}
      </Text>
      <RiseIn index={2} style={styles.btnRow}>
        <ChamferButton
          variant="outline"
          label="Roll a name"
          width={(contentW - 10) / 2}
          onPress={rollName}
          icon={<LucideIcon name="dices" size={16} color={CREATION.blue} />}
        />
        <ChamferButton
          label="Next"
          width={(contentW - 10) / 2}
          disabled={!!nameError}
          onPress={() => setStep(3)}
          icon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
        />
      </RiseIn>
    </View>
  );

  const renderFinish = () => {
    const itemName = (slot) => catalog.find((c) => c.slot === slot && c.id === look[slot])?.name;
    const chips = SLOTS.map((s) => itemName(s.slot)).filter(Boolean);
    return (
      <View style={{ alignItems: 'center' }}>
        <RiseIn index={0}>
          <AvatarPreview character={guide.id} look={look} width={contentW} height={220} avatarSize={124} />
        </RiseIn>
        <RiseIn index={1} style={{ alignItems: 'center', marginTop: 16 }}>
          <Text style={styles.finishName}>{name.trim()}</Text>
          <Text style={styles.finishGuide}>Guided by {guide.name} · {guide.title}</Text>
        </RiseIn>
        <RiseIn index={2} style={styles.chipRow}>
          {chips.map((c) => (
            <View key={c} style={styles.chip}><Text style={styles.chipText}>{c}</Text></View>
          ))}
        </RiseIn>
        <RiseIn index={3} style={{ marginTop: 22 }}>
          <ChamferButton
            label={loading ? 'Setting sail…' : 'Start Expedition'}
            width={contentW}
            height={54}
            disabled={loading}
            onPress={finish}
            icon={<LucideIcon name="sailboat" size={18} color="#FFFFFF" />}
          />
        </RiseIn>
      </View>
    );
  };

  return (
    <BeachBackdrop>
      <StatusBar barStyle="dark-content" backgroundColor={CREATION.sand} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSide}>
            {step > 0 && (
              <PopPressable onPress={goBack} accessibilityLabel="Back">
                <ChamferFrame width={36} height={36} cut={8} fill="#FFFDF4" stroke={CREATION.muted} strokeWidth={1.5}>
                  <View style={styles.centerFill}><Ionicons name="arrow-back" size={16} color={CREATION.ink} /></View>
                </ChamferFrame>
              </PopPressable>
            )}
          </View>
          <Text style={styles.wordmark}>LAKBAY</Text>
          <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
            {step === 1 ? (
              <PopPressable onPress={() => setStep(2)} accessibilityLabel="Skip customizing">
                <Text style={styles.skip}>Skip</Text>
              </PopPressable>
            ) : (
              <Text style={styles.stepCount}>{step + 1}/4</Text>
            )}
          </View>
        </View>
        <View style={styles.progress}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.progressSeg, i <= step && styles.progressOn]} />
          ))}
        </View>

        <GlitchTitle kicker={STEPS[step].kicker} title={STEPS[step].title} />

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            key={step}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 0 && renderGuides()}
            {step === 1 && renderCustomize()}
            {step === 2 && renderName()}
            {step === 3 && renderFinish()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ErrorModal
        visible={errorModal.visible}
        type={errorModal.type}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal((prev) => ({ ...prev, visible: false }))}
      />
    </BeachBackdrop>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingTop: 6 },
  headerSide: { width: 64, height: 36, justifyContent: 'center' },
  wordmark: { flex: 1, textAlign: 'center', fontFamily: GUIDE_FONTS.display, fontSize: 18, color: CREATION.blue, letterSpacing: 3 },
  skip: { fontFamily: FONTS.bold, fontSize: 14, color: CREATION.blue, paddingVertical: 6 },
  stepCount: { fontFamily: FONTS.semiBold, fontSize: 12, color: CREATION.muted },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: PAD + 48, marginTop: 10 },
  progressSeg: { flex: 1, height: 4, backgroundColor: CREATION.sandDeep },
  progressOn: { backgroundColor: CREATION.blue },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: PAD, paddingBottom: 120 },

  guideGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 12, rowGap: 14 },
  guideCell: { alignItems: 'center' },
  guideImg: { width: '100%', height: '100%' },
  guideName: { fontFamily: FONTS.bold, fontSize: 13, color: CREATION.ink, textAlign: 'center', marginTop: 8 },
  guideTitle: { fontFamily: FONTS.regular, fontSize: 11, color: CREATION.muted, textAlign: 'center' },

  previewBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(234, 223, 184, 0.35)' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'center' },

  panelCard: {
    marginTop: 16, padding: 12, backgroundColor: '#FFFDF4',
    borderWidth: 1, borderColor: CREATION.sandDeep, borderRadius: 4,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  panelTitle: { fontFamily: GUIDE_FONTS.display, fontSize: 13, color: CREATION.ink, letterSpacing: 0.5 },
  panelLink: { fontFamily: FONTS.semiBold, fontSize: 12, color: CREATION.blue },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCell: { alignItems: 'center', paddingVertical: 12, backgroundColor: '#F7F0D8', borderRadius: 4 },
  catThumb: { height: 50, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontFamily: FONTS.bold, fontSize: 11, color: CREATION.muted, marginTop: 6, letterSpacing: 0.4 },
  catDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, backgroundColor: CREATION.green },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  itemName: { fontFamily: FONTS.medium, fontSize: 10, color: CREATION.ink, marginTop: 6, textAlign: 'center' },
  lockBadge: {
    position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(30,27,22,0.75)', paddingHorizontal: 5, paddingVertical: 2,
  },
  lockText: { fontFamily: FONTS.bold, fontSize: 9, color: '#FFFFFF' },
  pinThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

  premade: { marginTop: 16 },
  premadeTitle: { fontFamily: FONTS.bold, fontSize: 12, color: CREATION.ink, marginBottom: 8 },
  premadeInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  nameInput: {
    flex: 1, fontFamily: FONTS.bold, fontSize: 18, color: CREATION.ink, textAlign: 'center', paddingHorizontal: 14,
  },
  nameHint: { fontFamily: FONTS.regular, fontSize: 12, color: CREATION.muted, marginTop: 8, textAlign: 'center' },

  finishName: { fontFamily: GUIDE_FONTS.display, fontSize: 24, color: CREATION.ink, textAlign: 'center' },
  finishGuide: { fontFamily: FONTS.medium, fontSize: 13, color: CREATION.muted, marginTop: 4, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 12 },
  chip: { backgroundColor: '#FFFDF4', borderWidth: 1, borderColor: CREATION.sandDeep, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 11, color: CREATION.ink },
});
