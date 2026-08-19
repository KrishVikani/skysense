"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CircuitBoard,
  CloudSun,
  Cpu,
  Database,
  Globe2,
  Info,
  MapPin,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Ruler,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useSettings } from "@/components/SettingsProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { useLocation } from "@/components/LocationProvider";
import { DEFAULT_WEATHER_LOCATION } from "@/lib/weather/locations";
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
  type DateFormatPreference,
  type ThemePreference,
  type TimeFormatPreference,
  type UserSettings,
} from "@/lib/settings/types";
import { mergeSettings, type SaveSettingsResult } from "@/lib/settings/service";
import { validateSettings, type SettingsErrors } from "@/lib/settings/validation";
import {
  convertPrecipitation,
  convertPressure,
  convertTemperature,
  convertWind,
  precipitationLabel,
  pressureLabel,
  temperatureLabel,
  windLabel,
} from "@/lib/settings/units";
import { SENSOR_DEFINITIONS } from "@/lib/devices/sensors";
import { ESP32_DEVICE_ID, ESP32_DEVICE_NAME } from "@/lib/devices/contract";
import { DEVICES_DATA_SOURCE } from "@/lib/devices/service";
import type { AlertThresholdPreferences } from "@/lib/alerts/types";

const ALERT_METRICS: {
  key: keyof AlertThresholdPreferences;
  label: string;
  unit: string;
  min: number;
  max: number;
}[] = [
  { key: "temperature", label: "Temperature", unit: "°C", min: -40, max: 60 },
  { key: "humidity", label: "Humidity", unit: "%", min: 0, max: 100 },
  { key: "windSpeed", label: "Wind speed", unit: "km/h", min: 0, max: 200 },
  { key: "uvIndex", label: "UV index", unit: "", min: 0, max: 20 },
  { key: "airQuality", label: "Air quality", unit: "AQI", min: 0, max: 500 },
];

const SECTION_NAV: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "settings-general", label: "General", icon: Globe2 },
  { id: "settings-location", label: "Location", icon: MapPin },
  { id: "settings-units", label: "Units", icon: Ruler },
  { id: "settings-alerts", label: "Alerts", icon: BellRing },
  { id: "settings-forecast", label: "Forecast", icon: CloudSun },
  { id: "settings-appearance", label: "Appearance", icon: Palette },
  { id: "settings-devices", label: "Device & Data", icon: Cpu },
  { id: "settings-privacy", label: "Privacy", icon: ShieldCheck },
  { id: "settings-hardware", label: "Hardware", icon: CircuitBoard },
];

const SECTION_IDS = SECTION_NAV.map((s) => s.id);

type Status = { type: "success" | "error" | "info"; message: string } | null;

interface SectionCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tag?: string;
  accentVar?: string;
  children: React.ReactNode;
}

