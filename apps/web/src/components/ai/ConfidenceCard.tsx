"use client";

import { motion } from "framer-motion";
import { Check, Info, ShieldCheck } from "lucide-react";
import type { ConfidenceInfo } from "@/lib/intelligence/types";

interface ConfidenceCardProps {
  confidence: ConfidenceInfo;
}

export function ConfidenceCard({ confidence }: ConfidenceCardProps) {
  const ringSize = 110;
  const stroke = 9;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - confidence.percentage / 100);
  const color =
    confidence.percentage >= 85 ? "var(--color-success)"
      : confidence.percentage >= 70 ? "var(--color-warning)"
        : "var(--color-danger)";
  const reduced = confidence.level !== "High";

  return (
    <motion.div
      className="card-premium p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-accent" />
        <h2 className="section-title">Analysis Confidence</h2>
      </div>
      <p className="section-subtitle mt-0.5">How reliable SKYSENSE considers this assessment</p>

      <div className="mt-5 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
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
              transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
              style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.12))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold" style={{ color }}>{confidence.percentage}%</p>
            <p className="text-[11px] text-muted-foreground">{confidence.level}</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground leading-relaxed">{confidence.explanation}</p>
          <ul className="mt-4 space-y-2">
            {confidence.factors.map((factor) => (
              <li key={factor} className="flex items-start gap-2 text-sm text-foreground/80">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {reduced && (
        <div
          className="mt-5 flex items-start gap-2.5 px-4 py-3 rounded-xl border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-warning) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
          }}
          role="note"
        >
          <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-foreground/80 leading-relaxed">
            <span className="font-semibold text-warning">Low-confidence intelligence.</span>{" "}
            This assessment is provisional — treat its risk and recommendations as indicative rather
            than certain.
          </p>
        </div>
      )}
    </motion.div>
  );
}