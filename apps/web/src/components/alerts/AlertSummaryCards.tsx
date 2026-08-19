"use client";

import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Radar, type LucideIcon } from "lucide-react";
import type { AlertSeverity, AlertSummary } from "@/lib/alerts/types";
import { SEVERITY_COLOR, SEVERITY_LABEL, topSeverityOf } from "./severity";

export type AlertFilter = "all" | AlertSeverity | "resolved";

interface AlertSummaryCardsProps {
  summary: AlertSummary;
  /** Number of alerts currently rendered in the Active Alerts list. */
  activeTotal: number;
  selected: AlertFilter;
  onSelect: (_filter: AlertFilter) => void;
}

interface StatCardDef {
  key: AlertFilter;
  label: string;
  count: number;
  icon: LucideIcon;
  color: string;
  subtitle: string;
  priority: boolean;
}

export function AlertSummaryCards({ summary, activeTotal, selected, onSelect }: AlertSummaryCardsProps) {
  const topSeverity = topSeverityOf(summary);
  const topColor = topSeverity ? SEVERITY_COLOR[topSeverity] : "var(--color-success)";

  const cards: StatCardDef[] = [
    {
      key: "critical",
      label: "Critical",
      count: summary.critical,
      icon: AlertCircle,
      color: "var(--color-danger)",
      subtitle: summary.critical > 0 ? "active critical alerts" : "no critical alerts",
      priority: topSeverity === "critical",
    },
    {
      key: "warning",
      label: "Warning",
      count: summary.warning,
      icon: AlertTriangle,
      color: "var(--color-warning)",
      subtitle: summary.warning > 0 ? "active warnings" : "no warnings",
      priority: topSeverity === "warning",
    },
    {
      key: "info",
      label: "Informational",
      count: summary.info,
      icon: Info,
      color: "var(--color-info)",
      subtitle: summary.info > 0 ? "active notifications" : "no notifications",
      priority: topSeverity === "info",
    },
    {
      key: "resolved",
      label: "Resolved",
      count: summary.resolved,
      icon: CheckCircle2,
      color: "var(--color-success)",
      subtitle: summary.resolved > 0 ? "previously resolved" : "nothing resolved yet",
      priority: false,
    },
  ];

  return (
    <motion.section
      className="card-premium p-5 lg:p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      aria-label="Active alert summary"
    >
      <div className="flex items-center gap-2">
        <Radar className="w-5 h-5 text-accent" aria-hidden="true" />
        <h2 className="section-title">Current Alert State</h2>
      </div>
      <p className="section-subtitle mt-0.5">Total active alerts and the severity mix across monitored metrics</p>

      <div className="mt-5 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <motion.button
          type="button"
          onClick={() => onSelect("all")}
          className="card-premium p-5 flex flex-col gap-3 text-left rounded-2xl col-span-2 lg:col-span-1 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            boxShadow:
              selected === "all"
                ? `0 0 0 1.5px ${topColor}, inset 0 0 0 1px ${topColor}`
                : undefined,
            borderColor: selected === "all" ? topColor : undefined,
            backgroundColor: `color-mix(in srgb, ${topColor} 6%, transparent)`,
          }}
          aria-pressed={selected === "all"}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="metric-label">Active alerts</p>
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `color-mix(in srgb, ${topColor} 15%, transparent)` }}
            >
              <Radar className="w-5 h-5" style={{ color: topColor }} aria-hidden="true" />
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="metric-value" style={{ color: topColor }}>
              {activeTotal}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {topSeverity ? `Most severe: ${SEVERITY_LABEL[topSeverity]}` : "No active alerts"}
          </p>
        </motion.button>

        {cards.map((card, index) => {
          const Icon = card.icon;
          const isSelected = selected === card.key;
          const isResolved = card.key === "resolved";
          return (
            <motion.button
              key={card.key}
              type="button"
              onClick={() => onSelect(card.key)}
              className="card-premium p-5 flex flex-col gap-3 text-left rounded-2xl col-span-2 lg:col-span-1 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 + index * 0.05 }}
              style={{
                boxShadow: isSelected
                  ? `0 0 0 1.5px ${card.color}`
                  : card.priority
                    ? `0 0 0 1px ${card.color}`
                    : undefined,
                borderColor: isSelected || card.priority ? card.color : undefined,
                backgroundColor: card.priority
                  ? `color-mix(in srgb, ${card.color} 6%, transparent)`
                  : undefined,
              }}
              aria-pressed={isResolved ? undefined : isSelected}
              aria-label={isResolved ? `View resolved alert history (${card.count} resolved)` : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="metric-label">{card.label}</p>
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${card.color} 15%, transparent)` }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.color }} aria-hidden="true" />
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="metric-value" style={{ color: card.count > 0 ? card.color : undefined }}>
                  {card.count}
                </span>
                {card.priority && (
                  <span
                    className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: `color-mix(in srgb, ${card.color} 15%, transparent)`, color: card.color }}
                  >
                    Top
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
