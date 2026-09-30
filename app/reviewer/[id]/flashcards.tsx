import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MOCK_CARDS = [
  {
    question: "What is a database?",
    answer:
      "An organized collection of data that can be stored, accessed, and managed electronically.",
  },
  {
    question: "What is a primary key?",
    answer:
      "A field that uniquely identifies each record inside a database table.",
  },
  {
    question: "What does SQL stand for?",
    answer: "Structured Query Language.",
  },
  {
    question: "What is a foreign key?",
    answer:
      "A field that creates a relationship between records in different tables.",
  },
  {
    question: "What is normalization?",
    answer:
      "The process of organizing database data to reduce unnecessary duplication.",
  },
];

export default function FlashcardStudyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  const currentCard = MOCK_CARDS[currentIndex];

  const progress =
    ((currentIndex + 1) / MOCK_CARDS.length) * 100;

  const exitReview = () => {
  router.replace(`/reviewer/${id}`);
};

  const rateCard = (rating: string) => {
    console.log("SRS Rating:", rating);

    if (currentIndex < MOCK_CARDS.length - 1) {
      setCurrentIndex(previous => previous + 1);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <View style={styles.finishedContainer}>
        <View style={styles.finishedIcon}>
          <Ionicons
            name="checkmark"
            size={48}
            color="#FFF"
          />
        </View>

        <Text style={styles.finishedTitle}>
          Review Complete!
        </Text>

        <Text style={styles.finishedText}>
          Nice work! You reviewed all{" "}
          {MOCK_CARDS.length} flashcards.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {MOCK_CARDS.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Cards Reviewed
          </Text>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={exitReview}
        >
          <Text style={styles.doneText}>
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
          onPress={exitReview}
        >
          <Ionicons
            name="close"
            size={25}
            color="#555"
          />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.counter}>
          {currentIndex + 1}/{MOCK_CARDS.length}
        </Text>
      </View>

      <View style={styles.studyArea}>
        <Text style={styles.instruction}>
          {revealed
            ? "How well did you remember it?"
            : "Try to recall the answer"}
        </Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.flashcard,
            revealed && styles.flashcardRevealed,
          ]}
          onPress={() => setRevealed(true)}
        >
          <View style={styles.cardIcon}>
            <Ionicons
              name={
                revealed
                  ? "bulb-outline"
                  : "help-outline"
              }
              size={25}
              color="#58CC02"
            />
          </View>

          <Text style={styles.cardLabel}>
            {revealed ? "ANSWER" : "QUESTION"}
          </Text>

          <Text style={styles.cardText}>
            {revealed
              ? currentCard.answer
              : currentCard.question}
          </Text>

          {!revealed && (
            <View style={styles.tapHint}>
              <Ionicons
                name="finger-print-outline"
                size={18}
                color="#999"
              />

              <Text style={styles.tapText}>
                Tap to reveal answer
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {!revealed ? (
        <TouchableOpacity
          style={styles.revealButton}
          onPress={() => setRevealed(true)}
        >
          <Ionicons
            name="eye-outline"
            size={21}
            color="#FFF"
          />

          <Text style={styles.revealText}>
            Show Answer
          </Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={styles.ratingTitle}>
            Rate your recall
          </Text>

          <View style={styles.ratingRow}>
            <RatingButton
              icon="refresh-outline"
              title="Again"
              interval="< 1m"
              onPress={() => rateCard("Again")}
            />

            <RatingButton
              icon="alert-circle-outline"
              title="Hard"
              interval="1d"
              onPress={() => rateCard("Hard")}
            />

            <RatingButton
              icon="checkmark-circle-outline"
              title="Good"
              interval="3d"
              onPress={() => rateCard("Good")}
            />

            <RatingButton
              icon="flash-outline"
              title="Easy"
              interval="7d"
              onPress={() => rateCard("Easy")}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function RatingButton({
  icon,
  title,
  interval,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  interval: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.ratingButton}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={23}
        color="#58CC02"
      />

      <Text style={styles.ratingButtonTitle}>
        {title}
      </Text>

      <Text style={styles.interval}>
        {interval}
      </Text>
    </TouchableOpacity>
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

  progressContainer: {
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

  counter: {
    fontWeight: "800",
    color: "#666",
  },

  studyArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  instruction: {
    color: "#777",
    fontWeight: "700",
    marginBottom: 20,
  },

  flashcard: {
    width: "100%",
    minHeight: 330,
    maxWidth: 600,
    backgroundColor: "#FFF",
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    padding: 35,
  },

  flashcardRevealed: {
    borderColor: "#58CC02",
    backgroundColor: "#FAFFF7",
  },

  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#EFFAE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  cardLabel: {
    color: "#58CC02",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 16,
  },

  cardText: {
    fontSize: 23,
    lineHeight: 32,
    textAlign: "center",
    color: "#303030",
    fontWeight: "800",
  },

  tapHint: {
    position: "absolute",
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  tapText: {
    color: "#999",
    fontSize: 12,
  },

  revealButton: {
    minHeight: 56,
    backgroundColor: "#58CC02",
    borderRadius: 17,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  revealText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
  },

  ratingTitle: {
    textAlign: "center",
    color: "#666",
    fontWeight: "800",
    marginBottom: 12,
  },

  ratingRow: {
    flexDirection: "row",
    gap: 8,
  },

  ratingButton: {
    flex: 1,
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E2E2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  ratingButtonTitle: {
    color: "#444",
    fontWeight: "800",
    fontSize: 13,
    marginTop: 4,
  },

  interval: {
    color: "#999",
    fontSize: 10,
    marginTop: 2,
  },

  finishedContainer: {
    flex: 1,
    backgroundColor: "#F7F9F5",
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },

  finishedIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#58CC02",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  finishedTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#333",
  },

  finishedText: {
    color: "#777",
    textAlign: "center",
    marginTop: 9,
    marginBottom: 25,
  },

  summaryCard: {
    width: 180,
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 25,
  },

  summaryNumber: {
    color: "#58CC02",
    fontWeight: "900",
    fontSize: 30,
  },

  summaryLabel: {
    color: "#777",
    marginTop: 4,
  },

  doneButton: {
    backgroundColor: "#58CC02",
    paddingVertical: 17,
    paddingHorizontal: 55,
    borderRadius: 17,
  },

  doneText: {
    color: "#FFF",
    fontWeight: "900",
  },
});