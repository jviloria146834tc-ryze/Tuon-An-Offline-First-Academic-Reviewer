import { getDatabase } from './database';
import { createLocalId } from './ids';
import { queueMutation } from './sync_queue';
import { getActiveStudentId } from '../firebase/auth';

export type SQLiteStudySession = {
  session_id: string;
  student_id: string | null;
  reviewer_id: string | null;
  started_at: string;
  ended_at: string | null;
  activity_type: string;
  synced_at?: string | null;
};

export type SQLiteQuickCapture = {
  capture_id: string;
  reviewer_id: string | null;
  title: string | null;
  content: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  synced_at?: string | null;
};

export type StudyActivityInput = {
  reviewer_id?: string | null;
  activity_type: string;
  started_at?: string;
  ended_at?: string | null;
};

export async function saveStudyActivity(activity: StudyActivityInput): Promise<string> {
  const db = await getDatabase();
  const sessionId = createLocalId('session');
  const studentId = await getActiveStudentId();
  const startedAt = activity.started_at ?? new Date().toISOString();
  const endedAt = activity.ended_at ?? null;

  await db.runAsync(
    `INSERT INTO study_sessions (session_id, student_id, reviewer_id, started_at, ended_at, activity_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    sessionId, studentId, activity.reviewer_id ?? null,
    startedAt, endedAt, activity.activity_type
  );

  await queueMutation('study_sessions', sessionId, 'UPSERT', {
    session_id: sessionId,
    student_id: studentId,
    reviewer_id: activity.reviewer_id ?? null,
    started_at: startedAt,
    ended_at: endedAt,
    activity_type: activity.activity_type,
  });

  return sessionId;
}

export async function saveQuickCapture(reviewerId: string, title: string, content: string): Promise<string> {
  const db = await getDatabase();
  const captureId = createLocalId('capture');
  const materialId = createLocalId('material');
  const cleanTitle = title.trim() || 'Quick Capture';
  const cleanContent = content.trim();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO quick_captures (capture_id, reviewer_id, title, content, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      captureId, reviewerId, cleanTitle, cleanContent
    );

    await queueMutation('quick_captures', captureId, 'UPSERT', {
      capture_id: captureId,
      reviewer_id: reviewerId,
      title: cleanTitle,
      content: cleanContent,
    });

    await db.runAsync(
      `INSERT INTO materials (material_id, reviewer_id, title, type, info, content)
       VALUES (?, ?, ?, 'Study Material', ?, ?)`,
      materialId, reviewerId, cleanTitle,
      `${cleanContent.length} characters`, cleanContent
    );

    await queueMutation('materials', materialId, 'UPSERT', {
      material_id: materialId,
      reviewer_id: reviewerId,
      title: cleanTitle,
      type: 'Study Material',
      info: `${cleanContent.length} characters`,
      content: cleanContent,
      mastery: 0,
    });
  });

  return captureId;
}

export async function getQuickCapturesByReviewer(reviewerId: string): Promise<SQLiteQuickCapture[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteQuickCapture>(
    'SELECT * FROM quick_captures WHERE reviewer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
    reviewerId
  );
}
