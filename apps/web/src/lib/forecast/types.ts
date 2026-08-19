import type { EnvironmentalReading } from "@/lib/environmental/types";

/**
 * Forecast horizons supported by the short-term environmental forecasting
 * engine. These are trend-outlook horizons, NOT professional meteorological
 * forecasts — the engine projects current conditions forward using the recent
 * observed history.
 */
export type ForecastHorizon = "1h" | "3h" | "6h";

export const FORECAST_HORIZONS: ForecastHorizon[] = ["1h", "3h", "6h"];

/** Hours represented by each horizon. */
export const FORECAST_HORIZON_HOURS: Record<ForecastHorizon, number> = {
  "1h": 1,
  "3h": 3,
  "6h": 6,
};

/**
 * How usable the available history is for forecasting.
 * - `no_data`: no readings at all.
 * - `insufficient`: too few readings / too little time span to project trends.
 * - `limited`: usable but thin/sparse history — confidence is deliberately low.
 * - `good`: adequate recent history — the engine can project with confidence.
 * - `stale`: history exists but the latest reading is old; output is penalized.
 * - `invalid`: readings are present but carry no usable numeric values.
 */
export type ForecastDataQuality =
  | "no_data"
  | "insufficient"
  | "limited"
  | "good"
  | "stale"
  | "invalid";

export type ForecastConfidenceLevel = "High" | "Medium" | "Low" | "None";

/**
 * Trend direction for a single metric. `unknown` means there was not enough
 * valid data for that metric to classify a direction (never inferred as zero).
 */
export type ForecastDirection = "up" | "down" | "stable" | "unknown";

export type ForecastSeverity = "low" | "moderate" | "high" | "critical";

/** Unit labels used by the forecast UI (mirrors the analytics unit set). */
export const FORECAST_UNITS: Record<string, string> = {
  temperature: "°C",
  humidity: "%",
  pressure: " hPa",
  airQuality: " AQI",
  uvIndex: "",
  windSpeed: " km/h",
  rainfall: " mm",
};

/**
 * Deterministic trend features for one metric, derived from the recent history
 * via a least-squares fit against time (handles unevenly spaced samples).
 */
export interface MetricTrend {
  metric: string;
  /** Valid sample count for this metric (missing values are never inferred). */
  sampleCount: number;
  /** Current (latest) value, or null when the metric has no valid samples. */
  current: number | null;
  /** Mean over the window (valid samples only). */
  average: number | null;
  /** Least-squares slope in units per hour. */
  perHour: number;
  /** Rate of change over only the most recent samples (units per hour). */
  shortTermPerHour: number;
  /** Standard deviation of the metric values (volatility). */
  volatility: number;
  /** Direction classification with a per-metric dead-band. */
  direction: ForecastDirection;
}

/** All per-metric trend features the engine computes. */
export interface ForecastFeatures {
  temperature: MetricTrend;
  humidity: MetricTrend;
  pressure: MetricTrend;
  windSpeed: MetricTrend;
  windDirection: MetricTrend;
  airQuality: MetricTrend;
  uvIndex: MetricTrend;
  rainfall: MetricTrend;
  /** Dominant wind direction label over the window (e.g. "WSW"). */
  dominantWindLabel: string;
  /**
   * Environmental rain likelihood, 0–100. This is an EXPLAINABLE indicator
   * combining humidity rise, pressure fall, observed rainfall and wind change —
   * explicitly NOT a professional precipitation forecast.
   */
  rainLikelihood: number;
  /** Individual rain-likelihood contributions, each with an explanation. */
  rainContributions: { label: string; points: number; note: string }[];
  /**
   * Atmospheric stability index 0–100 (higher = more unstable), based on
   * pressure/temperature volatility. Used by risk and precipitation logic.
   */
  stability: number;
  /** Time span of the window in hours. */
  spanHours: number;
  /** Total reading count provided. */
  sampleCount: number;
}

