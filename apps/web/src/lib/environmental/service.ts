import type { AnalyticsResult, TimeRange } from "./types";
import { getEnvironmentalDataProvider } from "./provider";

// Re-exported pure analytics helpers so existing consumers keep a stable API.
export {
  aqiCategoryOf,
  computeAnalytics,
  uvRiskOf,
} from "./analytics";
export type {
  AnalyticsResult,
  AQICategory,
  EnvironmentalReading,
  Insight,
  MetricKey,
  MetricSummary,
  TimeRange,
  WindSummary,
} from "./types";

/**
 * Data access entry point for the Analytics UI (and, transitively, for the AI
 * Intelligence and Alerts layers, which build on `AnalyticsResult`).
 *
 * All reads go through the active {@link getEnvironmentalDataProvider}. Today
 * that is the Mock provider (deterministic simulated data); when the ESP32
 * hardware exists, the same call returns real sensor data and the UI, AI and
 * Alerts layers are untouched.
 */
export async function getEnvironmentalAnalytics(range: TimeRange): Promise<AnalyticsResult> {
  return getEnvironmentalDataProvider().fetchAnalytics(range);
}