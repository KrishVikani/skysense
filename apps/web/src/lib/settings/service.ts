import { createDefaultSettings, METRIC_LABELS, METRIC_UNITS } from "@/lib/alerts/rules";
import type { AlertSettings, AlertThresholdSetting, AlertThresholdPreferences } from "@/lib/alerts/types";
import type { MetricSettingKey } from "@/lib/alerts/rules";
import {
  DEFAULT_SETTINGS,
  POLL_INTERVAL_DEFAULT_MS,
  POLL_INTERVAL_MAX_MS,
  POLL_INTERVAL_MIN_MS,
  SETTINGS_SCHEMA_VERSION,
  TIMEZONE_OPTIONS,
  type ThemePreference,
  type UserSettings,
} from "./types";
import { validateSettings, type SettingsErrors } from "./validation";
import {
  loadUserSettings,
  saveUserSettings,
  type SettingsPersistence,
} from "./storage";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function cloneSettings(s: UserSettings): UserSettings {
  return JSON.parse(JSON.stringify(s)) as UserSettings;
}

/**
 * Merges arbitrary stored data onto DEFAULT_SETTINGS: unknown/legacy fields are
 * dropped, known fields are coerced to safe types, and unsupported values fall
 * back to defaults. The result always has a complete, valid shape even if the
 * stored document is partial, old-versioned or tampered with.
 */
export function mergeSettings(raw: unknown): UserSettings {
  const out = cloneSettings(DEFAULT_SETTINGS);
  if (!isRecord(raw)) return out;

  if (isFiniteNumber(raw.version) && raw.version >= 1) out.version = raw.version;
  else out.version = SETTINGS_SCHEMA_VERSION;

  // general
  const g = isRecord(raw.general) ? raw.general : {};
  if (typeof g.timezone === "string" && (TIMEZONE_OPTIONS as readonly string[]).includes(g.timezone)) {
    out.general.timezone = g.timezone;
  }
  if (g.dateFormat === "iso" || g.dateFormat === "short" || g.dateFormat === "long") {
    out.general.dateFormat = g.dateFormat;
  }
  if (g.timeFormat === "12h" || g.timeFormat === "24h") out.general.timeFormat = g.timeFormat;

  // location
  const l = isRecord(raw.location) ? raw.location : {};
  if (typeof l.city === "string" && l.city.trim().length > 0 && l.city.trim().length <= 60) {
    out.location.city = l.city.trim();
  }
  if (typeof l.country === "string" && l.country.trim().length > 0 && l.country.trim().length <= 60) {
    out.location.country = l.country.trim();
  }
  if (isFiniteNumber(l.latitude) && l.latitude >= -90 && l.latitude <= 90) out.location.latitude = l.latitude;
  if (isFiniteNumber(l.longitude) && l.longitude >= -180 && l.longitude <= 180) out.location.longitude = l.longitude;
  if (typeof l.timezone === "string" && (TIMEZONE_OPTIONS as readonly string[]).includes(l.timezone)) {
    out.location.timezone = l.timezone;
  }

  // units
  const u = isRecord(raw.units) ? raw.units : {};
  if (u.temperature === "c" || u.temperature === "f") out.units.temperature = u.temperature;
  if (u.wind === "kmh" || u.wind === "ms" || u.wind === "mph") out.units.wind = u.wind;
  if (u.pressure === "hpa" || u.pressure === "inhg") out.units.pressure = u.pressure;
  if (u.precipitation === "mm" || u.precipitation === "in") out.units.precipitation = u.precipitation;

  // devices
  const d = isRecord(raw.devices) ? raw.devices : {};
  if (d.preferredMode === "simulation" || d.preferredMode === "live") out.devices.preferredMode = d.preferredMode;
  if (isFiniteNumber(d.pollIntervalMs) && d.pollIntervalMs >= POLL_INTERVAL_MIN_MS && d.pollIntervalMs <= POLL_INTERVAL_MAX_MS) {
    out.devices.pollIntervalMs = Math.round(d.pollIntervalMs);
  } else if (isFiniteNumber(d.pollIntervalMs)) {
    out.devices.pollIntervalMs = POLL_INTERVAL_DEFAULT_MS;
  }

  // alerts
  const a = isRecord(raw.alerts) ? raw.alerts : {};
  if (typeof a.enabled === "boolean") out.alerts.enabled = a.enabled;
  if (isRecord(a.preferences)) {
    for (const metric of ["temperature", "humidity", "windSpeed", "uvIndex", "airQuality"] as const) {
      const pref = isRecord(a.preferences[metric]) ? a.preferences[metric] : {};
      const target = out.alerts.preferences[metric];
      if (typeof pref.enabled === "boolean") target.enabled = pref.enabled;
      if (pref.warningThreshold === null || isFiniteNumber(pref.warningThreshold)) {
        target.warningThreshold = (pref.warningThreshold as number | null) ?? null;
      }
      if (pref.criticalThreshold === null || isFiniteNumber(pref.criticalThreshold)) {
        target.criticalThreshold = (pref.criticalThreshold as number | null) ?? null;
      }
    }
  }

  // forecast
  const f = isRecord(raw.forecast) ? raw.forecast : {};
  if (f.horizon === "1h" || f.horizon === "3h" || f.horizon === "6h") out.forecast.horizon = f.horizon;
  for (const key of ["showConfidence", "showRecommendations", "showRisk", "showExplanation"] as const) {
    if (typeof f[key] === "boolean") out.forecast[key] = f[key] as boolean;
  }

  // appearance
  const ap = isRecord(raw.appearance) ? raw.appearance : {};
  if (ap.theme === "system" || ap.theme === "light" || ap.theme === "dark") {
    out.appearance.theme = ap.theme as ThemePreference;
  }

  return out;
}

