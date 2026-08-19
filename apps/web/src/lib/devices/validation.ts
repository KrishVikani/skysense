import { SENSOR_DEFINITIONS, SENSOR_KEYS } from "./sensors";
import type { SensorKey } from "./types";
import { DEVICE_ID_PATTERN, isValidDeviceId } from "./contract";
import type { EnvironmentalDataContract, ESP32Telemetry } from "./contract";

/**
 * Runtime validation for incoming ESP32 telemetry. No external library is
 * required: the checks are small, dependency-free and mirror the software →
 * hardware contract (see contract.ts and sensors.ts).
 *
 * Two validators form the single ingestion boundary:
 *  - {@link validateDeviceTelemetry} accepts the FUTURE ESP32 wire payload,
 *    where a sensor field may be null/absent ("sensor not reporting"). Null is
 *    NEVER silently treated as zero.
 *  - {@link validateEnvironmentalData} accepts a fully-populated reading that
 *    can enter the Analytics / AI / Alerts pipeline.
 *
 * Rejecting malformed data here protects the downstream pipeline — only valid
 * records become EnvironmentalData for Analytics / AI / Alerts.
 */

const NUMERIC_RANGES = Object.fromEntries(
  SENSOR_DEFINITIONS.map((s) => [s.key, s.validRange])
) as Record<SensorKey, { min: number; max: number }>;

/**
 * Maximum acceptable clock skew for a device-reported timestamp. A timestamp
 * further in the future than this is rejected as invalid (device clock too far
 * ahead / bogus payload). Generous enough for a mildly misconfigured RTC.
 */
export const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export type ValidationResult =
  | { ok: true; data: EnvironmentalDataContract }
  | { ok: false; errors: string[] };

export type TelemetryValidationResult =
  | { ok: true; data: ESP32Telemetry }
  | { ok: false; errors: string[] };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function inRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validates a raw ESP32 telemetry payload (the wire format from the future
 * firmware). deviceId and timestamp are required; every sensor field may be a
 * number within its valid range, or null/absent to signal "not reporting".
 * Timestamps must be valid ISO-8601 and must not be unreasonably far in the
 * future (see {@link MAX_FUTURE_SKEW_MS}); `now` is injectable for tests.
 * Returns the normalized telemetry on success, or a list of clear errors.
 */
