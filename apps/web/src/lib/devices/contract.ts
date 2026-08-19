import type { ConnectionMode, EnvironmentalReading } from "@/lib/environmental/types";

/**
 * Device identity constants for the single SKYSENSE station.
 *
 * FUTURE HARDWARE:
 * `DEVICE_ID_PATTERN` is the contract the ESP32 firmware must satisfy when it
 * reports telemetry. There are no Wi-Fi passwords, API keys or private device
 * credentials in this file or anywhere in the frontend bundle — device
 * authentication stays server-side (see deviceAuth.ts and the API routes).
 */
export const ESP32_DEVICE_ID = "SKY-ESP32-001";
export const ESP32_DEVICE_NAME = "SKYSENSE ESP32 Environmental Station";
export const ESP32_DEVICE_LOCATION = "Ahmedabad, India";
export const DEVICE_ID_PATTERN = /^SKY-ESP32-[0-9]{3}$/;

/** Whether a device identifier conforms to the SKYSENSE device-id scheme. */
export function isValidDeviceId(deviceId: string): boolean {
  return DEVICE_ID_PATTERN.test(deviceId);
}

/**
 * The telemetry payload a future ESP32 device will POST to
 * `POST /api/devices/:deviceId/data`.
 *
 * CONTRACT
 *  - deviceId        required, string, MUST match `SKY-ESP32-###`.
 *  - timestamp       required, ISO-8601 UTC string (e.g. "2026-08-16T12:34:56.000Z").
 *  - temperature..windDirection  optional, number | null. A null or absent
 *                    sensor field means "this sensor is not reporting"; it is
 *                    NEVER converted to a zero. Present values must be finite
 *                    numbers inside the sensor's valid range (see sensors.ts).
 *  - firmwareVersion optional, string, firmware version string.
 *  - battery         optional, number, battery percentage [0, 100].
 *
 * Because the physical hardware does not exist yet, a schema-correct payload
 * may legitimately send null for every sensor (placeholders). The ingestion
 * endpoint accepts it but does NOT persist all-null readings.
 *
 * All present values are normalized into the existing {@link EnvironmentalReading}
 * shape (the same structure the simulation emits today), so Analytics / AI /
 * Alerts / Devices require no changes when real hardware data arrives.
 */
export interface ESP32Telemetry {
  deviceId: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  airQuality: number | null;
  uvIndex: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  rainfall: number | null;
  firmwareVersion?: string;
  battery?: number;
}

/** Alias used by the API route / ingestion pipeline. */
export type DeviceTelemetry = ESP32Telemetry;

/** Canonical connection mode for a raw, stored reading. */
export type StoredReadingConnectionMode = ConnectionMode;

/**
 * A validated telemetry payload normalized into the shared data model. This is
 * the exact structure the ESP32 path and the simulation path have in common.
 */
export type EnvironmentalDataContract = EnvironmentalReading & {
  deviceId: string;
};