"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CloudRain,
  Database,
  Info,
  LineChart,
  Minus,
  ShieldAlert,
  Sparkles,
  Umbrella,
} from "lucide-react";
import { getEnvironmentalForecast } from "@/lib/forecast/service";
import type {
  ForecastDirection,
  ForecastHorizon,
  ForecastResult,
  MetricForecast,
} from "@/lib/forecast/types";
import { FORECAST_HORIZONS } from "@/lib/forecast/types";
import { useSettings } from "@/components/SettingsProvider";
import {
  CONFIDENCE_COLOR,
  DATA_QUALITY_COLOR,
  DIRECTION_COLOR,
  SEVERITY_COLOR,
} from "./severity";

interface ForecastSectionProps {
  className?: string;
}

const METRIC_CARDS: { key: keyof ForecastResult; label: string; unit: string }[] = [
  { key: "temperature", label: "Temperature", unit: "°C" },
  { key: "humidity", label: "Humidity", unit: "%" },
  { key: "pressure", label: "Pressure", unit: " hPa" },
  { key: "windSpeed", label: "Wind speed", unit: " km/h" },
  { key: "airQuality", label: "Air quality", unit: " AQI" },
  { key: "uvIndex", label: "UV index", unit: "" },
  { key: "rainfall", label: "Rainfall", unit: " mm" },
];

function DirectionIcon({ direction, className }: { direction: ForecastDirection; className?: string }) {
  const color = DIRECTION_COLOR[direction];
  if (direction === "up") return <ArrowUp className={className} style={{ color }} />;
  if (direction === "down") return <ArrowDown className={className} style={{ color }} />;
  return <Minus className={className} style={{ color }} />;
}

function formatValue(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return value.toFixed(digits);
}

