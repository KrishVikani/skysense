"use client";

import { useEffect } from "react";
import { initializeEnvironmentalProvider, tryActivateEsp32Provider } from "@/lib/environmental/provider";

export function EnvironmentalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Initialize with mock provider to prevent getting stuck in Simulation Mode
    //    when app starts before the ESP32/API status is available.
    initializeEnvironmentalProvider();

    // 2. One-time attempt to switch to ESP32 provider after a brief delay,
    //    giving the ESP32 time to initialize and report telemetry.
    //    No polling or duplicate initialization — runs only on mount.
    (async () => {
      try {
        await tryActivateEsp32Provider();
      } catch {
        // Keep mock provider if API is unavailable; graceful fallback.
      }
    })();
  }, []);

  return <>{children}</>;
}