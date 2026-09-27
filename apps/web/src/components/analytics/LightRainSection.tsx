"use client";

import { motion } from "framer-motion";
import { Sun, CloudRain } from "lucide-react";
import type { MetricSummary } from "@/lib/environmental/types";

interface LightRainSectionProps {
  lightLevel: MetricSummary;
  lightLevelRisk: string;
  rainfall: MetricSummary;
}

function lightColor(value: number): string {
  if (value < 1000) return "var(--color-success)";
  if (value < 10000) return "var(--color-warning)";
  if (value < 50000) return "var(--color-danger)";
  return "var(--color-danger)";
}

export function LightRainSection({ lightLevel, lightLevelRisk, rainfall }: LightRainSectionProps) {
  const currentLightColor = lightColor(lightLevel.current);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="section-title">Light Level & Rainfall</h2>
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
                <p className="metric-label">Light Level</p>
                <p className="section-subtitle">Ambient illuminance (BH1750)</p>
              </div>
            </div>
            <span
              className="badge font-semibold"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-warning) 15%, transparent)", color: "var(--color-warning)" }}
            >
              {lightLevelRisk}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="metric-value" style={{ color: currentLightColor }}>{lightLevel.current.toFixed(0)}</span>
            <span className="text-sm text-muted-foreground">lx current</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Average</span>
              <span className="text-foreground font-medium">{lightLevel.average.toFixed(0)} lx</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Peak</span>
              <span className="text-foreground font-medium">{lightLevel.max.toFixed(0)} lx</span>
            </div>
          </div>

          <div className="mt-auto">
            <div className="h-2.5 rounded-full overflow-hidden bg-muted/10" aria-hidden="true">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (lightLevel.max / 100000) * 100)}%`,
                  background: "linear-gradient(90deg, var(--color-success), var(--color-warning), var(--color-danger))",
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
              <span>0 lx</span>
              <span>Peak {lightLevel.max.toFixed(0)} lx</span>
              <span>100k+ lx</span>
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
                <CloudRain className="w-5 h-5" style={{ color: "var(--color-accent)" }} aria-hidden="true" />
              </div>
              <div>
                <p className="metric-label">Rainfall</p>
                <p className="section-subtitle">Precipitation accumulation</p>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="metric-value" style={{ color: "var(--color-accent)" }}>{rainfall.current.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">mm current</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Average</span>
              <span className="text-foreground font-medium">{rainfall.average.toFixed(1)} mm</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Peak</span>
              <span className="text-foreground font-medium">{rainfall.max.toFixed(1)} mm</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trend</span>
              <span className="text-foreground font-medium capitalize">{rainfall.trend}</span>
            </div>
          </div>

          <div className="mt-auto">
            <div className="h-2.5 rounded-full overflow-hidden bg-muted/10" aria-hidden="true">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (rainfall.max / 50) * 100)}%`,
                  backgroundColor: "var(--color-accent)",
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
              <span>0 mm</span>
              <span>Peak {rainfall.max.toFixed(1)} mm</span>
              <span>50+ mm</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}