"use client";

import { ALERTS_DATA_SOURCE } from "@/lib/alerts/service";

interface DataSourceStatusProps {
  dataSource: string;
  className?: string;
}

/**
 * Simulation / live-telemetry status badge for the Alerts center.
 *
 * Every alert is labeled with ALERTS_DATA_SOURCE. Today that constant is
 * "Simulated environmental data", so this renders SIMULATION MODE. When the
 * ESP32 feed replaces the mock source, the same constant flips this badge to
 * LIVE TELEMETRY with no page redesign. It never claims hardware is connected
 * while the engine still reports simulated data.
 */
export function DataSourceStatus({ dataSource, className }: DataSourceStatusProps) {
  const simulated = dataSource === ALERTS_DATA_SOURCE;

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
