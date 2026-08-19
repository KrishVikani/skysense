"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useLocation } from "@/components/LocationProvider";
import { getWeather } from "@/lib/weather/service";
import type { WeatherLocation } from "@/lib/weather/locations";
import type { WeatherData } from "@/lib/weather/types";
import { visualStateForCondition, type WeatherVisualState } from "@/lib/weather/visual";
import { isNight } from "@/lib/weather/conditions";
import { WeatherError, WEATHER_ERROR_TITLES } from "@/lib/weather/errors";
import { getEnvironmentalIntelligence } from "@/lib/intelligence/service";
import type { AIAnalysis } from "@/lib/intelligence/types";
import { getEnvironmentalForecast } from "@/lib/forecast/service";
import type { ForecastResult } from "@/lib/forecast/types";
import { WeatherAtmosphere } from "@/components/weather/WeatherAtmosphere";
import { WeatherAmbienceControl } from "@/components/weather/WeatherAmbienceControl";
import { LocationSearch } from "@/components/weather/LocationSearch";
import { WeatherHero } from "@/components/weather/WeatherHero";
import { WeatherMetrics } from "@/components/weather/WeatherMetrics";
import { TodayOutlook } from "@/components/weather/TodayOutlook";
import { HourlyForecast } from "@/components/weather/HourlyForecast";
import { TemperatureTrend } from "@/components/weather/TemperatureTrend";
import { PrecipitationTimeline } from "@/components/weather/PrecipitationTimeline";
import { DailyForecast } from "@/components/weather/DailyForecast";
import { SunTimes } from "@/components/weather/SunTimes";
import { WeatherInsight } from "@/components/weather/WeatherInsight";
import { AtmosphereSection } from "@/components/weather/AtmosphereSection";

function WeatherSkeleton() {
  return (
    <div className="space-y-6 animate-in" role="status" aria-label="Loading weather">
      <div className="h-12 max-w-xl skeleton-shimmer rounded-2xl" />
      <div className="relative h-[22rem] overflow-hidden rounded-[2rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/25 via-sky-500/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute inset-0 skeleton-shimmer" />
        <div className="absolute bottom-6 left-6 h-4 w-32 skeleton-shimmer rounded-lg" />
        <div className="absolute bottom-12 left-6 h-10 w-24 skeleton-shimmer rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="h-40 rounded-2xl skeleton-shimmer card-premium" />
      <div className="h-44 rounded-2xl skeleton-shimmer card-premium" />
      <div className="h-40 rounded-2xl skeleton-shimmer card-premium" />
      <div className="h-72 rounded-2xl skeleton-shimmer card-premium" />
      <div className="h-48 rounded-2xl skeleton-shimmer card-premium" />
    </div>
  );
}

export default function WeatherPageClient() {
  const { location, setLocation } = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<WeatherError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await getWeather(location);
        if (cancelled) return;
        setWeather(data);

        // The intelligence + forecast engines are deterministic analyses over
        // the SIMULATED environmental feed. They are only meaningful for the
        // demo/fallback source; live provider data never gets tagged with
        // simulated-derived insight.
        if (data.dataSource === "simulation") {
          const [analysisData, forecastData] = await Promise.all([
            getEnvironmentalIntelligence("24h"),
            getEnvironmentalForecast("6h", "24h"),
          ]);
          if (cancelled) return;
          setAnalysis(analysisData);
          setForecast(forecastData);
        } else {
          setAnalysis(null);
          setForecast(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof WeatherError ? caught : new WeatherError("unavailable"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  const handleSelectLocation = useCallback(
    (next: WeatherLocation) => {
      setLocation(next);
    },
    [setLocation]
  );

  const visualState: WeatherVisualState = weather
    ? visualStateForCondition(
        weather.current.condition,
        weather.current.isDay ?? !isNight(weather.current.updatedAt),
        Date.now() + (weather.timezoneOffsetSeconds ?? 0) * 1000,
        weather.current.sunrise ? new Date(weather.current.sunrise).getTime() : undefined,
        weather.current.sunset ? new Date(weather.current.sunset).getTime() : undefined
      )
    : "night";

  return (
    <DashboardShell atmosphere="weather">
      <div className="relative">
        {weather && <WeatherAtmosphere state={visualState} />}

        <div className="relative z-10 space-y-10">
          <div className="mx-auto w-full max-w-xl">
            <LocationSearch location={location} onSelect={handleSelectLocation} />
          </div>

          {loading && <WeatherSkeleton />}

          {!loading && error && (
            <div className="card-premium relative overflow-hidden p-8 text-center" role="alert">
              <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
              <CloudOff className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">{WEATHER_ERROR_TITLES[error.code]}</h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">{error.userMessage}</p>
              <button type="button" onClick={retry} className="btn-secondary mt-5">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {!loading && !error && weather && (
            <>
              <WeatherHero
                data={weather.current}
                location={location}
                source={weather.source}
                visualState={visualState}
                timezoneOffsetSeconds={weather.timezoneOffsetSeconds}
              />

              <TodayOutlook
                current={weather.current}
                hourly={weather.hourly}
                daily={weather.daily}
                dataSource={weather.dataSource}
              />
              <HourlyForecast items={weather.hourly} dataSource={weather.dataSource} />
              <TemperatureTrend items={weather.hourly} />
              <PrecipitationTimeline items={weather.hourly} dataSource={weather.dataSource} />
              <DailyForecast items={weather.daily} dataSource={weather.dataSource} />

              <SunTimes
                sunrise={weather.current.sunrise}
                sunset={weather.current.sunset}
                timezoneOffsetSeconds={weather.timezoneOffsetSeconds}
              />

              <WeatherMetrics data={weather.current} />
              <WeatherInsight data={weather.current} />

              {weather.dataSource === "simulation" && analysis && forecast && (
                <AtmosphereSection analysis={analysis} forecast={forecast} />
              )}

              <div className="flex flex-col gap-3 pt-2 text-[11px] leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-1.5">
                  <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {weather.dataSource === "external"
                      ? `Live weather for ${weather.location} via OpenWeather · ESP32 hardware is not connected.`
                      : `Current and forecast conditions are derived from ${weather.source} · ESP32 hardware is not connected. Set OPENWEATHER_API_KEY to enable live city weather and location search.`}
                  </span>
                </p>

                <WeatherAmbienceControl visualState={visualState} />
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}