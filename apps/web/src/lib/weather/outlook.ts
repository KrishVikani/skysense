import { localDayKey } from "./conditions";
import type { WeatherConditionId, WeatherCurrent, WeatherDailyItem, WeatherHourlyItem } from "./types";

/**
 * Data-derived weather storytelling for the Weather page.
 *
 * Nothing here is invented: every clause is derived from a real field in the
 * active payload (current conditions, today's daily high/low, hourly
 * precipitation probability, wind, humidity). Clauses are simply dropped when
 * their source field is missing, and the functions never claim a prediction
 * the forecast data cannot support.
 */

const CONDITION_WORD: Record<WeatherConditionId, string> = {
  sunny: "clear",
  "partly-cloudy": "partly cloudy",
  cloudy: "cloudy",
  rain: "rainy",
  "heavy-rain": "rainy",
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

/**
 * One-to-two-sentence outlook for the current day, assembled only from fields
 * the active source actually provides. Returns null when there is nothing
 * meaningful to say.
 */
export function todayOutlook(
  current: WeatherCurrent,
  hourly: WeatherHourlyItem[],
  daily: WeatherDailyItem[]
): string | null {
  if (!current || hourly.length === 0) return null;

  const temp = Math.round(current.temperature);
  const condition = current.condition.id === "night" ? "night" : CONDITION_WORD[current.condition.id];
  const timeWord = current.isDay === false ? "tonight" : "today";

  const sentences: string[] = [];
  const parts: string[] = [];

  // Today's daily range — only when the nearest daily entry is actually today.
  const today = daily.find((d) => d.date === localDayKey(Date.now()));
  if (today) {
    const high = Math.round(today.high);
    const low = Math.round(today.low);
    parts.push(`${temperatureWord(temp)} and ${condition} ${timeWord}, peaking near ${high}° and dipping to ${low}°.`);
  } else {
    parts.push(`${temperatureWord(temp)} and ${condition} ${timeWord} with ${windWord(current.windSpeed)}.`);
  }

  sentences.push(parts[0]);

  // Rain outlook from the hourly precipitation probability (0–100).
  const peakChance = hourly.reduce((max, h) => Math.max(max, h.precipitationProbability ?? 0), 0);
  if (peakChance >= 60) {
    sentences.push("Rain is likely over the next 24 hours — keep an umbrella nearby.");
  } else if (peakChance >= 35) {
    sentences.push("There is a chance of rain in the forecast window.");
  }

  // Wind emphasis only when it is actually notable.
  const peakWind = hourly.reduce((max, h) => Math.max(max, h.windSpeedKmh ?? 0), 0);
  if (peakWind >= 20) {
    sentences.push(`Expect ${windWord(peakWind)} later in the period.`);
  } else if (current.humidity >= 70) {
    sentences.push(`It is humid, with relative humidity around ${Math.round(current.humidity)}%.`);
  }

  return sentences.join(" ");
}