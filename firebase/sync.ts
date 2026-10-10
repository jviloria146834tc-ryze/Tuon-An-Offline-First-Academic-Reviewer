import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreInstance, initializeFirebase } from './index';
import { getActiveStudentId } from './auth';
import { getDatabase } from '../database/database';
import {
  getPendingMutations,
  removeMutations,
  getSyncMeta,
  setSyncMeta,
  getPendingMutationCount,
  MutationRecord,
} from '../database/sync_queue';

export type SyncResult = {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  timestamp: string;
  error?: string;
};

export type SyncStatusInfo = {
  isConfigured: boolean;
  state: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
  pendingCount: number;
  errorMessage: string | null;
};

/**
 * Checks current sync readiness, queue status, and timestamps.
 */
export async function getSyncStatusInfo(): Promise<SyncStatusInfo> {
  const firebase = initializeFirebase();
  const lastSynced = await getSyncMeta('last_synced_at');
  const syncState = (await getSyncMeta('sync_state')) as SyncStatusInfo['state'] || 'idle';
  const lastError = await getSyncMeta('last_sync_error');
  const pendingCount = await getPendingMutationCount();

  return {
    isConfigured: firebase.configured,
    state: syncState,
    lastSyncedAt: lastSynced,
    pendingCount,
    errorMessage: lastError,
  };
}

/**
 * Execute two-way delta synchronization between local SQLite and Cloud Firestore.
 */
