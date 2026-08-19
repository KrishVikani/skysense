import type {
  AnalyticsResult,
  AQICategory,
  EnvironmentalReading,
  Insight,
  MetricKey,
  MetricSummary,
  TimeRange,
  WindSummary,
} from "./types";

const UNITS: Record<MetricKey, string> = {
  temperature: "°C",
  humidity: "%",
  windSpeed: "km/h",
  uvIndex: "",
  airQuality: "",
  pressure: " hPa",
  rainfall: " mm",
};

// |delta| thresholds below which a metric is considered "stable" for a period.
const TREND_THRESHOLDS: Record<MetricKey, number> = {
  temperature: 0.3,
  humidity: 1.5,
  windSpeed: 0.8,
  uvIndex: 0.3,
  airQuality: 3,
  pressure: 0.5,
  rainfall: 0.3,
};

const ALL_METRICS: MetricKey[] = [
  "temperature",
  "humidity",
  "windSpeed",
  "uvIndex",
  "airQuality",
  "pressure",
  "rainfall",
];

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = mean(values.map((v) => (v - avg) * (v - avg)));
  return Math.sqrt(variance);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function aqiCategoryOf(aqi: number): AQICategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Poor";
  return "Hazardous";
}

export function uvRiskOf(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very High";
  return "Extreme";
}

function metricSummary(readings: EnvironmentalReading[], key: MetricKey): MetricSummary {
  const values = readings.map((r) => r[key]);
  const current = values[values.length - 1];
  const average = round1(mean(values));
  const min = Math.min(...values);
  const max = Math.max(...values);

  const half = Math.max(1, Math.floor(values.length / 2));
  const firstAvg = mean(values.slice(0, half));
  const lastAvg = mean(values.slice(half));
  const delta = lastAvg - firstAvg;
  const trend: MetricSummary["trend"] =
    Math.abs(delta) < TREND_THRESHOLDS[key] ? "stable" : delta > 0 ? "up" : "down";

  return {
    current,
    average,
    min,
    max,
    trend,
    trendDelta: round1(delta),
    unit: UNITS[key],
  };
}

function windSummary(readings: EnvironmentalReading[]): WindSummary {
  const speeds = readings.map((r) => r.windSpeed);
  const averageSpeed = round1(mean(speeds));
  const maxSpeed = Math.max(...speeds);

  // Bin directions into 16 compass sectors and pick the most frequent.
  const bins = new Array<number>(16).fill(0);
  for (const r of readings) {
    const index = Math.round((((r.windDirection % 360) + 360) % 360) / 22.5) % 16;
    bins[index] += 1;
  }
  const dominantIndex = bins.indexOf(Math.max(...bins));
  const dominantDirectionDeg = dominantIndex * 22.5;

  return {
    averageSpeed,
    maxSpeed,
    dominantDirectionDeg,
    dominantDirectionLabel: COMPASS[dominantIndex],
  };
}

