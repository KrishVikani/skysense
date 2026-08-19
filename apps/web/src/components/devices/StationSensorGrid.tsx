"use client";

import { motion } from "framer-motion";
import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { DeviceSnapshot, SensorInfo, SensorKey } from "@/lib/devices/types";
import { formatAge } from "@/lib/devices/quality";
import type { EnvironmentalReading, MetricKey, MetricSummary } from "@/lib/environmental/types";
import { compassLabel } from "@/lib/weather/conditions";
import { SENSOR_ACCENTS, SENSOR_ICONS } from "./severity";
import { SectionHeader } from "@/components/SectionHeader";

/**
 * Sensor-to-metric mapping for trend summaries. Every sensor the simulation
 * supports maps to an Analytics metric except `windDirection`, which has no
 * trend summary (direction is shown as a compass label instead).
 */
const TREND_KEYS: Partial<Record<SensorKey, MetricKey>> = {
  temperature: "temperature",
  humidity: "humidity",
  pressure: "pressure",
  airQuality: "airQuality",
  uvIndex: "uvIndex",
  rainfall: "rainfall",
  windSpeed: "windSpeed",
};

const TREND_COLOR: Record<MetricSummary["trend"], string> = {
  up: "var(--color-success)",
  down: "var(--color-danger)",
  stable: "var(--color-muted)",
};

function TrendIndicator({ summary }: { summary: MetricSummary }) {
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

function SensorCard({
  sensor,
  summary,
  windDirection,
  index,
}: {
  sensor: SensorInfo;
  summary: MetricSummary | undefined;
  windDirection: number;
  index: number;
}) {
  const Icon = SENSOR_ICONS[sensor.key];
  const accent = SENSOR_ACCENTS[sensor.key];
  const trendKey = TREND_KEYS[sensor.key];
  const isWindDirection = sensor.key === "windDirection";

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
          <span className="h-1.5 w-1.5 rounded-full bg-sky" aria-hidden="true" />
          Simulated
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
          {isWindDirection ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
              From {compassLabel(windDirection)}
            </span>
          ) : summary && trendKey ? (
            <TrendIndicator summary={summary} />
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
 * sensors (icon, current value, unit, trend and last-updated context). No
 * hardware identifiers, no ranges — this is the weather-app face of the
 * station. Every value is simulated and labeled as such.
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
        subtitle="Current measurements from your station · values shown are simulated"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {snapshot.sensors.map((sensor, index) => {
          const trendKey = TREND_KEYS[sensor.key];
          return (
            <SensorCard
              key={sensor.key}
              sensor={sensor}
              summary={trendKey ? summary[trendKey] : undefined}
              windDirection={reading.windDirection}
              index={index}
            />
          );
        })}
      </div>
    </motion.section>
  );
}
