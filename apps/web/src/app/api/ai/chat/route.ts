import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { fetchDeviceStatus } from "@/lib/devices/service";
import { ESP32_DEVICE_ID } from "@/lib/devices/contract";

import type { NextRequest } from "next/server";

const MAX_MESSAGE_LENGTH = 2000;

const AI_SYSTEM_INSTRUCTION = `You are SKYSENSE AI, the specialized environmental intelligence assistant for the user's personal weather station.

Use the provided SKYSENSE telemetry and analysis data as the authoritative source for questions about current station conditions.

Never invent sensor readings.

If a requested value is unavailable, explicitly say it is unavailable.

Distinguish live ESP32 telemetry from simulated or historical data.

When discussing environmental risk, explain the relevant sensor values and SKYSENSE risk calculations rather than making unsupported claims.

For questions unrelated to SKYSENSE environmental data (such as programming, coding, gaming, or general-purpose knowledge), respond concisely with:

"I'm SKYSENSE AI, a specialized environmental assistant. I can help with weather, environmental conditions, your station readings, alerts, air quality, UV, temperature, wind, and other SKYSENSE-related information. I can't help with unrelated programming or general-purpose requests."

Do not claim to be a professional meteorologist or medical professional.

When the user asks about dangerous environmental conditions, provide sensible safety guidance without overstating certainty.

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
    windSpeed: number;
    uvIndex: number;
    airQuality: number;
    rainfall: number;
  }[];
  summary: {
    temperature: { current: number };
    humidity: { current: number };
    windSpeed: { current: number };
    uvIndex: { current: number };
    airQuality: { current: number };
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
    parts.push(`  Wind Speed: ${last.windSpeed} km/h`);
    parts.push(`  UV Index: ${last.uvIndex}`);
    parts.push(`  Air Quality: ${last.airQuality} AQI`);
    parts.push(`  Rainfall: ${last.rainfall} mm`);

    parts.push(`Summary:`);
    parts.push(`  Current temperature: ${analyticsResult.summary.temperature.current} °C`);
    parts.push(`  Current humidity: ${analyticsResult.summary.humidity.current}%`);
    parts.push(`  Current wind speed: ${analyticsResult.summary.windSpeed.current} km/h`);
    parts.push(`  Current UV index: ${analyticsResult.summary.uvIndex.current}`);
    parts.push(`  Current air quality: ${analyticsResult.summary.airQuality.current} AQI`);
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

    // Step 1: Check device status FIRST to determine data source
    let deviceStatus: DeviceStatusContext | null = null;
    try {
      const dsRes = await fetch(
        `/api/devices/${ESP32_DEVICE_ID}/status`,
        { cache: "no-store" }
      );
      if (dsRes.ok) {
        const dsData = await dsRes.json();
        if (dsData.ok && dsData.connection === "online") {
          deviceStatus = {
            connection: dsData.connection,
            mode: dsData.mode ?? "live",
            dataSource: dsData.dataSource,
            lastSeen: dsData.lastSeen,
          };
        }
      }
    } catch (e) {
      console.error("Failed to fetch device status:", e);
    }

    // Step 2: Attempt to fetch real ESP32 telemetry if device status is online
    // If device is not online, we will fall back to mock environmental data
    let analyticsResult: AnalyticsContext | null = null;

    try {
      // Only fetch telemetry if device status shows online with esp32 dataSource
      if (deviceStatus && deviceStatus.dataSource === "esp32") {
        const latestRes = await fetch(
          `/api/devices/${ESP32_DEVICE_ID}/data/latest`,
          { cache: "no-store" }
        );
        if (latestRes.ok) {
          const latestData = await latestRes.json();
          if (latestData.ok && latestData.reading) {
            // Use the latest reading as the summary
            const last = latestData.reading;

            analyticsResult = {
              readings: [last],
              summary: {
                temperature: { current: last.temperature },
                humidity: { current: last.humidity },
                windSpeed: { current: last.windSpeed },
                uvIndex: { current: last.uvIndex },
                airQuality: { current: last.airQuality },
              },
              dataSource: "esp32",
              lastUpdated: last.timestamp,
              location: last.location,
            };
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch ESP32 telemetry:", e);
    }

    // Step 3: Fall back to environmental data only if device is genuinely offline
    // If device is online with esp32, we already have analyticsResult from Step 2.
    // If device is not online, we do NOT use simulated data - we mark as unavailable.
    // This ensures the chatbot and /devices page agree on the same device state.
    if (!analyticsResult) {
      // Device is not online with esp32 - check if we should fall back to mock data
      // ONLY fall back if deviceStatus exists but is not online (e.g., stale or offline)
      // If deviceStatus is null or connection is not "online", do NOT use simulated data
      if (deviceStatus && deviceStatus.connection !== "online") {
        // Device is stale or offline - still do NOT use simulated data
        // The Gemini instruction says: "If data source is 'simulated', say so explicitly"
        // and "If data is unavailable, say 'unavailable' rather than guessing"
        analyticsResult = null;
      } else if (!deviceStatus) {
        // No device status available - treat as unavailable
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
    let geminiErrorCode: string | null = null;

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
      responseText = response.text ?? "";
    } catch (geminiError) {
      const errorObj = geminiError as
        | { statusCode?: number; code?: string; message?: string }
        | Error;
      let errorStatus: number | null = null;
      let errorCode: string | null = null;

      if ("statusCode" in errorObj && errorObj.statusCode !== undefined) {
        errorStatus = errorObj.statusCode;
      }

      if ("code" in errorObj && errorObj.code !== undefined) {
        errorCode = errorObj.code;
      }

      geminiStatusCode = typeof errorStatus === "number" ? errorStatus : 500;

      console.error("Gemini API error:", errorCode || (errorObj as Error | undefined)?.message);

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