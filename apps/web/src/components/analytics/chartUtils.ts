import type { TimeRange } from "@/lib/environmental/types";

export function formatX(value: string, range: TimeRange): string {
  const date = new Date(value);
  if (range === "30d") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (range === "7d") {
    return date.toLocaleDateString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function yDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.2 || 2;
  return [Math.max(0, min - padding), max + padding];
}

/** Full human-readable timestamp used by chart tooltips (date + time). */
export function fullTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}