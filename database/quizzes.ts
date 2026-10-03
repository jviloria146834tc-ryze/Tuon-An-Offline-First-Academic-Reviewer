import { getDatabase } from './database';
import { createLocalId } from './ids';
import { queueMutation } from './sync_queue';
import { getActiveStudentId } from '../firebase/auth';

export type SQLiteQuiz = {
  quiz_id: string;
  material_id: string;
  title: string;
  question_count: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  synced_at?: string | null;
};

export type SQLiteQuizQuestion = {
  question_id: string;
  quiz_id: string;
  question: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | null;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  synced_at?: string | null;
};

export type QuizQuestionInput = {
  question: string;
  options: [string?, string?, string?, string?];
  correct_answer?: string | null;
};

export type QuizInput = {
  material_id: string;
  title: string;
  questions: QuizQuestionInput[];
};

export async function getQuizzesByMaterial(materialId: string): Promise<SQLiteQuiz[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteQuiz>(
    'SELECT * FROM quizzes WHERE material_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
    materialId
  );
}

export async function getQuizQuestions(quizId: string): Promise<SQLiteQuizQuestion[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteQuizQuestion>(
    'SELECT * FROM quiz_questions WHERE quiz_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
    quizId
  );
}

export async function saveQuiz(input: QuizInput): Promise<string> {
  const db = await getDatabase();
  const quizId = createLocalId('quiz');
  const title = input.title.trim();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO quizzes (quiz_id, material_id, title, question_count, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      quizId, input.material_id, title, input.questions.length
    );

    await queueMutation('quizzes', quizId, 'UPSERT', {
      quiz_id: quizId,
      material_id: input.material_id,
      title,
      question_count: input.questions.length,
    });

    for (const question of input.questions) {
      const questionId = createLocalId('question');
      const qText = question.question.trim();
      const optA = question.options[0] ?? null;
      const optB = question.options[1] ?? null;
      const optC = question.options[2] ?? null;
      const optD = question.options[3] ?? null;
      const correct = question.correct_answer ?? null;

      await db.runAsync(
        `INSERT INTO quiz_questions
         (question_id, quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        questionId, quizId, qText, optA, optB, optC, optD, correct
      );

      await queueMutation('quiz_questions', questionId, 'UPSERT', {
        question_id: questionId,
        quiz_id: quizId,
        question: qText,
        option_a: optA,
        option_b: optB,
        option_c: optC,
        option_d: optD,
        correct_answer: correct,
      });
    }
  });

  return quizId;
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE quizzes SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE quiz_id = ?',
    quizId
  );
  await queueMutation('quizzes', quizId, 'DELETE', { quiz_id: quizId });
}

export async function saveQuizAttempt(quizId: string, score: number, totalQuestions: number): Promise<string> {
  const db = await getDatabase();
  const attemptId = createLocalId('attempt');
  const studentId = await getActiveStudentId();

  await db.runAsync(
    'INSERT INTO quiz_attempts (attempt_id, quiz_id, score, total_questions) VALUES (?, ?, ?, ?)',
    attemptId, quizId, score, totalQuestions
  );

  await queueMutation('quiz_attempts', attemptId, 'UPSERT', {
    attempt_id: attemptId,
    quiz_id: quizId,
    student_id: studentId,
    score,
    total_questions: totalQuestions,
  });

  return attemptId;
}
