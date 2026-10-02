import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

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
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState([
    "Mon",
    "Wed",
    "Fri",
  ]);
  const [selectedTime, setSelectedTime] = useState("8:00 PM");
  const [dueCardReminder, setDueCardReminder] = useState(true);
  const [saved, setSaved] = useState(false);

  const toggleDay = (day: string) => {
    setSaved(false);

    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    );
  };

  const saveSchedule = () => {
    setSaved(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#292929"
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Review Schedule
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
            color="#FF9600"
          />
        </View>

        <Text style={styles.title}>
          Keep your learning on track
        </Text>

        <Text style={styles.subtitle}>
          Set a study reminder and let TUON help you remember
          when it&apos;s time to review.
        </Text>

        <View style={styles.mainToggleCard}>
          <View style={styles.toggleIcon}>
            <Ionicons
              name="alarm-outline"
              size={24}
              color="#58CC02"
            />
          </View>

          <View style={styles.toggleContent}>
            <Text style={styles.toggleTitle}>
              Study Reminder
            </Text>

            <Text style={styles.toggleDescription}>
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
              reminderEnabled ? "#58CC02" : "#FFFFFF"
            }
          />
        </View>

        {reminderEnabled && (
          <>
            <Text style={styles.sectionLabel}>
              REVIEW DAYS
            </Text>

            <View style={styles.daysRow}>
              {DAYS.map((day, index) => {
                const selected = selectedDays.includes(day.name);

                return (
                  <Pressable
                    key={`${day.name}-${index}`}
                    style={[
                      styles.dayButton,
                      selected && styles.selectedDay,
                    ]}
                    onPress={() => toggleDay(day.name)}
                  >
                    <Text
                      style={[
                        styles.dayLetter,
                        selected && styles.selectedDayText,
                      ]}
                    >
                      {day.short}
                    </Text>

                    <Text
                      style={[
                        styles.dayName,
                        selected && styles.selectedDayText,
                      ]}
                    >
                      {day.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>
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
                      selected && styles.selectedTime,
                    ]}
                    onPress={() => {
                      setSelectedTime(time);
                      setSaved(false);
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={19}
                      color={selected ? "#58CC02" : "#888888"}
                    />

                    <Text
                      style={[
                        styles.timeText,
                        selected && styles.selectedTimeText,
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

        <Text style={styles.sectionLabel}>
          SMART REVIEW
        </Text>

        <View style={styles.smartCard}>
          <View style={styles.smartIcon}>
            <Ionicons
              name="repeat-outline"
              size={23}
              color="#9069CD"
            />
          </View>

          <View style={styles.smartContent}>
            <Text style={styles.smartTitle}>
              Due Card Reminder
            </Text>

            <Text style={styles.smartDescription}>
              Remind me when flashcards become due for review
              based on the SRS schedule.
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
              dueCardReminder ? "#9069CD" : "#FFFFFF"
            }
          />
        </View>

        <View style={styles.previewCard}>
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

              <Text style={styles.previewNow}>
                now
              </Text>
            </View>
          </View>

          <Text style={styles.notificationTitle}>
            Time to review! 📚
          </Text>

          <Text style={styles.notificationText}>
            A quick study session today can help keep your
            learning progress moving.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#1CB0F6"
          />

          <Text style={styles.infoText}>
            This is currently a frontend preview. Expo local
            notifications and SRS-based scheduling will be
            connected later.
          </Text>
        </View>

        {saved && (
          <View style={styles.savedCard}>
            <Ionicons
              name="checkmark-circle"
              size={23}
              color="#58CC02"
            />

            <View>
              <Text style={styles.savedTitle}>
                Schedule saved
              </Text>

              <Text style={styles.savedText}>
                Your mock reminder preferences were updated.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
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
    backgroundColor: "#F7F9F7",
  },

  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    paddingHorizontal: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "900",
    color: "#292929",
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
    backgroundColor: "#FFF3DF",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  title: {
    textAlign: "center",
    fontSize: 23,
    fontWeight: "900",
    color: "#292929",
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
    borderColor: "#E5E5E5",
    borderRadius: 18,
    padding: 14,
    marginBottom: 27,
  },

  toggleIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EAF9DF",
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
    color: "#292929",
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
    borderColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedDay: {
    borderColor: "#58CC02",
    backgroundColor: "#EAF9DF",
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
    color: "#58CC02",
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
    borderColor: "#E5E5E5",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  selectedTime: {
    borderColor: "#58CC02",
    backgroundColor: "#F4FFED",
  },

  timeText: {
    color: "#777777",
    fontWeight: "800",
    fontSize: 12,
  },

  selectedTimeText: {
    color: "#58CC02",
  },

  smartCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#E5E5E5",
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
    color: "#292929",
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
    borderColor: "#E5E5E5",
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
    backgroundColor: "#58CC02",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  previewHeaderText: {
    flex: 1,
  },

  previewApp: {
    fontWeight: "900",
    color: "#292929",
    fontSize: 12,
  },

  previewNow: {
    color: "#AAAAAA",
    fontSize: 10,
    marginTop: 1,
  },

  notificationTitle: {
    fontWeight: "900",
    color: "#333333",
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
    backgroundColor: "#EAF7FF",
    borderRadius: 17,
    padding: 15,
    marginBottom: 13,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 17,
    color: "#49758C",
  },

  savedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EAF9DF",
    borderRadius: 17,
    padding: 15,
  },

  savedTitle: {
    color: "#3D8F00",
    fontWeight: "900",
    fontSize: 12,
  },

  savedText: {
    color: "#66934A",
    fontSize: 10,
    marginTop: 2,
  },

  bottom: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },

  saveButton: {
    width: "100%",
    maxWidth: 556,
    alignSelf: "center",
    height: 57,
    borderRadius: 17,
    backgroundColor: "#58CC02",
    borderBottomWidth: 4,
    borderBottomColor: "#46A302",
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
