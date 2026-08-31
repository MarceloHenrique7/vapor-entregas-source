import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { ForbiddenError } from "@/server/auth/errors";
import { hasValidRequestOrigin } from "@/server/http/origin";
import {
  createOrReplaceDefaultCompanyLocation,
  getDefaultCompanyLocation,
} from "@/server/locations/location-service";
import { prismaLocationRepository } from "@/server/locations/prisma-location-repository";
import { locationErrorResponse } from "@/server/locations/route-response";

const companyIdSchema = z.string().uuid();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRole(["COMPANY", "ADMIN"]);
    const requestedCompanyId = request.nextUrl.searchParams.get("companyId");
    let companyId: string | null;
    if (actor.role === "ADMIN") {
      companyId = companyIdSchema.parse(requestedCompanyId);
    } else {
      if (requestedCompanyId) throw new ForbiddenError();
      companyId = await prismaLocationRepository.getCompanyIdForUser(actor.id);
    }
    const location = companyId
      ? await getDefaultCompanyLocation(companyId, prismaLocationRepository)
      : null;
    return NextResponse.json(
      { location },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return locationErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    const actor = await requireRole(["COMPANY", "ADMIN"]);
    const body = (await request.json()) as Record<string, unknown>;
    const companyId = body.companyId
      ? companyIdSchema.parse(body.companyId)
      : undefined;
    if (actor.role !== "ADMIN" && companyId) throw new ForbiddenError();
    const location = await createOrReplaceDefaultCompanyLocation(
      { userId: actor.id, role: actor.role },
      body,
      prismaLocationRepository,
      companyId,
    );
    return NextResponse.json({ location });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
