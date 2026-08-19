import type { ConnectionMode, DataQuality, DataSource, SensorStatus } from "@/lib/environmental/types";

export type { SensorStatus } from "@/lib/environmental/types";

/**
 * The eight conceptual sensors the future SKYSENSE ESP32 station supports.
 * Field names mirror the existing EnvironmentalReading keys so the software
 * field → hardware mapping stays 1:1 (`rain` is `rainfall` in the data model).
 */
export type SensorKey =
  | "temperature"
  | "humidity"
  | "pressure"
  | "airQuality"
  | "uvIndex"
  | "rainfall"
  | "windSpeed"
  | "windDirection";

/**
 * Physical connectivity of a device. `simulation` is the current default:
 * the ESP32 is NOT connected, so the platform runs on simulated data.
 * `online`/`stale`/`offline` are derived from the most recent received
 * telemetry/heartbeat (see heartbeat.ts): a device is NEVER called online
 * unless actual telemetry has been received.
 * `unknown` covers a feed whose state cannot be determined.
 */
export type DeviceConnectionState =
  | "not_connected"
  | "connecting"
  | "online"
  | "stale"
  | "offline"
  | "simulation"
  | "unknown";

/** Whether the device is running on simulated data or live hardware readings. */
export type DeviceMode = "simulation" | "live";

/**
 * Coarse health used by the device card indicator. `simulation` is the current
 * default; `unknown` covers an indeterminate state.
 */
export type DeviceHealth = "healthy" | "degraded" | "offline" | "simulation" | "unknown";

/**
 * Software field → hardware component mapping for one sensor.
 */
export interface SensorDefinition {
  key: SensorKey;
  label: string;
  /** Software PLACEHOLDER for the future physical component, e.g. "ESP32_TEMPERATURE_SENSOR". */
  hardwareComponent: string;
  unit: string;
  /** Expected JavaScript type produced by the hardware integration. */
  dataType: "number";
  /** Known valid measurement range (validated on ingestion). */
  validRange: { min: number; max: number };
  /** Whether the sensor is active. The simulation enables all eight; a future
   *  hardware build can disable sensors that are not physically attached. */
  enabled: boolean;
  /** Concise description shown in the UI. */
  description: string;
}

/** One row in the sensor-status section. */
export interface SensorInfo {
  key: SensorKey;
  label: string;
  hardwareComponent: string;
  unit: string;
  dataType: "number";
  validRange: { min: number; max: number };
  status: SensorStatus;
  /** Current value when available (simulated today), otherwise null. */
  value: number | null;
  /** Human-readable value string, e.g. "34.2". */
  valueLabel: string;
  /** ISO timestamp of the last known value. */
  lastUpdated: string;
  /** Optional per-sensor error/stale detail (e.g. hardware fault). */
  error?: string;
  /** Concise description shown in the UI. */
  description: string;
}

/**
 * Everything the Devices page needs in one call. The UI consumes this shape and
 * never touches the data source directly.
 */
export interface DeviceSnapshot {
  deviceId: string;
  deviceName: string;
  location: string;
  connection: DeviceConnectionState;
  connectionMode: ConnectionMode;
  mode: DeviceMode;
  health: DeviceHealth;
  dataSource: string;
  /** Machine-readable provenance enum (see {@link DataSource}). */
  dataSourceKind: DataSource;
  firmwareStatus: string;
  lastUpdated: string;
  dataAgeMs: number;
  isStale: boolean;
  /** ISO timestamp the device was last SEEN via telemetry/heartbeat, or null
   *  when the device has never reported (simulation today). */
  lastSeen: string | null;
  /** Age in ms of the last heartbeat, or null when the device was never seen. */
  lastSeenAgeMs: number | null;
  /** Firmware version reported by the device, or null until hardware connects. */
  firmwareVersion: string | null;
  sensorCount: number;
  /** Sensors currently reporting a value (8 simulated today). */
  reportingSensors: number;
  /** Sensors backed by physically connected hardware (0 today). */
  connectedSensors: number;
  /** Sensors currently reporting a fresh, valid value (8 simulated today). */
  healthySensorCount: number;
  sensors: SensorInfo[];
  dataQuality: DataQuality;
}

// ---------------------------------------------------------------------------
// FUTURE DEVICE REGISTRATION
//
// The "Add Device" flow below is ARCHITECTURE ONLY — no pairing is implemented
// in this phase. These interfaces document the intended stages so the hardware
// phase can slot into them without UI redesign:
//
//   Add Device → Device ID → Pairing/auth → Wi-Fi config → Sensor discovery → Online
// ---------------------------------------------------------------------------

/** Device-level identifier plus immutable station metadata. */
export interface DeviceRegistration {
  deviceId: string;
  name: string;
  location: string;
  firmwareVersion?: string;
}

/** A pairing intent: what the user initiates before any hardware exists. */
export interface DeviceRegistrationIntent {
  desiredDeviceId?: string;
  name?: string;
  location?: string;
}

/** Authentication challenge a physical device must solve to join the platform. */
export interface DevicePairingChallenge {
  deviceId: string;
  /** Server-issued, short-lived challenge (never a static secret in code). */
  challengeToken: string;
  expiresAt: string;
}

/** Stages of the future add-device flow. */
export type PairingStage =
  | "initiated"
  | "authenticated"
  | "wifi_configured"
  | "discovering_sensors"
  | "online";

/** Progress snapshot for the future registration flow. */
export interface PairingFlowState {
  deviceId?: string;
  stage: PairingStage;
  discoveredSensors: SensorKey[];
}