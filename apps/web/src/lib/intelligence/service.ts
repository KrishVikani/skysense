import { getEnvironmentalAnalytics } from "@/lib/environmental/service";
import type {
  AnalyticsResult,
  EnvironmentalReading,
  MetricKey,
  MetricSummary,
  TimeRange,
} from "@/lib/environmental/types";
import type {
  AIAnalysis,
  ConfidenceInfo,
  ExplanationFactor,
  MetricInsight,
  Recommendation,
  RiskAssessment,
  RiskLevel,
  RiskSeverity,
  TrendClassification,
  TrendInfo,
} from "./types";

export const INTELLIGENCE_SOURCE = "Simulated environmental data";

const SIMULATED_DELAY = 300;

// Weights used to combine the individual risk categories into one overall score.
const RISK_WEIGHTS: Record<string, number> = {
  heat: 0.25,
  air: 0.2,
  uv: 0.2,
  humidity: 0.15,
  stability: 0.2,
};

const TREND_THRESHOLDS: Record<string, number> = {
  temperature: 0.5,
  humidity: 2,
  windSpeed: 1,
  uvIndex: 0.5,
  airQuality: 4,
};

// Below this volatility a series is not considered "fluctuating".
const TREND_NOISE_FLOOR: Record<string, number> = {
  temperature: 1.5,
  humidity: 4,
  windSpeed: 3,
  uvIndex: 1.5,
  airQuality: 6,
};

const TREND_METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: "temperature", label: "Temperature", unit: "°C" },
  { key: "humidity", label: "Humidity", unit: "%" },
  { key: "windSpeed", label: "Wind Speed", unit: "km/h" },
  { key: "uvIndex", label: "UV Index", unit: "" },
  { key: "airQuality", label: "Air Quality", unit: " AQI" },
];

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - avg) * (v - avg))));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function severityFromScore(score: number): { severity: RiskSeverity; label: string } {
  if (score >= 70) return { severity: "critical", label: "Critical" };
  if (score >= 45) return { severity: "warning", label: "High" };
  if (score >= 20) return { severity: "info", label: "Moderate" };
  return { severity: "good", label: "Low" };
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 19) return "Excellent";
  if (score <= 39) return "Good";
  if (score <= 59) return "Moderate";
  if (score <= 79) return "Elevated";
  return "Critical";
}

