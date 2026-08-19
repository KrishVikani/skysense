"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnvironmentalReading, MetricKey, TimeRange } from "@/lib/environmental/types";
import { formatX, fullTimestamp, yDomain } from "./chartUtils";

interface TrendChartProps {
  data: EnvironmentalReading[];
  dataKey: MetricKey;
  color: string;
  seriesLabel: string;
  range: TimeRange;
  average: number;
  valueFormatter: (_value: number) => string;
}

interface TooltipEntry {
  value?: number | string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: string | number;
}

export function TrendChart({
  data,
  dataKey,
  color,
  seriesLabel,
  range,
  average,
  valueFormatter,
}: TrendChartProps) {
  const values = data.map((r) => r[dataKey]);
  const domain = yDomain(values);
  const gradientId = `trend-fill-${dataKey}`;
  const latest = values[values.length - 1];

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const raw = typeof payload[0].value === "number" ? payload[0].value : 0;
    const time = label !== undefined ? fullTimestamp(String(label)) : "";
    return (
      <div className="card-elevated px-3 py-2.5 shadow-lg min-w-[180px] pointer-events-none">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{seriesLabel}</p>
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <p className="text-lg font-bold tabular-nums leading-tight" style={{ color }}>
            {valueFormatter(raw)}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{time}</p>
      </div>
    );
  };

  return (
    <div
      className="h-[280px] lg:h-[320px] w-full"
      role="img"
      aria-label={`${seriesLabel} trend chart, current ${valueFormatter(latest)}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" strokeOpacity={0.7} vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="category"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, dy: 8 }}
            tickFormatter={(value: string) => formatX(value, range)}
            interval="preserveStartEnd"
            tickCount={6}
            minTickGap={24}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            domain={domain}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickFormatter={valueFormatter}
            axisLine={false}
            tickLine={false}
            tickMargin={6}
            width={56}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "var(--color-muted-foreground)", strokeDasharray: "4 4", strokeOpacity: 0.4 }}
            wrapperStyle={{ pointerEvents: "none", outline: "none", zIndex: 30 }}
            isAnimationActive={false}
          />
          <ReferenceLine
            y={average}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="6 4"
            strokeOpacity={0.5}
            label={{
              value: `Avg ${valueFormatter(average)}`,
              position: "insideTopRight",
              fill: "var(--color-muted-foreground)",
              fontSize: 10,
            }}
          />
          <Area
            key={dataKey}
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--color-card)", fill: color }}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle: string;
  /** Tertiary context above the primary value, e.g. "Current". */
  summaryLabel: string;
  /** Primary value — visually dominant. */
  summaryValue: string;
  /** Secondary min/max line beneath the primary value. */
  minMaxLabel: string;
  legendColor: string;
  legendLabel: string;
  /** Tertiary footer meta (average, trend, etc.). */
  footerMeta: React.ReactNode;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  summaryLabel,
  summaryValue,
  minMaxLabel,
  legendColor,
  legendLabel,
  footerMeta,
  children,
}: ChartCardProps) {
  return (
    <div className="card-premium p-4 lg:p-6 flex flex-col gap-4 min-w-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          <p className="section-subtitle">{subtitle}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{summaryLabel}</p>
          <p className="text-2xl lg:text-3xl font-bold tabular-nums text-foreground mt-0.5 leading-tight">
            {summaryValue}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{minMaxLabel}</p>
        </div>
      </div>
      <div className="overflow-hidden">{children}</div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: legendColor }} aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">{legendLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">{footerMeta}</div>
      </div>
    </div>
  );
}