import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReviewers, getSrsReviewAlerts, SQLiteReviewer, SrsReviewAlert } from '../database/reviewers';
import {
  getAllReminders,
  getNotificationHistory,
  saveReminder,
  deleteReminder,
  toggleReminder,
  clearNotificationHistory,
  SQLiteStudyReminder,
  SQLiteNotificationHistory,
} from '../database/notifications';
import {
  scheduleNotificationForReminder,
  cancelScheduledNotifications,
  requestNotificationPermissionsAsync,
} from '../utils/notifications';
import { useAppTheme } from '../utils/ThemeContext';

const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

export default function NotificationsScreen() {
  const { dark } = useAppTheme();
  const [reminders, setReminders] = useState<SQLiteStudyReminder[]>([]);
  const [history, setHistory] = useState<SQLiteNotificationHistory[]>([]);
  const [reviewers, setReviewers] = useState<SQLiteReviewer[]>([]);
  const [srsAlerts, setSrsAlerts] = useState<SrsReviewAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Customize / Add Reminder Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reviewerDropdownOpen, setReviewerDropdownOpen] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string | null>(null);
  const [reminderTitle, setReminderTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [selectedTime, setSelectedTime] = useState('8:00 PM');
  const [customHour, setCustomHour] = useState('8');
  const [customMinute, setCustomMinute] = useState('00');
  const [customPeriod, setCustomPeriod] = useState<'AM' | 'PM'>('PM');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [mentionFlashcards, setMentionFlashcards] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [rems, hist, revs, srs] = await Promise.all([
        getAllReminders(),
        getNotificationHistory(),
        getReviewers(),
        getSrsReviewAlerts(),
      ]);
      setReminders(rems);
      setHistory(hist);
      setReviewers(revs);
      setSrsAlerts(srs);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void loadData().then(() => {
        if (!active) return;
      });
      return () => {
        active = false;
      };
    }, [loadData])
  );

  const openAddModal = () => {
    setEditingReminderId(null);
    const firstReviewer = reviewers[0]?.reviewer_id || null;
    setSelectedReviewerId(firstReviewer);
    setReminderTitle(reviewers[0]?.name ? `Study ${reviewers[0].name}` : 'General Study Reminder');
    setSelectedDays(['Mon', 'Wed', 'Fri']);
    setCustomHour('8');
    setCustomMinute('00');
    setCustomPeriod('PM');
    setSelectedTime('8:00 PM');
    setReviewerDropdownOpen(false);
    setReminderEnabled(true);
    setMentionFlashcards(true);
    setModalVisible(true);
  };

  const openEditModal = (item: SQLiteStudyReminder) => {
    setEditingReminderId(item.reminder_id);
    setSelectedReviewerId(item.reviewer_id || null);
    setReminderTitle(item.title);
    try {
      setSelectedDays(JSON.parse(item.selected_days || '[]'));
    } catch {
      setSelectedDays(['Mon', 'Wed', 'Fri']);
    }
    const parsed = parseTimeString(item.selected_time || '8:00 PM');
    setCustomHour(parsed.hour);
    setCustomMinute(parsed.minute);
    setCustomPeriod(parsed.period);
    setSelectedTime(`${parsed.hour}:${parsed.minute} ${parsed.period}`);
    setReviewerDropdownOpen(false);
    setReminderEnabled(Boolean(item.is_enabled));
    setMentionFlashcards(Boolean(item.mention_flashcards));
    setModalVisible(true);
  };

  const handleToggle = async (item: SQLiteStudyReminder) => {
    const nextState = !item.is_enabled;
    try {
      await toggleReminder(item.reminder_id, nextState);
      if (!nextState && item.notification_ids) {
        try {
          const ids = JSON.parse(item.notification_ids);
          await cancelScheduledNotifications(ids);
        } catch {}
      } else if (nextState) {
        let days: string[] = [];
        try {
          days = JSON.parse(item.selected_days || '[]');
        } catch {}
        const notifIds = await scheduleNotificationForReminder({
          reminderId: item.reminder_id,
          reviewerId: item.reviewer_id,
          reviewerName: item.reviewer_name || item.title,
          selectedDays: days,
          selectedTime: item.selected_time,
          hour: item.hour,
          minute: item.minute,
          mentionFlashcards: Boolean(item.mention_flashcards),
        });
        await saveReminder({
          reminder_id: item.reminder_id,
          reviewer_id: item.reviewer_id,
          title: item.title,
          selected_days: days,
          selected_time: item.selected_time,
          is_enabled: true,
          mention_flashcards: Boolean(item.mention_flashcards),
          notification_ids: notifIds,
        });
      }
      await loadData();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not update reminder.');
    }
  };

  const toggleDay = (day: string) => {
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

  const handleSaveReminder = async () => {
    if (reminderEnabled && selectedDays.length === 0) {
      Alert.alert('Select Days', 'Please select at least one study day for your reminder.');
      return;
    }

    setSaving(true);
    try {
      const selectedRev = Array.isArray(reviewers)
        ? reviewers.find(r => r.reviewer_id === selectedReviewerId)
        : null;
      const revName = selectedRev?.name || (typeof reminderTitle === 'string' && reminderTitle.trim() ? reminderTitle.trim() : 'Study');

      // Cancel previous scheduled notifications if editing
      if (editingReminderId) {
        const existing = Array.isArray(reminders)
          ? reminders.find(r => r.reminder_id === editingReminderId)
          : null;
        if (existing?.notification_ids) {
          try {
            const ids = JSON.parse(existing.notification_ids);
            await cancelScheduledNotifications(ids);
          } catch {}
        }
      }

      let notifIds: string[] = [];
      if (reminderEnabled) {
        const hasPermission = await requestNotificationPermissionsAsync();
        if (!hasPermission) {
          Alert.alert(
            'Notification Permission Required',
            'Notifications are blocked on your device. Please enable notifications for Tuon (or Expo Go) in your phone Settings > Apps so your reminder can sound at the scheduled time.'
          );
        }
        try {
          notifIds = await scheduleNotificationForReminder({
            reminderId: editingReminderId || 'new',
            reviewerId: selectedReviewerId,
            reviewerName: revName,
            selectedDays,
            selectedTime,
            mentionFlashcards,
          });
        } catch (scheduleErr) {
          console.warn('Failed to schedule device notification:', scheduleErr);
        }
      }

      await saveReminder({
        reminder_id: editingReminderId || undefined,
        reviewer_id: selectedReviewerId,
        title: (typeof reminderTitle === 'string' && reminderTitle.trim()) ? reminderTitle.trim() : `Study ${revName}`,
        selected_days: selectedDays,
        selected_time: selectedTime,
        is_enabled: reminderEnabled,
        mention_flashcards: mentionFlashcards,
        notification_ids: notifIds,
      });

      setModalVisible(false);
      await loadData();

      Alert.alert(
        'Reminder Saved',
        reminderEnabled
          ? `Reminder scheduled for ${selectedTime} on ${selectedDays.join(', ')}.`
          : 'Reminder saved (disabled).'
      );
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not save reminder.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReminder = (reminderId: string) => {
    Alert.alert('Delete Reminder?', 'Are you sure you want to delete this study reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const existing = reminders.find(r => r.reminder_id === reminderId);
            if (existing?.notification_ids) {
              try {
                const ids = JSON.parse(existing.notification_ids);
                await cancelScheduledNotifications(ids);
              } catch {}
            }
            await deleteReminder(reminderId);
            setModalVisible(false);
            await loadData();
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Could not delete reminder.');
          }
        },
      },
    ]);
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History?', 'This will clear finished notifications from this list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await clearNotificationHistory();
          await loadData();
        },
      },
    ]);
  };

  const bg = dark ? '#0B1220' : '#F4F7FF';
  const card = dark ? '#172235' : '#FFFFFF';
  const border = dark ? '#2B3A52' : '#DCE5F2';
  const mainText = dark ? '#F2F6FF' : '#15264B';
  const mutedText = dark ? '#AAB7CC' : '#78859B';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
            <Ionicons name="chevron-back" size={20} color="#2563EB" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Pressable style={styles.addReminderTopBtn} onPress={openAddModal} accessibilityRole="button">
            <Ionicons name="add" size={18} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.addReminderTopText}>Add Reminder</Text>
          </Pressable>
        </View>

        {/* HEADING ROW */}
        <View style={styles.headingRow}>
          <View style={styles.headingIcon}>
            <Ionicons name="notifications" size={22} color="#2563EB" />
          </View>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, { color: mainText }]}>Notifications</Text>
            <Text style={[styles.subtitle, { color: mutedText }]}>
              Manage study reminders and notification history
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={styles.loader} />
        ) : (
          <>
            {/* UPCOMING REMINDERS HEADER & LIST */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: mutedText }]}>
                UPCOMING REMINDERS ({reminders.length})
              </Text>
              <Pressable onPress={openAddModal} hitSlop={10}>
                <Text style={styles.sectionActionText}>+ New Reminder</Text>
              </Pressable>
            </View>

            {reminders.length > 0 ? (
              reminders.map(item => {
                let days: string[] = [];
                try {
                  days = JSON.parse(item.selected_days || '[]');
                } catch {}
                const daysFormatted = DAY_ORDER.filter(d => days.includes(d)).join(' · ');

                return (
                  <Pressable
                    key={item.reminder_id}
                    style={[
                      styles.reminderCard,
                      { backgroundColor: card, borderColor: border },
                      !item.is_enabled && { opacity: 0.65 },
                    ]}
                    onPress={() => openEditModal(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Customize reminder ${item.title}`}
                  >
                    <View style={styles.reminderIcon}>
                      <Ionicons
                        name={item.is_enabled ? 'alarm' : 'alarm-outline'}
                        size={22}
                        color={item.is_enabled ? '#2563EB' : '#94A3B8'}
                      />
                    </View>

                    <View style={styles.reminderCopy}>
                      <Text style={[styles.reviewerName, { color: mainText }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.reminderMeta, { color: mutedText }]}>
                        {daysFormatted ? `${daysFormatted} · ` : ''}
                        <Text style={{ fontWeight: '800', color: '#2563EB' }}>{item.selected_time}</Text>
                      </Text>
                      <Text style={[styles.reminderSubText, { color: mutedText }]}>
                        {item.subject || 'All Reviewers'} • Tap to customize
                      </Text>
                    </View>

                    <View style={styles.switchWrap} onStartShouldSetResponder={() => true}>
                      <Switch
                        value={Boolean(item.is_enabled)}
                        onValueChange={() => handleToggle(item)}
                        trackColor={{ false: '#D8D8D8', true: '#B8EA91' }}
                        thumbColor={item.is_enabled ? '#2563EB' : '#FFFFFF'}
                      />
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: card, borderColor: border }]}>
                <Ionicons name="alarm-outline" size={32} color="#94A3B8" />
                <Text style={[styles.emptyTitle, { color: mainText }]}>No reminders set yet</Text>
                <Text style={[styles.emptyText, { color: mutedText }]}>
                  Set up a study reminder to receive alerts at your scheduled study times.
                </Text>
                <Pressable style={styles.browseButton} onPress={openAddModal}>
                  <Ionicons name="add-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.browseButtonText}>Create First Reminder</Text>
                </Pressable>
              </View>
            )}

            {/* SPACED REPETITION (SRS) ALERTS */}
            <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={14} color="#2563EB" />
                <Text style={[styles.sectionLabel, { color: mutedText, marginTop: 0, marginBottom: 0 }]}>
                  SPACED REPETITION (SRS) DUE
                </Text>
              </View>
              {srsAlerts.some(a => a.due_cards > 0) && (
                <View style={styles.dueBadge}>
                  <Text style={styles.dueBadgeText}>
                    {srsAlerts.filter(a => a.due_cards > 0).reduce((acc, curr) => acc + curr.due_cards, 0)} DUE
                  </Text>
                </View>
              )}
            </View>

            {srsAlerts.length > 0 ? (
              srsAlerts.map(alert => {
                const isDue = alert.due_cards > 0;
                return (
                  <View
                    key={alert.reviewer_id}
                    style={[
                      styles.srsCard,
                      { backgroundColor: card, borderColor: isDue ? (dark ? '#3B82F6' : '#93C5FD') : border },
                    ]}
                  >
                    <View
                      style={[
                        styles.srsIconBox,
                        { backgroundColor: isDue ? (dark ? '#1E2C42' : '#EFF6FF') : (dark ? '#1A2231' : '#F8FAFC') },
                      ]}
                    >
                      <Ionicons
                        name={isDue ? 'albums' : 'checkmark-circle-outline'}
                        size={22}
                        color={isDue ? '#2563EB' : '#10B981'}
                      />
                    </View>

                    <View style={styles.srsCopy}>
                      <View style={styles.srsTopRow}>
                        <Text style={[styles.srsTitle, { color: mainText }]} numberOfLines={1}>
                          {alert.name}
                        </Text>
                        <View
                          style={[
                            styles.srsStatusPill,
                            isDue
                              ? { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }
                              : { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.srsStatusPillText,
                              { color: isDue ? '#DC2626' : '#16A34A' },
                            ]}
                          >
                            {isDue ? `${alert.due_cards} DUE` : 'UP TO DATE'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.srsMeta, { color: mutedText }]}>
                        {isDue
                          ? `${alert.due_cards} of ${alert.total_cards} cards ready for review • ${alert.subject}`
                          : alert.next_due_date
                          ? `Next review on ${alert.next_due_date} • ${alert.total_cards} cards`
                          : `All ${alert.total_cards} cards reviewed • ${alert.subject}`}
                      </Text>
                    </View>

                    <Pressable
                      style={[
                        styles.srsReviewBtn,
                        isDue ? { backgroundColor: '#2563EB' } : { backgroundColor: dark ? '#1E2C42' : '#E2E8F0' },
                      ]}
                      onPress={() => router.push(`/reviewer/${alert.reviewer_id}/flashcards`)}
                    >
                      <Text
                        style={[
                          styles.srsReviewBtnText,
                          isDue ? { color: '#FFFFFF' } : { color: dark ? '#93C5FD' : '#475569' },
                        ]}
                      >
                        {isDue ? 'Review' : 'Practice'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: card, borderColor: border }]}>
                <Ionicons name="albums-outline" size={28} color="#94A3B8" />
                <Text style={[styles.emptyTitle, { color: mainText, fontSize: 15 }]}>
                  No flashcards to review yet
                </Text>
                <Text style={[styles.emptyText, { color: mutedText, fontSize: 12 }]}>
                  Add flashcards to your reviewers to see automated spaced repetition reminders here!
                </Text>
              </View>
            )}

            {/* PREVIOUS / FINISHED NOTIFICATIONS */}
            <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
              <Text style={[styles.sectionLabel, { color: mutedText }]}>
                PREVIOUS & FINISHED NOTIFICATIONS ({history.length})
              </Text>
              {history.length > 0 && (
                <Pressable onPress={handleClearHistory} hitSlop={10}>
                  <Text style={[styles.sectionActionText, { color: '#94A3B8' }]}>Clear</Text>
                </Pressable>
              )}
            </View>

            {history.length > 0 ? (
              history.map(hist => (
                <View
                  key={hist.history_id}
                  style={[
                    styles.historyCard,
                    dark
                      ? { backgroundColor: '#111B2B', borderColor: '#1E293B' }
                      : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
                  ]}
                >
                  <View style={styles.historyIcon}>
                    <Ionicons name="checkmark-circle" size={20} color="#94A3B8" />
                  </View>

                  <View style={styles.historyCopy}>
                    <View style={styles.historyTopRow}>
                      <Text style={[styles.historyTitle, { color: dark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                        {hist.title}
                      </Text>
                      <View style={styles.historyPill}>
                        <Text style={styles.historyPillText}>FINISHED</Text>
                      </View>
                    </View>

                    <Text style={[styles.historyBody, { color: dark ? '#64748B' : '#94A3B8' }]}>
                      {hist.body}
                    </Text>

                    <Text style={[styles.historyTime, { color: dark ? '#475569' : '#A0AEC0' }]}>
                      {hist.scheduled_time || 'Delivered'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyHistoryBox, { borderColor: border }]}>
                <Ionicons name="file-tray-outline" size={24} color="#94A3B8" />
                <Text style={[styles.emptyHistoryText, { color: mutedText }]}>
                  No past notifications yet. Finished notifications will appear here grayed out.
                </Text>
              </View>
            )}
          </>
        )}

        <View style={[styles.noteCard, { backgroundColor: dark ? '#111B2B' : '#EAF2FF', borderColor: border }]}>
          <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          <Text style={[styles.noteText, { color: mutedText }]}>
            Reminders are scheduled directly on your device. Notifications will ring automatically at your selected custom time.
          </Text>
        </View>
      </ScrollView>

      {/* CUSTOMIZE / ADD REMINDER MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, dark && { backgroundColor: '#111B2B', borderColor: '#2B3A52' }]}>
            <View style={[styles.modalHeader, dark && { borderBottomColor: '#2B3A52' }]}>
              <View style={styles.modalHeaderCopy}>
                <Text style={[styles.modalTitle, dark && { color: '#F2F6FF' }]}>
                  {editingReminderId ? 'Customize Reminder' : 'Add Study Reminder'}
                </Text>
                <Text style={[styles.modalSubtitle, dark && { color: '#AAB7CC' }]}>
                  Configure study days, timing, and alerts
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={dark ? '#AAB7CC' : '#64748B'} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* SELECT REVIEWER DROPDOWN */}
              <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>SELECT REVIEWER</Text>
              <Pressable
                style={[
                  styles.dropdownTrigger,
                  dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
                  reviewerDropdownOpen && (dark ? { borderColor: '#2563EB', backgroundColor: '#172235' } : styles.dropdownTriggerActive),
                ]}
                onPress={() => setReviewerDropdownOpen(!reviewerDropdownOpen)}
              >
                <View style={styles.dropdownTriggerLeft}>
                  <View style={[styles.dropdownBadge, dark && { backgroundColor: '#1E2C42' }]}>
                    <Ionicons
                      name={selectedReviewerId ? 'book-outline' : 'library-outline'}
                      size={18}
                      color="#2563EB"
                    />
                  </View>
                  <View style={styles.dropdownTriggerTextWrap}>
                    <Text style={[styles.dropdownSelectedTitle, dark && { color: '#F2F6FF' }]} numberOfLines={1}>
                      {reviewers.find(r => r.reviewer_id === selectedReviewerId)?.name || 'General Study (All Reviewers)'}
                    </Text>
                    <Text style={[styles.dropdownSelectedSubtitle, dark && { color: '#AAB7CC' }]} numberOfLines={1}>
                      {reviewers.find(r => r.reviewer_id === selectedReviewerId)?.subject || 'Applies across all study materials'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={reviewerDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={dark ? '#AAB7CC' : '#64748B'}
                />
              </Pressable>

              {reviewerDropdownOpen && (
                <View style={[styles.dropdownMenu, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
                  <Pressable
                    style={[
                      styles.dropdownOption,
                      dark && { borderBottomColor: '#2B3A52' },
                      selectedReviewerId === null && (dark ? styles.dropdownOptionSelectedDark : styles.dropdownOptionSelected),
                    ]}
                    onPress={() => {
                      setSelectedReviewerId(null);
                      if (!editingReminderId) setReminderTitle('General Study Reminder');
                      setReviewerDropdownOpen(false);
                    }}
                  >
                    <View style={[styles.optionIconBox, { backgroundColor: dark ? '#1E2C42' : '#EAF2FF' }]}>
                      <Ionicons name="library-outline" size={16} color="#2563EB" />
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text
                        style={[
                          styles.optionTitle,
                          dark && { color: '#F2F6FF' },
                          selectedReviewerId === null && { color: dark ? '#7CB0FF' : '#2563EB', fontWeight: '800' },
                        ]}
                      >
                        General Study (All Reviewers)
                      </Text>
                      <Text style={[styles.optionSubtitle, dark && { color: '#AAB7CC' }]}>
                        Overall study session notification
                      </Text>
                    </View>
                    {selectedReviewerId === null && (
                      <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                    )}
                  </Pressable>

                  {reviewers.map(r => {
                    const isSelected = selectedReviewerId === r.reviewer_id;
                    return (
                      <Pressable
                        key={r.reviewer_id}
                        style={[
                          styles.dropdownOption,
                          dark && { borderBottomColor: '#2B3A52' },
                          isSelected && (dark ? styles.dropdownOptionSelectedDark : styles.dropdownOptionSelected),
                        ]}
                        onPress={() => {
                          setSelectedReviewerId(r.reviewer_id);
                          if (!editingReminderId) setReminderTitle(`Study ${r.name}`);
                          setReviewerDropdownOpen(false);
                        }}
                      >
                        <View style={[styles.optionIconBox, { backgroundColor: dark ? '#1E2C42' : '#F1F5F9' }]}>
                          <Ionicons
                            name="book-outline"
                            size={16}
                            color={isSelected ? '#2563EB' : dark ? '#93C5FD' : '#475569'}
                          />
                        </View>
                        <View style={styles.optionTextWrap}>
                          <Text
                            style={[
                              styles.optionTitle,
                              dark && { color: '#F2F6FF' },
                              isSelected && { color: dark ? '#7CB0FF' : '#2563EB', fontWeight: '800' },
                            ]}
                            numberOfLines={1}
                          >
                            {r.name}
                          </Text>
                          {Boolean(r.subject) && (
                            <Text style={[styles.optionSubtitle, dark && { color: '#AAB7CC' }]} numberOfLines={1}>
                              {r.subject}
                            </Text>
                          )}
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* REMINDER TITLE */}
              <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>REMINDER LABEL</Text>
              <TextInput
                style={[styles.input, dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#F2F6FF' }]}
                value={reminderTitle}
                onChangeText={setReminderTitle}
                placeholder="e.g. Study IT 26: HCI"
                placeholderTextColor="#888"
              />

              {/* DAYS TO REMIND */}
              <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>DAYS TO REMIND</Text>
              <View style={styles.daysRow}>
                {DAYS.map((day, idx) => {
                  const selected = selectedDays.includes(day.name);
                  return (
                    <Pressable
                      key={`${day.name}-${idx}`}
                      style={[
                        styles.dayBtn,
                        dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
                        selected && styles.dayBtnSelected,
                      ]}
                      onPress={() => toggleDay(day.name)}
                    >
                      <Text
                        style={[
                          styles.dayLetter,
                          dark && { color: '#CBD5E1' },
                          selected && styles.dayTextSelected,
                        ]}
                      >
                        {day.short}
                      </Text>
                      <Text
                        style={[
                          styles.dayName,
                          dark && { color: '#94A3B8' },
                          selected && styles.dayTextSelected,
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
                <Text style={[styles.fieldLabel, dark && { color: '#AAB7CC' }]}>CUSTOM TIME RANGE</Text>
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
                  <View style={[styles.periodCol, dark && { borderColor: '#2B3A52', backgroundColor: '#111B2B' }]}>
                    <Pressable
                      style={[
                        styles.periodBtn,
                        dark && { backgroundColor: '#172235' },
                        customPeriod === 'AM' && styles.periodBtnActive,
                      ]}
                      onPress={() => updateCustomTime(customHour, customMinute, 'AM')}
                    >
                      <Text
                        style={[
                          styles.periodBtnText,
                          dark && { color: '#AAB7CC' },
                          customPeriod === 'AM' && styles.periodBtnTextActive,
                        ]}
                      >
                        AM
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.periodBtn,
                        dark && { backgroundColor: '#172235' },
                        customPeriod === 'PM' && styles.periodBtnActive,
                      ]}
                      onPress={() => updateCustomTime(customHour, customMinute, 'PM')}
                    >
                      <Text
                        style={[
                          styles.periodBtnText,
                          dark && { color: '#AAB7CC' },
                          customPeriod === 'PM' && styles.periodBtnTextActive,
                        ]}
                      >
                        PM
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Quick Minute Selection Pills */}
                <View style={[styles.quickMinutesRow, dark && { borderTopColor: '#2B3A52' }]}>
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

              {/* FLASHCARD PROMPT TOGGLE */}
              <View style={[styles.toggleRow, dark && { borderTopColor: '#2B3A52' }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.toggleTitle, dark && { color: '#F2F6FF' }]}>Mention Due Flashcards</Text>
                  <Text style={[styles.toggleSubtitle, dark && { color: '#AAB7CC' }]}>
                    Include spaced repetition review prompt in reminder notification
                  </Text>
                </View>
                <Switch
                  value={mentionFlashcards}
                  onValueChange={setMentionFlashcards}
                  trackColor={{ false: '#D8D8D8', true: '#B8EA91' }}
                  thumbColor={mentionFlashcards ? '#2563EB' : '#FFFFFF'}
                />
              </View>

              {/* ENABLED TOGGLE */}
              <View style={[styles.toggleRow, dark && { borderTopColor: '#2B3A52' }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.toggleTitle, dark && { color: '#F2F6FF' }]}>Enable Reminder</Text>
                  <Text style={[styles.toggleSubtitle, dark && { color: '#AAB7CC' }]}>
                    Actively schedule notification on device
                  </Text>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: '#D8D8D8', true: '#B8EA91' }}
                  thumbColor={reminderEnabled ? '#2563EB' : '#FFFFFF'}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, dark && { borderTopColor: '#2B3A52' }]}>
              {editingReminderId ? (
                <View style={styles.modalFooterButtonsRow}>
                  <Pressable
                    style={[styles.deleteOutlineBtn, dark && { borderColor: '#7F1D1D', backgroundColor: '#2A1215' }]}
                    onPress={() => handleDeleteReminder(editingReminderId)}
                  >
                    <Ionicons name="trash-outline" size={17} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteOutlineBtnText}>Delete</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.saveBtn, { flex: 1 }, saving && { opacity: 0.6 }]}
                    disabled={saving}
                    onPress={handleSaveReminder}
                  >
                    <Text style={styles.saveBtnText}>{saving ? 'SAVING...' : 'SAVE CHANGES'}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  disabled={saving}
                  onPress={handleSaveReminder}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'SAVING...' : 'SAVE REMINDER'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, width: '100%', maxWidth: 600, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  back: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: 12 },
  backText: { color: '#2563EB', fontSize: 14, fontWeight: '800' },
  addReminderTopBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addReminderTopText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  headingIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  headingCopy: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 3 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  sectionActionText: { fontSize: 12, fontWeight: '800', color: '#2563EB' },
  reminderCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  reminderCopy: { flex: 1, paddingRight: 8 },
  reviewerName: { fontSize: 15, fontWeight: '800' },
  reminderMeta: { fontSize: 12, marginTop: 3 },
  reminderSubText: { fontSize: 11, marginTop: 3 },
  switchWrap: { paddingLeft: 4 },
  historyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    opacity: 0.8,
  },
  historyIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 11, marginTop: 2 },
  historyCopy: { flex: 1 },
  historyTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyTitle: { fontSize: 13, fontWeight: '700', flex: 1, paddingRight: 6 },
  historyPill: { backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  historyPillText: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  historyBody: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  historyTime: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  emptyCard: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 22, paddingVertical: 28, alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '900', marginTop: 10 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  browseButton: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, marginTop: 16, flexDirection: 'row', alignItems: 'center' },
  browseButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  emptyHistoryBox: { borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', padding: 20, alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 },
  emptyHistoryText: { fontSize: 12, textAlign: 'center' },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 18 },
  noteText: { flex: 1, fontSize: 11, lineHeight: 16, marginLeft: 8 },
  loader: { marginTop: 50 },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '90%', borderWidth: 1, borderColor: '#DCE5F2' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalHeaderCopy: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#15264B' },
  modalSubtitle: { fontSize: 12, color: '#78859B', marginTop: 2 },
  modalCloseBtn: { padding: 4 },
  modalBody: { paddingHorizontal: 20, paddingTop: 14 },
  fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: '#64748B', marginBottom: 8, marginTop: 14 },
  fieldHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  timePreviewBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  timePreviewText: { color: '#2563EB', fontSize: 12, fontWeight: '800' },

  // DROPDOWN STYLES
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DCE5F2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  dropdownTriggerActive: {
    borderColor: '#2563EB',
    backgroundColor: '#FFF',
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dropdownBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dropdownTriggerTextWrap: {
    flex: 1,
  },
  dropdownSelectedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15264B',
  },
  dropdownSelectedSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#DCE5F2',
    borderRadius: 14,
    backgroundColor: '#FFF',
    marginTop: 6,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownOptionSelectedDark: {
    backgroundColor: '#1E2C42',
  },
  optionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionTextWrap: {
    flex: 1,
    paddingRight: 6,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15264B',
  },
  optionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  input: { borderWidth: 1, borderColor: '#DCE5F2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#15264B' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  dayBtn: { width: 42, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#DCE5F2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  dayBtnSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  dayLetter: { fontSize: 13, fontWeight: '800', color: '#15264B' },
  dayName: { fontSize: 9, fontWeight: '600', color: '#64748B', marginTop: 2 },
  dayTextSelected: { color: '#FFF' },

  // CUSTOM TIME RANGE CARD
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
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center' },
  headerDeleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 12 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: '#15264B' },
  toggleSubtitle: { fontSize: 11, color: '#78859B', marginTop: 2 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  deleteBtnText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  modalFooterButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deleteOutlineBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  dueBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dueBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  srsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  srsIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  srsCopy: {
    flex: 1,
    marginRight: 10,
  },
  srsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  srsTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  srsStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  srsStatusPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  srsMeta: {
    fontSize: 11,
    lineHeight: 15,
  },
  srsReviewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  srsReviewBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  saveBtn: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
});
