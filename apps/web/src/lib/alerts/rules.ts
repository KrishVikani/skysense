import type {
  AlertMetric,
  AlertRule,
  AlertSettings,
  AlertSeverity,
  AlertThresholdPreference,
  AlertThresholdPreferences,
  AlertThresholdSetting,
} from "./types";

/**
 * Alertable metrics that users can configure. `stability` and the
 * rapid-change rule are derived from AI analysis and are not user-configurable.
 */
export const METRIC_SETTING_KEYS = [
  "temperature",
  "humidity",
  "windSpeed",
  "uvIndex",
  "airQuality",
] as const;

export type MetricSettingKey = (typeof METRIC_SETTING_KEYS)[number];

export const METRIC_LABELS: Record<AlertMetric, string> = {
  temperature: "Temperature",
  humidity: "Humidity",
  windSpeed: "Wind Speed",
  uvIndex: "UV Index",
  airQuality: "Air Quality",
  pressure: "Pressure",
  rainfall: "Rainfall",
  stability: "Atmospheric Stability",
};

export const METRIC_UNITS: Record<AlertMetric, string> = {
  temperature: "°C",
  humidity: "%",
  windSpeed: "km/h",
  uvIndex: "",
  airQuality: " AQI",
  pressure: " hPa",
  rainfall: " mm",
  stability: "/100",
};

export function isSettingMetric(metric: AlertMetric): metric is MetricSettingKey {
  return (METRIC_SETTING_KEYS as readonly string[]).includes(metric);
}

/**
 * Centralized alert thresholds. No magic numbers live in components or the
 * alert service — every threshold, severity and message originates here.
 *
 * FUTURE HARDWARE:
 * When ESP32 sensor values replace the simulated data, only the DATA SOURCE
 * changes. These rules (which compare against already-normalized metric
 * values) remain valid for: ESP32_TEMPERATURE_SENSOR, ESP32_HUMIDITY_SENSOR,
 * ESP32_WIND_SENSOR, ESP32_UV_SENSOR, ESP32_AIR_QUALITY_SENSOR.
 */
