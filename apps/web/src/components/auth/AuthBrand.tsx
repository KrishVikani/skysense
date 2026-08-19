"use client";

import Link from "next/link";
import { SkySenseMark } from "@/components/brand/SkySenseMark";

interface AuthBrandProps {
  variant?: "default" | "inverse";
  href?: string;
}

export function AuthBrand({ variant = "default", href = "/" }: AuthBrandProps) {
  const inverse = variant === "inverse";

  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      aria-label="SKYSENSE — back to home"
    >
      <span className="relative">
        <span
          aria-hidden="true"
          className={`absolute -inset-1 rounded-xl blur-md opacity-50 transition-opacity duration-300 group-hover:opacity-80 ${
            inverse ? "bg-white/20" : "bg-accent/30"
          }`}
        />
        <SkySenseMark className="relative h-11 w-11" />
      </span>
      <span className="flex flex-col">
        <span
          className={`font-bold leading-none tracking-tight ${inverse ? "text-white" : "text-foreground"}`}
        >
          SKYSENSE
        </span>
        <span
          className={`mt-1.5 text-[10px] font-medium uppercase tracking-[0.22em] ${
            inverse ? "text-sky-100/70" : "text-muted-foreground"
          }`}
        >
          Live Weather Intelligence
        </span>
      </span>
    </Link>
  );
}