import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { setSyncMeta } from '../../../database/sync_queue';
import { getReviewerById, SQLiteReviewer } from '../../../database/reviewers';
import {
  getRemindersByReviewer,
  saveReminder,
  deleteReminder,
  SQLiteStudyReminder,
} from '../../../database/notifications';
import {
  scheduleNotificationForReminder,
  cancelScheduledNotifications,
} from '../../../utils/notifications';
import { useAppTheme } from '../../../utils/ThemeContext';

const DAYS = [
  { short: 'S', name: 'Sun' },
  { short: 'M', name: 'Mon' },
  { short: 'T', name: 'Tue' },
  { short: 'W', name: 'Wed' },
  { short: 'T', name: 'Thu' },
  { short: 'F', name: 'Fri' },
  { short: 'S', name: 'Sat' },
];

function parseTimeString(timeStr: string) {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    const rawH = parseInt(match[1], 10);
    const validH = rawH >= 1 && rawH <= 12 ? `${rawH}` : '8';
    return {
      hour: validH,
      minute: match[2],
      period: match[3].toUpperCase() as 'AM' | 'PM',
    };
  }
  return { hour: '8', minute: '00', period: 'PM' as const };
}

export default function ReviewScheduleScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;

  const [reviewer, setReviewer] = useState<SQLiteReviewer | null>(null);
  const [existingReminder, setExistingReminder] = useState<SQLiteStudyReminder | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [selectedTime, setSelectedTime] = useState('8:00 PM');
  const [dueCardReminder, setDueCardReminder] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Exact custom time state
  const [customHour, setCustomHour] = useState('8');
  const [customMinute, setCustomMinute] = useState('00');
  const [customPeriod, setCustomPeriod] = useState<'AM' | 'PM'>('PM');

  useEffect(() => {
    let active = true;
    if (reviewerId) {
      getReviewerById(reviewerId).then(rev => {
        if (active && rev) setReviewer(rev);
      });
      getRemindersByReviewer(reviewerId).then(list => {
        if (!active || !list || list.length === 0) return;
        const current = list[0];
        setExistingReminder(current);
        setReminderEnabled(Boolean(current.is_enabled));
        try {
          setSelectedDays(JSON.parse(current.selected_days || '[]'));
        } catch {
          setSelectedDays(['Mon', 'Wed', 'Fri']);
        }
        const parsed = parseTimeString(current.selected_time || '8:00 PM');
        setCustomHour(parsed.hour);
        setCustomMinute(parsed.minute);
        setCustomPeriod(parsed.period);
        setSelectedTime(`${parsed.hour}:${parsed.minute} ${parsed.period}`);
        setDueCardReminder(Boolean(current.mention_flashcards));
        setSaved(true);
      });
    }
    return () => {
      active = false;
    };
  }, [reviewerId]);

  const toggleDay = (day: string) => {
    setSaved(false);
    setSelectedDays(current =>
      current.includes(day)
        ? current.filter(item => item !== day)
        : [...current, day]
    );
  };

  const updateCustomTime = (h: string, m: string, p: 'AM' | 'PM') => {
    setCustomHour(h);
    setCustomMinute(m);
    setCustomPeriod(p);
    const rawH = parseInt(h, 10);
    const validH = isNaN(rawH) || rawH < 1 ? 8 : rawH > 12 ? 12 : rawH;
    const rawM = parseInt(m, 10);
    const validM = isNaN(rawM) || rawM < 0 ? 0 : rawM > 59 ? 59 : rawM;
    const formattedM = validM < 10 ? `0${validM}` : `${validM}`;
    setSelectedTime(`${validH}:${formattedM} ${p}`);
    setSaved(false);
  };

  const adjustHour = (delta: number) => {
    let h = parseInt(customHour, 10);
    if (isNaN(h)) h = 8;
    h += delta;
    if (h > 12) h = 1;
    if (h < 1) h = 12;
    updateCustomTime(`${h}`, customMinute, customPeriod);
  };

  const setQuickMinute = (mStr: string) => {
    updateCustomTime(customHour, mStr, customPeriod);
  };

  const saveSchedule = async () => {
    if (reminderEnabled && selectedDays.length === 0) {
      Alert.alert('Choose study days', 'Select at least one day for your study schedule.');
      return;
    }

    setSaving(true);
    try {
      const revName = reviewer?.name || 'Reviewer';

      // Cancel previous notification IDs if exists
      if (existingReminder?.notification_ids) {
        try {
          const ids = JSON.parse(existingReminder.notification_ids);
          await cancelScheduledNotifications(ids);
        } catch {}
      }

      let notifIds: string[] = [];
      if (reminderEnabled) {
        try {
          notifIds = await scheduleNotificationForReminder({
            reminderId: existingReminder?.reminder_id || 'new',
            reviewerId,
            reviewerName: revName,
            selectedDays,
            selectedTime,
            mentionFlashcards: dueCardReminder,
          });
        } catch (scheduleErr) {
          console.warn('Failed to schedule device notification:', scheduleErr);
        }
      }

      const reminderId = await saveReminder({
        reminder_id: existingReminder?.reminder_id || undefined,
        reviewer_id: reviewerId,
        title: `Study ${revName}`,
        selected_days: selectedDays,
        selected_time: selectedTime,
        is_enabled: reminderEnabled,
        mention_flashcards: dueCardReminder,
        notification_ids: notifIds,
      });

      // Also persist sync_meta for backwards compatibility
      await setSyncMeta(
        `schedule_${reviewerId}`,
        JSON.stringify({
          reminderEnabled,
          selectedDays,
          selectedTime,
          dueCardReminder,
        })
      );

      setExistingReminder(prev => ({
        reminder_id: reminderId,
        reviewer_id: reviewerId ?? null,
        title: `Study ${revName}`,
        selected_days: JSON.stringify(selectedDays),
        selected_time: selectedTime,
        hour: null,
        minute: null,
        is_enabled: reminderEnabled ? 1 : 0,
        mention_flashcards: dueCardReminder ? 1 : 0,
        notification_ids: JSON.stringify(notifIds),
        created_at: prev?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      setSaved(true);

      const daySummary = selectedDays.join(', ');
      Alert.alert(
        'Schedule Saved',
        reminderEnabled
          ? `Study reminders set for ${daySummary || 'daily'} at ${selectedTime}.`
          : 'Study reminders turned off for this reviewer.'
      );
    } catch (error) {
      setSaved(false);
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not save reminder schedule.');
    } finally {
      setSaving(false);
    }
  };

  const removeSchedule = async () => {
    if (!existingReminder) return;
    Alert.alert('Delete Schedule?', 'This will remove the study reminders for this reviewer.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (existingReminder.notification_ids) {
            try {
              const ids = JSON.parse(existingReminder.notification_ids);
              await cancelScheduledNotifications(ids);
            } catch {}
          }
          await deleteReminder(existingReminder.reminder_id);
          await setSyncMeta(`schedule_${reviewerId}`, '');
          setExistingReminder(null);
          setReminderEnabled(false);
          setSaved(false);
          Alert.alert('Deleted', 'Reminders removed for this reviewer.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, dark && { backgroundColor: '#0B1220' }]}>
      {/* HEADER */}
      <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={dark ? '#F2F6FF' : '#15264B'} />
        </Pressable>

        <Text style={[styles.headerTitle, dark && { color: '#F2F6FF' }]}>
          Study Reminders
        </Text>

        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}>
          <Ionicons name="notifications-outline" size={35} color="#D79A00" />
        </View>

        <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>
          {reviewer?.name ?? 'Reviewer'} Reminders
        </Text>

        <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>
          Customize days and time TUON reminds you to study this reviewer.
        </Text>

        {/* ENABLE / DISABLE TOGGLE */}
        <View style={[styles.mainToggleCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <View style={styles.toggleIcon}>
            <Ionicons name="alarm-outline" size={24} color="#2563EB" />
          </View>

          <View style={styles.toggleContent}>
            <Text style={[styles.toggleTitle, dark && { color: '#F2F6FF' }]}>
              Active Reminder
            </Text>
            <Text style={[styles.toggleDescription, dark && { color: '#AAB7CC' }]}>
              Receive study alerts on this device.
            </Text>
          </View>

          <Switch
            value={reminderEnabled}
            onValueChange={value => {
              setReminderEnabled(value);
              setSaved(false);
            }}
            trackColor={{ false: '#D8D8D8', true: '#B8EA91' }}
            thumbColor={reminderEnabled ? '#2563EB' : '#FFFFFF'}
          />
        </View>

        {reminderEnabled && (
          <>
            {/* DAYS TO REMIND */}
            <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>DAYS TO REMIND</Text>
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
                        dark && { color: '#CBD5E1' },
                        selected && styles.selectedDayText,
                      ]}
                    >
                      {day.short}
                    </Text>
                    <Text
                      style={[
                        styles.dayName,
                        dark && { color: '#CBD5E1' },
                        selected && styles.selectedDayText,
                      ]}
                    >
                      {day.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* CUSTOM TIME RANGE */}
            <View style={styles.fieldHeaderRow}>
              <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC', marginTop: 0, marginBottom: 0 }]}>
                CUSTOM TIME RANGE
              </Text>
              <View style={[styles.timePreviewBadge, dark && { backgroundColor: '#1E2C42' }]}>
                <Ionicons name="time" size={13} color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={styles.timePreviewText}>{selectedTime}</Text>
              </View>
            </View>

            <View style={[styles.customTimeCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
              <View style={styles.clockRow}>
                {/* HOUR */}
                <View style={styles.clockUnit}>
                  <Text style={[styles.clockUnitLabel, dark && { color: '#AAB7CC' }]}>HOUR</Text>
                  <View style={styles.stepperContainer}>
                    <Pressable
                      style={[styles.stepperBtn, dark && { backgroundColor: '#1E2C42', borderColor: '#2B3A52' }]}
                      onPress={() => adjustHour(-1)}
                    >
                      <Ionicons name="remove" size={16} color={dark ? '#CBD5E1' : '#475569'} />
                    </Pressable>
                    <TextInput
                      style={[styles.clockInput, dark && { backgroundColor: '#111B2B', borderColor: '#2B3A52', color: '#F2F6FF' }]}
                      value={customHour}
                      onChangeText={val => {
                        const clean = val.replace(/[^0-9]/g, '').slice(0, 2);
                        updateCustomTime(clean, customMinute, customPeriod);
                      }}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Pressable
                      style={[styles.stepperBtn, dark && { backgroundColor: '#1E2C42', borderColor: '#2B3A52' }]}
                      onPress={() => adjustHour(1)}
                    >
                      <Ionicons name="add" size={16} color={dark ? '#CBD5E1' : '#475569'} />
                    </Pressable>
                  </View>
                </View>

                <Text style={[styles.clockColon, dark && { color: '#AAB7CC' }]}>:</Text>

                {/* MINUTE */}
                <View style={styles.clockUnit}>
                  <Text style={[styles.clockUnitLabel, dark && { color: '#AAB7CC' }]}>MINUTE</Text>
                  <View style={styles.stepperContainer}>
                    <TextInput
                      style={[styles.clockInput, dark && { backgroundColor: '#111B2B', borderColor: '#2B3A52', color: '#F2F6FF' }]}
                      value={customMinute}
                      onChangeText={val => {
                        const clean = val.replace(/[^0-9]/g, '').slice(0, 2);
                        updateCustomTime(customHour, clean, customPeriod);
                      }}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>

                {/* AM / PM TOGGLE */}
                <View style={styles.periodCol}>
                  <Pressable
                    style={[styles.periodBtn, customPeriod === 'AM' && styles.periodBtnActive]}
                    onPress={() => updateCustomTime(customHour, customMinute, 'AM')}
                  >
                    <Text style={[styles.periodBtnText, customPeriod === 'AM' && styles.periodBtnTextActive]}>
                      AM
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.periodBtn, customPeriod === 'PM' && styles.periodBtnActive]}
                    onPress={() => updateCustomTime(customHour, customMinute, 'PM')}
                  >
                    <Text style={[styles.periodBtnText, customPeriod === 'PM' && styles.periodBtnTextActive]}>
                      PM
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Quick Minute Selection Pills */}
              <View style={styles.quickMinutesRow}>
                <Text style={[styles.quickMinutesLabel, dark && { color: '#64748B' }]}>Quick min:</Text>
                {['00', '15', '30', '45'].map(m => {
                  const active = customMinute === m;
                  return (
                    <Pressable
                      key={m}
                      style={[
                        styles.quickMinPill,
                        dark && { backgroundColor: '#1E2C42', borderColor: '#2B3A52' },
                        active && styles.quickMinPillActive,
                      ]}
                      onPress={() => setQuickMinute(m)}
                    >
                      <Text
                        style={[
                          styles.quickMinText,
                          dark && { color: '#CBD5E1' },
                          active && styles.quickMinTextActive,
                        ]}
                      >
                        :{m}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* MENTION FLASHCARDS */}
            <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>
              REMINDER CONTENT
            </Text>
            <View style={[styles.smartCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
              <View style={styles.smartIcon}>
                <Ionicons name="repeat-outline" size={23} color="#0087C4" />
              </View>

              <View style={styles.smartContent}>
                <Text style={[styles.smartTitle, dark && { color: '#F2F6FF' }]}>
                  Mention flashcards
                </Text>
                <Text style={[styles.smartDescription, dark && { color: '#AAB7CC' }]}>
                  Include spaced repetition review prompt in notification.
                </Text>
              </View>

              <Switch
                value={dueCardReminder}
                onValueChange={value => {
                  setDueCardReminder(value);
                  setSaved(false);
                }}
                trackColor={{ false: '#D8D8D8', true: '#D8C7F5' }}
                thumbColor={dueCardReminder ? '#0087C4' : '#FFFFFF'}
              />
            </View>
          </>
        )}

        {/* SAVE SCHEDULE BUTTON */}
        <Pressable
          style={[styles.primarySaveBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={saveSchedule}
        >
          <Ionicons name="checkmark-circle" size={19} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.primarySaveBtnText}>
            {saving ? 'SAVING SCHEDULE...' : saved ? 'UPDATE SCHEDULE' : 'SAVE REMINDER SCHEDULE'}
          </Text>
        </Pressable>

        {existingReminder && (
          <Pressable style={styles.deleteScheduleBtn} onPress={removeSchedule}>
            <Ionicons name="trash-outline" size={17} color="#DC2626" />
            <Text style={styles.deleteScheduleBtnText}>Delete This Schedule</Text>
          </Pressable>
        )}

        {saved && (
          <View style={[styles.savedCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <Ionicons name="checkmark-circle" size={23} color="#2563EB" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.savedTitle, dark && { color: '#F2F6FF' }]}>Schedule Active</Text>
              <Text style={[styles.savedText, dark && { color: '#AAB7CC' }]}>
                {`Reminders set for ${selectedDays.join(', ')} at ${selectedTime}.`}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7FF' },
  header: { height: 60, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#DCE5F2' },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#15264B' },
  placeholder: { width: 36 },
  content: { padding: 20, paddingBottom: 40 },
  heroIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: '#FFF5D6', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 10 },
  title: { fontSize: 22, fontWeight: '900', color: '#15264B', textAlign: 'center', marginTop: 14 },
  subtitle: { fontSize: 13, color: '#777', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  mainToggleCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DCE5F2' },
  toggleIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  toggleContent: { flex: 1 },
  toggleTitle: { fontSize: 16, fontWeight: '800', color: '#15264B' },
  toggleDescription: { fontSize: 12, color: '#777', marginTop: 3 },
  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, color: '#666', marginBottom: 12, marginTop: 22 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayButton: { width: 44, height: 58, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE5F2', alignItems: 'center', justifyContent: 'center' },
  selectedDay: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  dayLetter: { fontSize: 15, fontWeight: '800', color: '#15264B' },
  dayName: { fontSize: 10, fontWeight: '600', color: '#777', marginTop: 4 },
  selectedDayText: { color: '#FFFFFF' },

  // CUSTOM TIME RANGE STYLES
  fieldHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  timePreviewBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  timePreviewText: { color: '#2563EB', fontSize: 12, fontWeight: '800' },
  customTimeCard: {
    borderWidth: 1,
    borderColor: '#DCE5F2',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFF',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clockUnit: {
    alignItems: 'center',
  },
  clockUnitLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperBtn: {
    width: 30,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockInput: {
    width: 50,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    color: '#15264B',
    backgroundColor: '#FFF',
  },
  clockColon: {
    fontSize: 24,
    fontWeight: '900',
    color: '#64748B',
    marginTop: 14,
  },
  periodCol: {
    marginTop: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DCE5F2',
    borderRadius: 10,
    overflow: 'hidden',
    marginLeft: 4,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  periodBtnActive: {
    backgroundColor: '#2563EB',
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  periodBtnTextActive: {
    color: '#FFF',
  },
  quickMinutesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  quickMinutesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 4,
  },
  quickMinPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#F8FAFC',
  },
  quickMinPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  quickMinText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  quickMinTextActive: {
    color: '#FFF',
  },
  smartCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DCE5F2' },
  smartIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E5F8FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  smartContent: { flex: 1 },
  smartTitle: { fontSize: 15, fontWeight: '800', color: '#15264B' },
  smartDescription: { fontSize: 12, color: '#777', marginTop: 3 },
  primarySaveBtn: { backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 24 },
  primarySaveBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  deleteScheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 6 },
  deleteScheduleBtnText: { color: '#DC2626', fontWeight: '800', fontSize: 13 },
  savedCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DCE5F2', marginTop: 14 },
  savedTitle: { fontSize: 14, fontWeight: '800', color: '#15264B' },
  savedText: { fontSize: 12, color: '#777', marginTop: 2 },
});
