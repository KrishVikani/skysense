"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Database, Droplets, Leaf, MapPin, Sun, Timer, Wind } from "lucide-react";
import type { DeviceSnapshot } from "@/lib/devices/types";
import { formatAge } from "@/lib/devices/quality";
import { aqiCategoryOf, uvRiskOf } from "@/lib/environmental/service";
import type { EnvironmentalReading } from "@/lib/environmental/types";
import { conditionFromReading, compassLabel } from "@/lib/weather/conditions";
import { WeatherConditionIcon } from "@/components/weather/WeatherConditionIcon";
import { StationAtmosphere } from "./StationAtmosphere";

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3 backdrop-blur-md">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">{label}</p>
        <p className="truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

/**
 * My Station hero: a premium, weather-app-style panel that immediately answers
 * "here is what my station is measuring right now". Identity, current condition
 * and the large temperature dominate; the simulation/hardware state stays
 * visible but honest. All values come from the existing snapshot/reading.
 */
export function StationHero({
  snapshot,
  reading,
}: {
  snapshot: DeviceSnapshot;
  reading: EnvironmentalReading;
}) {
  const sensor = (key: string) => snapshot.sensors.find((s) => s.key === key);

  const temp = sensor("temperature");
  const humidity = sensor("humidity");
  const wind = sensor("windSpeed");
  const uv = sensor("uvIndex");
  const aqi = sensor("airQuality");

  const condition = conditionFromReading(reading);
  const tempValue = temp ? Math.round(temp.value ?? reading.temperature) : Math.round(reading.temperature);
  const tempUnit = temp?.unit ?? "°C";
  const humidityLabel = humidity ? `${humidity.valueLabel}%` : `${Math.round(reading.humidity)}%`;
  const windLabel = wind
    ? `${wind.valueLabel}${wind.unit && !wind.valueLabel.includes(wind.unit) ? ` ${wind.unit}` : ""} · ${compassLabel(reading.windDirection)}`
    : `${reading.windSpeed.toFixed(1)} km/h`;
  const uvLabel = uv
    ? `${uv.valueLabel} · ${uvRiskOf(reading.uvIndex)}`
    : `${reading.uvIndex.toFixed(1)} · ${uvRiskOf(reading.uvIndex)}`;
  const aqiLabel = aqi
    ? `${aqi.valueLabel} · ${aqiCategoryOf(reading.airQuality)}`
    : `${Math.round(reading.airQuality)} · ${aqiCategoryOf(reading.airQuality)}`;

  return (
    <motion.section
      className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-sky-950/20 ring-1 ring-white/10"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="station-hero-title"
    >
      <StationAtmosphere conditionId={condition.id} temperatureC={reading.temperature} />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45"
        aria-hidden="true"
      />

      <div className="relative z-10 p-6 lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/75">
              {snapshot.deviceName} · {snapshot.deviceId}
            </p>
            <h2 id="station-hero-title" className="mt-1 text-lg font-semibold text-white sm:text-xl">
              Here&apos;s what your station is measuring right now
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-300" />
              </span>
              {snapshot.mode === "live" ? "Live ESP32 Telemetry" : "Simulation Mode"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
              <span className={`h-1.5 w-1.5 rounded-full ${snapshot.connection === "online" ? "bg-emerald-400" : "bg-white/70"}`} aria-hidden="true" />
              {snapshot.connection === "online" ? "Hardware Connected" : "Hardware Not Connected"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="text-white">
            <p className="text-7xl font-bold leading-none tracking-tight tabular-nums sm:text-8xl lg:text-9xl">
              {tempValue}
              <span className="align-top text-4xl font-semibold text-white/75 lg:text-5xl">{tempUnit}</span>
            </p>
            <div className="mt-4 flex items-center gap-2">
              <WeatherConditionIcon condition={condition} className="h-7 w-7" />
              <p className="text-2xl font-semibold tracking-tight">{condition.label}</p>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {snapshot.location}
            </p>
          </div>

          <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            <StatTile
              icon={<Droplets className="h-5 w-5 text-sky-200" aria-hidden="true" />}
              label="Humidity"
              value={humidityLabel}
            />
            <StatTile
              icon={<Wind className="h-5 w-5 text-sky-200" aria-hidden="true" />}
              label="Wind"
              value={windLabel}
            />
            <StatTile
              icon={<Sun className="h-5 w-5 text-amber-200" aria-hidden="true" />}
              label="UV Index"
              value={uvLabel}
            />
            <StatTile
              icon={<Leaf className="h-5 w-5 text-emerald-200" aria-hidden="true" />}
              label="Air Quality"
              value={aqiLabel}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-xs text-white/75">
          <span className="inline-flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            Last measurement{" "}
            <span className="font-semibold text-white">{formatAge(snapshot.dataAgeMs)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            Data source{" "}
            <span className="font-semibold text-white">{snapshot.dataSource}</span>
          </span>
          <span className="text-white/70">
            {snapshot.mode === "live"
              ? "Live readings from your ESP32 station."
              : "Values are simulated until the ESP32 station is connected."}
          </span>
        </div>
      </div>
    </motion.section>
  );
}
