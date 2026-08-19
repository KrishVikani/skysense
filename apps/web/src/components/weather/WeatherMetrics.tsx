"use client";

import { motion } from "framer-motion";
import { Cloud, Droplets, Eye, Gauge, Layers, Thermometer, Umbrella, Wind, type LucideIcon } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { convertPressure, convertTemperature, convertWind, pressureLabel, temperatureLabel, windLabel } from "@/lib/settings/units";
import { windBreezeLabel } from "@/lib/weather/summary";
import type { WeatherCurrent } from "@/lib/weather/types";
import { SectionHeader } from "@/components/SectionHeader";

interface WeatherMetricsProps {
  data: WeatherCurrent;
}

interface MetricTile {
  key: string;
  label: string;
  value: string;
  context: string;
  Icon: LucideIcon;
  accent: string;
}

const UNAVAILABLE = "—";

/**
 * Elegant secondary weather metrics. Only metrics the active weather source
 * actually provides are rendered — tiles are filtered out (never shown as a
 * placeholder) when a value is unavailable, so nothing fabricated appears.
 * Premium glass-style tiles, not dashboard widgets.
 */
export function WeatherMetrics({ data }: WeatherMetricsProps) {
  const { settings } = useSettings();
  const units = settings.units;

  const metrics: MetricTile[] = [
    {
      key: "feels-like",
      label: "Feels like",
      value: `${Math.round(convertTemperature(data.feelsLike, units.temperature))}${temperatureLabel(units.temperature)}`,
      context: "What it feels like outside",
      Icon: Thermometer,
      accent: "var(--color-sun)",
    },
    {
      key: "humidity",
      label: "Humidity",
      value: `${Math.round(data.humidity)}%`,
      context: "Moisture in the air",
      Icon: Droplets,
      accent: "var(--color-sky)",
    },
    {
      key: "wind",
      label: "Wind",
      value: `${Math.round(convertWind(data.windSpeed, units.wind))} ${windLabel(units.wind)}`,
      context: data.windDirectionLabel
        ? `${windBreezeLabel(data.windSpeed)} · from ${data.windDirectionLabel}`
        : windBreezeLabel(data.windSpeed),
      Icon: Wind,
      accent: "var(--color-accent)",
    },
    {
      key: "pressure",
      label: "Pressure",
      value: `${Math.round(convertPressure(data.pressure, units.pressure))} ${pressureLabel(units.pressure)}`,
      context: "Air pressure at this location",
      Icon: Gauge,
      accent: "var(--color-info)",
    },
    {
      key: "visibility",
      label: "Visibility",
      value: data.visibilityKm != null ? `${data.visibilityKm.toFixed(1)} km` : UNAVAILABLE,
      context: data.visibilityKm != null ? "How far you can see" : "Not provided by this source",
      Icon: Eye,
      accent: "var(--color-sky)",
    },
    {
      key: "precipitation",
      label: "Rain chance",
      value: data.precipitationProbability != null ? `${data.precipitationProbability}%` : UNAVAILABLE,
      context: data.precipitationProbability != null ? "Chance of rain now" : "Not provided by this source",
      Icon: Umbrella,
      accent: "var(--color-sun)",
    },
    {
      key: "clouds",
      label: "Cloudiness",
      value: data.cloudCover != null ? `${data.cloudCover}%` : UNAVAILABLE,
      context: data.cloudCover != null ? "Of the sky is clouded" : "Not provided by this source",
      Icon: Cloud,
      accent: "var(--color-muted)",
    },
  ];

  const visibleMetrics = metrics.filter((metric) => metric.value !== UNAVAILABLE);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.24 }}
      aria-labelledby="weather-metrics-title"
    >
      <SectionHeader
        id="weather-metrics-title"
        icon={<Layers className="h-4 w-4" aria-hidden="true" />}
        title="Conditions"
        subtitle="Current conditions at a glance"
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {visibleMetrics.map((metric, index) => (
          <motion.div
            key={metric.key}
            className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/40 p-4 shadow-[0_10px_26px_-20px_rgba(2,6,23,0.35)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-border-hover hover:shadow-[0_18px_36px_-24px_rgba(2,6,23,0.4)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.24 + index * 0.04 }}
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full"
              aria-hidden="true"
              style={{ background: `radial-gradient(circle, color-mix(in srgb, ${metric.accent} 14%, transparent), transparent 70%)` }}
            />
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `color-mix(in srgb, ${metric.accent} 12%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${metric.accent} 20%, transparent), 0 6px 14px -12px ${metric.accent}55`,
              }}
            >
              <metric.Icon className="h-5 w-5" style={{ color: metric.accent }} aria-hidden="true" />
            </div>
            <p className="relative mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{metric.label}</p>
            <p className="relative mt-1 truncate text-xl font-bold leading-none tracking-tight text-foreground tabular-nums">
              {metric.value}
            </p>
            <p className="relative mt-1.5 text-[11px] leading-snug text-muted-foreground">{metric.context}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}