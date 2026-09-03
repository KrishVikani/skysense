"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronDown, Clock, Cpu, MapPin, RefreshCw, Wifi, Power, KeyRound, Activity } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@skysense/ui";
import { StationHero } from "@/components/devices/StationHero";
import { StationSensorGrid } from "@/components/devices/StationSensorGrid";
import { StationSensorHealth } from "@/components/devices/StationSensorHealth";
import { StationTelemetry } from "@/components/devices/StationTelemetry";
import { StationHardwareStatus } from "@/components/devices/StationHardwareStatus";
import { getDevicesSnapshot, DEVICES_POLL_INTERVAL_MS } from "@/lib/devices/service";
import { getEnvironmentalAnalytics } from "@/lib/environmental/service";
import { formatAge } from "@/lib/devices/quality";
import { withDisplayUnits } from "@/lib/settings/units";
import { useSettings } from "@/components/SettingsProvider";
import type { AnalyticsResult } from "@/lib/environmental/types";
import type { DeviceSnapshot } from "@/lib/devices/types";

function MyStationSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6 animate-in lg:space-y-8">
      <div className="h-7 w-48 skeleton-shimmer rounded-lg" />
      <div className="h-4 w-80 max-w-full skeleton-shimmer rounded mt-2" />
      <div className="h-80 rounded-[2rem] skeleton-shimmer" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="h-40 rounded-2xl skeleton-shimmer" />
      <div className="h-80 rounded-2xl skeleton-shimmer" />
    </div>
  );
}

function MyStationError({ onRetry }: { onRetry: () => void }) {
  return (
    <DashboardShell atmosphere="devices">
      <div className="max-w-lg mx-auto">
        <EmptyState
          title="My Station unavailable"
          description="We couldn't load your station data right now. Please try again."
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

export default function MyStationPageClient() {
  const [snapshot, setSnapshot] = useState<DeviceSnapshot | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const inFlightRef = useRef(false);
  const announceNextRef = useRef(false);
  const { settings } = useSettings();

  const pollIntervalMs = settings.devices.pollIntervalMs || DEVICES_POLL_INTERVAL_MS;

  const refresh = () => {
    announceNextRef.current = true;
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    inFlightRef.current = true;
    setError(false);
    setRefreshing(true);

    Promise.all([getDevicesSnapshot(), getEnvironmentalAnalytics("24h")])
      .then(([nextSnapshot, nextAnalytics]) => {
        if (cancelled) return;
        setSnapshot(withDisplayUnits(nextSnapshot, settings.units));
        setAnalytics(nextAnalytics);
        setHasLoaded(true);
        if (announceNextRef.current) {
          announceNextRef.current = false;
          setAnnouncement("Station data refreshed.");
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) {
          inFlightRef.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, settings.units]);

  // LIVE REFRESH: poll the snapshot at the user-configured interval (bounded in
  // Settings). Paused while the tab is hidden and skipped when a request is in
  // flight, so My Station never hammers the data layer.
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (inFlightRef.current) return;
      setReloadKey((k) => k + 1);
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  if (error && !hasLoaded) {
    return <MyStationError onRetry={refresh} />;
  }

  if (loading && !hasLoaded) {
    return (
      <DashboardShell atmosphere="devices">
        <MyStationSkeleton />
      </DashboardShell>
    );
  }

  if (!snapshot || !analytics || analytics.readings.length === 0) {
    return (
      <DashboardShell atmosphere="devices">
        <div className="max-w-lg mx-auto">
          <EmptyState
            title="No station data"
            description="No environmental station information is available."
          />
        </div>
      </DashboardShell>
    );
  }

  const reading = analytics.readings[analytics.readings.length - 1];
  const isLive = snapshot.mode === "live" && snapshot.connection === "online";

  return (
    <DashboardShell atmosphere="devices">
      <div className="space-y-6 lg:space-y-8">
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">My Station</h1>
            <p className="text-muted-foreground mt-1">
              Your personal environmental weather station
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-medium text-foreground">{snapshot.location}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 text-accent" />
              Updated <span className="font-medium text-foreground">{formatAge(snapshot.dataAgeMs)}</span>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="btn-secondary"
              aria-label={refreshing ? "Refreshing station data" : "Refresh station data"}
              aria-busy={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-card/60 p-4 lg:p-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          {!isLive && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-bg/40">
                  <Cpu className="h-5 w-5 text-accent" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Connect your SKYsense station</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    Pair an ESP32-based station for live readings from your own environment. Until then, My Station
                    keeps running in Simulation Mode so every screen stays useful.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSetupOpen((open) => !open)}
                  aria-expanded={setupOpen}
                  aria-controls="station-setup-guide"
                  className="btn-secondary shrink-0"
                >
                  {setupOpen ? "Hide guide" : "Connect device"}
                  <ChevronDown className={`h-4 w-4 transition-transform ${setupOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </div>

              {setupOpen && (
                <div id="station-setup-guide" className="mt-4 border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">What to expect when you connect your station</p>
                  <ol className="mt-3 space-y-3">
                    {[
                      { icon: Cpu, title: "Prepare the ESP32", detail: "Flash the SKYsense firmware to the board and give it power." },
                      { icon: Power, title: "Power & connect", detail: "The station boots and joins your Wi-Fi network." },
                      { icon: KeyRound, title: "Register the device", detail: "Link the station to your SKYsense account with its pairing code." },
                      { icon: Activity, title: "Verify live readings", detail: "Once registered, live sensor readings replace Simulation Mode automatically." },
                    ].map(({ icon: Icon, title, detail }, index) => (
                      <li key={title} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted/10 text-[11px] font-semibold text-muted-foreground" aria-hidden="true">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                            {title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    The detailed setup walkthrough ships with the ESP32 firmware. No hardware is paired to this account
                    yet — the station status below reflects Simulation Mode.
                  </p>
                </div>
              )}
            </>
          )}

          {isLive && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                <Activity className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">ESP32 Station Connected</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  Your station is online and reporting live telemetry. All readings are from your physical device.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-pulse" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live ESP32 Telemetry
              </span>
            </div>
          )}
        </motion.div>

        <StationHero snapshot={snapshot} reading={reading} />

        <StationSensorGrid snapshot={snapshot} reading={reading} summary={analytics.summary} />

        <StationSensorHealth snapshot={snapshot} />

        <StationTelemetry analytics={analytics} />

        <StationHardwareStatus snapshot={snapshot} />

        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          {isLive
            ? "Live ESP32 telemetry active — all readings are from your physical station."
            : "ESP32 hardware is not connected — My Station is running in Simulation Mode. Sensor values and telemetry are software placeholders from the deterministic data feed. When physical hardware is integrated, live readings replace them automatically."}
        </p>

        <span aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
    </DashboardShell>
  );
}