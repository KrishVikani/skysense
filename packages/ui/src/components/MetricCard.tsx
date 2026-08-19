"use client";

import type { FC, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendLabel?: string;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "compact" | "featured";
  status?: "good" | "warning" | "danger" | "info";
}

const trendIcons = {
  up: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  down: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  stable: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" />
    </svg>
  ),
};

const trendColors = {
  up: "var(--color-success)",
  down: "var(--color-danger)",
  stable: "var(--color-muted)",
};

const statusColors = {
  good: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
};

export const MetricCard: FC<MetricCardProps> = ({
  label,
  value,
  unit,
  trend = "stable",
  trendLabel,
  icon,
  className = "",
  onClick,
  variant = "default",
  status,
}) => {
  const color = status ? statusColors[status] : (trendColors[trend] || "var(--color-primary)");
  const trendIcon = trendIcons[trend];
  const labelText = trendLabel || (trend === "up" ? "Increasing" : trend === "down" ? "Decreasing" : "Stable");

  const variants = {
    default: "p-5 rounded-2xl",
    compact: "p-4 rounded-xl",
    featured: "p-6 rounded-2xl relative overflow-hidden",
  };

  const baseClass = `card-premium ${variants[variant]} ${onClick ? "cursor-pointer" : ""} ${className}`;
  
  const featuredGlow = variant === "featured" && (
    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  );

  return (
    <motion.div
      className={baseClass}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      whileHover={{
        y: -3,
        borderColor: "var(--color-border-hover)",
        boxShadow: "0 16px 40px -16px rgba(13,148,136,0.28), 0 6px 20px -10px rgba(2,6,23,0.14)",
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {featuredGlow}
      <div className="relative flex flex-col items-start gap-2">
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: status ? `${color}14` : "color-mix(in srgb, var(--color-muted) 10%, transparent)",
                  color: status ? color : "var(--color-muted-foreground)",
                }}
              >
                {icon}
              </div>
            )}
            <div>
              <p className="metric-label">{label}</p>
              {status && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ 
                  backgroundColor: `${color}20`, 
                  color 
                }}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              )}
            </div>
          </div>
          
          {trend && (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: `${color}15`, 
                color 
              }}
              title={labelText}
            >
              <span style={{ color }}>{trendIcon}</span>
              <span>{labelText}</span>
            </div>
          )}
        </div>
        
        <div className="relative flex items-baseline gap-1 min-w-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={String(value)}
              className="metric-value tabular-nums truncate"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {value}
            </motion.span>
          </AnimatePresence>
          {unit && (
            <span className="text-base font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export type { MetricCardProps };