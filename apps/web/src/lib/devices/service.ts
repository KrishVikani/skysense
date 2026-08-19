import type { AnalyticsResult } from "@/lib/environmental/types";
import { getEnvironmentalDataProvider } from "@/lib/environmental/provider";
import { SENSOR_DEFINITIONS } from "./sensors";
import { dataAgeMs, isStale, STALE_AFTER_MS } from "./quality";
import {
  ESP32_DEVICE_ID,
  ESP32_DEVICE_LOCATION,
  ESP32_DEVICE_NAME,
} from "./contract";
import type { DeviceSnapshot, SensorInfo, SensorKey } from "./types";

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

function buildSensors(analytics: AnalyticsResult): SensorInfo[] {
  const last = analytics.readings[analytics.readings.length - 1];
  return SENSOR_DEFINITIONS.map((def) => {
    const value = last[def.key];
    return {
      key: def.key,
      label: def.label,
      hardwareComponent: def.hardwareComponent,
      unit: def.unit,
      dataType: def.dataType,
      validRange: def.validRange,
      // The simulation provides a value for every sensor, clearly labeled.
      status: "simulated" as const,
      value,
      valueLabel: formatSensorValue(def.key, value),
      lastUpdated: last.timestamp,
      description: def.description,
    };
  });
}

/**
 * Device snapshot for the Devices page.
 *
 * The UI consumes this single result; all reads flow through the active
 * environmental data provider, so when ESP32 hardware replaces the simulation
 * this service (and the page) stay unchanged — only the provider changes.
 */
export async function getDevicesSnapshot(): Promise<DeviceSnapshot> {
  const provider = getEnvironmentalDataProvider();
  const analytics = await provider.fetchAnalytics("24h");
  const last = analytics.readings[analytics.readings.length - 1];
  const lastUpdated = last.timestamp;
  const age = dataAgeMs(lastUpdated);

  const sensors = buildSensors(analytics);
  const healthySensorCount = sensors.filter(
    (s) => s.value !== null && s.status !== "error" && s.status !== "stale"
  ).length;

  return {
    deviceId: ESP32_DEVICE_ID,
    deviceName: ESP32_DEVICE_NAME,
    location: ESP32_DEVICE_LOCATION,
    connection: "simulation",
    connectionMode: "simulation",
    mode: "simulation",
    health: "simulation",
    dataSource: DEVICES_DATA_SOURCE,
    dataSourceKind: "simulation",
    firmwareStatus: DEVICES_FIRMWARE_STATUS,
    lastUpdated,
    dataAgeMs: age,
    isStale: isStale(lastUpdated, STALE_AFTER_MS),
    // No heartbeat exists in Simulation Mode — the device has never been seen
    // (hardware not connected). `lastSeen` stays null; the future live provider
    // populates it from the server heartbeat.
    lastSeen: null,
    lastSeenAgeMs: null,
    firmwareVersion: null,
    sensorCount: sensors.length,
    reportingSensors: sensors.filter((s) => s.value !== null).length,
    connectedSensors: 0,
    healthySensorCount,
    sensors,
    dataQuality: "simulated",
  };
}