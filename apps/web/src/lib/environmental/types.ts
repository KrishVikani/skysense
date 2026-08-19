export type TimeRange = "24h" | "7d" | "30d";

export const TIME_RANGES: TimeRange[] = ["24h", "7d", "30d"];

/**
 * How trustworthy the current data feed is. `simulated` marks the mock source;
 * the remaining states describe a live device feed (fresh/stale/invalid) that
 * will be produced by the future ESP32 hardware.
 */
export type DataQuality = "good" | "stale" | "invalid" | "simulated" | "disconnected";

/**
 * Physical connectivity of the sensing device. The default is `simulation`:
 * the ESP32 is NOT connected, so the app runs on simulated data.
 */
export type ConnectionStatus = "not_connected" | "connecting" | "online" | "offline" | "simulation";

/**
 * Provenance of a data record. `simulation` is the current default; `esp32`
 * labels raw telemetry ingested from the future physical station. This is the
 * canonical machine-readable source enum — `EnvironmentalReading.source` is the
 * human-readable label, `dataSource` is the enum.
 */
export type DataSource = "simulation" | "esp32";

/**
 * Canonical connection mode required by the device model. `simulation` is the
 * only state reachable today (the ESP32 is NOT connected). `online` / `offline`
 * are produced by the future hardware provider. This is a projection of the
 * richer {@link ConnectionStatus}.
 */
export type ConnectionMode = "simulation" | "online" | "offline";

/**
 * Per-sensor availability. `simulated` is the current default: the value is
 * produced by the deterministic simulation and clearly labeled. The remaining
 * states describe a live hardware feed once the ESP32 is connected.
 */
export type SensorStatus = "not_connected" | "simulated" | "available" | "stale" | "error";

/**
 * A single environmental measurement sampled from a sensor station.
 * Every value is expressed in a fixed unit set so the UI never has to
 * interpret raw sensor output:
 *  - temperature: °C
 *  - humidity: relative %
 *  - windSpeed: km/h
 *  - windDirection: degrees, 0–360 (meteorological, from north)
 *  - uvIndex: unitless UV index
 *  - airQuality: US AQI number
 *  - pressure: hPa
 *  - rainfall: accumulated mm in the sample window
 *
 * The optional metadata fields (deviceId, location, source, dataQuality,
 * connectionStatus, dataSource, connectionMode, firmwareVersion, sensorStatus)
 * extend the measurement into a complete EnvironmentalData record. They are
 * optional so the mock generator and the Analytics pipeline keep working
 * unchanged, while a future ESP32 ingest can populate them fully.
 */
export interface EnvironmentalReading {
  timestamp: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  uvIndex: number;
  airQuality: number;
  pressure: number;
  rainfall: number;
  /** Identifier of the originating device, e.g. "SKY-ESP32-001". */
  deviceId?: string;
  /** Human-readable site label, e.g. "Ahmedabad, India". */
  location?: string;
  /** Source label, e.g. "Simulated environmental data". */
  source?: string;
  /** Quality of this sample (see {@link DataQuality}). */
  dataQuality?: DataQuality;
  /** Physical device connectivity at the time of sampling. */
  connectionStatus?: ConnectionStatus;
  /** Machine-readable provenance enum (see {@link DataSource}). */
  dataSource?: DataSource;
  /** Canonical connection mode (see {@link ConnectionMode}). */
  connectionMode?: ConnectionMode;
  /** Firmware version string reported by the device, when known. */
  firmwareVersion?: string;
  /** Per-sensor availability (see {@link SensorStatus}). */
  sensorStatus?: SensorStatus;
}

export type MetricKey =
  | "temperature"
  | "humidity"
  | "windSpeed"
  | "uvIndex"
  | "airQuality"
  | "pressure"
  | "rainfall";

export interface MetricSummary {
  current: number;
  average: number;
  min: number;
  max: number;
  trend: "up" | "down" | "stable";
  trendDelta: number;
  unit: string;
}

export type AQICategory = "Good" | "Moderate" | "Poor" | "Hazardous";

export interface WindSummary {
  averageSpeed: number;
  maxSpeed: number;
  dominantDirectionDeg: number;
  dominantDirectionLabel: string;
}

export interface EnvironmentalScore {
  overall: number;
  breakdown: Record<MetricKey, number>;
  label: string;
}

export type InsightTone = "good" | "warning" | "info";
export type InsightIcon = "temperature" | "humidity" | "wind" | "uv" | "air" | "rain";

export interface Insight {
  id: string;
  icon: InsightIcon;
  title: string;
  content: string;
  tone: InsightTone;
}

/**
 * Everything the Analytics UI needs for a given time range. The UI consumes
 * this single result instead of interpreting raw readings directly.
 */
export interface AnalyticsResult {
  range: TimeRange;
  readings: EnvironmentalReading[];
  summary: Record<MetricKey, MetricSummary>;
  wind: WindSummary;
  uvRisk: string;
  aqiCategory: AQICategory;
  score: EnvironmentalScore;
  insights: Insight[];
  location: string;
  dataSource: string;
  lastUpdated: string;
}