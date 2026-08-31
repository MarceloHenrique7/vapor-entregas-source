import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { updateCompanyLocation } from "@/server/locations/location-service";
import { prismaLocationRepository } from "@/server/locations/prisma-location-repository";
import { locationErrorResponse } from "@/server/locations/route-response";

export const dynamic = "force-dynamic";

export async function PATCH(
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
    const actor = await requireRole(["COMPANY", "ADMIN"]);
    const { id: rawId } = await context.params;
    const id = z.string().uuid().parse(rawId);
    const location = await updateCompanyLocation(
      { userId: actor.id, role: actor.role },
      id,
      await request.json(),
      prismaLocationRepository,
    );
    return NextResponse.json({ location });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
