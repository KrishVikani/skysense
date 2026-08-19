import type { EnvironmentalReading, TimeRange } from "./types";

export const MOCK_LOCATION = "Ahmedabad, India";
export const MOCK_DATA_SOURCE = "Demo sensor data";

/**
 * Identity and provenance metadata attached to every simulated reading so the
 * whole pipeline consumes fully-qualified EnvironmentalData records.
 *
 * FUTURE HARDWARE:
 * These values describe the single SKYSENSE ESP32 station. When real sensor
 * values replace the simulation, each reading will carry the same fields
 * (deviceId, location, source, dataQuality, connectionStatus) — the UI,
 * Analytics, AI and Alerts layers do not need to change.
 */
export const MOCK_DEVICE_ID = "SKY-ESP32-001";
export const MOCK_DEVICE_NAME = "SKYSENSE ESP32 Environmental Station";
export const MOCK_SIMULATED_SOURCE = "Simulated environmental data";
export const MOCK_DATA_QUALITY: EnvironmentalReading["dataQuality"] = "simulated";
export const MOCK_CONNECTION_STATUS: EnvironmentalReading["connectionStatus"] = "simulation";

const HOUR_MS = 3600000;
const DAY_MS = 86400000;

// The whole dataset is anchored to a single point in time so values are
// stable across re-renders and range switches (never re-randomized).
// Rounded to the minute so "last updated: just now" stays truthful.
const ANCHOR_MS = Date.now() - (Date.now() % 60000);

/**
 * Deterministic pseudo-random value in [0, 1) derived from an integer seed.
 * The same seed always produces the same value.
 */
function seeded(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 0): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

/**
 * Generates one realistic reading for a given absolute timestamp using smooth
 * diurnal/seasonal curves plus a tiny deterministic perturbation. Because the
 * curves depend only on the timestamp, every range (24h/7d/30d) is coherent
 * with the others.
 */
function readingAt(ms: number): EnvironmentalReading {
  const date = new Date(ms);
  const hour = date.getHours() + date.getMinutes() / 60;
  const dayIndex = Math.floor(ms / DAY_MS);
  const seed = Math.floor(ms / HOUR_MS);

  // Warmest around 15:00, coolest around 03:00.
  const diurnal = Math.sin(((hour - 9) / 24) * 2 * Math.PI);
  const tempBase = 29.6 + 0.7 * Math.sin(dayIndex * 0.55);
  const temperature = round(tempBase + 4.2 * diurnal + (seeded(seed) - 0.5) * 0.9, 1);

  const humidity = round(
    clamp(62 - 11.5 * diurnal + (seeded(seed + 1) - 0.5) * 4, 34, 93)
  );

  const windSpeed = round(
    clamp(10.5 + 4.5 * Math.sin(((hour - 3) / 24) * 2 * Math.PI) + (seeded(seed + 2) - 0.5) * 3, 2, 30),
    1
  );

  const windDirection = round(
    ((dayIndex * 31 + hour * 9) % 360) + seeded(seed + 6) * 12,
    0
  ) % 360;

  // UV is zero at night, peaks around 13:00.
  const uvCurve = Math.sin(clamp((hour - 7) / 12, 0, 1) * Math.PI);
  const uvIndex = round(clamp(9.6 * uvCurve + (seeded(seed + 3) - 0.5) * 0.8, 0, 12), 1);

  // AQI drifts daily with an afternoon (ozone) peak.
  const airQuality = round(
    clamp(
      66 + 9 * Math.sin(dayIndex * 0.4) + 7 * Math.sin(((hour - 9) / 24) * 2 * Math.PI) + (seeded(seed + 4) - 0.5) * 7,
      34,
      118
    )
  );

  const pressure = round(1008 + 3.2 * Math.sin(dayIndex * 0.6) + (seeded(seed + 5) - 0.5), 1);

  const rainyDay = dayIndex % 7 === 3 || dayIndex % 9 === 5;
  const rainfall = rainyDay
    ? round(clamp(5 * Math.sin(((hour - 9) / 7) * Math.PI) + seeded(seed + 7) * 6, 0, 26), 1)
    : 0;

  return {
    timestamp: new Date(ms).toISOString(),
    deviceId: MOCK_DEVICE_ID,
    location: MOCK_LOCATION,
    source: MOCK_SIMULATED_SOURCE,
    dataQuality: MOCK_DATA_QUALITY,
    connectionStatus: MOCK_CONNECTION_STATUS,
    dataSource: "simulation",
    connectionMode: "simulation",
    sensorStatus: "simulated",
    temperature,
    humidity,
    windSpeed,
    windDirection,
    uvIndex,
    airQuality,
    pressure,
    rainfall,
  };
}

/**
 * Deterministic mock series for a time range:
 *  - 24h: 24 hourly points
 *  - 7d:  28 points, one every 6 hours
 *  - 30d: 30 daily points
 */
export function generateReadings(range: TimeRange): EnvironmentalReading[] {
  if (range === "24h") {
    return Array.from({ length: 24 }, (_, i) => readingAt(ANCHOR_MS - (23 - i) * HOUR_MS));
  }
  if (range === "7d") {
    return Array.from({ length: 28 }, (_, i) => readingAt(ANCHOR_MS - (27 - i) * 6 * HOUR_MS));
  }
  return Array.from({ length: 30 }, (_, i) => readingAt(ANCHOR_MS - (29 - i) * DAY_MS));
}

/**
 * Projects the deterministic simulation forward from the anchor point,
 * reusing the exact same per-hour generator as the recent history. The "next
 * hours" are therefore coherent with what the dashboard already shows.
 *
 * This powers the Weather experience's hourly/daily outlook today. When a real
 * regional-weather provider is wired in later, this call is replaced by that
 * provider — the consuming UI does not change.
 */
export function generateFutureReadings(hours: number): EnvironmentalReading[] {
  return Array.from({ length: hours }, (_, i) => readingAt(ANCHOR_MS + (i + 1) * HOUR_MS));
}