export const DEFAULT_RULES: AlertRule[] = [
  {
    id: "temperature_warning",
    metric: "temperature",
    name: "High Temperature",
    threshold: 33,
    unit: "°C",
    direction: "above",
    severity: "warning",
    message: "Temperature has exceeded the safety threshold.",
    recommendation: "Stay hydrated and limit strenuous outdoor activity during the hottest hours.",
    enabled: true,
  },
  {
    id: "temperature_critical",
    metric: "temperature",
    name: "Extreme Temperature",
    threshold: 36,
    unit: "°C",
    direction: "above",
    severity: "critical",
    message: "Temperature has reached extreme heat levels.",
    recommendation: "Avoid prolonged outdoor exposure, increase hydration, and check on vulnerable individuals.",
    enabled: true,
  },
  {
    id: "humidity_warning",
    metric: "humidity",
    name: "High Humidity",
    threshold: 65,
    unit: "%",
    direction: "above",
    severity: "warning",
    message: "Humidity has exceeded the comfort threshold.",
    recommendation: "Use ventilation or dehumidification indoors and stay well hydrated.",
    enabled: true,
  },
  {
    id: "humidity_critical",
    metric: "humidity",
    name: "Extreme Humidity",
    threshold: 78,
    unit: "%",
    direction: "above",
    severity: "critical",
    message: "Humidity has reached extreme muggy levels.",
    recommendation: "Remain in ventilated or air-conditioned spaces and hydrate frequently.",
    enabled: true,
  },
  {
    id: "wind_warning",
    metric: "windSpeed",
    name: "Strong Wind",
    threshold: 22,
    unit: "km/h",
    direction: "above",
    severity: "warning",
    message: "Wind speed has exceeded the caution threshold.",
    recommendation: "Secure loose outdoor items and exercise caution with high-profile vehicles.",
    enabled: true,
  },
  {
    id: "wind_critical",
    metric: "windSpeed",
    name: "Extreme Wind",
    threshold: 30,
    unit: "km/h",
    direction: "above",
    severity: "critical",
    message: "Wind speed has reached hazardous levels.",
    recommendation: "Avoid unnecessary travel and secure all outdoor objects.",
    enabled: true,
  },
  {
    id: "uv_warning",
    metric: "uvIndex",
    name: "High UV Exposure",
    threshold: 6,
    unit: "",
    direction: "above",
    severity: "warning",
    message: "UV index has exceeded the exposure threshold.",
    recommendation: "Use sunscreen and a hat during midday hours.",
    enabled: true,
  },
  {
    id: "uv_critical",
    metric: "uvIndex",
    name: "Extreme UV Exposure",
    threshold: 8,
    unit: "",
    direction: "above",
    severity: "critical",
    message: "UV index has reached very high exposure levels.",
    recommendation: "Limit prolonged outdoor exposure during peak sunlight hours.",
    enabled: true,
  },
  {
    id: "airquality_warning",
    metric: "airQuality",
    name: "Poor Air Quality",
    threshold: 80,
    unit: " AQI",
    direction: "above",
    severity: "warning",
    message: "Air quality index has exceeded the caution threshold.",
    recommendation: "Monitor air quality; sensitive groups should reduce outdoor exertion.",
    enabled: true,
  },
  {
    id: "airquality_critical",
    metric: "airQuality",
    name: "Unhealthy Air Quality",
    threshold: 120,
    unit: " AQI",
    direction: "above",
    severity: "critical",
    message: "Air quality index has reached unhealthy levels.",
    recommendation: "Avoid prolonged outdoor exertion and keep windows closed.",
    enabled: true,
  },
  {
    id: "instability_warning",
    metric: "stability",
    name: "Weather Instability",
    threshold: 45,
    unit: "/100",
    direction: "above",
    severity: "warning",
    message: "Atmospheric instability is increasing.",
    recommendation: "Check forecasts before planning outdoor activity.",
    enabled: true,
  },
  {
    id: "instability_critical",
    metric: "stability",
    name: "Severe Weather Instability",
    threshold: 70,
    unit: "/100",
    direction: "above",
    severity: "critical",
    message: "Atmospheric instability has reached severe levels.",
    recommendation: "Avoid outdoor plans and monitor weather updates closely.",
    enabled: true,
  },
  {
    id: "rapid_change",
    metric: "stability",
    name: "Rapid Environmental Change",
    threshold: 1,
    unit: "",
    direction: "above",
    severity: "info",
    message: "One or more environmental metrics are fluctuating rapidly.",
    recommendation: "Stay updated — conditions are shifting quickly.",
    enabled: true,
  },
];

const DEFAULT_RECOMMENDATIONS: Record<MetricSettingKey, string> = {
  temperature: "Review heat exposure and plan outdoor activity for cooler hours.",
  humidity: "Monitor comfort levels and adjust indoor ventilation.",
  windSpeed: "Check wind exposure before outdoor plans.",
  uvIndex: "Apply sun protection when outdoors.",
  airQuality: "Limit outdoor exertion if conditions persist.",
};

const DEFAULT_DIRECTION = "above" as const;

/** The settings that match the out-of-the-box warning rules. */
export function createDefaultSettings(): AlertSettings {
  const make = (metric: MetricSettingKey, label: string, unit: string): AlertThresholdSetting => {
    const warningRule = DEFAULT_RULES.find(
      (r) => r.metric === metric && r.severity === "warning"
    );
    return {
      metric,
      label,
      unit,
      enabled: true,
      threshold: warningRule?.threshold ?? 0,
      severity: "warning",
    };
  };

  return {
    temperature: make("temperature", "Temperature", "°C"),
    humidity: make("humidity", "Humidity", "%"),
    windSpeed: make("windSpeed", "Wind Speed", "km/h"),
    uvIndex: make("uvIndex", "UV Index", ""),
    airQuality: make("airQuality", "Air Quality", " AQI"),
  };
}

function ruleFromSetting(setting: AlertThresholdSetting): AlertRule {
  return {
    id: `${setting.metric}_custom`,
    metric: setting.metric,
    name: `Custom ${setting.label}`,
    threshold: setting.threshold,
    unit: setting.unit,
    direction: DEFAULT_DIRECTION,
    severity: setting.severity,
    message: `${setting.label} exceeded the configured threshold.`,
    recommendation: DEFAULT_RECOMMENDATIONS[setting.metric],
    enabled: true,
  };
}

