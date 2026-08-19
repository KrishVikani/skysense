import type { WeatherLocation, GeocodeResult } from "./locations";
import type { WeatherData } from "./types";
import { WeatherError, type WeatherErrorCode } from "./errors";

/**
 * CLIENT-side access to the OpenWeather-backed endpoints.
 *
 * The browser never holds the API key — every call goes through the server
 * routes (`/api/weather`, `/api/weather/geocode`), which normalize the data
 * and return `{ ok: false, code: ... }` on failure. The client distinguishes
 * "not configured" (honest demo-mode fallback) from real provider errors so
 * the UI can show a friendly message instead of pretending live data exists.
 */

interface RouteErrorBody {
  ok?: boolean;
  code?: string;
  message?: string;
}

function parseError(json: unknown): WeatherError {
  const body = (json ?? {}) as RouteErrorBody;
  const code = (Object.keys(WEATHER_ERROR_CODES).includes(body.code ?? "") ? body.code : "upstream_error") as WeatherErrorCode;
  return new WeatherError(code, body.message);
}

const WEATHER_ERROR_CODES = {
  not_configured: true,
  invalid_key: true,
  not_found: true,
  rate_limited: true,
  timeout: true,
  unavailable: true,
  malformed: true,
  bad_location: true,
  bad_query: true,
  upstream_error: true,
} as const;

export interface LiveWeatherOutcome {
  /** Normalized live weather, or null when unavailable. */
  data: WeatherData | null;
  /** The specific failure, when live weather could not be fetched. */
  error: WeatherError | null;
}

/** Returns live weather from the server, plus a typed error when it fails. */
export async function fetchLiveWeather(location: WeatherLocation): Promise<LiveWeatherOutcome> {
  try {
    const params = new URLSearchParams({
      lat: String(location.lat),
      lon: String(location.lon),
      name: location.name,
      country: location.country,
    });
    if (location.state) params.set("state", location.state);
    const response = await fetch(`/api/weather?${params.toString()}`, { signal: AbortSignal.timeout(15_000) });
    const json = await response.json().catch(() => null);
    if (response.ok && json && json.ok && json.data) {
      return { data: json.data as WeatherData, error: null };
    }
    return { data: null, error: parseError(json) };
  } catch {
    return { data: null, error: new WeatherError("unavailable") };
  }
}

export interface LocationSearchResult {
  /** False when OpenWeather isn't configured (search unavailable; demo mode). */
  configured: boolean;
  results: GeocodeResult[];
  /** A real upstream failure (rate limit, timeout, …), when it occurred. */
  error?: WeatherError;
}

/** City search results (or an empty set when search is unavailable). */
export async function searchWeatherLocations(query: string): Promise<LocationSearchResult> {
  if (!query.trim()) return { configured: true, results: [] };
  try {
    const response = await fetch(`/api/weather/geocode?q=${encodeURIComponent(query.trim())}`, {
      signal: AbortSignal.timeout(10_000),
    });
    const json = await response.json().catch(() => null);
    if (json?.code === "not_configured") return { configured: false, results: [] };
    if (response.ok && json?.ok && Array.isArray(json.results)) {
      return { configured: true, results: json.results };
    }
    return { configured: true, results: [], error: parseError(json) };
  } catch {
    return { configured: true, results: [], error: new WeatherError("unavailable") };
  }
}

/** Reverse-geocodes the browser's position into a selectable location. */
export async function reverseGeocodeLocation(lat: number, lon: number): Promise<WeatherLocation | null> {
  try {
    const response = await fetch(`/api/weather/geocode?lat=${lat}&lon=${lon}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const json = await response.json();
    if (!json?.ok || !json.result) return null;
    return json.result as WeatherLocation;
  } catch {
    return null;
  }
}