import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { getFirebaseClientConfig } from './config';

export type FirebaseSetup =
  | { configured: false; app: null; firestore: null }
  | { configured: true; app: FirebaseApp; firestore: Firestore };

let setup: FirebaseSetup | null = null;

/** Initializes Firebase and Firestore locally. This does not authenticate,
 * read or write cloud data, or start synchronization. */
export function initializeFirebase(): FirebaseSetup {
  if (setup) return setup;
  const config = getFirebaseClientConfig();
  if (!config) {
    setup = { configured: false, app: null, firestore: null };
    return setup;
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  setup = { configured: true, app, firestore: getFirestore(app) };
  return setup;
}

export function getFirestoreInstance(): Firestore | null {
  return initializeFirebase().firestore;
}
