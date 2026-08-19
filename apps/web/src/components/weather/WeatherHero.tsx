"use client";

import { motion } from "framer-motion";
import { MapPin, RefreshCw } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { convertTemperature, convertWind, temperatureLabel, windLabel } from "@/lib/settings/units";
import type { WeatherLocation } from "@/lib/weather/locations";
import type { WeatherCurrent } from "@/lib/weather/types";
import type { WeatherVisualState } from "@/lib/weather/visual";
import { visualConfig } from "@/lib/weather/visual";
import { WeatherVisualIcon } from "./WeatherVisualIcon";
import { WeatherConditionVisual } from "./WeatherConditionVisual";

interface WeatherHeroProps {
  data: WeatherCurrent;
  /** The currently selected location (city / region / country). */
  location: WeatherLocation;
  /** Provenance label, e.g. "OpenWeather · live" or "Simulated environmental data". */
  source: string;
  visualState: WeatherVisualState;
  /** UTC offset in seconds of the reported location, when known. */
  timezoneOffsetSeconds?: number;
}

function formatNow(timezoneOffsetSeconds?: number): { date: string; time: string } {
  const now = new Date();
  const shifted = timezoneOffsetSeconds == null ? now : new Date(now.getTime() + timezoneOffsetSeconds * 1000);
  const timeZone = timezoneOffsetSeconds == null ? undefined : "UTC";
  return {
    date: shifted.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone,
    }),
    time: shifted.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }),
  };
}

/** Formats a provider-reported local timestamp using the same offset handling as the rest of the page. */
function formatUpdated(iso: string, timezoneOffsetSeconds?: number): string {
  const date = new Date(iso);
  const shifted = timezoneOffsetSeconds == null ? date : new Date(date.getTime() + timezoneOffsetSeconds * 1000);
  return shifted.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezoneOffsetSeconds == null ? undefined : "UTC",
  });
}

/**
 * Premium weather hero — the visual focal point of the Weather page.
 *
 * Hierarchy: brand → location + region/country + date → large temperature →
 * condition (icon + natural-language description) → feels-like + high/low.
 * Deliberately light on metrics; the detailed cards live below the fold.
 */
export function WeatherHero({ data, location, source, visualState, timezoneOffsetSeconds }: WeatherHeroProps) {
  const { settings } = useSettings();
  const units = settings.units;
  const config = visualConfig(visualState);
  const { date, time } = formatNow(timezoneOffsetSeconds);
  const updated = formatUpdated(data.updatedAt, timezoneOffsetSeconds);

  const goldenHour = visualState === "sunrise" || visualState === "sunset";
  const overlay = config.isNight
    ? "from-black/40 via-black/15 to-black/40"
    : goldenHour
      ? "from-black/25 via-transparent to-black/25"
      : "from-black/20 via-transparent to-black/25";

  const regionLine = location.state ? `${location.state}, ${location.country}` : location.country;

  const temp = convertTemperature(data.temperature, units.temperature);
  const feelsLike = convertTemperature(data.feelsLike, units.temperature);
  const high = convertTemperature(data.high, units.temperature);
  const low = convertTemperature(data.low, units.temperature);
  const tempUnit = temperatureLabel(units.temperature);
  const formatTemp = (value: number) => `${Math.round(value)}${tempUnit}`;

  return (
    <motion.section
      className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-sky-950/20"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <WeatherConditionVisual state={visualState} />
      <div
        className={`absolute inset-0 bg-gradient-to-b ${overlay}`}
        aria-hidden="true"
      />
      {/* Depth: a bright glass top-edge line and a soft bottom vignette keep the
          scene layered without extra cards. */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 p-6 lg:p-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              SKYSENSE
            </p>
            <div className="mt-2 flex items-center gap-2 text-white">
              <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
              <h1 className="truncate text-2xl font-semibold tracking-tight lg:text-3xl">{location.name}</h1>
            </div>
            <p className="mt-1 text-sm text-white/75">
              {regionLine} <span className="mx-1 text-white/40">·</span> {date}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300" />
              </span>
              {source}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Updated {updated}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:mt-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-white">
            <div className="relative inline-block">
              <div
                className="pointer-events-none absolute -left-12 -top-14 h-64 w-64 rounded-full opacity-70 blur-3xl"
                style={{ background: `radial-gradient(circle, ${config.glowColor} 0%, color-mix(in srgb, ${config.glowColor} 22%, transparent) 55%, transparent 75%)` }}
                aria-hidden="true"
              />
              <p className="relative bg-gradient-to-b from-white via-white to-white/55 bg-clip-text text-7xl font-bold leading-[0.9] tracking-tight text-transparent tabular-nums lg:text-8xl">
                {Math.round(temp)}°
              </p>
            </div>
            <div className="mt-5 flex items-center gap-4 text-white">
              <span
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md lg:h-24 lg:w-24"
                style={{
                  boxShadow: `0 0 34px ${config.glowColor}55, inset 0 0 18px ${config.glowColor}26`,
                }}
                aria-hidden="true"
              >
                <WeatherVisualIcon state={visualState} className="h-11 w-11 lg:h-12 lg:w-12" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-semibold leading-tight lg:text-3xl">{config.label}</p>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/85">
                  {config.description}
                </p>
              </div>
            </div>
            <div className="mt-6 inline-flex flex-wrap items-stretch gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-2.5 backdrop-blur-md">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/55">Feels like</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatTemp(feelsLike)}</p>
              </div>
              <div className="w-px self-stretch bg-white/10" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/55">High</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatTemp(high)}</p>
              </div>
              <div className="w-px self-stretch bg-white/10" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/55">Low</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatTemp(low)}</p>
              </div>
              <div className="w-px self-stretch bg-white/10" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/55">Humidity</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{Math.round(data.humidity)}%</p>
              </div>
              <div className="w-px self-stretch bg-white/10" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/55">Wind</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  {Math.round(convertWind(data.windSpeed, units.wind))} {windLabel(units.wind)}
                </p>
              </div>
              {data.visibilityKm != null && (
                <>
                  <div className="w-px self-stretch bg-white/10" aria-hidden="true" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-white/55">Visibility</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">{data.visibilityKm.toFixed(1)} km</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="lg:text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">
              Local time
            </p>
            <p className="mt-1 text-lg font-semibold text-white tabular-nums">{time}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}