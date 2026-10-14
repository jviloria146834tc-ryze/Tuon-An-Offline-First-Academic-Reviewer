import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Network from 'expo-network';
import { createMaterial, getMaterialsByReviewer, SQLiteMaterial } from '../../../database/materials';
import { saveQuiz, getQuizzesByReviewer, SQLiteQuiz, QuizQuestionInput } from '../../../database/quizzes';
import { getReviewerById, SQLiteReviewer } from '../../../database/reviewers';
import { useAppTheme } from '../../../utils/ThemeContext';
import { generateQuizWithGemini, getFriendlyAiErrorMessage } from '../../../utils/gemini';

const QUESTION_TYPES = ['Multiple Choice', 'True / False', 'Identification'] as const;
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
const QUESTION_COUNTS = [5, 10, 15, 20, 30] as const;
type TabType = 'generate' | 'quizzes';

function getQuizBadge(item: SQLiteQuiz): { type: string; difficulty?: string } {
  if (item.material_content) {
    try {
      const parsed = JSON.parse(item.material_content);
      if (parsed.question_type) {
        return {
          type: parsed.question_type,
          difficulty: parsed.difficulty,
        };
      }
    } catch {}
  }
  const lower = item.title.toLowerCase();
  let type = 'Multiple Choice';
  if (lower.includes('true / false') || lower.includes('true/false')) type = 'True / False';
  else if (lower.includes('identification')) type = 'Identification';
  let difficulty: string | undefined;
  if (lower.includes('easy')) difficulty = 'Easy';
  else if (lower.includes('medium')) difficulty = 'Medium';
  else if (lower.includes('hard')) difficulty = 'Hard';
  return { type, difficulty };
}