function joinNames(items: RiskAssessment[]): string {
  const names = items.map((i) => i.label.toLowerCase());
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ---- Risk categories -------------------------------------------------------

function heatRisk(summary: Record<MetricKey, MetricSummary>): RiskAssessment {
  const current = summary.temperature.current;
  const max = summary.temperature.max;
  const score = Math.round(
    clamp(Math.max((current - 22) * 6, (max - 22) * 5), 0, 100)
  );
  const { severity, label } = severityFromScore(score);
  const explanation =
    score < 20
      ? `Temperatures near ${current.toFixed(1)}°C are within a comfortable range.`
      : score < 45
        ? `Temperatures near ${current.toFixed(1)}°C are warm; monitor heat exposure.`
        : `Temperatures reaching ${max.toFixed(1)}°C increase heat stress risk during peak hours.`;
  return { id: "heat", label: "Heat Risk", score, severity, severityLabel: label, explanation };
}

function airQualityRisk(summary: Record<MetricKey, MetricSummary>): RiskAssessment {
  const current = summary.airQuality.current;
  const score = Math.round(clamp((current - 30) * 1.1, 0, 100));
  const { severity, label } = severityFromScore(score);
  const explanation =
    current <= 50
      ? `Air quality at ${current.toFixed(0)} AQI is good for outdoor activity.`
      : current <= 100
        ? `Air quality at ${current.toFixed(0)} AQI is acceptable, though sensitive groups may be affected.`
        : `Air quality at ${current.toFixed(0)} AQI may be unhealthy for sensitive individuals.`;
  return { id: "air", label: "Air Quality Risk", score, severity, severityLabel: label, explanation };
}

function uvRisk(summary: Record<MetricKey, MetricSummary>): RiskAssessment {
  const current = summary.uvIndex.current;
  const max = summary.uvIndex.max;
  const score = Math.round(clamp(Math.max(current, max) * 10, 0, 100));
  const { severity, label } = severityFromScore(score);
  const explanation =
    max < 3
      ? `UV index peaking at ${max.toFixed(1)} poses minimal sun-exposure risk.`
      : max < 8
        ? `UV index reaching ${max.toFixed(1)} warrants sun protection around midday.`
        : `UV index reaching ${max.toFixed(1)} is very high; prolonged exposure is hazardous.`;
  return { id: "uv", label: "UV Risk", score, severity, severityLabel: label, explanation };
}

function humidityRisk(summary: Record<MetricKey, MetricSummary>): RiskAssessment {
  const current = summary.humidity.current;
  const score = Math.round(clamp(Math.abs(current - 55) * 2.2, 3, 100));
  const { severity, label } = severityFromScore(score);
  const explanation =
    current >= 40 && current <= 70
      ? `Humidity at ${current.toFixed(0)}% is within a comfortable range.`
      : current > 70
        ? `Humidity at ${current.toFixed(0)}% increases heat discomfort and mold potential.`
        : `Humidity at ${current.toFixed(0)}% is low and may cause dry conditions.`;
  return { id: "humidity", label: "Humidity Risk", score, severity, severityLabel: label, explanation };
}

function stabilityRisk(readings: EnvironmentalReading[]): RiskAssessment {
  const pressureStd = stdDev(readings.map((r) => r.pressure));
  const temperatureStd = stdDev(readings.map((r) => r.temperature));
  const score = Math.round(clamp(pressureStd * 8 + temperatureStd * 5, 3, 100));
  const { severity, label } = severityFromScore(score);
  const explanation =
    score < 20
      ? "Pressure and temperature have been stable, indicating settled weather."
      : score < 45
        ? "Mild variability in pressure and temperature suggests shifting conditions."
        : "Notable atmospheric variability signals unstable weather ahead.";
  return { id: "stability", label: "Weather Stability", score, severity, severityLabel: label, explanation };
}

// ---- Natural-language summary ----------------------------------------------

function buildSummary(level: RiskLevel, risks: RiskAssessment[]): string {
  const concerning = risks.filter((r) => r.severity !== "good");
  const fine = risks.filter((r) => r.severity === "good");

  const opening: Record<RiskLevel, string> = {
    Excellent: "Environmental conditions are currently excellent",
    Good: "Environmental conditions are currently good",
    Moderate: "Environmental conditions are currently moderate",
    Elevated: "Environmental conditions are currently elevated",
    Critical: "Environmental conditions are currently critical",
  };

  let text = `${opening[level]}.`;
  if (concerning.length > 0) {
    const verb = concerning.length === 1 ? "is" : "are";
    text += ` ${joinNames(concerning)} ${verb} elevated above recommended levels.`;
  } else {
    text += " All monitored metrics are within recommended ranges.";
  }
  if (fine.length > 0) {
    const verb = fine.length === 1 ? "remains" : "remain";
    text += ` ${joinNames(fine)} ${verb} within an acceptable range.`;
  }
  return text;
}

// ---- Metric insights -------------------------------------------------------

function buildInsights(summary: Record<MetricKey, MetricSummary>): MetricInsight[] {
  const insights: MetricInsight[] = [];

  const temp = summary.temperature.current;
  const tempStatus =
    temp >= 35 ? { severity: "critical" as const, label: "Critical" }
      : temp >= 32 ? { severity: "warning" as const, label: "High" }
        : temp >= 28 ? { severity: "info" as const, label: "Elevated" }
          : { severity: "good" as const, label: "Optimal" };
  insights.push({
    id: "temperature",
    label: "Temperature",
    current: temp.toFixed(1),
    unit: "°C",
    status: tempStatus.severity,
    statusLabel: tempStatus.label,
    interpretation:
      temp >= 35
        ? "Very hot conditions are present, increasing heat stress during activity."
        : temp >= 32
          ? "Hot conditions may make prolonged outdoor exertion uncomfortable."
          : temp >= 28
            ? "Warm conditions are comfortable for most activities with light clothing."
            : "Comfortable temperatures support normal outdoor activity.",
    recommendation:
      temp >= 32
        ? "Increase hydration and limit strenuous activity during the hottest hours."
        : "No special heat precautions required at current levels.",
  });

  const hum = summary.humidity.current;
  const humStatus =
    hum > 75 ? { severity: "warning" as const, label: "High" }
      : hum > 65 ? { severity: "info" as const, label: "Elevated" }
        : hum < 30 ? { severity: "info" as const, label: "Low" }
          : { severity: "good" as const, label: "Optimal" };
  insights.push({
    id: "humidity",
    label: "Humidity",
    current: hum.toFixed(0),
    unit: "%",
    status: humStatus.severity,
    statusLabel: humStatus.label,
    interpretation:
      hum > 75
        ? "High humidity amplifies perceived heat and can strain cooling systems."
        : hum > 65
          ? "Elevated humidity increases mugginess and comfort concerns."
          : hum < 30
            ? "Low humidity may cause dry skin and respiratory discomfort."
            : "Humidity is within the comfortable comfort band.",
    recommendation:
      hum > 70
        ? "Use ventilation or dehumidification indoors and stay well hydrated."
        : hum < 30
          ? "Keep hydrated and consider humidifying indoor spaces."
          : "No humidity-related precautions required.",
  });

  const wind = summary.windSpeed.current;
  const windStatus =
    wind > 25 ? { severity: "critical" as const, label: "Strong" }
      : wind > 18 ? { severity: "warning" as const, label: "Breezy" }
        : wind > 10 ? { severity: "info" as const, label: "Moderate" }
          : { severity: "good" as const, label: "Calm" };
  insights.push({
    id: "wind",
    label: "Wind Speed",
    current: wind.toFixed(1),
    unit: "km/h",
    status: windStatus.severity,
    statusLabel: windStatus.label,
    interpretation:
      wind > 25
        ? "Strong winds can affect travel, debris and open-air activities."
        : wind > 18
          ? "Breezy conditions may affect high-profile vehicles and loose objects."
          : wind > 10
            ? "Moderate winds are generally fine for outdoor activity."
            : "Calm wind conditions are ideal for outdoor plans.",
    recommendation:
      wind > 20
        ? "Secure loose outdoor items and exercise caution with tall vehicles."
        : "Wind conditions pose no special hazard at current levels.",
  });

  const uv = summary.uvIndex.current;
  const uvMax = summary.uvIndex.max;
  const uvStatus =
    uv >= 11 ? { severity: "critical" as const, label: "Extreme" }
      : uvMax >= 8 ? { severity: "warning" as const, label: "Very High" }
        : uvMax >= 6 ? { severity: "warning" as const, label: "High" }
          : uvMax >= 3 ? { severity: "info" as const, label: "Moderate" }
            : { severity: "good" as const, label: "Low" };
  insights.push({
    id: "uv",
    label: "UV Index",
    current: uv.toFixed(1),
    unit: "",
    status: uvStatus.severity,
    statusLabel: uvStatus.label,
    interpretation:
      uvMax >= 8
        ? "Prolonged outdoor exposure may increase UV skin-damage risk."
        : uvMax >= 6
          ? "Elevated UV levels warrant sun protection during midday hours."
          : uvMax >= 3
            ? "Moderate UV levels require basic sun protection for extended exposure."
            : "Low UV levels present minimal sun-exposure risk.",
    recommendation:
      uvMax >= 8
        ? "Limit extended exposure during peak sunlight hours; use SPF 50+ and protective clothing."
        : uvMax >= 6
          ? "Use sunscreen and a hat during midday hours."
          : "No special sun-protection precautions required.",
  });

  const aqi = summary.airQuality.current;
  const aqiStatus =
    aqi > 150 ? { severity: "critical" as const, label: "Unhealthy" }
      : aqi > 100 ? { severity: "warning" as const, label: "Poor" }
        : aqi > 50 ? { severity: "info" as const, label: "Moderate" }
          : { severity: "good" as const, label: "Good" };
  insights.push({
    id: "air",
    label: "Air Quality",
    current: aqi.toFixed(0),
    unit: " AQI",
    status: aqiStatus.severity,
    statusLabel: aqiStatus.label,
    interpretation:
      aqi > 100
        ? "Air quality may be unhealthy for sensitive individuals during exertion."
        : aqi > 50
          ? "Air quality is acceptable, though sensitive groups should stay cautious."
          : "Air quality is favorable for most outdoor activity.",
    recommendation:
      aqi > 100
        ? "Monitor air quality and reduce outdoor exertion if sensitive."
        : aqi > 50
          ? "Sensitive individuals should consider limiting prolonged exertion."
          : "Great conditions for outdoor activity.",
  });

  return insights;
}

// ---- Recommendations -------------------------------------------------------

function buildRecommendations(summary: Record<MetricKey, MetricSummary>, risks: RiskAssessment[], stabilityScore: number): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const uvMax = summary.uvIndex.max;
  const temp = summary.temperature.current;
  const aqi = summary.airQuality.current;
  const wind = summary.windSpeed.current;
  const hum = summary.humidity.current;

  if (uvMax >= 7) {
    recommendations.push({
      id: "sun",
      metric: "UV",
      title: "Reduce prolonged outdoor exposure",
      description: `UV index is reaching ${uvMax.toFixed(1)}. Limit sun exposure between mid-morning and late afternoon, especially around peak sunlight hours.`,
      severity: "warning",
    });
  }
  if (temp >= 32) {
    recommendations.push({
      id: "hydrate",
      metric: "Heat",
      title: "Increase hydration",
      description: `Temperatures are reaching ${temp.toFixed(1)}°C. Drink water regularly and schedule outdoor activity for cooler parts of the day.`,
      severity: "warning",
    });
  }
  if (aqi > 100) {
    recommendations.push({
      id: "air",
      metric: "Air Quality",
      title: "Monitor air quality",
      description: `AQI is ${aqi.toFixed(0)}. Sensitive individuals should reduce prolonged outdoor exertion and keep windows closed during peaks.`,
      severity: "warning",
    });
  }
  if (stabilityScore >= 45) {
    recommendations.push({
      id: "weather",
      metric: "Stability",
      title: "Prepare for changing weather",
      description: "Rising atmospheric instability suggests shifting conditions. Check forecasts before planning outdoor activity.",
      severity: "info",
    });
  }
  if (wind >= 20) {
    recommendations.push({
      id: "wind",
      metric: "Wind",
      title: "Secure outdoor items",
      description: `Winds may reach ${summary.windSpeed.max.toFixed(1)} km/h. Secure loose items and exercise caution with high-profile vehicles.`,
      severity: "warning",
    });
  }
  if (hum > 70) {
    recommendations.push({
      id: "humidity",
      metric: "Humidity",
      title: "Manage indoor humidity",
      description: `Humidity is ${hum.toFixed(0)}%. Use ventilation or a dehumidifier and keep hydrated to stay comfortable.`,
      severity: "info",
    });
  }
  if (hum < 30) {
    recommendations.push({
      id: "dry",
      metric: "Humidity",
      title: "Protect against dryness",
      description: `Humidity is ${hum.toFixed(0)}%. Keep hydrated and consider humidifying indoor spaces.`,
      severity: "info",
    });
  }

  // Fallback when conditions are broadly favorable.
  if (recommendations.length === 0) {
    const lowestRisk = risks.reduce((a, b) => (a.score <= b.score ? a : b));
    recommendations.push({
      id: "favorable",
      metric: lowestRisk.label,
      title: "Conditions are favorable",
      description: `Risk is lowest for ${lowestRisk.label.toLowerCase()}. Current conditions support typical outdoor activity with minimal precautions.`,
      severity: "good",
    });
  }

  return recommendations;
}

