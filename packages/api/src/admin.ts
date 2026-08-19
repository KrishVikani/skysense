import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  App,
  AppOptions,
} from "firebase-admin/app";
import { getFirestore, Firestore, Query } from "firebase-admin/firestore";

/**
 * Server-side Firebase Admin layer — the TRUSTED persistence path.
 *
 * Why this exists:
 * The browser keeps using the Firebase web SDK (`firebase`) through the
 * existing `@skysense/api` client layer for auth, profiles, etc. That client
 * SDK runs against Firestore security rules and carries no server identity.
 * The device ingestion API is a SERVER-side route: it must persist device
 * readings with a trusted service identity and enforce the device token in
 * server code (rules cannot see HTTP headers). The Firebase Admin SDK provides
 * exactly that trusted identity and bypasses Firestore rules, so the
 * `deviceReadings` collection stays deny-by-default for all clients.
 *
 * SECURITY:
 * - Credentials are read ONLY from the server environment. Nothing here is
 *   ever prefixed NEXT_PUBLIC_, so it can never reach a browser bundle.
 * - No secret is hard-coded. A missing credential makes persistence fail
 *   loudly (descriptive error) rather than silently.
 * - The Admin app and Firestore instance are initialized exactly once per
 *   process (singleton + getApps() guard against HMR duplication).
 *
 * CONFIGURATION (see apps/web/.env.example — placeholders only):
 *   A) FIREBASE_SERVICE_ACCOUNT       full service-account key JSON (string)
 *   B) GOOGLE_APPLICATION_CREDENTIALS path to a service-account key file
 *   C) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   D) FIRESTORE_EMULATOR_HOST        local emulator (dev only, no key needed)
 */

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

/** True when the server has a credential (or emulator) that can persist. */
export function isAdminConfigured(): boolean {
  if (process.env.FIRESTORE_EMULATOR_HOST) return true;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return true;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

function buildAdminOptions(): AppOptions {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    const sa = JSON.parse(serviceAccountJson) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    return {
      projectId: sa.project_id,
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    };
  }

  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      }),
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID ?? undefined,
      credential: applicationDefault(),
    };
  }

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    // Emulator mode needs no credential; a local project id is used.
    return { projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-skysense" };
  }

  throw new Error(
    "Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT, " +
      "GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, " +
      "or FIRESTORE_EMULATOR_HOST (dev only)."
  );
}

/** Returns the process-wide Firebase Admin app, initializing it exactly once. */
export function getAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }
  adminApp = initializeApp(buildAdminOptions());
  return adminApp;
}

/** Returns the process-wide Admin Firestore instance (initialized once). */
export function getAdminFirestore(): Firestore {
  if (adminDb) return adminDb;
  if (!isAdminConfigured()) {
    throw new Error(
      "Firebase Admin persistence is not configured: server-side credential missing. " +
        "Set FIREBASE_SERVICE_ACCOUNT (full service-account JSON), GOOGLE_APPLICATION_CREDENTIALS " +
        "(path to a service-account key), FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, " +
        "or FIRESTORE_EMULATOR_HOST for local development. Persistence is unavailable until then."
    );
  }
  adminDb = getFirestore(getAdminApp());
  return adminDb;
}

/** Simple query descriptor used by the admin subcollection helpers. */
export interface AdminQuerySpec {
  orderByField?: string;
  orderDir?: "asc" | "desc";
  limitCount?: number;
}

/** Creates a document inside `collectionName/{docId}/{subcollection}` via Admin. */
export async function createAdminDocumentInSubcollection(
  collectionName: string,
  docId: string,
  subcollection: string,
  data: Record<string, unknown>,
  subId?: string
): Promise<string> {
  const db = getAdminFirestore();
  const col = db.collection(collectionName).doc(docId).collection(subcollection);
  const record: Record<string, unknown> = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const ref = subId ? col.doc(subId) : col.doc();
  await ref.set(record);
  return ref.id;
}

/** Queries documents inside `collectionName/{docId}/{subcollection}` via Admin. */
export async function getAdminDocumentsInSubcollection<T>(
  collectionName: string,
  docId: string,
  subcollection: string,
  spec: AdminQuerySpec = {}
): Promise<T[]> {
  const db = getAdminFirestore();
  let queryRef: Query = db.collection(collectionName).doc(docId).collection(subcollection);
  if (spec.orderByField) queryRef = queryRef.orderBy(spec.orderByField, spec.orderDir ?? "asc");
  if (spec.limitCount) queryRef = queryRef.limit(spec.limitCount);
  const snapshot = await queryRef.get();
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  })) as T[];
}

/** Deletes one document inside `collectionName/{docId}/{subcollection}` via Admin. */
export async function deleteAdminDocumentInSubcollection(
  collectionName: string,
  docId: string,
  subcollection: string,
  subId: string
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(collectionName).doc(docId).collection(subcollection).doc(subId).delete();
}