import { NextResponse } from "next/server";
import { devicePathError, historyResponse } from "../../../device-route-helpers";

/** GET /api/devices/:deviceId/data/history → stored readings, newest first. */
export async function GET(
  request: Request,
  { params }: { params: { deviceId: string } }
): Promise<NextResponse> {
  const deviceId = params.deviceId;
  const pathError = devicePathError(deviceId);
  if (pathError) return pathError;
  const url = new URL(request.url);
  const max = Number(url.searchParams.get("max")) || 50;
  return historyResponse(deviceId, max);
}