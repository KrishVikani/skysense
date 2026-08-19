import { z } from "zod";
import type {
  EnvironmentData,
  WeatherForecast,
  ActivitySuitability,
  AIInsight,
  UserProfile,
  Alert,
  AQIData,
  HistoricalDataPoint,
  EnvironmentalScore,
} from "@skysense/domain-types";

export const environmentDataSchema: z.ZodType<EnvironmentData> = z.object({
  temperature: z.number().min(-50).max(60),
  humidity: z.number().min(0).max(100),
  windSpeed: z.number().min(0).max(200),
  uvIndex: z.number().min(0).max(15).optional(),
  aqi: z.enum(["Good", "Moderate", "Poor", "Hazardous"]),
  aqiDescription: z.string().min(1),
  timestamp: z.string().datetime(),
  location: z.string().min(1),
});

export const weatherForecastSchema: z.ZodType<WeatherForecast> = z.object({
  date: z.string().date(),
  temperature: z.object({
    min: z.number().min(-50).max(60),
    max: z.number().min(-50).max(60),
  }),
  humidity: z.number().min(0).max(100),
  windSpeed: z.number().min(0).max(200),
  uvIndex: z.number().min(0).max(15),
  condition: z.string().min(1),
  precipitationChance: z.number().min(0).max(100),
});

export const activitySuitabilitySchema: z.ZodType<ActivitySuitability> = z.object({
  activity: z.string().min(1),
  score: z.number().min(0).max(100),
  suitability: z.enum(["Excellent", "Good", "Moderate", "Poor"]),
  bestTime: z.string().min(1),
  recommendations: z.array(z.string()),
});

export const aiInsightSchema: z.ZodType<AIInsight> = z.object({
  id: z.string().uuid(),
  type: z.enum(["summary", "recommendation", "alert", "trend"]),
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  timestamp: z.string().datetime(),
  actionable: z.boolean(),
});

export const userProfileSchema: z.ZodType<UserProfile> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  location: z.string().min(1),
  preferences: z.object({
    units: z.enum(["metric", "imperial"]),
    notifications: z.boolean(),
    theme: z.enum(["light", "dark", "system"]),
  }),
});

export const alertSchema: z.ZodType<Alert> = z.object({
  id: z.string().uuid(),
  type: z.enum(["weather", "air-quality", "uv", "health"]),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.string().datetime(),
  acknowledged: z.boolean(),
});

export const aqiDataSchema: z.ZodType<AQIData> = z.object({
  value: z.number().min(0).max(500),
  category: z.enum(["Good", "Moderate", "Poor", "Hazardous"]),
  dominantPollutant: z.string().min(1),
  timestamp: z.string().datetime(),
});

export const historicalDataPointSchema: z.ZodType<HistoricalDataPoint> = z.object({
  timestamp: z.string().datetime(),
  temperature: z.number().min(-50).max(60),
  humidity: z.number().min(0).max(100),
  aqi: z.number().min(0).max(500),
  uvIndex: z.number().min(0).max(15),
});

export const environmentalScoreSchema: z.ZodType<EnvironmentalScore> = z.object({
  overall: z.number().min(0).max(100),
  breakdown: z.object({
    airQuality: z.number().min(0).max(100),
    temperature: z.number().min(0).max(100),
    humidity: z.number().min(0).max(100),
    uv: z.number().min(0).max(100),
  }),
  grade: z.enum(["A+", "A", "B", "C", "D", "F"]),
});

export const environmentDataArraySchema = z.array(environmentDataSchema);
export const weatherForecastArraySchema = z.array(weatherForecastSchema);
export const activitySuitabilityArraySchema = z.array(activitySuitabilitySchema);
export const aiInsightArraySchema = z.array(aiInsightSchema);
export const alertArraySchema = z.array(alertSchema);
export const aqiDataArraySchema = z.array(aqiDataSchema);
export const historicalDataPointArraySchema = z.array(historicalDataPointSchema);

export function validateEnvironmentData(data: unknown): EnvironmentData {
  return environmentDataSchema.parse(data);
}

export function validateWeatherForecast(data: unknown): WeatherForecast {
  return weatherForecastSchema.parse(data);
}

export function validateActivitySuitability(data: unknown): ActivitySuitability {
  return activitySuitabilitySchema.parse(data);
}

export function validateAIInsight(data: unknown): AIInsight {
  return aiInsightSchema.parse(data);
}

export function validateUserProfile(data: unknown): UserProfile {
  return userProfileSchema.parse(data);
}

export function validateAlert(data: unknown): Alert {
  return alertSchema.parse(data);
}

export function validateAQIData(data: unknown): AQIData {
  return aqiDataSchema.parse(data);
}

export function validateHistoricalDataPoint(data: unknown): HistoricalDataPoint {
  return historicalDataPointSchema.parse(data);
}

export function validateEnvironmentalScore(data: unknown): EnvironmentalScore {
  return environmentalScoreSchema.parse(data);
}

export function safeValidateEnvironmentData(data: unknown): { success: true; data: EnvironmentData } | { success: false; error: z.ZodError } {
  const result = environmentDataSchema.safeParse(data);
  return result;
}