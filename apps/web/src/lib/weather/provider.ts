import { aqiCategoryOf, uvRiskOf } from "@/lib/environmental/analytics";
import { getEnvironmentalDataProvider } from "@/lib/environmental/provider";
import { generateFutureReadings } from "@/lib/environmental/mockData";
import type { EnvironmentalReading } from "@/lib/environmental/types";
import {
  compassLabel,
  conditionFromReading,
  feelsLike,
  localDayKey,
  precipitationProbability,
} from "./conditions";
import type { WeatherLocation } from "./locations";
import type {
  WeatherCondition,
  WeatherCurrent,
  WeatherDailyItem,
  WeatherData,
  WeatherHourlyItem,
} from "./types";

const SIMULATED_DELAY = 250;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Regional weather provider boundary.
 *
 * The Weather experience reads ONLY through this interface, keeping the UI
 * decoupled from where the values come from. Today the simulated provider
 * (built on the existing deterministic environmental simulation) is active;
 * a future provider may fetch real regional weather — the page does not
 * change.
 *
 *   WeatherProvider              (regional weather)
 *        ↓
 *   SimulatedWeatherProvider     ← active today
 *
 *   EnvironmentalDataProvider    (local ESP32 station — separate, unchanged)
 *        ↓
 *   MockEnvironmentalDataProvider ← active today
 *        OR
 *   Esp32DataSourceProvider      ← future hardware
 */
export interface WeatherProvider {
  /** Stable provider identifier, e.g. "simulated". */
  readonly id: string;
  /** Human-readable source label, e.g. "Simulated environmental data". */
  readonly label: string;
  /** Provider kind, used by the UI to label data provenance. */
  readonly kind: "simulated" | "external";
  /**
   * Fetches the complete current + hourly + daily weather payload.
   * `location` (coordinates) is honored by real-weather providers; the
   * simulated feed is location-independent and ignores it.
   */
  fetchWeather(_location?: WeatherLocation): Promise<WeatherData>;
}

function windowHighLow(readings: EnvironmentalReading[]): { high: number; low: number } {
  const temps = readings.map((r) => r.temperature);
  return {
    high: Math.max(...temps),
    low: Math.min(...temps),
  };
}

/** Groups future readings into daily buckets and derives per-day outlooks. */
function dailyOutlook(readings: EnvironmentalReading[]): WeatherDailyItem[] {
  const byDay = new Map<string, EnvironmentalReading[]>();
  for (const reading of readings) {
    const key = localDayKey(new Date(reading.timestamp).getTime());
    const bucket = byDay.get(key) ?? [];
    bucket.push(reading);
    byDay.set(key, bucket);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, dayReadings]) => {
      const temps = dayReadings.map((r) => r.temperature);
      const rainfall = dayReadings.map((r) => r.rainfall ?? 0);
      // Use the warmest, driest reading for the day's representative condition
      // unless rain dominates that day.
      const rainy = rainfall.some((r) => r > 0);
      const representative = rainy
        ? dayReadings.reduce((a, b) => (a.rainfall > b.rainfall ? a : b))
        : dayReadings.reduce((a, b) => (a.uvIndex > b.uvIndex ? a : b));
      return {
        date,
        condition: conditionFromReading(representative),
        high: Math.max(...temps),
        low: Math.min(...temps),
        precipitationProbability: precipitationProbability(Math.max(...rainfall)),
      };
    });
}

function hourlyOutlook(readings: EnvironmentalReading[]): WeatherHourlyItem[] {
  return readings.map((reading, index) => ({
    time: reading.timestamp,
    isNow: index === 0,
    temperature: reading.temperature,
    condition: conditionFromReading(reading),
    precipitationProbability: precipitationProbability(reading.rainfall ?? 0),
  }));
}

/**
 * Simulated weather provider — derives the Weather experience from the
 * existing deterministic environmental simulation (same anchor, same curves
 * as the dashboard). Clearly labeled as simulated; replaced by a real weather
 * provider in a future phase without touching the page.
 *
 * Visibility / cloud coverage / precipitation-probability are PRESENTATION
 * derivations from the simulated readings (documented rules below), the same
 * way the condition itself is derived — never hardware claims.
 */
export class SimulatedWeatherProvider implements WeatherProvider {
  readonly id = "simulated";
  readonly label = "Simulated environmental data";
  readonly kind = "simulated" as const;

  async fetchWeather(_location?: WeatherLocation): Promise<WeatherData> {
    await delay(SIMULATED_DELAY);

    const readings = await getEnvironmentalDataProvider().fetchReadings("24h");
    const latest = readings[readings.length - 1];
    const { high, low } = windowHighLow(readings);

    // 7 days ahead, one sample every hour → 168 projected readings.
    const future = generateFutureReadings(7 * 24);

    const current: WeatherCurrent = {
      location: latest.location ?? "Unknown location",
      temperature: latest.temperature,
      feelsLike: feelsLike(latest),
      condition: conditionFromReading(latest),
      high,
      low,
      humidity: latest.humidity,
      windSpeed: latest.windSpeed,
      windDirectionLabel: compassLabel(latest.windDirection),
      uvIndex: latest.uvIndex,
      uvRisk: uvRiskOf(latest.uvIndex),
      airQuality: latest.airQuality,
      aqiCategory: aqiCategoryOf(latest.airQuality),
      pressure: latest.pressure,
      // Presentation derivations from the same simulated readings:
      // visibility drops with rain/very humid air; cloud cover tracks the
      // derived condition; precip probability comes from accumulated rainfall.
      visibilityKm: deriveVisibility(latest.rainfall, latest.humidity),
      cloudCover: deriveCloudCover(conditionFromReading(latest)),
      precipitationProbability: precipitationProbability(latest.rainfall ?? 0),
      updatedAt: latest.timestamp,
    };

    return {
      current,
      hourly: hourlyOutlook(future.slice(0, 24)),
      daily: dailyOutlook(future),
      source: this.label,
      dataSource: latest.dataSource ?? "simulation",
      location: latest.location ?? "Unknown location",
      updatedAt: latest.timestamp,
    };
  }
}

/** Simulated visibility (km) derived from rain + humidity. 10 km = clear. */
function deriveVisibility(rainfallMm: number, humidity: number): number {
  if (rainfallMm > 0) return Math.max(2, Math.round((10 - rainfallMm * 0.4) * 10) / 10);
  if (humidity >= 85) return 4;
  return 10;
}

/** Simulated cloud cover (%) derived from the classified condition. */
function deriveCloudCover(condition: WeatherCondition): number {
  switch (condition.id) {
    case "sunny":
      return 10;
    case "partly-cloudy":
      return 45;
    case "cloudy":
      return 80;
    case "rain":
    case "thunderstorm":
      return 90;
    default:
      return 50;
  }
}

export const simulatedWeatherProvider = new SimulatedWeatherProvider();

let activeProvider: WeatherProvider = simulatedWeatherProvider;

/** Returns the provider currently feeding the Weather experience. */
export function getWeatherProvider(): WeatherProvider {
  return activeProvider;
}

/** Registers a different weather provider (future real-weather swap). */
export function setWeatherProvider(provider: WeatherProvider): void {
  activeProvider = provider;
}