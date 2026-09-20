"use client";

import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { X, Send, Sparkles } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const STORAGE_KEY = "skysense_ai_chat_history";

const SUGGESTED_PROMPTS = [
  "Is it safe to go outside right now?",
  "Why is my heat risk high?",
  "Explain my current alerts",
  "How is the weather trending?",
  "What should I do about the current conditions?",
];

const WELCOME_MESSAGE =
  "Hi, I'm SKYSENSE AI. Ask me about current temperature, humidity, wind, UV, air quality, active alerts, or your station status.";

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.messages || [];
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages }));
    } catch {
      // Best-effort persistence
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

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
    setError(null);
    setLoading(true);

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
        setError(errMsg);
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
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Network error";
      setError(errMsg);
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open SKYSENSE AI Assistant"
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover hover:shadow-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">SKYSENSE AI</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="SKYSENSE AI Assistant"
        >
          <div
            className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:h-[640px] sm:max-h-[85vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">SKYSENSE AI</p>
                  <p className="text-xs text-muted-foreground">Environmental assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close AI Assistant"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/10 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="flex justify-start">
                {messages.length === 0 && !loading && !error && (
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/10 px-4 py-3 text-sm text-foreground">
                    {WELCOME_MESSAGE}
                  </div>
                )}
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                          isUser
                            ? "rounded-tr-sm bg-accent text-white"
                            : "rounded-tl-sm bg-muted/10 text-foreground"
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

                {loading && (
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

                {error && (
                  <div className="flex justify-center">
                    <div className="max-w-[85%] rounded-xl border border-danger/25 bg-danger-bg/30 px-4 py-3 text-xs text-danger">
                      {error}
                    </div>
                  </div>
                )}

                {messages.length === 0 && !loading && !error && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setInput(prompt)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={scrollRef} />
              </div>

              <form onSubmit={handleSend} className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about current conditions…"
                    maxLength={2000}
                    autoComplete="off"
                    rows={1}
                    className="max-h-32 min-h-[40px] w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/60"
                    aria-label="Message input"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                  Enter to send · Shift+Enter for a new line
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}