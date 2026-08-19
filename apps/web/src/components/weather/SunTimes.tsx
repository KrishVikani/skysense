"use client";

import { motion } from "framer-motion";
import { Sunrise as SunriseIcon, Sunset as SunsetIcon, SunMedium } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";

interface SunTimesProps {
  sunrise?: string;
  sunset?: string;
  timezoneOffsetSeconds?: number;
}

function formatSunTime(iso: string, timezoneOffsetSeconds?: number): string {
  const date = new Date(iso);
  const shifted = timezoneOffsetSeconds == null ? date : new Date(date.getTime() + timezoneOffsetSeconds * 1000);
  return shifted.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezoneOffsetSeconds == null ? undefined : "UTC",
  });
}

function daylightDuration(sunrise: string, sunset: string): string {
  const ms = Math.max(0, new Date(sunset).getTime() - new Date(sunrise).getTime());
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const ARC_W = 360;
const ARC_H = 132;
const CX = ARC_W / 2;
const CY = ARC_H;
const R = 120;

/**
 * Sunrise / sunset visualization.
 *
 * A daylight arc: the sun's travel from sunrise (left) to sunset (right) is
 * drawn with a warm gradient and the current position is marked along the arc.
 * Rendered ONLY when the active source supplies astronomical values — nothing
 * here is invented. When no sun times are available the section is omitted.
 */
export function SunTimes({ sunrise, sunset, timezoneOffsetSeconds }: SunTimesProps) {
  if (!sunrise || !sunset) return null;

  const now = Date.now();
  const start = new Date(sunrise).getTime();
  const end = new Date(sunset).getTime();
  const hasRange = end > start;
  const progress = hasRange ? clamp((now - start) / (end - start), 0, 1) : 0;
  const angle = Math.PI * (1 - progress);
  const dotX = CX + R * Math.cos(angle);
  const dotY = CY - R * Math.sin(angle);
  const startX = CX + R * Math.cos(Math.PI);
  const startY = CY - R * Math.sin(Math.PI);
  const endX = CX + R * Math.cos(0);
  const endY = CY - R * Math.sin(0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.28 }}
      aria-labelledby="sun-times-title"
    >
      <SectionHeader
        id="sun-times-title"
        icon={<SunMedium className="h-4 w-4" aria-hidden="true" />}
        title="Sunrise & Sunset"
        subtitle={hasRange ? `Daylight today: ${daylightDuration(sunrise, sunset)}` : undefined}
      />

      <div className="card-premium relative overflow-hidden p-5 lg:p-6">
        <div
          className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="flex flex-col items-center">
          <svg
            viewBox={`0 0 ${ARC_W} ${ARC_H}`}
            className="h-auto w-full max-w-md"
            role="img"
            aria-label={
              hasRange
                ? `Sunrise at ${formatSunTime(sunrise, timezoneOffsetSeconds)}, sunset at ${formatSunTime(sunset, timezoneOffsetSeconds)}. The sun is ${Math.round(progress * 100)}% of the way across the sky.`
                : `Sunrise at ${formatSunTime(sunrise, timezoneOffsetSeconds)}, sunset at ${formatSunTime(sunset, timezoneOffsetSeconds)}.`
            }
          >
            <defs>
              <linearGradient id="sun-arc-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-sun)" stopOpacity="0.55" />
                <stop offset="50%" stopColor="var(--color-sun)" />
                <stop offset="100%" stopColor="var(--color-accent)" />
              </linearGradient>
              <radialGradient id="sun-dot-glow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="var(--color-sun)" stopOpacity="0.9" />
                <stop offset="60%" stopColor="var(--color-sun)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--color-sun)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <path
              d={`M ${startX} ${startY} A ${R} ${R} 0 0 1 ${endX} ${endY}`}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {hasRange && (
              <>
                <path
                  d={`M ${startX} ${startY} A ${R} ${R} 0 0 1 ${dotX} ${dotY}`}
                  fill="none"
                  stroke="url(#sun-arc-gradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle cx={dotX} cy={dotY} r="26" fill="url(#sun-dot-glow)" opacity="0.7" />
                <circle cx={dotX} cy={dotY} r="8" fill="var(--color-sun)" stroke="var(--color-card)" strokeWidth="2.5" />
              </>
            )}
            <circle cx={startX} cy={startY} r="4" fill="var(--color-sun)" opacity="0.9" />
            <circle cx={endX} cy={endY} r="4" fill="var(--color-accent)" opacity="0.9" />
          </svg>

          <div className="mt-3 flex w-full max-w-md items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <SunriseIcon className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span className="tabular-nums text-sm font-semibold text-foreground">
                {formatSunTime(sunrise, timezoneOffsetSeconds)}
              </span>
            </span>
            {hasRange && (
              <span className="text-muted-foreground" aria-hidden="true">
                {Math.round(progress * 100)}% through the day
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="tabular-nums text-sm font-semibold text-foreground">
                {formatSunTime(sunset, timezoneOffsetSeconds)}
              </span>
              <SunsetIcon className="h-4 w-4 text-orange-500" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}