export default function QuizBuilderScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;

  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [reviewer, setReviewer] = useState<SQLiteReviewer | null>(null);
  const [materials, setMaterials] = useState<SQLiteMaterial[]>([]);
  const [existingQuizzes, setExistingQuizzes] = useState<SQLiteQuiz[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [quizName, setQuizName] = useState('');
  const [questionType, setQuestionType] = useState<(typeof QUESTION_TYPES)[number]>('Multiple Choice');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('Medium');
  const [questionCount, setQuestionCount] = useState<(typeof QUESTION_COUNTS)[number]>(10);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    if (!reviewerId) return;
    try {
      const [reviewerData, materialData, quizzesData] = await Promise.all([
        getReviewerById(reviewerId),
        getMaterialsByReviewer(reviewerId),
        getQuizzesByReviewer(reviewerId),
      ]);
      setReviewer(reviewerData);
      const sourceItems = materialData.filter(item => item.type !== 'Quiz' && item.type !== 'Flashcards');
      setMaterials(sourceItems);
      setSelectedMaterials(sourceItems.map(item => item.material_id));
      setExistingQuizzes(quizzesData);
    } catch (error) {
      Alert.alert('Error loading data', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [reviewerId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const selectedItems = useMemo(
    () => materials.filter(item => selectedMaterials.includes(item.material_id)),
    [materials, selectedMaterials]
  );

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterials(current =>
      current.includes(materialId) ? current.filter(id => id !== materialId) : [...current, materialId]
    );
  };

  const requestGeneration = async () => {
    if (!reviewerId) return;
    if (selectedItems.length === 0) {
      Alert.alert('No materials selected', 'Please select at least one study note or material to generate quiz questions from.');
      return;
    }

    try {
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected === false || net.isInternetReachable === false) {
        Alert.alert(
          'Internet Connection Required',
          'Generating a quiz with AI requires an active internet connection to connect to Google Gemini. Please check your Wi-Fi or mobile data and try again.',
          [{ text: 'OK' }]
        );
        return;
      }
    } catch {
      // Proceed if network state check fails
    }

    setGenerating(true);
    try {
      const aggregatedContent = selectedItems.map(item => `${item.title}:\n${item.content}`).join('\n\n');
      const generatedQuestions = await generateQuizWithGemini(aggregatedContent, {
        questionCount,
        questionType,
        difficulty,
      });

      if (generatedQuestions.length === 0) {
        Alert.alert('Generation failed', 'Gemini could not generate questions from the selected materials.');
        return;
      }

      const defaultTitle = `${reviewer?.name ?? 'Reviewer'} - ${difficulty} ${questionType} Quiz`;
      const quizTitle = quizName.trim() || defaultTitle;
      const materialId = await createMaterial({
        reviewer_id: reviewerId,
        title: quizTitle,
        type: 'Quiz',
        info: `${generatedQuestions.length} Questions`,
        content: JSON.stringify({
          difficulty,
          question_type: questionType,
          source_material_ids: selectedMaterials,
        }),
      });

      const formattedQuestions: QuizQuestionInput[] = generatedQuestions.map(q => ({
        question: q.question,
        options: [q.options[0], q.options[1], q.options[2], q.options[3]],
        correct_answer: String(q.correct_answer_index),
      }));

      const newQuizId = await saveQuiz({
        material_id: materialId,
        title: quizTitle,
        questions: formattedQuestions,
      });

      await loadData();
      setQuizName('');

      Alert.alert('Quiz Ready!', `Successfully generated a ${generatedQuestions.length}-question quiz!`, [
        {
          text: 'View Quizzes',
          style: 'cancel',
          onPress: () => setActiveTab('quizzes'),
        },
        {
          text: 'Take Quiz Now',
          onPress: () => {
            router.push({
              pathname: '/reviewer/[id]/quiz',
              params: { id: reviewerId, materialId, quizId: newQuizId },
            });
          },
        },
      ]);
    } catch (error) {
      const { title, message } = getFriendlyAiErrorMessage(error, 'Could not generate quiz questions.');
      Alert.alert(title, message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, dark && { backgroundColor: '#0B1220' }]}>
      {/* HEADER */}
      <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#1E293B' }]}>
        <Pressable
          style={[styles.backButton, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={dark ? '#F2F6FF' : '#15264B'} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, dark && { color: '#F2F6FF' }]}>Quizzes</Text>
          <Text style={[styles.headerSubtitle, dark && { color: '#94A3B8' }]} numberOfLines={1}>
            {reviewer?.name ?? 'Reviewer'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* TOP TABS */}
      <View style={[styles.tabBar, dark && { backgroundColor: '#111B2B', borderBottomColor: '#1E293B' }]}>
        <Pressable
          style={[styles.tabItem, activeTab === 'generate' && styles.tabItemActive]}
          onPress={() => setActiveTab('generate')}
        >
          <Ionicons
            name="sparkles-outline"
            size={18}
            color={activeTab === 'generate' ? '#2563EB' : dark ? '#64748B' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabText,
              dark && { color: '#64748B' },
              activeTab === 'generate' && styles.tabTextActive,
            ]}
          >
            Generate Quiz
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabItem, activeTab === 'quizzes' && styles.tabItemActive]}
          onPress={() => setActiveTab('quizzes')}
        >
          <Ionicons
            name="clipboard-outline"
            size={18}
            color={activeTab === 'quizzes' ? '#2563EB' : dark ? '#64748B' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabText,
              dark && { color: '#64748B' },
              activeTab === 'quizzes' && styles.tabTextActive,
            ]}
          >
            Saved Quizzes ({existingQuizzes.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'generate' ? (
        <>
          <ScrollView
            style={[styles.scroll, dark && { backgroundColor: '#0B1220' }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* QUIZ NAME */}
            <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>QUIZ NAME (OPTIONAL)</Text>
            <View style={[styles.quizInputWrap, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
              <Ionicons name="bookmark-outline" size={20} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.quizInput, dark && { color: '#F2F6FF' }]}
                value={quizName}
                onChangeText={setQuizName}
                placeholder={`e.g. ${reviewer?.name ?? 'Reviewer'} - ${difficulty} Quiz`}
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* SOURCE MATERIALS */}
            <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>SOURCE MATERIALS</Text>
            <View style={[styles.materialPicker, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
              {loading ? (
                <Text style={styles.emptySource}>Loading materials...</Text>
              ) : materials.length === 0 ? (
                <Text style={styles.emptySource}>No saved study materials in this reviewer yet.</Text>
              ) : (
                materials.map(material => {
                  const checked = selectedMaterials.includes(material.material_id);
                  return (
                    <Pressable
                      key={material.material_id}
                      style={[
                        styles.materialRow,
                        dark && { backgroundColor: '#0F172A', borderColor: '#1E293B' },
                        checked && (dark ? { backgroundColor: '#102A4C', borderColor: '#2563EB' } : styles.materialRowChecked),
                      ]}
                      onPress={() => toggleMaterial(material.material_id)}
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={checked ? '#2563EB' : '#94A3B8'}
                      />
                      <Text style={[styles.materialTitle, dark && { color: '#F2F6FF' }]} numberOfLines={1}>
                        {material.title}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* QUESTION TYPE */}
            <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>QUESTION TYPE</Text>
            <View style={styles.radioGroup}>
              {QUESTION_TYPES.map(type => (
                <RadioRow
                  key={type}
                  dark={dark}
                  label={type}
                  selected={questionType === type}
                  onPress={() => setQuestionType(type)}
                />
              ))}
            </View>

            {/* DIFFICULTY */}
            <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>DIFFICULTY</Text>
            <View style={styles.segmentRow}>
              {DIFFICULTIES.map(item => (
                <Pressable
                  key={item}
                  onPress={() => setDifficulty(item)}
                  style={[
                    styles.segment,
                    dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
                    difficulty === item && styles.segmentSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      dark && { color: '#94A3B8' },
                      difficulty === item && styles.segmentTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* NUMBER OF QUESTIONS */}
            <View style={styles.countHeading}>
              <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>NUMBER OF QUESTIONS</Text>
              <Text style={[styles.countValue, dark && { color: '#7CB0FF' }]}>{questionCount} Questions</Text>
            </View>
            <View style={styles.countOptions}>
              {QUESTION_COUNTS.map(count => (
                <Pressable
                  key={count}
                  onPress={() => setQuestionCount(count)}
                  style={[
                    styles.countOption,
                    dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
                    questionCount === count && styles.countOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.countOptionText,
                      dark && { color: '#94A3B8' },
                      questionCount === count && styles.countOptionTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* SOURCE SUMMARY CARD */}
            <View style={[styles.sourceSummary, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
              <View style={styles.summaryTopRow}>
                <Ionicons name="document-text-outline" size={18} color="#2563EB" />
                <Text style={[styles.summaryTitle, dark && { color: '#94A3B8' }]}>
                  {`PULLING FROM (${selectedItems.length} ${selectedItems.length === 1 ? 'MATERIAL' : 'MATERIALS'})`}
                </Text>
              </View>
              {selectedItems.length > 0 ? (
                selectedItems.slice(0, 3).map(material => (
                  <View key={material.material_id} style={styles.summaryItem}>
                    <Text style={styles.summaryBullet}>•</Text>
                    <Text style={[styles.summaryText, dark && { color: '#F2F6FF' }]} numberOfLines={1}>
                      {material.title}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptySource, dark && { color: '#64748B' }]}>
                  Please select at least one study material above.
                </Text>
              )}
              {selectedItems.length > 3 && (
                <Text style={styles.moreText}>+ {selectedItems.length - 3} more</Text>
              )}
            </View>
          </ScrollView>

          {/* FOOTER */}
          <View style={[styles.footer, dark && { backgroundColor: '#111B2B', borderTopColor: '#1E293B' }]}>
            <Pressable
              style={[
                styles.generateButton,
                (loading || generating || selectedItems.length === 0) && styles.disabledButton,
              ]}
              disabled={loading || generating || selectedItems.length === 0}
              onPress={requestGeneration}
            >
              <Ionicons
                name="sparkles"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.generateText}>
                {generating ? 'Generating Quiz with Gemini...' : `Generate ${questionCount}-Question Quiz`}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        /* SAVED QUIZZES LIST */
        <ScrollView
          style={[styles.scroll, dark && { backgroundColor: '#0B1220' }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>
              GENERATED QUIZZES ({existingQuizzes.length})
            </Text>
            <Pressable onPress={() => setActiveTab('generate')} hitSlop={10}>
              <Text style={styles.sectionActionText}>+ New Quiz</Text>
            </Pressable>
          </View>

          {existingQuizzes.length > 0 ? (
            existingQuizzes.map(item => {
              const badge = getQuizBadge(item);
              return (
                <Pressable
                  key={item.quiz_id}
                  style={({ pressed }) => [
                    styles.quizCard,
                    dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    router.push({
                      pathname: '/reviewer/[id]/quiz',
                      params: { id: reviewerId, materialId: item.material_id, quizId: item.quiz_id },
                    });
                  }}
                >
                  <View style={[styles.quizCardIcon, dark && { backgroundColor: '#102544' }]}>
                    <Ionicons name="clipboard" size={24} color="#00A8E8" />
                  </View>
                  <View style={styles.quizCardContent}>
                    <Text style={[styles.quizCardTitle, dark && { color: '#F2F6FF' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.quizMetaRow}>
                      <Text style={[styles.quizCardSubtitle, dark && { color: '#94A3B8' }]}>
                        {item.question_count} Qs
                      </Text>
                      <View style={[styles.typeBadge, dark && { backgroundColor: '#102A4C', borderColor: '#2563EB' }]}>
                        <Text style={[styles.typeBadgeText, dark && { color: '#7CB0FF' }]}>
                          {badge.type}
                        </Text>
                      </View>
                      {badge.difficulty && (
                        <View style={[styles.difficultyBadge, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
                          <Text style={[styles.difficultyBadgeText, dark && { color: '#AAB7CC' }]}>
                            {badge.difficulty}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={[styles.takeBadge, dark && { backgroundColor: '#102544' }]}>
                    <Text style={[styles.takeBadgeText, dark && { color: '#7CB0FF' }]}>Take</Text>
                    <Ionicons name="chevron-forward" size={16} color={dark ? '#7CB0FF' : '#2563EB'} />
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={[styles.emptyContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
              <View style={[styles.emptyIconWrap, dark && { backgroundColor: '#102544' }]}>
                <Ionicons name="clipboard-outline" size={36} color="#00A8E8" />
              </View>
              <Text style={[styles.emptyTitle, dark && { color: '#F2F6FF' }]}>No quizzes generated yet</Text>
              <Text style={[styles.emptySubtitle, dark && { color: '#94A3B8' }]}>
                Switch to the Generate tab to create your first quiz from your study materials.
              </Text>
              <Pressable style={styles.emptyActionBtn} onPress={() => setActiveTab('generate')}>
                <Text style={styles.emptyActionText}>Generate a Quiz</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
  dark,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  dark: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.radioRow,
        dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
        selected && styles.radioRowSelected,
        dark && selected && { backgroundColor: '#1E3A6B', borderColor: '#2563EB' },
      ]}
      onPress={onPress}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={[styles.radioLabel, dark && { color: '#F2F6FF' }, selected && styles.radioLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    color: '#15264B',
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
  },
  headerSpacer: {
    width: 42,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#2563EB',
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 10,
  },
  radioGroup: {
    gap: 8,
    marginBottom: 12,
  },
  radioRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  radioRowSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F5FF',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#2563EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  radioLabel: {
    color: '#15264B',
    fontSize: 15,
    fontWeight: '700',
  },
  radioLabelSelected: {
    color: '#2563EB',
    fontWeight: '800',
  },
  materialPicker: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    gap: 8,
  },
  materialRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  materialRowChecked: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  materialTitle: {
    flex: 1,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
  },
  emptySource: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#DCE5F2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  segmentSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  segmentText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: '#FFFFFF',
  },
  countHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  countValue: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '900',
  },
  countOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  countOption: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DCE5F2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  countOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  countOptionText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  countOptionTextSelected: {
    color: '#FFFFFF',
  },
  sourceSummary: {
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  summaryTitle: {
    color: '#64748B',
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '900',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  summaryBullet: {
    color: '#2563EB',
    width: 14,
    fontSize: 16,
    fontWeight: '900',
  },
  summaryText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  moreText: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 14,
    marginTop: 6,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  generateButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  generateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionActionText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  quizCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  quizCardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#E5F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quizCardContent: {
    flex: 1,
  },
  quizCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15264B',
  },
  quizCardSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  quizMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  typeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  difficultyBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  quizInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    height: 52,
  },
  quizInput: {
    flex: 1,
    color: '#15264B',
    fontSize: 15,
    fontWeight: '600',
  },
  takeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  takeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    marginTop: 20,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#E5F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#15264B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
