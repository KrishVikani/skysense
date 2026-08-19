"use client";

import type { FC } from "react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  trendColor?: string;
  icon?: React.ReactNode;
  unit?: string;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: FC<MetricCardProps> = ({
  label,
  value,
  trend = "stable",
  trendColor,
  icon,
  unit,
  className = "",
  onClick,
}) => {
  const trendIcons = {
    up: "↑",
    down: "↓",
    stable: "→",
  };

  const trendLabels = {
    up: "Increasing",
    down: "Decreasing",
    stable: "Stable",
  };

  const color = trendColor || 
    (trend === "up" ? "var(--color-warning)" : 
     trend === "down" ? "var(--color-danger)" : 
     "var(--color-primary)");

  return (
    <div
      className={`flex flex-col items-center gap-1 p-4 rounded-xl bg-card border border-border hover:shadow-lg transition-all duration-200 ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {icon && <div className="text-2xl mb-1">{icon}</div>}
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {unit && <p className="text-sm text-muted">{unit}</p>}
      </div>
      {trend && (
        <p
          className="text-xs font-medium flex items-center gap-1"
          style={{ color }}
          title={trendLabels[trend]}
        >
          <span>{trendIcons[trend]}</span>
          <span>{trendLabels[trend]}</span>
        </p>
      )}
    </div>
  );
};