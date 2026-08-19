import { NextResponse } from "next/server";
import { createOpenWeatherProvider, openWeatherApiKey } from "@/lib/weather/openweather";
import { DEFAULT_WEATHER_LOCATION } from "@/lib/weather/locations";
import { WeatherError, WEATHER_ERROR_MESSAGES } from "@/lib/weather/errors";

/**
 * GET /api/weather?lat=..&lon=..[&name=..][&state=..][&country=..]
 *
 * Server-side weather endpoint for the Weather experience. The OpenWeather key
 * stays server-side (env `OPENWEATHER_API_KEY`); when it is not configured the
 * route reports `not_configured` and the client gracefully falls back to the
 * simulated demo provider. Responses are normalized into the internal weather
 * model — clients never see raw OpenWeather shapes. Successful responses are
 * cached server-side for 5 minutes to avoid hammering the provider.
 */
export const revalidate = 300;

/** HTTP status mapping per WeatherError code (client reads the body anyway). */
function statusFor(code: string): number {
  switch (code) {
    case "not_found":
      return 404;
    case "rate_limited":
      return 429;
    case "timeout":
      return 504;
    case "bad_location":
      return 400;
    case "invalid_key":
    case "upstream_error":
    case "unavailable":
    case "malformed":
      return 502;
    default:
      return 200;
  }
}

export async function GET(request: Request) {
  const key = openWeatherApiKey();
  if (!key) {
    return NextResponse.json({
      ok: false,
      code: "not_configured",
      message:
        "OPENWEATHER_API_KEY is not set. The Weather page falls back to the simulated demo provider and clearly labels it as such.",
    });
  }

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json(
      { ok: false, code: "bad_location", message: WEATHER_ERROR_MESSAGES.bad_location },
      { status: 400 }
    );
  }

  const location = {
    name: url.searchParams.get("name") || DEFAULT_WEATHER_LOCATION.name,
    state: url.searchParams.get("state") || undefined,
    country: url.searchParams.get("country") || DEFAULT_WEATHER_LOCATION.country,
    lat,
    lon,
  };

  try {
    const provider = createOpenWeatherProvider(key);
    const data = await provider.fetchWeather(location);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof WeatherError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.userMessage },
        { status: statusFor(error.code) }
      );
    }
    return NextResponse.json(
      { ok: false, code: "upstream_error", message: WEATHER_ERROR_MESSAGES.upstream_error },
      { status: 502 }
    );
  }
}