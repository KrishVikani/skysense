import type { AnalyticsResult } from "@/lib/environmental/types";
import { getEnvironmentalDataProvider } from "@/lib/environmental/provider";
import { SENSOR_DEFINITIONS } from "./sensors";
import { dataAgeMs, isStale, STALE_AFTER_MS, qualityFrom } from "./quality";
import {
  ESP32_DEVICE_ID,
  ESP32_DEVICE_NAME,
  ESP32_DEVICE_LOCATION,
} from "./contract";
import type {
  DeviceSnapshot,
  SensorInfo,
  SensorKey,
  DeviceConnectionState,
  ConnectionMode,
  DeviceMode,
  DeviceHealth,
} from "./types";

/**
 * Source label shown by the Devices module. Mirrors the Intelligence and
 * Alerts source labels so the product is consistent.
 */
export const DEVICES_DATA_SOURCE = "Simulated environmental data";

/** Firmware status while no physical device is attached. */
export const DEVICES_FIRMWARE_STATUS = "Not connected";

/**
 * How often the Devices page refreshes its snapshot (ms). The page pauses
 * polling while the tab is hidden and never overlaps in-flight requests, so
 * the UI does not hammer the API.
 */
export const DEVICES_POLL_INTERVAL_MS = 30_000;

const SENSOR_DIGITS: Partial<Record<SensorKey, number>> = {
  temperature: 1,
  windSpeed: 1,
  uvIndex: 1,
  pressure: 1,
  rainfall: 1,
};

function formatSensorValue(key: SensorKey, value: number): string {
  const digits = SENSOR_DIGITS[key] ?? 0;
  return value.toFixed(digits);
}

function buildSensors(
  analytics: AnalyticsResult,
  providerKind: "mock" | "esp32"
): SensorInfo[] {
  const last = analytics.readings[analytics.readings.length - 1];
  const isSimulated = providerKind === "mock";

  return SENSOR_DEFINITIONS.map((def) => {
    const value = last[def.key];
    return {
      key: def.key,
      label: def.label,
      hardwareComponent: def.hardwareComponent,
      unit: def.unit,
      dataType: def.dataType,
      validRange: def.validRange,
      status: isSimulated ? ("simulated" as const) : (last.sensorStatus ?? "available"),
      value,
      valueLabel: formatSensorValue(def.key, value),
      lastUpdated: last.timestamp,
      description: def.description,
    };
  });
}

/**
 * Fetches device status from the API to get heartbeat/lastSeen info.
 * This runs server-side only (in the API route), so we call it from the client
 * via fetch to get the real connection state.
 */
export async function fetchDeviceStatus(deviceId: string): Promise<{
  connection: DeviceConnectionState;
  connectionMode: ConnectionMode;
  mode: DeviceMode;
  health: DeviceHealth;
  lastSeen: string | null;
  lastSeenAgeMs: number | null;
  firmwareVersion: string | null;
  firmwareStatus: string;
  dataSource: string | undefined;
} | null> {
  try {
    const res = await fetch(`/api/devices/${deviceId}/status`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok) return null;

    return {
      connection: data.connection,
      connectionMode: data.connectionMode,
      mode: data.mode,
      health: data.connection === "online" ? "healthy" : data.connection === "stale" ? "degraded" : data.connection === "offline" ? "offline" : "unknown",
      lastSeen: data.lastSeen ?? null,
      lastSeenAgeMs: data.lastSeen ? Date.now() - new Date(data.lastSeen).getTime() : null,
      firmwareVersion: data.firmwareVersion ?? null,
      firmwareStatus: data.firmwareStatus ?? "Unknown",
      dataSource: data.dataSource,
    };
  } catch {
    return null;
  }
}

/**
 * Device snapshot for the Devices page.
 *
 * The UI consumes this single result; all reads flow through the active
 * environmental data provider, so when ESP32 hardware replaces the simulation
 * this service (and the page) stay unchanged — only the provider changes.
 */
