import type { WeatherVisualState } from "./visual";

/**
 * Weather ambient audio — Web Audio SYNTHESIS soundscape.
 *
 * - OPT-IN only: the engine never starts on its own; the user enables it from
 *   a click (a real user gesture), which satisfies browser autoplay policies.
 * - MUTED by default and fully user-controlled: play/stop + a volume slider.
 * - No audio assets: every layer is generated in-process (filtered white
 *   noise + occasional storm rumble), so there is nothing to license and no
 *   network dependency.
 * - Categories map from the visual weather state (see {@link ambientCategoryFor})
 *   so the soundscape follows the weather without condition logic in the UI.
 * - Respects accessibility: {@link WeatherSoundscapeEngine.available} is false
 *   when the browser reports no AudioContext or when the user prefers reduced
 *   motion (used as the conservative reduced-audio proxy).
 * - All Web Audio calls are guarded; a blocked/unsupported environment
 *   degrades to "unavailable" instead of throwing.
 */

export type WeatherAmbientCategory = "clear" | "rain" | "storm" | "snow" | "cloudy" | "night";

export const WEATHER_AMBIENT_CATEGORIES: WeatherAmbientCategory[] = [
  "clear",
  "rain",
  "storm",
  "snow",
  "cloudy",
  "night",
];

/** Category for a visual weather state (drives which soundscape plays). */
export function ambientCategoryFor(state: WeatherVisualState): WeatherAmbientCategory {
  switch (state) {
    case "thunderstorm":
      return "storm";
    case "rain":
    case "heavy-rain":
    case "drizzle":
      return "rain";
    case "snow":
      return "snow";
    case "cloudy":
    case "night-cloudy":
    case "mist":
      return "cloudy";
    case "night":
      return "night";
    default:
      return "clear";
  }
}

interface ProfileMix {
  wind: number;
  rain: number;
  rumble: number;
  thunder: boolean;
}

/** Per-category mix targets. Layer gains stay low — this is an ambient bed. */
const PROFILES: Record<WeatherAmbientCategory, ProfileMix> = {
  clear: { wind: 0.5, rain: 0, rumble: 0, thunder: false },
  cloudy: { wind: 1.0, rain: 0, rumble: 0.55, thunder: false },
  night: { wind: 0.4, rain: 0, rumble: 0.2, thunder: false },
  rain: { wind: 0.6, rain: 1.0, rumble: 0, thunder: false },
  storm: { wind: 0.9, rain: 1.0, rumble: 1.0, thunder: true },
  snow: { wind: 0.45, rain: 0, rumble: 0.3, thunder: false },
};

const WIND_GAIN = 0.05;
const RAIN_GAIN = 0.06;
const RUMBLE_GAIN = 0.04;
const MASTER_CAP = 0.8;

const PREFS_KEY = "skysense.weather.soundscape";
const DEFAULT_VOLUME = 0.6;

export interface SoundscapePrefs {
  enabled: boolean;
  volume: number;
}

export function loadSoundscapePrefs(): SoundscapePrefs {
  if (typeof window === "undefined") return { enabled: false, volume: DEFAULT_VOLUME };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { enabled: false, volume: DEFAULT_VOLUME };
    const parsed = JSON.parse(raw) as Partial<SoundscapePrefs>;
    const volume =
      typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
        ? Math.min(1, Math.max(0, parsed.volume))
        : DEFAULT_VOLUME;
    return { enabled: parsed.enabled === true, volume };
  } catch {
    return { enabled: false, volume: DEFAULT_VOLUME };
  }
}

export function saveSoundscapePrefs(prefs: SoundscapePrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be unavailable (private mode / quota); persistence is best-effort.
  }
}

class WeatherSoundscapeEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: { wind: GainNode; rain: GainNode; rumble: GainNode } | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private profile: WeatherAmbientCategory | null = null;
  private volume = DEFAULT_VOLUME;
  private running = false;
  private thunderScheduled = false;
  private thunderTimer: ReturnType<typeof setTimeout> | null = null;

  get available(): boolean {
    if (typeof window === "undefined") return false;
    if (!("AudioContext" in window)) return false;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return false;
    }
    return true;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume * MASTER_CAP;
      this.master.connect(this.ctx.destination);
      this.buildLayers();
    }
    return this.ctx;
  }

  private getNoise(): AudioBuffer {
    const ctx = this.ctx;
    if (!ctx) throw new Error("AudioContext not initialized");
    if (!this.noiseBuffer) {
      const length = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  private makeLayer(
    filterType: BiquadFilterType,
    frequency: number,
    q: number
  ): GainNode {
    const ctx = this.ctx as AudioContext;
    const source = ctx.createBufferSource();
    source.buffer = this.getNoise();
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master as GainNode);
    source.start();
    return gain;
  }

  private buildLayers(): void {
    if (!this.ctx || !this.master) return;
    this.layers = {
      wind: this.makeLayer("bandpass", 420, 0.7),
      rain: this.makeLayer("highpass", 1500, 0.8),
      rumble: this.makeLayer("lowpass", 160, 0.6),
    };
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.volume * MASTER_CAP, this.ctx.currentTime, 0.08);
    }
  }

  setProfile(category: WeatherAmbientCategory): void {
    this.profile = category;
    if (!this.ctx || !this.layers || !this.running) return;
    const mix = PROFILES[category];
    const now = this.ctx.currentTime;
    const timeConstant = 1.2;
    this.layers.wind.gain.setTargetAtTime(mix.wind * WIND_GAIN, now, timeConstant);
    this.layers.rain.gain.setTargetAtTime(mix.rain * RAIN_GAIN, now, timeConstant);
    this.layers.rumble.gain.setTargetAtTime(mix.rumble * RUMBLE_GAIN, now, timeConstant);
    this.setThunder(mix.thunder);
  }

  /** Start the soundscape. MUST be called from a user gesture. */
  async play(): Promise<boolean> {
    if (!this.available) return false;
    try {
      const ctx = this.ensureContext();
      if (ctx.state === "suspended") await ctx.resume();
      if (ctx.state !== "running") return false;
      this.running = true;
      this.setProfile(this.profile ?? "clear");
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.running = false;
    this.setThunder(false);
    try {
      void this.ctx?.suspend();
    } catch {
      // no-op
    }
  }

  /** Pause while the tab is hidden (browser also throttles audio on its own). */
  suspendForHidden(): void {
    if (!this.running || !this.ctx) return;
    try {
      void this.ctx.suspend();
    } catch {
      // no-op
    }
  }

  resumeForVisible(): void {
    if (!this.running || !this.ctx) return;
    try {
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      // no-op
    }
  }

  private setThunder(enabled: boolean): void {
    if (enabled === this.thunderScheduled) return;
    this.thunderScheduled = enabled;
    if (this.thunderTimer) {
      clearTimeout(this.thunderTimer);
      this.thunderTimer = null;
    }
    if (enabled) this.scheduleThunder();
  }

  private scheduleThunder = (): void => {
    if (!this.running || !this.thunderScheduled) return;
    const delayMs = 4000 + Math.random() * 9000;
    this.thunderTimer = setTimeout(() => {
      this.playThunderBurst();
      this.scheduleThunder();
    }, delayMs);
  };

  private playThunderBurst(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.running) return;
    try {
      const duration = 1.4 + Math.random() * 1.4;
      const source = ctx.createBufferSource();
      source.buffer = this.getNoise();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 130;
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(now);
      source.stop(now + duration + 0.1);
    } catch {
      // A single failed rumble should never break the ambient bed.
    }
  }
}

/** Singleton engine — the UI layer drives it; nothing autoplays. */
export const weatherSoundscapeEngine = new WeatherSoundscapeEngine();