export const colors = {
  light: {
    background: "#f8fafc",
    foreground: "#0f172a",
    card: "#ffffff",
    cardHover: "#f1f5f9",
    border: "#e2e8f0",
    borderHover: "#cbd5e1",
    primary: "#0f172a",
    secondary: "#334155",
    muted: "#64748b",
    mutedForeground: "#94a3b8",
    success: "#059669",
    successBg: "#d1fae5",
    warning: "#d97706",
    warningBg: "#fef3c7",
    danger: "#dc2626",
    dangerBg: "#fee2e2",
    info: "#0284c7",
    infoBg: "#e0f2fe",
    accent: "#0d9488",
    accentHover: "#0f766e",
    accentBg: "#ccfbf1",
    accentForeground: "#ffffff",
    sun: "#f59e0b",
    sunBg: "#fef3c7",
    sky: "#0ea5e9",
    skyBg: "#e0f2fe",
    earth: "#84cc16",
    earthBg: "#f0fdf4",
    overlay: "rgba(15, 23, 42, 0.5)",
    focus: "#0d9488",
  },
  dark: {
    background: "#0a0f1a",
    foreground: "#f1f5f9",
    card: "#111827",
    cardHover: "#1f2937",
    border: "#1e293b",
    borderHover: "#334155",
    primary: "#f1f5f9",
    secondary: "#cbd5e1",
    muted: "#64748b",
    mutedForeground: "#94a3b8",
    success: "#10b981",
    successBg: "#064e3b",
    warning: "#f59e0b",
    warningBg: "#78350f",
    danger: "#ef4444",
    dangerBg: "#7f1d1d",
    info: "#38bdf8",
    infoBg: "#0c4a6e",
    accent: "#14b8a6",
    accentHover: "#0d9488",
    accentBg: "#134e4a",
    accentForeground: "#ffffff",
    sun: "#fbbf24",
    sunBg: "#78350f",
    sky: "#38bdf8",
    skyBg: "#0c4a6e",
    earth: "#a3e635",
    earthBg: "#365314",
    overlay: "rgba(0, 0, 0, 0.7)",
    focus: "#14b8a6",
  },
};

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
};

export const borderRadius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.5rem",
  full: "9999px",
};

export const typography = {
  fontFamily: {
    display: '"Geist", "Inter", system-ui, sans-serif',
    body: '"Geist", "Inter", system-ui, sans-serif',
    mono: '"Geist Mono", "Fira Code", monospace',
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
    "7xl": "4.5rem",
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.1,
    normal: 1.5,
    relaxed: 1.625,
  },
};

export const shadows = {
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.03)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.07)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.07), 0 8px 10px -6px rgb(0 0 0 / 0.07)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.15)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  glow: "0 0 20px rgba(13, 148, 136, 0.15)",
  glowStrong: "0 0 40px rgba(13, 148, 136, 0.25)",
};

export const transitions = {
  fast: "120ms ease-out",
  normal: "200ms ease-out",
  slow: "300ms ease-out",
  spring: "400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

export const zIndex = {
  dropdown: 100,
  sticky: 200,
  modal: 300,
  toast: 400,
  tooltip: 500,
  sidebar: 600,
};

export const aqiColors = {
  Good: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0", icon: "#10b981" },
  Moderate: { bg: "#fef3c7", text: "#92400e", border: "#fde68a", icon: "#f59e0b" },
  Poor: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca", icon: "#ef4444" },
  Hazardous: { bg: "#fecaca", text: "#7f1d1d", border: "#fca5a5", icon: "#dc2626" },
};

export const uvColors = {
  low: { bg: "#d1fae5", text: "#065f46", icon: "#10b981" },
  moderate: { bg: "#fef3c7", text: "#92400e", icon: "#f59e0b" },
  high: { bg: "#ffedd5", text: "#c2410c", icon: "#f97316" },
  veryHigh: { bg: "#fee2e2", text: "#991b1b", icon: "#ef4444" },
  extreme: { bg: "#fecaca", text: "#7f1d1d", icon: "#dc2626" },
};

export const weatherIcons = {
  Sunny: "☀️",
  "Partly Cloudy": "⛅",
  Cloudy: "☁️",
  Rain: "🌧️",
  Thunderstorms: "⛈️",
  Snow: "❄️",
  Fog: "🌫️",
  Windy: "💨",
};

export type ColorTheme = keyof typeof colors;
export type ColorScale = keyof typeof colors.light;

export function getColor(theme: ColorTheme, scale: ColorScale): string {
  return colors[theme][scale];
}

export function getAQIColor(category: keyof typeof aqiColors) {
  return aqiColors[category];
}

export function getUVColor(index: number) {
  if (index <= 2) return uvColors.low;
  if (index <= 5) return uvColors.moderate;
  if (index <= 7) return uvColors.high;
  if (index <= 10) return uvColors.veryHigh;
  return uvColors.extreme;
}

export function getWeatherIcon(condition: string) {
  return weatherIcons[condition as keyof typeof weatherIcons] || "🌤️";
}