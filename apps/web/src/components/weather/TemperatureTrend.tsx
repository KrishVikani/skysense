"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useId } from "react";
import { TrendingUp } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { convertTemperature, temperatureLabel } from "@/lib/settings/units";
import type { WeatherHourlyItem } from "@/lib/weather/types";
import { SectionHeader } from "@/components/SectionHeader";

const W = 720;
const H = 240;
const PAD = 0.14;

function formatHour(time: string, timeFormat: "12h" | "24h"): string {
  const date = new Date(time);
  if (timeFormat === "24h") return `${String(date.getHours()).padStart(2, "0")}:00`;
  const hours = date.getHours();
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display} ${suffix}`;
}

function formatFullHour(time: string, timeFormat: "12h" | "24h"): string {
  const date = new Date(time);
  const hour = formatHour(time, timeFormat);
  const day = date.toLocaleDateString(undefined, { weekday: "short" });
  return `${day} ${hour}`;
}

/** Catmull-Rom→cubic-Bézier smoothing so the line passes through every point. */
function smoothPath(pts: ReadonlyArray<readonly [number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const pm1 = pts[i - 2] ?? p0;
    const p2 = pts[i + 1] ?? p1;
    const c1x = (p0[0] + (p1[0] - pm1[0]) / 6).toFixed(2);
    const c1y = (p0[1] + (p1[1] - pm1[1]) / 6).toFixed(2);
    const c2x = (p1[0] - (p2[0] - p0[0]) / 6).toFixed(2);
    const c2y = (p1[1] - (p2[1] - p0[1]) / 6).toFixed(2);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`;
  }
  return d;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface TemperatureTrendProps {
  items: WeatherHourlyItem[];
}

