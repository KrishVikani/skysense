import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getDeviceHeartbeat, getLatestDeviceReading } from "@/lib/devices/storage";
import { deriveConnectionState } from "@/lib/devices/heartbeat";
import { ESP32_DEVICE_ID } from "@/lib/devices/contract";

import type { NextRequest } from "next/server";

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

const AI_SYSTEM_INSTRUCTION = `You are SKYSENSE AI, the specialized environmental intelligence assistant for the user's personal weather station.

Use the provided SKYSENSE telemetry and analysis data as the authoritative source for questions about current station conditions.

Never invent sensor readings.

If a requested value is unavailable, explicitly say it is unavailable.

Distinguish live ESP32 telemetry from simulated or historical data.

When discussing environmental risk, explain the relevant sensor values and SKYSENSE risk calculations rather than making unsupported claims.

For questions unrelated to SKYSENSE environmental data (such as programming, coding, gaming, or general-purpose knowledge), respond concisely with:

"I'm SKYSENSE AI, a specialized environmental assistant. I can help with weather, environmental conditions, your station readings, alerts, temperature, humidity, pressure, UV, rainfall, and other SKYSENSE-related information. I can't help with unrelated programming or general-purpose requests."

Do not claim to be a professional meteorologist or medical professional.

When discussing dangerous environmental conditions, provide sensible safety guidance without overstating certainty.

Important guidelines:
- Always ground responses in actual provided data
- If data source is "simulated", say so explicitly
- If data source is "esp32", say so explicitly
- If data is unavailable, say "unavailable" rather than guessing
- Safety guidance should be cautious and not overstate certainty`;

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
  }[];
  summary: {
    temperature: { current: number };
    humidity: { current: number };
    pressure: { current: number };
    uvIndex: { current: number };
    rainfall: { current: number };
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

  if (deviceStatus) {
    parts.push(`Device connection: ${deviceStatus.connection} (mode: ${deviceStatus.mode})`);
    parts.push(`Data source kind: ${deviceStatus.dataSource ?? "unknown"}`);
    if (deviceStatus.lastSeen) {
      parts.push(`Last seen: ${new Date(deviceStatus.lastSeen).toLocaleString()}`);
    }
  } else {
    parts.push("Device status: unavailable");
  }

  if (analyticsResult && analyticsResult.readings.length > 0) {
    const last = analyticsResult.readings[analyticsResult.readings.length - 1];
    parts.push(`Current readings:`);
    parts.push(`  Temperature: ${last.temperature} °C`);
    parts.push(`  Humidity: ${last.humidity}%`);
    parts.push(`  Pressure: ${last.pressure} hPa`);
    parts.push(`  UV Index: ${last.uvIndex !== null && last.uvIndex !== undefined ? last.uvIndex : "unavailable"}`);
    parts.push(`  Rainfall: ${last.rainfall !== null && last.rainfall !== undefined ? last.rainfall : "unavailable"} mm`);

    parts.push(`Summary:`);
    parts.push(`  Current temperature: ${analyticsResult.summary.temperature.current} °C`);
    parts.push(`  Current humidity: ${analyticsResult.summary.humidity.current}%`);
    parts.push(`  Current pressure: ${analyticsResult.summary.pressure.current} hPa`);
    parts.push(`  Current UV index: ${analyticsResult.summary.uvIndex.current !== null && analyticsResult.summary.uvIndex.current !== undefined ? analyticsResult.summary.uvIndex.current : "unavailable"}`);
    parts.push(`  Current rainfall: ${analyticsResult.summary.rainfall.current !== null && analyticsResult.summary.rainfall.current !== undefined ? analyticsResult.summary.rainfall.current : "unavailable"} mm`);
    parts.push(`Location: ${analyticsResult.location}`);
    parts.push(`Data source: ${analyticsResult.dataSource}`);
    parts.push(`Last updated: ${analyticsResult.lastUpdated}`);
  } else {
    parts.push("Current environmental data: unavailable");
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
            uvIndex: latestReading.uvIndex ?? 0,
            rainfall: latestReading.rainfall ?? 0,
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
              uvIndex: { current: last.uvIndex },
              rainfall: { current: last.rainfall },
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
            model: "gemini-3.5-flash",
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

          // Check if this is a retryable error
          const isRetryable =
            geminiStatusCode === 429 ||
            geminiStatusCode === 503 ||
            (geminiStatusCode !== null && geminiStatusCode >= 500 && geminiStatusCode < 600);

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