"use client";

import { motion } from "framer-motion";
import { Droplets, Clock } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { convertTemperature, temperatureLabel } from "@/lib/settings/units";
import type { DataSource } from "@/lib/environmental/types";
import type { WeatherHourlyItem } from "@/lib/weather/types";
import { SectionHeader } from "@/components/SectionHeader";
import { visualStateOfCondition } from "@/lib/weather/visual";
import { WeatherVisualIcon } from "./WeatherVisualIcon";

function formatHour(time: string, timeFormat: "12h" | "24h"): string {
  const date = new Date(time);
  if (timeFormat === "24h") return `${String(date.getHours()).padStart(2, "0")}:00`;
  const hours = date.getHours();
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display} ${suffix}`;
}

interface HourlyForecastProps {
  items: WeatherHourlyItem[];
  /** Which source produced the items, to label provenance honestly. */
  dataSource: DataSource | "external";
}

const FOOTER_TEXT: Record<DataSource | "external", string> = {
  simulation: "Hourly outlook derived from simulated conditions",
  esp32: "Hourly outlook estimated from your station's recent readings",
  external: "Hourly forecast via OpenWeather · 3-hour steps",
};

export function HourlyForecast({ items, dataSource }: HourlyForecastProps) {
  const { settings } = useSettings();
  const units = settings.units;
  const tempUnit = temperatureLabel(units.temperature);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      aria-labelledby="hourly-forecast-title"
    >
      <SectionHeader
        id="hourly-forecast-title"
        icon={<Clock className="h-4 w-4" aria-hidden="true" />}
        title="Hourly Forecast"
        subtitle="Next 24 hours"
      />

      <div className="card-premium p-5 sm:p-6">
          <div
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-proximity scroll-smooth [mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-1.25rem),transparent)]"
            role="list"
            aria-label="Hourly weather forecast"
          >
            {items.map((item) => (
              <div
                key={item.time}
                role="listitem"
                title={`${item.condition.label} · ${Math.round(convertTemperature(item.temperature, units.temperature))}${tempUnit} · ${item.precipitationProbability}% rain chance · ${formatHour(item.time, settings.general.timeFormat)}`}
                className={`group/item flex w-20 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl px-2 py-3 transition-all duration-200 ease-out ${
                  item.isNow
                    ? "bg-gradient-to-b from-accent-bg/90 to-accent-bg/40 text-accent ring-1 ring-accent/40 shadow-[0_8px_20px_-10px_rgba(20,184,166,0.45)]"
                    : "bg-muted/5 text-muted-foreground hover:-translate-y-0.5 hover:bg-muted/10 hover:ring-1 hover:ring-border-hover"
                }`}
              >
                <p className={`text-xs font-medium ${item.isNow ? "text-accent" : ""}`}>
                  {item.isNow ? (
                    <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                      NOW
                    </span>
                  ) : (
                    formatHour(item.time, settings.general.timeFormat)
                  )}
                </p>
                <WeatherVisualIcon state={visualStateOfCondition(item.condition)} className="h-7 w-7" />
                <p className="text-base font-bold tabular-nums text-foreground">
                  {Math.round(convertTemperature(item.temperature, units.temperature))}°
                </p>
                <span className="flex items-center gap-1 text-[11px] font-medium text-sky-400">
                  <Droplets className="h-3 w-3" aria-hidden="true" />
                  {item.precipitationProbability}%
                </span>
                <span className="line-clamp-1 max-w-full text-[10px] font-medium text-secondary opacity-0 transition-opacity duration-200 group-hover/item:opacity-100">
                  {item.condition.label}
                </span>
              </div>
            ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{FOOTER_TEXT[dataSource]}</span>
          <span>{tempUnit}</span>
        </div>
      </div>
    </motion.section>
  );
}