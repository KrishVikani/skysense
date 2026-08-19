"use client";

import { useState } from "react";
import type { FC } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HistoricalDataPoint } from "@skysense/domain-types";

interface AnalyticsProps {
  data: HistoricalDataPoint[];
  timeRange: "24h" | "7d" | "30d";
  onTimeRangeChange: (range: "24h" | "7d" | "30d") => void;
  className?: string;
}

const metricConfig = {
  temperature: {
    label: "Temperature (°C)",
    color: "var(--color-sun)",
    unit: "°C",
    formatter: (v: number) => `${v.toFixed(1)}°`,
  },
  humidity: {
    label: "Humidity (%)",
    color: "var(--color-sky)",
    unit: "%",
    formatter: (v: number) => `${v.toFixed(0)}%`,
  },
  aqi: {
    label: "AQI",
    color: "var(--color-accent)",
    unit: "",
    formatter: (v: number) => `${v.toFixed(0)}`,
  },
  uvIndex: {
    label: "UV Index",
    color: "var(--color-warning)",
    unit: "",
    formatter: (v: number) => `${v.toFixed(1)}`,
  },
};

type MetricKey = keyof typeof metricConfig;

const RANGE_POINTS: Record<AnalyticsProps["timeRange"], number> = {
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

export const Analytics: FC<AnalyticsProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  className = "",
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("temperature");

  const metrics: MetricKey[] = ["temperature", "humidity", "aqi", "uvIndex"];

  const isDaily = timeRange !== "24h";
  const filteredData = data.slice(-RANGE_POINTS[timeRange]);

  const currentMetricConfig = metricConfig[activeMetric];

  const formatTimestamp = (value: string | number) => {
    const date = new Date(value);
    return isDaily
      ? date.toLocaleDateString([], { month: "short", day: "numeric" })
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getYDomain = () => {
    const values = filteredData.map((d) => d[activeMetric]).filter((v) => v !== undefined) as number[];
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.15 || 5;
    return [Math.max(0, min - padding), max + padding];
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string | number;
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <motion.div
        className="card-elevated p-3 min-w-[160px]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className="text-xs text-muted-foreground mb-1.5">
          {label !== undefined ? formatTimestamp(label) : ""}
        </p>
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentMetricConfig.color }}
            aria-hidden="true"
          />
          <p className="text-lg font-bold tabular-nums" style={{ color: currentMetricConfig.color }}>
            {currentMetricConfig.formatter(payload[0].value)}
          </p>
        </div>
      </motion.div>
    );
  };

  const lastValue = filteredData[filteredData.length - 1]?.[activeMetric] ?? 0;
  const avgValue = filteredData.length
    ? filteredData.reduce((a, b) => a + (b[activeMetric] || 0), 0) / filteredData.length
    : 0;
  const rangeValues = filteredData.map((d) => d[activeMetric] || 0);
  const minValue = rangeValues.length ? Math.min(...rangeValues) : 0;
  const maxValue = rangeValues.length ? Math.max(...rangeValues) : 0;

  return (
    <div className={className}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="section-title">Environmental Analytics</h2>
          <p className="section-subtitle">Historical trends and patterns</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-muted/5 rounded-xl p-1" role="radiogroup" aria-label="Time range">
            {(["24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                  timeRange === range
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                role="radio"
                aria-checked={timeRange === range}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2" role="tablist">
        {metrics.map((metric) => (
          <button
            key={metric}
            onClick={() => setActiveMetric(metric)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              activeMetric === metric
                ? "bg-accent text-white shadow-lg shadow-accent/25"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border-hover"
            }`}
            role="tab"
            aria-selected={activeMetric === metric}
          >
            {metricConfig[metric].label}
          </button>
        ))}
      </div>

      <div className="card-premium p-4 lg:p-6">
        <div className="h-[300px] lg:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="var(--color-border)"
                strokeOpacity={0.7}
                vertical={false}
                horizontal={true}
              />
              <XAxis
                dataKey="timestamp"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{
                  fill: "var(--color-muted-foreground)",
                  fontSize: 11,
                }}
                tickFormatter={formatTimestamp}
                interval="preserveStartEnd"
                tickCount={6}
              />
              <YAxis
                type="number"
                domain={getYDomain()}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{
                  fill: "var(--color-muted-foreground)",
                  fontSize: 11,
                }}
                tickFormatter={(value) => currentMetricConfig.formatter(value)}
                orientation="left"
                width={48}
              />
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ pointerEvents: "none" }} />
              <Line
                key={activeMetric}
                type="monotone"
                dataKey={activeMetric}
                stroke={currentMetricConfig.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, fill: "var(--color-card)", stroke: currentMetricConfig.color }}
                isAnimationActive
                animationDuration={800}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentMetricConfig.color }} />
            <span className="text-sm font-medium text-foreground">{currentMetricConfig.label}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              Current:{" "}
              <span className="text-foreground font-medium tabular-nums">
                {currentMetricConfig.formatter(lastValue)}
              </span>
            </span>
            <span>
              Avg:{" "}
              <span className="text-foreground font-medium tabular-nums">
                {currentMetricConfig.formatter(avgValue)}
              </span>
            </span>
            <span>
              Range:{" "}
              <span className="text-foreground font-medium tabular-nums">
                {currentMetricConfig.formatter(minValue)} – {currentMetricConfig.formatter(maxValue)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export type { AnalyticsProps };