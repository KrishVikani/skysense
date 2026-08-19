"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { todayOutlook } from "@/lib/weather/outlook";
import type { WeatherCurrent, WeatherDailyItem, WeatherHourlyItem } from "@/lib/weather/types";
import type { DataSource } from "@/lib/environmental/types";

interface TodayOutlookProps {
  current: WeatherCurrent;
  hourly: WeatherHourlyItem[];
  daily: WeatherDailyItem[];
  /** Which source produced the data, to label provenance honestly. */
  dataSource: DataSource | "external";
}

const SUBTITLE: Record<DataSource | "external", string> = {
  simulation: "A quick read on the day, derived from simulated conditions",
  esp32: "A quick read on the day, derived from your station's readings",
  external: "A quick read on the day, derived from live conditions",
};

export function TodayOutlook({ current, hourly, daily, dataSource }: TodayOutlookProps) {
  const outlook = todayOutlook(current, hourly, daily);
  if (!outlook) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      aria-labelledby="today-outlook-title"
    >
      <SectionHeader
        id="today-outlook-title"
        icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        title="Today's Outlook"
        subtitle={SUBTITLE[dataSource]}
      />

      <div className="card-premium relative overflow-hidden p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden="true"
        />
        <p className="relative max-w-2xl text-balance text-base leading-relaxed text-foreground/90 sm:text-[17px]">
          {outlook}
        </p>
      </div>
    </motion.section>
  );
}