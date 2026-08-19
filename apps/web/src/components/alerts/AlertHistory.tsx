"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, History as HistoryIcon, Inbox, Search, X } from "lucide-react";
import type { AlertStatus, EnvironmentalAlert } from "@/lib/alerts/types";
import {
  METRIC_ICONS,
  SEVERITY_COLOR,
  SEVERITY_ICON,
  SEVERITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from "./severity";
import { formatDateTime } from "./format";

interface AlertHistoryProps {
  history: EnvironmentalAlert[];
}

type StatusFilter = "all" | AlertStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "resolved", label: "Resolved" },
];

const GRID_COLS = "md:grid-cols-[minmax(0,1.4fr)_0.8fr_0.9fr_1fr_1fr_0.9fr]";

export function AlertHistory({ history }: AlertHistoryProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((h) => {
      if (statusFilter !== "all" && h.status !== statusFilter) return false;
      if (!q) return true;
      return (
        h.title.toLowerCase().includes(q) ||
        h.metricLabel.toLowerCase().includes(q) ||
        h.currentLabel.toLowerCase().includes(q) ||
        h.location.toLowerCase().includes(q)
      );
    });
  }, [history, query, statusFilter]);

  return (
    <motion.div
      className="card-premium p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-accent" />
            <h2 className="section-title">Alert History</h2>
          </div>
          <p className="section-subtitle mt-0.5">
            {history.length > 0
              ? `${history.length} previous alert${history.length === 1 ? "" : "s"} from simulated data`
              : "Previously resolved and acknowledged alerts from simulated data"}
          </p>
        </div>
        {history.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search history"
                aria-label="Search alert history"
                className="w-full sm:w-56 bg-muted/5 border border-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg bg-muted/5 border border-border p-0.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                    statusFilter === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={statusFilter === f.key}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center text-center py-10">
          <Inbox className="w-10 h-10 text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">No historical alerts yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center text-center py-10">
          <Search className="w-10 h-10 text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">No alerts match the current filter.</p>
        </div>
      ) : (
        <div className="mt-5">
          <div className={`hidden md:grid ${GRID_COLS} gap-3 px-4 pb-2 text-[11px] uppercase tracking-wide text-muted-foreground`}>
            <span>Alert</span>
            <span>Severity</span>
            <span>Metric</span>
            <span>Detected</span>
            <span>Resolved</span>
            <span>Status</span>
          </div>
          <div className="space-y-2">
            {filtered.map((h, index) => {
              const severityColor = SEVERITY_COLOR[h.severity];
              const statusColor = STATUS_COLOR[h.status];
              const MetricIcon = METRIC_ICONS[h.metric];
              const SeverityIcon = SEVERITY_ICON[h.severity];
              return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.2) }}
                >
                  <div className="md:hidden p-4 rounded-xl bg-muted/5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{h.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <MetricIcon className="w-3 h-3" aria-hidden="true" />
                          {h.metricLabel}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
                        style={{ backgroundColor: `color-mix(in srgb, ${statusColor} 15%, transparent)`, color: statusColor }}
                      >
                        {h.status === "resolved" && <CheckCircle2 className="w-3 h-3" />}
                        {STATUS_LABEL[h.status]}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${severityColor} 15%, transparent)`,
                          color: severityColor,
                        }}
                      >
                        <SeverityIcon className="w-3 h-3" />
                        {SEVERITY_LABEL[h.severity]}
                      </span>
                      <span>{formatDateTime(h.detectedAt)}</span>
                    </div>
                  </div>

                  <div className={`hidden md:grid ${GRID_COLS} gap-3 items-center px-4 py-3 rounded-xl bg-muted/5`}>
                    <span className="text-sm font-medium text-foreground truncate">{h.title}</span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium w-fit"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${severityColor} 15%, transparent)`,
                        color: severityColor,
                      }}
                    >
                      <SeverityIcon className="w-3 h-3" />
                      {SEVERITY_LABEL[h.severity]}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <MetricIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      {h.metricLabel}
                    </span>
                    <span className="text-sm text-muted-foreground">{formatDateTime(h.detectedAt)}</span>
                    <span className="text-sm text-muted-foreground">
                      {h.resolvedAt ? formatDateTime(h.resolvedAt) : "—"}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit"
                      style={{ backgroundColor: `color-mix(in srgb, ${statusColor} 15%, transparent)`, color: statusColor }}
                    >
                      {h.status === "resolved" && <CheckCircle2 className="w-3 h-3" />}
                      {STATUS_LABEL[h.status]}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
