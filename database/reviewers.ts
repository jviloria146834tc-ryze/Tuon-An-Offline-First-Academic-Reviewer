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
  mastery: number;
  due_cards: number;
  card_count: number;
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
};

export async function getReviewers(): Promise<SQLiteReviewer[]> {
  const database = await getDatabase();
  const studentId = await getActiveStudentId();
  return database.getAllAsync<SQLiteReviewer>(
    `SELECT r.reviewer_id, r.student_id, r.name, r.subject, r.description, COALESCE(r.is_archived, 0) AS is_archived, r.created_at, r.updated_at, r.deleted_at, r.synced_at,
       (SELECT CASE WHEN COUNT(f.flashcard_id) = 0 THEN 0 ELSE ROUND(100.0 * SUM(CASE WHEN COALESCE(s.repetitions, 0) > 0 THEN 1 ELSE 0 END) / COUNT(f.flashcard_id)) END
        FROM materials m JOIN flashcards f ON f.material_id = m.material_id
        LEFT JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
        WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS mastery,
       (SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
        LEFT JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
        WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL
          AND (s.flashcard_id IS NULL OR s.next_review_date IS NULL OR date(s.next_review_date) <= date('now','localtime'))) AS due_cards
       ,(SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
         WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS card_count
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
    `SELECT r.reviewer_id, r.student_id, r.name, r.subject, r.description, COALESCE(r.is_archived, 0) AS is_archived, r.created_at, r.updated_at, r.deleted_at, r.synced_at,
       (SELECT CASE WHEN COUNT(f.flashcard_id) = 0 THEN 0 ELSE ROUND(100.0 * SUM(CASE WHEN COALESCE(s.repetitions, 0) > 0 THEN 1 ELSE 0 END) / COUNT(f.flashcard_id)) END
        FROM materials m JOIN flashcards f ON f.material_id = m.material_id
        LEFT JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
        WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS mastery,
       (SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
        LEFT JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
        WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL
          AND (s.flashcard_id IS NULL OR s.next_review_date IS NULL OR date(s.next_review_date) <= date('now','localtime'))) AS due_cards
       ,(SELECT COUNT(*) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
         WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS card_count
       ,(SELECT MAX(s.last_reviewed_at) FROM materials m JOIN flashcards f ON f.material_id = m.material_id
         JOIN srs_progress s ON s.flashcard_id = f.flashcard_id
         WHERE m.reviewer_id = r.reviewer_id AND m.deleted_at IS NULL AND f.deleted_at IS NULL) AS last_studied
     FROM reviewers r WHERE r.reviewer_id = ? AND r.student_id = ? AND r.deleted_at IS NULL`,
    id, studentId
  );
}

export async function createReviewer(input: ReviewerInput): Promise<string> {
  const database = await getDatabase();
  const id = createLocalId('reviewer');
  const studentId = await getActiveStudentId();
  const name = input.name.trim();
  const subject = input.subject.trim();
  const description = input.description?.trim() || null;

  await database.runAsync(
    `INSERT INTO reviewers (reviewer_id, student_id, name, subject, description)
     VALUES (?, ?, ?, ?, ?)`,
    id, studentId, name, subject, description
  );

  await queueMutation('reviewers', id, 'UPSERT', {
    reviewer_id: id,
    student_id: studentId,
    name,
    subject,
    description,
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

  await database.runAsync(
    `UPDATE reviewers SET name = ?, subject = ?, description = ?,
     updated_at = CURRENT_TIMESTAMP WHERE reviewer_id = ?`,
    name, subject, description, id
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

