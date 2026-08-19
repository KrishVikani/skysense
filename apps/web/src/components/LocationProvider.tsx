"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSettings } from "./SettingsProvider";
import { useAuth } from "./AuthProvider";
import {
  loadSelectedLocation,
  saveSelectedLocation,
  type WeatherLocation,
} from "@/lib/weather/locations";
import type { UserSettings } from "@/lib/settings/types";

export interface LocationContextValue {
  location: WeatherLocation;
  setLocation: (_next: WeatherLocation, _opts?: { syncSettings?: boolean }) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

/**
 * Compact label used by the header location chip, e.g. "Keshod Taluka, Gujarat".
 * Deliberately state-first (not country-first) so the collapsed header reads
 * naturally on narrow widths.
 */
export function compactLocationLabel(location: WeatherLocation): string {
  return location.state ? `${location.name}, ${location.state}` : `${location.name}, ${location.country}`;
}

/** Maps the authoritative weather location into the settings.location schema (a label preference). */
export function weatherLocationToSettings(
  location: WeatherLocation,
  timezone: string
): UserSettings["location"] {
  return {
    city: location.name,
    country: location.state ?? location.country,
    latitude: location.lat,
    longitude: location.lon,
    timezone,
  };
}

/**
 * Single authoritative source for the user's location.
 *
 * The Weather page selection drives this context; the header location chip and
 * the Settings "location" label read the same value, so they can never show
 * different cities again. Writes go to the weather localStorage key and are
 * mirrored into the account/local settings once per signed-in session (legacy
 * accounts whose settings and weather selections diverged are reconciled).
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { settings, loaded: settingsLoaded, save } = useSettings();
  const [location, setState] = useState<WeatherLocation>(() => loadSelectedLocation());
  const syncedForRef = useRef<string | null>(null);

  // Reconcile a legacy account/local settings location against the persisted
  // weather selection exactly once per signed-in session.
  useEffect(() => {
    if (!uid || !settingsLoaded) return;
    if (syncedForRef.current === uid) return;
    syncedForRef.current = uid;
    const s = settings.location;
    if (s.latitude === location.lat && s.longitude === location.lon) return;
    void save({
      ...settings,
      location: weatherLocationToSettings(location, s.timezone),
    });
  }, [uid, settingsLoaded, settings, location, save]);

  const setLocation = useCallback(
    (next: WeatherLocation, opts?: { syncSettings?: boolean }) => {
      saveSelectedLocation(next);
      setState(next);
      syncedForRef.current = uid;
      if (!uid) return;
      if (opts?.syncSettings === false) return;
      void save({
        ...settings,
        location: weatherLocationToSettings(next, settings.location.timezone),
      });
    },
    [uid, settings, save]
  );

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}