export interface LoadedSettings {
  settings: UserSettings;
  source: "account" | "local" | "defaults";
}

/** Loads + merges a user's settings, always returning a complete object. */
export async function getSettings(
  uid: string,
  persistence?: SettingsPersistence
): Promise<LoadedSettings> {
  const result = await loadUserSettings(uid, persistence);
  if (!result.settings) {
    return { settings: cloneSettings(DEFAULT_SETTINGS), source: "defaults" };
  }
  return { settings: mergeSettings(result.settings), source: result.source };
}

export interface SaveSettingsResult {
  ok: boolean;
  errors: SettingsErrors;
  savedToAccount?: boolean;
  savedLocally?: boolean;
  savedAt?: string;
}

/** Validates then persists settings. Invalid settings are never written. */
export async function persistSettings(
  uid: string,
  next: UserSettings,
  persistence?: SettingsPersistence
): Promise<SaveSettingsResult> {
  const errors = validateSettings(next);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  const outcome = await saveUserSettings(uid, mergeSettings(next), persistence);
  return {
    ok: true,
    errors: {},
    savedToAccount: outcome.savedToAccount,
    savedLocally: outcome.savedLocally,
    savedAt: outcome.savedAt,
  };
}

/** Resets a user's settings to defaults. */
export async function resetSettings(
  uid: string,
  persistence?: SettingsPersistence
): Promise<SaveSettingsResult> {
  return persistSettings(uid, cloneSettings(DEFAULT_SETTINGS), persistence);
}

// ---------------------------------------------------------------------------
// Alert preferences <-> legacy AlertSettings (used by the Alerts page editor).
// ---------------------------------------------------------------------------

/** Renders rich preferences into the legacy single-threshold editor shape. */
export function alertPrefsToSettings(prefs: AlertThresholdPreferences): AlertSettings {
  const defaults = createDefaultSettings();
  const out = { ...defaults };
  for (const metric of Object.keys(defaults) as MetricSettingKey[]) {
    const pref = prefs[metric];
    const isCritical = pref.criticalThreshold != null;
    out[metric] = {
      ...defaults[metric],
      metric,
      label: METRIC_LABELS[metric],
      unit: METRIC_UNITS[metric],
      enabled: pref.enabled,
      threshold:
        (isCritical ? pref.criticalThreshold : pref.warningThreshold) ??
        defaults[metric].threshold,
      severity: isCritical ? "critical" : "warning",
    };
  }
  return out;
}

/**
 * Applies a legacy editor patch to rich preferences. Enables/disables, edits
 * the threshold of the slot matching the editor's severity, or moves the
 * threshold when the severity select changes.
 */
export function applyAlertEditToPrefs(
  prefs: AlertThresholdPreferences,
  metric: MetricSettingKey,
  patch: Partial<AlertThresholdSetting>
): AlertThresholdPreferences {
  const next = cloneSettingsPreferences(prefs);
  const cur = next[metric];

  if (patch.enabled !== undefined) cur.enabled = patch.enabled;

  const currentCritical = cur.criticalThreshold != null;
  const displayThreshold = currentCritical ? cur.criticalThreshold : cur.warningThreshold;
  const targetSeverity = patch.severity ?? (currentCritical ? "critical" : "warning");

  if (patch.threshold !== undefined) {
    if (targetSeverity === "critical") cur.criticalThreshold = patch.threshold;
    else cur.warningThreshold = patch.threshold;
  } else if (patch.severity !== undefined) {
    const moving = patch.threshold ?? displayThreshold;
    if (patch.severity === "critical") {
      cur.criticalThreshold = moving;
      if (cur.warningThreshold === null) cur.warningThreshold = null;
    } else {
      cur.warningThreshold = moving;
    }
  }

  return next;
}

function cloneSettingsPreferences(prefs: AlertThresholdPreferences): AlertThresholdPreferences {
  return {
    temperature: { ...prefs.temperature },
    humidity: { ...prefs.humidity },
    windSpeed: { ...prefs.windSpeed },
    uvIndex: { ...prefs.uvIndex },
    airQuality: { ...prefs.airQuality },
  };
}