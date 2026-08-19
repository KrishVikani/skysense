"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BrainCircuit,
  CalendarRange,
  Clock,
  Database,
  ShieldCheck,
} from "lucide-react";
import type { AIAnalysis } from "@/lib/intelligence/types";
import { RISK_LEVEL_COLOR } from "./severity";

interface IntelligenceSummaryProps {
  analysis: AIAnalysis;
}

function useCountUp(target: number, duration = 1000, delay = 150): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const elapsed = Math.max(now - start - delay, 0);
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return value;
}

const RISK_SCALE_LABELS = ["Low", "Moderate", "High", "Critical"];

export function IntelligenceSummary({ analysis }: IntelligenceSummaryProps) {
  const ringSize = 140;
  const stroke = 10;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - analysis.overallRiskScore / 100);
  const color = RISK_LEVEL_COLOR[analysis.overallRiskLevel];
  const score = useCountUp(analysis.overallRiskScore);

  const topRisk = analysis.risks.reduce((a, b) => (b.score > a.score ? b : a));

  const tiles = [
    { icon: CalendarRange, label: "Window", value: analysis.range.toUpperCase() },
    { icon: Database, label: "Samples", value: String(analysis.sampleCount) },
    {
      icon: Clock,
      label: "Data age",
      value:
        analysis.dataAgeMinutes < 60
          ? `${analysis.dataAgeMinutes} min`
          : `${Math.floor(analysis.dataAgeMinutes / 60)} hr`,
    },
    { icon: ShieldCheck, label: "Confidence", value: analysis.confidence.level },
  ];

  return (
    <motion.div
      className="card-premium p-6 lg:p-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
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
              <p className="text-4xl font-bold" style={{ color }}>
                {score}
              </p>
              <p className="text-xs text-muted-foreground">risk / 100</p>
            </div>
          </div>
          <span
            className="badge font-semibold"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            {analysis.overallRiskLevel}
          </span>

          <div className="w-full max-w-[200px]">
            <div
              className="relative h-2 rounded-full overflow-hidden"
              style={{ background: "linear-gradient(90deg, var(--color-success), var(--color-warning), var(--color-danger))" }}
              aria-hidden="true"
            >
              <span
                className="absolute top-1/2 h-3.5 w-3.5 rounded-full bg-card border-2"
                style={{
                  left: `${analysis.overallRiskScore}%`,
                  borderColor: color,
                  transform: "translate(-50%, -50%)",
                  boxShadow: `0 0 0 3px ${color}26`,
                }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
              {RISK_SCALE_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="section-title">Environmental Intelligence Summary</h2>
          <p className="section-subtitle mt-0.5">
            Assessment of current conditions across all monitored metrics
          </p>
          <p className="mt-4 text-lg font-semibold text-foreground leading-snug">{analysis.summary}</p>

          <div className="mt-4 inline-flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-muted/5">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Activity className="w-3.5 h-3.5" />
              Primary driver
            </span>
            <span className="text-sm font-semibold text-foreground">{topRisk.label}</span>
            <span
              className="badge text-[11px] font-medium"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
            >
              {topRisk.severityLabel} &middot; {topRisk.score}/100
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tiles.map((tile) => (
              <div key={tile.label} className="p-3 rounded-xl bg-muted/5">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <tile.icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {tile.label}
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{tile.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}