"use client";

import { Cloud } from "lucide-react";

interface SkySenseMarkProps {
  /** Sizing class for the tile, e.g. "h-11 w-11" (auth) or "h-8 w-8" (nav). */
  className?: string;
}

/**
 * SkySense brand mark — a sun-and-cloud glyph inside the brand gradient.
 *
 * A single reusable weather identity used across the auth experience and the
 * app navigation so the product reads as one weather application from the
 * first screen. The mark is decorative (`aria-hidden`); nearby text always
 * carries the "SKYSENSE" name.
 */
export function SkySenseMark({ className = "h-11 w-11" }: SkySenseMarkProps) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent via-accent to-sky text-white shadow-sm ${className}`}
      aria-hidden="true"
    >
      <span className="absolute left-1/2 top-[36%] h-[32%] w-[32%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95 shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
      <Cloud className="absolute -bottom-[14%] -right-[12%] h-[54%] w-[54%] text-white/45" strokeWidth={1.5} />
    </span>
  );
}