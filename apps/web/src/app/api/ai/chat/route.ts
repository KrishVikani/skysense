import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getDeviceHeartbeat, getLatestDeviceReading } from "@/lib/devices/storage";
import { deriveConnectionState } from "@/lib/devices/heartbeat";
import { ESP32_DEVICE_ID } from "@/lib/devices/contract";

import type { NextRequest } from "next/server";

/**
 * Determines if a Gemini error represents a daily quota exhaustion
 * that should NOT be retried (as opposed to transient rate limits).
 * Checks for quota_id/metric indicating daily free-tier generate content limits.
 */
function isDailyQuotaExhausted(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as Record<string, unknown>;

  // Check error details for quota information
  // Gemini errors may include details array with quota info
  if (err.details && Array.isArray(err.details)) {
    for (const detail of err.details) {
      if (detail && typeof detail === "object") {
        const d = detail as Record<string, unknown>;
        // Check for quotaId indicating daily free-tier limit
        if (typeof d.quotaId === "string" && d.quotaId.includes("GenerateRequestsPerDay")) {
          return true;
        }
        // Check for quotaMetric indicating daily free-tier generate content
        if (typeof d.quotaMetric === "string" && d.quotaMetric.includes("generate_content_free_tier_requests")) {
          return true;
        }
        // Check for quotaValue being the daily limit (20 for free tier)
        if (typeof d.quotaValue === "number" && d.quotaValue === 20 && typeof d.quotaId === "string" && d.quotaId.includes("PerDay")) {
          return true;
        }
      }
    }
  }

  // Check error message for quota indicators
  if (typeof err.message === "string") {
    const msg = err.message.toLowerCase();
    if (msg.includes("quota") && (msg.includes("per day") || msg.includes("daily") || msg.includes("free tier") || msg.includes("daily limit"))) {
      return true;
    }
  }

  // Check response body for quota details
  if (err.response && typeof err.response === "object") {
    const resp = err.response as Record<string, unknown>;
    if (resp.body && typeof resp.body === "object") {
      const body = resp.body as Record<string, unknown>;
      if (body.error && typeof body.error === "object") {
        const errBody = body.error as Record<string, unknown>;
        if (errBody.details && Array.isArray(errBody.details)) {
          for (const detail of errBody.details) {
            if (detail && typeof detail === "object") {
              const d = detail as Record<string, unknown>;
              if (typeof d.quotaId === "string" && d.quotaId.includes("GenerateRequestsPerDay")) {
                return true;
              }
              if (typeof d.quotaMetric === "string" && d.quotaMetric.includes("generate_content_free_tier_requests")) {
                return true;
              }
            }
          }
        }
      }
    }
  }

  return false;
}

/**
 * Safely extracts an HTTP-like status code from a Google GenAI SDK error.
 * The GenAI SDK may surface errors in different shapes depending on the
 * underlying transport (REST vs gRPC) and error type. This helper normalizes
 * them to a numeric HTTP-like status for retry/response logic.
 */
function extractGeminiStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const err = error as Record<string, unknown>;

  // 1. Direct statusCode property (some Google SDKs use this)
  if (typeof err.statusCode === "number") return err.statusCode;

  // 2. Response object with status (common in REST-based clients)
  if (err.response && typeof err.response === "object") {
    const resp = err.response as Record<string, unknown>;
    if (typeof resp.status === "number") return resp.status;
    if (typeof resp.statusCode === "number") return resp.statusCode;
  }

  // 3. Error metadata with http status (gRPC-web / connect-rpc style)
  if (err.metadata && typeof err.metadata === "object") {
    const meta = err.metadata as Record<string, unknown>;
    // Look for common http-status header keys
    for (const key of ["http-status", "grpc-status", "status"]) {
      const val = meta[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
        const parsed = parseInt(val[0], 10);
        if (!Number.isNaN(parsed)) return parsed;
      }
      if (typeof val === "string") {
        const parsed = parseInt(val, 10);
        if (!Number.isNaN(parsed)) return parsed;
      }
      if (typeof val === "number") return val;
    }
  }

  // 4. gRPC code mapping (if statusCode not available, map known codes)
  // gRPC codes: 8=RESOURCE_EXHAUSTED(429), 14=UNAVAILABLE(503), 2=UNKNOWN(500), etc.
  if (typeof err.code === "number") {
    const grpcToHttp: Record<number, number> = {
      8: 429, // RESOURCE_EXHAUSTED
      14: 503, // UNAVAILABLE
      4: 500, // DEADLINE_EXCEEDED
      10: 500, // ABORTED
      13: 500, // INTERNAL
      1: 500, // CANCELLED (treat as server error)
      2: 500, // UNKNOWN
    };
    if (grpcToHttp[err.code] !== undefined) return grpcToHttp[err.code];
  }

  // 5. String code property (e.g., "RESOURCE_EXHAUSTED")
  if (typeof err.code === "string") {
    const codeStr = err.code.toUpperCase();
    if (codeStr === "RESOURCE_EXHAUSTED") return 429;
    if (codeStr === "UNAVAILABLE") return 503;
    if (codeStr === "DEADLINE_EXCEEDED") return 504;
    if (codeStr === "INTERNAL") return 500;
    if (codeStr === "UNKNOWN") return 500;
  }

  // 6. Message-based fallback for common patterns
  if (typeof err.message === "string") {
    const msg = err.message.toLowerCase();
    if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")) return 429;
    if (msg.includes("503") || msg.includes("unavailable") || msg.includes("service unavailable")) return 503;
    if (msg.includes("500") || msg.includes("internal error")) return 500;
    if (msg.includes("504") || msg.includes("timeout") || msg.includes("deadline")) return 504;
  }

  return null;
}

const MAX_MESSAGE_LENGTH = 2000;

const AI_SYSTEM_INSTRUCTION = `You are SKYSENSE AI, a knowledgeable environmental assistant for a personal weather station.

=== DATA SOURCE RULES ===
The context provides two distinct data types. Keep them strictly separated in your reasoning and answers.

1. LIVE ESP32 TELEMETRY (dataSource: "esp32")
   - Physical station measurements from the BH1750 light sensor and other hardware.
   - Available: temperature (°C), humidity (%), pressure (hPa), lightLevel (lux), rainfall (mm), airQuality (AQI), windSpeed (km/h), windDirection (degrees).
   - NOT available on this hardware: UV Index. The ESP32 has no UV sensor.
   - If the context shows uvIndex: 0 for esp32 data, treat this as "not measured by this station" — never report it as a real UV reading.

2. WEATHER / SIMULATION DATA (dataSource: "simulation" or weather provider)
   - Forecast or simulated values. UV Index may exist here.
   - Never present these as physical ESP32 measurements.

=== CORE BEHAVIOR ===
- Use the supplied telemetry as the authoritative source for current station readings.
- Never invent or guess a sensor value. If a value is null/undefined/not provided, say it is unavailable.
- Distinguish measured fact from interpretation. Label interpretations clearly (e.g., "This suggests...", "Based on the current temperature of X...").
- For ESP32 data: Light Level is measured in lux by the BH1750. Do not derive or fabricate UV Index from lux.
- Rainfall: the station reports accumulated rainfall in mm. A value of 0 means no rain recorded. Do not confuse amount with a boolean "is it raining" detection unless the context provides a separate rain-detection flag.
- Use exact current values from context with units. Reference the timestamp when discussing "current" conditions.
- Answer the user's specific question directly. Do not dump unrelated telemetry.
- Use conversation history for follow-ups (e.g., "that temperature" refers to the value just discussed).

=== RESPONSE STYLE ===
- Natural, confident, friendly, concise.
- Easy for a student/exhibition audience to understand.
- Not robotic, not overly verbose, not repetitive.
- Simple questions → 1–4 short paragraphs or compact bullet list.
- Comparison/analysis → concise explanation + key values/reasoning.
- Current conditions → prioritize requested metric(s), mention only relevant supporting readings.
- Adapt structure to the question. No forced template.

=== OFF-TOPIC QUESTIONS ===
If the user asks something unrelated to weather/environment/SKYSENSE (e.g., programming, recipes, trivia), answer naturally and helpfully. You don't need to force every response back to station data. Just don't pretend to have station data you don't have.

=== SAFETY ===
- Not a professional meteorologist or medical professional.
- For dangerous conditions, give sensible guidance without overstating certainty.`;

