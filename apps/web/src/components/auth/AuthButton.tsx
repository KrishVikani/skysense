"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
}

export function AuthButton({
  loading,
  loadingText,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: AuthButtonProps) {
  return (
    <button
      className={`btn-primary w-full py-3 ${loading ? "opacity-90" : ""} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}