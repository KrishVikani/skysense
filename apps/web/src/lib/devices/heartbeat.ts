import type { ESP32Telemetry } from "./contract";
import type { RegisteredDevice } from "./registry";
import { SENSOR_KEYS } from "./sensors";
import type { DeviceConnectionState } from "./types";

/**
 * Device heartbeat / last-seen infrastructure (SERVER-SIDE).
 *
 * A "heartbeat" is recorded whenever the ingestion API accepts real telemetry
 * from a known device. The recorded `lastSeenAt` is the SERVER receipt time
 * (not the device-reported timestamp), so a device that buffers old readings
 * is still marked seen at the moment its telemetry reached the platform.
 *
 * Connection state is DERIVED from the heartbeat:
 *   - no heartbeat ever received        → not_connected (ESP32 NOT connected)
 *   - heartbeat fresh (< stale window)  → online        (real telemetry received)
 *   - heartbeat within offline window   → stale         (recently seen, now quiet)
 *   - heartbeat older than offline cut  → offline       (long silent)
 *
 * A device is NEVER called `online` unless actual telemetry/heartbeat has been
 * received. In Simulation Mode no heartbeat exists, so the device stays
 * `simulation` / `not_connected` — nothing here fakes hardware connectivity.
 *
 * THRESHOLDS are configurable via server environment (never committed, never
 * NEXT_PUBLIC_): `SKYSENSE_DEVICE_STALE_AFTER_MS` and
 * `SKYSENSE_DEVICE_OFFLINE_AFTER_MS`. Defaults below keep the code free of
 * scattered magic numbers.
 */

/** Default window after which a connected device is considered STALE (5 min). */
export const HEARTBEAT_STALE_AFTER_MS_DEFAULT = 5 * 60 * 1000;
/** Default window after which a stale device is considered OFFLINE (15 min). */
export const HEARTBEAT_OFFLINE_AFTER_MS_DEFAULT = 15 * 60 * 1000;

export const HEARTBEAT_STALE_AFTER_ENV = "SKYSENSE_DEVICE_STALE_AFTER_MS";
export const HEARTBEAT_OFFLINE_AFTER_ENV = "SKYSENSE_DEVICE_OFFLINE_AFTER_MS";

/** Configuration for device connection state derivation thresholds. */
export type ConnectionThresholds = {
  /** Age in ms after which a device is considered stale (default: 5 min). */
  staleAfterMs: number;
  /** Age in ms after which a device is considered offline (default: 15 min). */
  offlineAfterMs: number;
};

/** Default connection thresholds (configurable via env vars, never NEXT_PUBLIC_). */
export const DEFAULT_CONNECTION_THRESHOLDS: ConnectionThresholds = {
  staleAfterMs: HEARTBEAT_STALE_AFTER_MS_DEFAULT,
  offlineAfterMs: HEARTBEAT_OFFLINE_AFTER_MS_DEFAULT,
};

function parseEnvMs(envName: string, fallback: number): number {
  if (typeof process === "undefined" || !process.env) return fallback;
  const raw = process.env[envName];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** STALE threshold in ms (configurable, defaults to 5 minutes). */
export function getStaleAfterMs(): number {
  return parseEnvMs(HEARTBEAT_STALE_AFTER_ENV, HEARTBEAT_STALE_AFTER_MS_DEFAULT);
}

/** OFFLINE threshold in ms (configurable, defaults to 15 minutes). */
export function getOfflineAfterMs(): number {
  return parseEnvMs(HEARTBEAT_OFFLINE_AFTER_ENV, HEARTBEAT_OFFLINE_AFTER_MS_DEFAULT);
}

/**
 * Persisted heartbeat record for one device. Stored by the server at
 * `deviceReadings/{deviceId}/heartbeat/latest` and read by the status endpoint.
 */
export interface HeartbeatRecord {
  deviceId: string;
  /** Server-side receipt time of the latest telemetry (ISO-8601). */
  lastSeenAt: string;
  receivedAt: string;
  firmwareVersion?: string;
  battery?: number;
  /** Number of sensors the station supports (from the sensor registry). */
  sensorCount: number;
  /** Sensors reporting a value in the latest telemetry. */
  healthySensorCount: number;
  dataSource: "esp32";
  operatingMode: "live";
}

/** Age in ms since the last heartbeat. `Infinity` when never seen. */
export function heartbeatAgeMs(
  lastSeenAt: string | null | undefined,
  now: number = Date.now()
): number {
  if (!lastSeenAt) return Number.POSITIVE_INFINITY;
  const last = new Date(lastSeenAt).getTime();
  if (Number.isNaN(last)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now - last);
}

/** True when the last heartbeat is older than the STALE threshold. */
export function isHeartbeatStale(
  lastSeenAt: string | null | undefined,
  now: number = Date.now()
): boolean {
  return heartbeatAgeMs(lastSeenAt, now) > getStaleAfterMs();
}

/** True when the last heartbeat is older than the OFFLINE threshold. */
export function isHeartbeatOffline(
  lastSeenAt: string | null | undefined,
  now: number = Date.now()
): boolean {
  return heartbeatAgeMs(lastSeenAt, now) > getOfflineAfterMs();
}

/**
 * Derives the device connection state from the last heartbeat.
 * `null`/missing means no telemetry has ever been received → `not_connected`
 * (a device is never called online without a real heartbeat).
 */
export function deriveConnectionState(
  lastSeenAt: string | null | undefined,
  now: number = Date.now()
): DeviceConnectionState {
  if (!lastSeenAt) return "not_connected";
  const age = heartbeatAgeMs(lastSeenAt, now);
  if (age <= getStaleAfterMs()) return "online";
  if (age <= getOfflineAfterMs()) return "stale";
  return "offline";
}

/**
 * Builds a heartbeat record from an accepted telemetry payload + registered
 * device. `lastSeenAt` = server receipt time (`now`), NOT the device-reported
 * timestamp. Pure and deterministic for tests (inject `now`).
 */
export function buildHeartbeat(
  telemetry: ESP32Telemetry,
  device: RegisteredDevice,
  now: number = Date.now()
): HeartbeatRecord {
  const receivedAt = new Date(now).toISOString();
  const healthySensorCount = SENSOR_KEYS.filter((key) => telemetry[key] !== null).length;
  return {
    deviceId: device.deviceId,
    lastSeenAt: receivedAt,
    receivedAt,
    ...(telemetry.firmwareVersion ? { firmwareVersion: telemetry.firmwareVersion } : {}),
    ...(telemetry.battery !== undefined && telemetry.battery !== null
      ? { battery: telemetry.battery }
      : {}),
    sensorCount: SENSOR_KEYS.length,
    healthySensorCount,
    dataSource: "esp32",
    operatingMode: "live",
  };
}