function settingsEqual(a: AlertThresholdSetting, b: AlertThresholdSetting): boolean {
  return a.enabled === b.enabled && a.threshold === b.threshold && a.severity === b.severity;
}

/**
 * Defaults for the rich threshold preferences, seeded from DEFAULT_RULES so a
 * freshly created preference set produces EXACTLY the default rule set.
 */
export function createDefaultPreferences(): AlertThresholdPreferences {
  const make = (metric: MetricSettingKey): AlertThresholdPreference => {
    const warning = DEFAULT_RULES.find((r) => r.metric === metric && r.severity === "warning");
    const critical = DEFAULT_RULES.find((r) => r.metric === metric && r.severity === "critical");
    return {
      enabled: true,
      warningThreshold: warning?.threshold ?? null,
      criticalThreshold: critical?.threshold ?? null,
    };
  };
  return {
    temperature: make("temperature"),
    humidity: make("humidity"),
    windSpeed: make("windSpeed"),
    uvIndex: make("uvIndex"),
    airQuality: make("airQuality"),
  };
}

function ruleFromThresholdLevel(
  metric: MetricSettingKey,
  severity: AlertSeverity,
  threshold: number,
  unit: string
): AlertRule {
  const label = METRIC_LABELS[metric];
  return {
    id: `${metric}_${severity}_custom`,
    metric,
    name: severity === "critical" ? `Critical ${label}` : `High ${label}`,
    threshold,
    unit,
    direction: DEFAULT_DIRECTION,
    severity,
    message:
      severity === "critical"
        ? `${label} has reached a critical level for the configured threshold.`
        : `${label} has exceeded the configured threshold.`,
    recommendation: DEFAULT_RECOMMENDATIONS[metric],
    enabled: true,
  };
}

/**
 * Builds effective rules from rich {@link AlertThresholdPreferences}. A
 * threshold equal to (or null for) the DEFAULT_RULES value emits that default
 * rule verbatim — so defaults are byte-identical to the stock rule set — and a
 * custom value emits a single rule with the matching severity. Both the warning
 * and critical threshold of a metric can be tuned independently without
 * changing how severity ranking works at evaluation time.
 */
export function buildRulesFromPreferences(
  preferences: AlertThresholdPreferences
): AlertRule[] {
  const rules: AlertRule[] = [];

  for (const rule of DEFAULT_RULES) {
    if (isSettingMetric(rule.metric)) {
      const pref = preferences[rule.metric];
      if (!pref.enabled) continue;
      if (rule.severity === "warning") {
        const custom = pref.warningThreshold;
        rules.push(
          custom == null || custom === rule.threshold
            ? rule
            : ruleFromThresholdLevel(rule.metric, "warning", custom, rule.unit)
        );
      } else if (rule.severity === "critical") {
        const custom = pref.criticalThreshold;
        rules.push(
          custom == null || custom === rule.threshold
            ? rule
            : ruleFromThresholdLevel(rule.metric, "critical", custom, rule.unit)
        );
      } else {
        rules.push(rule);
      }
    } else {
      rules.push(rule);
    }
  }

  return rules;
}

/**
 * Builds the effective rule set for the given user settings. Customizing a
 * metric (threshold or severity) collapses its warning/critical pair into a
 * single rule so the user's intent is honored exactly. Disabling a metric
 * removes all of its rules.
 */
export function buildRules(settings: AlertSettings): AlertRule[] {
  const defaults = createDefaultSettings();
  const rules: AlertRule[] = [];

  for (const rule of DEFAULT_RULES) {
    if (isSettingMetric(rule.metric)) {
      const setting = settings[rule.metric];
      const defaultSetting = defaults[rule.metric];
      if (!setting.enabled) {
        continue;
      }
      if (!settingsEqual(setting, defaultSetting)) {
        if (rules.some((r) => r.metric === rule.metric)) {
          continue;
        }
        rules.push(ruleFromSetting(setting));
        continue;
      }
      rules.push(rule);
    } else {
      rules.push(rule);
    }
  }

  return rules;
}
