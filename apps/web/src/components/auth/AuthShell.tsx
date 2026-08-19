"use client";

import { motion } from "framer-motion";
import { AuthBrand } from "./AuthBrand";
import { AuthVisual } from "./AuthVisual";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-background lg:grid lg:grid-cols-[1.05fr_1fr] lg:overflow-hidden">
      <div className="app-ambient" data-atmosphere="auth" aria-hidden="true" />

      <div className="relative z-10 hidden h-full min-h-screen lg:block">
        <AuthVisual />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col overflow-hidden">
        {/* Soft atmospheric glows behind the form column */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-28 right-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute right-[12%] top-[36%] h-48 w-48 rounded-full bg-sky-400/5 blur-3xl" />
        </div>

        <div className="relative flex justify-center px-6 pt-8 lg:hidden">
          <AuthBrand />
        </div>

        <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>

        <p className="relative pb-6 text-center text-xs text-muted-foreground lg:hidden">
          SKYSENSE · Live Weather Intelligence
        </p>
      </div>
    </div>
  );
}