import type { WeatherCondition } from "./types";

/**
 * Semantic weather VISUAL states for the Weather experience.
 *
 * This is the single, centralized mapping from weather conditions into the
 * atmospheric/visual layer. UI code (hero scene, page atmosphere, icons) never
 * hard-codes condition-specific colors or gradients — it reads the config
 * registered here. OpenWeather condition codes are normalized through
 * {@link normalizeOpenWeatherCondition}; the internal condition model is
 * bridged through {@link visualStateOf}.
 *
 * Sunrise/sunset are time-based visual states (not weather conditions) and are
 * produced by {@link visualStateForTime} when the active data provides sun
 * times.
 */
export type WeatherVisualState =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "heavy-rain"
  | "drizzle"
  | "thunderstorm"
  | "snow"
  | "mist"
  | "night"
  | "night-cloudy"
  | "sunrise"
  | "sunset";

export const WEATHER_VISUAL_STATES: WeatherVisualState[] = [
  "clear",
  "partly-cloudy",
  "cloudy",
  "rain",
  "heavy-rain",
  "drizzle",
  "thunderstorm",
  "snow",
  "mist",
  "night",
  "night-cloudy",
  "sunrise",
  "sunset",
];

export type ParticleKind = "rain" | "heavy-rain" | "snow" | "mist" | "none";

export interface WeatherVisualConfig {
  id: WeatherVisualState;
  /** Short label, e.g. "Clear". */
  label: string;
  /** Natural-language description used by the hero. */
  description: string;
  /** Vertical sky gradient rendered behind the scene. */
  sky: string;
  /** True when the scene represents darkness (night visuals). */
  isNight: boolean;
  /** Glow color used for sun/moon halos. */
  glowColor: string;
  /** Whether drifting clouds are rendered. */
  clouds: boolean;
  /** Particle effect (rain/snow/mist) for the scene. */
  particles: ParticleKind;
  /** Occasional, restrained lightning illumination. */
  lightning: boolean;
  /** Twinkling stars (night scenes only). */
  stars: boolean;
  /** Subtle, slow-moving sun rays (clear/bright scenes only). */
  rays: boolean;
  /** Accent hue used by page-level glows. */
  accent: string;
}

/* Premium, restrained sky scenes. The palette leans deep so white hero text
   and the page-level atmosphere always stay readable — SKYSENSE reads as a
   rich evening/overcast sky rather than a washed-out daylight page. */
const CLEAR_SKY =
  "linear-gradient(165deg, #0b1e38 0%, #123a63 28%, #1d5d8f 52%, #2f7fb3 74%, #4a9cc9 100%)";
const PARTLY_CLOUDY_SKY =
  "linear-gradient(165deg, #0c1f36 0%, #173a58 28%, #2b5875 52%, #4d7f96 74%, #6f9fb2 100%)";
const CLOUDY_SKY =
  "linear-gradient(165deg, #16222e 0%, #243544 28%, #3a4e5d 52%, #58707d 74%, #7d929d 100%)";
const RAIN_SKY =
  "linear-gradient(165deg, #131d28 0%, #22313e 28%, #374b59 52%, #56707f 74%, #7893a1 100%)";
const HEAVY_RAIN_SKY =
  "linear-gradient(165deg, #0e1620 0%, #1c2833 28%, #2f404d 52%, #4c6472 74%, #6d8794 100%)";
const DRIZZLE_SKY =
  "linear-gradient(165deg, #15202c 0%, #263744 28%, #3d535f 52%, #5d7784 74%, #819aa6 100%)";
const STORM_SKY =
  "linear-gradient(165deg, #0d1420 0%, #1c2836 28%, #2f3d4d 52%, #4b5d6d 74%, #6b7d8a 100%)";
const SNOW_SKY =
  "linear-gradient(165deg, #1c2834 0%, #2d3e4a 28%, #475c68 52%, #6a818c 74%, #8da2ab 100%)";
const MIST_SKY =
  "linear-gradient(165deg, #202b33 0%, #31404a 28%, #4b5c64 52%, #6d7c82 74%, #8b989c 100%)";
const NIGHT_SKY =
  "linear-gradient(165deg, #03090f 0%, #081526 28%, #10233c 52%, #19314e 74%, #22405c 100%)";
const NIGHT_CLOUDY_SKY =
  "linear-gradient(165deg, #060c14 0%, #0e1822 28%, #192431 52%, #273747 74%, #334657 100%)";
const SUNRISE_SKY =
  "linear-gradient(165deg, #10192e 0%, #272238 28%, #4c3548 52%, #8a5a4a 74%, #c98a55 100%)";
const SUNSET_SKY =
  "linear-gradient(165deg, #120f24 0%, #2d1738 28%, #552a47 52%, #8f4a48 74%, #cf7a4c 100%)";

