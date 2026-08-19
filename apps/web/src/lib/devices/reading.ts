import type { ConnectionMode, SensorStatus } from "@/lib/environmental/types";
import type { ESP32Telemetry } from "./contract";
import type { RegisteredDevice } from "./registry";
import { SENSOR_KEYS } from "./sensors";

/**
 * A RAW, stored environmental reading. This is the persistable form of a
 * validated ESP32 telemetry payload.
 *
 * SEPARATION OF RAW vs DERIVED:
 * This record only ever holds raw sensor values and provenance metadata.
 * Derived values (AQI categories, risk scores, trend classifications, AI
 * interpretations, alert decisions) are NEVER written here — they are computed
 * on demand by the Analytics / AI / Alerts layers and kept separate.
 *
 * A sensor field that the device did not report is stored as `null` and is
 * NEVER coerced to zero.
 */
export interface StoredDeviceReading {
  /** Firestore document id (set after persistence). */
  id?: string;
  deviceId: string;
  /** Device-reported sample time (ISO-8601). */
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  airQuality: number | null;
  uvIndex: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  rainfall: number | null;
  /** Raw readings are always labelled as ESP32 hardware data. */
  dataSource: "esp32";
  connectionMode: ConnectionMode;
  /** Site label resolved from the device registry. */
  location: string;
  firmwareVersion?: string;
  battery?: number;
  sensorStatus: SensorStatus;
  /** Server-side ingestion time (ISO-8601). */
  receivedAt: string;
}

/** True when the telemetry carries at least one actual sensor value. */
export function hasAnySensorValue(telemetry: ESP32Telemetry): boolean {
  return SENSOR_KEYS.some((key) => telemetry[key] !== null);
}

/**
 * Maps a validated telemetry payload + registered device into a raw stored
 * reading. Kept pure so it can be unit-tested without Firestore.
 */
export function buildStoredReading(
  telemetry: ESP32Telemetry,
  device: RegisteredDevice,
  receivedAt: string = new Date().toISOString()
): StoredDeviceReading {
  return {
    deviceId: telemetry.deviceId,
    timestamp: telemetry.timestamp,
    temperature: telemetry.temperature,
    humidity: telemetry.humidity,
    pressure: telemetry.pressure,
    airQuality: telemetry.airQuality,
    uvIndex: telemetry.uvIndex,
    windSpeed: telemetry.windSpeed,
    windDirection: telemetry.windDirection,
    rainfall: telemetry.rainfall,
    dataSource: "esp32",
    connectionMode: "online",
    location: device.location,
    firmwareVersion: telemetry.firmwareVersion,
    battery: telemetry.battery,
    sensorStatus: "available",
    receivedAt,
  };
}