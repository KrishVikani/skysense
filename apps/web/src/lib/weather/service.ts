import { fetchLiveWeather } from "./openweatherClient";
import { getWeatherProvider } from "./provider";
import type { WeatherLocation } from "./locations";
import type { WeatherData } from "./types";

/**
 * Data access entry point for the Weather page.
 *
 * Live provider data (OpenWeather, via the server routes) is preferred when it
 * can be fetched. The simulated demo provider only takes over when live weather
 * is genuinely unavailable in a *non-deceptive* way — no API key configured or
 * an invalid key — and is then clearly labeled. Real provider failures
 * (location not found, rate limit, timeout, provider down) are rethrown as a
 * WeatherError so the page can show a friendly, honest message instead
 * of silently presenting demo values as the answer.
 */
export async function getWeather(location?: WeatherLocation): Promise<WeatherData> {
  if (location) {
    const { data, error } = await fetchLiveWeather(location);
    if (data) return data;
    if (error && error.code !== "not_configured" && error.code !== "invalid_key") {
      throw error;
    }
  }
  return getWeatherProvider().fetchWeather(location);
}

export type { WeatherCurrent, WeatherDailyItem, WeatherData, WeatherHourlyItem } from "./types";
export { WEATHER_CONDITIONS, compassLabel, conditionFromReading, feelsLike } from "./conditions";
export {
  DEFAULT_WEATHER_LOCATION,
  addRecentLocation,
  loadRecentLocations,
  loadSelectedLocation,
  locationDisplayName,
  saveSelectedLocation,
  type GeocodeResult,
  type WeatherLocation,
} from "./locations";