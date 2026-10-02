import { getDatabase } from './database';
import { createLocalId } from './ids';

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

export async function saveQuiz(input: QuizInput): Promise<string> {
  const db = await getDatabase();
  const quizId = createLocalId('quiz');
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO quizzes (quiz_id, material_id, title, question_count) VALUES (?, ?, ?, ?)',
      quizId, input.material_id, input.title.trim(), input.questions.length
    );
    for (const question of input.questions) {
      await db.runAsync(
        `INSERT INTO quiz_questions
         (question_id, quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        createLocalId('question'), quizId, question.question.trim(),
        question.options[0] ?? null, question.options[1] ?? null,
        question.options[2] ?? null, question.options[3] ?? null,
        question.correct_answer ?? null
      );
    }
  });
  return quizId;
}

export async function saveQuizAttempt(quizId: string, score: number, totalQuestions: number): Promise<string> {
  const db = await getDatabase();
  const attemptId = createLocalId('attempt');
  await db.runAsync(
    'INSERT INTO quiz_attempts (attempt_id, quiz_id, score, total_questions) VALUES (?, ?, ?, ?)',
    attemptId, quizId, score, totalQuestions
  );
  return attemptId;
}
