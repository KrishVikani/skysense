/**
 * Shared error model for the OpenWeather-backed Weather experience.
 *
 * Client-safe (no server imports), so both the `/api/weather` route handlers
 * (server) and the Weather page (client) can agree on machine-readable codes
 * and friendly, user-facing messages. Provider details are never echoed into
 * these messages — they are generic on purpose.
 */

export type WeatherErrorCode =
  | "not_configured"
  | "invalid_key"
  | "not_found"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "malformed"
  | "bad_location"
  | "bad_query"
  | "upstream_error";

export const WEATHER_ERROR_MESSAGES: Record<WeatherErrorCode, string> = {
  not_configured: "Live weather is not configured yet. Demo weather is currently shown.",
  invalid_key: "Live weather is not configured correctly right now. Demo weather is currently shown.",
  not_found: "Location not found. Try another city.",
  rate_limited: "Too many weather requests right now. Please try again shortly.",
  timeout: "Weather data is temporarily unavailable.",
  unavailable: "Weather data is temporarily unavailable.",
  malformed: "Weather data is temporarily unavailable.",
  bad_location: "The requested location is invalid. Try another city.",
  bad_query: "The search query is invalid. Try a different city or area.",
  upstream_error: "Weather data is temporarily unavailable.",
};

/** Friendly, single-word-ish heading per code for the error card. */
export const WEATHER_ERROR_TITLES: Record<WeatherErrorCode, string> = {
  not_configured: "Weather not configured",
  invalid_key: "Weather not configured",
  not_found: "Location not found",
  rate_limited: "Too many requests",
  timeout: "Weather unavailable",
  unavailable: "Weather unavailable",
  malformed: "Weather unavailable",
  bad_location: "Invalid location",
  bad_query: "Invalid search",
  upstream_error: "Weather unavailable",
};

export class WeatherError extends Error {
  readonly code: WeatherErrorCode;
  readonly userMessage: string;

  constructor(code: WeatherErrorCode, userMessage?: string) {
    super(userMessage ?? WEATHER_ERROR_MESSAGES[code]);
    this.name = "WeatherError";
    this.code = code;
    this.userMessage = userMessage ?? WEATHER_ERROR_MESSAGES[code];
  }
}
