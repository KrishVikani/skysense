"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Loader2, LocateFixed, MapPin, Search, SearchX, Trash2, X } from "lucide-react";
import { reverseGeocodeLocation, searchWeatherLocations } from "@/lib/weather/openweatherClient";
import {
  addRecentLocation,
  clearRecentLocations,
  loadRecentLocations,
  locationDisplayName,
  removeRecentLocation,
  type GeocodeResult,
  type WeatherLocation,
} from "@/lib/weather/locations";

interface LocationSearchProps {
  location: WeatherLocation;
  onSelect: (_location: WeatherLocation) => void;
}

/** Selectable entry in the dropdown, used to drive keyboard navigation. */
type SearchOption =
  | { kind: "result"; result: GeocodeResult }
  | { kind: "current" }
  | { kind: "recent"; item: WeatherLocation };

/**
 * Premium location search for the Weather page.
 *
 * Searches cities via the server-side Geocoding route (OpenWeather), offers
 * recent locations, and can use the browser's position — but geolocation is
 * only requested when the user explicitly presses "Use my location". In demo
 * mode (no API key) a clear notice explains that search needs a key while the
 * page keeps running on simulated data.
 *
 * Keyboard support: ArrowUp/ArrowDown move through the options, Enter selects
 * the highlighted option, Escape closes the list. The input announces the
 * active option via `aria-activedescendant`.
 */
