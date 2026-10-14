import { getDatabase } from './database';
import { createLocalId } from './ids';
import { queueMutation } from './sync_queue';
import { getActiveStudentId } from '../firebase/auth';

export type SQLiteReviewer = {
  reviewer_id: string;
  student_id: string | null;
  name: string;
  subject: string;
  description: string | null;
  icon?: string | null;
  mastery: number;
  due_cards: number;
  card_count: number;
  quiz_count?: number;
  last_studied: string | null;
  is_archived?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  synced_at?: string | null;
};

export type ReviewerInput = {
  name: string;
  subject: string;
  description?: string | null;
  icon?: string | null;
};

export const REVIEWER_ICONS = [
  { icon: 'book-outline', label: 'General' },
  { icon: 'school-outline', label: 'Academics' },
  { icon: 'calculator-outline', label: 'Math' },
  { icon: 'flask-outline', label: 'Science' },
  { icon: 'code-slash-outline', label: 'Coding' },
  { icon: 'hardware-chip-outline', label: 'Tech' },
  { icon: 'globe-outline', label: 'Social' },
  { icon: 'business-outline', label: 'Business' },
  { icon: 'scale-outline', label: 'Law' },
  { icon: 'medkit-outline', label: 'Health' },
  { icon: 'color-palette-outline', label: 'Arts' },
  { icon: 'language-outline', label: 'Language' },
  { icon: 'bulb-outline', label: 'Logic' },
  { icon: 'telescope-outline', label: 'Research' },
  { icon: 'musical-notes-outline', label: 'Music' },
  { icon: 'fitness-outline', label: 'Sports' },
] as const;

export type SrsReviewAlert = {
  reviewer_id: string;
  name: string;
  subject: string;
  due_cards: number;
  total_cards: number;
  next_due_date: string | null;
};

export async function getReviewers(): Promise<SQLiteReviewer[]> {
  const database = await getDatabase();
  const studentId = await getActiveStudentId();
  return database.getAllAsync<SQLiteReviewer>(
    `SELECT r.reviewer_id, r.student_id, r.name, r.subject, r.description, COALESCE(r.icon, 'book-outline') AS icon, COALESCE(r.is_archived, 0) AS is_archived, r.created_at, r.updated_at, r.deleted_at, r.synced_at,
       (SELECT CASE
          WHEN fc.total_cards > 0 AND qz.total_quizzes > 0 THEN
            ROUND(((100.0 * fc.mastered_cards / fc.total_cards) + COALESCE(qz.quiz_accuracy, 0.0)) / 2.0)
          WHEN fc.total_cards > 0 THEN
            ROUND(100.0 * fc.mastered_cards / fc.total_cards)
          WHEN qz.total_quizzes > 0 THEN
            ROUND(COALESCE(qz.quiz_accuracy, 0.0))
          ELSE 0
        END
        FROM
          (SELECT COUNT(f.flashcard_id) AS total_cards,
                  SUM(CASE WHEN COALESCE(s.repetitions, 0) > 0 THEN 1 ELSE 0 END) AS mastered_cards
           FROM materials m JOIN flashcards f ON f.material_id = m.material_id
           LEFT JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
           WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL
          ) fc,
          (SELECT COUNT(DISTINCT q.quiz_id) AS total_quizzes,
                  CASE WHEN COUNT(a.attempt_id) = 0 THEN 0.0
                       ELSE 100.0 * SUM(a.score) / SUM(a.total_questions)
                  END AS quiz_accuracy
           FROM materials m JOIN quizzes q ON q.material_id = m.material_id
           LEFT JOIN quiz_attempts a ON a.quiz_id = q.quiz_id
           WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND q.deleted_at IS NULL
          ) qz
       ) AS mastery,
       (SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
        LEFT JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
        WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL
          AND (s.flashcard_id IS NULL OR s.next_review_date IS NULL OR date(s.next_review_date) <= date('now','localtime'))) AS due_cards
       ,(SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
         WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS card_count
       ,(SELECT COUNT(*) FROM materials m JOIN quizzes q ON q.material_id = m.material_id
         WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND q.deleted_at IS NULL) AS quiz_count
       ,(SELECT MAX(s.last_reviewed_at) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
         JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
         WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS last_studied
     FROM reviewers r WHERE r.student_id = ? AND r.deleted_at IS NULL ORDER BY r.name COLLATE NOCASE ASC`,
    studentId
  );
}

