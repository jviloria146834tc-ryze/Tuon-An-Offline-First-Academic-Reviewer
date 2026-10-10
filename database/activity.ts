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
  images?: string | null;
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

export async function saveQuickCapture(
  reviewerId: string,
  title: string,
  content: string,
  images: string[] = []
): Promise<string> {
  const db = await getDatabase();
  const captureId = createLocalId('capture');
  const materialId = createLocalId('material');
  const cleanTitle = title.trim() || 'Quick Capture';
  const cleanContent = content.trim();
  const imagesJson = images.length > 0 ? JSON.stringify(images) : null;

  // Build material description info
  const infoParts: string[] = [];
  if (images.length > 0) {
    infoParts.push(`${images.length} photo${images.length > 1 ? 's' : ''}`);
  }
  if (cleanContent.length > 0) {
    infoParts.push(`${cleanContent.length} characters`);
  }
  const infoText = infoParts.join(' • ') || 'Quick Capture Note';

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO quick_captures (capture_id, reviewer_id, title, content, images, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      captureId, reviewerId, cleanTitle, cleanContent, imagesJson
    );

    await queueMutation('quick_captures', captureId, 'UPSERT', {
      capture_id: captureId,
      reviewer_id: reviewerId,
      title: cleanTitle,
      content: cleanContent,
      images: imagesJson,
    });

    await db.runAsync(
      `INSERT INTO materials (material_id, reviewer_id, title, type, info, content, attachments)
       VALUES (?, ?, ?, 'Study Material', ?, ?, ?)`,
      materialId, reviewerId, cleanTitle,
      infoText, cleanContent, imagesJson
    );

    await queueMutation('materials', materialId, 'UPSERT', {
      material_id: materialId,
      reviewer_id: reviewerId,
      title: cleanTitle,
      type: 'Study Material',
      info: infoText,
      content: cleanContent,
      attachments: imagesJson,
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

export type StudyStreak = {
  currentStreak: number;
  bestStreak: number;
  lastStudiedDate: string | null;
  studiedToday: boolean;
};

export async function getStudyStreak(studentId: string): Promise<StudyStreak> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ study_date: string }>(
      `SELECT DISTINCT date(activity_time) AS study_date FROM (
         SELECT started_at AS activity_time FROM study_sessions WHERE student_id = ?
         UNION ALL
         SELECT a.completed_at AS activity_time
           FROM quiz_attempts a
           JOIN quizzes q ON q.quiz_id = a.quiz_id
           JOIN materials m ON m.material_id = q.material_id
           JOIN reviewers r ON r.reviewer_id = m.reviewer_id
          WHERE r.student_id = ?
         UNION ALL
         SELECT s.last_reviewed_at AS activity_time
           FROM srs_progress s
           JOIN flashcards f ON f.flashcard_id = s.flashcard_id
           JOIN materials m ON m.material_id = f.material_id
           JOIN reviewers r ON r.reviewer_id = m.reviewer_id
          WHERE r.student_id = ? AND s.last_reviewed_at IS NOT NULL
       ) WHERE activity_time IS NOT NULL AND activity_time != ''
       ORDER BY study_date DESC`,
      studentId, studentId, studentId
    );

    if (!rows || rows.length === 0) {
      return { currentStreak: 0, bestStreak: 0, lastStudiedDate: null, studiedToday: false };
    }

    const dateSet = new Set(rows.map(r => r.study_date).filter(Boolean));
    const today = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(today);
    const studiedToday = dateSet.has(todayStr);

    let currentStreak = 0;
    const checkDate = new Date(today);

    if (!studiedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = formatDate(checkDate);
      if (dateSet.has(yesterdayStr)) {
        while (dateSet.has(formatDate(checkDate))) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    } else {
      while (dateSet.has(formatDate(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    const sortedDates = Array.from(dateSet).sort();
    let bestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dStr of sortedDates) {
      const [y, m, d] = dStr.split('-').map(Number);
      const cur = new Date(y, m - 1, d);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
      prevDate = cur;
    }

    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }

    const lastStudiedDate = rows[0]?.study_date ?? null;
    return { currentStreak, bestStreak, lastStudiedDate, studiedToday };
  } catch (error) {
    console.warn('Failed to calculate study streak:', error);
    return { currentStreak: 0, bestStreak: 0, lastStudiedDate: null, studiedToday: false };
  }
}

