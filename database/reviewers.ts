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
  return database.getAllAsync<SQLiteReviewer>(
    'SELECT * FROM reviewers WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC'
  );
}

export async function getReviewerById(id: string): Promise<SQLiteReviewer | null> {
  const database = await getDatabase();
  return database.getFirstAsync<SQLiteReviewer>(
    'SELECT * FROM reviewers WHERE reviewer_id = ? AND deleted_at IS NULL',
    id
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
