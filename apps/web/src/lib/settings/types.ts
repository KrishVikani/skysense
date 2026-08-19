import type { AlertThresholdPreferences } from "@/lib/alerts/types";
import type { ForecastHorizon } from "@/lib/forecast/types";

/**
 * Settings schema — the central configuration layer for SKYSENSE and the
 * future ESP32 station.
 *
 * Persistence:
 * - Authenticated users persist to `users/{uid}/settings/app` (Firestore
 *   subcollection under the existing user document, guarded by
 *   `request.auth.uid == userId` in firestore.rules).
 * - When the account store is unreachable, settings fall back to
 *   localStorage namespaced per user id, so the app never bricks.
 * - Canonical sensor values stay in metric units; the `units` block only
 *   drives PRESENTATION-layer conversion (see lib/settings/units.ts).
 */

export const SETTINGS_SCHEMA_VERSION = 1 as const;

export type ThemePreference = "light" | "dark" | "system";
export type TimeFormatPreference = "12h" | "24h";
export type DateFormatPreference = "iso" | "short" | "long";

export type TemperatureUnit = "c" | "f";
export type WindUnit = "kmh" | "ms" | "mph";
export type PressureUnit = "hpa" | "inhg";
export type PrecipitationUnit = "mm" | "in";

export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];
export const TIME_FORMATS: TimeFormatPreference[] = ["12h", "24h"];
export const DATE_FORMATS: DateFormatPreference[] = ["iso", "short", "long"];
export const TEMPERATURE_UNITS: TemperatureUnit[] = ["c", "f"];
export const WIND_UNITS: WindUnit[] = ["kmh", "ms", "mph"];
export const PRESSURE_UNITS: PressureUnit[] = ["hpa", "inhg"];
export const PRECIPITATION_UNITS: PrecipitationUnit[] = ["mm", "in"];
export const FORECAST_HORIZON_OPTIONS: ForecastHorizon[] = ["1h", "3h", "6h"];

/** Display units applied at the presentation boundary only. */
export interface UnitsPreference {
  temperature: TemperatureUnit;
  wind: WindUnit;
  pressure: PressureUnit;
  precipitation: PrecipitationUnit;
}

/** IANA timezones offered in the location/general selectors. */
export const TIMEZONE_OPTIONS = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Manila",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Nairobi",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
] as const;

/** Bounded, validated range for the Devices-page auto refresh interval. */
export const POLL_INTERVAL_MIN_MS = 5_000;
export const POLL_INTERVAL_MAX_MS = 600_000;
export const POLL_INTERVAL_DEFAULT_MS = 30_000;

export interface UserSettings {
  version: number;
  general: {
    timezone: string;
    dateFormat: DateFormatPreference;
    timeFormat: TimeFormatPreference;
  };
  location: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  units: {
    temperature: TemperatureUnit;
    wind: WindUnit;
    pressure: PressureUnit;
    precipitation: PrecipitationUnit;
  };
  devices: {
    /** Preference only — the actual connection state is data-driven. */
    preferredMode: "simulation" | "live";
    pollIntervalMs: number;
  };
  alerts: {
    /** Master switch: apply the user's custom thresholds below. */
    enabled: boolean;
    preferences: AlertThresholdPreferences;
  };
  forecast: {
    horizon: ForecastHorizon;
    showConfidence: boolean;
    showRecommendations: boolean;
    showRisk: boolean;
    showExplanation: boolean;
  };
  appearance: {
    theme: ThemePreference;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  version: SETTINGS_SCHEMA_VERSION,
  general: {
    timezone: "Asia/Kolkata",
    dateFormat: "short",
    timeFormat: "24h",
  },
  location: {
    city: "Ahmedabad",
    country: "India",
    latitude: 23.0225,
    longitude: 72.5714,
    timezone: "Asia/Kolkata",
  },
  units: {
    temperature: "c",
    wind: "kmh",
    pressure: "hpa",
    precipitation: "mm",
  },
  devices: {
    preferredMode: "simulation",
    pollIntervalMs: POLL_INTERVAL_DEFAULT_MS,
  },
  alerts: {
    enabled: true,
    preferences: {
      temperature: { enabled: true, warningThreshold: 33, criticalThreshold: 36 },
      humidity: { enabled: true, warningThreshold: 65, criticalThreshold: 78 },
      windSpeed: { enabled: true, warningThreshold: 22, criticalThreshold: 30 },
      uvIndex: { enabled: true, warningThreshold: 6, criticalThreshold: 8 },
      airQuality: { enabled: true, warningThreshold: 80, criticalThreshold: 120 },
    },
  },
  forecast: {
    horizon: "3h",
    showConfidence: true,
    showRecommendations: true,
    showRisk: true,
    showExplanation: true,
  },
  appearance: {
    theme: "system",
  },
};

export type SettingsSection = keyof UserSettings;