/** A single metric's projection for one horizon. */
export interface MetricForecast {
  metric: string;
  /** Latest observed value, or null when the metric has no valid samples. */
  current: number | null;
  /** Expected value at the horizon, or null when data is insufficient. */
  expected: number | null;
  /** Plausible low end of the range at the horizon, or null. */
  rangeLow: number | null;
  /** Plausible high end of the range at the horizon, or null. */
  rangeHigh: number | null;
  /** Projected change per hour (units per hour). */
  perHour: number;
  direction: ForecastDirection;
  /** Per-metric confidence 0–100, or null when not forecastable. */
  confidence: number | null;
}

/** Precipitation / weather-event outlook for a horizon. */
export interface PrecipitationOutlook {
  /** Likelihood 0–100 ("Environmental rain likelihood"). */
  likelihood: number;
  /** Human label: No, Low, Moderate, Elevated, High. */
  label: string;
  /** Plain-language reason the likelihood is what it is. */
  reason: string;
  /** Direction the likelihood is heading. */
  direction: ForecastDirection;
}

/** A scored risk category for the forecast (score 0–100, higher = riskier). */
export interface ForecastRiskCategory {
  id: string;
  label: string;
  score: number;
  severity: ForecastSeverity;
  explanation: string;
}

/** Aggregate forward-looking environmental risk. */
export interface ForecastRisk {
  /** Overall risk 0–100. */
  score: number;
  severity: ForecastSeverity;
  severityLabel: string;
  categories: ForecastRiskCategory[];
  explanation: string;
}

/** Snapshot of the input window the forecast was built from. */
export interface ForecastWindow {
  sampleCount: number;
  spanHours: number;
  latestTimestamp: string | null;
  earliestTimestamp: string | null;
}

/**
 * The complete deterministic forecast output for one horizon.
 *
 * This is the contract AI/alert layers and the UI consume. It is intentionally
 * extensible: adding a metric later does not break existing consumers.
 */
export interface ForecastResult {
  generatedAt: string;
  /** Data-provider id of the engine run, e.g. "deterministic". */
  engine: string;
  /** Engine label, e.g. "Deterministic trend forecast". */
  engineLabel: string;
  /** Human-readable source label (e.g. "Simulated environmental data"). */
  source: string;
  /** Machine-readable provenance from the underlying readings. */
  dataSource: string;
  location: string;
  horizon: ForecastHorizon;
  dataQuality: ForecastDataQuality;
  dataQualityLabel: string;
  /** Overall confidence 0–100 (0 when no forecast is possible). */
  confidence: number;
  confidenceLevel: ForecastConfidenceLevel;
  /** Confidence explanation (why it is high/low). */
  confidenceExplanation: string;
  temperature: MetricForecast;
  humidity: MetricForecast;
  pressure: MetricForecast;
  windSpeed: MetricForecast;
  airQuality: MetricForecast;
  uvIndex: MetricForecast;
  rainfall: MetricForecast;
  precipitation: PrecipitationOutlook;
  risk: ForecastRisk;
  /** Deterministic features the forecast was derived from. */
  features: ForecastFeatures;
  /** Human-readable summary of the outlook. */
  explanation: string;
  /** Short reasons that drove the outcome (explainability). */
  contributingFactors: string[];
  /** Actionable, conservative recommendations. */
  recommendations: string[];
  /** Description of the input window used. */
  window: ForecastWindow;
}

/** Context passed to the engine (readings already carry most of this). */
export interface ForecastContext {
  location: string;
  dataSource: string;
  source: string;
}

/**
 * Forecasting engine abstraction.
 *
 * FUTURE ML: replace `deterministicForecastEngine` with an
 * `AdvancedForecastEngine` implementing this same interface. Consumers (UI,
 * alerts, AI) call `generateForecast` and never depend on the implementation.
 */
export interface ForecastEngine {
  readonly id: string;
  readonly label: string;
  generate(
    _readings: EnvironmentalReading[],
    _horizon: ForecastHorizon,
    _context?: ForecastContext
  ): ForecastResult;
}