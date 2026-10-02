import { getDatabase } from './database';
import { createLocalId } from './ids';

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
};

export type ReviewerInput = {
  name: string;
  subject: string;
  description?: string | null;
};

export async function getReviewers(): Promise<SQLiteReviewer[]> {
  const database = await getDatabase();
  return database.getAllAsync<SQLiteReviewer>(
    'SELECT * FROM reviewers ORDER BY name COLLATE NOCASE ASC'
  );
}

export async function getReviewerById(id: string): Promise<SQLiteReviewer | null> {
  const database = await getDatabase();
  return database.getFirstAsync<SQLiteReviewer>(
    'SELECT * FROM reviewers WHERE reviewer_id = ?', id
  );
}

export async function createReviewer(input: ReviewerInput): Promise<string> {
  const database = await getDatabase();
  const id = createLocalId('reviewer');
  await database.runAsync(
    `INSERT INTO reviewers (reviewer_id, student_id, name, subject, description)
     VALUES (?, ?, ?, ?, ?)`,
    id, null, input.name.trim(), input.subject.trim(), input.description?.trim() || null
  );
  return id;
}

export async function updateReviewer(id: string, input: ReviewerInput): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE reviewers SET name = ?, subject = ?, description = ?,
     updated_at = CURRENT_TIMESTAMP WHERE reviewer_id = ?`,
    input.name.trim(), input.subject.trim(), input.description?.trim() || null, id
  );
}

export async function deleteReviewer(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM reviewers WHERE reviewer_id = ?', id);
}
