"use client";

import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cloud } from "lucide-react";
import type { WeatherVisualState } from "@/lib/weather/visual";
import { visualConfig } from "@/lib/weather/visual";
import { useIsCompact } from "./useIsCompact";
import { usePageHidden } from "./usePageVisibility";

/**
 * Atmospheric visual scene for the weather hero.
 *
 * Renders a condition-driven sky (gradient, sun/moon glow, drifting clouds,
 * rain, snow, mist, restrained lightning, night stars, slow sun rays) behind
 * the hero content. Reads every value from the central visual-state registry
 * (`lib/weather/visual.ts`), so no condition-specific styling lives here.
 *
 * Performance / motion safety:
 *  - Particle density drops on small viewports (see {@link useIsCompact}).
 *  - All CSS animation is paused while the tab is hidden
 *    ({@link usePageHidden} → `.atmosphere-paused`).
 *  - Animation is gated behind `prefers-reduced-motion` (see globals.css) and
 *    conditions are always described in text, so nothing relies on visuals.
 *  - State changes crossfade the scene without animating surrounding content.
 */
interface RainParticle { left: string; height: string; delay: string; duration: string }
interface SnowParticle { left: string; size: string; delay: string; duration: string }
interface MistParticle { top: string; width: string; opacity: number; delay: string; duration: string }

function rainParticles(count: number): RainParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 37 + 11) % 100;
    return {
      left: `${(seed * 5.3) % 100}%`,
      height: `${8 + (seed % 14)}px`,
      delay: `${(seed % 9) * 0.1}s`,
      duration: `${0.75 + (seed % 5) * 0.07}s`,
    };
  });
}

function heavyRainParticles(count: number): RainParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 29 + 17) % 100;
    return {
      left: `${(seed * 4.7) % 100}%`,
      height: `${12 + (seed % 18)}px`,
      delay: `${(seed % 7) * 0.08}s`,
      duration: `${0.6 + (seed % 4) * 0.06}s`,
    };
  });
}

function snowParticles(count: number): SnowParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 41 + 19) % 100;
    return {
      left: `${(seed * 5.1) % 100}%`,
      size: `${3 + (seed % 3)}px`,
      delay: `${(seed % 11) * 0.12}s`,
      duration: `${4 + (seed % 5) * 0.6}s`,
    };
  });
}

function mistParticles(count: number): MistParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 29 + 7) % 100;
    return {
      top: `${20 + (seed % 55)}%`,
      width: `${45 + (seed % 30)}%`,
      opacity: 0.22 + (seed % 20) / 100,
      delay: `${(seed % 8) * 0.5}s`,
      duration: `${26 + (seed % 10)}s`,
    };
  });
}

function stars(count: number): Array<{ left: string; top: string; size: string; delay: string; duration: string }> {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 53 + 7) % 100;
    return {
      left: `${(seed * 3.7) % 100}%`,
      top: `${8 + ((seed * 7.3) % 40)}%`,
      size: `${1 + (seed % 2)}px`,
      delay: `${(seed % 7) * 0.4}s`,
      duration: `${2.8 + (seed % 5) * 0.5}s`,
    };
  });
}

const CLOUD_LAYERS: Array<{ className: string; style: CSSProperties }> = [
  { className: "absolute right-[4%] top-[18%] h-20 w-28", style: { color: "rgba(255,255,255,0.55)" } },
  { className: "absolute right-[14%] top-[50%] h-16 w-24", style: { color: "rgba(255,255,255,0.4)" } },
  { className: "absolute left-[42%] bottom-[7%] h-12 w-16", style: { color: "rgba(255,255,255,0.3)" } },
];

/**
 * Condition-aware cloud presence. Clouds are deliberately kept out of the
 * hero's top-left text zone (brand, location, temperature) — they sit top-right
 * and along the bottom so the big temperature always reads cleanly. Stormier
 * scenes carry more layers; sun/shared skies carry fewer.
 */
function cloudDensity(state: WeatherVisualState): number {
  switch (state) {
    case "thunderstorm":
    case "heavy-rain":
    case "rain":
    case "drizzle":
    case "mist":
    case "snow":
    case "cloudy":
      return 3;
    case "partly-cloudy":
    case "night-cloudy":
    case "sunrise":
    case "sunset":
      return 2;
    default:
      return 0;
  }
}

