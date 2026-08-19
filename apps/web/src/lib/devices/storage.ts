import {
  createAdminDocumentInSubcollection,
  deleteAdminDocumentInSubcollection,
  getAdminDocumentsInSubcollection,
  isAdminConfigured,
} from "@skysense/api/admin";
import type { HeartbeatRecord } from "./heartbeat";
import type { StoredDeviceReading } from "./reading";

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

/** Strips undefined fields (Firestore rejects undefined; null is preserved). */
function sanitize(reading: StoredDeviceReading): Record<string, unknown> {
  const record = Object.fromEntries(
    Object.entries({ ...reading }).filter(([, value]) => value !== undefined)
  ) as Record<string, unknown>;
  delete record.id;
  return record;
}

/**
 * Persists one raw reading via the Admin SDK. Returns the new document id.
 * Throws when persistence is unavailable (e.g. server credential missing).
 */
export async function saveDeviceReading(reading: StoredDeviceReading): Promise<string> {
  const [collectionName, docId, subcollection] = readingsPath(reading.deviceId);
  return createAdminDocumentInSubcollection(
    collectionName,
    docId,
    subcollection,
    sanitize(reading)
  );
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
  return rows.length > 0 ? rows[0] : null;
}

/** Returns the most recent `max` stored readings for a device (default 50). */
export async function getDeviceReadingHistory(
  deviceId: string,
  max = 50
): Promise<StoredDeviceReading[]> {
  const [collectionName, docId, subcollection] = readingsPath(deviceId);
  return getAdminDocumentsInSubcollection<StoredDeviceReading>(
    collectionName,
    docId,
    subcollection,
    { orderByField: "timestamp", orderDir: "desc", limitCount: max }
  );
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