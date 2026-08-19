"use client";

import { useState, useEffect } from "react";
import type { EnvironmentalScore as EnvironmentalScoreType } from "@skysense/domain-types";

export interface EnvironmentalScoreProps {
  score: number | null;
  breakdown?: EnvironmentalScoreType["breakdown"];
  grade?: EnvironmentalScoreType["grade"];
  className?: string;
}

export function EnvironmentalScore({
  score,
  breakdown,
  grade,
  className = "",
}: EnvironmentalScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (score !== null) {
      const duration = 1500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedScore(Math.round(score * eased));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  }, [score]);

  const getScoreColor = (s: number) => {
    if (s >= 80) return "var(--color-success)";
    if (s >= 60) return "var(--color-warning)";
    if (s >= 40) return "var(--color-danger)";
    return "var(--color-muted)";
  };

  const getGradeColor = (g?: string) => {
    switch (g) {
      case "A+":
      case "A":
        return "var(--color-success)";
      case "B":
        return "var(--color-info)";
      case "C":
        return "var(--color-warning)";
      case "D":
        return "var(--color-danger)";
      default:
        return "var(--color-muted)";
    }
  };

  return (
    <div className={`rounded-2xl bg-card p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="font-semibold text-primary mb-4">Environmental Score</h2>
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke={getScoreColor(score || 0)}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={364.4}
                strokeDashoffset={364.4 * (1 - (score || 0) / 100)}
                className="transition-all duration-1000 ease-out"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">{animatedScore}</p>
                <p className="text-xs text-muted">/ 100</p>
              </div>
            </div>
          </div>
          {grade && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <span
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ backgroundColor: `${getGradeColor(grade)}20`, color: getGradeColor(grade) }}
              >
                Grade {grade}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-border/10 transition-colors text-sm"
          >
            <span>{showBreakdown ? "Hide" : "Show"} Breakdown</span>
            <svg
              className={`w-4 h-4 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {breakdown && showBreakdown && (
          <div className="w-64 flex-shrink-0">
            <h3 className="font-medium text-sm text-muted mb-3">Score Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(breakdown).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-muted">{key}</span>
                    <span className="font-medium">{value}/100</span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${value}%`,
                        backgroundColor: getScoreColor(value),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}