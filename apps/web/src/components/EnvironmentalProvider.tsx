"use client";

import { useEffect } from "react";
import { initializeEnvironmentalProvider } from "@/lib/environmental/provider";

export function EnvironmentalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeEnvironmentalProvider();
  }, []);

  return <>{children}</>;
}