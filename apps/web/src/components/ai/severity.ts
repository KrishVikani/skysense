import type { RiskLevel, RiskSeverity } from "@/lib/intelligence/types";

export const SEVERITY_COLOR: Record<RiskSeverity, string> = {
  good: "var(--color-success)",
  info: "var(--color-info)",
  warning: "var(--color-warning)",
  critical: "var(--color-danger)",
};

export const SEVERITY_LABEL: Record<RiskSeverity, string> = {
  good: "Low risk",
  info: "Moderate",
  warning: "High risk",
  critical: "Critical",
};

export const RISK_LEVEL_COLOR: Record<RiskLevel, string> = {
  Excellent: "var(--color-success)",
  Good: "var(--color-success)",
  Moderate: "var(--color-warning)",
  Elevated: "var(--color-danger)",
  Critical: "var(--color-danger)",
};
