import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { getAITrivia, getIconAITrivia, awardSpotBadge } from '../api/qrService';

// ─── 3-D viewer HTML (same security pattern as CatchDetailsScreen) ────────────
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
  <model-viewer src="${safe}" auto-rotate camera-controls exposure="1"
    style="width:100%;height:100%"></model-viewer>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuizScreen({ navigation, route }) {
  // Icon-based catch quiz
  const icon   = route.params?.icon   ?? null;
  // Spot-based quiz (existing flow)
  const spotId   = route.params?.spotId   ?? null;
  const spotName = route.params?.spotName ?? 'this spot';

  const isIconMode = !!icon;
  const accentColor = icon?.color ?? COLORS.accent;
  const displayName = isIconMode ? icon.name : spotName;

  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [questions, setQuestions]           = useState([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect]           = useState(null);
  const [showReward, setShowReward]         = useState(false);
  const [reward, setReward]                 = useState({ xp_earned: 0, total_xp: 0, awarded: false });

  // 3-D viewer HTML (only for icon mode)
  const viewerHTML = useMemo(() => {
    if (!isIconMode || !icon.model_3d) return null;
    return buildViewerHTML(icon.model_3d);
  }, [isIconMode, icon?.model_3d]);

  useEffect(() => {
    const fetchTrivia = isIconMode
      ? getIconAITrivia(icon.id)
      : spotId ? getAITrivia(spotId) : Promise.reject(new Error('no-id'));

    fetchTrivia
      .then((data) => {
        if (!data.questions?.length) {
          setError('No trivia questions available yet.');
        } else {
          setQuestions(data.questions);
        }
      })
      .catch((err) => {
        if (err.message === 'no-id') {
          setError('No icon or spot selected.');
        } else if (err?.code === 'ECONNABORTED') {
          setError('The AI is taking too long to respond. Please try again.');
        } else {
          setError(err?.response?.data?.error || 'Could not load quiz. Make sure the backend is running.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (option) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);
    const correct = option === questions[currentIndex].correct_answer;
    setIsCorrect(correct);

    setTimeout(async () => {
      if (correct) {
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
              setReward({ xp_earned: 0, total_xp: 0, awarded: false });
            }
          }
          setShowReward(true);
        }
      } else {
        setSelectedOption(null);
        setIsCorrect(null);
      }
    }, 1400);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: '#0F0920' }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={styles.loadingText}>AI is generating trivia for {displayName}…</Text>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0920" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Capture Challenge</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="help-circle-outline" size={48} color="rgba(255,255,255,0.25)" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.ghostBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Reward ───────────────────────────────────────────────────────────────────
  if (showReward) {
    return (
      <SafeAreaView style={styles.rewardContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0920" />
        <View style={styles.rewardBody}>
          <View style={[styles.trophyRing, { borderColor: accentColor + '66', backgroundColor: accentColor + '22' }]}>
            <Ionicons name="trophy" size={72} color="#FBBF24" />
          </View>
          <Text style={styles.rewardTitle}>Congratulations!</Text>
          <Text style={styles.rewardSub}>You mastered {displayName}!</Text>

          {!isIconMode && reward.awarded ? (
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={22} color="#FBBF24" />
              <Text style={styles.xpText}>+{reward.xp_earned} XP</Text>
              <Ionicons name="star" size={22} color="#FBBF24" />
            </View>
          ) : (
            <View style={styles.noBadge}>
              <Text style={styles.noBadgeText}>
                {isIconMode ? 'Great job, Explorer!' : 'Badge already earned — no duplicate XP'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.rewardFooter}>
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: accentColor }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.claimBtnText}>CLAIM REWARD</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0920" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Capture Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── 3D Model (icon mode only) ── */}
        {isIconMode && (
          <View style={styles.modelSection}>
            <View style={[styles.modelCard, { borderColor: accentColor + '55' }]}>
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
            <Text style={[styles.modelName, { color: accentColor }]}>{icon.name}</Text>
          </View>
        )}

        {/* ── Progress ── */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${(currentIndex / questions.length) * 100}%`,
              backgroundColor: accentColor,
            }]} />
          </View>
        </View>

        {/* ── Question card ── */}
        <View style={[styles.questionCard, { borderColor: accentColor }]}>
          <Text style={styles.questionText}>{currentQ.question}</Text>
        </View>

        {/* ── Options ── */}
        <View style={styles.options}>
          {currentQ.choices.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectAnswer = option === currentQ.correct_answer;
            const showCorrect = selectedOption !== null && isCorrectAnswer && !isCorrect;

            let bg = 'rgba(255,255,255,0.05)';
            let border = 'rgba(255,255,255,0.1)';
            let textColor = '#E2E8F0';
            let icon = null;

            if (isSelected && isCorrect) {
              bg = '#10B981'; border = '#10B981';
              textColor = '#FFF';
              icon = <Ionicons name="checkmark-circle" size={18} color="#FFF" />;
            } else if (isSelected && !isCorrect) {
              bg = '#EF4444'; border = '#EF4444';
              textColor = '#FFF';
              icon = <Ionicons name="close-circle" size={18} color="#FFF" />;
            } else if (showCorrect) {
              bg = '#10B981'; border = '#10B981';
              textColor = '#FFF';
              icon = <Ionicons name="checkmark-circle" size={18} color="#FFF" />;
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
                activeOpacity={0.75}
                onPress={() => handleSelect(option)}
              >
                <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                {icon}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Feedback ── */}
        {selectedOption !== null && (
          <View style={styles.feedback}>
            <Text style={[styles.feedbackText, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
              {isCorrect ? 'Correct! Awesome!' : 'Oops! Try again.'}
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0920' },

  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 30, gap: 16, backgroundColor: '#0F0920',
  },
  loadingText: {
    fontFamily: FONTS.semiBold, color: '#FFF', fontSize: 14,
    textAlign: 'center', marginTop: 8,
  },
  errorText: {
    fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.6)',
    fontSize: 14, textAlign: 'center', lineHeight: 22,
  },
  ghostBtn: {
    marginTop: 4, paddingVertical: 10, paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
  },
  ghostBtnText: { color: '#FFF', fontFamily: FONTS.semiBold, fontSize: 14 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  topBarTitle: { fontFamily: FONTS.bold, fontSize: 17, color: '#FFF', letterSpacing: 0.8 },

  scroll: { paddingBottom: 44 },

  // 3D model section
  modelSection: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  modelCard: {
    width: '100%', height: 220,
    borderRadius: RADIUS.md, borderWidth: 1,
    overflow: 'hidden', backgroundColor: '#12102A',
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  noModel: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  modelName: {
    fontFamily: FONTS.bold, fontSize: 20, marginTop: 12,
    letterSpacing: 0.3,
  },

  // Progress
  progressSection: { paddingHorizontal: 24, marginBottom: 18 },
  progressLabel: {
    fontFamily: FONTS.semiBold, fontSize: 13, color: '#A0AEC0', marginBottom: 8,
  },
  progressBg: {
    height: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },

  // Question
  questionCard: {
    marginHorizontal: 24, padding: 22,
    backgroundColor: '#1C1434', borderRadius: 18,
    borderWidth: 1, marginBottom: 20,
  },
  questionText: {
    fontFamily: FONTS.bold, fontSize: 17, color: '#FFF', lineHeight: 27,
  },

  // Options
  options: { paddingHorizontal: 24, gap: 12 },
  optionBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 15,
    borderRadius: 14, borderWidth: 1,
  },
  optionText: {
    fontFamily: FONTS.medium, fontSize: 14, flex: 1, marginRight: 10,
  },

  // Feedback
  feedback: { marginTop: 18, alignItems: 'center' },
  feedbackText: { fontFamily: FONTS.bold, fontSize: 17 },

  // Reward
  rewardContainer: {
    flex: 1, backgroundColor: '#0F0920', justifyContent: 'space-between',
  },
  rewardBody: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30,
  },
  trophyRing: {
    width: 130, height: 130, borderRadius: 65,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28, borderWidth: 2,
    shadowColor: '#FBBF24', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 18, elevation: 10,
  },
  rewardTitle: {
    fontFamily: FONTS.bold, fontSize: 26, color: '#FFF',
    marginBottom: 8, textAlign: 'center',
  },
  rewardSub: {
    fontFamily: FONTS.medium, fontSize: 15, color: '#A0AEC0',
    marginBottom: 28, textAlign: 'center',
  },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.18)',
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 30, borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.45)',
  },
  xpText: {
    fontFamily: FONTS.bold, fontSize: 22, color: '#FBBF24', marginHorizontal: 14,
  },
  noBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  noBadgeText: {
    color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.medium, fontSize: 13,
  },
  rewardFooter: { paddingHorizontal: 24, paddingBottom: 38 },
  claimBtn: {
    height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45,
    shadowRadius: 12, elevation: 8,
  },
  claimBtnText: {
    fontFamily: FONTS.bold, fontSize: 15, color: '#FFF', letterSpacing: 2,
  },
});
