import { getEnvironmentalAnalytics } from "@/lib/environmental/service";
import type { AnalyticsResult } from "@/lib/environmental/types";
import { generateEnvironmentalIntelligence } from "@/lib/intelligence/service";
import type { AIAnalysis } from "@/lib/intelligence/types";
import {
  DEFAULT_RULES,
  METRIC_LABELS,
  METRIC_SETTING_KEYS,
  buildRules,
  buildRulesFromPreferences,
  createDefaultSettings,
  type MetricSettingKey,
} from "./rules";
import type {
  AlertMetric,
  AlertRule,
  AlertSettings,
  AlertSummary,
  AlertThresholdPreferences,
  AlertsSnapshot,
  EnvironmentalAlert,
} from "./types";

/**
 * The alert engine consumes normalized EnvironmentalData (an AnalyticsResult)
 * and AI-generated risk/trend analysis, and produces EnvironmentalAlert[].
 * It has zero React dependencies so the same pipeline works unchanged when the
 * simulated data source is replaced by real ESP32 sensor values.
 */
export const ALERTS_DATA_SOURCE = "Simulated environmental data";

const SEVERITY_RANK: Record<EnvironmentalAlert["severity"], number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

const INSIGHT_ID_BY_METRIC: Record<MetricSettingKey, string> = {
  temperature: "temperature",
  humidity: "humidity",
  windSpeed: "wind",
  uvIndex: "uv",
  airQuality: "air",
};

function digitsFor(metric: AlertMetric): number {
  return metric === "temperature" || metric === "windSpeed" ? 1 : 0;
}

function formatLabel(value: number, unit: string, metric: AlertMetric): string {
  return `${value.toFixed(digitsFor(metric))}${unit}`;
}

function thresholdMet(rule: AlertRule, value: number): boolean {
  return rule.direction === "above" ? value >= rule.threshold : value <= rule.threshold;
}

function ruleById(id: string): AlertRule | undefined {
  return DEFAULT_RULES.find((r) => r.id === id);
}

/**
 * Core evaluation: applies the effective rules (defaults or user settings) to
 * the current readings and AI analysis, emitting one alert per metric
 * (most-severe rule wins) plus stability and rapid-change alerts.
 */
export function evaluateAlertRules(
  analytics: AnalyticsResult,
  aiAnalysis: AIAnalysis,
  settings?: AlertSettings
): EnvironmentalAlert[] {
  return evaluateWithRules(analytics, aiAnalysis, buildRules(settings ?? createDefaultSettings()));
}

/**
 * Same evaluation using rich {@link AlertThresholdPreferences} (independent
 * warning + critical thresholds per metric). Severity ranking, threshold
 * comparison and alert construction are identical to {@link evaluateAlertRules}
 * — only the rule-building step differs.
 */
export function evaluateAlertRulesWithPreferences(
  analytics: AnalyticsResult,
  aiAnalysis: AIAnalysis,
  preferences: AlertThresholdPreferences
): EnvironmentalAlert[] {
  return evaluateWithRules(analytics, aiAnalysis, buildRulesFromPreferences(preferences));
}

