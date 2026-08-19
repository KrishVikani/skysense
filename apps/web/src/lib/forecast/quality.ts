import type { EnvironmentalReading } from "@/lib/environmental/types";
import type {
  ForecastConfidenceLevel,
  ForecastDataQuality,
} from "./types";

/**
 * Data-quality assessment for the forecasting engine.
 *
 * The forecast's confidence must honestly reflect the history it was given:
 * - no data → no forecast, confidence 0
 * - one reading / <4 samples / <2h span → insufficient, confidence 0
 * - stale (latest reading too old) → stale, heavily penalized
 * - thin or sparse history → limited, low confidence
 * - adequate recent history → good
 * - present but unusable values → invalid
 */

/** A reading is stale when it is older than this (hours). */
export const STALE_HOURS = 6;

/** Minimum samples for a usable forecast. */
export const MIN_SAMPLES = 4;
/** Minimum time span (hours) for a usable forecast. */
export const MIN_SPAN_HOURS = 2;
/** Samples below which the history is only "limited". */
export const LIMITED_SAMPLES = 12;
/** Span (hours) below which the history is only "limited". */
export const LIMITED_SPAN_HOURS = 12;

export const DATA_QUALITY_LABELS: Record<ForecastDataQuality, string> = {
  no_data: "No data",
  insufficient: "Insufficient history",
  limited: "Limited history",
  good: "Good",
  stale: "Stale data",
  invalid: "Invalid data",
};

const REQUIRED_METRICS = [
  "temperature",
  "humidity",
  "pressure",
  "airQuality",
  "uvIndex",
  "windSpeed",
  "windDirection",
  "rainfall",
] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export interface DataQualityAssessment {
  state: ForecastDataQuality;
  label: string;
  sampleCount: number;
  spanHours: number;
  latestAgeHours: number;
  /** Metrics that have at least one valid numeric value. */
  usableMetrics: string[];
}

function sortedReadings(readings: EnvironmentalReading[]): EnvironmentalReading[] {
  return [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Assesses the forecast-ability of a reading series. Pure and deterministic.
 */
export function assessDataQuality(readings: EnvironmentalReading[]): DataQualityAssessment {
  const sorted = sortedReadings(readings);

  if (sorted.length === 0) {
    return {
      state: "no_data",
      label: DATA_QUALITY_LABELS.no_data,
      sampleCount: 0,
      spanHours: 0,
      latestAgeHours: 0,
      usableMetrics: [],
    };
  }

  const usableMetrics = REQUIRED_METRICS.filter((metric) =>
    sorted.some((r) => isFiniteNumber((r as unknown as Record<string, unknown>)[metric]))
  );

  if (usableMetrics.length === 0) {
    return {
      state: "invalid",
      label: DATA_QUALITY_LABELS.invalid,
      sampleCount: sorted.length,
      spanHours: 0,
      latestAgeHours: 0,
      usableMetrics: [],
    };
  }

  const firstMs = new Date(sorted[0].timestamp).getTime();
  const lastMs = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const spanHours = Math.max(0, (lastMs - firstMs) / 3600000);
  const latestAgeHours = Math.max(0, (Date.now() - lastMs) / 3600000);

  let state: ForecastDataQuality;
  if (sorted.length === 1 || sorted.length < MIN_SAMPLES || spanHours < MIN_SPAN_HOURS) {
    state = "insufficient";
  } else if (latestAgeHours > STALE_HOURS) {
    state = "stale";
  } else if (sorted.length < LIMITED_SAMPLES || spanHours < LIMITED_SPAN_HOURS) {
    state = "limited";
  } else {
    state = "good";
  }

  return {
    state,
    label: DATA_QUALITY_LABELS[state],
    sampleCount: sorted.length,
    spanHours: Math.round(spanHours * 10) / 10,
    latestAgeHours: Math.round(latestAgeHours * 10) / 10,
    usableMetrics,
  };
}

/**
 * Derives an overall confidence 0–100 from the data-quality state plus the
 * average volatility of the usable metrics. Insufficient/no_data/invalid data
 * never produces a confident-looking forecast (confidence = 0).
 */
export function computeConfidence(
  assessment: DataQualityAssessment,
  volatilityByMetric: Record<string, number>
): { confidence: number; level: ForecastConfidenceLevel; explanation: string } {
  if (assessment.state === "no_data" || assessment.state === "invalid") {
    return {
      confidence: 0,
      level: "None",
      explanation: "No usable readings are available, so no forecast can be produced.",
    };
  }

  if (assessment.state === "insufficient") {
    return {
      confidence: 0,
      level: "None",
      explanation:
        "There are too few readings or too little history to project trends. " +
        "Collect more samples before relying on the forecast.",
    };
  }

  let base = 78;
  const penalties: string[] = [];

  if (assessment.state === "limited") {
    base -= 15;
    penalties.push("limited history");
  }
  if (assessment.state === "stale") {
    base -= 25;
    penalties.push("latest reading is stale");
  }

  const values = Object.values(volatilityByMetric).filter((v) => Number.isFinite(v));
  const avgVolatility = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  // Normalized volatility penalty: high variability lowers confidence honestly.
  const volatilityPenalty = Math.min(18, avgVolatility * 2.2);
  if (volatilityPenalty > 4) {
    base -= volatilityPenalty;
    penalties.push("high variability in recent readings");
  }

  const confidence = Math.max(30, Math.min(95, Math.round(base)));
  const level: ForecastConfidenceLevel =
    confidence >= 75 ? "High" : confidence >= 55 ? "Medium" : "Low";

  const explanation =
    level === "High"
      ? "Confidence is high because the history is recent, sufficiently dense and stable."
      : level === "Medium"
        ? "Confidence is moderate because of limited history or moderate variability."
        : "Confidence is low; treat this outlook as provisional only.";

  return { confidence, level, explanation };
}