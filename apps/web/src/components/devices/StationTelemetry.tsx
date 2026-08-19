"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { TrendChart } from "@/components/analytics/TrendChart";
import type { AnalyticsResult, MetricKey } from "@/lib/environmental/types";
import { SectionHeader } from "@/components/SectionHeader";

interface TelemetryMetric {
  key: MetricKey;
  label: string;
  color: string;
  formatter: (_value: number) => string;
}

/**
 * The four metrics the My Station telemetry chart lets the user explore.
 * History comes exclusively from the existing environmental provider's 24h
 * deterministic series — nothing is fabricated here.
 */
const METRICS: TelemetryMetric[] = [
  { key: "temperature", label: "Temperature", color: "var(--color-sun)", formatter: (v) => `${v.toFixed(1)}°C` },
  { key: "humidity", label: "Humidity", color: "var(--color-sky)", formatter: (v) => `${v.toFixed(0)}%` },
  { key: "windSpeed", label: "Wind", color: "var(--color-accent)", formatter: (v) => `${v.toFixed(1)} km/h` },
  { key: "uvIndex", label: "UV Index", color: "var(--color-warning)", formatter: (v) => `${v.toFixed(1)}` },
];

const TREND_COLORS = {
  up: "var(--color-success)",
  down: "var(--color-danger)",
  stable: "var(--color-muted)",
} as const;

const PANEL_ID = "station-telemetry-panel";

/**
 * Station telemetry: recent station measurements over the last 24 hours with a
 * keyboard-navigable metric switcher. Reuses the existing TrendChart/chart
 * infra unchanged.
 */
export function StationTelemetry({ analytics }: { analytics: AnalyticsResult }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("temperature");
  const tabsRef = useRef<HTMLDivElement>(null);
  const config = METRICS.find((m) => m.key === activeMetric) ?? METRICS[0];
  const summary = analytics.summary[config.key];
  const trendColor = TREND_COLORS[summary.trend];

  const moveTab = (index: number, key: string) => {
    setActiveMetric(METRICS[index].key);
    requestAnimationFrame(() => {
      tabsRef.current?.querySelector<HTMLButtonElement>(`[data-metric-key="${key}"]`)?.focus();
    });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      if (e.key === "ArrowLeft") moveTab((index - 1 + METRICS.length) % METRICS.length, METRICS[(index - 1 + METRICS.length) % METRICS.length].key);
      else if (e.key === "ArrowRight") moveTab((index + 1) % METRICS.length, METRICS[(index + 1) % METRICS.length].key);
      else if (e.key === "Home") moveTab(0, METRICS[0].key);
      else moveTab(METRICS.length - 1, METRICS[METRICS.length - 1].key);
    }
  };

  return (
    <motion.section
      className="space-y-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      aria-labelledby="station-telemetry-title"
    >
      <div className="space-y-3">
        <SectionHeader
          id="station-telemetry-title"
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          title="Station Telemetry"
          subtitle="Recent station measurements over the last 24 hours"
        />

        <div className="card-premium p-4 lg:p-6">
        <div
          ref={tabsRef}
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Telemetry metric"
        >
          {METRICS.map((metric, index) => {
            const active = metric.key === activeMetric;
            return (
              <button
                key={metric.key}
                type="button"
                data-metric-key={metric.key}
                role="tab"
                aria-selected={active}
                aria-controls={PANEL_ID}
                id={`station-telemetry-tab-${metric.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveMetric(metric.key)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                  active
                    ? "bg-card border border-border shadow-sm text-foreground"
                    : "border border-transparent text-muted-foreground hover:text-foreground hover:border-border-hover"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: metric.color }} aria-hidden="true" />
                {metric.label}
              </button>
            );
          })}
        </div>

        <div
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={`station-telemetry-tab-${activeMetric}`}
          tabIndex={0}
          className="mt-5 focus:outline-none"
        >
          <TrendChart
            data={analytics.readings}
            dataKey={config.key}
            color={config.color}
            seriesLabel={config.label}
            range="24h"
            average={summary.average}
            valueFormatter={config.formatter}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">{config.label}</span>
            <span className="text-xs text-muted-foreground">· last 24 hours</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span>
              Avg{" "}
              <span className="font-medium text-foreground tabular-nums">{config.formatter(summary.average)}</span>
            </span>
            <span>
              Min{" "}
              <span className="font-medium text-foreground tabular-nums">{config.formatter(summary.min)}</span>
            </span>
            <span>
              Max{" "}
              <span className="font-medium text-foreground tabular-nums">{config.formatter(summary.max)}</span>
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `color-mix(in srgb, ${trendColor} 14%, transparent)`, color: trendColor }}
            >
              {summary.trend === "up" && <TrendingUp className="h-3 w-3" aria-hidden="true" />}
              {summary.trend === "down" && <TrendingDown className="h-3 w-3" aria-hidden="true" />}
              {summary.trend === "stable" && <Minus className="h-3 w-3" aria-hidden="true" />}
              {summary.trend === "stable" ? "Steady" : `Trend ${summary.trend === "up" ? "+" : ""}${summary.trendDelta.toFixed(1)}`}
            </span>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          History comes from the deterministic simulated data feed · ESP32 hardware is not connected
        </p>
        </div>
      </div>
    </motion.section>
  );
}