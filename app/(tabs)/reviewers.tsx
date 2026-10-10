import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getReviewers, SQLiteReviewer } from '../../database/reviewers';
import { COLORS } from '../../utils/theme';
import { useAppTheme } from '../../utils/ThemeContext';

const FILTERS = ['All', 'In Progress', 'Completed', 'Archived'] as const;
type ReviewerFilter = (typeof FILTERS)[number];

function getStatus(reviewer: SQLiteReviewer): Exclude<ReviewerFilter, 'All' | 'Archived'> | 'Active' {
  if (reviewer.card_count > 0 && reviewer.mastery === 100 && reviewer.due_cards === 0) return 'Completed';
  if (reviewer.card_count > 0) return 'In Progress';
  return 'Active';
}

function getLastStudied(value: string | null): string {
  if (!value) return 'Last studied: Never';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return 'Last studied: Recently';
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const studiedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.max(0, Math.floor((dayStart - studiedDay) / 86_400_000));
  if (days === 0) return 'Last studied: Today';
  if (days === 1) return 'Last studied: Yesterday';
  if (days < 7) return `Last studied: ${days} days ago`;
  if (days < 14) return 'Last studied: 1 week ago';
  return `Last studied: ${Math.floor(days / 7)} weeks ago`;
}

export default function ReviewersScreen() {
  const { dark } = useAppTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReviewerFilter>('All');
  const [reviewers, setReviewers] = useState<SQLiteReviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    getReviewers()
      .then(data => { if (active) setReviewers(data); })
      .catch(error => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load reviewers.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const filteredReviewers = useMemo(() => reviewers.filter(reviewer => {
    const matchesSearch = `${reviewer.name} ${reviewer.subject}`.toLowerCase().includes(search.trim().toLowerCase());
    const isArchived = Boolean(reviewer.is_archived);
    if (filter === 'Archived') {
      return matchesSearch && isArchived;
    }
    if (isArchived) {
      return false;
    }
    const status = getStatus(reviewer);
    const matchesFilter = filter === 'All' || status === filter;
    return matchesSearch && matchesFilter;
  }), [filter, reviewers, search]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, dark && { backgroundColor: '#0B1220' }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, dark && { color: '#7CB0FF' }]}>YOUR LIBRARY</Text>
            <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>Reviewers</Text>
          </View>
          <Pressable
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/settings')}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Ionicons name="person-outline" size={21} color="#102A68" />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={17} color="#9AA3B2" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reviewers..."
            placeholderTextColor="#9AA3B2"
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search reviewers"
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color="#A1A8B3" />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map(item => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item }}
              style={[styles.filterChip, filter === item && styles.filterChipSelected]}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {loading && <Text style={styles.message}>Loading reviewers...</Text>}
          {!!loadError && <Text style={styles.message}>Could not load reviewers: {loadError}</Text>}
          {!loading && !loadError && filteredReviewers.map(reviewer => {
            const status = getStatus(reviewer);
            const isDone = status === 'Completed';
            return (
              <Pressable
                key={reviewer.reviewer_id}
                onPress={() => router.push(`/reviewer/${reviewer.reviewer_id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${reviewer.name}, ${reviewer.mastery} percent mastery`}
                style={({ pressed }) => [styles.reviewerCard, pressed && styles.cardPressed]}
              >
                <View style={[styles.masteryRing, isDone && styles.masteryRingDone]}>
                  <Text style={styles.masteryText}>{Math.round(reviewer.mastery)}%</Text>
                </View>
                <View style={styles.reviewerContent}>
                  <Text style={styles.reviewerName} numberOfLines={1}>{reviewer.name}</Text>
                  <Text style={styles.metadata} numberOfLines={1}>
                    {reviewer.subject} | {reviewer.card_count} {reviewer.card_count === 1 ? 'card' : 'cards'}
                  </Text>
                  <Text style={[styles.lastStudied, dark && { color: '#AAB7CC' }]} numberOfLines={1}>{getLastStudied(reviewer.last_studied)}</Text>
                </View>
                <View style={styles.rightColumn}>
                  <View style={[styles.statusPill, isDone ? styles.statusPillDone : styles.statusPillActive]}>
                    <Text style={[styles.statusText, isDone && styles.statusTextDone]}>{isDone ? 'Done' : 'Active'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color="#B9C7DA" />
                </View>
              </Pressable>
            );
          })}
          {!loading && !loadError && filteredReviewers.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name={search ? 'search-outline' : 'library-outline'} size={34} color="#99A2B0" />
              <Text style={[styles.emptyTitle, dark && { color: '#F2F6FF' }]}>
                {search ? 'No reviewers found' : filter === 'Archived' ? 'No archived reviewers' : filter === 'All' ? 'No reviewers yet' : `No ${filter.toLowerCase()} reviewers`}
              </Text>
              <Text style={[styles.emptyText, dark && { color: '#AAB7CC' }]}>
                {search ? 'Try a different name or subject.' : filter === 'Archived' ? 'Archived reviewers will appear here when archiving is available.' : filter === 'All' ? 'Create a reviewer to get started.' : 'Study cards and your progress will appear here.'}
              </Text>
            </View>
          )}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [styles.floatingButton, pressed && styles.floatingPressed]}
          onPress={() => router.push('/reviewer/create')}
          accessibilityRole="button"
          accessibilityLabel="Create reviewer"
          hitSlop={8}
        >
          <Ionicons name="add" size={27} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.canvas },
  container: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 12 },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: COLORS.cyan, marginBottom: 3 },
  title: { fontSize: 27, fontWeight: '900', color: COLORS.navy },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { height: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF4FC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 13, marginBottom: 11, gap: 9 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, color: COLORS.text, outlineStyle: 'none' } as any,
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 7, rowGap: 7, marginBottom: 12 },
  filterChip: { minHeight: 32, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: '#C7D6EA', backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  filterChipSelected: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  filterText: { color: '#4B5E7E', fontSize: 11, fontWeight: '700' },
  filterTextSelected: { color: '#FFFFFF' },
  list: { flex: 1 },
  listContent: { paddingTop: 2, paddingBottom: 96 },
  reviewerCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 9 },
  cardPressed: { backgroundColor: '#F1F4F7', transform: [{ scale: 0.99 }] },
  masteryRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: COLORS.surface },
  masteryRingDone: { borderColor: '#B9C7DA' },
  masteryText: { color: COLORS.navy, fontSize: 9, fontWeight: '900' },
  reviewerContent: { flex: 1, minWidth: 0 },
  reviewerName: { color: COLORS.navy, fontSize: 14, fontWeight: '800' },
  metadata: { color: '#6E7D97', fontSize: 10, marginTop: 4 },
  lastStudied: { color: '#8490A3', fontSize: 10, marginTop: 3 },
  rightColumn: { height: 48, justifyContent: 'space-between', alignItems: 'flex-end', marginLeft: 7 },
  statusPill: { minWidth: 37, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, alignItems: 'center' },
  statusPillActive: { backgroundColor: '#102A68' },
  statusPillDone: { backgroundColor: '#E8EBEF' },
  statusText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  statusTextDone: { color: '#667085' },
  message: { color: '#7B8492', fontSize: 12, paddingVertical: 20 },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 52 },
  emptyTitle: { color: '#20345C', fontSize: 15, fontWeight: '800', marginTop: 12 },
  emptyText: { maxWidth: 270, color: '#8490A3', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  floatingButton: { position: 'absolute', right: 14, bottom: 17, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: COLORS.navy, shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  floatingPressed: { transform: [{ scale: 0.95 }] },
});
