import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMaterialsByReviewer, SQLiteMaterial } from '../../../database/materials';
import { getReviewerById, SQLiteReviewer } from '../../../database/reviewers';
import { useAppTheme } from '../../../utils/ThemeContext';

const QUESTION_TYPES = ['Multiple Choice', 'True / False', 'Identification'] as const;
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
const QUESTION_COUNTS = [5, 10, 15, 20, 30, 50] as const;
type SourceMode = 'all' | 'custom';

export default function QuizBuilderScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const [reviewer, setReviewer] = useState<SQLiteReviewer | null>(null);
  const [materials, setMaterials] = useState<SQLiteMaterial[]>([]);
  const [sourceMode, setSourceMode] = useState<SourceMode>('all');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [questionType, setQuestionType] = useState<(typeof QUESTION_TYPES)[number]>('Multiple Choice');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('Medium');
  const [questionCount, setQuestionCount] = useState<(typeof QUESTION_COUNTS)[number]>(10);
  const [loading, setLoading] = useState(true);

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

  const requestGeneration = () => {
    Alert.alert(
      'Quiz generation is not connected yet',
      `Your setup is ready for ${questionCount} ${questionType.toLowerCase()} questions at ${difficulty.toLowerCase()} difficulty. Gemini generation will be connected by your teammate.`,
    );
  };

  return (
    <SafeAreaView style={[styles.safe, dark && { backgroundColor: '#0B1220' }]}>
      <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={dark ? '#F2F6FF' : '#4B5E7E'} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, dark && { color: '#F2F6FF' }]}>Generate Quiz</Text>
          <Text style={styles.headerSubtitle}>{reviewer?.subject ?? reviewer?.name ?? 'Reviewer'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={[styles.scroll, dark && { backgroundColor: '#0B1220' }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>SOURCE MATERIAL</Text>
        <RadioRow dark={dark} label="All Materials" selected={sourceMode === 'all'} onPress={() => { setSourceMode('all'); setSelectedMaterials(materials.map(item => item.material_id)); }} />
        <RadioRow dark={dark} label="Custom Range" selected={sourceMode === 'custom'} onPress={() => setSourceMode('custom')} />

        {sourceMode === 'custom' && (
          <View style={[styles.materialPicker, dark && { backgroundColor: '#111B2B', borderColor: '#2B3A52' }]}>
            <Text style={[styles.pickerTitle, dark && { color: '#CBD5E1' }]}>Choose materials</Text>
            {loading ? <Text style={styles.emptySource}>Loading materials...</Text> : materials.length === 0 ? (
              <Text style={styles.emptySource}>Add study materials to this reviewer first.</Text>
            ) : materials.map(material => {
              const checked = selectedMaterials.includes(material.material_id);
              return (
                <Pressable key={material.material_id} style={[styles.materialRow, dark && { backgroundColor: '#172235' }]} onPress={() => toggleMaterial(material.material_id)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
                  <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={19} color={checked ? '#102A68' : '#B9C7DA'} />
                  <Text style={[styles.materialTitle, dark && { color: '#F2F6FF' }]} numberOfLines={1}>{material.title}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>QUESTION TYPE</Text>
        {QUESTION_TYPES.map(type => (
          <RadioRow key={type} dark={dark} label={type} selected={questionType === type} onPress={() => setQuestionType(type)} />
        ))}

        <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>DIFFICULTY</Text>
        <View style={styles.segmentRow}>
          {DIFFICULTIES.map(item => (
            <Pressable key={item} onPress={() => setDifficulty(item)} accessibilityRole="button" accessibilityState={{ selected: difficulty === item }} style={[styles.segment, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }, difficulty === item && styles.segmentSelected]}>
              <Text style={[styles.segmentText, dark && { color: '#CBD5E1' }, difficulty === item && styles.segmentTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.countHeading}>
          <Text style={styles.sectionLabel}>NUMBER OF QUESTIONS</Text>
          <Text style={[styles.countValue, dark && { color: '#F2F6FF' }]}>{questionCount}</Text>
        </View>
        <View style={styles.countOptions}>
          {QUESTION_COUNTS.map(count => (
            <Pressable key={count} onPress={() => setQuestionCount(count)} accessibilityRole="button" accessibilityState={{ selected: questionCount === count }} style={[styles.countOption, dark && { backgroundColor: '#172235' }, questionCount === count && styles.countOptionSelected]}>
              <Text style={[styles.countOptionText, dark && { color: '#AAB7CC' }, questionCount === count && styles.countOptionTextSelected]}>{count}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.sourceSummary, dark && { backgroundColor: '#111B2B', borderColor: '#2B3A52' }]}>
          <Text style={[styles.summaryTitle, dark && { color: '#AAB7CC' }]}>
            {loading ? 'LOADING SOURCE MATERIALS' : `PULLING FROM (${selectedItems.length} ${selectedItems.length === 1 ? 'MATERIAL' : 'MATERIALS'})`}
          </Text>
          {selectedItems.length > 0 ? selectedItems.slice(0, 3).map(material => (
            <View key={material.material_id} style={styles.summaryItem}>
              <Text style={styles.summaryBullet}>•</Text>
              <Text style={[styles.summaryText, dark && { color: '#F2F6FF' }]} numberOfLines={1}>{material.title}</Text>
            </View>
          )) : !loading ? (
            <Text style={styles.emptySource}>No source materials selected.</Text>
          ) : null}
          {selectedItems.length > 3 && <Text style={styles.moreText}>+ {selectedItems.length - 3} more</Text>}
          {!loading && materials.length === 0 && <Text style={styles.emptySource}>Add study material before quiz generation can begin.</Text>}
        </View>
        <View style={styles.pendingNote}>
          <Ionicons name="information-circle-outline" size={18} color="#6E7D97" />
          <Text style={[styles.pendingText, dark && { color: '#AAB7CC' }]}>This screen saves your generation choices locally. Gemini quiz generation will be connected by your teammate.</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, dark && { backgroundColor: '#111B2B', borderTopColor: '#2B3A52' }]}>
        <Pressable style={[styles.generateButton, (loading || selectedItems.length === 0) && styles.disabledButton]} disabled={loading || selectedItems.length === 0} onPress={requestGeneration} accessibilityRole="button">
          <Text style={styles.generateText}>Generate {questionCount}-Item Quiz</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function RadioRow({ label, selected, onPress, dark }: { label: string; selected: boolean; onPress: () => void; dark: boolean }) {
  return (
    <Pressable style={[styles.radioRow, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }, selected && styles.radioRowSelected, dark && selected && { backgroundColor: '#1E3A6B', borderColor: '#4A7DDB' }]} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={[styles.radioLabel, dark && { color: '#F2F6FF' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: '#E3E7EC', backgroundColor: '#FFFFFF' },
  backButton: { width: 29, height: 38, alignItems: 'flex-start', justifyContent: 'center' },
  headerCopy: { flex: 1, marginLeft: 10 },
  headerTitle: { color: '#102A68', fontSize: 15, fontWeight: '800' },
  headerSubtitle: { color: '#8490A3', fontSize: 10, marginTop: 1 },
  headerSpacer: { width: 25 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20 },
  sectionLabel: { color: '#8490A3', fontSize: 9, letterSpacing: 1.6, fontWeight: '800', marginTop: 17, marginBottom: 8 },
  radioRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DCE5F2', borderRadius: 13, paddingHorizontal: 12, marginBottom: 6, backgroundColor: '#FFFFFF' },
  radioRowSelected: { borderColor: '#102A68', backgroundColor: '#F8FAFE' },
  radioOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#B9C7DA', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioOuterSelected: { borderColor: '#102A68' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#102A68' },
  radioLabel: { color: '#20345C', fontSize: 12, fontWeight: '600' },
  materialPicker: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, borderWidth: 1, borderColor: '#DCE5F2', marginBottom: 3, backgroundColor: '#FAFBFC' },
  pickerTitle: { color: '#6E7D97', fontSize: 10, fontWeight: '800', marginBottom: 3 },
  materialRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8 },
  materialTitle: { flex: 1, color: '#4B5E7E', fontSize: 10 },
  emptySource: { color: '#8490A3', fontSize: 10, lineHeight: 15, marginTop: 4 },
  segmentRow: { flexDirection: 'row', gap: 7, marginTop: 1 },
  segment: { flex: 1, height: 34, borderRadius: 12, borderWidth: 1, borderColor: '#DCE5F2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  segmentSelected: { borderColor: '#102A68', backgroundColor: '#102A68' },
  segmentText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  segmentTextSelected: { color: '#FFFFFF' },
  countHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  countValue: { color: '#20345C', fontSize: 13, fontWeight: '900' },
  countOptions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 },
  countOption: { minWidth: 31, height: 28, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  countOptionSelected: { backgroundColor: '#102A68' },
  countOptionText: { color: '#8490A3', fontSize: 9 },
  countOptionTextSelected: { color: '#FFFFFF', fontWeight: '900' },
  sourceSummary: { borderWidth: 1, borderColor: '#DCE5F2', borderRadius: 14, backgroundColor: '#F8FAFE', padding: 12, marginTop: 11 },
  summaryTitle: { color: '#8490A3', fontSize: 8, letterSpacing: 1.3, fontWeight: '800', marginBottom: 7 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  summaryBullet: { color: '#98A2B3', width: 12, fontSize: 12 },
  summaryText: { flex: 1, color: '#4B5E7E', fontSize: 10 },
  moreText: { color: '#8490A3', fontSize: 9, marginLeft: 12, marginTop: 4 },
  pendingNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 12, marginBottom: 8 },
  pendingText: { flex: 1, color: '#8490A3', fontSize: 10, lineHeight: 15 },
  footer: { paddingHorizontal: 17, paddingTop: 10, paddingBottom: 13, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#DCE5F2' },
  generateButton: { minHeight: 48, borderRadius: 13, backgroundColor: '#102A68', alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.45 },
  generateText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});
