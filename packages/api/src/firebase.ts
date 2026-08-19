import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Analytics | null = null;

export function initializeFirebase(): FirebaseApp {
  if (app) return app;
  
  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase configuration is missing. Please check environment variables.");
  }
  
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
    auth = getAuth(app!);
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    initializeFirebase();
    db = getFirestore(app!);
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    initializeFirebase();
    storage = getStorage(app!);
  }
  return storage;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;
  
  initializeFirebase();
  const supported = await isSupported();
  if (supported) {
    analytics = getAnalytics(app!);
  }
  return analytics;
}

export function connectEmulators(): void {
  if (process.env.NODE_ENV !== "development") return;
  
  initializeFirebase();
  
  const authInstance = getFirebaseAuth();
  const dbInstance = getFirestoreDb();
  const storageInstance = getFirebaseStorage();
  
  try {
    connectAuthEmulator(authInstance, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(dbInstance, "localhost", 8080);
    connectStorageEmulator(storageInstance, "localhost", 9199);
    console.log("Connected to Firebase emulators");
  } catch (error) {
    console.warn("Failed to connect to Firebase emulators:", error);
  }
}

export const firebaseApp = () => initializeFirebase();
export const firebaseAuth = () => getFirebaseAuth();
export const firebaseDb = () => getFirestoreDb();
export const firebaseStorage = () => getFirebaseStorage();
export const firebaseAnalytics = () => getFirebaseAnalytics();

export type { FirebaseApp, Auth, Firestore, FirebaseStorage, Analytics };