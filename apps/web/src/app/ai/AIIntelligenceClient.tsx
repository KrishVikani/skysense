"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, BrainCircuit, MapPin, RefreshCw, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@skysense/ui";
import { IntelligenceSummary } from "@/components/ai/IntelligenceSummary";
import { InsightCards } from "@/components/ai/InsightCards";
import { RiskAnalysis } from "@/components/ai/RiskAnalysis";
import { Recommendations } from "@/components/ai/Recommendations";
import { TrendIntelligence } from "@/components/ai/TrendIntelligence";
import { ConfidenceCard } from "@/components/ai/ConfidenceCard";
import { ExplanationSection } from "@/components/ai/ExplanationSection";
import { IntelligenceFooter } from "@/components/ai/IntelligenceFooter";
import { ForecastSection } from "@/components/forecast/ForecastSection";
import { RISK_LEVEL_COLOR } from "@/components/ai/severity";
import { getEnvironmentalIntelligence } from "@/lib/intelligence/service";
import type { AIAnalysis } from "@/lib/intelligence/types";

function IntelligenceSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6 animate-in">
      <div className="card-premium p-6">
        <div className="h-7 w-64 skeleton-shimmer rounded-lg" />
        <div className="h-4 w-96 max-w-full skeleton-shimmer rounded mt-2" />
      </div>
      <div className="card-premium p-8 h-60 skeleton-shimmer" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-elevated p-5 h-44 skeleton-shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-premium p-6 h-80 skeleton-shimmer" />
        <div className="card-premium p-6 h-80 skeleton-shimmer" />
      </div>
    </div>
  );
}

function IntelligenceError({ onRetry }: { onRetry: () => void }) {
  return (
    <DashboardShell atmosphere="ai">
      <div className="max-w-lg mx-auto">
        <EmptyState
          title="AI Intelligence unavailable"
          description="We couldn't run the AI analysis right now. Please try again."
          icon={<AlertTriangle className="w-10 h-10 text-warning" />}
          action={
            <button type="button" onClick={onRetry} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          }
        />
      </div>
    </DashboardShell>
  );
}

export default function AIIntelligenceClient() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getEnvironmentalIntelligence("7d")
      .then((data) => {
        if (cancelled) return;
        setAnalysis(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (error && !analysis) {
    return <IntelligenceError onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  if (loading || !analysis) {
    return (
      <DashboardShell atmosphere="ai">
        <IntelligenceSkeleton />
      </DashboardShell>
    );
  }

  if (analysis.sampleCount === 0) {
    return (
      <DashboardShell atmosphere="ai">
        <EmptyState
          title="No Environmental Data"
          description="No sensor readings are available to analyze. Intelligence will resume once data is received."
          icon={<BrainCircuit className="w-10 h-10 text-muted" />}
        />
      </DashboardShell>
    );
  }

  const levelColor = RISK_LEVEL_COLOR[analysis.overallRiskLevel];

  return (
    <DashboardShell atmosphere="ai">
      <div className="space-y-6">
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
              AI Intelligence
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight mt-1">
              Environmental intelligence for your location
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Understand the conditions, patterns and signals that matter — what&apos;s happening now,
              why it matters, and what to do about it.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="badge badge-warning font-medium">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
                </span>
                Simulation Mode
              </span>
              <span className="text-xs text-muted-foreground">{analysis.dataSource}</span>
            </div>
            <div
              className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground"
              aria-label="Analysis pipeline"
            >
              <span>Environmental data</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
              <span>Intelligence</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
              <span>Risk</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
              <span>Recommendation</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
              <span>Forward outlook</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-medium text-foreground">{analysis.location}</span>
            </div>
            <span
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${levelColor} 15%, transparent)`,
                color: levelColor,
              }}
            >
              <Sparkles className="w-4 h-4" />
              {analysis.overallRiskLevel} &middot; {analysis.overallRiskScore}/100 risk
            </span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
              Re-run analysis
            </button>
          </div>
        </motion.div>

        <IntelligenceSummary analysis={analysis} />

        <InsightCards insights={analysis.insights} />

        <TrendIntelligence trends={analysis.trends} summary={analysis.trendSummary} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RiskAnalysis risks={analysis.risks} />
          <Recommendations recommendations={analysis.recommendations} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConfidenceCard confidence={analysis.confidence} />
          <ExplanationSection factors={analysis.factors} />
        </div>

        <div className="relative flex items-center justify-center gap-3 pt-2" aria-hidden="true">
          <span className="h-px flex-1 bg-muted/70" />
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            Intelligence &rarr; Forecast
          </span>
          <span className="h-px flex-1 bg-muted/70" />
        </div>

        <ForecastSection />

        <IntelligenceFooter analysis={analysis} />
      </div>
    </DashboardShell>
  );
}