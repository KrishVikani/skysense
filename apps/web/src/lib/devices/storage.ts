import {
  createAdminDocumentInSubcollection,
  deleteAdminDocumentInSubcollection,
  getAdminDocumentsInSubcollection,
  isAdminConfigured,
} from "@skysense/api/admin";
import type { HeartbeatRecord } from "./heartbeat";
import type { StoredDeviceReading } from "./reading";
import { SENSOR_KEYS } from "./sensors";

/**
 * Storage layer for RAW device readings (server-side trusted path).
 *
 * ARCHITECTURE: The device ingestion API is a server route, so persistence
 * runs through the Firebase Admin SDK (`@skysense/api/admin`) with a trusted
 * service identity. The browser keeps using the Firebase web SDK via
 * `@skysense/api` for user auth/profiles — browser Firestore access is kept
 * separate from server persistence. `deviceReadings` remains deny-by-default
 * in Firestore security rules; only the server (Admin SDK) writes/reads it.
 *
 * STRUCTURE: raw readings live at `deviceReadings/{deviceId}/readings/{id}` —
 * a subcollection, so querying a device's readings needs no composite index.
 *
 * RAW vs DERIVED: only raw sensor values and provenance metadata are stored.
 * Derived analytics/AI/alert data is computed on demand and kept elsewhere.
 */

export const DEVICE_READINGS_COLLECTION = "deviceReadings";
export const DEVICE_READINGS_SUBCOLLECTION = "readings";
/** Heartbeats live at deviceReadings/{deviceId}/heartbeat/latest. */
export const DEVICE_HEARTBEAT_SUBCOLLECTION = "heartbeat";
export const DEVICE_HEARTBEAT_DOC = "latest";

/** True when the server has a credential (or emulator) that can persist. */
export function isStorageConfigured(): boolean {
  return isAdminConfigured();
}

function readingsPath(deviceId: string): [string, string, string] {
  return [DEVICE_READINGS_COLLECTION, deviceId, DEVICE_READINGS_SUBCOLLECTION];
}

/** Default values for sensor fields that may be missing in historical Firestore documents. */
const SENSOR_DEFAULTS = {
  airQuality: null,
  lightLevel: null,
  windSpeed: null,
  windDirection: null,
  rainfall: null,
} as const;

/** Merges sensor defaults into a stored reading, preserving existing values. */
function withSensorDefaults(row: StoredDeviceReading): StoredDeviceReading {
  return { ...SENSOR_DEFAULTS, ...row };
}

/** Strips undefined fields (Firestore rejects undefined; null is preserved). Ensures all sensor keys are present. */
function sanitize(reading: StoredDeviceReading): Record<string, unknown> {
  const base = Object.fromEntries(
    Object.entries({ ...reading }).filter(([, value]) => value !== undefined)
  ) as Record<string, unknown>;
  delete base.id;

  for (const key of SENSOR_KEYS) {
    if (!(key in base)) {
      base[key] = null;
    }
  }

  return base;
}

/**
 * Persists one raw reading via the Admin SDK. Returns the new document id.
 * Throws when persistence is unavailable (e.g. server credential missing).
 */
export async function saveDeviceReading(reading: StoredDeviceReading): Promise<string> {
  const [collectionName, docId, subcollection] = readingsPath(reading.deviceId);
  const sanitized = sanitize(reading);
  
  // Ensure all sensor fields are explicitly present as own properties for Firestore write
  const toWrite = { ...SENSOR_DEFAULTS, ...sanitized };
  
  console.log('[DIAG] saveDeviceReading WRITE:', {
    deviceId: reading.deviceId,
    telemetryLightLevel: reading.lightLevel,
    storedReadingLightLevel: reading.lightLevel,
    sanitizedKeys: Object.keys(sanitized),
    sanitizedLightLevel: sanitized.lightLevel,
    sanitizedRainfall: sanitized.rainfall,
    toWriteLightLevel: toWrite.lightLevel,
    collection: collectionName,
    docId: docId,
    subcollection: subcollection,
    firebaseProject: process.env.FIREBASE_PROJECT_ID || 'NOT_SET',
  });
  
  const readingId = await createAdminDocumentInSubcollection(
    collectionName,
    docId,
    subcollection,
    toWrite
  );
  
  // Read back the document we just wrote
  const readBack = await getAdminDocumentsInSubcollection<StoredDeviceReading>(
    collectionName,
    docId,
    subcollection,
    { orderByField: "timestamp", orderDir: "desc", limitCount: 1 }
  );
  
  console.log('[DIAG] saveDeviceReading READ-BACK:', {
    readingId,
    readBackLightLevel: readBack[0]?.lightLevel,
    readBackRainfall: readBack[0]?.rainfall,
    readBackTimestamp: readBack[0]?.timestamp,
    readBackPath: `${collectionName}/${docId}/${subcollection}/${readBack[0]?.id}`,
  });
  
  return readingId;
}

/** Returns the most recent stored reading for a device, or null when none. */
export async function getLatestDeviceReading(
  deviceId: string
): Promise<StoredDeviceReading | null> {
  const [collectionName, docId, subcollection] = readingsPath(deviceId);
  const rows = await getAdminDocumentsInSubcollection<StoredDeviceReading>(
    collectionName,
    docId,
    subcollection,
    { orderByField: "timestamp", orderDir: "desc", limitCount: 1 }
  );
  return rows.length > 0 ? withSensorDefaults(rows[0]) : null;
}

/** Returns the most recent `max` stored readings for a device (default 50). */
export async function getDeviceReadingHistory(
  deviceId: string,
  max = 50
): Promise<StoredDeviceReading[]> {
  const [collectionName, docId, subcollection] = readingsPath(deviceId);
  const rows = await getAdminDocumentsInSubcollection<StoredDeviceReading>(
    collectionName,
    docId,
    subcollection,
    { orderByField: "timestamp", orderDir: "desc", limitCount: max }
  );
  return rows.map(withSensorDefaults);
}

/** Deletes one stored reading (used by tests/admin operations). */
export async function deleteDeviceReading(deviceId: string, readingId: string): Promise<void> {
  const [collectionName, docId, subcollection] = readingsPath(deviceId);
  return deleteAdminDocumentInSubcollection(collectionName, docId, subcollection, readingId);
}

/**
 * Records (overwrites) the latest heartbeat for a device. A heartbeat is only
 * written when real telemetry has been accepted by the ingestion API — it is
 * the source of truth for `online`/`stale`/`offline` derivation.
 */
export async function saveDeviceHeartbeat(heartbeat: HeartbeatRecord): Promise<void> {
  const [collectionName, docId] = readingsPath(heartbeat.deviceId);
  await createAdminDocumentInSubcollection(
    collectionName,
    docId,
    DEVICE_HEARTBEAT_SUBCOLLECTION,
    { ...heartbeat },
    DEVICE_HEARTBEAT_DOC
  );
}

/** Returns the most recent heartbeat for a device, or null when never seen. */
export async function getDeviceHeartbeat(
  deviceId: string
): Promise<HeartbeatRecord | null> {
  const [collectionName, docId] = readingsPath(deviceId);
  const rows = await getAdminDocumentsInSubcollection<HeartbeatRecord>(
    collectionName,
    docId,
    DEVICE_HEARTBEAT_SUBCOLLECTION,
    {}
  );
  return rows.length > 0 ? rows[0] : null;
}