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
 * Dedicated but visually secondary hardware-information section. Shows the
 * actual hardware connection state — live ESP32 telemetry when connected,
 * simulation mode when not.
 */
export function StationHardwareStatus({ snapshot }: { snapshot: DeviceSnapshot }) {
  const isLive = snapshot.mode === "live" && snapshot.connection === "online";

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
        subtitle={isLive
          ? "ESP32 station is connected and reporting live telemetry"
          : "Station hardware is not connected — running in simulation mode"}
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
          value={isLive ? "Live ESP32 Telemetry" : "Simulation Mode"}
          note={isLive ? "ESP32 hardware connected" : "ESP32 hardware is not connected"}
        />
        <Row
          icon={<Database className="h-4 w-4" aria-hidden="true" />}
          label="Data source"
          value={snapshot.dataSource}
          note={isLive ? "live ESP32 device telemetry" : "deterministic simulated environmental data"}
        />
        <Row
          icon={<Wrench className="h-4 w-4" aria-hidden="true" />}
          label={isLive ? "Operating mode" : "Future state"}
          value={isLive ? "Live" : "Live ESP32 telemetry"}
          note={isLive ? "device is actively reporting sensor data" : "the ESP32 will provide live readings after physical integration"}
        />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {isLive
          ? "Your ESP32 station is connected and actively reporting live sensor readings. All pages (My Station, Analytics, AI, Alerts) now display real telemetry from your device."
          : "When your ESP32 hardware is set up and connected, live readings will take over from the simulated values automatically — My Station, Analytics, AI and Alerts all read from the same data source, so nothing else needs to change."}
      </p>
    </motion.section>
  );
}