"use client";

import { motion } from "framer-motion";
import { Droplets, Eye, Sparkles, Sun, Thermometer, Umbrella, Wind, type LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import type { WeatherCurrent } from "@/lib/weather/types";
import { summarizeWeather, weatherInsights } from "@/lib/weather/summary";

const TONE_CLASSES = {
  accent: "bg-accent/10 text-accent ring-accent/25",
  sky: "bg-blue-500/10 text-blue-400 ring-blue-500/30",
  sun: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  muted: "bg-muted/10 text-muted-foreground ring-border",
} as const;

const INSIGHT_ICONS: Record<string, LucideIcon> = {
  "high-humidity": Droplets,
  "low-humidity": Droplets,
  "strong-wind": Wind,
  calm: Wind,
  "good-visibility": Eye,
  "low-visibility": Eye,
  "rain-likely": Umbrella,
  "high-uv": Sun,
  "feels-different": Thermometer,
};

/**
 * Natural-language summary of the current conditions plus small contextual
 * insight chips. Everything is generated strictly from the provider's actual
 * data (see {@link summarizeWeather} and {@link weatherInsights}); missing or
 * unsupported fields are simply omitted rather than invented.
 */
export function WeatherInsight({ data }: { data: WeatherCurrent }) {
  const summary = summarizeWeather(data);
  const insights = weatherInsights(data);
  if (!summary && insights.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      aria-labelledby="weather-insight-title"
    >
      <SectionHeader
        id="weather-insight-title"
        icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        title="Weather insight"
        subtitle="A quick read on today's conditions"
      />
      <div className="card-premium p-5">
        {summary && <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>}

        {insights.length > 0 && (
          <ul className={`flex flex-wrap gap-2 ${summary ? "mt-4" : ""}`} aria-label="Condition highlights">
            {insights.map((insight) => {
              const Icon = INSIGHT_ICONS[insight.id] ?? Sparkles;
              return (
                <li
                  key={insight.id}
                  title={insight.detail}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${TONE_CLASSES[insight.tone]}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {insight.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.section>
  );
}