export async function performSync(): Promise<SyncResult> {
  const firestore = getFirestoreInstance();
  if (!firestore) {
    return {
      success: false,
      pushedCount: 0,
      pulledCount: 0,
      timestamp: new Date().toISOString(),
      error: 'Firebase is not configured. Cloud sync requires Firebase credentials.',
    };
  }

  await setSyncMeta('sync_state', 'syncing');
  await setSyncMeta('last_sync_error', '');

  const studentId = await getActiveStudentId();
  let pushedCount = 0;
  let pulledCount = 0;

  try {
    // -------------------------------------------------------------
    // PHASE 1: PUSH LOCAL MUTATIONS TO FIRESTORE
    // -------------------------------------------------------------
    const pendingMutations = await getPendingMutations();
    const committedMutationIds: number[] = [];

    for (const mutation of pendingMutations) {
      const docRef = doc(firestore, mutation.table_name, mutation.record_id);
      const parsedPayload = safeJsonParse(mutation.payload);

      if (mutation.action === 'DELETE') {
        const deleteTimestamp = mutation.created_at || new Date().toISOString();
        await setDoc(
          docRef,
          {
            deleted_at: deleteTimestamp,
            updated_at: deleteTimestamp,
          },
          { merge: true }
        );
        committedMutationIds.push(mutation.mutation_id);
        pushedCount++;
        continue;
      }

      // Action: UPSERT
      const remoteSnap = await getDoc(docRef);

      if (remoteSnap.exists()) {
        const remoteData = remoteSnap.data();
        const remoteUpdatedAt = toIsoString(remoteData.updated_at);
        const localTimestamp = mutation.created_at;

        // Check if remote was deleted after local edit
        if (remoteData.deleted_at && toIsoString(remoteData.deleted_at) > localTimestamp) {
          // Remote delete wins: soft delete local SQLite record
          await applyLocalDeletion(mutation.table_name, mutation.record_id);
          committedMutationIds.push(mutation.mutation_id);
          continue;
        }

        // Conflict Resolution for SRS progress
        if (mutation.table_name === 'srs_progress') {
          const remoteReps = remoteData.repetitions ?? 0;
          const localReps = parsedPayload.repetitions ?? 0;
          const remoteReviewed = toIsoString(remoteData.last_reviewed_at) || '';
          const localReviewed = parsedPayload.last_reviewed_at || '';

          if (localReps < remoteReps && remoteReviewed > localReviewed) {
            // Remote has more recent SRS progress; skip local push
            committedMutationIds.push(mutation.mutation_id);
            continue;
          }
        } else if (
          mutation.table_name !== 'quiz_attempts' &&
          mutation.table_name !== 'study_sessions'
        ) {
          // Last-Write-Wins (LWW) based on UTC timestamp
          if (remoteUpdatedAt && remoteUpdatedAt > localTimestamp) {
            // Remote is newer; skip push so Pull phase reconciles it
            committedMutationIds.push(mutation.mutation_id);
            continue;
          }
        }
      }

      // Push payload to Firestore
      const writeData = {
        ...parsedPayload,
        student_id: parsedPayload.student_id || studentId,
        updated_at: mutation.created_at || new Date().toISOString(),
      };

      await setDoc(docRef, writeData, { merge: true });
      committedMutationIds.push(mutation.mutation_id);
      pushedCount++;
    }

    // Clear processed mutations
    if (committedMutationIds.length > 0) {
      await removeMutations(committedMutationIds);
    }

    // -------------------------------------------------------------
    // PHASE 2: PULL REMOTE UPDATES FROM FIRESTORE
    // -------------------------------------------------------------
    const lastSyncedAt = await getSyncMeta('last_synced_at');

    pulledCount += await pullCollection(firestore, 'reviewers', studentId, lastSyncedAt, async (data) => {
      await upsertLocalReviewer(data);
    });

    pulledCount += await pullCollection(firestore, 'materials', studentId, lastSyncedAt, async (data) => {
      await upsertLocalMaterial(data);
    });

    pulledCount += await pullCollection(firestore, 'flashcards', studentId, lastSyncedAt, async (data) => {
      await upsertLocalFlashcard(data);
    });

    pulledCount += await pullCollection(firestore, 'srs_progress', studentId, lastSyncedAt, async (data) => {
      await upsertLocalSrsProgress(data);
    });

    pulledCount += await pullCollection(firestore, 'quizzes', studentId, lastSyncedAt, async (data) => {
      await upsertLocalQuiz(data);
    });

    pulledCount += await pullCollection(firestore, 'quiz_questions', studentId, lastSyncedAt, async (data) => {
      await upsertLocalQuizQuestion(data);
    });

    pulledCount += await pullCollection(firestore, 'quiz_attempts', studentId, lastSyncedAt, async (data) => {
      await upsertLocalQuizAttempt(data);
    });

    pulledCount += await pullCollection(firestore, 'study_sessions', studentId, lastSyncedAt, async (data) => {
      await upsertLocalStudySession(data);
    });

    pulledCount += await pullCollection(firestore, 'quick_captures', studentId, lastSyncedAt, async (data) => {
      await upsertLocalQuickCapture(data);
    });

    const nowIso = new Date().toISOString();
    await setSyncMeta('last_synced_at', nowIso);
    await setSyncMeta('sync_state', 'synced');
    await setSyncMeta('last_sync_error', '');

    return {
      success: true,
      pushedCount,
      pulledCount,
      timestamp: nowIso,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Synchronization failed.';
    console.warn('Sync failed:', errorMsg);
    await setSyncMeta('sync_state', 'error');
    await setSyncMeta('last_sync_error', errorMsg);
    return {
      success: false,
      pushedCount,
      pulledCount,
      timestamp: new Date().toISOString(),
      error: errorMsg,
    };
  }
}

// -------------------------------------------------------------
// HELPER FUNCTIONS & SQLITE UPSERT RECONCILIATIONS
// -------------------------------------------------------------

async function pullCollection(
  firestore: ReturnType<typeof getFirestoreInstance> & object,
  collectionName: string,
  studentIdFilter: string | undefined,
  lastSyncedAt: string | null,
  applyFn: (data: Record<string, unknown>) => Promise<void>
): Promise<number> {
  let count = 0;
  try {
    const colRef = collection(firestore, collectionName);
    const q = studentIdFilter
      ? query(colRef, where('student_id', '==', studentIdFilter))
      : query(colRef);

    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const updatedAt = toIsoString(data.updated_at);

      // Check delta
      if (lastSyncedAt && updatedAt && updatedAt <= lastSyncedAt) {
        continue;
      }

      await applyFn({ ...data, id: docSnap.id });
      count++;
    }
  } catch (err) {
    console.warn(`Could not pull collection ${collectionName}:`, err);
  }
  return count;
}

async function applyLocalDeletion(table: string, id: string): Promise<void> {
  const db = await getDatabase();
  const idCol = getIdColumnName(table);
  await db.runAsync(
    `UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE ${idCol} = ?`,
    id
  );
}

function getIdColumnName(table: string): string {
  switch (table) {
    case 'reviewers': return 'reviewer_id';
    case 'materials': return 'material_id';
    case 'flashcards': return 'flashcard_id';
    case 'srs_progress': return 'flashcard_id';
    case 'quizzes': return 'quiz_id';
    case 'quiz_questions': return 'question_id';
    case 'quiz_attempts': return 'attempt_id';
    case 'study_sessions': return 'session_id';
    case 'quick_captures': return 'capture_id';
    default: return 'id';
  }
}

