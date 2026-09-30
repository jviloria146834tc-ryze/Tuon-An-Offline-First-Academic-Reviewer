import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

export default function Dashboard() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day! 👋</Text>
            <Text style={styles.heading}>
              Ready to study?
            </Text>
          </View>

          <Pressable style={styles.notificationButton}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#3C3C3C"
            />

            <View style={styles.notificationBadge}>
              <Text style={styles.notificationNumber}>2</Text>
            </View>
          </Pressable>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>

          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statNumber}>7</Text>
            <Text style={styles.statLabel}>
              Day Streak
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🧠</Text>
            <Text style={styles.statNumber}>82%</Text>
            <Text style={styles.statLabel}>
              Mastery
            </Text>
          </View>

        </View>

        {/* TODAY'S REVIEW */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Today's Review
          </Text>

          <Text style={styles.sectionInfo}>
            3 due
          </Text>
        </View>

        <View style={styles.reviewCard}>

          <View style={styles.subjectIcon}>
            <Ionicons
              name="globe-outline"
              size={27}
              color="#58CC02"
            />
          </View>

          <View style={styles.reviewInfo}>
            <Text style={styles.courseCode}>
              IT 12
            </Text>

            <Text style={styles.courseName}>
              Networking
            </Text>

            <View style={styles.progressBackground}>
              <View style={styles.progressFill} />
            </View>

            <Text style={styles.dueText}>
              15 flashcards due today
            </Text>
          </View>

        </View>

        <Pressable style={styles.startButton}>
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
          <Text style={styles.sectionTitle}>
            Your Reviewers
          </Text>

          <Pressable>
            <Text style={styles.seeAll}>
              See all
            </Text>
          </Pressable>
        </View>

        <ReviewerCard
          icon="globe-outline"
          title="IT 12 - Networking"
          subject="Networking"
          progress="72%"
        />

        <ReviewerCard
          icon="calculator-outline"
          title="IT 8 - Calculus"
          subject="Mathematics"
          progress="45%"
        />

        <ReviewerCard
          icon="phone-portrait-outline"
          title="CCE 106"
          subject="App Development"
          progress="88%"
        />

        {/* CREATE REVIEWER */}
        <Pressable style={styles.createButton}>
          <Ionicons
            name="add-circle-outline"
            size={22}
            color="#58CC02"
          />

          <Text style={styles.createButtonText}>
            Create New Reviewer
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

type ReviewerCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subject: string;
  progress: string;
};

function ReviewerCard({
  icon,
  title,
  subject,
  progress,
}: ReviewerCardProps) {
  return (
    <Pressable style={styles.reviewerCard}>

      <View style={styles.smallIcon}>
        <Ionicons
          name={icon}
          size={22}
          color="#58CC02"
        />
      </View>

      <View style={styles.reviewerInfo}>
        <Text style={styles.reviewerTitle}>
          {title}
        </Text>

        <Text style={styles.reviewerSubject}>
          {subject}
        </Text>
      </View>

      <View style={styles.progressCircle}>
        <Text style={styles.progressText}>
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
    backgroundColor: '#F7F9F7',
  },

  container: {
    flex: 1,
  },

  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 35,
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
    color: '#292929',
  },

  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
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
    borderColor: '#E5E5E5',
    padding: 18,
  },

  statEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#292929',
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
    color: '#292929',
  },

  sectionInfo: {
    color: '#777777',
    fontWeight: '700',
  },

  reviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    padding: 18,
  },

  subjectIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#EAF9DF',
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
    color: '#58CC02',
  },

  courseName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#292929',
    marginTop: 2,
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#E5E5E5',
    borderRadius: 10,
    marginTop: 13,
    overflow: 'hidden',
  },

  progressFill: {
    width: '72%',
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 10,
  },

  dueText: {
    marginTop: 8,
    fontSize: 12,
    color: '#777777',
  },

  startButton: {
    height: 54,
    backgroundColor: '#58CC02',
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,

    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
  },

  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  seeAll: {
    color: '#58CC02',
    fontWeight: '800',
  },

  reviewerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
  },

  smallIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EAF9DF',
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
    color: '#292929',
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
    color: '#58CC02',
    fontSize: 13,
    fontWeight: '900',
  },

  createButton: {
    height: 56,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#58CC02',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },

  createButtonText: {
    color: '#58CC02',
    fontWeight: '900',
    fontSize: 15,
  },
});