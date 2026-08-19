"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings/types";
import { getSettings, mergeSettings, persistSettings, resetSettings } from "@/lib/settings/service";
import type { SaveSettingsResult } from "@/lib/settings/service";
import { localSettingsKey } from "@/lib/settings/storage";

export interface SettingsContextValue {
  settings: UserSettings;
  loaded: boolean;
  source: "account" | "local" | "defaults";
  error: string | null;
  lastSavedAt: string | null;
  lastSavedLocally: boolean;
  save: (_next: UserSettings) => Promise<SaveSettingsResult>;
  reset: () => Promise<SaveSettingsResult>;
  clearLocal: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [settings, setSettings] = useState<UserSettings>(() => JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<SettingsContextValue["source"]>("defaults");
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastSavedLocally, setLastSavedLocally] = useState(false);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
      setLoaded(true);
      setSource("defaults");
      setError(null);
      return;
    }

    let cancelled = false;
    uidRef.current = uid;
    setLoaded(false);
    setError(null);

    getSettings(uid)
      .then((result) => {
        if (cancelled || uidRef.current !== uid) return;
        setSettings(result.settings);
        setSource(result.source);
      })
      .catch((err) => {
        if (cancelled || uidRef.current !== uid) return;
        console.error("Failed to load settings:", err);
        setError("Could not load your settings. Showing defaults.");
      })
      .finally(() => {
        if (cancelled || uidRef.current !== uid) return;
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const save = useCallback(
    async (next: UserSettings): Promise<SaveSettingsResult> => {
      if (!uid) {
        return { ok: false, errors: { _root: "You must be signed in to save settings." } };
      }
      const merged = mergeSettings(next);
      const result = await persistSettings(uid, merged);
      if (result.ok) {
        setSettings(merged);
        setLastSavedAt(result.savedAt ?? new Date().toISOString());
        setLastSavedLocally(!!result.savedLocally);
        setError(null);
      }
      return result;
    },
    [uid]
  );

  const reset = useCallback(async (): Promise<SaveSettingsResult> => {
    if (!uid) {
      return { ok: false, errors: { _root: "You must be signed in to save settings." } };
    }
    const result = await resetSettings(uid);
    if (result.ok) {
      setSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
      setLastSavedAt(result.savedAt ?? new Date().toISOString());
      setLastSavedLocally(!!result.savedLocally);
      setError(null);
    }
    return result;
  }, [uid]);

  const clearLocal = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem("theme");
      window.localStorage.removeItem("skysense.alerts.settings");
      if (uid) window.localStorage.removeItem(localSettingsKey(uid));
    } catch {
      // Best-effort cleanup.
    }
  }, [uid]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loaded,
        source,
        error,
        lastSavedAt,
        lastSavedLocally,
        save,
        reset,
        clearLocal,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}