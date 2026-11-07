import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, StatusBar, ScrollView, Animated, Easing,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path } from 'react-native-svg';
import { COLORS, FONTS, RADIUS, SHADOW, BG_OVERLAY, GOLD_TEXT } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import LucideIcon from '../components/LucideIcon';
import { getSpotTrivia, getIconTrivia, awardSpotBadge, ORIGIN } from '../api/qrService';
import { authService } from '../api/authService';
import DecoratedAvatar from '../components/DecoratedAvatar';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── 3-D viewer HTML (secure sandboxed viewer) ───────────────────────────────
const HTML_ESCAPE = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
const escapeAttr = (s) => String(s).replace(/["'<>&]/g, (c) => HTML_ESCAPE[c]);

function buildViewerHTML(modelUrl) {
  try {
    const parsed = new URL(modelUrl);
    if (parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  const safe = escapeAttr(modelUrl);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
  <script type="module"
    src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
    integrity="sha384-NxrHiuPcsJaRbXc9EoFTt5OZ6WPVqKeDgcnykGs3spXmq0J7hbbGGlyUkrGuoJoA"
    crossorigin="anonymous"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:transparent;overflow:hidden}
    model-viewer{width:100%;height:100%;--progress-bar-color:transparent}
  </style>
</head>
<body>
  <model-viewer src="${safe}" auto-rotate camera-controls exposure="1.2"
    style="width:100%;height:100%"></model-viewer>
</body>
</html>`;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// ─── Gamified wrong-answer messages (rotated randomly, no correct answer revealed) ──
const WRONG_ANSWER_MESSAGES = [
  { icon: 'target', line1: 'Not quite, Explorer!', line2: 'Every great adventurer misses a shot — reload and try again!' },
  { icon: 'puzzle', line1: 'Hmm, close but no cigar!', line2: 'The answer is still out there waiting — give it another shot!' },
  { icon: 'swords', line1: 'Quest failed… this round!', line2: 'A true champion doesn\'t give up. Retry and conquer!' },
  { icon: 'search', line1: 'Your instincts need recalibrating!', line2: 'Look deeper, think harder — you\'ve got this!' },
  { icon: 'lightbulb', line1: 'Interesting guess, but not the one!', line2: 'Shake it off and come back stronger, Explorer!' },
  { icon: 'map', line1: 'Wrong path, but keep exploring!', line2: 'Every wrong turn teaches you the right one. Try again!' },
  { icon: 'gamepad', line1: 'Oops! Wrong move!', line2: 'Even legends respawn. Step back up and try again!' },
  { icon: 'star', line1: 'Not this time, brave one!', line2: 'Stars aren\'t born overnight — keep pushing!' },
];

// Answer letters get the app's accent palette (blue, gold, teal, coral).
const OPTION_COLORS = [COLORS.accent, COLORS.gold, COLORS.teal, '#E05A47'];
const OPTION_SHADES = [COLORS.accentDark, '#B7791F', '#047857', '#B03A2E'];
const STAT_TILES = [
  { key: 'questions', label: 'Questions Answered', bg: COLORS.accent, shade: COLORS.accentDark },
  { key: 'accuracy',  label: 'Accuracy',           bg: COLORS.teal,   shade: '#047857' },
  { key: 'xp',        label: 'XP Earned',          bg: COLORS.gold,   shade: '#B7791F' },
  { key: 'streak',    label: 'Best Streak',        bg: '#E05A47',     shade: '#B03A2E' },
];
const HERO_H = 230;
const GUIDE_IMAGE = require('../assets/guide_character.png');
const FALLBACK_HERO = require('../assets/zamboanga.jpg');

const resolveImage = (img) => {
  if (!img) return null;
  const s = String(img);
  if (s.startsWith('http') || s.startsWith('data:')) return s.replace(/^http:\/\//, 'https://');
  return `${ORIGIN}${s.startsWith('/') ? '' : '/'}${s}`;
};

// ─── Main Component ──────────────────────────────────────────────────────────
// Shared LAKBAY backdrop: Vinta photo under a light navy dim.
function Backdrop({ children }) {
  return (
    <ImageBackground source={require('../../reference/VINTA.jpeg')} style={styles.backdrop} resizeMode="cover">
      <View style={styles.backdropDim} />
      {children}
    </ImageBackground>
  );
}

// Wavy bottom edge under the intro hero image.
function HeroWave() {
  return (
    <Svg width={SCREEN_W} height={36} viewBox={`0 0 ${SCREEN_W} 36`} style={styles.heroWave} preserveAspectRatio="none">
      <Path
        d={`M0 18 C ${SCREEN_W * 0.2} 2, ${SCREEN_W * 0.35} 34, ${SCREEN_W * 0.55} 18 S ${SCREEN_W * 0.85} 4, ${SCREEN_W} 16 L ${SCREEN_W} 36 L 0 36 Z`}
        fill="#FFFFFF"
      />
    </Svg>
  );
}

// Spot photo or the creature's 3D model, used by the intro hero and the question card.
function QuizMedia({ viewerHTML, imageUri, style, imageStyle }) {
  if (viewerHTML) {
    return (
      <View style={style}>
        <WebView
          source={{ html: viewerHTML }}
          style={styles.webview}
          javaScriptEnabled
          originWhitelist={['https://*']}
          scrollEnabled={false}
        />
      </View>
    );
  }
  return (
    <ImageBackground source={imageUri ? { uri: imageUri } : FALLBACK_HERO} style={style} imageStyle={imageStyle} resizeMode="cover" />
  );
}

export default function QuizScreen({ navigation, route }) {
  const icon      = route.params?.icon      ?? null;
  const spotId    = route.params?.spotId    ?? null;
  const spotName  = route.params?.spotName  ?? 'Cultural Spot';
  const spotImage = resolveImage(route.params?.spotImage);

  const isIconMode  = !spotId && !!icon;
  const displayName = spotName || icon?.name || 'Challenge';
  const featureType = route.params?.feature ?? (icon ? 'catch' : (spotId ? 'qr' : 'ar'));

  const [showIntro, setShowIntro]           = useState(true);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [questions, setQuestions]           = useState([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect]           = useState(null);
  const [showReward, setShowReward]         = useState(false);

  // Gamification states: XP, streaks, accuracy
  const [userProfile, setUserProfile]       = useState(null);
  const [sessionXP, setSessionXP]           = useState(0);
  const [streak, setStreak]                 = useState(0);
  const [maxStreak, setMaxStreak]           = useState(0);
  const [wrongCount, setWrongCount]         = useState(0);
  const [floatingToast, setFloatingToast]   = useState(null); // { text, color, iconName }
  const [wrongMessage, setWrongMessage]     = useState(null); // randomly picked on wrong answer

  // Animations
  const introAnim      = useRef(new Animated.Value(0)).current;
  const toastFadeAnim  = useRef(new Animated.Value(0)).current;
  const toastSlideAnim = useRef(new Animated.Value(20)).current;
  const cardScaleAnim  = useRef(new Animated.Value(1)).current;
  const streakScale    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(introAnim, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [introAnim]);

  // 3-D viewer model (catch creatures)
  const modelUrl = icon?.model_3d || null;
  const viewerHTML = useMemo(() => {
    if (!modelUrl) return null;
    return buildViewerHTML(modelUrl);
  }, [modelUrl]);

  useEffect(() => {
    authService.getProfile()
      .then(profile => setUserProfile(profile))
      .catch(() => {});

    const fetchTrivia = async () => {
      try {
        if (spotId) {
          try {
            const data = await getSpotTrivia(spotId);
            if (data.questions?.length) {
              setQuestions(data.questions);
              return;
            }
          } catch {
            console.log('Falling back to icon trivia...');
          }
        }

        if (icon?.id) {
          const data = await getIconTrivia(icon.id);
          if (data.questions?.length) {
            setQuestions(data.questions);
            return;
          }
        }

        setError('No trivia questions available yet for this spot.');
      } catch (err) {
        if (err?.code === 'ECONNABORTED') {
          setError('The server is taking too long to respond. Please try again.');
        } else {
          setError(err?.response?.data?.error || 'Could not load quiz. Make sure the backend is running.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrivia();
  }, [spotId, icon]);

  const showFloatingToast = (text, color, iconName) => {
    setFloatingToast({ text, color, iconName });
    toastFadeAnim.setValue(0);
    toastSlideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(toastFadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(toastSlideAnim, { toValue: -18, duration: 400, easing: Easing.out(Easing.back(1.7)), useNativeDriver: true }),
    ]).start();
  };

  const handleSelect = async (option) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);

    const currentQ = questions[currentIndex];
    const correct = option === currentQ.choices[currentQ.correct_index];
    setIsCorrect(correct);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      Animated.sequence([
        Animated.timing(streakScale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(streakScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      const earnedXP = 10;
      setSessionXP(prev => prev + earnedXP);

      const toastMsg = newStreak > 1 ? `+${earnedXP} XP! ${newStreak}x STREAK!` : `+${earnedXP} XP! Perfect!`;
      showFloatingToast(toastMsg, '#10B981', newStreak > 1 ? 'flame' : 'sparkles');

      Animated.sequence([
        Animated.timing(cardScaleAnim, { toValue: 1.03, duration: 140, useNativeDriver: true }),
        Animated.timing(cardScaleAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();

      authService.adjustXP(earnedXP).then(res => {
        if (res?.xp != null) setUserProfile(p => p ? { ...p, xp: res.xp } : p);
      }).catch(console.error);

    } else {
      setStreak(0);
      setWrongCount(c => c + 1);

      const msg = WRONG_ANSWER_MESSAGES[Math.floor(Math.random() * WRONG_ANSWER_MESSAGES.length)];
      setWrongMessage(msg);

      const currentTotalXP = (userProfile?.xp ?? 0);

      if (currentTotalXP === 0 && sessionXP === 0) {
        // Beginner Protection Shield
        showFloatingToast('Extra Chance! Shield Active', '#38BDF8', 'shield-checkmark');
      } else {
        setSessionXP(prev => Math.max(0, prev - 5));
        showFloatingToast('-5 XP Keep Going!', '#EF4444', 'alert-circle');

        authService.adjustXP(-5).then(res => {
          if (res?.xp != null) setUserProfile(p => p ? { ...p, xp: res.xp } : p);
        }).catch(console.error);
      }

      setTimeout(() => {
        setSelectedOption(null);
        setIsCorrect(null);
        setFloatingToast(null);
        setWrongMessage(null);
      }, 2200);
    }
  };

  const handleNext = async () => {
    setFloatingToast(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      if (!isIconMode && spotId) {
        try {
          await awardSpotBadge(spotId);
        } catch {
          // Badge endpoint is optional; the quiz result still counts.
        }
      }
      setShowReward(true);
    }
  };

  const topBar = (right) => (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.8} accessibilityLabel="Leave quiz">
        <Ionicons name="arrow-back" size={20} color="#FFF" />
      </TouchableOpacity>
      {right}
    </View>
  );

  const xpPill = (
    <View style={styles.xpPill}>
      <LucideIcon name="zap" size={14} color={GOLD_TEXT} />
      <Text style={styles.xpPillText}>{(userProfile?.xp ?? 0).toLocaleString()} XP</Text>
    </View>
  );

  // ── Intro: hero image, title, guide, question count, Start ──
  if (showIntro) {
    const isCatchMode = featureType === 'catch';
    const isQrMode    = featureType === 'qr';
    const subtitle = isCatchMode
      ? `Let's see what you know about ${displayName} before you catch it!`
      : isQrMode
      ? `Let's see what you remember from ${displayName}!`
      : `Let's see what you learned from this exhibit!`;
    const count = questions.length || 5;

    return (
      <View style={styles.introScreen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.introHero}>
          <QuizMedia viewerHTML={isCatchMode ? viewerHTML : null} imageUri={spotImage} style={StyleSheet.absoluteFill} />
          <View style={styles.introHeroDim} />
          <SafeAreaView edges={['top']} style={styles.introHeroBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.8} accessibilityLabel="Leave quiz">
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
          </SafeAreaView>
          <HeroWave />
        </View>

        <Animated.View
          style={[
            styles.introBody,
            { opacity: introAnim, transform: [{ translateY: introAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
          ]}
        >
          <Text style={styles.introTitle} numberOfLines={3}>{displayName}</Text>
          <Text style={styles.introSubtitle}>{subtitle}</Text>

          <View style={styles.guideWrap}>
            <View style={styles.guideHalo} />
            <ImageBackground source={GUIDE_IMAGE} style={styles.guideImage} resizeMode="contain" />
          </View>

          {loading ? (
            <View style={styles.introStatusRow}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.introInfo}>Preparing your questions…</Text>
            </View>
          ) : error ? (
            <Text style={[styles.introInfo, { color: '#B91C1C' }]}>{error}</Text>
          ) : (
            <Text style={styles.introInfo}>
              You&apos;ll get {count} question{count === 1 ? '' : 's'}. Earn +10 XP for every correct answer!
            </Text>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, (loading || error) && styles.primaryBtnMuted]}
            onPress={() => (error ? navigation.goBack() : setShowIntro(false))}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>{error ? 'Go Back' : 'Start Quiz'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Results: avatar, XP pill, 2×2 stat tiles ──
  if (showReward) {
    const total = questions.length;
    const accuracy = total > 0 ? Math.round((total / (total + wrongCount)) * 100) : 100;
    const values = { questions: total, accuracy: `${accuracy}%`, xp: `+${sessionXP}`, streak: `${maxStreak}x` };

    return (
      <Backdrop>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          {topBar(<Text style={styles.topBarTitle}>Quiz Results</Text>)}
          <ScrollView contentContainerStyle={styles.resultBody} showsVerticalScrollIndicator={false}>
            <VintaCard contentStyle={styles.resultCard}>
              <DecoratedAvatar
                character={userProfile?.chosen_character}
                size={84}
                hat={userProfile?.avatar_hat}
                frame={userProfile?.avatar_frame || 'gold'}
                pin={userProfile?.avatar_pin}
              />
              <Text style={styles.resultName}>{userProfile?.in_game_name || 'Explorer'}</Text>
              <Text style={styles.resultSub}>Completed {displayName}</Text>
              <View style={styles.resultPill}>
                <LucideIcon name="star" size={14} color={GOLD_TEXT} />
                <Text style={styles.resultPillText}>
                  {(userProfile?.xp ?? 0).toLocaleString()} XP total · {maxStreak}x best streak
                </Text>
              </View>

              <View style={styles.tileGrid}>
                {STAT_TILES.map((t) => (
                  <View key={t.key} style={[styles.tile, { backgroundColor: t.bg, borderBottomColor: t.shade }]}>
                    <Text style={styles.tileValue}>{values[t.key]}</Text>
                    <Text style={styles.tileLabel}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </VintaCard>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={() => navigation.navigate('MainTabs')}>
              <Text style={styles.primaryBtnText}>Claim &amp; Continue</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Backdrop>
    );
  }

  const currentQ = questions[currentIndex];
  const answered = selectedOption !== null && isCorrect;

  // ── Question: counter + segments, media card, question, 2×2 answers, Next ──
  return (
    <Backdrop>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        {topBar(xpPill)}

        {floatingToast && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floatingToast,
              { backgroundColor: floatingToast.color, opacity: toastFadeAnim, transform: [{ translateY: toastSlideAnim }] },
            ]}
          >
            <Ionicons name={floatingToast.iconName || 'sparkles'} size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.floatingToastText}>{floatingToast.text}</Text>
          </Animated.View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.counterWrap}>
            <Text style={styles.counterText}>{currentIndex + 1}/{questions.length}Q</Text>
            <View style={styles.segments}>
              {questions.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    i < currentIndex && styles.segmentDone,
                    i === currentIndex && styles.segmentActive,
                  ]}
                />
              ))}
            </View>
            {streak > 1 && (
              <Animated.View style={[styles.streakPill, { transform: [{ scale: streakScale }] }]}>
                <LucideIcon name="flame" size={13} color="#FF6B00" />
                <Text style={styles.streakText}>{streak}x streak</Text>
              </Animated.View>
            )}
          </View>

          <VintaCard style={styles.mediaFrame} contentStyle={styles.mediaCard}>
            <QuizMedia viewerHTML={viewerHTML} imageUri={spotImage} style={styles.mediaInner} imageStyle={styles.mediaImage} />
          </VintaCard>

          <Animated.Text style={[styles.questionText, { transform: [{ scale: cardScaleAnim }] }]}>
            {currentQ.question}
          </Animated.Text>

          <View style={styles.grid}>
            {currentQ.choices.map((option, idx) => {
              const isSelected = selectedOption === option;
              const letter = OPTION_LETTERS[idx] || String(idx + 1);
              let tint = OPTION_COLORS[idx % OPTION_COLORS.length];
              let shade = OPTION_SHADES[idx % OPTION_SHADES.length];
              let bg = '#FFFFFF';
              if (isSelected && isCorrect) { tint = '#10B981'; shade = '#047857'; bg = '#ECFDF5'; }
              else if (isSelected && !isCorrect) { tint = '#EF4444'; shade = '#B91C1C'; bg = '#FEF2F2'; }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.answer, { backgroundColor: bg, borderColor: tint + '88', borderBottomColor: shade }]}
                  activeOpacity={0.8}
                  onPress={() => handleSelect(option)}
                  disabled={selectedOption !== null}
                >
                  <View style={[styles.letterBadge, { backgroundColor: tint }]}>
                    {isSelected ? (
                      <Ionicons name={isCorrect ? 'checkmark' : 'close'} size={16} color="#FFF" />
                    ) : (
                      <Text style={styles.letterText}>{letter}</Text>
                    )}
                  </View>
                  <Text style={styles.answerText}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {answered && currentQ.explanation ? (
            <VintaCard style={styles.feedbackFrame} contentStyle={styles.explanationBox}>
              <LucideIcon name="lightbulb" size={20} color={GOLD_TEXT} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.explanationTitle}>Cultural Insight</Text>
                <Text style={styles.explanationText}>{currentQ.explanation}</Text>
              </View>
            </VintaCard>
          ) : null}

          {selectedOption !== null && !isCorrect && wrongMessage && (
            <VintaCard style={styles.feedbackFrame} contentStyle={styles.wrongBox}>
              <LucideIcon name={wrongMessage.icon} size={26} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.wrongTitle}>{wrongMessage.line1}</Text>
                <Text style={styles.wrongDesc}>{wrongMessage.line2}</Text>
              </View>
            </VintaCard>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, !answered && styles.primaryBtnMuted]}
            onPress={handleNext}
            disabled={!answered}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Backdrop>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  backdropDim: { ...StyleSheet.absoluteFillObject, backgroundColor: BG_OVERLAY },
  container: { flex: 1, backgroundColor: 'transparent' },
  webview: { flex: 1, backgroundColor: 'transparent' },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(8,20,60,0.55)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },
  topBarTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#FFFFFF', marginRight: 'auto', marginLeft: 12 },
  xpPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.gold,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  xpPillText: { fontFamily: FONTS.bold, fontSize: 13, color: GOLD_TEXT },

  // Intro
  introScreen: { flex: 1, backgroundColor: '#FFFFFF' },
  introHero: { height: HERO_H + 40, backgroundColor: COLORS.navy, overflow: 'hidden' },
  introHeroDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,36,97,0.18)' },
  introHeroBar: { paddingHorizontal: 18, paddingTop: 8 },
  heroWave: { position: 'absolute', bottom: -1, left: 0 },
  introBody: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28 },
  introTitle: {
    fontFamily: FONTS.bold, fontSize: 28, lineHeight: 32, color: COLORS.navy,
    textAlign: 'center', marginTop: 4,
  },
  introSubtitle: {
    fontFamily: FONTS.medium, fontSize: 14, lineHeight: 19, color: COLORS.textSub,
    textAlign: 'center', marginTop: 6, maxWidth: 300,
  },
  guideWrap: { flex: 1, minHeight: 150, width: '100%', alignItems: 'center', justifyContent: 'center' },
  guideHalo: {
    position: 'absolute', width: 170, height: 170, borderRadius: 85,
    backgroundColor: COLORS.accentSoft,
  },
  guideImage: { width: 180, height: 180 },
  introStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  introInfo: {
    fontFamily: FONTS.semiBold, fontSize: 16, lineHeight: 21, color: COLORS.navy,
    textAlign: 'center', marginBottom: 18, maxWidth: 300,
  },

  // Primary pill button (Start / Next / Claim)
  primaryBtn: {
    alignSelf: 'stretch', height: 54, borderRadius: 27,
    backgroundColor: COLORS.accent,
    borderBottomWidth: 4, borderBottomColor: COLORS.accentDark,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.accent,
  },
  primaryBtnMuted: { opacity: 0.45 },
  primaryBtnText: { fontFamily: FONTS.bold, fontSize: 17, color: '#FFFFFF', letterSpacing: 0.3 },
  footer: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18 },

  // Question screen
  scroll: { paddingHorizontal: 18, paddingBottom: 16 },
  counterWrap: { alignItems: 'center', marginBottom: 14 },
  counterText: { fontFamily: FONTS.bold, fontSize: 22, color: '#FFFFFF', letterSpacing: 0.5 },
  segments: { flexDirection: 'row', gap: 6, marginTop: 6 },
  segment: { width: 26, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  segmentDone: { backgroundColor: COLORS.gold },
  segmentActive: { backgroundColor: COLORS.gold, width: 34 },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    backgroundColor: 'rgba(255,107,0,0.18)', borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: 'rgba(255,107,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 3,
  },
  streakText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFB066' },

  mediaFrame: { marginBottom: 16 },
  mediaCard: { padding: 0, overflow: 'hidden', borderRadius: 18 },
  mediaInner: { height: 170, width: '100%' },
  mediaImage: { borderRadius: 16 },

  questionText: {
    fontFamily: FONTS.bold, fontSize: 21, lineHeight: 26, color: '#FFFFFF',
    textAlign: 'center', marginBottom: 16, paddingHorizontal: 6,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  answer: {
    width: (SCREEN_W - 36 - 12) / 2,
    minHeight: 112,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  letterBadge: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  letterText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFFFFF' },
  answerText: { fontFamily: FONTS.semiBold, fontSize: 14, lineHeight: 18, color: COLORS.navy, textAlign: 'center' },

  feedbackFrame: { marginTop: 14 },
  explanationBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  explanationTitle: { fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 1, color: GOLD_TEXT, textTransform: 'uppercase' },
  explanationText: { fontFamily: FONTS.medium, fontSize: 14, lineHeight: 20, color: COLORS.textSub, marginTop: 2 },
  wrongBox: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  wrongTitle: { fontFamily: FONTS.bold, fontSize: 15, color: '#B91C1C' },
  wrongDesc: { fontFamily: FONTS.medium, fontSize: 13, lineHeight: 18, color: COLORS.textSub, marginTop: 2 },

  floatingToast: {
    position: 'absolute', top: 70, alignSelf: 'center', zIndex: 50,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    ...SHADOW.card,
  },
  floatingToastText: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF' },

  // Results
  resultBody: { paddingHorizontal: 18, paddingBottom: 16 },
  resultCard: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 18 },
  resultName: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.navy, marginTop: 10 },
  resultSub: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  resultPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.gold,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  resultPillText: { fontFamily: FONTS.bold, fontSize: 13, color: GOLD_TEXT },
  tileGrid: {
    alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', rowGap: 12, marginTop: 20,
  },
  tile: {
    width: '48%', minHeight: 104, borderRadius: 20,
    borderBottomWidth: 5,
    alignItems: 'center', justifyContent: 'center', padding: 10,
  },
  tileValue: { fontFamily: FONTS.bold, fontSize: 30, lineHeight: 34, color: '#FFFFFF' },
  tileLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#FFFFFF', textAlign: 'center', marginTop: 2 },
});
