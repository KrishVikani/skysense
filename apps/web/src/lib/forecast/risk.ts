import type {
  ForecastRisk,
  ForecastRiskCategory,
  ForecastSeverity,
  MetricTrend,
} from "./types";
import { clamp } from "./features";

/**
 * Forward-looking environmental risk scoring.
 *
 * Unlike the AI layer (current-state analysis) and the Alerts engine
 * (notification decisions), this risk is a TREND-AWARE outlook: it combines the
 * latest observed value with the projected value at the horizon. It never
 * issues alerts — it produces explainable risk scores for the forecast only.
 */

const WEIGHTS: Record<string, number> = {
  temperature: 0.25,
  airQuality: 0.2,
  uv: 0.15,
  humidity: 0.1,
  wind: 0.1,
  precipitation: 0.2,
};

export const SEVERITY_LABELS: Record<ForecastSeverity, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};

export function severityOf(score: number): ForecastSeverity {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 20) return "moderate";
  return "low";
}

function projectedValue(trend: MetricTrend, horizonHours: number): number | null {
  if (trend.current === null) return null;
  return trend.current + trend.perHour * horizonHours;
}

function category(
  id: string,
  label: string,
  score: number,
  explanation: string
): ForecastRiskCategory {
  return {
    id,
    label,
    score: Math.round(clamp(score, 0, 100)),
    severity: severityOf(score),
    explanation,
  };
}

/**
 * Computes the aggregate forward risk for one horizon.
 *
 * @param trends  per-metric trends from the feature extraction
 * @param horizonHours  hours ahead (1/3/6)
 * @param rainLikelihood  0–100 environmental rain likelihood
 */
export function computeRisk(
  trends: {
    temperature: MetricTrend;
    humidity: MetricTrend;
    windSpeed: MetricTrend;
    airQuality: MetricTrend;
    uvIndex: MetricTrend;
  },
  horizonHours: number,
  rainLikelihood: number
): ForecastRisk {
  const temperature = projectedValue(trends.temperature, horizonHours);
  const humidity = projectedValue(trends.humidity, horizonHours);
  const wind = projectedValue(trends.windSpeed, horizonHours);
  const aqi = projectedValue(trends.airQuality, horizonHours);
  const uv = projectedValue(trends.uvIndex, horizonHours);

  const peakTemp = Math.max(trends.temperature.current ?? 0, temperature ?? 0);
  const tempScore = clamp((peakTemp - 26) * 6, 0, 100);
  const tempCat = category(
    "temperature",
    "Temperature",
    tempScore,
    peakTemp >= 40
      ? "Extreme heat expected — take heat precautions."
      : peakTemp >= 34
        ? "High temperature outlook; heat stress is possible."
        : peakTemp >= 28
          ? "Warm conditions; mild heat discomfort possible."
          : "Temperature outlook is comfortable."
  );

  const peakAqi = Math.max(trends.airQuality.current ?? 0, aqi ?? 0);
  const airScore = clamp((peakAqi - 30) * 1.1, 0, 100);
  const airCat = category(
    "airQuality",
    "Air quality",
    airScore,
    peakAqi >= 120
      ? "Poor air quality outlook — reduce outdoor exposure."
      : peakAqi >= 80
        ? "Moderately unhealthy air quality outlook."
        : peakAqi >= 40
          ? "Acceptable air quality outlook."
          : "Clean air outlook."
  );

  const peakUv = Math.max(trends.uvIndex.current ?? 0, uv ?? 0);
  const uvScore = clamp(peakUv * 11, 0, 100);
  const uvCat = category(
    "uv",
    "UV exposure",
    uvScore,
    peakUv >= 11
      ? "Extreme UV — avoid midday sun."
      : peakUv >= 8
        ? "Very high UV — use sun protection."
        : peakUv >= 6
          ? "High UV — use sun protection."
          : "UV outlook is moderate or low."
  );

  const discomfort = Math.abs((humidity ?? 55) - 55);
  const humidityScore = clamp(discomfort * 2.4, 0, 100);
  const humidityCat = category(
    "humidity",
    "Humidity comfort",
    humidityScore,
    humidity === null
      ? "Humidity data unavailable."
      : humidity >= 75
        ? "Very humid outlook — noticeably uncomfortable."
        : humidity >= 60
          ? "Humid outlook — mildly uncomfortable."
          : humidity <= 30
            ? "Dry outlook — moisture loss is a concern."
            : "Humidity outlook is comfortable."
  );

  const windScore = clamp(((wind ?? 10) - 10) * 5, 0, 100);
  const windCat = category(
    "wind",
    "Wind",
    windScore,
    wind === null
      ? "Wind data unavailable."
      : wind >= 30
        ? "Strong wind outlook — secure loose objects."
        : wind >= 20
          ? "Breezy outlook — gusts possible."
          : "Wind outlook is light."
  );

  const precipCat = category(
    "precipitation",
    "Precipitation",
    rainLikelihood,
    rainLikelihood >= 70
      ? "High environmental rain likelihood — carry rain protection."
      : rainLikelihood >= 45
        ? "Elevated environmental rain likelihood."
        : rainLikelihood >= 20
          ? "Some environmental rain likelihood."
          : "Low environmental rain likelihood."
  );

  const categories = [tempCat, airCat, uvCat, humidityCat, windCat, precipCat];

  const score = Math.round(
    categories.reduce((acc, cat) => acc + cat.score * (WEIGHTS[cat.id] ?? 0), 0)
  );
  const severity = severityOf(score);

  const high = categories.filter((c) => c.score >= 45).map((c) => c.label);
  const explanation =
    high.length > 0
      ? `The highest forward risks are ${high.join(", ")}.`
      : "Overall forward risk is low across all categories.";

  return {
    score,
    severity,
    severityLabel: SEVERITY_LABELS[severity],
    categories,
    explanation,
  };
}