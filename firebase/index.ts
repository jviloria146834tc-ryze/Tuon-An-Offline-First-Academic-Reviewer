import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import {
  Auth,
  getAuth,
  initializeAuth,
  // @ts-expect-error - getReactNativePersistence is exported by React Native bundle of firebase/auth
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseClientConfig } from './config';

export type FirebaseSetup =
  | { configured: false; app: null; firestore: null; auth: null }
  | { configured: true; app: FirebaseApp; firestore: Firestore; auth: Auth };

let setup: FirebaseSetup | null = null;

/** Initializes Firebase, Firestore, and Auth locally. This does not authenticate,
 * read or write cloud data, or start synchronization. */
export function initializeFirebase(): FirebaseSetup {
  if (setup) return setup;
  const config = getFirebaseClientConfig();
  if (!config) {
    setup = { configured: false, app: null, firestore: null, auth: null };
    return setup;
  }
  const app = getApps().length ? getApp() : initializeApp(config);

  let auth: Auth;
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }

  setup = {
    configured: true,
    app,
    firestore: getFirestore(app),
    auth,
  };
  return setup;
}

export function getFirestoreInstance(): Firestore | null {
  return initializeFirebase().firestore;
}

export function getAuthInstance(): Auth | null {
  return initializeFirebase().auth;
}
