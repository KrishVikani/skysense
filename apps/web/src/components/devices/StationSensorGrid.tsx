"use client";

import { motion } from "framer-motion";
import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type {
  DeviceSnapshot,
  SensorInfo,
  SensorKey,
} from "@/lib/devices/types";
import { formatAge } from "@/lib/devices/quality";
import type { EnvironmentalReading, MetricKey, MetricSummary } from "@/lib/environmental/types";
import { compassLabel } from "@/lib/weather/conditions";
import { SENSOR_ACCENTS, SENSOR_ICONS } from "./severity";
import { SectionHeader } from "@/components/SectionHeader";

/**
 * Software → hardware mapping for the future SKYSENSE ESP32 station.
 *
 * ONLY the five sensors the real ESP32 hardware supports:
 *   - temperature
 *   - humidity
 *   - pressure
 *   - uvIndex (light intensity / UV)
 *   - rainfall (rain detection)
 *
 * Wind speed, wind direction, air quality, and AQI are NOT measured by the
 * actual hardware and are excluded from this grid.
 */
const TREND_KEYS: Partial<Record<SensorKey, MetricKey>> = {
  temperature: "temperature",
  humidity: "humidity",
  pressure: "pressure",
  uvIndex: "uvIndex",
  rainfall: "rainfall",
};

const TREND_COLOR: Record<MetricSummary["trend"], string> = {
  up: "var(--color-success)",
  down: "var(--color-danger)",
  stable: "var(--color-muted)",
};

function TrendIndicator({ summary }: { summary: MetricSummary | undefined }) {
  if (!summary) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
        —
      </span>
    );
  }
  const color = TREND_COLOR[summary.trend];
  const Icon = summary.trend === "up" ? TrendingUp : summary.trend === "down" ? TrendingDown : Minus;
  const text =
    summary.trend === "stable"
      ? "Steady"
      : `Trend ${summary.trend === "up" ? "+" : "−"}${Math.abs(summary.trendDelta).toFixed(1)}${summary.unit}`;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ color }}
      title={summary.trend === "stable" ? "No significant change this period" : `Change over the period: ${summary.trendDelta > 0 ? "+" : "−"}${Math.abs(summary.trendDelta).toFixed(1)}${summary.unit}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}

/**
 * Maps a sensor key to whether it's supported by the real ESP32 hardware.
 * Only the five supported sensors are rendered in the grid.
 */
function isEsp32SupportedSensor(key: SensorKey): boolean {
  return [
    "temperature",
    "humidity",
    "pressure",
    "uvIndex",
    "rainfall",
  ].includes(key);
}

function SensorCard({
  sensor,
  summary,
  index,
  isLive,
}: {
  sensor: SensorInfo;
  summary?: Record<MetricKey, MetricSummary> | undefined;
  index: number;
  isLive: boolean;
}) {
  const Icon = SENSOR_ICONS[sensor.key];
  const accent = SENSOR_ACCENTS[sensor.key];
  const trendKey = TREND_KEYS[sensor.key];

  // Skip rendering unsupported sensors (wind, windDirection, airQuality)
  if (!trendKey) {
    return null;
  }

  return (
    <motion.div
      className="card-premium group relative overflow-hidden p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.25) }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}
          >
            <Icon className="h-5 w-5" style={{ color: accent }} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground leading-tight">{sensor.label}</p>
            <p className="text-[11px] text-muted-foreground">Updated {formatAge(Date.now() - new Date(sensor.lastUpdated).getTime())}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400" : "bg-sky"}`} aria-hidden="true" />
          {isLive ? "Live" : "Simulated"}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-3xl font-bold leading-none tracking-tight tabular-nums" style={{ color: accent }}>
            {sensor.valueLabel}
          </p>
          {!sensor.valueLabel.includes(sensor.unit) && (
            <p className="mt-1 text-xs text-muted-foreground">{sensor.unit}</p>
          )}
        </div>
        <div className="pb-0.5 text-right">
          {trendKey ? (
            <TrendIndicator summary={summary ? summary[trendKey] : undefined} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Live sensor summary: a clean, readable grid of the station's supported
 * sensors (icon, current value, unit, trend and last-updated context).
 * Shows live ESP32 data when connected, simulated data when not.
 * Only renders the five sensors the real ESP32 hardware supports:
 *   - temperature
 *   - humidity
 *   - pressure
 *   - uvIndex (light intensity / UV)
 *   - rainfall (rain detection)
 */
export function StationSensorGrid({
  snapshot,
  reading,
  summary,
}: {
  snapshot: DeviceSnapshot;
  reading: EnvironmentalReading;
  summary: Record<MetricKey, MetricSummary>;
}) {
  const isLive = snapshot.mode === "live" && snapshot.connection === "online";

  return (
    <motion.section
      className="space-y-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      aria-labelledby="station-sensors-title"
    >
      <SectionHeader
        id="station-sensors-title"
        icon={<Activity className="h-4 w-4" aria-hidden="true" />}
        title="Live Sensors"
        subtitle={isLive
          ? "Current measurements from your ESP32 station"
          : "Current measurements from your station · values shown are simulated"}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {snapshot.sensors.filter((sensor): sensor is SensorInfo => isEsp32SupportedSensor(sensor.key)).map((sensor, index) => {
          const trendKey = TREND_KEYS[sensor.key];
          return (
            <SensorCard
              key={sensor.key}
              sensor={sensor}
              summary={summary}
              index={index}
              isLive={isLive}
            />
          );
        })}
      </div>
    </motion.section>
  );
}