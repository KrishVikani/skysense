/**
 * Weather location model + client-side persistence for the Weather experience.
 *
 * A location is resolved to coordinates (OpenWeather Geocoding) and carried
 * into every weather request — the deprecated city-name endpoints are never
 * used when coordinates are available. Selection and recent locations persist
 * in localStorage so the Weather page restores the user's last city.
 */

export interface WeatherLocation {
  /** City/town name, e.g. "Ahmedabad". */
  name: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "IN". */
  country: string;
  /** Admin-1/state name when the geocoder returns one, e.g. "Gujarat". */
  state?: string;
  lat: number;
  lon: number;
}

/** One geocoding result, ready for display and selection. */
export interface GeocodeResult {
  name: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
}

/** Compact human label, e.g. "Ahmedabad, Gujarat, IN". */
export function locationDisplayName(location: Pick<WeatherLocation, "name" | "state" | "country">): string {
  return location.state
    ? `${location.name}, ${location.state}, ${location.country}`
    : `${location.name}, ${location.country}`;
}

/**
 * Default location used when nothing has been selected yet (and the label the
 * simulated demo feed already anchors on). Public coordinates only — this is
 * not a secret.
 */
export const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  name: "Ahmedabad",
  state: "Gujarat",
  country: "IN",
  lat: 23.0225,
  lon: 72.5714,
};

const SELECTED_KEY = "skysense.weather.selectedLocation";
const RECENT_KEY = "skysense.weather.recentLocations";
const MAX_RECENT = 5;

function isWeatherLocation(value: unknown): value is WeatherLocation {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<WeatherLocation>;
  return (
    typeof v.name === "string" &&
    typeof v.country === "string" &&
    typeof v.lat === "number" &&
    typeof v.lon === "number"
  );
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode / quota); persistence is best-effort.
  }
}

/** Restores the selected location, falling back to the default on first run. */
export function loadSelectedLocation(): WeatherLocation {
  const stored = readJson(SELECTED_KEY);
  return isWeatherLocation(stored) ? stored : DEFAULT_WEATHER_LOCATION;
}

export function saveSelectedLocation(location: WeatherLocation): void {
  writeJson(SELECTED_KEY, location);
}

/** Restores previously selected locations, newest first (empty on first run). */
export function loadRecentLocations(): WeatherLocation[] {
  const stored = readJson(RECENT_KEY);
  if (!Array.isArray(stored)) return [];
  return stored.filter(isWeatherLocation);
}

export function addRecentLocation(location: WeatherLocation): WeatherLocation[] {
  const recent = loadRecentLocations().filter(
    (item) => !(item.lat === location.lat && item.lon === location.lon)
  );
  const next = [location, ...recent].slice(0, MAX_RECENT);
  writeJson(RECENT_KEY, next);
  return next;
}

/** Removes one recent location by coordinates and returns the updated list. */
export function removeRecentLocation(location: Pick<WeatherLocation, "lat" | "lon">): WeatherLocation[] {
  const next = loadRecentLocations().filter(
    (item) => !(item.lat === location.lat && item.lon === location.lon)
  );
  writeJson(RECENT_KEY, next);
  return next;
}

/** Clears all recent locations and returns the (now empty) list. */
export function clearRecentLocations(): WeatherLocation[] {
  writeJson(RECENT_KEY, []);
  return [];
}