export function TemperatureTrend({ items }: TemperatureTrendProps) {
  const { settings } = useSettings();
  const units = settings.units;
  const tempUnit = temperatureLabel(units.temperature);
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (items.length < 2) return null;

  const values = items.map((item) => convertTemperature(item.temperature, units.temperature));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.5);
  const step = W / (items.length - 1);

  const yFor = (v: number) => H * (1 - PAD - ((v - min) / span) * (1 - PAD * 2));
  const points = values.map((v, i) => [i * step, yFor(v)] as const);
  const line = smoothPath(points);
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  const nowIndex = items.findIndex((item) => item.isNow);
  const highIndex = values.indexOf(max);
  const lowIndex = values.indexOf(min);

  const labelIndices = Array.from(
    new Set([0, Math.round((items.length - 1) / 3), Math.round(((items.length - 1) * 2) / 3), items.length - 1])
  );

  const leftFor = (i: number) => `${(i / (items.length - 1)) * 100}%`;

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const index = Math.round((x / W) * (items.length - 1));
    setHoverIndex(clamp(index, 0, items.length - 1));
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    handlePointerMove(event);
  };

  const hovered = hoverIndex != null ? items[hoverIndex] : null;
  const hoverValue = hoverIndex != null ? values[hoverIndex] : null;
  const hoverX = hoverIndex != null ? points[hoverIndex][0] : null;
  const hoverY = hoverIndex != null ? points[hoverIndex][1] : null;
  const tooltipLeft = hoverIndex != null ? clamp((hoverIndex / (items.length - 1)) * 100, 8, 92) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      aria-labelledby="temperature-trend-title"
    >
      <SectionHeader
        id="temperature-trend-title"
        icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
        title="Temperature Trend"
        subtitle="Next 24 hours"
      />

      <div className="card-premium p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
            High {Math.round(max)}{tempUnit} · {formatHour(items[highIndex].time, settings.general.timeFormat)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
            Low {Math.round(min)}{tempUnit} · {formatHour(items[lowIndex].time, settings.general.timeFormat)}
          </span>
          {nowIndex >= 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              Now
            </span>
          )}
          <span className="ml-auto hidden text-muted-foreground/80 sm:inline">Hover for details</span>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="relative min-w-[560px]">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`Temperature trend for the next 24 hours. High ${Math.round(max)}${tempUnit} at ${formatHour(items[highIndex].time, settings.general.timeFormat)}, low ${Math.round(min)}${tempUnit} at ${formatHour(items[lowIndex].time, settings.general.timeFormat)}.`}
              className="h-auto w-full overflow-visible select-none"
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerDown}
              onPointerLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" className="text-accent" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-accent" />
                </linearGradient>
              </defs>

              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={ratio}
                  x1={0}
                  x2={W}
                  y1={H * ratio}
                  y2={H * ratio}
                  stroke="var(--color-border)"
                  strokeOpacity={0.3}
                  strokeDasharray="2 6"
                  strokeWidth={1}
                />
              ))}

              <path d={area} fill={`url(#${gradientId})`} />

              {/* High / low markers */}
              <g aria-hidden="true">
                <circle cx={points[highIndex][0]} cy={points[highIndex][1]} r={5.5} fill="rgba(245,158,11,0.18)" stroke="var(--color-sun)" strokeWidth={1.5} />
                <circle cx={points[lowIndex][0]} cy={points[lowIndex][1]} r={5.5} fill="rgba(59,130,246,0.18)" stroke="var(--color-sky)" strokeWidth={1.5} />
              </g>

              <path d={line} fill="none" strokeWidth={2.5} strokeLinecap="round" className="stroke-accent" />

              {nowIndex >= 0 && (
                <line
                  x1={points[nowIndex][0]}
                  x2={points[nowIndex][0]}
                  y1={0}
                  y2={H}
                  stroke="var(--color-accent)"
                  strokeOpacity={0.18}
                  strokeWidth={1}
                  strokeDasharray="1 5"
                />
              )}

              {nowIndex >= 0 && (
                <g aria-hidden="true">
                  <circle cx={points[nowIndex][0]} cy={points[nowIndex][1]} r={11} fill="var(--color-accent)" opacity={0.16} />
                  <circle cx={points[nowIndex][0]} cy={points[nowIndex][1]} r={5} className="fill-card stroke-accent" strokeWidth={2.5} />
                </g>
              )}

              {/* Hover guide + active point */}
              {hoverIndex != null && hoverX != null && hoverY != null && (
                <g aria-hidden="true">
                  <line x1={hoverX} x2={hoverX} y1={0} y2={H} stroke="var(--color-secondary)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 4" />
                  <circle cx={hoverX} cy={hoverY} r={13} fill="var(--color-accent)" opacity={0.18} />
                  <circle cx={hoverX} cy={hoverY} r={6} className="fill-card stroke-accent" strokeWidth={2.5} />
                </g>
              )}
            </svg>

            <div className="relative mt-1 h-5">
              {labelIndices.map((i) => (
                <span
                  key={i}
                  className="absolute top-0 text-[11px] font-medium text-muted-foreground"
                  style={{
                    left: leftFor(i),
                    transform: i === 0 ? "translateX(0)" : i === items.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                  }}
                >
                  {formatHour(items[i].time, settings.general.timeFormat)}
                </span>
              ))}
            </div>

            {/* Hover tooltip — pointer-events none so it never blocks the chart */}
            {hovered && hoverValue != null && hoverIndex != null && (
              <div
                className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-xl backdrop-blur-md"
                style={{ left: `${tooltipLeft}%` }}
                role="tooltip"
              >
                <p className="whitespace-nowrap text-[11px] font-medium text-secondary">
                  {formatFullHour(hovered.time, settings.general.timeFormat)}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="whitespace-nowrap text-lg font-bold leading-none tabular-nums text-foreground">
                    {Math.round(hoverValue)}{tempUnit}
                  </p>
                  {hoverIndex === nowIndex && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                      Now
                    </span>
                  )}
                  {hoverIndex === highIndex && (
                    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                      High
                    </span>
                  )}
                  {hoverIndex === lowIndex && (
                    <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-400">
                      Low
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end text-[11px] text-muted-foreground">
          <span>{tempUnit}</span>
        </div>
      </div>
    </motion.section>
  );
}