function SectionCard({
  id,
  icon,
  title,
  subtitle,
  tag,
  accentVar = "--color-accent",
  children,
}: SectionCardProps) {
  return (
    <motion.section
      id={id}
      className="scroll-mt-32"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="card-premium p-6">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentVar} 12%, transparent)`,
              color: accentVar,
            }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="section-title">{title}</h2>
              {tag && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
                    color: accentVar,
                  }}
                >
                  {tag}
                </span>
              )}
            </div>
            <p className="section-subtitle mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="mt-5 space-y-5">{children}</div>
      </div>
    </motion.section>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (_next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
        checked ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

interface SelectProps {
  value: string;
  onChange: (_next: string) => void;
  options: readonly string[];
  formatLabel?: (_v: string) => string;
  disabled?: boolean;
}

function SelectField({ value, onChange, options, formatLabel, disabled, ariaLabel }: SelectProps & { ariaLabel?: string }) {
  return (
    <select
      className="input-premium max-w-xs"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {formatLabel ? formatLabel(opt) : opt}
        </option>
      ))}
    </select>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (_next: T) => void;
  options: readonly T[];
  labels?: Record<string, React.ReactNode>;
  disabled?: boolean;
}

function Segmented<T extends string>({ value, onChange, options, labels, disabled }: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-xl bg-muted/10 border border-border p-1 gap-1">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels?.[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-foreground">{children}</p>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-danger mt-1 flex items-center gap-1">{message}</p>;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-6 pb-5 border-b border-border/60 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function timezoneLabel(tz: string): string {
  return tz === "UTC" ? "UTC (Coordinated Universal Time)" : tz.replace(/_/g, " ");
}

/** Scroll-spy: returns the id of the section currently occupying the viewport. */
function useActiveSection(ids: readonly string[], enabled: boolean): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (!enabled) return;
    const observers: IntersectionObserver[] = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActive(id);
          }
        },
        { rootMargin: "-25% 0px -65% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [ids, enabled]);
  return active;
}

export default function SettingsPageClient() {
  const { user } = useAuth();
  const { settings, loaded, source, error, lastSavedAt, lastSavedLocally, save, reset, clearLocal } = useSettings();
  const { setTheme } = useTheme();
  const { setLocation } = useLocation();

  const [draft, setDraft] = useState<UserSettings>(() => JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [hydrated, setHydrated] = useState(false);
  const [latText, setLatText] = useState<string>(String(DEFAULT_SETTINGS.location.latitude));
  const [lonText, setLonText] = useState<string>(String(DEFAULT_SETTINGS.location.longitude));
  const themeSyncedRef = useRef(false);
  const activeSection = useActiveSection(SECTION_IDS, loaded);

  // Hydrate the editor once account/local settings finish loading.
  useEffect(() => {
    if (!loaded || hydrated) return;
    setDraft(JSON.parse(JSON.stringify(settings)));
    setLatText(String(settings.location.latitude));
    setLonText(String(settings.location.longitude));
    setHydrated(true);
  }, [loaded, settings, hydrated]);

  // Apply an account theme preference exactly once when settings load. After
  // that the Appearance selector (and the TopBar/Sidebar toggle) is the live
  // control, so this must NOT react to every theme change or user picks would
  // be immediately reverted to the committed value.
  useEffect(() => {
    if (!loaded || themeSyncedRef.current) return;
    themeSyncedRef.current = true;
    setTheme(settings.appearance.theme);
  }, [loaded, settings.appearance.theme, setTheme]);

  const dirty = useMemo(
    () => hydrated && JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings, hydrated]
  );

  const liveErrors = useMemo(() => validateSettings(draft), [draft]);

  const update = <K extends keyof UserSettings>(section: K, patch: Partial<UserSettings[K]>) => {
    setDraft((d) => {
      const current = d[section] as object;
      return {
        ...d,
        [section]: { ...current, ...(patch as object) } as UserSettings[K],
      };
    });
  };

  const commitCoordinate = (
    axis: "latitude" | "longitude",
    text: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(text);
    if (text.trim() === "") return;
    const value = Number(text);
    if (Number.isFinite(value)) update("location", { [axis]: value });
  };

  const updateAlertsPref = <M extends keyof AlertThresholdPreferences>(
    metric: M,
    patch: Partial<AlertThresholdPreferences[M]>
  ) => {
    setDraft((d) => ({
      ...d,
      alerts: {
        ...d.alerts,
        preferences: {
          ...d.alerts.preferences,
          [metric]: { ...d.alerts.preferences[metric], ...patch },
        },
      },
    }));
  };

  const clearErrorFor = (key: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const firstError = (errs: SettingsErrors): string => Object.values(errs)[0] ?? "Something went wrong while saving.";

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const normalized = mergeSettings(draft);
    setDraft(normalized);
    const result: SaveSettingsResult = await save(normalized);
    if (result.ok) {
      // Keep the authoritative weather/header location in step with the
      // location label the user just committed from Settings.
      setLocation(
        {
          name: normalized.location.city,
          country: normalized.location.country,
          state: undefined,
          lat: normalized.location.latitude,
          lon: normalized.location.longitude,
        },
        { syncSettings: false }
      );
      setErrors({});
      setStatus({
        type: "success",
        message: result.savedLocally
          ? "Saved to this device. Account storage is unavailable right now — it will keep working offline."
          : "Settings saved to your account.",
      });
    } else {
      setErrors(result.errors);
      setStatus({ type: "error", message: firstError(result.errors) });
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    setStatus(null);
    const result = await reset();
    setDraft(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    setLatText(String(DEFAULT_SETTINGS.location.latitude));
    setLonText(String(DEFAULT_SETTINGS.location.longitude));
    if (result.ok) {
      // Keep the authoritative weather/header location in step with the reset.
      setLocation(
        {
          name: DEFAULT_WEATHER_LOCATION.name,
          country: DEFAULT_WEATHER_LOCATION.country,
          state: DEFAULT_WEATHER_LOCATION.state,
          lat: DEFAULT_WEATHER_LOCATION.lat,
          lon: DEFAULT_WEATHER_LOCATION.lon,
        },
        { syncSettings: false }
      );
      setErrors({});
      setTheme(DEFAULT_SETTINGS.appearance.theme);
      setStatus({
        type: "info",
        message: result.savedLocally
          ? "Settings reset to defaults on this device."
          : "Settings reset to defaults on your account.",
      });
    } else {
      setErrors(result.errors);
      setStatus({ type: "error", message: firstError(result.errors) });
    }
    setSaving(false);
  };

  const handleClearLocal = () => {
    clearLocal();
    setStatus({ type: "info", message: "Local preferences cleared from this browser." });
  };

  if (!loaded) {
    return (
      <DashboardShell atmosphere="settings">
        <div className="space-y-6 max-w-5xl">
          <div className="h-9 w-56 skeleton-shimmer rounded" />
          <div className="grid gap-6">
            <div className="h-48 skeleton-shimmer rounded-2xl card-premium" />
            <div className="h-48 skeleton-shimmer rounded-2xl card-premium" />
            <div className="h-48 skeleton-shimmer rounded-2xl card-premium" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  const sourceBadge =
    source === "account"
      ? "Saved to account"
      : source === "local"
        ? "Saved locally"
        : "Using defaults";

  const pollSeconds = Math.round(draft.devices.pollIntervalMs / 1000);

  return (
    <DashboardShell atmosphere="settings">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configuration for {user?.displayName ?? "your account"} — units, alerts, forecast and the future
              ESP32 station.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge badge-accent">
              <CheckCircle2 className="w-3 h-3" />
              {sourceBadge}
            </span>
            {lastSavedAt && (
              <span className="badge" style={{ color: "var(--color-muted-foreground)" }}>
                Saved {new Date(lastSavedAt).toLocaleTimeString()}
                {lastSavedLocally ? " (local)" : ""}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-warning bg-warning-bg/50 border border-warning/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {status && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 border ${
              status.type === "success"
                ? "text-success bg-success-bg/50 border-success/20"
                : status.type === "error"
                  ? "text-danger bg-danger-bg/50 border-danger/20"
                  : "text-info bg-info-bg/50 border-info/20"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : status.type === "error" ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <Info className="w-4 h-4 shrink-0" />
            )}
            {status.message}
          </motion.div>
        )}

        {/* Sticky save bar */}
        <div className="sticky top-16 z-10 glass-strong rounded-2xl p-3 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground min-w-0" aria-live="polite">
            {dirty ? (
              <span className="flex items-center gap-1.5 text-warning">
                <Info className="w-4 h-4 shrink-0" />
                You have unsaved changes
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                All changes saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-secondary gap-2" onClick={handleReset} disabled={saving}>
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button className="btn-primary gap-2" onClick={handleSave} disabled={saving || !dirty}>
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save changes"}</span>
            </button>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:items-start">
          {/* Section navigation (desktop) */}
          <nav className="hidden lg:block" aria-label="Settings sections">
            <div className="sticky top-28 glass p-2 rounded-2xl space-y-0.5">
              {SECTION_NAV.map(({ id, label, icon: NavIcon }) => {
                const isActive = activeSection === id;
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                      isActive
                        ? "bg-accent-bg text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                    }`}
                  >
                    <NavIcon className="w-4 h-4" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </a>
                );
              })}
            </div>
          </nav>

          {/* Sections */}
          <div className="space-y-6 min-w-0">
            {/* General */}
            <SectionCard
              id="settings-general"
              icon={<Globe2 className="w-5 h-5" />}
              title="General"
              subtitle="Regional display preferences used across the app. These are personal choices — they never change sensor readings."
              tag="Preference"
            >
              <Row label="Timezone" hint="Used for timestamps and the location default.">
                <SelectField
                  ariaLabel="Timezone"
                  value={draft.general.timezone}
                  onChange={(v) => {
                    clearErrorFor("general.timezone");
                    update("general", { timezone: v });
                  }}
                  options={TIMEZONE_OPTIONS}
                  formatLabel={timezoneLabel}
                />
              </Row>
              <Row label="Date format" hint="How dates are rendered (stored timestamps never change).">
                <Segmented<DateFormatPreference>
                  value={draft.general.dateFormat}
                  onChange={(v) => update("general", { dateFormat: v })}
                  options={DATE_FORMATS}
                  labels={{ iso: "2026-08-16", short: "16 Aug 2026", long: "16 August 2026" }}
                />
              </Row>
              <Row label="Time format" hint="12-hour or 24-hour clock display.">
                <Segmented<TimeFormatPreference>
                  value={draft.general.timeFormat}
                  onChange={(v) => update("general", { timeFormat: v })}
                  options={TIME_FORMATS}
                  labels={{ "12h": "12-hour", "24h": "24-hour" }}
                />
              </Row>
            </SectionCard>

            {/* Location */}
            <SectionCard
              id="settings-location"
              icon={<MapPin className="w-5 h-5" />}
              title="Location"
              subtitle="Where the station is deployed — used as the default location label. It is a label preference, not live meteorological data."
              tag="Preference"
              accentVar="var(--color-info)"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>City</FieldLabel>
                  <input
                    className="input-premium"
                    aria-label="City"
                    value={draft.location.city}
                    onChange={(e) => {
                      clearErrorFor("location.city");
                      update("location", { city: e.target.value });
                    }}
                    maxLength={60}
                  />
                  <FieldError message={errors["location.city"] ?? liveErrors["location.city"]} />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <input
                    className="input-premium"
                    aria-label="Country"
                    value={draft.location.country}
                    onChange={(e) => {
                      clearErrorFor("location.country");
                      update("location", { country: e.target.value });
                    }}
                    maxLength={60}
                  />
                  <FieldError message={errors["location.country"] ?? liveErrors["location.country"]} />
                </div>
                <div>
                  <FieldLabel>Latitude</FieldLabel>
                  <input
                    className="input-premium"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    aria-label="Latitude"
                    value={latText}
                    onChange={(e) => {
                      clearErrorFor("location.latitude");
                      commitCoordinate("latitude", e.target.value, setLatText);
                    }}
                  />
                  <FieldError message={errors["location.latitude"] ?? liveErrors["location.latitude"]} />
                </div>
                <div>
                  <FieldLabel>Longitude</FieldLabel>
                  <input
                    className="input-premium"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    aria-label="Longitude"
                    value={lonText}
                    onChange={(e) => {
                      clearErrorFor("location.longitude");
                      commitCoordinate("longitude", e.target.value, setLonText);
                    }}
                  />
                  <FieldError message={errors["location.longitude"] ?? liveErrors["location.longitude"]} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Latitude must be −90…90 and longitude −180…180. An empty coordinate keeps the last valid value.
              </p>
              <Row label="Timezone">
                <SelectField
                  ariaLabel="Timezone"
                  value={draft.location.timezone}
                  onChange={(v) => {
                    clearErrorFor("location.timezone");
                    update("location", { timezone: v });
                  }}
                  options={TIMEZONE_OPTIONS}
                  formatLabel={timezoneLabel}
                />
              </Row>
            </SectionCard>

            {/* Units */}
            <SectionCard
              id="settings-units"
              icon={<Ruler className="w-5 h-5" />}
              title="Units"
              subtitle="Display units. Sensor values stay metric in storage — conversion happens only when shown."
              tag="Display"
              accentVar="var(--color-warning)"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Temperature</FieldLabel>
                  <div className="mt-2">
                    <Segmented
                      value={draft.units.temperature}
                      onChange={(v) => update("units", { temperature: v })}
                      options={TEMPERATURE_UNITS}
                      labels={{ c: "°C", f: "°F" }}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Wind speed</FieldLabel>
                  <div className="mt-2">
                    <Segmented
                      value={draft.units.wind}
                      onChange={(v) => update("units", { wind: v })}
                      options={WIND_UNITS}
                      labels={{ kmh: "km/h", ms: "m/s", mph: "mph" }}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Pressure</FieldLabel>
                  <div className="mt-2">
                    <Segmented
                      value={draft.units.pressure}
                      onChange={(v) => update("units", { pressure: v })}
                      options={PRESSURE_UNITS}
                      labels={{ hpa: "hPa", inhg: "inHg" }}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Precipitation</FieldLabel>
                  <div className="mt-2">
                    <Segmented
                      value={draft.units.precipitation}
                      onChange={(v) => update("units", { precipitation: v })}
                      options={PRECIPITATION_UNITS}
                      labels={{ mm: "mm", in: "in" }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground bg-muted/5 rounded-xl px-4 py-3">
                <span>
                  Example:{" "}
                  <b className="text-foreground">
                    {convertTemperature(28, draft.units.temperature).toFixed(1)}
                    {temperatureLabel(draft.units.temperature)}
                  </b>
                </span>
                <span>
                  Wind:{" "}
                  <b className="text-foreground">
                    {convertWind(14, draft.units.wind).toFixed(1)} {windLabel(draft.units.wind)}
                  </b>
                </span>
                <span>
                  Pressure:{" "}
                  <b className="text-foreground">
                    {convertPressure(1013, draft.units.pressure).toFixed(1)} {pressureLabel(draft.units.pressure)}
                  </b>
                </span>
                <span>
                  Rain:{" "}
                  <b className="text-foreground">
                    {convertPrecipitation(12, draft.units.precipitation).toFixed(
                      draft.units.precipitation === "in" ? 2 : 1
                    )}{" "}
                    {precipitationLabel(draft.units.precipitation)}
                  </b>
                </span>
              </div>
            </SectionCard>

            {/* Alerts */}
            <SectionCard
              id="settings-alerts"
              icon={<BellRing className="w-5 h-5" />}
              title="Alerts"
              subtitle="Notification preferences for environmental alerts. These tune which alerts fire — they never change the measured values."
              tag="Notification"
              accentVar="var(--color-danger)"
            >
              <Row
                label="Alerts enabled"
                hint="When off, custom thresholds below are ignored and the default alert rules are used."
              >
                <ToggleSwitch
                  checked={draft.alerts.enabled}
                  onChange={(v) => update("alerts", { enabled: v })}
                  label="Alerts enabled"
                />
              </Row>

              {!draft.alerts.enabled && (
                <p className="text-xs text-warning flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Alert thresholds are stored but not applied until the master switch is turned on.
                </p>
              )}

              <div className="space-y-4">
                {ALERT_METRICS.map(({ key, label, unit, min, max }) => {
                  const pref = draft.alerts.preferences[key];
                  return (
                    <div key={key} className="rounded-xl border border-border bg-muted/5 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            Range {min}–{max}
                            {unit ? ` ${unit}` : ""}
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={pref.enabled}
                          onChange={(v) => updateAlertsPref(key, { enabled: v })}
                          label={`${label} alerts enabled`}
                          disabled={!draft.alerts.enabled}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <FieldLabel>Warning</FieldLabel>
                          <input
                            className="input-premium mt-1"
                            type="number"
                            step="any"
                            disabled={!pref.enabled || !draft.alerts.enabled}
                            placeholder="auto"
                            aria-label={`${label} warning threshold`}
                            value={pref.warningThreshold ?? ""}
                            onChange={(e) =>
                              updateAlertsPref(key, {
                                warningThreshold: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          <FieldError
                            message={
                              errors[`alerts.preferences.${key}.warningThreshold`] ??
                              liveErrors[`alerts.preferences.${key}.warningThreshold`]
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Critical</FieldLabel>
                          <input
                            className="input-premium mt-1"
                            type="number"
                            step="any"
                            disabled={!pref.enabled || !draft.alerts.enabled}
                            placeholder="auto"
                            aria-label={`${label} critical threshold`}
                            value={pref.criticalThreshold ?? ""}
                            onChange={(e) =>
                              updateAlertsPref(key, {
                                criticalThreshold: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          <FieldError
                            message={
                              errors[`alerts.preferences.${key}.criticalThreshold`] ??
                              liveErrors[`alerts.preferences.${key}.criticalThreshold`]
                            }
                          />
                        </div>
                      </div>
                      <FieldError
                        message={errors[`alerts.preferences.${key}`] ?? liveErrors[`alerts.preferences.${key}`]}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Empty thresholds keep the engine&apos;s default rules for that severity. The environmental readings
                themselves are always the same — only whether an alert is raised for display changes.
              </p>
            </SectionCard>

            {/* Forecast */}
            <SectionCard
              id="settings-forecast"
              icon={<CloudSun className="w-5 h-5" />}
              title="Forecast"
              subtitle="Display preferences for the AI forecast. The forecast engine always runs unchanged — these flags only control what you see."
              tag="Display"
              accentVar="var(--color-info)"
            >
              <Row label="Default horizon" hint="The inline switcher on the AI page can still change this for a session.">
                <Segmented
                  value={draft.forecast.horizon}
                  onChange={(v) => update("forecast", { horizon: v })}
                  options={FORECAST_HORIZON_OPTIONS}
                  labels={{ "1h": "Next hour", "3h": "Next 3 hours", "6h": "Next 6 hours" }}
                />
              </Row>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    ["showConfidence", "Confidence & data quality"],
                    ["showRecommendations", "Recommendations"],
                    ["showRisk", "Forward risk"],
                    ["showExplanation", "Why this outlook"],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/5 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <ToggleSwitch
                      checked={draft.forecast[key]}
                      onChange={(v) => update("forecast", { [key]: v })}
                      label={`Show ${label}`}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Appearance */}
            <SectionCard
              id="settings-appearance"
              icon={<Palette className="w-5 h-5" />}
              title="Appearance"
              subtitle="Theme applies instantly through the existing theme system and is remembered in this browser and your account."
              tag="Preference"
              accentVar="var(--color-accent)"
            >
              <Row label="Theme" hint="System follows your operating system.">
                <Segmented<ThemePreference>
                  value={draft.appearance.theme}
                  onChange={(v) => {
                    setTheme(v);
                    update("appearance", { theme: v });
                  }}
                  options={THEME_PREFERENCES}
                  labels={{
                    system: (
                      <span className="inline-flex items-center gap-1.5">
                        <Monitor className="w-4 h-4" /> System
                      </span>
                    ),
                    light: (
                      <span className="inline-flex items-center gap-1.5">
                        <Sun className="w-4 h-4" /> Light
                      </span>
                    ),
                    dark: (
                      <span className="inline-flex items-center gap-1.5">
                        <Moon className="w-4 h-4" /> Dark
                      </span>
                    ),
                  }}
                />
              </Row>
            </SectionCard>

            {/* Device & Data */}
            <SectionCard
              id="settings-devices"
              icon={<Cpu className="w-5 h-5" />}
              title="Device & Data"
              subtitle="Preferences for the station data source and refresh behaviour. None of these fabricate readings — the actual state is data-driven."
              tag="Preference"
              accentVar="var(--color-sun)"
            >
              <Row
                label="Preferred operating mode"
                hint="A preference for the future station. The actual connection state is always data-driven and shown on the My Station page."
              >
                <Segmented
                  value={draft.devices.preferredMode}
                  onChange={(v) => update("devices", { preferredMode: v })}
                  options={["simulation", "live"] as const}
                  labels={{ simulation: "Simulation", live: "Live (ESP32)" }}
                />
              </Row>
              <Row
                label="Auto-refresh interval"
                hint={`The My Station page refreshes every ${pollSeconds}s while visible. Bounded between ${POLL_INTERVAL_MIN_MS / 1000}s and ${POLL_INTERVAL_MAX_MS / 1000}s.`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={POLL_INTERVAL_MIN_MS / 1000}
                    max={POLL_INTERVAL_MAX_MS / 1000}
                    step={5}
                    value={pollSeconds}
                    aria-label="Auto-refresh interval in seconds"
                    onChange={(e) => update("devices", { pollIntervalMs: Number(e.target.value) * 1000 })}
                    className="w-48 accent-accent"
                  />
                  <span className="text-sm font-medium text-foreground tabular-nums w-16">{pollSeconds}s</span>
                </div>
              </Row>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                The station currently streams <b className="text-foreground">simulated</b> readings. Live ESP32 data
                will appear automatically once a real station connects — no app changes needed.
              </p>
            </SectionCard>

            {/* Privacy */}
            <SectionCard
              id="settings-privacy"
              icon={<ShieldCheck className="w-5 h-5" />}
              title="Privacy"
              subtitle="Honest control over what is stored and where."
              tag="Information"
              accentVar="var(--color-success)"
            >
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Your settings are saved to your account in Firestore under{" "}
                  <code className="font-mono text-xs">users/{user?.uid}/settings/app</code>, protected by the same
                  rules as your profile. When the account store is unreachable, the app falls back to localStorage in
                  this browser only, namespaced per user.
                </p>
                <p className="leading-relaxed">
                  Sensor readings and their history are <b className="text-foreground">simulated</b> for now. Analytics
                  and data-collection toggles are <b className="text-foreground">not yet implemented</b> — there is
                  nothing to turn off yet, and we will not fake a control.
                </p>
                <p className="leading-relaxed">
                  No telemetry is transmitted from your browser to the device, and no sensor data leaves the
                  application&apos;s existing data provider. Changing these preferences does not enable any new
                  collection.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2">
                <div>
                  <FieldLabel>Local browser preferences</FieldLabel>
                  <FieldHint>Removes the theme, alert and settings copies stored in this browser.</FieldHint>
                </div>
                <button className="btn-secondary gap-2" onClick={handleClearLocal}>
                  <Trash2 className="w-4 h-4" />
                  <span>Clear local</span>
                </button>
              </div>
            </SectionCard>

            {/* Hardware */}
            <SectionCard
              id="settings-hardware"
              icon={<CircuitBoard className="w-5 h-5" />}
              title="Device & Hardware"
              subtitle="The future SKYSENSE ESP32 environmental station — not connected yet."
              tag="Device status"
              accentVar="var(--color-warning)"
            >
              {/* Status panel */}
              <div className="rounded-xl border border-border bg-muted/5 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{ESP32_DEVICE_NAME}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{ESP32_DEVICE_ID}</p>
                  </div>
                  <span className="badge badge-danger shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger" aria-hidden="true" />
                    NOT CONNECTED
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Current state: <b className="text-foreground">Simulation</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    Data source: <b className="text-foreground">{DEVICES_DATA_SOURCE}</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Firmware: <b className="text-foreground">Not connected</b>
                  </span>
                </div>
              </div>

              {/* Future integration */}
              <div
                className="rounded-xl border border-info/20 p-4"
                style={{ backgroundColor: "color-mix(in srgb, var(--color-info) 6%, transparent)" }}
              >
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Info className="w-4 h-4 text-info" />
                  Future hardware integration
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  During the hardware phase the ESP32 firmware will stream live readings into the existing data
                  provider. The web app, its alert and forecast engines, and this Settings page already consume that
                  abstraction — nothing here needs redesign, and nothing is wired to physical hardware yet.
                </p>
              </div>

              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                The component names below are stable software identifiers a future firmware build will map to real
                sensors. No physical wiring exists yet — every component is marked{" "}
                <b className="text-foreground">planned</b>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SENSOR_DEFINITIONS.map((def) => (
                  <div
                    key={def.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{def.label}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{def.hardwareComponent}</p>
                    </div>
                    <span className="badge badge-warning shrink-0">Planned</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}