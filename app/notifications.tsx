import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReviewers, SQLiteReviewer } from '../database/reviewers';
import { getSyncMeta } from '../database/sync_queue';
import { useAppTheme } from '../utils/ThemeContext';

type ReminderSettings = {
  reminderEnabled: boolean;
  selectedDays: string[];
  selectedTime: string;
};

type ReminderItem = {
  reviewer: SQLiteReviewer;
  settings: ReminderSettings;
};

const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function NotificationsScreen() {
  const { dark } = useAppTheme();
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const reviewers = await getReviewers();
      const reminders = await Promise.all(reviewers.map(async reviewer => {
        const saved = await getSyncMeta(`schedule_${reviewer.reviewer_id}`);
        if (!saved) return null;
        try {
          const settings = JSON.parse(saved) as ReminderSettings;
          if (!Array.isArray(settings.selectedDays)) return null;
          return { reviewer, settings };
        } catch {
          return null;
        }
      }));
      if (active) setItems(reminders.filter((item): item is ReminderItem => item !== null));
    })().catch(() => {
      if (active) setItems([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []));

  const bg = dark ? '#0B1220' : '#F4F7FF';
  const card = dark ? '#172235' : '#FFFFFF';
  const border = dark ? '#2B3A52' : '#DCE5F2';
  const mainText = dark ? '#F2F6FF' : '#15264B';
  const mutedText = dark ? '#AAB7CC' : '#78859B';
  const enabledItems = items.filter(item => item.settings.reminderEnabled);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to settings">
          <Ionicons name="chevron-back" size={20} color="#2563EB" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headingRow}>
          <View style={styles.headingIcon}>
            <Ionicons name="notifications" size={22} color="#2563EB" />
          </View>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, { color: mainText }]}>Notifications</Text>
            <Text style={[styles.subtitle, { color: mutedText }]}>Your saved study reminder schedules</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={styles.loader} />
        ) : enabledItems.length ? (
          <>
            <Text style={[styles.sectionLabel, { color: mutedText }]}>UPCOMING REMINDERS</Text>
            {enabledItems.map(({ reviewer, settings }) => {
              const days = DAY_ORDER.filter(day => settings.selectedDays.includes(day));
              return (
                <View
                  key={reviewer.reviewer_id}
                  style={[styles.reminderCard, { backgroundColor: card, borderColor: border }]}
                >
                  <View style={styles.reminderIcon}>
                    <Ionicons name="alarm-outline" size={21} color="#2563EB" />
                  </View>
                  <View style={styles.reminderCopy}>
                    <Text style={[styles.reviewerName, { color: mainText }]} numberOfLines={1}>{reviewer.name}</Text>
                    <Text style={[styles.reminderMeta, { color: mutedText }]}>
                      {days.length ? days.join(' · ') : 'No days selected'} · {settings.selectedTime || 'Time not set'}
                    </Text>
                    <Text style={[styles.reminderMeta, { color: mutedText }]}>{reviewer.subject}</Text>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={27} color="#2563EB" />
            </View>
            <Text style={[styles.emptyTitle, { color: mainText }]}>No reminders set</Text>
            <Text style={[styles.emptyText, { color: mutedText }]}>Open a reviewer’s Study Reminders to choose the days and time you want TUON to remind you.</Text>
            <Pressable style={styles.browseButton} onPress={() => router.push('/(tabs)/reviewers')} accessibilityRole="button">
              <Text style={styles.browseButtonText}>Choose a reviewer</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.noteCard, { backgroundColor: dark ? '#111B2B' : '#EAF2FF', borderColor: border }]}>
          <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          <Text style={[styles.noteText, { color: mutedText }]}>This page shows reminder schedules saved in TUON. Delivered notification history is managed by your phone and is not stored in the app.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, width: '100%', maxWidth: 600, alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12, marginBottom: 22 },
  backText: { color: '#2563EB', fontSize: 14, fontWeight: '800' },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 27 },
  headingIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  headingCopy: { flex: 1 },
  title: { fontSize: 25, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
  reminderCard: { minHeight: 82, borderRadius: 17, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reminderIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  reminderCopy: { flex: 1, paddingRight: 8 },
  reviewerName: { fontSize: 14, fontWeight: '800' },
  reminderMeta: { fontSize: 11, marginTop: 4 },
  loader: { marginTop: 50 },
  emptyCard: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 22, paddingVertical: 28, alignItems: 'center' },
  emptyIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  browseButton: { backgroundColor: '#2563EB', borderRadius: 13, paddingVertical: 12, paddingHorizontal: 18, marginTop: 19 },
  browseButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 22 },
  noteText: { flex: 1, fontSize: 11, lineHeight: 16, marginLeft: 8 },
});
