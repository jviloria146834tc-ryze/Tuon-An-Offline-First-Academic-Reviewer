import { getDatabase } from './database';
import { createLocalId } from './ids';

export type StudyActivityInput = {
  reviewer_id?: string | null;
  activity_type: string;
  started_at?: string;
  ended_at?: string | null;
};

export async function saveStudyActivity(activity: StudyActivityInput): Promise<string> {
  const db = await getDatabase();
  const sessionId = createLocalId('session');
  await db.runAsync(
    `INSERT INTO study_sessions (session_id, student_id, reviewer_id, started_at, ended_at, activity_type)
     VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?)`,
    sessionId, null, activity.reviewer_id ?? null,
    activity.started_at ?? null, activity.ended_at ?? null, activity.activity_type
  );
  return sessionId;
}

export async function saveQuickCapture(reviewerId: string, title: string, content: string): Promise<string> {
  const db = await getDatabase();
  const captureId = createLocalId('capture');
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO quick_captures (capture_id, reviewer_id, title, content) VALUES (?, ?, ?, ?)',
      captureId, reviewerId, title.trim() || null, content.trim()
    );
    await db.runAsync(
      `INSERT INTO materials (material_id, reviewer_id, title, type, info, content)
       VALUES (?, ?, ?, 'Study Material', ?, ?)`,
      createLocalId('material'), reviewerId, title.trim() || 'Quick Capture',
      `${content.trim().length} characters`, content.trim()
    );
  });
  return captureId;
}
