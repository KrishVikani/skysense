import {
  ESP32_DEVICE_ID,
  ESP32_DEVICE_NAME,
  ESP32_DEVICE_LOCATION,
  isValidDeviceId,
} from "./contract";

/**
 * The set of devices SKYSENSE will accept telemetry from.
 *
 * FUTURE HARDWARE:
 * Only the single station `SKY-ESP32-001` is registered today. When additional
 * stations are built, add them here (server-side registry) — the ingestion
 * API rejects any deviceId that is not present in this list.
 */
export interface RegisteredDevice {
  deviceId: string;
  name: string;
  location: string;
  firmwareVersion?: string;
}

export const REGISTERED_DEVICES: RegisteredDevice[] = [
  {
    deviceId: ESP32_DEVICE_ID,
    name: ESP32_DEVICE_NAME,
    location: ESP32_DEVICE_LOCATION,
  },
];

/** True when the id conforms to the device-id scheme AND is registered. */
export function isKnownDevice(deviceId: string): boolean {
  return isValidDeviceId(deviceId) && REGISTERED_DEVICES.some((d) => d.deviceId === deviceId);
}

/** Returns the registered station metadata, or undefined for unknown devices. */
export function getRegisteredDevice(deviceId: string): RegisteredDevice | undefined {
  return REGISTERED_DEVICES.find((d) => d.deviceId === deviceId);
}
