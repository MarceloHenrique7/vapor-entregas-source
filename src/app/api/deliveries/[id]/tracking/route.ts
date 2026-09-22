import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { prismaTrackingRepository } from "@/server/tracking/prisma-tracking-repository";
import { enforceTrackingActorRateLimit } from "@/server/tracking/rate-limit";
import { trackingErrorResponse } from "@/server/tracking/route-response";
import { getTrackingRuntimeConfig } from "@/server/tracking/runtime";
import {
  createOrGetTrackingLink,
  getTrackingLink,
  revokeTrackingLink,
} from "@/server/tracking/tracking-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    const { id } = await context.params;
    const tracking = await getTrackingLink(
      { userId: user.id, role: user.role },
      id,
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
    const user = await requireRole(["COMPANY"]);
    enforceTrackingActorRateLimit(user.id, "manage");
    const { id } = await context.params;
    const tracking = await createOrGetTrackingLink(
      { userId: user.id, role: user.role },
      id,
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

export async function DELETE(
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
    const user = await requireRole(["COMPANY"]);
    enforceTrackingActorRateLimit(user.id, "manage");
    const { id } = await context.params;
    const result = await revokeTrackingLink(
      { userId: user.id, role: user.role },
      id,
      prismaTrackingRepository,
      new Date(),
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return trackingErrorResponse(error);
  }
}
