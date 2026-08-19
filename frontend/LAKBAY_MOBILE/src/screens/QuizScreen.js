import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, StatusBar, ScrollView, Animated, Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { getSpotTrivia, getIconTrivia, awardSpotBadge } from '../api/qrService';
import { authService } from '../api/authService';

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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function QuizScreen({ navigation, route }) {
  const icon     = route.params?.icon     ?? null;
  const spotId   = route.params?.spotId   ?? null;
  const spotName = route.params?.spotName ?? 'Cultural Spot';

  const isIconMode  = !spotId && !!icon;
  const accentColor = icon?.color ?? '#A855F7';
  const displayName = spotName || icon?.name || 'Challenge';

  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [questions, setQuestions]           = useState([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect]           = useState(null);
  const [showReward, setShowReward]         = useState(false);
  const [reward, setReward]                 = useState({ xp_earned: 0, total_xp: 0, awarded: false });
  
  // Gamification states: XP, streaks, combo multiplier
  const [userProfile, setUserProfile]       = useState(null);
  const [sessionXP, setSessionXP]           = useState(0);
  const [streak, setStreak]                 = useState(0);
  const [maxStreak, setMaxStreak]           = useState(0);
  const [floatingToast, setFloatingToast]   = useState(null); // { text, color, iconName }

  // Animations
  const toastFadeAnim  = useRef(new Animated.Value(0)).current;
  const toastSlideAnim = useRef(new Animated.Value(20)).current;
  const cardScaleAnim  = useRef(new Animated.Value(1)).current;
  const streakScale    = useRef(new Animated.Value(1)).current;
  const pulseGlow      = useRef(new Animated.Value(0)).current;
  const trophySpin     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseGlow, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // 3-D viewer model
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

      // Streak celebration animation
      Animated.sequence([
        Animated.timing(streakScale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(streakScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      // Bonus XP calculation for streaks
      const earnedXP = 10;
      setSessionXP(prev => prev + earnedXP);
      
      const toastMsg = newStreak > 1 ? `+${earnedXP} XP! 🔥 ${newStreak}x STREAK!` : `+${earnedXP} XP! ✨ Perfect!`;
      showFloatingToast(toastMsg, '#10B981', newStreak > 1 ? 'flame' : 'sparkles');

      // Card pop animation
      Animated.sequence([
        Animated.timing(cardScaleAnim, { toValue: 1.03, duration: 140, useNativeDriver: true }),
        Animated.timing(cardScaleAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();

      authService.adjustXP(earnedXP).then(res => {
        if (res?.xp != null) setUserProfile(p => p ? { ...p, xp: res.xp } : p);
      }).catch(console.error);

    } else {
      setStreak(0);
      const currentTotalXP = (userProfile?.xp ?? 0);

      if (currentTotalXP === 0 && sessionXP === 0) {
        // Beginner Protection Shield
        showFloatingToast('Extra Chance! 🛡️ Shield Active', '#38BDF8', 'shield-checkmark');
      } else {
        // Penalty
        setSessionXP(prev => Math.max(0, prev - 5));
        showFloatingToast('-5 XP 💔 Keep Going!', '#EF4444', 'alert-circle');

        authService.adjustXP(-5).then(res => {
          if (res?.xp != null) setUserProfile(p => p ? { ...p, xp: res.xp } : p);
        }).catch(console.error);
      }

      setTimeout(() => {
        setSelectedOption(null);
        setIsCorrect(null);
        setFloatingToast(null);
      }, 1600);
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
          const result = await awardSpotBadge(spotId);
          setReward(result);
        } catch {
          setReward({ xp_earned: sessionXP, total_xp: userProfile?.xp || 0, awarded: true });
        }
      } else {
        setReward({ xp_earned: sessionXP, total_xp: userProfile?.xp || 0, awarded: true });
      }
      setShowReward(true);
    }
  };

  // ── Loading Screen ──
  if (loading) {
    return (
      <SafeAreaView style={styles.centerBg}>
        <StatusBar barStyle="light-content" backgroundColor="#070714" />
        <View style={styles.loadingAura}>
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
        <Text style={styles.loadingTitle}>POWERING UP TRIVIA</Text>
        <Text style={styles.loadingSub}>Loading cultural challenge for {displayName}…</Text>
      </SafeAreaView>
    );
  }

  // ── Error Screen ──
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#070714" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>CHALLENGE ERROR</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="help-circle-outline" size={54} color="rgba(255,255,255,0.4)" />
          </View>
          <Text style={styles.errorHeading}>Quiz Unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color="#A855F7" style={{ marginRight: 6 }} />
            <Text style={styles.ghostBtnText}>Return to Radar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Reward / Victory Screen ──
  if (showReward) {
    const accuracy = questions.length > 0 ? Math.round(((sessionXP / (questions.length * 10))) * 100) : 100;
    return (
      <SafeAreaView style={styles.rewardContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#070714" />
        
        {/* Confetti Aura Background */}
        <View style={styles.victoryGlow} />

        <ScrollView contentContainerStyle={styles.rewardBody} showsVerticalScrollIndicator={false}>
          {/* Animated Trophy Banner */}
          <View style={styles.trophyRingOuter}>
            <View style={styles.trophyRingInner}>
              <Ionicons name="trophy" size={76} color="#FBBF24" />
            </View>
            <View style={styles.trophyStarPill}>
              <Ionicons name="sparkles" size={14} color="#FFF" />
              <Text style={styles.trophyStarText}>CHALLENGE COMPLETE</Text>
            </View>
          </View>

          <Text style={styles.rewardTitle}>QUEST COMPLETED!</Text>
          <Text style={styles.rewardSub}>You have proven your mastery of {displayName}!</Text>

          {/* Gamified Summary Stat Matrix */}
          <View style={styles.statMatrix}>
            <View style={styles.statCell}>
              <Ionicons name="flash" size={20} color="#FBBF24" />
              <Text style={styles.statCellValue}>+{sessionXP}</Text>
              <Text style={styles.statCellLabel}>XP GAINED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Ionicons name="flame" size={20} color="#EF4444" />
              <Text style={styles.statCellValue}>{maxStreak}x</Text>
              <Text style={styles.statCellLabel}>BEST STREAK</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={styles.statCellValue}>{questions.length}</Text>
              <Text style={styles.statCellLabel}>ANSWERED</Text>
            </View>
          </View>

          {/* Reward Badges pill */}
          <View style={styles.badgeRewardCard}>
            <Ionicons name="medal" size={26} color="#A855F7" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.badgeCardTitle}>Explorer Ranking Updated</Text>
              <Text style={styles.badgeCardSub}>XP is synced live to your Journey profile badges!</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.rewardFooter}>
          <TouchableOpacity
            style={styles.claimBtn}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Ionicons name="sparkles" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.claimBtnText}>CLAIM & CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070714" />

      {/* ── Arcade Top HUD ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Streak Counter Badge */}
        {streak > 1 && (
          <Animated.View style={[styles.streakPill, { transform: [{ scale: streakScale }] }]}>
            <Ionicons name="flame" size={16} color="#FF6B00" />
            <Text style={styles.streakText}>{streak}x STREAK</Text>
          </Animated.View>
        )}

        {/* Live Total XP Badge */}
        <View style={styles.topXPBadge}>
          <Ionicons name="flash" size={14} color="#FBBF24" />
          <Text style={styles.topXPText}>{(userProfile?.xp ?? 0)} XP</Text>
        </View>
      </View>

      {/* Floating Animated Reward Toast */}
      {floatingToast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingToast,
            {
              backgroundColor: floatingToast.color,
              opacity: toastFadeAnim,
              transform: [{ translateY: toastSlideAnim }],
            },
          ]}
        >
          <Ionicons name={floatingToast.iconName || 'sparkles'} size={16} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.floatingToastText}>{floatingToast.text}</Text>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── 3D Model Visual (icon catch mode) ── */}
        {isIconMode && (
          <View style={styles.modelSection}>
            <View style={[styles.modelCard, { borderColor: accentColor + '66' }]}>
              {viewerHTML ? (
                <WebView
                  source={{ html: viewerHTML }}
                  style={styles.webview}
                  javaScriptEnabled
                  originWhitelist={['https://*']}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.noModel}>
                  <Ionicons name="cube-outline" size={40} color={accentColor} style={{ opacity: 0.5 }} />
                </View>
              )}
            </View>
            <View style={styles.modelTagPill}>
              <Ionicons name="cube" size={12} color={accentColor} style={{ marginRight: 5 }} />
              <Text style={[styles.modelTagText, { color: accentColor }]}>{icon.name}</Text>
            </View>
          </View>
        )}

        {/* ── Neon Progress Header ── */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <View style={styles.badgeRound}>
              <Text style={styles.badgeRoundText}>Q{currentIndex + 1}</Text>
            </View>
            <Text style={styles.progressCounter}>
              QUESTION {currentIndex + 1} OF {questions.length}
            </Text>
            <View style={styles.sessionPill}>
              <Ionicons name="add-circle" size={13} color="#10B981" />
              <Text style={styles.sessionPillText}>+{sessionXP} XP</Text>
            </View>
          </View>
          
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* ── Cyber Quest Question Card ── */}
        <Animated.View style={[styles.questionCard, { transform: [{ scale: cardScaleAnim }] }]}>
          <View style={styles.cardHeaderAccent} />
          <Text style={styles.questionText}>{currentQ.question}</Text>
        </Animated.View>

        {/* ── Multiple Choice Arcade Options (A, B, C, D) ── */}
        <View style={styles.options}>
          {currentQ.choices.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectAnswer = option === currentQ.choices[currentQ.correct_index];
            const showCorrect = selectedOption !== null && isCorrectAnswer && !isCorrect;
            const letter = OPTION_LETTERS[idx] || String(idx + 1);

            let cardBg = '#111126';
            let cardBorder = 'rgba(255,255,255,0.08)';
            let letterBg = 'rgba(255,255,255,0.06)';
            let letterColor = '#94A3B8';
            let textColor = '#F1F5F9';
            let rightIcon = null;

            if (isSelected && isCorrect) {
              cardBg = '#064E3B';
              cardBorder = '#10B981';
              letterBg = '#10B981';
              letterColor = '#FFF';
              textColor = '#FFF';
              rightIcon = <Ionicons name="checkmark-circle" size={22} color="#10B981" />;
            } else if (isSelected && !isCorrect) {
              cardBg = '#4C0519';
              cardBorder = '#EF4444';
              letterBg = '#EF4444';
              letterColor = '#FFF';
              textColor = '#FFF';
              rightIcon = <Ionicons name="close-circle" size={22} color="#EF4444" />;
            } else if (showCorrect) {
              cardBg = '#064E3B';
              cardBorder = '#10B981';
              letterBg = '#10B981';
              letterColor = '#FFF';
              textColor = '#FFF';
              rightIcon = <Ionicons name="checkmark-circle" size={22} color="#10B981" />;
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optionBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.78}
                onPress={() => handleSelect(option)}
              >
                {/* Option Letter Tag (A, B, C, D) */}
                <View style={[styles.letterBox, { backgroundColor: letterBg }]}>
                  <Text style={[styles.letterText, { color: letterColor }]}>{letter}</Text>
                </View>

                {/* Option Content Text */}
                <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                {rightIcon}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Explanation & Next Question Banner ── */}
        {selectedOption !== null && (
          <View style={styles.feedback}>
            {isCorrect && currentQ.explanation ? (
              <View style={styles.explanationBox}>
                <Ionicons name="bulb" size={20} color="#FBBF24" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.explanationTitle}>CULTURAL INSIGHT</Text>
                  <Text style={styles.explanationText}>{currentQ.explanation}</Text>
                </View>
              </View>
            ) : null}

            {isCorrect && (
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.88}>
                <Text style={styles.nextBtnText}>
                  {currentIndex < questions.length - 1 ? 'NEXT QUESTION' : 'COMPLETE CHALLENGE'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Gamified Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070714' },

  centerBg: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#070714', paddingHorizontal: 30,
  },
  loadingAura: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(168,85,247,0.12)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.3)',
    marginBottom: 20,
  },
  loadingTitle: {
    fontFamily: FONTS.bold, fontSize: 16, color: '#A855F7',
    letterSpacing: 2, marginBottom: 6,
  },
  loadingSub: {
    fontFamily: FONTS.medium, fontSize: 13, color: '#64748B',
    textAlign: 'center',
  },

  centerContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  errorIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  errorHeading: {
    fontFamily: FONTS.bold, fontSize: 20, color: '#FFF', marginBottom: 8,
  },
  errorText: {
    fontFamily: FONTS.medium, color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 24,
    backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: 24,
    borderWidth: 1.5, borderColor: '#A855F7',
  },
  ghostBtnText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 14 },

  // Top HUD Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#0B0B1E',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  topBarTitle: {
    fontFamily: FONTS.bold, fontSize: 14, color: '#94A3B8', letterSpacing: 1.5,
  },
  streakPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,107,0,0.18)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,107,0,0.5)',
    gap: 4,
  },
  streakText: {
    fontFamily: FONTS.bold, fontSize: 12, color: '#FF8C00', letterSpacing: 0.5,
  },
  topXPBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
    gap: 5,
  },
  topXPText: {
    fontFamily: FONTS.bold, fontSize: 13, color: '#FBBF24',
  },

  // Floating Toast
  floatingToast: {
    position: 'absolute', top: 75, alignSelf: 'center', zIndex: 999,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 24, shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 10,
  },
  floatingToastText: {
    fontFamily: FONTS.bold, fontSize: 14, color: '#FFF', letterSpacing: 0.5,
  },

  scroll: { paddingBottom: 40 },

  // 3D Model Box
  modelSection: { alignItems: 'center', paddingHorizontal: 20, marginTop: 14 },
  modelCard: {
    width: '100%', height: 190,
    borderRadius: 20, borderWidth: 1.5,
    overflow: 'hidden', backgroundColor: '#0D0D22',
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  noModel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modelTagPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#13132B', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, marginTop: -14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modelTagText: { fontFamily: FONTS.bold, fontSize: 13 },

  // Progress Section
  progressSection: { paddingHorizontal: 20, marginTop: 18, marginBottom: 14 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  badgeRound: {
    backgroundColor: '#6366F1', width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  badgeRoundText: { fontFamily: FONTS.bold, fontSize: 11, color: '#FFF' },
  progressCounter: { fontFamily: FONTS.bold, fontSize: 12, color: '#94A3B8', letterSpacing: 1, flex: 1 },
  sessionPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', gap: 4,
  },
  sessionPillText: { fontFamily: FONTS.bold, fontSize: 12, color: '#10B981' },
  progressBg: {
    height: 8, backgroundColor: '#13132B', borderRadius: 6, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  progressFill: {
    height: '100%', borderRadius: 6,
    backgroundColor: '#8B5CF6',
  },

  // Question Card
  questionCard: {
    marginHorizontal: 20, padding: 22,
    backgroundColor: '#0F0F26', borderRadius: 22,
    borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.35)', marginBottom: 18,
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 6,
    position: 'relative', overflow: 'hidden',
  },
  cardHeaderAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: '#8B5CF6',
  },
  questionText: {
    fontFamily: FONTS.bold, fontSize: 17, color: '#FFF', lineHeight: 27,
  },

  // Options
  options: { paddingHorizontal: 20, gap: 12 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 18, borderWidth: 1.5,
  },
  letterBox: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  letterText: { fontFamily: FONTS.bold, fontSize: 14 },
  optionText: {
    fontFamily: FONTS.semiBold, fontSize: 14, flex: 1, marginRight: 8, lineHeight: 20,
  },

  // Feedback & Next Button
  feedback: { marginTop: 16, paddingHorizontal: 20, paddingBottom: 20 },
  explanationBox: {
    flexDirection: 'row', backgroundColor: '#0D1B2A',
    padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#1E3A8A',
    alignItems: 'flex-start', marginBottom: 14,
  },
  explanationTitle: { fontFamily: FONTS.bold, fontSize: 11, color: '#FBBF24', letterSpacing: 1, marginBottom: 4 },
  explanationText: { fontFamily: FONTS.medium, fontSize: 13, color: '#CBD5E1', lineHeight: 20 },
  nextBtn: {
    flexDirection: 'row', backgroundColor: '#10B981', paddingVertical: 16,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    gap: 8,
  },
  nextBtnText: {
    fontFamily: FONTS.bold, fontSize: 14, color: '#FFF', letterSpacing: 1.2,
  },

  // Victory / Reward Modal
  rewardContainer: {
    flex: 1, backgroundColor: '#070714', justifyContent: 'space-between',
  },
  victoryGlow: {
    position: 'absolute', top: 60, alignSelf: 'center',
    width: SCREEN_W * 0.9, height: SCREEN_W * 0.9, borderRadius: (SCREEN_W * 0.9) / 2,
    backgroundColor: 'rgba(168,85,247,0.1)',
  },
  rewardBody: {
    alignItems: 'center', paddingHorizontal: 24, paddingTop: 30, paddingBottom: 30,
  },
  trophyRingOuter: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 2, borderColor: 'rgba(251,191,36,0.4)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative',
  },
  trophyRingInner: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(251,191,36,0.18)', justifyContent: 'center', alignItems: 'center',
  },
  trophyStarPill: {
    position: 'absolute', bottom: -10, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, gap: 4,
  },
  trophyStarText: { fontFamily: FONTS.bold, fontSize: 10, color: '#FFF', letterSpacing: 1 },
  rewardTitle: {
    fontFamily: FONTS.bold, fontSize: 26, color: '#FFF', letterSpacing: 1, textAlign: 'center', marginBottom: 6,
  },
  rewardSub: {
    fontFamily: FONTS.medium, fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 26, paddingHorizontal: 20,
  },

  // Stat Matrix
  statMatrix: {
    flexDirection: 'row', width: '100%', backgroundColor: '#0F0F26',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 18, marginBottom: 20, justifyContent: 'space-around', alignItems: 'center',
  },
  statCell: { alignItems: 'center' },
  statCellValue: { fontFamily: FONTS.bold, fontSize: 18, color: '#FFF', marginTop: 4 },
  statCellLabel: { fontFamily: FONTS.bold, fontSize: 10, color: '#64748B', letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.08)' },

  badgeRewardCard: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: '#12122D', padding: 16, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  badgeCardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFF' },
  badgeCardSub: { fontFamily: FONTS.medium, fontSize: 12, color: '#94A3B8', marginTop: 2 },

  rewardFooter: { paddingHorizontal: 24, paddingBottom: 36 },
  claimBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#8B5CF6',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  claimBtnText: {
    fontFamily: FONTS.bold, fontSize: 15, color: '#FFF', letterSpacing: 1.5,
  },
});
