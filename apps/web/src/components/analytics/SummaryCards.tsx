"use client";

import { motion } from "framer-motion";
import { Thermometer, Droplets, Wind, Sun, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import type { MetricKey, MetricSummary } from "@/lib/environmental/types";

interface SummaryCardsProps {
  summary: Record<MetricKey, MetricSummary>;
  activeMetric?: MetricKey;
}

interface CardConfig {
  key: MetricKey;
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  color: string;
}

const CARDS: CardConfig[] = [
  { key: "temperature", label: "Temperature", icon: Thermometer, color: "var(--color-sun)" },
  { key: "humidity", label: "Humidity", icon: Droplets, color: "var(--color-sky)" },
  { key: "windSpeed", label: "Wind Speed", icon: Wind, color: "var(--color-accent)" },
  { key: "uvIndex", label: "UV Index", icon: Sun, color: "var(--color-warning)" },
];

const TREND_COLORS = {
  up: "var(--color-success)",
  down: "var(--color-danger)",
  stable: "var(--color-muted)",
} as const;

function formatValue(summary: MetricSummary, key: MetricKey): string {
  if (key === "temperature" || key === "windSpeed") return summary.current.toFixed(1);
  return summary.current.toFixed(0);
}

function formatAverage(summary: MetricSummary, key: MetricKey): string {
  const value = key === "temperature" || key === "windSpeed" ? summary.average.toFixed(1) : summary.average.toFixed(0);
  return `${value}${summary.unit}`;
}

function formatDelta(summary: MetricSummary): string {
  const abs = Math.abs(summary.trendDelta);
  if (summary.trend === "stable") return "Stable";
  const value = abs.toFixed(1);
  return `${summary.trend === "up" ? "↑" : "↓"} ${value}${summary.unit}`;
}

function minMaxText(summary: MetricSummary, key: MetricKey): string {
  const digits = key === "temperature" || key === "windSpeed" ? 1 : 0;
  return `Min ${summary.min.toFixed(digits)}${summary.unit} · Max ${summary.max.toFixed(digits)}${summary.unit}`;
}

export function SummaryCards({ summary, activeMetric }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, index) => {
        const metric = summary[card.key];
        const Icon = card.icon;
        const trendColor = TREND_COLORS[metric.trend];
        const isActive = activeMetric === card.key;

        return (
          <motion.div
            key={card.key}
            className={`card-premium p-5 flex flex-col gap-3 transition-colors duration-200 ${
              isActive ? "ring-1 ring-accent/50 border-accent/40" : ""
            }`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <p className="metric-label">{card.label}</p>
                {isActive && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent/15 text-accent whitespace-nowrap">
                    In chart
                  </span>
                )}
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${card.color} 15%, transparent)` }}
              >
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="metric-value">{formatValue(metric, card.key)}</span>
              {metric.unit && <span className="text-base font-medium text-muted-foreground">{metric.unit}</span>}
            </div>

            <p className="text-sm text-muted-foreground">Average {formatAverage(metric, card.key)}</p>

            <div className="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-border">
              <span className="text-xs text-muted-foreground">{minMaxText(metric, card.key)}</span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                style={{
                  backgroundColor: `color-mix(in srgb, ${trendColor} 14%, transparent)`,
                  color: trendColor,
                }}
              >
                {metric.trend === "up" && <TrendingUp className="w-3 h-3" />}
                {metric.trend === "down" && <TrendingDown className="w-3 h-3" />}
                {metric.trend === "stable" && <Minus className="w-3 h-3" />}
                {formatDelta(metric)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}