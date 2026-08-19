"use client";

import { motion } from "framer-motion";
import { Sun, Leaf } from "lucide-react";
import type { AQICategory, MetricSummary } from "@/lib/environmental/types";

interface UvAirQualityProps {
  uv: MetricSummary;
  aqi: MetricSummary;
  uvRisk: string;
  aqiCategory: AQICategory;
}

const AQI_COLORS: Record<AQICategory, string> = {
  Good: "var(--color-success)",
  Moderate: "var(--color-warning)",
  Poor: "var(--color-danger)",
  Hazardous: "var(--color-danger)",
};

const AQI_CATEGORY_LABEL: Record<AQICategory, string> = {
  Good: "Good",
  Moderate: "Moderate",
  Poor: "Poor",
  Hazardous: "Hazardous",
};

function uvColor(value: number): string {
  if (value < 3) return "var(--color-success)";
  if (value < 6) return "var(--color-warning)";
  return "var(--color-danger)";
}

export function UvAirQuality({ uv, aqi, uvRisk, aqiCategory }: UvAirQualityProps) {
  const aqiColor = AQI_COLORS[aqiCategory];
  const currentUvColor = uvColor(uv.current);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="section-title">Air Quality &amp; UV</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <motion.div
        className="card-premium p-5 flex flex-col gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--color-warning) 15%, transparent)" }}>
              <Sun className="w-5 h-5" style={{ color: "var(--color-warning)" }} aria-hidden="true" />
            </div>
            <div>
              <p className="metric-label">UV Index</p>
              <p className="section-subtitle">Sun intensity</p>
            </div>
          </div>
          <span
            className="badge font-semibold"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-warning) 15%, transparent)", color: "var(--color-warning)" }}
          >
            {uvRisk}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="metric-value" style={{ color: currentUvColor }}>{uv.current.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">current</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Average</span>
            <span className="text-foreground font-medium">{uv.average.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Peak</span>
            <span className="text-foreground font-medium">{uv.max.toFixed(1)}</span>
          </div>
        </div>

        <div className="mt-auto">
          <div className="h-2.5 rounded-full overflow-hidden bg-muted/10" aria-hidden="true">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (uv.max / 12) * 100)}%`,
                background: "linear-gradient(90deg, var(--color-success), var(--color-warning), var(--color-danger))",
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
            <span>0</span>
            <span>Peak {uv.max.toFixed(1)}</span>
            <span>12+</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="card-premium p-5 flex flex-col gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)" }}>
              <Leaf className="w-5 h-5" style={{ color: "var(--color-accent)" }} aria-hidden="true" />
            </div>
            <div>
              <p className="metric-label">Air Quality</p>
              <p className="section-subtitle">AQI reading</p>
            </div>
          </div>
          <span
            className="badge font-semibold"
            style={{ backgroundColor: `color-mix(in srgb, ${aqiColor} 15%, transparent)`, color: aqiColor }}
          >
            {AQI_CATEGORY_LABEL[aqiCategory]}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="metric-value" style={{ color: aqiColor }}>{aqi.current.toFixed(0)}</span>
          <span className="text-sm text-muted-foreground">AQI · current</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Average</span>
            <span className="text-foreground font-medium">{aqi.average.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Range</span>
            <span className="text-foreground font-medium">{aqi.min.toFixed(0)} – {aqi.max.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trend</span>
            <span className="text-foreground font-medium capitalize">{aqi.trend}</span>
          </div>
        </div>

        <div className="mt-auto">
          <div className="h-2.5 rounded-full overflow-hidden bg-muted/10 flex" aria-hidden="true">
            <div className="h-full" style={{ width: "33%", backgroundColor: "var(--color-success)" }} />
            <div className="h-full" style={{ width: "34%", backgroundColor: "var(--color-warning)" }} />
            <div className="h-full" style={{ width: "33%", backgroundColor: "var(--color-danger)" }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
            <span>Good 50</span>
            <span>Moderate 100</span>
            <span>Poor 150+</span>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
}