"use client";

import { motion } from "framer-motion";
import { CloudSun, Sparkles, Info } from "lucide-react";
import type { AIAnalysis } from "@/lib/intelligence/types";
import type { ForecastResult } from "@/lib/forecast/types";
import { SectionHeader } from "@/components/SectionHeader";

const SEVERITY_COLOR: Record<string, string> = {
  good: "var(--color-success)",
  info: "var(--color-info)",
  warning: "var(--color-warning)",
  critical: "var(--color-danger)",
};

interface AtmosphereSectionProps {
  analysis: AIAnalysis;
  forecast: ForecastResult;
}

export function AtmosphereSection({ analysis, forecast }: AtmosphereSectionProps) {
  const featuredInsights = analysis.insights.slice(0, 3);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.32 }}
    >
      <SectionHeader
        id="atmosphere-insight-title"
        icon={<CloudSun className="h-4 w-4" aria-hidden="true" />}
        title="Atmosphere &amp; Weather Insight"
        subtitle="AI-derived summary of current conditions and the short-term outlook"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-premium p-6">
          <div className="flex items-center gap-2">
            <CloudSun className="h-5 w-5 text-accent" aria-hidden="true" />
            <h3 className="section-title">Atmosphere</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{analysis.summary}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{analysis.trendSummary}</p>

          <ul className="mt-5 space-y-3">
            {featuredInsights.map((insight) => (
              <li key={insight.id} className="rounded-2xl bg-muted/5 p-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${SEVERITY_COLOR[insight.status]} 14%, transparent)`,
                      color: SEVERITY_COLOR[insight.status],
                    }}
                  >
                    {insight.statusLabel}
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {insight.label} · {insight.current}
                    {insight.unit}
                  </p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{insight.interpretation}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
            <h3 className="section-title">Weather Insight</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{forecast.explanation}</p>

          <ul className="mt-5 space-y-2">
            {forecast.contributingFactors.map((factor) => (
              <li key={factor} className="flex items-start gap-2 text-sm text-foreground/80">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--color-accent)" }}
                />
                <span>{factor}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Short-term outlook derived from the deterministic forecast engine over simulated data — a
              data-quality indicator, not a professional meteorological prediction.
            </span>
          </p>
        </div>
      </div>
    </motion.section>
  );
}