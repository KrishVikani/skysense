"use client";

import { Cloud } from "lucide-react";
import type { WeatherConditionId } from "@/lib/weather/types";

/**
 * Lightweight decorative sky layer for the My Station hero.
 *
 * Purely atmospheric: a deep steel / navy / teal gradient derived from the
 * current condition, a temperature-tinted overlay and drifting cloud shapes.
 * The palette stays dark so the hero's white text keeps strong contrast —
 * it never returns to the previous pale, low-contrast sky. It never implies
 * additional sensor data — the actual values are rendered as text by the hero.
 * Every element is `aria-hidden` and all animation (glow drift, clouds) is
 * gated behind `@media (prefers-reduced-motion: no-preference)` in globals.css.
 */
const SKY_GRADIENTS: Partial<Record<WeatherConditionId, string>> = {
  sunny:
    "linear-gradient(165deg, #0d2038 0%, #12304e 34%, #0e2740 62%, #091b30 84%, #061427 100%)",
  "partly-cloudy":
    "linear-gradient(165deg, #0b1c31 0%, #102a45 36%, #0c2339 64%, #081a2d 86%, #051226 100%)",
  cloudy:
    "linear-gradient(165deg, #131c2a 0%, #1a2838 38%, #141f2d 64%, #0d1622 86%, #091019 100%)",
  rain:
    "linear-gradient(165deg, #10202e 0%, #182e40 38%, #12242f 64%, #0c1924 86%, #071118 100%)",
  thunderstorm:
    "linear-gradient(165deg, #0d1622 0%, #15202f 38%, #0e1824 64%, #08101a 86%, #050a11 100%)",
  night:
    "linear-gradient(165deg, #050c1a 0%, #0a1828 40%, #071424 68%, #040d1c 100%)",
};

/** Soft temperature-dependent tint so the sky reflects the current reading. */
function temperatureTint(temperatureC: number): string {
  if (temperatureC < 15) return "radial-gradient(120% 90% at 15% 20%, rgba(96, 165, 250, 0.16), transparent 60%)";
  if (temperatureC < 25) return "radial-gradient(120% 90% at 15% 20%, rgba(56, 189, 248, 0.12), transparent 60%)";
  if (temperatureC < 33) return "radial-gradient(120% 90% at 15% 20%, rgba(251, 191, 36, 0.12), transparent 60%)";
  return "radial-gradient(120% 90% at 15% 20%, rgba(251, 146, 60, 0.18), transparent 60%)";
}

export function StationAtmosphere({
  conditionId,
  temperatureC,
}: {
  conditionId: WeatherConditionId;
  temperatureC: number;
}) {
  const sky = SKY_GRADIENTS[conditionId] ?? SKY_GRADIENTS["partly-cloudy"] ?? "";
  const showClouds = conditionId === "partly-cloudy" || conditionId === "cloudy" || conditionId === "rain";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: sky }} />
      <div className="absolute inset-0" style={{ background: temperatureTint(temperatureC) }} />

      <div
        className="atmosphere-drift absolute right-[10%] top-[12%] h-72 w-72 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(45, 212, 191, 0.16) 0%, rgba(45, 212, 191, 0.05) 45%, transparent 70%)" }}
      />
      <div
        className="atmosphere-drift-slow absolute -left-16 bottom-[6%] h-64 w-64 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 50%, transparent 72%)" }}
      />

      {showClouds && (
        <>
          <Cloud
            className="weather-cloud-drift absolute left-[8%] top-[30%] h-16 w-24 text-white/15"
            strokeWidth={1.4}
            fill="currentColor"
            fillOpacity={0.18}
          />
          <Cloud
            className="weather-cloud-drift-reverse absolute right-[6%] top-[62%] h-12 w-20 text-white/10"
            strokeWidth={1.4}
            fill="currentColor"
            fillOpacity={0.14}
          />
        </>
      )}

      <div
        className="absolute inset-x-0 bottom-0 h-28"
        style={{ background: "linear-gradient(to top, rgba(4, 10, 20, 0.55), transparent)" }}
      />
    </div>
  );
}