function MetricTile({ metric, label, unit, index }: { metric: MetricForecast; label: string; unit: string; index: number }) {
  return (
    <motion.div
      className="card-elevated p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <DirectionIcon direction={metric.direction} className="w-4 h-4" />
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-foreground">{formatValue(metric.expected)}{unit}</span>
        {metric.expected !== null && metric.current !== null && (
          <span className="text-[11px] text-muted-foreground">
            from {formatValue(metric.current)}{unit}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {metric.rangeLow !== null && metric.rangeHigh !== null
            ? `${formatValue(metric.rangeLow)}–${formatValue(metric.rangeHigh)}${unit}`
            : "No projection"}
        </span>
        {metric.confidence !== null && <span>{metric.confidence}% conf.</span>}
      </div>
    </motion.div>
  );
}

function ForecastSkeleton() {
  return (
    <div className="space-y-6 animate-in">
      <div className="card-premium p-6">
        <div className="h-7 w-56 skeleton-shimmer rounded-lg" />
        <div className="h-4 w-80 max-w-full skeleton-shimmer rounded mt-2" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-elevated p-5 h-28 skeleton-shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-premium p-6 h-52 skeleton-shimmer" />
        <div className="card-premium p-6 h-52 skeleton-shimmer" />
      </div>
    </div>
  );
}

export function ForecastSection({ className }: ForecastSectionProps) {
  const { settings, loaded } = useSettings();
  const [horizon, setHorizon] = useState<ForecastHorizon>(settings.forecast?.horizon ?? "3h");
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Adopt the user's preferred horizon once their settings load (the inline
  // switcher still overrides for this session).
  useEffect(() => {
    if (loaded && settings.forecast?.horizon) {
      setHorizon(settings.forecast.horizon);
    }
  }, [loaded, settings.forecast?.horizon]);

  const showConfidence = settings.forecast?.showConfidence ?? true;
  const showRecommendations = settings.forecast?.showRecommendations ?? true;
  const showRisk = settings.forecast?.showRisk ?? true;
  const showExplanation = settings.forecast?.showExplanation ?? true;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getEnvironmentalForecast(horizon, "24h")
      .then((data) => {
        if (cancelled) return;
        setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [horizon, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const horizonLabel =
    result?.horizon === "1h" ? "1 hour" : result?.horizon === "3h" ? "3 hours" : "6 hours";

  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="card-premium p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-accent" />
            <h2 className="section-title">Forecast Outlook</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-muted/5 p-1 gap-1">
              {FORECAST_HORIZONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizon(h)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    horizon === h
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {h === "1h" ? "1h" : h === "3h" ? "3h" : "6h"}
                </button>
              ))}
            </div>
            <button type="button" onClick={retry} className="btn-secondary">
              <Sparkles className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
        <p className="section-subtitle mt-0.5">
          Short-term environmental outlook derived from recent history
        </p>

        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-muted/5">
          <Database className="w-4 h-4 text-accent" />
          Forecast source:{" "}
          <span className="text-foreground font-semibold">{result?.source ?? "Simulated environmental data"}</span>
        </div>
      </div>

      {error && (
        <div className="card-premium p-6 mt-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-warning" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Forecast unavailable</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                The forecast could not be generated right now. Try refreshing.
              </p>
            </div>
            <button type="button" onClick={retry} className="btn-secondary">
              Retry
            </button>
          </div>
        </div>
      )}

      {loading && !result && <div className="mt-6"><ForecastSkeleton /></div>}

      {result && !loading && (
        <div className="mt-6 space-y-6">
          {/* Data quality + confidence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-premium p-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-accent" />
                <h3 className="section-title">Data Quality</h3>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${DATA_QUALITY_COLOR[result.dataQuality]} 15%, transparent)`,
                    color: DATA_QUALITY_COLOR[result.dataQuality],
                  }}
                >
                  {result.dataQualityLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {result.window.sampleCount} sample{result.window.sampleCount === 1 ? "" : "s"} &middot;{" "}
                  {result.window.spanHours}h history
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{result.confidenceExplanation}</p>
              {result.dataQuality !== "good" && result.dataQuality !== "limited" && (
                <p className="text-xs text-warning mt-3 flex items-start gap-1.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    This forecast is intentionally withheld or downgraded because the available history is not
                    reliable enough.
                  </span>
                </p>
              )}
            </div>

            {showConfidence && (
              <div className="card-premium p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h3 className="section-title">Forecast Confidence</h3>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full shrink-0 flex flex-col items-center justify-center" style={{
                    background: `conic-gradient(${CONFIDENCE_COLOR[result.confidenceLevel]} ${result.confidence}%, var(--color-border) 0)`,
                    WebkitMask: "radial-gradient(circle, transparent 62%, black 63%)",
                    mask: "radial-gradient(circle, transparent 62%, black 63%)",
                  }}>
                    <span className="text-lg font-bold text-foreground">{result.confidence}%</span>
                    <span className="text-[10px] text-muted-foreground">{result.confidenceLevel}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.confidenceExplanation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metric outlooks */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LineChart className="w-4 h-4 text-accent" />
              <h3 className="section-title">Expected conditions in {horizonLabel}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {METRIC_CARDS.map((card, index) => {
                const metric = result[card.key] as MetricForecast;
                return (
                  <MetricTile key={card.key} metric={metric} label={card.label} unit={card.unit} index={index} />
                );
              })}
            </div>
          </div>

          {/* Precipitation + Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-premium p-6">
              <div className="flex items-center gap-2">
                <Umbrella className="w-5 h-5 text-accent" />
                <h3 className="section-title">Environmental Rain Likelihood</h3>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="shrink-0">
                  <p className="text-4xl font-bold text-foreground">{result.precipitation.likelihood}%</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <DirectionIcon direction={result.precipitation.direction} className="w-3.5 h-3.5" />
                    {result.precipitation.label}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.precipitation.reason}</p>
                </div>
              </div>
              <div className="mt-4">
                {result.features.rainContributions.filter((c) => c.points > 0).length > 0 && (
                  <div className="space-y-1.5">
                    {result.features.rainContributions
                      .filter((c) => c.points > 0)
                      .sort((a, b) => b.points - a.points)
                      .slice(0, 3)
                      .map((c) => (
                        <div key={c.label} className="flex items-center gap-2 text-xs">
                          <span className="w-32 shrink-0 text-muted-foreground">{c.label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, c.points * 5)}%`, backgroundColor: "var(--color-accent)" }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {showRisk && (
              <div className="card-premium p-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-accent" />
                  <h3 className="section-title">Forward Risk</h3>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="shrink-0 text-center">
                    <p className="text-4xl font-bold" style={{ color: SEVERITY_COLOR[result.risk.severity] }}>
                      {result.risk.score}
                    </p>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide mt-1 inline-block"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${SEVERITY_COLOR[result.risk.severity]} 14%, transparent)`,
                        color: SEVERITY_COLOR[result.risk.severity],
                      }}
                    >
                      {result.risk.severityLabel}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.risk.explanation}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {result.risk.categories.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-medium"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${SEVERITY_COLOR[c.severity]} 12%, transparent)`,
                        color: SEVERITY_COLOR[c.severity],
                      }}
                    >
                      {c.label} · {c.score}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Why + recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {showExplanation && (
              <div className="card-premium p-6">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-accent" />
                  <h3 className="section-title">Why this outlook</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{result.explanation}</p>
                <ul className="mt-4 space-y-2">
                  {result.contributingFactors.map((factor) => (
                    <li key={factor} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "var(--color-accent)" }} />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showRecommendations && (
              <div className="card-premium p-6">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-accent" />
                  <h3 className="section-title">Recommendations</h3>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {result.recommendations.map((rec) => (
                    <li key={rec} className="flex items-start gap-2 text-sm text-foreground/80">
                      <ArrowUp className="w-4 h-4 text-accent shrink-0 mt-0.5 rotate-45" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              This is an explainable, deterministic environmental trend forecast generated by SKYSENSE from simulated
              data — it is a data-quality indicator, not a professional meteorological prediction. ESP32 hardware is not
              connected.
            </span>
          </p>
        </div>
      )}
    </motion.section>
  );
}