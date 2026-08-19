"use client";

import type { FC, ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon | ReactNode;
  action?: ReactNode;
  className?: string;
  illustration?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = "",
  illustration,
}) => {
  const iconContent = (() => {
    if (!icon) return null;
    if (typeof icon === "object" && "type" in icon) return icon;
    if (typeof icon === "function") {
      const IconComponent = icon;
      return <IconComponent aria-hidden="true" />;
    }
    return <span>{icon}</span>;
  })();

  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl bg-card border border-border ${className}`}
      role="status"
      aria-live="polite"
    >
      {illustration ? (
        <div className="mb-6 text-muted">{illustration}</div>
      ) : icon ? (
        <div className="mb-6 text-muted" style={{ fontSize: "3rem" }}>
          {iconContent}
        </div>
      ) : null}
      <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
      {description && (
        <p className="text-muted max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <div className="mt-2">{action}</div>
      )}
    </div>
  );
};

export const EmptyStateCard: FC<{
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}> = ({ title, description, icon, action, className = "" }) => (
  <div className={`rounded-2xl bg-card p-8 shadow-sm border border-border ${className}`}>
    <EmptyState title={title} description={description} icon={icon} action={action} />
  </div>
);

export type { EmptyStateProps };