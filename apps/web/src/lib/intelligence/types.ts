import type { TimeRange } from "@/lib/environmental/types";

export type RiskSeverity = "good" | "info" | "warning" | "critical";
export type RiskLevel = "Excellent" | "Good" | "Moderate" | "Elevated" | "Critical";
export type TrendClassification = "Increasing" | "Decreasing" | "Stable" | "Fluctuating";

/** A single metric-level insight generated from current conditions. */
export interface MetricInsight {
  id: string;
  label: string;
  current: string;
  unit: string;
  status: RiskSeverity;
  statusLabel: string;
  interpretation: string;
  recommendation: string;
}

/** A scored risk category (score 0–100, higher = higher risk). */
export interface RiskAssessment {
  id: string;
  label: string;
  score: number;
  severity: RiskSeverity;
  severityLabel: string;
  explanation: string;
}

/** A practical, data-driven action recommendation. */
export interface Recommendation {
  id: string;
  metric: string;
  title: string;
  description: string;
  severity: RiskSeverity;
}

/** A historical trend classification for a single metric. */
export interface TrendInfo {
  id: string;
  label: string;
  classification: TrendClassification;
  delta: number;
  deltaLabel: string;
  unit: string;
}

export interface ConfidenceInfo {
  percentage: number;
  level: "High" | "Medium" | "Low";
  explanation: string;
  factors: string[];
}

/** An explanatory factor the intelligence engine weighed for its conclusion. */
export interface ExplanationFactor {
  id: string;
  label: string;
  detail: string;
  weight: number;
}

/** The complete output of the intelligence engine for the AI Intelligence page. */
export interface AIAnalysis {
  generatedAt: string;
  location: string;
  dataSource: string;
  dataAgeMinutes: number;
  sampleCount: number;
  range: TimeRange;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  summary: string;
  insights: MetricInsight[];
  risks: RiskAssessment[];
  recommendations: Recommendation[];
  trends: TrendInfo[];
  trendSummary: string;
  confidence: ConfidenceInfo;
  factors: ExplanationFactor[];
}