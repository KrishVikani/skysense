"use client";

import type { FC } from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

export const Skeleton: FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}) => {
  const baseStyles = "bg-border relative overflow-hidden";
  
  const variantStyles = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  const animationStyles = {
    pulse: "animate-pulse",
    wave: "animate-wave",
    none: "",
  };

  const style: React.CSSProperties = {
    width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
    height: height ? (typeof height === "number" ? `${height}px` : height) : undefined,
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {animation === "wave" && (
        <div
          className="absolute inset-0 -translate-x-full animate-wave-shimmer"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
          }}
        />
      )}
    </div>
  );
};

export const SkeletonText: FC<{ lines?: number; className?: string }> = ({ lines = 3, className = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" width={i === lines - 1 ? "60%" : "100%"} />
    ))}
  </div>
);

export const SkeletonCard: FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`rounded-2xl bg-card p-6 shadow-sm space-y-4 ${className}`}>
    <Skeleton variant="rectangular" height="24" width="40%" />
    <Skeleton variant="rectangular" height="48" width="100%" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton variant="rectangular" height="80" />
      <Skeleton variant="rectangular" height="80" />
    </div>
  </div>
);

export type { SkeletonProps };