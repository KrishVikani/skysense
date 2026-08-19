"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "theme";
const THEME_CYCLE: ThemeChoice[] = ["light", "dark", "system"];

interface ThemeContextValue {
  theme: ThemeChoice;
  setTheme: (_next: ThemeChoice) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(theme: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme === "system" ? resolveSystemTheme() : theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let saved: ThemeChoice = "system";
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") saved = raw;
    } catch {
      // Ignore inaccessible storage.
    }
    setThemeState(saved);
    applyThemeClass(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyThemeClass(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Best-effort persistence.
    }
  }, [theme, mounted]);

  // Live OS theme changes propagate while in "system" mode.
  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, mounted]);

  const setTheme = useCallback((next: ThemeChoice) => setThemeState(next), []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const index = THEME_CYCLE.indexOf(current);
      return THEME_CYCLE[(index + 1) % THEME_CYCLE.length];
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}