import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Question = {
  question: string;
  choices: string[];
  answer: number;
};

const MOCK_QUESTIONS: Question[] = [
  {
    question: "What is the main purpose of a database?",
    choices: [
      "To design websites",
      "To organize and manage data",
      "To create animations",
      "To connect computers",
    ],
    answer: 1,
  },
  {
    question: "Which key uniquely identifies a record in a table?",
    choices: [
      "Foreign Key",
      "Secondary Key",
      "Primary Key",
      "Normal Key",
    ],
    answer: 2,
  },
  {
    question: "What does SQL stand for?",
    choices: [
      "Structured Query Language",
      "System Query Logic",
      "Standard Question Language",
      "Structured Quality Logic",
    ],
    answer: 0,
  },
  {
    question: "What is a foreign key used for?",
    choices: [
      "Deleting records",
      "Creating relationships between tables",
      "Changing passwords",
      "Sorting files",
    ],
    answer: 1,
  },
  {
    question: "Why is database normalization used?",
    choices: [
      "To increase duplicate data",
      "To remove all tables",
      "To reduce unnecessary data duplication",
      "To make passwords stronger",
    ],
    answer: 2,
  },
];

export default function QuizScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);

  const question = MOCK_QUESTIONS[currentIndex];

  const progress =
    ((currentIndex + 1) / MOCK_QUESTIONS.length) * 100;

  const selectAnswer = (index: number) => {
    if (answered) return;

    setSelectedAnswer(index);
    setAnswered(true);

    if (index === question.answer) {
      setScore((previous) => previous + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < MOCK_QUESTIONS.length - 1) {
      setCurrentIndex((previous) => previous + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const percentage = Math.round(
      (score / MOCK_QUESTIONS.length) * 100
    );

    return (
      <View style={styles.resultContainer}>
        <View style={styles.resultIcon}>
          <Ionicons name="trophy" size={45} color="#FFF" />
        </View>

        <Text style={styles.resultTitle}>Quiz Complete!</Text>

        <Text style={styles.resultSubtitle}>
          Great job completing your review.
        </Text>

        <View style={styles.scoreCard}>
          <Text style={styles.percentage}>{percentage}%</Text>

          <Text style={styles.scoreLabel}>Quiz Accuracy</Text>

          <View style={styles.divider} />

          <Text style={styles.scoreText}>
            {score} out of {MOCK_QUESTIONS.length} correct
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={restartQuiz}
        >
          <Ionicons name="refresh" size={20} color="#FFF" />

          <Text style={styles.primaryButtonText}>
            Try Again
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>
            Finish Review
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={25} color="#555" />
        </TouchableOpacity>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` },
            ]}
          />
        </View>

        <Text style={styles.progressText}>
          {currentIndex + 1}/{MOCK_QUESTIONS.length}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.questionNumber}>
          QUESTION {currentIndex + 1}
        </Text>

        <Text style={styles.questionText}>
          {question.question}
        </Text>

        <View style={styles.choices}>
          {question.choices.map((choice, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = question.answer === index;

            let choiceStyle = styles.choice;
            let textStyle = styles.choiceText;

            if (answered) {
              if (isCorrect) {
                choiceStyle = {
                  ...styles.choice,
                  ...styles.correctChoice,
                };

                textStyle = {
                  ...styles.choiceText,
                  ...styles.correctChoiceText,
                };
              } else if (isSelected) {
                choiceStyle = {
                  ...styles.choice,
                  ...styles.wrongChoice,
                };

                textStyle = {
                  ...styles.choiceText,
                  ...styles.wrongChoiceText,
                };
              }
            } else if (isSelected) {
              choiceStyle = {
                ...styles.choice,
                ...styles.selectedChoice,
              };
            }

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                style={choiceStyle}
                onPress={() => selectAnswer(index)}
              >
                <View style={styles.choiceLetter}>
                  <Text style={styles.choiceLetterText}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>

                <Text style={textStyle}>
                  {choice}
                </Text>

                {answered && isCorrect && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#58CC02"
                  />
                )}

                {answered &&
                  isSelected &&
                  !isCorrect && (
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color="#FF4B4B"
                    />
                  )}
              </TouchableOpacity>
            );
          })}
        </View>

        {answered && (
          <View
            style={[
              styles.feedbackCard,
              selectedAnswer === question.answer
                ? styles.correctFeedback
                : styles.wrongFeedback,
            ]}
          >
            <Ionicons
              name={
                selectedAnswer === question.answer
                  ? "checkmark-circle"
                  : "information-circle"
              }
              size={25}
              color={
                selectedAnswer === question.answer
                  ? "#58CC02"
                  : "#FF4B4B"
              }
            />

            <View style={styles.feedbackContent}>
              <Text style={styles.feedbackTitle}>
                {selectedAnswer === question.answer
                  ? "Correct!"
                  : "Not quite"}
              </Text>

              <Text style={styles.feedbackText}>
                {selectedAnswer === question.answer
                  ? "Nice work! You remembered this concept."
                  : `The correct answer is: ${
                      question.choices[question.answer]
                    }`}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {answered && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={nextQuestion}
        >
          <Text style={styles.continueText}>
            {currentIndex === MOCK_QUESTIONS.length - 1
              ? "See Results"
              : "Continue"}
          </Text>

          <Ionicons
            name="arrow-forward"
            size={20}
            color="#FFF"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F5",
    padding: 22,
    maxWidth: 850,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },

  progressBar: {
    flex: 1,
    height: 13,
    borderRadius: 20,
    backgroundColor: "#E5E5E5",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#58CC02",
    borderRadius: 20,
  },

  progressText: {
    fontWeight: "800",
    color: "#666",
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 35,
    maxWidth: 650,
    width: "100%",
    alignSelf: "center",
  },

  questionNumber: {
    color: "#58CC02",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  questionText: {
    fontSize: 27,
    lineHeight: 36,
    fontWeight: "900",
    color: "#303030",
    marginBottom: 30,
  },

  choices: {
    gap: 12,
  },

  choice: {
    minHeight: 68,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#E4E4E4",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  selectedChoice: {
    borderColor: "#58CC02",
    backgroundColor: "#F5FFF0",
  },

  correctChoice: {
    borderColor: "#58CC02",
    backgroundColor: "#F2FFE9",
  },

  wrongChoice: {
    borderColor: "#FF4B4B",
    backgroundColor: "#FFF1F1",
  },

  choiceLetter: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },

  choiceLetterText: {
    fontWeight: "900",
    color: "#666",
  },

  choiceText: {
    flex: 1,
    color: "#444",
    fontSize: 15,
    fontWeight: "700",
  },

  correctChoiceText: {
    color: "#3D8F00",
  },

  wrongChoiceText: {
    color: "#D93636",
  },

  feedbackCard: {
    marginTop: 25,
    borderRadius: 18,
    padding: 17,
    flexDirection: "row",
    gap: 12,
  },

  correctFeedback: {
    backgroundColor: "#ECFBE2",
  },

  wrongFeedback: {
    backgroundColor: "#FFF0F0",
  },

  feedbackContent: {
    flex: 1,
  },

  feedbackTitle: {
    fontWeight: "900",
    color: "#333",
    marginBottom: 4,
  },

  feedbackText: {
    color: "#666",
    lineHeight: 20,
  },

  continueButton: {
    minHeight: 56,
    borderRadius: 17,
    backgroundColor: "#58CC02",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  continueText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
  },

  resultContainer: {
    flex: 1,
    backgroundColor: "#F7F9F5",
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },

  resultIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#58CC02",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  resultTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#333",
  },

  resultSubtitle: {
    color: "#777",
    marginTop: 7,
    marginBottom: 25,
  },

  scoreCard: {
    width: 260,
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
    marginBottom: 25,
  },

  percentage: {
    fontSize: 42,
    fontWeight: "900",
    color: "#58CC02",
  },

  scoreLabel: {
    color: "#777",
    fontWeight: "700",
  },

  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#EEEEEE",
    marginVertical: 18,
  },

  scoreText: {
    color: "#555",
    fontWeight: "800",
  },

  primaryButton: {
    width: 260,
    minHeight: 55,
    borderRadius: 17,
    backgroundColor: "#58CC02",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },

  primaryButtonText: {
    color: "#FFF",
    fontWeight: "900",
  },

  secondaryButton: {
    width: 260,
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E2E2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: "#555",
    fontWeight: "800",
  },
});