import { NextResponse } from "next/server";
import { devicePathError, statusResponse } from "../../device-route-helpers";

/** GET /api/devices/:deviceId/status → device status derived from heartbeat. */
export async function GET(
  _request: Request,
  { params }: { params: { deviceId: string } }
): Promise<NextResponse> {
  const deviceId = params.deviceId;
  const pathError = devicePathError(deviceId);
  if (pathError) return pathError;
  return statusResponse(deviceId);
}