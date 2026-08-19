"use client";

import { motion } from "framer-motion";
import { ListChecks } from "lucide-react";
import type { Recommendation } from "@/lib/intelligence/types";
import { SEVERITY_COLOR } from "./severity";

interface RecommendationsProps {
  recommendations: Recommendation[];
}

export function Recommendations({ recommendations }: RecommendationsProps) {
  return (
    <motion.div
      className="card-premium p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="flex items-center gap-2">
        <ListChecks className="w-5 h-5 text-accent" />
        <h2 className="section-title">Recommendations</h2>
      </div>
      <p className="section-subtitle mt-0.5">Data-driven actions for the current conditions</p>
      <div className="mt-5 space-y-3">
        {recommendations.map((rec, index) => {
          const color = SEVERITY_COLOR[rec.severity];
          return (
            <div
              key={rec.id}
              className="flex gap-3 p-4 rounded-xl bg-muted/5 border-l-2"
              style={{ borderLeftColor: color }}
            >
              <span
                className="p-2 rounded-lg shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
              >
                <ListChecks className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-bold text-muted-foreground"
                    aria-hidden="true"
                  >
                    {index + 1}.
                  </span>
                  <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{rec.metric}</span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                  >
                    {rec.severity === "critical"
                      ? "Top priority"
                      : rec.severity === "warning"
                        ? "High priority"
                        : rec.severity === "info"
                          ? "Standard priority"
                          : "Low priority"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{rec.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}