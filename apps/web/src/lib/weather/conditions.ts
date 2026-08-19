import type { EnvironmentalReading } from "@/lib/environmental/types";
import type { WeatherCondition, WeatherConditionId } from "./types";

/**
 * Deterministic condition classification and presentation helpers for the
 * Weather experience.
 *
 * Nothing here is invented external data — every value is derived from the
 * existing environmental readings (temperature, humidity, uvIndex, rainfall).
 * The mappings are transparent rules so a future real weather provider can
 * replace them without touching the UI.
 */

export const WEATHER_CONDITIONS: Record<WeatherConditionId, WeatherCondition> = {
  sunny: { id: "sunny", label: "Sunny" },
  "partly-cloudy": { id: "partly-cloudy", label: "Partly Cloudy" },
  cloudy: { id: "cloudy", label: "Cloudy" },
  rain: { id: "rain", label: "Rain" },
  "heavy-rain": { id: "heavy-rain", label: "Heavy Rain" },
  drizzle: { id: "drizzle", label: "Drizzle" },
  thunderstorm: { id: "thunderstorm", label: "Thunderstorms" },
  snow: { id: "snow", label: "Snow" },
  mist: { id: "mist", label: "Mist / Fog" },
  night: { id: "night", label: "Clear Night" },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Local hour (0–23) of an ISO timestamp. */
export function hourOf(timestamp: string): number {
  return new Date(timestamp).getHours();
}

/** Night window used for day/night visuals (evening through early morning). */
export function isNight(timestamp: string): boolean {
  const hour = hourOf(timestamp);
  return hour < 6 || hour >= 19;
}

/**
 * Classifies a reading into a weather condition.
 *
 * Rules (derived from existing metrics, not external data):
 *  - rainfall > 6 mm with humid air          → thunderstorm
 *  - rainfall > 0 mm                         → rain
 *  - night                                   → clear/rainy night
 *  - low UV or very humid                    → cloudy
 *  - moderate UV or humid                    → partly cloudy
 *  - otherwise                               → sunny
 */
export function conditionFromReading(reading: EnvironmentalReading): WeatherCondition {
  const rain = reading.rainfall ?? 0;
  const uv = reading.uvIndex ?? 0;
  const humidity = reading.humidity ?? 0;

  if (rain > 0) {
    if (rain > 6 && humidity > 65) return WEATHER_CONDITIONS.thunderstorm;
    if (isNight(reading.timestamp)) return { id: "night", label: "Rainy Night" };
    return WEATHER_CONDITIONS.rain;
  }
  if (isNight(reading.timestamp)) return WEATHER_CONDITIONS.night;
  if (uv < 2 || humidity >= 75) return WEATHER_CONDITIONS.cloudy;
  if (uv < 5 || humidity >= 60) return WEATHER_CONDITIONS["partly-cloudy"];
  return WEATHER_CONDITIONS.sunny;
}

/**
 * Feels-like temperature — a simple, documented approximation of heat index
 * (hot + humid) and wind chill (cold + windy). Falls back to the measured
 * temperature in the comfort band.
 */
export function feelsLike(reading: EnvironmentalReading): number {
  const temperature = reading.temperature;
  const humidity = reading.humidity ?? 0;
  const wind = reading.windSpeed ?? 0;

  if (temperature >= 26) {
    return round1(temperature + clamp((humidity - 40) * 0.12, 0, 6));
  }
  if (temperature < 15) {
    return round1(temperature - clamp(wind * 0.08, 0, 4));
  }
  return round1(temperature);
}

/**
 * Precipitation probability from accumulated rainfall (mm). Zero rain → 0%;
 * light rain maps to a modest chance; heavy rain caps at 90%.
 */
export function precipitationProbability(rainfallMm: number): number {
  if (rainfallMm <= 0) return 0;
  return Math.min(90, Math.max(5, Math.round(rainfallMm * 7)));
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

/** Compass label for a meteorological direction in degrees (from north). */
export function compassLabel(degrees: number): string {
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[index];
}

/** Local calendar-day key for grouping readings (e.g. "2026-08-18"). */
export function localDayKey(ms: number): string {
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Human day label for a date key: "Today", "Tomorrow", weekday name. */
export function dayLabelFor(dateKey: string): string {
  const todayKey = localDayKey(Date.now());
  if (dateKey === todayKey) return "Today";
  const parts = dateKey.split("-").map(Number);
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateKey === localDayKey(tomorrow.getTime())) return "Tomorrow";
  return target.toLocaleDateString(undefined, { weekday: "short" });
}