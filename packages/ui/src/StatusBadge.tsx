"use client";

import type { FC, ReactNode } from "react";

interface StatusBadgeProps {
  status: "good" | "moderate" | "poor" | "hazardous" | "info" | "warning" | "success" | "danger";
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline" | "soft";
}

const statusStyles = {
  good: { solid: "bg-success text-white", outline: "border-success text-success", soft: "bg-success/10 text-success" },
  moderate: { solid: "bg-warning text-white", outline: "border-warning text-warning", soft: "bg-warning/10 text-warning" },
  poor: { solid: "bg-danger text-white", outline: "border-danger text-danger", soft: "bg-danger/10 text-danger" },
  hazardous: { solid: "bg-danger text-white", outline: "border-danger text-danger", soft: "bg-danger/10 text-danger" },
  info: { solid: "bg-info text-white", outline: "border-info text-info", soft: "bg-info/10 text-info" },
  warning: { solid: "bg-warning text-white", outline: "border-warning text-warning", soft: "bg-warning/10 text-warning" },
  success: { solid: "bg-success text-white", outline: "border-success text-success", soft: "bg-success/10 text-success" },
  danger: { solid: "bg-danger text-white", outline: "border-danger text-danger", soft: "bg-danger/10 text-danger" },
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

export const StatusBadge: FC<StatusBadgeProps> = ({
  status,
  children,
  className = "",
  size = "md",
  variant = "soft",
}) => {
  const styles = statusStyles[status]?.[variant] || statusStyles.info[variant];
  const sizeClass = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${styles} ${sizeClass} ${className}`}
    >
      {children}
    </span>
  );
};

export type { StatusBadgeProps };