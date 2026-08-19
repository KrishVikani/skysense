import type { WeatherLocation } from "@/lib/weather/locations";
import type { ThemePreference } from "@/lib/settings/types";

/**
 * First-run onboarding persistence — per-account, resumable, local-only.
 *
 * State is stored under `skysense.onboarding.{uid}` so signing out and back in
 * restores the correct account's progress. No credentials, emails or tokens are
 * ever written here; it is purely UI progress + a few user-chosen preferences
 * that the onboarding wizard collects before they are committed elsewhere.
 */

export interface OnboardingState {
  /** Set when the user reaches the end (or deliberately skips) the flow. */
  completed: boolean;
  /** True when the user chose "Skip setup for now" on the welcome step. */
  skipped?: boolean;
  /** Last completed step index — the wizard resumes here after a reload. */
  step?: number;
  displayName?: string;
  theme?: ThemePreference;
  soundEnabled?: boolean;
  deviceIntent?: "connect" | "later";
  location?: WeatherLocation;
}

function keyFor(uid: string): string {
  return `skysense.onboarding.${uid}`;
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

export function loadOnboarding(uid: string): OnboardingState {
  const stored = readJson(keyFor(uid));
  if (typeof stored !== "object" || stored === null) return { completed: false };
  const state = stored as Partial<OnboardingState>;
  return {
    completed: state.completed === true,
    skipped: state.skipped === true,
    step: typeof state.step === "number" ? state.step : undefined,
    displayName: typeof state.displayName === "string" ? state.displayName : undefined,
    theme: state.theme === "dark" || state.theme === "system" ? state.theme : undefined,
    soundEnabled: state.soundEnabled === true,
    deviceIntent: state.deviceIntent === "connect" || state.deviceIntent === "later" ? state.deviceIntent : undefined,
    location: state.location,
  };
}

export function saveOnboarding(uid: string, state: OnboardingState): void {
  writeJson(keyFor(uid), state);
}

export function clearOnboarding(uid: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(uid));
  } catch {
    // Best-effort cleanup.
  }
}

export function hasCompletedOnboarding(uid: string): boolean {
  return loadOnboarding(uid).completed;
}