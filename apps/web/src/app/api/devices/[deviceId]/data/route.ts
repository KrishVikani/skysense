import { NextResponse } from "next/server";
import { validateDeviceTelemetry } from "@/lib/devices/validation";
import { verifyDeviceCredential } from "@/lib/devices/deviceAuth";
import { buildHeartbeat } from "@/lib/devices/heartbeat";
import { getRegisteredDevice } from "@/lib/devices/registry";
import { buildStoredReading, hasAnySensorValue } from "@/lib/devices/reading";
import { saveDeviceHeartbeat, saveDeviceReading } from "@/lib/devices/storage";
import { devicePathError, latestReadingResponse } from "../../device-route-helpers";

/**
 * SKYSENSE device ingestion endpoint.
 *
 * POST /api/devices/:deviceId/data
 *
 * PIPELINE (FUTURE HARDWARE)
 *   ESP32 → POST → device verification → telemetry validation → storage
 *         → EnvironmentalData → Analytics / AI / Alerts / UI
 *
 * CURRENT STATE
 * The physical ESP32 is NOT connected. This endpoint:
 *   1. verifies the device is registered (unknown/malformed ids are rejected),
 *   2. validates the telemetry payload against the sensor contract,
 *   3. acknowledges the reading, persisting it as RAW telemetry when it
 *      contains at least one real sensor value.
 *
 * SECURITY
 * Device authentication lives in `verifyDeviceCredential`. It is NOT enforced
 * until the server secret `SKYSENSE_ESP32_DEVICE_SECRET` is provisioned (see
 * apps/web/.env.example and src/lib/devices/deviceAuth.ts). Until then the
 * response reports `deviceAuth: { enforced: false, verified: false }` so the
 * API never claims the device is securely authenticated. No credentials are
 * ever shipped to the browser bundle.
 */

export async function POST(
  request: Request,
  { params }: { params: { deviceId: string } }
): Promise<NextResponse> {
  const deviceId = params.deviceId;

  const pathError = devicePathError(deviceId);
  if (pathError) return pathError;

  const auth = verifyDeviceCredential(request.headers);
  if (auth.enforced && !auth.verified) {
    return NextResponse.json(
      {
        ok: false,
        error: "Device authentication failed.",
        deviceAuth: auth,
      },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Request body must be valid JSON.", deviceAuth: auth },
      { status: 400 }
    );
  }

  const result = validateDeviceTelemetry(body);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload failed validation.",
        errors: result.errors,
        deviceAuth: auth,
      },
      { status: 400 }
    );
  }

  if (result.data.deviceId !== deviceId) {
    return NextResponse.json(
      {
        ok: false,
        error: `deviceId in the payload ('${result.data.deviceId}') does not match the path ('${deviceId}').`,
        deviceAuth: auth,
      },
      { status: 400 }
    );
  }

  const registered = getRegisteredDevice(deviceId);
  if (!registered) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown device '${deviceId}'. This device is not registered.`,
        deviceAuth: auth,
      },
      { status: 400 }
    );
  }

  // HEARTBEAT: any accepted telemetry from a known device counts as the device
  // being alive. Record lastSeen (server receipt time). Best-effort: a heartbeat
  // persistence failure must not reject valid telemetry.
  let heartbeatRecorded = false;
  try {
    await saveDeviceHeartbeat(buildHeartbeat(result.data, registered));
    heartbeatRecorded = true;
  } catch {
    heartbeatRecorded = false;
  }

  // A schema-correct payload with no sensor values (all-null placeholders)
  // is acknowledged but never persisted into the readings store.
  if (!hasAnySensorValue(result.data)) {
    return NextResponse.json({
      ok: true,
      received: true,
      stored: false,
      deviceId,
      timestamp: result.data.timestamp,
      dataSource: "esp32",
      deviceAuth: auth,
      heartbeat: { recorded: heartbeatRecorded },
      note: "Payload validated. No sensor values were present (hardware placeholders); nothing was stored. ESP32 is NOT connected.",
    });
  }

  const reading = buildStoredReading(result.data, registered);

  try {
    const readingId = await saveDeviceReading(reading);
    return NextResponse.json({
      ok: true,
      received: true,
      stored: true,
      readingId,
      deviceId,
      timestamp: reading.timestamp,
      dataSource: "esp32",
      connectionMode: reading.connectionMode,
      deviceAuth: auth,
      heartbeat: { recorded: heartbeatRecorded },
      note: "Reading validated and stored as RAW telemetry. ESP32 is NOT connected; this payload arrived through the ingestion API.",
    });
  } catch (storageError) {
    // Persistence failure must not lose the reading: acknowledge honestly and
    // flag it for retry rather than returning a false "stored" success.
    return NextResponse.json({
      ok: true,
      received: true,
      stored: false,
      pendingStorage: true,
      deviceId,
      timestamp: reading.timestamp,
      dataSource: "esp32",
      deviceAuth: auth,
      heartbeat: { recorded: heartbeatRecorded },
      storageError: storageError instanceof Error ? storageError.message : "storage unavailable",
      note: "Reading validated but could not be persisted right now. It remains pending for storage.",
    });
  }
}

/** GET /api/devices/:deviceId/data → the most recent stored reading. */
export async function GET(
  _request: Request,
  { params }: { params: { deviceId: string } }
): Promise<NextResponse> {
  const deviceId = params.deviceId;
  const pathError = devicePathError(deviceId);
  if (pathError) return pathError;
  return latestReadingResponse(deviceId);
}