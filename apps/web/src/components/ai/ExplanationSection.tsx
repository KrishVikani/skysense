"use client";

import { motion } from "framer-motion";
import { Activity, Droplets, Leaf, ScanSearch, Sun, Thermometer, TrendingUp } from "lucide-react";
import type { ExplanationFactor } from "@/lib/intelligence/types";

interface ExplanationSectionProps {
  factors: ExplanationFactor[];
}

const FACTOR_ICONS: Record<string, typeof Thermometer> = {
  heat: Thermometer,
  air: Leaf,
  uv: Sun,
  humidity: Droplets,
  stability: Activity,
  trends: TrendingUp,
};

export function ExplanationSection({ factors }: ExplanationSectionProps) {
  return (
    <motion.div
      className="card-premium p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <ScanSearch className="w-5 h-5 text-accent" />
        <h2 className="section-title">Environmental Drivers</h2>
      </div>
      <p className="section-subtitle mt-0.5">What influenced this assessment, by weight</p>

      <div className="mt-5 space-y-4">
        {factors.map((factor, index) => {
          const Icon = FACTOR_ICONS[factor.id] ?? ScanSearch;
          return (
            <div key={factor.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm gap-3">
                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                  <Icon className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                  {factor.label}
                </span>
                <span className="text-muted-foreground shrink-0">{factor.weight}% influence</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${factor.weight}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.35 + index * 0.07 }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{factor.detail}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}