"use client";

import { Clock, Database, Info, MapPin } from "lucide-react";
import type { AIAnalysis } from "@/lib/intelligence/types";

interface IntelligenceFooterProps {
  analysis: AIAnalysis;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function IntelligenceFooter({ analysis }: IntelligenceFooterProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between px-1 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            Data source: <span className="text-foreground font-medium">{analysis.dataSource}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Analyzed at: <span className="text-foreground font-medium">{formatTime(analysis.generatedAt)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            {analysis.sampleCount} samples
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Location: <span className="text-foreground font-medium">{analysis.location}</span>
        </span>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground leading-relaxed flex gap-1.5 items-start">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          AI Intelligence outputs are generated from simulated data by SKYSENSE&apos;s rule-based intelligence engine and
          are provided for demonstration purposes only. They do not constitute professional or scientific advice.
        </span>
      </p>
    </div>
  );
}