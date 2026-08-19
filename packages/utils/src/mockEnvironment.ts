import type { EnvironmentData, WeatherForecast, ActivitySuitability, AIInsight, Alert, AQIData, HistoricalDataPoint, EnvironmentalScore } from "@skysense/domain-types";

export const mockEnvironmentData: EnvironmentData = {
  temperature: 32,
  humidity: 65,
  windSpeed: 12,
  uvIndex: 8,
  aqi: "Moderate",
  aqiDescription: "Air quality is acceptable for most people",
  timestamp: new Date().toISOString(),
  location: "Ahmedabad, India",
};

const forecastDay = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const mockWeatherForecast: WeatherForecast[] = [
  { date: forecastDay(0), temperature: { min: 26, max: 35 }, humidity: 60, windSpeed: 10, uvIndex: 9, condition: "Sunny", precipitationChance: 5 },
  { date: forecastDay(1), temperature: { min: 27, max: 34 }, humidity: 68, windSpeed: 12, uvIndex: 8, condition: "Partly Cloudy", precipitationChance: 15 },
  { date: forecastDay(2), temperature: { min: 25, max: 33 }, humidity: 72, windSpeed: 15, uvIndex: 7, condition: "Cloudy", precipitationChance: 25 },
  { date: forecastDay(3), temperature: { min: 26, max: 34 }, humidity: 65, windSpeed: 11, uvIndex: 8, condition: "Sunny", precipitationChance: 10 },
  { date: forecastDay(4), temperature: { min: 27, max: 35 }, humidity: 62, windSpeed: 9, uvIndex: 9, condition: "Sunny", precipitationChance: 5 },
  { date: forecastDay(5), temperature: { min: 26, max: 34 }, humidity: 70, windSpeed: 13, uvIndex: 7, condition: "Thunderstorms", precipitationChance: 60 },
  { date: forecastDay(6), temperature: { min: 25, max: 32 }, humidity: 75, windSpeed: 14, uvIndex: 6, condition: "Rain", precipitationChance: 80 },
];

export const mockActivitySuitability: ActivitySuitability[] = [
  { activity: "Walking", score: 85, suitability: "Good", bestTime: "6:30 AM - 9:00 AM", recommendations: ["Stay hydrated", "Wear light clothing", "Apply sunscreen"] },
  { activity: "Running", score: 72, suitability: "Moderate", bestTime: "6:00 AM - 8:00 AM", recommendations: ["Run early morning", "Carry water", "Monitor heart rate"] },
  { activity: "Cycling", score: 68, suitability: "Moderate", bestTime: "7:00 AM - 9:00 AM", recommendations: ["Wear helmet", "Choose shaded routes", "Check air quality"] },
  { activity: "Yoga", score: 90, suitability: "Excellent", bestTime: "6:00 AM - 7:30 AM", recommendations: ["Outdoor session", "Morning breeze", "Breathing exercises"] },
  { activity: "Swimming", score: 88, suitability: "Excellent", bestTime: "4:00 PM - 6:00 PM", recommendations: ["Indoor pool preferred", "UV protection", "Evening cool down"] },
  { activity: "Hiking", score: 60, suitability: "Moderate", bestTime: "6:00 AM - 10:00 AM", recommendations: ["Start early", "Carry electrolytes", "Check trail conditions"] },
];

export const mockAIInsights: AIInsight[] = [
  {
    id: "1",
    type: "summary",
    title: "Daily Environmental Summary",
    content: "Warm and moderately humid today. Outdoor activity is most comfortable before 10 AM and after 6 PM. UV exposure is stronger around midday, so consider sun protection.",
    priority: "medium",
    timestamp: new Date().toISOString(),
    actionable: true,
  },
  {
    id: "2",
    type: "recommendation",
    title: "Hydration Reminder",
    content: "With temperatures reaching 35°C and humidity at 65%, your body loses fluids faster. Aim for 3-4 liters of water today.",
    priority: "high",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    actionable: true,
  },
  {
    id: "3",
    type: "alert",
    title: "UV Index Alert",
    content: "UV index will reach 9 (Very High) around 1 PM. Limit direct sun exposure between 11 AM - 3 PM. Wear SPF 50+ sunscreen.",
    priority: "high",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    actionable: true,
  },
  {
    id: "4",
    type: "trend",
    title: "Air Quality Trend",
    content: "AQI has improved from 'Moderate' to 'Good' over the past 3 days. Great time for outdoor activities!",
    priority: "low",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    actionable: false,
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "uv",
    severity: "warning",
    title: "High UV Index",
    message: "UV index expected to reach 9 (Very High) today. Take precautions.",
    timestamp: new Date().toISOString(),
    acknowledged: false,
  },
  {
    id: "2",
    type: "air-quality",
    severity: "info",
    title: "Air Quality Update",
    message: "AQI currently at 72 (Moderate). Sensitive individuals should limit prolonged outdoor exertion.",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    acknowledged: false,
  },
];