async function upsertLocalReviewer(data: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(data.reviewer_id || data.id);
  if (data.deleted_at) {
    await db.runAsync('UPDATE reviewers SET deleted_at = ? WHERE reviewer_id = ?', toIsoString(data.deleted_at), id);
    return;
  }
  await db.runAsync(
    `INSERT INTO reviewers (reviewer_id, student_id, name, subject, description, mastery, due_cards, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(reviewer_id) DO UPDATE SET
       name = excluded.name,
       subject = excluded.subject,
       description = excluded.description,
       mastery = excluded.mastery,
       due_cards = excluded.due_cards,
       updated_at = excluded.updated_at,
       synced_at = CURRENT_TIMESTAMP`,
    id,
    String(data.student_id || ''),
    String(data.name || 'Untitled Reviewer'),
    String(data.subject || 'General'),
    data.description ? String(data.description) : null,
    Number(data.mastery || 0),
    Number(data.due_cards || 0),
    toIsoString(data.updated_at)
  );
}

async function upsertLocalMaterial(data: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(data.material_id || data.id);
  if (data.deleted_at) {
    await db.runAsync('UPDATE materials SET deleted_at = ? WHERE material_id = ?', toIsoString(data.deleted_at), id);
    return;
  }
  const attachmentsVal = data.attachments ? (typeof data.attachments === 'string' ? data.attachments : JSON.stringify(data.attachments)) : null;
  await db.runAsync(
    `INSERT INTO materials (material_id, reviewer_id, title, type, info, content, attachments, mastery, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(material_id) DO UPDATE SET
       title = excluded.title,
       type = excluded.type,
       info = excluded.info,
       content = excluded.content,
       attachments = excluded.attachments,
       mastery = excluded.mastery,
       updated_at = excluded.updated_at,
       synced_at = CURRENT_TIMESTAMP`,
    id,
    String(data.reviewer_id || ''),
    String(data.title || 'Untitled Material'),
    String(data.type || 'Study Material'),
    data.info ? String(data.info) : null,
    data.content ? String(data.content) : null,
    attachmentsVal,
    Number(data.mastery || 0),
    toIsoString(data.updated_at)
  );
}

async function upsertLocalFlashcard(data: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(data.flashcard_id || data.id);
  if (data.deleted_at) {
    await db.runAsync('UPDATE flashcards SET deleted_at = ? WHERE flashcard_id = ?', toIsoString(data.deleted_at), id);
    return;
  }
  await db.runAsync(
    `INSERT INTO flashcards (flashcard_id, material_id, question, answer, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(flashcard_id) DO UPDATE SET
       question = excluded.question,
       answer = excluded.answer,
       updated_at = excluded.updated_at,
       synced_at = CURRENT_TIMESTAMP`,
    id,
    String(data.material_id || ''),
    String(data.question || ''),
    String(data.answer || ''),
    toIsoString(data.updated_at)
  );
}

async function upsertLocalSrsProgress(data: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(data.flashcard_id || data.id);
  await db.runAsync(
    `INSERT INTO srs_progress (flashcard_id, ease_factor, interval_days, repetitions, next_review_date, last_reviewed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(flashcard_id) DO UPDATE SET
       ease_factor = excluded.ease_factor,
       interval_days = excluded.interval_days,
       repetitions = excluded.repetitions,
       next_review_date = excluded.next_review_date,
       last_reviewed_at = excluded.last_reviewed_at,
       updated_at = excluded.updated_at`,
    id,
    Number(data.ease_factor || 2.5),
    Number(data.interval_days || 0),
    Number(data.repetitions || 0),
    data.next_review_date ? String(data.next_review_date) : null,
    data.last_reviewed_at ? String(data.last_reviewed_at) : null,
    toIsoString(data.updated_at)
  );
}

async function upsertLocalQuiz(data: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(data.quiz_id || data.id);
  if (data.deleted_at) {
    await db.runAsync('UPDATE quizzes SET deleted_at = ? WHERE quiz_id = ?', toIsoString(data.deleted_at), id);
    return;
  }
  await db.runAsync(
    `INSERT INTO quizzes (quiz_id, material_id, title, question_count, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(quiz_id) DO UPDATE SET
       title = excluded.title,
       question_count = excluded.question_count,
       updated_at = excluded.updated_at,
       synced_at = CURRENT_TIMESTAMP`,
    id,
    String(data.material_id || ''),
    String(data.title || 'Untitled Quiz'),
    Number(data.question_count || 0),
    toIsoString(data.updated_at)
  );
}

