"use client";

import { useEffect, useRef } from "react";
import { initializeEnvironmentalProvider, tryActivateEsp32Provider } from "@/lib/environmental/provider";

export function EnvironmentalProvider({ children }: { children: React.ReactNode }) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Initialize with mock provider to prevent getting stuck in Simulation Mode
    //    when app starts before the ESP32/API status is available.
    initializeEnvironmentalProvider();

    // 2. One-time attempt to switch to ESP32 provider after a brief delay,
    //    giving the ESP32 time to initialize and report telemetry.
    (async () => {
      try {
        await tryActivateEsp32Provider();
        // If the initial attempt succeeded, no retry interval is needed.
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch {
        // 3. ESP32 not available yet — set up a retry interval so the provider
        //    automatically activates when the device comes online.
        if (!intervalRef.current) {
          intervalRef.current = setInterval(async () => {
            try {
              await tryActivateEsp32Provider();
              // On success, clear the interval so no further polls are sent.
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            } catch {
              // Keep retrying; the interval stays active.
            }
          }, 30_000); // 30‑second retry interval (sensible, non‑aggressive).
        }
      }
      // 4. Quick retry after 1 second to handle edge cases where the initial
      //    check runs before the ESP32 is fully ready. This is not aggressive
      //    polling — it’s a single one‑second delay after mount.
      setTimeout(async () => {
        try {
          await tryActivateEsp32Provider();
          // On success, clear the interval if it’s still running.
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } catch {
          // Keep retrying via the 30s interval established above.
        }
      }, 1_000);
    })();

    // 5. Cleanup on unmount — prevents leaked timers if the component is
    //    removed from the tree before the device comes online.
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return <>{children}</>;
}