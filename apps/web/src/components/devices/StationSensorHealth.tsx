"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Activity, Database, HardDrive, HeartPulse, Wifi } from "lucide-react";
import type { DeviceSnapshot } from "@/lib/devices/types";
import { CONNECTION_LABEL, HEALTH_COLOR } from "./severity";
import { SectionHeader } from "@/components/SectionHeader";

function HealthTile({
  icon,
  label,
  value,
  note,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/5">
          <span style={{ color: color ?? "var(--color-muted)" }}>{icon}</span>
        </span>
        <p className="metric-label">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground leading-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{note}</p>
    </div>
  );
}

/**
 * Compact, secondary station-health strip: sensors healthy, data quality, last
 * heartbeat, firmware and connection state. Every value comes from the existing
 * snapshot; nothing is fabricated when the field is unavailable.
 */
export function StationSensorHealth({ snapshot }: { snapshot: DeviceSnapshot }) {
  const healthColor = HEALTH_COLOR[snapshot.health];

  return (
    <motion.section
      className="space-y-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      aria-labelledby="station-health-title"
    >
      <SectionHeader
        id="station-health-title"
        icon={<HeartPulse className="h-4 w-4" aria-hidden="true" />}
        title="Sensor Health"
        subtitle="Station status at a glance"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <HealthTile
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          label="Sensors"
          value={`${snapshot.healthySensorCount} / ${snapshot.sensorCount} healthy`}
          note="all values simulated today"
          color={healthColor}
        />
        <HealthTile
          icon={<Database className="h-4 w-4" aria-hidden="true" />}
          label="Data quality"
          value={snapshot.dataQuality === "simulated" ? "Simulated" : snapshot.dataQuality}
          note={snapshot.dataSource}
        />
        <HealthTile
          icon={<HeartPulse className="h-4 w-4" aria-hidden="true" />}
          label="Last heartbeat"
          value={snapshot.lastSeen ? "Active" : "No heartbeat"}
          note={snapshot.lastSeen ? "reported via heartbeat" : "hardware not connected"}
        />
        <HealthTile
          icon={<HardDrive className="h-4 w-4" aria-hidden="true" />}
          label="Firmware"
          value={snapshot.firmwareVersion ?? snapshot.firmwareStatus}
          note={snapshot.firmwareVersion ? snapshot.firmwareStatus : "no physical device"}
        />
        <HealthTile
          icon={<Wifi className="h-4 w-4" aria-hidden="true" />}
          label="Connection"
          value={CONNECTION_LABEL[snapshot.connection]}
          note="ESP32 hardware is not connected · waiting for device"
        />
      </div>
    </motion.section>
  );
}