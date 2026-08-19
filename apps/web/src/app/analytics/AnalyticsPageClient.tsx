"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, BarChart3, AlertTriangle, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@skysense/ui";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { SummaryCards } from "@/components/analytics/SummaryCards";
import { MetricExplorer } from "@/components/analytics/MetricExplorer";
import { WindAnalytics } from "@/components/analytics/WindAnalytics";
import { UvAirQuality } from "@/components/analytics/UvAirQuality";
import { ScoreSection } from "@/components/analytics/ScoreSection";
import { InsightsSection } from "@/components/analytics/InsightsSection";
import { Freshness } from "@/components/analytics/Freshness";
import { getEnvironmentalAnalytics } from "@/lib/environmental/service";
import type { AnalyticsResult, MetricKey, TimeRange } from "@/lib/environmental/types";

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-in">
      <div className="card-premium p-6">
        <div className="h-7 w-64 skeleton-shimmer rounded-lg" />
        <div className="h-4 w-96 max-w-full skeleton-shimmer rounded mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-premium p-5 h-36 skeleton-shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-premium p-6 h-80 skeleton-shimmer" />
        <div className="card-premium p-6 h-80 skeleton-shimmer" />
      </div>
    </div>
  );
}

function AnalyticsError({ onRetry }: { onRetry: () => void }) {
  return (
    <DashboardShell atmosphere="analytics">
      <div className="max-w-lg mx-auto">
        <EmptyState
          title="Analytics unavailable"
          description="We couldn't load the environmental analytics right now. Please try again."
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

export default function AnalyticsPageClient() {
  const [range, setRange] = useState<TimeRange>("24h");
  const [activeMetric, setActiveMetric] = useState<MetricKey>("temperature");
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getEnvironmentalAnalytics(range)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, reloadKey]);

  if (error && !result) {
    return <AnalyticsError onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  if (loading || !result) {
    return (
      <DashboardShell atmosphere="analytics">
        <AnalyticsSkeleton />
      </DashboardShell>
    );
  }

  if (result.readings.length === 0) {
    return (
      <DashboardShell atmosphere="analytics">
        <EmptyState
          title="No Environmental Data"
          description="No sensor readings are available for the selected time range."
          icon={<BarChart3 className="w-10 h-10 text-muted" />}
        />
      </DashboardShell>
    );
  }

  const quality = result.readings[0]?.dataQuality ?? "simulated";

  return (
    <DashboardShell atmosphere="analytics">
      <div className="space-y-6">
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Environmental Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Historical trends, patterns and environmental conditions over time
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="badge badge-warning">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
                </span>
                Simulation Mode
              </span>
              <span className="text-xs text-muted-foreground">Simulated environmental data · ESP32 not connected</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-medium text-foreground">{result.location}</span>
            </div>
            <TimeRangeSelector value={range} onChange={setRange} />
          </div>
        </motion.div>

        <SummaryCards summary={result.summary} activeMetric={activeMetric} />

        <MetricExplorer
          result={result}
          activeMetric={activeMetric}
          onMetricChange={setActiveMetric}
        />

        <WindAnalytics data={result.readings} range={range} wind={result.wind} />

        <UvAirQuality
          uv={result.summary.uvIndex}
          aqi={result.summary.airQuality}
          uvRisk={result.uvRisk}
          aqiCategory={result.aqiCategory}
        />

        <ScoreSection score={result.score} />

        <InsightsSection insights={result.insights} />

        <Freshness
          dataSource={result.dataSource}
          location={result.location}
          lastUpdated={result.lastUpdated}
          sampleCount={result.readings.length}
          range={range}
          quality={quality}
        />
      </div>
    </DashboardShell>
  );
}