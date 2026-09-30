import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const weeklyActivity = [
  { day: 'M', value: 45 },
  { day: 'T', value: 70 },
  { day: 'W', value: 35 },
  { day: 'T', value: 85 },
  { day: 'F', value: 60 },
  { day: 'S', value: 30 },
  { day: 'S', value: 75 },
];

const topicPerformance = [
  {
    id: '1',
    name: 'HCI Introduction',
    reviewer: 'IT 26',
    mastery: 90,
  },
  {
    id: '2',
    name: "Norman's Model",
    reviewer: 'IT 26',
    mastery: 60,
  },
  {
    id: '3',
    name: 'Database Fundamentals',
    reviewer: 'IT 25',
    mastery: 55,
  },
];

const recentActivity = [
  {
    id: '1',
    icon: 'albums-outline' as const,
    title: 'HCI Introduction',
    description: '24 flashcards reviewed',
    time: 'Today',
  },
  {
    id: '2',
    icon: 'help-circle-outline' as const,
    title: "Norman's Model",
    description: '12 of 15 questions correct',
    time: 'Yesterday',
  },
  {
    id: '3',
    icon: 'book-outline' as const,
    title: 'Database Fundamentals',
    description: '20 flashcards reviewed',
    time: '2 days ago',
  },
];

export default function AnalyticsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.smallHeading}>
              YOUR PROGRESS
            </Text>

            <Text style={styles.title}>
              Analytics
            </Text>

            <Text style={styles.subtitle}>
              See how your study habits are improving.
            </Text>
          </View>

          <View style={styles.masteryCard}>
            <View style={styles.masteryTop}>
              <View>
                <Text style={styles.masteryLabel}>
                  OVERALL MASTERY
                </Text>

                <Text style={styles.masteryNumber}>
                  72%
                </Text>
              </View>

              <View style={styles.masteryIcon}>
                <Ionicons
                  name="trophy-outline"
                  size={27}
                  color="#58CC02"
                />
              </View>
            </View>

            <View style={styles.masteryTrack}>
              <View
                style={[
                  styles.masteryFill,
                  { width: '72%' },
                ]}
              />
            </View>

            <Text style={styles.masteryMessage}>
              Keep going! Your learning is improving.
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon="checkmark-circle-outline"
              value="78%"
              label="Quiz Accuracy"
              background="#EAF9DF"
              iconColor="#58CC02"
            />

            <StatCard
              icon="flame-outline"
              value="7"
              label="Day Streak"
              background="#FFF3DF"
              iconColor="#FF9600"
            />

            <StatCard
              icon="albums-outline"
              value="84"
              label="Cards Reviewed"
              background="#F2EAFE"
              iconColor="#9069CD"
            />

            <StatCard
              icon="time-outline"
              value="4.5h"
              label="Study Time"
              background="#E6F4FF"
              iconColor="#1CB0F6"
            />
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                THIS WEEK
              </Text>

              <Text style={styles.sectionTitle}>
                Study Activity
              </Text>
            </View>

            <View style={styles.weekBadge}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color="#58CC02"
              />

              <Text style={styles.weekBadgeText}>
                7 days
              </Text>
            </View>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.chart}>
              {weeklyActivity.map((item, index) => (
                <View
                  style={styles.chartItem}
                  key={`${item.day}-${index}`}
                >
                  <View style={styles.barArea}>
                    <View
                      style={[
                        styles.activityBar,
                        {
                          height: `${item.value}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.dayLabel}>
                    {item.day}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.activityFooter}>
              <View>
                <Text style={styles.activityNumber}>
                  5
                </Text>

                <Text style={styles.activityLabel}>
                  Active days
                </Text>
              </View>

              <View style={styles.activityDivider} />

              <View>
                <Text style={styles.activityNumber}>
                  12
                </Text>

                <Text style={styles.activityLabel}>
                  Sessions
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                MASTERY
              </Text>

              <Text style={styles.sectionTitle}>
                Topic Performance
              </Text>
            </View>
          </View>

          <View style={styles.topicContainer}>
            {topicPerformance.map((topic, index) => (
              <View
                key={topic.id}
                style={[
                  styles.topicRow,
                  index !== topicPerformance.length - 1 &&
                    styles.topicBorder,
                ]}
              >
                <View style={styles.topicIcon}>
                  <Ionicons
                    name="book-outline"
                    size={20}
                    color="#58CC02"
                  />
                </View>

                <View style={styles.topicContent}>
                  <View style={styles.topicHeader}>
                    <View style={styles.topicText}>
                      <Text
                        style={styles.topicName}
                        numberOfLines={1}
                      >
                        {topic.name}
                      </Text>

                      <Text style={styles.topicReviewer}>
                        {topic.reviewer}
                      </Text>
                    </View>

                    <Text style={styles.topicMastery}>
                      {topic.mastery}%
                    </Text>
                  </View>

                  <View style={styles.topicTrack}>
                    <View
                      style={[
                        styles.topicFill,
                        {
                          width: `${topic.mastery}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                HISTORY
              </Text>

              <Text style={styles.sectionTitle}>
                Recent Activity
              </Text>
            </View>
          </View>

          <View style={styles.recentContainer}>
            {recentActivity.map((activity, index) => (
              <View
                key={activity.id}
                style={[
                  styles.recentRow,
                  index !== recentActivity.length - 1 &&
                    styles.recentBorder,
                ]}
              >
                <View style={styles.recentIcon}>
                  <Ionicons
                    name={activity.icon}
                    size={21}
                    color="#58CC02"
                  />
                </View>

                <View style={styles.recentContent}>
                  <Text style={styles.recentTitle}>
                    {activity.title}
                  </Text>

                  <Text style={styles.recentDescription}>
                    {activity.description}
                  </Text>
                </View>

                <Text style={styles.recentTime}>
                  {activity.time}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#1CB0F6"
            />

            <Text style={styles.infoText}>
              These analytics currently use sample data.
              Your actual study activity will appear here
              once local progress tracking is connected.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  background: string;
  iconColor: string;
};

function StatCard({
  icon,
  value,
  label,
  background,
  iconColor,
}: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons
          name={icon}
          size={23}
          color={iconColor}
        />
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7',
  },

  scrollContent: {
    paddingBottom: 35,
  },

  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  header: {
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

  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#888888',
    marginTop: 5,
  },

  masteryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 21,
    padding: 18,
    marginBottom: 12,
  },

  masteryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  masteryLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#999999',
  },

  masteryNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#58CC02',
    marginTop: 2,
  },

  masteryIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#EAF9DF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  masteryTrack: {
    height: 10,
    backgroundColor: '#E7E7E7',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 15,
  },

  masteryFill: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 20,
  },

  masteryMessage: {
    fontSize: 11,
    color: '#888888',
    marginTop: 9,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  statCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 19,
    padding: 15,
    marginBottom: 10,
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#292929',
  },

  statLabel: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '700',
    marginTop: 3,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 11,
  },

  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#58CC02',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#292929',
    marginTop: 2,
  },

  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EAF9DF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },

  weekBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#58CC02',
  },

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    padding: 17,
    marginBottom: 17,
  },

  chart: {
    height: 145,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  chartItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
  },

  barArea: {
    flex: 1,
    width: 18,
    backgroundColor: '#EEF0EC',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },

  activityBar: {
    width: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 8,
  },

  dayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#888888',
    marginTop: 7,
  },

  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },

  activityNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#292929',
    textAlign: 'center',
  },

  activityLabel: {
    fontSize: 10,
    color: '#999999',
    marginTop: 2,
  },

  activityDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 35,
  },

  topicContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 17,
  },

  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },

  topicBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  topicIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF9DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  topicContent: {
    flex: 1,
  },

  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  topicText: {
    flex: 1,
  },

  topicName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#292929',
  },

  topicReviewer: {
    fontSize: 10,
    color: '#999999',
    marginTop: 2,
  },

  topicMastery: {
    fontSize: 13,
    fontWeight: '900',
    color: '#58CC02',
    marginLeft: 10,
  },

  topicTrack: {
    height: 6,
    backgroundColor: '#E7E7E7',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },

  topicFill: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 10,
  },

  recentContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 15,
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },

  recentBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  recentIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF9DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  recentContent: {
    flex: 1,
  },

  recentTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#292929',
  },

  recentDescription: {
    fontSize: 10,
    color: '#999999',
    marginTop: 3,
  },

  recentTime: {
    fontSize: 9,
    color: '#AAAAAA',
    marginLeft: 8,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EAF7FF',
    borderRadius: 17,
    padding: 14,
    gap: 10,
    marginBottom: 15,
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: '#557080',
  },
});