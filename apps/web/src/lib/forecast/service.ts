import { getEnvironmentalDataProvider } from "@/lib/environmental/provider";
import type { TimeRange } from "@/lib/environmental/types";
import type { ForecastContext, ForecastHorizon, ForecastResult } from "./types";
import { generateForecast } from "./engine";

/**
 * Forecast service entry point.
 *
 * Fetches the recent environmental history through the existing data-provider
 * abstraction (simulation today, ESP32 later — the engine is source-agnostic)
 * and runs the active forecast engine over it. The forecast horizon is
 * deliberately shorter than the 24h history window so the engine always has
 * enough recent context.
 */

export const DEFAULT_FORECAST_RANGE: TimeRange = "24h";
export const DEFAULT_FORECAST_HORIZON: ForecastHorizon = "3h";

/**
 * Generates a deterministic environmental forecast.
 *
 * @param horizon  outlook horizon (1h | 3h | 6h)
 * @param range    history window to build the forecast from (default 24h)
 */
export async function getEnvironmentalForecast(
  horizon: ForecastHorizon = DEFAULT_FORECAST_HORIZON,
  range: TimeRange = DEFAULT_FORECAST_RANGE
): Promise<ForecastResult> {
  const provider = getEnvironmentalDataProvider();
  const readings = await provider.fetchReadings(range);

  const context: ForecastContext = {
    location: readings[readings.length - 1]?.location ?? "Unknown location",
    dataSource: readings[readings.length - 1]?.dataSource ?? "simulation",
    source: readings[readings.length - 1]?.source ?? provider.label,
  };

  return generateForecast(readings, horizon, context);
}