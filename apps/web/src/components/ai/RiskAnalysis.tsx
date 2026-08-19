"use client";

import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import type { RiskAssessment, RiskSeverity } from "@/lib/intelligence/types";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "./severity";

interface RiskAnalysisProps {
  risks: RiskAssessment[];
}

const SEVERITY_BANDS: { severity: RiskSeverity; label: string }[] = [
  { severity: "good", label: "Low" },
  { severity: "info", label: "Moderate" },
  { severity: "warning", label: "High" },
  { severity: "critical", label: "Critical" },
];

function SeverityScale({ severity }: { severity: RiskSeverity }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground" role="img" aria-label={SEVERITY_LABEL[severity]}>
      {SEVERITY_BANDS.map((band) => {
        const active = band.severity === severity;
        return (
          <span key={band.severity} className="inline-flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: SEVERITY_COLOR[band.severity],
                opacity: active ? 1 : 0.35,
                boxShadow: active ? `0 0 0 3px ${SEVERITY_COLOR[band.severity]}26` : undefined,
              }}
              aria-hidden="true"
            />
            <span className={active ? "font-semibold text-foreground" : undefined}>{band.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function RiskAnalysis({ risks }: RiskAnalysisProps) {
  return (
    <motion.div
      className="card-premium p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-accent" />
        <h2 className="section-title">Risk Analysis</h2>
      </div>
      <p className="section-subtitle mt-0.5">Scored risk categories feeding the overall assessment</p>
      <div className="mt-5 space-y-5">
        {risks.map((risk, index) => {
          const color = SEVERITY_COLOR[risk.severity];
          return (
            <div key={risk.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{risk.label}</span>
                  <span
                    className="badge text-xs"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                  >
                    {risk.severityLabel}
                  </span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {risk.score}
                  <span className="text-muted-foreground">/100</span>
                </span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${risk.score}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + index * 0.08 }}
                />
              </div>
              <SeverityScale severity={risk.severity} />
              <p className="text-xs text-muted-foreground leading-relaxed">{risk.explanation}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}