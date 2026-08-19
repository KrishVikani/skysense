"use client";

import { motion } from "framer-motion";
import { Droplets, Leaf, Lightbulb, Sun, Thermometer, Wind } from "lucide-react";
import type { MetricInsight } from "@/lib/intelligence/types";
import { SEVERITY_COLOR } from "./severity";

interface InsightCardsProps {
  insights: MetricInsight[];
}

const INSIGHT_ICONS: Record<string, typeof Thermometer> = {
  temperature: Thermometer,
  humidity: Droplets,
  wind: Wind,
  uv: Sun,
  air: Leaf,
};

const INSIGHT_ACCENTS: Record<string, string> = {
  temperature: "var(--color-sun)",
  humidity: "var(--color-sky)",
  wind: "var(--color-accent)",
  uv: "var(--color-warning)",
  air: "var(--color-success)",
};

export function InsightCards({ insights }: InsightCardsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div>
        <h2 className="section-title">Metric Insights</h2>
        <p className="section-subtitle mt-0.5">Interpretation of each monitored metric</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
        {insights.map((insight, index) => {
          const Icon = INSIGHT_ICONS[insight.id] ?? Thermometer;
          const accent = INSIGHT_ACCENTS[insight.id] ?? "var(--color-accent)";
          const color = SEVERITY_COLOR[insight.status];
          return (
            <motion.div
              key={insight.id}
              className="card-elevated p-5 flex flex-col gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.12 + index * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-muted/5" style={{ color: accent }}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">{insight.label}</span>
                </div>
                <span
                  className="badge text-xs font-medium"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  {insight.statusLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">{insight.current}</span>
                <span className="text-sm text-muted-foreground">{insight.unit}</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  Assessment
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{insight.interpretation}</p>
              </div>
              <div className="mt-auto pt-3 border-t border-border/60 flex gap-2 items-start">
                <Lightbulb className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Recommendation
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.recommendation}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}