import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Network from 'expo-network';
import { createMaterial, getMaterialsByReviewer, SQLiteMaterial } from '../../../database/materials';
import { saveFlashcards, getFlashcardDecksByReviewer, FlashcardDeck, FlashcardInput } from '../../../database/flashcards';
import { getReviewerById, SQLiteReviewer } from '../../../database/reviewers';
import { useAppTheme } from '../../../utils/ThemeContext';
import { extractFlashcardsWithGemini, getFriendlyAiErrorMessage } from '../../../utils/gemini';

const CARD_COUNTS = [5, 10, 15, 20, 30] as const;
type TabType = 'generate' | 'decks';
type ExtractionMode = 'auto' | 'manual';
type DraftCard = FlashcardInput;

export default function FlashcardGeneratorScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;

  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [reviewer, setReviewer] = useState<SQLiteReviewer | null>(null);
  const [materials, setMaterials] = useState<SQLiteMaterial[]>([]);
  const [existingDecks, setExistingDecks] = useState<FlashcardDeck[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [deckName, setDeckName] = useState('');
  const [mode, setMode] = useState<ExtractionMode>('auto');
  const [cardCount, setCardCount] = useState<(typeof CARD_COUNTS)[number]>(10);
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [draftCards, setDraftCards] = useState<DraftCard[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!reviewerId) return;
    try {
      const [reviewerData, materialData, deckData] = await Promise.all([
        getReviewerById(reviewerId),
        getMaterialsByReviewer(reviewerId),
        getFlashcardDecksByReviewer(reviewerId),
      ]);
      setReviewer(reviewerData);
      const sourceItems = materialData.filter(item => item.type !== 'Quiz' && item.type !== 'Flashcards');
      setMaterials(sourceItems);
      setSelectedMaterials(sourceItems.map(item => item.material_id));
      setExistingDecks(deckData);
    } catch (error) {
      Alert.alert('Error loading flashcard data', error instanceof Error ? error.message : 'Please try again.');
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

  const addDraftCard = () => {
    if (!term.trim() || !definition.trim()) return;
    setDraftCards(current => [...current, { question: term.trim(), answer: definition.trim() }]);
    setTerm('');
    setDefinition('');
  };

  const extractWithAI = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('No materials selected', 'Please select at least one study note or material to extract cards from.');
      return;
    }

    try {
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected === false || net.isInternetReachable === false) {
        Alert.alert(
          'Internet Connection Required',
          'Generating flashcards with AI requires an active internet connection to connect to Google Gemini.\n\nYou can still create your own flashcards manually without an internet connection.',
          [
            {
              text: 'Write Manually',
              onPress: () => setMode('manual'),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
        return;
      }
    } catch {
      // Proceed if network state check fails
    }

    const aggregatedContent = selectedItems.map(item => `${item.title}:\n${item.content}`).join('\n\n');
    setSaving(true);
    try {
      const extracted = await extractFlashcardsWithGemini(aggregatedContent, cardCount);
      if (extracted.length === 0) {
        Alert.alert('No cards extracted', 'Gemini could not find enough key concepts in the selected materials.');
        return;
      }
      setDraftCards(extracted);
      Alert.alert('Extraction complete', `Generated ${extracted.length} flashcards! Review them below and tap Save Deck.`);
    } catch (error) {
      const { title, message, isOffline } = getFriendlyAiErrorMessage(error, 'Could not generate flashcards.');
      if (isOffline) {
        Alert.alert(
          title,
          `${message}\n\nYou can still create your own flashcards manually while offline.`,
          [
            {
              text: 'Write Manually',
              onPress: () => setMode('manual'),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert(title, message);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveDeck = async () => {
    if (mode === 'auto' && draftCards.length === 0) {
      await extractWithAI();
      return;
    }

    if (!reviewerId || draftCards.length === 0 || saving) {
      Alert.alert('No cards to save', 'Please add or generate flashcards first.');
      return;
    }

    setSaving(true);
    try {
      const title = deckName.trim() || `${reviewer?.name ?? 'Study'} Flashcards`;
      const materialId = await createMaterial({
        reviewer_id: reviewerId,
        title,
        type: 'Flashcards',
        info: `${draftCards.length} ${draftCards.length === 1 ? 'card' : 'cards'}`,
        content: JSON.stringify({ source_material_ids: selectedMaterials }),
      });
      await saveFlashcards(materialId, draftCards);
      await loadData();

      Alert.alert('Deck Saved!', `Successfully saved "${title}" with ${draftCards.length} flashcards.`, [
        {
          text: 'View Decks',
          style: 'cancel',
          onPress: () => {
            setDraftCards([]);
            setActiveTab('decks');
          },
        },
        {
          text: 'Study Now',
          onPress: () => {
            setDraftCards([]);
            router.push(`/reviewer/${reviewerId}/flashcards?materialId=${materialId}`);
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Could not save flashcard deck', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const visibleCards = showAll ? draftCards : draftCards.slice(0, 4);

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
          <Text style={[styles.headerTitle, dark && { color: '#F2F6FF' }]}>Flashcards</Text>
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
            Create / Extract
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabItem, activeTab === 'decks' && styles.tabItemActive]}
          onPress={() => setActiveTab('decks')}
        >
          <Ionicons
            name="albums-outline"
            size={18}
            color={activeTab === 'decks' ? '#2563EB' : dark ? '#64748B' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabText,
              dark && { color: '#64748B' },
              activeTab === 'decks' && styles.tabTextActive,
            ]}
          >
            Saved Decks ({existingDecks.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'generate' ? (
        <>
          <ScrollView
            style={[styles.scroll, dark && { backgroundColor: '#0B1220' }]}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* DECK NAME */}
            <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>DECK NAME</Text>
            <View style={[styles.deckInputWrap, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
              <Ionicons name="bookmark-outline" size={20} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.deckInput, dark && { color: '#F2F6FF' }]}
                value={deckName}
                onChangeText={setDeckName}
                placeholder="e.g. Chapter 1 Key Concepts"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* EXTRACTION MODE */}
            <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>CREATION MODE</Text>
            <View style={[styles.modeSwitch, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
              <Pressable
                style={[styles.modeOption, mode === 'auto' && styles.modeOptionSelected]}
                onPress={() => setMode('auto')}
              >
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={mode === 'auto' ? '#FFFFFF' : '#94A3B8'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.modeText, mode === 'auto' && styles.modeTextSelected]}>
                  AI Auto-Extract
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeOption, mode === 'manual' && styles.modeOptionSelected]}
                onPress={() => setMode('manual')}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={mode === 'manual' ? '#FFFFFF' : '#94A3B8'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.modeText, mode === 'manual' && styles.modeTextSelected]}>
                  Manual Entry
                </Text>
              </Pressable>
            </View>

            {mode === 'auto' && (
              <>
                {/* SOURCE MATERIALS */}
                <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>SOURCE MATERIALS</Text>
                <View style={[styles.materialList, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
                  {loading ? (
                    <Text style={styles.emptyText}>Loading materials...</Text>
                  ) : materials.length === 0 ? (
                    <Text style={styles.emptyText}>No saved study materials in this reviewer yet.</Text>
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
                          <Text style={[styles.materialName, dark && { color: '#F2F6FF' }]} numberOfLines={1}>
                            {material.title}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>

                {/* NUMBER OF CARDS */}
                <View style={styles.countHeader}>
                  <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>NUMBER OF CARDS</Text>
                  <Text style={[styles.countValue, dark && { color: '#7CB0FF' }]}>{cardCount} Cards</Text>
                </View>
                <View style={styles.countRow}>
                  {CARD_COUNTS.map(count => (
                    <Pressable
                      key={count}
                      onPress={() => setCardCount(count)}
                      style={[
                        styles.countButton,
                        dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
                        cardCount === count && styles.countButtonSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countText,
                          dark && { color: '#94A3B8' },
                          cardCount === count && styles.countTextSelected,
                        ]}
                      >
                        {count}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {mode === 'manual' && (
              <View style={[styles.manualForm, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
                <View style={styles.previewHeaderRow}>
                  <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>NEW CARD</Text>
                  <Text style={[styles.previewCount, dark && { color: '#94A3B8' }]}>
                    {draftCards.length} cards added
                  </Text>
                </View>
                <TextInput
                  style={[styles.textInput, dark && { backgroundColor: '#0F172A', borderColor: '#1E293B', color: '#F2F6FF' }]}
                  value={term}
                  onChangeText={setTerm}
                  placeholder="Front: Term or Question"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={[
                    styles.textInput,
                    styles.definitionInput,
                    dark && { backgroundColor: '#0F172A', borderColor: '#1E293B', color: '#F2F6FF' },
                  ]}
                  value={definition}
                  onChangeText={setDefinition}
                  placeholder="Back: Definition or Answer"
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                />
                <Pressable
                  style={[
                    styles.addCardButton,
                    dark && { backgroundColor: '#102544', borderColor: '#2563EB' },
                    (!term.trim() || !definition.trim()) && styles.disabled,
                  ]}
                  onPress={addDraftCard}
                  disabled={!term.trim() || !definition.trim()}
                >
                  <Ionicons name="add" size={20} color="#2563EB" />
                  <Text style={styles.addCardText}>ADD TO DECK</Text>
                </Pressable>
              </View>
            )}

            {/* PREVIEW CARDS */}
            <View style={styles.previewHeading}>
              <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>
                {`CARDS IN DECK (${draftCards.length})`}
              </Text>
              {draftCards.length > 4 && (
                <Pressable onPress={() => setShowAll(v => !v)}>
                  <Text style={styles.editAll}>{showAll ? 'Show less' : 'View all'}</Text>
                </Pressable>
              )}
            </View>

            {draftCards.length === 0 ? (
              <View style={[styles.emptyPreview, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
                <Ionicons
                  name={mode === 'auto' ? 'sparkles-outline' : 'albums-outline'}
                  size={32}
                  color="#2563EB"
                />
                <Text style={[styles.emptyPreviewTitle, dark && { color: '#F2F6FF' }]}>
                  {mode === 'auto' ? 'No cards extracted yet' : 'Deck is currently empty'}
                </Text>
                <Text style={[styles.emptyPreviewText, dark && { color: '#94A3B8' }]}>
                  {mode === 'auto'
                    ? 'Select your source notes and tap "Generate Flashcards" below.'
                    : 'Fill in the term and definition above to add cards to this deck.'}
                </Text>
              </View>
            ) : (
              visibleCards.map((card, index) => (
                <View
                  key={`${card.question}-${index}`}
                  style={[styles.previewCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}
                >
                  <Text style={styles.previewMiniLabel}>FRONT</Text>
                  <Text style={[styles.previewTerm, dark && { color: '#F2F6FF' }]}>{card.question}</Text>
                  <View style={[styles.previewDivider, dark && { backgroundColor: '#2B3A52' }]} />
                  <Text style={styles.previewMiniLabel}>BACK</Text>
                  <Text style={[styles.previewDefinition, dark && { color: '#CBD5E1' }]}>{card.answer}</Text>
                  <Pressable
                    style={styles.removeCard}
                    onPress={() => setDraftCards(curr => curr.filter((_, i) => i !== index))}
                    hitSlop={10}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          {/* FOOTER */}
          <View style={[styles.footer, dark && { backgroundColor: '#111B2B', borderTopColor: '#1E293B' }]}>
            <Pressable
              style={[
                styles.saveButton,
                saving && styles.disabled,
                mode === 'auto' && selectedItems.length === 0 && styles.disabled,
              ]}
              onPress={saveDeck}
              disabled={saving || (mode === 'auto' && selectedItems.length === 0)}
            >
              <Ionicons
                name={mode === 'auto' && draftCards.length === 0 ? 'sparkles' : 'save-outline'}
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.saveButtonText}>
                {saving
                  ? (mode === 'auto' && draftCards.length === 0 ? 'Extracting with Gemini...' : 'Saving Deck...')
                  : mode === 'auto' && draftCards.length === 0
                  ? `Extract ${cardCount} Flashcards`
                  : `Save ${draftCards.length}-Card Deck`}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        /* SAVED DECKS LIST */
        <ScrollView
          style={[styles.scroll, dark && { backgroundColor: '#0B1220' }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, dark && { color: '#94A3B8' }]}>
              SAVED DECKS ({existingDecks.length})
            </Text>
            <Pressable onPress={() => setActiveTab('generate')} hitSlop={10}>
              <Text style={styles.sectionActionText}>+ New Deck</Text>
            </Pressable>
          </View>

          {existingDecks.length > 0 ? (
            existingDecks.map(item => (
              <Pressable
                key={item.material_id}
                style={({ pressed }) => [
                  styles.deckCard,
                  dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  router.push(`/reviewer/${reviewerId}/flashcards?materialId=${item.material_id}`);
                }}
              >
                <View style={[styles.deckCardIcon, dark && { backgroundColor: '#102544' }]}>
                  <Ionicons name="albums" size={24} color="#0087C4" />
                </View>
                <View style={styles.deckCardContent}>
                  <Text style={[styles.deckCardTitle, dark && { color: '#F2F6FF' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.deckCardSubtitle, dark && { color: '#94A3B8' }]}>
                    {item.card_count} {item.card_count === 1 ? 'card' : 'cards'} · Spaced Repetition
                  </Text>
                </View>
                <View style={[styles.studyBadge, dark && { backgroundColor: '#102544' }]}>
                  <Text style={[styles.studyBadgeText, dark && { color: '#7CB0FF' }]}>Study</Text>
                  <Ionicons name="chevron-forward" size={16} color={dark ? '#7CB0FF' : '#2563EB'} />
                </View>
              </Pressable>
            ))
          ) : (
            <View style={[styles.emptyContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
              <View style={[styles.emptyIconWrap, dark && { backgroundColor: '#102544' }]}>
                <Ionicons name="albums-outline" size={36} color="#0087C4" />
              </View>
              <Text style={[styles.emptyTitle, dark && { color: '#F2F6FF' }]}>No flashcard decks yet</Text>
              <Text style={[styles.emptySubtitle, dark && { color: '#94A3B8' }]}>
                Switch to the Create tab to extract cards with AI or build a custom deck.
              </Text>
              <Pressable style={styles.emptyActionBtn} onPress={() => setActiveTab('generate')}>
                <Text style={styles.emptyActionText}>Create Flashcards</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
  deckInputWrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  deckInput: {
    flex: 1,
    color: '#15264B',
    fontSize: 15,
    fontWeight: '600',
  },
  modeSwitch: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  modeOption: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  modeOptionSelected: {
    backgroundColor: '#2563EB',
  },
  modeText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  modeTextSelected: {
    color: '#FFFFFF',
  },
  materialList: {
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
  materialName: {
    flex: 1,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    paddingVertical: 6,
  },
  countHeader: {
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
  countRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  countButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DCE5F2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  countButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  countText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  countTextSelected: {
    color: '#FFFFFF',
  },
  manualForm: {
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 14,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewCount: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  textInput: {
    minHeight: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#15264B',
    fontSize: 14,
    marginTop: 10,
  },
  definitionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addCardButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    marginTop: 14,
  },
  addCardText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },
  previewHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  editAll: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#DCE5F2',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  emptyPreviewTitle: {
    color: '#15264B',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyPreviewText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  previewCard: {
    position: 'relative',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  previewMiniLabel: {
    color: '#64748B',
    fontSize: 10,
    letterSpacing: 1.1,
    fontWeight: '900',
  },
  previewTerm: {
    color: '#15264B',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    paddingRight: 28,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  previewDefinition: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    paddingRight: 28,
  },
  removeCard: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
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
  deckCard: {
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
  deckCardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#E5F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deckCardContent: {
    flex: 1,
  },
  deckCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15264B',
  },
  deckCardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  studyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  studyBadgeText: {
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
