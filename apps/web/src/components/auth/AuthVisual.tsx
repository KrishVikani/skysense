"use client";

import { CalendarDays, CloudMoon, MapPin } from "lucide-react";
import { AuthBrand } from "./AuthBrand";

const FEATURES = [
  { icon: MapPin, title: "Any city", note: "Live conditions via OpenWeather" },
  { icon: CalendarDays, title: "Forecasts", note: "Hourly, daily and temperature trend" },
  { icon: CloudMoon, title: "Atmosphere", note: "Clear skies, cloud, rain and night" },
];

/**
 * Premium SkySense weather atmosphere for the authentication experience.
 *
 * A calm blue-hour sky — soft sun, drifting clouds and a warm horizon glow —
 * so the entry screen already feels like the Weather product. Purely
 * decorative (CSS-only, gated behind prefers-reduced-motion); nothing here is
 * live or simulated weather data.
 */
export function AuthVisual() {
  return (
    <div className="relative h-full min-h-screen overflow-hidden">
      {/* Blue-hour sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #030d1b 0%, #0a1f38 30%, #123c61 55%, #1e5a85 78%, #2c6f96 100%)",
        }}
        aria-hidden="true"
      />

      {/* Soft sun halo + disc */}
      <div
        className="absolute left-[22%] top-[24%] h-48 w-48 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,224,150,0.5) 0%, rgba(255,214,130,0.16) 45%, transparent 72%)",
          filter: "blur(6px)",
        }}
        aria-hidden="true"
      />
      <span className="weather-sun left-[24%] top-[26%] h-14 w-14" aria-hidden="true" />

      {/* Distant drifting clouds */}
      <div
        className="weather-far-cloud -left-24 top-[30%] h-32 w-96"
        style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.16), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="weather-far-cloud-reverse -right-24 top-[46%] h-28 w-80"
        style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.12), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="weather-far-cloud left-[42%] top-[58%] h-24 w-72"
        style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.1), transparent 70%)" }}
        aria-hidden="true"
      />

      {/* Warm horizon glow + ground haze for depth */}
      <div
        className="weather-horizon-glow absolute inset-x-0 bottom-0"
        style={{ ["--horizon-color" as string]: "rgba(255, 214, 150, 0.45)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-44"
        style={{ background: "linear-gradient(to top, rgba(3,15,28,0.55), transparent)" }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex h-full min-h-screen flex-col justify-between p-12 xl:p-16">
        <AuthBrand variant="inverse" />

        <div className="max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-sky-100/90 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-200" />
            Live Weather Experience
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white xl:text-5xl">
            Know your sky.
            <span className="mt-2 block bg-gradient-to-r from-sky-200 via-cyan-100 to-amber-100 bg-clip-text text-transparent">
              Beautifully forecast.
            </span>
          </h1>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-slate-200/90">
            Live conditions and forecasts for any city, wrapped in a calm,
            cinematic atmosphere — clear skies, cloud, rain and night, told with
            clarity and care.
          </p>
        </div>

        <div className="max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300/80">SKYSENSE</p>
          <ul className="mt-3 space-y-2.5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-200">
                  <feature.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{feature.title}</span>
                  <span className="block text-xs text-slate-300/80">{feature.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="absolute bottom-6 left-12 z-10 text-[11px] text-slate-300/70 xl:left-16">
        © {new Date().getFullYear()} SKYSENSE
      </div>
    </div>
  );
}