import type {
  ForecastConfidenceLevel,
  ForecastDataQuality,
  ForecastDirection,
  ForecastSeverity,
} from "@/lib/forecast/types";

export const DATA_QUALITY_COLOR: Record<ForecastDataQuality, string> = {
  good: "var(--color-success)",
  limited: "var(--color-warning)",
  stale: "var(--color-danger)",
  insufficient: "var(--color-muted)",
  no_data: "var(--color-muted)",
  invalid: "var(--color-danger)",
};

export const SEVERITY_COLOR: Record<ForecastSeverity, string> = {
  low: "var(--color-success)",
  moderate: "var(--color-warning)",
  high: "var(--color-danger)",
  critical: "var(--color-danger)",
};

export const CONFIDENCE_COLOR: Record<ForecastConfidenceLevel, string> = {
  High: "var(--color-success)",
  Medium: "var(--color-warning)",
  Low: "var(--color-danger)",
  None: "var(--color-muted)",
};

export const DIRECTION_COLOR: Record<ForecastDirection, string> = {
  up: "var(--color-accent)",
  down: "var(--color-info)",
  stable: "var(--color-muted)",
  unknown: "var(--color-muted)",
};