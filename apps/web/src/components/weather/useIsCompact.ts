"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is small (phones / small tablets). Atmospheric layers
 * use this to reduce particle density and drop decorative layers on mobile so
 * the experience stays light — see the visual components that consume it.
 */
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return compact;
}