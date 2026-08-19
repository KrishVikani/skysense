import type { EnvironmentalReading } from "@/lib/environmental/types";
import type {
  ForecastContext,
  ForecastDirection,
  ForecastEngine,
  ForecastFeatures,
  ForecastHorizon,
  ForecastResult,
  MetricForecast,
  MetricTrend,
  PrecipitationOutlook,
} from "./types";
import { FORECAST_HORIZON_HOURS } from "./types";
import { assessDataQuality, computeConfidence } from "./quality";
import { clampToBounds, extractFeatures } from "./features";
import { computeRisk } from "./risk";

/**
 * DeterministicForecastEngine
 *
 * Produces short-term, explainable environmental forecasts from observed
 * history. The whole pipeline is pure and deterministic: same readings in →
 * identical forecast out. It works with any data source (simulation today,
 * ESP32 tomorrow) because it only consumes the canonical EnvironmentalReading
 * series. It never fabricates readings and never converts missing values to
 * zero — insufficient data yields an honest "insufficient" forecast.
 *
 * FUTURE ML: a new `AdvancedForecastEngine` implementing ForecastEngine can
 * replace this one via `setForecastEngine` without changing the UI, device
 * API, storage, alerts or AI layers.
 */

const STATIC_MARGIN: Record<string, number> = {
  temperature: 1.2,
  humidity: 4,
  pressure: 2.5,
  windSpeed: 3,
  airQuality: 12,
  uvIndex: 0.6,
  rainfall: 1.2,
};

function metricForecast(
  trend: MetricTrend,
  horizonHours: number,
  forecastable: boolean,
  overallConfidence: number
): MetricForecast {
  const current = trend.current;
  const base: MetricForecast = {
    metric: trend.metric,
    current,
    expected: null,
    rangeLow: null,
    rangeHigh: null,
    perHour: trend.perHour,
    direction: trend.direction,
    confidence: null,
  };

  if (current === null || !forecastable) {
    return base;
  }

  const expected = clampToBounds(trend.metric, current + trend.perHour * horizonHours);
  const spread =
    trend.volatility * Math.sqrt(horizonHours) + (STATIC_MARGIN[trend.metric] ?? 0);
  base.expected = Math.round(expected * 10) / 10;
  base.rangeLow = Math.round(clampToBounds(trend.metric, expected - spread) * 10) / 10;
  base.rangeHigh = Math.round(clampToBounds(trend.metric, expected + spread) * 10) / 10;
  base.confidence = Math.max(
    30,
    Math.min(95, Math.round(overallConfidence - Math.min(15, trend.volatility * 1.5)))
  );
  return base;
}

function precipitationOutlook(
  features: ForecastFeatures,
  forecastable: boolean
): PrecipitationOutlook {
  const likelihood = forecastable ? features.rainLikelihood : 0;

  const label =
    likelihood === 0
      ? "No"
      : likelihood < 20
        ? "Low"
        : likelihood < 45
          ? "Moderate"
          : likelihood < 70
            ? "Elevated"
            : "High";

  const drivers = features.rainContributions
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
  const reason =
    likelihood === 0
      ? "No rainfall drivers detected in the recent history."
      : drivers.length > 0
        ? drivers.map((d) => d.note).join(" ")
        : "Rainfall drivers are weak but present.";

  let direction: ForecastDirection = "stable";
  if (forecastable) {
    if (features.humidity.perHour >= 0.8 || features.pressure.perHour <= -0.5) {
      direction = "up";
    } else if (features.humidity.perHour <= -0.8 || features.pressure.perHour >= 0.5) {
      direction = "down";
    }
  } else {
    direction = "unknown";
  }

  return { likelihood, label, reason, direction };
}

