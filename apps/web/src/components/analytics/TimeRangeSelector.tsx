"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { TIME_RANGES } from "@/lib/environmental/types";
import type { TimeRange } from "@/lib/environmental/types";

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (_range: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const move = (index: number) => {
    const next = TIME_RANGES[index];
    onChange(next);
    requestAnimationFrame(() => {
      containerRef.current?.querySelector<HTMLButtonElement>(`[data-range="${next}"]`)?.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") move((index - 1 + TIME_RANGES.length) % TIME_RANGES.length);
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") move((index + 1) % TIME_RANGES.length);
      else if (e.key === "Home") move(0);
      else move(TIME_RANGES.length - 1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-1 bg-muted/5 rounded-xl p-1"
      role="radiogroup"
      aria-label="Analytics time range"
    >
      {TIME_RANGES.map((range, index) => {
        const active = value === range;
        return (
          <button
            key={range}
            type="button"
            data-range={range}
            onClick={() => onChange(range)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
          >
            {active && (
              <motion.span
                className="absolute inset-0 rounded-lg bg-card shadow-sm ring-1 ring-border"
                layoutId="analytics-range-active"
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
              />
            )}
            <span className="relative z-10">{range}</span>
          </button>
        );
      })}
    </div>
  );
}