export async function getReviewerById(id: string): Promise<SQLiteReviewer | null> {
  const database = await getDatabase();
  const studentId = await getActiveStudentId();
  return database.getFirstAsync<SQLiteReviewer>(
    `SELECT r.reviewer_id, r.student_id, r.name, r.subject, r.description, COALESCE(r.icon, 'book-outline') AS icon, COALESCE(r.is_archived, 0) AS is_archived, r.created_at, r.updated_at, r.deleted_at, r.synced_at,
       (SELECT CASE
          WHEN fc.total_cards > 0 AND qz.total_quizzes > 0 THEN
            ROUND(((100.0 * fc.mastered_cards / fc.total_cards) + COALESCE(qz.quiz_accuracy, 0.0)) / 2.0)
          WHEN fc.total_cards > 0 THEN
            ROUND(100.0 * fc.mastered_cards / fc.total_cards)
          WHEN qz.total_quizzes > 0 THEN
            ROUND(COALESCE(qz.quiz_accuracy, 0.0))
          ELSE 0
        END
        FROM
          (SELECT COUNT(f.flashcard_id) AS total_cards,
                  SUM(CASE WHEN COALESCE(s.repetitions, 0) > 0 THEN 1 ELSE 0 END) AS mastered_cards
           FROM materials m JOIN flashcards f ON f.material_id = m.material_id
           LEFT JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
           WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL
          ) fc,
          (SELECT COUNT(DISTINCT q.quiz_id) AS total_quizzes,
                  CASE WHEN COUNT(a.attempt_id) = 0 THEN 0.0
                       ELSE 100.0 * SUM(a.score) / SUM(a.total_questions)
                  END AS quiz_accuracy
           FROM materials m JOIN quizzes q ON q.material_id = m.material_id
           LEFT JOIN quiz_attempts a ON a.quiz_id = q.quiz_id
           WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND q.deleted_at IS NULL
          ) qz
       ) AS mastery,
       (SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
        LEFT JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
        WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL
          AND (s.flashcard_id IS NULL OR s.next_review_date IS NULL OR date(s.next_review_date) <= date('now','localtime'))) AS due_cards
       ,(SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
         WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS card_count
       ,(SELECT COUNT(*) FROM materials m JOIN quizzes q ON q.material_id = m.material_id
         WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND q.deleted_at IS NULL) AS quiz_count
       ,(SELECT MAX(s.last_reviewed_at) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
         JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
         WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS last_studied
     FROM reviewers r WHERE r.reviewer_id = ? AND r.student_id = ? AND r.deleted_at IS NULL`,
    id, studentId
  );
}

export async function getSrsReviewAlerts(): Promise<SrsReviewAlert[]> {
  const database = await getDatabase();
  const studentId = await getActiveStudentId();
  return database.getAllAsync<SrsReviewAlert>(
    `SELECT r.reviewer_id, r.name, r.subject,
       (SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
        LEFT JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
        WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL
          AND (s.flashcard_id IS NULL OR s.next_review_date IS NULL OR date(s.next_review_date) <= date('now','localtime'))) AS due_cards,
       (SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
        WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS total_cards,
       (SELECT MIN(s.next_review_date) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
        JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
        WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS next_due_date
     FROM reviewers r
     WHERE r.student_id = ? AND r.deleted_at IS NULL
       AND (SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
            WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) > 0
     ORDER BY due_cards DESC, next_due_date ASC`,
    studentId
  );
}

export async function createReviewer(input: ReviewerInput): Promise<string> {
  const database = await getDatabase();
  const id = createLocalId('reviewer');
  const studentId = await getActiveStudentId();
  const name = input.name.trim();
  const subject = input.subject.trim();
  const description = input.description?.trim() || null;
  const icon = input.icon?.trim() || 'book-outline';

  await database.runAsync(
    `INSERT INTO reviewers (reviewer_id, student_id, name, subject, description, icon)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id, studentId, name, subject, description, icon
  );

  await queueMutation('reviewers', id, 'UPSERT', {
    reviewer_id: id,
    student_id: studentId,
    name,
    subject,
    description,
    icon,
    mastery: 0,
    due_cards: 0,
  });

  return id;
}

export async function updateReviewer(id: string, input: ReviewerInput): Promise<void> {
  const database = await getDatabase();
  const name = input.name.trim();
  const subject = input.subject.trim();
  const description = input.description?.trim() || null;
  const icon = input.icon?.trim() || 'book-outline';

  await database.runAsync(
    `UPDATE reviewers SET name = ?, subject = ?, description = ?, icon = ?,
     updated_at = CURRENT_TIMESTAMP WHERE reviewer_id = ?`,
    name, subject, description, icon, id
  );

  const updated = await database.getFirstAsync<SQLiteReviewer>(
    'SELECT * FROM reviewers WHERE reviewer_id = ?',
    id
  );
  if (updated) {
    await queueMutation('reviewers', id, 'UPSERT', updated as unknown as Record<string, unknown>);
  }
}

export async function deleteReviewer(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE reviewers SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE reviewer_id = ?',
    id
  );
  await queueMutation('reviewers', id, 'DELETE', { reviewer_id: id });
}

export async function toggleArchiveReviewer(id: string, isArchived: boolean): Promise<void> {
  const database = await getDatabase();
  const val = isArchived ? 1 : 0;
  await database.runAsync(
    'UPDATE reviewers SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE reviewer_id = ?',
    val, id
  );
  const updated = await database.getFirstAsync<SQLiteReviewer>(
    'SELECT * FROM reviewers WHERE reviewer_id = ?',
    id
  );
  if (updated) {
    await queueMutation('reviewers', id, 'UPSERT', updated as unknown as Record<string, unknown>);
  }
}