/** Central registry of per-visual-state presentation config. */
export const WEATHER_VISUAL_CONFIGS: Record<WeatherVisualState, WeatherVisualConfig> = {
  clear: {
    id: "clear",
    label: "Clear",
    description: "Unbroken sunshine and a calm, settled atmosphere.",
    sky: CLEAR_SKY,
    isNight: false,
    glowColor: "rgba(255, 235, 170, 0.9)",
    clouds: false,
    particles: "none",
    lightning: false,
    stars: false,
    rays: true,
    accent: "#fbbf24",
  },
  "partly-cloudy": {
    id: "partly-cloudy",
    label: "Partly Cloudy",
    description: "Sun and cloud share the sky — bright, with soft drifting shade.",
    sky: PARTLY_CLOUDY_SKY,
    isNight: false,
    glowColor: "rgba(255, 235, 170, 0.75)",
    clouds: true,
    particles: "none",
    lightning: false,
    stars: false,
    rays: true,
    accent: "#38bdf8",
  },
  cloudy: {
    id: "cloudy",
    label: "Cloudy",
    description: "A soft blanket of cloud overhead, with muted, even daylight.",
    sky: CLOUDY_SKY,
    isNight: false,
    glowColor: "rgba(203, 213, 225, 0.5)",
    clouds: true,
    particles: "none",
    lightning: false,
    stars: false,
    rays: false,
    accent: "#94a3b8",
  },
  rain: {
    id: "rain",
    label: "Rain",
    description: "Steady rain falling — a cool, grey spell of weather.",
    sky: RAIN_SKY,
    isNight: false,
    glowColor: "rgba(148, 197, 222, 0.35)",
    clouds: true,
    particles: "rain",
    lightning: false,
    stars: false,
    rays: false,
    accent: "#3b82f6",
  },
  "heavy-rain": {
    id: "heavy-rain",
    label: "Heavy Rain",
    description: "Heavy rain — streets and drains will be busy. Dress for the weather.",
    sky: HEAVY_RAIN_SKY,
    isNight: false,
    glowColor: "rgba(125, 176, 205, 0.35)",
    clouds: true,
    particles: "heavy-rain",
    lightning: false,
    stars: false,
    rays: false,
    accent: "#2563eb",
  },
  drizzle: {
    id: "drizzle",
    label: "Drizzle",
    description: "Light, persistent drizzle — damp but gentle.",
    sky: DRIZZLE_SKY,
    isNight: false,
    glowColor: "rgba(148, 197, 222, 0.35)",
    clouds: true,
    particles: "rain",
    lightning: false,
    stars: false,
    rays: false,
    accent: "#60a5fa",
  },
  thunderstorm: {
    id: "thunderstorm",
    label: "Thunderstorms",
    description: "Storm clouds overhead, with the low rumble of thunder.",
    sky: STORM_SKY,
    isNight: false,
    glowColor: "rgba(129, 140, 248, 0.4)",
    clouds: true,
    particles: "rain",
    lightning: true,
    stars: false,
    rays: false,
    accent: "#6366f1",
  },
  snow: {
    id: "snow",
    label: "Snow",
    description: "Snow drifting through still, crisp air.",
    sky: SNOW_SKY,
    isNight: false,
    glowColor: "rgba(226, 240, 246, 0.6)",
    clouds: true,
    particles: "snow",
    lightning: false,
    stars: false,
    rays: false,
    accent: "#bae6fd",
  },
  mist: {
    id: "mist",
    label: "Mist",
    description: "Low cloud hugging the ground — soft, muffled light.",
    sky: MIST_SKY,
    isNight: false,
    glowColor: "rgba(203, 213, 225, 0.45)",
    clouds: true,
    particles: "mist",
    lightning: false,
    stars: false,
    rays: false,
    accent: "#94a3b8",
  },
  night: {
    id: "night",
    label: "Clear Night",
    description: "A clear night sky — calm, quiet and full of stars.",
    sky: NIGHT_SKY,
    isNight: true,
    glowColor: "rgba(190, 205, 230, 0.5)",
    clouds: false,
    particles: "none",
    lightning: false,
    stars: true,
    rays: false,
    accent: "#3b82f6",
  },
  "night-cloudy": {
    id: "night-cloudy",
    label: "Cloudy Night",
    description: "A blanket of cloud after dark — the moon hidden, the air still.",
    sky: NIGHT_CLOUDY_SKY,
    isNight: true,
    glowColor: "rgba(148, 163, 184, 0.4)",
    clouds: true,
    particles: "none",
    lightning: false,
    stars: false,
    rays: false,
    accent: "#64748b",
  },
  sunrise: {
    id: "sunrise",
    label: "Sunrise",
    description: "The sun is rising — soft, warm morning light.",
    sky: SUNRISE_SKY,
    isNight: false,
    glowColor: "rgba(242, 192, 120, 0.8)",
    clouds: true,
    particles: "none",
    lightning: false,
    stars: false,
    rays: true,
    accent: "#fb923c",
  },
  sunset: {
    id: "sunset",
    label: "Sunset",
    description: "The sun is setting — warm colours on the horizon.",
    sky: SUNSET_SKY,
    isNight: false,
    glowColor: "rgba(242, 176, 110, 0.8)",
    clouds: true,
    particles: "none",
    lightning: false,
    stars: false,
    rays: true,
    accent: "#f97316",
  },
};

