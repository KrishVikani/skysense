"use client";

import { useEffect, useState } from "react";

/**
 * True while the browser tab is hidden (backgrounded / covered). Atmospheric
 * layers use this to pause CSS particle/glow animation so no work happens
 * while the page is invisible — see `.atmosphere-paused` in globals.css.
 */
export function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return hidden;
}