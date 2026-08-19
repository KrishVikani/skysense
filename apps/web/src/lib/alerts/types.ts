import type { MetricKey } from "@/lib/environmental/types";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertDirection = "above" | "below";

/**
 * Alertable environmental metrics. `stability` is derived from the AI risk
 * assessment (weather stability score 0–100) rather than a raw sensor field.
 */
export type AlertMetric = MetricKey | "stability";

/** A single configurable alert rule (threshold, severity, message). */
export interface AlertRule {
  id: string;
  metric: AlertMetric;
  name: string;
  threshold: number;
  unit: string;
  direction: AlertDirection;
  severity: AlertSeverity;
  message: string;
  recommendation: string;
  enabled: boolean;
}

/**
 * A fully evaluated alert emitted by the alert engine. The UI consumes this
 * shape directly; the engine never depends on React.
 */
export interface EnvironmentalAlert {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  metric: AlertMetric;
  metricLabel: string;
  unit: string;
  currentValue: number;
  currentLabel: string;
  threshold: number;
  thresholdLabel: string;
  direction: AlertDirection;
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  location: string;
  explanation: string;
  reason: string;
  recommendation: string;
  dataSource: string;
  trendNote?: string;
}

/** Aggregated counts shown by the summary cards. */
export interface AlertSummary {
  critical: number;
  warning: number;
  info: number;
  resolved: number;
  active: number;
  acknowledged: number;
  total: number;
}

/**
 * A single user preference for one alertable metric. Settings are client-side
 * for now; the structure is shaped so a backend can persist them later.
 */
export interface AlertThresholdSetting {
  metric: "temperature" | "humidity" | "windSpeed" | "uvIndex" | "airQuality";
  label: string;
  unit: string;
  enabled: boolean;
  threshold: number;
  severity: AlertSeverity;
}

export type AlertSettings = Record<
  "temperature" | "humidity" | "windSpeed" | "uvIndex" | "airQuality",
  AlertThresholdSetting
>;

/**
 * Rich, user-configurable threshold preference for one metric. Unlike
 * {@link AlertSettings} (one custom rule per metric), this lets a user tune the
 * warning AND critical threshold independently while `null` means "keep the
 * engine default rule verbatim". Severity semantics are unchanged: a critical
 * threshold can never outrank a warning rule of lower severity at runtime.
 */
export interface AlertThresholdPreference {
  enabled: boolean;
  /** °C / % / km/h / UV index / AQI. `null` keeps the default warning rule. */
  warningThreshold: number | null;
  /** °C / % / km/h / UV index / AQI. `null` keeps the default critical rule. */
  criticalThreshold: number | null;
}

export type AlertThresholdPreferences = Record<
  "temperature" | "humidity" | "windSpeed" | "uvIndex" | "airQuality",
  AlertThresholdPreference
>;

/** Everything the Alerts UI (and the notification bell) needs in one call. */
export interface AlertsSnapshot {
  active: EnvironmentalAlert[];
  history: EnvironmentalAlert[];
  summary: AlertSummary;
  settings: AlertSettings;
  lastEvaluated: string;
  location: string;
  dataSource: string;
}