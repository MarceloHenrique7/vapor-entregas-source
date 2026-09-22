import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { prismaTrackingRepository } from "@/server/tracking/prisma-tracking-repository";
import { enforceTrackingActorRateLimit } from "@/server/tracking/rate-limit";
import { trackingErrorResponse } from "@/server/tracking/route-response";
import { getTrackingRuntimeConfig } from "@/server/tracking/runtime";
import { updateDeliveryTrackingLocation } from "@/server/tracking/tracking-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    const user = await requireRole(["MOTOBOY"]);
    enforceTrackingActorRateLimit(user.id, "location");
    const { id } = await context.params;
    const tracking = await updateDeliveryTrackingLocation(
      { userId: user.id, role: user.role },
      id,
      await request.json(),
      prismaTrackingRepository,
      new Date(),
      getTrackingRuntimeConfig(),
    );
    return NextResponse.json(
      { tracking },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return trackingErrorResponse(error);
  }
}
