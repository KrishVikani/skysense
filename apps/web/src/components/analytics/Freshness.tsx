"use client";

import { Database, Clock, MapPin, Activity, ShieldCheck } from "lucide-react";
import type { TimeRange } from "@/lib/environmental/types";

interface FreshnessProps {
  dataSource: string;
  location: string;
  lastUpdated: string;
  sampleCount: number;
  range: TimeRange;
  quality: string;
}

const EXPECTED_SAMPLES: Record<TimeRange, number> = {
  "24h": 24,
  "7d": 28,
  "30d": 30,
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function Freshness({ dataSource, location, lastUpdated, sampleCount, range, quality }: FreshnessProps) {
  const expected = EXPECTED_SAMPLES[range] ?? sampleCount;
  const coverage = Math.min(100, Math.round((sampleCount / Math.max(1, expected)) * 100));

  return (
    <div className="card-premium p-5 lg:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Database className="w-4 h-4 text-accent" aria-hidden="true" />
        <h2 className="section-title">Data Source &amp; Quality</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <p className="metric-label flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Data source
          </p>
          <p className="text-sm text-foreground font-medium">{dataSource}</p>
          <span className="badge badge-warning mt-1">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
            </span>
            Simulation Mode
          </span>
        </div>

        <div className="space-y-1.5">
          <p className="metric-label flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" aria-hidden="true" /> Data quality
          </p>
          <p className="text-sm text-foreground font-medium capitalize">{quality}</p>
          <p className="text-xs text-muted-foreground">No live hardware connected</p>
        </div>

        <div className="space-y-1.5">
          <p className="metric-label flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" aria-hidden="true" /> Sample count
          </p>
          <p className="text-sm text-foreground font-medium tabular-nums">
            {sampleCount} <span className="text-muted-foreground font-normal">readings · {range}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="metric-label">Coverage</p>
          <div className="h-2 rounded-full overflow-hidden bg-muted/10" aria-hidden="true">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${coverage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">{coverage}% of expected window</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mt-5 pt-4 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            Last updated: <span className="text-foreground font-medium">{relativeTime(lastUpdated)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            Location: <span className="text-foreground font-medium">{location}</span>
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          ESP32 hardware integration is planned but not yet connected.
        </span>
      </div>
    </div>
  );
}