export function LocationSearch({ location, onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [configured, setConfigured] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [recent, setRecent] = useState<WeatherLocation[]>(() => loadRecentLocations());
  const [justSelected, setJustSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (selectedTimerRef.current) clearTimeout(selectedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setGeoError(null);
    const timer = setTimeout(async () => {
      const result = await searchWeatherLocations(trimmed);
      setConfigured(result.configured);
      setResults(result.results);
      setSearchError(result.error?.userMessage ?? null);
      setSearching(false);
      setActiveIndex(-1);
      setOpen(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const select = (result: GeocodeResult) => {
    selectLocation({
      name: result.name,
      state: result.state,
      country: result.country,
      lat: result.lat,
      lon: result.lon,
    });
  };

  const selectLocation = (next: WeatherLocation) => {
    setRecent(addRecentLocation(next));
    onSelect(next);
    setQuery("");
    setActiveIndex(-1);
    setOpen(false);
    inputRef.current?.blur();
    setJustSelected(true);
    if (selectedTimerRef.current) clearTimeout(selectedTimerRef.current);
    selectedTimerRef.current = setTimeout(() => setJustSelected(false), 650);
  };

  const removeRecent = (item: WeatherLocation) => {
    setRecent(removeRecentLocation(item));
    if (activeIndex > 0) setActiveIndex(-1);
  };

  const clearAllRecent = () => {
    setRecent(clearRecentLocations());
    setActiveIndex(-1);
  };

  const useMyLocation = () => {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Location access is not supported by this browser.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const located = await reverseGeocodeLocation(position.coords.latitude, position.coords.longitude);
        setGeoBusy(false);
        if (located) {
          selectLocation(located);
        } else {
          setGeoError("Could not resolve your position. Try a city search instead.");
        }
      },
      () => {
        setGeoBusy(false);
        setGeoError("Location permission was not granted. Try a city search instead.");
      },
      { timeout: 10_000 }
    );
  };

  const trimmed = query.trim();
  const showLocationOverlay = trimmed === "" && !open;

  /** Flattened keyboard-navigable options (results, or current + recents). */
  const options: SearchOption[] = trimmed
    ? results.map((result) => ({ kind: "result", result }) satisfies SearchOption)
    : [
        { kind: "current" } satisfies SearchOption,
        ...recent.map((item) => ({ kind: "recent", item }) satisfies SearchOption),
      ];

  const activeOptionId = `location-option-${activeIndex}`;

  /** Brings the highlighted option into view inside the scrollable list. */
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, activeOptionId]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length === 0) return;
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((current) => {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        return (current + delta + options.length) % options.length;
      });
      return;
    }
    if (event.key === "Enter") {
      if (open && activeIndex >= 0 && options[activeIndex]) {
        event.preventDefault();
        const option = options[activeIndex];
        if (option.kind === "result") select(option.result);
        else if (option.kind === "recent") selectLocation(option.item);
        else setOpen(false);
      }
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <div
        className={`glass group flex h-12 items-center gap-2.5 rounded-2xl px-4 transition-all duration-300 focus-within:ring-2 focus-within:ring-accent/70 focus-within:shadow-[0_0_0_4px_rgba(20,184,166,0.12)] ${
          justSelected ? "ring-2 ring-accent/60" : ""
        }`}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-accent" aria-hidden="true" />
        <div className="relative w-full min-w-0 flex-1 self-stretch">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={showLocationOverlay ? "" : "Search for a city or area…"}
            aria-label="Search location"
            aria-expanded={open}
            aria-controls="location-search-list"
            aria-activedescendant={open && activeIndex >= 0 ? activeOptionId : undefined}
            role="combobox"
            autoComplete="off"
            className="h-full w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {showLocationOverlay && (
            <button
              type="button"
              onClick={() => {
                inputRef.current?.focus();
                setOpen(true);
              }}
              className="absolute inset-y-0 left-0 right-0 flex items-center gap-1.5 text-left text-[15px] text-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
              aria-label={`Current location: ${locationDisplayName(location)}. Open location search.`}
            >
              <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="truncate">{locationDisplayName(location)}</span>
            </button>
          )}
        </div>
        <AnimatePresence>{searching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />}</AnimatePresence>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoBusy}
          className="btn-ghost h-8 shrink-0 px-3 text-xs"
          aria-label="Use my current location"
        >
          {geoBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}
          <span className="hidden sm:inline">My location</span>
        </button>
      </div>

      {geoError && <p className="mt-1.5 text-xs text-warning">{geoError}</p>}

      <AnimatePresence>
        {open && (results.length > 0 || recent.length > 0 || (trimmed ? !searching : true)) && (
          <motion.div
            id="location-search-list"
            className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            role="listbox"
            aria-label="Location results"
          >
            {trimmed && !configured && (
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">Location search needs an API key</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Set <code className="rounded bg-muted/10 px-1 py-0.5">OPENWEATHER_API_KEY</code> to enable city
                  search. The app is running in demo mode on simulated data.
                </p>
              </div>
            )}

            {trimmed && searchError && (
              <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground" role="status" aria-live="polite">
                {searchError}
              </div>
            )}

            {trimmed && configured && results.length === 0 && !searching && !searchError && (
              <div className="px-4 py-3.5 text-sm text-muted-foreground" role="status" aria-live="polite">
                <p className="flex items-center gap-2">
                  <SearchX className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                  No places found for “{trimmed}”.
                </p>
                <p className="mt-1 pl-6 text-xs">Check the spelling or try a broader area, like a country name.</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="max-h-72 overflow-y-auto py-1">
                {results.map((result, index) => {
                  const active = activeIndex === index;
                  return (
                    <button
                      key={`${result.name}-${result.state ?? ""}-${result.country}-${result.lat}-${result.lon}`}
                      id={`location-option-${index}`}
                      type="button"
                      onClick={() => select(result)}
                      onFocus={() => setActiveIndex(index)}
                      className={`relative flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-muted/10 focus-visible:bg-muted/10 focus-visible:outline-none ${
                        active ? "bg-muted/10" : ""
                      }`}
                      role="option"
                      aria-selected={active}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-accent" aria-hidden="true" />
                      )}
                      <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <span className="truncate text-foreground">
                        {result.name}
                        {result.state ? `, ${result.state}` : ""}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{result.country}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {!trimmed && (
              <div className="py-1">
                <p className="flex items-center gap-1.5 px-4 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  Current location
                </p>
                <button
                  type="button"
                  id="location-option-0"
                  onClick={() => setOpen(false)}
                  onFocus={() => setActiveIndex(0)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm ${
                    activeIndex === 0 ? "bg-muted/10" : ""
                  }`}
                  role="option"
                  aria-selected={activeIndex === 0}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span className="truncate font-medium text-foreground">{locationDisplayName(location)}</span>
                  <span className="ml-auto text-xs text-accent">Active</span>
                </button>
              </div>
            )}

            {!trimmed && recent.length > 0 && (
              <div className="border-t border-border py-1">
                <div className="flex items-center justify-between px-4 pb-1 pt-2.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <History className="h-3 w-3" aria-hidden="true" />
                    Recent locations
                  </p>
                  <button
                    type="button"
                    onClick={clearAllRecent}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors duration-150 hover:bg-muted/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    aria-label="Clear all recent locations"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    Clear all
                  </button>
                </div>
                {recent.map((item, index) => {
                  const optionIndex = index + 1;
                  const active = activeIndex === optionIndex;
                  return (
                    <div
                      key={`${item.name}-${item.lat}-${item.lon}`}
                      className={`group flex w-full items-center gap-1 px-2 pr-2 transition-colors duration-150 ${
                        active ? "bg-muted/10" : ""
                      }`}
                    >
                      <button
                        type="button"
                        id={`location-option-${optionIndex}`}
                        onClick={() => selectLocation(item)}
                        onFocus={() => setActiveIndex(optionIndex)}
                        className={`flex w-full min-w-0 items-center gap-2.5 py-2.5 pl-2 pr-1 text-left text-sm transition-colors duration-150 hover:bg-muted/5 focus-visible:bg-muted/10 focus-visible:outline-none ${
                          active ? "bg-muted/5" : ""
                        }`}
                        role="option"
                        aria-selected={active}
                      >
                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate text-foreground">{locationDisplayName(item)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecent(item)}
                        aria-label={`Remove ${item.name} from recent locations`}
                        title="Remove from recents"
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 opacity-100 transition-all duration-150 hover:bg-muted/15 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}