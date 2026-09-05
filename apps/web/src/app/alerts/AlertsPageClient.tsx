"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BellRing,
  Clock,
  Database,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@skysense/ui";
import { AlertSummaryCards, type AlertFilter } from "@/components/alerts/AlertSummaryCards";
import { AlertCard } from "@/components/alerts/AlertCard";
import { AlertHistory } from "@/components/alerts/AlertHistory";
import { AlertSettings } from "@/components/alerts/AlertSettings";
import { DataSourceStatus } from "@/components/alerts/DataSourceStatus";
import { formatTime } from "@/components/alerts/format";
import { SEVERITY_COLOR, topSeverityOf } from "@/components/alerts/severity";
import { createDefaultSettings, createDefaultPreferences } from "@/lib/alerts/rules";
import type { MetricSettingKey } from "@/lib/alerts/rules";
import { getAlertsSnapshot, getAlertsSnapshotWithPreferences } from "@/lib/alerts/service";
import { ALERTS_DATA_SOURCE } from "@/lib/alerts/service";
import { fetchDeviceStatus } from "@/lib/devices/service";
import { ESP32_DEVICE_ID } from "@/lib/devices/contract";
import { useSettings } from "@/components/SettingsProvider";
import { alertPrefsToSettings, applyAlertEditToPrefs } from "@/lib/settings/service";
import type {
  AlertSettings as AlertSettingsType,
  AlertSummary,
  AlertThresholdPreferences,
  AlertThresholdSetting,
  EnvironmentalAlert,
} from "@/lib/alerts/types";

const SETTINGS_STORAGE_KEY = "skysense.alerts.settings";

