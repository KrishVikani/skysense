"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronDown, Volume2, VolumeX } from "lucide-react";
import {
  weatherSoundscapeEngine,
  ambientCategoryFor,
  loadSoundscapePrefs,
  saveSoundscapePrefs,
} from "@/lib/weather/ambientAudio";
import type { WeatherVisualState } from "@/lib/weather/visual";

type Status = "off" | "on" | "starting" | "blocked" | "unavailable";

const STATUS_LABEL: Record<Status, string> = {
  off: "Off",
  on: "On",
  starting: "Starting…",
  blocked: "Tap to enable",
  unavailable: "Unavailable",
};

export function WeatherAmbienceControl({ visualState }: { visualState: WeatherVisualState }) {
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<Status>("off");
  const [volume, setVolume] = useState(() => loadSoundscapePrefs().volume);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prefs = loadSoundscapePrefs();
    setVolume(prefs.volume);
    if (!weatherSoundscapeEngine.available) {
      setStatus("unavailable");
      return;
    }
    if (prefs.enabled) void startAudio(prefs.volume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Accessibility: switching reduced-motion off/on while the app is open.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      const next = weatherSoundscapeEngine.available;
      if (!next && playing) {
        weatherSoundscapeEngine.stop();
        setPlaying(false);
        setStatus("unavailable");
        saveSoundscapePrefs({ enabled: false, volume });
      } else if (next && !playing) {
        setStatus("off");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, volume]);

  // Follow the weather: swap the soundscape profile as conditions change.
  useEffect(() => {
    if (!playing) return;
    weatherSoundscapeEngine.setProfile(ambientCategoryFor(visualState));
  }, [visualState, playing]);

  // Keep ambience flowing when the tab is hidden and pause it from playing
  // in the background (browsers throttle audio there anyway).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") weatherSoundscapeEngine.suspendForHidden();
      else weatherSoundscapeEngine.resumeForVisible();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      weatherSoundscapeEngine.stop();
    };
  }, []);

  const startAudio = async (atVolume: number) => {
    if (!weatherSoundscapeEngine.available) {
      setStatus("unavailable");
      return;
    }
    setStatus("starting");
    const ok = await weatherSoundscapeEngine.play();
    if (ok) {
      weatherSoundscapeEngine.setVolume(atVolume);
      weatherSoundscapeEngine.setProfile(ambientCategoryFor(visualState));
      setPlaying(true);
      setStatus("on");
      saveSoundscapePrefs({ enabled: true, volume: atVolume });
    } else {
      setPlaying(false);
      setStatus("blocked");
    }
  };

  const handleToggle = async () => {
    if (playing) {
      weatherSoundscapeEngine.stop();
      setPlaying(false);
      setStatus("off");
      saveSoundscapePrefs({ enabled: false, volume });
      return;
    }
    await startAudio(volume);
  };

  const handleVolume = (next: number) => {
    setVolume(next);
    if (playing) weatherSoundscapeEngine.setVolume(next);
    saveSoundscapePrefs({ enabled: playing, volume: next });
  };

  const announcement =
    status === "on"
      ? `Weather ambience is on at ${Math.round(volume * 100)} percent volume.`
      : status === "off"
        ? "Weather ambience is off."
        : status === "starting"
          ? "Starting weather ambience."
          : status === "blocked"
            ? "Sound is blocked until you tap the ambience control."
            : status === "unavailable"
              ? "Weather ambience is unavailable on this device or with reduced-motion enabled."
              : "";

  return (
    <div className="relative inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5">
      {status === "on" ? (
        <Volume2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
      ) : (
        <VolumeX className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      )}
      <span className="text-xs font-medium text-muted-foreground">Weather ambience</span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={status === "starting"}
        aria-pressed={status === "on"}
        aria-label={`Weather ambience — ${STATUS_LABEL[status]}`}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          status === "on"
            ? "bg-accent-bg/40 text-accent"
            : status === "blocked"
              ? "text-warning"
              : status === "unavailable"
                ? "text-muted-foreground line-through"
                : "text-foreground/70 hover:text-foreground"
        }`}
      >
        {status === "on" && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />}
        {STATUS_LABEL[status]}
      </button>
      <button
        type="button"
        onClick={() => setPopoverOpen((open) => !open)}
        aria-expanded={popoverOpen}
        aria-haspopup="true"
        aria-label="Weather ambience volume"
        className="inline-flex items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${popoverOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {popoverOpen && (
          <motion.div
            ref={popoverRef}
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-card card-elevated shadow-xl p-4"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between">
              <label htmlFor="ambience-volume" className="text-sm font-medium text-foreground">
                Volume
              </label>
              <span className="text-xs tabular-nums text-muted-foreground">{Math.round(volume * 100)}%</span>
            </div>
            <input
              ref={volumeSliderRef}
              id="ambience-volume"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(event) => handleVolume(Number(event.target.value) / 100)}
              className="mt-3 w-full accent-[var(--color-accent)]"
              aria-label="Ambience volume"
            />
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {status === "blocked" && (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
              )}
              <span>
                {status === "blocked"
                  ? "Your browser blocked audio. Tap the ambience control above to start sound."
                  : "Ambience starts from a tap or click and never autoplays. It follows the current weather."}
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}