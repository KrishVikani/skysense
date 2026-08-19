"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  Cpu,
  Loader2,
  LocateFixed,
  MapPin,
  Monitor,
  Moon,
  SkipForward,
  User,
  Volume2,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useLocation } from "@/components/LocationProvider";
import { SkySenseMark } from "@/components/brand/SkySenseMark";
import { LocationSearch } from "@/components/weather/LocationSearch";
import { loadOnboarding, saveOnboarding } from "@/lib/onboarding/storage";
import { loadSoundscapePrefs, saveSoundscapePrefs } from "@/lib/weather/ambientAudio";
import { DEFAULT_WEATHER_LOCATION } from "@/lib/weather/locations";
import type { ThemePreference } from "@/lib/settings/types";

const STEP_LABELS = ["Welcome", "Your name", "Permissions", "Location", "Theme", "My Station", "Done"];

type PermissionState = "idle" | "busy" | "granted" | "denied" | "unavailable";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { user, updateProfile } = useAuth();
  const uid = user?.uid ?? null;
  const { setTheme } = useTheme();
  const { location, setLocation } = useLocation();

  const reducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [locationPerm, setLocationPerm] = useState<PermissionState>("idle");
  const [notificationPerm, setNotificationPerm] = useState<PermissionState>("idle");
  const [soundPref, setSoundPref] = useState(false);
  const [themeChoice, setThemeChoice] = useState<ThemePreference>("dark");
  const [deviceIntent, setDeviceIntent] = useState<"connect" | "later" | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Resume from saved progress (reload-safe; never credentials).
  useEffect(() => {
    if (!uid) return;
    const stored = loadOnboarding(uid);
    if (stored.step != null) setStep(Math.min(stored.step, STEP_LABELS.length - 1));
    if (stored.displayName) setDisplayName(stored.displayName);
    if (stored.soundEnabled) setSoundPref(true);
    if (stored.theme) setThemeChoice(stored.theme);
    if (stored.deviceIntent) setDeviceIntent(stored.deviceIntent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const persist = (nextStep: number) => {
    if (!uid) return;
    saveOnboarding(uid, {
      completed: false,
      step: nextStep,
      displayName,
      theme: themeChoice,
      soundEnabled: soundPref,
      deviceIntent: deviceIntent ?? undefined,
      location,
    });
  };

  // Focus management: the dialog takes keyboard focus and traps Tab.
  useEffect(() => {
    dialogRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const within = active !== null && dialog.contains(active);
      if (event.shiftKey && (!within || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!within || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [step]);

  if (!uid) return null;

  const advance = (nextStep?: number) => {
    const target = nextStep ?? step + 1;
    persist(target);
    setStep(target);
  };

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationPerm("unavailable");
      setAnnouncement("Location access is not supported by this browser.");
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setLocationPerm("unavailable");
      setAnnouncement("Location requires a secure connection (HTTPS).");
      return;
    }
    setLocationPerm("busy");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationPerm("granted");
        setAnnouncement("Location permission granted.");
      },
      () => {
        setLocationPerm("denied");
        setAnnouncement("Location permission not granted. You can use a city search instead.");
      },
      { timeout: 10_000 }
    );
  };

  const requestNotifications = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPerm("unavailable");
      setAnnouncement("Notifications are not supported by this browser.");
      return;
    }
    if (Notification.permission === "granted") {
      setNotificationPerm("granted");
      return;
    }
    setNotificationPerm("busy");
    Notification.requestPermission().then((result) => {
      if (result === "granted") {
        setNotificationPerm("granted");
        setAnnouncement("Notifications enabled.");
      } else {
        setNotificationPerm("denied");
        setAnnouncement("Notifications not enabled. You can still use alerts inside the app.");
      }
    });
  };

  const toggleSound = () => {
    const next = !soundPref;
    setSoundPref(next);
    saveSoundscapePrefs({ enabled: next, volume: loadSoundscapePrefs().volume });
    setAnnouncement(next ? "Weather soundscape enabled. It starts on the Weather page." : "Weather soundscape disabled.");
  };

  const selectTheme = (choice: ThemePreference) => {
    setThemeChoice(choice);
    setTheme(choice);
  };

  const saveName = async () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setNameError("Your name should be between 2 and 40 characters.");
      return;
    }
    setNameError(null);
    setSavingName(true);
    try {
      await updateProfile(trimmed);
      advance();
    } catch {
      setNameError("Could not save your name right now. You can change it later from Settings.");
    } finally {
      setSavingName(false);
    }
  };

  const finish = () => {
    if (!uid) return;
    saveOnboarding(uid, { completed: true, skipped: false, step: STEP_LABELS.length - 1, displayName, theme: themeChoice, soundEnabled: soundPref, deviceIntent: deviceIntent ?? undefined, location });
    onComplete();
  };

  const skipSetup = () => {
    if (!uid) return;
    saveOnboarding(uid, { completed: true, skipped: true });
    onComplete();
  };

  const content = (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Step {step + 1} of {STEP_LABELS.length}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Welcome to SKYSENSE</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Your personal environmental intelligence platform. Six quick steps — your name, permissions,
                location, appearance and station — and you're in.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <button type="button" onClick={() => advance()} className="btn-primary w-full justify-center">
                  Let's go
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={skipSetup} className="btn-ghost w-full justify-center text-sm">
                  <SkipForward className="h-4 w-4" aria-hidden="true" />
                  Skip setup for now
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Step {step + 1} of {STEP_LABELS.length}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">How should we call you?</h2>
              <p className="mt-2 text-sm text-muted-foreground">Your display name shows on your profile and in the app header.</p>
              <label htmlFor="onboarding-name" className="mt-5 block text-sm font-medium text-foreground">
                Display name
              </label>
              <input
                id="onboarding-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveName();
                }}
                maxLength={40}
                autoComplete="name"
                placeholder="e.g. Krish"
                className="mt-1.5 w-full rounded-2xl border border-border bg-card/60 px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {nameError && <p className="mt-1.5 text-sm text-warning" role="alert">{nameError}</p>}
              <div className="mt-5 flex gap-2.5">
                <button type="button" onClick={saveName} disabled={savingName} className="btn-primary flex-1 justify-center">
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <User className="h-4 w-4" aria-hidden="true" />}
                  {savingName ? "Saving…" : "Save and continue"}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Step {step + 1} of {STEP_LABELS.length}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Permissions</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything is optional and can be changed anytime. SKYSENSE never uses the camera.
              </p>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-bg/40">
                        <LocateFixed className="h-4 w-4 text-accent" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Location</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Used to suggest your weather and local conditions.</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {locationPerm === "granted" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Granted
                      </span>
                    ) : locationPerm === "denied" || locationPerm === "unavailable" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        {locationPerm === "denied" ? "Not granted" : "Unavailable"}
                      </span>
                    ) : (
                      <button type="button" onClick={requestLocation} disabled={locationPerm === "busy"} className="btn-secondary text-sm">
                        {locationPerm === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}
                        Enable location
                      </button>
                    )}
                    <button type="button" onClick={() => { setLocationPerm("denied"); setAnnouncement("Location skipped. You can search any city instead."); }} className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
                      Skip
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-bg/40">
                      <BellRing className="h-4 w-4 text-accent" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Notifications</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Alerts for weather and air-quality thresholds, sent to this device.</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {notificationPerm === "granted" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Enabled
                      </span>
                    ) : notificationPerm === "denied" || notificationPerm === "unavailable" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        {notificationPerm === "denied" ? "Not enabled" : "Unsupported"}
                      </span>
                    ) : (
                      <button type="button" onClick={requestNotifications} disabled={notificationPerm === "busy"} className="btn-secondary text-sm">
                        {notificationPerm === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BellRing className="h-4 w-4" aria-hidden="true" />}
                        Enable notifications
                      </button>
                    )}
                    <button type="button" onClick={() => { setNotificationPerm("denied"); setAnnouncement("Notifications skipped. Alerts remain visible inside the app."); }} className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
                      Skip
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-bg/40">
                        <Volume2 className="h-4 w-4 text-accent" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Weather soundscape</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Subtle ambient sound that follows the weather. Never autoplays.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={soundPref}
                      onClick={toggleSound}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${soundPref ? "bg-accent" : "bg-muted/30"}`}
                      aria-label="Enable weather soundscape"
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${soundPref ? "translate-x-[22px]" : "translate-x-[2px]"}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => advance()} className="btn-primary mt-6 w-full justify-center">
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Step {step + 1} of {STEP_LABELS.length}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Where are you?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick your city so the Weather page starts with the right conditions. You can search, use your
                current location, or keep the default.
              </p>
              <div className="mt-5">
                <LocationSearch location={location} onSelect={(next) => setLocation(next)} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {location.name}, {location.state ?? location.country} will be used for weather.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <button type="button" onClick={() => advance()} className="btn-primary w-full justify-center">
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                {location.name !== DEFAULT_WEATHER_LOCATION.name && (
                  <button
                    type="button"
                    onClick={() => setLocation(DEFAULT_WEATHER_LOCATION)}
                    className="btn-ghost w-full justify-center text-sm"
                  >
                    Reset to default ({DEFAULT_WEATHER_LOCATION.name})
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Step {step + 1} of {STEP_LABELS.length}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Appearance</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                SKYSENSE is designed as a rich, evening-toned experience. Pick how it looks.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => selectTheme("dark")}
                  aria-pressed={themeChoice === "dark"}
                  className={`flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${themeChoice === "dark" ? "border-accent bg-accent-bg/20" : "border-border bg-card/60 hover:border-accent/50"}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/10">
                    <Moon className="h-4 w-4 text-accent" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">Dark</span>
                  <span className="text-xs text-muted-foreground">Always the deep, premium look.</span>
                  {themeChoice === "dark" && <Check className="ml-auto h-4 w-4 text-accent" aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => selectTheme("system")}
                  aria-pressed={themeChoice === "system"}
                  className={`flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${themeChoice === "system" ? "border-accent bg-accent-bg/20" : "border-border bg-card/60 hover:border-accent/50"}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/10">
                    <Monitor className="h-4 w-4 text-accent" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">System</span>
                  <span className="text-xs text-muted-foreground">Follows your device setting.</span>
                  {themeChoice === "system" && <Check className="ml-auto h-4 w-4 text-accent" aria-hidden="true" />}
                </button>
              </div>
              <button type="button" onClick={() => advance()} className="btn-primary mt-6 w-full justify-center">
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Step {step + 1} of {STEP_LABELS.length}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Your weather station</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                SKYSENSE pairs with an ESP32-based personal weather station for live readings from your own
                environment. My Station currently runs in Simulation Mode.
              </p>
              <div className="mt-5 rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-bg/40">
                    <Cpu className="h-4 w-4 text-accent" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Connect my station</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      We'll walk you through preparing and registering your ESP32 station from My Station when
                      you're ready. No hardware needed to start.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => { setDeviceIntent("connect"); advance(); }}
                  className="btn-primary w-full justify-center"
                >
                  <Cpu className="h-4 w-4" aria-hidden="true" />
                  Connect my station
                </button>
                <button
                  type="button"
                  onClick={() => { setDeviceIntent("later"); advance(); }}
                  className="btn-ghost w-full justify-center text-sm"
                >
                  Set up later
                </button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-bg/30">
                <CheckCircle2 className="h-8 w-8 text-accent" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">You're all set</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {location.name}, {location.state ?? location.country} is ready{deviceIntent === "connect" ? ", and your station setup is queued in My Station" : ""}.
                Explore the Weather page, alerts and analytics — and revisit anything later from Settings.
              </p>
              <button type="button" onClick={finish} className="btn-primary mt-6 w-full justify-center">
                Enter SKYSENSE
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-[900] overflow-y-auto bg-background outline-none"
    >
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkySenseMark className="h-9 w-9" />
              <h1 id="onboarding-title" className="text-lg font-bold tracking-[0.25em] text-foreground">SKYSENSE</h1>
            </div>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {STEP_LABELS.slice(0, 6).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${index <= step && step < 6 ? "w-5 bg-accent" : "w-1.5 bg-muted/30"}`}
                />
              ))}
            </div>
          </div>
          {content}
          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            Progress is saved on this device — you can leave and pick up where you left off.
          </p>
          <span aria-live="polite" className="sr-only">
            {announcement}
          </span>
        </div>
      </div>
    </div>
  );
}