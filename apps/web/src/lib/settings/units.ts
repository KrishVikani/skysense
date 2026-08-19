import type { DeviceSnapshot, SensorInfo } from "@/lib/devices/types";
import type {
  PrecipitationUnit,
  PressureUnit,
  TemperatureUnit,
  UnitsPreference,
  WindUnit,
} from "./types";

/**
 * Unit conversion for PRESENTATION only. Canonical sensor values stay in
 * metric units everywhere in the data layer (temperature °C, wind km/h,
 * pressure hPa, precipitation mm); this module converts values and labels at
 * the UI boundary so stored readings are never corrupted.
 */

const KMH_TO_MS = 1 / 3.6;
const KMH_TO_MPH = 1 / 1.609344;
const HPA_TO_INHG = 0.0295299830714;
const MM_TO_INCH = 1 / 25.4;

export function convertTemperature(valueCelsius: number, to: TemperatureUnit): number {
  return to === "f" ? valueCelsius * 9 / 5 + 32 : valueCelsius;
}

export function convertWind(valueKmh: number, to: WindUnit): number {
  switch (to) {
    case "ms":
      return valueKmh * KMH_TO_MS;
    case "mph":
      return valueKmh * KMH_TO_MPH;
    default:
      return valueKmh;
  }
}

export function convertPressure(valueHpa: number, to: PressureUnit): number {
  return to === "inhg" ? valueHpa * HPA_TO_INHG : valueHpa;
}

export function convertPrecipitation(valueMm: number, to: PrecipitationUnit): number {
  return to === "in" ? valueMm * MM_TO_INCH : valueMm;
}

export function temperatureLabel(to: TemperatureUnit): string {
  return to === "f" ? "°F" : "°C";
}

export function windLabel(to: WindUnit): string {
  return to === "ms" ? "m/s" : to === "mph" ? "mph" : "km/h";
}

export function pressureLabel(to: PressureUnit): string {
  return to === "inhg" ? "inHg" : "hPa";
}

export function precipitationLabel(to: PrecipitationUnit): string {
  return to === "in" ? "in" : "mm";
}

const CANONICAL_UNITS: UnitsPreference = {
  temperature: "c",
  wind: "kmh",
  pressure: "hpa",
  precipitation: "mm",
};

/** Full unit preference where a partial object uses canonical defaults. */
export function resolveUnits(units: Partial<UnitsPreference> | undefined): UnitsPreference {
  return { ...CANONICAL_UNITS, ...units };
}

/** Converts one sensor's display value/label for the given units. */
export function convertSensorForDisplay(sensor: SensorInfo, units: UnitsPreference): SensorInfo {
  if (sensor.value === null) return sensor;

  let value = sensor.value;
  let unit = sensor.unit;
  let valueLabel = sensor.valueLabel;

  switch (sensor.key) {
    case "temperature": {
      value = convertTemperature(sensor.value, units.temperature);
      unit = temperatureLabel(units.temperature);
      valueLabel = `${value.toFixed(1)}${unit}`;
      break;
    }
    case "windSpeed": {
      value = convertWind(sensor.value, units.wind);
      unit = windLabel(units.wind);
      const digits = units.wind === "ms" ? 1 : 1;
      valueLabel = `${value.toFixed(digits)} ${unit}`;
      break;
    }
    case "pressure": {
      value = convertPressure(sensor.value, units.pressure);
      unit = pressureLabel(units.pressure);
      valueLabel = `${value.toFixed(1)} ${unit}`;
      break;
    }
    case "rainfall": {
      value = convertPrecipitation(sensor.value, units.precipitation);
      unit = precipitationLabel(units.precipitation);
      const digits = units.precipitation === "in" ? 2 : 1;
      valueLabel = `${value.toFixed(digits)} ${unit}`;
      break;
    }
    default:
      return sensor;
  }

  return { ...sensor, value, unit, valueLabel };
}

/** Returns a new snapshot whose sensor display values/labels honor the units. */
export function withDisplayUnits(
  snapshot: DeviceSnapshot,
  units: UnitsPreference | undefined
): DeviceSnapshot {
  const resolved = resolveUnits(units);
  if (
    resolved.temperature === "c" &&
    resolved.wind === "kmh" &&
    resolved.pressure === "hpa" &&
    resolved.precipitation === "mm"
  ) {
    return snapshot;
  }
  return {
    ...snapshot,
    sensors: snapshot.sensors.map((s) => convertSensorForDisplay(s, resolved)),
  };
}
