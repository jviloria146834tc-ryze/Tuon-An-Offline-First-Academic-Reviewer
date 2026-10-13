import { Platform } from 'react-native';
import { addNotificationHistory } from '../database/notifications';

let NotificationsModule: typeof import('expo-notifications') | null = null;
let isExpoGoClient = false;

try {
  // Dynamically check if running in Expo Go without triggering static bundle side-effects
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { isRunningInExpoGo } = require('expo');
  isExpoGoClient = typeof isRunningInExpoGo === 'function' ? isRunningInExpoGo() : false;
} catch {}

// Only load expo-notifications when supported or in a build to avoid crashing Expo Go on Android
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NotificationsModule = require('expo-notifications');
  if (NotificationsModule?.setNotificationHandler) {
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  console.warn('Could not initialize native notifications module (expected in Expo Go Android SDK 53+):', e);
}

export function isExpoGo(): boolean {
  return isExpoGoClient;
}

export async function loadNotifications(): Promise<typeof import('expo-notifications') | null> {
  return NotificationsModule;
}

// Listen for received notifications to log to previous/finished history automatically
try {
  if (NotificationsModule?.addNotificationReceivedListener) {
    NotificationsModule.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data || {};
      const title = notification.request.content.title || 'Study Reminder';
      const body = notification.request.content.body || 'Time to review your notes.';
      const reviewerId = (data.reviewerId as string) || null;

      void addNotificationHistory({
        reviewer_id: reviewerId,
        title,
        body,
        scheduled_time: 'Just now',
        finished_at: new Date().toISOString(),
        status: 'delivered',
      });
    });
  }
} catch {}

export async function ensureNotificationChannelAsync(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      if (typeof NotificationsModule?.setNotificationChannelAsync === 'function') {
        await NotificationsModule.setNotificationChannelAsync('study-reminders', {
          name: 'Study Reminders',
          importance: NotificationsModule.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563EB',
          sound: 'default',
        });
      }
    } catch {}
  }
}

export async function requestNotificationPermissionsAsync(): Promise<boolean> {
  try {
    if (typeof NotificationsModule?.getPermissionsAsync !== 'function') return false;
    const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      if (typeof NotificationsModule?.requestPermissionsAsync === 'function') {
        const { status } = await NotificationsModule.requestPermissionsAsync();
        finalStatus = status;
      }
    }
    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted. Status:', finalStatus);
    }
    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Error requesting notification permissions:', err);
    return false;
  }
}

export async function sendInstantTestNotification(): Promise<string | null> {
  try {
    if (typeof NotificationsModule?.scheduleNotificationAsync !== 'function') return null;
    await ensureNotificationChannelAsync();
    const id = `test-${Date.now().toString(36)}`;
    await NotificationsModule.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: '🔔 Tuon Notifications Active!',
        body: 'Your study reminder notification is working as expected.',
        data: { type: 'test' },
      },
      trigger: null, // triggers immediately
    });
    return id;
  } catch (e) {
    console.warn('Failed to send test notification:', e);
    return null;
  }
}

export async function scheduleNotificationForReminder(params: {
  reminderId: string;
  reviewerId?: string | null;
  reviewerName: string;
  selectedDays: string[];
  selectedTime: string;
  hour?: number | null;
  minute?: number | null;
  mentionFlashcards?: boolean;
}): Promise<string[]> {
  try {
    if (typeof NotificationsModule?.scheduleNotificationAsync !== 'function') {
      return [];
    }

    const granted = await requestNotificationPermissionsAsync();
    await ensureNotificationChannelAsync();

    const title = `Time to study ${params.reviewerName || 'Study'}!`;
    const body = params.mentionFlashcards
      ? 'Review your saved cards and keep your learning streak moving.'
      : 'Take a few minutes to review your study notes today.';

    const notificationIds: string[] = [];
    const timeStr = (params.selectedTime || '8:00 PM').toLowerCase();

    // 1. Minute-based quick interval triggers (for test/interval support)
    const intervalMap: Record<string, number> = {
      '1 min': 60,
      '1 minute': 60,
      '5 min': 300,
      '15 min': 900,
      '30 min': 1800,
    };

    for (const [key, seconds] of Object.entries(intervalMap)) {
      if (timeStr.includes(key)) {
        try {
          const id = `notif-${params.reminderId || 'rem'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          await NotificationsModule.scheduleNotificationAsync({
            identifier: id,
            content: {
              title,
              body,
              data: { reviewerId: params.reviewerId, reminderId: params.reminderId },
            },
            trigger: {
              type: NotificationsModule.SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval',
              seconds,
              channelId: 'study-reminders',
            },
          });
          notificationIds.push(id);
        } catch (err) {
          console.warn('Failed to schedule interval notification:', err);
        }
        return notificationIds;
      }
    }

    // 2. Exact hour and minute parsing
    let targetHour = params.hour ?? 20;
    let targetMinute = params.minute ?? 0;

    const match = (params.selectedTime || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      const rawH = Number(match[1]);
      const rawM = Number(match[2]);
      const isPm = match[3].toUpperCase() === 'PM';
      targetHour = (rawH % 12) + (isPm ? 12 : 0);
      targetMinute = rawM;
    }

    const weekdayNumber: Record<string, number> = {
      Sun: 1,
      Mon: 2,
      Tue: 3,
      Wed: 4,
      Thu: 5,
      Fri: 6,
      Sat: 7,
    };

    const days = params.selectedDays && params.selectedDays.length ? params.selectedDays : ['Mon', 'Wed', 'Fri'];

    for (const day of days) {
      const dayNum = weekdayNumber[day];
      if (dayNum) {
        try {
          const notifId = `notif-${params.reminderId || 'rem'}-${dayNum}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          await NotificationsModule.scheduleNotificationAsync({
            identifier: notifId,
            content: {
              title,
              body,
              data: { reviewerId: params.reviewerId, reminderId: params.reminderId },
            },
            trigger: {
              type: NotificationsModule.SchedulableTriggerInputTypes?.WEEKLY ?? 'weekly',
              weekday: dayNum,
              hour: targetHour,
              minute: targetMinute,
              channelId: 'study-reminders',
            },
          });
          notificationIds.push(notifId);
        } catch (err) {
          console.warn(`Failed to schedule notification for ${day}:`, err);
        }
      }
    }

    return notificationIds;
  } catch (error) {
    console.warn('scheduleNotificationForReminder encountered error:', error);
    return [];
  }
}

export async function cancelScheduledNotifications(ids: string[]): Promise<void> {
  if (!Array.isArray(ids)) return;
  for (const id of ids) {
    try {
      if (typeof NotificationsModule?.cancelScheduledNotificationAsync === 'function') {
        await NotificationsModule.cancelScheduledNotificationAsync(id);
      }
    } catch {}
  }
}

export { NotificationsModule as Notifications };
