/**
 * SERVER-SIDE OpenWeather integration for the Weather experience.
 *
 * This module must NEVER be imported from client components — it reads the
 * `OPENWEATHER_API_KEY` environment variable (server-only, never bundled to
 * the browser) and is exercised only through the `/api/weather` route
 * handlers. Raw OpenWeather responses are normalized into the shared internal
 * weather model, so UI components never depend on provider-specific shapes.
 *
 * Endpoints used (free tier, coordinates-first):
 *   - Geocoding API  /geo/1.0/direct  → city name → { lat, lon, country, state }
 *   - Reverse geocoding               → coordinates → place name
 *   - Current weather /data/2.5/weather  → current + sun times
 *   - Forecast       /data/2.5/forecast  → 5-day / 3-hour list (hourly + daily)
 *
 * Condition normalization is centralized in `lib/weather/visual.ts`.
 */

import { WEATHER_CONDITIONS, compassLabel } from "./conditions";
import { WeatherError, WEATHER_ERROR_MESSAGES } from "./errors";
import type { WeatherLocation } from "./locations";
import type {
  WeatherCondition,
  WeatherCurrent,
  WeatherData,
  WeatherDailyItem,
  WeatherHourlyItem,
} from "./types";
import type { WeatherProvider } from "./provider";
import { normalizeOpenWeatherCondition, type WeatherVisualState } from "./visual";

const API_BASE = "https://api.openweathermap.org";

/** OpenWeather responses may be cached server-side for 5 minutes. */
const REVALIDATE_SECONDS = 300;

const METERS_TO_KM = 1 / 1000;
const MPS_TO_KMH = 3.6;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

/** Reads the server-only API key. Returns undefined when not configured. */
export function openWeatherApiKey(): string | undefined {
  const key = process.env.OPENWEATHER_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

function upstreamCode(status: number): "invalid_key" | "not_found" | "rate_limited" | "unavailable" {
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  return "unavailable";
}

async function fetchJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new WeatherError("timeout");
    }
    throw new WeatherError("unavailable");
  }

  if (!response.ok) {
    const code = upstreamCode(response.status);
    throw new WeatherError(code, WEATHER_ERROR_MESSAGES[code]);
  }

  try {
    return await response.json();
  } catch {
    throw new WeatherError("malformed");
  }
}

function params(query: Record<string, string>): string {
  return new URLSearchParams(query).toString();
}

/* ------------------------------------------------------------------ */
/* Raw response shapes (kept local — the app never depends on them).   */
/* ------------------------------------------------------------------ */

interface OwGeocodeItem {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface OwWeatherResponse {
  name: string;
  dt: number;
  timezone: number;
  weather: Array<{ id: number; main: string; description: string }>;
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: { speed: number; deg: number };
  clouds: { all: number };
  sys: { country: string; sunrise: number; sunset: number };
}

interface OwForecastListEntry {
  dt: number;
  dt_txt: string;
  pop: number;
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  weather: Array<{ id: number; description: string }>;
  clouds: { all: number };
  wind: { speed: number; deg: number };
}

interface OwForecastResponse {
  city: { name: string; country: string; timezone: number; sunrise: number; sunset: number; coord: { lat: number; lon: number } };
  list: OwForecastListEntry[];
}

/* ------------------------------------------------------------------ */
/* Geocoding                                                           */
/* ------------------------------------------------------------------ */

export async function geocodeLocations(query: string): Promise<Array<{ name: string; state?: string; country: string; lat: number; lon: number }>> {
  const key = openWeatherApiKey();
  if (!key) return [];
  const url = `${API_BASE}/geo/1.0/direct?${params({ q: query, limit: "6", appid: key })}`;
  const data = (await fetchJson(url)) as OwGeocodeItem[];
  return data.map((item) => ({
    name: item.name,
    state: item.state,
    country: item.country,
    lat: item.lat,
    lon: item.lon,
  }));
}

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ name: string; state?: string; country: string; lat: number; lon: number } | null> {
  const key = openWeatherApiKey();
  if (!key) return null;
  const url = `${API_BASE}/geo/1.0/reverse?${params({ lat: String(lat), lon: String(lon), limit: "1", appid: key })}`;
  const data = (await fetchJson(url)) as OwGeocodeItem[];
  const item = data[0];
  if (!item) return null;
  return { name: item.name, state: item.state, country: item.country, lat: item.lat, lon: item.lon };
}