export async function getDevicesSnapshot(
  previousSnapshot?: DeviceSnapshot | null
): Promise<DeviceSnapshot> {
  const provider = getEnvironmentalDataProvider();
  const providerKind = provider.kind;
  const isEsp32 = providerKind === "esp32";

  let analytics: AnalyticsResult | null = null;
  let lastUpdated: string;
  let lastReading: AnalyticsResult["readings"][0] | null = null;

  try {
    analytics = await provider.fetchAnalytics("24h");
    lastReading = analytics.readings[analytics.readings.length - 1];
    lastUpdated = lastReading.timestamp;
  } catch (error) {
    // No telemetry available yet (ESP32 not connected or no data stored)
    // Return a snapshot reflecting the "not connected" state,
    // but always derive connection state from the API so the UI
    // correctly shows LIVE when the ESP32 is online even if no
    // readings have been stored yet (heartbeat may still be recorded).
    // When the API is temporarily unavailable, we default to
    // "not_connected" rather than preserving old "online" state from
    // previousSnapshot, so that a physically disconnected ESP32 is
    // correctly reflected across all pages.
    const now = new Date().toISOString();
    const apiStatus = await fetchDeviceStatus(ESP32_DEVICE_ID);

    // Determine connection state from the API result.
    // If the API reports connection=online with esp32 dataSource, the
    // device is live. Any other connection state (not_connected, stale,
    // offline) takes precedence over previousSnapshot fallback.
    let connection: DeviceConnectionState;
    let connectionMode: ConnectionMode;
    let mode: DeviceMode;
    let health: DeviceHealth;

    if (apiStatus && apiStatus.connection === "online") {
      // Device is genuinely online with live telemetry.
      connection = "online";
      connectionMode = apiStatus.connectionMode ?? "online";
      mode = "live";
      health = apiStatus.health ?? "healthy";
    } else if (apiStatus) {
      // API returned a result but connection is not online.
      // Use the API's determination directly — do NOT fall back to
      // previousSnapshot, which would incorrectly keep "online" alive
      // after the ESP32 has stopped reporting.
      connection = apiStatus.connection ?? "not_connected";
      connectionMode = apiStatus.connectionMode ?? "offline";
      mode = apiStatus.mode ?? "simulation";
      health = apiStatus.health ?? "unknown";
    } else {
      // API unavailable — default to not_connected rather than
      // preserving old "online" state from previousSnapshot.
      connection = "not_connected";
      connectionMode = "offline";
      mode = "simulation";
      health = "unknown";
    }

    return {
      deviceId: ESP32_DEVICE_ID,
      deviceName: ESP32_DEVICE_NAME,
      location: ESP32_DEVICE_LOCATION,
      connection,
      connectionMode,
      mode,
      health,
      dataSource: isEsp32 ? provider.label : DEVICES_DATA_SOURCE,
      dataSourceKind: isEsp32 ? "esp32" : "simulation",
      firmwareStatus: isEsp32 ? "Disconnected" : DEVICES_FIRMWARE_STATUS,
      lastUpdated: now,
      dataAgeMs: Number.POSITIVE_INFINITY,
      isStale: true,
      lastSeen: null,
      lastSeenAgeMs: null,
      firmwareVersion: null,
      sensorCount: SENSOR_DEFINITIONS.length,
      reportingSensors: 0,
      connectedSensors: 0,
      healthySensorCount: 0,
      sensors: SENSOR_DEFINITIONS.map((def) => ({
        key: def.key,
        label: def.label,
        hardwareComponent: def.hardwareComponent,
        unit: def.unit,
        dataType: def.dataType,
        validRange: def.validRange,
        status: "not_connected" as const,
        value: null,
        valueLabel: "—",
        lastUpdated: now,
        description: def.description,
      })),
      dataQuality: isEsp32 ? "disconnected" : "simulated",
    };
  }

  // We have real analytics data from the provider
  const sensors = buildSensors(analytics, providerKind);
  const healthySensorCount = sensors.filter(
    (s) => s.value !== null && s.status !== "error" && s.status !== "stale"
  ).length;
  const reportingSensors = sensors.filter((s) => s.value !== null).length;
  const connectedSensors = isEsp32 ? sensors.filter((s) => s.status === "available").length : 0;

  // Determine data quality from the last reading
  const dataQuality = qualityFrom({
    sourceIsSimulated: !isEsp32,
    connected: isEsp32 && lastReading?.connectionMode === "online",
    hasReadings: true,
    lastUpdated: lastReading?.timestamp,
  });

  // Derive connection state from the API device status so the UI
  // reflects the real device state (live / online / offline).
  // This is safe because the API routes are verified working — the server
  // reports connection=online, connectionMode=online, mode=live when the
  // ESP32 is sending telemetry. Using the API status here ensures the
  // My Station page switches to LIVE ESP32 telemetry even when the
  // provider kind flag is unexpectedly "mock".
  //
  // When the API is temporarily unavailable, we default to
  // "not_connected" rather than preserving old "online" state from
  // previousSnapshot, so that a physically disconnected ESP32 is
  // correctly reflected across all pages.
  const apiStatus = await fetchDeviceStatus(ESP32_DEVICE_ID);

  // Derive connection state from the API result.
  // Prefer the API's determination. Only fall back to a safe default
  // when the API is completely unreachable.
  let connection: DeviceConnectionState;
  let connectionMode: ConnectionMode;
  let mode: DeviceMode;
  let health: DeviceHealth;

  if (apiStatus && apiStatus.connection === "online") {
    // Device is genuinely online with live telemetry.
    connection = "online";
    connectionMode = apiStatus.connectionMode ?? "online";
    mode = "live";
    health = apiStatus.health ?? "healthy";
  } else if (apiStatus) {
    // API returned a result but connection is not online.
    // Use the API's determination directly — do NOT fall back to
    // previousSnapshot, which would incorrectly keep "online" alive
    // after the ESP32 has stopped reporting telemetry.
    connection = apiStatus.connection ?? "not_connected";
    connectionMode = apiStatus.connectionMode ?? "offline";
    mode = apiStatus.mode ?? "simulation";
    health = apiStatus.health ?? "unknown";
  } else {
    // API unavailable — default to not_connected rather than
    // preserving old "online" state from previousSnapshot.
    connection = "not_connected";
    connectionMode = "offline";
    mode = "simulation";
    health = "unknown";
  }

  // Firmware status: use API value when available, fall back to provider-based logic
  const firmwareStatus = apiStatus?.firmwareStatus ?? (isEsp32 ? "Connected" : DEVICES_FIRMWARE_STATUS);

  return {
    deviceId: ESP32_DEVICE_ID,
    deviceName: ESP32_DEVICE_NAME,
    location: lastReading?.location ?? ESP32_DEVICE_LOCATION,
    connection,
    connectionMode,
    mode,
    health,
    dataSource: isEsp32 ? provider.label : DEVICES_DATA_SOURCE,
    dataSourceKind: isEsp32 ? "esp32" : "simulation",
    firmwareStatus,
    lastUpdated,
    dataAgeMs: dataAgeMs(lastUpdated),
    isStale: isStale(lastUpdated, STALE_AFTER_MS),
    lastSeen: apiStatus?.lastSeen ?? null,
    lastSeenAgeMs: apiStatus?.lastSeenAgeMs ?? null,
    firmwareVersion: apiStatus?.firmwareVersion ?? lastReading?.firmwareVersion ?? null,
    sensorCount: sensors.length,
    reportingSensors,
    connectedSensors,
    healthySensorCount,
    sensors,
    dataQuality,
  };
}