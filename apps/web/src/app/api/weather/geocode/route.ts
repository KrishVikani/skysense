import { NextResponse } from "next/server";
import { geocodeLocations, openWeatherApiKey, reverseGeocode } from "@/lib/weather/openweather";
import { WeatherError, WEATHER_ERROR_MESSAGES } from "@/lib/weather/errors";

/**
 * GET /api/weather/geocode?q=..  (forward: city name → coordinates)
 * GET /api/weather/geocode?lat=..&lon=..  (reverse: coordinates → place)
 *
 * Location search backend for the Weather page. Uses the OpenWeather Geocoding
 * API with the server-side key; returns `not_configured` when no key exists so
 * the client can show an honest demo-mode notice. Results are normalized
 * (name / state / country / coordinates only) and cached server-side.
 */
export const revalidate = 300;

function statusFor(code: string): number {
  switch (code) {
    case "rate_limited":
      return 429;
    case "timeout":
      return 504;
    case "bad_query":
      return 400;
    default:
      return 502;
  }
}

export async function GET(request: Request) {
  const key = openWeatherApiKey();
  if (!key) {
    return NextResponse.json({
      ok: false,
      code: "not_configured",
      message: "OPENWEATHER_API_KEY is not set. Location search is unavailable; the Weather page runs in simulated demo mode.",
    });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));

  try {
    if (query && query.trim().length > 0) {
      const results = await geocodeLocations(query.trim());
      return NextResponse.json({ ok: true, results });
    }
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const result = await reverseGeocode(lat, lon);
      return NextResponse.json({ ok: true, result });
    }
    return NextResponse.json(
      { ok: false, code: "bad_query", message: WEATHER_ERROR_MESSAGES.bad_query },
      { status: 400 }
    );
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