/* ------------------------------------------------------------------ */
/* Normalization (OpenWeather → internal weather model)                */
/* ------------------------------------------------------------------ */

function owCondition(state: WeatherVisualState, isDay: boolean): WeatherCondition {
  switch (state) {
    case "clear":
      return isDay ? WEATHER_CONDITIONS.sunny : WEATHER_CONDITIONS.night;
    case "partly-cloudy":
      return isDay ? WEATHER_CONDITIONS["partly-cloudy"] : WEATHER_CONDITIONS.night;
    case "cloudy":
    case "night-cloudy":
      return WEATHER_CONDITIONS.cloudy;
    case "rain":
      return WEATHER_CONDITIONS.rain;
    case "heavy-rain":
      return WEATHER_CONDITIONS["heavy-rain"];
    case "drizzle":
      return WEATHER_CONDITIONS.drizzle;
    case "thunderstorm":
      return WEATHER_CONDITIONS.thunderstorm;
    case "snow":
      return WEATHER_CONDITIONS.snow;
    case "mist":
      return WEATHER_CONDITIONS.mist;
    default:
      return isDay ? WEATHER_CONDITIONS.sunny : WEATHER_CONDITIONS.night;
  }
}

function isDayAt(dtSec: number, sunriseSec: number, sunsetSec: number): boolean {
  return dtSec >= sunriseSec && dtSec < sunsetSec;
}

/** Local ISO timestamp from a unix timestamp + the city's UTC offset. */
function localIso(dtSec: number, offsetSeconds: number): string {
  return new Date((dtSec + offsetSeconds) * 1000).toISOString();
}

/** Local calendar date key (e.g. "2026-08-18") from a unix timestamp + offset. */
function localDayKeyFrom(dtSec: number, offsetSeconds: number): string {
  return new Date((dtSec + offsetSeconds) * 1000).toISOString().slice(0, 10);
}

/** Representative daily condition: most significant condition of the day. */
const CONDITION_PRIORITY: Record<WeatherVisualState, number> = {
  thunderstorm: 8,
  "heavy-rain": 7,
  snow: 7,
  rain: 6,
  drizzle: 5,
  mist: 4,
  cloudy: 3,
  "night-cloudy": 3,
  "partly-cloudy": 2,
  sunrise: 1,
  sunset: 1,
  clear: 1,
  night: 1,
};

/* ------------------------------------------------------------------ */
/* Provider                                                           */
/* ------------------------------------------------------------------ */

export class OpenWeatherProvider implements WeatherProvider {
  readonly id = "openweather";
  readonly label = "OpenWeather · live";
  readonly kind = "external" as const;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchWeather(location?: WeatherLocation): Promise<WeatherData> {
    if (!location) {
      throw new Error("OpenWeatherProvider requires a location (coordinates).");
    }

    const common = params({
      lat: String(location.lat),
      lon: String(location.lon),
      units: "metric",
      appid: this.apiKey,
    });

    const [weatherData, forecastData] = await Promise.all([
      fetchJson(`${API_BASE}/data/2.5/weather?${common}`) as Promise<OwWeatherResponse>,
      fetchJson(`${API_BASE}/data/2.5/forecast?${common}`) as Promise<OwForecastResponse>,
    ]);

    const offset = forecastData.city.timezone ?? weatherData.timezone;
    const sunriseSec = weatherData.sys?.sunrise;
    const sunsetSec = weatherData.sys?.sunset;
    const nowSec = Math.floor(Date.now() / 1000);
    const isDay = isDayAt(nowSec, sunriseSec, sunsetSec);
    const ow = weatherData.weather[0] ?? { id: 800, description: "" };

    const hourly = hourlyOutlook(forecastData, nowSec, sunriseSec, sunsetSec, offset);
    const daily = dailyOutlook(forecastData, offset);
    const today = daily.find((d) => d.date === localDayKeyFrom(nowSec, offset));

    const current: WeatherCurrent = {
      location: location.name
        ? location.state
          ? `${location.name}, ${location.state}, ${location.country}`
          : `${location.name}, ${location.country}`
        : weatherData.name,
      country: weatherData.sys?.country ?? location.country,
      latitude: location.lat,
      longitude: location.lon,
      temperature: weatherData.main.temp,
      feelsLike: weatherData.main.feels_like,
      condition: owCondition(normalizeOpenWeatherCondition(ow.id, isDay), isDay),
      high: today?.high ?? weatherData.main.temp,
      low: today?.low ?? weatherData.main.temp,
      humidity: weatherData.main.humidity,
      windSpeed: weatherData.wind.speed * MPS_TO_KMH,
      windDirectionLabel: compassLabel(weatherData.wind.deg),
      pressure: weatherData.main.pressure,
      visibilityKm: Math.round(weatherData.visibility * METERS_TO_KM * 10) / 10,
      cloudCover: weatherData.clouds.all,
      precipitationProbability: hourly[0]?.precipitationProbability,
      sunrise: localIso(sunriseSec, offset),
      sunset: localIso(sunsetSec, offset),
      isDay,
      updatedAt: localIso(nowSec, offset),
    };

    return {
      current,
      hourly,
      daily,
      source: this.label,
      dataSource: "external",
      location: current.location,
      timezone: undefined,
      timezoneOffsetSeconds: offset,
      updatedAt: current.updatedAt,
    };
  }
}