async function upsertLocalQuizQuestion(data: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(data.question_id || data.id);
  if (data.deleted_at) {
    await db.runAsync('UPDATE quiz_questions SET deleted_at = ? WHERE question_id = ?', toIsoString(data.deleted_at), id);
    return;
  }
  await db.runAsync(
    `INSERT INTO quiz_questions (question_id, quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(question_id) DO UPDATE SET
       question = excluded.question,
       option_a = excluded.option_a,
       option_b = excluded.option_b,
       option_c = excluded.option_c,
       option_d = excluded.option_d,
       correct_answer = excluded.correct_answer,
       updated_at = excluded.updated_at,
       synced_at = CURRENT_TIMESTAMP`,
    id,
    String(data.quiz_id || ''),
    String(data.question || ''),
    data.option_a ? String(data.option_a) : null,
    data.option_b ? String(data.option_b) : null,
    data.option_c ? String(data.option_c) : null,
    data.option_d ? String(data.option_d) : null,
    data.correct_answer ? String(data.correct_answer) : null,
    toIsoString(data.updated_at)
  );
}

async function upsertLocalQuizAttempt(data: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(data.attempt_id || data.id);
  await db.runAsync(
    `INSERT INTO quiz_attempts (attempt_id, quiz_id, score, total_questions, completed_at, synced_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(attempt_id) DO UPDATE SET
       score = excluded.score,
       total_questions = excluded.total_questions,
       completed_at = excluded.completed_at,
       synced_at = CURRENT_TIMESTAMP`,
    id,
    String(data.quiz_id || ''),
    Number(data.score || 0),
    Number(data.total_questions || 0),
    toIsoString(data.completed_at)
  );
}

async function upsertLocalStudySession(data: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(data.session_id || data.id);
  await db.runAsync(
    `INSERT INTO study_sessions (session_id, student_id, reviewer_id, started_at, ended_at, activity_type, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(session_id) DO UPDATE SET
       started_at = excluded.started_at,
       ended_at = excluded.ended_at,
       activity_type = excluded.activity_type,
       synced_at = CURRENT_TIMESTAMP`,
    id,
    String(data.student_id || ''),
    data.reviewer_id ? String(data.reviewer_id) : null,
    toIsoString(data.started_at),
    data.ended_at ? toIsoString(data.ended_at) : null,
    String(data.activity_type || 'study')
  );
}

async function upsertLocalQuickCapture(data: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(data.capture_id || data.id);
  if (data.deleted_at) {
    await db.runAsync('UPDATE quick_captures SET deleted_at = ? WHERE capture_id = ?', toIsoString(data.deleted_at), id);
    return;
  }
  const imagesVal = data.images ? (typeof data.images === 'string' ? data.images : JSON.stringify(data.images)) : null;
  await db.runAsync(
    `INSERT INTO quick_captures (capture_id, reviewer_id, title, content, images, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(capture_id) DO UPDATE SET
       title = excluded.title,
       content = excluded.content,
       images = excluded.images,
       updated_at = excluded.updated_at,
       synced_at = CURRENT_TIMESTAMP`,
    id,
    data.reviewer_id ? String(data.reviewer_id) : null,
    data.title ? String(data.title) : null,
    String(data.content || ''),
    imagesVal,
    toIsoString(data.updated_at)
  );
}

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function safeJsonParse(jsonString: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonString);
  } catch {
    return {};
  }
}

import * as Network from 'expo-network';

let autoSyncInitialized = false;
const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Initializes automatic background synchronization when internet connectivity is detected
 * and on a recurring 10-minute heartbeat.
 */
export function initNetworkAutoSync(): () => void {
  if (autoSyncInitialized) return () => {};
  autoSyncInitialized = true;

  let isSyncingAutomatically = false;

  const triggerSync = async (isReachable: boolean | undefined) => {
    if (!isReachable || isSyncingAutomatically) return;
    try {
      isSyncingAutomatically = true;
      await performSync();
    } catch (err) {
      console.warn('[AutoSync] Background sync failed:', err);
    } finally {
      isSyncingAutomatically = false;
    }
  };

  // 1. Initial check on startup
  Network.getNetworkStateAsync()
    .then(state => {
      void triggerSync(state.isConnected && state.isInternetReachable !== false);
    })
    .catch(() => {});

  // 2. Reconnection listener (offline -> online transition)
  let subscription: ReturnType<typeof Network.addNetworkStateListener> | null = null;
  try {
    subscription = Network.addNetworkStateListener(event => {
      const reachable = event.isConnected && event.isInternetReachable !== false;
      if (reachable) {
        void triggerSync(true);
      }
    });
  } catch (err) {
    console.warn('[AutoSync] Network listener not available:', err);
  }

  // 3. Periodic 10-minute background sync
  const intervalId = setInterval(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      const reachable = state.isConnected && state.isInternetReachable !== false;
      if (reachable) {
        void triggerSync(true);
      }
    } catch {
      // Ignore background network check errors
    }
  }, AUTO_SYNC_INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
    if (subscription) {
      subscription.remove();
    }
    autoSyncInitialized = false;
  };
}