function evaluateWithRules(
  analytics: AnalyticsResult,
  aiAnalysis: AIAnalysis,
  rules: AlertRule[]
): EnvironmentalAlert[] {
  const alerts: EnvironmentalAlert[] = [];
  const location = analytics.location;
  const lastReading = analytics.readings[analytics.readings.length - 1];
  const detectedAt = lastReading ? lastReading.timestamp : new Date().toISOString();

  const stabilityScore = aiAnalysis.risks.find((r) => r.id === "stability")?.score ?? 0;
  const trendByMetric = new Map(aiAnalysis.trends.map((t) => [t.id, t]));
  const fluctuatingTrends = aiAnalysis.trends.filter((t) => t.classification === "Fluctuating");

  // Value-based metric rules (temperature, humidity, wind, UV, air quality).
  for (const metric of METRIC_SETTING_KEYS) {
    const metricRules = rules.filter((r) => r.metric === metric && r.enabled);
    if (metricRules.length === 0) continue;
    const value = analytics.summary[metric].current;
    const triggered = metricRules
      .filter((r) => thresholdMet(r, value))
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
    const best = triggered[0];
    if (!best) continue;
    alerts.push(
      buildMetricAlert(best, value, detectedAt, location, aiAnalysis, trendByMetric)
    );
  }

  // Stability rules driven by the AI weather-stability risk score.
  const stabilityRules = rules
    .filter((r) => r.metric === "stability" && r.id.startsWith("instability") && r.enabled)
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const stabilityTriggered = stabilityRules.find((r) => thresholdMet(r, stabilityScore));
  if (stabilityTriggered) {
    alerts.push(
      buildStabilityAlert(stabilityTriggered, stabilityScore, detectedAt, location)
    );
  }

  // Rapid-change rule driven by AI trend classification.
  const rapidRule = rules.find((r) => r.id === "rapid_change" && r.enabled);
  if (rapidRule && fluctuatingTrends.length >= rapidRule.threshold) {
    alerts.push(buildRapidChangeAlert(rapidRule, fluctuatingTrends, detectedAt, location));
  }

  return alerts.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

function buildMetricAlert(
  rule: AlertRule,
  value: number,
  detectedAt: string,
  location: string,
  aiAnalysis: AIAnalysis,
  trendByMetric: Map<string, AIAnalysis["trends"][number]>
): EnvironmentalAlert {
  const trend = trendByMetric.get(rule.metric);
  const insight = aiAnalysis.insights.find(
    (i) => i.id === INSIGHT_ID_BY_METRIC[rule.metric as MetricSettingKey]
  );
  const currentLabel = formatLabel(value, rule.unit, rule.metric);
  const thresholdLabel = formatLabel(rule.threshold, rule.unit, rule.metric);

  return {
    id: `alert_${rule.id}_${detectedAt}`,
    ruleId: rule.id,
    severity: rule.severity,
    status: "active",
    title: rule.name,
    metric: rule.metric,
    metricLabel: METRIC_LABELS[rule.metric],
    unit: rule.unit,
    currentValue: value,
    currentLabel,
    threshold: rule.threshold,
    thresholdLabel,
    direction: rule.direction,
    detectedAt,
    location,
    explanation:
      `${METRIC_LABELS[rule.metric]} is currently ${currentLabel}, above the ` +
      `${rule.severity} threshold of ${thresholdLabel}. ${rule.message}` +
      (insight ? ` ${insight.interpretation}` : ""),
    reason: `Rule "${rule.name}" fired because the current ${METRIC_LABELS[rule.metric]} ` +
      `reading of ${currentLabel} reached the configured threshold of ${thresholdLabel}.`,
    recommendation: rule.recommendation,
    dataSource: ALERTS_DATA_SOURCE,
    trendNote: trend
      ? `${METRIC_LABELS[rule.metric]} has been ${trend.classification.toLowerCase()} (${trend.deltaLabel}) across the analysis window.`
      : undefined,
  };
}

function buildStabilityAlert(
  rule: AlertRule,
  stabilityScore: number,
  detectedAt: string,
  location: string
): EnvironmentalAlert {
  return {
    id: `alert_${rule.id}_${detectedAt}`,
    ruleId: rule.id,
    severity: rule.severity,
    status: "active",
    title: rule.name,
    metric: "stability",
    metricLabel: METRIC_LABELS.stability,
    unit: rule.unit,
    currentValue: stabilityScore,
    currentLabel: stabilityScore.toFixed(0),
    threshold: rule.threshold,
    thresholdLabel: rule.threshold.toFixed(0),
    direction: rule.direction,
    detectedAt,
    location,
    explanation: `The AI weather-stability risk score is ${stabilityScore.toFixed(0)}, above the threshold of ${rule.threshold.toFixed(0)}. ${rule.message}`,
    reason: `Rule "${rule.name}" fired because the AI-derived weather-stability risk ` +
      `score of ${stabilityScore.toFixed(0)} reached the threshold of ${rule.threshold.toFixed(0)}.`,
    recommendation: rule.recommendation,
    dataSource: ALERTS_DATA_SOURCE,
  };
}

function buildRapidChangeAlert(
  rule: AlertRule,
  fluctuatingTrends: AIAnalysis["trends"],
  detectedAt: string,
  location: string
): EnvironmentalAlert {
  const names = fluctuatingTrends.map((t) => t.label.toLowerCase()).join(", ");
  return {
    id: `alert_${rule.id}_${detectedAt}`,
    ruleId: rule.id,
    severity: rule.severity,
    status: "active",
    title: rule.name,
    metric: "stability",
    metricLabel: METRIC_LABELS.stability,
    unit: rule.unit,
    currentValue: fluctuatingTrends.length,
    currentLabel: String(fluctuatingTrends.length),
    threshold: rule.threshold,
    thresholdLabel: String(rule.threshold),
    direction: rule.direction,
    detectedAt,
    location,
    explanation: `${names} are fluctuating noticeably. ${rule.message}`,
    reason: `Rule "${rule.name}" fired because AI trend analysis detected ` +
      `${fluctuatingTrends.length} fluctuating metric(s): ${names}.`,
    recommendation: rule.recommendation,
    dataSource: ALERTS_DATA_SOURCE,
  };
}

// ---------------------------------------------------------------------------
// Deterministic mock history.
//
// FUTURE HARDWARE:
// These records currently represent simulated previous alerts. Once the
// backend persists alert state, history will be fetched from that store; the
// EnvironmentalAlert shape (and the resolved/acknowledged status model) is
// designed to map 1:1 onto it.
// ---------------------------------------------------------------------------

interface HistoryTemplate {
  ruleId: string;
  detectedHoursAgo: number;
  resolvedHoursAgo?: number;
  currentValue: number;
}

const HISTORY_TEMPLATES: HistoryTemplate[] = [
  { ruleId: "temperature_critical", detectedHoursAgo: 216, resolvedHoursAgo: 204, currentValue: 37.2 },
  { ruleId: "uv_warning", detectedHoursAgo: 145, resolvedHoursAgo: 135, currentValue: 6.4 },
  { ruleId: "humidity_warning", detectedHoursAgo: 123, resolvedHoursAgo: 116, currentValue: 71.5 },
  { ruleId: "instability_warning", detectedHoursAgo: 192, resolvedHoursAgo: 178, currentValue: 51 },
  { ruleId: "airquality_warning", detectedHoursAgo: 78, resolvedHoursAgo: 66, currentValue: 96 },
  { ruleId: "wind_warning", detectedHoursAgo: 288, resolvedHoursAgo: 268, currentValue: 24.5 },
  { ruleId: "airquality_warning", detectedHoursAgo: 53, resolvedHoursAgo: undefined, currentValue: 86 },
];

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

export function generateMockHistory(location: string): EnvironmentalAlert[] {
  return HISTORY_TEMPLATES.map((t, index) => {
    const rule = ruleById(t.ruleId);
    const detectedAt = hoursAgoIso(t.detectedHoursAgo);
    const resolvedAt = t.resolvedHoursAgo !== undefined ? hoursAgoIso(t.resolvedHoursAgo) : undefined;
    const severity = rule?.severity ?? "warning";

    return {
      id: `history_${t.ruleId}_${index}`,
      ruleId: t.ruleId,
      severity,
      status: resolvedAt ? "resolved" : "acknowledged",
      title: rule?.name ?? "Environmental Alert",
      metric: (rule?.metric ?? "airQuality") as AlertMetric,
      metricLabel: METRIC_LABELS[rule?.metric ?? "airQuality"],
      unit: rule?.unit ?? "",
      currentValue: t.currentValue,
      currentLabel: formatLabel(t.currentValue, rule?.unit ?? "", (rule?.metric ?? "airQuality") as AlertMetric),
      threshold: rule?.threshold ?? 0,
      thresholdLabel: formatLabel(rule?.threshold ?? 0, rule?.unit ?? "", (rule?.metric ?? "airQuality") as AlertMetric),
      direction: rule?.direction ?? "above",
      detectedAt,
      resolvedAt,
      location,
      explanation:
        rule?.message ??
        `Previous alert detected while ${METRIC_LABELS[rule?.metric ?? "airQuality"].toLowerCase()} was elevated.`,
      reason:
        rule?.message ??
        `The alert was generated by rule "${rule?.name ?? "environmental monitoring"}".`,
      recommendation: rule?.recommendation ?? "Review conditions when planning outdoor activity.",
      dataSource: ALERTS_DATA_SOURCE,
    };
  });
}

// ---------------------------------------------------------------------------
// Aggregation and public API.
// ---------------------------------------------------------------------------

export function computeAlertSummary(
  active: EnvironmentalAlert[],
  history: EnvironmentalAlert[]
): AlertSummary {
  return {
    critical: active.filter((a) => a.severity === "critical").length,
    warning: active.filter((a) => a.severity === "warning").length,
    info: active.filter((a) => a.severity === "info").length,
    resolved: history.filter((a) => a.status === "resolved").length,
    active: active.filter((a) => a.status === "active").length,
    acknowledged: [...active, ...history].filter((a) => a.status === "acknowledged").length,
    total: active.length + history.length,
  };
}

/**
 * Reusable entry point that derives alerts from the current (simulated)
 * environmental data. The Alerts UI and the notification bell both call this;
 * when ESP32 data replaces the mock source, only the data layer below changes.
 */
export async function getAlertsSnapshot(settings?: AlertSettings): Promise<AlertsSnapshot> {
  const analytics = await getEnvironmentalAnalytics("7d");
  const aiAnalysis = generateEnvironmentalIntelligence(analytics);
  const active = evaluateAlertRules(analytics, aiAnalysis, settings);
  const history = generateMockHistory(analytics.location);
  const summary = computeAlertSummary(active, history);

  return {
    active,
    history,
    summary,
    settings: settings ?? createDefaultSettings(),
    lastEvaluated: new Date().toISOString(),
    location: analytics.location,
    dataSource: ALERTS_DATA_SOURCE,
  };
}

/** Convenience accessor: unresolved alerts only (used by the bell). */
export async function getActiveAlerts(settings?: AlertSettings): Promise<EnvironmentalAlert[]> {
  const snapshot = await getAlertsSnapshot(settings);
  return snapshot.active;
}

/** Convenience accessor: aggregated counts. */
export async function getAlertSummary(settings?: AlertSettings): Promise<AlertSummary> {
  const snapshot = await getAlertsSnapshot(settings);
  return snapshot.summary;
}

/** Alias kept for parity with the alert-engine concept names. */
export const generateEnvironmentalAlerts = evaluateAlertRules;

/**
 * Snapshot variant driven by rich {@link AlertThresholdPreferences}. Used by
 * the Settings page and by the Alerts page once a user has saved preferences.
 */
export async function getAlertsSnapshotWithPreferences(
  preferences: AlertThresholdPreferences
): Promise<AlertsSnapshot> {
  const analytics = await getEnvironmentalAnalytics("7d");
  const aiAnalysis = generateEnvironmentalIntelligence(analytics);
  const active = evaluateAlertRulesWithPreferences(analytics, aiAnalysis, preferences);
  const history = generateMockHistory(analytics.location);
  const summary = computeAlertSummary(active, history);

  return {
    active,
    history,
    summary,
    settings: createDefaultSettings(),
    lastEvaluated: new Date().toISOString(),
    location: analytics.location,
    dataSource: ALERTS_DATA_SOURCE,
  };
}
