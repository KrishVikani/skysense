import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CloudRain,
  Cpu,
  Droplets,
  Gauge,
  HeartPulse,
  HelpCircle,
  Loader2,
  Navigation,
  Sun,
  Thermometer,
  Wifi,
  WifiOff,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { DeviceConnectionState, DeviceHealth, SensorKey, SensorStatus } from "@/lib/devices/types";

export const CONNECTION_COLOR: Record<DeviceConnectionState, string> = {
  not_connected: "var(--color-danger)",
  connecting: "var(--color-warning)",
  online: "var(--color-success)",
  stale: "var(--color-warning)",
  offline: "var(--color-danger)",
  simulation: "var(--color-sky)",
  unknown: "var(--color-muted)",
};

export const CONNECTION_LABEL: Record<DeviceConnectionState, string> = {
  not_connected: "Not Connected",
  connecting: "Connecting",
  online: "Online",
  stale: "Stale",
  offline: "Offline",
  simulation: "Simulation Mode",
  unknown: "Unknown",
};

/**
 * Icon per connection state. Combined with the label, indicator and supporting
 * description so state is never communicated by color alone.
 */
export const CONNECTION_ICON: Record<DeviceConnectionState, LucideIcon> = {
  not_connected: WifiOff,
  connecting: Loader2,
  online: Wifi,
  stale: Clock,
  offline: WifiOff,
  simulation: Cpu,
  unknown: HelpCircle,
};

/** Supporting explanation per connection state (existing model states only). */
export const CONNECTION_DESCRIPTION: Record<DeviceConnectionState, string> = {
  not_connected: "No device telemetry has ever been received. The ESP32 station has not reported to SKYSENSE.",
  connecting: "The device is connecting to the SKYSENSE platform and has not yet reported telemetry.",
  online: "The device is connected and reporting live telemetry through the ingestion API.",
  stale: "The device was seen recently but has stopped reporting. Check its network connection.",
  offline: "The device has not reported for some time and is considered offline.",
  simulation: "SKYSENSE is running on simulated data. The ESP32 hardware is not connected — readings are software placeholders.",
  unknown: "The device connection state could not be determined.",
};

export const HEALTH_COLOR: Record<DeviceHealth, string> = {
  healthy: "var(--color-success)",
  degraded: "var(--color-warning)",
  offline: "var(--color-danger)",
  simulation: "var(--color-sky)",
  unknown: "var(--color-muted)",
};

export const HEALTH_LABEL: Record<DeviceHealth, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  offline: "Offline",
  simulation: "Simulation",
  unknown: "Unknown",
};

export const HEALTH_ICON: Record<DeviceHealth, LucideIcon> = {
  healthy: HeartPulse,
  degraded: Activity,
  offline: WifiOff,
  simulation: Cpu,
  unknown: HelpCircle,
};

export const HEALTH_DESCRIPTION: Record<DeviceHealth, string> = {
  healthy: "All subsystems are operating normally.",
  degraded: "Some subsystems need attention.",
  offline: "The device is not reachable.",
  simulation: "There is no physical device; health reflects the simulated software station.",
  unknown: "Device health could not be determined.",
};

export const SENSOR_STATUS_COLOR: Record<SensorStatus, string> = {
  not_connected: "var(--color-danger)",
  simulated: "var(--color-sky)",
  available: "var(--color-success)",
  stale: "var(--color-warning)",
  error: "var(--color-danger)",
};

export const SENSOR_STATUS_LABEL: Record<SensorStatus, string> = {
  not_connected: "Not Connected",
  simulated: "Simulated",
  available: "Available",
  stale: "Stale",
  error: "Error",
};

export const SENSOR_STATUS_ICON: Record<SensorStatus, LucideIcon> = {
  not_connected: WifiOff,
  simulated: Cpu,
  available: CheckCircle2,
  stale: Clock,
  error: AlertTriangle,
};

export const SENSOR_STATUS_DESCRIPTION: Record<SensorStatus, string> = {
  not_connected: "This component is not attached to connected hardware.",
  simulated: "This component reports a simulated value — no physical sensor is wired yet.",
  available: "This component is reporting values from live hardware.",
  stale: "This component has stopped reporting recent values.",
  error: "This component is reporting an error.",
};

export const SENSOR_ICONS: Record<SensorKey, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplets,
  pressure: Gauge,
  airQuality: Activity,
  uvIndex: Sun,
  rainfall: CloudRain,
  windSpeed: Wind,
  windDirection: Navigation,
};

export const SENSOR_ACCENTS: Record<SensorKey, string> = {
  temperature: "var(--color-sun)",
  humidity: "var(--color-sky)",
  pressure: "var(--color-info)",
  airQuality: "var(--color-success)",
  uvIndex: "var(--color-warning)",
  rainfall: "var(--color-info)",
  windSpeed: "var(--color-accent)",
  windDirection: "var(--color-accent)",
};
