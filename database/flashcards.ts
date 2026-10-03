import { getDatabase } from './database';
import { createLocalId } from './ids';
import { queueMutation } from './sync_queue';
import { getActiveStudentId } from '../firebase/auth';

export type SQLiteFlashcard = {
  flashcard_id: string;
  material_id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  synced_at?: string | null;
};

export type FlashcardInput = { question: string; answer: string };

export async function getFlashcards(materialId: string): Promise<SQLiteFlashcard[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteFlashcard>(
    'SELECT * FROM flashcards WHERE material_id = ? AND deleted_at IS NULL ORDER BY created_at ASC', materialId
  );
}

export async function getFlashcardsByReviewer(reviewerId: string): Promise<SQLiteFlashcard[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteFlashcard>(
    `SELECT f.* FROM flashcards f JOIN materials m ON m.material_id = f.material_id
     WHERE m.reviewer_id = ? AND f.deleted_at IS NULL AND m.deleted_at IS NULL ORDER BY f.created_at ASC`, reviewerId
  );
}

export async function saveFlashcards(materialId: string, cards: FlashcardInput[]): Promise<string[]> {
  const db = await getDatabase();
  const createdIds: string[] = [];

  await db.withTransactionAsync(async () => {
    for (const card of cards) {
      const id = createLocalId('card');
      const question = card.question.trim();
      const answer = card.answer.trim();

      await db.runAsync(
        'INSERT INTO flashcards (flashcard_id, material_id, question, answer) VALUES (?, ?, ?, ?)',
        id, materialId, question, answer
      );

      await queueMutation('flashcards', id, 'UPSERT', {
        flashcard_id: id,
        material_id: materialId,
        question,
        answer,
      });

      createdIds.push(id);
    }
  });

  return createdIds;
}

export async function deleteFlashcard(flashcardId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE flashcards SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE flashcard_id = ?',
    flashcardId
  );
  await queueMutation('flashcards', flashcardId, 'DELETE', { flashcard_id: flashcardId });
}

export type SrsProgressInput = {
  ease_factor?: number;
  interval_days?: number;
  repetitions?: number;
  next_review_date?: string | null;
};

export async function saveSrsProgress(flashcardId: string, progress: SrsProgressInput): Promise<void> {
  const db = await getDatabase();
  const studentId = await getActiveStudentId();
  const easeFactor = progress.ease_factor ?? 2.5;
  const intervalDays = progress.interval_days ?? 0;
  const repetitions = progress.repetitions ?? 0;
  const nextReviewDate = progress.next_review_date ?? null;

  await db.runAsync(
    `INSERT INTO srs_progress
       (flashcard_id, ease_factor, interval_days, repetitions, next_review_date, last_reviewed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(flashcard_id) DO UPDATE SET
       ease_factor = excluded.ease_factor,
       interval_days = excluded.interval_days,
       repetitions = excluded.repetitions,
       next_review_date = excluded.next_review_date,
       last_reviewed_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`,
    flashcardId, easeFactor, intervalDays, repetitions, nextReviewDate
  );

  await queueMutation('srs_progress', flashcardId, 'UPSERT', {
    flashcard_id: flashcardId,
    student_id: studentId,
    ease_factor: easeFactor,
    interval_days: intervalDays,
    repetitions,
    next_review_date: nextReviewDate,
  });
}
