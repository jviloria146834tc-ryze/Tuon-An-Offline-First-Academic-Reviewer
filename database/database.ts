import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'tuon.db';
const DATABASE_VERSION = 2;

let database: SQLite.SQLiteDatabase | null = null;
let openingDatabase: Promise<SQLite.SQLiteDatabase> | null = null;
let initialization: Promise<void> | null = null;

async function openDatabase() {
  if (database) return database;
  if (!openingDatabase) {
    openingDatabase = SQLite.openDatabaseAsync(DATABASE_NAME).then(db => {
      database = db;
      return db;
    }).catch(error => {
      openingDatabase = null;
      throw error;
    });
  }
  return openingDatabase;
}

export async function initializeDatabase(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      const db = await openDatabase();
      await db.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS students (
          student_id TEXT PRIMARY KEY NOT NULL,
          email TEXT UNIQUE,
          display_name TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reviewers (
          reviewer_id TEXT PRIMARY KEY NOT NULL,
          student_id TEXT,
          name TEXT NOT NULL,
          subject TEXT NOT NULL,
          description TEXT,
          mastery REAL NOT NULL DEFAULT 0,
          due_cards INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS materials (
          material_id TEXT PRIMARY KEY NOT NULL,
          reviewer_id TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          info TEXT,
          content TEXT,
          mastery REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reviewer_id) REFERENCES reviewers(reviewer_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS flashcards (
          flashcard_id TEXT PRIMARY KEY NOT NULL,
          material_id TEXT NOT NULL,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (material_id) REFERENCES materials(material_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS srs_progress (
          flashcard_id TEXT PRIMARY KEY NOT NULL,
          ease_factor REAL NOT NULL DEFAULT 2.5,
          interval_days INTEGER NOT NULL DEFAULT 0,
          repetitions INTEGER NOT NULL DEFAULT 0,
          next_review_date TEXT,
          last_reviewed_at TEXT,
          FOREIGN KEY (flashcard_id) REFERENCES flashcards(flashcard_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS quizzes (
          quiz_id TEXT PRIMARY KEY NOT NULL,
          material_id TEXT NOT NULL,
          title TEXT NOT NULL,
          question_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (material_id) REFERENCES materials(material_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS quiz_questions (
          question_id TEXT PRIMARY KEY NOT NULL,
          quiz_id TEXT NOT NULL,
          question TEXT NOT NULL,
          option_a TEXT,
          option_b TEXT,
          option_c TEXT,
          option_d TEXT,
          correct_answer TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS quiz_attempts (
          attempt_id TEXT PRIMARY KEY NOT NULL,
          quiz_id TEXT NOT NULL,
          score INTEGER NOT NULL DEFAULT 0,
          total_questions INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS study_sessions (
          session_id TEXT PRIMARY KEY NOT NULL,
          student_id TEXT,
          reviewer_id TEXT,
          started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ended_at TEXT,
          activity_type TEXT,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
          FOREIGN KEY (reviewer_id) REFERENCES reviewers(reviewer_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS quick_captures (
          capture_id TEXT PRIMARY KEY NOT NULL,
          reviewer_id TEXT,
          title TEXT,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reviewer_id) REFERENCES reviewers(reviewer_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_reviewers_student ON reviewers(student_id);
        CREATE INDEX IF NOT EXISTS idx_materials_reviewer ON materials(reviewer_id);
        CREATE INDEX IF NOT EXISTS idx_flashcards_material ON flashcards(material_id);
        CREATE INDEX IF NOT EXISTS idx_quizzes_material ON quizzes(material_id);
        CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON quiz_attempts(quiz_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_reviewer ON study_sessions(reviewer_id);
      `);

      // Existing installations created materials before the content field was
      // needed. Keep that data and apply this additive migration in place.
      const materialColumns = await db.getAllAsync<{ name: string }>(
        'PRAGMA table_info(materials)'
      );
      if (!materialColumns.some(column => column.name === 'content')) {
        await db.execAsync('ALTER TABLE materials ADD COLUMN content TEXT');
      }
      await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    })().catch(error => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
}

// All service reads and writes pass through initialization, so no caller can
// accidentally query a table before schema creation has completed.
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  await initializeDatabase();
  return openDatabase();
}

export async function seedReviewers(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO students (student_id, email, display_name)
     VALUES (?, ?, ?)`,
    'student-1', 'student@example.com', 'TUON Student'
  );
  const reviewers = [
    ['1', 'IT 26', 'Human Computer Interaction', 'Reviewer for Human Computer Interaction.', 72, 12],
    ['2', 'IT 25', 'Database Systems', 'Database concepts and SQL reviewer.', 45, 8],
    ['3', 'Physics', 'General Physics', 'Physics formulas and concepts.', 0, 0],
  ] as const;
  for (const [id, name, subject, description, mastery, dueCards] of reviewers) {
    await db.runAsync(
      `INSERT OR IGNORE INTO reviewers
       (reviewer_id, student_id, name, subject, description, mastery, due_cards)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id, 'student-1', name, subject, description, mastery, dueCards
    );
  }
  const sampleMaterials = [
    ['material-1', '1', 'Week 1 – HCI Intro', 'Flashcards', '24 cards', 90],
    ['material-2', '1', "Week 2 – Norman's Model", 'Quiz', '15 questions', 60],
    ['material-3', '1', 'Week 3 – Affordances', 'Flashcards', '18 cards', 40],
    ['material-4', '1', 'Scanned Notes Batch 1', 'Study Material', '6 pages', 0],
    ['material-5', '2', 'Database Fundamentals', 'Flashcards', '20 cards', 55],
    ['material-6', '2', 'SQL Basics', 'Quiz', '10 questions', 35],
  ] as const;
  for (const [id, reviewerId, title, type, info, mastery] of sampleMaterials) {
    await db.runAsync(
      `INSERT OR IGNORE INTO materials
       (material_id, reviewer_id, title, type, info, mastery)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id, reviewerId, title, type, info, mastery
    );
  }
}
