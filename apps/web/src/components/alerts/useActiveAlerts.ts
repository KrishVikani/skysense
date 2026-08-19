"use client";

import { useEffect, useState } from "react";
import { getAlertsSnapshot } from "@/lib/alerts/service";
import type { AlertSummary, EnvironmentalAlert } from "@/lib/alerts/types";

export interface ActiveAlertsState {
  alerts: EnvironmentalAlert[];
  summary: AlertSummary | null;
  loading: boolean;
}

/**
 * Lightweight hook for global surfaces (e.g. the notification bell). It
 * reuses the same alert engine as the Alerts page, so the count is always
 * consistent with the /alerts route.
 */
export function useActiveAlerts(): ActiveAlertsState {
  const [state, setState] = useState<ActiveAlertsState>({ alerts: [], summary: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    getAlertsSnapshot()
      .then((snapshot) => {
        if (cancelled) return;
        setState({ alerts: snapshot.active, summary: snapshot.summary, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ alerts: [], summary: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}