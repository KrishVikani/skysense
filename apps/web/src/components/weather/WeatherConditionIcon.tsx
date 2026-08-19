import type { WeatherCondition } from "@/lib/weather/types";
import { visualStateOfCondition } from "@/lib/weather/visual";
import { WeatherVisualIcon } from "./WeatherVisualIcon";

/**
 * Reusable icon for a weather condition — a thin adapter that maps a
 * {@link WeatherCondition} into the unified visual-state icon system
 * ({@link WeatherVisualIcon}), so every weather icon in the product shares one
 * visual style. The condition is always accompanied by its text label in the UI.
 */
export function WeatherConditionIcon({
  condition,
  className = "w-6 h-6",
}: {
  condition: WeatherCondition;
  className?: string;
}) {
  return <WeatherVisualIcon state={visualStateOfCondition(condition)} className={className} />;
}