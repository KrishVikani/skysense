import type { AnalyticsResult, EnvironmentalReading, TimeRange } from "./types";
import { computeAnalytics } from "./analytics";
import { generateReadings } from "./mockData";
import { ESP32_DEVICE_ID } from "@/lib/devices/contract";

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
 *   Esp32DataSourceProvider         ← real hardware via API
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
 * Kept for development/testing. Not the active provider when ESP32 is configured.
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

/**
 * ESP32-backed provider that fetches real telemetry from the SKYSENSE API.
 *
 * Fetches stored readings from `/api/devices/:deviceId/data` (latest) and
 * `/api/devices/:deviceId/data/history` (history), maps them to
 * `EnvironmentalReading[]`, and derives analytics via `computeAnalytics`.
 *
 * All device credentials remain server-side. The provider only calls the
 * public GET endpoints — no secrets in the browser bundle.
 */
export class Esp32DataSourceProvider implements DataSourceProvider {
  readonly id = "esp32";
  readonly label = "ESP32 device telemetry";
  readonly kind = "esp32" as const;

  private readonly deviceId: string;

  constructor(deviceId: string = ESP32_DEVICE_ID) {
    this.deviceId = deviceId;
  }

  private apiBase(): string {
    // In browser, use relative URLs to the same origin
    return "";
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const res = await fetch(`${this.apiBase()}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API error ${res.status}`);
    }
    return res.json();
  }

  private mapStoredToReading(reading: StoredDeviceReading): EnvironmentalReading {
    return {
      timestamp: reading.timestamp,
      temperature: reading.temperature ?? 0,
      humidity: reading.humidity ?? 0,
      windSpeed: reading.windSpeed ?? 0,
      windDirection: reading.windDirection ?? 0,
      uvIndex: reading.uvIndex ?? 0,
      airQuality: reading.airQuality ?? 0,
      pressure: reading.pressure ?? 0,
      rainfall: reading.rainfall ?? 0,
      deviceId: reading.deviceId,
      location: reading.location,
      source: this.label,
      dataQuality: reading.connectionMode === "online" ? "good" : "stale",
      connectionStatus: reading.connectionMode === "online" ? "online" : "offline",
      dataSource: "esp32",
      connectionMode: reading.connectionMode,
      firmwareVersion: reading.firmwareVersion,
      sensorStatus: reading.sensorStatus,
    };
  }

  async fetchReadings(range: TimeRange): Promise<EnvironmentalReading[]> {
    // Use history endpoint to get up to 50 most recent readings
    const maxPoints = range === "24h" ? 48 : range === "7d" ? 168 : 50;
    const data = await this.fetchJson<HistoryResponse>(
      `/api/devices/${this.deviceId}/data/history?max=${maxPoints}`
    );

    if (!data.ok || !data.readings || data.readings.length === 0) {
      return [];
    }

    // Filter by time range (server returns newest first)
    const now = Date.now();
    const rangeMs = range === "24h" ? 24 * 60 * 60 * 1000 : range === "7d" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const cutoff = now - rangeMs;

    const filtered = data.readings
      .filter((r: StoredDeviceReading) => new Date(r.timestamp).getTime() >= cutoff)
      .map((r: StoredDeviceReading) => this.mapStoredToReading(r))
      .sort((a: EnvironmentalReading, b: EnvironmentalReading) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    return filtered;
  }

  async fetchAnalytics(range: TimeRange): Promise<AnalyticsResult> {
    const readings = await this.fetchReadings(range);

    if (readings.length === 0) {
      // No telemetry yet — return a minimal AnalyticsResult so UI doesn't crash
      // The Devices page will show "no data" state via the existing logic
      throw new Error("No ESP32 telemetry available yet");
    }

    return computeAnalytics(readings, range);
  }
}

/** Response shape from /api/devices/:deviceId/data/history */
interface HistoryResponse {
  ok: boolean;
  deviceId: string;
  count: number;
  readings: StoredDeviceReading[];
  note?: string;
}

/** Raw stored reading shape from the API (subset of StoredDeviceReading) */
interface StoredDeviceReading {
  id?: string;
  deviceId: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  airQuality: number | null;
  uvIndex: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  rainfall: number | null;
  dataSource: "esp32";
  connectionMode: "online" | "offline" | "simulation";
  location: string;
  firmwareVersion?: string;
  battery?: number;
  sensorStatus: "not_connected" | "simulated" | "available" | "stale" | "error";
  receivedAt: string;
}

export const mockEnvironmentalDataProviderInstance = mockEnvironmentalDataProvider;

let activeProvider: DataSourceProvider = mockEnvironmentalDataProvider;

/**
 * Returns the provider currently feeding the product.
 */
export function getEnvironmentalDataProvider(): DataSourceProvider {
  return activeProvider;
}

/** Registers a different provider (used at startup / future hardware swap). */
export function setEnvironmentalDataProvider(provider: DataSourceProvider): void {
  activeProvider = provider;
}

/**
 * Initializes the active provider based on environment.
 * Call this once at app startup (e.g., in a layout or provider component).
 *
 * Starts with the mock provider to prevent the app from getting stuck in
 * Simulation Mode when initialization happens before the ESP32/API status
 * is available. The provider can be switched to ESP32 later via
 * {@link tryActivateEsp32Provider} when the API becomes available.
 */
export function initializeEnvironmentalProvider(): void {
  activeProvider = mockEnvironmentalDataProvider;
}

/**
 * Attempts to activate the ESP32-backed data provider if the API is
 * available. Safe to call multiple times; idempotent if the API is already
 * unreachable. Designed to be called after app mount when the ESP32 may
 * have had time to initialize and report telemetry.
 *
 * If the device status endpoint returns `connection=online`, the ESP32
 * provider is activated and all modules automatically read from real
 * telemetry without a full rebuild. If the API is unavailable, the mock
 * provider remains active and the UI gracefully falls back to simulated
 * data.
 */
export async function tryActivateEsp32Provider(): Promise<void> {
  try {
    const res = await fetch(`/api/devices/${ESP32_DEVICE_ID}/status`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error("Device status invalid");
    if (data.connection !== "online") throw new Error("Device not online");
    // API is available and device is online — switch to ESP32 provider
    setEnvironmentalDataProvider(new Esp32DataSourceProvider());
  } catch {
    // Keep mock provider; caller may retry later if desired.
    // No-op: mock provider stays active.
  }
}

/** Contract for the future ESP32-backed provider (kept for compatibility). */
export interface Esp32DataSourceProviderContract extends DataSourceProvider {
  readonly id: "esp32";
  readonly kind: "esp32";
  /** Base URL of the SKYSENSE ingestion API. */
  readonly baseUrl: string;
  /** Server-side device credential handle (never a plaintext secret). */
  readonly credentialRef: string;
}