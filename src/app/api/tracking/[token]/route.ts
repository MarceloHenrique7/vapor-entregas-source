import { NextRequest, NextResponse } from "next/server";

import { prismaTrackingRepository } from "@/server/tracking/prisma-tracking-repository";
import { enforcePublicTrackingRateLimit } from "@/server/tracking/rate-limit";
import { trackingErrorResponse } from "@/server/tracking/route-response";
import { getTrackingRuntimeConfig } from "@/server/tracking/runtime";
import { getPublicTracking } from "@/server/tracking/tracking-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const clientAddress =
      forwarded?.split(",", 1)[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    enforcePublicTrackingRateLimit(clientAddress);
    const { token } = await context.params;
    const config = getTrackingRuntimeConfig();
    const tracking = await getPublicTracking(
      token,
      prismaTrackingRepository,
      new Date(),
      config,
    );
    return NextResponse.json(
      { tracking },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      },
    );
  } catch (error) {
    const response = trackingErrorResponse(error, true);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }
}
