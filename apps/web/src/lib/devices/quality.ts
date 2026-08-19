import type { DataQuality } from "@/lib/environmental/types";

/**
 * Data freshness + quality helpers. These become important when real ESP32
 * hardware streams readings: the UI needs to surface "Updated 5 seconds ago"
 * and "Data stale" without hardcoding any real-time logic.
 */

/** Age after which a reading is considered stale. */
export const STALE_AFTER_MS = 5 * 60 * 1000;

/** Milliseconds elapsed since `lastUpdated` (ISO string). */
export function dataAgeMs(lastUpdated: string, now: number = Date.now()): number {
  const last = new Date(lastUpdated).getTime();
  if (Number.isNaN(last)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now - last);
}

/** True when the last reading is older than `maxAgeMs` (defaults to stale). */
export function isStale(
  lastUpdated: string,
  maxAgeMs: number = STALE_AFTER_MS,
  now: number = Date.now()
): boolean {
  return dataAgeMs(lastUpdated, now) > maxAgeMs;
}

/**
 * Compact human label for a data age, e.g. "just now", "12s ago", "3m ago",
 * "2h ago". Pure and deterministic for tests.
 */
export function formatAge(ageMs: number): string {
  if (ageMs < 0 || !Number.isFinite(ageMs)) return "unknown";
  if (ageMs < 5000) return "just now";
  if (ageMs < 60_000) return `${Math.floor(ageMs / 1000)}s ago`;
  if (ageMs < 3_600_000) return `${Math.floor(ageMs / 60_000)}m ago`;
  if (ageMs < 86_400_000) return `${Math.floor(ageMs / 3_600_000)}h ago`;
  return `${Math.floor(ageMs / 86_400_000)}d ago`;
}

/**
 * Derives a data-quality state from freshness and completeness.
 *  - `simulated`    : source explicitly marked simulated (current default).
 *  - `disconnected` : no device feed at all (hardware not connected, no mock).
 *  - `good`         : fresh, complete live data.
 *  - `stale`        : live data older than the staleness window.
 *  - `invalid`      : feed present but fails validation.
 */
export function qualityFrom({
  sourceIsSimulated,
  connected,
  hasReadings,
  lastUpdated,
  now = Date.now(),
  maxAgeMs = STALE_AFTER_MS,
}: {
  sourceIsSimulated: boolean;
  connected: boolean;
  hasReadings: boolean;
  lastUpdated?: string;
  now?: number;
  maxAgeMs?: number;
}): DataQuality {
  if (sourceIsSimulated) return "simulated";
  if (!connected) return "disconnected";
  if (!hasReadings || !lastUpdated) return "invalid";
  if (isStale(lastUpdated, maxAgeMs, now)) return "stale";
  return "good";
}