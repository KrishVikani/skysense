import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  id?: string;
}

/**
 * Shared section header for the Weather and My Station experiences. Both
 * product areas use the same title/subtitle/icon treatment so the two pages
 * share one visual language while keeping their own layouts.
 */
export function SectionHeader({ title, subtitle, icon, id }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {icon && (
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {subtitle && <p className="section-subtitle mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}