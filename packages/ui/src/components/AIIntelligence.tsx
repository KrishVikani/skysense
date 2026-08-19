"use client";

import type { FC } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Lightbulb, AlertCircle, TrendingUp, Sparkles, Send, X, Loader2 } from "lucide-react";
import type { AIInsight } from "@skysense/domain-types";

interface AIIntelligenceProps {
  insights: AIInsight[];
  className?: string;
}

const insightIcons = {
  summary: MessageSquare,
  recommendation: Lightbulb,
  alert: AlertCircle,
  trend: TrendingUp,
};

const insightColors = {
  summary: "var(--color-info)",
  recommendation: "var(--color-success)",
  alert: "var(--color-warning)",
  trend: "var(--color-accent)",
};

const priorityColors = {
  high: "var(--color-danger)",
  medium: "var(--color-warning)",
  low: "var(--color-info)",
};

const priorityLabels = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const AIIntelligence: FC<AIIntelligenceProps> = ({
  insights,
  className = "",
}) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your environmental AI assistant. Ask me about air quality, weather, activity recommendations, or anything else!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: userMessage }]);
    setIsLoading(true);

    setTimeout(() => {
      const responses = [
        "Based on current conditions, I'd recommend outdoor activities before 10 AM when air quality is best.",
        "The UV index is very high today (9). Please apply SPF 50+ sunscreen and limit direct sun exposure between 11 AM - 3 PM.",
        "Air quality has improved to 'Good' over the past 3 days. Great time for your morning run!",
        "Temperature will peak at 35°C today. Stay hydrated and seek shade during peak hours.",
        "Humidity is at 65% - consider using a dehumidifier indoors for comfort.",
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: response }]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            AI Environmental Intelligence
          </h2>
          <p className="section-subtitle">Personalized insights powered by environmental AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div
          className="card-premium p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Daily Summary</h3>
          </div>
          
          <p className="text-foreground/80 leading-relaxed">
            {insights.find(i => i.type === "summary")?.content || "Warm and moderately humid today. Outdoor activity is most comfortable before 10 AM and after 6 PM. UV exposure is stronger around midday, so consider sun protection."}
          </p>
        </motion.div>

        <motion.div
          className="card-premium p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ backgroundColor: "var(--color-success-bg)", color: "var(--color-success)" }}>
              <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Key Recommendations</h3>
          </div>
          
          <div className="space-y-3">
            {insights
              .filter(i => i.type === "recommendation" || i.type === "alert")
              .slice(0, 3)
              .map((insight) => {
                const InsightIcon = insightIcons[insight.type];
                return (
                  <motion.div
                    key={insight.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/5"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <div 
                      className="p-2 rounded-xl flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${insightColors[insight.type]}20`, color: insightColors[insight.type] }}
                    >
                      <InsightIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{insight.content}</p>
                    </div>
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{ 
                        backgroundColor: `${priorityColors[insight.priority]}20`, 
                        color: priorityColors[insight.priority] 
                      }}
                    >
                      {priorityLabels[insight.priority]}
                    </span>
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
      </div>

      <motion.div
        className="card-premium p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Ask SKYSENSE AI</h3>
        
        <div className="max-h-[300px] overflow-y-auto mb-4 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-accent text-white rounded-br-md"
                    : "bg-card border border-border text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              className="flex justify-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="bg-card border border-border text-foreground rounded-2xl px-4 py-3 rounded-bl-md">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about weather, air quality, activities..."
              className="input-premium pr-12"
              maxLength={500}
            />
            {input && (
              <button
                onClick={() => setInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="btn-primary"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export type { AIIntelligenceProps };