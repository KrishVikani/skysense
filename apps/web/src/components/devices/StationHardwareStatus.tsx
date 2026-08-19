"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CircuitBoard, Cpu, Database, Wrench } from "lucide-react";
import type { DeviceSnapshot } from "@/lib/devices/types";
import { SectionHeader } from "@/components/SectionHeader";

function Row({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/5">
          <span className="text-muted">{icon}</span>
        </span>
        <p className="metric-label">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground leading-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{note}</p>
    </div>
  );
}

/**
 * Dedicated but visually secondary hardware-information section. Kept quiet and
 * honest: the ESP32 is not connected, the platform runs in Simulation Mode on
 * simulated data, and live telemetry is a future state — never implied now.
 */
export function StationHardwareStatus({ snapshot }: { snapshot: DeviceSnapshot }) {
  return (
    <motion.section
      className="card-premium p-5 lg:p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      aria-labelledby="station-hardware-title"
    >
      <SectionHeader
        id="station-hardware-title"
        icon={<CircuitBoard className="h-4 w-4" aria-hidden="true" />}
        title="Hardware Status"
        subtitle="Station hardware is planned but not connected — everything shown on this page is simulated"
      />

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Row
          icon={<CircuitBoard className="h-4 w-4" aria-hidden="true" />}
          label="Station"
          value={snapshot.deviceName}
          note={`Device ID: ${snapshot.deviceId}`}
        />
        <Row
          icon={<Cpu className="h-4 w-4" aria-hidden="true" />}
          label="Current state"
          value="Simulation Mode"
          note="ESP32 hardware is not connected"
        />
        <Row
          icon={<Database className="h-4 w-4" aria-hidden="true" />}
          label="Data source"
          value={snapshot.dataSource}
          note="deterministic simulated environmental data"
        />
        <Row
          icon={<Wrench className="h-4 w-4" aria-hidden="true" />}
          label="Future state"
          value="Live ESP32 telemetry"
          note="the ESP32 will provide live readings after physical integration"
        />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        When your ESP32 hardware is set up and connected, live readings will take over from the simulated
        values automatically — My Station, Analytics, AI and Alerts all read from the same data source,
        so nothing else needs to change.
      </p>
    </motion.section>
  );
}