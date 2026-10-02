
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getReviewers,
  SQLiteReviewer,
} from '../../database/reviewers';

export default function ReviewersScreen() {
  const [search, setSearch] = useState('');
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

  const filteredReviewers = reviewers.filter(
    reviewer =>
      `${reviewer.name} ${reviewer.subject}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  );

  const totalReviewers = reviewers.length;

  const totalDueCards = reviewers.reduce(
    (total, reviewer) =>
      total + reviewer.due_cards,
    0
  );

  const averageMastery =
    reviewers.length > 0
      ? Math.round(
          reviewers.reduce(
            (total, reviewer) =>
              total + reviewer.mastery,
            0
          ) / reviewers.length
        )
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.smallHeading}>
              YOUR LIBRARY
            </Text>

            <Text style={styles.title}>
              My Reviewers
            </Text>
          </View>

          <Pressable style={styles.profileButton}>
            <Ionicons
              name="person-outline"
              size={23}
              color="#3C3C3C"
            />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#8A8A8A"
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search reviewers..."
            placeholderTextColor="#999999"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {totalReviewers}
            </Text>

            <Text style={styles.summaryLabel}>
              Reviewers
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {totalDueCards}
            </Text>

            <Text style={styles.summaryLabel}>
              Due Cards
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {averageMastery}%
            </Text>

            <Text style={styles.summaryLabel}>
              Mastery
            </Text>
          </View>
        </View>

        <View style={styles.listHeading}>
          <Text style={styles.sectionTitle}>
            All Reviewers
          </Text>

          <Text style={styles.resultCount}>
            {filteredReviewers.length} found
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading && <Text style={styles.emptyText}>Loading reviewers…</Text>}
          {!!loadError && <Text style={styles.emptyText}>Could not load reviewers: {loadError}</Text>}
          {!loading && !loadError && filteredReviewers.map(reviewer => (
            <Pressable
              key={reviewer.reviewer_id}
              onPress={() =>
                router.push(
                  `/reviewer/${reviewer.reviewer_id}`
                )
              }
              style={({ pressed }) => [
                styles.reviewerCard,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.iconBox}>
                <Ionicons
                  name="book-outline"
                  size={27}
                  color="#58CC02"
                />
              </View>

              <View style={styles.reviewerContent}>
                <Text style={styles.courseCode}>
                  {reviewer.name}
                </Text>

                <Text
                  style={styles.reviewerTitle}
                  numberOfLines={1}
                >
                  {reviewer.subject}
                </Text>

                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min(
                            Math.max(
                              reviewer.mastery,
                              0
                            ),
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.progressNumber}>
                    {reviewer.mastery}%
                  </Text>
                </View>

                <Text style={styles.dueText}>
                  {reviewer.due_cards}{' '}
                  {reviewer.due_cards === 1
                    ? 'card'
                    : 'cards'}{' '}
                  due
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color="#BBBBBB"
              />
            </Pressable>
          ))}
          {!loading && !loadError && filteredReviewers.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                📚
              </Text>

              <Text style={styles.emptyTitle}>
                {search.trim() ? 'No reviewers found' : 'No reviewers yet'}
              </Text>

              <Text style={styles.emptyText}>
                {search.trim() ? 'Try searching for another subject.' : 'Create a reviewer to get started.'}
              </Text>
            </View>
          )}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.floatingButton,
            pressed && styles.floatingPressed,
          ]}
          onPress={() =>
            router.push('/reviewer/create')
          }
        >
          <Ionicons
            name="add"
            size={30}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7',
  },

  container: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  smallHeading: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#58CC02',
    marginBottom: 3,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#292929',
  },

  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchContainer: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 15,
    color: '#292929',
    outlineStyle: 'none',
  } as any,

  summaryRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 26,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
  },

  summaryNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#292929',
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    marginTop: 4,
  },

  listHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#292929',
  },

  resultCount: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
  },

  scrollContent: {
    paddingBottom: 110,
  },

  reviewerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 19,
    padding: 15,
    marginBottom: 11,
  },

  cardPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: '#FAFAFA',
  },

  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: '#EAF9DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  reviewerContent: {
    flex: 1,
  },

  courseCode: {
    fontSize: 11,
    color: '#58CC02',
    fontWeight: '900',
  },

  reviewerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#292929',
    marginTop: 2,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  progressTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#E7E7E7',
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 9,
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 10,
  },

  progressNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: '#58CC02',
  },

  dueText: {
    marginTop: 6,
    fontSize: 11,
    color: '#999999',
  },

  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#58CC02',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    borderBottomColor: '#46A302',
  },

  floatingPressed: {
    transform: [{ scale: 0.96 }],
    borderBottomWidth: 2,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyEmoji: {
    fontSize: 45,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#292929',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: '#888888',
  },
});
