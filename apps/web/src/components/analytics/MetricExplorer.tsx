"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ChartCard, TrendChart } from "./TrendChart";
import type { AnalyticsResult, MetricKey } from "@/lib/environmental/types";

interface MetricExplorerProps {
  result: AnalyticsResult;
  activeMetric: MetricKey;
  onMetricChange: (_metric: MetricKey) => void;
}

const METRICS: Array<{
  key: MetricKey;
  label: string;
  color: string;
  formatter: (_value: number) => string;
}> = [
  { key: "temperature", label: "Temperature", color: "var(--color-sun)", formatter: (v) => `${v.toFixed(1)}°C` },
  { key: "humidity", label: "Humidity", color: "var(--color-sky)", formatter: (v) => `${v.toFixed(0)}%` },
  { key: "windSpeed", label: "Wind", color: "var(--color-accent)", formatter: (v) => `${v.toFixed(1)} km/h` },
  { key: "uvIndex", label: "UV Index", color: "var(--color-warning)", formatter: (v) => `${v.toFixed(1)}` },
  { key: "airQuality", label: "Air Quality", color: "var(--color-info)", formatter: (v) => `${v.toFixed(0)} AQI` },
];

const TREND_COLORS = {
  up: "var(--color-success)",
  down: "var(--color-danger)",
  stable: "var(--color-muted)",
} as const;

const PANEL_ID = "analytics-trend-panel";

export function MetricExplorer({ result, activeMetric, onMetricChange }: MetricExplorerProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const config = METRICS.find((m) => m.key === activeMetric) ?? METRICS[0];
  const summary = result.summary[config.key];
  const trendColor = TREND_COLORS[summary.trend];

  const moveTab = (index: number, key: string) => {
    onMetricChange(METRICS[index].key);
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

  const trendText =
    summary.trend === "stable"
      ? "Stable"
      : `Trend ${summary.trend === "up" ? "+" : ""}${summary.trendDelta.toFixed(1)}`;

  const footerMeta = (
    <>
      <span>
        Average:{" "}
        <span className="text-foreground font-medium tabular-nums">{config.formatter(summary.average)}</span>
      </span>
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: `color-mix(in srgb, ${trendColor} 14%, transparent)`, color: trendColor }}
      >
        {summary.trend === "up" && <TrendingUp className="w-3 h-3" aria-hidden="true" />}
        {summary.trend === "down" && <TrendingDown className="w-3 h-3" aria-hidden="true" />}
        {summary.trend === "stable" && <Minus className="w-3 h-3" aria-hidden="true" />}
        {trendText}
      </span>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <ChartCard
        title="Environmental Trend"
        subtitle="Selected measurement over the current window"
        summaryLabel="Current"
        summaryValue={config.formatter(summary.current)}
        minMaxLabel={`Min ${config.formatter(summary.min)} · Max ${config.formatter(summary.max)}`}
        legendColor={config.color}
        legendLabel={config.label}
        footerMeta={footerMeta}
      >
        <div
          ref={tabsRef}
          className="flex flex-wrap items-center gap-2 mb-4"
          role="tablist"
          aria-label="Select measurement"
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
                id={`analytics-tab-${metric.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => onMetricChange(metric.key)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                  active
                    ? "bg-card ring-1 ring-border shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/5"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: metric.color }} aria-hidden="true" />
                {metric.label}
              </button>
            );
          })}
        </div>

        <div
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={`analytics-tab-${activeMetric}`}
          tabIndex={0}
          className="focus:outline-none"
        >
          <TrendChart
            data={result.readings}
            dataKey={config.key}
            color={config.color}
            seriesLabel={config.label}
            range={result.range}
            average={summary.average}
            valueFormatter={config.formatter}
          />
        </div>
      </ChartCard>
    </motion.div>
  );
}