function AlertsSkeleton() {
  return (
    <div className="space-y-6 animate-in" role="status" aria-busy="true" aria-label="Loading environmental alerts">
      <div className="card-premium p-6">
        <div className="h-7 w-64 skeleton-shimmer rounded-lg" />
        <div className="h-4 w-96 max-w-full skeleton-shimmer rounded mt-2" />
      </div>
      <div className="card-premium p-6">
        <div className="h-5 w-48 skeleton-shimmer rounded" />
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </div>
      <div className="card-premium p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-elevated p-5 h-36 skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}

function AlertsError({ onRetry }: { onRetry: () => void }) {
  return (
    <DashboardShell atmosphere="alerts">
      <div className="max-w-lg mx-auto">
        <EmptyState
          title="Alerts unavailable"
          description="We couldn't evaluate environmental alerts right now. Please try again."
          icon={<AlertTriangle className="w-10 h-10 text-warning" />}
          action={
            <button type="button" onClick={onRetry} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          }
        />
      </div>
    </DashboardShell>
  );
}

export default function AlertsPageClient() {
  const [settings, setSettings] = useState<AlertSettingsType>(createDefaultSettings);
  const settingsRef = useRef(settings);
  const prefsRef = useRef<AlertThresholdPreferences | null>(null);
  const [active, setActive] = useState<EnvironmentalAlert[]>([]);
  const [history, setHistory] = useState<EnvironmentalAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [location, setLocation] = useState("");
  const [lastEvaluated, setLastEvaluated] = useState("");
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasLoadedRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);
  const [deviceStatus, setDeviceStatus] = useState<{
    connection: string;
    mode: string;
    dataSource: string | undefined;
    lastSeen: string | null;
  } | null>(null);

  const { settings: userSettings, loaded: settingsLoaded, save: saveAccountSettings } = useSettings();
  const userAlertPrefs: AlertThresholdPreferences | null =
    settingsLoaded && userSettings?.alerts?.enabled === true
      ? userSettings.alerts.preferences
      : null;

  const syncLocalAlerts = (prefs: AlertThresholdPreferences) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(alertPrefsToSettings(prefs)));
      }
    } catch {
      // Best-effort.
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AlertSettingsType;
        settingsRef.current = parsed;
        setSettings(parsed);
      }
    } catch {
      // Ignore corrupt persisted settings and fall back to defaults.
    }
    setHydrated(true);
  }, []);

  // Once account settings load, the Settings page becomes the source of truth:
  // sync the in-page editor and evaluation to the account preferences.
  useEffect(() => {
    if (!hydrated || !settingsLoaded) return;
    prefsRef.current = userAlertPrefs;
    if (userAlertPrefs) {
      settingsRef.current = alertPrefsToSettings(userAlertPrefs);
      setSettings(settingsRef.current);
    }
    setReloadKey((k) => k + 1);
  }, [hydrated, settingsLoaded, userAlertPrefs]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    if (!hasLoadedRef.current) setLoading(true);
    setRefreshing(true);
    setError(false);

    const snapshotPromise = prefsRef.current
      ? getAlertsSnapshotWithPreferences(prefsRef.current)
      : getAlertsSnapshot(settingsRef.current);

    snapshotPromise
      .then((snapshot) => {
        if (cancelled) return;
        setActive(snapshot.active);
        setHistory(snapshot.history);
        setSummary(snapshot.summary);
        setLocation(snapshot.location);
        setLastEvaluated(snapshot.lastEvaluated);
        hasLoadedRef.current = true;
        setHasLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, hydrated]);

  // Fetch device status once on mount (and re-fetch on re-evaluate).
  useEffect(() => {
    let cancelled = false;
    fetchDeviceStatus(ESP32_DEVICE_ID)
      .then((status) => {
        if (!cancelled) {
          setDeviceStatus(status);
        }
      })
      .catch(() => {
        // Keep previous state; banner will fall back to simulation.
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, hydrated]);

  const applySettings = (next: AlertSettingsType) => {
    settingsRef.current = next;
    setSettings(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // Persistence is best-effort in this phase.
    }
    setReloadKey((k) => k + 1);
  };

  const updateSetting = (metric: MetricSettingKey, patch: Partial<AlertThresholdSetting>) => {
    if (prefsRef.current && userSettings) {
      const nextPrefs = applyAlertEditToPrefs(prefsRef.current, metric, patch);
      prefsRef.current = nextPrefs;
      setSettings(alertPrefsToSettings(nextPrefs));
      syncLocalAlerts(nextPrefs);
      void saveAccountSettings({
        ...userSettings,
        alerts: { ...userSettings.alerts, preferences: nextPrefs },
      });
      setReloadKey((k) => k + 1);
      return;
    }
    applySettings({ ...settings, [metric]: { ...settings[metric], ...patch } });
  };

  const resetSettings = () => {
    if (prefsRef.current && userSettings) {
      const nextPrefs = createDefaultPreferences();
      prefsRef.current = nextPrefs;
      setSettings(alertPrefsToSettings(nextPrefs));
      syncLocalAlerts(nextPrefs);
      void saveAccountSettings({
        ...userSettings,
        alerts: { ...userSettings.alerts, preferences: nextPrefs },
      });
      setReloadKey((k) => k + 1);
      return;
    }
    applySettings(createDefaultSettings());
  };

  const handleSelect = (next: AlertFilter) => {
    if (next === "resolved") {
      historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setFilter(next);
  };

  const acknowledge = (id: string) => {
    const target = active.find((a) => a.id === id);
    setActive((prev) =>
      prev.map((a) =>
        a.id === id && a.status === "active"
          ? { ...a, status: "acknowledged", acknowledgedAt: new Date().toISOString() }
          : a
      )
    );
    setSummary((s) => (s ? { ...s, active: Math.max(0, s.active - 1), acknowledged: s.acknowledged + 1 } : s));
    if (target) setAnnouncement(`Alert "${target.title}" acknowledged.`);
  };

  const resolve = (id: string) => {
    const target = active.find((a) => a.id === id);
    if (!target) return;
    setActive((prev) => prev.filter((a) => a.id !== id));
    setHistory((h) => [{ ...target, status: "resolved", resolvedAt: new Date().toISOString() }, ...h]);
    setSummary((s) =>
      s
        ? {
            ...s,
            resolved: s.resolved + 1,
            active: target.status === "active" ? Math.max(0, s.active - 1) : s.active,
            acknowledged: target.status === "acknowledged" ? Math.max(0, s.acknowledged - 1) : s.acknowledged,
            [target.severity]: Math.max(0, s[target.severity] - 1),
          }
        : s
    );
    setAnnouncement(`Alert "${target.title}" resolved.`);
  };

  if (error && !hasLoaded) {
    return <AlertsError onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  if (loading && !hasLoaded) {
    return (
      <DashboardShell atmosphere="alerts">
        <AlertsSkeleton />
      </DashboardShell>
    );
  }

  const filteredActive = filter === "all" ? active : active.filter((a) => a.severity === filter);
  const topSeverity = summary ? topSeverityOf(summary) : null;
  const topColor = topSeverity ? SEVERITY_COLOR[topSeverity] : "var(--color-success)";
  const isLive = deviceStatus?.connection === "online" && deviceStatus?.dataSource === "esp32";
  const alertsDataSource = isLive ? "ESP32 device telemetry" : ALERTS_DATA_SOURCE;

  return (
    <DashboardShell atmosphere="alerts">
      <div className="space-y-6">
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Environmental Alerts</h1>
            <p className="text-muted-foreground mt-1">
              Current conditions, active warnings and recommended actions from the SKYSENSE alert engine
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DataSourceStatus dataSource={alertsDataSource} />
              {deviceStatus === null || !isLive && (
                <span className="text-xs text-muted-foreground">
                  Simulated environmental data · ESP32 not connected
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-medium text-foreground">{location}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 text-accent" />
              Evaluated at{" "}
              <span className="font-medium text-foreground">{lastEvaluated ? formatTime(lastEvaluated) : "—"}</span>
            </div>
            <div
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${topColor} 12%, transparent)`,
                color: topColor,
              }}
            >
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: topColor }} />
              </span>
              {active.length} active alert{active.length === 1 ? "" : "s"}
            </div>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
              Re-evaluate
            </button>
          </div>
        </motion.div>

        {summary && (
          <AlertSummaryCards
            summary={summary}
            activeTotal={active.length}
            selected={filter}
            onSelect={handleSelect}
          />
        )}

        <motion.div
          className="card-premium p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-accent" aria-hidden="true" />
                <h2 className="section-title">Active Alerts</h2>
              </div>
              <p className="section-subtitle mt-0.5">
                {filter === "all"
                  ? `${active.length} alert${active.length === 1 ? "" : "s"} currently generated from environmental data`
                  : `${filteredActive.length} ${filter} alert${filteredActive.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {refreshing && (
              <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                Re-evaluating…
              </span>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {filteredActive.length === 0 ? (
              <EmptyState
                title={active.length === 0 ? "Environment Stable" : `No ${filter} alerts`}
                description={
                  active.length === 0
                    ? "No active environmental alerts. All monitored metrics are within configured thresholds. Monitoring continues on simulated data."
                    : `There are currently no ${filter} alerts. Other alert levels remain active below.`
                }
                icon={<ShieldCheck className="w-10 h-10 text-success" />}
              />
            ) : (
              filteredActive.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onAcknowledge={acknowledge} onResolve={resolve} />
              ))
            )}
          </div>
        </motion.div>

        <div ref={historyRef} className="scroll-mt-20">
          <AlertHistory history={history} />
        </div>

        <AlertSettings settings={settings} onUpdate={updateSetting} onReset={resetSettings} />

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between px-1 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Data source: <span className="text-foreground font-medium">{ALERTS_DATA_SOURCE}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Last evaluated:{" "}
                <span className="text-foreground font-medium">{lastEvaluated ? formatTime(lastEvaluated) : "—"}</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Location: <span className="text-foreground font-medium">{location}</span>
            </span>
          </div>
          <p className="px-1 text-[11px] text-muted-foreground leading-relaxed">
            {isLive
              ? "Alerts are generated by SKYSENSE's rule engine from live ESP32 telemetry. Acknowledge and resolve actions are local to this session."
              : "Alerts are generated by SKYSENSE's rule engine from simulated environmental data for demonstration purposes. ESP32 hardware is not connected; no readings shown here originate from a live device. Acknowledge and resolve actions are local to this session."
            }
          </p>
        </div>

        <span aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
    </DashboardShell>
  );
}
