"use client";

import { motion } from "framer-motion";
import { CloudRain, Droplets } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import type { WeatherHourlyItem } from "@/lib/weather/types";
import type { DataSource } from "@/lib/environmental/types";
import { SectionHeader } from "@/components/SectionHeader";

function formatHour(time: string, timeFormat: "12h" | "24h"): string {
  const date = new Date(time);
  if (timeFormat === "24h") return `${String(date.getHours()).padStart(2, "0")}:00`;
  const hours = date.getHours();
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display} ${suffix}`;
}

interface PrecipitationTimelineProps {
  items: WeatherHourlyItem[];
  /** Which source produced the items, to label provenance honestly. */
  dataSource: DataSource | "external";
}

const FOOTER_TEXT: Record<DataSource | "external", string> = {
  simulation: "Rain chance derived from simulated conditions",
  esp32: "Rain chance derived from your station's recent readings",
  external: "Rain chance via OpenWeather · 3-hour steps",
};

const BAR_MAX = 88;

export function PrecipitationTimeline({ items, dataSource }: PrecipitationTimelineProps) {
  const { settings } = useSettings();
  const timeFormat = settings.general.timeFormat;

  if (items.length === 0) return null;
  const hasData = items.some((item) => item.precipitationProbability != null);
  if (!hasData) return null;

  const probabilities = items.map((item) => item.precipitationProbability ?? 0);
  const maxProb = Math.max(...probabilities);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      aria-labelledby="precipitation-title"
    >
      <SectionHeader
        id="precipitation-title"
        icon={<CloudRain className="h-4 w-4" aria-hidden="true" />}
        title="Precipitation"
        subtitle="Rain chance, next 24 hours"
      />

      <div className="card-premium p-5 sm:p-6">
        {maxProb === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500/[0.07] via-muted/5 to-transparent px-4 py-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <Droplets className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">No rain expected</p>
              <p className="text-xs text-muted-foreground">
                Staying dry across the forecast window — no rain in the hours ahead.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-proximity [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)]"
              role="list"
              aria-label="Hourly precipitation probability"
            >
              {items.map((item) => {
                const prob = item.precipitationProbability ?? 0;
                const height = Math.round(prob > 0 ? 8 + (prob / 100) * (BAR_MAX - 8) : 4);
                const isNotable = prob >= 60;
                return (
                  <div
                    key={item.time}
                    role="listitem"
                    title={`Rain chance ${prob}% at ${formatHour(item.time, timeFormat)}`}
                    className="group flex w-14 shrink-0 snap-start flex-col items-center gap-1.5"
                  >
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {item.isNow ? "Now" : formatHour(item.time, timeFormat)}
                    </p>
                    <div className="flex h-[88px] w-full items-end justify-center">
                      <span
                        className={`w-6 rounded-full transition-all duration-200 ease-out ${
                          isNotable
                            ? "bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 shadow-[0_0_14px_-2px_rgba(59,130,246,0.6)]"
                            : prob > 0
                              ? "bg-gradient-to-t from-blue-500/70 to-blue-400/70"
                              : "bg-muted/15"
                        } group-hover:scale-y-110 group-hover:brightness-125`}
                        style={{ height: `${height}px` }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        isNotable ? "text-blue-400" : "text-muted-foreground"
                      }`}
                    >
                      {prob}%
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">{FOOTER_TEXT[dataSource]}</div>
          </>
        )}
      </div>
    </motion.section>
  );
}