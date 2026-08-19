import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CloudRain,
  Droplets,
  Gauge,
  Info,
  Leaf,
  Sun,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { AlertMetric, AlertSeverity, AlertStatus } from "@/lib/alerts/types";

export const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: "var(--color-danger)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
};

/** Most-severe-first ordering used for sorting and visual prioritization. */
export const SEVERITY_ORDER: AlertSeverity[] = ["critical", "warning", "info"];

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

/** The subset of the summary the Alerts center uses to emphasize severity. */
export interface SeverityCounts {
  critical: number;
  warning: number;
  info: number;
}

/**
 * Highest severity present in the given counts (existing engine counts only —
 * nothing is re-derived here). Returns null when there are no active alerts.
 */
export function topSeverityOf(counts: SeverityCounts): AlertSeverity | null {
  if (counts.critical > 0) return "critical";
  if (counts.warning > 0) return "warning";
  if (counts.info > 0) return "info";
  return null;
}

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Informational",
};

export const SEVERITY_ICON: Record<AlertSeverity, LucideIcon> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

/**
 * Lifecycle (status) colors are deliberately separate from severity colors:
 * a card can be a low-severity "active" alert without implying danger, and a
 * critical alert's severity is always communicated by its severity chip and
 * accent bar — never doubled up by a red status chip.
 */
export const STATUS_COLOR: Record<AlertStatus, string> = {
  active: "var(--color-warning)",
  acknowledged: "var(--color-info)",
  resolved: "var(--color-success)",
};

export const STATUS_LABEL: Record<AlertStatus, string> = {
  active: "Active",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

export const METRIC_ICONS: Record<AlertMetric, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplets,
  windSpeed: Wind,
  uvIndex: Sun,
  airQuality: Leaf,
  pressure: Gauge,
  rainfall: CloudRain,
  stability: Activity,
};

export const METRIC_ACCENTS: Record<AlertMetric, string> = {
  temperature: "var(--color-sun)",
  humidity: "var(--color-sky)",
  windSpeed: "var(--color-accent)",
  uvIndex: "var(--color-warning)",
  airQuality: "var(--color-success)",
  pressure: "var(--color-info)",
  rainfall: "var(--color-info)",
  stability: "var(--color-info)",
};