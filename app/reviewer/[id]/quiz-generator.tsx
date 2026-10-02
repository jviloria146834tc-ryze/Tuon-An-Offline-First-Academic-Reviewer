import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from "expo-router";

export default function QuizGeneratorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [questionCount, setQuestionCount] = useState(10);

  const [difficulty, setDifficulty] =
    useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  const [multipleChoice, setMultipleChoice] =
    useState(true);

  const [trueFalse, setTrueFalse] =
    useState(true);

  const generateQuiz = () => {
  if (!multipleChoice && !trueFalse) {
    return;
  }

  router.push(`/reviewer/${id}/quiz`);
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#292929"
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Generate Quiz
        </Text>

        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quizIcon}>
          <Ionicons
            name="help-circle-outline"
            size={34}
            color="#1CB0F6"
          />
        </View>

        <Text style={styles.title}>
          Let&apos;s test your knowledge!
        </Text>

        <Text style={styles.subtitle}>
          Customize your quiz before starting.
        </Text>

        <Text style={styles.sectionLabel}>
          NUMBER OF QUESTIONS
        </Text>

        <View style={styles.optionRow}>
          {[5, 10, 15, 20].map((number) => (
            <Pressable
              key={number}
              onPress={() => setQuestionCount(number)}
              style={[
                styles.numberButton,
                questionCount === number &&
                  styles.selectedNumber,
              ]}
            >
              <Text
                style={[
                  styles.numberText,
                  questionCount === number &&
                    styles.selectedNumberText,
                ]}
              >
                {number}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>
          DIFFICULTY
        </Text>

        <View style={styles.difficultyContainer}>
          {(['Easy', 'Medium', 'Hard'] as const).map(
            (level) => (
              <Pressable
                key={level}
                style={[
                  styles.difficultyButton,
                  difficulty === level &&
                    styles.selectedDifficulty,
                ]}
                onPress={() => setDifficulty(level)}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    difficulty === level &&
                      styles.selectedDifficultyText,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            )
          )}
        </View>

        <Text style={styles.sectionLabel}>
          QUESTION TYPES
        </Text>

        <QuestionType
          icon="list-outline"
          title="Multiple Choice"
          description="Choose the correct answer"
          selected={multipleChoice}
          onPress={() =>
            setMultipleChoice(!multipleChoice)
          }
        />

        <QuestionType
          icon="checkmark-done-outline"
          title="True or False"
          description="Decide whether a statement is correct"
          selected={trueFalse}
          onPress={() => setTrueFalse(!trueFalse)}
        />

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="sparkles-outline"
              size={24}
              color="#9069CD"
            />
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>
              Your Quiz
            </Text>

            <Text style={styles.summaryText}>
              {questionCount} questions • {difficulty}
            </Text>

            <Text style={styles.summaryText}>
              {multipleChoice
                ? 'Multiple Choice'
                : ''}
              {multipleChoice && trueFalse
                ? ' + '
                : ''}
              {trueFalse ? 'True or False' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="wifi-outline"
            size={21}
            color="#1CB0F6"
          />

          <Text style={styles.infoText}>
            AI-generated quizzes will require an internet
            connection. Saved quizzes can later be reviewed
            offline.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable
  style={styles.generateButton}
  onPress={generateQuiz}
>
          <Ionicons
            name="sparkles"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.generateText}>
            GENERATE QUIZ
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

type QuestionTypeProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
};

function QuestionType({
  icon,
  title,
  description,
  selected,
  onPress,
}: QuestionTypeProps) {
  return (
    <Pressable
      style={[
        styles.questionCard,
        selected && styles.selectedQuestionCard,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.questionIcon,
          selected && styles.selectedQuestionIcon,
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={selected ? '#58CC02' : '#999999'}
        />
      </View>

      <View style={styles.questionContent}>
        <Text style={styles.questionTitle}>
          {title}
        </Text>

        <Text style={styles.questionDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name={
          selected
            ? 'checkmark-circle'
            : 'ellipse-outline'
        }
        size={25}
        color={selected ? '#58CC02' : '#CCCCCC'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7',
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    paddingHorizontal: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    color: '#292929',
  },

  placeholder: {
    width: 42,
  },

  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 40,
  },

  quizIcon: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: '#E6F4FF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  title: {
    textAlign: 'center',
    fontSize: 23,
    fontWeight: '900',
    color: '#292929',
    marginTop: 14,
  },

  subtitle: {
    textAlign: 'center',
    color: '#888888',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 30,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#666666',
    marginBottom: 10,
  },

  optionRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 27,
  },

  numberButton: {
    flex: 1,
    height: 51,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedNumber: {
    backgroundColor: '#EAF9DF',
    borderColor: '#58CC02',
  },

  numberText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#777777',
  },

  selectedNumberText: {
    color: '#58CC02',
  },

  difficultyContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEA',
    padding: 5,
    borderRadius: 16,
    marginBottom: 27,
  },

  difficultyButton: {
    flex: 1,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  selectedDifficulty: {
    backgroundColor: '#FFFFFF',
  },

  difficultyText: {
    fontWeight: '800',
    color: '#999999',
  },

  selectedDifficultyText: {
    color: '#292929',
  },

  questionCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 17,
    padding: 13,
    marginBottom: 10,
  },

  selectedQuestionCard: {
    borderColor: '#58CC02',
  },

  questionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  selectedQuestionIcon: {
    backgroundColor: '#EAF9DF',
  },

  questionContent: {
    flex: 1,
  },

  questionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#292929',
  },

  questionDescription: {
    fontSize: 11,
    color: '#999999',
    marginTop: 3,
  },

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#F3EDFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
  },

  summaryIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  summaryContent: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#60469B',
  },

  summaryText: {
    marginTop: 3,
    fontSize: 11,
    color: '#7864A3',
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF7FF',
    borderRadius: 17,
    padding: 15,
    marginTop: 13,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 17,
    color: '#49758C',
  },

  bottom: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },

  generateButton: {
    width: '100%',
    maxWidth: 556,
    alignSelf: 'center',
    height: 57,
    borderRadius: 17,
    backgroundColor: '#58CC02',
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  generateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
});
