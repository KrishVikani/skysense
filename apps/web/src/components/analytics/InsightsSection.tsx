"use client";

import { motion } from "framer-motion";
import { Thermometer, Droplets, Wind, Sun, Leaf, CloudRain, Lightbulb } from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import type { Insight, InsightIcon, InsightTone } from "@/lib/environmental/types";

interface InsightsSectionProps {
  insights: Insight[];
}

const ICONS: Record<InsightIcon, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  temperature: Thermometer,
  humidity: Droplets,
  wind: Wind,
  uv: Sun,
  air: Leaf,
  rain: CloudRain,
};

const TONE_STYLES: Record<InsightTone, { color: string; label: string }> = {
  good: { color: "var(--color-success)", label: "Good" },
  warning: { color: "var(--color-warning)", label: "Heads up" },
  info: { color: "var(--color-info)", label: "Info" },
};

export function InsightsSection({ insights }: InsightsSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-accent" aria-hidden="true" />
        <h2 className="section-title">Environmental Insights</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => {
          const Icon = ICONS[insight.icon];
          const tone = TONE_STYLES[insight.tone];
          return (
            <motion.div
              key={insight.id}
              className="card-premium p-5 flex gap-4 relative overflow-hidden"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: tone.color }}
                aria-hidden="true"
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${tone.color} 15%, transparent)` }}
              >
                <Icon className="w-5 h-5" style={{ color: tone.color }} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">{insight.title}</p>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: `color-mix(in srgb, ${tone.color} 14%, transparent)`, color: tone.color }}
                  >
                    {tone.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{insight.content}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}