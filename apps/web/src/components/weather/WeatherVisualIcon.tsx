"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  type LucideIcon,
} from "lucide-react";
import type { WeatherVisualState } from "@/lib/weather/visual";

/**
 * Premium weather icon system — one cohesive icon per visual state.
 *
 * Every icon shares the same stroke weight and sizing so hourly/daily rows and
 * the hero read as one product. State changes crossfade the icon (opacity +
 * subtle scale) while the surrounding text stays stable. Icons are decorative
 * (`aria-hidden`); the weather condition is always communicated as text.
 */
const STATE_ICONS: Record<WeatherVisualState, LucideIcon> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  "heavy-rain": CloudRainWind,
  drizzle: CloudDrizzle,
  thunderstorm: CloudLightning,
  snow: CloudSnow,
  mist: CloudFog,
  night: Moon,
  "night-cloudy": CloudMoon,
  sunrise: Sunrise,
  sunset: Sunset,
};

export function WeatherVisualIcon({
  state,
  className = "w-6 h-6",
}: {
  state: WeatherVisualState;
  className?: string;
}) {
  const Icon = STATE_ICONS[state] ?? Cloud;
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        key={state}
        initial={{ opacity: 0, scale: 0.82, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.82 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="inline-flex"
        aria-hidden="true"
      >
        <Icon className={className} strokeWidth={1.5} />
      </motion.span>
    </AnimatePresence>
  );
}