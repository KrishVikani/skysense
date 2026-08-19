"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Lightbulb,
  MapPin,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { EnvironmentalAlert } from "@/lib/alerts/types";
import { SEVERITY_COLOR, SEVERITY_ICON, SEVERITY_LABEL, STATUS_COLOR, STATUS_LABEL } from "./severity";
import { formatDateTime, timeAgo } from "./format";

interface AlertCardProps {
  alert: EnvironmentalAlert;
  onAcknowledge: (_id: string) => void;
  onResolve: (_id: string) => void;
}

function StatusChip({ status }: { status: EnvironmentalAlert["status"] }) {
  const color = STATUS_COLOR[status];
  return (
    <motion.span
      key={status}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {status === "active" && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />}
      {status === "acknowledged" && <CheckCheck className="w-3 h-3" aria-hidden="true" />}
      {status === "resolved" && <CheckCircle2 className="w-3 h-3" aria-hidden="true" />}
      {STATUS_LABEL[status]}
    </motion.span>
  );
}

function SeverityChip({ severity }: { severity: EnvironmentalAlert["severity"] }) {
  const color = SEVERITY_COLOR[severity];
  const Icon = SEVERITY_ICON[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

function DetailTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-1" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function DetailsSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">{icon}{title}</h4>
      <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

export function AlertCard({ alert, onAcknowledge, onResolve }: AlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const severityColor = SEVERITY_COLOR[alert.severity];
  const SeverityIcon = SEVERITY_ICON[alert.severity];
  const isPriority = alert.severity === "critical" || alert.severity === "warning";
  const acknowledged = alert.status === "acknowledged";

  return (
    <motion.div
      className="card-elevated relative overflow-hidden"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        borderColor: isPriority
          ? `color-mix(in srgb, ${severityColor} 35%, transparent)`
          : undefined,
        backgroundColor: acknowledged
          ? undefined
          : isPriority
            ? `color-mix(in srgb, ${severityColor} 5%, transparent)`
            : undefined,
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: severityColor }}
        aria-hidden="true"
      />

      <div className={`pl-4 ${isPriority ? "p-5" : "p-4"} flex flex-col gap-3`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="p-2 rounded-xl flex-shrink-0"
              style={{ backgroundColor: `color-mix(in srgb, ${severityColor} 15%, transparent)`, color: severityColor }}
              aria-hidden="true"
            >
              <SeverityIcon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground leading-tight">{alert.title}</p>
                {isPriority && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: `color-mix(in srgb, ${severityColor} 16%, transparent)`, color: severityColor }}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    Priority
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{alert.location}</span>
                <span className="text-muted" aria-hidden="true">·</span>
                <span className="whitespace-nowrap">{timeAgo(alert.detectedAt)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip status={alert.status} />
            <SeverityChip severity={alert.severity} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <DetailTile label="Environmental metric" value={alert.metricLabel} />
          <DetailTile label="Current value" value={alert.currentLabel} color={severityColor} />
          <DetailTile label="Threshold" value={alert.thresholdLabel} />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Description
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{alert.explanation}</p>
        </div>

        <div className="flex gap-2 items-start text-sm">
          <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-muted-foreground leading-relaxed">{alert.recommendation}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 flex-wrap">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="btn-ghost text-sm"
            aria-expanded={expanded}
            aria-controls={expanded ? `alert-details-${alert.id}` : undefined}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Hide details" : "View details"}
          </button>
          <div className="flex items-center gap-2">
            {alert.status === "active" ? (
              <button type="button" onClick={() => onAcknowledge(alert.id)} className="btn-secondary text-sm">
                <CheckCheck className="w-4 h-4" />
                Acknowledge
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  backgroundColor: `color-mix(in srgb, ${STATUS_COLOR.acknowledged} 15%, transparent)`,
                  color: STATUS_COLOR.acknowledged,
                }}
              >
                <CheckCheck className="w-4 h-4" />
                Acknowledged
              </span>
            )}
            <button type="button" onClick={() => onResolve(alert.id)} className="btn-secondary text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Resolve
            </button>
          </div>
        </div>

        {expanded && (
          <div id={`alert-details-${alert.id}`}>
            <AlertDetails alert={alert} severityColor={severityColor} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AlertDetails({ alert, severityColor }: { alert: EnvironmentalAlert; severityColor: string }) {
  const DirectionIcon = alert.direction === "above" ? ArrowUp : ArrowDown;
  return (
    <motion.div
      className="mt-1 p-4 rounded-xl bg-muted/5 space-y-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <DetailsSection icon={<ScanSearch className="w-4 h-4 text-accent" />} title="What happened">
        <p>{alert.explanation}</p>
      </DetailsSection>

      <DetailsSection icon={<ShieldCheck className="w-4 h-4 text-accent" />} title="Why it triggered">
        <p>{alert.reason}</p>
        {alert.trendNote && <p className="mt-1">Trend context: {alert.trendNote}</p>}
      </DetailsSection>

      <DetailsSection icon={<ScanSearch className="w-4 h-4 text-accent" />} title="Current value / condition">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
          <DetailTile label="Metric" value={alert.metricLabel} />
          <DetailTile label="Current measurement" value={alert.currentLabel} color={severityColor} />
          <DetailTile label="Threshold" value={alert.thresholdLabel} />
          <DetailTile
            label="Direction"
            value={alert.direction === "above" ? "Above threshold" : "Below threshold"}
          />
          <DetailTile
            label="Unit"
            value={alert.unit || "—"}
          />
          <DetailTile label="Severity" value={SEVERITY_LABEL[alert.severity]} color={severityColor} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <DirectionIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Reading crossed the configured threshold in the {alert.direction === "above" ? "upward" : "downward"} direction.
        </p>
      </DetailsSection>

      <DetailsSection icon={<Lightbulb className="w-4 h-4 text-accent" />} title="Recommended action">
        <p>{alert.recommendation}</p>
      </DetailsSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <DetailTile
          label="Detected at"
          value={`${formatDateTime(alert.detectedAt)} (${timeAgo(alert.detectedAt)})`}
        />
        <DetailTile
          label="Data source"
          value={alert.dataSource}
        />
      </div>

      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          Status: {STATUS_LABEL[alert.status]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" aria-hidden="true" />
          Rule ID: {alert.ruleId}
        </span>
      </div>
    </motion.div>
  );
}
