import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthInstance, getFirestoreInstance } from './index';
import { getDatabase } from '../database/database';
import { setSyncMeta, getSyncMeta } from '../database/sync_queue';
import { queueMutation } from '../database/sync_queue';

export type AuthResult = {
  success: boolean;
  user?: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
  error?: string;
};

/**
 * Register a new student account using Firebase Authentication.
 * Creates local SQLite student and Cloud Firestore profile.
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<AuthResult> {
  const auth = getAuthInstance();
  if (!auth) {
    return {
      success: false,
      error: 'Firebase is not configured. Please check your .env configuration.',
    };
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const user = cred.user;

    const name = displayName?.trim() || email.split('@')[0] || 'TUON Student';
    if (displayName) {
      await updateProfile(user, { displayName: name }).catch(() => {});
    }

    // Persist in Cloud Firestore if available
    const firestore = getFirestoreInstance();
    if (firestore) {
      try {
        const studentRef = doc(firestore, 'students', user.uid);
        await setDoc(studentRef, {
          student_id: user.uid,
          email: user.email,
          display_name: name,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        }, { merge: true });
      } catch (cloudErr) {
        console.warn('Could not save user to Firestore immediately; will sync later:', cloudErr);
      }
    }

    // Persist to local SQLite
    await persistLocalStudent(user.uid, user.email, name);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: name,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed.';
    return { success: false, error: formatAuthError(message) };
  }
}

/**
 * Authenticate existing student using Firebase Authentication.
 */
export async function loginWithEmail(
  email: string,
  pass: string
): Promise<AuthResult> {
  const auth = getAuthInstance();
  if (!auth) {
    return {
      success: false,
      error: 'Firebase is not configured. Please check your .env configuration.',
    };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const user = cred.user;

    let displayName = user.displayName;

    // Fetch display name from Firestore if not set in Auth token
    const firestore = getFirestoreInstance();
    if (firestore) {
      try {
        const studentDoc = await getDoc(doc(firestore, 'students', user.uid));
        if (studentDoc.exists() && studentDoc.data().display_name) {
          displayName = studentDoc.data().display_name;
        }
      } catch {
        // Fallback to existing display name or email prefix
      }
    }

    const finalName = displayName || user.email?.split('@')[0] || 'TUON Student';

    // Persist to local SQLite
    await persistLocalStudent(user.uid, user.email, finalName);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: finalName,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed.';
    return { success: false, error: formatAuthError(message) };
  }
}

/**
 * Signs out current user from Firebase and updates local sync state.
 */
export async function logoutUser(): Promise<void> {
  const auth = getAuthInstance();
  if (auth) {
    await signOut(auth).catch(() => {});
  }
  // Retain data in SQLite, but clear active sync student
  await setSyncMeta('active_student_id', '');
}

/**
 * Returns current Firebase Auth user or null.
 */
export function getCurrentAuthUser(): User | null {
  const auth = getAuthInstance();
  return auth?.currentUser ?? null;
}

/** Save a display name locally first so profile editing works offline too. */
export async function updateStudentDisplayName(displayName: string): Promise<void> {
  const name = displayName.trim();
  if (!name) throw new Error('Enter your name before saving.');
  const user = getCurrentAuthUser();
  const studentId = await getActiveStudentId();
  const email = user?.email ?? null;
  await persistLocalStudent(studentId, email, name);
  await queueMutation('students', studentId, 'UPSERT', {
    student_id: studentId,
    email,
    display_name: name,
  });
  if (user) {
    await updateProfile(user, { displayName: name }).catch(error => {
      console.warn('Profile name saved locally; Firebase Auth update will need a connection.', error);
    });
    const firestore = getFirestoreInstance();
    if (firestore) {
      void setDoc(doc(firestore, 'students', user.uid), {
        student_id: user.uid,
        email: user.email,
        display_name: name,
        updated_at: serverTimestamp(),
      }, { merge: true }).catch(error => console.warn('Could not update cloud profile yet.', error));
    }
  }
}

/**
 * Get active student ID from SQLite sync metadata.
 */
export async function getActiveStudentId(): Promise<string> {
  const metaId = await getSyncMeta('active_student_id');
  if (metaId) return metaId;
  const authUser = getCurrentAuthUser();
  if (authUser) {
    await setSyncMeta('active_student_id', authUser.uid);
    return authUser.uid;
  }
  return 'student-1'; // Default local student for guest/offline mode
}

/**
 * Save student profile in local SQLite database and update active ID.
 */
export async function persistLocalStudent(
  studentId: string,
  email: string | null,
  displayName: string | null
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO students (student_id, email, display_name, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(student_id) DO UPDATE SET
       email = excluded.email,
       display_name = excluded.display_name,
       updated_at = CURRENT_TIMESTAMP`,
    studentId,
    email,
    displayName
  );
  await setSyncMeta('active_student_id', studentId);
}

/**
 * Listens for auth state changes.
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  const auth = getAuthInstance();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Converts Firebase raw error codes into friendly user messages.
 */
function formatAuthError(msg: string): string {
  if (msg.includes('auth/invalid-email')) return 'Invalid email address format.';
  if (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('auth/wrong-password')) return 'Incorrect password.';
  if (msg.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Please log in.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (msg.includes('auth/network-request-failed')) {
    return 'Network connection failed. You can continue offline.';
  }
  return msg;
}
