"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { WeatherVisualState } from "@/lib/weather/visual";
import { visualConfig } from "@/lib/weather/visual";
import { useIsCompact } from "./useIsCompact";
import { usePageHidden } from "./usePageVisibility";

/**
 * Global weather atmosphere for the Weather experience.
 *
 * A full-viewport, content-behind layer that follows the current visual state
 * (clear / partly-cloudy / rain / snow / night / sunrise / sunset …). It is
 * purely decorative (`pointer-events-none`, `aria-hidden`) and sits behind the
 * page content so readability is never reduced.
 *
 * Performance / motion safety:
 *  - Star/glow layers thin out on small viewports (see {@link useIsCompact}).
 *  - All animation pauses while the tab is hidden (see {@link usePageHidden}).
 *  - Animation respects prefers-reduced-motion (globals.css + MotionConfig).
 */
function starList(count: number): Array<{ left: string; top: string; size: string; delay: string; duration: string }> {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 53 + 7) % 100;
    return {
      left: `${(seed * 3.7) % 100}%`,
      top: `${8 + ((seed * 7.3) % 46)}%`,
      size: `${1 + (seed % 2)}px`,
      delay: `${(seed % 7) * 0.4}s`,
      duration: `${2.8 + (seed % 5) * 0.5}s`,
    };
  });
}

export function WeatherAtmosphere({ state }: { state: WeatherVisualState }) {
  const config = visualConfig(state);
  const hidden = usePageHidden();
  const compact = useIsCompact();
  const stars = starList(compact ? 8 : 14);
  const goldenHour = state === "sunrise" || state === "sunset";

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${hidden ? "atmosphere-paused" : ""}`}
      aria-hidden="true"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={state}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{ background: config.sky }}
        />
      </AnimatePresence>

      <div
        className="absolute inset-x-0 top-0 h-[420px]"
        style={{
          background: `radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, ${config.accent} 13%, transparent), transparent 70%)`,
        }}
      />

      {config.rays && !compact && (
        <div
          className="weather-rays absolute inset-0 opacity-50"
          style={{
            background: `conic-gradient(${goldenHour ? "from 0deg at 50% 100%" : "from 48deg at 50% -4%"}, transparent 0deg, ${config.glowColor}30 18deg, transparent 34deg, transparent 60deg, ${config.glowColor}22 78deg, transparent 94deg, transparent 120deg, ${config.glowColor}28 138deg, transparent 154deg)`,
            WebkitMaskImage: goldenHour
              ? "radial-gradient(120% 60% at 50% 100%, black 0%, transparent 70%)"
              : "radial-gradient(120% 90% at 50% 0%, black 0%, transparent 74%)",
            maskImage: goldenHour
              ? "radial-gradient(120% 60% at 50% 100%, black 0%, transparent 70%)"
              : "radial-gradient(120% 90% at 50% 0%, black 0%, transparent 74%)",
          }}
        />
      )}

      {config.stars && (
        <div className="absolute inset-0">
          {stars.map((star, i) => (
            <span
              key={i}
              className="weather-star"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
                animationDuration: star.duration,
              }}
            />
          ))}
        </div>
      )}

      {config.isNight && (
        <span className="weather-moon right-[14%] top-[14%] h-24 w-24" aria-hidden="true" />
      )}

      {!config.stars && (
        <div
          className={`weather-sun-glow absolute ${goldenHour ? "right-[26%] top-[64%] h-72 w-72" : "right-[16%] top-[12%] h-72 w-72"}`}
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${config.glowColor} 55%, transparent) 0%, transparent 70%)`,
          }}
        />
      )}

      <div
        className="weather-horizon-glow absolute inset-x-0 bottom-0"
        style={{ ["--horizon-color" as string]: `color-mix(in srgb, ${config.accent} 16%, transparent)` }}
        aria-hidden="true"
      />

      {config.clouds && (
        <>
          <div
            className="weather-cloud-drift absolute -left-24 top-[20%] h-44 w-96 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.16), transparent 70%)", filter: "blur(32px)" }}
          />
          <div
            className="weather-cloud-drift-reverse absolute -right-24 top-[44%] h-36 w-80 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.1), transparent 70%)", filter: "blur(36px)" }}
          />
        </>
      )}

      {config.lightning && (
        <div
          className="weather-lightning absolute inset-0"
          style={{ background: "radial-gradient(72% 58% at 72% 4%, rgba(220, 225, 255, 0.32), transparent 64%)" }}
        />
      )}
    </div>
  );
}