export function visualConfig(state: WeatherVisualState): WeatherVisualConfig {
  return WEATHER_VISUAL_CONFIGS[state];
}

export function describeVisualState(state: WeatherVisualState): string {
  return WEATHER_VISUAL_CONFIGS[state].description;
}

/**
 * Bridges a {@link WeatherCondition} into the visual system WITHOUT a separate
 * day/night flag. The condition id already encodes day/night where it matters
 * (the providers emit `night` for clear/partly-cloudy hours after dark), so
 * this maps ids 1:1 for icon/scene purposes.
 */
export function visualStateOfCondition(condition: WeatherCondition): WeatherVisualState {
  switch (condition.id) {
    case "sunny":
      return "clear";
    case "partly-cloudy":
      return "partly-cloudy";
    case "cloudy":
      return "cloudy";
    case "rain":
      return "rain";
    case "heavy-rain":
      return "heavy-rain";
    case "drizzle":
      return "drizzle";
    case "thunderstorm":
      return "thunderstorm";
    case "snow":
      return "snow";
    case "mist":
      return "mist";
    case "night":
      return "night";
  }
}

/**
 * Condition-aware visual state with a sunrise/sunset overlay. Weather states
 * (rain, snow, storm, mist) always dominate the scene; sky states (clear,
 * partly-cloudy, cloudy and their night variants) fall into the golden-hour
 * `sunrise`/`sunset` atmospheres when the source reports sun times and the
 * local clock is inside a half-hour window around them.
 */
export function visualStateForCondition(
  condition: WeatherCondition,
  isDay: boolean,
  nowMs: number,
  sunriseMs?: number,
  sunsetMs?: number
): WeatherVisualState {
  const base = visualStateOf(condition, isDay);
  if (sunriseMs != null && sunsetMs != null) {
    if (
      base === "clear" ||
      base === "partly-cloudy" ||
      base === "cloudy" ||
      base === "night" ||
      base === "night-cloudy"
    ) {
      const timeState = visualStateForTime(nowMs, sunriseMs, sunsetMs);
      if (timeState === "sunrise" || timeState === "sunset") return timeState;
    }
  }
  return base;
}

/**
 * Bridges the internal {@link WeatherCondition} model into the visual system.
 * The simulated provider's `sunny` id maps to the `clear` visual state; all
 * other ids map directly.
 */
export function visualStateOf(condition: WeatherCondition, isDay: boolean): WeatherVisualState {
  switch (condition.id) {
    case "sunny":
      return isDay ? "clear" : "night";
    case "partly-cloudy":
      return isDay ? "partly-cloudy" : "night";
    case "cloudy":
      return isDay ? "cloudy" : "night-cloudy";
    case "rain":
      return "rain";
    case "heavy-rain":
      return "heavy-rain";
    case "drizzle":
      return "drizzle";
    case "thunderstorm":
      return "thunderstorm";
    case "snow":
      return "snow";
    case "mist":
      return "mist";
    case "night":
      return "night";
  }
}

/**
 * Time-of-day visual state. Falls into sunrise/sunset only inside a short
 * window around the reported sun times; otherwise clear-ish day or night.
 */
export function visualStateForTime(
  nowMs: number,
  sunriseMs: number,
  sunsetMs: number
): WeatherVisualState {
  const HALF_HOUR = 30 * 60 * 1000;
  if (nowMs >= sunriseMs - HALF_HOUR && nowMs <= sunriseMs + HALF_HOUR) return "sunrise";
  if (nowMs >= sunsetMs - HALF_HOUR && nowMs <= sunsetMs + HALF_HOUR) return "sunset";
  return nowMs >= sunriseMs && nowMs < sunsetMs ? "clear" : "night";
}

/**
 * NORMALIZED OpenWeather condition → visual-state mapping. This is the single
 * place OpenWeather condition ids (e.g. 802 = scattered clouds) become visual
 * states. Grouped by OW id range:
 *
 *   2xx thunderstorm · 3xx drizzle · 5xx rain (heavy for 502–504/522)
 *   6xx snow · 7xx mist/fog · 800 clear · 801–802 partly-cloudy · 803–804 cloudy
 *
 * `isDay` is derived from sun times so the same code produces day or night
 * visuals depending on the local time.
 */
export function normalizeOpenWeatherCondition(code: number, isDay: boolean): WeatherVisualState {
  if (code >= 200 && code < 300) return "thunderstorm";
  if (code >= 300 && code < 400) return "drizzle";
  if (code >= 500 && code < 600) {
    if (code === 502 || code === 503 || code === 504 || code === 522) return "heavy-rain";
    return "rain";
  }
  if (code >= 600 && code < 700) return "snow";
  if (code >= 700 && code < 800) return "mist";
  if (code === 800) return isDay ? "clear" : "night";
  if (code === 801 || code === 802) return isDay ? "partly-cloudy" : "night";
  if (code === 803 || code === 804) return isDay ? "cloudy" : "night-cloudy";
  return isDay ? "partly-cloudy" : "night";
}