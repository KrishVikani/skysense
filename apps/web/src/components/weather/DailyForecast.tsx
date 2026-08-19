"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, CloudSun, Droplets, Thermometer } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { convertTemperature, temperatureLabel } from "@/lib/settings/units";
import { dayLabelFor } from "@/lib/weather/conditions";
import type { DataSource } from "@/lib/environmental/types";
import type { WeatherDailyItem } from "@/lib/weather/types";
import { SectionHeader } from "@/components/SectionHeader";
import { visualStateOfCondition } from "@/lib/weather/visual";
import { WeatherVisualIcon } from "./WeatherVisualIcon";

interface DailyForecastProps {
  items: WeatherDailyItem[];
  /** Which source produced the items, to label provenance honestly. */
  dataSource: DataSource | "external";
}

const PROVENANCE_NOTE: Record<DataSource | "external", string> = {
  simulation: "Simulated outlook — a data-quality indicator, not a professional forecast.",
  esp32: "Estimated from your station's recent readings — not a professional forecast.",
  external: "Forecast from OpenWeather — daily aggregates for the coming days.",
};

export function DailyForecast({ items, dataSource }: DailyForecastProps) {
  const { settings } = useSettings();
  const units = settings.units;
  const tempUnit = temperatureLabel(units.temperature);
  const [selected, setSelected] = useState<string | null>(null);

  const temps = items.flatMap((d) => [convertTemperature(d.high, units.temperature), convertTemperature(d.low, units.temperature)]);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = max - min || 1;

  const toggle = (date: string) => setSelected((current) => (current === date ? null : date));

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.16 }}
      aria-labelledby="daily-forecast-title"
    >
      <SectionHeader
        id="daily-forecast-title"
        icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        title={`${items.length}-Day Forecast`}
        subtitle="Daily outlook for the coming days"
      />

      <div className="card-premium overflow-hidden">
        {items.map((item, index) => {
          const high = convertTemperature(item.high, units.temperature);
          const low = convertTemperature(item.low, units.temperature);
          const left = ((low - min) / span) * 100;
          const right = ((max - high) / span) * 100;
          const isOpen = selected === item.date;
          const detailId = `daily-detail-${item.date}`;

          return (
            <motion.div
              key={item.date}
              className="border-b border-border/60 last:border-0"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 + index * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => toggle(item.date)}
                aria-expanded={isOpen}
                aria-controls={detailId}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-200 hover:bg-accent-bg/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
              >
                <span className="w-16 shrink-0 text-sm font-semibold text-foreground">
                  {dayLabelFor(item.date)}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <WeatherVisualIcon state={visualStateOfCondition(item.condition)} className="h-6 w-6 shrink-0 text-accent" />
                  <span className="truncate text-sm text-muted-foreground">{item.condition.label}</span>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-sky-400">
                  <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.precipitationProbability}%
                </span>
                <div className="flex w-28 shrink-0 items-center justify-end gap-2">
                  <span className="w-9 text-right text-sm text-muted-foreground tabular-nums">
                    {Math.round(low)}°
                  </span>
                    <div
                      className="relative h-1.5 w-16 rounded-full bg-muted/10"
                      role="img"
                      aria-label={`Low ${Math.round(low)}${tempUnit}, high ${Math.round(high)}${tempUnit}`}
                    >
                      <div
                        className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400 via-accent/80 to-amber-400 shadow-[0_0_8px_-1px_rgba(13,148,136,0.5)]"
                        style={{ left: `${left}%`, right: `${right}%` }}
                      />
                    </div>
                  <span className="w-9 text-sm font-semibold text-foreground tabular-nums">
                    {Math.round(high)}°
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={detailId}
                    key="detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/50 bg-muted/[0.03] px-5 py-4 text-sm text-foreground/85">
                      <span className="inline-flex items-center gap-1.5">
                        <Thermometer className="h-4 w-4 text-accent" aria-hidden="true" />
                        High {Math.round(high)}° · Low {Math.round(low)}°
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Droplets className="h-4 w-4 text-sky-400" aria-hidden="true" />
                        Rain chance {item.precipitationProbability}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CloudSun className="h-4 w-4 text-accent" aria-hidden="true" />
                        {item.condition.label}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">{PROVENANCE_NOTE[dataSource]}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
