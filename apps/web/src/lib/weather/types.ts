import type { DataSource } from "@/lib/environmental/types";

/**
 * Weather-condition taxonomy for the Weather experience.
 *
 * These ids map to reusable icons and atmospheric visuals in
 * `components/weather/`. The simulated provider emits the core states
 * (clear, partly-cloudy, cloudy, rain, thunderstorm, night); drizzle, snow
 * and mist are produced by the OpenWeather normalization so a single icon /
 * visual layer serves both sources. Sunrise/sunset are handled at the visual
 * layer (they are times, not conditions) — see `lib/weather/visual.ts`.
 */
export type WeatherConditionId =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "heavy-rain"
  | "drizzle"
  | "thunderstorm"
  | "snow"
  | "mist"
  | "night";

export interface WeatherCondition {
  id: WeatherConditionId;
  /** Human label, e.g. "Partly Cloudy". */
  label: string;
}

/** Current conditions at the user's location (hero data). */
export interface WeatherCurrent {
  location: string;
  /** Country, when the source reports it (ISO alpha-2, e.g. "IN"). */
  country?: string;
  /** Latitude of the resolved location, when known. */
  latitude?: number;
  /** Longitude of the resolved location, when known. */
  longitude?: number;
  temperature: number;
  feelsLike: number;
  condition: WeatherCondition;
  /** High over the recent window (°C). */
  high: number;
  /** Low over the recent window (°C). */
  low: number;
  humidity: number;
  windSpeed: number;
  windDirectionLabel: string;
  pressure: number;
  /**
   * UV index and air quality are NOT provided by every source (OpenWeather
   * exposes them through separate, paid endpoints). Optional so the UI can
   * show them only when the active source supplies them.
   */
  uvIndex?: number;
  uvRisk?: string;
  airQuality?: number;
  aqiCategory?: string;
  /** Visibility in kilometres, when the source reports it. */
  visibilityKm?: number;
  /** Cloud coverage in percent (0–100), when the source reports it. */
  cloudCover?: number;
  /** Precipitation probability 0–100 for the current moment, when available. */
  precipitationProbability?: number;
  /** ISO timestamp of local sunrise, when the source reports it. */
  sunrise?: string;
  /** ISO timestamp of local sunset, when the source reports it. */
  sunset?: string;
  /** True when the local time is between sunrise and sunset. */
  isDay?: boolean;
  updatedAt: string;
}

/** One hour in the hourly outlook row. */
export interface WeatherHourlyItem {
  /** ISO timestamp of the projected hour. */
  time: string;
  /** True for the current hour ("Now" chip). */
  isNow: boolean;
  temperature: number;
  condition: WeatherCondition;
  /** Precipitation probability 0–100, derived from the simulation. */
  precipitationProbability: number;
  /** Wind speed in km/h, when the source provides it. */
  windSpeedKmh?: number;
  /** Cardinal wind direction, when the source provides it. */
  windDirectionLabel?: string;
}

/** One day in the 7-day outlook. */
export interface WeatherDailyItem {
  /** Local calendar date key, e.g. "2026-08-18". */
  date: string;
  condition: WeatherCondition;
  high: number;
  low: number;
  /** Precipitation probability 0–100, derived from the simulation. */
  precipitationProbability: number;
  /** Representative wind speed in km/h, when the source provides it. */
  windSpeedKmh?: number;
  /** Cardinal wind direction, when the source provides it. */
  windDirectionLabel?: string;
}

/**
 * Complete payload for the Weather page. `source`/`dataSource` carry the
 * provenance so the UI can always label simulation honestly.
 */
export interface WeatherData {
  current: WeatherCurrent;
  hourly: WeatherHourlyItem[];
  daily: WeatherDailyItem[];
  /** Human-readable source label, e.g. "Simulated environmental data". */
  source: string;
  /**
   * Machine-readable provenance. `"simulation"` is the demo/fallback feed;
   * `"external"` marks real provider data (e.g. OpenWeather). `"esp32"` is
   * reserved for the future My Station telemetry and never appears here.
   */
  dataSource: DataSource | "external";
  location: string;
  /** IANA timezone id (e.g. "Asia/Kolkata") when the source reports it. */
  timezone?: string;
  /** UTC offset in seconds, when the source reports it. */
  timezoneOffsetSeconds?: number;
  updatedAt: string;
}