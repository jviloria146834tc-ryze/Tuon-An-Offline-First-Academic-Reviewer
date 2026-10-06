import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createMaterial, getMaterialsByReviewer, SQLiteMaterial } from '../../../database/materials';
import { saveFlashcards, FlashcardInput } from '../../../database/flashcards';
import { getReviewerById, SQLiteReviewer } from '../../../database/reviewers';
import { useAppTheme } from '../../../utils/ThemeContext';

const CARD_COUNTS = [5, 10, 15, 20, 30, 50] as const;
type ExtractionMode = 'auto' | 'manual';
type DraftCard = FlashcardInput;

export default function FlashcardGeneratorScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const [reviewer, setReviewer] = useState<SQLiteReviewer | null>(null);
  const [materials, setMaterials] = useState<SQLiteMaterial[]>([]);
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

  useEffect(() => {
    let active = true;
    Promise.all([getReviewerById(reviewerId ?? ''), getMaterialsByReviewer(reviewerId ?? '')])
      .then(([reviewerData, materialData]) => {
        if (!active) return;
        setReviewer(reviewerData);
        const sourceItems = materialData.filter(item => item.type !== 'Quiz' && item.type !== 'Flashcards');
        setMaterials(sourceItems);
        setSelectedMaterials(sourceItems.map(item => item.material_id));
      })
      .catch(error => Alert.alert('Could not load source materials', error instanceof Error ? error.message : 'Please try again.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reviewerId]);

  const selectedItems = useMemo(() => materials.filter(item => selectedMaterials.includes(item.material_id)), [materials, selectedMaterials]);

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterials(current => current.includes(materialId)
      ? current.filter(idValue => idValue !== materialId)
      : [...current, materialId]);
  };

  const addDraftCard = () => {
    if (!term.trim() || !definition.trim()) return;
    setDraftCards(current => [...current, { question: term.trim(), answer: definition.trim() }]);
    setTerm('');
    setDefinition('');
  };

  const saveDeck = async () => {
    if (mode === 'auto') {
      Alert.alert(
        'Gemini extraction is coming next',
        selectedItems.length === 0
          ? 'Add study material to this reviewer first. Your teammate will connect Gemini extraction to this screen.'
          : 'The Auto-Extract screen is ready, but Gemini extraction has not been connected yet. Switch to Manual Entry to create a real deck now.',
      );
      return;
    }
    if (!reviewerId || draftCards.length === 0 || saving) return;
    setSaving(true);
    try {
      const title = deckName.trim() || 'My Flashcards';
      const materialId = await createMaterial({
        reviewer_id: reviewerId,
        title,
        type: 'Flashcards',
        info: `${draftCards.length} ${draftCards.length === 1 ? 'card' : 'cards'}`,
        content: JSON.stringify({ source_material_ids: selectedMaterials }),
      });
      await saveFlashcards(materialId, draftCards);
      router.replace(`/reviewer/${reviewerId}/flashcards`);
    } catch (error) {
      Alert.alert('Could not save flashcard deck', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const visibleCards = showAll ? draftCards : draftCards.slice(0, 3);

  return (
    <SafeAreaView style={[styles.safe, dark && { backgroundColor: '#0B1220' }]}>
      <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={dark ? '#F2F6FF' : '#4B5E7E'} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, dark && { color: '#F2F6FF' }]}>Generate Flashcards</Text>
          <Text style={styles.headerSubtitle}>{reviewer?.subject ?? reviewer?.name ?? 'Reviewer'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={[styles.scroll, dark && { backgroundColor: '#0B1220' }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>DECK NAME</Text>
        <View style={[styles.deckInputWrap, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <TextInput style={[styles.deckInput, dark && { color: '#F2F6FF' }]} value={deckName} onChangeText={setDeckName} placeholder="Name your deck" placeholderTextColor="#8994A4" accessibilityLabel="Deck name" />
          <Ionicons name="chevron-down" size={17} color="#8994A4" />
        </View>

        <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>EXTRACTION MODE</Text>
        <View style={[styles.modeSwitch, dark && { backgroundColor: '#111B2B' }]}>
          <Pressable style={[styles.modeOption, dark && { backgroundColor: '#172235' }, mode === 'auto' && styles.modeOptionSelected, dark && mode === 'auto' && { backgroundColor: '#2563EB', borderColor: '#2563EB' }]} onPress={() => setMode('auto')} accessibilityRole="button" accessibilityState={{ selected: mode === 'auto' }}>
            <Text style={[styles.modeText, dark && { color: '#AAB7CC' }, mode === 'auto' && styles.modeTextSelected, dark && mode === 'auto' && { color: '#FFFFFF' }]}>Auto-Extract</Text>
          </Pressable>
          <Pressable style={[styles.modeOption, dark && { backgroundColor: '#172235' }, mode === 'manual' && styles.modeOptionSelected, dark && mode === 'manual' && { backgroundColor: '#2563EB', borderColor: '#2563EB' }]} onPress={() => setMode('manual')} accessibilityRole="button" accessibilityState={{ selected: mode === 'manual' }}>
            <Text style={[styles.modeText, dark && { color: '#AAB7CC' }, mode === 'manual' && styles.modeTextSelected, dark && mode === 'manual' && { color: '#FFFFFF' }]}>Manual Entry</Text>
          </Pressable>
        </View>

        <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>SOURCE MATERIALS</Text>
        <View style={[styles.materialList, dark && { backgroundColor: '#111B2B' }]}>
          {loading ? <Text style={styles.emptyText}>Loading materials...</Text> : materials.length === 0 ? (
            <Text style={styles.emptyText}>No saved study materials in this reviewer yet.</Text>
          ) : materials.map(material => {
            const checked = selectedMaterials.includes(material.material_id);
            return (
              <Pressable key={material.material_id} style={[styles.materialRow, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]} onPress={() => toggleMaterial(material.material_id)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
                <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={17} color={checked ? '#102A68' : '#B9C7DA'} />
                <Text style={[styles.materialName, dark && { color: '#F2F6FF' }]} numberOfLines={1}>{material.title}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.countHeader}>
          <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>NUMBER OF FLASHCARDS</Text>
          <Text style={[styles.countValue, dark && { color: '#F2F6FF' }]}>{mode === 'manual' ? draftCards.length : cardCount}</Text>
        </View>
        <View style={styles.countRow}>
          {CARD_COUNTS.map(count => (
            <Pressable key={count} onPress={() => setCardCount(count)} accessibilityRole="button" accessibilityState={{ selected: cardCount === count }} style={[styles.countButton, dark && { backgroundColor: '#172235' }, cardCount === count && styles.countButtonSelected]}>
              <Text style={[styles.countText, dark && { color: '#AAB7CC' }, cardCount === count && styles.countTextSelected]}>{count}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'manual' && (
          <View style={[styles.manualForm, dark && { backgroundColor: '#111B2B', borderColor: '#2B3A52' }]}>
            <View style={styles.previewHeader}>
              <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>ADD A TERM AND DEFINITION</Text>
              <Text style={[styles.previewCount, dark && { color: '#AAB7CC' }]}>{draftCards.length} added</Text>
            </View>
            <TextInput style={[styles.textInput, dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#F2F6FF' }]} value={term} onChangeText={setTerm} placeholder="Term or question" placeholderTextColor="#9AA3B2" accessibilityLabel="Flashcard term or question" />
            <TextInput style={[styles.textInput, styles.definitionInput, dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#F2F6FF' }]} value={definition} onChangeText={setDefinition} placeholder="Definition or answer" placeholderTextColor="#9AA3B2" multiline textAlignVertical="top" accessibilityLabel="Flashcard definition or answer" />
            <Pressable style={[styles.addCardButton, (!term.trim() || !definition.trim()) && styles.disabled]} onPress={addDraftCard} disabled={!term.trim() || !definition.trim()} accessibilityRole="button">
              <Ionicons name="add" size={17} color="#102A68" />
              <Text style={[styles.addCardText, dark && { color: '#F2F6FF' }]}>ADD CARD</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.previewHeading}>
          <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>{mode === 'auto' ? 'PREVIEW Â· 0 EXTRACTED PAIRS' : `PREVIEW Â· ${draftCards.length} ${draftCards.length === 1 ? 'PAIR' : 'PAIRS'}`}</Text>
          {draftCards.length > 3 && (
            <Pressable onPress={() => setShowAll(value => !value)} accessibilityRole="button">
              <Text style={styles.editAll}>{showAll ? 'Show less' : 'See all'}</Text>
            </Pressable>
          )}
        </View>

        {mode === 'auto' ? (
          <View style={[styles.emptyPreview, dark && { backgroundColor: '#111B2B', borderColor: '#2B3A52' }]}>
            <Ionicons name="sparkles-outline" size={22} color="#8490A3" />
            <Text style={[styles.emptyPreviewTitle, dark && { color: '#F2F6FF' }]}>No extracted pairs yet</Text>
            <Text style={[styles.emptyPreviewText, dark && { color: '#AAB7CC' }]}>Gemini will create a preview from your selected materials after the API is integrated.</Text>
          </View>
        ) : draftCards.length === 0 ? (
          <View style={[styles.emptyPreview, dark && { backgroundColor: '#111B2B', borderColor: '#2B3A52' }]}>
            <Ionicons name="albums-outline" size={22} color="#8490A3" />
            <Text style={[styles.emptyPreviewTitle, dark && { color: '#F2F6FF' }]}>Your preview will appear here</Text>
            <Text style={[styles.emptyPreviewText, dark && { color: '#AAB7CC' }]}>Add a term and definition above to start a real flashcard deck.</Text>
          </View>
        ) : visibleCards.map((card, index) => (
          <View key={`${card.question}-${index}`} style={[styles.previewCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <Text style={styles.previewMiniLabel}>TERM</Text>
            <Text style={[styles.previewTerm, dark && { color: '#F2F6FF' }]}>{card.question}</Text>
            <View style={styles.previewDivider} />
            <Text style={styles.previewMiniLabel}>DEFINITION</Text>
            <Text style={[styles.previewDefinition, dark && { color: '#CBD5E1' }]}>{card.answer}</Text>
            <Pressable style={styles.removeCard} onPress={() => setDraftCards(current => current.filter((_, cardIndex) => cardIndex !== index))} accessibilityRole="button" accessibilityLabel={`Remove card ${index + 1}`}>
              <Ionicons name="close-circle-outline" size={17} color="#98A2B3" />
            </Pressable>
          </View>
        ))}

        {mode === 'auto' && (
          <View style={styles.pendingNote}>
            <Ionicons name="information-circle-outline" size={17} color="#6E7D97" />
            <Text style={[styles.pendingText, dark && { color: '#AAB7CC' }]}>Auto-Extract is a prepared UI. No generated examples or placeholder cards are shown.</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, dark && { backgroundColor: '#111B2B', borderTopColor: '#2B3A52' }]}>
        <Pressable style={[styles.previewButton, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }, draftCards.length === 0 && styles.previewButtonDisabled]} disabled={draftCards.length === 0} onPress={() => setShowAll(true)} accessibilityRole="button">
          <Text style={[styles.previewButtonText, dark && { color: '#F2F6FF' }, draftCards.length === 0 && styles.previewButtonTextDisabled]}>Preview All</Text>
        </Pressable>
        <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={saveDeck} disabled={saving} accessibilityRole="button">
          <Text style={styles.saveButtonText} numberOfLines={1}>
            {saving ? 'Saving...' : mode === 'auto' ? `Generate ${cardCount}-Card Deck` : `Save ${draftCards.length}-Card Deck`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: '#E3E7EC' },
  backButton: { width: 28, height: 38, alignItems: 'flex-start', justifyContent: 'center' },
  headerCopy: { flex: 1, marginLeft: 10 },
  headerTitle: { color: '#102A68', fontSize: 14, fontWeight: '800' },
  headerSubtitle: { color: '#8490A3', fontSize: 9, marginTop: 1 },
  headerSpacer: { width: 25 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 17, paddingTop: 12, paddingBottom: 15 },
  fieldLabel: { color: '#8490A3', fontSize: 8, letterSpacing: 1.4, fontWeight: '800', marginTop: 13, marginBottom: 6 },
  deckInputWrap: { minHeight: 37, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D8DEE7', borderRadius: 10, paddingHorizontal: 11 },
  deckInput: { flex: 1, color: '#20345C', fontSize: 11 },
  modeSwitch: { minHeight: 36, flexDirection: 'row', alignItems: 'center', borderRadius: 11, backgroundColor: '#F0F2F5', padding: 3 },
  modeOption: { flex: 1, minHeight: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  modeOptionSelected: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE5F2' },
  modeText: { color: '#8490A3', fontSize: 9, fontWeight: '700' },
  modeTextSelected: { color: '#102A68' },
  materialList: { gap: 5 },
  materialRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: '#DCE5F2', backgroundColor: '#F8FAFE', paddingHorizontal: 9 },
  materialName: { flex: 1, color: '#4B5E7E', fontSize: 9 },
  emptyText: { color: '#8490A3', fontSize: 10, paddingVertical: 7 },
  countHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  countValue: { color: '#20345C', fontSize: 11, fontWeight: '900' },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 },
  countButton: { minWidth: 31, height: 27, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countButtonSelected: { backgroundColor: '#102A68' },
  countText: { color: '#8490A3', fontSize: 9 },
  countTextSelected: { color: '#FFFFFF', fontWeight: '900' },
  manualForm: { borderWidth: 1, borderColor: '#DCE5F2', borderRadius: 12, backgroundColor: '#F8FAFE', padding: 10, marginTop: 6 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewCount: { color: '#8490A3', fontSize: 9, marginTop: 8 },
  textInput: { minHeight: 35, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE5F2', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, color: '#20345C', fontSize: 10, marginTop: 6 },
  definitionInput: { minHeight: 59, textAlignVertical: 'top' },
  addCardButton: { minHeight: 33, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: '#C7D6EA', borderRadius: 9, backgroundColor: '#FFFFFF', marginTop: 7 },
  addCardText: { color: '#4B5E7E', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  disabled: { opacity: 0.5 },
  previewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  editAll: { color: '#6E7D97', fontSize: 9, marginTop: 7 },
  emptyPreview: { minHeight: 94, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#D8DEE7', borderRadius: 12, backgroundColor: '#FAFBFC', paddingHorizontal: 18, paddingVertical: 13 },
  emptyPreviewTitle: { color: '#4B5E7E', fontSize: 10, fontWeight: '800', marginTop: 6 },
  emptyPreviewText: { color: '#8490A3', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 4 },
  previewCard: { position: 'relative', borderWidth: 1, borderColor: '#DCE5F2', borderRadius: 12, backgroundColor: '#F8FAFE', padding: 10, marginBottom: 6 },
  previewMiniLabel: { color: '#8490A3', fontSize: 7, letterSpacing: 1.1, fontWeight: '800' },
  previewTerm: { color: '#20345C', fontSize: 10, fontWeight: '800', marginTop: 3, paddingRight: 18 },
  previewDivider: { height: 1, backgroundColor: '#DCE5F2', marginVertical: 6 },
  previewDefinition: { color: '#4B5E7E', fontSize: 9, lineHeight: 14, marginTop: 3, paddingRight: 18 },
  removeCard: { position: 'absolute', right: 8, top: 8, padding: 2 },
  pendingNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 9, marginBottom: 4 },
  pendingText: { flex: 1, color: '#8490A3', fontSize: 9, lineHeight: 13 },
  footer: { flexDirection: 'row', gap: 8, paddingHorizontal: 17, paddingTop: 9, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#DCE5F2', backgroundColor: '#FFFFFF' },
  previewButton: { flex: 1, minHeight: 40, borderRadius: 11, borderWidth: 1, borderColor: '#C9D1DD', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  previewButtonDisabled: { opacity: 0.6 },
  previewButtonText: { color: '#4B5E7E', fontSize: 9, fontWeight: '700' },
  previewButtonTextDisabled: { color: '#98A2B3' },
  saveButton: { flex: 1, minHeight: 40, paddingHorizontal: 9, borderRadius: 11, backgroundColor: '#102A68', alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
});
