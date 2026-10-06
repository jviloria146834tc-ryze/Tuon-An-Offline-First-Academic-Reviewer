import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { getSyncMeta, setSyncMeta } from '../../../database/sync_queue';
import { loadNotifications } from '../../../utils/notifications';
import { useAppTheme } from '../../../utils/ThemeContext';

const DAYS = [
  { short: "S", name: "Sun" },
  { short: "M", name: "Mon" },
  { short: "T", name: "Tue" },
  { short: "W", name: "Wed" },
  { short: "T", name: "Thu" },
  { short: "F", name: "Fri" },
  { short: "S", name: "Sat" },
];

const TIMES = ["7:00 AM", "12:00 PM", "5:00 PM", "8:00 PM"];

export default function ReviewScheduleScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState([
    "Mon",
    "Wed",
    "Fri",
  ]);
  const [selectedTime, setSelectedTime] = useState("8:00 PM");
  const [dueCardReminder, setDueCardReminder] = useState(true);
  const [saved, setSaved] = useState(false);
  const [notificationsScheduled, setNotificationsScheduled] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let active = true;
    getSyncMeta(`schedule_${reviewerId}`).then(value => {
      if (!active || !value) return;
      try {
        const data = JSON.parse(value) as { reminderEnabled: boolean; selectedDays: string[]; selectedTime: string; dueCardReminder: boolean };
        setReminderEnabled(data.reminderEnabled); setSelectedDays(data.selectedDays); setSelectedTime(data.selectedTime); setDueCardReminder(data.dueCardReminder); setSaved(true);
      } catch { /* Ignore invalid saved preferences. */ }
    });
    void loadNotifications().then(Notifications => {
      if (!active) return;
      setNotificationsSupported(Notifications !== null);
      if (Notifications) {
        void Notifications.getAllScheduledNotificationsAsync().then(items => {
          if (active) setNotificationsScheduled(items.some(item => item.content.data?.reviewerId === reviewerId));
        });
      }
    });
    return () => { active = false; };
  }, [reviewerId]);

  const toggleDay = (day: string) => {
    setSaved(false);

    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    );
  };

  const saveSchedule = async () => {
    if (reminderEnabled && selectedDays.length === 0) {
      Alert.alert('Choose a day', 'Select at least one day or turn off the reminder schedule.');
      return;
    }
    try {
      await setSyncMeta(`schedule_${reviewerId}`, JSON.stringify({ reminderEnabled, selectedDays, selectedTime, dueCardReminder }));
      const Notifications = await loadNotifications();
      if (!Notifications) {
        setNotificationsSupported(false);
        setNotificationsScheduled(false);
        setSaved(true);
        Alert.alert('Development build required', 'Your schedule preferences are saved, but Android Expo Go cannot load expo-notifications. Use a development build to schedule reminders.');
        return;
      }
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of existing) {
        if (item.content.data?.reviewerId === reviewerId) await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
      if (reminderEnabled && selectedDays.length) {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('study-reminders', { name: 'Study reminders', importance: Notifications.AndroidImportance.DEFAULT });
        }
        let permission = await Notifications.getPermissionsAsync();
        if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          setNotificationsScheduled(false);
          Alert.alert('Notifications are off', 'Allow notifications in your device settings to receive these reminders. Your schedule preferences were saved.');
          setSaved(true);
          return;
        }
        const match = selectedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        const hour12 = Number(match?.[1] ?? 8);
        const hour = hour12 % 12 + ((match?.[3]?.toUpperCase() === 'PM') ? 12 : 0);
        const minute = Number(match?.[2] ?? 0);
        const weekdayNumber: Record<string, number> = { Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7 };
        for (const day of selectedDays) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Time to study with TUON',
              body: dueCardReminder ? 'Review your saved cards and keep your learning moving.' : 'A short study session can help you stay on track.',
              data: { reviewerId },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: weekdayNumber[day], hour, minute,
              ...(Platform.OS === 'android' ? { channelId: 'study-reminders' } : {}),
            },
          });
        }
        setNotificationsScheduled(selectedDays.length > 0);
      } else {
        setNotificationsScheduled(false);
      }
      setSaved(true);
    } catch (error) { setSaved(false); Alert.alert('Could not schedule reminders', error instanceof Error ? error.message : 'Please try again.'); }
  };

  const sendTestNotification = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const Notifications = await loadNotifications();
      if (!Notifications) {
        setNotificationsSupported(false);
        Alert.alert('Development build required', 'Android Expo Go cannot load expo-notifications. Use a development build to test local reminders.');
        return;
      }
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('study-reminders', { name: 'Study reminders', importance: Notifications.AndroidImportance.DEFAULT });
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Notifications are off', 'Allow notifications in your device settings to test a reminder.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'TUON reminder test', body: 'Your local reminder is working.', data: { reviewerId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, ...(Platform.OS === 'android' ? { channelId: 'study-reminders' } : {}) },
      });
      Alert.alert('Test scheduled', 'A test notification should appear in about five seconds.');
    } catch (error) { Alert.alert('Could not test reminder', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setTesting(false); }
  };

  return (
    <SafeAreaView style={[styles.safeArea, dark && { backgroundColor: '#0B1220' }]}>
      <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={dark ? '#F2F6FF' : '#15264B'}
          />
        </Pressable>

        <Text style={[styles.headerTitle, dark && { color: '#F2F6FF' }]}>
          Study Reminders
        </Text>

        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIcon}>
          <Ionicons
            name="notifications-outline"
            size={35}
            color="#D79A00"
          />
        </View>

        <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>
          Set a study reminder
        </Text>

        <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>
          Choose which days and time TUON should remind you to study for this reviewer.
        </Text>

        <View style={[styles.mainToggleCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <View style={styles.toggleIcon}>
            <Ionicons
              name="alarm-outline"
              size={24}
              color="#2563EB"
            />
          </View>

          <View style={styles.toggleContent}>
            <Text style={[styles.toggleTitle, dark && { color: '#F2F6FF' }]}>
              Study Reminder
            </Text>

            <Text style={[styles.toggleDescription, dark && { color: '#AAB7CC' }]}>
              Receive a reminder on your selected study days.
            </Text>
          </View>

          <Switch
            value={reminderEnabled}
            onValueChange={(value) => {
              setReminderEnabled(value);
              setSaved(false);
            }}
            trackColor={{
              false: "#D8D8D8",
              true: "#B8EA91",
            }}
            thumbColor={
              reminderEnabled ? "#2563EB" : "#FFFFFF"
            }
          />
        </View>

        {reminderEnabled && (
          <>
            <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>
              DAYS TO REMIND
            </Text>

            <View style={styles.daysRow}>
              {DAYS.map((day, index) => {
                const selected = selectedDays.includes(day.name);

                return (
                  <Pressable
                    key={`${day.name}-${index}`}
                    style={[
                      styles.dayButton,
                      dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
                      selected && styles.selectedDay,
                    ]}
                    onPress={() => toggleDay(day.name)}
                  >
                    <Text
                      style={[
                        styles.dayLetter,
                        dark && { color: '#CBD5E1' }, selected && styles.selectedDayText,
                      ]}
                    >
                      {day.short}
                    </Text>

                    <Text
                      style={[
                        styles.dayName,
                        dark && { color: '#CBD5E1' }, selected && styles.selectedDayText,
                      ]}
                    >
                      {day.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>
              REMINDER TIME
            </Text>

            <View style={styles.timeGrid}>
              {TIMES.map((time) => {
                const selected = selectedTime === time;

                return (
                  <Pressable
                    key={time}
                    style={[
                      styles.timeButton,
                      dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }, selected && styles.selectedTime,
                    ]}
                    onPress={() => {
                      setSelectedTime(time);
                      setSaved(false);
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={19}
                      color={selected ? "#2563EB" : "#888888"}
                    />

                    <Text
                      style={[
                        styles.timeText,
                        dark && { color: '#CBD5E1' }, selected && styles.selectedTimeText,
                      ]}
                    >
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>
          REMINDER CONTENT
        </Text>

        <View style={[styles.smartCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <View style={styles.smartIcon}>
            <Ionicons
              name="repeat-outline"
              size={23}
              color="#0087C4"
            />
          </View>

          <View style={styles.smartContent}>
            <Text style={[styles.smartTitle, dark && { color: '#F2F6FF' }]}>
              Mention flashcards
            </Text>

            <Text style={[styles.smartDescription, dark && { color: '#AAB7CC' }]}>
              Add a flashcard review prompt to the reminder notification.
            </Text>
          </View>

          <Switch
            value={dueCardReminder}
            onValueChange={(value) => {
              setDueCardReminder(value);
              setSaved(false);
            }}
            trackColor={{
              false: "#D8D8D8",
              true: "#D8C7F5",
            }}
            thumbColor={
              dueCardReminder ? "#0087C4" : "#FFFFFF"
            }
          />
        </View>

        <View style={[styles.previewCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <View style={styles.previewHeader}>
            <View style={styles.tuonMiniIcon}>
              <Ionicons
                name="book"
                size={18}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.previewHeaderText}>
              <Text style={styles.previewApp}>
                TUON
              </Text>

              <Text style={[styles.previewNow, dark && { color: '#AAB7CC' }]}>
                now
              </Text>
            </View>
          </View>

          <Text style={[styles.notificationTitle, dark && { color: '#F2F6FF' }]}>
            Time to study!</Text>

          <Text style={[styles.notificationText, dark && { color: '#AAB7CC' }]}>
            Take a few minutes to study this reviewer today.
          </Text>
        </View>

        <Pressable style={[styles.testButton, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]} onPress={sendTestNotification} disabled={testing || !notificationsSupported} accessibilityRole="button">
          <Ionicons name="notifications-outline" size={19} color="#2563EB" />
          <Text style={[styles.testButtonText, dark && { color: '#7CB0FF' }]}>{testing ? 'SCHEDULING TEST...' : 'SEND TEST NOTIFICATION IN 5 SECONDS'}</Text>
        </Pressable>

        <View style={[styles.infoCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#00A8E8"
          />

          <Text style={[styles.infoText, dark && { color: '#AAB7CC' }]}>
            {notificationsSupported
              ? 'Schedule weekly local reminders for your selected days. Allow notifications when prompted. These are device reminders, not remote push notifications.'
              : 'Android Expo Go cannot load expo-notifications. Your schedule can be saved here, but you need a development build to schedule or test device reminders.'}
          </Text>
        </View>

        {saved && (
          <View style={[styles.savedCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <Ionicons
              name="checkmark-circle"
              size={23}
              color="#2563EB"
            />

            <View>
              <Text style={[styles.savedTitle, dark && { color: '#F2F6FF' }]}>
                Schedule saved
              </Text>

              <Text style={[styles.savedText, dark && { color: '#AAB7CC' }]}>
                {notificationsScheduled ? 'Your local reminders are scheduled on this device.' : 'Your preferences are saved, but no reminders are scheduled.'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottom, dark && { backgroundColor: '#0B1220', borderTopColor: '#2B3A52' }]}>
        <Pressable
          style={styles.saveButton}
          onPress={saveSchedule}
        >
          <Ionicons
            name="checkmark"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.saveText}>
            SAVE SCHEDULE
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  testButton: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#2563EB', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 15 },
  testButtonText: { color: '#1748BA', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },

  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#DCE5F2",
    paddingHorizontal: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F4F7FC",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "900",
    color: "#15264B",
  },

  placeholder: {
    width: 42,
  },

  content: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    padding: 22,
    paddingBottom: 45,
  },

  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: "#FFF5D6",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  title: {
    textAlign: "center",
    fontSize: 23,
    fontWeight: "900",
    color: "#15264B",
    marginTop: 14,
  },

  subtitle: {
    textAlign: "center",
    color: "#888888",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 28,
  },

  mainToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#DCE5F2",
    borderRadius: 18,
    padding: 14,
    marginBottom: 27,
  },

  toggleIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  toggleContent: {
    flex: 1,
  },

  toggleTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#15264B",
  },

  toggleDescription: {
    color: "#999999",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
    paddingRight: 8,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#666666",
    marginBottom: 10,
  },

  daysRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 27,
  },

  dayButton: {
    flex: 1,
    minHeight: 61,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#DCE5F2",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedDay: {
    borderColor: "#2563EB",
    backgroundColor: "#EAF2FF",
  },

  dayLetter: {
    fontWeight: "900",
    color: "#777777",
  },

  dayName: {
    fontSize: 8,
    color: "#AAAAAA",
    marginTop: 3,
  },

  selectedDayText: {
    color: "#2563EB",
  },

  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 27,
  },

  timeButton: {
    width: "48%",
    minHeight: 51,
    borderWidth: 2,
    borderColor: "#DCE5F2",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  selectedTime: {
    borderColor: "#2563EB",
    backgroundColor: "#F2F7FF",
  },

  timeText: {
    color: "#777777",
    fontWeight: "800",
    fontSize: 12,
  },

  selectedTimeText: {
    color: "#2563EB",
  },

  smartCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#DCE5F2",
    padding: 14,
    marginBottom: 18,
  },

  smartIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F3EDFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  smartContent: {
    flex: 1,
  },

  smartTitle: {
    fontWeight: "900",
    color: "#15264B",
    fontSize: 14,
  },

  smartDescription: {
    color: "#999999",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
    paddingRight: 8,
  },

  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: "#DCE5F2",
    marginBottom: 13,
  },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  tuonMiniIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  previewHeaderText: {
    flex: 1,
  },

  previewApp: {
    fontWeight: "900",
    color: "#15264B",
    fontSize: 12,
  },

  previewNow: {
    color: "#AAAAAA",
    fontSize: 10,
    marginTop: 1,
  },

  notificationTitle: {
    fontWeight: "900",
    color: "#20345C",
    fontSize: 14,
  },

  notificationText: {
    color: "#777777",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E5F8FF",
    borderRadius: 17,
    padding: 15,
    marginBottom: 13,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 17,
    color: "#365F82",
  },

  savedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EAF2FF",
    borderRadius: 17,
    padding: 15,
  },

  savedTitle: {
    color: "#1748BA",
    fontWeight: "900",
    fontSize: 12,
  },

  savedText: {
    color: "#496996",
    fontSize: 10,
    marginTop: 2,
  },

  bottom: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#DCE5F2",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },

  saveButton: {
    width: "100%",
    maxWidth: 556,
    alignSelf: "center",
    height: 57,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    borderBottomWidth: 4,
    borderBottomColor: "#1748BA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
});
