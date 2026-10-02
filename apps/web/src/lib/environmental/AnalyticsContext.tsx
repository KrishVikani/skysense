"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { getEnvironmentalDataProvider, initializeEnvironmentalProvider } from "./provider";
import type { AnalyticsResult, TimeRange } from "./types";

interface CachedAnalytics {
  data: AnalyticsResult | null;
  fetchedAt: number;
  range: TimeRange;
  promise: Promise<AnalyticsResult> | null;
}

const CACHE_TTL_MS = 60_000;

interface AnalyticsContextValue {
  analytics: AnalyticsResult | null;
  loading: boolean;
  error: boolean;
  refresh: (range?: TimeRange) => Promise<void>;
  providerKind: "mock" | "esp32";
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function useAnalyticsContext(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalyticsContext must be used within AnalyticsProvider");
  }
  return ctx;
}

interface AnalyticsProviderProps {
  children: ReactNode;
  defaultRange?: TimeRange;
}

export function AnalyticsProvider({ children, defaultRange = "24h" }: AnalyticsProviderProps) {
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const providerRef = useRef(getEnvironmentalDataProvider());
  const cacheRef = useRef<CachedAnalytics>({
    data: null,
    fetchedAt: 0,
    range: defaultRange,
    promise: null,
  });
  const refreshTriggerRef = useRef(0);

  const refresh = useCallback(async (range: TimeRange = defaultRange) => {
    const provider = getEnvironmentalDataProvider();
    providerRef.current = provider;

    const now = Date.now();
    const cached = cacheRef.current;
    if (
      cached.data &&
      cached.range === range &&
      now - cached.fetchedAt < CACHE_TTL_MS
    ) {
      return;
    }

    if (cached.promise) {
      try {
        const data = await cached.promise;
        if (!cached.data || cached.range !== range) {
          setAnalytics(data);
          cacheRef.current = { data, fetchedAt: now, range, promise: null };
        }
        return;
      } catch {
        // fall through to new fetch
      }
    }

    setLoading(true);
    setError(false);

    const promise = provider.fetchAnalytics(range).then((data) => {
      if (cacheRef.current.promise === promise) {
        cacheRef.current = { data, fetchedAt: Date.now(), range, promise: null };
      }
      return data;
    });

    cacheRef.current.promise = promise;

    try {
      const data = await promise;
      if (!cacheRef.current.data || cacheRef.current.range !== range) {
        setAnalytics(data);
      }
    } catch (err) {
      setError(true);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [defaultRange]);

  useEffect(() => {
    initializeEnvironmentalProvider();
    refresh(defaultRange);
  }, [defaultRange, refresh]);

  useEffect(() => {
    const checkProvider = async () => {
      const currentProvider = getEnvironmentalDataProvider();
      if (currentProvider.kind !== providerRef.current?.kind) {
        providerRef.current = currentProvider;
        refreshTriggerRef.current += 1;
      }
    };

    const interval = setInterval(checkProvider, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refreshTriggerRef.current > 0) {
      refresh(cacheRef.current.range);
      refreshTriggerRef.current = 0;
    }
  }, [refresh]);

  return (
    <AnalyticsContext.Provider
      value={{
        analytics,
        loading,
        error,
        refresh,
        providerKind: providerRef.current?.kind ?? "mock",
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

export async function fetchAnalyticsOnce(_range: TimeRange = "24h"): Promise<AnalyticsResult> {
  const provider = getEnvironmentalDataProvider();
  return provider.fetchAnalytics(_range);
}