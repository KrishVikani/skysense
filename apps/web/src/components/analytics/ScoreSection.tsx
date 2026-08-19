"use client";

import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import type { EnvironmentalScore } from "@/lib/environmental/types";

interface ScoreSectionProps {
  score: EnvironmentalScore;
}

function scoreColor(value: number): string {
  if (value >= 80) return "var(--color-success)";
  if (value >= 60) return "var(--color-warning)";
  if (value >= 40) return "var(--color-danger)";
  return "var(--color-muted)";
}

const BREAKDOWN_LABELS: Record<string, string> = {
  temperature: "Temperature",
  humidity: "Humidity",
  airQuality: "Air Quality",
  uvIndex: "UV Exposure",
};

export function ScoreSection({ score }: ScoreSectionProps) {
  const ringSize = 140;
  const stroke = 10;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score.overall / 100);
  const color = scoreColor(score.overall);

  const breakdownEntries = Object.entries(score.breakdown).filter(
    ([key]) => key !== "windSpeed" && key !== "pressure" && key !== "rainfall"
  );

  return (
    <motion.div
      className="card-premium p-6 lg:p-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative" style={{ width: ringSize, height: ringSize }}>
            <svg className="w-full h-full -rotate-90" width={ringSize} height={ringSize} aria-hidden="true">
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={stroke}
              />
              <motion.circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.15))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tabular-nums" style={{ color }}>{score.overall}</p>
              <p className="text-xs text-muted-foreground">/ 100</p>
            </div>
          </div>
          <span
            className="badge font-semibold"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
          >
            <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
            SKYSENSE Environmental Score
          </span>
        </div>

        <div>
          <h2 className="section-title">Environmental Score</h2>
          <p className="section-subtitle mt-0.5">Aggregated from temperature, humidity, air quality and UV data</p>
          <p className="mt-4 text-foreground font-medium">{score.label}</p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {breakdownEntries.map(([key, value]) => (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{BREAKDOWN_LABELS[key] || key}</span>
                  <span className="font-medium text-foreground">{value}/100</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: scoreColor(value) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            The SKYSENSE Environmental Score is an internal demonstration metric based on mock sensor data. It is not a
            scientifically validated environmental index.
          </p>
        </div>
      </div>
    </motion.div>
  );
}