function recommendationsFor(
  forecastable: boolean,
  precipitation: PrecipitationOutlook,
  riskCategories: { label: string; score: number }[],
  dataQualityLabel: string
): string[] {
  const recommendations: string[] = [];

  if (!forecastable) {
    recommendations.push(
      `Cannot forecast yet — ${dataQualityLabel.toLowerCase()}. Let the device collect more samples and re-check.`
    );
    return recommendations;
  }

  if (precipitation.likelihood >= 45) {
    recommendations.push(
      "Rain protection is advisable — carry an umbrella or rain cover over the forecast window."
    );
  }

  for (const cat of riskCategories) {
    if (cat.score >= 70) {
      recommendations.push(`Take precautions for ${cat.label.toLowerCase()}: high forward risk.`);
    } else if (cat.score >= 45) {
      recommendations.push(`Monitor ${cat.label.toLowerCase()} — forward risk is elevated.`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("No significant environmental risks in the forecast window.");
  }

  return recommendations;
}

function explanationFor(
  features: ForecastFeatures,
  horizonLabel: string,
  precipitation: PrecipitationOutlook,
  risk: { severityLabel: string; score: number },
  dataQualityLabel: string,
  forecastable: boolean
): string {
  if (!forecastable) {
    return `A forecast is not possible because the available history is ${dataQualityLabel.toLowerCase()}. The forecast will become usable once the device has collected enough recent readings.`;
  }

  const parts: string[] = [];
  const moving = [
    { label: "temperature", trend: features.temperature },
    { label: "humidity", trend: features.humidity },
    { label: "pressure", trend: features.pressure },
    { label: "wind", trend: features.windSpeed },
  ]
    .filter((m) => m.trend.direction === "up" || m.trend.direction === "down")
    .map((m) => `${m.label} ${m.trend.direction === "up" ? "rising" : "falling"}`);

  if (moving.length > 0) {
    parts.push(`Over the next ${horizonLabel}, ${moving.join(", ")} is the main expected change.`);
  } else {
    parts.push(`Over the next ${horizonLabel}, conditions are expected to stay broadly steady.`);
  }

  parts.push(`Environmental rain likelihood is ${precipitation.label.toLowerCase()} (${precipitation.likelihood}%).`);
  parts.push(`Overall forward risk is ${risk.severityLabel.toLowerCase()} (${risk.score}/100).`);
  parts.push(`Based on ${dataQualityLabel.toLowerCase()} history with ${features.sampleCount} sample(s).`);

  return parts.join(" ");
}

function contributingFactorsFor(features: ForecastFeatures): string[] {
  const factors: string[] = [];

  const notableTrends = [
    { label: "Temperature", trend: features.temperature },
    { label: "Humidity", trend: features.humidity },
    { label: "Pressure", trend: features.pressure },
    { label: "Wind", trend: features.windSpeed },
    { label: "Air quality", trend: features.airQuality },
    { label: "UV index", trend: features.uvIndex },
  ].filter((t) => t.trend.direction !== "stable" && t.trend.direction !== "unknown");

  for (const t of notableTrends.slice(0, 4)) {
    const word = t.trend.direction === "up" ? "rising" : "falling";
    factors.push(`${t.label} trending ${word} (~${t.trend.perHour}/h).`);
  }

  for (const c of features.rainContributions.filter((c) => c.points > 0).slice(0, 3)) {
    factors.push(c.note);
  }

  if (features.stability >= 60) {
    factors.push(`Atmosphere is unstable (stability ${features.stability}/100).`);
  }

  if (factors.length === 0) {
    factors.push("No strong directional signals in the recent history.");
  }

  return factors;
}

export class DeterministicForecastEngine implements ForecastEngine {
  readonly id = "deterministic";
  readonly label = "Deterministic trend forecast";

  generate(
    readings: EnvironmentalReading[],
    horizon: ForecastHorizon,
    context?: ForecastContext
  ): ForecastResult {
    const horizonHours = FORECAST_HORIZON_HOURS[horizon];
    const assessment = assessDataQuality(readings);
    const features = extractFeatures(readings);

    const forecastable =
      features !== null &&
      (assessment.state === "good" || assessment.state === "limited" || assessment.state === "stale");

const volatilityByMetric: Record<string, number> = features
    ? {
        temperature: features.temperature.volatility,
        humidity: features.humidity.volatility,
        pressure: features.pressure.volatility,
        windSpeed: features.windSpeed.volatility,
        airQuality: features.airQuality.volatility,
        uvIndex: features.uvIndex.volatility,
      }
    : {};
    const confidence = computeConfidence(assessment, volatilityByMetric);

    const trends = features
      ? {
          temperature: features.temperature,
          humidity: features.humidity,
          pressure: features.pressure,
          windSpeed: features.windSpeed,
          airQuality: features.airQuality,
          uvIndex: features.uvIndex,
        }
      : null;

    const risk = trends
      ? computeRisk(trends, horizonHours, forecastable ? features.rainLikelihood : 0)
      : {
          score: 0,
          severity: "low" as const,
          severityLabel: "Low",
          categories: [],
          explanation: "No data available for risk assessment.",
        };

    const precipitation = features
      ? precipitationOutlook(features, forecastable)
      : { likelihood: 0, label: "No", reason: "No data.", direction: "unknown" as ForecastDirection };

    const horizonLabel = `${horizon} hour${horizonHours > 1 ? "s" : ""}`;
    const source = context?.source ?? readings[readings.length - 1]?.source ?? "Unknown source";
    const dataSource = context?.dataSource ?? readings[readings.length - 1]?.dataSource ?? "simulation";
    const location = context?.location ?? readings[readings.length - 1]?.location ?? "Unknown location";

    const window = {
      sampleCount: readings.length,
      spanHours: features?.spanHours ?? 0,
      latestTimestamp: readings[readings.length - 1]?.timestamp ?? null,
      earliestTimestamp: readings[0]?.timestamp ?? null,
    };

    return {
      generatedAt: new Date().toISOString(),
      engine: this.id,
      engineLabel: this.label,
      source,
      dataSource,
      location,
      horizon,
      dataQuality: assessment.state,
      dataQualityLabel: assessment.label,
      confidence: forecastable ? confidence.confidence : 0,
      confidenceLevel: forecastable ? confidence.level : "None",
      confidenceExplanation: confidence.explanation,
      temperature: metricForecast(
        features?.temperature ?? emptyTrend("temperature"),
        horizonHours,
        forecastable,
        confidence.confidence
      ),
      humidity: metricForecast(
        features?.humidity ?? emptyTrend("humidity"),
        horizonHours,
        forecastable,
        confidence.confidence
      ),
      pressure: metricForecast(
        features?.pressure ?? emptyTrend("pressure"),
        horizonHours,
        forecastable,
        confidence.confidence
      ),
      windSpeed: metricForecast(
        features?.windSpeed ?? emptyTrend("windSpeed"),
        horizonHours,
        forecastable,
        confidence.confidence
      ),
      airQuality: metricForecast(
        features?.airQuality ?? emptyTrend("airQuality"),
        horizonHours,
        forecastable,
        confidence.confidence
      ),
      uvIndex: metricForecast(
        features?.uvIndex ?? emptyTrend("uvIndex"),
        horizonHours,
        forecastable,
        confidence.confidence
      ),
      rainfall: metricForecast(
        features?.rainfall ?? emptyTrend("rainfall"),
        horizonHours,
        forecastable,
        confidence.confidence
      ),
      precipitation,
      risk,
      features: features ?? emptyFeatures(),
      explanation: explanationFor(
        features ?? emptyFeatures(),
        horizonLabel,
        precipitation,
        risk,
        assessment.label,
        forecastable
      ),
      contributingFactors: forecastable
        ? contributingFactorsFor(features as ForecastFeatures)
        : [
            `Forecast unavailable — ${assessment.label.toLowerCase()}. ${assessment.sampleCount} sample(s) received.`,
          ],
      recommendations: recommendationsFor(
        forecastable,
        precipitation,
        risk.categories.map((c) => ({ label: c.label, score: c.score })),
        assessment.label
      ),
      window,
    };
  }
}

function emptyTrend(metric: string): MetricTrend {
  return {
    metric,
    sampleCount: 0,
    current: null,
    average: null,
    perHour: 0,
    shortTermPerHour: 0,
    volatility: 0,
    direction: "unknown",
  };
}

function emptyFeatures(): ForecastFeatures {
  return {
    temperature: emptyTrend("temperature"),
    humidity: emptyTrend("humidity"),
    pressure: emptyTrend("pressure"),
    windSpeed: emptyTrend("windSpeed"),
    windDirection: emptyTrend("windDirection"),
    airQuality: emptyTrend("airQuality"),
    uvIndex: emptyTrend("uvIndex"),
    rainfall: emptyTrend("rainfall"),
    dominantWindLabel: "Unknown",
    rainLikelihood: 0,
    rainContributions: [],
    stability: 0,
    spanHours: 0,
    sampleCount: 0,
  };
}

export const deterministicForecastEngine = new DeterministicForecastEngine();

let activeEngine: ForecastEngine = deterministicForecastEngine;

/** Swaps the active engine (used by tests and the future ML engine). */
export function setForecastEngine(engine: ForecastEngine): ForecastEngine {
  activeEngine = engine;
  return activeEngine;
}

export function getForecastEngine(): ForecastEngine {
  return activeEngine;
}

/** Runs the active engine over a reading series. Pure given its inputs. */
export function generateForecast(
  readings: EnvironmentalReading[],
  horizon: ForecastHorizon,
  context?: ForecastContext
): ForecastResult {
  return activeEngine.generate(readings, horizon, context);
}