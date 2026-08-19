import { NextResponse } from "next/server";
import { devicePathError, latestReadingResponse } from "../../../device-route-helpers";

/** GET /api/devices/:deviceId/data/latest → the most recent stored reading. */
export async function GET(
  _request: Request,
  { params }: { params: { deviceId: string } }
): Promise<NextResponse> {
  const deviceId = params.deviceId;
  const pathError = devicePathError(deviceId);
  if (pathError) return pathError;
  return latestReadingResponse(deviceId);
}