// ---- Trend intelligence ----------------------------------------------------

function classifyTrend(key: MetricKey, readings: EnvironmentalReading[]): TrendInfo {
  const values = readings.map((r) => r[key]);
  const half = Math.max(1, Math.floor(values.length / 2));
  const firstAvg = mean(values.slice(0, half));
  const lastAvg = mean(values.slice(half));
  const delta = lastAvg - firstAvg;
  const volatility = stdDev(values);
  const threshold = TREND_THRESHOLDS[key];
  const noiseFloor = TREND_NOISE_FLOOR[key];

  let classification: TrendClassification;
  if (volatility > Math.max(noiseFloor, Math.abs(delta) * 1.5)) {
    classification = "Fluctuating";
  } else if (delta > threshold) {
    classification = "Increasing";
  } else if (delta < -threshold) {
    classification = "Decreasing";
  } else {
    classification = "Stable";
  }

  const label = TREND_METRICS.find((m) => m.key === key);
  const sign = delta >= 0 ? "+" : "";
  return {
    id: key,
    label: label?.label ?? key,
    classification,
    delta: round1(delta),
    deltaLabel: `${sign}${delta.toFixed(1)}${label?.unit ?? ""}`,
    unit: label?.unit ?? "",
  };
}

function buildTrendSummary(trends: TrendInfo[]): string {
  const increasing = trends.filter((t) => t.classification === "Increasing");
  const decreasing = trends.filter((t) => t.classification === "Decreasing");
  const fluctuating = trends.filter((t) => t.classification === "Fluctuating");
  const stable = trends.filter((t) => t.classification === "Stable");

  if (increasing.length === 0 && decreasing.length === 0 && fluctuating.length === 0) {
    return "All monitored metrics remained stable across the period, indicating consistent environmental conditions.";
  }

  const parts: string[] = [];
  if (increasing.length > 0) {
    parts.push(`${joinLabels(increasing)} trended upward`);
  }
  if (decreasing.length > 0) {
    parts.push(`${joinLabels(decreasing)} trended downward`);
  }
  if (fluctuating.length > 0) {
    parts.push(`${joinLabels(fluctuating)} fluctuated noticeably`);
  }
  if (stable.length > 0) {
    parts.push(`${joinLabels(stable)} remained stable`);
  }
  return `${parts.join(" while ")} across the analysis window.`;
}

