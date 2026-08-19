import type { AnalyticsResult, EnvironmentalReading, TimeRange } from "./types";
import { computeAnalytics } from "./analytics";
import { generateReadings } from "./mockData";

const SIMULATED_DELAY = 300;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Abstraction between the UI and the environmental data source.
 *
 * The UI never talks to the simulation or to hardware directly — every module
 * (Dashboard, Analytics, AI Intelligence, Alerts, Devices) reads through this
 * interface, so swapping the source never changes the UI.
 *
 *   EnvironmentalDataProvider
 *        ↓
 *   MockEnvironmentalDataProvider   ← active today (deterministic simulation)
 *        OR
 *   Esp32DataSourceProvider         ← future real hardware (interface only)
 */
export interface DataSourceProvider {
  /** Stable provider identifier, e.g. "mock" | "esp32". */
  readonly id: string;
  /** Human-readable source label, e.g. "Simulated environmental data". */
  readonly label: string;
  /** Provider kind, used by the UI to label data provenance. */
  readonly kind: "mock" | "esp32";
  /** Fetches a series of normalized EnvironmentalReading records. */
  fetchReadings(_range: TimeRange): Promise<EnvironmentalReading[]>;
  /** Fetches a fully computed analytics result for the given range. */
  fetchAnalytics(_range: TimeRange): Promise<AnalyticsResult>;
}

/**
 * Deterministic simulation provider.
 *
 * Produces the same coherent, anchored dataset for every range (24h/7d/30d)
 * via `generateReadings`, then derives analytics with `computeAnalytics`.
 * Every reading carries device/source metadata (deviceId, location, source,
 * dataQuality: "simulated", connectionStatus: "simulation").
 *
 * FUTURE HARDWARE:
 * This class is the template for the ESP32 provider. When hardware exists, an
 * `Esp32DataSourceProvider` implementing the same interface replaces this one
 * via `getEnvironmentalDataProvider()` — the data model is identical.
 */
export class MockEnvironmentalDataProvider implements DataSourceProvider {
  readonly id = "mock";
  readonly label = "Simulated environmental data";
  readonly kind = "mock" as const;

  async fetchReadings(range: TimeRange): Promise<EnvironmentalReading[]> {
    return generateReadings(range);
  }

  async fetchAnalytics(range: TimeRange): Promise<AnalyticsResult> {
    await delay(SIMULATED_DELAY);
    const readings = await this.fetchReadings(range);
    return computeAnalytics(readings, range);
  }
}

export const mockEnvironmentalDataProvider = new MockEnvironmentalDataProvider();

let activeProvider: DataSourceProvider = mockEnvironmentalDataProvider;

/**
 * Returns the provider currently feeding the product.
 *
 * FUTURE HARDWARE:
 * The ESP32 integration point. A future `Esp32DataSourceProvider` (fetching
 * sensor values through the ingestion API) is registered here, e.g.
 * `setEnvironmentalDataProvider(createEsp32Provider({ baseUrl, deviceToken }))`.
 * Device credentials must be supplied server-side and never embedded in the
 * browser bundle.
 */
export function getEnvironmentalDataProvider(): DataSourceProvider {
  return activeProvider;
}

/** Registers a different provider (used at startup / future hardware swap). */
export function setEnvironmentalDataProvider(provider: DataSourceProvider): void {
  activeProvider = provider;
}

/**
 * Contract for the future ESP32-backed provider.
 *
 * Implementation notes for the hardware phase:
 *  - It fetches EnvironmentalData by calling the ingestion endpoint
 *    `POST /api/devices/:deviceId/data` (validated server-side).
 *  - `fetchReadings` maps telemetry → `EnvironmentalReading[]` (same shape the
 *    mock provider emits today).
 *  - `fetchAnalytics` stays `computeAnalytics(readings, range)` — unchanged.
 */
export interface Esp32DataSourceProvider extends DataSourceProvider {
  readonly id: "esp32";
  readonly kind: "esp32";
  /** Base URL of the SKYSENSE ingestion API. */
  readonly baseUrl: string;
  /** Server-side device credential handle (never a plaintext secret). */
  readonly credentialRef: string;
}