import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'tuon.db';
const DATABASE_VERSION = 3;

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

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some(c => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
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
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          synced_at TEXT,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS materials (
          material_id TEXT PRIMARY KEY NOT NULL,
          reviewer_id TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          info TEXT,
          content TEXT,
          attachments TEXT,
          mastery REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          synced_at TEXT,
          FOREIGN KEY (reviewer_id) REFERENCES reviewers(reviewer_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS flashcards (
          flashcard_id TEXT PRIMARY KEY NOT NULL,
          material_id TEXT NOT NULL,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          synced_at TEXT,
          FOREIGN KEY (material_id) REFERENCES materials(material_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS srs_progress (
          flashcard_id TEXT PRIMARY KEY NOT NULL,
          ease_factor REAL NOT NULL DEFAULT 2.5,
          interval_days INTEGER NOT NULL DEFAULT 0,
          repetitions INTEGER NOT NULL DEFAULT 0,
          next_review_date TEXT,
          last_reviewed_at TEXT,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flashcard_id) REFERENCES flashcards(flashcard_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS quizzes (
          quiz_id TEXT PRIMARY KEY NOT NULL,
          material_id TEXT NOT NULL,
          title TEXT NOT NULL,
          question_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          synced_at TEXT,
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
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          synced_at TEXT,
          FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS quiz_attempts (
          attempt_id TEXT PRIMARY KEY NOT NULL,
          quiz_id TEXT NOT NULL,
          score INTEGER NOT NULL DEFAULT 0,
          total_questions INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT,
          FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS study_sessions (
          session_id TEXT PRIMARY KEY NOT NULL,
          student_id TEXT,
          reviewer_id TEXT,
          started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ended_at TEXT,
          activity_type TEXT,
          synced_at TEXT,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
          FOREIGN KEY (reviewer_id) REFERENCES reviewers(reviewer_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS quick_captures (
          capture_id TEXT PRIMARY KEY NOT NULL,
          reviewer_id TEXT,
          title TEXT,
          content TEXT NOT NULL,
          images TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          synced_at TEXT,
          FOREIGN KEY (reviewer_id) REFERENCES reviewers(reviewer_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sync_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT
        );

        CREATE TABLE IF NOT EXISTS mutation_queue (
          mutation_id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          action TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS study_reminders (
          reminder_id TEXT PRIMARY KEY NOT NULL,
          reviewer_id TEXT,
          title TEXT NOT NULL,
          selected_days TEXT,
          selected_time TEXT NOT NULL,
          hour INTEGER,
          minute INTEGER,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          mention_flashcards INTEGER NOT NULL DEFAULT 1,
          notification_ids TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reviewer_id) REFERENCES reviewers(reviewer_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications_history (
          history_id TEXT PRIMARY KEY NOT NULL,
          reviewer_id TEXT,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          scheduled_time TEXT,
          finished_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          status TEXT NOT NULL DEFAULT 'completed'
        );

        CREATE INDEX IF NOT EXISTS idx_reviewers_student ON reviewers(student_id);
        CREATE INDEX IF NOT EXISTS idx_materials_reviewer ON materials(reviewer_id);
        CREATE INDEX IF NOT EXISTS idx_flashcards_material ON flashcards(material_id);
        CREATE INDEX IF NOT EXISTS idx_quizzes_material ON quizzes(material_id);
        CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON quiz_attempts(quiz_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_reviewer ON study_sessions(reviewer_id);
        CREATE INDEX IF NOT EXISTS idx_mutation_queue_created ON mutation_queue(created_at);
        CREATE INDEX IF NOT EXISTS idx_reminders_reviewer ON study_reminders(reviewer_id);
        CREATE INDEX IF NOT EXISTS idx_history_finished ON notifications_history(finished_at);
      `);

      // Additive column migrations to support existing databases
      await ensureColumn(db, 'materials', 'content', 'TEXT');
      await ensureColumn(db, 'reviewers', 'is_archived', 'INTEGER DEFAULT 0');
      await ensureColumn(db, 'reviewers', 'deleted_at', 'TEXT');
      await ensureColumn(db, 'reviewers', 'synced_at', 'TEXT');
      await ensureColumn(db, 'materials', 'deleted_at', 'TEXT');
      await ensureColumn(db, 'materials', 'synced_at', 'TEXT');
      await ensureColumn(db, 'flashcards', 'deleted_at', 'TEXT');
      await ensureColumn(db, 'flashcards', 'synced_at', 'TEXT');
      await ensureColumn(db, 'srs_progress', 'updated_at', 'TEXT');
      await ensureColumn(db, 'quizzes', 'deleted_at', 'TEXT');
      await ensureColumn(db, 'quizzes', 'synced_at', 'TEXT');
      await ensureColumn(db, 'quizzes', 'updated_at', 'TEXT');
      await ensureColumn(db, 'quiz_questions', 'deleted_at', 'TEXT');
      await ensureColumn(db, 'quiz_questions', 'synced_at', 'TEXT');
      await ensureColumn(db, 'quiz_questions', 'updated_at', 'TEXT');
      await ensureColumn(db, 'quiz_attempts', 'synced_at', 'TEXT');
      await ensureColumn(db, 'study_sessions', 'synced_at', 'TEXT');
      await ensureColumn(db, 'quick_captures', 'deleted_at', 'TEXT');
      await ensureColumn(db, 'quick_captures', 'synced_at', 'TEXT');
      await ensureColumn(db, 'quick_captures', 'updated_at', 'TEXT');
      await ensureColumn(db, 'quick_captures', 'images', 'TEXT');
      await ensureColumn(db, 'materials', 'attachments', 'TEXT');
      await ensureColumn(db, 'study_reminders', 'hour', 'INTEGER');
      await ensureColumn(db, 'study_reminders', 'minute', 'INTEGER');
      await ensureColumn(db, 'study_reminders', 'notification_ids', 'TEXT');

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

/**
 * Seeds rich, realistic presentation demo data for defense and live evaluations.
 * Replaces or seeds 3 comprehensive reviewers with due cards, flashcards, study streak sessions, and quizzes.
 */
export async function seedDemoPresentationData(targetStudentId?: string): Promise<void> {
  const db = await getDatabase();
  const studentId = targetStudentId || 'student-1';

  // 1. Ensure student exists
  await db.runAsync(
    `INSERT OR IGNORE INTO students (student_id, email, display_name)
     VALUES (?, ?, ?)`,
    studentId, 'student@example.com', 'TUON Student'
  );

  // 2. Demo Reviewers
  const demoReviewers = [
    {
      id: 'demo-rev-1',
      name: 'IT 26: Human Computer Interaction',
      subject: 'HCI & Interaction Design',
      description: 'Norman design principles, usability heuristics, affordances, and cognitive models.',
      mastery: 75,
      dueCards: 8,
    },
    {
      id: 'demo-rev-2',
      name: 'IT 25: Database Systems',
      subject: 'Database Architecture & SQL',
      description: 'Relational algebra, normalization (1NF-3NF), indexing, and transaction ACID properties.',
      mastery: 60,
      dueCards: 6,
    },
    {
      id: 'demo-rev-3',
      name: 'General Physics',
      subject: 'Classical Mechanics & Energy',
      description: 'Newtonian laws of motion, kinematics, work-energy theorem, and thermodynamics.',
      mastery: 45,
      dueCards: 5,
    },
  ];

  for (const rev of demoReviewers) {
    await db.runAsync(
      `INSERT INTO reviewers (reviewer_id, student_id, name, subject, description, mastery, due_cards)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(reviewer_id) DO UPDATE SET
         name = excluded.name,
         subject = excluded.subject,
         description = excluded.description,
         mastery = excluded.mastery,
         due_cards = excluded.due_cards,
         deleted_at = NULL`,
      rev.id, studentId, rev.name, rev.subject, rev.description, rev.mastery, rev.dueCards
    );
  }

  // 3. Demo Study Materials
  const demoMaterials = [
    {
      id: 'demo-mat-1',
      reviewerId: 'demo-rev-1',
      title: 'Norman Design Principles & Affordances',
      type: 'Study Material',
      info: '1,420 characters',
      content: 'Key HCI Principles:\n1. Affordance: The perceived and actual properties of an object that indicate how it can be used.\n2. Signifier: Clues where action should take place.\n3. Feedback: Sending back information about what action has been completed.\n4. Mapping: Relationship between control and results in the world.\n5. Consistency: Designing interfaces to use similar elements for similar tasks.',
    },
    {
      id: 'demo-mat-2',
      reviewerId: 'demo-rev-1',
      title: 'HCI Design Flashcard Deck',
      type: 'Flashcards',
      info: '8 cards',
      content: 'Spaced repetition deck for HCI exam review.',
    },
    {
      id: 'demo-mat-3',
      reviewerId: 'demo-rev-2',
      title: 'Database Normalization & ACID Rules',
      type: 'Study Material',
      info: '980 characters',
      content: 'ACID Properties of Transactions:\n- Atomicity: All operations in the transaction succeed, or all fail.\n- Consistency: Database moves between valid states following constraints.\n- Isolation: Concurrent transactions do not interfere with each other.\n- Durability: Once committed, state changes survive system crashes.\n\nNormalization Forms:\n- 1NF: Atomic values, no repeating groups.\n- 2NF: 1NF + no partial functional dependencies.\n- 3NF: 2NF + no transitive dependencies.',
    },
    {
      id: 'demo-mat-4',
      reviewerId: 'demo-rev-2',
      title: 'SQL & Database Flashcards',
      type: 'Flashcards',
      info: '6 cards',
      content: 'Spaced repetition deck for SQL concepts.',
    },
    {
      id: 'demo-mat-5',
      reviewerId: 'demo-rev-2',
      title: 'Database Systems Midterm Quiz',
      type: 'Quiz',
      info: '5 questions',
      content: JSON.stringify({ question_type: 'Multiple Choice', difficulty: 'Medium' }),
    },
  ];

  for (const mat of demoMaterials) {
    await db.runAsync(
      `INSERT INTO materials (material_id, reviewer_id, title, type, info, content, mastery)
       VALUES (?, ?, ?, ?, ?, ?, 60)
       ON CONFLICT(material_id) DO UPDATE SET
         title = excluded.title,
         type = excluded.type,
         info = excluded.info,
         content = excluded.content,
         deleted_at = NULL`,
      mat.id, mat.reviewerId, mat.title, mat.type, mat.info, mat.content
    );
  }

  // 4. Demo Flashcards & SRS Progress
  const demoCards = [
    { id: 'demo-card-1', matId: 'demo-mat-2', q: 'What is an affordance in HCI?', a: 'A relationship between the properties of an object and the capabilities of the agent using it.' },
    { id: 'demo-card-2', matId: 'demo-mat-2', q: 'What is a signifier?', a: 'Any perceivable cue or signal that indicates what action can be taken and where.' },
    { id: 'demo-card-3', matId: 'demo-mat-2', q: 'What does Gulf of Execution refer to?', a: 'The degree of difficulty the user experiences in figuring out how to act upon the system.' },
    { id: 'demo-card-4', matId: 'demo-mat-2', q: 'What does Gulf of Evaluation refer to?', a: 'The user effort required to assess the system state and see if their goal was achieved.' },
    { id: 'demo-card-5', matId: 'demo-mat-4', q: 'What does ACID stand for in DBMS?', a: 'Atomicity, Consistency, Isolation, Durability.' },
    { id: 'demo-card-6', matId: 'demo-mat-4', q: 'What condition satisfies Third Normal Form (3NF)?', a: 'It must be in 2NF and have no transitive functional dependencies between non-key attributes.' },
  ];

  for (const card of demoCards) {
    await db.runAsync(
      `INSERT INTO flashcards (flashcard_id, material_id, question, answer)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(flashcard_id) DO UPDATE SET
         question = excluded.question,
         answer = excluded.answer,
         deleted_at = NULL`,
      card.id, card.matId, card.q, card.a
    );

    await db.runAsync(
      `INSERT INTO srs_progress (flashcard_id, ease_factor, interval_days, repetitions, next_review_date, last_reviewed_at)
       VALUES (?, 2.5, 0, 1, date('now'), CURRENT_TIMESTAMP)
       ON CONFLICT(flashcard_id) DO UPDATE SET
         interval_days = 0,
         next_review_date = date('now')`,
      card.id
    );
  }

  // 5. Demo Quiz & Questions
  const quizId = 'demo-quiz-1';
  await db.runAsync(
    `INSERT INTO quizzes (quiz_id, material_id, title, question_count)
     VALUES (?, 'demo-mat-5', 'Database Systems Midterm Quiz', 3)
     ON CONFLICT(quiz_id) DO UPDATE SET deleted_at = NULL`,
    quizId
  );

  const quizQuestions = [
    {
      id: 'demo-qq-1',
      q: 'Which ACID property ensures that all transaction steps succeed or none do?',
      a: 'Atomicity', b: 'Consistency', c: 'Isolation', d: 'Durability',
      correct: '0',
    },
    {
      id: 'demo-qq-2',
      q: 'Which normal form eliminates transitive functional dependencies?',
      a: '1NF', b: '2NF', c: '3NF', d: 'BCNF',
      correct: '2',
    },
    {
      id: 'demo-qq-3',
      q: 'Which SQL clause is used to filter aggregated group results?',
      a: 'WHERE', b: 'HAVING', c: 'GROUP BY', d: 'ORDER BY',
      correct: '1',
    },
  ];

  for (const qq of quizQuestions) {
    await db.runAsync(
      `INSERT INTO quiz_questions (question_id, quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(question_id) DO UPDATE SET
         question = excluded.question,
         option_a = excluded.option_a,
         option_b = excluded.option_b,
         option_c = excluded.option_c,
         option_d = excluded.option_d,
         correct_answer = excluded.correct_answer,
         deleted_at = NULL`,
      qq.id, quizId, qq.q, qq.a, qq.b, qq.c, qq.d, qq.correct
    );
  }

  // 6. Demo 5-Day Study Streak (Backdated study sessions for continuous streak)
  for (let i = 0; i < 5; i++) {
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() - i);
    const dateIso = sessionDate.toISOString();
    await db.runAsync(
      `INSERT INTO study_sessions (session_id, student_id, reviewer_id, started_at, ended_at, activity_type)
       VALUES (?, ?, 'demo-rev-1', ?, ?, 'study')
       ON CONFLICT(session_id) DO NOTHING`,
      `demo-session-${i}`, studentId, dateIso, dateIso
    );
  }
}
