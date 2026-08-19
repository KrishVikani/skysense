import {
  DATE_FORMATS,
  DEFAULT_SETTINGS,
  FORECAST_HORIZON_OPTIONS,
  POLL_INTERVAL_MAX_MS,
  POLL_INTERVAL_MIN_MS,
  PRECIPITATION_UNITS,
  PRESSURE_UNITS,
  TEMPERATURE_UNITS,
  THEME_PREFERENCES,
  TIME_FORMATS,
  TIMEZONE_OPTIONS,
  WIND_UNITS,
} from "./types";
import type { UserSettings } from "./types";

/**
 * Per-metric alert threshold bounds (mirror the sensor valid ranges in
 * lib/devices/sensors.ts). Values outside these are rejected.
 */
const METRIC_BOUNDS: Record<string, { min: number; max: number; label: string; unit: string }> = {
  temperature: { min: -40, max: 60, label: "Temperature", unit: "°C" },
  humidity: { min: 0, max: 100, label: "Humidity", unit: "%" },
  windSpeed: { min: 0, max: 200, label: "Wind speed", unit: "km/h" },
  uvIndex: { min: 0, max: 20, label: "UV index", unit: "" },
  airQuality: { min: 0, max: 500, label: "Air quality", unit: " AQI" },
};

export type SettingsErrors = Record<string, string>;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

/** Validates a complete settings object. Returns an empty map when valid. */
export function validateSettings(settings: unknown): SettingsErrors {
  if (!settings || typeof settings !== "object") {
    return { _root: "Settings must be an object." };
  }
  const s = settings as Partial<UserSettings>;
  const errors: SettingsErrors = {};

  if (s.version !== undefined && (!isFiniteNumber(s.version) || s.version < 1)) {
    errors.version = "Unsupported settings version.";
  }

  // general
  if (s.general) {
    const g = s.general;
    if (!isString(g.timezone) || !(TIMEZONE_OPTIONS as readonly string[]).includes(g.timezone)) {
      errors["general.timezone"] = "Timezone must be one of the supported regions.";
    }
    if (!(DATE_FORMATS as readonly string[]).includes(g.dateFormat)) {
      errors["general.dateFormat"] = "Date format must be iso, short or long.";
    }
    if (!(TIME_FORMATS as readonly string[]).includes(g.timeFormat)) {
      errors["general.timeFormat"] = "Time format must be 12h or 24h.";
    }
  }

  // location
  if (s.location) {
    const l = s.location;
    if (!isString(l.city) || l.city.trim().length === 0 || l.city.trim().length > 60) {
      errors["location.city"] = "City must be a non-empty name (max 60 characters).";
    }
    if (!isString(l.country) || l.country.trim().length === 0 || l.country.trim().length > 60) {
      errors["location.country"] = "Country must be a non-empty name (max 60 characters).";
    }
    if (!isFiniteNumber(l.latitude) || l.latitude < -90 || l.latitude > 90) {
      errors["location.latitude"] = "Latitude must be between -90 and 90.";
    }
    if (!isFiniteNumber(l.longitude) || l.longitude < -180 || l.longitude > 180) {
      errors["location.longitude"] = "Longitude must be between -180 and 180.";
    }
    if (!isString(l.timezone) || !(TIMEZONE_OPTIONS as readonly string[]).includes(l.timezone)) {
      errors["location.timezone"] = "Timezone must be one of the supported regions.";
    }
  }

  // units
  if (s.units) {
    const u = s.units;
    if (!(TEMPERATURE_UNITS as readonly string[]).includes(u.temperature)) {
      errors["units.temperature"] = "Temperature unit must be c or f.";
    }
    if (!(WIND_UNITS as readonly string[]).includes(u.wind)) {
      errors["units.wind"] = "Wind unit must be kmh, ms or mph.";
    }
    if (!(PRESSURE_UNITS as readonly string[]).includes(u.pressure)) {
      errors["units.pressure"] = "Pressure unit must be hpa or inhg.";
    }
    if (!(PRECIPITATION_UNITS as readonly string[]).includes(u.precipitation)) {
      errors["units.precipitation"] = "Precipitation unit must be mm or in.";
    }
  }

  // devices
  if (s.devices) {
    const d = s.devices;
    if (d.preferredMode !== "simulation" && d.preferredMode !== "live") {
      errors["devices.preferredMode"] = "Operating mode must be simulation or live.";
    }
    if (
      !isFiniteNumber(d.pollIntervalMs) ||
      d.pollIntervalMs < POLL_INTERVAL_MIN_MS ||
      d.pollIntervalMs > POLL_INTERVAL_MAX_MS
    ) {
      errors["devices.pollIntervalMs"] = `Refresh interval must be between ${POLL_INTERVAL_MIN_MS / 1000}s and ${POLL_INTERVAL_MAX_MS / 1000}s.`;
    }
  }

  // alerts
  if (s.alerts) {
    const a = s.alerts;
    if (typeof a.enabled !== "boolean") {
      errors["alerts.enabled"] = "Alert master switch must be a boolean.";
    }
    if (a.preferences && typeof a.preferences === "object") {
      for (const [metric, pref] of Object.entries(a.preferences)) {
        const bounds = METRIC_BOUNDS[metric];
        if (!bounds) {
          errors[`alerts.preferences.${metric}`] = "Unknown alert metric.";
          continue;
        }
        if (!pref || typeof pref !== "object") {
          errors[`alerts.preferences.${metric}`] = `${bounds.label} preferences are malformed.`;
          continue;
        }
        if (typeof pref.enabled !== "boolean") {
          errors[`alerts.preferences.${metric}.enabled`] = `${bounds.label} enabled flag must be a boolean.`;
        }
        for (const level of ["warningThreshold", "criticalThreshold"] as const) {
          const value = pref[level];
          if (value === null || value === undefined) continue;
          if (!isFiniteNumber(value) || value < bounds.min || value > bounds.max) {
            errors[`alerts.preferences.${metric}.${level}`] =
              `${bounds.label} ${level === "warningThreshold" ? "warning" : "critical"} threshold must be between ${bounds.min} and ${bounds.max}${bounds.unit ? ` ${bounds.unit}` : ""}.`;
          }
        }
        const warn = pref.warningThreshold;
        const crit = pref.criticalThreshold;
        if (isFiniteNumber(warn) && isFiniteNumber(crit) && warn > crit) {
          errors[`alerts.preferences.${metric}`] =
            `${bounds.label} warning threshold must not exceed the critical threshold.`;
        }
      }
    } else {
      errors["alerts.preferences"] = "Alert threshold preferences are required.";
    }
  }

  // forecast
  if (s.forecast) {
    const f = s.forecast;
    if (!(FORECAST_HORIZON_OPTIONS as readonly string[]).includes(f.horizon)) {
      errors["forecast.horizon"] = "Forecast horizon must be 1h, 3h or 6h.";
    }
    for (const key of ["showConfidence", "showRecommendations", "showRisk", "showExplanation"] as const) {
      if (typeof f[key] !== "boolean") {
        errors[`forecast.${key}`] = "Forecast display flags must be booleans.";
      }
    }
  }

  // appearance
  if (s.appearance) {
    if (!(THEME_PREFERENCES as readonly string[]).includes(s.appearance.theme)) {
      errors["appearance.theme"] = "Theme must be system, light or dark.";
    }
  }

  return errors;
}

export function isValidSettings(settings: unknown): boolean {
  return Object.keys(validateSettings(settings)).length === 0;
}

/** Convenience: run validation against the default settings (must be clean). */
export function validateDefaults(): SettingsErrors {
  return validateSettings(DEFAULT_SETTINGS);
}