type DeviceStatusContext = {
  connection: string;
  mode: string;
  dataSource: string | undefined;
  lastSeen: string | null;
};

type AnalyticsContext = {
  readings: {
    temperature: number;
    humidity: number;
    pressure: number;
    uvIndex: number;
    rainfall: number;
    lightLevel: number;
    airQuality?: number | null;
    windSpeed?: number | null;
    windDirection?: number | null;
  }[];
  summary: {
    temperature: { current: number };
    humidity: { current: number };
    pressure: { current: number };
    uvIndex: { current: number };
    rainfall: { current: number };
    lightLevel: { current: number };
  };
  dataSource: string;
  lastUpdated: string;
  location: string;
};

function buildDataContext(
  deviceStatus: DeviceStatusContext | null,
  analyticsResult: AnalyticsContext | null
): string {
  const parts: string[] = [];

  // Device status section
  if (deviceStatus) {
    parts.push(`[DEVICE STATUS]`);
    parts.push(`Connection: ${deviceStatus.connection} (mode: ${deviceStatus.mode})`);
    parts.push(`Data source: ${deviceStatus.dataSource ?? "unknown"}`);
    if (deviceStatus.lastSeen) {
      parts.push(`Last telemetry received: ${new Date(deviceStatus.lastSeen).toLocaleString()}`);
    }
  } else {
    parts.push(`[DEVICE STATUS]`);
    parts.push(`Device status: unavailable`);
  }

  // Live telemetry section - clearly labeled and separated
  if (analyticsResult && analyticsResult.readings.length > 0) {
    const last = analyticsResult.readings[analyticsResult.readings.length - 1];
    const isEsp32 = analyticsResult.dataSource === "esp32";
    const sourceLabel = isEsp32 ? "LIVE ESP32 TELEMETRY" : `SIMULATED/WEATHER DATA (${analyticsResult.dataSource})`;

    parts.push(`[${sourceLabel}]`);
    parts.push(`Timestamp: ${analyticsResult.lastUpdated}`);
    parts.push(`Location: ${analyticsResult.location}`);

    // Core sensors always present for ESP32
    parts.push(`Temperature: ${last.temperature !== null && last.temperature !== undefined ? last.temperature + " °C" : "unavailable"}`);
    parts.push(`Humidity: ${last.humidity !== null && last.humidity !== undefined ? last.humidity + "%" : "unavailable"}`);
    parts.push(`Pressure: ${last.pressure !== null && last.pressure !== undefined ? last.pressure + " hPa" : "unavailable"}`);

    // Light Level (BH1750 on ESP32)
    parts.push(`Light Level: ${last.lightLevel !== null && last.lightLevel !== undefined ? last.lightLevel + " lux" : "unavailable"}`);

    // Rainfall
    parts.push(`Rainfall: ${last.rainfall !== null && last.rainfall !== undefined ? last.rainfall + " mm" : "unavailable"}`);

    // Optional sensors
    if (last.airQuality !== null && last.airQuality !== undefined) {
      parts.push(`Air Quality: ${last.airQuality} AQI`);
    }
    if (last.windSpeed !== null && last.windSpeed !== undefined) {
      parts.push(`Wind Speed: ${last.windSpeed} km/h`);
    }
    if (last.windDirection !== null && last.windDirection !== undefined) {
      parts.push(`Wind Direction: ${last.windDirection}°`);
    }

    // UV Index handling - explicit about availability
    if (isEsp32) {
      parts.push(`UV Index: not measured by this hardware (station uses BH1750 Light Level instead)`);
    } else if (last.uvIndex !== null && last.uvIndex !== undefined) {
      parts.push(`UV Index: ${last.uvIndex}`);
    } else {
      parts.push(`UV Index: unavailable`);
    }

    // Summary block (useful for trends)
    parts.push(`[SUMMARY - ${sourceLabel}]`);
    parts.push(`Current temperature: ${analyticsResult.summary.temperature.current !== null && analyticsResult.summary.temperature.current !== undefined ? analyticsResult.summary.temperature.current + " °C" : "unavailable"}`);
    parts.push(`Current humidity: ${analyticsResult.summary.humidity.current !== null && analyticsResult.summary.humidity.current !== undefined ? analyticsResult.summary.humidity.current + "%" : "unavailable"}`);
    parts.push(`Current pressure: ${analyticsResult.summary.pressure.current !== null && analyticsResult.summary.pressure.current !== undefined ? analyticsResult.summary.pressure.current + " hPa" : "unavailable"}`);
    parts.push(`Current light level: ${analyticsResult.summary.lightLevel.current !== null && analyticsResult.summary.lightLevel.current !== undefined ? analyticsResult.summary.lightLevel.current + " lux" : "unavailable"}`);
    parts.push(`Current rainfall: ${analyticsResult.summary.rainfall.current !== null && analyticsResult.summary.rainfall.current !== undefined ? analyticsResult.summary.rainfall.current + " mm" : "unavailable"}`);
  } else {
    parts.push(`[CURRENT ENVIRONMENTAL DATA]`);
    parts.push(`No live telemetry available. Device may be offline or not yet connected.`);
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    let body: { message?: string; context?: { role: string; content: string }[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { message, context } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // Step 1: Get authoritative device status from server-side heartbeat.
    // Uses Firebase Admin SDK directly — no relative URL fetch needed.
    let deviceStatus: DeviceStatusContext | null = null;
    try {
      const heartbeat = await getDeviceHeartbeat(ESP32_DEVICE_ID);
      if (heartbeat) {
        const connection = deriveConnectionState(heartbeat.lastSeenAt);
        deviceStatus = {
          connection,
          mode: "live",
          dataSource: heartbeat.dataSource,
          lastSeen: heartbeat.lastSeenAt,
        };
      }
    } catch (e) {
      console.error("Failed to get device heartbeat:", e);
    }

    // Step 2: Retrieve authoritative latest ESP32 telemetry if device is online.
    // Uses Firestore read directly — no relative URL fetch needed.
    let analyticsResult: AnalyticsContext | null = null;
    try {
      if (deviceStatus && deviceStatus.dataSource === "esp32" && deviceStatus.connection === "online") {
        const latestReading = await getLatestDeviceReading(ESP32_DEVICE_ID);
        if (latestReading) {
          const last = {
            temperature: latestReading.temperature ?? 0,
            humidity: latestReading.humidity ?? 0,
            pressure: latestReading.pressure ?? 0,
            uvIndex: 0,
            rainfall: latestReading.rainfall ?? 0,
            lightLevel: latestReading.lightLevel ?? 0,
            timestamp: latestReading.timestamp,
            deviceId: latestReading.deviceId,
            location: latestReading.location,
          };
          analyticsResult = {
            readings: [last],
            summary: {
              temperature: { current: last.temperature },
              humidity: { current: last.humidity },
              pressure: { current: last.pressure },
              uvIndex: { current: 0 },
              rainfall: { current: last.rainfall },
              lightLevel: { current: last.lightLevel },
            },
            dataSource: "esp32",
            lastUpdated: last.timestamp,
            location: last.location,
          };
        }
      }
    } catch (e) {
      console.error("Failed to get latest device reading:", e);
    }

    // Step 3: If device is genuinely offline/unavailable, do NOT fabricate simulated telemetry.
    // If device is online with esp32, we already have analyticsResult from Step 2.
    // If device is not online, we mark as unavailable (no simulated data).
    if (!analyticsResult) {
      if (deviceStatus && deviceStatus.connection !== "online") {
        analyticsResult = null;
      } else if (!deviceStatus) {
        analyticsResult = null;
      }
    }

    const dataContext = buildDataContext(deviceStatus, analyticsResult);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is currently unavailable. Please try again later." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const conversationHistory =
      context && context.length > 0
        ? context
            .map((c) => `${c.role === "user" ? "User" : "Assistant"}: ${c.content}`)
            .join("\n")
        : "";

    const userPrompt = [
      `SKYSENSE data context:`,
      dataContext,
      "",
      conversationHistory ? `Conversation history:\n${conversationHistory}` : "",
      "",
      `User message: ${message}`,
    ]
      .filter((line) => line.trim().length > 0)
      .join("\n");

  let responseText: string;
  let geminiStatusCode: number | null = null;

  // Retry configuration for transient failures
  const maxRetries = 3;
  const baseDelayMs = 1000;

  async function callGeminiWithRetry(): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: userPrompt,
          config: {
            systemInstruction: AI_SYSTEM_INSTRUCTION,
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        });
        return response.text ?? "";
      } catch (geminiError) {
        lastError = geminiError;

        // Use robust status extraction helper
        const errorStatus = extractGeminiStatus(geminiError);
        geminiStatusCode = errorStatus ?? 500;

        // Check if this is a daily quota exhaustion (non-retryable)
        const isDailyQuota = isDailyQuotaExhausted(geminiError);

        // Check if this is a retryable error
        const isRetryable =
          !isDailyQuota &&
          (geminiStatusCode === 429 ||
            geminiStatusCode === 503 ||
            (geminiStatusCode !== null && geminiStatusCode >= 500 && geminiStatusCode < 600));

        // Don't retry on last attempt
        if (!isRetryable || attempt === maxRetries - 1) {
          break;
        }

        // Exponential backoff: 1s, 2s
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(`Gemini API transient error (${geminiStatusCode}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // If we get here, all retries exhausted or non-retryable error
    throw lastError;
  }

  try {
    responseText = await callGeminiWithRetry();
  } catch (geminiError) {
    // Use robust status extraction helper for final error handling
    geminiStatusCode = extractGeminiStatus(geminiError) ?? 500;

    console.error("Gemini API error:", (geminiError as Error | undefined)?.message);

    // Handle specific Gemini API error codes
    if (geminiStatusCode === 429) {
      return NextResponse.json(
        {
          error: "GEMINI_QUOTA_EXCEEDED",
          message:
            "SKYSENSE AI is temporarily unavailable because the Gemini API quota has been reached. Please try again after the quota resets.",
        },
        { status: 429 }
      );
    }

    if (geminiStatusCode === 401 || geminiStatusCode === 403) {
      return NextResponse.json(
        {
          error: "GEMINI_CONFIGURATION_ERROR",
          message:
            "SKYSENSE AI is currently misconfigured. Please contact support.",
        },
        { status: 401 }
      );
    }

    if (geminiStatusCode && geminiStatusCode >= 500) {
      return NextResponse.json(
        {
          error: "GEMINI_SERVICE_UNAVAILABLE",
          message:
            "SKYSENSE AI service is temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    // Generic fallback for unexpected errors
    return NextResponse.json(
      { error: "AI service error. Please try again later." },
      { status: 500 }
    );
  }

  if (!responseText) {
    return NextResponse.json(
      { error: "AI returned an empty response. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ response: responseText });
} catch (error) {
  console.error("AI chat error:", error);
  return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
}
}