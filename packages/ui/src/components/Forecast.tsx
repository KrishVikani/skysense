"use client";

import type { FC } from "react";
import { motion } from "framer-motion";
import type { WeatherForecast } from "@skysense/domain-types";

interface ForecastProps {
  data: WeatherForecast[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  className?: string;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const conditionIcons: Record<string, string> = {
  Sunny: "☀️",
  "Partly Cloudy": "⛅",
  Cloudy: "☁️",
  Rain: "🌧️",
  Thunderstorms: "⛈️",
  Snow: "❄️",
  Fog: "🌫️",
  Windy: "💨",
};

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

const RainIcon = ({ className = "" }: { className?: string }) => (
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
    <path d="M20 16.6A4.5 4.5 0 0 0 17.5 8h-1.2A7 7 0 1 0 5 14.9" />
    <path d="M16 19l-1.5 3M10 19l-1.5 3" />
  </svg>
);

const uvMeta = (u: number) => {
  if (u >= 11) return { label: "Extreme", color: "var(--color-danger)" };
  if (u >= 8) return { label: "Very High", color: "var(--color-danger)" };
  if (u >= 6) return { label: "High", color: "var(--color-warning)" };
  if (u >= 3) return { label: "Moderate", color: "var(--color-warning)" };
  return { label: "Low", color: "var(--color-success)" };
};

export const Forecast: FC<ForecastProps> = ({
  data,
  selectedDate,
  onSelectDate,
  className = "",
}) => {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title">7-Day Forecast</h2>
          <p className="section-subtitle">Environmental outlook for the week ahead</p>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide pb-4 pt-3 -mx-4 px-4">
        <motion.div
          className="flex gap-3 min-w-max"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {data.map((day, index) => {
            const date = new Date(day.date);
            const dayName = dayNames[date.getDay()];
            const monthName = monthNames[date.getMonth()];
            const dayNum = date.getDate();
            const isToday = index === 0;
            const isSelected = selectedDate === day.date;
            const Icon = conditionIcons[day.condition] || "🌤️";
            const uv = uvMeta(day.uvIndex);

            return (
              <motion.button
                key={day.date}
                onClick={() => onSelectDate?.(day.date)}
                aria-pressed={isSelected}
                className={`relative flex-shrink-0 w-36 lg:w-40 card-premium p-4 flex flex-col items-center gap-2.5 text-center transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  isToday
                    ? "border-accent/50 shadow-lg shadow-accent/10 bg-gradient-to-b from-accent/5 to-transparent"
                    : ""
                }`}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {isToday && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/25">
                    Today
                  </span>
                )}

                <div className="w-full">
                  <p className={`text-sm font-semibold ${isToday ? "text-accent" : "text-foreground"}`}>
                    {dayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {monthName} {dayNum}
                  </p>
                </div>

                <motion.span
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/5 border border-border text-3xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {Icon}
                </motion.span>

                <div className="w-full">
                  <p className="text-lg font-bold text-foreground tabular-nums leading-tight">
                    {day.temperature.max}°<span className="text-sm font-medium text-muted-foreground"> / {day.temperature.min}°</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{day.condition}</p>
                </div>

                <div className="flex items-center justify-center gap-3 w-full">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <DropletIcon className="w-3.5 h-3.5 text-sky" />
                    <span className="tabular-nums">{day.humidity}%</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <RainIcon className="w-3.5 h-3.5 text-sky" />
                    <span className="tabular-nums">{day.precipitationChance}%</span>
                  </span>
                </div>

                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium w-full"
                  style={{ backgroundColor: `${uv.color}1a`, color: uv.color }}
                >
                  UV {day.uvIndex} · {uv.label}
                </span>

                {isSelected && (
                  <motion.div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-t-full"
                    style={{ backgroundColor: "var(--color-accent)" }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export type { ForecastProps };