import { getDatabase } from './database';
import { createLocalId } from './ids';
import { getSyncMeta } from './sync_queue';
import { getReviewers } from './reviewers';

export type SQLiteStudyReminder = {
  reminder_id: string;
  reviewer_id: string | null;
  title: string;
  selected_days: string; // JSON array string e.g. '["Mon","Wed"]'
  selected_time: string; // e.g. "In 1 min", "8:00 PM"
  hour: number | null;
  minute: number | null;
  is_enabled: number;
  mention_flashcards: number;
  notification_ids: string | null; // JSON string array
  created_at: string;
  updated_at: string;
  reviewer_name?: string;
  subject?: string;
};

export type SQLiteNotificationHistory = {
  history_id: string;
  reviewer_id: string | null;
  title: string;
  body: string;
  scheduled_time: string | null;
  finished_at: string;
  status: string;
  reviewer_name?: string;
};

export type ReminderInput = {
  reminder_id?: string;
  reviewer_id?: string | null;
  title?: string;
  selected_days: string[];
  selected_time: string;
  hour?: number | null;
  minute?: number | null;
  is_enabled?: boolean;
  mention_flashcards?: boolean;
  notification_ids?: string[];
};

/**
 * Migrate legacy sync_meta schedules into study_reminders if table is fresh
 */
async function ensureLegacyMigrated() {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM study_reminders'
  );
  if (existing && existing.count > 0) return;

  try {
    const reviewers = await getReviewers();
    for (const r of reviewers) {
      const saved = await getSyncMeta(`schedule_${r.reviewer_id}`);
      if (!saved) continue;
      try {
        const parsed = JSON.parse(saved);
        const reminderId = createLocalId('rem');
        await db.runAsync(
          `INSERT INTO study_reminders (
            reminder_id, reviewer_id, title, selected_days, selected_time,
            hour, minute, is_enabled, mention_flashcards
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          reminderId,
          r.reviewer_id,
          `Study ${r.name}`,
          JSON.stringify(parsed.selectedDays || ['Mon', 'Wed', 'Fri']),
          parsed.selectedTime || '8:00 PM',
          20,
          0,
          parsed.reminderEnabled ? 1 : 0,
          parsed.dueCardReminder ? 1 : 0
        );
      } catch {}
    }
  } catch {}
}

export async function getAllReminders(): Promise<SQLiteStudyReminder[]> {
  await ensureLegacyMigrated();
  const db = await getDatabase();
  return db.getAllAsync<SQLiteStudyReminder>(`
    SELECT sr.*, r.name as reviewer_name, r.subject as subject
    FROM study_reminders sr
    LEFT JOIN reviewers r ON r.reviewer_id = sr.reviewer_id
    ORDER BY sr.created_at DESC
  `);
}

export async function getRemindersByReviewer(reviewerId: string): Promise<SQLiteStudyReminder[]> {
  await ensureLegacyMigrated();
  const db = await getDatabase();
  return db.getAllAsync<SQLiteStudyReminder>(`
    SELECT sr.*, r.name as reviewer_name, r.subject as subject
    FROM study_reminders sr
    LEFT JOIN reviewers r ON r.reviewer_id = sr.reviewer_id
    WHERE sr.reviewer_id = ?
    ORDER BY sr.created_at DESC
  `, reviewerId);
}

export async function saveReminder(input: ReminderInput): Promise<string> {
  const db = await getDatabase();
  const id = input.reminder_id || createLocalId('rem');
  const now = new Date().toISOString();
  const daysJson = JSON.stringify(input.selected_days || []);
  const notifIdsJson = input.notification_ids ? JSON.stringify(input.notification_ids) : null;
  const isEnabled = input.is_enabled === false ? 0 : 1;
  const mentionCards = input.mention_flashcards === false ? 0 : 1;
  const title = input.title?.trim() || 'Study Reminder';

  const existing = await db.getFirstAsync<{ reminder_id: string }>(
    'SELECT reminder_id FROM study_reminders WHERE reminder_id = ?',
    id
  );

  if (existing) {
    await db.runAsync(
      `UPDATE study_reminders
       SET reviewer_id = ?, title = ?, selected_days = ?, selected_time = ?,
           hour = ?, minute = ?, is_enabled = ?, mention_flashcards = ?,
           notification_ids = ?, updated_at = ?
       WHERE reminder_id = ?`,
      input.reviewer_id ?? null,
      title,
      daysJson,
      input.selected_time,
      input.hour ?? null,
      input.minute ?? null,
      isEnabled,
      mentionCards,
      notifIdsJson,
      now,
      id
    );
  } else {
    await db.runAsync(
      `INSERT INTO study_reminders (
        reminder_id, reviewer_id, title, selected_days, selected_time,
        hour, minute, is_enabled, mention_flashcards, notification_ids,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.reviewer_id ?? null,
      title,
      daysJson,
      input.selected_time,
      input.hour ?? null,
      input.minute ?? null,
      isEnabled,
      mentionCards,
      notifIdsJson,
      now,
      now
    );
  }

  return id;
}

export async function toggleReminder(reminderId: string, enabled: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE study_reminders SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE reminder_id = ?',
    enabled ? 1 : 0,
    reminderId
  );
}

export async function deleteReminder(reminderId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM study_reminders WHERE reminder_id = ?', reminderId);
}

export async function getNotificationHistory(): Promise<SQLiteNotificationHistory[]> {
  const db = await getDatabase();
  // Ensure legacy sample demo notifications are cleaned up
  await db.runAsync(
    "DELETE FROM notifications_history WHERE title IN ('Time to study IT 26: HCI!', 'Study session completed')"
  ).catch(() => {});

  return db.getAllAsync<SQLiteNotificationHistory>(`
    SELECT nh.*, r.name as reviewer_name
    FROM notifications_history nh
    LEFT JOIN reviewers r ON r.reviewer_id = nh.reviewer_id
    ORDER BY nh.finished_at DESC
  `);
}

export async function addNotificationHistory(input: {
  reviewer_id?: string | null;
  title: string;
  body: string;
  scheduled_time?: string | null;
  finished_at?: string;
  status?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = createLocalId('nh');
  const finishedAt = input.finished_at || new Date().toISOString();

  await db.runAsync(
    `INSERT INTO notifications_history (
      history_id, reviewer_id, title, body, scheduled_time, finished_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.reviewer_id ?? null,
    input.title,
    input.body,
    input.scheduled_time ?? null,
    finishedAt,
    input.status ?? 'completed'
  );

  return id;
}

export async function clearNotificationHistory(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM notifications_history');
}