export function WeatherConditionVisual({
  state,
  className = "",
}: {
  state: WeatherVisualState;
  className?: string;
}) {
  const config = visualConfig(state);
  const hidden = usePageHidden();
  const goldenHour = state === "sunrise" || state === "sunset";
  const compact = useIsCompact();

  const rain = rainParticles(compact ? 8 : 14);
  const heavyRain = heavyRainParticles(compact ? 12 : 26);
  const snow = snowParticles(compact ? 7 : 12);
  const mist = mistParticles(compact ? 3 : 5);
  const starList = stars(compact ? 9 : 18);
  const density = cloudDensity(state);
  const cloudLayers = CLOUD_LAYERS.slice(0, Math.min(density, compact ? 2 : 3));

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${hidden ? "atmosphere-paused" : ""} ${className}`}
      aria-hidden="true"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={state}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
          style={{ background: config.sky }}
        />
      </AnimatePresence>

      {config.rays && (
        <div
          className="weather-rays absolute inset-0"
          style={{
            background: `conic-gradient(${goldenHour ? "from 0deg at 50% 78%" : "from 45deg at 18% 0%"}, transparent 0deg, ${config.glowColor}40 16deg, transparent 32deg, transparent 54deg, ${config.glowColor}2e 70deg, transparent 84deg, transparent 108deg, ${config.glowColor}36 124deg, transparent 140deg)`,
            WebkitMaskImage: goldenHour
              ? "radial-gradient(80% 55% at 50% 88%, black 0%, transparent 72%)"
              : "radial-gradient(95% 85% at 20% 0%, black 0%, transparent 72%)",
            maskImage: goldenHour
              ? "radial-gradient(80% 55% at 50% 88%, black 0%, transparent 72%)"
              : "radial-gradient(95% 85% at 20% 0%, black 0%, transparent 72%)",
          }}
        />
      )}

      {config.rays && (
        <span
          className={`weather-sun ${goldenHour ? "left-[16%] top-[52%] h-20 w-20 lg:h-24 lg:w-24" : "left-[15%] top-[19%] h-16 w-16 lg:h-20 lg:w-20"}`}
          aria-hidden="true"
        />
      )}

      {config.stars ? (
        <div className="absolute inset-0">
          {starList.map((star, i) => (
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
      ) : (
        <div
          className={`weather-sun-glow absolute ${goldenHour ? "left-[13%] top-[42%] h-40 w-40" : "left-[10%] top-[16%] h-32 w-32"}`}
          style={{ background: `radial-gradient(circle, ${config.glowColor} 0%, color-mix(in srgb, ${config.glowColor} 25%, transparent) 55%, transparent 70%)` }}
        />
      )}

      {config.isNight && (
        <span className="weather-moon right-[16%] top-[12%] h-16 w-16" aria-hidden="true" />
      )}

      {config.lightning && (
        <div
          className="weather-lightning absolute inset-0"
          style={{ background: "radial-gradient(70% 55% at 72% 6%, rgba(220, 225, 255, 0.5), transparent 62%)" }}
        />
      )}

      {config.clouds && (
        <>
          <div
            className="weather-far-cloud -right-24 top-[10%] h-28 w-80"
            style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.2), transparent 70%)" }}
            aria-hidden="true"
          />
          <div
            className="weather-far-cloud-reverse -right-10 bottom-[18%] h-24 w-72"
            style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.15), transparent 70%)" }}
            aria-hidden="true"
          />
        </>
      )}

      {config.clouds &&
        cloudLayers.map((layer, i) => (
          <Cloud
            key={i}
            className={`${i % 2 === 0 ? "weather-cloud-drift" : "weather-cloud-drift-reverse"} ${layer.className}`}
            style={layer.style}
            strokeWidth={1.4}
            fill="currentColor"
            fillOpacity={0.25}
          />
        ))}

      {config.particles === "rain" &&
        rain.map((p, i) => (
          <span
            key={i}
            className="weather-rain"
            style={{ left: p.left, height: p.height, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}

      {config.particles === "heavy-rain" &&
        heavyRain.map((p, i) => (
          <span
            key={i}
            className="weather-rain weather-rain-heavy"
            style={{ left: p.left, height: p.height, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}

      {config.particles === "snow" &&
        snow.map((p, i) => (
          <span
            key={i}
            className="weather-snow absolute"
            style={{ left: p.left, top: 0, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}

      {config.particles === "mist" &&
        mist.map((p, i) => (
          <span
            key={i}
            className="weather-mist absolute rounded-full"
            style={{ top: p.top, width: p.width, height: "14px", opacity: p.opacity, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}

      <div
        className="weather-horizon-glow absolute inset-x-0 bottom-0"
        style={{ ["--horizon-color" as string]: `color-mix(in srgb, ${config.accent} 30%, transparent)` }}
        aria-hidden="true"
      />

      {(config.particles === "rain" || config.particles === "heavy-rain") && (
        <div className="weather-wet-sheen absolute inset-x-0 bottom-0" aria-hidden="true" />
      )}

      <div
        className="absolute inset-x-0 bottom-0 h-24"
        style={{ background: "linear-gradient(to top, rgba(10,24,38,0.28), transparent)" }}
      />
    </div>
  );
}