export function validateDeviceTelemetry(
  input: unknown,
  now: number = Date.now()
): TelemetryValidationResult {
  if (!isObject(input)) {
    return { ok: false, errors: ["Payload must be a JSON object."] };
  }

  const errors: string[] = [];

  if (typeof input.deviceId !== "string" || !isValidDeviceId(input.deviceId)) {
    errors.push(`deviceId must be a string matching ${DEVICE_ID_PATTERN.source}.`);
  }

  if (typeof input.timestamp !== "string" || Number.isNaN(Date.parse(input.timestamp))) {
    errors.push("timestamp must be a valid ISO-8601 date string.");
  } else if (Date.parse(input.timestamp) > now + MAX_FUTURE_SKEW_MS) {
    errors.push("timestamp is too far in the future (device clock skew).");
  }

  for (const field of SENSOR_KEYS) {
    const value = input[field];
    if (value === null || value === undefined) {
      // Absent sensor: allowed, preserved as null, never coerced to zero.
      continue;
    }
    if (!isFiniteNumber(value)) {
      errors.push(`${field} must be a finite number or null.`);
      continue;
    }
    if (!inRange(value, NUMERIC_RANGES[field])) {
      errors.push(
        `${field} (${value}) is outside the valid range [${NUMERIC_RANGES[field].min}, ${NUMERIC_RANGES[field].max}].`
      );
    }
  }

  if (input.battery !== undefined && input.battery !== null) {
    if (!isFiniteNumber(input.battery) || !inRange(input.battery, { min: 0, max: 100 })) {
      errors.push("battery must be a number between 0 and 100.");
    }
  }
  if (input.firmwareVersion !== undefined && input.firmwareVersion !== null) {
    if (typeof input.firmwareVersion !== "string") {
      errors.push("firmwareVersion must be a string.");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const data: ESP32Telemetry = {
    deviceId: input.deviceId as string,
    timestamp: input.timestamp as string,
    temperature: input.temperature === undefined ? null : (input.temperature as number | null),
    humidity: input.humidity === undefined ? null : (input.humidity as number | null),
    pressure: input.pressure === undefined ? null : (input.pressure as number | null),
    airQuality: input.airQuality === undefined ? null : (input.airQuality as number | null),
    uvIndex: input.uvIndex === undefined ? null : (input.uvIndex as number | null),
    windSpeed: input.windSpeed === undefined ? null : (input.windSpeed as number | null),
    windDirection: input.windDirection === undefined ? null : (input.windDirection as number | null),
    rainfall: input.rainfall === undefined ? null : (input.rainfall as number | null),
    ...(input.firmwareVersion !== undefined && input.firmwareVersion !== null
      ? { firmwareVersion: input.firmwareVersion as string }
      : {}),
    ...(input.battery !== undefined && input.battery !== null
      ? { battery: input.battery as number }
      : {}),
  };

  return { ok: true, data };
}

/**
 * Validates a fully-populated reading that may enter the analytics/AI/alert
 * pipeline. Unlike the telemetry validator, every sensor field is REQUIRED and
 * must be a finite number in range — a record with nulls has no place in the
 * derived pipeline.
 */
export function validateEnvironmentalData(input: unknown): ValidationResult {
  if (!isObject(input)) {
    return { ok: false, errors: ["Payload must be a JSON object."] };
  }

  const raw = input as Record<string, unknown>;
  const errors: string[] = [];

  // Required identity: deviceId must match the SKY-ESP32-### scheme.
  if (typeof raw.deviceId !== "string" || !isValidDeviceId(raw.deviceId)) {
    errors.push(`deviceId must be a string matching ${DEVICE_ID_PATTERN.source}.`);
  }

  // Required timestamp: must be a parseable ISO-8601 string.
  if (typeof raw.timestamp !== "string" || Number.isNaN(Date.parse(raw.timestamp))) {
    errors.push("timestamp must be a valid ISO-8601 date string.");
  }

  // Required numeric sensor fields with their valid ranges.
  for (const field of SENSOR_KEYS) {
    const value = raw[field];
    if (!isFiniteNumber(value)) {
      errors.push(`${field} must be a finite number.`);
      continue;
    }
    if (!inRange(value, NUMERIC_RANGES[field])) {
      errors.push(
        `${field} (${value}) is outside the valid range [${NUMERIC_RANGES[field].min}, ${NUMERIC_RANGES[field].max}].`
      );
    }
  }

  // Optional fields.
  if (raw.battery !== undefined) {
    if (!isFiniteNumber(raw.battery) || !inRange(raw.battery, { min: 0, max: 100 })) {
      errors.push("battery must be a number between 0 and 100.");
    }
  }
  if (raw.firmwareVersion !== undefined && typeof raw.firmwareVersion !== "string") {
    errors.push("firmwareVersion must be a string.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const data: EnvironmentalDataContract = {
    deviceId: raw.deviceId as string,
    timestamp: raw.timestamp as string,
    temperature: raw.temperature as number,
    humidity: raw.humidity as number,
    pressure: raw.pressure as number,
    airQuality: raw.airQuality as number,
    uvIndex: raw.uvIndex as number,
    rainfall: raw.rainfall as number,
    windSpeed: raw.windSpeed as number,
    windDirection: raw.windDirection as number,
    dataSource: "esp32",
    connectionMode: "online",
    ...(raw.firmwareVersion !== undefined ? { firmwareVersion: raw.firmwareVersion as string } : {}),
    ...(raw.battery !== undefined ? { battery: raw.battery as number } : {}),
  };

  return { ok: true, data };
}

/**
 * Unit-test helper: returns true only when every required field passes.
 * Useful for the ingestion pipeline and for quick smoke checks.
 */
export function isEnvironmentalData(input: unknown): input is EnvironmentalDataContract {
  return validateEnvironmentalData(input).ok;
}

/** Unit-test helper: true only when the raw telemetry payload passes. */
export function isDeviceTelemetry(input: unknown): input is ESP32Telemetry {
  return validateDeviceTelemetry(input).ok;
}