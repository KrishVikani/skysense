/**
 * Device credential boundary for the future ESP32 station.
 *
 * FUTURE AUTHENTICATION — CURRENT STATE:
 * Device authentication is INTENTIONALLY NOT enforced yet. The physical ESP32
 * does not exist, so there is no real secret to verify and the endpoint must
 * remain testable. Nothing here pretends the device is securely authenticated:
 * the response of the ingestion API explicitly reports the enforcement state.
 *
 * HOW IT ACTIVATES:
 *  - Server environment variable `SKYSENSE_ESP32_DEVICE_SECRET` is set (see
 *    apps/web/.env.example). It is NEVER committed and NEVER shipped to the
 *    browser bundle — it is only read on the server.
 *  - The future firmware sends the secret in the request header
 *    `x-skysense-device-token`.
 *  - When the env var is set, `verifyDeviceCredential` requires a matching
 *    token (constant-time comparison) and the ingestion API rejects
 *    unauthenticated requests with 401.
 *
 * This is the EXACT insertion point for the future ESP32 device secret/API key:
 * no other file needs to change.
 */

export const DEVICE_AUTH_HEADER = "x-skysense-device-token";
export const DEVICE_AUTH_SECRET_ENV = "SKYSENSE_ESP32_DEVICE_SECRET";

export interface DeviceAuthStatus {
  /** True when a server secret is configured and enforcement is active. */
  enforced: boolean;
  /** True only when `enforced` and the presented token matches. */
  verified: boolean;
  /** Human-readable reason when not enforced or verification failed. */
  reason?: string;
}

/** Reads the server-side secret without ever exposing it. */
function configuredSecret(): string | undefined {
  const secret = process.env[DEVICE_AUTH_SECRET_ENV];
  return typeof secret === "string" && secret.length > 0 ? secret : undefined;
}

/**
 * Verifies the device credential presented in `headers`.
 * When no secret is configured this reports `enforced: false` — the API is
 * explicitly NOT claiming the device is authenticated.
 */
export function verifyDeviceCredential(headers: Headers): DeviceAuthStatus {
  const secret = configuredSecret();
  if (!secret) {
    return {
      enforced: false,
      verified: false,
      reason: `Device authentication is not configured yet (${DEVICE_AUTH_SECRET_ENV} is unset).`,
    };
  }

  const provided = headers.get(DEVICE_AUTH_HEADER);
  if (!provided) {
    return {
      enforced: true,
      verified: false,
      reason: `Missing '${DEVICE_AUTH_HEADER}' header.`,
    };
  }

  return {
    enforced: true,
    verified: safeEqual(provided, secret),
  };
}

/** Constant-time string comparison (avoids timing side channels). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}