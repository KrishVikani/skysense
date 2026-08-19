# Environmental Forecasting Engine

The SKYSENSE forecasting engine produces **short-term, explainable, deterministic
environmental outlooks** (1h / 3h / 6h) from the recent observed history. It is a
trend-projection and risk-scoring layer — **not** a professional meteorological
prediction service.

## Status

- `FORECASTING ENGINE: WORKING` — deterministic engine live, tested.
- `SIMULATION: WORKING` — the engine consumes simulated data today.
- `ESP32: NOT CONNECTED — FUTURE HARDWARE INTEGRATION` — the engine is already
  source-agnostic and will consume real telemetry unchanged once hardware lands.

## Architecture

```
provider.fetchReadings(range)
        │  (canonical EnvironmentalReading[] — simulation today, ESP32 later)
        ▼
generateForecast(readings, horizon)          lib/forecast/engine.ts
        │  (active ForecastEngine — currently DeterministicForecastEngine)
        ▼
ForecastResult                                lib/forecast/types.ts
        │
        ├─ UI        apps/web/src/components/forecast/ForecastSection.tsx  (/ai page)
        └─ future:   Alerts / AI layers consume the same contract
```

Modules under `apps/web/src/lib/forecast/`:

| File          | Responsibility |
|---------------|----------------|
| `types.ts`    | `ForecastResult`, `ForecastEngine` interface, horizons, contract types |
| `quality.ts`  | data-quality assessment + honest confidence derivation |
| `features.ts` | deterministic feature extraction (trends, rain likelihood, stability) |
| `risk.ts`     | forward-looking risk scoring (trend-aware, 6 categories) |
| `engine.ts`   | `DeterministicForecastEngine` (pure/deterministic) + engine registry |
| `service.ts`  | `getEnvironmentalForecast(horizon, range)` entry point |

### Engine abstraction (future ML path)

`ForecastEngine` is a one-method interface: `generate(readings, horizon, context) → ForecastResult`.
Consumers only ever call `generateForecast(...)`. To move to ML later:

```ts
import { setForecastEngine } from "@/lib/forecast/engine";

setForecastEngine(new AdvancedForecastEngine(model, normalizer));
// UI, alerts, AI, storage and the device API are untouched.
```

A future `AdvancedForecastEngine` replaces `DeterministicForecastEngine` with zero
changes to consumers. A test in `forecast-test.cjs` verifies the swap.

## ForecastResult contract

`generatedAt`, `engine`, `engineLabel`, `source`, `dataSource`, `location`,
`horizon`, `dataQuality`, `dataQualityLabel`, `confidence`, `confidenceLevel`,
`confidenceExplanation`, per-metric `MetricForecast` (temperature, humidity,
pressure, windSpeed, airQuality, uvIndex, rainfall), `precipitation`,
`risk`, `features`, `explanation`, `contributingFactors`, `recommendations`,
`window`. The contract is extensible — adding a metric later does not break
existing consumers.

## Feature calculations (deterministic)

- **Per-metric trend**: least-squares linear fit of value vs. time (hours since
  first sample), which correctly handles unevenly spaced timestamps. Produces
  `perHour` slope, `shortTermPerHour` (recent third, ≥3 points), `volatility`
  (sample standard deviation) and a direction with a per-metric dead-band.
- **Wind**: circular mean of windDirection → dominant compass label.
- **Environmental rain likelihood (0–100)**: explainable sum of scored drivers —
  humidity level, humidity rise, pressure fall, low pressure, recent rainfall,
  wind change, atmospheric instability. Each driver contributes a labelled
  `{ points, note }` entry so the UI can show *why*.
- **Stability (0–100)**: pressure + temperature volatility, plus sustained
  pressure fall; higher = more unstable.
- **Projection**: `expected = clampToBounds(current + perHour × horizon)`;
  range = expected ± (volatility × √horizon + per-metric margin), clamped to the
  sensor's physical bounds.

Missing values are handled **per metric**: a metric with no valid samples reports
`current: null`, `direction: "unknown"`, `expected: null` and is never converted
to zero.

## Risk calculations (forward outlook)

Six categories scored 0–100 using the *projected* value at the horizon:
temperature, air quality, UV, humidity comfort, wind, precipitation. The overall
score is a fixed weighted average (temperature 0.25, air 0.20, UV 0.15,
humidity 0.10, wind 0.10, precipitation 0.20). Severity bands: `<20` low, `<45`
moderate, `<70` high, else critical. This is trend-aware and complementary to the
AI layer's current-state analysis and the Alerts engine's notification decisions
— it never emits alerts itself.

## Data-quality behavior

| State          | Trigger                                                       | Behavior                                  |
|----------------|---------------------------------------------------------------|-------------------------------------------|
| `no_data`      | 0 readings                                                    | confidence 0, no projections              |
| `insufficient` | 1 reading, <4 samples, or <2h span                            | confidence 0, no projections              |
| `limited`      | <12 samples or <12h span                                      | low confidence, penalized                 |
| `good`         | ≥12 samples, ≥12h span, fresh                                 | normal confidence                         |
| `stale`        | latest reading older than 6h                                  | heavy confidence penalty                  |
| `invalid`      | readings present but no usable numeric values                 | confidence 0, no projections              |

Confidence (0–100) starts at a base and is honestly reduced for limited/stale
history and high variability. Insufficient data never yields a confident-looking
forecast.

## Simulation + hardware compatibility

The engine consumes only the canonical `EnvironmentalReading` series from the
existing data-provider abstraction. With the simulation, `getEnvironmentalForecast`
returns `dataSource: "simulation"` and source `"Simulated environmental data"`.
When the future ESP32 provider serves real readings, the same engine runs
unchanged and reports `dataSource: "esp32"`. The UI labels the forecast as
"Forecast source: Simulated environmental data" until hardware is connected.

## Alerts / AI integration

`ForecastResult` is the documented input contract for the existing alert and AI
layers (`EnvironmentalData + ForecastResult → AlertEngine → Alert[]`). It is
currently exposed via `getEnvironmentalForecast`; wiring it into alert rules is
an additive, non-breaking change and is intentionally left to the integration
phase so the working Alerts engine is not touched.

## Testing

`D:\Temp\opencode\forecast-test.cjs` — 56 checks covering no data, insufficient,
valid, limited and stale history; rising/falling trends for temperature,
humidity, pressure, rainfall and wind; poor AQI / high UV / high temperature
risk; projection bounds; determinism; risk schema; contract completeness;
missing-value safety; simulation compatibility through the service; engine swap;
and regression of the Analytics, AI and Alerts layers. All harnesses
(devices 121, alerts 47, ai-intel 52, pipeline 34, persistence 14, forecast 56)
pass with 0 failures.

## Limitations

- Trend-projection only — no convective storm nowcasting, radar, or satellite data.
- The rain likelihood is an *environmental* indicator derived from local sensor
  trends, not a precipitation forecast from a meteorological provider.
- Confidence is deliberately low and honest when history is thin or stale.
- Simulated data means values are illustrative; ESP32 hardware is not connected.