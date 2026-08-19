"use client";

import { motion } from "framer-motion";
import { BellOff, BellRing, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { AlertSettings, AlertSeverity, AlertThresholdSetting } from "@/lib/alerts/types";
import { METRIC_SETTING_KEYS, type MetricSettingKey } from "@/lib/alerts/rules";
import { METRIC_ICONS, SEVERITY_LABEL } from "./severity";

interface AlertSettingsProps {
  settings: AlertSettings;
  onUpdate: (_metric: MetricSettingKey, _patch: Partial<AlertThresholdSetting>) => void;
  onReset: () => void;
}

const SEVERITY_OPTIONS: AlertSeverity[] = ["info", "warning", "critical"];

const METRIC_HELP: Record<MetricSettingKey, string> = {
  temperature: "Alert when the current temperature rises above the configured threshold.",
  humidity: "Alert when relative humidity rises above the configured threshold.",
  windSpeed: "Alert when wind speed rises above the configured threshold.",
  uvIndex: "Alert when the UV index rises above the configured threshold.",
  airQuality: "Alert when the air quality index (AQI) rises above the configured threshold.",
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label} alerts ${checked ? "enabled" : "disabled"}`}
      onClick={onChange}
      className="relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      style={{ backgroundColor: checked ? "var(--color-accent)" : "var(--color-border)" }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

export function AlertSettings({ settings, onUpdate, onReset }: AlertSettingsProps) {
  return (
    <motion.div
      className="card-premium p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-accent" />
            <h2 className="section-title">Alert Settings</h2>
          </div>
          <p className="section-subtitle mt-0.5">Configure thresholds, severities and enable alerts per metric</p>
        </div>
        <button type="button" onClick={onReset} className="btn-secondary text-sm">
          <RotateCcw className="w-4 h-4" />
          Restore defaults
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {METRIC_SETTING_KEYS.map((metric) => {
          const setting = settings[metric];
          const Icon = METRIC_ICONS[metric];
          const accent = setting.enabled ? "var(--color-accent)" : "var(--color-muted)";
          return (
            <div
              key={metric}
              className={`p-4 rounded-xl bg-muted/5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 transition-opacity duration-200 ${
                setting.enabled ? "" : "opacity-70"
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span
                  className="p-2 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}
                >
                  <Icon className="w-4 h-4" style={{ color: accent }} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                    {setting.label}
                    {setting.enabled ? (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
                          color: "var(--color-accent)",
                        }}
                      >
                        <BellRing className="w-2.5 h-2.5" />
                        Enabled
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--color-muted) 15%, transparent)",
                          color: "var(--color-muted)",
                        }}
                      >
                        <BellOff className="w-2.5 h-2.5" />
                        Disabled
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{METRIC_HELP[metric]}</p>
                </div>
              </div>

              <label className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Threshold</span>
                <input
                  type="number"
                  step="any"
                  value={setting.threshold}
                  disabled={!setting.enabled}
                  onChange={(e) => onUpdate(metric, { threshold: Number(e.target.value) })}
                  className="w-24 bg-card border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
                />
                {setting.unit && <span className="text-xs text-muted-foreground">{setting.unit}</span>}
              </label>

              <label className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Severity</span>
                <select
                  value={setting.severity}
                  disabled={!setting.enabled}
                  onChange={(e) => onUpdate(metric, { severity: e.target.value as AlertSeverity })}
                  className="bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
                >
                  {SEVERITY_OPTIONS.map((sev) => (
                    <option key={sev} value={sev}>
                      {SEVERITY_LABEL[sev]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-end">
                <Toggle
                  checked={setting.enabled}
                  onChange={() => onUpdate(metric, { enabled: !setting.enabled })}
                  label={setting.label}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
        Each threshold triggers a single alert when its metric crosses it in the configured direction. Stability and
        rapid-change rules are driven by the AI analysis and are not user-configurable. Settings are stored locally on
        this device for the current phase; the model is structured so a backend can persist these preferences later
        without UI changes.
      </p>
    </motion.div>
  );
}
