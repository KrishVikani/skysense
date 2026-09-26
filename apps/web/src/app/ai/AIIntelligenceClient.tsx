"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, BrainCircuit, MapPin, RefreshCw, Sparkles, X, Send } from "lucide-react";
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
import { fetchDeviceStatus } from "@/lib/devices/service";
import { ESP32_DEVICE_ID } from "@/lib/devices/contract";
import type { AIAnalysis } from "@/lib/intelligence/types";

const WELCOME_MESSAGE =
  "Hi, I'm SKYSENSE AI. Ask me about current temperature, humidity, wind, UV, air quality, active alerts, or your station status.";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export default function AIIntelligenceClient() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [deviceStatus, setDeviceStatus] = useState<{
    connection: string | null;
    dataSource: string | null;
    lastSeen: string | null;
  } | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [errorChat, setErrorChat] = useState<string | null>(null);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
        timestamp: Date.now(),
      },
    ]);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setErrorChat(null);
    setLoadingChat(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context: messages.slice(-5).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errMsg = data.error ?? "Unknown AI error";
        setErrorChat(errMsg);
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        return;
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response ?? "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setErrorChat(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Network error";
      setErrorChat(errMsg);
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchDeviceStatus(ESP32_DEVICE_ID)
      .then((ds) => {
        if (!cancelled) {
          setDeviceStatus({
            connection: ds?.connection ?? null,
            dataSource: ds?.dataSource ?? null,
            lastSeen: ds?.lastSeen ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeviceStatus({
            connection: null,
            dataSource: null,
            lastSeen: null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-refresh device status at a reasonable interval (30s), consistent with the
  // Devices page poll interval. Cleans up on unmount and skips if a request is in flight.
  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden")
        return;
      fetchDeviceStatus(ESP32_DEVICE_ID)
        .then((ds) => {
          if (!cancelled) {
            setDeviceStatus({
              connection: ds?.connection ?? null,
              dataSource: ds?.dataSource ?? null,
              lastSeen: ds?.lastSeen ?? null,
            });
          }
        })
        .catch(() => {
          // Best-effort; keep previous state on failure.
        });
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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
  const isLive = deviceStatus?.connection === "online" && deviceStatus?.dataSource === "esp32";

  return (
    <DashboardShell atmosphere="ai">
      <div className="space-y-6">
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">SKYSENSE AI</p>
              <p className="text-xs text-muted-foreground">Environmental assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleClearChat()}
              aria-label="Clear chat"
              className="rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/10 hover:text-foreground"
            >
              Clear Chat
            </button>
            <button
              type="button"
              onClick={() => setMessages([{
                id: "welcome",
                role: "assistant",
                content: WELCOME_MESSAGE,
                timestamp: Date.now(),
              }])}
              aria-label="Close AI Assistant"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/10 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        <div className="chat-body flex-1 flex flex-col overflow-y-auto pb-2">
          <div className="p-2 pointer-events-none">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className="flex items-start mb-4"
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      isUser
                        ? "rounded-tr-sm bg-accent text-white align-self flex-end"
                        : "rounded-tl-sm bg-muted/10 text-foreground align-self flex-start"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <span
                      className={`mt-1 block text-[10px] ${isUser ? "text-white/70" : "text-muted-foreground"}`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            {errorChat && (
              <div
                className="max-w-[80%] rounded-xl border border-danger/25 bg-danger-bg/30 mx-auto p-3 text-xs text-danger mt-2"
              >
                {errorChat}
              </div>
            )}

            {loadingChat && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted/10 px-4 py-3">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          <div className="h-px my-4" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="border-t border-border p-3 flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about current conditions…"
            maxLength={2000}
            autoComplete="off"
            rows={1}
            className="max-h-32 min-h-[40px] w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/60"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={loadingChat || input.trim().length === 0}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}

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