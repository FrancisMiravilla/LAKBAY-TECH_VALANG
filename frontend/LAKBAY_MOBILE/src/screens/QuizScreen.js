import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { getSpotTrivia, awardSpotBadge } from '../api/qrService';

export default function QuizScreen({ navigation, route }) {
  const spotId = route.params?.spotId;
  const spotName = route.params?.spotName || 'this spot';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState({ xp_earned: 0, total_xp: 0, awarded: false });

  useEffect(() => {
    if (!spotId) {
      setError('No spot selected.');
      setLoading(false);
      return;
    }

    getSpotTrivia(spotId)
      .then((data) => {
        if (!data.questions || data.questions.length === 0) {
          setError('No trivia questions available for this spot yet.');
        } else {
          setQuestions(data.questions);
        }
      })
      .catch(() => setError('Could not load quiz. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, [spotId]);

  const handleSelectOption = (option) => {
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
          // All questions answered — award badge
          try {
            const result = await awardSpotBadge(spotId);
            setReward(result);
          } catch {
            setReward({ xp_earned: 0, total_xp: 0, awarded: false });
          }
          setShowReward(true);
        }
      } else {
        setSelectedOption(null);
        setIsCorrect(null);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading quiz for {spotName}...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.4)" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtnSmall} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnSmallText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (showReward) {
    return (
      <SafeAreaView style={styles.rewardContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0920" />
        <View style={styles.rewardContent}>
          <View style={styles.rewardIconGlow}>
            <Ionicons name="trophy" size={80} color="#FBBF24" />
          </View>
          <Text style={styles.rewardTitle}>Congratulations!</Text>
          <Text style={styles.rewardSubTitle}>You mastered {spotName}</Text>

          {reward.awarded ? (
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={24} color="#FBBF24" />
              <Text style={styles.xpText}>+{reward.xp_earned} XP</Text>
              <Ionicons name="star" size={24} color="#FBBF24" />
            </View>
          ) : (
            <View style={styles.alreadyBadge}>
              <Text style={styles.alreadyBadgeText}>Badge already earned — no duplicate XP</Text>
            </View>
          )}

          <Text style={styles.rewardMessage}>
            {reward.awarded
              ? `Great job, Explorer! Total XP: ${reward.total_xp}`
              : 'Keep discovering new spots to earn more XP!'}
          </Text>
        </View>

        <View style={styles.rewardFooter}>
          <TouchableOpacity
            style={styles.claimBtn}
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

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Question {currentIndex + 1} of {questions.length}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(currentIndex / questions.length) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQ.question}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {currentQ.choices.map((option, index) => {
          let btnStyle = styles.optionBtn;
          let textStyle = styles.optionText;
          let icon = null;

          if (selectedOption === option) {
            if (isCorrect) {
              btnStyle = [styles.optionBtn, styles.optionCorrect];
              textStyle = [styles.optionText, { color: '#FFF' }];
              icon = <Ionicons name="checkmark-circle" size={20} color="#FFF" />;
            } else {
              btnStyle = [styles.optionBtn, styles.optionWrong];
              textStyle = [styles.optionText, { color: '#FFF' }];
              icon = <Ionicons name="close-circle" size={20} color="#FFF" />;
            }
          } else if (selectedOption !== null && option === currentQ.correct_answer && !isCorrect) {
            btnStyle = [styles.optionBtn, styles.optionCorrect];
            textStyle = [styles.optionText, { color: '#FFF' }];
            icon = <Ionicons name="checkmark-circle" size={20} color="#FFF" />;
          }

          return (
            <TouchableOpacity
              key={index}
              style={btnStyle}
              activeOpacity={0.7}
              onPress={() => handleSelectOption(option)}
            >
              <Text style={textStyle}>{option}</Text>
              {icon}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedOption !== null && (
        <View style={styles.feedbackContainer}>
          <Text style={[styles.feedbackText, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
            {isCorrect ? 'Correct! Awesome job!' : 'Oops! Try again.'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0920',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#0F0920',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 16,
  },
  loadingText: {
    marginTop: 8,
    fontFamily: FONTS.semiBold,
    color: '#FFF',
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  backBtnSmall: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },
  backBtnSmallText: {
    color: '#FFF',
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFF',
    letterSpacing: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 30,
  },
  progressText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  questionCard: {
    marginHorizontal: 24,
    padding: 24,
    backgroundColor: '#1C1434',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginBottom: 30,
    ...SHADOW.accent,
  },
  questionText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFF',
    lineHeight: 28,
  },
  optionsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  optionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#E2E8F0',
    flex: 1,
    marginRight: 10,
  },
  optionCorrect: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  optionWrong: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  feedbackContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  feedbackText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
  },
  rewardContainer: {
    flex: 1,
    backgroundColor: '#0F0920',
    justifyContent: 'space-between',
  },
  rewardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  rewardIconGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(251,191,36,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(251,191,36,0.4)',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  rewardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  rewardSubTitle: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#A0AEC0',
    marginBottom: 30,
    textAlign: 'center',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
  },
  xpText: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#FBBF24',
    marginHorizontal: 15,
  },
  alreadyBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  alreadyBadgeText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  rewardMessage: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  rewardFooter: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  claimBtn: {
    backgroundColor: COLORS.accent,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  claimBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 2,
  },
});
