"use client";

import { ALERTS_DATA_SOURCE } from "@/lib/alerts/service";

interface DataSourceStatusProps {
  dataSource: string;
  className?: string;
  /** Whether the ESP32 device is currently offline (disconnected after being online) */
  isOffline?: boolean;
}

/**
 * Simulation / live-telemetry / offline status badge for the Alerts center.
 *
 * - Live: shows "Live Telemetry" (green)
 * - Offline: shows "Device Not Connected" (amber) - last known telemetry
 * - Simulation: shows "Simulation Mode" (amber) - no real device ever connected
 */
export function DataSourceStatus({ dataSource, className, isOffline = false }: DataSourceStatusProps) {
  const simulated = dataSource === ALERTS_DATA_SOURCE;

  if (isOffline) {
    return (
      <span className={`badge badge-warning font-medium ${className ?? ""}`}>
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
        </span>
        Device Not Connected
      </span>
    );
  }

  if (simulated) {
    return (
      <span className={`badge badge-warning font-medium ${className ?? ""}`}>
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
        </span>
        Simulation Mode
      </span>
    );
  }

  return (
    <span className={`badge badge-success font-medium ${className ?? ""}`}>
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
      </span>
      Live Telemetry
    </span>
  );
}