function joinLabels(trends: TrendInfo[]): string {
  const names = trends.map((t) => t.label.toLowerCase());
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ---- Confidence & explanation ---------------------------------------------

function buildConfidence(readings: EnvironmentalReading[], dataAgeMinutes: number): ConfidenceInfo {
  const sampleCount = readings.length;
  const penalties: { label: string; points: number }[] = [];

  if (dataAgeMinutes > 120) penalties.push({ label: "Data age", points: 15 });
  if (sampleCount < 20) penalties.push({ label: "Sample count", points: 10 });

  const missing = readings.filter(
    (r) =>
      !Number.isFinite(r.temperature) ||
      !Number.isFinite(r.humidity) ||
      !Number.isFinite(r.uvIndex) ||
      !Number.isFinite(r.airQuality)
  ).length;
  if (missing > 0) penalties.push({ label: "Missing readings", points: 8 * missing });

  const base = 96;
  const deducted = penalties.reduce((sum, p) => sum + p.points, 0);
  const percentage = Math.max(60, Math.min(99, base - deducted));

  const level: ConfidenceInfo["level"] = percentage >= 85 ? "High" : percentage >= 70 ? "Medium" : "Low";
  const factors = [
    `${sampleCount} samples analyzed`,
    dataAgeMinutes <= 2 ? "Data is fresh (less than 2 minutes old)" : `Data age ${dataAgeMinutes} minutes`,
    missing === 0 ? "No missing readings detected" : `${missing} missing reading(s)`,
    "Sensor reliability assumed high (simulated feed)",
  ];

  return {
    percentage,
    level,
    explanation:
      level === "High"
        ? "Confidence is high because the dataset is fresh, complete and internally consistent."
        : level === "Medium"
          ? "Confidence is moderate due to data age or sample limitations."
          : "Confidence is low; treat conclusions as provisional.",
    factors,
  };
}

function buildFactors(risks: RiskAssessment[], trends: TrendInfo[]): ExplanationFactor[] {
  const riskMap: Record<string, string> = {
    heat: "Temperature is a primary driver of heat-stress and hydration guidance.",
    air: "Air quality influences outdoor-exertion guidance and health advisories.",
    uv: "UV exposure drives sun-safety recommendations.",
    humidity: "Humidity affects perceived heat and comfort assessments.",
    stability: "Atmospheric stability shapes the short-term weather outlook.",
  };

  return risks.map((risk) => ({
    id: risk.id,
    label: risk.label,
    detail: riskMap[risk.id] ?? risk.explanation,
    weight: risk.score,
  })).concat([
    {
      id: "trends",
      label: "Historical Trends",
      detail: `Trend intelligence across ${trends.length} metrics (${trends.map((t) => t.classification.toLowerCase()).join(", ")}).`,
      weight: Math.round(mean(trends.map((t) => (t.classification === "Stable" ? 25 : 60)))),
    },
  ]);
}

// ---- Public API ------------------------------------------------------------

/**
 * Generates a full environmental intelligence analysis from an analytics
 * result. Kept pure so it can be reused by tests and by a future real-time
 * ESP32 pipeline without UI changes.
 */
export function generateEnvironmentalIntelligence(analytics: AnalyticsResult): AIAnalysis {
  const { readings, summary, location } = analytics;

  const heat = heatRisk(summary);
  const air = airQualityRisk(summary);
  const uv = uvRisk(summary);
  const humidity = humidityRisk(summary);
  const stability = stabilityRisk(readings);
  const risks: RiskAssessment[] = [heat, air, uv, humidity, stability];

  const overallRiskScore = Math.round(
    heat.score * RISK_WEIGHTS.heat +
      air.score * RISK_WEIGHTS.air +
      uv.score * RISK_WEIGHTS.uv +
      humidity.score * RISK_WEIGHTS.humidity +
      stability.score * RISK_WEIGHTS.stability
  );
  const overallRiskLevel = riskLevelFromScore(overallRiskScore);

  const insights = buildInsights(summary);
  const recommendations = buildRecommendations(summary, risks, stability.score);
  const trends = TREND_METRICS.map((m) => classifyTrend(m.key, readings));
  const trendSummary = buildTrendSummary(trends);

  const lastReadingMs = new Date(readings[readings.length - 1].timestamp).getTime();
  const dataAgeMinutes = Math.max(0, Math.floor((Date.now() - lastReadingMs) / 60000));
  const confidence = buildConfidence(readings, dataAgeMinutes);
  const factors = buildFactors(risks, trends);

  return {
    generatedAt: new Date().toISOString(),
    location,
    dataSource: INTELLIGENCE_SOURCE,
    dataAgeMinutes,
    sampleCount: readings.length,
    range: analytics.range,
    overallRiskScore,
    overallRiskLevel,
    summary: buildSummary(overallRiskLevel, risks),
    insights,
    risks,
    recommendations,
    trends,
    trendSummary,
    confidence,
    factors,
  };
}

/**
 * Data access entry point for the AI Intelligence UI. Reuses the analytics
 * data layer (7-day window by default for richer trend detection). The UI only
 * ever consumes this single function, so swapping the mock data for real
 * ESP32/backend data never requires touching the page components.
 */
export async function getEnvironmentalIntelligence(range: TimeRange = "7d"): Promise<AIAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY));
  const analytics = await getEnvironmentalAnalytics(range);
  return generateEnvironmentalIntelligence(analytics);
}