import type { WeatherConditionId } from "./types";
import type { WeatherCurrent } from "./types";

/**
 * Generates a short natural-language weather summary strictly from the data a
 * source actually provided — every clause is derived from a real field, and
 * nothing is asserted that the current payload cannot support.
 */

const CONDITION_WORD: Record<WeatherConditionId, string> = {
  sunny: "clear",
  "partly-cloudy": "partly cloudy",
  cloudy: "cloudy",
  rain: "rainy",
  "heavy-rain": "heavily rainy",
  drizzle: "drizzly",
  thunderstorm: "stormy",
  snow: "snowy",
  mist: "misty",
  night: "clear",
};

function temperatureWord(tempC: number): string {
  if (tempC >= 32) return "Hot";
  if (tempC >= 26) return "Warm";
  if (tempC >= 18) return "Mild";
  if (tempC >= 10) return "Cool";
  return "Cold";
}

function windWord(speedKmh: number): string {
  if (speedKmh < 8) return "light winds";
  if (speedKmh < 20) return "gentle breezes";
  if (speedKmh < 35) return "breezy conditions";
  return "strong winds";
}

/** Single-label breeze word (e.g. "Gentle breeze") derived only from wind speed. */
export function windBreezeLabel(speedKmh: number): string {
  if (speedKmh < 8) return "Calm";
  if (speedKmh < 20) return "Gentle breeze";
  if (speedKmh < 35) return "Breezy";
  return "Strong winds";
}

export function summarizeWeather(data: WeatherCurrent): string {
  const temp = Math.round(data.temperature);
  const feels = Math.round(data.feelsLike);
  const condition = data.condition.id === "night" ? "clear" : CONDITION_WORD[data.condition.id];
  const word = temperatureWord(temp).toLowerCase();

  const sentences: string[] = [];

  if (data.condition.id === "night") {
    sentences.push(`It's a clear night with ${windWord(data.windSpeed)}.`);
  } else {
    const timeWord = data.isDay === false ? "tonight" : "today";
    sentences.push(`It's ${word} and ${condition} ${timeWord}, with ${windWord(data.windSpeed)}.`);
  }

  if (Math.abs(feels - temp) >= 2) {
    sentences.push(`It feels like ${feels}° — ${feels > temp ? "a bit warmer" : "a bit cooler"} than the air temperature.`);
  }

  if (data.precipitationProbability != null) {
    if (data.precipitationProbability >= 60) {
      sentences.push("Rain looks likely — consider carrying an umbrella.");
    } else if (data.precipitationProbability >= 35) {
      sentences.push("There's a chance of rain during the day.");
    }
  }

  return sentences.join(" ");
}

export interface WeatherInsight {
  id: string;
  label: string;
  detail: string;
  tone: "accent" | "sky" | "sun" | "muted";
}

/**
 * Small, contextual insights derived ONLY from fields the active source
 * reports. Phrasing avoids unit-specific numbers so the chips read correctly
 * under any user unit preference. Never more than the source can support.
 */
export function weatherInsights(data: WeatherCurrent): WeatherInsight[] {
  const insights: WeatherInsight[] = [];
  const { humidity, windSpeed, visibilityKm, precipitationProbability, uvIndex, feelsLike, temperature } = data;

  if (humidity >= 70) {
    insights.push({ id: "high-humidity", label: "Humid", detail: "Humidity is high — the air feels muggy.", tone: "sky" });
  } else if (humidity <= 30) {
    insights.push({ id: "low-humidity", label: "Dry air", detail: "The air is dry — keep hydrated.", tone: "sun" });
  }

  if (windSpeed >= 25) {
    insights.push({ id: "strong-wind", label: "Windy", detail: "Breezy today — expect a gusty feel.", tone: "accent" });
  } else if (windSpeed < 8) {
    insights.push({ id: "calm", label: "Calm", detail: "Winds are light — a settled, quiet day.", tone: "muted" });
  }

  if (visibilityKm != null && visibilityKm >= 8) {
    insights.push({ id: "good-visibility", label: "Clear view", detail: "Great visibility across the area.", tone: "sky" });
  } else if (visibilityKm != null && visibilityKm < 3) {
    insights.push({ id: "low-visibility", label: "Reduced visibility", detail: "Visibility is limited — take care when travelling.", tone: "muted" });
  }

  if (precipitationProbability != null && precipitationProbability >= 60) {
    insights.push({ id: "rain-likely", label: "Rain likely", detail: "A good chance of rain — keep an umbrella handy.", tone: "sky" });
  }

  if (uvIndex != null && uvIndex >= 6) {
    insights.push({ id: "high-uv", label: "Strong sun", detail: "UV is high — protect your skin outdoors.", tone: "sun" });
  }

  if (Math.abs(feelsLike - temperature) >= 2) {
    const warmer = feelsLike > temperature;
    insights.push({
      id: "feels-different",
      label: warmer ? "Feels warmer" : "Feels cooler",
      detail: `Feels a few degrees ${warmer ? "warmer" : "cooler"} than the air temperature.`,
      tone: "accent",
    });
  }

  return insights.slice(0, 5);
}