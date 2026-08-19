"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SkySenseMark } from "@/components/brand/SkySenseMark";

const SHOW_MS = 1400;
const REDUCED_SHOW_MS = 120;

/**
 * Brief brand splash shown on the first paint of a full page load.
 *
 * It is aria-hidden (decorative), never blocks interaction (pointer-events
 * none) and respects prefers-reduced-motion by collapsing to a near-instant
 * fade. It renders once per hard load because it lives in the root layout.
 */
export function StartupSplash() {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), reducedMotion ? REDUCED_SHOW_MS : SHOW_MS);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[999] flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.45 }}
          aria-hidden="true"
        >
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <SkySenseMark className="h-14 w-14" />
            <p className="text-xl font-bold tracking-[0.35em] text-foreground">SKYSENSE</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}