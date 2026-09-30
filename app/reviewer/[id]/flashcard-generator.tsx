import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function FlashcardGeneratorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [cardCount, setCardCount] = useState(10);
  const [difficulty, setDifficulty] = useState("Medium");
  const [source, setSource] = useState("All Materials");

  const sources = ["All Materials", "Study Notes", "Quick Capture"];
  const difficulties = ["Easy", "Medium", "Hard"];

  const generateFlashcards = () => {
    router.push(`/reviewer/${id}/flashcards`);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={23} color="#333" />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>Generate Flashcards</Text>
            <Text style={styles.headerSubtitle}>
              Turn your materials into study cards
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="albums" size={32} color="#58CC02" />
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Smart Flashcards</Text>
            <Text style={styles.heroDescription}>
              Create flashcards from your reviewer materials for faster recall.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Study Source</Text>

        <View style={styles.options}>
          {sources.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.optionCard,
                source === item && styles.optionCardSelected,
              ]}
              onPress={() => setSource(item)}
            >
              <Ionicons
                name={
                  item === "All Materials"
                    ? "documents-outline"
                    : item === "Study Notes"
                      ? "document-text-outline"
                      : "camera-outline"
                }
                size={22}
                color={source === item ? "#58CC02" : "#777"}
              />

              <Text
                style={[
                  styles.optionText,
                  source === item && styles.optionTextSelected,
                ]}
              >
                {item}
              </Text>

              {source === item && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#58CC02"
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Number of Cards</Text>

        <View style={styles.counterCard}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => setCardCount(Math.max(5, cardCount - 5))}
          >
            <Ionicons name="remove" size={25} color="#58CC02" />
          </TouchableOpacity>

          <View>
            <Text style={styles.count}>{cardCount}</Text>
            <Text style={styles.cardsLabel}>cards</Text>
          </View>

          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => setCardCount(Math.min(50, cardCount + 5))}
          >
            <Ionicons name="add" size={25} color="#58CC02" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Difficulty</Text>

        <View style={styles.difficultyRow}>
          {difficulties.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.difficultyButton,
                difficulty === item && styles.difficultySelected,
              ]}
              onPress={() => setDifficulty(item)}
            >
              <Text
                style={[
                  styles.difficultyText,
                  difficulty === item && styles.difficultyTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="sparkles-outline" size={22} color="#58CC02" />

          <Text style={styles.infoText}>
            AI generation will be connected later. For now, TUON will use mock
            flashcards so we can complete and test the study experience.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateFlashcards}
        >
          <Ionicons name="sparkles" size={21} color="#FFF" />

          <Text style={styles.generateText}>Generate Flashcards</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F5",
  },

  content: {
    padding: 22,
    paddingBottom: 45,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 25,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#252525",
  },

  headerSubtitle: {
    color: "#777",
    marginTop: 3,
  },

  heroCard: {
    backgroundColor: "#EAF9DF",
    padding: 20,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 28,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },

  heroText: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#333",
    marginBottom: 5,
  },

  heroDescription: {
    color: "#666",
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    marginBottom: 12,
    marginTop: 6,
  },

  options: {
    gap: 10,
    marginBottom: 25,
  },

  optionCard: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E6E6E6",
    borderRadius: 17,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  optionCardSelected: {
    borderColor: "#58CC02",
    backgroundColor: "#F4FFED",
  },

  optionText: {
    flex: 1,
    fontWeight: "700",
    color: "#555",
  },

  optionTextSelected: {
    color: "#3D8F00",
  },

  counterCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E7E7E7",
    marginBottom: 25,
  },

  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#F0FAE9",
    alignItems: "center",
    justifyContent: "center",
  },

  count: {
    textAlign: "center",
    fontSize: 27,
    fontWeight: "900",
    color: "#333",
  },

  cardsLabel: {
    textAlign: "center",
    color: "#888",
    fontSize: 12,
  },

  difficultyRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 25,
  },

  difficultyButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    alignItems: "center",
  },

  difficultySelected: {
    backgroundColor: "#58CC02",
    borderColor: "#58CC02",
  },

  difficultyText: {
    fontWeight: "800",
    color: "#666",
  },

  difficultyTextSelected: {
    color: "#FFF",
  },

  infoCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 17,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  infoText: {
    flex: 1,
    color: "#666",
    lineHeight: 20,
    fontSize: 13,
  },

  generateButton: {
    backgroundColor: "#58CC02",
    minHeight: 56,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  generateText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
  },
});