function hourlyOutlook(
  forecast: OwForecastResponse,
  nowSec: number,
  sunriseSec: number,
  sunsetSec: number,
  offset: number
): WeatherHourlyItem[] {
  // Free-tier forecast is 3-hourly; cover the next 24 hours (8 steps).
  const entries = forecast.list.slice(0, 8);
  let nowIndex = 0;
  let nowDiff = Number.POSITIVE_INFINITY;
  entries.forEach((entry, index) => {
    const diff = Math.abs(entry.dt - nowSec);
    if (diff < nowDiff) {
      nowDiff = diff;
      nowIndex = index;
    }
  });

  return entries.map((entry, index) => {
    const ow = entry.weather[0] ?? { id: 800, description: "" };
    const isDay = isDayAt(entry.dt, sunriseSec, sunsetSec);
    return {
      time: localIso(entry.dt, offset),
      isNow: nowDiff <= THREE_HOURS_MS / 1000 ? index === nowIndex : false,
      temperature: entry.main.temp,
      condition: owCondition(normalizeOpenWeatherCondition(ow.id, isDay), isDay),
      precipitationProbability: Math.round((entry.pop ?? 0) * 100),
      windSpeedKmh: Math.round(entry.wind.speed * MPS_TO_KMH),
      windDirectionLabel: compassLabel(entry.wind.deg),
    };
  });
}

function dailyOutlook(forecast: OwForecastResponse, offset: number): WeatherDailyItem[] {
  const byDay = new Map<string, OwForecastListEntry[]>();
  for (const entry of forecast.list) {
    const key = localDayKeyFrom(entry.dt, offset);
    const bucket = byDay.get(key) ?? [];
    bucket.push(entry);
    byDay.set(key, bucket);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(0, 7)
    .map(([date, entries]) => {
      const temps = entries.map((e) => e.main.temp);
      // Representative condition = most significant of the day. Multi-day
      // lists use the day-time reading (labels read naturally; sun times for
      // future days are not exposed by the free forecast endpoint).
      const representative = entries.reduce((best, entry) => {
        const ow = entry.weather[0] ?? { id: 800, description: "" };
        const state = normalizeOpenWeatherCondition(ow.id, true);
        const bestState = normalizeOpenWeatherCondition((best.weather[0] ?? { id: 800 }).id, true);
        if (CONDITION_PRIORITY[state] > CONDITION_PRIORITY[bestState]) return entry;
        if (CONDITION_PRIORITY[state] === CONDITION_PRIORITY[bestState] && entry.main.temp > best.main.temp) {
          return entry;
        }
        return best;
      }, entries[0]);

      const repOw = representative.weather[0] ?? { id: 800, description: "" };
      return {
        date,
        condition: owCondition(normalizeOpenWeatherCondition(repOw.id, true), true),
        high: Math.max(...temps),
        low: Math.min(...temps),
        precipitationProbability: Math.round(Math.max(...entries.map((e) => e.pop ?? 0)) * 100),
        windSpeedKmh: Math.round(representative.wind.speed * MPS_TO_KMH),
        windDirectionLabel: compassLabel(representative.wind.deg),
      };
    });
}

export function createOpenWeatherProvider(apiKey: string): OpenWeatherProvider {
  return new OpenWeatherProvider(apiKey);
}