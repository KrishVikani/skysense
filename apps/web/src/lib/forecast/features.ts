import type { EnvironmentalReading } from "@/lib/environmental/types";
import type { ForecastDirection, ForecastFeatures, MetricTrend } from "./types";

/**
 * Deterministic feature extraction for the forecasting engine.
 *
 * Every function here is a pure function of the readings — given the same
 * history it always produces the same features (no randomness, no external
 * calls). Missing values are tracked per-metric and never converted to zero.
 */

const METRICS = [
  "temperature",
  "humidity",
  "pressure",
  "windSpeed",
  "windDirection",
  "airQuality",
  "uvIndex",
  "rainfall",
] as const;

/** Per-metric directional dead-band (units per hour) to ignore noise. */
const DIRECTION_DEADBANDS: Record<string, number> = {
  temperature: 0.2,
  humidity: 0.8,
  pressure: 0.3,
  windSpeed: 0.5,
  airQuality: 2,
  uvIndex: 0.2,
  rainfall: 0.2,
  windDirection: 8,
};

/** Plausible physical bounds per metric (mirrors the device sensor ranges). */
const METRIC_BOUNDS: Record<string, [number, number]> = {
  temperature: [-40, 60],
  humidity: [0, 100],
  pressure: [850, 1100],
  windSpeed: [0, 200],
  airQuality: [0, 500],
  uvIndex: [0, 12],
  rainfall: [0, 1000],
  windDirection: [0, 360],
};

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number {
  const m = mean(values);
  if (m === null || values.length < 2) return 0;
  const variance = values.reduce((a, b) => a + (b - m) * (b - m), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Least-squares slope of value vs time (hours since first sample). Handles
 * unevenly spaced timestamps. Returns 0 when fewer than 2 valid points exist.
 */
export function slopePerHour(
  hours: number[],
  values: number[]
): { slope: number; intercept: number } {
  const n = Math.min(hours.length, values.length);
  if (n < 2) return { slope: 0, intercept: 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += hours[i];
    sumY += values[i];
    sumXY += hours[i] * values[i];
    sumXX += hours[i] * hours[i];
  }
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: 0 };
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function directionOf(
  metric: string,
  slope: number,
  hasData: boolean
): ForecastDirection {
  if (!hasData) return "unknown";
  const deadband = DIRECTION_DEADBANDS[metric] ?? 0;
  if (slope > deadband) return "up";
  if (slope < -deadband) return "down";
  return "stable";
}

/** Builds a MetricTrend for one metric from sorted readings. */
export function metricTrend(
  metric: string,
  sorted: EnvironmentalReading[]
): MetricTrend {
  const hours: number[] = [];
  const values: number[] = [];
  let latestValue: number | null = null;
  const startMs = sorted.length > 0 ? new Date(sorted[0].timestamp).getTime() : 0;

  for (const reading of sorted) {
    const value = (reading as unknown as Record<string, unknown>)[metric];
    if (isFiniteNumber(value)) {
      const h = (new Date(reading.timestamp).getTime() - startMs) / 3600000;
      hours.push(h);
      values.push(value);
      latestValue = value;
    }
  }

  const hasData = values.length > 0;
  const { slope } = slopePerHour(hours, values);

  // Short-term rate of change from the most recent third (at least 3 points).
  const shortCount = Math.max(3, Math.floor(values.length / 3));
  const shortStart = hours[hours.length - shortCount] ?? 0;
  const shortHours = hours.slice(-shortCount).map((h) => h - shortStart);
  const shortValues = values.slice(-shortCount);
  const shortSlope = slopePerHour(shortHours, shortValues);

  return {
    metric,
    sampleCount: values.length,
    current: latestValue,
    average: mean(values),
    perHour: Math.round(slope * 1000) / 1000,
    shortTermPerHour: Math.round(shortSlope.slope * 1000) / 1000,
    volatility: Math.round(stdDev(values) * 100) / 100,
    direction: directionOf(metric, slope, hasData),
  };
}

/**
 * Wind direction label from degrees (0–360). Returns null when no data.
 */
export function windDirectionLabel(degrees: number | null): string | null {
  if (degrees === null || !Number.isFinite(degrees)) return null;
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return COMPASS[index];
}

/**
 * Dominant wind direction label using a circular mean of valid samples.
 */
export function dominantWindLabel(sorted: EnvironmentalReading[]): string {
  let sinSum = 0;
  let cosSum = 0;
  let count = 0;
  for (const reading of sorted) {
    const deg = (reading as unknown as Record<string, unknown>).windDirection;
    if (isFiniteNumber(deg)) {
      const rad = ((deg % 360) + 360) % 360 * (Math.PI / 180);
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
      count++;
    }
  }
  if (count === 0) return "Unknown";
  const meanDeg = (Math.atan2(sinSum / count, cosSum / count) * 180) / Math.PI;
  return windDirectionLabel((meanDeg + 360) % 360) ?? "Unknown";
}

/**
 * Environmental rain likelihood (0–100) with explainable contributions.
 *
 * Combines humidity level/rise, pressure level/fall, recent observed rainfall,
 * wind change and instability. This is a trend-derived indicator — NOT a
 * professional precipitation forecast.
 */
export function rainLikelihood(
  humidity: MetricTrend,
  pressure: MetricTrend,
  rainfall: MetricTrend,
  windSpeed: MetricTrend,
  stability: number
): { likelihood: number; contributions: { label: string; points: number; note: string }[] } {
  const contributions: { label: string; points: number; note: string }[] = [];
  let total = 0;

  const humidityLevel = humidity.current ?? 0;
  let points = 0;
  if (humidityLevel >= 70) points = 12;
  else if (humidityLevel >= 60) points = 8;
  else if (humidityLevel >= 50) points = 4;
  total += points;
  contributions.push({
    label: "Humidity",
    points,
    note:
      points > 0
        ? `Humidity is ${Math.round(humidityLevel)}% — the air is ${points >= 12 ? "quite" : "moderately"} saturated.`
        : `Humidity at ${Math.round(humidityLevel)}% is not high enough to strongly favor rain.`,
  });

  points = 0;
  if (humidity.perHour >= 1.5) points = 10;
  else if (humidity.perHour >= 0.8) points = 7;
  else if (humidity.perHour >= 0.3) points = 3;
  total += points;
  contributions.push({
    label: "Humidity rising",
    points,
    note:
      points > 0
        ? `Humidity is rising by ~${humidity.perHour}%/h, increasing rain potential.`
        : "Humidity is not rising significantly.",
  });

  points = 0;
  if (pressure.perHour <= -0.5) points = 10;
  else if (pressure.perHour <= -0.25) points = 7;
  else if (pressure.perHour <= -0.1) points = 3;
  total += points;
  contributions.push({
    label: "Pressure falling",
    points,
    note:
      points > 0
        ? `Pressure is falling by ~${Math.abs(pressure.perHour)} hPa/h, a classic pre-rain signal.`
        : "Pressure is not falling.",
  });

  points = 0;
  if (pressure.current !== null) {
    if (pressure.current <= 1000) points = 8;
    else if (pressure.current <= 1008) points = 5;
  }
  total += points;
  contributions.push({
    label: "Low pressure",
    points,
    note:
      points > 0
        ? `Pressure is low at ${pressure.current?.toFixed?.(1) ?? "?"} hPa, which can favor rain.`
        : "Pressure level is unremarkable.",
  });

  points = 0;
  const recentRain = rainfall.current;
  if (recentRain !== null && recentRain > 0) {
    points = Math.min(15, Math.round(recentRain * 5));
  }
  total += points;
  contributions.push({
    label: "Recent rainfall",
    points,
    note:
      points > 0
        ? `Rainfall was observed recently (${recentRain} mm), keeping the ground/system wet.`
        : "No recent rainfall observed.",
  });

  points = 0;
  if (windSpeed.perHour >= 2) points = 5;
  else if (windSpeed.perHour >= 1) points = 3;
  total += points;
  contributions.push({
    label: "Wind change",
    points,
    note:
      points > 0
        ? "Wind is picking up, which can precede convective rain."
        : "No notable wind change.",
  });

  points = 0;
  if (stability >= 70) points = 6;
  else if (stability >= 50) points = 3;
  total += points;
  contributions.push({
    label: "Instability",
    points,
    note:
      points > 0
        ? "Atmospheric instability is elevated."
        : "Atmospheric conditions appear stable.",
  });

  const likelihood = clamp(Math.round(total), 0, 100);
  return { likelihood, contributions };
}

/**
 * Atmospheric stability index 0–100 (higher = more unstable). Combines
 * pressure and temperature volatility plus sustained directional pressure fall.
 */
export function stabilityIndex(pressure: MetricTrend, temperature: MetricTrend): number {
  const pressureVol = pressure.volatility ?? 0;
  const tempVol = temperature.volatility ?? 0;
  let score = pressureVol * 6 + tempVol * 3;
  if (pressure.perHour <= -0.3) score += 10;
  if (pressure.direction === "down" && pressure.shortTermPerHour <= -0.5) score += 8;
  return clamp(Math.round(score), 0, 100);
}

/** Clamps a projected value into a metric's plausible physical bounds. */
export function clampToBounds(metric: string, value: number): number {
  const bounds = METRIC_BOUNDS[metric];
  if (!bounds) return value;
  return clamp(value, bounds[0], bounds[1]);
}

/**
 * Extracts the full feature set from a reading series. Pure and deterministic.
 * Returns null only when the series is empty.
 */
export function extractFeatures(readings: EnvironmentalReading[]): ForecastFeatures | null {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  if (sorted.length === 0) return null;

  const trends = {} as Record<(typeof METRICS)[number], MetricTrend>;
  for (const metric of METRICS) {
    trends[metric] = metricTrend(metric, sorted);
  }

  const stability = stabilityIndex(trends.pressure, trends.temperature);
  const rain = rainLikelihood(
    trends.humidity,
    trends.pressure,
    trends.rainfall,
    trends.windSpeed,
    stability
  );

  const startMs = new Date(sorted[0].timestamp).getTime();
  const endMs = new Date(sorted[sorted.length - 1].timestamp).getTime();

  return {
    temperature: trends.temperature,
    humidity: trends.humidity,
    pressure: trends.pressure,
    windSpeed: trends.windSpeed,
    windDirection: trends.windDirection,
    airQuality: trends.airQuality,
    uvIndex: trends.uvIndex,
    rainfall: trends.rainfall,
    dominantWindLabel: dominantWindLabel(sorted),
    rainLikelihood: rain.likelihood,
    rainContributions: rain.contributions,
    stability,
    spanHours: Math.round(((endMs - startMs) / 3600000) * 10) / 10,
    sampleCount: sorted.length,
  };
}

export { METRIC_BOUNDS };