export const mockAQIData: AQIData[] = [
  { value: 45, category: "Good", dominantPollutant: "O3", timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
  { value: 52, category: "Good", dominantPollutant: "PM2.5", timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
  { value: 68, category: "Moderate", dominantPollutant: "PM2.5", timestamp: new Date(Date.now() - 86400000).toISOString() },
  { value: 72, category: "Moderate", dominantPollutant: "O3", timestamp: new Date().toISOString() },
];

export const mockHistoricalData: HistoricalDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
  timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
  temperature: 28 + Math.sin(i * 0.5) * 4,
  humidity: 55 + Math.cos(i * 0.3) * 15,
  aqi: 40 + Math.random() * 35,
  uvIndex: Math.max(0, Math.sin((i - 6) * 0.4) * 8),
}));

export function calculateScore(environment: EnvironmentData, _preferences: Record<string, unknown>): number {
  const tempScore = Math.max(0, 100 - Math.abs(environment.temperature - 22) * 3);
  const humidityScore = Math.max(0, 100 - Math.abs(environment.humidity - 50) * 1.5);
  const aqiScores = { Good: 100, Moderate: 70, Poor: 40, Hazardous: 10 };
  const aqiScore = aqiScores[environment.aqi];
  const uvScore = environment.uvIndex ? Math.max(0, 100 - environment.uvIndex * 10) : 80;
  
  return Math.round((tempScore + humidityScore + aqiScore + uvScore) / 4);
}

export function calculateEnvironmentalScore(environment: EnvironmentData): EnvironmentalScore {
  const tempScore = Math.max(0, 100 - Math.abs(environment.temperature - 22) * 3);
  const humidityScore = Math.max(0, 100 - Math.abs(environment.humidity - 50) * 1.5);
  const aqiScores = { Good: 100, Moderate: 70, Poor: 40, Hazardous: 10 };
  const aqiScore = aqiScores[environment.aqi];
  const uvScore = environment.uvIndex ? Math.max(0, 100 - environment.uvIndex * 10) : 80;
  
  const overall = Math.round((tempScore + humidityScore + aqiScore + uvScore) / 4);
  
  let grade: EnvironmentalScore["grade"] = "F";
  if (overall >= 90) grade = "A+";
  else if (overall >= 80) grade = "A";
  else if (overall >= 70) grade = "B";
  else if (overall >= 60) grade = "C";
  else if (overall >= 50) grade = "D";
  
  return {
    overall,
    breakdown: {
      airQuality: aqiScore,
      temperature: Math.round(tempScore),
      humidity: Math.round(humidityScore),
      uv: Math.round(uvScore),
    },
    grade,
  };
}

export function generateMockEnvironmentData(variation = 0.1): EnvironmentData {
  const base = mockEnvironmentData;
  return {
    ...base,
    temperature: Math.round(base.temperature + (Math.random() - 0.5) * base.temperature * variation * 2),
    humidity: Math.round(Math.min(100, Math.max(0, base.humidity + (Math.random() - 0.5) * base.humidity * variation * 2))),
    windSpeed: Math.round(base.windSpeed + (Math.random() - 0.5) * base.windSpeed * variation * 2),
    uvIndex: base.uvIndex ? Math.max(0, Math.min(15, Math.round(base.uvIndex + (Math.random() - 0.5) * base.uvIndex * variation * 2))) : undefined,
    aqi: ["Good", "Moderate", "Poor"][Math.floor(Math.random() * 3)] as EnvironmentData["aqi"],
    timestamp: new Date().toISOString(),
  };
}

export class MockEnvironmentProvider {
  private listeners: Set<(data: EnvironmentData) => void> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentData: EnvironmentData = mockEnvironmentData;

  subscribe(listener: (data: EnvironmentData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCurrentData(): EnvironmentData {
    return this.currentData;
  }

  startUpdates(intervalMs = 30000): void {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.currentData = generateMockEnvironmentData();
      this.listeners.forEach(listener => listener(this.currentData));
    }, intervalMs);
  }

  stopUpdates(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async fetchForecast(): Promise<WeatherForecast[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockWeatherForecast;
  }

  async fetchActivitySuitability(): Promise<ActivitySuitability[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockActivitySuitability;
  }

  async fetchAIInsights(): Promise<AIInsight[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockAIInsights;
  }

  async fetchAlerts(): Promise<Alert[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockAlerts;
  }

  async fetchAQIHistory(): Promise<AQIData[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAQIData;
  }

  async fetchHistoricalData(): Promise<HistoricalDataPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockHistoricalData;
  }
}

export const mockEnvironmentProvider = new MockEnvironmentProvider();