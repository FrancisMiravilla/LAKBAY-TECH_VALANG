import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

export default function QuizScreen({ navigation, route }) {
  // Information passed from the previous screen (e.g., CatchDetailsScreen)
  // If no data is passed, we provide some fallback info for testing
  const topic = route.params?.topic || 'Curacha';
  const information = route.params?.information || `
    The Curacha (Ranina ranina), also known as the spanner crab, is a large sea crab unique to the 
    warm coastal waters surrounding Zamboanga City. Distinguished by its bright orange shell and flat, 
    paddle-like claws, it is prized across the Philippines for its exceptionally rich, buttery meat. 
    It is most famously served drenched in Alavar sauce — a secret blend of coconut milk, spices, 
    and aromatic herbs perfected over generations at the legendary Alavar Restaurant, founded in 1948.
    
    The Curacha is more than a seafood delicacy — it is a proud symbol of Zamboangueño identity and 
    coastal culinary heritage. Served at family fiestas, local celebrations, and tourist dining tables alike, it 
    brings people together to experience the true flavor of the City of Flowers.
  `;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    generateQuiz();
  }, []);

  const generateQuiz = async () => {
    // Completely offline fallback database of quizzes
    const QUIZ_DB = {
      'Curacha': [
        {
          question: "What is the scientific name of the Curacha?",
          options: ["Ranina ranina", "Scylla serrata", "Portunus pelagicus", "Chionoecetes opilio"],
          correct_answer: "Ranina ranina"
        },
        {
          question: "What makes the Curacha's claws unique?",
          options: ["They are paddle-like", "They have venom", "They are razor sharp", "They glow in the dark"],
          correct_answer: "They are paddle-like"
        },
        {
          question: "Which city is the Curacha most famous in?",
          options: ["Zamboanga City", "Cebu City", "Manila", "Davao City"],
          correct_answer: "Zamboanga City"
        },
        {
          question: "What is the famous sauce the Curacha is often drenched in?",
          options: ["Alavar sauce", "Soy sauce", "Sweet chili sauce", "Garlic butter sauce"],
          correct_answer: "Alavar sauce"
        },
        {
          question: "When was the legendary Alavar Restaurant founded?",
          options: ["1948", "1950", "1962", "1930"],
          correct_answer: "1948"
        }
      ],
      'AR': [
        {
          question: "Since what century have the Yakan people woven their textiles?",
          options: ["10th century", "14th century", "18th century", "20th century"],
          correct_answer: "14th century"
        },
        {
          question: "Which people in Basilan are known for this traditional loom?",
          options: ["Tausug", "Sama-Bajau", "Yakan", "Maranao"],
          correct_answer: "Yakan"
        },
        {
          question: "What does Yakan weaving primarily signify?",
          options: ["Identity and social standing", "Military rank", "Age", "Marital status"],
          correct_answer: "Identity and social standing"
        },
        {
          question: "What is the traditional Yakan headcloth called?",
          options: ["Malong", "Pis siyabit", "Barong", "Tubao"],
          correct_answer: "Pis siyabit"
        },
        {
          question: "What type of patterns are typical in Yakan textiles?",
          options: ["Floral", "Animal", "Geometric", "Abstract"],
          correct_answer: "Geometric"
        }
      ],
      'QR': [
        {
          question: "Who built Fort Pilar in 1635?",
          options: ["Ferdinand Magellan", "Jose Rizal", "Melchor de Vera", "Miguel Lopez de Legazpi"],
          correct_answer: "Melchor de Vera"
        },
        {
          question: "What year was Fort Pilar built?",
          options: ["1521", "1635", "1898", "1945"],
          correct_answer: "1635"
        },
        {
          question: "Who is the patroness housed in the shrine?",
          options: ["Our Lady of the Pillar", "Our Lady of Manaoag", "Our Lady of Peace", "Our Lady of Sorrows"],
          correct_answer: "Our Lady of the Pillar"
        },
        {
          question: "Fort Pilar was declared what in 1973?",
          options: ["World Heritage Site", "National Cultural Treasure", "National Park", "Historical Landmark"],
          correct_answer: "National Cultural Treasure"
        },
        {
          question: "Which institution currently manages the Fort Pilar museum?",
          options: ["Department of Tourism", "National Historical Commission", "National Museum of the Philippines", "Zamboanga City Hall"],
          correct_answer: "National Museum of the Philippines"
        }
      ]
    };

    // Simulate a slight loading delay to feel like it's processing
    setTimeout(() => {
      // Default to Curacha if topic not found
      const quiz = QUIZ_DB[topic] || QUIZ_DB['Curacha'];
      setQuestions(quiz);
      setLoading(false);
    }, 1000);
  };

  const handleSelectOption = (option) => {
    if (selectedOption !== null) return; // Prevent clicking multiple times
    
    setSelectedOption(option);
    
    const correct = option === questions[currentIndex].correct_answer;
    setIsCorrect(correct);

    setTimeout(() => {
      if (correct) {
        if (currentIndex < questions.length - 1) {
          // Go to next question
          setCurrentIndex(currentIndex + 1);
          setSelectedOption(null);
          setIsCorrect(null);
        } else {
          // Quiz finished! Gamified reward
          setShowReward(true);
        }
      } else {
        // Try again on this question
        setSelectedOption(null);
        setIsCorrect(null);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E8C" />
        <Text style={styles.loadingText}>Loading {topic} quiz...</Text>
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
          <Text style={styles.rewardTitle}>Congratulations! 🎉</Text>
          <Text style={styles.rewardSubTitle}>You successfully mastered {topic}</Text>
          
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={24} color="#FBBF24" />
            <Text style={styles.xpText}>+50 XP</Text>
            <Ionicons name="star" size={24} color="#FBBF24" />
          </View>
          
          <Text style={styles.rewardMessage}>
            Great job, Explorer! Keep discovering new artifacts to level up your character.
          </Text>
        </View>

        <View style={styles.rewardFooter}>
          <TouchableOpacity 
            style={styles.claimBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (topic === 'AR' || topic === 'QR') {
                // Return to explore/home tab if AR/QR
                navigation.navigate('MainTabs');
              } else {
                navigation.navigate('Catch');
              }
            }}
          >
            <Text style={styles.claimBtnText}>CLAIM REWARD</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return null; // or some error state
  }

  const currentQ = questions[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0920" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Question {currentIndex + 1} of {questions.length}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentIndex) / questions.length) * 100}%` }]} />
        </View>
      </View>

      {/* Question Card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQ.question}</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {currentQ.options.map((option, index) => {
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
            // Show correct answer if they got it wrong
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

      {/* Feedback Message */}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0920',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontFamily: FONTS.semiBold,
    color: '#FFF',
    fontSize: 16,
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
    backgroundColor: '#E91E8C',
    borderRadius: 4,
  },
  questionCard: {
    marginHorizontal: 24,
    padding: 24,
    backgroundColor: '#1C1434',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E91E8C',
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
    backgroundColor: '#E91E8C',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E91E8C',
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
  }
});
