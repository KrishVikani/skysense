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

/** Lightweight device snapshot for live polling (no history/analytics fetch). */
export async function getLightweightDeviceSnapshot(
  previousSnapshot?: DeviceSnapshot | null
): Promise<DeviceSnapshot> {
  const provider = getEnvironmentalDataProvider();
  const isEsp32 = provider.kind === "esp32";

  // Fetch lightweight device status (heartbeat only, no analytics)
  const apiStatus = await fetchDeviceStatus(ESP32_DEVICE_ID);

  let connection: DeviceConnectionState;
  let connectionMode: ConnectionMode;
  let mode: DeviceMode;
  let health: DeviceHealth;
  let dataSourceKind: "esp32" | "simulation";

  if (apiStatus && apiStatus.connection === "online") {
    connection = "online";
    connectionMode = apiStatus.connectionMode ?? "online";
    mode = "live";
    health = apiStatus.health ?? "healthy";
    dataSourceKind = "esp32";
  } else if (apiStatus) {
    connection = apiStatus.connection ?? "not_connected";
    connectionMode = apiStatus.connectionMode ?? "offline";
    mode = apiStatus.mode ?? "simulation";
    health = apiStatus.health ?? "unknown";
    dataSourceKind = isEsp32 ? "esp32" : "simulation";
  } else {
    connection = "not_connected";
    connectionMode = "offline";
    mode = "simulation";
    health = "unknown";
    dataSourceKind = "simulation";
  }

  const now = new Date().toISOString();

  // Fetch latest reading from lightweight endpoint
  interface LatestReadingResponse {
    ok: boolean;
    deviceId: string;
    reading: {
      timestamp: string;
      location?: string;
      firmwareVersion?: string;
      sensorStatus?: string;
      temperature: number | null;
      humidity: number | null;
      pressure: number | null;
      airQuality: number | null;
      lightLevel: number | null;
      windSpeed: number | null;
      windDirection: number | null;
      rainfall: number | null;
    } | null;
  }

  let latestReading: LatestReadingResponse["reading"] | null = null;
  try {
    const res = await fetch(`/api/devices/${ESP32_DEVICE_ID}/data/latest`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data: LatestReadingResponse = await res.json();
      latestReading = data.reading;
    }
  } catch {
    // Ignore - will use previous snapshot or simulation
  }

  // If we have real ESP32 data and a latest reading, build sensors from it
  if (latestReading && isEsp32) {
    const sensors = SENSOR_DEFINITIONS.map((def) => {
      const value = latestReading[def.key] as number | null;
      return {
        key: def.key,
        label: def.label,
        hardwareComponent: def.hardwareComponent,
        unit: def.unit,
        dataType: def.dataType,
        validRange: def.validRange,
        status: (latestReading?.sensorStatus as any) ?? "available",
        value,
        valueLabel: value !== null ? value.toFixed(def.key === "lightLevel" ? 0 : 1) : "—",
        lastUpdated: latestReading.timestamp ?? now,
        description: def.description,
      };
    });

    const reportingSensors = sensors.filter((s) => s.value !== null).length;
    const healthySensorCount = sensors.filter(
      (s) => s.value !== null && s.status !== "error" && s.status !== "stale"
    ).length;

    return {
      deviceId: ESP32_DEVICE_ID,
      deviceName: ESP32_DEVICE_NAME,
      location: (latestReading.location as string) ?? ESP32_DEVICE_LOCATION,
      connection,
      connectionMode,
      mode,
      health,
      dataSource: provider.label,
      dataSourceKind,
      firmwareStatus: apiStatus?.firmwareStatus ?? "Connected",
      lastUpdated: latestReading.timestamp ?? now,
      dataAgeMs: 0,
      isStale: false,
      lastSeen: apiStatus?.lastSeen ?? null,
      lastSeenAgeMs: apiStatus?.lastSeenAgeMs ?? null,
      firmwareVersion: apiStatus?.firmwareVersion ?? (latestReading.firmwareVersion as string) ?? null,
      sensorCount: sensors.length,
      reportingSensors,
      connectedSensors: sensors.filter((s) => s.status === "available").length,
      healthySensorCount,
      sensors,
      dataQuality: "good",
    };
  }

  // Fallback: preserve previous real telemetry if available, else return simulation snapshot
  if (previousSnapshot && previousSnapshot.mode === "live" && previousSnapshot.sensors.some((s) => s.value !== null)) {
    const preservedSensors = previousSnapshot.sensors.map((sensor) => ({
      ...sensor,
      status: "stale" as const,
      lastUpdated: sensor.lastUpdated,
    }));

    return {
      deviceId: ESP32_DEVICE_ID,
      deviceName: ESP32_DEVICE_NAME,
      location: previousSnapshot.location,
      connection,
      connectionMode,
      mode: "live",
      health,
      dataSource: provider.label,
      dataSourceKind: "esp32",
      firmwareStatus: apiStatus?.firmwareStatus ?? "Disconnected",
      lastUpdated: previousSnapshot.lastUpdated,
      dataAgeMs: Date.now() - new Date(previousSnapshot.lastUpdated).getTime(),
      isStale: true,
      lastSeen: apiStatus?.lastSeen ?? previousSnapshot.lastSeen ?? null,
      lastSeenAgeMs: apiStatus?.lastSeenAgeMs ?? previousSnapshot.lastSeenAgeMs ?? null,
      firmwareVersion: apiStatus?.firmwareVersion ?? previousSnapshot.firmwareVersion ?? null,
      sensorCount: preservedSensors.length,
      reportingSensors: preservedSensors.filter((s) => s.value !== null).length,
      connectedSensors: 0,
      healthySensorCount: 0,
      sensors: preservedSensors,
      dataQuality: "disconnected",
    };
  }

  // Simulation fallback
  return {
    deviceId: ESP32_DEVICE_ID,
    deviceName: ESP32_DEVICE_NAME,
    location: ESP32_DEVICE_LOCATION,
    connection,
    connectionMode,
    mode,
    health,
    dataSource: isEsp32 ? provider.label : DEVICES_DATA_SOURCE,
    dataSourceKind,
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
  lightLevel: 0,
  pressure: 1,
  rainfall: 1,
};

function formatSensorValue(key: SensorKey, value: number | null): string {
  if (value === null) return "—";
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

    // If ESP32 provider was active and we have a previous snapshot with
    // real telemetry (mode === "live"), preserve the last known real
    // sensor readings instead of falling back to simulation placeholders.
    // This ensures that when ESP32 goes offline, the last real readings
    // remain displayed instead of being replaced by simulation data.
    const hasPreviousRealTelemetry =
      previousSnapshot &&
      previousSnapshot.mode === "live" &&
      previousSnapshot.sensors.some((s) => s.value !== null);

    if (hasPreviousRealTelemetry && isEsp32) {
      // Preserve last real telemetry: keep sensors with their last real values,
      // but update connection state to reflect offline status.
      const preservedSensors = previousSnapshot.sensors.map((sensor) => ({
        ...sensor,
        status: "stale" as const, // Mark as stale since device is offline
        lastUpdated: sensor.lastUpdated,
      }));

      return {
        deviceId: ESP32_DEVICE_ID,
        deviceName: ESP32_DEVICE_NAME,
        location: previousSnapshot.location,
        connection,
        connectionMode,
        mode: "live", // Keep mode as "live" to indicate these are real readings
        health,
        dataSource: provider.label, // Keep ESP32 as data source
        dataSourceKind: "esp32",
        firmwareStatus: apiStatus?.firmwareStatus ?? "Disconnected",
        lastUpdated: previousSnapshot.lastUpdated,
        dataAgeMs: dataAgeMs(previousSnapshot.lastUpdated),
        isStale: isStale(previousSnapshot.lastUpdated, STALE_AFTER_MS),
        lastSeen: apiStatus?.lastSeen ?? previousSnapshot.lastSeen ?? null,
        lastSeenAgeMs: apiStatus?.lastSeenAgeMs ?? previousSnapshot.lastSeenAgeMs ?? null,
        firmwareVersion: apiStatus?.firmwareVersion ?? previousSnapshot.firmwareVersion ?? null,
        sensorCount: preservedSensors.length,
        reportingSensors: preservedSensors.filter((s) => s.value !== null).length,
        connectedSensors: 0, // No sensors actively reporting while offline
        healthySensorCount: 0,
        sensors: preservedSensors,
        dataQuality: "disconnected", // Real data but disconnected
      };
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