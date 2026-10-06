import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getReviewers, SQLiteReviewer } from '../../database/reviewers';
import { useAppTheme } from '../../utils/ThemeContext';

export default function Dashboard() {
  const { dark } = useAppTheme();
  const [reviewers, setReviewers] = useState<SQLiteReviewer[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    getReviewers().then(items => { if (active) setReviewers(items); }).catch(() => {});
    return () => { active = false; };
  }, []));
  const totalDue = reviewers.reduce((sum, reviewer) => sum + reviewer.due_cards, 0);
  const mastery = reviewers.length
    ? Math.round(reviewers.reduce((sum, reviewer) => sum + reviewer.mastery, 0) / reviewers.length)
    : 0;
  const firstDueReviewer = reviewers.find(reviewer => reviewer.due_cards > 0) ?? reviewers[0];
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, dark && { backgroundColor: '#0B1220' }]}>
      <ScrollView
        style={[styles.container, dark && { backgroundColor: '#0B1220' }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, dark && { color: "#AAB7CC" }]}>Good day!</Text>
            <Text style={[styles.heading, dark && { color: '#F2F6FF' }]}>
              Ready to study?
            </Text>
          </View>

          <Pressable style={[styles.notificationButton, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]} onPress={() => router.push('/(tabs)/settings')} accessibilityRole="button" accessibilityLabel="Open settings">
            <Ionicons
              name="settings-outline"
              size={24}
              color={dark ? '#F2F6FF' : '#15264B'}
            />

          </Pressable>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>

          <View style={[styles.statCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <Ionicons name="library-outline" size={24} color="#2563EB" style={styles.statEmoji} />
            <Text style={[styles.statNumber, dark && { color: '#F2F6FF' }]}>{reviewers.length}</Text>
            <Text style={[styles.statLabel, dark && { color: '#AAB7CC' }]}>
              Reviewers
            </Text>
          </View>

          <View style={[styles.statCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <Ionicons name="analytics-outline" size={24} color="#00A8E8" style={styles.statEmoji} />
            <Text style={[styles.statNumber, dark && { color: '#F2F6FF' }]}>{mastery}%</Text>
            <Text style={[styles.statLabel, dark && { color: '#AAB7CC' }]}>
              Mastery
            </Text>
          </View>

        </View>

        {/* TODAY'S REVIEW */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, dark && { color: '#F2F6FF' }]}>
            Today&apos;s Review
          </Text>

            <Text style={[styles.sectionInfo, dark && { color: '#AAB7CC' }]}>
            {totalDue} due
          </Text>
        </View>

        <View style={[styles.reviewCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>

          <View style={styles.subjectIcon}>
            <Ionicons
              name="globe-outline"
              size={27}
              color="#2563EB"
            />
          </View>

          <View style={styles.reviewInfo}>
            <Text style={styles.courseCode}>
              {firstDueReviewer?.subject ?? 'No reviewer yet'}
            </Text>

            <Text style={[styles.courseName, dark && { color: '#F2F6FF' }]}>
              {firstDueReviewer?.name ?? 'Create your first reviewer'}
            </Text>

        <View style={[styles.progressBackground, dark && { backgroundColor: '#2B3A52' }]}>
              <View style={[styles.progressFill, { width: `${mastery}%` }]} />
            </View>

            <Text style={[styles.dueText, dark && { color: '#AAB7CC' }]}>
              {firstDueReviewer ? `${firstDueReviewer.due_cards} flashcards due` : 'Add study cards to start reviewing'}
            </Text>
          </View>

        </View>

        <Pressable style={styles.startButton} onPress={() => firstDueReviewer ? router.push(`/reviewer/${firstDueReviewer.reviewer_id}/flashcards`) : router.push('/reviewer/create')} accessibilityRole="button">
          <Ionicons
            name="play"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.startButtonText}>
            START REVIEW
          </Text>
        </Pressable>

        {/* REVIEWERS */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, dark && { color: '#F2F6FF' }]}>
            Your Reviewers
          </Text>

          <Pressable onPress={() => router.push('/(tabs)/reviewers')} accessibilityRole="button">
            <Text style={styles.seeAll}>
              See all
            </Text>
          </Pressable>
        </View>

        {reviewers.slice(0, 3).map((reviewer, index) => (
          <ReviewerCard
            key={reviewer.reviewer_id}
            icon={(['globe-outline', 'calculator-outline', 'phone-portrait-outline'] as const)[index]}
            title={`${reviewer.subject} - ${reviewer.name}`}
            subject={reviewer.description || reviewer.subject}
            progress={`${Math.round(reviewer.mastery)}%`}
            dark={dark}
            onPress={() => router.push(`/reviewer/${reviewer.reviewer_id}`)}
          />
        ))}
        {reviewers.length === 0 && <Text style={[styles.courseName, dark && { color: '#F2F6FF' }]}>No reviewers yet. Create one to begin.</Text>}

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
    </SafeAreaView>
  );
}

type ReviewerCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subject: string;
  progress: string;
  dark: boolean;
  onPress: () => void;
};

function ReviewerCard({
  icon,
  title,
  subject,
  progress,
  dark,
  onPress,
}: ReviewerCardProps) {
  return (
    <Pressable style={[styles.reviewerCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]} onPress={onPress} accessibilityRole="button">

      <View style={styles.smallIcon}>
        <Ionicons
          name={icon}
          size={22}
          color="#2563EB"
        />
      </View>

      <View style={styles.reviewerInfo}>
        <Text style={[styles.reviewerTitle, dark && { color: '#F2F6FF' }]}>
          {title}
        </Text>

        <Text style={[styles.reviewerSubject, dark && { color: '#AAB7CC' }]}>
          {subject}
        </Text>
      </View>

      <View style={styles.progressCircle}>
        <Text style={[styles.progressText, dark && { color: '#7CB0FF' }]}>
          {progress}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#B7B7B7"
      />

    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },

  container: {
    flex: 1,
  },

  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  greeting: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 3,
  },

  heading: {
    fontSize: 27,
    fontWeight: '900',
    color: '#15264B',
  },

  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DCE5F2',
  },

  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationNumber: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#DCE5F2',
    padding: 18,
  },

  statEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#15264B',
  },

  statLabel: {
    marginTop: 3,
    color: '#777777',
    fontWeight: '600',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#15264B',
  },

  sectionInfo: {
    color: '#777777',
    fontWeight: '700',
  },

  reviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 20,
    padding: 18,
  },

  subjectIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  reviewInfo: {
    flex: 1,
  },

  courseCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },

  courseName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15264B',
    marginTop: 2,
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#DCE5F2',
    borderRadius: 10,
    marginTop: 13,
    overflow: 'hidden',
  },

  progressFill: {
    width: '72%',
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 10,
  },

  dueText: {
    marginTop: 8,
    fontSize: 12,
    color: '#777777',
  },

  startButton: {
    height: 54,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,

    borderBottomWidth: 4,
    borderBottomColor: '#1748BA',
  },

  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  seeAll: {
    color: '#2563EB',
    fontWeight: '800',
  },

  reviewerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
  },

  smallIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  reviewerInfo: {
    flex: 1,
  },

  reviewerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15264B',
  },

  reviewerSubject: {
    fontSize: 12,
    color: '#888888',
    marginTop: 3,
  },

  progressCircle: {
    marginRight: 8,
  },

  progressText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },

  floatingButton: { position: 'absolute', right: 20, bottom: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#102A68', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000000', shadowOpacity: 0.17, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  floatingPressed: { transform: [{ scale: 0.95 }] },
});
