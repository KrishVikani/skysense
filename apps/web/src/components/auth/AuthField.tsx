"use client";

import { useId, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

interface AuthFieldProps {
  id?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (_value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string | null;
  icon?: React.ReactNode;
  toggleable?: boolean;
}

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  error,
  icon,
  toggleable,
}: AuthFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [show, setShow] = useState(false);
  const inputType = toggleable && show ? "text" : type;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="group relative">
        {icon && (
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-accent"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <input
          id={fieldId}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={`input-premium ${icon ? "pl-11" : ""} ${toggleable ? "pr-11" : ""} ${
            error ? "input-error" : ""
          }`}
        />
        {toggleable && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}