export interface EnvironmentData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  uvIndex?: number;
  aqi: "Good" | "Moderate" | "Poor" | "Hazardous";
  aqiDescription: string;
  timestamp: string;
  location: string;
}

export interface WeatherForecast {
  date: string;
  temperature: { min: number; max: number };
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  condition: string;
  precipitationChance: number;
}

export interface ActivitySuitability {
  activity: string;
  score: number;
  suitability: "Excellent" | "Good" | "Moderate" | "Poor";
  bestTime: string;
  recommendations: string[];
}

export interface AIInsight {
  id: string;
  type: "summary" | "recommendation" | "alert" | "trend";
  title: string;
  content: string;
  priority: "high" | "medium" | "low";
  timestamp: string;
  actionable: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  location: string;
  preferences: {
    units: "metric" | "imperial";
    notifications: boolean;
    theme: "light" | "dark" | "system";
  };
}

export interface Alert {
  id: string;
  type: "weather" | "air-quality" | "uv" | "health";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export type AQICategory = "Good" | "Moderate" | "Poor" | "Hazardous";

export interface AQIData {
  value: number;
  category: AQICategory;
  dominantPollutant: string;
  timestamp: string;
}

export interface HistoricalDataPoint {
  timestamp: string;
  temperature: number;
  humidity: number;
  aqi: number;
  uvIndex: number;
}

export interface EnvironmentalScore {
  overall: number;
  breakdown: {
    airQuality: number;
    temperature: number;
    humidity: number;
    uv: number;
  };
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
}