"use client";

import { motion } from "framer-motion";
import { Wind as WindIcon, Gauge, Navigation, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnvironmentalReading, TimeRange, WindSummary } from "@/lib/environmental/types";
import { formatX, fullTimestamp } from "./chartUtils";

interface WindAnalyticsProps {
  data: EnvironmentalReading[];
  range: TimeRange;
  wind: WindSummary;
}

interface TooltipEntry {
  value?: number | string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: string | number;
}

export function WindAnalytics({ data, range, wind }: WindAnalyticsProps) {
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const raw = typeof payload[0].value === "number" ? payload[0].value : 0;
    const time = label !== undefined ? fullTimestamp(String(label)) : "";
    return (
      <div className="card-elevated px-3 py-2.5 shadow-lg min-w-[180px] pointer-events-none">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Wind Speed</p>
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: "var(--color-accent)" }}
            aria-hidden="true"
          />
          <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: "var(--color-accent)" }}>
            {raw.toFixed(1)} km/h
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{time}</p>
      </div>
    );
  };

  return (
    <div className="card-premium p-4 lg:p-6 min-w-0">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="section-title">Wind Analytics</h2>
          <p className="section-subtitle">Wind speed trend and direction</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-accent" aria-hidden="true" />
            Avg <span className="text-foreground font-medium">{wind.averageSpeed.toFixed(1)} km/h</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-accent" aria-hidden="true" />
            Max <span className="text-foreground font-medium">{wind.maxSpeed.toFixed(1)} km/h</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-[240px] overflow-hidden" role="img" aria-label="Wind speed trend chart over the selected time range">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="category"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, dy: 8 }}
                tickFormatter={(value: string) => formatX(value, range)}
                interval="preserveStartEnd"
                tickCount={6}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                domain={[0, "auto"]}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, dx: -8 }}
                tickFormatter={(v: number) => `${v}`}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ pointerEvents: "none", outline: "none", zIndex: 30 }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="windSpeed"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                fill="url(#windGradient)"
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--color-card)", fill: "var(--color-accent)" }}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <motion.div
          className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-muted/5 border border-border"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-2">
            <WindIcon className="w-4 h-4 text-accent" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Dominant Direction</p>
          </div>

          <div className="relative w-28 h-28">
            <div className="absolute inset-0 rounded-full border border-border" />
            <div className="absolute inset-3 rounded-full border border-border/60" />
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground">N</span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground">S</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">W</span>
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">E</span>
            <div
              className="absolute left-1/2 top-1/2 flex items-center justify-center"
              style={{ transform: `translate(-50%, -50%) rotate(${wind.dominantDirectionDeg}deg)` }}
            >
              <Navigation className="w-6 h-6 text-accent" aria-hidden="true" />
            </div>
            <div className="absolute left-1/2 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{wind.dominantDirectionLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{wind.dominantDirectionDeg.toFixed(0)}° from north</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}