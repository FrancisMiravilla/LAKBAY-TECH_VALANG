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
          question: "What does AR stand for?",
          options: ["Augmented Reality", "Artificial Reality", "Automated Reality", "Actual Reality"],
          correct_answer: "Augmented Reality"
        },
        {
          question: "How does AR differ from VR?",
          options: ["AR overlays digital elements onto the real world", "AR replaces the real world entirely", "AR is only for games", "AR requires a heavy headset"],
          correct_answer: "AR overlays digital elements onto the real world"
        },
        {
          question: "Which device is most commonly used for everyday AR?",
          options: ["Smartphones", "Televisions", "Desktop Computers", "Smartwatches"],
          correct_answer: "Smartphones"
        },
        {
          question: "In Lakbay, what is the primary use of the AR feature?",
          options: ["Viewing 3D models of local culture/creatures", "Reading long articles", "Making phone calls", "Listening to music"],
          correct_answer: "Viewing 3D models of local culture/creatures"
        },
        {
          question: "What technology allows AR to detect flat surfaces?",
          options: ["Plane detection", "Face tracking", "GPS tracking", "Bluetooth scanning"],
          correct_answer: "Plane detection"
        }
      ],
      'QR': [
        {
          question: "What does QR stand for?",
          options: ["Quick Response", "Quantum Relay", "Quality Read", "Query Result"],
          correct_answer: "Quick Response"
        },
        {
          question: "What shape are the standard modules inside a QR code?",
          options: ["Squares", "Circles", "Triangles", "Hexagons"],
          correct_answer: "Squares"
        },
        {
          question: "Which feature makes QR codes readable even if slightly damaged?",
          options: ["Error correction", "Color coding", "High resolution", "Laser printing"],
          correct_answer: "Error correction"
        },
        {
          question: "How do you scan a QR code?",
          options: ["Using a smartphone camera", "Using a microphone", "Using a fingerprint scanner", "Using a keyboard"],
          correct_answer: "Using a smartphone camera"
        },
        {
          question: "What is typically stored inside a QR code?",
          options: ["URLs or Text data", "High definition video", "3D Models", "Audio files"],
          correct_answer: "URLs or Text data"
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
          // Quiz finished!
          Alert.alert('Congratulations! 🎉', `You successfully caught the ${topic}!`, [
            { text: 'Awesome!', onPress: () => navigation.navigate('Catch') }
          ]);
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
        <Text style={styles.loadingText}>AI is generating your {topic} quiz...</Text>
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
  }
});
