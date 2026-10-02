import { getDatabase } from './database';
import { createLocalId } from './ids';

export type SQLiteFlashcard = {
  flashcard_id: string;
  material_id: string;
  question: string;
  answer: string;
  created_at: string;
};

export type FlashcardInput = { question: string; answer: string };

export async function getFlashcards(materialId: string): Promise<SQLiteFlashcard[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteFlashcard>(
    'SELECT * FROM flashcards WHERE material_id = ? ORDER BY created_at ASC', materialId
  );
}

export async function getFlashcardsByReviewer(reviewerId: string): Promise<SQLiteFlashcard[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteFlashcard>(
    `SELECT f.* FROM flashcards f JOIN materials m ON m.material_id = f.material_id
     WHERE m.reviewer_id = ? ORDER BY f.created_at ASC`, reviewerId
  );
}

export async function saveFlashcards(materialId: string, cards: FlashcardInput[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const card of cards) {
      await db.runAsync(
        'INSERT INTO flashcards (flashcard_id, material_id, question, answer) VALUES (?, ?, ?, ?)',
        createLocalId('card'), materialId, card.question.trim(), card.answer.trim()
      );
    }
  });
}

export type SrsProgressInput = {
  ease_factor?: number;
  interval_days?: number;
  repetitions?: number;
  next_review_date?: string | null;
};

export async function saveSrsProgress(flashcardId: string, progress: SrsProgressInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO srs_progress
       (flashcard_id, ease_factor, interval_days, repetitions, next_review_date, last_reviewed_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(flashcard_id) DO UPDATE SET
       ease_factor = excluded.ease_factor,
       interval_days = excluded.interval_days,
       repetitions = excluded.repetitions,
       next_review_date = excluded.next_review_date,
       last_reviewed_at = CURRENT_TIMESTAMP`,
    flashcardId, progress.ease_factor ?? 2.5, progress.interval_days ?? 0,
    progress.repetitions ?? 0, progress.next_review_date ?? null
  );
}
