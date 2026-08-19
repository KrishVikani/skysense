"use client";

import type { FC } from "react";

interface ActivitySuitabilityProps {
  icon: string;
  title: string;
  score: number;
  suitability: "Excellent" | "Good" | "Moderate" | "Poor";
  bestTime: string;
  className?: string;
}

const suitabilityColors = {
  Excellent: "var(--color-success)",
  Good: "var(--color-info)",
  Moderate: "var(--color-warning)",
  Poor: "var(--color-danger)",
};

export const ActivitySuitability: FC<ActivitySuitabilityProps> = ({
  icon,
  title,
  score,
  suitability,
  bestTime,
  className = "",
}) => {
  const color = suitabilityColors[suitability];

  return (
    <div className={`rounded-2xl bg-card p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-muted text-sm">{suitability}</p>
          </div>
        </div>
        <p className="text-3xl font-bold" style={{ color }}>{score}/100</p>
      </div>
      <p className="text-xs text-muted mt-2">
        Best time: {bestTime}
      </p>
    </div>
  );
};

export type { ActivitySuitabilityProps };