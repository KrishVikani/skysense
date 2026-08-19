import type { SensorDefinition, SensorKey } from "./types";

/**
 * Software → hardware mapping for the future SKYSENSE ESP32 station.
 *
 * FUTURE HARDWARE INTEGRATION — SOFTWARE PLACEHOLDERS:
 * The `hardwareComponent` strings below are NOT physical part numbers. They
 * are stable identifiers that a future ESP32 firmware build will map to real
 * sensors once the hardware design is finalized. Do not assume a specific
 * physical sensor model here.
 *
 *   temperature    → ESP32_TEMPERATURE_SENSOR       (°C, number)
 *   humidity       → ESP32_HUMIDITY_SENSOR          (%, number)
 *   pressure       → ESP32_PRESSURE_SENSOR          (hPa, number)
 *   airQuality     → ESP32_AIR_QUALITY_SENSOR       (US AQI, number)
 *   uvIndex        → ESP32_UV_SENSOR                (unitless, number)
 *   rainfall (rain)→ ESP32_RAIN_SENSOR              (mm, number)
 *   windSpeed      → ESP32_WIND_SPEED_SENSOR        (km/h, number)
 *   windDirection  → ESP32_WIND_DIRECTION_SENSOR    (degrees 0–360, number)
 *
 * Valid ranges double as the ingestion validation contract (see validation.ts).
 *
 * EMBEDDED FIRMWARE NOTE:
 * The physical ESP32 GPIO / I2C / SPI / UART wiring for these sensors is
 * defined in the FUTURE embedded firmware project, NOT in this web application.
 * See docs/HARDWARE_INTEGRATION.md for where that configuration will live.
 * This registry only defines the software field → hardware-component mapping,
 * the display metadata and the validation ranges.
 */
export const SENSOR_DEFINITIONS: SensorDefinition[] = [
  {
    key: "temperature",
    label: "Temperature",
    hardwareComponent: "ESP32_TEMPERATURE_SENSOR",
    unit: "°C",
    dataType: "number",
    validRange: { min: -40, max: 60 },
    enabled: true,
    description: "Ambient air temperature in degrees Celsius.",
  },
  {
    key: "humidity",
    label: "Humidity",
    hardwareComponent: "ESP32_HUMIDITY_SENSOR",
    unit: "%",
    dataType: "number",
    validRange: { min: 0, max: 100 },
    enabled: true,
    description: "Relative humidity as a percentage.",
  },
  {
    key: "pressure",
    label: "Atmospheric Pressure",
    hardwareComponent: "ESP32_PRESSURE_SENSOR",
    unit: "hPa",
    dataType: "number",
    validRange: { min: 800, max: 1100 },
    enabled: true,
    description: "Barometric (atmospheric) pressure in hectopascals.",
  },
  {
    key: "airQuality",
    label: "Air Quality",
    hardwareComponent: "ESP32_AIR_QUALITY_SENSOR",
    unit: "AQI",
    dataType: "number",
    validRange: { min: 0, max: 500 },
    enabled: true,
    description: "US EPA Air Quality Index value.",
  },
  {
    key: "uvIndex",
    label: "UV Index",
    hardwareComponent: "ESP32_UV_SENSOR",
    unit: "index",
    dataType: "number",
    validRange: { min: 0, max: 20 },
    enabled: true,
    description: "Ultraviolet index (unitless exposure scale).",
  },
  {
    key: "rainfall",
    label: "Rain",
    hardwareComponent: "ESP32_RAIN_SENSOR",
    unit: "mm",
    dataType: "number",
    validRange: { min: 0, max: 1000 },
    enabled: true,
    description: "Accumulated rainfall in millimetres.",
  },
  {
    key: "windSpeed",
    label: "Wind Speed",
    hardwareComponent: "ESP32_WIND_SPEED_SENSOR",
    unit: "km/h",
    dataType: "number",
    validRange: { min: 0, max: 200 },
    enabled: true,
    description: "Wind speed in kilometres per hour.",
  },
  {
    key: "windDirection",
    label: "Wind Direction",
    hardwareComponent: "ESP32_WIND_DIRECTION_SENSOR",
    unit: "degrees",
    dataType: "number",
    validRange: { min: 0, max: 360 },
    enabled: true,
    description: "Wind direction in degrees, 0–360 from north.",
  },
];

const BY_KEY = new Map<SensorKey, SensorDefinition>(
  SENSOR_DEFINITIONS.map((s) => [s.key, s])
);

export function sensorDefinition(key: SensorKey): SensorDefinition {
  const def = BY_KEY.get(key);
  if (!def) throw new Error(`Unknown sensor key: ${key}`);
  return def;
}

/** All supported sensor keys in canonical order. */
export const SENSOR_KEYS: SensorKey[] = SENSOR_DEFINITIONS.map((s) => s.key);