function environmentalScore(readings: EnvironmentalReading[], summary: Record<MetricKey, MetricSummary>): AnalyticsResult["score"] {
  const avgTemp = summary.temperature.average;
  const avgHumidity = summary.humidity.average;
  const avgAqi = summary.airQuality.average;
  const maxUv = summary.uvIndex.max;

  const temperature = Math.round(clampScore(100 - Math.abs(avgTemp - 24) * 3));
  const humidity = Math.round(clampScore(100 - Math.abs(avgHumidity - 55) * 1.2));
  const airQuality = Math.round(clampScore(100 - (avgAqi - 30) * 0.8));
  const uv = Math.round(clampScore(100 - maxUv * 8));

  const overall = Math.round((temperature + humidity + airQuality + uv) / 4);
  const label =
    overall >= 80
      ? "Good environmental conditions overall."
      : overall >= 60
        ? "Moderate environmental conditions overall."
        : overall >= 40
          ? "Below-average environmental conditions."
          : "Poor environmental conditions.";

  return {
    overall,
    breakdown: {
      temperature,
      humidity,
      airQuality,
      uvIndex: uv,
      windSpeed: 0,
      pressure: 0,
      rainfall: 0,
    },
    label,
  };
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function buildInsights(readings: EnvironmentalReading[], summary: Record<MetricKey, MetricSummary>, aqiCategory: AQICategory): Insight[] {
  const insights: Insight[] = [];
  const temp = summary.temperature;
  const humidity = summary.humidity;
  const wind = summary.windSpeed;
  const uv = summary.uvIndex;
  const aqi = summary.airQuality;

  // Temperature trend.
  const tempDelta = Math.abs(temp.trendDelta);
  insights.push({
    id: "temperature",
    icon: "temperature",
    tone: temp.trend === "up" ? "warning" : temp.trend === "down" ? "info" : "info",
    title: temp.trend === "up" ? "Temperature rising" : temp.trend === "down" ? "Temperature easing" : "Temperature stable",
    content:
      temp.trend === "up"
        ? `Temperature has increased by ${tempDelta.toFixed(1)}°C compared with the earlier part of this period.`
        : temp.trend === "down"
          ? `Temperature has decreased by ${tempDelta.toFixed(1)}°C compared with the earlier part of this period.`
          : `Temperature remained relatively stable, within ${tempDelta.toFixed(1)}°C across the period.`,
  });

  // Humidity stability.
  const humiditySpread = stdDev(readings.map((r) => r.humidity));
  insights.push({
    id: "humidity",
    icon: "humidity",
    tone: humiditySpread < 6 ? "good" : "info",
    title: humiditySpread < 6 ? "Humidity steady" : "Humidity fluctuating",
    content:
      humiditySpread < 6
        ? `Humidity remained relatively stable, hovering near ${humidity.average}% on average.`
        : `Humidity varied by ±${humiditySpread.toFixed(1)}% across the period, most active around rain events.`,
  });

  // UV midday peak.
  const peakUv = readings.reduce((a, b) => (b.uvIndex > a.uvIndex ? b : a), readings[0]);
  const peakHour = new Date(peakUv.timestamp).getHours();
  insights.push({
    id: "uv",
    icon: "uv",
    tone: uv.max >= 8 ? "warning" : "info",
    title: uv.max >= 8 ? "Strong UV exposure" : "Moderate UV exposure",
    content:
      uv.max >= 8
        ? `UV levels peaked during midday (around ${peakHour}:00) reaching ${uv.max.toFixed(1)}. Sun protection is advised.`
        : `UV levels were moderate, peaking at ${uv.max.toFixed(1)} around ${peakHour}:00.`,
  });

  // Wind afternoon comparison.
  const morning = mean(readings.filter((r) => hourOf(r) < 12).map((r) => r.windSpeed));
  const afternoon = mean(readings.filter((r) => hourOf(r) >= 12).map((r) => r.windSpeed));
  const windDelta = afternoon - morning;
  insights.push({
    id: "wind",
    icon: "wind",
    tone: windDelta > 2 ? "info" : "good",
    title: windDelta > 2 ? "Afternoon breeze" : "Wind conditions calm",
    content:
      windDelta > 2
        ? `Wind speed increased during the afternoon, averaging ${afternoon.toFixed(1)} km/h versus ${morning.toFixed(1)} km/h in the morning.`
        : `Wind remained calm, averaging ${wind.average} km/h with a max of ${wind.max.toFixed(1)} km/h.`,
  });

  // Air quality.
  insights.push({
    id: "air",
    icon: "air",
    tone: aqiCategory === "Good" ? "good" : aqiCategory === "Moderate" ? "info" : "warning",
    title: `Air quality ${aqiCategory.toLowerCase()}`,
    content:
      aqiCategory === "Good"
        ? `Air quality remained within the good range, averaging ${aqi.average} AQI. Great for outdoor activity.`
        : aqiCategory === "Moderate"
          ? `Air quality remained within the moderate range, averaging ${aqi.average} AQI. Sensitive groups should limit exertion.`
          : `Air quality trended poor, averaging ${aqi.average} AQI. Limit prolonged outdoor exposure.`,
  });

  // Rainfall.
  const totalRain = round1(readings.reduce((sum, r) => sum + r.rainfall, 0));
  if (totalRain > 0.5) {
    insights.push({
      id: "rain",
      icon: "rain",
      tone: "info",
      title: "Rainfall recorded",
      content: `Accumulated ${totalRain} mm of rainfall across the period.`,
    });
  }

  return insights;
}

function hourOf(reading: EnvironmentalReading): number {
  return new Date(reading.timestamp).getHours();
}

/**
 * Derives all analytics from a series of readings. Kept pure so it can be
 * reused by tests and by a future real-time pipeline.
 */
export function computeAnalytics(readings: EnvironmentalReading[], range: TimeRange): AnalyticsResult {
  if (readings.length === 0) {
    throw new Error("No environmental readings available.");
  }

  const summary = {} as Record<MetricKey, MetricSummary>;
  for (const key of ALL_METRICS) {
    summary[key] = metricSummary(readings, key);
  }

  const wind = windSummary(readings);
  const aqiCategory = aqiCategoryOf(summary.airQuality.current);
  const uvRisk = uvRiskOf(summary.uvIndex.max);
  const score = environmentalScore(readings, summary);
  const insights = buildInsights(readings, summary, aqiCategory);

  return {
    range,
    readings,
    summary,
    wind,
    uvRisk,
    aqiCategory,
    score,
    insights,
    location: readings[readings.length - 1].location ?? "Unknown",
    dataSource: readings[readings.length - 1].source ?? "Unknown",
    lastUpdated: readings[readings.length - 1].timestamp,
  };
}