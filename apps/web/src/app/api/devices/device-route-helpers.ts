import { NextResponse } from "next/server";
import { isValidDeviceId } from "@/lib/devices/contract";
import { deriveConnectionState, type HeartbeatRecord } from "@/lib/devices/heartbeat";
import { isKnownDevice } from "@/lib/devices/registry";
import { SENSOR_KEYS } from "@/lib/devices/sensors";
import {
  getDeviceHeartbeat,
  getDeviceReadingHistory,
  getLatestDeviceReading,
} from "@/lib/devices/storage";

/**
 * Shared helpers for the /api/devices/[deviceId]/* route handlers.
 * Keeps the four endpoint files small and consistent.
 */

/** 400 when the path deviceId is malformed or not registered, else null. */
export function devicePathError(deviceId: string): NextResponse | null {
  if (!isValidDeviceId(deviceId)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid device id '${deviceId}'. Expected pattern SKY-ESP32-###.`,
      },
      { status: 400 }
    );
  }
  if (!isKnownDevice(deviceId)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown device '${deviceId}'. This device is not registered; telemetry is rejected.`,
      },
      { status: 400 }
    );
  }
  return null;
}

/** 200 with the most recent stored reading (or an explicit empty response). */
export async function latestReadingResponse(
  deviceId: string
): Promise<NextResponse> {
  try {
    const reading = await getLatestDeviceReading(deviceId);
    if (!reading) {
      return NextResponse.json({
        ok: true,
        deviceId,
        reading: null,
        note: "No readings stored for this device yet. ESP32 is NOT connected; storage is empty until real hardware reports.",
      });
    }
    return NextResponse.json({ ok: true, deviceId, reading });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to read stored readings right now.",
        detail: error instanceof Error ? error.message : "storage unavailable",
      },
      { status: 503 }
    );
  }
}

/** 200 with the stored reading history (newest first). */
export async function historyResponse(
  deviceId: string,
  max = 50
): Promise<NextResponse> {
  try {
    const readings = await getDeviceReadingHistory(deviceId, max);
    return NextResponse.json({
      ok: true,
      deviceId,
      count: readings.length,
      readings,
      note: "ESP32 is NOT connected; this list is empty until real hardware reports readings.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to read stored readings right now.",
        detail: error instanceof Error ? error.message : "storage unavailable",
      },
      { status: 503 }
    );
  }
}

/**
 * Device status response, derived from the most recent received heartbeat.
 *
 * HEARTBEAT-DRIVEN STATES:
 *   - No heartbeat ever received  → not_connected / Simulation Mode (today).
 *   - Fresh heartbeat (≤ stale)   → online   (real telemetry was received).
 *   - Heartbeat ≤ offline window  → stale    (recently seen, now quiet).
 *   - Heartbeat older than window → offline  (long silent).
 *
 * A device is NEVER reported online unless actual telemetry/heartbeat has been
 * received. Because the physical ESP32 is NOT connected, no heartbeat exists
 * and this endpoint reports Simulation Mode honestly.
 */
export async function statusResponse(deviceId: string): Promise<NextResponse> {
  let storedHeartbeat: HeartbeatRecord | null = null;
  let storageAvailable = true;
  try {
    storedHeartbeat = await getDeviceHeartbeat(deviceId);
  } catch {
    storageAvailable = false;
  }

  if (storedHeartbeat) {
    const connection = deriveConnectionState(storedHeartbeat.lastSeenAt);
    const connectionMode =
      connection === "online" ? "online" : connection === "stale" || connection === "offline" ? "offline" : "simulation";
    return NextResponse.json({
      ok: true,
      deviceId,
      connection,
      connectionMode,
      mode: "live",
      dataSource: "esp32",
      dataSourceLabel: "ESP32 device telemetry",
      firmwareStatus: connection === "online" ? "Connected" : "Disconnected",
      firmwareVersion: storedHeartbeat.firmwareVersion ?? null,
      lastSeen: storedHeartbeat.lastSeenAt,
      sensorCount: storedHeartbeat.sensorCount,
      healthySensorCount: storedHeartbeat.healthySensorCount,
      operatingMode: storedHeartbeat.operatingMode,
      heartbeat: storedHeartbeat,
      note: "Device state derived from the most recent received telemetry/heartbeat.",
    });
  }

  return NextResponse.json({
    ok: true,
    deviceId,
    connection: "not_connected",
    connectionMode: "simulation",
    mode: "simulation",
    dataSource: "simulation",
    dataSourceLabel: "Simulated environmental data",
    firmwareStatus: "Not connected",
    firmwareVersion: null,
    lastSeen: null,
    sensorCount: SENSOR_KEYS.length,
    healthySensorCount: 0,
    operatingMode: "simulation",
    heartbeat: null,
    storageAvailable,
    note: storageAvailable
      ? "ESP32 is NOT connected — no telemetry/heartbeat has ever been received for this device. State stays Simulation Mode."
      : "ESP32 is NOT connected and heartbeat storage is currently unavailable; state stays Simulation Mode.",
  });
}