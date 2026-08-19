"use client";

import { AuthBrand } from "./AuthBrand";

export function AuthLoader() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      </div>
      <AuthBrand />
      <div className="relative flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="spinner text-accent" aria-hidden="true" />
        Checking your session…
      </div>
    </div>
  );
}
