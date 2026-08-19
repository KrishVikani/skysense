"use client";

import { useState, useEffect } from "react";
import type { EnvironmentalScore as EnvironmentalScoreType } from "@skysense/domain-types";
import { motion, AnimatePresence } from "framer-motion";

interface EnvironmentalScoreProps {
  score: number | null;
  breakdown?: EnvironmentalScoreType["breakdown"];
  grade?: EnvironmentalScoreType["grade"];
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { ring: 80, stroke: 6, font: "text-2xl", label: "text-xs" },
  md: { ring: 120, stroke: 8, font: "text-4xl", label: "text-sm" },
  lg: { ring: 160, stroke: 10, font: "text-6xl", label: "text-base" },
};

const circumference = (radius: number) => 2 * Math.PI * radius;

export function EnvironmentalScore({
  score,
  breakdown,
  grade,
  className = "",
  size = "md",
}: EnvironmentalScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const config = sizeConfig[size];
  const radius = (config.ring - config.stroke) / 2;
  const ringCircumference = circumference(radius);

  useEffect(() => {
    if (score !== null && score !== undefined) {
      const duration = 1200;
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
    } else {
      setAnimatedScore(0);
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

  const scoreLabel = (s: number) => (s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "Poor");

  const scoreSummary = (s: number) => {
    if (s >= 80) return "Clean and comfortable conditions across air, temperature, humidity and UV.";
    if (s >= 60) return "Generally favourable conditions with a few factors to keep in mind.";
    if (s >= 40) return "Mixed conditions — limit prolonged outdoor exposure where possible.";
    return "Unfavourable conditions — check air quality and UV before spending time outdoors.";
  };

  const progress = score ? (score / 100) : 0;
  const strokeDashoffset = ringCircumference * (1 - progress);
  const strokeColor = getScoreColor(score || 0);

  return (
    <div className={`card-premium p-6 ${size === "lg" ? "p-8" : ""} ${className}`}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Environmental Score</h2>
            {grade && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ 
                  backgroundColor: `${getGradeColor(grade)}20`, 
                  color: getGradeColor(grade) 
                }}
              >
                {grade}
              </span>
            )}
          </div>
          
          <div className="relative flex justify-center mb-4">
            <div
              className="absolute -inset-4 rounded-full blur-2xl pointer-events-none"
              style={{ background: `radial-gradient(circle, ${strokeColor}26, transparent 70%)` }}
              aria-hidden="true"
            />
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <svg className="w-full h-full transform -rotate-90" width={config.ring} height={config.ring}>
                <circle
                  cx={config.ring / 2}
                  cy={config.ring / 2}
                  r={radius}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth={config.stroke}
                />
                <AnimatePresence mode="wait">
                  <motion.circle
                    key={score}
                    cx={config.ring / 2}
                    cy={config.ring / 2}
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={config.stroke}
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    initial={{ strokeDashoffset: ringCircumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}
                  />
                </AnimatePresence>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className={`${config.font} font-bold tabular-nums`} style={{ color: strokeColor }}>
                    {animatedScore}
                    <span className="text-foreground/50 text-lg font-normal">/100</span>
                  </p>
                  <p className={`${config.label} text-muted-foreground mt-1 capitalize`}>
                    {score !== null && score !== undefined ? scoreLabel(score) : "—"}
                  </p>
                </div>
              </div>
            </motion.div>
            
            <AnimatePresence>
              {score !== null && score !== undefined && score >= 80 && (
                <motion.div
                  className="absolute inset-0 pulse-ring"
                  style={{
                    borderRadius: "50%",
                    border: `2px solid ${strokeColor}`,
                    pointerEvents: "none",
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>
          </div>

          {score !== null && score !== undefined && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground text-balance">{scoreSummary(score)}</p>
              <p className="text-xs text-muted-foreground/70 mt-1.5">
                Index derived from air quality, temperature, humidity and UV.
              </p>
            </div>
          )}

          {breakdown && (
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted/5 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <span>{showBreakdown ? "Hide" : "Show"} Breakdown</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showBreakdown ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        <AnimatePresence>
          {breakdown && showBreakdown && (
            <motion.div
              initial={{ opacity: 0, width: 0, x: 20 }}
              animate={{ opacity: 1, width: "auto", x: 0 }}
              exit={{ opacity: 0, width: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-64 flex-shrink-0 overflow-hidden"
            >
              <div className="pl-4 border-l border-border">
                <h3 className="font-medium text-sm text-muted-foreground mb-4">Score Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(breakdown).map(([key, value]) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="space-y-1.5"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{key}</span>
                        <span className="font-semibold text-foreground">{value}/100</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${value}%` }}
                          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: getScoreColor(value) }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export type { EnvironmentalScoreProps };