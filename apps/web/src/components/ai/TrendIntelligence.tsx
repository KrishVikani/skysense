"use client";

import { motion } from "framer-motion";
import { Activity, ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react";
import type { TrendInfo } from "@/lib/intelligence/types";

interface TrendIntelligenceProps {
  trends: TrendInfo[];
  summary: string;
}

const TREND_STYLES: Record<TrendInfo["classification"], { label: string; color: string; Icon: typeof ArrowUp }> = {
  Increasing: { label: "Increasing", color: "var(--color-warning)", Icon: ArrowUp },
  Decreasing: { label: "Decreasing", color: "var(--color-info)", Icon: ArrowDown },
  Stable: { label: "Stable", color: "var(--color-success)", Icon: Minus },
  Fluctuating: { label: "Fluctuating", color: "var(--color-danger)", Icon: Activity },
};

export function TrendIntelligence({ trends, summary }: TrendIntelligenceProps) {
  return (
    <motion.div
      className="card-premium p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 }}
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-accent" />
        <h2 className="section-title">Trend Intelligence</h2>
      </div>
      <p className="section-subtitle mt-0.5">Direction and stability detected across the analysis window</p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-5">
        {trends.map((trend, index) => {
          const style = TREND_STYLES[trend.classification];
          return (
            <motion.div
              key={trend.id}
              className="p-4 rounded-xl bg-muted/5 flex flex-col gap-1.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
            >
              <span className="text-xs text-muted-foreground">{trend.label}</span>
              <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                <style.Icon className="w-3.5 h-3.5" style={{ color: style.color }} aria-hidden="true" />
                {trend.deltaLabel}
              </span>
              <span
                className="badge self-start text-xs"
                style={{ backgroundColor: `color-mix(in srgb, ${style.color} 15%, transparent)`, color: style.color }}
              >
                {style.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-5 text-sm text-muted-foreground leading-relaxed">{summary}</p>
    </motion.div>
  );
}