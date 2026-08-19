"use client";

import type { FC, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WeatherHeroProps {
  greeting: string;
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  uvIndex?: number;
  aqi: "Good" | "Moderate" | "Poor" | "Hazardous";
  aqiDescription: string;
  className?: string;
}

const conditionIcons: Record<string, ReactNode> = {
  Sunny: <span className="text-6xl">☀️</span>,
  "Partly Cloudy": <span className="text-6xl">⛅</span>,
  Cloudy: <span className="text-6xl">☁️</span>,
  Rain: <span className="text-6xl">🌧️</span>,
  Thunderstorms: <span className="text-6xl">⛈️</span>,
  Snow: <span className="text-6xl">❄️</span>,
  Fog: <span className="text-6xl">🌫️</span>,
  Windy: <span className="text-6xl">💨</span>,
};

const aqiStatus: Record<WeatherHeroProps["aqi"], { color: string; bar: number }> = {
  Good: { color: "var(--color-success)", bar: 100 },
  Moderate: { color: "var(--color-warning)", bar: 70 },
  Poor: { color: "var(--color-danger)", bar: 40 },
  Hazardous: { color: "var(--color-danger)", bar: 15 },
};

const MapPinIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const DropletIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2.7s6.5 7 6.5 11.5a6.5 6.5 0 1 1-13 0C5.5 9.7 12 2.7 12 2.7Z" />
  </svg>
);

const WindIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17.7 7.6A2.4 2.4 0 1 0 16 4.4" />
    <path d="M3 8h13.6a2.4 2.4 0 0 0 0-4.8" />
    <path d="M3 12h16.5a2.7 2.7 0 1 1-1.8 4.7" />
    <path d="M3 16h9.5a2.2 2.2 0 1 1-1.5 3.8" />
  </svg>
);

const SunIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const particleDots = [
  { left: "12%", top: "24%", delay: "0s" },
  { left: "26%", top: "68%", delay: "1.1s" },
  { left: "68%", top: "16%", delay: "0.6s" },
  { left: "84%", top: "58%", delay: "1.6s" },
];

export const WeatherHero: FC<WeatherHeroProps> = ({
  greeting,
  location,
  temperature,
  condition,
  humidity,
  windSpeed,
  uvIndex,
  aqi,
  aqiDescription,
  className = "",
}) => {
  const Icon = conditionIcons[condition] || <span className="text-6xl">🌤️</span>;
  const aqiConfig = aqiStatus[aqi];

  const metricChips: Array<{ icon: ReactNode; value: string; label: string }> = [
    { icon: <DropletIcon className="w-4 h-4" />, value: `${humidity}%`, label: "Humidity" },
    { icon: <WindIcon className="w-4 h-4" />, value: `${windSpeed}`, label: "km/h Wind" },
  ];
  if (uvIndex !== undefined) {
    metricChips.push({ icon: <SunIcon className="w-4 h-4" />, value: `UV ${uvIndex}`, label: "Index" });
  }

  return (
    <motion.div
      className={`card-premium p-6 lg:p-8 relative overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 45%, color-mix(in srgb, var(--color-sky) 12%, transparent))",
          }}
        />
        <div
          className="absolute -top-24 -right-16 w-72 h-72 atmosphere-blob atmosphere-drift"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-28 -left-16 w-80 h-80 atmosphere-blob atmosphere-drift-slow"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-sky) 13%, transparent), transparent 70%)" }}
        />
        <div className="absolute inset-0 atmosphere-grid opacity-60" />
        {particleDots.map((dot, i) => (
          <span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-accent/50 float-animation"
            style={{ left: dot.left, top: dot.top, animationDelay: dot.delay }}
          />
        ))}
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm text-muted-foreground">{greeting}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden="true" />
              Simulated environmental data
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-foreground">
            <MapPinIcon className="w-5 h-5 text-accent" />
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{location}</h1>
          </div>

          <p className="text-xs text-muted-foreground max-w-md text-balance">
            SKYSENSE — intelligent environmental monitoring, weather forecasting and IoT platform.
          </p>

          <div className="relative flex items-baseline gap-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={temperature}
                className="text-7xl lg:text-8xl font-extrabold tracking-tight text-foreground tabular-nums leading-none"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {temperature}°
              </motion.span>
            </AnimatePresence>
            <span className="text-3xl font-light text-muted-foreground">C</span>
            <span className="ml-1 inline-flex items-center gap-2 text-xl text-secondary font-medium">
              <span aria-hidden="true" className="inline-block">
                {Icon}
              </span>
              {condition}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {metricChips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/70 border border-border"
              >
                <span className="text-accent">{chip.icon}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{chip.value}</span>
                <span className="text-xs text-muted-foreground">{chip.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 lg:items-end">
          <motion.div
            className="relative flex justify-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div className="relative w-40 h-40 lg:w-52 lg:h-52">
              <div className="absolute inset-0 rounded-full bg-accent/10 blur-2xl animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-accent/20" />
              <div className="relative flex items-center justify-center h-full">
                <div className="text-7xl lg:text-8xl filter drop-shadow-xl">{Icon}</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="card-elevated p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: aqiConfig.color, boxShadow: `0 0 0 4px ${aqiConfig.color}22` }}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-foreground">Air Quality</span>
              </div>
              <p className="text-3xl font-bold tabular-nums" style={{ color: aqiConfig.color }}>
                {aqi}
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: aqiConfig.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${aqiConfig.bar}%` }}
                  transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.5 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2.5">{aqiDescription}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export type { WeatherHeroProps };
